import * as SecureStore from 'expo-secure-store';

export interface SecureStorageAdapter {
  getItem(key: string): Promise<string | null>;
  setItem(key: string, value: string): Promise<void>;
  removeItem(key: string): Promise<void>;
  isAvailable(): Promise<boolean>;
}

export interface LegacyStorageLike {
  getItem(key: string): Promise<string | null> | string | null;
  setItem?(key: string, value: string): Promise<void> | void;
  removeItem(key: string): Promise<void> | void;
}

export interface MigrationOptions {
  sessionKey: string;
  secureStore?: SecureStorageAdapter;
  legacyStore: LegacyStorageLike;
}

export interface MigrationResult {
  status: 'already_migrated' | 'migrated' | 'no_session';
  source: 'secure_store' | 'legacy_store' | 'none';
  sessionData?: string;
}

/** Native failures must never look like an empty store or a durable RAM write. */
export class ExpoSecureStorageAdapter implements SecureStorageAdapter {
  async isAvailable(): Promise<boolean> {
    try {
      return await SecureStore.isAvailableAsync();
    } catch {
      return false;
    }
  }

  private async requireAvailable(): Promise<void> {
    if (!(await this.isAvailable())) throw new Error('Secure storage unavailable');
  }

  async getItem(key: string): Promise<string | null> {
    await this.requireAvailable();
    try {
      return await SecureStore.getItemAsync(key);
    } catch {
      throw new Error('Secure storage read failed');
    }
  }

  async setItem(key: string, value: string): Promise<void> {
    await this.requireAvailable();
    try {
      await SecureStore.setItemAsync(key, value, {
        keychainAccessible: SecureStore.AFTER_FIRST_UNLOCK_THIS_DEVICE_ONLY,
      });
    } catch {
      throw new Error('Secure storage write failed');
    }
  }

  async removeItem(key: string): Promise<void> {
    await this.requireAvailable();
    try {
      await SecureStore.deleteItemAsync(key);
    } catch {
      throw new Error('Secure storage removal failed');
    }
  }
}

export const defaultSecureStorage = new ExpoSecureStorageAdapter();

// Shared by migration, token refresh and logout, even across adapter instances.
const queues = new WeakMap<SecureStorageAdapter, Map<string, Promise<void>>>();
function serialize<T>(
  secure: SecureStorageAdapter,
  key: string,
  operation: () => Promise<T>,
): Promise<T> {
  let keys = queues.get(secure);
  if (!keys) {
    keys = new Map();
    queues.set(secure, keys);
  }
  const result = (keys.get(key) ?? Promise.resolve()).then(operation);
  const tail = result.then(
    () => undefined,
    () => undefined,
  );
  keys.set(key, tail);
  void tail.then(() => {
    if (keys.get(key) === tail) keys.delete(key);
  });
  return result;
}

// A non-secret marker survives logout/partial cleanup so stale legacy credentials
// can never be resurrected. It also distinguishes lost secure data from first use.
function markerKey(key: string): string {
  return `${key}.evaro-v1`;
}

function validateSession(raw: string): void {
  try {
    const value: unknown = JSON.parse(raw);
    if (typeof value !== 'object' || value === null || Array.isArray(value)) throw new Error();
    const s = value as Record<string, unknown>;
    if (
      typeof s.access_token !== 'string' ||
      !s.access_token ||
      typeof s.refresh_token !== 'string' ||
      !s.refresh_token ||
      typeof s.expires_at !== 'number' ||
      !Number.isFinite(s.expires_at) ||
      typeof s.user !== 'object' ||
      s.user === null ||
      !('id' in s.user) ||
      typeof s.user.id !== 'string' ||
      !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(s.user.id)
    )
      throw new Error();
  } catch {
    throw new Error('Stored session is invalid; original data preserved');
  }
}

async function writeVerified(
  secure: SecureStorageAdapter,
  key: string,
  value: string,
): Promise<void> {
  await secure.setItem(key, value);
  if ((await secure.getItem(key)) !== value) throw new Error('Secure storage verification failed');
}

async function readMigrating(
  key: string,
  secure: SecureStorageAdapter,
  legacy: LegacyStorageLike,
  isSession: boolean,
): Promise<MigrationResult> {
  const marker = await secure.getItem(markerKey(key));
  if (marker === 'deleted') return { status: 'no_session', source: 'none' };
  if (marker !== null && marker !== 'migrated') throw new Error('Unknown secure storage version');
  const stored = await secure.getItem(key);
  if (stored !== null) {
    if (isSession) validateSession(stored);
    // Retry interrupted legacy cleanup before reporting migration success.
    await writeVerified(secure, markerKey(key), 'migrated');
    await legacy.removeItem(key);
    return { status: 'already_migrated', source: 'secure_store', sessionData: stored };
  }
  if (marker === 'migrated') throw new Error('Secure session missing; legacy fallback blocked');
  const old = await legacy.getItem(key);
  if (old === null) return { status: 'no_session', source: 'none' };
  if (isSession) validateSession(old);
  await writeVerified(secure, key, old);
  await writeVerified(secure, markerKey(key), 'migrated');
  await legacy.removeItem(key);
  return { status: 'migrated', source: 'legacy_store', sessionData: old };
}

export function migrateSessionFromLegacyStore(options: MigrationOptions): Promise<MigrationResult> {
  const secure = options.secureStore ?? defaultSecureStorage;
  return serialize(secure, options.sessionKey, () =>
    readMigrating(options.sessionKey, secure, options.legacyStore, true),
  );
}

async function removeFromBoth(
  key: string,
  secure: SecureStorageAdapter,
  legacy: LegacyStorageLike,
): Promise<void> {
  // Commit the logout intent before touching either token copy.
  await writeVerified(secure, markerKey(key), 'deleted');
  const results = await Promise.allSettled([
    Promise.resolve().then(() => secure.removeItem(key)),
    Promise.resolve().then(() => legacy.removeItem(key)),
  ]);
  if (results.some((result) => result.status === 'rejected'))
    throw new Error('Session cleanup incomplete; retry required');
}

export function clearSessionFromAllStores(
  key: string,
  secure: SecureStorageAdapter,
  legacy: LegacyStorageLike,
): Promise<void> {
  return serialize(secure, key, () => removeFromBoth(key, secure, legacy));
}

/** Supabase also persists PKCE/user auxiliary keys: only the session key is session JSON. */
export function createMigratingAuthStorage(options: MigrationOptions) {
  const secure = options.secureStore ?? defaultSecureStorage;
  const legacy = options.legacyStore;
  return {
    getItem: (key: string): Promise<string | null> =>
      serialize(secure, key, async () => {
        const result = await readMigrating(key, secure, legacy, key === options.sessionKey);
        return result.sessionData ?? null;
      }),
    setItem: (key: string, value: string): Promise<void> =>
      serialize(secure, key, async () => {
        if (key === options.sessionKey) validateSession(value);
        await writeVerified(secure, key, value);
        await writeVerified(secure, markerKey(key), 'migrated');
        await legacy.removeItem(key);
      }),
    removeItem: (key: string): Promise<void> => clearSessionFromAllStores(key, secure, legacy),
  };
}
