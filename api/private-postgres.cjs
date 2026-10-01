const { createHash, X509Certificate } = require('node:crypto');
const { checkServerIdentity } = require('node:tls');

// Server-only, fixed private RPCs. This is not a general-purpose query gateway.
const PROFILES = Object.freeze({
  quota: {
    role: 'evaro_coach_server',
    operations: {
      reserve: ['SELECT evaro_private.coach_quota_reserve_v1($1::text,$2::uuid,$3::text,$4::uuid,$5::text,$6::text,$7::integer,$8::integer) AS value', 8],
      beginAttempt: ['SELECT evaro_private.coach_quota_begin_attempt_v1($1::uuid,$2::uuid,$3::integer) AS value', 3],
      finalize: ['SELECT evaro_private.coach_quota_finalize_v1($1::uuid,$2::uuid,$3::text) AS value', 3],
    },
  },
  deletion: {
    role: 'evaro_deletion_server',
    operations: {
      claim: ['SELECT evaro_deletion_private.account_deletion_claim_v1($1::uuid,$2::uuid,$3::timestamptz) AS value', 3],
      claimAuthorized: ['SELECT evaro_deletion_private.account_deletion_claim_authorized_v1($1::uuid) AS value', 1],
      markStage: ['SELECT evaro_deletion_private.account_deletion_mark_stage_v1($1::uuid,$2::uuid,$3::uuid,$4::text) AS value', 4],
      complete: ['SELECT evaro_deletion_private.account_deletion_complete_v1($1::uuid,$2::uuid,$3::uuid,$4::timestamptz) AS value', 4],
      release: ['SELECT evaro_deletion_private.account_deletion_release_v1($1::uuid,$2::uuid,$3::uuid) AS value', 3],
    },
  },
});

class PrivatePostgresError extends Error {
  constructor(code = 'POSTGRES_UNAVAILABLE') {
    super('Private database operation unavailable');
    this.name = 'PrivatePostgresError';
    this.code = code;
  }
}

function poolConfig({ connectionString, allowLocal = false, caCertificate }) {
  let url;
  try {
    if (typeof connectionString !== 'string' || connectionString.length > 8192 ||
        /[\x00-\x20\x7f]/.test(connectionString)) throw Error();
    url = new URL(connectionString);
    if (!['postgres:', 'postgresql:'].includes(url.protocol) || !url.hostname ||
        !url.username || url.hash || !/^\/[^/]+$/.test(url.pathname)) throw Error();
    // pg connection-string SSL options override an explicit ssl object. Only
    // verify-full is accepted, then removed; all TLS configuration is explicit.
    if ([...url.searchParams.keys()].some((key) => key !== 'sslmode') ||
        url.searchParams.getAll('sslmode').length > 1 ||
        (url.searchParams.has('sslmode') && url.searchParams.get('sslmode') !== 'verify-full')) throw Error();
    const host = url.hostname.replace(/^\[|\]$/g, '');
    const local = allowLocal === true && ['127.0.0.1', '::1'].includes(host);
    const user = decodeURIComponent(url.username);
    const password = decodeURIComponent(url.password);
    const database = decodeURIComponent(url.pathname.slice(1));
    if (!user || !database || /[\x00-\x1f\x7f]/.test(user + password + database) ||
        (!local && !password)) throw Error();
    const port = Number(url.port || 5432);
    if (!Number.isInteger(port) || port < 1 || port > 65535) throw Error();
    const ssl = local ? false : { rejectUnauthorized: true, minVersion: 'TLSv1.2',
      checkServerIdentity: (_servername, certificate) => checkServerIdentity(host, certificate) };
    if (caCertificate !== undefined) {
      if (local || typeof caCertificate !== 'string' || caCertificate.length > 65536 ||
          !/^-----BEGIN CERTIFICATE-----[\s\S]+-----END CERTIFICATE-----\s*$/.test(caCertificate) ||
          /PRIVATE KEY/.test(caCertificate)) throw Error();
      new X509Certificate(caCertificate);
      ssl.ca = caCertificate;
    }
    return {
      host, port, user, password, database, ssl,
      max: 2, min: 0, allowExitOnIdle: true, idleTimeoutMillis: 10000,
      connectionTimeoutMillis: 1500, query_timeout: 2500,
      application_name: 'evaro-private-rpc', options: '',
    };
  } catch { throw new PrivatePostgresError('POSTGRES_NOT_CONFIGURED'); }
}

