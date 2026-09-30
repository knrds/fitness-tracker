// Local R01 foundation only. No HTTP/RPC route, database/provider adapter, or
// environment toggle is supplied. Constructing this module leaves integration OFF.
const STAGES = Object.freeze([
  'fenceWritesAndRevokeSessions',
  'deletePrivateStorage',
  'deleteProviderData',
  'deleteCloudData',
  'deleteAuthIdentity',
  'verifyCompletion',
]);
const REQUIRED_GATES = Object.freeze([
  'authAndReauthVerified',
  'durableJournalVerified',
  'writeFenceVerified',
  'inventoryVerified',
  'retentionApproved',
  'restoreVerified',
  'completionVerificationVerified',
]);
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const isUuid = (value) => typeof value === 'string' && UUID.test(value);
const isRecord = (value) => value !== null && typeof value === 'object' && !Array.isArray(value);
const hasKeys = (value, keys) => isRecord(value) &&
  Object.keys(value).length === keys.length && keys.every((key) => Object.hasOwn(value, key));
const instant = (value) => typeof value === 'string' &&
  /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/.test(value) &&
  Number.isFinite(Date.parse(value)) && new Date(value).toISOString() === value;
const failure = (status, code) => ({ status, body: { success: false, code } });
const validReceipt = (value, userId) =>
  hasKeys(value, ['version', 'success', 'user_id', 'deleted_at']) &&
  value.version === 1 && value.success === true && value.user_id === userId && instant(value.deleted_at);

function validRecord(record, requestId, userId, now) {
  return hasKeys(record, ['version', 'user_id', 'request_id', 'authorized_at', 'completed_stages']) &&
    record.version === 1 && isUuid(record.user_id) && record.request_id === requestId &&
    (userId === undefined || record.user_id === userId) &&
    instant(record.authorized_at) && Date.parse(record.authorized_at) <= now &&
    Array.isArray(record.completed_stages) && record.completed_stages.length <= STAGES.length &&
    record.completed_stages.every((stage, index) => stage === STAGES[index]);
}

/**
 * Adapters are SERVER authority and must be supplied/reviewed before enabling.
 * authenticate verifies a real, current user/session; user metadata, decoded
 * unverified JWTs, beta guests and client IDs cannot establish authority.
 * verifyReauthentication returns a server-verified userId/sessionId/verifiedAt;
 * JWT refresh/iat and client timestamps are not proof of fresh authentication.
 *
 * Journal contract, portable to ordinary PostgreSQL:
 * claim({userId, requestId, authorizedAt}) atomically creates authorization OR
 * reacquires that SAME user's SAME request; one active operation per user.
 * claimAuthorized({requestId}) is PRIVATE worker access to existing authorized
 * records only. It must never create authorization or be exposed as a route.
 * Both return {status:'busy'} or {status:'acquired', unique leaseId, record} or
 * {status:'complete', record, receipt}. Records survive removal of auth users.
 * markStage(context) atomically checks the live lease and saves the next prefix,
 * returning the committed record. complete(context) persists the strict receipt
 * only with all stages committed and returns that persisted receipt. release
 * conditionally releases the matching lease; expiry/crash recovery is durable.
 *
 * Stage adapters are idempotent for userId/requestId, bounded, and return exactly
 * {complete:true,user_id,request_id,stage}. "No data" needs an audited inventory;
 * absence of an adapter never counts as deletion. The initial fence must cover
 * all writers and still-valid access tokens. Auth removal comes after data work;
 * verifyCompletion independently verifies every approved scope/retention rule.
 * Lost acknowledgements are retried with the same operation identity.
 * No production adapter or in-memory fallback is provided here.
 */
