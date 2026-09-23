import { PersistStorage, StorageValue } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { MMKV } from 'react-native-mmkv';
import { z } from 'zod';
import { isExpoGo } from '../utils/runtime';
import { logger } from '../utils/logger';
import { useStorageHealth } from './storageHealth';
import { getDeviceDatabase, usesDeviceDatabase } from '../data/deviceDatabase';
import { areStorageWritesSuspended } from '../data/storageTransaction';
import { getStorageScope, isSameScope, scopedStorageKey, StorageScope } from '../data/storageScope';

const backupCleaners = new Map<string, (scope: StorageScope) => void | Promise<void>>();
export async function clearStorageBackups() {
  const scope = getStorageScope();
  const results = await Promise.allSettled(
    [...backupCleaners.values()].map((clear) => Promise.resolve().then(() => clear(scope))),
  );
  if (results.some((result) => result.status === 'rejected')) {
    throw new Error('Local backup deletion failed');
  }
  getDeviceDatabase()?.clearLegacyBackups(scope.partition);
  if (!isSameScope(scope)) throw new Error('Account changed during local reset');
}

export const LEGACY_STORAGE_IDS = [
  'history-storage',
  'exercise-storage',
  'workout-storage',
  'program-storage',
  'profile-storage',
  'body-metric-storage',
  'achievement-storage',
  'hydration-storage',
  'caffeine-storage',
  'volt-coach-store',
  'volt-sync-store',
  'notification-preferences-storage',
] as const;

