import * as SecureStore from 'expo-secure-store';
import {
  createMigratingAuthStorage,
  ExpoSecureStorageAdapter,
  migrateSessionFromLegacyStore,
  clearSessionFromAllStores,
  SecureStorageAdapter,
} from '../secureStorage';

jest.mock('expo-secure-store', () => ({
  isAvailableAsync: jest.fn(async () => true),
  getItemAsync: jest.fn(),
  setItemAsync: jest.fn(),
  deleteItemAsync: jest.fn(),
  AFTER_FIRST_UNLOCK_THIS_DEVICE_ONLY: 'device-only',
}));

const KEY = 'sb-test-auth-token';
const MARKER = `${KEY}.evaro-v1`;
const SESSION = JSON.stringify({
  access_token: 'access',
  refresh_token: 'refresh',
  expires_at: 1,
  user: { id: '11111111-1111-4111-8111-111111111111' },
});
const NEW_SESSION = JSON.stringify({ ...JSON.parse(SESSION), access_token: 'new-access' });
class Store implements SecureStorageAdapter {
  values = new Map<string, string>();
  getItem = jest.fn(async (key: string) => this.values.get(key) ?? null);
  setItem = jest.fn(async (key: string, value: string) => {
    this.values.set(key, value);
  });
  removeItem = jest.fn(async (key: string) => {
    this.values.delete(key);
  });
  isAvailable = async () => true;
}
let secure: Store;
let legacy: Store;
const migrate = () =>
  migrateSessionFromLegacyStore({ sessionKey: KEY, secureStore: secure, legacyStore: legacy });
const adapter = () =>
  createMigratingAuthStorage({ sessionKey: KEY, secureStore: secure, legacyStore: legacy });
beforeEach(() => {
  jest.clearAllMocks();
  secure = new Store();
  legacy = new Store();
});

it('migrates an expired but refreshable legacy session byte-for-byte', async () => {
  legacy.values.set(KEY, SESSION);
  expect(await migrate()).toEqual({
    status: 'migrated',
    source: 'legacy_store',
    sessionData: SESSION,
  });
  expect(secure.values.get(KEY)).toBe(SESSION);
  expect(legacy.values.has(KEY)).toBe(false);
  expect(secure.values.get(MARKER)).toBe('migrated');
});

it('prefers the secure session and cleans up stale legacy copies', async () => {
  secure.values.set(KEY, NEW_SESSION);
  legacy.values.set(KEY, SESSION);
  expect((await migrate()).sessionData).toBe(NEW_SESSION);
  expect(legacy.values.has(KEY)).toBe(false);
});

it('keeps guest installs empty', async () => {
  expect(await migrate()).toEqual({ status: 'no_session', source: 'none' });
  expect(secure.setItem).not.toHaveBeenCalled();
});

it.each(['invalid-json', '{}', '{"user":{}}', '{"access_token":"token"}', ''])(
  'preserves corrupt legacy payload %p',
  async (payload) => {
    legacy.values.set(KEY, payload);
    await expect(migrate()).rejects.toThrow('original data preserved');
    expect(legacy.values.get(KEY)).toBe(payload);
    expect(secure.setItem).not.toHaveBeenCalled();
  },
);

it('preserves corrupted secure payload and does not replace it with stale legacy', async () => {
  secure.values.set(KEY, 'broken');
  legacy.values.set(KEY, SESSION);
  await expect(migrate()).rejects.toThrow();
  expect(secure.values.get(KEY)).toBe('broken');
  expect(legacy.values.get(KEY)).toBe(SESSION);
});

it('does not confuse legacy IO failure with an absent session', async () => {
  legacy.getItem.mockRejectedValueOnce(new Error('IO'));
  await expect(migrate()).rejects.toThrow();
  expect(secure.setItem).not.toHaveBeenCalled();
});

it('preserves a large original session when the OS rejects its size and supports retry', async () => {
  const large = JSON.stringify({ ...JSON.parse(SESSION), metadata: 'x'.repeat(20000) });
  legacy.values.set(KEY, large);
  secure.setItem.mockRejectedValueOnce(new Error('size rejected'));
  await expect(migrate()).rejects.toThrow();
  expect(legacy.values.get(KEY)).toBe(large);
  expect((await migrate()).sessionData).toBe(large);
});

it('retries legacy cleanup after process death between secure commit and deletion', async () => {
  legacy.values.set(KEY, SESSION);
  legacy.removeItem.mockRejectedValueOnce(new Error('interrupted'));
  await expect(migrate()).rejects.toThrow();
  expect(secure.values.get(KEY)).toBe(SESSION);
  expect((await migrate()).status).toBe('already_migrated');
  expect(legacy.values.has(KEY)).toBe(false);
});