function createPrivatePostgresExecutor({ profile, makePool, ...config }) {
  const selected = Object.hasOwn(PROFILES, profile) ? PROFILES[profile] : null;
  if (!selected) throw new PrivatePostgresError('POSTGRES_NOT_CONFIGURED');
  const resolved = poolConfig(config);
  let pool;
  try {
    pool = makePool ? makePool(resolved) : new (require('pg').Pool)(resolved);
    if (typeof pool.connect !== 'function' || typeof pool.end !== 'function' ||
        typeof pool.on !== 'function') throw Error();
    // Background pool errors may contain DSNs. Never log their raw message or
    // let an idle connection error crash the process. Future operations retry
    // admission normally; mutations themselves are never automatically retried.
    pool.on('error', () => {});
  } catch { throw new PrivatePostgresError('POSTGRES_NOT_CONFIGURED'); }
  let closed = false;
  return Object.freeze({
    async call(operation, values) {
      const command = Object.hasOwn(selected.operations, operation) ? selected.operations[operation] : null;
      if (closed || !command || !Array.isArray(values) || values.length !== command[1])
        throw new PrivatePostgresError();
      let client;
      let destroy = true;
      try {
        client = await pool.connect();
        await client.query('BEGIN ISOLATION LEVEL READ COMMITTED');
        await client.query("SET LOCAL statement_timeout = '2000ms'");
        await client.query("SET LOCAL idle_in_transaction_session_timeout = '3000ms'");
        const identity = await client.query(`SELECT NOT (r.rolsuper OR r.rolbypassrls OR r.rolcreatedb OR r.rolcreaterole OR r.rolreplication) AS safe
          FROM pg_catalog.pg_roles r WHERE r.rolname = session_user`);
        if (identity.rows?.length !== 1 || identity.rows[0].safe !== true) throw Error();
        // Role comes solely from this fixed profile, never from request input.
        await client.query('SET LOCAL ROLE ' + selected.role);
        const role = await client.query(`SELECT current_user = $1 AS safe,
          NOT (r.rolsuper OR r.rolbypassrls OR r.rolcreatedb OR r.rolcreaterole OR r.rolreplication OR r.rolcanlogin) AS restricted
          FROM pg_catalog.pg_roles r WHERE r.rolname = current_user`, [selected.role]);
        if (role.rows?.length !== 1 || role.rows[0].safe !== true || role.rows[0].restricted !== true) throw Error();
        const result = await client.query(command[0], values);
        if (result.rows?.length !== 1 || !Object.hasOwn(result.rows[0], 'value')) throw Error();
        await client.query('COMMIT');
        destroy = false;
        return result.rows[0].value;
      } catch {
        // Unknown COMMIT acknowledgement remains unknown. Disconnect rolls
        // back uncommitted transactions; never replay a possible committed RPC.
        throw new PrivatePostgresError();
      } finally {
        if (client) {
          try { client.release(destroy); } catch { /* Admission fails closed above. */ }
        }
      }
    },
    async close() {
      closed = true;
      try { await pool.end(); } catch { throw new PrivatePostgresError(); }
    },
  });
}

// One small pool per service profile. A changed config retires the prior pool
// without exposing credentials in cache keys, messages or telemetry.
const executors = new Map();
function privatePostgresFromEnv(profile, env = process.env) {
  const config = {
    connectionString: profile === 'quota' ? env.COACH_QUOTA_POSTGRES_URL : env.ACCOUNT_DELETION_POSTGRES_URL,
    caCertificate: env.EVARO_POSTGRES_CA_CERT,
    allowLocal: env.EVARO_POSTGRES_ALLOW_LOCAL === 'true' &&
      env.APP_ENV === 'development' && env.NODE_ENV !== 'production' && !env.VERCEL,
  };
  const fingerprint = createHash('sha256').update(JSON.stringify(config)).digest('hex');
  const existing = executors.get(profile);
  if (existing?.fingerprint === fingerprint) return existing.executor;
  const executor = createPrivatePostgresExecutor({ profile, ...config });
  executors.set(profile, { fingerprint, executor });
  if (existing) void existing.executor.close().catch(() => {});
  return executor;
}

async function closePrivatePostgresPools() {
  const active = [...executors.values()];
  executors.clear();
  await Promise.all(active.map(({ executor }) => executor.close()));
}

module.exports = { PrivatePostgresError, poolConfig, createPrivatePostgresExecutor,
  privatePostgresFromEnv, closePrivatePostgresPools };
