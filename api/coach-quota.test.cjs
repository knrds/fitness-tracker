const { test } = require('node:test');
const assert = require('node:assert/strict');
const {
  CoachQuotaError,
  createCoachQuota,
  createSupabaseQuotaStore,
  createQuotaFromEnv,
} = require('./coach-quota.cjs');

const userId = '00000000-0000-4000-8000-000000000001';
const key = '00000000-0000-4000-8000-000000000002';
const lease = '00000000-0000-4000-8000-000000000003';
const reservationId = '00000000-0000-4000-8000-000000000004';
const secret = 'quota-test-hash-secret-at-least-32-bytes';
const now = 1000000;
const input = () => ({
  identity: { source: 'account', id: userId },
  requestKey: key,
  body: { messages: [{ content: 'private training context' }], userId: 'forged', isPro: true },
  modality: 'text',
});
const granted = (params) => ({
  version: 1,
  status: 'reserved',
  reservation_id: reservationId,
  principal: params.p_principal,
  request_key: params.p_request_key,
  request_hash: params.p_request_hash,
  lease_id: params.p_lease_id,
  modality: params.p_modality,
  reserved_units: 2,
  expires_at: new Date(now + 120000).toISOString(),
});
function fixture(overrides = {}, options = {}) {
  const calls = [];
  let started = 0;
  // Contract double only. Actual atomic caps/leases require PostgreSQL tests.
  const store = {
    async reserve(params) {
      calls.push(['reserve', params]);
      return granted(params);
    },
    async beginAttempt(params) {
      calls.push(['beginAttempt', params]);
      started++;
      return {
        version: 1,
        status: 'started',
        reservation_id: params.p_reservation_id,
        lease_id: params.p_lease_id,
        attempt: params.p_attempt,
      };
    },
    async finalize(params) {
      calls.push(['finalize', params]);
      return {
        version: 1,
        status: 'finalized',
        reservation_id: params.p_reservation_id,
        lease_id: params.p_lease_id,
        charged_units: started,
      };
    },
    ...overrides,
  };
  return {
    calls,
    store,
    quota: createCoachQuota({
      store,
      hashSecret: secret,
      now: () => now,
      uuid: () => lease,
      ...options,
    }),
  };
}
const rejected =
  (code = 'QUOTA_UNAVAILABLE', status = 503) =>
  (error) =>
    error instanceof CoachQuotaError &&
    error.code === code &&
    error.status === status &&
    !error.message.includes('private');

test('quota is off by default and explicit false needs no store or secret', () => {
  assert.equal(createQuotaFromEnv({}), null);
  assert.equal(createQuotaFromEnv({ COACH_QUOTA_ENABLED: 'false', SUPABASE_URL: 'invalid' }), null);
});

test('enabled quota fails closed on missing or misspelled storage configuration', () => {
  for (const env of [
    { COACH_QUOTA_ENABLED: '1' },
    { COACH_QUOTA_ENABLED: 'true' },
    { COACH_QUOTA_ENABLED: 'true', COACH_QUOTA_STORE: 'memory' },
    { COACH_QUOTA_ENABLED: 'true', COACH_QUOTA_STORE: 'supabase-rpc' },
  ])
    assert.throws(() => createQuotaFromEnv(env), rejected('QUOTA_NOT_CONFIGURED'));
  assert.throws(
    () => createCoachQuota({ store: {}, hashSecret: secret }),
    rejected('QUOTA_NOT_CONFIGURED'),
  );
  assert.throws(() => fixture({}, { hashSecret: 'short' }), rejected('QUOTA_NOT_CONFIGURED'));
});

test('only verified namespaced identity reaches store; request rights and caps never do', async () => {
  const { quota, calls } = fixture();
  await quota.reserve(input());
  const params = calls[0][1];
  assert.equal(params.p_principal, 'account:' + userId);
  assert.equal(params.p_policy_id, 'coach-beta-v1');
  assert.equal(params.p_reserved_units, 2);
  assert.equal(params.p_lease_seconds, 120);
  assert.equal(params.p_lease_id, lease);
  assert.match(params.p_request_hash, /^[a-f0-9]{64}$/);
  assert.equal(JSON.stringify(params).includes('private training context'), false);
  assert.equal(JSON.stringify(params).includes('forged'), false);
  assert.equal(
    Object.keys(params).some((name) => /limit|pro|budget/.test(name)),
    false,
  );
});

test('hash binds the same key to payload and HMAC secret without storing raw contents', async () => {
  const hashes = [];
  for (const [content, hashSecret] of [
    ['A', secret],
    ['A', secret],
    ['B', secret],
    ['A', secret + 'other'],
  ]) {
    const { quota, calls } = fixture({}, { hashSecret });
    await quota.reserve({ ...input(), body: { content } });
    hashes.push(calls[0][1].p_request_hash);
  }
  assert.equal(hashes[0], hashes[1]);
  assert.notEqual(hashes[0], hashes[2]);
  assert.notEqual(hashes[0], hashes[3]);
});

