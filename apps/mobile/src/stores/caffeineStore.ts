import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { z } from 'zod';

import { createHydratedStorage } from './storage';

export interface CaffeinePreset {
  id: string;
  name: string;
  servingLabel: string;
  caffeineMg: number;
  category: 'coffee' | 'energy' | 'tea' | 'preworkout' | 'soft_drink';
}

export const CAFFEINE_PRESETS: CaffeinePreset[] = [
  { id: 'espresso', name: 'Espresso', servingLabel: '1 shot', caffeineMg: 63, category: 'coffee' },
  { id: 'filter-coffee', name: 'Filter Coffee', servingLabel: '250 ml', caffeineMg: 95, category: 'coffee' },
  { id: 'cold-brew', name: 'Cold Brew', servingLabel: '330 ml', caffeineMg: 180, category: 'coffee' },
  { id: 'black-tea', name: 'Black Tea', servingLabel: '250 ml', caffeineMg: 47, category: 'tea' },
  { id: 'green-tea', name: 'Green Tea', servingLabel: '250 ml', caffeineMg: 28, category: 'tea' },
  { id: 'cola', name: 'Cola', servingLabel: '330 ml', caffeineMg: 32, category: 'soft_drink' },
  { id: 'red-bull', name: 'Red Bull', servingLabel: '250 ml', caffeineMg: 80, category: 'energy' },
  { id: 'monster', name: 'Monster Energy', servingLabel: '500 ml', caffeineMg: 160, category: 'energy' },
  { id: 'rockstar', name: 'Rockstar Energy', servingLabel: '500 ml', caffeineMg: 160, category: 'energy' },
  { id: 'preworkout', name: 'Pre-Workout Scoop', servingLabel: '1 scoop', caffeineMg: 250, category: 'preworkout' },
];

export type CaffeineWarningLevel = 'normal' | 'high' | 'extreme';

export function getCaffeineWarningLevel(caffeineMg: number): CaffeineWarningLevel {
  if (caffeineMg >= 600) return 'extreme';
  if (caffeineMg >= 400) return 'high';
  return 'normal';
}

interface CaffeineState {
  isEnabled: boolean;
  currentWorkoutMg: number;
  lastWorkoutMg: number;
  setEnabled: (enabled: boolean) => void;
  addPreset: (presetId: string) => void;
  addCustomAmount: (amountMg: number) => void;
  setCurrentWorkoutMg: (amountMg: number) => void;
  captureFinishedWorkout: () => void;
  resetCurrentWorkout: () => void;
}

const caffeinePersistedSchema = z.object({
  isEnabled: z.boolean(),
  currentWorkoutMg: z.number().int().nonnegative(),
  lastWorkoutMg: z.number().int().nonnegative(),
});

type CaffeinePersistedState = z.infer<typeof caffeinePersistedSchema>;

const defaultPersistedState: CaffeinePersistedState = {
  isEnabled: true,
  currentWorkoutMg: 0,
  lastWorkoutMg: 0,
};

const normalizeCaffeine = (amountMg: number) => Math.max(0, Math.round(amountMg));

export const useCaffeineStore = create<CaffeineState>()(
  persist(
    (set, get) => ({
      ...defaultPersistedState,

      setEnabled: (enabled) => set({ isEnabled: enabled }),

      addPreset: (presetId) => {
        const preset = CAFFEINE_PRESETS.find((item) => item.id === presetId);
        if (!preset) return;
        set((state) => ({
          currentWorkoutMg: normalizeCaffeine(state.currentWorkoutMg + preset.caffeineMg),
        }));
      },

      addCustomAmount: (amountMg) =>
        set((state) => ({
          currentWorkoutMg: normalizeCaffeine(state.currentWorkoutMg + amountMg),
        })),

      setCurrentWorkoutMg: (amountMg) => set({ currentWorkoutMg: normalizeCaffeine(amountMg) }),

      captureFinishedWorkout: () => {
        set({ lastWorkoutMg: get().currentWorkoutMg });
      },

      resetCurrentWorkout: () => set({ currentWorkoutMg: 0 }),
    }),
    {
      name: 'caffeine-storage',
      storage: createHydratedStorage(
        'caffeine-storage',
        caffeinePersistedSchema,
        defaultPersistedState,
      ),
      partialize: (state) => ({
        isEnabled: state.isEnabled,
        currentWorkoutMg: state.currentWorkoutMg,
        lastWorkoutMg: state.lastWorkoutMg,
      }),
      version: 1,
      migrate: (persistedState) => {
        const parsed = caffeinePersistedSchema.safeParse(persistedState);
        return parsed.success ? parsed.data : defaultPersistedState;
      },
    },
  ),
);
