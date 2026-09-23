/**
 * Central Beta Access Configuration for EVARO.
 * Provides a single, production-guarded source of truth for temporary beta feature access.
 */

export interface BetaAccessConfig {
  betaFullAccessEnabled: boolean;
  environment: 'development' | 'beta' | 'production' | 'test';
}

// Runtime kill-switch override (defaults to true for beta builds, false in production)
let runtimeBetaOverride: boolean | null = null;

export function getAppEnvironment(): 'development' | 'beta' | 'production' | 'test' {
  const explicit = process.env.EXPO_PUBLIC_APP_ENV || process.env.APP_ENV;
  if (explicit === 'production') return 'production';
  if (explicit === 'beta') return 'beta';
  if (explicit === 'development') return 'development';
  if (explicit === 'test') return 'test';

  if (process.env.NODE_ENV === 'production') return 'production';
  if (process.env.NODE_ENV === 'test') return 'test';

  return 'development';
}

/**
 * Hard fail-closed check: Production environments can NEVER enable Beta Full Access.
 */
export function isFailClosedProduction(): boolean {
  return getAppEnvironment() === 'production';
}

/**
 * Determines whether the current app instance has Beta Full Access active.
 * Fail-closed: unconditionally false if running in production.
 */
export function isBetaFullAccess(): boolean {
  if (isFailClosedProduction()) {
    return false;
  }

  if (runtimeBetaOverride !== null) {
    return runtimeBetaOverride;
  }

  // Check explicit environment flags
  const explicitFlag = process.env.EXPO_PUBLIC_BETA_FULL_ACCESS;
  if (explicitFlag === 'false') return false;

  const env = getAppEnvironment();
  return env === 'beta' || env === 'development' || env === 'test';
}

/**
 * Central runtime kill-switch for Beta Full Access.
 * Useful for automated tests and emergency deactivation without redeployment.
 */
export function setBetaFullAccessKillSwitch(enabled: boolean | null): void {
  runtimeBetaOverride = enabled;
}
