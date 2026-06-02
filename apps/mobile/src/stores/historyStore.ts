import { create } from 'zustand';
import { persist, PersistStorage } from 'zustand/middleware';
import { MMKV } from 'react-native-mmkv';
import { WorkoutSession, UUID } from '@fitness-tracker/domain';

const storage = new MMKV({ id: 'history-storage' });

const reviveDates = (key: string, value: unknown) => {
  if (typeof value === 'string' && /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/.test(value)) {
    return new Date(value);
  }
  return value;
};

const customStorage: PersistStorage<HistoryStore> = {
  getItem: (name: string) => {
    const str = storage.getString(name);
    if (!str) return null;
    return JSON.parse(str, reviveDates as (key: string, value: unknown) => unknown);
  },
  setItem: (name: string, value: unknown) => {
    storage.set(name, JSON.stringify(value));
  },
  removeItem: (name: string) => storage.delete(name),
};

export interface HistoryStore {
  sessions: WorkoutSession[];
  addSession: (session: WorkoutSession) => void;
  deleteSession: (id: UUID) => void;
  clearHistory: () => void;
  getSessionsByDateDesc: () => WorkoutSession[];
  getStreak: () => number;
  getPRs: () => Record<string, number>;
  getExerciseVolumeHistory: (exerciseId: UUID) => { date: Date; volume: number }[];
}

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
        const sessions = get().getSessionsByDateDesc();
        if (sessions.length === 0) return 0;
        
        let streak = 0;
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        if (sessions.length > 0) {
           const latestDate = new Date(sessions[0]!.startedAt);
           latestDate.setHours(0, 0, 0, 0);
           const diffDays = Math.floor((today.getTime() - latestDate.getTime()) / (1000 * 3600 * 24));
           if (diffDays > 1) return 0; // Streak broken
        }

        const uniqueDates = new Set<string>();
        sessions.forEach(s => {
          const d = new Date(s.startedAt);
          d.setHours(0, 0, 0, 0);
          uniqueDates.add(d.toISOString());
        });

        const checkDate = new Date(today);
        if (!uniqueDates.has(checkDate.toISOString())) {
          checkDate.setDate(checkDate.getDate() - 1);
        }

        while (uniqueDates.has(checkDate.toISOString())) {
          streak++;
          checkDate.setDate(checkDate.getDate() - 1);
        }

        return streak;
      },

      getPRs: () => {
        const prs: Record<string, number> = {};
        get().sessions.forEach(session => {
          session.exercises.forEach(ex => {
            ex.sets.forEach(set => {
              if (set.completed && set.weight) {
                if (!prs[ex.exerciseId] || set.weight > prs[ex.exerciseId]!) {
                  prs[ex.exerciseId] = set.weight;
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
                if (set.completed && set.weight && set.reps) {
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
      }
    }),
    {
      name: 'history-storage',
      storage: customStorage,
      version: 1,
    }
  )
);
