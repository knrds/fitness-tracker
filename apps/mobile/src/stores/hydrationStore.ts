import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { formatDateLocal } from '@fitness-tracker/domain';
import { z } from 'zod';

import { createHydratedStorage } from './storage';

interface HydrationState {
  dateKey: string;
  dailyGoalMl: number;
  todayIntakeMl: number;
  addWater: (amountMl: number) => void;
  removeWater: (amountMl: number) => void;
  setDailyGoal: (goalMl: number) => void;
  resetToday: () => void;
}

const getTodayKey = () => formatDateLocal(new Date());

const hydrationPersistedSchema = z.object({
  dateKey: z.string(),
  dailyGoalMl: z.number().int().positive(),
  todayIntakeMl: z.number().int().nonnegative(),
});

type HydrationPersistedState = z.infer<typeof hydrationPersistedSchema>;

const defaultPersistedState: HydrationPersistedState = {
  dateKey: getTodayKey(),
  dailyGoalMl: 2500,
  todayIntakeMl: 0,
};

const normalizeStateForToday = (state: HydrationPersistedState): HydrationPersistedState => {
  const today = getTodayKey();
  if (state.dateKey === today) return state;
  return {
    ...state,
    dateKey: today,
    todayIntakeMl: 0,
  };
};

export const useHydrationStore = create<HydrationState>()(
  persist(
    (set) => ({
      ...defaultPersistedState,

      addWater: (amountMl) =>
        set((state) => {
          const normalized = normalizeStateForToday(state);
          return {
            ...normalized,
            todayIntakeMl: Math.max(0, normalized.todayIntakeMl + Math.round(amountMl)),
          };
        }),

      removeWater: (amountMl) =>
        set((state) => {
          const normalized = normalizeStateForToday(state);
          return {
            ...normalized,
            todayIntakeMl: Math.max(0, normalized.todayIntakeMl - Math.round(amountMl)),
          };
        }),

      setDailyGoal: (goalMl) =>
        set((state) => ({
          ...normalizeStateForToday(state),
          dailyGoalMl: Math.max(250, Math.round(goalMl)),
        })),

      resetToday: () =>
        set((state) => ({
          ...normalizeStateForToday(state),
          todayIntakeMl: 0,
        })),
    }),
    {
      name: 'hydration-storage',
      storage: createHydratedStorage(
        'hydration-storage',
        hydrationPersistedSchema,
        defaultPersistedState,
      ),
      partialize: (state) => ({
        dateKey: state.dateKey,
        dailyGoalMl: state.dailyGoalMl,
        todayIntakeMl: state.todayIntakeMl,
      }),
      version: 1,
      migrate: (persistedState) => {
        const parsed = hydrationPersistedSchema.safeParse(persistedState);
        return parsed.success ? normalizeStateForToday(parsed.data) : defaultPersistedState;
      },
      onRehydrateStorage: () => (state) => {
        if (state) {
          const normalized = normalizeStateForToday(state);
          state.dateKey = normalized.dateKey;
          state.todayIntakeMl = normalized.todayIntakeMl;
        }
      },
    },
  ),
);
