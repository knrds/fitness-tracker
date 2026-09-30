const assert = require('node:assert/strict');
const { spawnSync } = require('node:child_process');
const path = require('node:path');
const test = require('node:test');
const { isValidAuditReport, runPnpmAudit } = require('./audit-report.cjs');
const { evaluateAudit, ALLOWED_HIGH_EXCEPTIONS } = require('./ci-dependency-gate.cjs');

const gateScript = path.resolve(__dirname, 'ci-dependency-gate.cjs');

const invalidAuditReports = [
  ['empty output', ''],
  ['invalid JSON', '{'],
  ['null report', 'null'],
  ['missing audit evidence', '{}'],
  ['registry error', JSON.stringify({ error: { code: 'ECONNRESET' } })],
  ['unsupported report format', JSON.stringify({ vulnerabilities: {} })],
  ['missing advisory details', JSON.stringify({ metadata: { vulnerabilities: { critical: 0, high: 0, moderate: 0 } } })],
  ['invalid vulnerability counter', JSON.stringify({ metadata: { vulnerabilities: { critical: '0', high: 0, moderate: 0 } }, advisories: {} })],
  ['unexplained high findings', JSON.stringify({ metadata: { vulnerabilities: { critical: 0, high: 1, moderate: 0 } }, advisories: {} })],
];

const cleanReport = {
  metadata: { vulnerabilities: { info: 0, low: 0, moderate: 0, high: 0, critical: 0 } },
  advisories: {},
};

const reviewNow = Date.parse('2026-09-30T12:00:00.000Z');
const reviewedInstallation = { parentVersion: '0.83.3', version: '1.2.1' };

function reviewedReport() {
  return {
    metadata: { vulnerabilities: { ...cleanReport.metadata.vulnerabilities, high: 2 } },
    advisories: {
      // The numeric registry IDs changed in the fresh pnpm 11.5 audit. The
      // stable GHSAs and finding schema are the security decision inputs.
      1239766: {
        id: 1239766,
        module_name: 'image-size', severity: 'high',
        github_advisory_id: 'GHSA-w3rx-r6r6-pgpr',
        title: 'image-size: ICNS parser allows denial of service',
        findings: [{
          version: '1.2.1',
          paths: ['.>metro>image-size', '.>metro-config>metro>image-size'],
          dev: false, optional: false, bundled: false,
        }],
      },
      1239765: {
        id: 1239765,
        module_name: 'image-size', severity: 'high',
        github_advisory_id: 'GHSA-5p2g-fcmc-qvqq',
        title: 'image-size: JXL and HEIF parsers allow denial of service',
        findings: [{
          version: '1.2.1',
          paths: ['apps__mobile>@expo/metro-runtime>expo>@expo/cli>@expo/metro>metro>image-size'],
          dev: false, optional: false, bundled: false,
        }],
      },
    },
  };
}

function evaluateReviewed(audit, options = {}) {
  return evaluateAudit(audit, { now: reviewNow, installedDependency: reviewedInstallation, ...options });
}

test('audit runner accepts successful empty reports and vulnerability exit status 1', () => {
  assert.deepEqual(runPnpmAudit({ spawn: () => ({ status: 0, stdout: JSON.stringify(cleanReport) }) }), cleanReport);
  const report = {
    metadata: { vulnerabilities: { ...cleanReport.metadata.vulnerabilities, moderate: 1 } },
    advisories: { 1: { module_name: 'test-build-tool', severity: 'moderate' } },
  };
  assert.deepEqual(runPnpmAudit({ spawn: () => ({ status: 1, stdout: JSON.stringify(report) }) }), report);
});

test('audit runner rejects process failures even when output contains valid audit JSON', () => {
  for (const failure of [
    { status: null, error: new Error('ENOENT') },
    { status: null, signal: 'SIGTERM' },
    { status: 0, error: new Error('ETIMEDOUT') },
    { status: 2 },
  ]) {
    assert.equal(runPnpmAudit({ spawn: () => ({ stdout: JSON.stringify(cleanReport), ...failure }) }), null);
  }
  assert.equal(runPnpmAudit({ spawn: () => { throw new Error('spawn failed'); } }), null);
});

test('audit runner rejects registry errors, truncated output and stderr-only reports', () => {
  for (const output of [
    { stdout: JSON.stringify({ error: { code: 'ECONNRESET' } }) },
    { stdout: '{"advisories":' },
    { stdout: `registry request failed\n${JSON.stringify(cleanReport)}` },
    { stdout: '', stderr: JSON.stringify(cleanReport) },
  ]) {
    assert.equal(runPnpmAudit({ spawn: () => ({ status: 1, ...output }) }), null);
  }
});

