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
test('recognizes German weekly programs and split creation as structured actions', () => {
  const { wantsStructuredPlan } = require('./coach-plans.cjs');
  for (const prompt of [
    'Erstelle jetzt ausdrücklich ein Wochenprogramm über zwei Wochen: ein Oberkörper-Unterkörper-Split mit zwei Trainingstagen pro Woche.',
    'Mach mir einen OK/UK Split',
    'Bitte ein Programm erstellen',
    'Build a weekly program',
    'Erstelle\n\n  ein einzelnes Workout als Template',
  ])
    assert.equal(wantsStructuredPlan(prompt), true, prompt);
  for (const prompt of [
    'Was ist ein OK/UK Split?',
    'Wie war mein letztes Workout?',
    'Was ist meine beste Kniebeuge?',
  ])
    assert.equal(wantsStructuredPlan(prompt), false, prompt);
});
test('retries a token-limited response and never publishes a truncated answer', async () => {
  process.env.OPENROUTER_API_KEY = 'test-key';
  process.env.OPENROUTER_MODEL = 'test-model';
  let calls = 0;
  global.fetch = async (_url, init) => {
    calls++;
    const payload = JSON.parse(init.body);
    assert.deepEqual(payload.reasoning, { enabled: false });
    return {
      ok: true,
      json: async () => ({
        choices: [
          {
            finish_reason: calls === 1 ? 'length' : 'stop',
            message: { content: calls === 1 ? 'Incomplete' : 'Complete answer' },
          },
        ],
      }),
    };
  };
  const r = res();
  await handler({ ...request(), localCoachUser: 'loopback-development' }, r);
  assert.equal(calls, 2);
  assert.equal(r.body.reply, 'Complete answer');
  global.fetch = async () => ({
    ok: true,
    json: async () => ({
      choices: [{ finish_reason: 'length', message: { content: 'Never publish this' } }],
    }),
  });
  const truncated = res();
  await handler({ ...request(), localCoachUser: 'loopback-development' }, truncated);
  assert.equal(truncated.code, 502);
  assert.equal(truncated.body.code, 'INCOMPLETE_RESPONSE');
  assert.equal(truncated.body.reply, undefined);
});
test('rejects arbitrary attachment URLs before provider access', async () => {
  global.fetch = () => {
    throw Error('must not fetch');
  };
  const r = res();
  const req = request();
  req.body.image = 'http://localhost/private';
  await handler({ ...req, localCoachUser: 'loopback-development' }, r);
  assert.equal(r.code, 400);
});
test('routes voice transcription through the configured server model', async () => {
  process.env.OPENROUTER_TRANSCRIPTION_MODEL = 'test-transcriber';
  global.fetch = async (url, init) => {
    assert.equal(url, 'https://openrouter.ai/api/v1/audio/transcriptions');
    assert.equal(JSON.parse(init.body).model, 'test-transcriber');
    return { ok: true, json: async () => ({ text: 'Vier Trainingstage bitte.' }) };
  };
  const req = request();
  req.body.audio = { data: 'YXVkaW8=', format: 'wav' };
  const r = res();
  await handler({ ...req, localCoachUser: 'loopback-development' }, r);
  assert.equal(r.body.reply, 'Vier Trainingstage bitte.');
});
test('plan validation rejects unknown exercises and impossible set prescriptions', () => {
  const { validPlan } = require('./coach-plans.cjs');
  const plan = {
    name: 'Plan',
    days: [
      {
        name: 'Tag',
        exercises: [
          {
            exerciseId: 'known',
            sets: 3,
            reps: 8,
            repsMax: 12,
            rir: 2,
            restSeconds: 120,
            notes: '',
          },
        ],
      },
    ],
  };
  assert.equal(validPlan(plan, [{ id: 'known' }]), true);
  assert.equal(validPlan(plan, [{ id: 'different' }]), false);
  plan.days[0].exercises[0].repsMax = 4;
  assert.equal(validPlan(plan, [{ id: 'known' }]), false);
});
test('maps short model exercise keys to real catalog IDs without accepting unknown keys', () => {
  const { parsePlanReply, planResponseFormat } = require('./coach-plans.cjs');
  const catalog = [{ id: 'real-id', name: 'Squat' }];
  const reply = {
    reply: 'Ready',
    plan: {
      name: 'Plan',
      days: [
        {
          name: 'Day',
          exercises: [
            {
              exerciseId: 'e0',
              sets: 3,
              reps: 8,
              repsMax: 12,
              rir: 2,
              restSeconds: 120,
              notes: '',
            },
          ],
        },
      ],
    },
  };
  assert.equal(
    parsePlanReply(JSON.stringify(reply), catalog).plan.days[0].exercises[0].exerciseId,
    'real-id',
  );
  reply.plan.days[0].exercises[0].exerciseId = 'e999';
  assert.equal(parsePlanReply(JSON.stringify(reply), catalog), null);
  assert.equal(planResponseFormat(catalog).json_schema.strict, true);
});
test('repairs an invalid plan once and returns only validated catalog exercises', async () => {
  process.env.OPENROUTER_API_KEY = 'test-key';
  process.env.OPENROUTER_MODEL = 'test-model';
  let providerCalls = 0;
  const id = '00000000-0000-4000-8000-000000000002';
  global.fetch = async (url, init) => {
    if (url.includes('europepmc'))
      return { ok: true, json: async () => ({ resultList: { result: [] } }) };
    providerCalls++;
    const payload = JSON.parse(init.body);
    assert.equal(payload.response_format.type, 'json_schema');
    const plan = {
      name: 'Plan',
      days: [
        {
          name: 'Day A',
          exercises: [
            {
              exerciseId: providerCalls === 1 ? 'e999' : 'e0',
              sets: 3,
              reps: 8,
              repsMax: 12,
              rir: 2,
              restSeconds: 120,
              notes: '',
            },
          ],
        },
      ],
    };
    return {
      ok: true,
      json: async () => ({
        choices: [
          { finish_reason: 'stop', message: { content: JSON.stringify({ reply: 'Ready', plan }) } },
        ],
      }),
    };
  };
  const req = request();
  req.body.createPlan = true;
  req.body.context = { exerciseCatalog: [{ id, name: 'Squat' }] };
  const r = res();
  await handler({ ...req, localCoachUser: 'loopback-development' }, r);
  assert.equal(r.code, 200);
  assert.equal(providerCalls, 2);
  assert.equal(r.body.plan.days[0].exercises[0].exerciseId, id);
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
