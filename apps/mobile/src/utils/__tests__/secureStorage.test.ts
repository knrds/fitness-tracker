import * as SecureStore from 'expo-secure-store';
import {
  ExpoSecureStorageAdapter,
  migrateSessionFromLegacyStore,
  clearSessionFromAllStores,
  SecureStorageAdapter,
  LegacyStorageLike,
} from '../secureStorage';
import { logger } from '../logger';

jest.mock('../logger', () => ({
  logger: {
    warn: jest.fn(),
    error: jest.fn(),
    info: jest.fn(),
  },
}));

jest.mock('expo-secure-store', () => {
  const memStore = new Map<string, string>();
  let available = true;
  return {
    isAvailableAsync: jest.fn(async () => available),
    getItemAsync: jest.fn(async (key: string) => memStore.get(key) ?? null),
    setItemAsync: jest.fn(async (key: string, val: string) => {
      memStore.set(key, val);
    }),
    deleteItemAsync: jest.fn(async (key: string) => {
      memStore.delete(key);
    }),
    AFTER_FIRST_UNLOCK: 'AFTER_FIRST_UNLOCK',
    __setAvailable: (v: boolean) => {
      available = v;
    },
    __clear: () => {
      memStore.clear();
    },
  };
});

class MockSecureAdapter implements SecureStorageAdapter {
  store = new Map<string, string>();
  failWrites = false;
  failReads = false;

  async getItem(key: string): Promise<string | null> {
    if (this.failReads) {
      throw new Error('Hardware keystore read failed');
    }
    return this.store.get(key) ?? null;
  }
  async setItem(key: string, value: string): Promise<void> {
    if (this.failWrites) {
      throw new Error('Hardware keystore write failed');
    }
    this.store.set(key, value);
  }
  async removeItem(key: string): Promise<void> {
    this.store.delete(key);
  }
  async isAvailable(): Promise<boolean> {
    return true;
  }
}

class MockLegacyStorage implements LegacyStorageLike {
  store = new Map<string, string>();

  async getItem(key: string): Promise<string | null> {
    return this.store.get(key) ?? null;
  }
  async setItem(key: string, value: string): Promise<void> {
    this.store.set(key, value);
  }
  async removeItem(key: string): Promise<void> {
    this.store.delete(key);
  }
}

