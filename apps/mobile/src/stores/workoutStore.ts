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
  createPlannedSet,
  repeatSessionExercises,
  startTemplateExercises,
} from '@fitness-tracker/domain';
import * as Crypto from 'expo-crypto';
import { workoutPersistedSchema } from '../data/persistedContracts';
import { useHistoryStore } from './historyStore';
import { useAchievementStore } from './achievementStore';
import { useExerciseStore } from './exerciseStore';
import { useCaffeineStore } from './caffeineStore';
import { getCurrentUserId } from './local-user';
import { createHydratedStorage } from './storage';
import { useSyncStore } from './syncStore';
import {
  isStorageTransactionActive,
  runStorageTransaction,
  withoutStorageWrites,
} from '../data/storageTransaction';
import { useStorageHealth } from './storageHealth';

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
  isMinimized: false,
};

const removeSupersetGroup = (exercise: SessionExercise): SessionExercise => {
  const nextExercise = { ...exercise };
  delete nextExercise.supersetGroup;
  return nextExercise;
};

const createSetFromPreviousPerformance = (set: ExerciseSet, index: number): ExerciseSet =>
  createPlannedSet(set, index, Crypto.randomUUID);

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
  setMinimized: (minimized: boolean) => void;
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
  isMinimized: boolean;
} & WorkoutActions;

export const useWorkoutStore = create<WorkoutStore>()(
  persist(
    (persistSet, get, api) => {
      const set = (
        partial: Partial<WorkoutStore> | ((state: WorkoutStore) => Partial<WorkoutStore>),
      ) => {
        const previous = get();
        try {
          persistSet(partial);
        } catch (error) {
          // Synchronous native IO errors must not leave the UI showing an unsaved set.
          withoutStorageWrites(() => api.setState(previous, true));
          if (isStorageTransactionActive()) throw error;
          useStorageHealth.getState().reportWriteError();
        }
      };
      return {
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
            const exercises = repeatSessionExercises(session.exercises, Crypto.randomUUID);

            return {
              ...defaultState,
              status: 'active',
              name: session.name,
              notes: session.notes ?? '',
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
            const exercises = startTemplateExercises(template.exercises, Crypto.randomUUID);

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
            // Discarding uncompleted work requires an explicit user action in the UI.
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

          const history = useHistoryStore.getState();
          const achievements = useAchievementStore.getState();
          const caffeine = useCaffeineStore.getState();
          const sync = useSyncStore.getState();
          runStorageTransaction(
            () => {
              // Native: history, queue, rewards, caffeine and active state share one SQLite commit.
              history.addSession(session);
              achievements.awardXpAndCheckAchievements(session);
              caffeine.captureFinishedWorkout();
              set({
                ...defaultState,
                status: 'finished',
                lastUpdatedAt: completedAt,
                lastFinishedSession: session,
              });
            },
            () => {
              api.setState(state, true);
              useHistoryStore.setState(history, true);
              useAchievementStore.setState(achievements, true);
              useCaffeineStore.setState(caffeine, true);
              useSyncStore.setState(sync, true);
            },
          );
          return session;
        },

        clearLastFinishedSession: () => set({ lastFinishedSession: undefined }),

        resetWorkout: () => set({ ...defaultState, lastUpdatedAt: new Date() }),

        addExercise: (exerciseId) =>
          set((state) => {
            const previousPerformance = useHistoryStore
              .getState()
              .getPreviousPerformance(
                exerciseId,
                state.exercises.filter((ex) => ex.exerciseId === exerciseId).length,
              );
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
              const newSet: ExerciseSet = {
                ...(lastSet
                  ? createPlannedSet(lastSet, ex.sets.length, Crypto.randomUUID)
                  : {
                      id: Crypto.randomUUID(),
                      setNumber: ex.sets.length + 1,
                      type: 'working' as const,
                      completed: false,
                    }),
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
            const exercise = state.exercises.find((ex) => ex.id === sessionExerciseId);
            const targetSet = exercise?.sets.find((set) => set.id === setId);
            if (!exercise || !targetSet) return {};
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
            const durationSeconds =
              targetSet.restSeconds ??
              useExerciseStore.getState().exerciseRestDurations[exercise.exerciseId] ??
              state.restTimer.durationSeconds ??
              90;

            return {
              exercises,
              lastUpdatedAt: new Date(),
              restTimer: {
                isRunning: durationSeconds > 0,
                durationSeconds,
                ...(durationSeconds > 0
                  ? { endsAt: new Date(Date.now() + durationSeconds * 1000) }
                  : {}),
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
              const newWarmupSets: ExerciseSet[] = warmupWeightsDisplay.map(
                (weightDisplay, idx) => {
                  const weightKg = isImperial ? weightDisplay / 2.20462 : weightDisplay;
                  return {
                    id: Crypto.randomUUID(),
                    setNumber: idx + 1,
                    type: 'warmup',
                    completed: false,
                    weight: weightKg,
                    reps: warmupReps[idx]!,
                  };
                },
              );

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

        setMinimized: (minimized) =>
          set({
            isMinimized: minimized,
            lastUpdatedAt: new Date(),
          }),
      };
    },
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
