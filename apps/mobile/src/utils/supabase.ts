import { MMKV } from 'react-native-mmkv';
import { createClient } from '@supabase/supabase-js';
import { Platform } from 'react-native';

const isServer = typeof globalThis === 'undefined' || !('window' in globalThis);
const isWeb = Platform.OS === 'web';

// Setup dedicated MMKV storage for Supabase auth sessions (only on client)
const storage = !isServer && !isWeb ? new MMKV({ id: 'supabase-auth-storage' }) : null;

const getWebStorage = () => {
  if (!isWeb || isServer || !('localStorage' in globalThis)) return null;
  try {
    const storage = globalThis.localStorage;
    const probeKey = '__fitness_tracker_supabase_probe__';
    storage.setItem(probeKey, '1');
    storage.removeItem(probeKey);
    return storage;
  } catch {
    return null;
  }
};

const supabaseStorage = {
  getItem: (key: string): string | null => {
    const webStorage = getWebStorage();
    if (webStorage) return webStorage.getItem(key);
    if (isServer || !storage) return null;
    return storage.getString(key) ?? null;
  },
  setItem: (key: string, value: string): void => {
    const webStorage = getWebStorage();
    if (webStorage) {
      webStorage.setItem(key, value);
      return;
    }
    if (isServer || !storage) return;
    storage.set(key, value);
  },
  removeItem: (key: string): void => {
    const webStorage = getWebStorage();
    if (webStorage) {
      webStorage.removeItem(key);
      return;
    }
    if (isServer || !storage) return;
    storage.delete(key);
  },
};

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL || 'https://placeholder.supabase.co';
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || 'placeholder';

export const isSupabaseConfigured =
  supabaseUrl !== 'https://placeholder.supabase.co' &&
  supabaseAnonKey !== 'placeholder' &&
  supabaseUrl.trim().length > 0 &&
  supabaseAnonKey.trim().length > 0;

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: supabaseStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});
