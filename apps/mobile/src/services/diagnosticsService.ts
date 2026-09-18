import { Platform } from 'react-native';
import Constants from 'expo-constants';
import { useSyncStore } from '../stores/syncStore';

export type ObservabilityEventCategory =
  | 'app_start'
  | 'app_error'
  | 'auth_error'
  | 'sync_failure'
  | 'coach_failure'
  | 'export_failure'
  | 'account_delete_failure'
  | 'subscription_failure';

export interface ObservabilityEvent {
  id: string;
  category: ObservabilityEventCategory;
  code: string;
  timestamp: string;
  meta?: Record<string, string | number | boolean>;
}

export interface FeatureFlags {
  coachEnabled: boolean;
  exerciseMediaEnabled: boolean;
  cloudSyncEnabled: boolean;
  subscriptionsEnabled: boolean;
}

export interface DiagnosticSnapshot {
  appVersion: string;
  sdkVersion: string;
  platform: 'ios' | 'android' | 'windows' | 'macos' | 'web';
  isDev: boolean;
  featureFlags: FeatureFlags;
  syncQueueLength: number;
  recentErrorCodes: string[];
  generatedAt: string;
}

const DEFAULT_FEATURE_FLAGS: FeatureFlags = {
  coachEnabled: true,
  exerciseMediaEnabled: true,
  cloudSyncEnabled: true,
  subscriptionsEnabled: true,
};

const MAX_BUFFERED_EVENTS = 50;

/**
 * Provider-agnostic local Diagnostics & Privacy-Safe Telemetry Service.
 *
 * Constraints & Guarantees:
 * 1. Zero external 3rd-party network transmission (no Sentry, no PostHog, no Firebase).
 * 2. Strict PII boundary: No workout contents, body weights, emails, tokens, or coach messages.
 * 3. Ring buffer holds non-sensitive technical error codes for user support triage.
 */
const EMAIL_REGEX = /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}\b/g;
const BEARER_REGEX = /\bBearer\s+[A-Za-z0-9\-._~+/]+=*/gi;
const JWT_REGEX = /\beyJ[A-Za-z0-9-_]+\.[A-Za-z0-9-_]+\.[A-Za-z0-9-_]+\b/g;
const SUPABASE_KEY_REGEX = /(anon|service_role)?:?eyJ[A-Za-z0-9-_.]+/gi;
const SUPABASE_URL_REGEX = /https:\/\/[a-z0-9-]+\.supabase\.co/gi;

const BLOCKED_META_KEYS = new Set([
  'email',
  'token',
  'jwt',
  'password',
  'secret',
  'auth',
  'coachmessage',
  'coachcontent',
  'prompt',
  'workoutname',
  'weight',
  'weightkg',
  'bodyfat',
  'bodyvalues',
  'measurement',
  'measurements',
  'birthdate',
  'dateofbirth',
  'birthyear',
  'age',
  'sex',
  'biologicalsex',
  'gender',
  'height',
  'heightcm',
  'bodymetrics',
  'metric',
  'metrics',
]);

export function sanitizeDiagnosticString(input: string): string {
  if (!input || typeof input !== 'string') return '';
  return input
    .replace(EMAIL_REGEX, '[REDACTED_EMAIL]')
    .replace(BEARER_REGEX, '[REDACTED_BEARER]')
    .replace(JWT_REGEX, '[REDACTED_JWT]')
    .replace(SUPABASE_KEY_REGEX, '[REDACTED_KEY]')
    .replace(SUPABASE_URL_REGEX, 'https://[REDACTED].supabase.co')
    .slice(0, 160);
}

export function sanitizeDiagnosticMeta(
  meta?: Record<string, string | number | boolean>
): Record<string, string | number | boolean> | undefined {
  if (!meta) return undefined;
  const sanitized: Record<string, string | number | boolean> = {};

  for (const [key, value] of Object.entries(meta)) {
    const lowerKey = key.toLowerCase().replace(/[^a-z]/g, '');
    if (BLOCKED_META_KEYS.has(lowerKey)) {
      continue;
    }
    if (typeof value === 'string') {
      sanitized[key] = sanitizeDiagnosticString(value);
    } else if (typeof value === 'number' || typeof value === 'boolean') {
      sanitized[key] = value;
    }
  }

  return Object.keys(sanitized).length > 0 ? sanitized : undefined;
}

export class DiagnosticsService {
  private featureFlags: FeatureFlags = { ...DEFAULT_FEATURE_FLAGS };
  private eventBuffer: ObservabilityEvent[] = [];
  private eventCounter = 0;

  getFeatureFlags(): FeatureFlags {
    return { ...this.featureFlags };
  }

  isFeatureEnabled(flag: keyof FeatureFlags): boolean {
    return this.featureFlags[flag] ?? false;
  }

  setFeatureFlag(flag: keyof FeatureFlags, enabled: boolean): void {
    this.featureFlags[flag] = enabled;
  }

  resetFeatureFlags(): void {
    this.featureFlags = { ...DEFAULT_FEATURE_FLAGS };
  }

  /**
   * Records a strictly non-sensitive event to the local diagnostics buffer.
   */
  recordEvent(
    category: ObservabilityEventCategory,
    code: string,
    meta?: Record<string, string | number | boolean>
  ): void {
    const sanitizedMeta = sanitizeDiagnosticMeta(meta);
    const event: ObservabilityEvent = {
      id: `evt-${++this.eventCounter}`,
      category,
      code: sanitizeDiagnosticString(code),
      timestamp: new Date().toISOString(),
      ...(sanitizedMeta ? { meta: sanitizedMeta } : {}),
    };

    this.eventBuffer.push(event);
    if (this.eventBuffer.length > MAX_BUFFERED_EVENTS) {
      this.eventBuffer.shift();
    }
  }

  getRecentEvents(): ObservabilityEvent[] {
    return [...this.eventBuffer];
  }

  clearEvents(): void {
    this.eventBuffer = [];
  }

  /**
   * Produces a sanitized snapshot of application runtime diagnostics.
   */
  getDiagnosticsSnapshot(): DiagnosticSnapshot {
    const syncQueue = useSyncStore.getState().queue ?? [];
    const recentErrors = this.eventBuffer
      .filter((e) => e.category.includes('error') || e.category.includes('failure'))
      .map((e) => e.code)
      .slice(-10);

    return {
      appVersion: Constants.expoConfig?.version ?? '0.1.0-beta.6',
      sdkVersion: Constants.expoConfig?.sdkVersion ?? '54.0.0',
      platform: Platform.OS,
      isDev: typeof __DEV__ !== 'undefined' ? __DEV__ : false,
      featureFlags: this.getFeatureFlags(),
      syncQueueLength: syncQueue.length,
      recentErrorCodes: recentErrors,
      generatedAt: new Date().toISOString(),
    };
  }

  /**
   * Generates a privacy-safe support report string suitable for user export or bug reporting.
   */
  generateSupportReport(): string {
    const snapshot = this.getDiagnosticsSnapshot();
    return JSON.stringify(
      {
        _reportType: 'EVARO_SUPPORT_DIAGNOSTICS',
        disclaimer:
          'This technical report contains no personal health metrics, weights, tokens, or messages.',
        ...snapshot,
      },
      null,
      2
    );
  }
}

export const diagnosticsService = new DiagnosticsService();
