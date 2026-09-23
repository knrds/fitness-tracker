const assert = require('node:assert/strict');
const { spawnSync } = require('node:child_process');
const path = require('node:path');
const test = require('node:test');

const gateScript = path.resolve(__dirname, 'preview-security-gate.cjs');

test('preview gate aborts if production Supabase secret role key is leaked', () => {
  const result = spawnSync(process.execPath, [gateScript], {
    env: { ...process.env, SUPABASE_SERVICE_ROLE_KEY: 'secret-key-that-must-not-exist' },
    encoding: 'utf8',
  });
  assert.notEqual(result.status, 0, 'must exit non-zero when production secret is present');
  assert.match(result.stderr, /FATAL SECURITY VIOLATION/);
  assert.match(result.stderr, /SUPABASE_SERVICE_ROLE_KEY/);
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
    env: cleanEnv,
    encoding: 'utf8',
    timeout: 30000,
  });
  assert.equal(result.status, 0, result.stderr);
  assert.match(result.stdout, /EVARO SECURITY GOVERNANCE/);
  assert.match(result.stdout, /NON_RELEASE_BUILD/);
  assert.match(result.stdout, /Release Gate:\s+BLOCKED/);
  assert.match(result.stdout, /SECURITY GATE PASS/);
});