test('audit schema rejects malformed counters, advisory records and unknown severities', () => {
  for (const critical of [-1, 0.5, NaN, Infinity, '0', null]) {
    assert.equal(isValidAuditReport({ ...cleanReport, metadata: { vulnerabilities: { ...cleanReport.metadata.vulnerabilities, critical } } }), false);
  }
  for (const advisory of [null, [], {}, { severity: 'unknown', module_name: 'test' }, { severity: 'high', module_name: '' }]) {
    assert.equal(isValidAuditReport({ ...cleanReport, advisories: { 1: advisory } }), false);
  }
  assert.equal(isValidAuditReport({ ...cleanReport, advisories: [] }), false);
  assert.equal(isValidAuditReport({ ...cleanReport, error: { code: 'ECONNRESET' } }), false);
});

for (const [scenario, report] of invalidAuditReports) {
  test(`ci dependency gate fails closed for ${scenario}`, () => {
    const result = spawnSync(process.execPath, [gateScript], {
      env: { ...process.env, CI_AUDIT_DATA: report },
      encoding: 'utf8',
      timeout: 5000,
    });
    assert.equal(result.status, 1, result.stderr);
    assert.match(result.stderr, /SECURITY AUDIT ERROR/);
    assert.doesNotMatch(result.stdout, /SECURITY GATE PASS|Client Reachable:\s+0/);
  });
}

test('ci dependency gate rejects critical vulnerability', () => {
  const auditData = {
    metadata: {
      vulnerabilities: { critical: 1, high: 0, moderate: 0 },
    },
    advisories: {
      '1': {
        module_name: 'malicious-pkg',
        severity: 'critical',
        github_advisory_id: 'GHSA-crit-0001',
        title: 'Remote Code Execution',
      },
    },
  };

  const result = spawnSync(process.execPath, [gateScript], {
    env: { ...process.env, CI_AUDIT_DATA: JSON.stringify(auditData) },
    encoding: 'utf8',
  });

  assert.notEqual(result.status, 0, 'must exit non-zero on critical vulnerability');
  assert.match(result.stderr, /CRITICAL vulnerability detected/);
});

test('ci dependency gate rejects unreviewed high vulnerability', () => {
  const auditData = {
    metadata: {
      vulnerabilities: { critical: 0, high: 1, moderate: 0 },
    },
    advisories: {
      '2': {
        module_name: 'some-runtime-package',
        severity: 'high',
        github_advisory_id: 'GHSA-high-unreviewed',
        title: 'Prototype Pollution',
        vulnerable_versions: '<1.0.0',
        url: 'https://example.com',
      },
    },
  };

  const result = spawnSync(process.execPath, [gateScript], {
    env: { ...process.env, CI_AUDIT_DATA: JSON.stringify(auditData) },
    encoding: 'utf8',
  });

  assert.notEqual(result.status, 0, 'must exit non-zero on unreviewed high vulnerability');
  assert.match(result.stderr, /unreviewed HIGH vulnerability detected/);
  assert.match(result.stderr, /some-runtime-package/);
});

test('ci dependency gate accepts reviewed image-size toolchain findings', () => {
  const auditData = reviewedReport();
  assert.equal(evaluateReviewed(auditData).passed, true);

  // Fix only this child process clock so regression tests remain deterministic
  // after the real policy expires. The gate has no environment expiry bypass.
  const result = spawnSync(process.execPath, ['-e', `Date.now = () => ${reviewNow}; require(${JSON.stringify(gateScript)}).main();`], {
    env: { ...process.env, CI_AUDIT_DATA: JSON.stringify(auditData) },
    encoding: 'utf8',
  });

  assert.equal(result.status, 0, result.stderr);
  assert.match(result.stdout, /CI DEPENDENCY RELEASE GATE/);
  assert.match(result.stdout, /Release Gate:\s+PASS/);
  assert.match(result.stdout, /Approved Toolchain-Only High Exceptions/);
  assert.match(result.stdout, /GHSA-w3rx-r6r6-pgpr/);
  assert.match(result.stdout, /GHSA-5p2g-fcmc-qvqq/);
  assert.match(result.stdout, /Astra Security Governance/);
  assert.match(result.stdout, /all reported finding paths verified/);
  assert.match(result.stdout, /2026-10-21T00:00:00.000Z/);
  assert.match(result.stdout, /engineering deadline; no new operator approval/);
  assert.match(result.stdout, /human release owner still requires operator confirmation/);
  assert.match(result.stdout, /SECURITY GATE PASS/);
  assert.match(result.stdout, /Client Reachability: not inferred/);
  assert.doesNotMatch(result.stdout, /Client Reachable:\s+0/);
});

