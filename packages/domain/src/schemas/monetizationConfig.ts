import { z } from 'zod';
import {
  DEFAULT_FREE_TEMPLATE_LIMIT,
  DEFAULT_PRO_FAST_WEEKLY_QUOTA,
  DEFAULT_COACH_MONTHLY_CREDITS,
  DEFAULT_FAST_REQUEST_COST,
  DEFAULT_PLAN_REQUEST_COST,
} from './entitlements';

export const PricingPlanConfigSchema = z.object({
  monthlyPrice: z.number().nonnegative(),
  annualPrice: z.number().nonnegative(),
  currency: z.string().default('EUR'),
  trialDays: z.number().int().nonnegative().default(0),
});

export type PricingPlanConfig = z.infer<typeof PricingPlanConfigSchema>;

/**
 * LAUNCH PRICING DEFAULTS:
 * These values are strictly for local development, previews, mocks, and fallback designs.
 * Production source of truth MUST come from App Store / Google Play / RevenueCat.
 */
export const LAUNCH_PRICING_DEFAULTS: Record<'free' | 'pro' | 'coach', PricingPlanConfig> = {
  free: {
    monthlyPrice: 0,
    annualPrice: 0,
    currency: 'EUR',
    trialDays: 0,
  },
  pro: {
    monthlyPrice: 4.99,
    annualPrice: 29.99,
    currency: 'EUR',
    trialDays: 0,
  },
  coach: {
    monthlyPrice: 11.99,
    annualPrice: 69.99,
    currency: 'EUR',
    trialDays: 14, // Coach Annual Default Trial = 14 days
  },
};

export const RemoteSubscriptionConfigSchema = z.object({
  template_limit_free: z.number().int().positive().default(DEFAULT_FREE_TEMPLATE_LIMIT),
  pro_fast_requests_per_week: z.number().int().positive().default(DEFAULT_PRO_FAST_WEEKLY_QUOTA),
  coach_monthly_credits: z.number().int().positive().default(DEFAULT_COACH_MONTHLY_CREDITS),
  fast_request_cost: z.number().int().positive().default(DEFAULT_FAST_REQUEST_COST),
  plan_request_cost: z.number().int().positive().default(DEFAULT_PLAN_REQUEST_COST),
  quota_warning_threshold_1: z.number().min(0.5).max(1.0).default(0.8),
  quota_warning_threshold_2: z.number().min(0.5).max(1.0).default(0.95),
  coach_annual_trial_days: z.number().int().nonnegative().default(14),
  enabled_features: z.array(z.string()).default([
    'workout_tracking',
    'history',
    'templates',
    'programs',
    'metrics',
    'analytics',
    'appearance',
    'coach_fast',
    'coach_plan',
  ]),
  paywall_variant: z.string().default('default_v1'),
  recommended_plan: z.enum(['annual', 'monthly']).default('annual'),
  appearance_access: z.enum(['standard', 'premium', 'all']).default('standard'),
  metric_access: z.enum(['basic', 'advanced', 'all']).default('basic'),
  pricing_defaults: z.record(PricingPlanConfigSchema).default(LAUNCH_PRICING_DEFAULTS),
});

export type RemoteSubscriptionConfig = z.infer<typeof RemoteSubscriptionConfigSchema>;

export const DEFAULT_MONETIZATION_CONFIG: RemoteSubscriptionConfig =
  RemoteSubscriptionConfigSchema.parse({});

export function parseRemoteMonetizationConfig(
  raw: unknown,
  fallback = DEFAULT_MONETIZATION_CONFIG,
): RemoteSubscriptionConfig {
  const result = RemoteSubscriptionConfigSchema.safeParse(raw);
  if (!result.success) {
    return fallback;
  }
  return result.data;
}
