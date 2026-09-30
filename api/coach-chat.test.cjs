const { test, after } = require('node:test');
const assert = require('node:assert/strict');
const handler = require('./coach-chat');
const originalFetch = global.fetch;
const originalEnv = { ...process.env };
// Loopback fixtures must not inherit the build host's deployment identity.
// Dedicated tests below explicitly restore production/VERCEL to test rejection.
process.env.NODE_ENV = 'test';
delete process.env.VERCEL;
delete process.env.COACH_QUOTA_ENABLED;
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
test('server kill switch blocks requests before any provider access', async () => {
  const previous = process.env.COACH_ENABLED;
  process.env.COACH_ENABLED = 'false';
  let called = false;
  global.fetch = async () => {
    called = true;
    throw new Error('must not run');
  };
  try {
    const r = res();
    await handler(request(), r);
    assert.equal(r.code, 503);
    assert.equal(r.body.code, 'COACH_DISABLED');
    assert.equal(called, false);
  } finally {
    if (previous === undefined) delete process.env.COACH_ENABLED;
    else process.env.COACH_ENABLED = previous;
  }
});
test('one identity cannot run parallel provider requests and admission is released afterwards', async () => {
  process.env.OPENROUTER_API_KEY = 'test-key';
  process.env.OPENROUTER_MODEL = 'test-model';
  let release;
  const pending = new Promise((resolve) => {
    release = resolve;
  });
  let calls = 0;
  global.fetch = async () => {
    calls++;
    await pending;
    return {
      ok: true,
      json: async () => ({
        choices: [{ finish_reason: 'stop', message: { content: 'Training response' } }],
      }),
    };
  };
  const req = { ...request(), localCoachUser: 'loopback-concurrency-regression' };
  const first = res();
  const running = handler(req, first);
  const second = res();
  await handler(req, second);
  assert.equal(second.code, 429);
  assert.equal(second.body.code, 'CONCURRENCY_LIMIT');
  assert.equal(calls, 1);
  release();
  await running;
  const third = res();
  await handler(req, third);
  assert.equal(third.code, 200);
  assert.equal(calls, 2);
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
    const payload = JSON.parse(init.body);
    assert.equal(payload.model, 'test-transcriber');
    assert.equal(Object.hasOwn(payload, 'language'), false);
    assert.equal(payload.temperature, 0);
    assert.match(payload.provider.options.groq.prompt, /Wiederholungen.*Bench Press/);
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
test('prototype environment flag never authorizes a public request', async () => {
  delete process.env.SUPABASE_URL;
  delete process.env.SUPABASE_ANON_KEY;
  process.env.ALLOW_PROTOTYPE_COACH = 'true';
  process.env.OPENROUTER_API_KEY = 'test-key';
  process.env.OPENROUTER_MODEL = 'test-model';
  let calls = 0;
  global.fetch = async () => {
    calls++;
    return {
      ok: true,
      json: async () => ({ choices: [{ message: { content: 'Prototype response' } }] }),
    };
  };
  const previousNodeEnv = process.env.NODE_ENV;
  try {
    for (const environment of [undefined, 'development', 'production']) {
      if (environment === undefined) delete process.env.NODE_ENV;
      else process.env.NODE_ENV = environment;
      const protoReq = {
        ...request(),
        headers: { 'x-forwarded-for': '127.0.0.1', localCoachUser: 'loopback-development' },
        body: { ...request().body, localCoachUser: 'loopback-development' },
      };
      const r = res();
      await handler(protoReq, r);
      assert.equal(r.code, 401, String(environment));
      assert.equal(calls, 0);
    }
  } finally {
    if (previousNodeEnv === undefined) delete process.env.NODE_ENV;
    else process.env.NODE_ENV = previousNodeEnv;
    delete process.env.ALLOW_PROTOTYPE_COACH;
  }
});

test('preserves multi-turn conversation memory and clean message order', async () => {
  process.env.OPENROUTER_API_KEY = 'test-key';
  process.env.OPENROUTER_MODEL = 'test-model';
  let passedMessages = null;
  global.fetch = async (_url, init) => {
    passedMessages = JSON.parse(init.body).messages;
    return {
      ok: true,
      json: async () => ({ choices: [{ message: { content: 'Updated plan answer' } }] }),
    };
  };
  const req = request();
  req.body.messages = [
    { role: 'user', content: 'Erstelle mir einen Plan' },
    { role: 'assistant', content: 'Hier ist dein Plan' },
    { role: 'user', content: 'Passe die Sätze an' },
  ];
  const r = res();
  await handler({ ...req, localCoachUser: 'loopback-development' }, r);
  assert.equal(r.code, 200);
  assert.equal(passedMessages.length, 4); // 1 system + 3 conversation turns
  assert.equal(passedMessages[0].role, 'system');
  assert.equal(passedMessages[1].role, 'user');
  assert.equal(passedMessages[1].content, 'Erstelle mir einen Plan');
  assert.equal(passedMessages[2].role, 'assistant');
  assert.equal(passedMessages[2].content, 'Hier ist dein Plan');
  assert.equal(passedMessages[3].role, 'user');
  assert.equal(passedMessages[3].content, 'Passe die Sätze an');
});

test('uses configured or default fast model in fast mode', async () => {
  process.env.OPENROUTER_API_KEY = 'test-key';
  process.env.OPENROUTER_MODEL = 'test-plan-model';
  delete process.env.OPENROUTER_FAST_MODEL;
  let passedModel = null;
  global.fetch = async (_url, init) => {
    passedModel = JSON.parse(init.body).model;
    return {
      ok: true,
      json: async () => ({ choices: [{ message: { content: 'Fast answer' } }] }),
    };
  };
  const req = request();
  req.body.mode = 'fast';
  const r = res();
  await handler({ ...req, localCoachUser: 'loopback-development' }, r);
  assert.equal(r.code, 200);
  assert.equal(passedModel, 'openai/gpt-4o-mini');
});

test('prototype flag cannot bypass verification of an invalid bearer session', async () => {
  process.env.OPENROUTER_API_KEY = 'test-key';
  process.env.OPENROUTER_MODEL = 'test-model';
  process.env.ALLOW_PROTOTYPE_COACH = 'true';
  process.env.SUPABASE_URL = 'https://auth.example.test';
  process.env.SUPABASE_ANON_KEY = 'test-anon';
  const urls = [];
  global.fetch = async (url) => {
    urls.push(url);
    return { ok: false, status: 401 };
  };
  try {
    const denied = res();
    await handler(request(), denied);
    assert.equal(denied.code, 401);
    assert.deepEqual(urls, ['https://auth.example.test/auth/v1/user']);
  } finally {
    delete process.env.ALLOW_PROTOTYPE_COACH;
  }
});

test('production and hosted deployments reject the local development identity', async () => {
  const previousNodeEnv = process.env.NODE_ENV;
  const previousVercel = process.env.VERCEL;
  let calls = 0;
  global.fetch = async () => {
    calls++;
    throw new Error('provider must not be called');
  };
  try {
    for (const [environment, vercel] of [
      ['production', undefined],
      ['development', '1'],
    ]) {
      process.env.NODE_ENV = environment;
      if (vercel === undefined) delete process.env.VERCEL;
      else process.env.VERCEL = vercel;
      const denied = res();
      await handler({ ...request(), headers: {}, localCoachUser: 'loopback-development' }, denied);
      assert.equal(denied.code, 401);
      assert.equal(calls, 0);
    }
  } finally {
    if (previousNodeEnv === undefined) delete process.env.NODE_ENV;
    else process.env.NODE_ENV = previousNodeEnv;
    if (previousVercel === undefined) delete process.env.VERCEL;
    else process.env.VERCEL = previousVercel;
  }
});

// Offline contract tests only: provider/auth/store calls are all intercepted.
async function withQuota(run) {
  const previous = { ...process.env };
  const previousFetch = global.fetch;
  Object.assign(process.env, {
    COACH_QUOTA_ENABLED: 'true',
    COACH_QUOTA_STORE: 'supabase-rpc',
    COACH_QUOTA_HASH_SECRET: 'quota-test-fixture-'.repeat(3),
    SUPABASE_URL: 'https://quota.example.test',
    SUPABASE_SECRET_KEY: 'sb_secret_test_only',
    OPENROUTER_API_KEY: 'test-provider-key',
    OPENROUTER_MODEL: 'test-model',
  });
  delete process.env.COACH_ENABLED;
  try {
    await run();
  } finally {
    process.env = previous;
    global.fetch = previousFetch;
  }
}
const quotaRequest = (name) => ({
  ...request(),
  localCoachUser: 'loopback-quota-' + name,
  headers: { 'idempotency-key': '00000000-0000-4000-8000-000000000020' },
});
function quotaFetch(overrides = {}) {
  const calls = [];
  let attempts = 0;
  const fetch = async (url, init) => {
    const body = init.body ? JSON.parse(init.body) : null;
    if (url.endsWith('/auth/v1/user'))
      return { ok: true, json: async () => ({ id: '00000000-0000-4000-8000-000000000001' }) };
    const name = url.split('/').at(-1);
    calls.push({ name, body });
    if (overrides[name]) return overrides[name](body, calls);
    if (name === 'coach_quota_reserve_v1')
      return {
        ok: true,
        json: async () => ({
          version: 1,
          status: 'reserved',
          reservation_id: '00000000-0000-4000-8000-000000000030',
          principal: body.p_principal,
          request_key: body.p_request_key,
          request_hash: body.p_request_hash,
          lease_id: body.p_lease_id,
          modality: body.p_modality,
          reserved_units: 2,
          expires_at: new Date(Date.now() + 120000).toISOString(),
        }),
      };
    if (name === 'coach_quota_begin_attempt_v1') {
      attempts++;
      return {
        ok: true,
        json: async () => ({
          version: 1,
          status: 'started',
          reservation_id: body.p_reservation_id,
          lease_id: body.p_lease_id,
          attempt: body.p_attempt,
        }),
      };
    }
    if (name === 'coach_quota_finalize_v1')
      return {
        ok: true,
        json: async () => ({
          version: 1,
          status: 'finalized',
          reservation_id: body.p_reservation_id,
          lease_id: body.p_lease_id,
          charged_units: attempts,
        }),
      };
    if (name === 'completions')
      return {
        ok: true,
        json: async () => ({
          choices: [{ finish_reason: 'stop', message: { content: 'Training reply' } }],
        }),
      };
    if (name === 'transcriptions')
      return { ok: true, json: async () => ({ text: 'Training transcript' }) };
    throw new Error('Unexpected offline test route');
  };
  return { calls, fetch };
}

test('enabled quota rejects missing configuration/key and store outages before provider dispatch', async () => {
  await withQuota(async () => {
    for (const scenario of ['configuration', 'key', 'unavailable']) {
      process.env.COACH_QUOTA_STORE = scenario === 'configuration' ? 'unknown' : 'supabase-rpc';
      const req = quotaRequest(scenario);
      if (scenario === 'key') delete req.headers['idempotency-key'];
      const mock = quotaFetch({
        coach_quota_reserve_v1: async () => {
          throw new Error('private store details');
        },
      });
      global.fetch = mock.fetch;
      const r = res();
      await handler(req, r);
      assert.equal(r.code, scenario === 'key' ? 400 : 503);
      assert.equal(
        mock.calls.some((call) => call.name === 'completions'),
        false,
      );
      assert.equal(JSON.stringify(r.body).includes('private'), false);
    }
  });
});

test('enabled quota honors global/user/access denial and duplicate keys without provider dispatch', async () => {
  await withQuota(async () => {
    for (const [status, reason] of [
      ['denied', 'global_limit'],
      ['denied', 'user_limit'],
      ['denied', 'access_denied'],
      ['completed'],
      ['in_progress'],
      ['conflict'],
    ]) {
      const mock = quotaFetch({
        coach_quota_reserve_v1: async () => ({
          ok: true,
          json: async () =>
            reason
              ? { version: 1, status, reason, retry_after_seconds: 15 }
              : { version: 1, status },
        }),
      });
      global.fetch = mock.fetch;
      const r = res();
      await handler(quotaRequest(reason || status), r);
      assert.equal(r.code, status === 'denied' ? (reason === 'access_denied' ? 403 : 429) : 409);
      assert.equal(mock.calls.length, 1);
      if (reason && reason !== 'access_denied') assert.equal(r.headers['Retry-After'], '15');
    }
  });
});

test('enabled quota binds verified account identity and persists each retry before provider dispatch', async () => {
  await withQuota(async () => {
    let providerCalls = 0;
    const mock = quotaFetch({
      completions: async () => ({
        ok: true,
        json: async () => ({
          choices: [
            {
              finish_reason: ++providerCalls === 1 ? 'length' : 'stop',
              message: { content: 'Complete training answer' },
            },
          ],
        }),
      }),
    });
    global.fetch = mock.fetch;
    const req = { ...quotaRequest('account-retry'), localCoachUser: undefined };
    req.headers.authorization = 'Bearer verified-token';
    req.body.userId = 'client-forged';
    req.body.isPro = true;
    req.body.quota = { globalLimit: 999999 };
    const r = res();
    await handler(req, r);
    assert.equal(r.code, 200);
    assert.equal(r.body.reply, 'Complete training answer');
    assert.deepEqual(
      mock.calls.map((call) => call.name),
      [
        'coach_quota_reserve_v1',
        'coach_quota_begin_attempt_v1',
        'completions',
        'coach_quota_begin_attempt_v1',
        'completions',
        'coach_quota_finalize_v1',
      ],
    );
    assert.equal(mock.calls[0].body.p_principal, 'account:00000000-0000-4000-8000-000000000001');
    assert.equal(JSON.stringify(mock.calls[0].body).includes('client-forged'), false);
    assert.equal(mock.calls[3].body.p_attempt, 2);
    assert.equal(mock.calls.at(-1).body.p_outcome, 'success');
  });
});

test('image/audio requests reserve distinct modality envelopes and settle before success', async () => {
  await withQuota(async () => {
    for (const modality of ['image', 'audio']) {
      const mock = quotaFetch();
      global.fetch = mock.fetch;
      const req = quotaRequest(modality);
      if (modality === 'image') req.body.image = 'data:image/png;base64,YQ==';
      else req.body.audio = { format: 'wav', data: 'YQ==' };
      const r = res();
      await handler(req, r);
      assert.equal(r.code, 200);
      assert.equal(mock.calls[0].body.p_modality, modality);
      assert.equal(mock.calls[0].body.p_reserved_units, 2);
      assert.equal(mock.calls.at(-1).name, 'coach_quota_finalize_v1');
      assert.equal(mock.calls.at(-1).body.p_outcome, 'success');
    }
  });
});

test('a failed persisted retry marker prevents the second provider call and completes as failed', async () => {
  await withQuota(async () => {
    let providerCalls = 0;
    const mock = quotaFetch({
      coach_quota_begin_attempt_v1: async (body) =>
        body.p_attempt === 1
          ? {
              ok: true,
              json: async () => ({
                version: 1,
                status: 'started',
                reservation_id: body.p_reservation_id,
                lease_id: body.p_lease_id,
                attempt: 1,
              }),
            }
          : { ok: true, json: async () => ({ version: 1, status: 'expired' }) },
      completions: async () => {
        providerCalls++;
        return {
          ok: true,
          json: async () => ({
            choices: [{ finish_reason: 'length', message: { content: 'incomplete' } }],
          }),
        };
      },
      coach_quota_finalize_v1: async (body) => ({
        ok: true,
        json: async () => ({
          version: 1,
          status: 'finalized',
          reservation_id: body.p_reservation_id,
          lease_id: body.p_lease_id,
          charged_units: 1,
        }),
      }),
    });
    global.fetch = mock.fetch;
    const r = res();
    await handler(quotaRequest('retry-expired'), r);
    assert.equal(r.code, 503);
    assert.equal(r.body.code, 'QUOTA_UNAVAILABLE');
    assert.equal(providerCalls, 1);
    assert.equal(mock.calls.at(-1).body.p_outcome, 'failed');
  });
});

test('uncertain completion never returns a successful answer or sends a refund amount', async () => {
  await withQuota(async () => {
    const mock = quotaFetch({
      coach_quota_finalize_v1: async () => {
        throw new Error('store response lost after commit');
      },
    });
    global.fetch = mock.fetch;
    const r = res();
    await handler(quotaRequest('completion-outage'), r);
    assert.equal(r.code, 503);
    assert.equal(r.body.reply, undefined);
    assert.equal(r.body.code, 'QUOTA_UNAVAILABLE');
    for (const call of mock.calls.filter((call) => call.name === 'coach_quota_finalize_v1'))
      assert.deepEqual(Object.keys(call.body).sort(), [
        'p_lease_id',
        'p_outcome',
        'p_reservation_id',
      ]);
    assert.equal(mock.calls.filter((call) => call.name === 'completions').length, 1);
  });
});

test('deterministic safety interception needs no durable capacity or provider call', async () => {
  await withQuota(async () => {
    process.env.COACH_QUOTA_STORE = 'unknown';
    const mock = quotaFetch();
    global.fetch = mock.fetch;
    const req = quotaRequest('safety');
    req.body.messages[0].content = 'Ich plane ein extreme dry fast ohne Wasser für 3 Tage.';
    const r = res();
    await handler(req, r);
    assert.equal(r.code, 200);
    assert.equal(r.body.safetyIntercept, true);
    assert.equal(mock.calls.length, 0);
  });
});
