const { test, afterEach } = require('node:test');
const assert = require('node:assert/strict');
const { randomBytes } = require('node:crypto');
const handler = require('./beta-session.js');
const { issueBetaToken, verifyBetaToken } = require('./beta-auth.cjs');
const originalEnv = { ...process.env };
afterEach(() => { process.env = { ...originalEnv }; });

function response() {
  return { code: 200, body: null, setHeader() {},
    status(code) { this.code = code; return this; },
    json(body) { this.body = body; return this; }, end() { return this; } };
}
async function call(body) {
  const res = response();
  await handler({ method: 'POST', headers: {}, body }, res);
  return res;
}
function configureBeta() {
  process.env.APP_ENV = 'beta';
  process.env.BETA_SESSION_SECRET = randomBytes(32).toString('hex');
  delete process.env.BETA_FULL_ACCESS;
}
test('beta session accepts a bounded installation identity and signs a scoped token', async () => {
  configureBeta();
  const res = await call({ installationId: 'test-device-123' });
  assert.equal(res.code, 200);
  assert.equal(verifyBetaToken(res.body.token).isBeta, true);
});
test('beta session rejects malformed, oversized and missing identities without throwing', async () => {
  configureBeta();
  assert.equal((await call('{')).code, 400);
  assert.equal((await call({ installationId: 'x'.repeat(1024) })).code, 413);
  assert.equal((await call({})).code, 400);
  assert.equal((await call({ installationId: '../invalid' })).code, 400);
});
test('hosting and client flags cannot enable beta authentication in production', async () => {
  configureBeta();
  const token = issueBetaToken('test-device-123');
  process.env.APP_ENV = 'production';
  process.env.VERCEL = '1';
  process.env.EXPO_PUBLIC_BETA_FULL_ACCESS = 'true';
  assert.equal((await call({ installationId: 'test-device-123' })).code, 403);
  assert.equal(verifyBetaToken(token), null);
});
test('missing signing secret fails closed and malformed Unicode signatures never throw', async () => {
  configureBeta();
  const token = issueBetaToken('test-device-123');
  assert.equal(verifyBetaToken(token.slice(0, token.lastIndexOf('.') + 1) + 'é'.repeat(43)), null);
  delete process.env.BETA_SESSION_SECRET;
  assert.equal((await call({ installationId: 'test-device-123' })).code, 500);
  assert.equal(verifyBetaToken(token), null);
});
