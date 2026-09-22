import { Platform } from 'react-native';
import { logger } from '../utils/logger';

export const MONETIZATION_EVENTS = [
  'paywall_viewed',
  'pro_paywall_viewed',
  'coach_paywall_viewed',
  'locked_feature_clicked',
  'subscription_checkout_started',
  'subscription_started',
  'subscription_failed',
  'trial_started',
  'trial_converted',
  'trial_cancelled',
  'subscription_renewed',
  'subscription_cancelled',
  'subscription_expired',
  'pro_to_coach_upgrade',
  'ai_fast_requested',
  'ai_plan_requested',
  'ai_limit_warning',
  'ai_limit_reached',
  'template_limit_reached',
  'program_feature_clicked',
  'premium_metric_clicked',
  'premium_appearance_clicked',
] as const;

export type MonetizationEventName = (typeof MONETIZATION_EVENTS)[number];

export interface MonetizationEventProperties {
  tier?: 'free' | 'pro' | 'coach' | undefined;
  paywall_source?: string | undefined;
  feature_source?: string | undefined;
  product_selected?: string | undefined;
  billing_period?: 'month' | 'year' | undefined;
  trial?: boolean | undefined;
  platform?: string | undefined;
  app_version?: string | undefined;
  country?: string | undefined;
}

export interface RecordedMonetizationEvent {
  event: MonetizationEventName;
  properties: MonetizationEventProperties;
  timestamp: string;
}

export class MonetizationAnalytics {
  private recordedEvents: RecordedMonetizationEvent[] = [];

  /**
   * Tracks a monetization or paywall funnel event.
   * STRICT PRIVACY GUARD: Disallows health metrics, workout details, prompts, or coach text.
   */
  track(event: MonetizationEventName, properties: MonetizationEventProperties = {}): void {
    const sanitizedProps: MonetizationEventProperties = {
      tier: properties.tier,
      paywall_source: properties.paywall_source,
      feature_source: properties.feature_source,
      product_selected: properties.product_selected,
      billing_period: properties.billing_period,
      trial: properties.trial,
      platform: properties.platform ?? Platform.OS,
      app_version: properties.app_version ?? '0.1.0-beta.6',
      country: properties.country,
    };

    const recorded: RecordedMonetizationEvent = {
      event,
      properties: sanitizedProps,
      timestamp: new Date().toISOString(),
    };

    this.recordedEvents.push(recorded);
    logger.info(`[MonetizationAnalytics] ${event}`, sanitizedProps);
  }

  getRecordedEvents(): RecordedMonetizationEvent[] {
    return [...this.recordedEvents];
  }

  clear(): void {
    this.recordedEvents = [];
  }
}

export const monetizationAnalytics = new MonetizationAnalytics();
