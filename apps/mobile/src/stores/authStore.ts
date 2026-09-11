import { create } from 'zustand';
import { Session, User as SupabaseUser } from '@supabase/supabase-js';

import { isSupabaseConfigured, supabase } from '../utils/supabase';
import {
  beginScopeChange,
  completeScopeChange,
  getStorageScope,
  isScopeCurrent,
} from '../data/storageScope';
import { UUIDSchema } from '@fitness-tracker/domain';

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
  isSwitchingAccount: boolean;
  sessionError: string | null;
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
  isSwitchingAccount: false,
  sessionError: null,

  initialize: async () => {
    if (get().isInitialized && !get().sessionError) return;
    if (!isSupabaseConfigured) {
      set({ isLoading: false, isInitialized: true, session: null, user: null, sessionError: null });
      return;
    }
    set({ isLoading: true, sessionError: null });
    const generation = getStorageScope().generation;
    try {
      const { data, error } = await supabase.auth.getSession();
      if (generation !== getStorageScope().generation) return;
      if (error) throw error;
      authSubscription?.unsubscribe();
      const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
        // This callback must remain synchronous; Supabase holds its auth lock here.
        void applyAccountSession(session);
      });
      authSubscription = listener.subscription;
      await applyAccountSession(data.session);
    } catch {
      if (generation !== getStorageScope().generation) return;
      set({
        isLoading: false,
        sessionError: 'Das Konto konnte nicht sicher geladen werden. Bitte versuche es erneut.',
      });
    }
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
    if (!error) await applyAccountSession(null);
    set({ isLoading: false });

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
        emailRedirectTo: 'fitness-tracker://',
      },
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

let accountChange: Promise<void> = Promise.resolve();
export function applyAccountSession(session: Session | null): Promise<void> {
  const current = useAuthStore.getState();
  if (
    current.isInitialized &&
    !current.isSwitchingAccount &&
    !current.sessionError &&
    current.user?.id === session?.user.id
  ) {
    useAuthStore.setState({ session, user: session?.user ?? null, isLoading: false });
    return Promise.resolve();
  }
  const generation = beginScopeChange();
  useAuthStore.setState({ isSwitchingAccount: true, sessionError: null });
  accountChange = accountChange.then(async () => {
    if (generation !== getStorageScope().generation) return;
    try {
      const partition = session ? `account:${UUIDSchema.parse(session.user.id)}` : 'legacy';
      const { switchPersistencePartition } = await import('./persistenceLifecycle');
      await switchPersistencePartition(partition, generation);
      if (!completeScopeChange(generation)) return;
      useAuthStore.setState({
        session,
        user: session?.user ?? null,
        isSwitchingAccount: false,
        isLoading: false,
        isInitialized: true,
        sessionError: null,
      });
      if (session && isSupabaseConfigured) {
        const scope = getStorageScope();
        // Schedule external calls after the auth callback has released its lock.
        setTimeout(() => {
          if (!isScopeCurrent(scope)) return;
          void import('./syncStore')
            .then(async ({ useSyncStore }) => {
              if (!isScopeCurrent(scope)) return;
              await useSyncStore.getState().pullFromCloud();
              if (isScopeCurrent(scope)) await useSyncStore.getState().processQueue();
            })
            .catch(() => {
              if (isScopeCurrent(scope))
                useAuthStore.setState({
                  sessionError: 'Cloud-Abgleich fehlgeschlagen. Lokale Daten bleiben erhalten.',
                });
            });
        }, 0);
      }
    } catch {
      if (generation !== getStorageScope().generation) return;
      useAuthStore.setState({
        session: null,
        user: null,
        isSwitchingAccount: false,
        isLoading: false,
        sessionError:
          'Die Daten dieses Kontos konnten nicht sicher geladen werden. Bitte versuche es erneut.',
      });
    }
  });
  return accountChange;
}
