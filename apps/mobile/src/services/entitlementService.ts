import { logger } from '../utils/logger';

export type EntitlementStatus =
  | 'free'
  | 'pro_active'
  | 'trial'
  | 'expired'
  | 'offline_cached'
  | 'unknown'
  | 'backend_mismatch';

export interface EntitlementState {
  status: EntitlementStatus;
  isPro: boolean;
  activeEntitlements: string[];
  expirationDate: string | null;
  isInGracePeriod: boolean;
  isInTrial: boolean;
  userId: string | null;
  lastVerifiedAt: string;
}

export interface EntitlementProvider {
  fetchCustomerEntitlements(userId: string | null): Promise<{
    activeEntitlements: string[];
    expirationDate: string | null;
    isInTrial: boolean;
    isInGracePeriod: boolean;
  }>;
  restoreCustomerPurchases(): Promise<{
    activeEntitlements: string[];
    expirationDate: string | null;
  }>;
}

export const EVARO_PRO_ENTITLEMENT_ID = 'evaro_pro';

/**
 * BETA MODE SWITCH:
 * In beta builds, all users retain access to all features so no active testers lose functionality.
 * Astra can switch this flag or connect the RevenueCat provider when the commercial launch is scheduled.
 */
export const BETA_ALL_FEATURES_ENABLED = true;

export interface EntitlementServiceConfig {
  betaBypass?: boolean;
  provider?: EntitlementProvider;
  cache?: {
    get: (key: string) => string | null;
    set: (key: string, value: string) => void;
    delete: (key: string) => void;
  };
}

const CACHE_KEY_PREFIX = 'evaro_entitlement_cache_';

export class EntitlementService {
  private betaBypass: boolean;
  private provider: EntitlementProvider | null = null;
  private memoryCache = new Map<string, string>();
  private currentState: EntitlementState;

  constructor(config?: EntitlementServiceConfig) {
    this.betaBypass = config?.betaBypass ?? BETA_ALL_FEATURES_ENABLED;
    this.provider = config?.provider ?? null;

    this.currentState = {
      status: this.betaBypass ? 'pro_active' : 'free',
      isPro: this.betaBypass,
      activeEntitlements: this.betaBypass ? [EVARO_PRO_ENTITLEMENT_ID] : [],
      expirationDate: null,
      isInGracePeriod: false,
      isInTrial: false,
      userId: null,
      lastVerifiedAt: new Date().toISOString(),
    };
  }

  setProvider(provider: EntitlementProvider) {
    this.provider = provider;
  }

  setBetaBypass(enabled: boolean) {
    this.betaBypass = enabled;
    if (this.betaBypass) {
      this.currentState = {
        ...this.currentState,
        status: 'pro_active',
        isPro: true,
        activeEntitlements: Array.from(new Set([...this.currentState.activeEntitlements, EVARO_PRO_ENTITLEMENT_ID])),
      };
    }
  }

  getEntitlementState(): EntitlementState {
    return { ...this.currentState };
  }

  /**
   * Checks if an entitlement is currently active.
   * During beta, always returns true if betaBypass is active.
   */
  hasEntitlement(entitlementId: string): boolean {
    if (this.betaBypass) {
      return true;
    }
    return this.currentState.activeEntitlements.includes(entitlementId);
  }

