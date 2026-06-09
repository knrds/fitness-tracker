import { MMKV } from 'react-native-mmkv';
import { createClient } from '@supabase/supabase-js';

const isServer = typeof globalThis === 'undefined' || !('window' in globalThis);

// Setup dedicated MMKV storage for Supabase auth sessions (only on client)
const storage = !isServer ? new MMKV({ id: 'supabase-auth-storage' }) : null;

const supabaseStorage = {
  getItem: (key: string): string | null => {
    if (isServer || !storage) return null;
    return storage.getString(key) ?? null;
  },
  setItem: (key: string, value: string): void => {
    if (isServer || !storage) return;
    storage.set(key, value);
  },
  removeItem: (key: string): void => {
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
