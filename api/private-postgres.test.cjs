const test = require('node:test');
const assert = require('node:assert/strict');
const { poolConfig, createPrivatePostgresExecutor, privatePostgresFromEnv,
  closePrivatePostgresPools } = require('./private-postgres.cjs');
const { createPostgresQuotaStore } = require('./coach-quota-postgres.cjs');
const { createPostgresDeletionJournal } = require('./account-deletion-postgres.cjs');
const { createQuotaFromEnv, CoachQuotaError } = require('./coach-quota.cjs');

const remote = 'postgresql://evaro:fixture@database.example.test:5432/evaro';
function fixture({ failAt, unsafeLogin = false, unsafeRole = false, malformed = false } = {}) {
  const queries = [], releases = [], listeners = [];
  let connections = 0, ended = 0;
  const client = {
    async query(sql, values) {
      queries.push({ sql, values });
      if (sql === failAt) throw Error('password=fixture-sensitive database credentials');
      if (sql.includes('session_user')) return { rows: [{ safe: !unsafeLogin }] };
      if (sql.includes('current_user =')) return { rows: [{ safe: true, restricted: !unsafeRole }] };
      if (sql.includes(' AS value')) return { rows: malformed ? [] : [{ value: { version: 1 } }] };
      return { rows: [] };
    },
    release(destroy) { releases.push(destroy); },
  };
  const pool = {
    async connect() { connections++; return client; },
    async end() { ended++; },
    on(event, callback) { listeners.push({ event, callback }); },
  };
  const executor = createPrivatePostgresExecutor({ profile: 'quota', connectionString: remote,
    makePool: () => pool });
  return { executor, queries, releases, listeners, connected: () => connections, ended: () => ended };
}

test('remote config enforces peer and hostname verification with bounded pool budgets', () => {
  const config = poolConfig({ connectionString: remote + '?sslmode=verify-full' });
  assert.equal(config.host, 'database.example.test');
  assert.equal(config.ssl.rejectUnauthorized, true);
  assert.equal(config.ssl.minVersion, 'TLSv1.2');
  assert.equal(config.ssl.checkServerIdentity('attacker.example.test',
    { subjectaltname: 'DNS:database.example.test' }), undefined);
  assert.equal(config.ssl.checkServerIdentity('database.example.test',
    { subjectaltname: 'DNS:attacker.example.test' }).code, 'ERR_TLS_CERT_ALTNAME_INVALID');
  assert.equal(config.max, 2);
  assert.equal(config.connectionTimeoutMillis, 1500);
  assert.equal(config.options, '');
});

test('DSN options cannot replace verification or inject session/server parameters', () => {
  for (const suffix of ['?sslmode=require', '?sslmode=no-verify', '?sslmode=disable',
    '?sslrootcert=/tmp/ca', '?sslkey=/tmp/key', '?options=-crole%3Dpostgres',
    '?sslmode=verify-full&sslmode=verify-full', '#secret']) {
    assert.throws(() => poolConfig({ connectionString: remote + suffix }),
      { code: 'POSTGRES_NOT_CONFIGURED' });
  }
});

test('invalid schemes, paths, ports and encodings are rejected without echoing DSN', () => {
  for (const url of ['https://user:password@host/db', 'postgres://host/db',
    'postgres://user:password@host/', 'postgres://user:password@host/db/path',
    'postgres://user:password@host:0/db', 'postgres://user:password@host/db%ZZ',
    'postgres://user:password@host/db%00', remote + '\n']) {
    assert.throws(() => poolConfig({ connectionString: url }),
      (error) => error.code === 'POSTGRES_NOT_CONFIGURED' && !error.message.includes(url));
  }
});

test('plaintext is limited to explicit development literal loopback; public host stays TLS', () => {
  assert.equal(poolConfig({ connectionString: 'postgres://tester@127.0.0.1/test', allowLocal: true }).ssl, false);
  assert.throws(() => poolConfig({ connectionString: 'postgres://tester@127.0.0.1/test' }));
  assert.equal(poolConfig({ connectionString: remote, allowLocal: true }).ssl.rejectUnauthorized, true);
  assert.throws(() => poolConfig({ connectionString: 'postgres://tester@localhost/test', allowLocal: true }));
});

test('CA input rejects malformed certificates and any private key', () => {
  for (const ca of ['garbage', '-----BEGIN PRIVATE KEY-----fixture',
    '-----BEGIN CERTIFICATE-----bad-----END CERTIFICATE-----']) {
    assert.throws(() => poolConfig({ connectionString: remote, caCertificate: ca }));
  }
});

test('fixed role and RPC use a sequential READ COMMITTED transaction and bound values', async () => {
  const f = fixture();
  const values = ['principal\'; DROP TABLE secret;--', 'key', 'hash', 'lease', 'text', 'policy', 2, 120];
  assert.deepEqual(await f.executor.call('reserve', values), { version: 1 });
  assert.equal(f.connected(), 1);
  assert.equal(f.queries[0].sql, 'BEGIN ISOLATION LEVEL READ COMMITTED');
  assert.ok(f.queries.some(({ sql }) => sql === 'SET LOCAL ROLE evaro_coach_server'));
  const rpc = f.queries.find(({ sql }) => sql.includes('coach_quota_reserve_v1'));
  assert.equal(rpc.values, values);
  assert.ok(!rpc.sql.includes(values[0]));
  assert.equal(f.queries.at(-1).sql, 'COMMIT');
  assert.deepEqual(f.releases, [false]);
});

