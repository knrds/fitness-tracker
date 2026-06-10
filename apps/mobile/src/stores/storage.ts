import { PersistStorage, StorageValue } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
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

const createMMKVStorage = (storageId: string): MMKV | null => {
  try {
    return new MMKV({ id: storageId });
  } catch (error) {
    console.warn(
      `[Storage] MMKV is unavailable for "${storageId}". Falling back to AsyncStorage.`,
      error,
    );
    return null;
  }
};

const parsePersistedValue = <T extends object>(
  storageId: string,
  schema: z.ZodType<T>,
  defaultPersistedState: T,
  str: string,
): StorageValue<T> | null => {
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
  } catch (error) {
    console.warn(`[Storage Hydration] Failed to parse store "${storageId}" JSON:`, error);
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

  const storage = createMMKVStorage(storageId);

  if (storage) {
    return {
      getItem: (name: string) => {
        const mmkvValue = storage.getString(name);
        const temporaryWebValue = mmkvValue == null ? getTemporaryWebStorageItem(name) : null;
        const str = mmkvValue ?? temporaryWebValue;
        if (!str) return null;

        if (mmkvValue == null && temporaryWebValue != null) {
          storage.set(name, temporaryWebValue);
          removeTemporaryWebStorageItem(name);
        }

        return parsePersistedValue(storageId, schema, defaultPersistedState, str);
      },
      setItem: (name: string, value: StorageValue<T>) => {
        storage.set(name, JSON.stringify(value));
      },
      removeItem: (name: string) => {
        storage.delete(name);
      },
    };
  }

  return {
    getItem: async (name: string) => {
      const asyncStorageValue = await AsyncStorage.getItem(name);
      const temporaryWebValue =
        asyncStorageValue == null ? getTemporaryWebStorageItem(name) : null;
      const str = asyncStorageValue ?? temporaryWebValue;
      if (!str) return null;

      if (asyncStorageValue == null && temporaryWebValue != null) {
        await AsyncStorage.setItem(name, temporaryWebValue);
        removeTemporaryWebStorageItem(name);
      }

      return parsePersistedValue(storageId, schema, defaultPersistedState, str);
    },
    setItem: async (name: string, value: StorageValue<T>) => {
      await AsyncStorage.setItem(name, JSON.stringify(value));
    },
    removeItem: async (name: string) => {
      await AsyncStorage.removeItem(name);
    },
  };
}