export async function purgeLegacyPartition(): Promise<void> {
  const host = globalThis as typeof globalThis & { window?: { localStorage?: Storage } };
  for (const id of LEGACY_STORAGE_IDS) {
    if (!isExpoGo) {
      try {
        const mmkv = new MMKV({ id });
        mmkv.delete(id);
        mmkv.delete(id + '.pre-rebuild-backup');
      } catch {
        // ignore if mmkv not initialized or not supported
      }
    }
    if (host.window?.localStorage) {
      try {
        host.window.localStorage.removeItem(id);
        host.window.localStorage.removeItem(id + '.pre-rebuild-backup');
      } catch {
        // ignore
      }
    }
  }
  try {
    const keysToRemove = LEGACY_STORAGE_IDS.flatMap((id) => [id, id + '.pre-rebuild-backup']);
    await AsyncStorage.multiRemove(keysToRemove);
  } catch {
    // ignore
  }
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
interface DecodeOptions<T> {
  storageId: string;
  schema: z.ZodType<T>;
  maxVersion: number;
  defaultState?: T;
}

function decode<T extends object>(
  raw: string,
  options: DecodeOptions<T>,
): StorageValue<T> {
  const { storageId, schema, maxVersion, defaultState } = options;
  // Decode dates only through field schemas, never by changing arbitrary text.
  const envelope = envelopeSchema.parse(JSON.parse(raw));

  if ((envelope.version ?? 0) > maxVersion) {
    useStorageHealth.getState().reportDiagnostic?.({
      storageId,
      code: 'UNSUPPORTED_VERSION',
      fieldPath: `version: ${envelope.version} > max: ${maxVersion}`,
      timestamp: Date.now(),
    });
    throw new Error('Unsupported storage version');
  }

  // Level 1: Normal schema parse (also applies schema defaults and transformations)
  const primaryParse = schema.safeParse(envelope.state);
  if (primaryParse.success) {
    useStorageHealth.getState().clearDiagnostic?.(storageId);
    return envelope.version === undefined
      ? { state: primaryParse.data }
      : { state: primaryParse.data, version: envelope.version };
  }

  // Level 2 (Version Migration Support):
  // If version is an older version than maxVersion and failed direct schema parse,
  // pass the raw state to Zustand so its persist migrate(persistedState, version) can handle it!
  if (envelope.version !== undefined && envelope.version < maxVersion) {
    return { state: envelope.state as T, version: envelope.version };
  }

  // Level 3: Safe field-level repair for non-critical additive/optional fields
  if (
    defaultState &&
    typeof envelope.state === 'object' &&
    envelope.state !== null &&
    !Array.isArray(envelope.state)
  ) {
    const mergedCandidate = { ...defaultState, ...(envelope.state as Record<string, unknown>) };
    const repairedParse = schema.safeParse(mergedCandidate);
    if (repairedParse.success) {
      logger.warn(`[Storage] Safely repaired missing non-critical fields in ${storageId}`);
      useStorageHealth.getState().clearDiagnostic?.(storageId);
      return envelope.version === undefined
        ? { state: repairedParse.data }
        : { state: repairedParse.data, version: envelope.version };
    }
  }

  // Level 4: Report exact non-PII diagnostic metadata before failing
  const firstIssue = primaryParse.error.issues[0];
  const fieldPath = firstIssue?.path?.join('.') || 'root';
  logger.warn(
    `[Storage] Hydration validation failure in ${storageId} at ${fieldPath}: ${firstIssue?.message}`,
  );
  useStorageHealth.getState().reportDiagnostic?.({
    storageId,
    code: 'SCHEMA_VALIDATION_ERROR',
    fieldPath: `${fieldPath}: ${firstIssue?.message}`,
    timestamp: Date.now(),
  });

  throw new StorageHydrationError(storageId);
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
      logger.warn('[Storage] Using AsyncStorage for ' + storageId);
    }
  }
  // Also protects the interval before asynchronous hydration completes.
  let writable = false;
  let loadedScope = getStorageScope();
  const failRead = (): never => {
    writable = false;
    useStorageHealth.getState().block(storageId);
    throw new StorageHydrationError(storageId);
  };
  const accept = (raw: string | null | undefined): StorageValue<T> | null => {
    const result =
      raw == null
        ? null
        : decode(raw, {
            storageId,
            schema,
            maxVersion: supportedVersion,
            defaultState: _defaultPersistedState,
          });
    writable = true;
    useStorageHealth.getState().clear(storageId);
    return result;
  };
  const allowWrite = () => {
    if (areStorageWritesSuspended()) return false;
    if (writable && isSameScope(loadedScope)) return true;
    useStorageHealth.getState().block(storageId);
    return false;
  };
  const backupKey = (name: string) => name + '.pre-rebuild-backup';
  const observedNames = new Set<string>();
  if (usesDeviceDatabase) {
    const legacy = mmkv;
    backupCleaners.set(storageId, async (scope) => {
      if (scope.partition !== 'legacy') return;
      // After explicit local reset, remove retained legacy sources as well as backups.
      for (const name of observedNames) {
        legacy?.delete(name);
        legacy?.delete(backupKey(name));
      }
      await AsyncStorage.multiRemove([...observedNames].flatMap((name) => [name, backupKey(name)]));
    });
    return {
      getItem: async (name) => {
        const scope = getStorageScope();
        observedNames.add(name);
        writable = false;
        try {
          const database = getDeviceDatabase();
          if (!database) return failRead();
          if (database.hasImported(name, scope.partition)) {
            loadedScope = scope;
            return accept(database.read(name, scope.partition));
          }
          // Unscoped legacy data remains on this device and is never silently assigned to an account.
          const raw =
            scope.partition === 'legacy'
              ? (legacy?.getString(name) ?? (await AsyncStorage.getItem(name)))
              : null;
          if (!isSameScope(scope)) throw new Error('Stale storage read');
          const validated =
            raw == null
              ? null
              : decode(raw, {
                  storageId,
                  schema,
                  maxVersion: supportedVersion,
                  defaultState: _defaultPersistedState,
                });
          database.importLegacy(
            name,
            raw,
            validated == null ? null : JSON.stringify(validated),
            scope.partition,
          );
          loadedScope = scope;
          return accept(database.read(name, scope.partition));
        } catch {
          if (!isSameScope(scope)) throw new Error('Stale storage read');
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
        database.write(name, JSON.stringify(validated), loadedScope.partition);
      },
      removeItem: (name) => {
        if (allowWrite()) getDeviceDatabase()?.remove(name, loadedScope.partition);
      },
    };
  }
  if (mmkv) {
    const storage = mmkv;
    backupCleaners.set(storageId, (scope) => {
      observedNames.forEach((name) => storage.delete(backupKey(scopedStorageKey(name, scope))));
    });
    return {
      getItem: (name) => {
        observedNames.add(name);
        loadedScope = getStorageScope();
        name = scopedStorageKey(name, loadedScope);
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
        if (allowWrite()) storage.set(scopedStorageKey(name, loadedScope), JSON.stringify(value));
      },
      removeItem: (name) => {
        if (allowWrite()) storage.delete(scopedStorageKey(name, loadedScope));
      },
    };
  }

  backupCleaners.set(storageId, async (scope) => {
    await AsyncStorage.multiRemove(
      [...observedNames].map((name) => backupKey(scopedStorageKey(name, scope))),
    );
  });
  return {
    getItem: async (name) => {
      const scope = getStorageScope();
      observedNames.add(name);
      name = scopedStorageKey(name, scope);
      writable = false;
      try {
        const raw = (await AsyncStorage.getItem(name)) ?? temporaryValue(name);
        if (raw != null && (await AsyncStorage.getItem(backupKey(name))) == null)
          await AsyncStorage.setItem(backupKey(name), raw);
        if (!isSameScope(scope)) throw new Error('Stale storage read');
        loadedScope = scope;
        return accept(raw);
      } catch {
        if (!isSameScope(scope)) throw new Error('Stale storage read');
        return failRead();
      }
    },
    setItem: async (name, value) => {
      if (allowWrite())
        await AsyncStorage.setItem(scopedStorageKey(name, loadedScope), JSON.stringify(value));
    },
    removeItem: async (name) => {
      if (allowWrite()) await AsyncStorage.removeItem(scopedStorageKey(name, loadedScope));
    },
  };
}
