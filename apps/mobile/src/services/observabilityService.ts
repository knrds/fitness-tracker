/**
 * EVARO Observability & Crash Monitoring Abstraction (WP-08 Task 08.01)
 *
 * Prepared for pluggable Crash Monitoring (e.g. Sentry) WITHOUT hard dependency lock-in.
 * Enforces strict client-side sanitization: Zero raw health, workout, coach, or auth data.
 */

import { redactString } from '../utils/logger';

export interface ObservabilityAdapter {
  captureException(error: Error, context?: Record<string, unknown>): void;
  captureBreadcrumb(category: string, message: string, data?: Record<string, unknown>): void;
  setUser(id: string | null): void;
}

export interface SanitizedPayload {
  name: string;
  message: string;
  stack?: string | undefined;
  context: Record<string, unknown>;
  timestamp: string;
}

/**
 * Forbidden key patterns: Never allow health, workout, coach, prompt or credential keys
 * into crash telemetries.
 */
const FORBIDDEN_KEY_PATTERN =
  /^(weight|gewicht|rep|reps|set|sets|saetze|volume|workout|session|exercise|uebung|body|waist|chest|arm|arms|calf|calves|thigh|thighs|hip|hips|prompt|completion|coach.*|message|messages|token|bearer|cookie|auth.*|password|email|mail|photo|audio|recording|voice)$/i;

const EMAIL_REGEX = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g;
const JWT_TOKEN_REGEX = /eyJ[a-zA-Z0-9_-]{10,}\.[a-zA-Z0-9_-]{10,}\.[a-zA-Z0-9_-]{10,}/g;
const BEARER_HEADER_REGEX = /Bearer\s+[a-zA-Z0-9._~+/-]+=*/gi;

/**
 * Scrubs strings of potential PII (emails, JWTs, bearer tokens).
 */
export function sanitizeString(input: string): string {
  if (!input || typeof input !== 'string') return '';
  return redactString(
    input
      .replace(EMAIL_REGEX, '[REDACTED_EMAIL]')
      .replace(JWT_TOKEN_REGEX, '[REDACTED_TOKEN]')
      .replace(BEARER_HEADER_REGEX, 'Bearer [REDACTED_TOKEN]'),
  );
}

/**
 * Bounded local redaction. Remote telemetry additionally requires allowlisted metadata.
 */
function sanitizeContextUnchecked(
  context?: Record<string, unknown>,
  depth = 0,
  seen = new WeakSet<object>(),
): Record<string, unknown> {
  if (!context || typeof context !== 'object') return {};
  if (depth >= 5) return { truncated: true };
  if (seen.has(context)) return { circular: true };
  seen.add(context);

  const sanitized: Record<string, unknown> = {};

  for (const key of Object.keys(context).slice(0, 50)) {
    const normalizedKey = key.replace(/[_-]/g, '');
    if (
      FORBIDDEN_KEY_PATTERN.test(key) ||
      /^(accessToken|refreshToken|apiKey|serviceRole|clientSecret|secret|bodyMeasurements|workoutHistory|chatHistory|imageUrl|audioUrl)$/i.test(
        normalizedKey,
      )
    ) {
      sanitized[key] = '[REDACTED_SENSITIVE_KEY]';
      continue;
    }
    // Never execute a getter while reporting another error.
    const descriptor = Object.getOwnPropertyDescriptor(context, key);
    if (!descriptor || !('value' in descriptor)) {
      sanitized[key] = '[ACCESSOR]';
      continue;
    }
    const value: unknown = descriptor.value;

    if (value === null || value === undefined) {
      sanitized[key] = value;
    } else if (typeof value === 'string') {
      sanitized[key] = sanitizeString(value);
    } else if (typeof value === 'number' || typeof value === 'boolean') {
      sanitized[key] = value;
    } else if (Array.isArray(value)) {
      const items: unknown[] = [];
      for (let index = 0; index < Math.min(value.length, 5); index++) {
        const descriptor = Object.getOwnPropertyDescriptor(value, String(index));
        if (!descriptor || !('value' in descriptor)) {
          items.push('[ACCESSOR]');
          continue;
        }
        const item: unknown = descriptor.value;
        items.push(
          typeof item === 'object' && item !== null
            ? sanitizeContext(item as Record<string, unknown>, depth + 1, seen)
            : typeof item === 'string'
              ? sanitizeString(item)
              : typeof item === 'number' || typeof item === 'boolean' || item == null
                ? item
                : '[UNSUPPORTED_TYPE]',
        );
      }
      sanitized[key] = items;
    } else if (typeof value === 'object') {
      sanitized[key] = sanitizeContext(value as Record<string, unknown>, depth + 1, seen);
    } else {
      sanitized[key] = '[UNSUPPORTED_TYPE]';
    }
  }

  return sanitized;
}

