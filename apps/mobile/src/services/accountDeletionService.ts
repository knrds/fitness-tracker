import { supabase, isSupabaseConfigured } from '../utils/supabase';
import { useAuthStore } from '../stores/authStore';
import { useProfileStore } from '../stores/profileStore';
import { logger } from '../utils/logger';

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
  code?: 'SUCCESS' | 'CONFIRMATION_INVALID' | 'DOUBLE_SUBMIT' | 'OFFLINE' | 'AUTH_EXPIRED' | 'CLOUD_RPC_FAILED';
  error?: string;
  localCleanupExecuted: boolean;
}

export interface AccountDeletionDependencies {
  isConfigured?: () => boolean;
  isOnline: () => boolean;
  getAuthContext: () => Promise<{ isAuthenticated: boolean; userId: string | null; isExpired: boolean }>;
  callCloudRpc: (fnName: string) => Promise<{ error: { message: string; code?: string } | null }>;
  clearLocalData: () => Promise<void>;
  signOut: () => Promise<void>;
}

export const CONFIRMATION_KEYWORD = 'DELETE';
export const CONFIRMATION_KEYWORD_DE = 'LÖSCHEN';

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
        const { error } = await supabase.rpc(fnName);
        return { error: error ? { message: error.message, code: error.code } : null };
      } catch (err) {
        return { error: { message: err instanceof Error ? err.message : 'Network error calling cloud RPC' } };
      }
    },
    clearLocalData: async () => {
      await useProfileStore.getState().clearAllData();
    },
    signOut: async () => {
      await useAuthStore.getState().signOut();
    },
  };

  /**
   * Verifies if the backend and client state allow initiating account deletion.
   * Ensures the UI never shows a false or fake deletion button.
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
      reason: 'Backend capability verified and authenticated session active.',
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

    // 3. Connectivity check
    if (!deps.isOnline()) {
      return {
        success: false,
        code: 'OFFLINE',
        error: 'Offline account deletion is blocked. Internet connection is required.',
        localCleanupExecuted: false,
      };
    }

    // Lock process before starting async operations
    this.isDeletionInProgress = true;
    try {
      // 4. Authentication verification
      const auth = await deps.getAuthContext();
      if (!auth.isAuthenticated || auth.isExpired) {
        return {
          success: false,
          code: 'AUTH_EXPIRED',
          error: 'Session expired or unauthenticated. Please re-authenticate before deleting account.',
          localCleanupExecuted: false,
        };
      }
      logger.info(`[AccountDeletion] Initiating cloud RPC delete_user_account for user: ${auth.userId}`);

      // 5. Execute cloud RPC delete_user_account
      const rpcResult = await deps.callCloudRpc('delete_user_account');

      if (rpcResult.error) {
        logger.error('[AccountDeletion] Cloud RPC deletion failed. Preserving local user data.', rpcResult.error);
        return {
          success: false,
          code: 'CLOUD_RPC_FAILED',
          error: `Cloud deletion failed: ${rpcResult.error.message}. Local data preserved.`,
          localCleanupExecuted: false,
        };
      }

      // 6. Cloud deletion confirmed -> Execute local data cleanup
      logger.info('[AccountDeletion] Cloud deletion confirmed. Purging local device data.');
      await this.clearLocalDataAfterConfirmedCloudDeletion(deps);

      return {
        success: true,
        code: 'SUCCESS',
        localCleanupExecuted: true,
      };
    } catch (unexpectedError) {
      logger.error('[AccountDeletion] Unexpected error during deletion:', unexpectedError);
      return {
        success: false,
        code: 'CLOUD_RPC_FAILED',
        error: unexpectedError instanceof Error ? unexpectedError.message : 'Unexpected deletion error',
        localCleanupExecuted: false,
      };
    } finally {
      this.isDeletionInProgress = false;
    }
  }

  /**
   * Purges local SQLite data, resets stores, and signs out.
   * Only called AFTER the cloud has confirmed deletion of the account.
   */
  async clearLocalDataAfterConfirmedCloudDeletion(
    deps: AccountDeletionDependencies = this.defaultDeps
  ): Promise<void> {
    try {
      await deps.clearLocalData();
    } catch (err) {
      logger.warn('[AccountDeletion] Warning: local store cleanup encountered an error:', err);
    }
    try {
      await deps.signOut();
    } catch (err) {
      logger.warn('[AccountDeletion] Warning: sign-out encountered an error:', err);
    }
  }
}

export const accountDeletionService = new AccountDeletionService();