test('reviewed advisory requires every finding to have the exact reviewed installed version', () => {
  for (const findings of [
    undefined, null, [], {},
    [{}], [null], [[]],
    [{ ...reviewedReport().advisories[1239766].findings[0], version: '1.2.2' }],
    [{ ...reviewedReport().advisories[1239766].findings[0], version: undefined }],
    [...reviewedReport().advisories[1239766].findings, { version: '2.0.2', paths: ['.>metro>image-size'], dev: true, optional: false, bundled: false }],
  ]) {
    const audit = reviewedReport();
    audit.advisories[1239766].findings = findings;
    const evaluation = evaluateReviewed(audit);
    assert.equal(evaluation.passed, false, JSON.stringify(findings));
    assert.equal(evaluation.approvedHighs.length, 1, 'one valid advisory cannot hide the changed finding');
  }
});

test('reviewed advisory rejects missing, malformed or foreign dependency paths even alongside reviewed paths', () => {
  for (const paths of [
    undefined, null, [], {}, [null], [42], [''],
    ['.>image-size'], ['apps__mobile>runtime-parser>image-size'],
    ['apps__mobile>metro-alias>image-size'], ['apps__mobile>metro>image-size>helper'],
    ['apps__server>metro>image-size'], ['.>>metro>image-size'],
    ['.> metro>image-size'], ['.>metro>image-size '],
    ['.>metro>image-size', 'apps__mobile>image-size'],
  ]) {
    const audit = reviewedReport();
    audit.advisories[1239766].findings[0].paths = paths;
    assert.equal(evaluateReviewed(audit).passed, false, JSON.stringify(paths));
  }
  const audit = reviewedReport();
  audit.advisories[1239766].findings.push({ version: '1.2.1', paths: ['apps__mobile>runtime-parser>image-size'], dev: false, optional: false, bundled: false });
  assert.equal(evaluateReviewed(audit).passed, false, 'all findings, not just the first, are reviewed');
});

test('reviewed advisory fails closed for incomplete or newly bundled finding flags', () => {
  for (const changes of [
    { dev: undefined }, { optional: undefined }, { bundled: undefined },
    { dev: 'true' }, { optional: null }, { bundled: true },
  ]) {
    const audit = reviewedReport();
    Object.assign(audit.advisories[1239766].findings[0], changes);
    assert.equal(evaluateReviewed(audit).passed, false, JSON.stringify(changes));
  }
  assert.equal(evaluateReviewed(reviewedReport()).passed, true, 'pnpm dev:false does not establish runtime reachability');
});

test('installed Metro resolution must separately match the reviewed parent and vulnerable package versions', () => {
  for (const installedDependency of [null, {},
    { parentVersion: '0.83.3', version: '1.2.2' },
    { parentVersion: '0.84.0', version: '1.2.1' },
    { parentVersion: '0.83.3' }, { version: '1.2.1' },
  ]) {
    const evaluation = evaluateReviewed(reviewedReport(), { installedDependency });
    assert.equal(evaluation.passed, false, JSON.stringify(installedDependency));
    assert.equal(evaluation.approvedHighs.length, 0);
  }
});

test('reviewed exceptions expire at the finite engineering deadline without changing the historical review', () => {
  for (const exception of ALLOWED_HIGH_EXCEPTIONS) {
    assert.equal(exception.reviewedOn, '2026-09-21');
    assert.equal(exception.reviewExpiresAt, '2026-10-21T00:00:00.000Z');
  }
  const expiresAt = Date.parse('2026-10-21T00:00:00.000Z');
  assert.equal(evaluateReviewed(reviewedReport(), { now: expiresAt - 1 }).passed, true);
  for (const now of [expiresAt, expiresAt + 1, Date.parse('2026-09-20T23:59:59.999Z'), NaN, Infinity, '2026-09-30']) {
    assert.equal(evaluateReviewed(reviewedReport(), { now }).passed, false, String(now));
  }
});

test('stable GHSA identity cannot be replaced by a legacy numeric ID or missing advisory evidence', () => {
  for (const changes of [
    { id: 1138808, github_advisory_id: 'GHSA-unreviewed-high' },
    { id: 1138808, github_advisory_id: undefined },
    { id: 1138808, github_advisory_id: null },
    { module_name: 'other-package' },
  ]) {
    const audit = reviewedReport();
    Object.assign(audit.advisories[1239766], changes);
    assert.equal(evaluateReviewed(audit).passed, false, JSON.stringify(changes));
  }
});

test('reviewed highs cannot hide omitted or contradictory high advisory summary evidence', () => {
  for (const high of [0, 1, 3]) {
    const audit = reviewedReport();
    audit.metadata.vulnerabilities.high = high;
    const evaluation = evaluateReviewed(audit);
    assert.equal(evaluation.passed, false);
    assert.equal(evaluation.error, 'Missing or invalid audit evidence');
  }
  const audit = reviewedReport();
  delete audit.advisories[1239766];
  assert.equal(evaluateReviewed(audit).passed, false, 'a filtered-out advisory must not inherit the remaining exception');
});
