import AsyncStorage from '@react-native-async-storage/async-storage';
import { MMKV } from 'react-native-mmkv';
import { createClient } from '@supabase/supabase-js';

import { isExpoGo } from './runtime';

const isServer = typeof globalThis === 'undefined' || !('window' in globalThis);

const createSupabaseStorage = (): MMKV | null => {
  if (isServer || isExpoGo) return null;

  try {
    return new MMKV({ id: 'supabase-auth-storage' });
  } catch (error) {
    console.warn('[Supabase] MMKV auth storage unavailable. Falling back to AsyncStorage.', error);
    return null;
  }
};

// Setup dedicated MMKV storage for Supabase auth sessions when available.
const storage = createSupabaseStorage();

type WebStorageLike = {
  getItem: (key: string) => string | null;
  removeItem: (key: string) => void;
};

const getWebLocalStorage = (): WebStorageLike | null => {
  const host = globalThis as typeof globalThis & {
    window?: { localStorage?: WebStorageLike };
  };
  return host.window?.localStorage ?? null;
};

const getTemporaryWebStorageItem = (key: string): string | null => {
  const webStorage = getWebLocalStorage();
  if (!webStorage) return null;

  try {
    return webStorage.getItem(key);
  } catch {
    return null;
  }
};

const removeTemporaryWebStorageItem = (key: string) => {
  const webStorage = getWebLocalStorage();
  if (!webStorage) return;

  try {
    webStorage.removeItem(key);
  } catch {
    // Ignore locked-down browser storage.
  }
};

const supabaseStorage = {
  getItem: async (key: string): Promise<string | null> => {
    if (isServer) return null;
    if (!storage) return AsyncStorage.getItem(key);

    const mmkvValue = storage.getString(key);
    if (mmkvValue != null) return mmkvValue;

    const temporaryWebValue = getTemporaryWebStorageItem(key);
    if (temporaryWebValue != null) {
      storage.set(key, temporaryWebValue);
      removeTemporaryWebStorageItem(key);
    }
    return temporaryWebValue;
  },
  setItem: async (key: string, value: string): Promise<void> => {
    if (isServer) return;
    if (!storage) {
      await AsyncStorage.setItem(key, value);
      return;
    }
    storage.set(key, value);
  },
  removeItem: async (key: string): Promise<void> => {
    if (isServer) return;
    if (!storage) {
      await AsyncStorage.removeItem(key);
      return;
    }
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
