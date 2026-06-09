import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import {
  ActiveWorkoutState,
  SessionExercise,
  ExerciseSet,
  UUID,
  WorkoutSession,
  WorkoutTemplate,
  UnitSystem,
  ActiveWorkoutStatusSchema,
  SessionExerciseSchema,
} from '@fitness-tracker/domain';
import * as Crypto from 'expo-crypto';
import { z } from 'zod';
import { useHistoryStore } from './historyStore';
import { useAchievementStore } from './achievementStore';
import { useExerciseStore } from './exerciseStore';
import { useCaffeineStore } from './caffeineStore';
import { getCurrentUserId } from './local-user';
import { createHydratedStorage } from './storage';

const workoutPersistedSchema = z.object({
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
});

const defaultState = {
  status: 'idle' as const,
  sessionId: undefined as UUID | undefined,
  templateId: undefined as UUID | undefined,
  programId: undefined as UUID | undefined,
  name: '',
  elapsedSeconds: 0,
  currentExerciseIndex: 0,
  currentSetIndex: 0,
  exercises: [] as SessionExercise[],
  restTimer: {
    isRunning: false,
    durationSeconds: 90,
  },
  notes: '',
  startedAt: undefined as Date | undefined,
  pausedAt: undefined as Date | undefined,
  accumulatedPauseMs: 0,
  lastFinishedSession: undefined as WorkoutSession | undefined,
};

const removeSupersetGroup = (exercise: SessionExercise): SessionExercise => {
  const nextExercise = { ...exercise };
  delete nextExercise.supersetGroup;
  return nextExercise;
};

const createSetFromPreviousPerformance = (set: ExerciseSet, index: number): ExerciseSet => ({
  id: Crypto.randomUUID(),
  setNumber: index + 1,
  type: set.type,
  completed: false,
  ...(set.weight !== undefined ? { weight: set.weight } : {}),
  ...(set.reps !== undefined ? { reps: set.reps } : {}),
  ...(set.rpe !== undefined ? { rpe: set.rpe } : {}),
  ...(set.rir !== undefined ? { rir: set.rir } : {}),
  ...(set.restSeconds !== undefined ? { restSeconds: set.restSeconds } : {}),
  ...(set.durationSeconds !== undefined ? { durationSeconds: set.durationSeconds } : {}),
  ...(set.distanceMeters !== undefined ? { distanceMeters: set.distanceMeters } : {}),
  ...(set.notes !== undefined ? { notes: set.notes } : {}),
});

export interface WorkoutActions {
  startWorkout: (name?: string) => void;
  startWorkoutFromTemplate: (template: WorkoutTemplate, programId?: UUID) => void;
  startWorkoutFromSession: (session: WorkoutSession) => void;
  pauseWorkout: () => void;
  resumeWorkout: () => void;
  finishWorkout: () => WorkoutSession | null;
  resetWorkout: () => void;
  addExercise: (exerciseId: UUID) => void;
  removeExercise: (sessionExerciseId: UUID) => void;
  addSet: (sessionExerciseId: UUID, set?: Partial<ExerciseSet>) => void;
  updateSet: (sessionExerciseId: UUID, setId: UUID, updates: Partial<ExerciseSet>) => void;
  completeSet: (sessionExerciseId: UUID, setId: UUID) => void;
  removeSet: (sessionExerciseId: UUID, setId: UUID) => void;

  // Timer Actions
  startRestTimer: (durationSeconds: number) => void;
  stopRestTimer: () => void;
  resetRestTimer: () => void;
  tickRestTimer: () => void;
  tickWorkoutTimer: (seconds: number) => void;

  // New Actions
  updateWorkoutNotes: (notes: string) => void;
  updateExerciseNotes: (sessionExerciseId: UUID, notes: string) => void;
  calculateWarmupSets: (
    sessionExerciseId: UUID,
    targetWeight: number,
    unitSystem?: UnitSystem,
  ) => void;
  toggleSuperset: (sessionExerciseId: UUID) => void;
  clearLastFinishedSession: () => void;
  reorderExercises: (exercises: SessionExercise[]) => void;
}

