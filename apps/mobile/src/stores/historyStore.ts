import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import {
  WorkoutSession,
  UUID,
  PreviousExercisePerformance,
  PreviousPerformanceOptions,
  calculateStreak,
  getBestWeights,
  summarizeSessionExercise,
  getPreviousExercisePerformance,
} from '@fitness-tracker/domain';
import { z } from 'zod';
import { createHydratedStorage } from './storage';
import { useSyncStore } from './syncStore';

export interface HistoryStore {
  sessions: WorkoutSession[];
  addSession: (session: WorkoutSession) => void;
  updateSession: (session: WorkoutSession) => void;
  deleteSession: (id: UUID) => void;
  clearHistory: () => void;
  getSessionsByDateDesc: () => WorkoutSession[];
  getStreak: () => number;
  getPRs: () => Record<string, number>;
  getExerciseVolumeHistory: (exerciseId: UUID) => { date: Date; volume: number }[];
  getPreviousPerformance: (
    exerciseId: UUID,
    occurrenceIndex?: number,
    options?: PreviousPerformanceOptions,
  ) => PreviousExercisePerformance | null;
}

import { historyPersistedSchema } from '../data/persistedContracts';

type HistoryPersistedState = z.infer<typeof historyPersistedSchema>;

const defaultPersistedState: HistoryPersistedState = {
  sessions: [],
};

export const useHistoryStore = create<HistoryStore>()(
  persist(
    (set, get) => ({
      sessions: [],

      addSession: (session) =>
        set((state) => {
          useSyncStore.getState().addToQueue('workout_sessions', 'INSERT', session);
          return {
            sessions: [...state.sessions, session],
          };
        }),

      updateSession: (updatedSession) =>
        set((state) => {
          useSyncStore.getState().addToQueue('workout_sessions', 'UPDATE', updatedSession);
          return {
            sessions: state.sessions.map((s) =>
              s.id === updatedSession.id ? updatedSession : s,
            ),
          };
        }),

      deleteSession: (id) =>
        set((state) => {
          useSyncStore.getState().addToQueue('workout_sessions', 'DELETE', { id });
          return {
            sessions: state.sessions.filter((s) => s.id !== id),
          };
        }),

      clearHistory: () => set({ sessions: [] }),

      getSessionsByDateDesc: () => {
        return [...get().sessions].sort((a, b) => b.startedAt.getTime() - a.startedAt.getTime());
      },

      getStreak: () => {
        return calculateStreak(get().sessions);
      },

      getPRs: () => getBestWeights(get().sessions),

      getExerciseVolumeHistory: (exerciseId) => {
        const history: { date: Date; volume: number }[] = [];
        const sessions = get().getSessionsByDateDesc().reverse(); // Chronological for charts

        sessions.forEach((session) => {
          const volume = session.exercises
            .filter((ex) => ex.exerciseId === exerciseId)
            .reduce((sum, ex) => sum + summarizeSessionExercise(ex).totalVolume, 0);
          if (volume > 0) {
            history.push({ date: session.startedAt, volume });
          }
        });

        return history;
      },

      getPreviousPerformance: (exerciseId, occurrenceIndex = 0, options) =>
        getPreviousExercisePerformance(get().sessions, exerciseId, occurrenceIndex, options),
    }),
    {
      name: 'history-storage',
      storage: createHydratedStorage(
        'history-storage',
        historyPersistedSchema,
        defaultPersistedState,
      ),
      version: 1,
      migrate: (persistedState) => {
        const parsed = historyPersistedSchema.safeParse(persistedState);
        return parsed.success ? parsed.data : defaultPersistedState;
      },
    },
  ),
);
