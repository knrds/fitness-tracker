/**
 * @fitness-tracker/domain — Zod schemas
 *
 * Runtime validators mirroring the interfaces in `../types`. The three core
 * taxonomy enums (MuscleGroup, Equipment, MovementPattern) are reused directly
 * via `z.nativeEnum` so the TypeScript enum is the single source of truth.
 *
 * Timestamps use `z.coerce.date()`: Supabase/JSON return ISO strings, which are
 * coerced to `Date`, matching the `Timestamp` (Date) fields in the interfaces.
 */

import { z } from 'zod';
import { Equipment, MovementPattern, MuscleGroup } from '../types';

// ---------------------------------------------------------------------------
// Primitives & shared aliases
// ---------------------------------------------------------------------------

export const UUIDSchema = z.string().uuid();
export const TimestampSchema = z.coerce.date();

export const UnitSystemSchema = z.enum(['metric', 'imperial']);
export const WeightUnitSchema = z.enum(['kg', 'lb']);
export const DistanceUnitSchema = z.enum(['km', 'mi', 'm']);

// ---------------------------------------------------------------------------
// Enums — reuse the native TS enums from ../types
// ---------------------------------------------------------------------------

export const MuscleGroupSchema = z.nativeEnum(MuscleGroup);
export const EquipmentSchema = z.nativeEnum(Equipment);
export const MovementPatternSchema = z.nativeEnum(MovementPattern);

export const ExperienceLevelSchema = z.enum(['beginner', 'intermediate', 'advanced']);
export const BiologicalSexSchema = z.enum(['male', 'female', 'other', 'prefer_not_to_say']);
export const FitnessGoalSchema = z.enum([
  'build_muscle',
  'gain_strength',
  'lose_fat',
  'improve_endurance',
  'general_fitness',
  'athletic_performance',
]);
export const SetTypeSchema = z.enum(['warmup', 'working', 'drop', 'failure', 'amrap', 'backoff']);
export const PersonalRecordTypeSchema = z.enum([
  'one_rep_max',
  'estimated_one_rep_max',
  'max_weight',
  'max_reps',
  'max_volume',
  'best_time',
  'max_distance',
]);
export const ActiveWorkoutStatusSchema = z.enum([
  'idle',
  'active',
  'paused',
  'resting',
  'finished',
]);

// ---------------------------------------------------------------------------
// User
// ---------------------------------------------------------------------------

export const UserSchema = z.object({
  id: UUIDSchema,
  email: z.string().email(),
  displayName: z.string().min(1).max(80),
  avatarUrl: z.string().url().optional(),
  dateOfBirth: TimestampSchema.optional(),
  biologicalSex: BiologicalSexSchema.optional(),
  heightCm: z.number().positive().max(300).optional(),
  preferredUnits: UnitSystemSchema,
  fitnessGoal: FitnessGoalSchema.optional(),
  experienceLevel: ExperienceLevelSchema.optional(),
  createdAt: TimestampSchema,
  updatedAt: TimestampSchema,
});

// ---------------------------------------------------------------------------
// Exercise
// ---------------------------------------------------------------------------

export const ExerciseSchema = z
  .object({
    id: UUIDSchema,
    name: z.string().min(1).max(100),
    instructions: z.string().max(2000).optional(),
    primaryMuscles: z.array(MuscleGroupSchema).min(1),
    secondaryMuscles: z.array(MuscleGroupSchema),
    equipment: EquipmentSchema,
    movementPattern: MovementPatternSchema,
    isCustom: z.boolean(),
    ownerId: UUIDSchema.optional(),
    isUnilateral: z.boolean().optional(),
    createdAt: TimestampSchema,
    updatedAt: TimestampSchema,
  })
  .refine((e) => !e.isCustom || e.ownerId !== undefined, {
    message: 'Custom exercises must have an ownerId',
    path: ['ownerId'],
  });

// ---------------------------------------------------------------------------
// ExerciseSet
// ---------------------------------------------------------------------------

export const ExerciseSetSchema = z.object({
  id: UUIDSchema,
  setNumber: z.number().int().positive(),
  type: SetTypeSchema,
  weight: z.number().nonnegative().optional(),
  reps: z.number().int().nonnegative().optional(),
  rpe: z.number().min(1).max(10).optional(),
  rir: z.number().int().min(0).max(5).optional(),
  restSeconds: z.number().int().nonnegative().optional(),
  durationSeconds: z.number().nonnegative().optional(),
  distanceMeters: z.number().nonnegative().optional(),
  notes: z.string().max(500).optional(),
  completed: z.boolean(),
  completedAt: TimestampSchema.optional(),
});

// ---------------------------------------------------------------------------
// Workout session
// ---------------------------------------------------------------------------

export const SessionExerciseSchema = z.object({
  id: UUIDSchema,
  exerciseId: UUIDSchema,
  order: z.number().int().nonnegative(),
  sets: z.array(ExerciseSetSchema),
  supersetGroup: z.string().optional(),
  notes: z.string().max(1000).optional(),
});

export const WorkoutSessionSchema = z.object({
  id: UUIDSchema,
  userId: UUIDSchema,
  templateId: UUIDSchema.optional(),
  programId: UUIDSchema.optional(),
  name: z.string().min(1).max(100),
  startedAt: TimestampSchema,
  completedAt: TimestampSchema.optional(),
  durationSeconds: z.number().int().nonnegative().optional(),
  exercises: z.array(SessionExerciseSchema),
  bodyweightKg: z.number().positive().optional(),
  perceivedExertion: z.number().min(1).max(10).optional(),
  notes: z.string().max(2000).optional(),
  createdAt: TimestampSchema,
  updatedAt: TimestampSchema,
});

