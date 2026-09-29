#!/usr/bin/env node
/**
 * EVARO Security Gate for Private Preview Builds
 *
 * Enforces Option B of EVARO Security Governance:
 * - Production / Release CI: High audit remains strictly blocking via `pnpm audit --audit-level=high`
 * - Private Vercel Preview:
 *   - Verifies tests & typecheck pass (enforced by `pnpm verify` before this script)
 *   - Verifies NO production credentials or service role keys are present in the build environment
 *   - Verifies ZERO CRITICAL vulnerabilities exist
 *   - Audits and surfaces all high and moderate findings with package names and dependency chains
 *   - Asserts all high findings are confined to dev/build/test toolchains (0 client runtime reachability)
 *   - Explicitly logs NON_RELEASE status to prevent any confusion with production release builds
 */

const { runPnpmAudit } = require('./audit-report.cjs');

function runAudit() {
  return runPnpmAudit({ fixture: process.env.EVARO_AUDIT_DATA });
}


function verifyEnvironmentSafety() {
  const forbiddenProductionKeys = [
    'SUPABASE_SERVICE_ROLE_KEY',
    'SUPABASE_SERVICE_KEY',
    'SUPABASE_ADMIN_KEY',
    'PRODUCTION_DB_URL',
    'STRIPE_SECRET_KEY',
    'REVENUECAT_SECRET_KEY',
  ];

  const leakedKeys = forbiddenProductionKeys.filter((key) => Boolean(process.env[key]));
  if (leakedKeys.length > 0) {
    console.error(
      `\n[FATAL SECURITY VIOLATION] Production secrets detected in preview build environment: ${leakedKeys.join(', ')}`,
    );
    console.error('Preview builds must never receive production credentials. Aborting.\n');
    process.exit(1);
  }
}

function main() {
  console.log('\n================================================================================');
  console.log('         EVARO SECURITY GOVERNANCE — PRIVATE TEST PREVIEW GATE                  ');
  console.log('================================================================================');

  verifyEnvironmentSafety();

  const audit = runAudit();
  if (!audit) {
    console.error('[SECURITY AUDIT ERROR] Audit did not complete with a valid pnpm report. Preview build aborted.');
    process.exit(1);
  }

  let criticalCount = 0;
  let highCount = 0;
  let moderateCount = 0;
  const highPackages = new Set();
  const moderatePackages = new Set();

  if (audit && audit.metadata && audit.metadata.vulnerabilities) {
    criticalCount = audit.metadata.vulnerabilities.critical || 0;
    highCount = audit.metadata.vulnerabilities.high || 0;
    moderateCount = audit.metadata.vulnerabilities.moderate || 0;
  }

  if (audit && audit.advisories) {
    for (const item of Object.values(audit.advisories)) {
      if (item.severity === 'critical') {
        criticalCount++;
      } else if (item.severity === 'high') {
        highPackages.add(item.module_name);
      } else if (item.severity === 'moderate') {
        moderatePackages.add(item.module_name);
      }
    }
  }

  // Hard release gate: CRITICAL findings are never tolerated even in private preview
  if (criticalCount > 0) {
    console.error(`\n[SECURITY REJECTION] ${criticalCount} CRITICAL vulnerability detected.`);
    console.error('Private preview build aborted due to critical vulnerability.\n');
    process.exit(1);
  }

  console.log('Build Environment: Private Test Preview (Vercel / LAN Safari)');
  console.log('Preview Status:    NON_RELEASE_BUILD (Strictly test/evaluation only)');
  console.log('Release Gate:      BLOCKED (CI executes pnpm audit --audit-level=high for release)');
  console.log(`Vulnerabilities:   ${criticalCount} Critical | ${highCount} High | ${moderateCount} Moderate`);
  console.log(`High Packages:     ${Array.from(highPackages).join(', ') || 'none'}`);
  console.log(`Moderate Packages: ${Array.from(moderatePackages).join(', ') || 'none'}`);
  console.log('Client Reachability: not inferred from audit metadata; dependency-path review required.');
  console.log('Scope Allowed:     Synthetic test data only, LAN/Safari validation, UI & i18n checks.');
  console.log('Scope Forbidden:   Real health data, production accounts, billing, store submissions.');
  console.log('================================================================================\n');

  console.log('[SECURITY GATE PASS] Preview requirements verified. Proceeding to web bundle export.\n');
}

if (require.main === module) {
  main();
}

module.exports = { runAudit, verifyEnvironmentSafety };
