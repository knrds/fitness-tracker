const assert = require('node:assert/strict');
const { spawnSync } = require('node:child_process');
const path = require('node:path');
const test = require('node:test');

const gateScript = path.resolve(__dirname, 'ci-dependency-gate.cjs');

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
      vulnerabilities: { critical: 0, high: 2, moderate: 5 },
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
});
