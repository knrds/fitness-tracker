import * as SecureStore from 'expo-secure-store';
import {
  ExpoSecureStorageAdapter,
  migrateSessionFromLegacyStore,
  clearSessionFromAllStores,
} from '../secureStorage';

jest.mock('expo-secure-store', () => ({
  isAvailableAsync: jest.fn(async () => true),
  getItemAsync: jest.fn(async () => null),
  setItemAsync: jest.fn(async () => undefined),
  deleteItemAsync: jest.fn(async () => undefined),
  AFTER_FIRST_UNLOCK_THIS_DEVICE_ONLY: 'device-only',
}));

const key = 'sb-test-auth-token';
const session = JSON.stringify({
  access_token: 'access',
  refresh_token: 'refresh',
  expires_at: 1,
  user: { id: '11111111-1111-4111-8111-111111111111' },
});
const legacy = () => ({
  getItem: jest.fn(async () => session),
  removeItem: jest.fn(async () => undefined),
});

beforeEach(() => jest.clearAllMocks());

it('unavailable native storage never acknowledges a volatile write', async () => {
  jest.mocked(SecureStore.isAvailableAsync).mockResolvedValueOnce(false);
  await expect(new ExpoSecureStorageAdapter().setItem(key, session)).rejects.toThrow();
});

it('secure read failure must not overwrite an unknown newer session from legacy', async () => {
  const old = legacy();
  const secure = {
    isAvailable: async () => true,
    getItem: jest.fn(async (): Promise<string | null> => {
      throw new Error('locked');
    }),
    setItem: jest.fn(),
    removeItem: jest.fn(),
  };
  await expect(
    migrateSessionFromLegacyStore({ sessionKey: key, secureStore: secure, legacyStore: old }),
  ).rejects.toThrow();
  expect(secure.setItem).not.toHaveBeenCalled();
  expect(old.removeItem).not.toHaveBeenCalled();
});

it('acknowledged write without matching durable readback preserves legacy bytes', async () => {
  const old = legacy();
  const secure = {
    isAvailable: async () => true,
    getItem: jest.fn(async () => null),
    setItem: jest.fn(),
    removeItem: jest.fn(),
  };
  await expect(
    migrateSessionFromLegacyStore({ sessionKey: key, secureStore: secure, legacyStore: old }),
  ).rejects.toThrow();
  expect(old.removeItem).not.toHaveBeenCalled();
});

it('logout reports failure and still attempts removal from the other tier', async () => {
  const old = legacy();
  const secure = {
    isAvailable: async () => true,
    getItem: jest.fn(async () => 'deleted'),
    setItem: jest.fn(),
    removeItem: jest.fn(async () => {
      throw new Error('locked');
    }),
  };
  await expect(clearSessionFromAllStores(key, secure, old)).rejects.toThrow();
  expect(old.removeItem).toHaveBeenCalledWith(key);
});

it('native errors containing credentials never escape into logs or UI', async () => {
  jest.mocked(SecureStore.getItemAsync).mockRejectedValueOnce(new Error('private-refresh-token'));
  await expect(new ExpoSecureStorageAdapter().getItem(key)).rejects.toThrow(
    'Secure storage read failed',
  );
});
