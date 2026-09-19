import AsyncStorage from '@react-native-async-storage/async-storage';
import { MMKV } from 'react-native-mmkv';
import { isExpoGo } from './runtime';
import { createMigratingAuthStorage } from './secureStorage';

export function createNativeAuthStorage(sessionKey: string) {
  let mmkv: MMKV | undefined;
  const getLegacyMMKV = () => {
    if (isExpoGo) return null;
    // Lazy: never treat inability to open the legacy store as an empty store.
    mmkv ??= new MMKV({ id: 'supabase-auth-storage' });
    return mmkv;
  };
  return createMigratingAuthStorage({
    sessionKey,
    legacyStore: {
      getItem: async (key) => {
        try {
          const value = getLegacyMMKV()?.getString(key);
          return value ?? (await AsyncStorage.getItem(key));
        } catch {
          throw new Error('Legacy session read failed; original data preserved');
        }
      },
      removeItem: async (key) => {
        const results = await Promise.allSettled([
          Promise.resolve().then(() => getLegacyMMKV()?.delete(key)),
          AsyncStorage.removeItem(key),
        ]);
        if (results.some((result) => result.status === 'rejected')) {
          throw new Error('Legacy session cleanup incomplete; retry required');
        }
      },
    },
  });
}
