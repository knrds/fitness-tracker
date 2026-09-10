import { PersistStorage, StorageValue } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { MMKV } from 'react-native-mmkv';
import { z } from 'zod';
import { isExpoGo } from '../utils/runtime';
import { useStorageHealth } from './storageHealth';
import { getDeviceDatabase, usesDeviceDatabase } from '../data/deviceDatabase';
import { areStorageWritesSuspended } from '../data/storageTransaction';

const backupCleaners = new Map<string, () => void | Promise<void>>();
export async function clearStorageBackups() {
  const results = await Promise.allSettled(
    [...backupCleaners.values()].map((clear) => Promise.resolve().then(clear)),
  );
  if (results.some((result) => result.status === 'rejected')) {
    throw new Error('Local backup deletion failed');
  }
  getDeviceDatabase()?.clearLegacyBackups();
}

const envelopeSchema = z.object({
  state: z.unknown(),
  version: z.number().int().nonnegative().optional(),
});
export class StorageHydrationError extends Error {
  constructor(storageId: string) {
    super('Stored data could not be safely loaded: ' + storageId);
    this.name = 'StorageHydrationError';
  }
}
function decode<T extends object>(
  raw: string,
  schema: z.ZodType<T>,
  maxVersion: number,
): StorageValue<T> {
  // Decode dates only through field schemas, never by changing arbitrary text.
  const envelope = envelopeSchema.parse(JSON.parse(raw));
  if ((envelope.version ?? 0) > maxVersion) throw new Error('Unsupported storage version');
  const state = schema.parse(envelope.state);
  return envelope.version === undefined ? { state } : { state, version: envelope.version };
}
function temporaryValue(name: string): string | null {
  // Denied reads must propagate; treating them as empty can overwrite existing data.
  const host = globalThis as typeof globalThis & { window?: { localStorage?: Storage } };
  return host.window?.localStorage?.getItem(name) ?? null;
}
export function createHydratedStorage<T extends object>(
  storageId: string,
  schema: z.ZodType<T>,
  _defaultPersistedState: T,
  supportedVersion = 1,
): PersistStorage<T> {
  if (!('window' in globalThis)) {
    return { getItem: () => null, setItem: () => undefined, removeItem: () => undefined };
  }
  let mmkv: MMKV | null = null;
  if (!isExpoGo) {
    try {
      mmkv = new MMKV({ id: storageId });
    } catch {
      console.warn('[Storage] Using AsyncStorage for ' + storageId);
    }
  }
  // Also protects the interval before asynchronous hydration completes.
  let writable = false;
  const failRead = (): never => {
    writable = false;
    useStorageHealth.getState().block(storageId);
    throw new StorageHydrationError(storageId);
  };
  const accept = (raw: string | null | undefined): StorageValue<T> | null => {
    const result = raw == null ? null : decode(raw, schema, supportedVersion);
    writable = true;
    useStorageHealth.getState().clear(storageId);
    return result;
  };
  const allowWrite = () => {
    if (areStorageWritesSuspended()) return false;
    if (writable) return true;
    useStorageHealth.getState().block(storageId);
    return false;
  };
  const backupKey = (name: string) => name + '.pre-rebuild-backup';
  const observedNames = new Set<string>();
  if (usesDeviceDatabase) {
    const legacy = mmkv;
    backupCleaners.set(storageId, async () => {
      // After explicit local reset, remove retained legacy sources as well as backups.
      for (const name of observedNames) {
        legacy?.delete(name);
        legacy?.delete(backupKey(name));
      }
      await AsyncStorage.multiRemove([...observedNames].flatMap((name) => [name, backupKey(name)]));
    });
    return {
      getItem: async (name) => {
        observedNames.add(name);
        writable = false;
        try {
          const database = getDeviceDatabase();
          if (!database) return failRead();
          if (database.hasImported(name)) return accept(database.read(name));
          const raw = legacy?.getString(name) ?? (await AsyncStorage.getItem(name));
          const validated = raw == null ? null : decode(raw, schema, supportedVersion);
          database.importLegacy(name, raw, validated == null ? null : JSON.stringify(validated));
          return accept(database.read(name));
        } catch {
          return failRead();
        }
      },
      setItem: (name, value) => {
        if (!allowWrite()) {
          if (!areStorageWritesSuspended()) throw new StorageHydrationError(storageId);
          return;
        }
        const database = getDeviceDatabase();
        if (!database) throw new Error('Native database unavailable');
        const validated = { ...value, state: schema.parse(value.state) };
        database.write(name, JSON.stringify(validated));
      },
      removeItem: (name) => {
        if (allowWrite()) getDeviceDatabase()?.remove(name);
      },
    };
  }
  if (mmkv) {
    const storage = mmkv;
    backupCleaners.set(storageId, () => {
      observedNames.forEach((name) => storage.delete(backupKey(name)));
    });
    return {
      getItem: (name) => {
        observedNames.add(name);
        writable = false;
        try {
          const raw = storage.getString(name) ?? temporaryValue(name);
          // Preserve original bytes before validation or Zustand migrations.
          if (raw != null && storage.getString(backupKey(name)) == null)
            storage.set(backupKey(name), raw);
          return accept(raw);
        } catch {
          return failRead();
        }
      },
      setItem: (name, value) => {
        if (allowWrite()) storage.set(name, JSON.stringify(value));
      },
      removeItem: (name) => {
        if (allowWrite()) storage.delete(name);
      },
    };
  }

  backupCleaners.set(storageId, async () => {
    await AsyncStorage.multiRemove([...observedNames].map(backupKey));
  });
  return {
    getItem: async (name) => {
      observedNames.add(name);
      writable = false;
      try {
        const raw = (await AsyncStorage.getItem(name)) ?? temporaryValue(name);
        if (raw != null && (await AsyncStorage.getItem(backupKey(name))) == null)
          await AsyncStorage.setItem(backupKey(name), raw);
        return accept(raw);
      } catch {
        return failRead();
      }
    },
    setItem: async (name, value) => {
      if (allowWrite()) await AsyncStorage.setItem(name, JSON.stringify(value));
    },
    removeItem: async (name) => {
      if (allowWrite()) await AsyncStorage.removeItem(name);
    },
  };
}
