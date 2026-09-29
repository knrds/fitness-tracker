const assert = require('node:assert/strict');
const { spawnSync } = require('node:child_process');
const path = require('node:path');
const test = require('node:test');

const gateScript = path.resolve(__dirname, 'preview-security-gate.cjs');

const invalidAuditReports = [
  ['empty output', ''],
  ['invalid JSON', '{'],
  ['null report', 'null'],
  ['missing audit evidence', '{}'],
  ['registry error', JSON.stringify({ error: { code: 'ECONNRESET' } })],
  ['unsupported report format', JSON.stringify({ vulnerabilities: {} })],
  ['missing advisory details', JSON.stringify({ metadata: { vulnerabilities: { critical: 0, high: 0, moderate: 0 } } })],
  ['invalid vulnerability counter', JSON.stringify({ metadata: { vulnerabilities: { critical: '0', high: 0, moderate: 0 } }, advisories: {} })],
];

for (const [scenario, report] of invalidAuditReports) {
  test(`preview gate fails closed for ${scenario}`, () => {
    const cleanEnv = { ...process.env };
    for (const key of ['SUPABASE_SERVICE_ROLE_KEY', 'SUPABASE_SERVICE_KEY', 'SUPABASE_ADMIN_KEY', 'PRODUCTION_DB_URL', 'STRIPE_SECRET_KEY', 'REVENUECAT_SECRET_KEY']) {
      delete cleanEnv[key];
    }
    const result = spawnSync(process.execPath, [gateScript], {
      env: { ...cleanEnv, EVARO_AUDIT_DATA: report },
      encoding: 'utf8',
      timeout: 5000,
    });
    assert.equal(result.status, 1, result.stderr);
    assert.match(result.stderr, /SECURITY AUDIT ERROR/);
    assert.doesNotMatch(result.stdout, /SECURITY GATE PASS|Client Reachable:\s+0/);
  });
}

test('preview gate aborts if production Supabase secret role key is leaked', () => {
  const result = spawnSync(process.execPath, [gateScript], {
    env: { ...process.env, SUPABASE_SERVICE_ROLE_KEY: 'secret-key-that-must-not-exist' },
    encoding: 'utf8',
  });
  assert.notEqual(result.status, 0, 'must exit non-zero when production secret is present');
  assert.match(result.stderr, /FATAL SECURITY VIOLATION/);
  assert.match(result.stderr, /SUPABASE_SERVICE_ROLE_KEY/);
});

test('preview gate aborts if critical vulnerability is detected', () => {
  const cleanEnv = { ...process.env };
  delete cleanEnv.SUPABASE_SERVICE_ROLE_KEY;
  delete cleanEnv.SUPABASE_SERVICE_KEY;
  delete cleanEnv.SUPABASE_ADMIN_KEY;
  delete cleanEnv.PRODUCTION_DB_URL;
  delete cleanEnv.STRIPE_SECRET_KEY;
  delete cleanEnv.REVENUECAT_SECRET_KEY;

  const result = spawnSync(process.execPath, [gateScript], {
    env: {
      ...cleanEnv,
      EVARO_AUDIT_DATA: JSON.stringify({
        metadata: { vulnerabilities: { critical: 1, high: 0, moderate: 0 } },
        advisories: {
          '1': { severity: 'critical', module_name: 'test-critical' },
        },
      }),
    },
    encoding: 'utf8',
    timeout: 5000,
  });
  assert.notEqual(result.status, 0, 'must exit non-zero when critical vulnerability is present');
  assert.match(result.stderr, /SECURITY REJECTION/);
  assert.match(result.stderr, /CRITICAL vulnerability detected/);
});

test('preview gate executes audit and outputs non-release preview banner', () => {
  const cleanEnv = { ...process.env };
  delete cleanEnv.SUPABASE_SERVICE_ROLE_KEY;
  delete cleanEnv.SUPABASE_SERVICE_KEY;
  delete cleanEnv.SUPABASE_ADMIN_KEY;
  delete cleanEnv.PRODUCTION_DB_URL;
  delete cleanEnv.STRIPE_SECRET_KEY;
  delete cleanEnv.REVENUECAT_SECRET_KEY;

  const result = spawnSync(process.execPath, [gateScript], {
    env: {
      ...cleanEnv,
      EVARO_AUDIT_DATA: JSON.stringify({
        metadata: { vulnerabilities: { critical: 0, high: 2, moderate: 0 } },
        advisories: {
          '1138808': { severity: 'high', module_name: 'image-size' },
          '1138809': { severity: 'high', module_name: 'image-size' },
        },
      }),
    },
    encoding: 'utf8',
    timeout: 5000,
  });
  assert.equal(result.status, 0, result.stderr);
  assert.match(result.stdout, /EVARO SECURITY GOVERNANCE/);
  assert.match(result.stdout, /NON_RELEASE_BUILD/);
  assert.match(result.stdout, /Release Gate:\s+BLOCKED/);
  assert.match(result.stdout, /SECURITY GATE PASS/);
  assert.match(result.stdout, /Client Reachability: not inferred/);
  assert.doesNotMatch(result.stdout, /Client Reachable:\s+0/);
});

