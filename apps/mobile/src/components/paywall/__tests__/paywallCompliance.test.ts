import {
  usePaywallStore,
  DEFAULT_PAYWALL_PACKAGES,
  PaywallPackage,
} from '../../../stores/paywallStore';

describe('Paywall Technical Compliance (WP-05 Task 05.07)', () => {
  beforeEach(() => {
    usePaywallStore.setState({
      selectedPackage: 'annual',
      packages: DEFAULT_PAYWALL_PACKAGES,
      isPurchasing: false,
      isRestoring: false,
      error: null,
      purchaseSuccess: false,
      restoreSuccess: false,
    });
  });

  it('1. Actual billed price is primary; monthly equivalent is never the sole or primary price', () => {
    const { packages } = usePaywallStore.getState();

    // Annual package
    const annual = packages.annual;
    expect(annual.priceString).toBe('49,99 € / Jahr');
    expect(annual.rawPrice).toBe(49.99);
    expect(annual.billingPeriod).toBe('year');
    // Monthly equivalent must only be secondary comparison
    expect(annual.monthlyEquivalentString).toContain('ca. 4,16 € / Monat');
    expect(annual.priceString).not.toEqual(annual.monthlyEquivalentString);

    // Monthly package
    const monthly = packages.monthly;
    expect(monthly.priceString).toBe('9,99 € / Monat');
    expect(monthly.rawPrice).toBe(9.99);
    expect(monthly.billingPeriod).toBe('month');
  });

  it('2. Trial period duration is explicitly defined on trial-eligible package', () => {
    const { packages } = usePaywallStore.getState();
    expect(packages.annual.trialDays).toBe(7);
    expect(packages.monthly.trialDays).toBe(0);
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
  });

  it('5. Pluggable native provider adapter executes purchase cleanly when provided', async () => {
    const mockPurchaseFn = jest.fn().mockResolvedValue(true);

    const result = await usePaywallStore.getState().purchaseSelected(mockPurchaseFn);
    expect(result).toBe(true);
    expect(mockPurchaseFn).toHaveBeenCalledWith(DEFAULT_PAYWALL_PACKAGES.annual);
    expect(usePaywallStore.getState().purchaseSuccess).toBe(true);
    expect(usePaywallStore.getState().error).toBeNull();
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