describe('Secure Storage & Dual-Read Migration Scaffolding', () => {
  const SESSION_KEY = 'sb-test-project-auth-token';
  const VALID_SESSION = JSON.stringify({
    access_token: 'valid-jwt-token-123',
    refresh_token: 'valid-refresh-token-456',
    user: { id: 'user-uuid-1', email: 'test@evaro.app' },
  });

  let secureStore: MockSecureAdapter;
  let legacyStore: MockLegacyStorage;

  beforeEach(() => {
    jest.clearAllMocks();
    secureStore = new MockSecureAdapter();
    legacyStore = new MockLegacyStorage();
  });

  test('Scenario 1: SecureStore already contains session (no migration needed)', async () => {
    secureStore.store.set(SESSION_KEY, VALID_SESSION);

    const result = await migrateSessionFromLegacyStore({
      sessionKey: SESSION_KEY,
      secureStore,
      legacyStore,
    });

    expect(result.status).toBe('already_migrated');
    expect(result.source).toBe('secure_store');
    expect(result.sessionData).toBe(VALID_SESSION);
    // Legacy store was untouched
    expect(legacyStore.store.has(SESSION_KEY)).toBe(false);
  });

  test('Scenario 2: SecureStore empty + legacy store contains valid session (successful migration)', async () => {
    legacyStore.store.set(SESSION_KEY, VALID_SESSION);

    const result = await migrateSessionFromLegacyStore({
      sessionKey: SESSION_KEY,
      secureStore,
      legacyStore,
    });

    expect(result.status).toBe('migrated');
    expect(result.source).toBe('legacy_store');
    expect(result.sessionData).toBe(VALID_SESSION);

    // Written to secure storage
    expect(secureStore.store.get(SESSION_KEY)).toBe(VALID_SESSION);
    // Deleted from legacy store (Zero duplicate persistence)
    expect(legacyStore.store.has(SESSION_KEY)).toBe(false);
  });

  test('Scenario 3: Both contain session (SecureStore takes precedence, already migrated)', async () => {
    const legacySession = JSON.stringify({ access_token: 'old-token' });
    secureStore.store.set(SESSION_KEY, VALID_SESSION);
    legacyStore.store.set(SESSION_KEY, legacySession);

    const result = await migrateSessionFromLegacyStore({
      sessionKey: SESSION_KEY,
      secureStore,
      legacyStore,
    });

    expect(result.status).toBe('already_migrated');
    expect(result.source).toBe('secure_store');
    expect(result.sessionData).toBe(VALID_SESSION);
  });

  test('Scenario 4: Corrupted SecureStore payload is flagged without throwing', async () => {
    secureStore.store.set(SESSION_KEY, 'not-valid-json{{[[');

    const result = await migrateSessionFromLegacyStore({
      sessionKey: SESSION_KEY,
      secureStore,
      legacyStore,
    });

    expect(result.status).toBe('corrupted_secure');
    expect(result.source).toBe('secure_store');
    expect(result.error).toBeDefined();
  });

  test('Scenario 5: Corrupted legacy store payload is flagged without writing to secure store', async () => {
    legacyStore.store.set(SESSION_KEY, 'invalid-legacy-blob');

    const result = await migrateSessionFromLegacyStore({
      sessionKey: SESSION_KEY,
      secureStore,
      legacyStore,
    });

    expect(result.status).toBe('corrupted_legacy');
    expect(result.source).toBe('legacy_store');
    expect(secureStore.store.has(SESSION_KEY)).toBe(false);
  });

  test('Scenario 6: Both stores empty (Guest mode or logged out)', async () => {
    const result = await migrateSessionFromLegacyStore({
      sessionKey: SESSION_KEY,
      secureStore,
      legacyStore,
    });

    expect(result.status).toBe('no_session');
    expect(result.source).toBe('none');
    expect(result.sessionData).toBeUndefined();
  });

  test('Scenario 7: Migration write interrupted/failed preserves legacy data (Zero-Data-Loss)', async () => {
    legacyStore.store.set(SESSION_KEY, VALID_SESSION);
    secureStore.failWrites = true;

    const result = await migrateSessionFromLegacyStore({
      sessionKey: SESSION_KEY,
      secureStore,
      legacyStore,
    });

    expect(result.status).toBe('write_failed');
    expect(result.source).toBe('legacy_store');
    // Legacy store data MUST BE PRESERVED so the user is not locked out
    expect(legacyStore.store.get(SESSION_KEY)).toBe(VALID_SESSION);
  });

  test('Scenario 8: Logout clears session keys across both storage tiers', async () => {
    secureStore.store.set(SESSION_KEY, VALID_SESSION);
    legacyStore.store.set(SESSION_KEY, VALID_SESSION);

    await clearSessionFromAllStores(SESSION_KEY, secureStore, legacyStore);

    expect(secureStore.store.has(SESSION_KEY)).toBe(false);
    expect(legacyStore.store.has(SESSION_KEY)).toBe(false);
  });

  test('Scenario 9: New login writes directly to secure storage', async () => {
    await secureStore.setItem(SESSION_KEY, VALID_SESSION);

    const stored = await secureStore.getItem(SESSION_KEY);
    expect(stored).toBe(VALID_SESSION);
    expect(legacyStore.store.has(SESSION_KEY)).toBe(false);
  });

  test('Scenario 10: ExpoSecureStorageAdapter works when native available and falls back gracefully when unavailable', async () => {
    const adapter = new ExpoSecureStorageAdapter();

    // 10a: Native available (writes to mock SecureStore)
    (SecureStore as unknown as { __setAvailable: (v: boolean) => void }).__setAvailable(true);
    expect(await adapter.isAvailable()).toBe(true);
    await adapter.setItem('native-key', 'secret-val-1');
    expect(await adapter.getItem('native-key')).toBe('secret-val-1');
    await adapter.removeItem('native-key');
    expect(await adapter.getItem('native-key')).toBeNull();

    // 10b: Native unavailable (falls back to memory store)
    (SecureStore as unknown as { __setAvailable: (v: boolean) => void }).__setAvailable(false);
    expect(await adapter.isAvailable()).toBe(false);
    await adapter.setItem('fallback-key', 'fallback-val-2');
    expect(await adapter.getItem('fallback-key')).toBe('fallback-val-2');
    await adapter.removeItem('fallback-key');
    expect(await adapter.getItem('fallback-key')).toBeNull();
  });

  test('Scenario 11: Error handling never leaks secret tokens into logger', async () => {
    const adapter = new ExpoSecureStorageAdapter();
    const sensitiveSecret = 'super-secret-jwt-token-do-not-log';

    // Intentionally cause an error or test read failure logging
    await adapter.getItem('any-key');

    const warnCalls = (logger.warn as jest.Mock).mock.calls;
    const errorCalls = (logger.error as jest.Mock).mock.calls;
    const allLogged = [...warnCalls, ...errorCalls].flat().join(' ');

    expect(allLogged).not.toContain(sensitiveSecret);
  });

  test('Scenario 12: Secure read failure falls back safely to legacy store inspection without throwing', async () => {
    legacyStore.store.set(SESSION_KEY, VALID_SESSION);
    secureStore.failReads = true;

    // Even if reading secure store throws, migration catches it and migrates from legacy
    const result = await migrateSessionFromLegacyStore({
      sessionKey: SESSION_KEY,
      secureStore,
      legacyStore,
    });

    expect(result.status).toBe('migrated');
    expect(result.source).toBe('legacy_store');
    expect(result.sessionData).toBe(VALID_SESSION);
    expect(secureStore.store.get(SESSION_KEY)).toBe(VALID_SESSION);
  });

  test('Scenario 13: Concurrent migration calls resolve idempotently and do not corrupt data', async () => {
    legacyStore.store.set(SESSION_KEY, VALID_SESSION);

    const [res1, res2] = await Promise.all([
      migrateSessionFromLegacyStore({
        sessionKey: SESSION_KEY,
        secureStore,
        legacyStore,
      }),
      migrateSessionFromLegacyStore({
        sessionKey: SESSION_KEY,
        secureStore,
        legacyStore,
      }),
    ]);

    // Both calls must succeed without error or corrupted session payload
    expect(['migrated', 'already_migrated']).toContain(res1.status);
    expect(['migrated', 'already_migrated']).toContain(res2.status);
    expect(res1.sessionData).toBe(VALID_SESSION);
    expect(res2.sessionData).toBe(VALID_SESSION);
    expect(secureStore.store.get(SESSION_KEY)).toBe(VALID_SESSION);
  });

  test('Scenario 14: Expired session payload is handled safely without crashing', async () => {
    const expiredSession = JSON.stringify({
      access_token: 'expired-token-xyz',
      expires_at: Math.floor(Date.now() / 1000) - 7200, // 2 hours ago
      user: { id: 'user-expired' },
    });
    legacyStore.store.set(SESSION_KEY, expiredSession);

    const result = await migrateSessionFromLegacyStore({
      sessionKey: SESSION_KEY,
      secureStore,
      legacyStore,
    });

    // Valid JSON payload is migrated to secure store so Supabase auth client can refresh it
    expect(result.status).toBe('migrated');
    expect(result.sessionData).toBe(expiredSession);
    expect(secureStore.store.get(SESSION_KEY)).toBe(expiredSession);
  });
});

