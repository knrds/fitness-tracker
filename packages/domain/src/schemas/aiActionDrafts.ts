import { z } from 'zod';

export const RepRangeSchema = z.object({
  min: z.number().int().positive(),
  max: z.number().int().positive(),
}).refine((data) => data.min <= data.max, {
  message: 'min reps must be less than or equal to max reps',
});

export type RepRange = z.infer<typeof RepRangeSchema>;

export const SetSchemeDraftSchema = z.object({
  sets: z.number().int().positive(),
  reps: RepRangeSchema,
  targetRir: z.number().min(0).max(5).optional(),
  targetRpe: z.number().min(6).max(10).optional(),
  suggestedWeightKg: z.number().positive().optional(),
});

export type SetSchemeDraft = z.infer<typeof SetSchemeDraftSchema>;

export const ProgressionRuleSchema = z.object({
  trigger: z.enum(['top_reps_reached', 'rpe_target_met', 'consistent_sessions']),
  action: z.enum(['add_weight_2_5kg', 'add_weight_5kg', 'add_rep', 'add_set']),
  deloadFrequencyWeeks: z.number().int().positive().optional(),
});

export type ProgressionRule = z.infer<typeof ProgressionRuleSchema>;

export const ExerciseDraftSchema = z.object({
  exerciseId: z.string(),
  exerciseName: z.string(),
  targetMuscle: z.string(),
  setScheme: SetSchemeDraftSchema,
  progressionRule: ProgressionRuleSchema.optional(),
  notes: z.string().optional(),
});

export type ExerciseDraft = z.infer<typeof ExerciseDraftSchema>;

export const WorkoutTemplateDraftSchema = z.object({
  name: z.string().min(1),
  description: z.string().optional(),
  exercises: z.array(ExerciseDraftSchema).min(1),
  estimatedDurationMinutes: z.number().int().positive().optional(),
});

export type WorkoutTemplateDraft = z.infer<typeof WorkoutTemplateDraftSchema>;

export const ProgramWeekDraftSchema = z.object({
  weekNumber: z.number().int().positive(),
  isDeload: z.boolean().default(false),
  workouts: z.array(WorkoutTemplateDraftSchema),
});

export type ProgramWeekDraft = z.infer<typeof ProgramWeekDraftSchema>;

export const ProgramDraftSchema = z.object({
  name: z.string().min(1),
  description: z.string().optional(),
  goal: z.string(),
  experienceLevel: z.enum(['beginner', 'intermediate', 'advanced']),
  daysPerWeek: z.number().int().min(1).max(7),
  weeksCount: z.number().int().min(1).max(16),
  weeks: z.array(ProgramWeekDraftSchema).min(1),
});

export type ProgramDraft = z.infer<typeof ProgramDraftSchema>;

/**
 * AI Action Safety Contract:
 * Any automated action produced by Coach AI must present a structured preview diff
 * requiring explicit user confirmation prior to being committed into local SQLite/Zustand storage.
 */
export interface AiActionDiff<T> {
  actionType: 'create_program' | 'update_program' | 'create_template' | 'update_template';
  previousState?: T | undefined;
  draftState: T;
  summaryChanges: string[];
  confirmationRequired: true;
  userConfirmed: boolean;
}

export function createAiActionDiff<T>(
  actionType: AiActionDiff<T>['actionType'],
  draftState: T,
  summaryChanges: string[],
  previousState?: T,
): AiActionDiff<T> {
  return {
    actionType,
    previousState,
    draftState,
    summaryChanges,
    confirmationRequired: true,
    userConfirmed: false,
  };
}
