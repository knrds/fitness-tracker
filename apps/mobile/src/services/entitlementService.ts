import {
  SubscriptionTier,
  Capabilities,
  DEFAULT_FREE_TEMPLATE_LIMIT,
  DEFAULT_PRO_FAST_WEEKLY_QUOTA,
} from '@fitness-tracker/domain';
import { logger } from '../utils/logger';

export type EntitlementStatus =
  | 'free'
  | 'pro_active'
  | 'coach_active'
  | 'trial'
  | 'expired'
  | 'offline_cached'
  | 'unknown'
  | 'backend_mismatch';

export interface EntitlementState {
  status: EntitlementStatus;
  tier: SubscriptionTier;
  isPro: boolean;
  isCoach: boolean;
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
export const EVARO_COACH_ENTITLEMENT_ID = 'evaro_coach';

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
      tier: this.betaBypass ? 'coach' : 'free',
      isPro: this.betaBypass,
      isCoach: this.betaBypass,
      activeEntitlements: this.betaBypass
        ? [EVARO_PRO_ENTITLEMENT_ID, EVARO_COACH_ENTITLEMENT_ID]
        : [],
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

  private tierChangeListeners: Array<(tier: SubscriptionTier) => void> = [];

  onTierChange(listener: (tier: SubscriptionTier) => void): () => void {
    this.tierChangeListeners.push(listener);
    return () => {
      this.tierChangeListeners = this.tierChangeListeners.filter((l) => l !== listener);
    };
  }

  private notifyTierChange(tier: SubscriptionTier) {
    for (const listener of this.tierChangeListeners) {
      try {
        listener(tier);
      } catch {
        // Safe fail-closed
      }
    }
  }

  setBetaBypass(enabled: boolean) {
    this.betaBypass = enabled;
    if (this.betaBypass) {
      this.currentState = {
        ...this.currentState,
        status: 'pro_active',
        tier: 'coach',
        isPro: true,
        isCoach: true,
        activeEntitlements: Array.from(
          new Set([
            ...this.currentState.activeEntitlements,
            EVARO_PRO_ENTITLEMENT_ID,
            EVARO_COACH_ENTITLEMENT_ID,
          ]),
        ),
      };
    } else {
      this.currentState = {
        ...this.currentState,
        status: 'free',
        tier: 'free',
        isPro: false,
        isCoach: false,
        activeEntitlements: [],
      };
    }
    this.notifyTierChange(this.currentState.tier);
  }

  /**
   * Directly sets the subscription tier for testing, preview, or deterministic QA.
   * Disables beta bypass automatically.
   */
  setMockTier(tier: SubscriptionTier) {
    this.betaBypass = false;
    this.currentState = {
      ...this.currentState,
      tier,
      isPro: tier === 'pro' || tier === 'coach',
      isCoach: tier === 'coach',
      status: tier === 'free' ? 'free' : 'pro_active',
      activeEntitlements:
        tier === 'coach'
          ? [EVARO_PRO_ENTITLEMENT_ID, EVARO_COACH_ENTITLEMENT_ID]
          : tier === 'pro'
            ? [EVARO_PRO_ENTITLEMENT_ID]
            : [],
    };
    this.notifyTierChange(this.currentState.tier);
  }

  getEntitlementState(): EntitlementState {
    return { ...this.currentState };
  }