test('malformed identity, request key and modality are rejected before storage', async () => {
  const { quota, calls } = fixture();
  for (const identity of [
    { source: 'account', id: 'forged' },
    { source: 'client', id: userId },
    { source: 'beta', id: userId },
  ])
    await assert.rejects(quota.reserve({ ...input(), identity }), rejected('QUOTA_IDENTITY', 401));
  for (const requestKey of [undefined, key + '\n', ['one', 'two'], 'client-key'])
    await assert.rejects(
      quota.reserve({ ...input(), requestKey }),
      rejected('QUOTA_REQUEST_KEY', 400),
    );
  await assert.rejects(
    quota.reserve({ ...input(), modality: 'cheap' }),
    rejected('QUOTA_REQUEST', 400),
  );
  assert.equal(calls.length, 0);
});

test('signed beta and server loopback identities remain separate from account principals', async () => {
  const { quota, calls } = fixture();
  await quota.reserve({
    ...input(),
    identity: { source: 'beta', id: 'beta_guest_1234567890abcdef' },
    modality: 'image',
  });
  await quota.reserve({
    ...input(),
    identity: { source: 'loopback', id: 'loopback-local' },
    modality: 'audio',
  });
  assert.deepEqual(
    calls.map((call) => call[1].p_principal),
    ['beta:beta_guest_1234567890abcdef', 'loopback:loopback-local'],
  );
  assert.deepEqual(
    calls.map((call) => call[1].p_modality),
    ['image', 'audio'],
  );
});

test('user/global budget denial and missing server access never admit attempts', async () => {
  for (const reason of ['user_limit', 'global_limit', 'access_denied']) {
    const { quota, calls } = fixture({
      reserve: async () => ({ version: 1, status: 'denied', reason, retry_after_seconds: 30 }),
    });
    await assert.rejects(
      quota.reserve(input()),
      (error) =>
        rejected(
          reason === 'access_denied' ? 'QUOTA_ACCESS_DENIED' : 'QUOTA_LIMIT',
          reason === 'access_denied' ? 403 : 429,
        )(error) && error.retryAfterSeconds === 30,
    );
    assert.equal(calls.length, 0);
  }
});

test('in-progress/completed requests and changed payload conflicts cannot run a provider again', async () => {
  for (const status of ['in_progress', 'completed', 'conflict']) {
    const { quota } = fixture({ reserve: async () => ({ version: 1, status }) });
    await assert.rejects(
      quota.reserve(input()),
      rejected(status === 'conflict' ? 'QUOTA_KEY_CONFLICT' : 'QUOTA_DUPLICATE', 409),
    );
  }
});

test('missing, extra, wrong-owner and stale reservation receipts fail closed', async () => {
  for (const transform of [
    () => null,
    () => [],
    () => ({ version: 2, status: 'reserved' }),
    (receipt) => ({ ...receipt, principal: 'account:other' }),
    (receipt) => ({ ...receipt, request_key: userId }),
    (receipt) => ({ ...receipt, request_hash: '0'.repeat(64) }),
    (receipt) => ({ ...receipt, lease_id: userId }),
    (receipt) => ({ ...receipt, modality: 'audio' }),
    (receipt) => ({ ...receipt, reserved_units: 100 }),
    (receipt) => ({ ...receipt, expires_at: new Date(now).toISOString() }),
    (receipt) => ({ ...receipt, expires_at: new Date(now + 200000).toISOString() }),
    (receipt) => ({ ...receipt, unexpected: true }),
    () => ({ version: 1, status: 'denied', reason: 'global_limit', retry_after_seconds: -1 }),
  ]) {
    const { quota } = fixture({ reserve: async (params) => transform(granted(params)) });
    await assert.rejects(quota.reserve(input()), rejected());
  }
});

test('store exception and an unresponsive injected store are bounded/redacted without retries', async () => {
  for (const reserve of [
    async () => {
      throw new Error('private store credentials');
    },
    () => new Promise(() => {}),
  ]) {
    let calls = 0;
    const { quota } = fixture(
      {
        reserve: (params) => {
          calls++;
          return reserve(params);
        },
      },
      { storeTimeoutMs: 10 },
    );
    await assert.rejects(quota.reserve(input()), rejected());
    assert.equal(calls, 1);
  }
});

test('two provider attempts consume two persisted markers and a third/repeated retry is denied', async () => {
  const { quota, calls } = fixture();
  const reservation = await quota.reserve(input());
  await reservation.beginAttempt(1);
  await assert.rejects(reservation.beginAttempt(1), rejected());
  await reservation.beginAttempt(2);
  await assert.rejects(reservation.beginAttempt(3), rejected());
  await reservation.finalize('success');
  await assert.rejects(reservation.beginAttempt(2), rejected());
  assert.deepEqual(
    calls.map((call) => call[0]),
    ['reserve', 'beginAttempt', 'beginAttempt', 'finalize'],
  );
  assert.equal(calls.at(-1)[1].p_outcome, 'success');
  assert.equal(Object.hasOwn(calls.at(-1)[1], 'p_charged_units'), false);
});

