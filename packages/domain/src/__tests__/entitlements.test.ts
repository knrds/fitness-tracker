import { describe, it, expect } from 'vitest';
import {
  isTierAtLeast,
  Capabilities,
  DEFAULT_FREE_TEMPLATE_LIMIT,
  DEFAULT_PRO_FAST_WEEKLY_QUOTA,
  DEFAULT_COACH_MONTHLY_CREDITS,
} from '../schemas/entitlements';
import {
  LAUNCH_PRICING_DEFAULTS,
  DEFAULT_MONETIZATION_CONFIG,
  parseRemoteMonetizationConfig,
} from '../schemas/monetizationConfig';
import {
  RepRangeSchema,
  ProgramDraftSchema,
  createAiActionDiff,
} from '../schemas/aiActionDrafts';

describe('EVARO Tier Hierarchy & Capability Contracts (WP-05 / S7)', () => {
  describe('1. Tier Hierarchy: COACH > PRO > FREE', () => {
    it('correctly evaluates tier seniority and inheritance', () => {
      // COACH has all rights
      expect(isTierAtLeast('coach', 'free')).toBe(true);
      expect(isTierAtLeast('coach', 'pro')).toBe(true);
      expect(isTierAtLeast('coach', 'coach')).toBe(true);

      // PRO has Pro and Free rights, but not Coach rights
      expect(isTierAtLeast('pro', 'free')).toBe(true);
      expect(isTierAtLeast('pro', 'pro')).toBe(true);
      expect(isTierAtLeast('pro', 'coach')).toBe(false);

      // FREE has only Free rights
      expect(isTierAtLeast('free', 'free')).toBe(true);
      expect(isTierAtLeast('free', 'pro')).toBe(false);
      expect(isTierAtLeast('free', 'coach')).toBe(false);
    });
  });

  describe('2. Template Creation & Downgrade Preservation', () => {
    it('FREE can create up to 2 custom templates; PRO/COACH are unlimited', () => {
      // 0 existing templates
      expect(Capabilities.canCreateTemplate('free', 0)).toBe(true);
      expect(Capabilities.canCreateTemplate('pro', 0)).toBe(true);
      expect(Capabilities.canCreateTemplate('coach', 0)).toBe(true);

      // 1 existing template
      expect(Capabilities.canCreateTemplate('free', 1)).toBe(true);

      // 2 existing templates: FREE is blocked (triggers PRO Paywall)
      expect(Capabilities.canCreateTemplate('free', 2)).toBe(false);
      expect(Capabilities.canCreateTemplate('free', 5)).toBe(false);

      // PRO and COACH remain unlimited
      expect(Capabilities.canCreateTemplate('pro', 2)).toBe(true);
      expect(Capabilities.canCreateTemplate('pro', 10)).toBe(true);
      expect(Capabilities.canCreateTemplate('coach', 10)).toBe(true);
    });

    it('Downgrade preservation: keeps all templates; first 2 remain editable, excess locked read-only', () => {
      // User created 5 templates during PRO and downgrades to FREE
      // Index 0 and 1 must remain editable
      expect(Capabilities.canEditTemplate('free', 0)).toBe(true);
      expect(Capabilities.canEditTemplate('free', 1)).toBe(true);

      // Index 2, 3, 4 are locked read-only (zero data loss, but require Pro to edit)
      expect(Capabilities.canEditTemplate('free', 2)).toBe(false);
      expect(Capabilities.canEditTemplate('free', 3)).toBe(false);
      expect(Capabilities.canEditTemplate('free', 4)).toBe(false);

      // Re-upgrading to PRO restores full editing on all 5 templates
      expect(Capabilities.canEditTemplate('pro', 2)).toBe(true);
      expect(Capabilities.canEditTemplate('pro', 4)).toBe(true);
    });
  });

  describe('3. Core Tracker Gating (Programs, RPE, RIR, Metrics, Analytics, Appearance)', () => {
    it('Programs: FREE cannot create programs; PRO and COACH can', () => {
      expect(Capabilities.canCreateProgram('free')).toBe(false);
      expect(Capabilities.canCreateProgram('pro')).toBe(true);
      expect(Capabilities.canCreateProgram('coach')).toBe(true);
    });

    it('RPE / RIR: FREE cannot log new RPE/RIR; PRO and COACH can', () => {
      expect(Capabilities.canUseRPE('free')).toBe(false);
      expect(Capabilities.canUseRPE('pro')).toBe(true);
      expect(Capabilities.canUseRPE('coach')).toBe(true);

      expect(Capabilities.canUseRIR('free')).toBe(false);
      expect(Capabilities.canUseRIR('pro')).toBe(true);
      expect(Capabilities.canUseRIR('coach')).toBe(true);
    });

    it('Advanced Metrics & Analytics: Gated for PRO and COACH', () => {
      expect(Capabilities.canUseAdvancedMetrics('free')).toBe(false);
      expect(Capabilities.canUseAdvancedMetrics('pro')).toBe(true);
      expect(Capabilities.canUseAdvancedMetrics('coach')).toBe(true);

      expect(Capabilities.canUseAdvancedAnalytics('free')).toBe(false);
      expect(Capabilities.canUseAdvancedAnalytics('pro')).toBe(true);
      expect(Capabilities.canUseAdvancedAnalytics('coach')).toBe(true);
    });

    it('Appearance: Premium appearance available for PRO and COACH', () => {
      expect(Capabilities.canUsePremiumAppearance('free')).toBe(false);
      expect(Capabilities.canUsePremiumAppearance('pro')).toBe(true);
      expect(Capabilities.canUsePremiumAppearance('coach')).toBe(true);
    });
  });

  describe('4. AI Coach Gating, Fast Preview, Plan Mode & Quota', () => {
    it('Coach Fast Mode: FREE has no access; PRO has weekly preview; COACH has full access', () => {
      // FREE: never allowed
      expect(Capabilities.canUseCoachFast('free', 0)).toBe(false);

      // PRO: allowed up to weekly quota (default 5)
      expect(Capabilities.canUseCoachFast('pro', 0)).toBe(true);
      expect(Capabilities.canUseCoachFast('pro', 4)).toBe(true);
      expect(Capabilities.canUseCoachFast('pro', 5)).toBe(false); // Quota reached -> Coach Paywall
      expect(Capabilities.canUseCoachFast('pro', 6)).toBe(false);

      // COACH: always allowed
      expect(Capabilities.canUseCoachFast('coach', 0)).toBe(true);
      expect(Capabilities.canUseCoachFast('coach', 10)).toBe(true);
    });

    it('Coach Plan Mode: strictly COACH only (PRO triggers Coach Paywall)', () => {
      expect(Capabilities.canUseCoachPlan('free')).toBe(false);
      expect(Capabilities.canUseCoachPlan('pro')).toBe(false);
      expect(Capabilities.canUseCoachPlan('coach')).toBe(true);
    });

    it('AI Write Safety: NEVER mutate without user confirmation; only COACH permitted', () => {
      // FREE and PRO cannot perform AI writes under any circumstances
      expect(Capabilities.canUseAIWrite('free', true)).toBe(false);
      expect(Capabilities.canUseAIWrite('pro', true)).toBe(false);

      // COACH cannot write without explicit user confirmation (fail-safe)
      expect(Capabilities.canUseAIWrite('coach', false)).toBe(false);

      // COACH with explicit confirmation is allowed
      expect(Capabilities.canUseAIWrite('coach', true)).toBe(true);
    });
  });

  describe('5. Remote Monetization Config & Launch Pricing Defaults', () => {
    it('defines launch pricing defaults accurately according to specifications', () => {
      expect(LAUNCH_PRICING_DEFAULTS.free.monthlyPrice).toBe(0);
      expect(LAUNCH_PRICING_DEFAULTS.free.annualPrice).toBe(0);

      expect(LAUNCH_PRICING_DEFAULTS.pro.monthlyPrice).toBe(4.99);
      expect(LAUNCH_PRICING_DEFAULTS.pro.annualPrice).toBe(29.99);
      expect(LAUNCH_PRICING_DEFAULTS.pro.trialDays).toBe(0);

      expect(LAUNCH_PRICING_DEFAULTS.coach.monthlyPrice).toBe(11.99);
      expect(LAUNCH_PRICING_DEFAULTS.coach.annualPrice).toBe(69.99);
      expect(LAUNCH_PRICING_DEFAULTS.coach.trialDays).toBe(14); // 14-day trial
    });

    it('validates remote monetization config and falls back safely on invalid payload', () => {
      expect(DEFAULT_MONETIZATION_CONFIG.template_limit_free).toBe(DEFAULT_FREE_TEMPLATE_LIMIT);
      expect(DEFAULT_MONETIZATION_CONFIG.pro_fast_requests_per_week).toBe(DEFAULT_PRO_FAST_WEEKLY_QUOTA);
      expect(DEFAULT_MONETIZATION_CONFIG.coach_monthly_credits).toBe(DEFAULT_COACH_MONTHLY_CREDITS);

      // Safe fallback on garbage data
      const safe = parseRemoteMonetizationConfig({ template_limit_free: 'invalid' });
      expect(safe.template_limit_free).toBe(2);

      // Valid remote override
      const custom = parseRemoteMonetizationConfig({
        template_limit_free: 3,
        pro_fast_requests_per_week: 10,
      });
      expect(custom.template_limit_free).toBe(3);
      expect(custom.pro_fast_requests_per_week).toBe(10);
    });
  });

  describe('6. Structured AI Output Validation & Safety Diff', () => {
    it('validates rep ranges and rejects impossible schemes', () => {
      expect(RepRangeSchema.safeParse({ min: 8, max: 12 }).success).toBe(true);
      expect(RepRangeSchema.safeParse({ min: 12, max: 8 }).success).toBe(false); // min > max
    });

    it('validates structured ProgramDraft and creates safe AI diff', () => {
      const validProgram = {
        name: 'Hypertrophy Block A',
        description: '4-Week Upper/Lower Split',
        goal: 'Hypertrophy',
        experienceLevel: 'intermediate' as const,
        daysPerWeek: 4,
        weeksCount: 4,
        weeks: [
          {
            weekNumber: 1,
            isDeload: false,
            workouts: [
              {
                name: 'Upper Body A',
                exercises: [
                  {
                    exerciseId: 'bench-press',
                    exerciseName: 'Barbell Bench Press',
                    targetMuscle: 'Chest',
                    setScheme: {
                      sets: 4,
                      reps: { min: 6, max: 8 },
                      targetRir: 2,
                    },
                  },
                ],
              },
            ],
          },
        ],
      };

      const parsed = ProgramDraftSchema.safeParse(validProgram);
      expect(parsed.success).toBe(true);

      const diff = createAiActionDiff('create_program', validProgram, [
        'Neues 4-Wochen Programm "Hypertrophy Block A" mit 4 Tagen/Woche',
      ]);

      expect(diff.confirmationRequired).toBe(true);
      expect(diff.userConfirmed).toBe(false);
      expect(diff.summaryChanges.length).toBe(1);
    });
  });
});