export type WorkoutStore = Omit<
  ActiveWorkoutState,
  'startedAt' | 'pausedAt' | 'sessionId' | 'templateId' | 'programId'
> & {
  sessionId: UUID | undefined;
  templateId: UUID | undefined;
  programId: UUID | undefined;
  notes: string;
  startedAt: Date | undefined;
  pausedAt: Date | undefined;
  accumulatedPauseMs: number;
  lastFinishedSession: WorkoutSession | undefined;
} & WorkoutActions;

export const useWorkoutStore = create<WorkoutStore>()(
  persist(
    (set, get) => ({
      ...defaultState,
      lastUpdatedAt: new Date(),

      startWorkout: (name = 'New Workout') => {
        useCaffeineStore.getState().resetCurrentWorkout();
        set({
          ...defaultState,
          status: 'active',
          name,
          startedAt: new Date(),
          sessionId: Crypto.randomUUID(),
          lastUpdatedAt: new Date(),
        });
      },

      startWorkoutFromSession: (session) => {
        useCaffeineStore.getState().resetCurrentWorkout();
        set(() => {
          const exercises: SessionExercise[] = session.exercises.map((sEx) => {
            const sets: ExerciseSet[] = sEx.sets.map((sSet) => ({
              id: Crypto.randomUUID(),
              setNumber: sSet.setNumber,
              type: sSet.type,
              completed: false,
              ...(sSet.weight !== undefined ? { weight: sSet.weight } : {}),
              ...(sSet.reps !== undefined ? { reps: sSet.reps } : {}),
              ...(sSet.rpe !== undefined ? { rpe: sSet.rpe } : {}),
            }));
            return {
              id: Crypto.randomUUID(),
              exerciseId: sEx.exerciseId,
              order: sEx.order,
              sets,
              ...(sEx.notes !== undefined ? { notes: sEx.notes } : {}),
            };
          });

          return {
            ...defaultState,
            status: 'active',
            name: session.name,
            startedAt: new Date(),
            sessionId: Crypto.randomUUID(),
            templateId: undefined,
            programId: undefined,
            exercises,
            lastUpdatedAt: new Date(),
          };
        });
      },

      startWorkoutFromTemplate: (template, programId) => {
        useCaffeineStore.getState().resetCurrentWorkout();
        set(() => {
          const exercises: SessionExercise[] = template.exercises.map((tEx) => {
            const sets: ExerciseSet[] = [];
            for (let j = 0; j < tEx.targetSets; j++) {
              const set: ExerciseSet = {
                id: Crypto.randomUUID(),
                setNumber: j + 1,
                type: 'working',
                completed: false,
                ...(tEx.targetWeight !== undefined ? { weight: tEx.targetWeight } : {}),
                ...(tEx.targetReps !== undefined ? { reps: tEx.targetReps } : {}),
                ...(tEx.targetRpe !== undefined ? { rpe: tEx.targetRpe } : {}),
              };
              sets.push(set);
            }
            const sessionEx: SessionExercise = {
              id: Crypto.randomUUID(),
              exerciseId: tEx.exerciseId,
              order: tEx.order,
              sets,
              ...(tEx.notes !== undefined ? { notes: tEx.notes } : {}),
            };
            return sessionEx;
          });

          return {
            ...defaultState,
            status: 'active',
            name: template.name,
            startedAt: new Date(),
            sessionId: Crypto.randomUUID(),
            templateId: template.id,
            programId,
            exercises,
            lastUpdatedAt: new Date(),
          };
        });
      },

      pauseWorkout: () =>
        set((state) => {
          if (state.status !== 'active') return {};
          const now = new Date();
          const startedAt = state.startedAt || now;
          const currentElapsed = Math.floor(
            (now.getTime() - startedAt.getTime() - state.accumulatedPauseMs) / 1000,
          );
          return {
            status: 'paused',
            pausedAt: now,
            elapsedSeconds: Math.max(0, currentElapsed),
            lastUpdatedAt: now,
          };
        }),

      resumeWorkout: () =>
        set((state) => {
          if (state.status !== 'paused') return {};
          const now = new Date();
          const pausedDuration = state.pausedAt ? now.getTime() - state.pausedAt.getTime() : 0;
          return {
            status: 'active',
            pausedAt: undefined,
            accumulatedPauseMs: state.accumulatedPauseMs + pausedDuration,
            lastUpdatedAt: now,
          };
        }),

      finishWorkout: () => {
        const state = get();
        if (state.status !== 'active' && state.status !== 'paused') {
          return null;
        }

        // Guard against sessions without any completed sets
        const hasCompletedSet = state.exercises.some((ex) => ex.sets.some((s) => s.completed));

        if (!hasCompletedSet) {
          // Reset active workout but do NOT save or award XP
          set({ ...defaultState, status: 'idle', lastUpdatedAt: new Date() });
          return null;
        }

        const completedAt = new Date();
        const endTime = state.pausedAt || completedAt;
        const startedAt = state.startedAt || completedAt;
        const durationSeconds = Math.floor(
          (endTime.getTime() - startedAt.getTime() - state.accumulatedPauseMs) / 1000,
        );

        const session: WorkoutSession = {
          id: state.sessionId || Crypto.randomUUID(),
          userId: getCurrentUserId(),
          name: state.name,
          ...(state.templateId ? { templateId: state.templateId } : {}),
          ...(state.programId ? { programId: state.programId } : {}),
          startedAt,
          completedAt,
          durationSeconds: Math.max(0, durationSeconds),
          exercises: state.exercises,
          ...(state.notes ? { notes: state.notes } : {}),
          createdAt: new Date(),
          updatedAt: new Date(),
        };

        useCaffeineStore.getState().captureFinishedWorkout();
        set({
          ...defaultState,
          status: 'finished',
          lastUpdatedAt: completedAt,
          lastFinishedSession: session,
        });
        useHistoryStore.getState().addSession(session);
        useAchievementStore.getState().awardXpAndCheckAchievements(session);
        return session;
      },

      clearLastFinishedSession: () => set({ lastFinishedSession: undefined }),

      resetWorkout: () => set({ ...defaultState, lastUpdatedAt: new Date() }),

      addExercise: (exerciseId) =>
        set((state) => {
          const previousPerformance = useHistoryStore.getState().getPreviousPerformance(exerciseId);
          const previousSets =
            previousPerformance?.sets.map((set, index) =>
              createSetFromPreviousPerformance(set, index),
            ) ?? [];
          const newExercise: SessionExercise = {
            id: Crypto.randomUUID(),
            exerciseId,
            order: state.exercises.length,
            sets:
              previousSets.length > 0
                ? previousSets
                : [
                    {
                      id: Crypto.randomUUID(),
                      setNumber: 1,
                      type: 'working',
                      completed: false,
                      weight: 0,
                      reps: 0,
                    },
                  ],
          };
          return {
            exercises: [...state.exercises, newExercise],
            lastUpdatedAt: new Date(),
          };
        }),

      removeExercise: (sessionExerciseId) =>
        set((state) => ({
          exercises: state.exercises.filter((ex) => ex.id !== sessionExerciseId),
          lastUpdatedAt: new Date(),
        })),

      addSet: (sessionExerciseId, setPartial = {}) =>
        set((state) => {
          const exercises = state.exercises.map((ex) => {
            if (ex.id !== sessionExerciseId) return ex;

            const lastSet = ex.sets[ex.sets.length - 1];
            const defaults: Partial<ExerciseSet> = {};
            if (lastSet) {
              if (lastSet.weight !== undefined) defaults.weight = lastSet.weight;
              if (lastSet.reps !== undefined) defaults.reps = lastSet.reps;
              if (lastSet.rpe !== undefined) defaults.rpe = lastSet.rpe;
              if (lastSet.rir !== undefined) defaults.rir = lastSet.rir;
              if (lastSet.type !== undefined) defaults.type = lastSet.type;
            }

            const newSet: ExerciseSet = {
              id: Crypto.randomUUID(),
              setNumber: ex.sets.length + 1,
              type: 'working',
              completed: false,
              ...defaults,
              ...setPartial,
            };
            return { ...ex, sets: [...ex.sets, newSet] };
          });
          return { exercises, lastUpdatedAt: new Date() };
        }),

      updateSet: (sessionExerciseId, setId, updates) =>
        set((state) => {
          const exercises = state.exercises.map((ex) => {
            if (ex.id !== sessionExerciseId) return ex;
            const sets = ex.sets.map((s) => (s.id === setId ? { ...s, ...updates } : s));
            return { ...ex, sets };
          });
          return { exercises, lastUpdatedAt: new Date() };
        }),

      completeSet: (sessionExerciseId, setId) =>
        set((state) => {
          let wasCompleted = false;
          const exercises = state.exercises.map((ex) => {
            if (ex.id !== sessionExerciseId) return ex;
            const sets = ex.sets.map((s) => {
              if (s.id === setId) {
                wasCompleted = s.completed;
                const nextCompleted = !s.completed;
                const updatedSet: ExerciseSet = {
                  ...s,
                  completed: nextCompleted,
                };
                if (nextCompleted) {
                  updatedSet.completedAt = new Date();
                } else {
                  delete updatedSet.completedAt;
                }
                return updatedSet;
              }
              return s;
            });
            return { ...ex, sets };
          });

          if (wasCompleted) {
            return {
              exercises,
              lastUpdatedAt: new Date(),
            };
          }

          // Auto-start rest timer
          const exercise = state.exercises.find((ex) => ex.id === sessionExerciseId);
          const durationSeconds = exercise
            ? useExerciseStore.getState().exerciseRestDurations[exercise.exerciseId] ||
              state.restTimer.durationSeconds ||
              90
            : state.restTimer.durationSeconds || 90;

          return {
            exercises,
            lastUpdatedAt: new Date(),
            restTimer: {
              isRunning: true,
              durationSeconds,
              endsAt: new Date(Date.now() + durationSeconds * 1000),
            },
          };
        }),

      removeSet: (sessionExerciseId, setId) =>
        set((state) => {
          const exercises = state.exercises.map((ex) => {
            if (ex.id !== sessionExerciseId) return ex;
            const sets = ex.sets
              .filter((s) => s.id !== setId)
              .map((s, index) => ({ ...s, setNumber: index + 1 }));
            return { ...ex, sets };
          });
          return { exercises, lastUpdatedAt: new Date() };
        }),

      startRestTimer: (durationSeconds) =>
        set({
          restTimer: {
            isRunning: true,
            durationSeconds,
            endsAt: new Date(Date.now() + durationSeconds * 1000),
          },
          lastUpdatedAt: new Date(),
        }),

      stopRestTimer: () =>
        set((state) => {
          return {
            restTimer: {
              isRunning: false,
              durationSeconds: state.restTimer.durationSeconds,
            },
            lastUpdatedAt: new Date(),
          };
        }),

      resetRestTimer: () =>
        set({
          restTimer: {
            isRunning: false,
            durationSeconds: 90,
          },
          lastUpdatedAt: new Date(),
        }),

      tickRestTimer: () =>
        set((state) => {
          if (!state.restTimer.isRunning || !state.restTimer.endsAt) return state;

          if (new Date() >= state.restTimer.endsAt) {
            return {
              restTimer: {
                isRunning: false,
                durationSeconds: state.restTimer.durationSeconds,
              },
              lastUpdatedAt: new Date(),
            };
          }
          return state;
        }),

      tickWorkoutTimer: (seconds) =>
        set((state) => {
          // Kept for backward compatibility, but primarily timer is derived in UI.
          if (state.status !== 'active') return state;
          return {
            elapsedSeconds: state.elapsedSeconds + seconds,
            lastUpdatedAt: new Date(),
          };
        }),

      updateWorkoutNotes: (notes) =>
        set({
          notes,
          lastUpdatedAt: new Date(),
        }),

      updateExerciseNotes: (sessionExerciseId, notes) =>
        set((state) => {
          const exercises = state.exercises.map((ex) => {
            if (ex.id !== sessionExerciseId) return ex;
            return { ...ex, notes };
          });
          return { exercises, lastUpdatedAt: new Date() };
        }),

      calculateWarmupSets: (sessionExerciseId, targetWeight, unitSystem = 'metric') =>
        set((state) => {
          const isImperial = unitSystem === 'imperial';
          const roundStep = isImperial ? 5 : 2.5;

          const roundToStep = (val: number) => {
            return Math.round(val / roundStep) * roundStep;
          };

          const warmupWeightsDisplay = [
            roundToStep(targetWeight * 0.5),
            roundToStep(targetWeight * 0.7),
            roundToStep(targetWeight * 0.9),
          ];

          const warmupReps = [10, 5, 2];

          const exercises = state.exercises.map((ex) => {
            if (ex.id !== sessionExerciseId) return ex;

            // Filter out existing warmup sets
            const existingWorkingSets = ex.sets.filter((s) => s.type !== 'warmup');

            // Generate 3 warmup sets
            const newWarmupSets: ExerciseSet[] = warmupWeightsDisplay.map((weightDisplay, idx) => {
              const weightKg = isImperial ? weightDisplay / 2.20462 : weightDisplay;
              return {
                id: Crypto.randomUUID(),
                setNumber: idx + 1,
                type: 'warmup',
                completed: false,
                weight: weightKg,
                reps: warmupReps[idx]!,
              };
            });

            // Merge them and recalculate setNumber
            const mergedSets = [...newWarmupSets, ...existingWorkingSets].map((s, idx) => ({
              ...s,
              setNumber: idx + 1,
            }));

            return { ...ex, sets: mergedSets };
          });

          return { exercises, lastUpdatedAt: new Date() };
        }),

      toggleSuperset: (sessionExerciseId) =>
        set((state) => {
          const index = state.exercises.findIndex((ex) => ex.id === sessionExerciseId);
          if (index === -1) return {};

          const exercise = state.exercises[index]!;
          let exercises = [...state.exercises];

          if (exercise.supersetGroup) {
            // Already in a superset: remove it.
            const group = exercise.supersetGroup;
            const inGroup = exercises.filter((ex) => ex.supersetGroup === group);

            if (inGroup.length <= 2) {
              // If only 2 or fewer, dissolve the entire superset group
              exercises = exercises.map((ex) => {
                if (ex.supersetGroup === group) {
                  return removeSupersetGroup(ex);
                }
                return ex;
              });
            } else {
              // Just remove the current exercise
              exercises = exercises.map((ex) => {
                if (ex.id === sessionExerciseId) {
                  return removeSupersetGroup(ex);
                }
                return ex;
              });
            }
          } else {
            // Link with the next exercise
            if (index < exercises.length - 1) {
              const nextExercise = exercises[index + 1]!;
              const newGroup = nextExercise.supersetGroup || Crypto.randomUUID();
              exercises = exercises.map((ex, idx) => {
                if (idx === index || idx === index + 1) {
                  return { ...ex, supersetGroup: newGroup };
                }
                return ex;
              });
            }
          }

          return { exercises, lastUpdatedAt: new Date() };
        }),

      reorderExercises: (exercises) =>
        set({
          exercises: exercises.map((ex, idx) => ({ ...ex, order: idx })),
          lastUpdatedAt: new Date(),
        }),
    }),
    {
      name: 'workout-storage',
      storage: createHydratedStorage('workout-storage', workoutPersistedSchema, defaultState),
      version: 1,
      migrate: (persistedState) => {
        const parsed = workoutPersistedSchema.safeParse(persistedState);
        return parsed.success ? parsed.data : defaultState;
      },
    },
  ),
);