  getTier(): SubscriptionTier {
    return this.currentState.tier;
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

  // Capability queries
  canCreateTemplate(currentCount = 0, limit = DEFAULT_FREE_TEMPLATE_LIMIT): boolean {
    if (this.betaBypass) return true;
    return Capabilities.canCreateTemplate(this.currentState.tier, currentCount, limit);
  }

  canEditTemplate(templateIndex: number, limit = DEFAULT_FREE_TEMPLATE_LIMIT): boolean {
    if (this.betaBypass) return true;
    return Capabilities.canEditTemplate(this.currentState.tier, templateIndex, limit);
  }

  canCreateProgram(): boolean {
    if (this.betaBypass) return true;
    return Capabilities.canCreateProgram(this.currentState.tier);
  }

  canUseRPE(): boolean {
    if (this.betaBypass) return true;
    return Capabilities.canUseRPE(this.currentState.tier);
  }

  canUseRIR(): boolean {
    if (this.betaBypass) return true;
    return Capabilities.canUseRIR(this.currentState.tier);
  }

  canUseAdvancedMetrics(): boolean {
    if (this.betaBypass) return true;
    return Capabilities.canUseAdvancedMetrics(this.currentState.tier);
  }

  canUseAdvancedAnalytics(): boolean {
    if (this.betaBypass) return true;
    return Capabilities.canUseAdvancedAnalytics(this.currentState.tier);
  }

  canUsePremiumAppearance(): boolean {
    if (this.betaBypass) return true;
    return Capabilities.canUsePremiumAppearance(this.currentState.tier);
  }

  canUseCoachFast(weeklyUsed = 0, quota = DEFAULT_PRO_FAST_WEEKLY_QUOTA): boolean {
    if (this.betaBypass) return true;
    return Capabilities.canUseCoachFast(this.currentState.tier, weeklyUsed, quota);
  }

  canUseCoachPlan(): boolean {
    if (this.betaBypass) return true;
    return Capabilities.canUseCoachPlan(this.currentState.tier);
  }

  canUseAIWrite(hasConfirmation = false): boolean {
    const effectiveTier = this.betaBypass ? 'coach' : this.currentState.tier;
    return Capabilities.canUseAIWrite(effectiveTier, hasConfirmation);
  }

  /**
   * Refreshes entitlements from the provider or cached state.
   */
  async refreshEntitlements(userId: string | null = this.currentState.userId): Promise<EntitlementState> {
    if (this.betaBypass) {
      this.currentState = {
        status: 'pro_active',
        tier: 'coach',
        isPro: true,
        isCoach: true,
        activeEntitlements: [EVARO_PRO_ENTITLEMENT_ID, EVARO_COACH_ENTITLEMENT_ID],
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
        tier: 'free',
        isPro: false,
        isCoach: false,
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
      const isCoach = data.activeEntitlements.includes(EVARO_COACH_ENTITLEMENT_ID);
      const isPro = isCoach || data.activeEntitlements.includes(EVARO_PRO_ENTITLEMENT_ID);
      const tier: SubscriptionTier = isCoach ? 'coach' : isPro ? 'pro' : 'free';

      let status: EntitlementStatus = 'free';
      if (isCoach) {
        status = data.isInTrial ? 'trial' : 'coach_active';
      } else if (isPro) {
        status = data.isInTrial ? 'trial' : 'pro_active';
      } else if (data.expirationDate && new Date(data.expirationDate).getTime() < Date.now()) {
        status = 'expired';
      }

      this.currentState = {
        status,
        tier,
        isPro,
        isCoach,
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
        tier: 'free',
        isPro: false,
        isCoach: false,
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
    const isCoach = res.activeEntitlements.includes(EVARO_COACH_ENTITLEMENT_ID);
    const isPro = isCoach || res.activeEntitlements.includes(EVARO_PRO_ENTITLEMENT_ID);
    const tier: SubscriptionTier = isCoach ? 'coach' : isPro ? 'pro' : 'free';

    this.currentState = {
      ...this.currentState,
      status: isCoach ? 'coach_active' : isPro ? 'pro_active' : 'free',
      tier,
      isPro,
      isCoach,
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
      tier: this.betaBypass ? 'coach' : 'free',
      isPro: this.betaBypass,
      isCoach: this.betaBypass,
      activeEntitlements: this.betaBypass
        ? [EVARO_PRO_ENTITLEMENT_ID, EVARO_COACH_ENTITLEMENT_ID]
        : [],
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
