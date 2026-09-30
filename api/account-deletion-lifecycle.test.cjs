const { test } = require('node:test');
const assert = require('node:assert/strict');
const { randomUUID } = require('node:crypto');
const { createAccountDeletionLifecycle, STAGES, REQUIRED_GATES } = require('./account-deletion-lifecycle.cjs');
const USER_A = '11111111-1111-4111-8111-111111111111';
const USER_B = '22222222-2222-4222-8222-222222222222';
const SESSION = '33333333-3333-4333-8333-333333333333';
const REQUEST = '44444444-4444-4444-8444-444444444444';
const OTHER_REQUEST = '55555555-5555-4555-8555-555555555555';
const LEASE = '66666666-6666-4666-8666-666666666666';
const NOW = Date.parse('2026-09-30T10:00:00.000Z');
const ISO_NOW = new Date(NOW).toISOString();
const input = () => ({ authorization: 'Bearer verified-test-token', requestId: REQUEST, confirmationText: 'DELETE' });
const receipt = (userId = USER_A) => ({ version: 1, success: true, user_id: userId, deleted_at: ISO_NOW });

function fixture() {
  const records = new Map();
  const users = new Map();
  const calls = [];
  const recordCopy = (entry) => ({ ...entry.record, completed_stages: [...entry.record.completed_stages] });
  // TEST ONLY. Production requires a durable atomic journal shared by workers.
  function acquire(entry) {
    if (entry.receipt) return { status: 'complete', record: recordCopy(entry), receipt: { ...entry.receipt } };
    if (entry.leaseId) return { status: 'busy' };
    entry.leaseId = randomUUID();
    return { status: 'acquired', leaseId: entry.leaseId, record: recordCopy(entry) };
  }
  function live(context) {
    const entry = records.get(context.requestId);
    assert.equal(entry.record.user_id, context.userId);
    assert.equal(entry.leaseId, context.leaseId);
    return entry;
  }
  const deps = {
    integrationEnabled: true,
    now: () => NOW,
    authenticate: async () => ({ userId: USER_A, sessionId: SESSION }),
    verifyReauthentication: async () => ({ userId: USER_A, sessionId: SESSION, verifiedAt: ISO_NOW }),
    getReadiness: async () => Object.fromEntries(REQUIRED_GATES.map((gate) => [gate, true])),
    stages: Object.fromEntries(STAGES.map((stage) => [stage, async (context) => {
      assert.ok(Object.isFrozen(context));
      assert.deepEqual(Object.keys(context).sort(), ['leaseId', 'requestId', 'userId']);
      calls.push(stage);
      return { complete: true, user_id: context.userId, request_id: context.requestId, stage };
    }])),
    journal: {
      claim: async ({ userId, requestId, authorizedAt }) => {
        if (users.has(userId) && users.get(userId) !== requestId) return { status: 'busy' };
        let entry = records.get(requestId);
        if (entry && entry.record.user_id !== userId) return { status: 'busy' };
        if (!entry) {
          entry = { record: { version: 1, user_id: userId, request_id: requestId,
            authorized_at: authorizedAt, completed_stages: [] } };
          records.set(requestId, entry);
          users.set(userId, requestId);
        }
        return acquire(entry);
      },
      claimAuthorized: async ({ requestId }) => {
        const entry = records.get(requestId);
        return entry ? acquire(entry) : null;
      },
      markStage: async (context) => {
        const entry = live(context);
        assert.equal(context.stage, STAGES[entry.record.completed_stages.length]);
        entry.record.completed_stages.push(context.stage);
        return recordCopy(entry);
      },
      complete: async (context) => {
        const entry = live(context);
        assert.deepEqual(entry.record.completed_stages, STAGES);
        entry.receipt = { version: 1, success: true, user_id: context.userId, deleted_at: context.deletedAt };
        entry.leaseId = undefined;
        return { ...entry.receipt };
      },
      release: async (context) => { live(context).leaseId = undefined; },
    },
  };
  return { deps, records, calls, lifecycle: createAccountDeletionLifecycle(deps) };
}

