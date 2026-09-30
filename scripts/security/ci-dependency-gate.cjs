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
 *     - Governance owner, review condition, and removal milestone
 * - Any new or unreviewed High finding immediately breaks CI.
 */

const { isValidAuditReport, runPnpmAudit } = require('./audit-report.cjs');

const ALLOWED_HIGH_EXCEPTIONS = [
  {
    package: 'image-size',
    advisories: ['GHSA-w3rx-r6r6-pgpr', '1138808'],
    vulnerableVersions: '<=2.0.2',
    installedVersion: '1.2.1',
    dependencyPath: 'metro > image-size',
    runtimeReachable: false,
    reason:
      'Metro dev toolchain asset dimension parser. Build-time only; never bundled into iOS/Android native client or web runtime distribution.',
    owner: 'Astra Security Governance',
    reviewCondition: 'Reviewed 2026-09-21; source retained in Git at 39b2b3e, current policy: docs/roadmap/SECURITY_PRIVACY.md; remove on Expo SDK / Metro upgrade.',
    removalMilestone: 'Expo SDK 55 / Metro upgrade',
  },
  {
    package: 'image-size',
    advisories: ['GHSA-5p2g-fcmc-qvqq', '1138809'],
    vulnerableVersions: '<=2.0.2',
    installedVersion: '1.2.1',
    dependencyPath: 'metro > image-size',
    runtimeReachable: false,
    reason:
      'Metro dev toolchain asset dimension parser. Build-time only; never bundled into iOS/Android native client or web runtime distribution.',
    owner: 'Astra Security Governance',
    reviewCondition: 'Reviewed 2026-09-21; source retained in Git at 39b2b3e, current policy: docs/roadmap/SECURITY_PRIVACY.md; remove on Expo SDK / Metro upgrade.',
    removalMilestone: 'Expo SDK 55 / Metro upgrade',
  },
];

function runAudit() {
  return runPnpmAudit({ fixture: process.env.CI_AUDIT_DATA });
}

function evaluateAudit(audit) {
  if (!isValidAuditReport(audit)) {
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
            (ex.advisories.includes(advId) || ex.advisories.includes(String(item.id)))
        );

        if (matchedException) {
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
    console.log(`    Role:       ${item.exception.dependencyPath} (reviewed build-tool path; not verified by this gate)`);
    console.log(`    Reason:     ${item.exception.reason}`);
    console.log(`    Owner:      ${item.exception.owner}`);
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

module.exports = { evaluateAudit, runAudit, ALLOWED_HIGH_EXCEPTIONS };
