const { privatePostgresFromEnv } = require('./private-postgres.cjs');

function createPostgresQuotaStore(executor) {
  return {
    reserve: (p) => executor.call('reserve', [p.p_principal, p.p_request_key, p.p_request_hash,
      p.p_lease_id, p.p_modality, p.p_policy_id, p.p_reserved_units, p.p_lease_seconds]),
    beginAttempt: (p) => executor.call('beginAttempt', [p.p_reservation_id, p.p_lease_id, p.p_attempt]),
    finalize: (p) => executor.call('finalize', [p.p_reservation_id, p.p_lease_id, p.p_outcome]),
  };
}

function createPostgresQuotaStoreFromEnv(env) {
  return createPostgresQuotaStore(privatePostgresFromEnv('quota', env));
}

module.exports = { createPostgresQuotaStore, createPostgresQuotaStoreFromEnv };
