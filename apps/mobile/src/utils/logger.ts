/**
 * Privacy-safe logging utility for EVARO.
 *
 * Ensures no sensitive data (JWTs, auth tokens, passwords, emails,
 * base64 audio/images, coach prompts, or raw session payloads) leaks
 * into console logs, terminal output, crash reports, or observability tools.
 */

const EMAIL_REGEX = /[a-zA-Z0-9_.+-]+@[a-zA-Z0-9-]+\.[a-zA-Z0-9-.]+/g;
const JWT_REGEX = /eyJ[a-zA-Z0-9_-]{10,}\.eyJ[a-zA-Z0-9_-]{10,}\.[a-zA-Z0-9_-]+/g;
const BEARER_REGEX = /Bearer\s+[a-zA-Z0-9._~+/-]+=*/gi;
const BASE64_DATA_REGEX = /data:(?:image|audio)\/[^;]+;base64,[a-zA-Z0-9+/=]+/gi;
const SENSITIVE_KV_REGEX =
  /(?:apikey|api_key|secret|password|access_token|refresh_token)\s*[:=]\s*['"]?[^\s"',}]+/gi;

const SENSITIVE_KEY_NAMES = new Set([
  'password',
  'token',
  'access_token',
  'refresh_token',
  'secret',
  'apikey',
  'api_key',
  'authorization',
  'cookie',
  'client_secret',
  'prompt',
  'user_id',
  'userid',
]);

/**
 * Redacts known sensitive patterns from raw string content.
 */
export function redactString(content: string): string {
  if (!content) return content;
  return content
    .replace(BASE64_DATA_REGEX, 'data:[REDACTED_BASE64]')
    .replace(JWT_REGEX, '[REDACTED_JWT]')
    .replace(BEARER_REGEX, 'Bearer [REDACTED_TOKEN]')
    .replace(SENSITIVE_KV_REGEX, '[REDACTED_SECRET]')
    .replace(EMAIL_REGEX, '[REDACTED_EMAIL]');
}

/**
 * Deeply sanitizes arbitrary data structures, stripping sensitive keys
 * and redacting secret substrings within values and Error messages.
 */
export function sanitizeLogData(data: unknown, maxDepth = 4, seen = new WeakSet<object>()): unknown {
  if (data === null || data === undefined) return data;

  if (typeof data === 'string') {
    return redactString(data);
  }

  if (typeof data === 'number' || typeof data === 'boolean') {
    return data;
  }

  if (data instanceof Error) {
    return {
      name: data.name,
      message: redactString(data.message),
    };
  }

  if (maxDepth <= 0) {
    return '[TRUNCATED_DEPTH]';
  }

  if (typeof data === 'object') {
    if (seen.has(data)) {
      return '[CIRCULAR]';
    }
    seen.add(data);

    if (Array.isArray(data)) {
      return data.slice(0, 50).map((item) => sanitizeLogData(item, maxDepth - 1, seen));
    }

    const sanitizedObj: Record<string, unknown> = {};
    for (const [key, val] of Object.entries(data as Record<string, unknown>)) {
      const lowerKey = key.toLowerCase();
      if (SENSITIVE_KEY_NAMES.has(lowerKey)) {
        sanitizedObj[key] = '[REDACTED]';
      } else {
        sanitizedObj[key] = sanitizeLogData(val, maxDepth - 1, seen);
      }
    }
    return sanitizedObj;
  }

  return redactString(String(data));
}

const isDev = typeof __DEV__ !== 'undefined' ? __DEV__ : process.env.NODE_ENV !== 'production';

export const logger = {
  debug(...args: unknown[]): void {
    if (!isDev) return;
    const sanitized = args.map((arg) => sanitizeLogData(arg));
    console.debug(...sanitized);
  },

  info(...args: unknown[]): void {
    const sanitized = args.map((arg) => sanitizeLogData(arg));
    console.info(...sanitized);
  },

  warn(...args: unknown[]): void {
    const sanitized = args.map((arg) => sanitizeLogData(arg));
    console.warn(...sanitized);
  },

  error(...args: unknown[]): void {
    const sanitized = args.map((arg) => sanitizeLogData(arg));
    console.error(...sanitized);
  },
};
