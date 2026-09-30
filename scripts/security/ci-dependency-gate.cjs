#!/usr/bin/env node
/**
 * EVARO CI Dependency Release Gate
 *
 * Enforces Phase 5 / 5A of EVARO Security Governance:
 * - 0 CRITICAL vulnerabilities tolerated (always strictly blocking).
 * - 0 unreviewed HIGH vulnerabilities tolerated.
 * - Only strictly triaged, documented, build-time toolchain exceptions are permitted.
 * - Each approved exception documents:
 *     - Package, Advisory ID, Version range, Dependency path
 *     - Proof of 0 client runtime reachability
 *     - Historical review provenance, finite engineering deadline, and removal milestone
 * - Any new or unreviewed High finding immediately breaks CI.
 */

const { isValidAuditReport, runPnpmAudit } = require('./audit-report.cjs');
const { createRequire } = require('node:module');
const path = require('node:path');

const MAX_REVIEW_AGE_MS = 30 * 24 * 60 * 60 * 1000;

const ALLOWED_HIGH_EXCEPTIONS = [
  {
    package: 'image-size',
    advisories: ['GHSA-w3rx-r6r6-pgpr', '1138808'],
    vulnerableVersions: '<=2.0.2',
    installedVersion: '1.2.1',
    dependencyPath: 'metro > image-size',
    parentInstalledVersion: '0.83.3',
    workspaceRoots: ['.', 'apps__mobile'],
    runtimeReachable: false,
    reason:
      'Metro dev toolchain asset dimension parser. Build-time only; never bundled into iOS/Android native client or web runtime distribution.',
    owner: 'Astra Security Governance',
    reviewedOn: '2026-09-21',
    reviewExpiresAt: '2026-10-21T00:00:00.000Z',
    reviewCondition: 'Reviewed 2026-09-21; source retained in Git at 39b2b3e, current policy: docs/roadmap/SECURITY_PRIVACY.md; remove on Expo SDK / Metro upgrade.',
    removalMilestone: 'Expo SDK 55 / Metro upgrade',
  },
  {
    package: 'image-size',
    advisories: ['GHSA-5p2g-fcmc-qvqq', '1138809'],
    vulnerableVersions: '<=2.0.2',
    installedVersion: '1.2.1',
    dependencyPath: 'metro > image-size',
    parentInstalledVersion: '0.83.3',
    workspaceRoots: ['.', 'apps__mobile'],
    runtimeReachable: false,
    reason:
      'Metro dev toolchain asset dimension parser. Build-time only; never bundled into iOS/Android native client or web runtime distribution.',
    owner: 'Astra Security Governance',
    reviewedOn: '2026-09-21',
    reviewExpiresAt: '2026-10-21T00:00:00.000Z',
    reviewCondition: 'Reviewed 2026-09-21; source retained in Git at 39b2b3e, current policy: docs/roadmap/SECURITY_PRIVACY.md; remove on Expo SDK / Metro upgrade.',
    removalMilestone: 'Expo SDK 55 / Metro upgrade',
  },
];

// The historical review is unchanged. This 30-day engineering deadline is a
// stricter local gate policy, not a new operator approval or a named human owner.

function readInstalledMetroDependency() {
  try {
    const metroManifest = require.resolve('metro/package.json', { paths: [path.resolve(__dirname, '../..')] });
    const metro = require(metroManifest);
    const imageSize = createRequire(metroManifest)('image-size/package.json');
    if (metro.name !== 'metro' || imageSize.name !== 'image-size') return null;
    return { parentVersion: metro.version, version: imageSize.version };
  } catch {
    return null;
  }
}