test('unknown profile/operation and incorrect arity never connect or run SQL', async () => {
  assert.throws(() => createPrivatePostgresExecutor({ profile: 'postgres;drop', connectionString: remote }));
  const f = fixture();
  for (const [operation, values] of [['select arbitrary SQL', []], ['reserve', []], ['__proto__', []]]) {
    await assert.rejects(f.executor.call(operation, values), { code: 'POSTGRES_UNAVAILABLE' });
  }
  assert.equal(f.connected(), 0);
});

test('privileged login or unsafe execution role cannot mutate or commit', async () => {
  for (const config of [{ unsafeLogin: true }, { unsafeRole: true }]) {
    const f = fixture(config);
    await assert.rejects(f.executor.call('finalize', ['id', 'lease', 'failed']));
    assert.ok(!f.queries.some(({ sql }) => sql.includes('finalize_v1') || sql === 'COMMIT'));
    assert.deepEqual(f.releases, [true]);
  }
});

test('uncertain COMMIT acknowledgement destroys connection, stays redacted and never retries', async () => {
  const f = fixture({ failAt: 'COMMIT' });
  await assert.rejects(f.executor.call('finalize', ['id', 'lease', 'failed']),
    (error) => error.code === 'POSTGRES_UNAVAILABLE' && !/password|credentials/.test(error.message));
  assert.equal(f.queries.filter(({ sql }) => sql.includes('finalize_v1')).length, 1);
  assert.equal(f.connected(), 1);
  assert.deepEqual(f.releases, [true]);
});

test('malformed result cannot commit and close prevents later admission', async () => {
  const f = fixture({ malformed: true });
  await assert.rejects(f.executor.call('finalize', ['id', 'lease', 'failed']));
  assert.ok(!f.queries.some(({ sql }) => sql === 'COMMIT'));
  await f.executor.close();
  await assert.rejects(f.executor.call('finalize', ['id', 'lease', 'failed']));
  assert.equal(f.connected(), 1);
  assert.equal(f.ended(), 1);
});

test('idle pool errors are handled without emitting sensitive error messages', () => {
  const f = fixture();
  assert.equal(f.listeners[0].event, 'error');
  assert.doesNotThrow(() => f.listeners[0].callback(Error(remote)));
});

test('quota and deletion adapters preserve exact function argument order', async () => {
  const calls = [];
  const executor = { call: async (op, values) => { calls.push([op, values]); return true; } };
  const quota = createPostgresQuotaStore(executor);
  await quota.beginAttempt({ p_reservation_id: 'r', p_lease_id: 'l', p_attempt: 2 });
  await quota.finalize({ p_reservation_id: 'r', p_lease_id: 'l', p_outcome: 'failed' });
  const journal = createPostgresDeletionJournal(executor);
  await journal.claim({ userId: 'u', requestId: 'r', authorizedAt: 't' });
  await journal.claimAuthorized({ requestId: 'r' });
  await journal.markStage({ userId: 'u', requestId: 'r', leaseId: 'l', stage: 's' });
  await journal.complete({ userId: 'u', requestId: 'r', leaseId: 'l', deletedAt: 't' });
  await journal.release({ userId: 'u', requestId: 'r', leaseId: 'l' });
  assert.deepEqual(calls, [['beginAttempt', ['r','l',2]], ['finalize', ['r','l','failed']],
    ['claim',['u','r','t']], ['claimAuthorized',['r']], ['markStage',['u','r','l','s']],
    ['complete',['u','r','l','t']], ['release',['u','r','l']]]);
});

test('missing PostgreSQL config maps to quota configuration failure; default-off remains inert', () => {
  assert.equal(createQuotaFromEnv({ COACH_QUOTA_STORE: 'postgres' }), null);
  assert.throws(() => createQuotaFromEnv({ COACH_QUOTA_ENABLED: 'true', COACH_QUOTA_STORE: 'postgres' }),
    (error) => error instanceof CoachQuotaError && error.code === 'QUOTA_NOT_CONFIGURED');
});

test('environment pool cache uses bounded profile pools and forbids local plaintext in production', async () => {
  const env = { COACH_QUOTA_POSTGRES_URL: remote, EVARO_POSTGRES_ALLOW_LOCAL: 'true',
    APP_ENV: 'development', NODE_ENV: 'production' };
  const a = privatePostgresFromEnv('quota', env);
  assert.equal(a, privatePostgresFromEnv('quota', env));
  assert.throws(() => privatePostgresFromEnv('quota', { ...env,
    COACH_QUOTA_POSTGRES_URL: 'postgres://tester@127.0.0.1/test' }));
  assert.throws(() => privatePostgresFromEnv('quota', { ...env, NODE_ENV: 'test', VERCEL: '1',
    COACH_QUOTA_POSTGRES_URL: 'postgres://tester@127.0.0.1/test' }));
  await closePrivatePostgresPools();
});