/** Reporting an error must not execute accessors or fail on hostile proxies. */
export function sanitizeContext(
  context?: Record<string, unknown>,
  depth = 0,
  seen = new WeakSet<object>(),
): Record<string, unknown> {
  try {
    return sanitizeContextUnchecked(context, depth, seen);
  } catch {
    return { unavailable: true };
  }
}

const COMPONENTS = new Set([
  'ErrorBoundary',
  'RestTimer',
  'LoginScreen',
  'WorkoutSession',
  'CoachScreen',
  'ProfileScreen',
]);
const ROUTES = new Set([
  '/',
  '/history',
  '/profile',
  '/body',
  '/coach',
  '/workouts',
  '/exercises',
  '/workout/session',
]);
const CATEGORIES = new Set(['navigation', 'action', 'network', 'storage', 'render', 'sync']);
function operationalContext(raw?: Record<string, unknown>): Record<string, unknown> {
  const safe: Record<string, unknown> = {};
  try {
    for (const key of ['component', 'route', 'errorId']) {
      const value = raw && Object.getOwnPropertyDescriptor(raw, key)?.value;
      if (typeof value !== 'string') continue;
      if (
        (key === 'component' && COMPONENTS.has(value)) ||
        (key === 'route' && ROUTES.has(value)) ||
        (key === 'errorId' && /^ERR-[A-F0-9]{6}$/.test(value))
      )
        safe[key] = value;
    }
  } catch {
    /* Only known operational fields may leave the process. */
  }
  return safe;
}
function errorCategory(error: Error): string {
  try {
    const name = Object.getOwnPropertyDescriptor(error, 'name')?.value;
    if (
      typeof name === 'string' &&
      ['Error', 'TypeError', 'RangeError', 'SyntaxError', 'ReferenceError', 'URIError'].includes(
        name,
      )
    )
      return name;
    if (error instanceof TypeError) return 'TypeError';
    if (error instanceof RangeError) return 'RangeError';
    if (error instanceof SyntaxError) return 'SyntaxError';
  } catch {
    /* A malformed error remains a generic application error. */
  }
  return 'Error';
}

export class ObservabilityService {
  private adapter: ObservabilityAdapter | null = null;
  private breadcrumbs: Array<{ category: string; message: string; timestamp: string }> = [];
  private readonly maxBreadcrumbs = 20;

  /**
   * Plugs in a crash monitoring adapter (e.g. Sentry) when real credentials exist.
   */
  setAdapter(adapter: ObservabilityAdapter | null): void {
    this.adapter = adapter;
  }

  getAdapter(): ObservabilityAdapter | null {
    return this.adapter;
  }

  /**
   * Captures an exception with strict PII sanitization.
   */
  captureException(error: Error, rawContext?: Record<string, unknown>): SanitizedPayload {
    const sanitizedMsg = 'Application error';
    const sanitizedContext = operationalContext(rawContext);

    const payload: SanitizedPayload = {
      name: errorCategory(error),
      message: sanitizedMsg,
      context: sanitizedContext,
      timestamp: new Date().toISOString(),
    };

    if (this.adapter) {
      try {
        // Do not forward raw message, stack, cause or arbitrary Error properties.
        const safeError = new Error(payload.message);
        safeError.name = payload.name;
        if (payload.stack) safeError.stack = payload.stack;
        else delete safeError.stack;
        this.adapter.captureException(safeError, sanitizedContext);
      } catch {
        // Observability must never crash the host application
      }
    }

    return payload;
  }

  /**
   * Adds an operational breadcrumb without sensitive payloads.
   */
  captureBreadcrumb(category: string, _message: string, data?: Record<string, unknown>): void {
    const sanitizedData = operationalContext(data);
    const entry = {
      category: CATEGORIES.has(category) ? category : 'action',
      message: 'Operational event',
      timestamp: new Date().toISOString(),
    };

    this.breadcrumbs.push(entry);
    if (this.breadcrumbs.length > this.maxBreadcrumbs) {
      this.breadcrumbs.shift();
    }

    if (this.adapter) {
      try {
        this.adapter.captureBreadcrumb(entry.category, entry.message, sanitizedData);
      } catch {
        // Swallow
      }
    }
  }

  getRecentBreadcrumbs() {
    return [...this.breadcrumbs];
  }

  clearBreadcrumbs() {
    this.breadcrumbs = [];
  }
}

export const observabilityService = new ObservabilityService();
