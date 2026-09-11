import { z } from 'zod';
import {
  ActiveWorkoutStatusSchema,
  SessionExerciseSchema,
  UUIDSchema,
  WorkoutSessionSchema,
  SyncOperationSchema,
} from '@fitness-tracker/domain';

export const workoutPersistedSchema = z.object({
  sessionId: UUIDSchema.optional(),
  templateId: UUIDSchema.optional(),
  programId: UUIDSchema.optional(),
  lastFinishedSession: WorkoutSessionSchema.optional(),
  lastUpdatedAt: z.coerce.date().optional(),
  status: ActiveWorkoutStatusSchema,
  name: z.string(),
  elapsedSeconds: z.number(),
  currentExerciseIndex: z.number().int(),
  currentSetIndex: z.number().int(),
  exercises: z.array(SessionExerciseSchema),
  restTimer: z.object({
    isRunning: z.boolean(),
    durationSeconds: z.number().int().nonnegative(),
    endsAt: z.coerce.date().optional(),
  }),
  notes: z.string(),
  startedAt: z.coerce.date().optional(),
  pausedAt: z.coerce.date().optional(),
  accumulatedPauseMs: z.number().int().nonnegative(),
  isMinimized: z.boolean().optional(),
});

export const historyPersistedSchema = z.object({ sessions: z.array(WorkoutSessionSchema) });
export const syncPersistedSchema = z.object({
  queue: z.array(SyncOperationSchema),
  lastSyncedAt: z.coerce.date().nullable(),
  isOnline: z.boolean(),
});