// ---------------------------------------------------------------------------
// Workout template
// ---------------------------------------------------------------------------

export const TemplateExerciseSchema = z.object({
  id: UUIDSchema,
  exerciseId: UUIDSchema,
  order: z.number().int().nonnegative(),
  targetSets: z.number().int().positive(),
  targetReps: z.number().int().positive().optional(),
  targetRepsMax: z.number().int().positive().optional(),
  targetWeight: z.number().nonnegative().optional(),
  targetRpe: z.number().min(1).max(10).optional(),
  targetRir: z.number().int().min(0).max(5).optional(),
  targetRestSeconds: z.number().int().nonnegative().optional(),
  supersetGroup: z.string().optional(),
  notes: z.string().max(500).optional(),
});

export const WorkoutTemplateSchema = z.object({
  id: UUIDSchema,
  userId: UUIDSchema,
  name: z.string().min(1).max(100),
  description: z.string().max(1000).optional(),
  exercises: z.array(TemplateExerciseSchema),
  estimatedDurationMinutes: z.number().int().positive().optional(),
  isArchived: z.boolean(),
  createdAt: TimestampSchema,
  updatedAt: TimestampSchema,
});

// ---------------------------------------------------------------------------
// Program
// ---------------------------------------------------------------------------

export const ProgramWorkoutSchema = z.object({
  id: UUIDSchema,
  templateId: UUIDSchema,
  week: z.number().int().positive(),
  dayOfWeek: z.number().int().min(1).max(7),
  order: z.number().int().nonnegative(),
});

export const ProgramSchema = z.object({
  id: UUIDSchema,
  userId: UUIDSchema,
  name: z.string().min(1).max(100),
  description: z.string().max(1000).optional(),
  durationWeeks: z.number().int().positive().max(104),
  goal: FitnessGoalSchema.optional(),
  workouts: z.array(ProgramWorkoutSchema),
  isActive: z.boolean(),
  startedAt: TimestampSchema.optional(),
  createdAt: TimestampSchema,
  updatedAt: TimestampSchema,
});

// ---------------------------------------------------------------------------
// Personal record
// ---------------------------------------------------------------------------

export const PersonalRecordSchema = z.object({
  id: UUIDSchema,
  userId: UUIDSchema,
  exerciseId: UUIDSchema,
  type: PersonalRecordTypeSchema,
  value: z.number(),
  reps: z.number().int().positive().optional(),
  sessionId: UUIDSchema.optional(),
  setId: UUIDSchema.optional(),
  previousValue: z.number().optional(),
  achievedAt: TimestampSchema,
});

// ---------------------------------------------------------------------------
// Body metric
// ---------------------------------------------------------------------------

export const BodyMeasurementsSchema = z.object({
  neck: z.number().positive().optional(),
  shoulders: z.number().positive().optional(),
  chest: z.number().positive().optional(),
  waist: z.number().positive().optional(),
  hips: z.number().positive().optional(),
  leftArm: z.number().positive().optional(),
  rightArm: z.number().positive().optional(),
  leftThigh: z.number().positive().optional(),
  rightThigh: z.number().positive().optional(),
  leftCalf: z.number().positive().optional(),
  rightCalf: z.number().positive().optional(),
});

export const BodyMetricSchema = z.object({
  id: UUIDSchema,
  userId: UUIDSchema,
  recordedAt: TimestampSchema,
  weightKg: z.number().positive().optional(),
  bodyFatPercentage: z.number().min(0).max(100).optional(),
  restingHeartRate: z.number().int().positive().optional(),
  measurements: BodyMeasurementsSchema.optional(),
  notes: z.string().max(1000).optional(),
  createdAt: TimestampSchema,
});

// ---------------------------------------------------------------------------
// Active workout state
// ---------------------------------------------------------------------------

export const RestTimerStateSchema = z.object({
  isRunning: z.boolean(),
  durationSeconds: z.number().int().nonnegative(),
  endsAt: TimestampSchema.optional(),
});

export const ActiveWorkoutStateSchema = z.object({
  status: ActiveWorkoutStatusSchema,
  sessionId: UUIDSchema.optional(),
  templateId: UUIDSchema.optional(),
  programId: UUIDSchema.optional(),
  name: z.string().max(100),
  startedAt: TimestampSchema.optional(),
  elapsedSeconds: z.number().nonnegative(),
  currentExerciseIndex: z.number().int().nonnegative(),
  currentSetIndex: z.number().int().nonnegative(),
  exercises: z.array(SessionExerciseSchema),
  restTimer: RestTimerStateSchema,
  lastUpdatedAt: TimestampSchema,
});

// ---------------------------------------------------------------------------
// Input helper types (z.input) — useful for forms before defaults/coercion
// ---------------------------------------------------------------------------

export type UserInput = z.input<typeof UserSchema>;
export type ExerciseInput = z.input<typeof ExerciseSchema>;
export type ExerciseSetInput = z.input<typeof ExerciseSetSchema>;
export type SessionExerciseInput = z.input<typeof SessionExerciseSchema>;
export type WorkoutSessionInput = z.input<typeof WorkoutSessionSchema>;
export type TemplateExerciseInput = z.input<typeof TemplateExerciseSchema>;
export type WorkoutTemplateInput = z.input<typeof WorkoutTemplateSchema>;
export type ProgramWorkoutInput = z.input<typeof ProgramWorkoutSchema>;
export type ProgramInput = z.input<typeof ProgramSchema>;
export type PersonalRecordInput = z.input<typeof PersonalRecordSchema>;
export type BodyMetricInput = z.input<typeof BodyMetricSchema>;
export type ActiveWorkoutStateInput = z.input<typeof ActiveWorkoutStateSchema>;