  /**
   * Refreshes entitlements from the provider or cached state.
   */
  async refreshEntitlements(userId: string | null = this.currentState.userId): Promise<EntitlementState> {
    if (this.betaBypass) {
      this.currentState = {
        status: 'pro_active',
        isPro: true,
        activeEntitlements: [EVARO_PRO_ENTITLEMENT_ID],
        expirationDate: null,
        isInGracePeriod: false,
        isInTrial: false,
        userId,
        lastVerifiedAt: new Date().toISOString(),
      };
      return this.getEntitlementState();
    }

    if (!this.provider) {
      // No provider configured and not in beta bypass -> unknown / free
      this.currentState = {
        status: 'unknown',
        isPro: false,
        activeEntitlements: [],
        expirationDate: null,
        isInGracePeriod: false,
        isInTrial: false,
        userId,
        lastVerifiedAt: new Date().toISOString(),
      };
      return this.getEntitlementState();
    }

    try {
      const data = await this.provider.fetchCustomerEntitlements(userId);
      const isPro = data.activeEntitlements.includes(EVARO_PRO_ENTITLEMENT_ID);

      let status: EntitlementStatus = 'free';
      if (isPro) {
        if (data.isInTrial) {
          status = 'trial';
        } else {
          status = 'pro_active';
        }
      } else if (data.expirationDate && new Date(data.expirationDate).getTime() < Date.now()) {
        status = 'expired';
      }

      this.currentState = {
        status,
        isPro,
        activeEntitlements: data.activeEntitlements,
        expirationDate: data.expirationDate,
        isInGracePeriod: data.isInGracePeriod,
        isInTrial: data.isInTrial,
        userId,
        lastVerifiedAt: new Date().toISOString(),
      };

      // Update offline cache
      if (userId) {
        this.memoryCache.set(CACHE_KEY_PREFIX + userId, JSON.stringify(this.currentState));
      }

      return this.getEntitlementState();
    } catch (networkError) {
      logger.warn('[EntitlementService] Network error fetching entitlements. Checking cache.', networkError);

      // Check offline cache
      if (userId && this.memoryCache.has(CACHE_KEY_PREFIX + userId)) {
        try {
          const cached: EntitlementState = JSON.parse(this.memoryCache.get(CACHE_KEY_PREFIX + userId)!);
          this.currentState = {
            ...cached,
            status: 'offline_cached',
            lastVerifiedAt: new Date().toISOString(),
          };
          return this.getEntitlementState();
        } catch {
          // invalid cache
        }
      }

      // No cache available
      this.currentState = {
        status: 'unknown',
        isPro: false,
        activeEntitlements: [],
        expirationDate: null,
        isInGracePeriod: false,
        isInTrial: false,
        userId,
        lastVerifiedAt: new Date().toISOString(),
      };
      return this.getEntitlementState();
    }
  }

  /**
   * Restores user purchases (e.g. from App Store / Google Play).
   */
  async restorePurchases(): Promise<EntitlementState> {
    if (this.betaBypass) {
      return this.getEntitlementState();
    }
    if (!this.provider) {
      throw new Error('No entitlement provider configured for restore');
    }

    const res = await this.provider.restoreCustomerPurchases();
    const isPro = res.activeEntitlements.includes(EVARO_PRO_ENTITLEMENT_ID);

    this.currentState = {
      ...this.currentState,
      status: isPro ? 'pro_active' : 'free',
      isPro,
      activeEntitlements: res.activeEntitlements,
      expirationDate: res.expirationDate,
      lastVerifiedAt: new Date().toISOString(),
    };

    return this.getEntitlementState();
  }

  /**
   * Resets and re-binds identity on user switch or logout.
   */
  async switchAccount(newUserId: string | null): Promise<void> {
    this.currentState = {
      status: this.betaBypass ? 'pro_active' : 'free',
      isPro: this.betaBypass,
      activeEntitlements: this.betaBypass ? [EVARO_PRO_ENTITLEMENT_ID] : [],
      expirationDate: null,
      isInGracePeriod: false,
      isInTrial: false,
      userId: newUserId,
      lastVerifiedAt: new Date().toISOString(),
    };

    if (!this.betaBypass && newUserId) {
      await this.refreshEntitlements(newUserId);
    }
  }

  /**
   * Validates backend claims vs client provider state.
   */
  verifyAgainstBackendClaim(backendIsProClaim: boolean): void {
    if (this.betaBypass) return;
    if (this.currentState.isPro !== backendIsProClaim) {
      logger.warn('[EntitlementService] Mismatch between client and backend pro claim', {
        clientIsPro: this.currentState.isPro,
        backendIsProClaim,
      });
      this.currentState.status = 'backend_mismatch';
    }
  }
}

export const entitlementService = new EntitlementService();
