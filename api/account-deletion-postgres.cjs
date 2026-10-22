const { privatePostgresFromEnv } = require('./private-postgres.cjs');

// Supplies only the journal. Auth, reauth, write fences, inventory, deletion
// stages, independent verification and readiness still require real adapters.
function createPostgresDeletionJournal(executor) {
  return {
    claim: (p) => executor.call('claim', [p.userId, p.requestId, p.authorizedAt]),
    claimAuthorized: (p) => executor.call('claimAuthorized', [p.requestId]),
    markStage: (p) => executor.call('markStage', [p.userId, p.requestId, p.leaseId, p.stage]),
    complete: (p) => executor.call('complete', [p.userId, p.requestId, p.leaseId, p.deletedAt]),
    release: (p) => executor.call('release', [p.userId, p.requestId, p.leaseId]),
  };
}

function createPostgresDeletionJournalFromEnv(env = process.env) {
  return createPostgresDeletionJournal(privatePostgresFromEnv('deletion', env));
}

module.exports = { createPostgresDeletionJournal, createPostgresDeletionJournalFromEnv };