test('integration is OFF by default; enabling without all adapters cannot execute', async () => {
  let calls = 0;
  for (const deps of [{}, { integrationEnabled: true }, { integrationEnabled: false, authenticate: () => calls++ }]) {
    const service = createAccountDeletionLifecycle(deps);
    assert.equal((await service.request(input())).body.code, 'ACCOUNT_DELETION_NOT_CONFIGURED');
    assert.equal((await service.resumeAuthorized(REQUEST)).body.code, 'ACCOUNT_DELETION_NOT_CONFIGURED');
  }
  assert.equal(calls, 0);
});

test('client IDs, extra fields, bad IDs and missing confirmation never authorize a journal entry', async () => {
  for (const request of [null, {}, { ...input(), userId: USER_B }, { ...input(), success: true },
    { ...input(), requestId: 'not-uuid' }, { ...input(), confirmationText: '' }]) {
    const f = fixture();
    assert.equal((await f.lifecycle.request(request)).status, 400);
    assert.equal(f.records.size, 0);
    assert.deepEqual(f.calls, []);
  }
});

test('beta, loopback, absent, malformed and oversized bearer tokens fail before authentication', async () => {
  for (const authorization of [undefined, '', 'Basic token', 'Bearer two tokens', 'Bearer beta_token',
    'Bearer loopback-user', `Bearer ${'x'.repeat(8192)}`]) {
    const f = fixture();
    f.deps.authenticate = () => { throw new Error('must not authenticate'); };
    assert.equal((await f.lifecycle.request({ ...input(), authorization })).body.code, 'AUTHENTICATION_REQUIRED');
    assert.deepEqual(f.calls, []);
  }
});

test('unverified, malformed and anonymous principals cannot establish account authority', async () => {
  for (const principal of [null, { user_metadata: { userId: USER_A, sessionId: SESSION } },
    { userId: 'beta_guest_x', sessionId: SESSION }, { userId: USER_A },
    { userId: USER_A, sessionId: SESSION, isAnonymous: true }]) {
    const f = fixture();
    f.deps.authenticate = async () => principal;
    assert.equal((await f.lifecycle.request(input())).status, 401);
    assert.equal(f.records.size, 0);
  }
});

test('authentication provider errors are redacted and preserve data', async () => {
  const f = fixture();
  f.deps.authenticate = async () => { throw new Error('Bearer sensitive-token'); };
  assert.deepEqual(await f.lifecycle.request(input()),
    { status: 503, body: { success: false, code: 'AUTHENTICATION_UNAVAILABLE' } });
  assert.equal(f.records.size, 0);
});

test('reauth must be server-verified, fresh, and bound to the same user and session', async () => {
  for (const proof of [null, { userId: USER_B, sessionId: SESSION, verifiedAt: ISO_NOW },
    { userId: USER_A, sessionId: USER_B, verifiedAt: ISO_NOW },
    { userId: USER_A, sessionId: SESSION, verifiedAt: new Date(NOW - 300001).toISOString() },
    { userId: USER_A, sessionId: SESSION, verifiedAt: new Date(NOW + 1).toISOString() },
    { userId: USER_A, sessionId: SESSION, verifiedAt: '2026-09-31T10:00:00.000Z' }]) {
    const f = fixture();
    f.deps.verifyReauthentication = async () => proof;
    assert.equal((await f.lifecycle.request(input())).body.code, 'REAUTHENTICATION_REQUIRED');
    assert.equal(f.records.size, 0);
  }
});

test('every integration gate blocks execution independently', async () => {
  for (const gate of REQUIRED_GATES) {
    const f = fixture();
    f.deps.getReadiness = async () => Object.fromEntries(REQUIRED_GATES.map((key) => [key, key !== gate]));
    assert.equal((await f.lifecycle.request(input())).body.code, 'DELETION_INTEGRATION_BLOCKED');
    assert.equal(f.records.size, 0);
    assert.deepEqual(f.calls, []);
  }
});

