import { MMKV } from 'react-native-mmkv';
import { createClient } from '@supabase/supabase-js';

const isServer = typeof globalThis === 'undefined' || !('window' in globalThis);

// Setup dedicated MMKV storage for Supabase auth sessions (only on client)
const storage = !isServer ? new MMKV({ id: 'supabase-auth-storage' }) : null;

const getTemporaryWebStorageItem = (key: string) => {
  if (typeof globalThis === 'undefined' || !('localStorage' in globalThis)) return null;

  try {
    return globalThis.localStorage.getItem(key);
  } catch {
    return null;
  }
};

const removeTemporaryWebStorageItem = (key: string) => {
  if (typeof globalThis === 'undefined' || !('localStorage' in globalThis)) return;

  try {
    globalThis.localStorage.removeItem(key);
  } catch {
    // Ignore browsers that block localStorage cleanup.
  }
};

const supabaseStorage = {
  getItem: (key: string): string | null => {
    if (isServer || !storage) return null;
    const storedValue = storage.getString(key);
    if (storedValue) return storedValue;

    const temporaryWebValue = getTemporaryWebStorageItem(key);
    if (temporaryWebValue) {
      storage.set(key, temporaryWebValue);
      removeTemporaryWebStorageItem(key);
      return temporaryWebValue;
    }

    return null;
  },
  setItem: (key: string, value: string): void => {
    if (isServer || !storage) return;
    storage.set(key, value);
  },
  removeItem: (key: string): void => {
    if (isServer || !storage) return;
    storage.delete(key);
    removeTemporaryWebStorageItem(key);
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
