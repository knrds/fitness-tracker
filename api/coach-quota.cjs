const { createHmac, randomUUID } = require('node:crypto');

// This module coordinates a durable store; it is never a quota authority itself.
// The store must atomically enforce its own user/global policy before granting a
// reservation. Units are bounded provider attempts, not measured monetary spend.
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const RESERVED_UNITS = 2;
const LEASE_SECONDS = 120;
const POLICY_ID = 'coach-beta-v1';
const record = (value) => value !== null && typeof value === 'object' && !Array.isArray(value);
const exactKeys = (value, keys) =>
  record(value) &&
  Object.keys(value).length === keys.length &&
  keys.every((key) => Object.hasOwn(value, key));

class CoachQuotaError extends Error {
  constructor(code = 'QUOTA_UNAVAILABLE', status = 503, retryAfterSeconds) {
    super('Coach quota could not authorize this request');
    this.name = 'CoachQuotaError';
    this.code = code;
    this.status = status;
    this.retryAfterSeconds = retryAfterSeconds;
  }
}

function principalFor(identity) {
  if (!record(identity) || typeof identity.id !== 'string')
    throw new CoachQuotaError('QUOTA_IDENTITY', 401);
  if (identity.source === 'account' && UUID.test(identity.id))
    return 'account:' + identity.id.toLowerCase();
  if (identity.source === 'beta' && /^beta_guest_[0-9a-f]{16}$/.test(identity.id))
    return 'beta:' + identity.id;
  if (identity.source === 'loopback' && /^loopback-[A-Za-z0-9_-]{1,100}$/.test(identity.id))
    return 'loopback:' + identity.id;
  throw new CoachQuotaError('QUOTA_IDENTITY', 401);
}

async function callStore(store, method, params, timeoutMs) {
  let timeout;
  try {
    return await Promise.race([
      Promise.resolve().then(() => store[method](params)),
      new Promise((_, reject) => {
        timeout = setTimeout(() => reject(new CoachQuotaError()), timeoutMs);
      }),
    ]);
  } catch {
    // Raw store errors may contain credentials or sensitive parameters.
    throw new CoachQuotaError();
  } finally {
    clearTimeout(timeout);
  }
}

function createCoachQuota({
  store,
  hashSecret,
  now = Date.now,
  uuid = randomUUID,
  storeTimeoutMs = 3000,
}) {
  if (
    !store ||
    !['reserve', 'beginAttempt', 'finalize'].every(
      (method) => typeof store[method] === 'function',
    ) ||
    typeof hashSecret !== 'string' ||
    Buffer.byteLength(hashSecret) < 32 ||
    !Number.isSafeInteger(storeTimeoutMs) ||
    storeTimeoutMs < 1 ||
    storeTimeoutMs > 5000
  )
    throw new CoachQuotaError('QUOTA_NOT_CONFIGURED');

  return {
    async reserve({ identity, requestKey, body, modality }) {
      if (typeof requestKey !== 'string' || !UUID.test(requestKey))
        throw new CoachQuotaError('QUOTA_REQUEST_KEY', 400);
      if (!record(body) || !['text', 'image', 'audio'].includes(modality))
        throw new CoachQuotaError('QUOTA_REQUEST', 400);
      const principal = principalFor(identity);
      const leaseId = uuid();
      if (!UUID.test(leaseId)) throw new CoachQuotaError();
      let requestHash;
      try {
        requestHash = createHmac('sha256', hashSecret).update(JSON.stringify(body)).digest('hex');
      } catch {
        throw new CoachQuotaError('QUOTA_REQUEST', 400);
      }
      const params = {
        p_principal: principal,
        p_request_key: requestKey.toLowerCase(),
        p_request_hash: requestHash,
        p_lease_id: leaseId,
        p_modality: modality,
        p_policy_id: POLICY_ID,
        p_reserved_units: RESERVED_UNITS,
        p_lease_seconds: LEASE_SECONDS,
      };
      const receipt = await callStore(store, 'reserve', params, storeTimeoutMs);
      if (!record(receipt) || receipt.version !== 1) throw new CoachQuotaError();
      if (
        exactKeys(receipt, ['version', 'status']) &&
        ['in_progress', 'completed', 'conflict'].includes(receipt.status)
      ) {
        throw new CoachQuotaError(
          receipt.status === 'conflict' ? 'QUOTA_KEY_CONFLICT' : 'QUOTA_DUPLICATE',
          409,
        );
      }
      if (
        exactKeys(receipt, ['version', 'status', 'reason', 'retry_after_seconds']) &&
        receipt.status === 'denied' &&
        ['user_limit', 'global_limit', 'access_denied'].includes(receipt.reason) &&
        Number.isSafeInteger(receipt.retry_after_seconds) &&
        receipt.retry_after_seconds >= 0 &&
        receipt.retry_after_seconds <= 86400
      ) {
        throw new CoachQuotaError(
          receipt.reason === 'access_denied' ? 'QUOTA_ACCESS_DENIED' : 'QUOTA_LIMIT',
          receipt.reason === 'access_denied' ? 403 : 429,
          receipt.retry_after_seconds,
        );
      }
      if (
        !exactKeys(receipt, [
          'version',
          'status',
          'reservation_id',
          'principal',
          'request_key',
          'request_hash',
          'lease_id',
          'modality',
          'reserved_units',
          'expires_at',
        ]) ||
        receipt.status !== 'reserved' ||
        !UUID.test(receipt.reservation_id) ||
        receipt.principal !== principal ||
        receipt.request_key !== params.p_request_key ||
        receipt.request_hash !== requestHash ||
        receipt.lease_id !== leaseId ||
        receipt.modality !== modality ||
        receipt.reserved_units !== RESERVED_UNITS ||
        typeof receipt.expires_at !== 'string' ||
        !Number.isFinite(Date.parse(receipt.expires_at)) ||
        Date.parse(receipt.expires_at) <= now() ||
        Date.parse(receipt.expires_at) > now() + (LEASE_SECONDS + 5) * 1000
      )
        throw new CoachQuotaError();

      let nextAttempt = 1;
      let confirmedAttempts = 0;
      let pendingAttempt = false;
      let closed = false;
      const reservationId = receipt.reservation_id;
      return {
        async beginAttempt(attempt) {
          // Local sequencing is an extra guard. Only the persisted single-use
          // marker authorizes dispatch, including on another server instance.
          if (
            closed ||
            pendingAttempt ||
            attempt !== nextAttempt ||
            attempt > RESERVED_UNITS ||
            Date.parse(receipt.expires_at) <= now()
          )
            throw new CoachQuotaError();
          pendingAttempt = true;
          nextAttempt++;
          try {
            const started = await callStore(
              store,
              'beginAttempt',
              {
                p_reservation_id: reservationId,
                p_lease_id: leaseId,
                p_attempt: attempt,
              },
              storeTimeoutMs,
            );
            if (
              !exactKeys(started, ['version', 'status', 'reservation_id', 'lease_id', 'attempt']) ||
              started.version !== 1 ||
              started.status !== 'started' ||
              started.reservation_id !== reservationId ||
              started.lease_id !== leaseId ||
              started.attempt !== attempt
            )
              throw new CoachQuotaError();
            confirmedAttempts++;
          } catch {
            closed = true;
            throw new CoachQuotaError();
          } finally {
            pendingAttempt = false;
          }
        },
        async finalize(outcome) {
          if (!['success', 'failed'].includes(outcome)) throw new CoachQuotaError();
          closed = true;
          // Completion may be repeated after an uncertain response, using the
          // same lease. The DB computes charges from its own attempt markers.
          const finalized = await callStore(
            store,
            'finalize',
            {
              p_reservation_id: reservationId,
              p_lease_id: leaseId,
              p_outcome: outcome,
            },
            storeTimeoutMs,
          );
          if (
            !exactKeys(finalized, [
              'version',
              'status',
              'reservation_id',
              'lease_id',
              'charged_units',
            ]) ||
            finalized.version !== 1 ||
            finalized.status !== 'finalized' ||
            finalized.reservation_id !== reservationId ||
            finalized.lease_id !== leaseId ||
            !Number.isSafeInteger(finalized.charged_units) ||
            finalized.charged_units < confirmedAttempts ||
            finalized.charged_units > RESERVED_UNITS
          )
            throw new CoachQuotaError();
        },
      };
    },
  };
}

