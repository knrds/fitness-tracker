import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { 
  WorkoutSession, 
  UUID, 
  ExerciseSet, 
  WorkoutSessionSchema,
  calculateStreak,
  estimateOneRepMax
} from '@fitness-tracker/domain';
import { z } from 'zod';
import { createHydratedStorage } from './storage';

export interface HistoryStore {
  sessions: WorkoutSession[];
  addSession: (session: WorkoutSession) => void;
  deleteSession: (id: UUID) => void;
  clearHistory: () => void;
  getSessionsByDateDesc: () => WorkoutSession[];
  getStreak: () => number;
  getPRs: () => Record<string, number>;
  getExerciseVolumeHistory: (exerciseId: UUID) => { date: Date; volume: number }[];
  getPreviousPerformance: (exerciseId: UUID) => { date: Date; sets: ExerciseSet[] } | null;
}

const historyPersistedSchema = z.object({
  sessions: z.array(WorkoutSessionSchema),
});

type HistoryPersistedState = z.infer<typeof historyPersistedSchema>;

const defaultPersistedState: HistoryPersistedState = {
  sessions: [],
};

export const useHistoryStore = create<HistoryStore>()(
  persist(
    (set, get) => ({
      sessions: [],

      addSession: (session) => set((state) => ({
        sessions: [...state.sessions, session]
      })),

      deleteSession: (id) => set((state) => ({
        sessions: state.sessions.filter(s => s.id !== id)
      })),

      clearHistory: () => set({ sessions: [] }),

      getSessionsByDateDesc: () => {
        return [...get().sessions].sort((a, b) => b.startedAt.getTime() - a.startedAt.getTime());
      },

      getStreak: () => {
        return calculateStreak(get().sessions);
      },

      getPRs: () => {
        const prs: Record<string, number> = {};
        get().sessions.forEach(session => {
          session.exercises.forEach(ex => {
            ex.sets.forEach(set => {
              // Exclude warmup sets and verify weight and reps are set
              if (set.completed && set.weight && set.reps && set.type !== 'warmup') {
                const e1rm = estimateOneRepMax(set.weight, set.reps);
                if (!prs[ex.exerciseId] || e1rm > prs[ex.exerciseId]!) {
                  prs[ex.exerciseId] = e1rm;
                }
              }
            });
          });
        });
        return prs;
      },

      getExerciseVolumeHistory: (exerciseId) => {
        const history: { date: Date; volume: number }[] = [];
        const sessions = get().getSessionsByDateDesc().reverse(); // Chronological for charts
        
        sessions.forEach(session => {
          let volume = 0;
          session.exercises.forEach(ex => {
            if (ex.exerciseId === exerciseId) {
              ex.sets.forEach(set => {
                // Exclude warmup sets for volume calculation
                if (set.completed && set.weight && set.reps && set.type !== 'warmup') {
                  volume += set.weight * set.reps;
                }
              });
            }
          });
          if (volume > 0) {
            history.push({ date: session.startedAt, volume });
          }
        });
        
        return history;
      },

      getPreviousPerformance: (exerciseId) => {
        const sortedSessions = get().getSessionsByDateDesc();
        for (const session of sortedSessions) {
          const sessionEx = session.exercises.find(ex => ex.exerciseId === exerciseId);
          if (sessionEx && sessionEx.sets.some(s => s.completed)) {
            return {
              date: session.startedAt,
              sets: sessionEx.sets.filter(s => s.completed)
            };
          }
        }
        return null;
      }
    }),
    {
      name: 'history-storage',
      storage: createHydratedStorage('history-storage', historyPersistedSchema, defaultPersistedState),
      version: 1,
    }
  )
);
