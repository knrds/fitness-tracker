// Real server-adapter proof against a disposable local database. No remote
// connection options, user data, provider calls or production activation.
const assert = require('node:assert/strict');
const { randomUUID, randomBytes } = require('node:crypto');
const { readFileSync } = require('node:fs');
const { resolve } = require('node:path');
const { Client } = require('pg');
const { createPrivatePostgresExecutor } = require('../../api/private-postgres.cjs');
const { createPostgresQuotaStore } = require('../../api/coach-quota-postgres.cjs');
const { createCoachQuota } = require('../../api/coach-quota.cjs');
const { createPostgresDeletionJournal } = require('../../api/account-deletion-postgres.cjs');
const { createAccountDeletionLifecycle, STAGES, REQUIRED_GATES } = require('../../api/account-deletion-lifecycle.cjs');

const port = Number(process.env.PGPORT || 55432);
if (!Number.isInteger(port) || port < 1 || port > 65535) throw Error('Invalid local test port');
const id = randomUUID().replaceAll('-', '');
const database = 'evaro_' + id + '_postgres_adapter_test';
const appRole = 'evaro_adapter_' + id;
// CI uses SCRAM rather than local trust. An unpredictable per-run credential
// stays in memory, never printed or shared with the installing/admin identity.
const appPassword = randomBytes(32).toString('hex');
const adminConfig = { host: '127.0.0.1', port, user: process.env.PGUSER || 'postgres',
  password: process.env.PGPASSWORD || undefined, ssl: false, connectionTimeoutMillis: 3000 };
const root = resolve(__dirname, '../..');
let admin, quotaExecutor, deletionExecutor, roleCreated = false, phase = 'bootstrap';

