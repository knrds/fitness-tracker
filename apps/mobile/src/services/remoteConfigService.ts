import {
  RemoteSubscriptionConfig,
  DEFAULT_MONETIZATION_CONFIG,
  parseRemoteMonetizationConfig,
} from '@fitness-tracker/domain';

export type RemoteConfigFetcher = (signal?: AbortSignal) => Promise<unknown>;

export interface RemoteConfigState {
  config: RemoteSubscriptionConfig;
  lastFetchedAt: number | null;
  isStale: boolean;
  source: 'default' | 'cache' | 'remote';
}

export class RemoteConfigService {
  private config: RemoteSubscriptionConfig = { ...DEFAULT_MONETIZATION_CONFIG };
  private lastFetchedAt: number | null = null;
  private isStale = true;
  private source: 'default' | 'cache' | 'remote' = 'default';
  private fetcher: RemoteConfigFetcher | null = null;

  constructor(initialFetcher?: RemoteConfigFetcher) {
    if (initialFetcher) {
      this.fetcher = initialFetcher;
    }
  }

  public setFetcher(fetcher: RemoteConfigFetcher | null): void {
    this.fetcher = fetcher;
  }

  public getConfig(): RemoteSubscriptionConfig {
    return this.config;
  }

  public getState(): RemoteConfigState {
    return {
      config: this.config,
      lastFetchedAt: this.lastFetchedAt,
      isStale: this.isStale,
      source: this.source,
    };
  }

  public isCoachEnabled(): boolean {
    if (this.config.killed_features.includes('coach')) {
      return false;
    }
    return this.config.coach_enabled && this.config.enabled_features.includes('coach_fast');
  }

  public isFeatureEnabled(featureId: string): boolean {
    if (this.config.killed_features.includes(featureId)) {
      return false;
    }
    return this.config.enabled_features.includes(featureId);
  }

  public getPaywallVariant(): string {
    return this.config.paywall_variant;
  }

  public getNotificationCampaign(): string | null {
    return this.config.notification_campaign;
  }

  public resetToDefaults(): void {
    this.config = { ...DEFAULT_MONETIZATION_CONFIG };
    this.lastFetchedAt = null;
    this.isStale = true;
    this.source = 'default';
  }

  /**
   * Fetches the remote config with bounded timeout, falling back gracefully to
   * current cached config or safe defaults. Never throws.
   */
  public async fetchConfig(options: { timeoutMs?: number; force?: boolean } = {}): Promise<RemoteSubscriptionConfig> {
    if (!this.fetcher) {
      // In local dev/mock without custom fetcher, maintain safe defaults
      return this.config;
    }

    const timeoutMs = options.timeoutMs ?? 4000;
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);

    try {
      const raw = await this.fetcher(controller.signal);
      const parsed = parseRemoteMonetizationConfig(raw, this.config);
      this.config = parsed;
      this.lastFetchedAt = Date.now();
      this.isStale = false;
      this.source = 'remote';
      return this.config;
    } catch {
      // On network failure, timeout, or malformed data, fail-safe:
      // Keep existing cached config, mark as stale
      this.isStale = true;
      if (this.source === 'default') {
        this.source = 'default';
      } else {
        this.source = 'cache';
      }
      return this.config;
    } finally {
      clearTimeout(timer);
    }
  }
}

// Global client singleton
export const remoteConfigService = new RemoteConfigService();
