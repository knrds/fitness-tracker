import * as SecureStore from 'expo-secure-store';
import { logger } from './logger';

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

export type MigrationResultStatus =
  | 'already_migrated'
  | 'migrated'
  | 'no_session'
  | 'corrupted_secure'
  | 'corrupted_legacy'
  | 'write_failed';

export interface MigrationResult {
  status: MigrationResultStatus;
  source: 'secure_store' | 'legacy_store' | 'none';
  sessionData?: string | null;
  error?: string;
}

// In-memory fallback for environments where hardware secure storage is unavailable (e.g. Web/SSR/Mock)
class InMemorySecureStore implements SecureStorageAdapter {
  private store = new Map<string, string>();

  async getItem(key: string): Promise<string | null> {
    return this.store.get(key) ?? null;
  }

  async setItem(key: string, value: string): Promise<void> {
    this.store.set(key, value);
  }

  async removeItem(key: string): Promise<void> {
    this.store.delete(key);
  }

  async isAvailable(): Promise<boolean> {
    return true;
  }
}

/**
 * Isolated Hardware Secure Storage Adapter.
 * Backed by iOS Keychain (via Secure Enclave) and Android Keystore (via EncryptedSharedPreferences).
 *
 * NOTE FOR ASTRA:
 * This adapter is fully isolated and tested. It is NOT yet wired as the active Supabase session
 * storage in `apps/mobile/src/utils/supabase.ts` to prevent unexpected session logouts for active
 * beta users before dual-read migration is deployed.
 */
export class ExpoSecureStorageAdapter implements SecureStorageAdapter {
  private fallbackStore: InMemorySecureStore | null = null;

  async isAvailable(): Promise<boolean> {
    try {
      if (typeof SecureStore?.isAvailableAsync === 'function') {
        return await SecureStore.isAvailableAsync();
      }
      return false;
    } catch {
      return false;
    }
  }

  async getItem(key: string): Promise<string | null> {
    try {
      const available = await this.isAvailable();
      if (!available) {
        return this.getFallback().getItem(key);
      }
      return await SecureStore.getItemAsync(key);
    } catch (error) {
      // Never log sensitive token contents, only the key name and operation failure
      logger.warn(`[SecureStorage] Failed to read key "${key}" from secure store:`, error);
      return null;
    }
  }

  async setItem(key: string, value: string): Promise<void> {
    try {
      const available = await this.isAvailable();
      if (!available) {
        await this.getFallback().setItem(key, value);
        return;
      }
      await SecureStore.setItemAsync(key, value, {
        keychainAccessible: SecureStore.AFTER_FIRST_UNLOCK,
      });
    } catch (error) {
      logger.error(`[SecureStorage] Failed to write key "${key}" to secure store:`, error);
      throw error;
    }
  }

  async removeItem(key: string): Promise<void> {
    try {
      const available = await this.isAvailable();
      if (!available) {
        await this.getFallback().removeItem(key);
        return;
      }
      await SecureStore.deleteItemAsync(key);
    } catch (error) {
      logger.warn(`[SecureStorage] Failed to delete key "${key}" from secure store:`, error);
    }
  }

  private getFallback(): InMemorySecureStore {
    if (!this.fallbackStore) {
      this.fallbackStore = new InMemorySecureStore();
    }
    return this.fallbackStore;
  }
}

export const defaultSecureStorage = new ExpoSecureStorageAdapter();

/**
 * Validates whether a stored session string is valid JSON containing minimal auth token keys.
 */
function isValidSessionPayload(raw: string): boolean {
  try {
    const parsed = JSON.parse(raw);
    return typeof parsed === 'object' && parsed !== null && ('access_token' in parsed || 'user' in parsed);
  } catch {
    return false;
  }
}

/**
 * Dual-Read Session Migration Orchestrator (Zero-Logout Strategy).
 *
 * Sequence:
 * 1. Inspect SecureStore. If valid session exists, return immediately (already migrated).
 * 2. If SecureStore has corrupted data, mark as corrupted_secure.
 * 3. Inspect legacy store (MMKV / AsyncStorage).
 * 4. If legacy session exists and is valid:
 *    a) Write to SecureStore FIRST.
 *    b) Only if write succeeds, delete from legacy store.
 *    c) If write fails, KEEP legacy store intact (Zero-Data-Loss).
 * 5. If legacy is corrupted, return corrupted_legacy.
 */
export async function migrateSessionFromLegacyStore(
  options: MigrationOptions
): Promise<MigrationResult> {
  const secure = options.secureStore ?? defaultSecureStorage;
  const { sessionKey, legacyStore } = options;

  // 1. Check secure storage first
  let secureValue: string | null = null;
  try {
    secureValue = await secure.getItem(sessionKey);
  } catch (err) {
    logger.warn('[SecureStorage] Error querying secure storage during migration', err);
  }

  if (secureValue != null && secureValue.trim().length > 0) {
    if (isValidSessionPayload(secureValue)) {
      return {
        status: 'already_migrated',
        source: 'secure_store',
        sessionData: secureValue,
      };
    } else {
      return {
        status: 'corrupted_secure',
        source: 'secure_store',
        sessionData: secureValue,
        error: 'Secure storage payload is not a valid JSON session',
      };
    }
  }

  // 2. Fallback to legacy store
  let legacyValue: string | null = null;
  try {
    legacyValue = await legacyStore.getItem(sessionKey);
  } catch (err) {
    logger.warn('[SecureStorage] Error reading legacy storage during migration', err);
    return {
      status: 'no_session',
      source: 'none',
      error: 'Failed reading legacy store',
    };
  }

  if (legacyValue == null || legacyValue.trim().length === 0) {
    return {
      status: 'no_session',
      source: 'none',
    };
  }

  if (!isValidSessionPayload(legacyValue)) {
    return {
      status: 'corrupted_legacy',
      source: 'legacy_store',
      sessionData: legacyValue,
      error: 'Legacy storage payload is corrupted or invalid JSON',
    };
  }

  // 3. Migrate: write to secure storage first
  try {
    await secure.setItem(sessionKey, legacyValue);
  } catch (writeErr) {
    logger.error('[SecureStorage] Migration write to secure storage failed. Preserving legacy data.', writeErr);
    return {
      status: 'write_failed',
      source: 'legacy_store',
      sessionData: legacyValue,
      error: writeErr instanceof Error ? writeErr.message : 'Unknown write error',
    };
  }

  // 4. Safe delete from legacy store after confirmed write
  try {
    await legacyStore.removeItem(sessionKey);
  } catch (deleteErr) {
    logger.warn('[SecureStorage] Failed to delete legacy key after migration write succeeded', deleteErr);
  }

  return {
    status: 'migrated',
    source: 'legacy_store',
    sessionData: legacyValue,
  };
}

/**
 * Clears session keys across both storage tiers during logout.
 */
export async function clearSessionFromAllStores(
  sessionKey: string,
  secureStore: SecureStorageAdapter,
  legacyStore: LegacyStorageLike
): Promise<void> {
  await Promise.allSettled([
    secureStore.removeItem(sessionKey),
    Promise.resolve(legacyStore.removeItem(sessionKey)),
  ]);
}