function exceptionMismatch(item, exception, now, installedDependency) {
  const reviewedAt = Date.parse(`${exception.reviewedOn}T00:00:00.000Z`);
  const expiresAt = Date.parse(exception.reviewExpiresAt);
  if (!Number.isFinite(now) || !Number.isFinite(reviewedAt) || !Number.isFinite(expiresAt) ||
      new Date(reviewedAt).toISOString().slice(0, 10) !== exception.reviewedOn ||
      new Date(expiresAt).toISOString() !== exception.reviewExpiresAt ||
      expiresAt <= reviewedAt || expiresAt - reviewedAt > MAX_REVIEW_AGE_MS || now < reviewedAt) {
    return 'Invalid or unbounded exception review evidence';
  }
  if (now >= expiresAt) return `Engineering re-review deadline expired at ${exception.reviewExpiresAt}`;
  if (!installedDependency || installedDependency.version !== exception.installedVersion ||
      installedDependency.parentVersion !== exception.parentInstalledVersion) {
    return 'Installed Metro/image-size versions differ from the reviewed exposure or are unavailable';
  }
  if (!Array.isArray(item.findings) || item.findings.length === 0) return 'Missing installed-version/path findings';

  for (const finding of item.findings) {
    if (!finding || typeof finding !== 'object' || Array.isArray(finding) ||
        finding.version !== exception.installedVersion) {
      return 'Missing or changed installed version in audit findings';
    }
    if (typeof finding.dev !== 'boolean' || typeof finding.optional !== 'boolean' || finding.bundled !== false) {
      return 'Incomplete or changed pnpm finding flags (bundled exposure requires review)';
    }
    if (!Array.isArray(finding.paths) || finding.paths.length === 0) return 'Missing dependency paths in audit findings';
    for (const dependencyPath of finding.paths) {
      if (typeof dependencyPath !== 'string') return 'Malformed dependency path in audit findings';
      const segments = dependencyPath.split('>');
      // pnpm includes wrapper prefixes (Expo, React Native and Metro config).
      // The reviewed edge is exact; an arbitrary prefix is not runtime proof.
      if (segments.length < 3 || segments.some((segment) => segment === '' || segment.trim() !== segment) ||
          !exception.workspaceRoots.includes(segments[0]) ||
          segments.at(-2) !== 'metro' || segments.at(-1) !== exception.package) {
        return `Unreviewed dependency path: ${dependencyPath}`;
      }
    }
  }
  return null;
}

function runAudit() {
  return runPnpmAudit({ fixture: process.env.CI_AUDIT_DATA });
}

function evaluateAudit(audit, { now = Date.now(), installedDependency } = {}) {
  if (!isValidAuditReport(audit) || audit.metadata.vulnerabilities.high !==
      Object.values(audit.advisories).filter((item) => item.severity === 'high').length) {
    // pnpm's current JSON schema counts advisories here. In particular, audit
    // ignore configuration can omit details without changing this summary.
    // An incomplete high-advisory list cannot establish exception coverage.
    console.error('[SECURITY AUDIT ERROR] Audit did not complete with a valid pnpm report.');
    return { passed: false, error: 'Missing or invalid audit evidence' };
  }

  let criticalCount = 0;
  if (audit.metadata && audit.metadata.vulnerabilities) {
    criticalCount = audit.metadata.vulnerabilities.critical || 0;
  }

  const unreviewedHighs = [];
  const approvedHighs = [];

  if (audit.advisories) {
    for (const [id, item] of Object.entries(audit.advisories)) {
      if (item.severity === 'critical') {
        criticalCount++;
      } else if (item.severity === 'high') {
        const advId = item.github_advisory_id || String(item.id || id);
        const pkgName = item.module_name;

        const matchedException = ALLOWED_HIGH_EXCEPTIONS.find(
          (ex) =>
            ex.package === pkgName &&
            // A supplied, unknown GHSA must not borrow a legacy numeric ID.
            typeof item.github_advisory_id === 'string' && ex.advisories.includes(item.github_advisory_id)
        );

        const mismatch = matchedException
          ? exceptionMismatch(item, matchedException, now, installedDependency === undefined ? readInstalledMetroDependency() : installedDependency)
          : 'Package/advisory has no reviewed exception';

        if (matchedException && !mismatch) {
          approvedHighs.push({
            package: pkgName,
            advisory: advId,
            title: item.title,
            exception: matchedException,
          });
        } else {
          unreviewedHighs.push({
            package: pkgName,
            advisory: advId,
            title: item.title,
            vulnerable_versions: item.vulnerable_versions,
            url: item.url,
            rejectionReason: mismatch,
          });
        }
      }
    }
  }

  // Check 1: Zero Critical Vulnerabilities
  if (criticalCount > 0) {
    return {
      passed: false,
      error: `${criticalCount} CRITICAL vulnerability detected. Immediate release block.`,
      criticalCount,
      unreviewedHighs,
      approvedHighs,
    };
  }

  // Check 2: Zero Unreviewed High Vulnerabilities
  if (unreviewedHighs.length > 0) {
    return {
      passed: false,
      error: `${unreviewedHighs.length} unreviewed HIGH vulnerability detected. Release gate blocked.`,
      criticalCount,
      unreviewedHighs,
      approvedHighs,
    };
  }

  return {
    passed: true,
    criticalCount,
    unreviewedHighs,
    approvedHighs,
    moderateCount: audit.metadata?.vulnerabilities?.moderate || 0,
  };
}