it('does not fall back when a previously committed secure session disappears', async () => {
  secure.values.set(MARKER, 'migrated');
  legacy.values.set(KEY, SESSION);
  await expect(migrate()).rejects.toThrow('fallback blocked');
  expect(legacy.getItem).not.toHaveBeenCalled();
});

it('blocks unknown marker versions without changing either store', async () => {
  secure.values.set(MARKER, 'v-next');
  legacy.values.set(KEY, SESSION);
  await expect(migrate()).rejects.toThrow('Unknown');
  expect(legacy.removeItem).not.toHaveBeenCalled();
});

it('new login writes only securely and supports non-session PKCE keys', async () => {
  await adapter().setItem(KEY, SESSION);
  await adapter().setItem(`${KEY}-code-verifier`, '"pkce-string"');
  expect(await adapter().getItem(`${KEY}-code-verifier`)).toBe('"pkce-string"');
  expect(legacy.setItem).not.toHaveBeenCalled();
});

it('logout clears both copies and retains only a non-secret resurrection guard', async () => {
  secure.values.set(KEY, SESSION);
  legacy.values.set(KEY, SESSION);
  await clearSessionFromAllStores(KEY, secure, legacy);
  expect(secure.values.get(KEY)).toBeUndefined();
  expect(legacy.values.get(KEY)).toBeUndefined();
  expect(await adapter().getItem(KEY)).toBeNull();
});

it('logout failure blocks stale resurrection after adapter recreation, and retry cleans up', async () => {
  secure.values.set(KEY, SESSION);
  legacy.values.set(KEY, SESSION);
  legacy.removeItem.mockRejectedValueOnce(new Error('disk failure'));
  await expect(adapter().removeItem(KEY)).rejects.toThrow('cleanup incomplete');
  expect(await adapter().getItem(KEY)).toBeNull();
  await adapter().removeItem(KEY);
  expect(legacy.values.has(KEY)).toBe(false);
  await adapter().setItem(KEY, NEW_SESSION);
  expect(await adapter().getItem(KEY)).toBe(NEW_SESSION);
});

it('failure to persist logout intent preserves the current session and reports failure', async () => {
  secure.values.set(KEY, SESSION);
  legacy.values.set(KEY, SESSION);
  secure.setItem.mockRejectedValueOnce(new Error('locked'));
  await expect(adapter().removeItem(KEY)).rejects.toThrow();
  expect(secure.values.get(KEY)).toBe(SESSION);
  expect(legacy.values.get(KEY)).toBe(SESSION);
});

it.each(['logout', 'refresh'] as const)(
  'serializes an in-flight migration before %s across adapter instances',
  async (operation) => {
    legacy.values.set(KEY, SESSION);
    let release!: () => void;
    const pause = new Promise<void>((resolve) => {
      release = resolve;
    });
    let entered!: () => void;
    const started = new Promise<void>((resolve) => {
      entered = resolve;
    });
    legacy.getItem.mockImplementationOnce(async () => {
      entered();
      await pause;
      return SESSION;
    });
    const reading = adapter().getItem(KEY);
    await started;
    const mutation =
      operation === 'logout' ? adapter().removeItem(KEY) : adapter().setItem(KEY, NEW_SESSION);
    release();
    await Promise.all([reading, mutation]);
    expect(await adapter().getItem(KEY)).toBe(operation === 'logout' ? null : NEW_SESSION);
  },
);

it('concurrent migration copies the session only once', async () => {
  legacy.values.set(KEY, SESSION);
  const results = await Promise.all([migrate(), migrate()]);
  expect(results.map((r) => r.status)).toEqual(['migrated', 'already_migrated']);
  expect(secure.setItem.mock.calls.filter(([key]) => key === KEY)).toHaveLength(1);
});

it('uses device-only Keychain accessibility and propagates native removal failure', async () => {
  const hardware = new ExpoSecureStorageAdapter();
  await hardware.setItem(KEY, SESSION);
  expect(SecureStore.setItemAsync).toHaveBeenCalledWith(KEY, SESSION, {
    keychainAccessible: 'device-only',
  });
  jest.mocked(SecureStore.deleteItemAsync).mockRejectedValueOnce(new Error('native secret'));
  await expect(hardware.removeItem(KEY)).rejects.toThrow('Secure storage removal failed');
});