async function run() {
  const bootstrap = new Client({ ...adminConfig, database: 'postgres' });
  await bootstrap.connect();
  try { await bootstrap.query('CREATE DATABASE ' + database); }
  finally { await bootstrap.end(); }
  admin = new Client({ ...adminConfig, database });
  await admin.connect();
  for (const file of ['database/coach-quota.sql', 'database/account-deletion-journal.sql']) {
    phase = file;
    await admin.query(readFileSync(resolve(root, file), 'utf8'));
  }
  // Unique synthetic role only. No real credentials; loopback test service.
  phase = 'restricted role setup';
  await admin.query('CREATE ROLE ' + appRole + " LOGIN NOINHERIT PASSWORD '" + appPassword + "'");
  roleCreated = true;
  await admin.query('GRANT evaro_coach_server, evaro_deletion_server TO ' + appRole);
  const connectionString = 'postgresql://' + appRole + ':' + appPassword + '@127.0.0.1:' + port + '/' + database;
  const config = { connectionString, allowLocal: true };
  quotaExecutor = createPrivatePostgresExecutor({ profile: 'quota', ...config });
  deletionExecutor = createPrivatePostgresExecutor({ profile: 'deletion', ...config });

  // Positive and negative authority proof through a real restricted login.
  phase = 'restricted authority';
  const restricted = new Client({ ...adminConfig, user: appRole, password: appPassword, database });
  await restricted.connect();
  try {
    await restricted.query('SET ROLE evaro_coach_server');
    await assert.rejects(restricted.query('SELECT * FROM evaro_private.coach_quota_reservations'),
      (error) => error.code === '42501');
    await assert.rejects(restricted.query('SELECT * FROM evaro_deletion_private.account_deletion_operations'),
      (error) => error.code === '42501');
  } finally { await restricted.end(); }

  const userId = randomUUID(), sessionId = randomUUID();
  phase = 'quota fixtures';
  await admin.query(`INSERT INTO evaro_private.coach_quota_policies
    (policy_id,modality,enabled,user_daily_units,global_daily_units)
    VALUES('coach-beta-v1','text',true,8,8)`);
  await admin.query(`INSERT INTO evaro_private.coach_quota_principals(principal,policy_id,enabled)
    VALUES($1,'coach-beta-v1',true)`, ['account:' + userId]);
  const quota = createCoachQuota({ store: createPostgresQuotaStore(quotaExecutor),
    hashSecret: 'synthetic-test-'.repeat(4) });
  const request = { identity: { source: 'account', id: userId }, requestKey: randomUUID(),
    body: { messages: [{ role: 'user', content: 'Synthetic test' }] }, modality: 'text' };
  phase = 'quota lifecycle';
  const reservation = await quota.reserve(request);
  await reservation.beginAttempt(1);
  await assert.rejects(reservation.beginAttempt(1));
  await reservation.finalize('success');
  await reservation.finalize('success');
  await assert.rejects(quota.reserve(request), { code: 'QUOTA_DUPLICATE' });
  const usage = await admin.query('SELECT charged_units,status FROM evaro_private.coach_quota_reservations');
  assert.deepEqual(usage.rows, [{ charged_units: 1, status: 'finalized' }]);
  // Independent executor/process connection observes the same durable ledger.
  const another = createPrivatePostgresExecutor({ profile: 'quota', ...config });
  try {
    const otherQuota = createCoachQuota({ store: createPostgresQuotaStore(another),
      hashSecret: 'synthetic-test-'.repeat(4) });
    await assert.rejects(otherQuota.reserve(request), { code: 'QUOTA_DUPLICATE' });
  } finally { await another.close(); }

  const requestId = randomUUID(), acknowledgements = [], completed = new Set();
  phase = 'deletion lifecycle';
  let failStage = STAGES[3], authenticated = true;
  const auth = {
    authenticate: async () => {
      assert.equal(authenticated, true);
      return { userId, sessionId, isAnonymous: false };
    },
    verifyReauthentication: async () => ({ userId, sessionId, verifiedAt: new Date().toISOString() }),
    getReadiness: async () => Object.fromEntries(REQUIRED_GATES.map((gate) => [gate, true])),
  };
  // These are explicitly synthetic external-stage adapters; this tests the real
  // journal, not actual Auth/storage/provider deletion or legal readiness.
  const stages = Object.fromEntries(STAGES.map((stage) => [stage, async (context) => {
    if (stage === failStage) throw Error('Synthetic stage interruption');
    completed.add(stage);
    acknowledgements.push(stage);
    if (stage === STAGES[4]) authenticated = false;
    return { complete: true, user_id: context.userId, request_id: context.requestId, stage };
  }]));
  const lifecycle = createAccountDeletionLifecycle({ integrationEnabled: true, ...auth, stages,
    journal: createPostgresDeletionJournal(deletionExecutor) });
  const response = await lifecycle.request({ authorization: 'Bearer synthetic-account-session',
    requestId, confirmationText: 'DELETE' });
  phase = 'deletion initial response ' + response.status + '/' + (response.body.code || 'receipt');
  assert.equal(response.status, 503);
  assert.deepEqual(acknowledgements, STAGES.slice(0, 3));
  await deletionExecutor.close();
  // Simulate process restart: real new pool, same database/journal. No new
  // authorization is created by the trusted worker's resume path.
  deletionExecutor = createPrivatePostgresExecutor({ profile: 'deletion', ...config });
  failStage = undefined;
  const resumed = createAccountDeletionLifecycle({ integrationEnabled: true, ...auth, stages,
    journal: createPostgresDeletionJournal(deletionExecutor) });
  const receipt = await resumed.resumeAuthorized(requestId);
  phase = 'deletion resumed response ' + receipt.status + '/' + (receipt.body.code || 'receipt');
  assert.equal(receipt.status, 200);
  assert.equal(receipt.body.user_id, userId);
  assert.equal(receipt.body.success, true);
  assert.deepEqual(acknowledgements, STAGES);
  assert.equal(completed.size, 6);
  const replay = await resumed.resumeAuthorized(requestId);
  assert.deepEqual(replay, receipt);
  assert.deepEqual(acknowledgements, STAGES);
  assert.equal(authenticated, false);

  const privileged = createPrivatePostgresExecutor({ profile: 'quota', allowLocal: true,
    connectionString: 'postgresql://' + encodeURIComponent(adminConfig.user) + ':' +
      encodeURIComponent(adminConfig.password || '') + '@127.0.0.1:' + port + '/' + database });
  try {
    await assert.rejects(privileged.call('finalize', [randomUUID(), randomUUID(), 'failed']),
      { code: 'POSTGRES_UNAVAILABLE' });
  } finally { await privileged.close(); }
  console.log('Real PostgreSQL adapters PASS: quota replay/charging, restricted roles, durable deletion restart/receipt.');
  console.log('Synthetic database retained: ' + database);
}

run().catch((error) => {
  // No DSNs, passwords or private database errors in CI/user output.
  const code = typeof error.code === 'string' && /^[A-Z0-9_]{1,40}$/.test(error.code) ? error.code : 'UNKNOWN';
  console.error('Real PostgreSQL adapter test failed at ' + phase + ' (' + code + '); no production/provider operation performed.');
  process.exitCode = 1;
}).finally(async () => {
  for (const executor of [quotaExecutor, deletionExecutor]) {
    if (executor) await executor.close().catch(() => { process.exitCode = 1; });
  }
  if (admin && roleCreated) {
    try {
      await admin.query('REVOKE evaro_coach_server, evaro_deletion_server FROM ' + appRole);
      await admin.query('ALTER ROLE ' + appRole + ' NOLOGIN');
    } catch { process.exitCode = 1; }
  }
  if (admin) await admin.end().catch(() => { process.exitCode = 1; });
});
