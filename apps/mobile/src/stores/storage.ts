import { PersistStorage, StorageValue } from 'zustand/middleware';
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

const getTemporaryWebStorageItem = (name: string) => {
  if (typeof globalThis === 'undefined' || !('localStorage' in globalThis)) return null;

  try {
    return globalThis.localStorage.getItem(name);
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

  const storage = new MMKV({ id: storageId });

  return {
    getItem: (name: string) => {
      const storedValue = storage.getString(name);
      if (storedValue) {
        return parseStoredValue(storageId, schema, defaultPersistedState, storedValue);
      }

      const temporaryWebValue = getTemporaryWebStorageItem(name);
      if (temporaryWebValue) {
        storage.set(name, temporaryWebValue);
        try {
          globalThis.localStorage.removeItem(name);
        } catch {
          // Ignore browsers that block localStorage cleanup.
        }
        return parseStoredValue(storageId, schema, defaultPersistedState, temporaryWebValue);
      }

      return null;
    },
    setItem: (name: string, value: StorageValue<T>) => {
      storage.set(name, JSON.stringify(value));
    },
    removeItem: (name: string) => {
      storage.delete(name);
    },
  };
}