function createAccountDeletionLifecycle(deps = {}) {
  const now = deps.now || Date.now;
  const configured = () => deps.integrationEnabled === true &&
    ['authenticate', 'verifyReauthentication', 'getReadiness'].every((key) => typeof deps[key] === 'function') &&
    ['claim', 'claimAuthorized', 'markStage', 'complete', 'release']
      .every((key) => typeof deps.journal?.[key] === 'function') &&
    STAGES.every((stage) => typeof deps.stages?.[stage] === 'function');
  const ready = async () => {
    try {
      const readiness = await deps.getReadiness();
      return REQUIRED_GATES.every((gate) => readiness?.[gate] === true);
    } catch { return false; }
  };

  async function execute(claim, requestId, expectedUserId) {
    let context;
    let completed = false;
    try {
      const operation = await claim();
      if (operation?.status === 'busy') return failure(409, 'DELETION_IN_PROGRESS');
      const record = operation?.record;
      if (!validRecord(record, requestId, expectedUserId, now())) {
        return failure(503, 'DELETION_STATE_INVALID');
      }
      if (operation.status === 'complete') {
        if (record.completed_stages.length !== STAGES.length ||
            !validReceipt(operation.receipt, record.user_id) ||
            Date.parse(operation.receipt.deleted_at) < Date.parse(record.authorized_at) ||
            Date.parse(operation.receipt.deleted_at) > now()) {
          return failure(503, 'DELETION_STATE_INVALID');
        }
        return { status: 200, body: { ...operation.receipt } };
      }
      if (operation.status !== 'acquired' || !isUuid(operation.leaseId)) {
        return failure(503, 'DELETION_STATE_INVALID');
      }
      context = Object.freeze({ userId: record.user_id, requestId, leaseId: operation.leaseId });
      const authorizedAt = record.authorized_at;
      const completedCount = record.completed_stages.length;
      for (let index = completedCount; index < STAGES.length; index++) {
        const stage = STAGES[index];
        const acknowledgement = await deps.stages[stage](context);
        if (!hasKeys(acknowledgement, ['complete', 'user_id', 'request_id', 'stage']) ||
            acknowledgement.complete !== true || acknowledgement.user_id !== context.userId ||
            acknowledgement.request_id !== requestId || acknowledgement.stage !== stage) {
          return failure(503, 'DELETION_STAGE_UNCONFIRMED');
        }
        const committed = await deps.journal.markStage({ ...context, stage });
        if (!validRecord(committed, requestId, context.userId, now()) ||
            committed.authorized_at !== authorizedAt || committed.completed_stages.length !== index + 1) {
          return failure(503, 'DELETION_STATE_INVALID');
        }
      }
      const completedAt = now();
      if (!Number.isFinite(completedAt) || completedAt < Date.parse(authorizedAt)) {
        return failure(503, 'DELETION_STATE_INVALID');
      }
      const deletedAt = new Date(completedAt).toISOString();
      const receipt = await deps.journal.complete({ ...context, deletedAt });
      if (!validReceipt(receipt, context.userId) || receipt.deleted_at !== deletedAt) {
        return failure(503, 'DELETION_STATE_INVALID');
      }
      completed = true;
      return { status: 200, body: { ...receipt } };
    } catch {
      // Adapter errors can contain tokens, object paths or health data.
      return failure(503, 'DELETION_RETRY_REQUIRED');
    } finally {
      if (context && !completed) {
        try { await deps.journal.release(context); } catch { /* Durable lease expiry recovers it. */ }
      }
    }
  }

  async function request(input) {
    if (!configured()) return failure(503, 'ACCOUNT_DELETION_NOT_CONFIGURED');
    if (!hasKeys(input, ['authorization', 'requestId', 'confirmationText'])) {
      return failure(400, 'DELETION_REQUEST_INVALID');
    }
    const { authorization, requestId, confirmationText } = input;
    if (!isUuid(requestId) || typeof confirmationText !== 'string' ||
        !['DELETE', 'LÖSCHEN'].includes(confirmationText.trim().toUpperCase())) {
      return failure(400, 'DELETION_REQUEST_INVALID');
    }
    if (typeof authorization !== 'string' || authorization.length > 8192 ||
        !/^Bearer \S+$/.test(authorization) || /^Bearer (beta_|loopback-)/.test(authorization)) {
      return failure(401, 'AUTHENTICATION_REQUIRED');
    }
    let principal;
    try { principal = await deps.authenticate(authorization); }
    catch { return failure(503, 'AUTHENTICATION_UNAVAILABLE'); }
    if (!isUuid(principal?.userId) || !isUuid(principal?.sessionId) || principal.isAnonymous === true) {
      return failure(401, 'AUTHENTICATION_REQUIRED');
    }
    const userId = principal.userId;
    const sessionId = principal.sessionId;
    try {
      const proof = await deps.verifyReauthentication({ authorization, userId, sessionId });
      const age = now() - Date.parse(proof?.verifiedAt);
      if (proof?.userId !== userId || proof?.sessionId !== sessionId || !instant(proof?.verifiedAt) ||
          age < 0 || age > 300000) return failure(401, 'REAUTHENTICATION_REQUIRED');
    } catch { return failure(401, 'REAUTHENTICATION_REQUIRED'); }
    if (!(await ready())) return failure(503, 'DELETION_INTEGRATION_BLOCKED');
    return execute(() => deps.journal.claim({ userId, requestId, authorizedAt: new Date(now()).toISOString() }),
      requestId, userId);
  }

  // Only a trusted internal worker may invoke this. Delivery of a receipt after
  // Auth removal needs a separate reviewed recovery protocol; this is no web API.
  async function resumeAuthorized(requestId) {
    if (!configured()) return failure(503, 'ACCOUNT_DELETION_NOT_CONFIGURED');
    if (!isUuid(requestId)) return failure(400, 'DELETION_REQUEST_INVALID');
    if (!(await ready())) return failure(503, 'DELETION_INTEGRATION_BLOCKED');
    return execute(() => deps.journal.claimAuthorized({ requestId }), requestId);
  }

  return Object.freeze({ request, resumeAuthorized });
}

module.exports = { createAccountDeletionLifecycle, STAGES, REQUIRED_GATES };
