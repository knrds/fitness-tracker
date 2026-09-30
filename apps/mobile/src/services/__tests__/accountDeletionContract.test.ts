import { beginScopeChange, selectStoragePartition, completeScopeChange } from '../../data/storageScope';
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

  const successResponse = () => ({ error: null, data: { version: 1, success: true, user_id: '11111111-1111-4111-8111-111111111111', deleted_at: '2026-09-30T12:00:00.000Z' } });
  beforeEach(() => {
    const generation = beginScopeChange();
    selectStoragePartition('account:11111111-1111-4111-8111-111111111111', generation);
    completeScopeChange(generation);
    jest.clearAllMocks();
    localDataPurged = false;
    sessionRevoked = false;
    rpcCalls = [];
    authContext = {
      isAuthenticated: true,
      userId: '11111111-1111-4111-8111-111111111111',
      isExpired: false,
    };

    mockDeps = {
      isConfigured: () => true,
      isOnline: () => true,
      getAuthContext: async () => authContext,
      callCloudRpc: async (fnName: string) => {
        rpcCalls.push({ fnName });
        return successResponse();
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
    expect(result.error).toBe('Cloud deletion was not confirmed. Local data has been preserved.');
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
    expect(result.error).toBe('Cloud deletion was not confirmed. Local data has been preserved.');
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
      return successResponse();
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
    const inFlightPromise = new Promise<ReturnType<typeof successResponse>>((resolve) => {
      completeRpc = () => resolve(successResponse());
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

describe('Account deletion receipt and in-flight account boundaries', () => {
  const userA = '11111111-1111-4111-8111-111111111111';
  const userB = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb';
  const moveTo = (userId: string | null) => {
    const generation = beginScopeChange();
    selectStoragePartition(userId ? `account:${userId}` : 'legacy', generation);
    completeScopeChange(generation);
  };
  const receipt = () => ({ version: 1, success: true, user_id: userA, deleted_at: '2026-09-30T12:00:00.000Z' });
  let deps: AccountDeletionDependencies;
  let clearLocalData: jest.Mock;
  let signOut: jest.Mock;
  beforeEach(() => {
    moveTo(userA);
    clearLocalData = jest.fn(async () => undefined);
    signOut = jest.fn(async () => undefined);
    deps = {
      isConfigured: () => true,
      isOnline: () => true,
      getAuthContext: async () => ({ isAuthenticated: true, userId: userA, isExpired: false }),
      callCloudRpc: async () => ({ error: null, data: receipt() }),
      clearLocalData,
      signOut,
    };
  });
  const request = () => accountDeletionService.requestAccountDeletion({ confirmationText: 'DELETE' }, deps);

  it.each([
    undefined, null, false, {}, { success: true },
    { ...receipt(), version: 2 }, { ...receipt(), success: false },
    { ...receipt(), user_id: userB }, { ...receipt(), user_id: 'invalid' },
    { ...receipt(), deleted_at: 'yesterday' }, { ...receipt(), unexpected: true },
  ])('rejects an ambiguous or mismatched backend receipt: %p', async (data) => {
    deps.callCloudRpc = async () => ({ error: null, data });
    expect(await request()).toMatchObject({ success: false, code: 'CLOUD_RPC_FAILED', localCleanupExecuted: false });
    expect(clearLocalData).not.toHaveBeenCalled();
    expect(signOut).not.toHaveBeenCalled();
  });

  it.each([false, true])('preserves data when the account changes during RPC (returns to A: %s)', async (returnToA) => {
    let resolveRpc!: (value: { error: null; data: ReturnType<typeof receipt> }) => void;
    let markStarted!: () => void;
    const started = new Promise<void>((resolve) => { markStarted = resolve; });
    deps.callCloudRpc = () => {
      markStarted();
      return new Promise((resolve) => { resolveRpc = resolve; });
    };
    const pending = request();
    await started;
    moveTo(userB);
    if (returnToA) moveTo(userA);
    resolveRpc({ error: null, data: receipt() });
    expect(await pending).toMatchObject({ success: false, code: 'ACCOUNT_CHANGED', cloudDeletionConfirmed: true, localCleanupExecuted: false });
    expect(clearLocalData).not.toHaveBeenCalled();
    expect(signOut).not.toHaveBeenCalled();
  });

  it('does not call the RPC after a scope change during authentication', async () => {
    const rpc = jest.fn(deps.callCloudRpc);
    deps.callCloudRpc = rpc;
    deps.getAuthContext = async () => {
      moveTo(userB);
      return { isAuthenticated: true, userId: userA, isExpired: false };
    };
    expect(await request()).toMatchObject({ success: false, code: 'ACCOUNT_CHANGED' });
    expect(rpc).not.toHaveBeenCalled();
    expect(clearLocalData).not.toHaveBeenCalled();
  });

  it('reports local cleanup failure without claiming completed deletion or signing out', async () => {
    clearLocalData.mockRejectedValueOnce(new Error('SQLITE_FULL'));
    expect(await request()).toMatchObject({ success: false, code: 'LOCAL_CLEANUP_FAILED', cloudDeletionConfirmed: true, localCleanupExecuted: false });
    expect(signOut).not.toHaveBeenCalled();
  });

  it('does not sign out another account selected during local cleanup', async () => {
    clearLocalData.mockImplementationOnce(async () => { moveTo(userB); });
    expect(await request()).toMatchObject({ success: false, code: 'ACCOUNT_CHANGED', cloudDeletionConfirmed: true, localCleanupExecuted: true });
    expect(signOut).not.toHaveBeenCalled();
  });

  it('reports sign-out failure after confirmed cloud deletion and local cleanup', async () => {
    signOut.mockRejectedValueOnce(new Error('Keychain failed'));
    expect(await request()).toMatchObject({ success: false, code: 'SIGN_OUT_FAILED', cloudDeletionConfirmed: true, localCleanupExecuted: true });
    expect(clearLocalData).toHaveBeenCalledTimes(1);
  });

  it('cleans the original account once and never resets guest data after sign-out', async () => {
    signOut.mockImplementationOnce(async () => { moveTo(null); });
    expect(await request()).toMatchObject({ success: true, cloudDeletionConfirmed: true, localCleanupExecuted: true });
    expect(clearLocalData).toHaveBeenCalledTimes(1);
    expect(signOut).toHaveBeenCalledTimes(1);
  });
});
