const { test, after } = require('node:test');
const assert = require('node:assert/strict');
const handler = require('./coach-chat');
const originalFetch = global.fetch;
const originalEnv = { ...process.env };
after(() => {
  global.fetch = originalFetch;
  process.env = originalEnv;
});
function res() {
  return {
    code: 200,
    body: null,
    headers: {},
    setHeader(k, v) {
      this.headers[k] = v;
    },
    status(code) {
      this.code = code;
      return this;
    },
    json(body) {
      this.body = body;
      return this;
    },
    end() {
      return this;
    },
  };
}
const request = () => ({
  method: 'POST',
  headers: { authorization: 'Bearer test-token' },
  body: { messages: [{ role: 'user', content: 'Review my training' }], context: {} },
});
test('preserves credit errors without exposing raw provider details, including HTTP 200 errors', async () => {
  process.env.OPENROUTER_API_KEY = 'private-test-key';
  process.env.OPENROUTER_MODEL = 'configured-model';
  for (const status of [402, 200]) {
    global.fetch = async () => ({
      ok: status === 200,
      status,
      json: async () => ({ error: { code: 402, message: 'private-test-key provider internals' } }),
    });
    const r = res();
    await handler({ ...request(), localCoachUser: 'loopback-development' }, r);
    assert.equal(r.code, 402);
    assert.equal(r.body.code, 'PROVIDER_CREDITS');
    assert.equal(JSON.stringify(r.body).includes('private-test-key'), false);
  }
});
test('requires authentication before contacting a provider', async () => {
  global.fetch = () => {
    throw Error('must not fetch');
  };
  const r = res();
  await handler({ ...request(), headers: {} }, r);
  assert.equal(r.code, 401);
});
test('reports missing server configuration explicitly', async () => {
  delete process.env.OPENROUTER_MODEL;
  const r = res();
  await handler(request(), r);
  assert.equal(r.code, 503);
});
test('forwards the actual question to the provider after verifying the user', async () => {
  Object.assign(process.env, {
    SUPABASE_URL: 'https://auth.example.test',
    SUPABASE_ANON_KEY: 'test-anon',
    OPENROUTER_API_KEY: 'test-provider-key',
    OPENROUTER_MODEL: 'configured-model',
  });
  const calls = [];
  global.fetch = async (url, init) => {
    calls.push({ url, init });
    return calls.length === 1
      ? { ok: true, json: async () => ({ id: 'test-user' }) }
      : {
          ok: true,
          json: async () => ({ choices: [{ message: { content: 'Actual provider response' } }] }),
        };
  };
  const r = res();
  const req = request();
  req.body.model = 'untrusted-client-model';
  await handler(req, r);
  assert.equal(r.code, 200);
  assert.equal(r.body.reply, 'Actual provider response');
  assert.equal(calls.length, 2);
  const payload = JSON.parse(calls[1].init.body);
  assert.equal(payload.model, 'configured-model');
  assert.equal(payload.messages.at(-1).content, 'Review my training');
});
test('rejects client system instructions', async () => {
  global.fetch = () => {
    throw Error('must not fetch');
  };
  const req = request();
  req.body.messages[0].role = 'system';
  const r = res();
  await handler(req, r);
  assert.equal(r.code, 400);
});
test('rejects invalid sessions before provider access', async () => {
  let calls = 0;
  global.fetch = async () => {
    calls++;
    return { ok: false, status: 401 };
  };
  const r = res();
  await handler(request(), r);
  assert.equal(r.code, 401);
  assert.equal(calls, 1);
});
test('local server can use a provider key without Supabase but a client header cannot bypass auth', async () => {
  delete process.env.SUPABASE_URL;
  delete process.env.SUPABASE_ANON_KEY;
  let calls = 0;
  global.fetch = async () => {
    calls++;
    return {
      ok: true,
      json: async () => ({ choices: [{ message: { content: 'Local API response' } }] }),
    };
  };
  const local = { ...request(), headers: {}, localCoachUser: 'loopback-development' };
  const r = res();
  await handler(local, r);
  assert.equal(r.code, 200);
  assert.equal(calls, 1);
  const forged = { ...request(), headers: { localCoachUser: 'loopback-development' } };
  const denied = res();
  await handler(forged, denied);
  assert.equal(denied.code, 401);
  assert.equal(calls, 1);
});
