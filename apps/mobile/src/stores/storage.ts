import { PersistStorage } from 'zustand/middleware';
import { MMKV } from 'react-native-mmkv';
import { z } from 'zod';

const reviveDates = (key: string, value: unknown) => {
  if (typeof value === 'string' && /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/.test(value)) {
    return new Date(value);
  }
  return value;
};

export function createHydratedStorage<T extends object>(
  storageId: string,
  schema: z.ZodType<T>,
  defaultPersistedState: T
): PersistStorage<any> {
  const storage = new MMKV({ id: storageId });

  return {
    getItem: (name: string) => {
      const str = storage.getString(name);
      if (!str) return null;

      try {
        const parsed = JSON.parse(str, reviveDates);
        if (parsed && parsed.state) {
          const validation = schema.safeParse(parsed.state);
          if (!validation.success) {
            console.warn(
              `[Storage Hydration] Zod validation failed for store "${storageId}", resetting data fields to defaults. Error:`,
              validation.error
            );
            return {
              ...parsed,
              state: {
                ...parsed.state,
                ...defaultPersistedState,
              },
            };
          }
        }
        return parsed;
      } catch (e) {
        console.warn(`[Storage Hydration] Failed to parse store "${storageId}" JSON:`, e);
        return null;
      }
    },
    setItem: (name: string, value: any) => {
      storage.set(name, JSON.stringify(value));
    },
    removeItem: (name: string) => {
      storage.delete(name);
    },
  };
}
