import { z } from 'zod';

export const MuscleGroupSchema = z.enum([
  'chest',
  'back',
  'shoulders',
  'biceps',
  'triceps',
  'legs',
  'glutes',
  'abs',
  'cardio',
]);

export const ExerciseCategorySchema = z.enum([
  'strength',
  'cardio',
  'flexibility',
  'balance',
]);

export const ExerciseSchema = z.object({
  id: z.string().uuid(),
  name: z.string().min(1).max(100),
  category: ExerciseCategorySchema,
  muscleGroups: z.array(MuscleGroupSchema).min(1),
  description: z.string().max(500).optional(),
});

export const WorkoutSetSchema = z.object({
  id: z.string().uuid(),
  exerciseId: z.string().uuid(),
  reps: z.number().int().positive().optional(),
  weight: z.number().nonnegative().optional(),
  durationSeconds: z.number().positive().optional(),
  distanceMeters: z.number().positive().optional(),
  restSeconds: z.number().nonnegative().optional(),
  notes: z.string().max(200).optional(),
});

export const WorkoutSessionSchema = z.object({
  id: z.string().uuid(),
  title: z.string().min(1).max(100),
  startedAt: z.date(),
  finishedAt: z.date().optional(),
  sets: z.array(WorkoutSetSchema),
  notes: z.string().max(1000).optional(),
});

export const WorkoutTemplateSchema = z.object({
  id: z.string().uuid(),
  name: z.string().min(1).max(100),
  description: z.string().max(500).optional(),
  exercises: z.array(
    z.object({
      exerciseId: z.string().uuid(),
      targetSets: z.number().int().positive(),
      targetReps: z.number().int().positive().optional(),
      targetWeight: z.number().nonnegative().optional(),
      targetDurationSeconds: z.number().positive().optional(),
    }),
  ),
});

export const UserProfileSchema = z.object({
  id: z.string().uuid(),
  name: z.string().min(1).max(100),
  weightKg: z.number().positive().optional(),
  heightCm: z.number().positive().optional(),
  birthDate: z.date().optional(),
  fitnessGoal: z
    .enum(['lose_weight', 'build_muscle', 'improve_endurance', 'stay_active'])
    .optional(),
});

export type ExerciseInput = z.input<typeof ExerciseSchema>;
export type WorkoutSetInput = z.input<typeof WorkoutSetSchema>;
export type WorkoutSessionInput = z.input<typeof WorkoutSessionSchema>;
export type WorkoutTemplateInput = z.input<typeof WorkoutTemplateSchema>;
export type UserProfileInput = z.input<typeof UserProfileSchema>;
