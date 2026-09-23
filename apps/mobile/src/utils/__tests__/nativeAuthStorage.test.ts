import AsyncStorage from '@react-native-async-storage/async-storage';
import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';
import { createNativeAuthStorage } from '../nativeAuthStorage';

const mockMMKV = new Map<string, string>();
const mockSecure = new Map<string, string>();
let mockExpoGo = false;
jest.mock('../runtime', () => ({
  get isExpoGo() {
    return mockExpoGo;
  },
}));
jest.mock('react-native-mmkv', () => ({
  MMKV: jest.fn(() => ({
    getString: (key: string) => mockMMKV.get(key),
    delete: (key: string) => mockMMKV.delete(key),
  })),
}));
jest.mock('expo-secure-store', () => ({
  isAvailableAsync: jest.fn(async () => true),
  getItemAsync: jest.fn(async (key: string) => mockSecure.get(key) ?? null),
  setItemAsync: jest.fn(async (key: string, value: string) => {
    mockSecure.set(key, value);
  }),
  deleteItemAsync: jest.fn(async (key: string) => {
    mockSecure.delete(key);
  }),
  AFTER_FIRST_UNLOCK_THIS_DEVICE_ONLY: 'device-only',
}));

const KEY = 'sb-placeholder-auth-token';
const SESSION = JSON.stringify({
  access_token: 'access',
  refresh_token: 'refresh',
  expires_at: Math.floor(Date.now() / 1000) + 3600,
  user: { id: '11111111-1111-4111-8111-111111111111' },
});

beforeEach(async () => {
  jest.clearAllMocks();
  mockMMKV.clear();
  mockSecure.clear();
  mockExpoGo = false;
  await AsyncStorage.clear();
});

it.each(['mmkv', 'async', 'expo-go'] as const)(
  'migrates the actual %s legacy source and clears both native copies',
  async (source) => {
    mockExpoGo = source === 'expo-go';
    if (source === 'mmkv') mockMMKV.set(KEY, SESSION);
    await AsyncStorage.setItem(KEY, SESSION);
    const storage = createNativeAuthStorage(KEY);
    expect(await storage.getItem(KEY)).toBe(SESSION);
    expect(await AsyncStorage.getItem(KEY)).toBeNull();
    expect(mockMMKV.has(KEY)).toBe(false);
    expect(mockSecure.get(KEY)).toBe(SESSION);
    await storage.removeItem(KEY);
    expect(mockSecure.has(KEY)).toBe(false);
    expect(await createNativeAuthStorage(KEY).getItem(KEY)).toBeNull();
  },
);

it('does not discard legacy data when native storage is unavailable', async () => {
  mockMMKV.set(KEY, SESSION);
  jest.mocked(SecureStore.isAvailableAsync).mockResolvedValueOnce(false);
  await expect(createNativeAuthStorage(KEY).getItem(KEY)).rejects.toThrow();
  expect(mockMMKV.get(KEY)).toBe(SESSION);
});

it.each([false, true])(
  'wires native storage and gates placeholder auth; configured=%s',
  async (configured) => {
    const createClient = jest.fn(() => ({}));
    const processLock = jest.fn();
    jest.doMock('@supabase/supabase-js', () => ({ createClient, processLock }));
    const previousOS = Platform.OS;
    const previousUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
    const previousKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;
    process.env.EXPO_PUBLIC_SUPABASE_URL = configured ? 'https://native-test.supabase.co' : '';
    process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY = configured ? 'test-anon' : '';
    Platform.OS = 'ios';
    try {
      await jest.isolateModulesAsync(async () => {
        await import('../supabase');
      });
      expect(createClient).toHaveBeenCalledWith(expect.any(String), expect.any(String), {
        auth: expect.objectContaining({
          storageKey: configured ? 'sb-native-test-auth-token' : KEY,
          lock: processLock,
          persistSession: configured,
          autoRefreshToken: configured,
          storage: expect.objectContaining({
            getItem: expect.any(Function),
            setItem: expect.any(Function),
            removeItem: expect.any(Function),
          }),
        }),
      });
    } finally {
      Platform.OS = previousOS;
      if (previousUrl === undefined) delete process.env.EXPO_PUBLIC_SUPABASE_URL;
      else process.env.EXPO_PUBLIC_SUPABASE_URL = previousUrl;
      if (previousKey === undefined) delete process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;
      else process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY = previousKey;
      jest.dontMock('@supabase/supabase-js');
    }
  },
);

it('actual Supabase SDK resumes a migrated session and propagates storage read errors', async () => {
  const { createClient } =
    jest.requireActual<typeof import('@supabase/supabase-js')>('@supabase/supabase-js');
  mockMMKV.set(KEY, SESSION);
  const client = createClient('https://placeholder.supabase.co', 'test-anon', {
    auth: {
      storage: createNativeAuthStorage(KEY),
      storageKey: KEY,
      autoRefreshToken: false,
      detectSessionInUrl: false,
    },
  });
  const result = await client.auth.getSession();
  expect(result.data.session?.refresh_token).toBe('refresh');
  expect(mockMMKV.has(KEY)).toBe(false);
  jest.mocked(SecureStore.getItemAsync).mockRejectedValueOnce(new Error('locked'));
  await expect(client.auth.getSession()).rejects.toThrow('Secure storage read failed');
  expect(mockSecure.get(KEY)).toBe(SESSION);
});
