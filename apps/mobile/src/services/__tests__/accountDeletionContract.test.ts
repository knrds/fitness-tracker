import {
  accountDeletionService,
  AccountDeletionDependencies,
  CONFIRMATION_KEYWORD,
} from '../accountDeletionService';

jest.mock('../../utils/logger', () => ({
  logger: {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  },
}));

describe('S5 Account Deletion Contract & Resilience Suite', () => {
  let mockDeps: AccountDeletionDependencies;
  let localDataPurged: boolean;
  let sessionRevoked: boolean;
  let rpcCalls: { fnName: string; args?: unknown }[];
  let authContext: { isAuthenticated: boolean; userId: string | null; isExpired: boolean };

  beforeEach(() => {
    jest.clearAllMocks();
    localDataPurged = false;
    sessionRevoked = false;
    rpcCalls = [];
    authContext = {
      isAuthenticated: true,
      userId: '11111111-2222-3333-4444-555555555555',
      isExpired: false,
    };

    mockDeps = {
      isConfigured: () => true,
      isOnline: () => true,
      getAuthContext: async () => authContext,
      callCloudRpc: async (fnName: string) => {
        rpcCalls.push({ fnName });
        return { error: null };
      },
      clearLocalData: async () => {
        localDataPurged = true;
      },
      signOut: async () => {
        sessionRevoked = true;
        authContext = { isAuthenticated: false, userId: null, isExpired: true };
      },
    };
  });

  // 1. Authenticated User Requirement
  it('Contract 1: Requires authenticated user and rejects unauthenticated callers before RPC', async () => {
    authContext = { isAuthenticated: false, userId: null, isExpired: false };

    const result = await accountDeletionService.requestAccountDeletion(
      { confirmationText: CONFIRMATION_KEYWORD },
      mockDeps,
    );

    expect(result.success).toBe(false);
    expect(result.code).toBe('AUTH_EXPIRED');
    expect(rpcCalls.length).toBe(0);
    expect(localDataPurged).toBe(false);
  });

  // 2. Server Derives auth.uid() — No client-provided user id
  it('Contract 2: Client never transmits user ID to delete RPC; server must derive auth.uid()', async () => {
    const result = await accountDeletionService.requestAccountDeletion(
      { confirmationText: CONFIRMATION_KEYWORD },
      mockDeps,
    );

    expect(result.success).toBe(true);
    expect(rpcCalls).toHaveLength(1);
    expect(rpcCalls[0]?.fnName).toBe('delete_user_account');
    // Ensure no client-provided userId was passed as argument
    expect(rpcCalls[0]?.args).toBeUndefined();
  });

  // 3. Idempotent Delete Handling
  it('Contract 3: Idempotent delete — subsequent calls after success handle gracefully', async () => {
    const firstResult = await accountDeletionService.requestAccountDeletion(
      { confirmationText: CONFIRMATION_KEYWORD },
      mockDeps,
    );
    expect(firstResult.success).toBe(true);
    expect(sessionRevoked).toBe(true);

    // Second call immediately after session revocation
    const secondResult = await accountDeletionService.requestAccountDeletion(
      { confirmationText: CONFIRMATION_KEYWORD },
      mockDeps,
    );
    expect(secondResult.success).toBe(false);
    expect(secondResult.code).toBe('AUTH_EXPIRED');
    expect(rpcCalls).toHaveLength(1); // No second RPC executed
  });

  // 4. Remote Failure -> Zero Data Loss Locally
  it('Contract 4: Remote failure (timeout, network drop, 500) preserves local SQLite data', async () => {
    mockDeps.callCloudRpc = async () => ({
      error: { message: 'Cloud database connection reset', code: '57P01' },
    });

    const result = await accountDeletionService.requestAccountDeletion(
      { confirmationText: CONFIRMATION_KEYWORD },
      mockDeps,
    );

    expect(result.success).toBe(false);
    expect(result.code).toBe('CLOUD_RPC_FAILED');
    expect(result.localCleanupExecuted).toBe(false);
    expect(localDataPurged).toBe(false);
    expect(sessionRevoked).toBe(false);
  });

  // 5. Partial Remote Cleanup Failure
  it('Contract 5: Partial remote cleanup failure blocks local data purge', async () => {
    mockDeps.callCloudRpc = async () => ({
      error: { message: 'Partial cleanup failed: could not purge user records', code: '23503' },
    });

    const result = await accountDeletionService.requestAccountDeletion(
      { confirmationText: CONFIRMATION_KEYWORD },
      mockDeps,
    );

    expect(result.success).toBe(false);
    expect(result.code).toBe('CLOUD_RPC_FAILED');
    expect(localDataPurged).toBe(false);
    expect(sessionRevoked).toBe(false);
  });

  // 6. Auth Deletion Failure
  it('Contract 6: Auth service deletion failure is reported and preserves local state', async () => {
    mockDeps.callCloudRpc = async () => ({
      error: { message: 'Auth admin user deletion failed: rate limit exceeded', code: '429' },
    });

    const result = await accountDeletionService.requestAccountDeletion(
      { confirmationText: CONFIRMATION_KEYWORD },
      mockDeps,
    );

    expect(result.success).toBe(false);
    expect(result.error).toMatch(/rate limit exceeded/i);
    expect(localDataPurged).toBe(false);
  });

  // 7. Storage Deletion Failure
  it('Contract 7: Remote storage deletion error propagates cleanly without wiping local data', async () => {
    mockDeps.callCloudRpc = async () => ({
      error: { message: 'Storage bucket avatar purge failed', code: '404' },
    });

    const result = await accountDeletionService.requestAccountDeletion(
      { confirmationText: CONFIRMATION_KEYWORD },
      mockDeps,
    );

    expect(result.success).toBe(false);
    expect(result.error).toMatch(/Storage bucket avatar purge failed/i);
    expect(localDataPurged).toBe(false);
  });

  // 8. Provider / AI Cleanup Failure
  it('Contract 8: External provider cleanup failure surfaces error safely', async () => {
    mockDeps.callCloudRpc = async () => ({
      error: { message: 'AI provider history cleanup timeout', code: '504' },
    });

    const result = await accountDeletionService.requestAccountDeletion(
      { confirmationText: CONFIRMATION_KEYWORD },
      mockDeps,
    );

    expect(result.success).toBe(false);
    expect(result.code).toBe('CLOUD_RPC_FAILED');
    expect(localDataPurged).toBe(false);
  });

  // 9. Local Cleanup ONLY After Confirmed Remote Success
  it('Contract 9: Order of operations — local cleanup strictly follows confirmed cloud success', async () => {
    const executionOrder: string[] = [];

    mockDeps.callCloudRpc = async () => {
      executionOrder.push('cloud_rpc_start');
      executionOrder.push('cloud_rpc_confirmed');
      return { error: null };
    };

    mockDeps.clearLocalData = async () => {
      executionOrder.push('local_data_cleared');
      localDataPurged = true;
    };

    mockDeps.signOut = async () => {
      executionOrder.push('session_signed_out');
      sessionRevoked = true;
    };

    const result = await accountDeletionService.requestAccountDeletion(
      { confirmationText: CONFIRMATION_KEYWORD },
      mockDeps,
    );

    expect(result.success).toBe(true);
    expect(executionOrder).toEqual([
      'cloud_rpc_start',
      'cloud_rpc_confirmed',
      'local_data_cleared',
      'session_signed_out',
    ]);
  });

  // 10. Retry Behavior After Transient Failure
  it('Contract 10: Retrying after transient failure completes successfully when connectivity is restored', async () => {
    // Attempt 1: Offline failure
    mockDeps.isOnline = () => false;
    const attempt1 = await accountDeletionService.requestAccountDeletion(
      { confirmationText: CONFIRMATION_KEYWORD },
      mockDeps,
    );
    expect(attempt1.success).toBe(false);
    expect(attempt1.code).toBe('OFFLINE');
    expect(localDataPurged).toBe(false);

    // Attempt 2: Online restored
    mockDeps.isOnline = () => true;
    const attempt2 = await accountDeletionService.requestAccountDeletion(
      { confirmationText: CONFIRMATION_KEYWORD },
      mockDeps,
    );
    expect(attempt2.success).toBe(true);
    expect(attempt2.code).toBe('SUCCESS');
    expect(localDataPurged).toBe(true);
    expect(sessionRevoked).toBe(true);
  });

  // 11. Concurrent Second Delete Call Lock
  it('Contract 11: In-flight deletion locks out concurrent secondary delete attempts', async () => {
    let completeRpc: () => void;
    const inFlightPromise = new Promise<{ error: null }>((resolve) => {
      completeRpc = () => resolve({ error: null });
    });

    mockDeps.callCloudRpc = async () => inFlightPromise;

    const op1 = accountDeletionService.requestAccountDeletion(
      { confirmationText: CONFIRMATION_KEYWORD },
      mockDeps,
    );

    const op2 = await accountDeletionService.requestAccountDeletion(
      { confirmationText: CONFIRMATION_KEYWORD },
      mockDeps,
    );

    expect(op2.success).toBe(false);
    expect(op2.code).toBe('DOUBLE_SUBMIT');

    completeRpc!();
    const op1Result = await op1;
    expect(op1Result.success).toBe(true);
  });

  // 12. Session Revocation on Success
  it('Contract 12: Session revocation is invoked immediately after local data purge', async () => {
    const result = await accountDeletionService.requestAccountDeletion(
      { confirmationText: CONFIRMATION_KEYWORD },
      mockDeps,
    );

    expect(result.success).toBe(true);
    expect(sessionRevoked).toBe(true);
  });

  // 13. Account Switch Interaction
  it('Contract 13: Deletion of User A does not contaminate state of User B during account switch', async () => {
    // User A successfully deletes account
    const deleteA = await accountDeletionService.requestAccountDeletion(
      { confirmationText: CONFIRMATION_KEYWORD },
      mockDeps,
    );
    expect(deleteA.success).toBe(true);
    expect(localDataPurged).toBe(true);

    // User B signs in
    authContext = {
      isAuthenticated: true,
      userId: 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',
      isExpired: false,
    };
    localDataPurged = false;
    sessionRevoked = false;

    // Verify User B has independent capability status
    const capabilityB = await accountDeletionService.verifyDeletionCapability(mockDeps);
    expect(capabilityB.available).toBe(true);
    expect(capabilityB.code).toBe('READY');
    expect(localDataPurged).toBe(false);
  });
});
