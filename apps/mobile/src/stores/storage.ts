import { PersistStorage, StorageValue } from 'zustand/middleware';
import { Platform } from 'react-native';
import { MMKV } from 'react-native-mmkv';
import { z } from 'zod';

const reviveDates = (key: string, value: unknown) => {
  if (typeof value === 'string' && /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/.test(value)) {
    return new Date(value);
  }
  return value;
};

const parseStoredValue = <T extends object>(
  storageId: string,
  schema: z.ZodType<T>,
  defaultPersistedState: T,
  str: string | null | undefined,
) => {
  if (!str) return null;

  try {
    const parsed = JSON.parse(str, reviveDates) as StorageValue<T>;
    if (parsed && parsed.state) {
      const validation = schema.safeParse(parsed.state);
      if (!validation.success) {
        console.warn(
          `[Storage Hydration] Zod validation failed for store "${storageId}", resetting data fields to defaults. Error:`,
          validation.error,
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
};

const getLocalStorage = () => {
  if (
    Platform.OS !== 'web' ||
    typeof globalThis === 'undefined' ||
    !('localStorage' in globalThis)
  ) {
    return null;
  }

  try {
    const storage = globalThis.localStorage;
    const probeKey = '__fitness_tracker_storage_probe__';
    storage.setItem(probeKey, '1');
    storage.removeItem(probeKey);
    return storage;
  } catch {
    return null;
  }
};

export function createHydratedStorage<T extends object>(
  storageId: string,
  schema: z.ZodType<T>,
  defaultPersistedState: T,
): PersistStorage<T> {
  const isServer = typeof globalThis === 'undefined' || !('window' in globalThis);

  if (isServer) {
    return {
      getItem: () => null,
      setItem: () => {},
      removeItem: () => {},
    };
  }

  const localStorage = getLocalStorage();
  if (localStorage) {
    return {
      getItem: (name: string) =>
        parseStoredValue(storageId, schema, defaultPersistedState, localStorage.getItem(name)),
      setItem: (name: string, value: StorageValue<T>) => {
        localStorage.setItem(name, JSON.stringify(value));
      },
      removeItem: (name: string) => {
        localStorage.removeItem(name);
      },
    };
  }

  const storage = new MMKV({ id: storageId });

  return {
    getItem: (name: string) => {
      return parseStoredValue(storageId, schema, defaultPersistedState, storage.getString(name));
    },
    setItem: (name: string, value: StorageValue<T>) => {
      storage.set(name, JSON.stringify(value));
    },
    removeItem: (name: string) => {
      storage.delete(name);
    },
  };
}
