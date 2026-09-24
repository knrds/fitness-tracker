import { z } from 'zod';

export const SUBSCRIPTION_TIERS = ['free', 'pro', 'coach'] as const;
export type SubscriptionTier = (typeof SUBSCRIPTION_TIERS)[number];

export const SubscriptionTierSchema = z.enum(['free', 'pro', 'coach']);

export const TIER_LEVELS: Record<SubscriptionTier, number> = {
  free: 0,
  pro: 1,
  coach: 2,
};

/**
 * Checks if currentTier meets or exceeds the requiredTier.
 * Hierarchy: COACH (2) > PRO (1) > FREE (0)
 */
export function isTierAtLeast(
  currentTier: SubscriptionTier,
  requiredTier: SubscriptionTier,
): boolean {
  return TIER_LEVELS[currentTier] >= TIER_LEVELS[requiredTier];
}

export const FEATURE_CAPABILITIES = [
  'create_template',
  'edit_template',
  'create_program',
  'use_rpe',
  'use_rir',
  'advanced_metrics',
  'advanced_analytics',
  'premium_appearance',
  'coach_fast',
  'coach_plan',
  'ai_write',
] as const;

export type FeatureCapability = (typeof FEATURE_CAPABILITIES)[number];

export interface CapabilityCheckContext {
  currentTemplateCount?: number;
  templateIndex?: number;
  proWeeklyFastUsed?: number;
  proWeeklyFastQuota?: number;
  coachMonthlyCreditsUsed?: number;
  coachMonthlyCreditsTotal?: number;
  hasExplicitUserConfirmation?: boolean;
  freeTemplateLimit?: number;
}

export const DEFAULT_FREE_TEMPLATE_LIMIT = 3;
export const DEFAULT_FREE_PROGRAM_LIMIT = 1;
export const DEFAULT_PRO_FAST_WEEKLY_QUOTA = 5;
export const DEFAULT_COACH_MONTHLY_CREDITS = 300;
export const DEFAULT_FAST_REQUEST_COST = 1;
export const DEFAULT_PLAN_REQUEST_COST = 5;

/**
 * Deterministic capability validation layer.
 * All screens and stores must query these rules rather than ad-hoc tier branching.
 */
export const Capabilities = {
  /**
   * FREE: Up to limit (default 2) custom templates.
   * PRO / COACH: Unlimited templates.
   */
  canCreateTemplate(
    tier: SubscriptionTier,
    currentCount = 0,
    limit = DEFAULT_FREE_TEMPLATE_LIMIT,
  ): boolean {
    if (isTierAtLeast(tier, 'pro')) return true;
    return currentCount < limit;
  },

  /**
   * FREE: Only first `limit` (default 2) templates are editable. Extra templates are read-only.
   * PRO / COACH: All templates are editable.
   */
  canEditTemplate(
    tier: SubscriptionTier,
    templateIndex: number,
    limit = DEFAULT_FREE_TEMPLATE_LIMIT,
  ): boolean {
    if (isTierAtLeast(tier, 'pro')) return true;
    return templateIndex < limit;
  },

  /**
   * FREE: Cannot create or customize multi-week programs.
   * PRO / COACH: Full program system access.
   */
  canCreateProgram(tier: SubscriptionTier, currentCount = 0): boolean {
    return isTierAtLeast(tier, 'pro') || currentCount < DEFAULT_FREE_PROGRAM_LIMIT;
  },

  /**
   * FREE: Read-only history for RPE. No new input.
   * PRO / COACH: Full RPE logging and analytics.
   */
  canUseRPE(tier: SubscriptionTier): boolean {
    return isTierAtLeast(tier, 'pro');
  },

  /**
   * FREE: Read-only history for RIR. No new input.
   * PRO / COACH: Full RIR logging and analytics.
   */
  canUseRIR(tier: SubscriptionTier): boolean {
    return isTierAtLeast(tier, 'pro');
  },

  /**
   * FREE: Body weight, height, basic stats.
   * PRO / COACH: Circumferences, body fat, detailed trend charts.
   */
  canUseAdvancedMetrics(tier: SubscriptionTier): boolean {
    return isTierAtLeast(tier, 'pro');
  },

  /**
   * FREE: Basic workout history, simple PRs, basic volume summary.
   * PRO / COACH: Long-term trends, muscle group balance, volume curves, RPE analytics.
   */
  canUseAdvancedAnalytics(tier: SubscriptionTier): boolean {
    return isTierAtLeast(tier, 'pro');
  },

  /**
   * FREE: Standard themes and basic unlocked rank rewards.
   * PRO: Premium theme colorways and unlocked premium rank cosmetics.
   * COACH: All PRO cosmetics plus Coach-exclusive prestige cosmetics.
   */
  canUsePremiumAppearance(tier: SubscriptionTier): boolean {
    return isTierAtLeast(tier, 'pro');
  },

  /**
   * FREE: No AI.
   * PRO: Fast Mode preview with weekly quota (default 5 requests / week).
   * COACH: Full Fast Mode access.
   */
  canUseCoachFast(
    tier: SubscriptionTier,
    weeklyUsed = 0,
    weeklyQuota = DEFAULT_PRO_FAST_WEEKLY_QUOTA,
  ): boolean {
    if (tier === 'coach') return true;
    if (tier === 'pro') return weeklyUsed < weeklyQuota;
    return false;
  },

  /**
   * COACH only: Multi-week plan creation, periodization, deep program analysis.
   */
  canUseCoachPlan(tier: SubscriptionTier): boolean {
    return tier === 'coach';
  },

  /**
   * AI Write Safety: AI NEVER mutates user training data directly.
   * Requires COACH tier AND explicit user confirmation of the structured draft diff.
   */
  canUseAIWrite(tier: SubscriptionTier, hasExplicitUserConfirmation = false): boolean {
    if (tier !== 'coach') return false;
    return hasExplicitUserConfirmation === true;
  },
};

export const AIUsagePeriodSchema = z.enum(['weekly', 'monthly']);
export type AIUsagePeriod = z.infer<typeof AIUsagePeriodSchema>;

export const AIUsageModeSchema = z.enum(['fast', 'plan']);
export type AIUsageMode = z.infer<typeof AIUsageModeSchema>;

/**
 * Privacy-preserving telemetry event for AI requests.
 * Stored without prompt text, chat replies, medical data, or workout payloads.
 */
export const AIUsageEventSchema = z.object({
  userId: z.string(),
  timestamp: z.string(),
  mode: AIUsageModeSchema,
  creditsCharged: z.number().int().nonnegative(),
  model: z.string(),
  estimatedInputTokens: z.number().int().nonnegative(),
  estimatedOutputTokens: z.number().int().nonnegative(),
  estimatedCost: z.number().nonnegative(),
  success: z.boolean(),
});

export type AIUsageEvent = z.infer<typeof AIUsageEventSchema>;

export interface AIQuotaState {
  tier: SubscriptionTier;
  period: AIUsagePeriod;
  periodStart: string;
  periodEnd: string;
  fastRequestsUsed: number;
  fastRequestsLimit: number;
  creditsUsed: number;
  creditsLimit: number;
}
