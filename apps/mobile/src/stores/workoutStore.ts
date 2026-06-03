import { create } from 'zustand';
import { persist, PersistStorage } from 'zustand/middleware';
import { MMKV } from 'react-native-mmkv';
import { 
  ActiveWorkoutState, 
  SessionExercise, 
  ExerciseSet, 
  UUID,
  WorkoutSession,
  WorkoutTemplate
} from '@fitness-tracker/domain';
import * as Crypto from 'expo-crypto';
import { useHistoryStore } from './historyStore';
import { useAchievementStore } from './achievementStore';

const storage = new MMKV({ id: 'workout-storage' });

// Custom JSON reviver to correctly hydrate Date objects from MMKV
const reviveDates = (key: string, value: unknown) => {
  if (typeof value === 'string' && /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/.test(value)) {
    return new Date(value);
  }
  return value;
};

const customStorage: PersistStorage<WorkoutStore> = {
  getItem: (name: string) => {
    const str = storage.getString(name);
    if (!str) return null;
    return JSON.parse(str, reviveDates);
  },
  setItem: (name: string, value: unknown) => {
    storage.set(name, JSON.stringify(value));
  },
  removeItem: (name: string) => storage.delete(name),
};

const defaultState: ActiveWorkoutState = {
  status: 'idle',
  name: '',
  elapsedSeconds: 0,
  currentExerciseIndex: 0,
  currentSetIndex: 0,
  exercises: [],
  restTimer: {
    isRunning: false,
    durationSeconds: 90,
  },
  lastUpdatedAt: new Date(),
};

export interface WorkoutActions {
  startWorkout: (name?: string) => void;
  startWorkoutFromTemplate: (template: WorkoutTemplate, programId?: UUID) => void;
  startWorkoutFromSession: (session: WorkoutSession) => void;
  pauseWorkout: () => void;
  resumeWorkout: () => void;
  finishWorkout: () => void;
  resetWorkout: () => void;
  addExercise: (exerciseId: UUID) => void;
  removeExercise: (sessionExerciseId: UUID) => void;
  addSet: (sessionExerciseId: UUID, set: Partial<ExerciseSet>) => void;
  updateSet: (sessionExerciseId: UUID, setId: UUID, updates: Partial<ExerciseSet>) => void;
  completeSet: (sessionExerciseId: UUID, setId: UUID) => void;
  removeSet: (sessionExerciseId: UUID, setId: UUID) => void;
  
  // Timer Actions
  startRestTimer: (durationSeconds: number) => void;
  stopRestTimer: () => void;
  resetRestTimer: () => void;
  tickRestTimer: () => void;
  tickWorkoutTimer: (seconds: number) => void;
}

export type WorkoutStore = ActiveWorkoutState & WorkoutActions;

