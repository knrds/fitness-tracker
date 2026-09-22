import { create } from 'zustand';
import { monetizationAnalytics } from '../services/monetizationAnalytics';

export type PackageType = 'annual' | 'monthly';
export type PaywallContext = 'pro' | 'coach';

export type PaywallSource =
  | 'template_limit'
  | 'program'
  | 'rir'
  | 'rpe'
  | 'metric'
  | 'analytics'
  | 'appearance'
  | 'coach_plan'
  | 'coach_write'
  | 'coach_preview_limit'
  | 'onboarding'
  | 'general';

export interface PaywallPackage {
  id: string;
  packageType: PackageType;
  /** The actual total billed price string (e.g. "29,99 € / Jahr" or "$29.99 / year") */
  priceString: string;
  rawPrice: number;
  currencyCode: string;
  billingPeriod: 'year' | 'month';
  trialDays: number;
  /** Secondary comparison note only (e.g. "Entspricht ca. 2,50 € / Monat") — NEVER sole or primary price */
  monthlyEquivalentString?: string;
}

export interface PaywallState {
  context: PaywallContext;
  source: PaywallSource | null;
  selectedPackage: PackageType;
  packages: Record<PackageType, PaywallPackage>;
  isPurchasing: boolean;
  isRestoring: boolean;
  error: string | null;
  purchaseSuccess: boolean;
  restoreSuccess: boolean;

  setContext: (context: PaywallContext, source?: PaywallSource) => void;
  openPaywall: (context: PaywallContext, source?: PaywallSource) => void;
  selectPackage: (type: PackageType) => void;
  setPackages: (packages: Partial<Record<PackageType, PaywallPackage>>) => void;
  purchaseSelected: (providerPurchaseFn?: (pkg: PaywallPackage) => Promise<boolean>) => Promise<boolean>;
  restorePurchases: (providerRestoreFn?: () => Promise<boolean>) => Promise<boolean>;
  clearStatus: () => void;
}

/**
 * LAUNCH PRICING DEFAULTS (PRO):
 * strictly for local development, previews, mocks, and fallback designs.
 * Production source of truth MUST come from App Store / Google Play / RevenueCat.
 */
export const PRO_PAYWALL_PACKAGES: Record<PackageType, PaywallPackage> = {
  annual: {
    id: 'studio.skar.evaro.pro.annual',
    packageType: 'annual',
    priceString: '29,99 € / Jahr',
    rawPrice: 29.99,
    currencyCode: 'EUR',
    billingPeriod: 'year',
    trialDays: 0,
    monthlyEquivalentString: 'Entspricht ca. 2,50 € / Monat (Spare 50 %)',
  },
  monthly: {
    id: 'studio.skar.evaro.pro.monthly',
    packageType: 'monthly',
    priceString: '4,99 € / Monat',
    rawPrice: 4.99,
    currencyCode: 'EUR',
    billingPeriod: 'month',
    trialDays: 0,
  },
};

/**
 * LAUNCH PRICING DEFAULTS (COACH):
 * Coach Annual includes 14-day free trial.
 */
export const COACH_PAYWALL_PACKAGES: Record<PackageType, PaywallPackage> = {
  annual: {
    id: 'studio.skar.evaro.coach.annual',
    packageType: 'annual',
    priceString: '69,99 € / Jahr',
    rawPrice: 69.99,
    currencyCode: 'EUR',
    billingPeriod: 'year',
    trialDays: 14,
    monthlyEquivalentString: 'Entspricht ca. 5,83 € / Monat (Spare 51 %)',
  },
  monthly: {
    id: 'studio.skar.evaro.coach.monthly',
    packageType: 'monthly',
    priceString: '11,99 € / Monat',
    rawPrice: 11.99,
    currencyCode: 'EUR',
    billingPeriod: 'month',
    trialDays: 0,
  },
};

export const DEFAULT_PAYWALL_PACKAGES = PRO_PAYWALL_PACKAGES;

export const usePaywallStore = create<PaywallState>()((set, get) => ({
  context: 'pro',
  source: null,
  selectedPackage: 'annual',
  packages: PRO_PAYWALL_PACKAGES,
  isPurchasing: false,
  isRestoring: false,
  error: null,
  purchaseSuccess: false,
  restoreSuccess: false,

  setContext: (context: PaywallContext, source?: PaywallSource) => {
    const pkgs = context === 'coach' ? COACH_PAYWALL_PACKAGES : PRO_PAYWALL_PACKAGES;
    set({
      context,
      source: source ?? null,
      packages: pkgs,
      selectedPackage: 'annual', // Annual visually preferred
      error: null,
    });

    const eventName = context === 'coach' ? 'coach_paywall_viewed' : 'pro_paywall_viewed';
    monetizationAnalytics.track(eventName, {
      tier: context,
      paywall_source: source,
      billing_period: 'year',
      trial: context === 'coach',
    });
  },

  openPaywall: (context, source) => get().setContext(context, source),

  selectPackage: (type: PackageType) => set({ selectedPackage: type, error: null }),

  setPackages: (updated) =>
    set((state) => ({
      packages: {
        ...state.packages,
        ...updated,
      },
    })),

  purchaseSelected: async (providerPurchaseFn) => {
    const pkg = get().packages[get().selectedPackage];
    set({ isPurchasing: true, error: null, purchaseSuccess: false });

    monetizationAnalytics.track('subscription_checkout_started', {
      tier: get().context,
      paywall_source: get().source ?? undefined,
      product_selected: pkg.id,
      billing_period: pkg.billingPeriod,
      trial: pkg.trialDays > 0,
    });

    try {
      if (providerPurchaseFn) {
        const success = await providerPurchaseFn(pkg);
        set({ isPurchasing: false, purchaseSuccess: success });
        if (success) {
          monetizationAnalytics.track('subscription_started', {
            tier: get().context,
            product_selected: pkg.id,
            billing_period: pkg.billingPeriod,
            trial: pkg.trialDays > 0,
          });
        }
        return success;
      }
      // Without configured native store provider, fail-closed rather than simulating fake purchase
      set({
        isPurchasing: false,
        error:
          'STORE_INTEGRATION_PENDING: Echte In-App-Käufe erfordern ein aktives Store-Konto. [USER_ACTION_REQUIRED]',
      });
      monetizationAnalytics.track('subscription_failed', {
        tier: get().context,
        product_selected: pkg.id,
      });
      return false;
    } catch (err) {
      set({
        isPurchasing: false,
        error: err instanceof Error ? err.message : 'Kaufvorgang fehlgeschlagen.',
      });
      monetizationAnalytics.track('subscription_failed', {
        tier: get().context,
        product_selected: pkg.id,
      });
      return false;
    }
  },

  restorePurchases: async (providerRestoreFn) => {
    set({ isRestoring: true, error: null, restoreSuccess: false });
    try {
      if (providerRestoreFn) {
        const success = await providerRestoreFn();
        set({ isRestoring: false, restoreSuccess: success });
        return success;
      }
      // Without configured native store provider, inform user cleanly
      set({
        isRestoring: false,
        error:
          'RESTORE_PENDING: Keine aktiven Store-Käufe im lokalen Testmodus gefunden.',
      });
      return false;
    } catch (err) {
      set({
        isRestoring: false,
        error: err instanceof Error ? err.message : 'Wiederherstellung fehlgeschlagen.',
      });
      return false;
    }
  },

  clearStatus: () =>
    set({
      error: null,
      purchaseSuccess: false,
      restoreSuccess: false,
    }),
}));
