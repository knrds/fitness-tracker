import { supabase, isSupabaseConfigured } from '../utils/supabase';
import { useAuthStore } from '../stores/authStore';
import { useProfileStore } from '../stores/profileStore';
import { logger } from '../utils/logger';
import { z } from 'zod';
import { UUIDSchema } from '@fitness-tracker/domain';
import { getStorageScope, isScopeCurrent } from '../data/storageScope';

export type DeletionCapabilityCode =
  | 'READY'
  | 'BACKEND_NOT_CONFIGURED'
  | 'NOT_AUTHENTICATED'
  | 'OFFLINE';

export interface DeletionCapabilityResult {
  available: boolean;
  code: DeletionCapabilityCode;
  reason: string;
}

export interface AccountDeletionRequest {
  confirmationText: string;
}

export interface AccountDeletionResult {
  success: boolean;
  code?: 'SUCCESS' | 'CONFIRMATION_INVALID' | 'DOUBLE_SUBMIT' | 'OFFLINE' | 'AUTH_EXPIRED' | 'CLOUD_RPC_FAILED' | 'ACCOUNT_CHANGED' | 'LOCAL_CLEANUP_FAILED' | 'SIGN_OUT_FAILED' | 'BACKEND_NOT_CONFIGURED';
  error?: string;
  cloudDeletionConfirmed?: boolean;
  localCleanupExecuted: boolean;
}

export interface AccountDeletionDependencies {
  isConfigured?: () => boolean;
  isOnline: () => boolean;
  getAuthContext: () => Promise<{ isAuthenticated: boolean; userId: string | null; isExpired: boolean }>;
  callCloudRpc: (fnName: string) => Promise<{ data?: unknown; error: { message: string; code?: string } | null }>;
  clearLocalData: () => Promise<void>;
  signOut: () => Promise<void>;
}

export const CONFIRMATION_KEYWORD = 'DELETE';
export const CONFIRMATION_KEYWORD_DE = 'LÖSCHEN';

// Client contract only: no deployed RPC is assumed. HTTP success or a void
// response never authorizes a destructive local cleanup.
const DeletionReceiptSchema = z.object({
  version: z.literal(1),
  success: z.literal(true),
  user_id: UUIDSchema,
  deleted_at: z.string().datetime({ offset: true }),
}).strict();

class AccountDeletionService {
  private isDeletionInProgress = false;

  private defaultDeps: AccountDeletionDependencies = {
    isConfigured: () => isSupabaseConfigured,
    isOnline: () => {
      // In mobile environment, can be inspected via NetInfo or navigator.onLine
      if (typeof navigator !== 'undefined' && 'onLine' in navigator) {
        return navigator.onLine !== false;
      }
      return true;
    },
    getAuthContext: async () => {
      if (!isSupabaseConfigured) {
        return { isAuthenticated: false, userId: null, isExpired: false };
      }
      try {
        const { data, error } = await supabase.auth.getSession();
        if (error || !data.session) {
          return { isAuthenticated: false, userId: null, isExpired: true };
        }
        const expiresAt = data.session.expires_at ? data.session.expires_at * 1000 : Infinity;
        const isExpired = Date.now() > expiresAt;
        return {
          isAuthenticated: !isExpired,
          userId: data.session.user.id,
          isExpired,
        };
      } catch {
        return { isAuthenticated: false, userId: null, isExpired: true };
      }
    },
    callCloudRpc: async (fnName: string) => {
      try {
        const { data, error } = await supabase.rpc(fnName);
        return { data, error: error ? { message: error.message, code: error.code } : null };
      } catch (err) {
        return { error: { message: err instanceof Error ? err.message : 'Network error calling cloud RPC' } };
      }
    },
    clearLocalData: async () => {
      await useProfileStore.getState().clearAllData();
    },
    signOut: async () => {
      const result = await useAuthStore.getState().signOut();
      if (result.error) throw new Error('Session cleanup failed');
    },
  };

  /**
   * Verifies if the backend and client state allow initiating account deletion.
   * Client prerequisites only; this does not certify that a backend RPC exists.
   */
  async verifyDeletionCapability(
    deps: AccountDeletionDependencies = this.defaultDeps
  ): Promise<DeletionCapabilityResult> {
    const isConfigured = deps.isConfigured ? deps.isConfigured() : isSupabaseConfigured;
    if (!isConfigured) {
      return {
        available: false,
        code: 'BACKEND_NOT_CONFIGURED',
        reason: 'Feature unavailable until production backend is configured.',
      };
    }

    if (!deps.isOnline()) {
      return {
        available: false,
        code: 'OFFLINE',
        reason: 'Account deletion requires an active internet connection.',
      };
    }

    const auth = await deps.getAuthContext();
    if (!auth.isAuthenticated || auth.isExpired) {
      return {
        available: false,
        code: 'NOT_AUTHENTICATED',
        reason: 'Authentication required. Please sign in to verify account ownership.',
      };
    }

    return {
      available: true,
      code: 'READY',
      reason: 'Client prerequisites met; backend deletion must still be confirmed.',
    };
  }

