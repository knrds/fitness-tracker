import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { BodyMetric, UUID, BodyMetricSchema } from '@fitness-tracker/domain';
import * as Crypto from 'expo-crypto';
import { z } from 'zod';

import { getCurrentUserId } from './local-user';
import { createHydratedStorage } from './storage';
import { useSyncStore } from './syncStore';

export interface BodyMetricStore {
  metrics: BodyMetric[];
  addMetric: (metric: Omit<BodyMetric, 'id' | 'userId' | 'createdAt'>) => void;
  deleteMetric: (id: UUID) => void;
  getMetricHistory: (type: 'weight' | 'fat' | 'measurements') => BodyMetric[];
  getLatestMetric: () => BodyMetric | null;
  clearMetrics: () => void;
}

const bodyMetricPersistedSchema = z.object({
  metrics: z.array(BodyMetricSchema),
});

type BodyMetricPersistedState = z.infer<typeof bodyMetricPersistedSchema>;

const defaultPersistedState: BodyMetricPersistedState = {
  metrics: [],
};

export const useBodyMetricStore = create<BodyMetricStore>()(
  persist(
    (set, get) => ({
      metrics: [],

      addMetric: (metric) =>
        set((state) => {
          const newMetric: BodyMetric = {
            ...metric,
            id: Crypto.randomUUID(),
            userId: getCurrentUserId(),
            createdAt: new Date(),
          };
          useSyncStore.getState().addToQueue('body_metrics', 'INSERT', newMetric);
          // Sort descending: newest first
          const updated = [...state.metrics, newMetric].sort(
            (a, b) => b.recordedAt.getTime() - a.recordedAt.getTime(),
          );
          return { metrics: updated };
        }),

      deleteMetric: (id) =>
        set((state) => {
          useSyncStore.getState().addToQueue('body_metrics', 'DELETE', { id });
          return {
            metrics: state.metrics.filter((m) => m.id !== id),
          };
        }),

      getMetricHistory: (type) => {
        const metrics = get().metrics;
        // Return metrics filtered by the presence of specific attributes, sorted oldest first (for charts)
        if (type === 'weight') {
          return [...metrics].filter((m) => m.weightKg !== undefined).reverse();
        }
        if (type === 'fat') {
          return [...metrics].filter((m) => m.bodyFatPercentage !== undefined).reverse();
        }
        if (type === 'measurements') {
          return [...metrics].filter((m) => m.measurements !== undefined).reverse();
        }
        return metrics;
      },

      getLatestMetric: () => {
        const metrics = get().metrics;
        if (metrics.length === 0) return null;
        return metrics[0] || null;
      },

      clearMetrics: () => set({ metrics: [] }),
    }),
    {
      name: 'body-metric-storage',
      storage: createHydratedStorage(
        'body-metric-storage',
        bodyMetricPersistedSchema,
        defaultPersistedState,
      ),
      version: 1,
      migrate: (persistedState) => {
        const parsed = bodyMetricPersistedSchema.safeParse(persistedState);
        return parsed.success ? parsed.data : defaultPersistedState;
      },
    },
  ),
);
