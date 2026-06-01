import { create } from 'zustand';
import { persist, PersistStorage } from 'zustand/middleware';
import { MMKV } from 'react-native-mmkv';
import { 
  ActiveWorkoutState, 
  SessionExercise, 
  ExerciseSet, 
  UUID,
} from '@fitness-tracker/domain';
import * as Crypto from 'expo-crypto';

const storage = new MMKV({ id: 'workout-storage' });

// Custom JSON reviver to correctly hydrate Date objects from MMKV
const reviveDates = (key: string, value: any) => {
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
  setItem: (name: string, value: any) => {
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
  pauseWorkout: () => void;
  resumeWorkout: () => void;
  finishWorkout: () => void;
  resetWorkout: () => void;
  addExercise: (exerciseId: UUID) => void;
  addSet: (sessionExerciseId: UUID, set: Partial<ExerciseSet>) => void;
  updateSet: (sessionExerciseId: UUID, setId: UUID, updates: Partial<ExerciseSet>) => void;
  completeSet: (sessionExerciseId: UUID, setId: UUID) => void;
  
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

      pauseWorkout: () => set({ status: 'paused', lastUpdatedAt: new Date() }),
      
      resumeWorkout: () => set({ status: 'active', lastUpdatedAt: new Date() }),
      
      finishWorkout: () => set({ status: 'finished', lastUpdatedAt: new Date() }),
      
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

      startRestTimer: (durationSeconds) => set({
        restTimer: {
          isRunning: true,
          durationSeconds,
          endsAt: new Date(Date.now() + durationSeconds * 1000),
        },
        lastUpdatedAt: new Date(),
      }),

      stopRestTimer: () => set((state) => {
        const { endsAt, ...restTimer } = state.restTimer;
        return {
          restTimer: {
            ...restTimer,
            isRunning: false,
          },
          lastUpdatedAt: new Date(),
        };
      }),
      
      resetRestTimer: () => set((state) => {
        const { endsAt, ...restTimer } = state.restTimer;
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
          const { endsAt, ...restTimer } = state.restTimer;
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
