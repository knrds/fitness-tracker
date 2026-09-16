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

describe('Account Deletion Service Client Hardening', () => {
  let mockDeps: AccountDeletionDependencies;
  let localDataCleared: boolean;
  let signedOut: boolean;
  let rpcCalls: string[];

  beforeEach(() => {
    jest.clearAllMocks();
    localDataCleared = false;
    signedOut = false;
    rpcCalls = [];

    mockDeps = {
      isConfigured: () => true,
      isOnline: () => true,
      getAuthContext: async () => ({
        isAuthenticated: true,
        userId: 'test-user-uuid',
        isExpired: false,
      }),
      callCloudRpc: async (fnName: string) => {
        rpcCalls.push(fnName);
        return { error: null };
      },
      clearLocalData: async () => {
        localDataCleared = true;
      },
      signOut: async () => {
        signedOut = true;
      },
    };
  });

  test('Test 1: Confirmation required (rejects missing or wrong confirmation text)', async () => {
    const emptyResult = await accountDeletionService.requestAccountDeletion(
      { confirmationText: '' },
      mockDeps
    );
    expect(emptyResult.success).toBe(false);
    expect(emptyResult.code).toBe('CONFIRMATION_INVALID');
    expect(localDataCleared).toBe(false);
    expect(rpcCalls).toHaveLength(0);

    const wrongResult = await accountDeletionService.requestAccountDeletion(
      { confirmationText: 'yes please' },
      mockDeps
    );
    expect(wrongResult.success).toBe(false);
    expect(wrongResult.code).toBe('CONFIRMATION_INVALID');
    expect(localDataCleared).toBe(false);
  });

  test('Test 2: Accepts valid uppercase or lowercase confirmation keywords (DELETE or LÖSCHEN)', async () => {
    const resultEn = await accountDeletionService.requestAccountDeletion(
      { confirmationText: 'delete' },
      mockDeps
    );
    expect(resultEn.success).toBe(true);
    expect(resultEn.code).toBe('SUCCESS');
    expect(localDataCleared).toBe(true);
    expect(signedOut).toBe(true);
    expect(rpcCalls).toEqual(['delete_user_account']);

    // Reset flags
    localDataCleared = false;
    signedOut = false;
    rpcCalls = [];

    const resultDe = await accountDeletionService.requestAccountDeletion(
      { confirmationText: 'LÖSCHEN' },
      mockDeps
    );
    expect(resultDe.success).toBe(true);
    expect(resultDe.code).toBe('SUCCESS');
    expect(localDataCleared).toBe(true);
  });

  test('Test 3: Cloud failure -> local data PRESERVED (Zero-Data-Loss on partial outage)', async () => {
    mockDeps.callCloudRpc = async () => ({
      error: { message: 'Database connection timeout', code: '57014' },
    });

    const result = await accountDeletionService.requestAccountDeletion(
      { confirmationText: CONFIRMATION_KEYWORD },
      mockDeps
    );

    expect(result.success).toBe(false);
    expect(result.code).toBe('CLOUD_RPC_FAILED');
    expect(result.localCleanupExecuted).toBe(false);
    // Crucial invariant: local data must NOT be wiped if cloud failed
    expect(localDataCleared).toBe(false);
    expect(signedOut).toBe(false);
  });

  test('Test 4: Cloud success -> local cleanup executed', async () => {
    const result = await accountDeletionService.requestAccountDeletion(
      { confirmationText: CONFIRMATION_KEYWORD },
      mockDeps
    );

    expect(result.success).toBe(true);
    expect(result.code).toBe('SUCCESS');
    expect(result.localCleanupExecuted).toBe(true);
    expect(localDataCleared).toBe(true);
    expect(signedOut).toBe(true);
  });

  test('Test 5: Offline deletion -> blocked', async () => {
    mockDeps.isOnline = () => false;

    const capability = await accountDeletionService.verifyDeletionCapability(mockDeps);
    expect(capability.available).toBe(false);
    expect(capability.code).toBe('OFFLINE');

    const result = await accountDeletionService.requestAccountDeletion(
      { confirmationText: CONFIRMATION_KEYWORD },
      mockDeps
    );
    expect(result.success).toBe(false);
    expect(result.code).toBe('OFFLINE');
    expect(localDataCleared).toBe(false);
  });

  test('Test 6: Expired session -> authentication required', async () => {
    mockDeps.getAuthContext = async () => ({
      isAuthenticated: false,
      userId: 'test-user-uuid',
      isExpired: true,
    });

    const capability = await accountDeletionService.verifyDeletionCapability(mockDeps);
    expect(capability.available).toBe(false);
    expect(capability.code).toBe('NOT_AUTHENTICATED');

    const result = await accountDeletionService.requestAccountDeletion(
      { confirmationText: CONFIRMATION_KEYWORD },
      mockDeps
    );
    expect(result.success).toBe(false);
    expect(result.code).toBe('AUTH_EXPIRED');
    expect(localDataCleared).toBe(false);
  });

  test('Test 7: Double submit protected (concurrent invocation rejected)', async () => {
    let slowRpcResolve: (val: { error: null }) => void;
    const slowRpcPromise = new Promise<{ error: null }>((resolve) => {
      slowRpcResolve = resolve;
    });

    mockDeps.callCloudRpc = async () => {
      return slowRpcPromise;
    };

    // Trigger first deletion
    const firstCallPromise = accountDeletionService.requestAccountDeletion(
      { confirmationText: CONFIRMATION_KEYWORD },
      mockDeps
    );

    // Trigger concurrent second deletion while first is in flight
    const secondCall = await accountDeletionService.requestAccountDeletion(
      { confirmationText: CONFIRMATION_KEYWORD },
      mockDeps
    );

    expect(secondCall.success).toBe(false);
    expect(secondCall.code).toBe('DOUBLE_SUBMIT');

    // Resolve first call
    slowRpcResolve!({ error: null });
    const firstCall = await firstCallPromise;
    expect(firstCall.success).toBe(true);
  });

  test('Test 8: Backend unconfigured -> reports feature unavailable until production backend configured', async () => {
    mockDeps.isConfigured = () => false;

    const capability = await accountDeletionService.verifyDeletionCapability(mockDeps);
    expect(capability.available).toBe(false);
    expect(capability.code).toBe('BACKEND_NOT_CONFIGURED');
    expect(capability.reason).toBe('Feature unavailable until production backend is configured.');
  });

  test('Test 9: Malformed cloud response (null or corrupted return) preserves local data and fails safely', async () => {
    // Malformed RPC result returning null
    mockDeps.callCloudRpc = async () => null as unknown as { error: null };

    const result = await accountDeletionService.requestAccountDeletion(
      { confirmationText: CONFIRMATION_KEYWORD },
      mockDeps
    );

    expect(result.success).toBe(false);
    expect(result.code).toBe('CLOUD_RPC_FAILED');
    expect(result.localCleanupExecuted).toBe(false);
    expect(localDataCleared).toBe(false);
    expect(signedOut).toBe(false);
  });

  test('Test 10: User cancel / blank input never triggers RPC or wipes data', async () => {
    const result = await accountDeletionService.requestAccountDeletion(
      { confirmationText: 'cancel' },
      mockDeps
    );

    expect(result.success).toBe(false);
    expect(result.code).toBe('CONFIRMATION_INVALID');
    expect(rpcCalls).toHaveLength(0);
    expect(localDataCleared).toBe(false);
    expect(signedOut).toBe(false);
  });
});
