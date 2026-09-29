const assert = require('node:assert/strict');
const { spawnSync } = require('node:child_process');
const path = require('node:path');
const test = require('node:test');
const { isValidAuditReport, runPnpmAudit } = require('./audit-report.cjs');

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
  const auditData = {
    metadata: {
      vulnerabilities: { critical: 0, high: 2, moderate: 0 },
    },
    advisories: {
      '1138808': {
        id: 1138808,
        module_name: 'image-size',
        severity: 'high',
        github_advisory_id: 'GHSA-w3rx-r6r6-pgpr',
        title: 'image-size: ICNS parser allows denial of service',
      },
      '1138809': {
        id: 1138809,
        module_name: 'image-size',
        severity: 'high',
        github_advisory_id: 'GHSA-5p2g-fcmc-qvqq',
        title: 'image-size: JXL and HEIF parsers allow denial of service',
      },
    },
  };

  const result = spawnSync(process.execPath, [gateScript], {
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
  assert.match(result.stdout, /SECURITY GATE PASS/);
  assert.match(result.stdout, /Client Reachability: not inferred/);
  assert.doesNotMatch(result.stdout, /Client Reachable:\s+0/);
});