test('unknown readiness and readiness IO errors never imply coverage', async () => {
  for (const readiness of [null, {}, { inventoryVerified: true }]) {
    const f = fixture();
    f.deps.getReadiness = async () => readiness;
    assert.equal((await f.lifecycle.request(input())).status, 503);
  }
  const f = fixture();
  f.deps.getReadiness = async () => { throw new Error('private object path'); };
  assert.equal((await f.lifecycle.request(input())).body.code, 'DELETION_INTEGRATION_BLOCKED');
});

test('all scopes and completion verification precede a durable strict receipt', async () => {
  const f = fixture();
  const result = await f.lifecycle.request({ ...input(), confirmationText: ' löschen ' });
  assert.deepEqual(f.calls, STAGES);
  assert.deepEqual(result, { status: 200, body: receipt() });
  assert.deepEqual(f.records.get(REQUEST).receipt, result.body);
});

test('async mutation of a caller request cannot replace original authorization or operation', async () => {
  const f = fixture();
  const request = input();
  f.deps.authenticate = async (authorization) => {
    assert.equal(authorization, 'Bearer verified-test-token');
    request.authorization = 'Bearer changed-token';
    request.requestId = OTHER_REQUEST;
    return { userId: USER_A, sessionId: SESSION };
  };
  f.deps.verifyReauthentication = async (context) => {
    assert.equal(context.authorization, 'Bearer verified-test-token');
    return { userId: USER_A, sessionId: SESSION, verifiedAt: ISO_NOW };
  };
  assert.equal((await f.lifecycle.request(request)).status, 200);
  assert.ok(f.records.has(REQUEST));
  assert.equal(f.records.has(OTHER_REQUEST), false);
});

test('a failure at each stage preserves checkpoints, stops later stages, and cannot mint a receipt', async () => {
  for (const failedStage of STAGES) {
    const f = fixture();
    f.deps.stages[failedStage] = async () => { throw new Error('private data'); };
    assert.deepEqual(await f.lifecycle.request(input()),
      { status: 503, body: { success: false, code: 'DELETION_RETRY_REQUIRED' } });
    const entry = f.records.get(REQUEST);
    assert.deepEqual(entry.record.completed_stages, STAGES.slice(0, STAGES.indexOf(failedStage)));
    assert.equal(entry.receipt, undefined);
    assert.equal(entry.leaseId, undefined);
  }
});

test('void, false, extra fields and wrong-account stage acknowledgements cannot confirm deletion', async () => {
  for (const acknowledgement of [undefined, false, { complete: true },
    { complete: true, user_id: USER_B, request_id: REQUEST, stage: STAGES[0] },
    { complete: true, user_id: USER_A, request_id: OTHER_REQUEST, stage: STAGES[0] },
    { complete: true, user_id: USER_A, request_id: REQUEST, stage: STAGES[1] },
    { complete: true, user_id: USER_A, request_id: REQUEST, stage: STAGES[0], extra: true }]) {
    const f = fixture();
    f.deps.stages[STAGES[0]] = async () => acknowledgement;
    assert.equal((await f.lifecycle.request(input())).body.code, 'DELETION_STAGE_UNCONFIRMED');
    assert.deepEqual(f.records.get(REQUEST).record.completed_stages, []);
    assert.equal(f.records.get(REQUEST).receipt, undefined);
  }
});

test('private retries resume durable authorization after sessions were revoked', async () => {
  const f = fixture();
  const stage = STAGES[2];
  const original = f.deps.stages[stage];
  f.deps.stages[stage] = async () => { throw new Error('transient provider failure'); };
  assert.equal((await f.lifecycle.request(input())).status, 503);
  f.deps.authenticate = async () => null;
  f.deps.verifyReauthentication = async () => { throw new Error('revoked session'); };
  f.deps.stages[stage] = original;
  assert.equal((await f.lifecycle.request(input())).status, 401);
  assert.deepEqual(await f.lifecycle.resumeAuthorized(REQUEST), { status: 200, body: receipt() });
  assert.deepEqual(f.calls, STAGES);
});

