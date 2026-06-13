import { create } from 'zustand';
import { Session, User as SupabaseUser } from '@supabase/supabase-js';

import { isSupabaseConfigured, supabase } from '../utils/supabase';

interface AuthCredentials {
  email: string;
  password: string;
}

export interface AuthState {
  session: Session | null;
  user: SupabaseUser | null;
  isLoading: boolean;
  isConfigured: boolean;
  isInitialized: boolean;
  initialize: () => Promise<void>;
  signIn: (credentials: AuthCredentials) => Promise<{ error?: string }>;
  signUp: (
    credentials: AuthCredentials & { displayName: string },
  ) => Promise<{ error?: string; needsEmailVerification: boolean }>;
  signOut: () => Promise<{ error?: string }>;
  resendVerificationEmail: (email: string) => Promise<{ error?: string }>;
  sendPasswordResetEmail: (email: string) => Promise<{ error?: string }>;
  updatePassword: (password: string) => Promise<{ error?: string }>;
}

let authSubscription: { unsubscribe: () => void } | null = null;

export const useAuthStore = create<AuthState>()((set, get) => ({
  session: null,
  user: null,
  isLoading: isSupabaseConfigured,
  isConfigured: isSupabaseConfigured,
  isInitialized: false,

  initialize: async () => {
    if (get().isInitialized) return;

    if (!isSupabaseConfigured) {
      set({ isLoading: false, isInitialized: true, session: null, user: null });
      return;
    }

    set({ isLoading: true });

    const { data, error } = await supabase.auth.getSession();
    if (!error) {
      set({
        session: data.session,
        user: data.session?.user ?? null,
      });
    }

    authSubscription?.unsubscribe();
    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      set({
        session,
        user: session?.user ?? null,
        isLoading: false,
        isInitialized: true,
      });
    });
    authSubscription = listener.subscription;

    set({ isLoading: false, isInitialized: true });
  },

  signIn: async ({ email, password }) => {
    if (!isSupabaseConfigured) {
      return { error: 'Supabase is not configured for this environment.' };
    }

    set({ isLoading: true });
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    set({ isLoading: false });

    return error ? { error: error.message } : {};
  },

  signUp: async ({ email, password, displayName }) => {
    if (!isSupabaseConfigured) {
      return {
        error: 'Supabase is not configured for this environment.',
        needsEmailVerification: false,
      };
    }

    set({ isLoading: true });
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          display_name: displayName,
        },
      },
    });
    set({ isLoading: false });

    if (error) {
      return { error: error.message, needsEmailVerification: false };
    }

    return { needsEmailVerification: data.session === null };
  },

  signOut: async () => {
    if (!isSupabaseConfigured) return {};

    set({ isLoading: true });
    const { error } = await supabase.auth.signOut();
    set({
      isLoading: false,
      session: error ? get().session : null,
      user: error ? get().user : null,
    });

    return error ? { error: error.message } : {};
  },

  resendVerificationEmail: async (email) => {
    if (!isSupabaseConfigured) {
      return { error: 'Supabase is not configured for this environment.' };
    }

    set({ isLoading: true });
    const { error } = await supabase.auth.resend({
      type: 'signup',
      email,
      options: {
        emailRedirectTo: 'fitness-tracker://'
      }
    });
    set({ isLoading: false });

    return error ? { error: error.message } : {};
  },

  sendPasswordResetEmail: async (email) => {
    if (!isSupabaseConfigured) {
      return { error: 'Supabase is not configured for this environment.' };
    }

    set({ isLoading: true });
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: 'fitness-tracker://auth/reset-password',
    });
    set({ isLoading: false });

    return error ? { error: error.message } : {};
  },

  updatePassword: async (password) => {
    if (!isSupabaseConfigured) {
      return { error: 'Supabase is not configured for this environment.' };
    }

    set({ isLoading: true });
    const { error } = await supabase.auth.updateUser({ password });
    set({ isLoading: false });

    return error ? { error: error.message } : {};
  },
}));
