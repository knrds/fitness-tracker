/**
 * EVARO Observability & Crash Monitoring Abstraction (WP-08 Task 08.01)
 *
 * Prepared for pluggable Crash Monitoring (e.g. Sentry) WITHOUT hard dependency lock-in.
 * Enforces strict client-side sanitization: Zero raw health, workout, coach, or auth data.
 */

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
  return input
    .replace(EMAIL_REGEX, '[REDACTED_EMAIL]')
    .replace(JWT_TOKEN_REGEX, '[REDACTED_TOKEN]')
    .replace(BEARER_HEADER_REGEX, 'Bearer [REDACTED_TOKEN]');
}

/**
 * Deeply sanitizes arbitrary context objects to guarantee zero health/auth data leaks.
 */
export function sanitizeContext(context?: Record<string, unknown>): Record<string, unknown> {
  if (!context || typeof context !== 'object') return {};

  const sanitized: Record<string, unknown> = {};

  for (const [key, value] of Object.entries(context)) {
    if (FORBIDDEN_KEY_PATTERN.test(key)) {
      sanitized[key] = '[REDACTED_SENSITIVE_KEY]';
      continue;
    }

    if (value === null || value === undefined) {
      sanitized[key] = value;
    } else if (typeof value === 'string') {
      sanitized[key] = sanitizeString(value);
    } else if (typeof value === 'number' || typeof value === 'boolean') {
      sanitized[key] = value;
    } else if (Array.isArray(value)) {
      sanitized[key] = value.slice(0, 5).map((item) =>
        typeof item === 'object' && item !== null
          ? sanitizeContext(item as Record<string, unknown>)
          : typeof item === 'string'
            ? sanitizeString(item)
            : item,
      );
    } else if (typeof value === 'object') {
      sanitized[key] = sanitizeContext(value as Record<string, unknown>);
    } else {
      sanitized[key] = '[UNSUPPORTED_TYPE]';
    }
  }

  return sanitized;
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
    const sanitizedMsg = sanitizeString(error.message || '');
    const sanitizedContext = sanitizeContext(rawContext);

    const payload: SanitizedPayload = {
      name: error.name || 'Error',
      message: sanitizedMsg,
      context: sanitizedContext,
      timestamp: new Date().toISOString(),
      ...(error.stack ? { stack: sanitizeString(error.stack) } : {}),
    };

    if (this.adapter) {
      try {
        this.adapter.captureException(error, sanitizedContext);
      } catch {
        // Observability must never crash the host application
      }
    }

    return payload;
  }

  /**
   * Adds an operational breadcrumb without sensitive payloads.
   */
  captureBreadcrumb(category: string, message: string, data?: Record<string, unknown>): void {
    const sanitizedData = sanitizeContext(data);
    const entry = {
      category: sanitizeString(category),
      message: sanitizeString(message),
      timestamp: new Date().toISOString(),
    };

    this.breadcrumbs.push(entry);
    if (this.breadcrumbs.length > this.maxBreadcrumbs) {
      this.breadcrumbs.shift();
    }

    if (this.adapter) {
      try {
        this.adapter.captureBreadcrumb(category, message, sanitizedData);
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