test('private resume cannot create authorization for an unknown request', async () => {
  const f = fixture();
  assert.equal((await f.lifecycle.resumeAuthorized(OTHER_REQUEST)).body.code, 'DELETION_STATE_INVALID');
  assert.equal((await f.lifecycle.resumeAuthorized('client-user-id')).status, 400);
  assert.equal(f.records.size, 0);
  assert.deepEqual(f.calls, []);
});

test('shared atomic journal excludes concurrent workers and a second request for the same account', async () => {
  const f = fixture();
  let release;
  const blocked = new Promise((resolve) => { release = resolve; });
  const original = f.deps.stages[STAGES[0]];
  f.deps.stages[STAGES[0]] = async (context) => { await blocked; return original(context); };
  const running = f.lifecycle.request(input());
  // Await the actual acquisition, without relying on an arbitrary timer.
  while (!f.records.has(REQUEST)) await Promise.resolve();
  const otherWorker = createAccountDeletionLifecycle(f.deps);
  assert.equal((await otherWorker.resumeAuthorized(REQUEST)).status, 409);
  assert.equal((await otherWorker.request({ ...input(), requestId: OTHER_REQUEST })).status, 409);
  release();
  assert.equal((await running).status, 200);
  assert.deepEqual(f.calls, STAGES);
});

test('cross-account request-ID replay cannot delete or reveal another user', async () => {
  const f = fixture();
  assert.equal((await f.lifecycle.request(input())).status, 200);
  f.deps.authenticate = async () => ({ userId: USER_B, sessionId: SESSION });
  f.deps.verifyReauthentication = async () => ({ userId: USER_B, sessionId: SESSION, verifiedAt: ISO_NOW });
  const result = await f.lifecycle.request(input());
  assert.equal(result.status, 409);
  assert.equal(result.body.user_id, undefined);
  assert.deepEqual(f.calls, STAGES);
});

test('completed operation replays the persisted receipt without repeating stages', async () => {
  const f = fixture();
  const first = await f.lifecycle.request(input());
  assert.deepEqual(await f.lifecycle.request(input()), first);
  assert.deepEqual(await f.lifecycle.resumeAuthorized(REQUEST), first);
  assert.deepEqual(f.calls, STAGES);
});

test('lost stage checkpoint acknowledgement retries the same idempotent operation identity', async () => {
  const f = fixture();
  let effects = 0;
  const identities = new Set();
  f.deps.stages[STAGES[0]] = async ({ userId, requestId }) => {
    const key = `${userId}:${requestId}`;
    if (!identities.has(key)) { identities.add(key); effects++; }
    return { complete: true, user_id: userId, request_id: requestId, stage: STAGES[0] };
  };
  const original = f.deps.journal.markStage;
  let lost = true;
  f.deps.journal.markStage = async (context) => {
    if (lost) { lost = false; throw new Error('checkpoint write failed'); }
    return original(context);
  };
  assert.equal((await f.lifecycle.request(input())).status, 503);
  assert.equal((await f.lifecycle.resumeAuthorized(REQUEST)).status, 200);
  assert.equal(effects, 1);
});

test('receipt persistence failure cannot report success; worker retries after Auth deletion', async () => {
  const f = fixture();
  const original = f.deps.journal.complete;
  f.deps.journal.complete = async () => { throw new Error('disk failure'); };
  assert.equal((await f.lifecycle.request(input())).status, 503);
  assert.deepEqual(f.calls, STAGES);
  assert.equal(f.records.get(REQUEST).receipt, undefined);
  f.deps.authenticate = async () => null;
  f.deps.journal.complete = original;
  assert.equal((await f.lifecycle.resumeAuthorized(REQUEST)).status, 200);
  assert.deepEqual(f.calls, STAGES);
});