function main() {
  console.log('\n================================================================================');
  console.log('         EVARO SECURITY GOVERNANCE — CI DEPENDENCY RELEASE GATE                 ');
  console.log('================================================================================');

  const audit = runAudit();
  const evaluation = evaluateAudit(audit);

  if (!evaluation.passed) {
    console.error(`\n[SECURITY RELEASE GATE BLOCKED] ${evaluation.error}\n`);
    if (evaluation.unreviewedHighs && evaluation.unreviewedHighs.length > 0) {
      console.error('Unreviewed High Vulnerabilities:');
      for (const h of evaluation.unreviewedHighs) {
        console.error(`  - Package:  ${h.package}`);
        console.error(`    Advisory: ${h.advisory} (${h.title})`);
        console.error(`    Versions: ${h.vulnerable_versions}`);
        console.error(`    URL:      ${h.url}\n`);
        console.error(`    Review:   ${h.rejectionReason}\n`);
      }
    }
    process.exit(1);
  }

  console.log('Release Gate:      PASS (0 Critical, 0 Unreviewed High)');
  console.log(`Audited Findings:  0 Critical | ${evaluation.approvedHighs.length} Approved Toolchain High | ${evaluation.moderateCount} Moderate`);
  console.log('\nApproved Toolchain-Only High Exceptions:');
  for (const item of evaluation.approvedHighs) {
    console.log(`  - Package:    ${item.package} (${item.advisory})`);
    console.log(`    Title:      ${item.title}`);
    console.log(`    Role:       ${item.exception.dependencyPath} (all reported finding paths verified)`);
    console.log(`    Installed:  Metro ${item.exception.parentInstalledVersion} / image-size ${item.exception.installedVersion} (installed packages and audit findings checked)`);
    console.log(`    Reason:     ${item.exception.reason}`);
    console.log(`    Review source: ${item.exception.owner} (historical label; human release owner still requires operator confirmation)`);
    console.log(`    Re-review:  ${item.exception.reviewExpiresAt} (engineering deadline; no new operator approval)`);
    console.log(`    Milestone:  ${item.exception.removalMilestone}`);
    console.log(`    Review:     ${item.exception.reviewCondition}\n`);
  }
  console.log('Client Reachability: not inferred from audit metadata; reviewed exceptions require dependency-path review.');
  console.log('================================================================================\n');
  console.log('[SECURITY GATE PASS] CI dependency release requirements verified.\n');
}

if (require.main === module) {
  main();
}

module.exports = { evaluateAudit, runAudit, ALLOWED_HIGH_EXCEPTIONS, main };
