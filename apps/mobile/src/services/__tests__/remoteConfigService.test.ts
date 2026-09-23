import {
  RemoteConfigService,
  remoteConfigService,
} from '../remoteConfigService';
import { DEFAULT_MONETIZATION_CONFIG } from '@fitness-tracker/domain';

describe('RemoteConfigService', () => {
  beforeEach(() => {
    remoteConfigService.resetToDefaults();
    remoteConfigService.setFetcher(null);
  });

  it('initializes with safe default configuration', () => {
    const service = new RemoteConfigService();
    expect(service.getConfig()).toEqual(DEFAULT_MONETIZATION_CONFIG);
    expect(service.isCoachEnabled()).toBe(true);
    expect(service.getPaywallVariant()).toBe('default_v1');
    expect(service.getNotificationCampaign()).toBeNull();
    expect(service.getState().source).toBe('default');
  });

  it('evaluates feature flags and emergency kill switches correctly', () => {
    const service = new RemoteConfigService();

    expect(service.isFeatureEnabled('workout_tracking')).toBe(true);
    expect(service.isFeatureEnabled('non_existent_feature')).toBe(false);

    // If coach is killed via killed_features
    service['config'].killed_features = ['coach'];
    expect(service.isCoachEnabled()).toBe(false);

    // If another feature is killed
    service['config'].killed_features = ['templates'];
    expect(service.isFeatureEnabled('templates')).toBe(false);
  });

  it('updates configuration when fetcher returns valid payload', async () => {
    const mockFetcher = jest.fn().mockResolvedValue({
      template_limit_free: 5,
      paywall_variant: 'paywall_experiment_b',
      coach_enabled: true,
      notification_campaign: 'spring_2026',
      killed_features: ['experimental_feature'],
    });

    const service = new RemoteConfigService(mockFetcher);
    const config = await service.fetchConfig();

    expect(config.template_limit_free).toBe(5);
    expect(service.getPaywallVariant()).toBe('paywall_experiment_b');
    expect(service.getNotificationCampaign()).toBe('spring_2026');
    expect(service.isFeatureEnabled('experimental_feature')).toBe(false);
    expect(service.getState().source).toBe('remote');
    expect(service.getState().isStale).toBe(false);
  });

  it('falls back to safe cache on network rejection without throwing', async () => {
    const mockFetcher = jest.fn().mockRejectedValue(new Error('Network offline'));
    const service = new RemoteConfigService(mockFetcher);

    // Initial fetch fails gracefully
    const config = await service.fetchConfig();
    expect(config).toEqual(DEFAULT_MONETIZATION_CONFIG);
    expect(service.getState().isStale).toBe(true);
  });

  it('falls back safely when remote returns malformed payload', async () => {
    const mockFetcher = jest.fn().mockResolvedValue({
      template_limit_free: 'not-a-number', // invalid type
      quota_warning_threshold_1: 999, // out of range min 0.5 max 1.0
    });
    const service = new RemoteConfigService(mockFetcher);

    const config = await service.fetchConfig();
    expect(config).toEqual(DEFAULT_MONETIZATION_CONFIG);
    expect(config.template_limit_free).toBe(DEFAULT_MONETIZATION_CONFIG.template_limit_free);
  });

  it('handles fetch timeout gracefully via AbortSignal', async () => {
    const delayedFetcher = jest.fn().mockImplementation((signal?: AbortSignal) => {
      return new Promise((resolve, reject) => {
        const timer = setTimeout(() => resolve({ paywall_variant: 'late_v2' }), 200);
        signal?.addEventListener('abort', () => {
          clearTimeout(timer);
          reject(new Error('Aborted'));
        });
      });
    });

    const service = new RemoteConfigService(delayedFetcher);
    const config = await service.fetchConfig({ timeoutMs: 20 });

    expect(config.paywall_variant).toBe('default_v1');
    expect(service.getState().isStale).toBe(true);
  });
});
