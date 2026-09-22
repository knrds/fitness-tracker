import { create } from 'zustand';

export type PackageType = 'annual' | 'monthly';

export interface PaywallPackage {
  id: string;
  packageType: PackageType;
  /** The actual total billed price string (e.g. "49,99 € / Jahr" or "$49.99 / year") */
  priceString: string;
  rawPrice: number;
  currencyCode: string;
  billingPeriod: 'year' | 'month';
  trialDays: number;
  /** Secondary comparison note only (e.g. "Entspricht ca. 4,16 € / Monat") — NEVER sole or primary price */
  monthlyEquivalentString?: string;
}

export interface PaywallState {
  selectedPackage: PackageType;
  packages: Record<PackageType, PaywallPackage>;
  isPurchasing: boolean;
  isRestoring: boolean;
  error: string | null;
  purchaseSuccess: boolean;
  restoreSuccess: boolean;

  selectPackage: (type: PackageType) => void;
  setPackages: (packages: Partial<Record<PackageType, PaywallPackage>>) => void;
  purchaseSelected: (providerPurchaseFn?: (pkg: PaywallPackage) => Promise<boolean>) => Promise<boolean>;
  restorePurchases: (providerRestoreFn?: () => Promise<boolean>) => Promise<boolean>;
  clearStatus: () => void;
}

export const DEFAULT_PAYWALL_PACKAGES: Record<PackageType, PaywallPackage> = {
  annual: {
    id: 'studio.skar.evaro.pro.annual',
    packageType: 'annual',
    priceString: '49,99 € / Jahr',
    rawPrice: 49.99,
    currencyCode: 'EUR',
    billingPeriod: 'year',
    trialDays: 7,
    monthlyEquivalentString: 'Entspricht ca. 4,16 € / Monat (Spare 58 %)',
  },
  monthly: {
    id: 'studio.skar.evaro.pro.monthly',
    packageType: 'monthly',
    priceString: '9,99 € / Monat',
    rawPrice: 9.99,
    currencyCode: 'EUR',
    billingPeriod: 'month',
    trialDays: 0,
  },
};

export const usePaywallStore = create<PaywallState>()((set, get) => ({
  selectedPackage: 'annual',
  packages: DEFAULT_PAYWALL_PACKAGES,
  isPurchasing: false,
  isRestoring: false,
  error: null,
  purchaseSuccess: false,
  restoreSuccess: false,

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
    try {
      if (providerPurchaseFn) {
        const success = await providerPurchaseFn(pkg);
        set({ isPurchasing: false, purchaseSuccess: success });
        return success;
      }
      // Without configured native store provider, fail-closed rather than simulating fake purchase
      set({
        isPurchasing: false,
        error:
          'STORE_INTEGRATION_PENDING: Echte In-App-Käufe erfordern ein aktives Store-Konto. [USER_ACTION_REQUIRED]',
      });
      return false;
    } catch (err) {
      set({
        isPurchasing: false,
        error: err instanceof Error ? err.message : 'Kaufvorgang fehlgeschlagen.',
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