test('a second attempt cannot start while the first persisted admission is pending', async () => {
  let release;
  const { quota } = fixture({
    beginAttempt: (params) =>
      new Promise((resolve) => {
        release = () =>
          resolve({
            version: 1,
            status: 'started',
            reservation_id: params.p_reservation_id,
            lease_id: params.p_lease_id,
            attempt: params.p_attempt,
          });
      }),
  });
  const reservation = await quota.reserve(input());
  const pending = reservation.beginAttempt(1);
  await assert.rejects(reservation.beginAttempt(2), rejected());
  release();
  await pending;
});

test('already-started or uncertain attempt marker blocks all dispatch/retry and still settles via DB', async () => {
  for (const beginAttempt of [
    async (params) => ({
      version: 1,
      status: 'already_started',
      reservation_id: params.p_reservation_id,
      lease_id: params.p_lease_id,
      attempt: params.p_attempt,
    }),
    async () => ({ version: 1, status: 'expired' }),
    async () => {
      throw new Error('lost response after commit');
    },
  ]) {
    const { quota, calls } = fixture({ beginAttempt });
    const reservation = await quota.reserve(input());
    await assert.rejects(reservation.beginAttempt(1), rejected());
    await assert.rejects(reservation.beginAttempt(2), rejected());
    await reservation.finalize('failed');
    assert.equal(calls.at(-1)[0], 'finalize');
  }
});

test('expired lease cannot admit a provider attempt', async () => {
  let clock = now;
  const { quota, calls } = fixture({}, { now: () => clock });
  const reservation = await quota.reserve(input());
  clock += 120000;
  await assert.rejects(reservation.beginAttempt(1), rejected());
  assert.equal(calls.length, 1);
});

test('completion is repeatable with same lease; malformed or undercharged completion is not success', async () => {
  const { quota, calls } = fixture();
  const reservation = await quota.reserve(input());
  await reservation.beginAttempt(1);
  await reservation.finalize('success');
  await reservation.finalize('success');
  assert.deepEqual(calls.at(-1)[1], calls.at(-2)[1]);
  const invalid = fixture({
    finalize: async (params) => ({
      version: 1,
      status: 'finalized',
      reservation_id: params.p_reservation_id,
      lease_id: params.p_lease_id,
      charged_units: 0,
    }),
  });
  const charged = await invalid.quota.reserve(input());
  await charged.beginAttempt(1);
  await assert.rejects(charged.finalize('success'), rejected());
});

test('optional REST transport only sends fixed RPCs with server credentials and redacts errors', async () => {
  const calls = [];
  const store = createSupabaseQuotaStore({
    url: 'https://quota.example.test/',
    key: 'sb_secret_test_only',
    fetchImpl: async (url, init) => {
      calls.push({ url, init });
      return { ok: true, json: async () => ({ version: 1 }) };
    },
  });
  await store.reserve({ p_principal: 'account:' + userId });
  await store.beginAttempt({ p_attempt: 1 });
  await store.finalize({ p_outcome: 'failed' });
  assert.deepEqual(
    calls.map((call) => call.url),
    ['coach_quota_reserve_v1', 'coach_quota_begin_attempt_v1', 'coach_quota_finalize_v1'].map(
      (name) => 'https://quota.example.test/rest/v1/rpc/' + name,
    ),
  );
  for (const { init } of calls) {
    assert.equal(init.method, 'POST');
    assert.equal(init.redirect, 'error');
    assert.equal(init.headers.apikey, 'sb_secret_test_only');
    assert.equal(Object.hasOwn(init.headers, 'Authorization'), false);
    assert.ok(init.signal instanceof AbortSignal);
  }
  let failures = 0;
  const failing = createSupabaseQuotaStore({
    url: 'https://quota.example.test',
    key: 'sb_secret_test_only',
    fetchImpl: async () => {
      failures++;
      throw new Error('private key');
    },
  });
  await assert.rejects(failing.reserve({}), rejected());
  assert.equal(failures, 1);
});

test('optional REST transport rejects unsafe URL/client keys and bounds real abort behavior', async () => {
  for (const url of [
    'http://quota.example.test',
    'https://user:pass@quota.example.test',
    'https://quota.example.test/path',
    'https://quota.example.test/?key=leak',
  ])
    assert.throws(
      () => createSupabaseQuotaStore({ url, key: 'sb_secret_test_only' }),
      rejected('QUOTA_NOT_CONFIGURED'),
    );
  assert.throws(
    () =>
      createSupabaseQuotaStore({ url: 'https://quota.example.test', key: 'sb_publishable_client' }),
    rejected('QUOTA_NOT_CONFIGURED'),
  );
  let aborted = false;
  const store = createSupabaseQuotaStore({
    url: 'https://quota.example.test',
    key: 'sb_secret_test_only',
    timeoutMs: 10,
    fetchImpl: (_url, init) =>
      new Promise((_, reject) => {
        init.signal.addEventListener('abort', () => {
          aborted = true;
          reject(new Error('abort'));
        });
      }),
  });
  await assert.rejects(store.reserve({}), rejected());
  assert.equal(aborted, true);
});
