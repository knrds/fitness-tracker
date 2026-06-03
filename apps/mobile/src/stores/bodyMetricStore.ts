import { create } from 'zustand';
import { persist, PersistStorage } from 'zustand/middleware';
import { MMKV } from 'react-native-mmkv';
import { BodyMetric, UUID } from '@fitness-tracker/domain';
import * as Crypto from 'expo-crypto';

const storage = new MMKV({ id: 'body-metric-storage' });

const reviveDates = (key: string, value: unknown) => {
  if (typeof value === 'string' && /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/.test(value)) {
    return new Date(value);
  }
  return value;
};

const customStorage: PersistStorage<BodyMetricStore> = {
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

export interface BodyMetricStore {
  metrics: BodyMetric[];
  addMetric: (metric: Omit<BodyMetric, 'id' | 'userId' | 'createdAt'>) => void;
  deleteMetric: (id: UUID) => void;
  getMetricHistory: (type: 'weight' | 'fat' | 'measurements') => BodyMetric[];
  getLatestMetric: () => BodyMetric | null;
  clearMetrics: () => void;
}

export const useBodyMetricStore = create<BodyMetricStore>()(
  persist(
    (set, get) => ({
      metrics: [],

      addMetric: (metric) => set((state) => {
        const newMetric: BodyMetric = {
          ...metric,
          id: Crypto.randomUUID(),
          userId: 'local-user',
          createdAt: new Date(),
        };
        // Sort descending: newest first
        const updated = [...state.metrics, newMetric].sort((a, b) => b.recordedAt.getTime() - a.recordedAt.getTime());
        return { metrics: updated };
      }),

      deleteMetric: (id) => set((state) => ({
        metrics: state.metrics.filter(m => m.id !== id)
      })),

      getMetricHistory: (type) => {
        const metrics = get().metrics;
        // Return metrics filtered by the presence of specific attributes, sorted oldest first (for charts)
        if (type === 'weight') {
          return [...metrics].filter(m => m.weightKg !== undefined).reverse();
        }
        if (type === 'fat') {
          return [...metrics].filter(m => m.bodyFatPercentage !== undefined).reverse();
        }
        if (type === 'measurements') {
          return [...metrics].filter(m => m.measurements !== undefined).reverse();
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
      storage: customStorage,
      version: 1,
    }
  )
);