test('lost completed response replays only the persisted receipt', async () => {
  const f = fixture();
  const original = f.deps.journal.complete;
  f.deps.journal.complete = async (context) => { await original(context); throw new Error('lost response'); };
  assert.equal((await f.lifecycle.request(input())).status, 503);
  assert.deepEqual(await f.lifecycle.resumeAuthorized(REQUEST), { status: 200, body: receipt() });
  assert.deepEqual(f.calls, STAGES);
});

test('malformed, cross-user and non-prefix journal records cannot run stages', async () => {
  const base = { version: 1, user_id: USER_A, request_id: REQUEST,
    authorized_at: ISO_NOW, completed_stages: [] };
  for (const record of [{ ...base, user_id: USER_B }, { ...base, request_id: OTHER_REQUEST },
    { ...base, completed_stages: [STAGES[1]] }, { ...base, completed_stages: [STAGES[0], STAGES[0]] },
    { ...base, authorized_at: 'not-a-date' }, { ...base, version: 2 }]) {
    const f = fixture();
    f.deps.journal.claim = async () => ({ status: 'acquired', leaseId: LEASE, record });
    assert.equal((await f.lifecycle.request(input())).body.code, 'DELETION_STATE_INVALID');
    assert.deepEqual(f.calls, []);
  }
});

test('invalid checkpoint acknowledgement stops before the next destructive stage', async () => {
  const f = fixture();
  f.deps.journal.markStage = async () => ({ version: 1, user_id: USER_A, request_id: REQUEST,
    authorized_at: ISO_NOW, completed_stages: [STAGES[0], STAGES[1]] });
  assert.equal((await f.lifecycle.request(input())).body.code, 'DELETION_STATE_INVALID');
  assert.deepEqual(f.calls, [STAGES[0]]);
  assert.equal(f.records.get(REQUEST).receipt, undefined);
});

test('wrong-user, void and expanded receipts are rejected despite completed stages', async () => {
  for (const invalid of [undefined, receipt(USER_B), { ...receipt(), extra: true },
    { ...receipt(), deleted_at: 'invalid' }, { ...receipt(), success: false }]) {
    const f = fixture();
    f.deps.journal.complete = async () => invalid;
    assert.equal((await f.lifecycle.request(input())).body.code, 'DELETION_STATE_INVALID');
  }
});

test('replay requires completed checkpoints and a receipt with a plausible durable timestamp', async () => {
  for (const change of [(entry) => entry.record.completed_stages.pop(),
    (entry) => { entry.receipt.user_id = USER_B; },
    (entry) => { entry.receipt.deleted_at = new Date(NOW + 1).toISOString(); },
    (entry) => { entry.receipt.deleted_at = new Date(NOW - 1).toISOString(); }]) {
    const f = fixture();
    assert.equal((await f.lifecycle.request(input())).status, 200);
    change(f.records.get(REQUEST));
    assert.equal((await f.lifecycle.resumeAuthorized(REQUEST)).body.code, 'DELETION_STATE_INVALID');
    assert.deepEqual(f.calls, STAGES);
  }
});

test('journal release failure stays redacted and cannot turn a stage failure into success', async () => {
  const f = fixture();
  f.deps.stages[STAGES[0]] = async () => { throw new Error('health data'); };
  f.deps.journal.release = async () => { throw new Error('Bearer secret'); };
  assert.deepEqual(await f.lifecycle.request(input()),
    { status: 503, body: { success: false, code: 'DELETION_RETRY_REQUIRED' } });
  assert.equal(f.records.get(REQUEST).receipt, undefined);
});

test('a clock rollback before receipt persistence cannot report deletion before its authorization', async () => {
  const f = fixture();
  let completionReads = 0;
  f.deps.now = () => {
    if (f.records.get(REQUEST)?.record.completed_stages.length === STAGES.length) {
      return completionReads++ === 0 ? NOW : NOW - 1000;
    }
    return NOW;
  };
  const service = createAccountDeletionLifecycle(f.deps);
  assert.equal((await service.request(input())).body.code, 'DELETION_STATE_INVALID');
  assert.equal(f.records.get(REQUEST).receipt, undefined);
});