// Provisional transport for an existing Supabase deployment. A direct Postgres
// adapter can implement the same three methods without changing the lifecycle.
function createSupabaseQuotaStore({
  url,
  key,
  fetchImpl = (...args) => fetch(...args),
  timeoutMs = 3000,
}) {
  let parsed;
  try {
    parsed = new URL(url);
  } catch {
    throw new CoachQuotaError('QUOTA_NOT_CONFIGURED');
  }
  if (
    parsed.protocol !== 'https:' ||
    parsed.username ||
    parsed.password ||
    parsed.search ||
    parsed.hash ||
    !['', '/'].includes(parsed.pathname) ||
    typeof key !== 'string' ||
    !key.trim() ||
    !Number.isSafeInteger(timeoutMs) ||
    timeoutMs < 1 ||
    timeoutMs > 5000
  )
    throw new CoachQuotaError('QUOTA_NOT_CONFIGURED');
  const headers = { apikey: key, 'Content-Type': 'application/json' };
  if (!key.startsWith('sb_secret_')) {
    try {
      if (
        JSON.parse(Buffer.from(key.split('.')[1], 'base64url').toString()).role !== 'service_role'
      )
        throw Error();
    } catch {
      throw new CoachQuotaError('QUOTA_NOT_CONFIGURED');
    }
    headers.Authorization = 'Bearer ' + key;
  }
  const rpc = async (name, params) => {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), timeoutMs);
    try {
      // No retry: a POST timeout can mean a durable mutation already committed.
      const response = await fetchImpl(parsed.origin + '/rest/v1/rpc/' + name, {
        method: 'POST',
        headers,
        body: JSON.stringify(params),
        signal: controller.signal,
        redirect: 'error',
      });
      if (!response.ok) throw new CoachQuotaError();
      return await response.json();
    } catch {
      throw new CoachQuotaError();
    } finally {
      clearTimeout(timeout);
    }
  };
  return {
    reserve: (params) => rpc('coach_quota_reserve_v1', params),
    beginAttempt: (params) => rpc('coach_quota_begin_attempt_v1', params),
    finalize: (params) => rpc('coach_quota_finalize_v1', params),
  };
}

function createQuotaFromEnv(env = process.env) {
  if (env.COACH_QUOTA_ENABLED === undefined || env.COACH_QUOTA_ENABLED === 'false') return null;
  if (env.COACH_QUOTA_ENABLED !== 'true' || env.COACH_QUOTA_STORE !== 'supabase-rpc')
    throw new CoachQuotaError('QUOTA_NOT_CONFIGURED');
  return createCoachQuota({
    hashSecret: env.COACH_QUOTA_HASH_SECRET,
    store: createSupabaseQuotaStore({
      url: env.SUPABASE_URL,
      key: env.SUPABASE_SECRET_KEY || env.SUPABASE_SERVICE_ROLE_KEY,
    }),
  });
}

module.exports = {
  CoachQuotaError,
  createCoachQuota,
  createSupabaseQuotaStore,
  createQuotaFromEnv,
};
