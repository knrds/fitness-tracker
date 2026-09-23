import { z } from 'zod';

export const CURRENT_ONBOARDING_VERSION = 1;

export const ONBOARDING_STEPS = [
  'welcome',
  'goal',
  'experience',
  'frequency',
  'equipment',
  'personalized_result',
  'paywall',
] as const;

export type OnboardingStep = (typeof ONBOARDING_STEPS)[number];

export const OnboardingGoalSchema = z.enum([
  'build_muscle',
  'gain_strength',
  'lose_fat',
  'improve_endurance',
  'general_fitness',
  'athletic_performance',
]);

export type OnboardingGoal = z.infer<typeof OnboardingGoalSchema>;

export const OnboardingExperienceSchema = z.enum([
  'beginner',
  'intermediate',
  'advanced',
]);

export type OnboardingExperience = z.infer<typeof OnboardingExperienceSchema>;

export const OnboardingEquipmentSchema = z.enum([
  'full_gym',
  'home_gym',
  'dumbbells_only',
  'bodyweight_only',
]);

export type OnboardingEquipment = z.infer<typeof OnboardingEquipmentSchema>;

export const OnboardingDraftDataSchema = z.object({
  fitnessGoal: OnboardingGoalSchema.optional(),
  experienceLevel: OnboardingExperienceSchema.optional(),
  trainingFrequency: z.number().int().min(1).max(7).optional(),
  equipment: OnboardingEquipmentSchema.optional(),
});

export type OnboardingDraftData = z.infer<typeof OnboardingDraftDataSchema>;

export const OnboardingStateSchema = z.object({
  version: z.number().int().positive(),
  currentStepIndex: z.number().int().min(0),
  completed: z.boolean(),
  completedVersion: z.number().int().positive().optional(),
  skipped: z.boolean(),
  draftData: OnboardingDraftDataSchema,
  updatedAt: z.string(),
});

export type OnboardingState = z.infer<typeof OnboardingStateSchema>;

/**
 * Checks if user should be shown the onboarding flow.
 * - New installs: true
 * - Partially completed: true (resumes at stored step)
 * - Skipped: false
 * - Completed for current version: false
 * - Completed for older version: false (migration safe: does not force re-onboarding on minor updates)
 */
export function needsOnboarding(
  state: OnboardingState | null | undefined,
  _requiredVersion = CURRENT_ONBOARDING_VERSION,
): boolean {
  if (!state) return true;
  if (state.completed) return false;
  if (state.skipped) return false;
  return true;
}

export interface PersonalizedPlanRecommendation {
  splitName: string;
  splitDescription: string;
  recommendedDays: number;
  focusMuscles: string[];
  suggestedTemplateName: string;
}

/**
 * Pure domain logic: Generates a concrete, personalized plan recommendation
 * from user onboarding preferences without third-party AI or network dependencies.
 */
export function getPersonalizedPlanRecommendation(
  draft: OnboardingDraftData,
): PersonalizedPlanRecommendation {
  const days = draft.trainingFrequency ?? 3;
  const experience = draft.experienceLevel ?? 'beginner';

  if (days <= 2 || experience === 'beginner') {
    return {
      splitName: 'Ganzkörper-Fokus (Full Body)',
      splitDescription:
        'Optimaler Einstieg für maximalen Muskelreiz bei 2–3 Trainingseinheiten pro Woche.',
      recommendedDays: Math.min(Math.max(days, 2), 3),
      focusMuscles: ['Brust', 'Rücken', 'Beine', 'Core'],
      suggestedTemplateName: 'Ganzkörper A / B',
    };
  }

  if (days <= 4 || experience === 'intermediate') {
    return {
      splitName: 'Oberkörper / Unterkörper (Upper / Lower)',
      splitDescription:
        'Ausgewogene Balance zwischen Volumen und Regeneration für fortgeschrittenen Muskelaufbau.',
      recommendedDays: 4,
      focusMuscles: ['Brust', 'Rücken', 'Schultern', 'Quadrizeps', 'Beinbeuger'],
      suggestedTemplateName: 'Oberkörper Power & Unterkörper Hypertrophie',
    };
  }

  return {
    splitName: 'Push / Pull / Beine (PPL Split)',
    splitDescription:
      'Hochfrequenter Split für maximale Spezialisierung, Kraftzuwachs und gezieltes Volumen.',
    recommendedDays: 5,
    focusMuscles: ['Brust', 'Schultern', 'Trizeps', 'Rücken', 'Bizeps', 'Beine'],
    suggestedTemplateName: 'Push A · Pull A · Legs A',
  };
}
