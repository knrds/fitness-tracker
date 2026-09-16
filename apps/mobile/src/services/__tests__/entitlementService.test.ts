import {
  EntitlementService,
  EntitlementProvider,
  EVARO_PRO_ENTITLEMENT_ID,
  BETA_ALL_FEATURES_ENABLED,
} from '../entitlementService';

describe('Entitlement Service Provider Abstraction & Beta Fallback', () => {
  let mockProvider: jest.Mocked<EntitlementProvider>;

  beforeEach(() => {
    mockProvider = {
      fetchCustomerEntitlements: jest.fn(),
      restoreCustomerPurchases: jest.fn(),
    };
  });

  test('Test 1: Beta default behavior enables all features (BETA_ALL_FEATURES_ENABLED = true)', () => {
    const service = new EntitlementService({ betaBypass: true });

    expect(BETA_ALL_FEATURES_ENABLED).toBe(true);
    expect(service.hasEntitlement(EVARO_PRO_ENTITLEMENT_ID)).toBe(true);
    expect(service.hasEntitlement('arbitrary_future_feature')).toBe(true);
    expect(service.getEntitlementState().isPro).toBe(true);
    expect(service.getEntitlementState().status).toBe('pro_active');
  });

  test('Test 2: Free tier user (evaluates to free when beta bypass is disabled)', async () => {
    const service = new EntitlementService({ betaBypass: false, provider: mockProvider });
    mockProvider.fetchCustomerEntitlements.mockResolvedValueOnce({
      activeEntitlements: [],
      expirationDate: null,
      isInTrial: false,
      isInGracePeriod: false,
    });

    const state = await service.refreshEntitlements('user-free');
    expect(state.status).toBe('free');
    expect(state.isPro).toBe(false);
    expect(service.hasEntitlement(EVARO_PRO_ENTITLEMENT_ID)).toBe(false);
  });

  test('Test 3: Pro Active tier user with valid subscription', async () => {
    const service = new EntitlementService({ betaBypass: false, provider: mockProvider });
    mockProvider.fetchCustomerEntitlements.mockResolvedValueOnce({
      activeEntitlements: [EVARO_PRO_ENTITLEMENT_ID],
      expirationDate: new Date(Date.now() + 30 * 86400000).toISOString(),
      isInTrial: false,
      isInGracePeriod: false,
    });

    const state = await service.refreshEntitlements('user-pro');
    expect(state.status).toBe('pro_active');
    expect(state.isPro).toBe(true);
    expect(service.hasEntitlement(EVARO_PRO_ENTITLEMENT_ID)).toBe(true);
  });

  test('Test 4: Trial tier user with active free trial', async () => {
    const service = new EntitlementService({ betaBypass: false, provider: mockProvider });
    mockProvider.fetchCustomerEntitlements.mockResolvedValueOnce({
      activeEntitlements: [EVARO_PRO_ENTITLEMENT_ID],
      expirationDate: new Date(Date.now() + 7 * 86400000).toISOString(),
      isInTrial: true,
      isInGracePeriod: false,
    });

    const state = await service.refreshEntitlements('user-trial');
    expect(state.status).toBe('trial');
    expect(state.isPro).toBe(true);
    expect(state.isInTrial).toBe(true);
    expect(service.hasEntitlement(EVARO_PRO_ENTITLEMENT_ID)).toBe(true);
  });

  test('Test 5: Expired subscription marks user as expired', async () => {
    const service = new EntitlementService({ betaBypass: false, provider: mockProvider });
    mockProvider.fetchCustomerEntitlements.mockResolvedValueOnce({
      activeEntitlements: [],
      expirationDate: new Date(Date.now() - 86400000).toISOString(),
      isInTrial: false,
      isInGracePeriod: false,
    });

    const state = await service.refreshEntitlements('user-expired');
    expect(state.status).toBe('expired');
    expect(state.isPro).toBe(false);
    expect(service.hasEntitlement(EVARO_PRO_ENTITLEMENT_ID)).toBe(false);
  });

  test('Test 6: Offline cached entitlements serve status during network outage', async () => {
    const service = new EntitlementService({ betaBypass: false, provider: mockProvider });

    // 1. Initial online fetch primes cache
    mockProvider.fetchCustomerEntitlements.mockResolvedValueOnce({
      activeEntitlements: [EVARO_PRO_ENTITLEMENT_ID],
      expirationDate: new Date(Date.now() + 15 * 86400000).toISOString(),
      isInTrial: false,
      isInGracePeriod: false,
    });
    await service.refreshEntitlements('user-offline-test');

    // 2. Network error occurs on refresh
    mockProvider.fetchCustomerEntitlements.mockRejectedValueOnce(new Error('Network offline'));
    const cachedState = await service.refreshEntitlements('user-offline-test');

    expect(cachedState.status).toBe('offline_cached');
    expect(cachedState.isPro).toBe(true);
    expect(service.hasEntitlement(EVARO_PRO_ENTITLEMENT_ID)).toBe(true);
  });

  test('Test 7: Restore purchases updates entitlement state from store', async () => {
    const service = new EntitlementService({ betaBypass: false, provider: mockProvider });
    mockProvider.restoreCustomerPurchases.mockResolvedValueOnce({
      activeEntitlements: [EVARO_PRO_ENTITLEMENT_ID],
      expirationDate: new Date(Date.now() + 20 * 86400000).toISOString(),
    });

    const restoredState = await service.restorePurchases();
    expect(restoredState.status).toBe('pro_active');
    expect(restoredState.isPro).toBe(true);
    expect(service.hasEntitlement(EVARO_PRO_ENTITLEMENT_ID)).toBe(true);
  });

  test('Test 8: Account switch isolates user state', async () => {
    const service = new EntitlementService({ betaBypass: false, provider: mockProvider });

    // User A is Pro
    mockProvider.fetchCustomerEntitlements.mockResolvedValueOnce({
      activeEntitlements: [EVARO_PRO_ENTITLEMENT_ID],
      expirationDate: null,
      isInTrial: false,
      isInGracePeriod: false,
    });
    await service.refreshEntitlements('user-a');
    expect(service.getEntitlementState().isPro).toBe(true);

    // Switch to User B (Free)
    mockProvider.fetchCustomerEntitlements.mockResolvedValueOnce({
      activeEntitlements: [],
      expirationDate: null,
      isInTrial: false,
      isInGracePeriod: false,
    });
    await service.switchAccount('user-b');
    expect(service.getEntitlementState().isPro).toBe(false);
    expect(service.getEntitlementState().userId).toBe('user-b');
  });

  test('Test 9: Unknown status when no provider and no cache available', async () => {
    const service = new EntitlementService({ betaBypass: false });
    const state = await service.refreshEntitlements('unknown-user');

    expect(state.status).toBe('unknown');
    expect(state.isPro).toBe(false);
  });

  test('Test 10: Backend mismatch detection flags disagreement between client and server', async () => {
    const service = new EntitlementService({ betaBypass: false, provider: mockProvider });
    mockProvider.fetchCustomerEntitlements.mockResolvedValueOnce({
      activeEntitlements: [],
      expirationDate: null,
      isInTrial: false,
      isInGracePeriod: false,
    });
    await service.refreshEntitlements('user-mismatch');
    expect(service.getEntitlementState().isPro).toBe(false);

    // Backend claims user is Pro (e.g. via stale JWT), but store receipt has no active entitlement
    service.verifyAgainstBackendClaim(true);
    expect(service.getEntitlementState().status).toBe('backend_mismatch');
  });
});