  /**
   * Executes the deletion request with strict guards:
   * 1. Immediate lock against double-submits.
   * 2. Confirmation text must match 'DELETE' or 'LÖSCHEN'.
   * 3. Cloud failure preserves local data (Zero-Data-Loss on partial failure).
   * 4. Cloud success triggers confirmed local data cleanup and logout.
   */
  async requestAccountDeletion(
    request: AccountDeletionRequest,
    deps: AccountDeletionDependencies = this.defaultDeps
  ): Promise<AccountDeletionResult> {
    // 1. Guard against double-submits immediately
    if (this.isDeletionInProgress) {
      return {
        success: false,
        code: 'DOUBLE_SUBMIT',
        error: 'Account deletion is already in progress. Please wait.',
        localCleanupExecuted: false,
      };
    }

    // 2. Exact confirmation verification
    const normalizedInput = (request.confirmationText ?? '').trim().toUpperCase();
    if (normalizedInput !== CONFIRMATION_KEYWORD && normalizedInput !== CONFIRMATION_KEYWORD_DE) {
      return {
        success: false,
        code: 'CONFIRMATION_INVALID',
        error: `Confirmation text must match "${CONFIRMATION_KEYWORD}" or "${CONFIRMATION_KEYWORD_DE}".`,
        localCleanupExecuted: false,
      };
    }

    if (!(deps.isConfigured?.() ?? isSupabaseConfigured)) {
      return { success: false, code: 'BACKEND_NOT_CONFIGURED', localCleanupExecuted: false };
    }

    // 3. Connectivity check
    if (!deps.isOnline()) {
      return {
        success: false,
        code: 'OFFLINE',
        error: 'Offline account deletion is blocked. Internet connection is required.',
        localCleanupExecuted: false,
      };
    }

    const scope = getStorageScope();
    let cloudDeletionConfirmed = false;
    let localCleanupExecuted = false;
    const accountChanged = (): AccountDeletionResult => ({
      success: false,
      code: 'ACCOUNT_CHANGED',
      error: 'The account changed. No further local cleanup was attempted.',
      cloudDeletionConfirmed,
      localCleanupExecuted,
    });
    if (!isScopeCurrent(scope)) return accountChanged();

    // Lock process before starting async operations
    this.isDeletionInProgress = true;
    try {
      // 4. Authentication verification
      const auth = await deps.getAuthContext();
      if (!isScopeCurrent(scope)) return accountChanged();
      if (!auth.isAuthenticated || auth.isExpired || !UUIDSchema.safeParse(auth.userId).success) {
        return {
          success: false,
          code: 'AUTH_EXPIRED',
          error: 'Session expired or unauthenticated. Please re-authenticate before deleting account.',
          localCleanupExecuted: false,
        };
      }
      if (scope.partition !== `account:${auth.userId}`) return accountChanged();

      // 5. Execute cloud RPC delete_user_account
      const rpcResult = await deps.callCloudRpc('delete_user_account');

      const receipt = rpcResult && !rpcResult.error
        ? DeletionReceiptSchema.safeParse(rpcResult.data)
        : null;
      if (!receipt?.success || receipt.data.user_id !== auth.userId) {
        return {
          success: false,
          code: 'CLOUD_RPC_FAILED',
          error: 'Cloud deletion was not confirmed. Local data has been preserved.',
          localCleanupExecuted: false,
        };
      }

      cloudDeletionConfirmed = true;
      if (!isScopeCurrent(scope)) return accountChanged();

      // clearAllData independently checks its scope after asynchronous backup cleanup.
      try {
        await deps.clearLocalData();
        localCleanupExecuted = true;
      } catch {
        return { success: false, code: 'LOCAL_CLEANUP_FAILED', cloudDeletionConfirmed, localCleanupExecuted,
          error: 'Cloud deletion was confirmed, but local cleanup failed.' };
      }
      if (!isScopeCurrent(scope)) return accountChanged();
      try {
        await deps.signOut();
      } catch {
        return { success: false, code: 'SIGN_OUT_FAILED', cloudDeletionConfirmed, localCleanupExecuted,
          error: 'Cloud deletion and local cleanup completed, but sign-out failed.' };
      }
      const afterSignOut = getStorageScope();
      if (!isScopeCurrent(afterSignOut) || (!isScopeCurrent(scope) && afterSignOut.partition !== 'legacy')) {
        return accountChanged();
      }

      return {
        success: true,
        code: 'SUCCESS',
        cloudDeletionConfirmed,
        localCleanupExecuted: true,
      };
    } catch {
      logger.error('[AccountDeletion] Deletion request failed.');
      return {
        success: false,
        code: 'CLOUD_RPC_FAILED',
        error: 'Cloud deletion was not confirmed. Local data has been preserved.',
        localCleanupExecuted: false,
      };
    } finally {
      this.isDeletionInProgress = false;
    }
  }

}

export const accountDeletionService = new AccountDeletionService();
