import {
  usePaywallStore,
  PRO_PAYWALL_PACKAGES,
  DEFAULT_PAYWALL_PACKAGES,
  PaywallPackage,
} from '../../../stores/paywallStore';
import { monetizationAnalytics } from '../../../services/monetizationAnalytics';

describe('Paywall Technical Compliance & Multi-Context (WP-05 Tasks 05.07, WP-06)', () => {
  beforeEach(() => {
    monetizationAnalytics.clear();
    usePaywallStore.setState({
      context: 'pro',
      source: null,
      selectedPackage: 'annual',
      packages: PRO_PAYWALL_PACKAGES,
      isPurchasing: false,
      isRestoring: false,
      error: null,
      purchaseSuccess: false,
      restoreSuccess: false,
    });
  });

  it('1. Pro Paywall: Actual billed price is primary; monthly equivalent is secondary comparison', () => {
    const { packages } = usePaywallStore.getState();

    // Annual package
    const annual = packages.annual;
    expect(annual.priceString).toBe('29,99 € / Jahr');
    expect(annual.rawPrice).toBe(29.99);
    expect(annual.billingPeriod).toBe('year');
    expect(annual.monthlyEquivalentString).toContain('ca. 2,50 € / Monat');
    expect(annual.priceString).not.toEqual(annual.monthlyEquivalentString);

    // Monthly package
    const monthly = packages.monthly;
    expect(monthly.priceString).toBe('4,99 € / Monat');
    expect(monthly.rawPrice).toBe(4.99);
    expect(monthly.billingPeriod).toBe('month');
  });

  it('2. Coach Paywall: Context switch updates pricing to 69,99 € / 11,99 € with 14-day annual trial', () => {
    usePaywallStore.getState().setContext('coach', 'coach_plan');
    const state = usePaywallStore.getState();

    expect(state.context).toBe('coach');
    expect(state.source).toBe('coach_plan');

    // Annual package
    const annual = state.packages.annual;
    expect(annual.priceString).toBe('69,99 € / Jahr');
    expect(annual.rawPrice).toBe(69.99);
    expect(annual.trialDays).toBe(14); // 14-day trial on Coach Annual
    expect(annual.monthlyEquivalentString).toContain('ca. 5,83 € / Monat');

    // Monthly package
    const monthly = state.packages.monthly;
    expect(monthly.priceString).toBe('11,99 € / Monat');
    expect(monthly.rawPrice).toBe(11.99);
    expect(monthly.trialDays).toBe(0);

    // Analytics event recorded
    const events = monetizationAnalytics.getRecordedEvents();
    expect(events.some((e) => e.event === 'coach_paywall_viewed')).toBe(true);
  });

  it('3. Package selection toggles active tier cleanly and clears prior errors', () => {
    usePaywallStore.setState({ error: 'Previous error' });

    usePaywallStore.getState().selectPackage('monthly');
    expect(usePaywallStore.getState().selectedPackage).toBe('monthly');
    expect(usePaywallStore.getState().error).toBeNull();

    usePaywallStore.getState().selectPackage('annual');
    expect(usePaywallStore.getState().selectedPackage).toBe('annual');
    expect(usePaywallStore.getState().error).toBeNull();
  });

  it('4. Fail-closed without native store credentials; never simulates fake success in production', async () => {
    const result = await usePaywallStore.getState().purchaseSelected();
    expect(result).toBe(false);
    expect(usePaywallStore.getState().purchaseSuccess).toBe(false);
    expect(usePaywallStore.getState().error).toContain('STORE_INTEGRATION_PENDING');

    const events = monetizationAnalytics.getRecordedEvents();
    expect(events.some((e) => e.event === 'subscription_failed')).toBe(true);
  });

  it('5. Pluggable native provider adapter executes purchase cleanly when provided', async () => {
    const mockPurchaseFn = jest.fn().mockResolvedValue(true);

    const result = await usePaywallStore.getState().purchaseSelected(mockPurchaseFn);
    expect(result).toBe(true);
    expect(mockPurchaseFn).toHaveBeenCalledWith(PRO_PAYWALL_PACKAGES.annual);
    expect(usePaywallStore.getState().purchaseSuccess).toBe(true);
    expect(usePaywallStore.getState().error).toBeNull();

    const events = monetizationAnalytics.getRecordedEvents();
    expect(events.some((e) => e.event === 'subscription_started')).toBe(true);
  });

  it('6. Restore purchases fail-closed informatively without active provider', async () => {
    const result = await usePaywallStore.getState().restorePurchases();
    expect(result).toBe(false);
    expect(usePaywallStore.getState().restoreSuccess).toBe(false);
    expect(usePaywallStore.getState().error).toContain('RESTORE_PENDING');
  });

  it('7. Pluggable restore provider executes cleanly when provided', async () => {
    const mockRestoreFn = jest.fn().mockResolvedValue(true);

    const result = await usePaywallStore.getState().restorePurchases(mockRestoreFn);
    expect(result).toBe(true);
    expect(mockRestoreFn).toHaveBeenCalledTimes(1);
    expect(usePaywallStore.getState().restoreSuccess).toBe(true);
  });

  it('8. Live store packages can be injected from StoreKit/RevenueCat without schema drift', () => {
    const liveAnnual: PaywallPackage = {
      id: 'storekit.live.annual',
      packageType: 'annual',
      priceString: '$59.99 / year',
      rawPrice: 59.99,
      currencyCode: 'USD',
      billingPeriod: 'year',
      trialDays: 14,
      monthlyEquivalentString: '~$5.00 / month',
    };

    usePaywallStore.getState().setPackages({ annual: liveAnnual });
    expect(usePaywallStore.getState().packages.annual).toEqual(liveAnnual);
    expect(usePaywallStore.getState().packages.monthly).toEqual(DEFAULT_PAYWALL_PACKAGES.monthly);
  });
});
