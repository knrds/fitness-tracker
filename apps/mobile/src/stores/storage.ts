import { PersistStorage, StorageValue } from 'zustand/middleware';
import { MMKV } from 'react-native-mmkv';
import { z } from 'zod';

type WebStorageLike = {
  getItem: (key: string) => string | null;
  removeItem: (key: string) => void;
};

const reviveDates = (key: string, value: unknown) => {
  if (typeof value === 'string' && /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/.test(value)) {
    return new Date(value);
  }
  return value;
};

const getWebLocalStorage = (): WebStorageLike | null => {
  const host = globalThis as typeof globalThis & {
    window?: { localStorage?: WebStorageLike };
  };
  return host.window?.localStorage ?? null;
};

const getTemporaryWebStorageItem = (name: string): string | null => {
  const webStorage = getWebLocalStorage();
  if (!webStorage) return null;

  try {
    return webStorage.getItem(name);
  } catch {
    return null;
  }
};

const removeTemporaryWebStorageItem = (name: string) => {
  const webStorage = getWebLocalStorage();
  if (!webStorage) return;

  try {
    webStorage.removeItem(name);
  } catch {
    // Ignore locked-down browser storage.
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
      const mmkvValue = storage.getString(name);
      const temporaryWebValue = mmkvValue == null ? getTemporaryWebStorageItem(name) : null;
      const str = mmkvValue ?? temporaryWebValue;
      if (!str) return null;

      try {
        const parsed = JSON.parse(str, reviveDates) as StorageValue<T>;
        if (mmkvValue == null && temporaryWebValue != null) {
          storage.set(name, temporaryWebValue);
          removeTemporaryWebStorageItem(name);
        }
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
    },
    setItem: (name: string, value: StorageValue<T>) => {
      storage.set(name, JSON.stringify(value));
    },
    removeItem: (name: string) => {
      storage.delete(name);
    },
  };
}