export const useWorkoutStore = create<WorkoutStore>()(
  persist(
    (set, get) => ({
      ...defaultState,

      startWorkout: (name = 'New Workout') => set({
        ...defaultState,
        status: 'active',
        name,
        startedAt: new Date(),
        sessionId: Crypto.randomUUID(),
        lastUpdatedAt: new Date(),
      }),

      startWorkoutFromSession: (session) => set(() => {
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
          exercises,
          lastUpdatedAt: new Date(),
        };
      }),

      startWorkoutFromTemplate: (template, programId) => set(() => {
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
          ...(programId ? { programId } : {}),
          exercises,
          lastUpdatedAt: new Date(),
        };
      }),

      pauseWorkout: () => set({ status: 'paused', lastUpdatedAt: new Date() }),
      
      resumeWorkout: () => set({ status: 'active', lastUpdatedAt: new Date() }),
      
      finishWorkout: () => {
        const state = get();
        if (state.status === 'active' || state.status === 'paused') {
          const session = {
            id: state.sessionId || Crypto.randomUUID(),
            userId: 'local-user',
            name: state.name,
            templateId: state.templateId,
            programId: state.programId,
            startedAt: state.startedAt || new Date(),
            completedAt: new Date(),
            durationSeconds: state.elapsedSeconds,
            exercises: state.exercises,
            createdAt: new Date(),
            updatedAt: new Date(),
          } as WorkoutSession;
          useHistoryStore.getState().addSession(session);
          useAchievementStore.getState().awardXpAndCheckAchievements(session);
        }
        set({ status: 'finished', lastUpdatedAt: new Date() });
      },
      
      resetWorkout: () => set({ ...defaultState }),

      addExercise: (exerciseId) => set((state) => {
        const newExercise: SessionExercise = {
          id: Crypto.randomUUID(),
          exerciseId,
          order: state.exercises.length,
          sets: [],
        };
        return { 
          exercises: [...state.exercises, newExercise],
          lastUpdatedAt: new Date(),
        };
      }),

      removeExercise: (sessionExerciseId) => set((state) => ({
        exercises: state.exercises.filter(ex => ex.id !== sessionExerciseId),
        lastUpdatedAt: new Date(),
      })),

      addSet: (sessionExerciseId, setPartial) => set((state) => {
        const exercises = state.exercises.map(ex => {
          if (ex.id !== sessionExerciseId) return ex;
          
          const newSet: ExerciseSet = {
            id: Crypto.randomUUID(),
            setNumber: ex.sets.length + 1,
            type: 'working',
            completed: false,
            ...setPartial,
          };
          return { ...ex, sets: [...ex.sets, newSet] };
        });
        return { exercises, lastUpdatedAt: new Date() };
      }),

      updateSet: (sessionExerciseId, setId, updates) => set((state) => {
        const exercises = state.exercises.map(ex => {
          if (ex.id !== sessionExerciseId) return ex;
          const sets = ex.sets.map(s => s.id === setId ? { ...s, ...updates } : s);
          return { ...ex, sets };
        });
        return { exercises, lastUpdatedAt: new Date() };
      }),

      completeSet: (sessionExerciseId, setId) => set((state) => {
        const exercises = state.exercises.map(ex => {
          if (ex.id !== sessionExerciseId) return ex;
          const sets = ex.sets.map(s => 
            s.id === setId ? { ...s, completed: true, completedAt: new Date() } : s
          );
          return { ...ex, sets };
        });
        
        // Auto-start rest timer
        const durationSeconds = state.restTimer.durationSeconds || 90;
        
        return { 
          exercises, 
          lastUpdatedAt: new Date(),
          restTimer: {
            isRunning: true,
            durationSeconds,
            endsAt: new Date(Date.now() + durationSeconds * 1000),
          }
        };
      }),

      removeSet: (sessionExerciseId, setId) => set((state) => {
        const exercises = state.exercises.map(ex => {
          if (ex.id !== sessionExerciseId) return ex;
          return { ...ex, sets: ex.sets.filter(s => s.id !== setId) };
        });
        return { exercises, lastUpdatedAt: new Date() };
      }),

      startRestTimer: (durationSeconds) => set({
        restTimer: {
          isRunning: true,
          durationSeconds,
          endsAt: new Date(Date.now() + durationSeconds * 1000),
        },
        lastUpdatedAt: new Date(),
      }),

      stopRestTimer: () => set((state) => {
        const restTimer = { ...state.restTimer };
        delete restTimer.endsAt;
        return {
          restTimer: {
            ...restTimer,
            isRunning: false,
          },
          lastUpdatedAt: new Date(),
        };
      }),
      
      resetRestTimer: () => set((state) => {
        const restTimer = { ...state.restTimer };
        delete restTimer.endsAt;
        return {
          restTimer: {
            ...restTimer,
            isRunning: false,
            durationSeconds: 90,
          },
          lastUpdatedAt: new Date(),
        };
      }),

      tickRestTimer: () => set((state) => {
        if (!state.restTimer.isRunning || !state.restTimer.endsAt) return state;
        
        if (new Date() >= state.restTimer.endsAt) {
          const restTimer = { ...state.restTimer };
          delete restTimer.endsAt;
          return {
            restTimer: {
              ...restTimer,
              isRunning: false,
            },
            lastUpdatedAt: new Date(),
          };
        }
        return state; // return state to avoid re-renders if nothing changed
      }),

      tickWorkoutTimer: (seconds) => set((state) => {
        if (state.status !== 'active') return state;
        return {
          elapsedSeconds: state.elapsedSeconds + seconds,
          lastUpdatedAt: new Date(),
        };
      })
    }),
    {
      name: 'workout-storage',
      storage: customStorage,
      version: 1,
    }
  )
);
