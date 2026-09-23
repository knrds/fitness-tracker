const crypto = require('crypto');

/**
 * Server-side scoped beta session token generator and validator.
 * Provides anonymous guest authentication for Beta testers without requiring manual login.
 */

function getBetaSecret() {
  return (
    process.env.BETA_SESSION_SECRET ||
    process.env.OPENROUTER_API_KEY ||
    'evaro-beta-session-default-guard-key-2026'
  );
}

function isBetaAllowed() {
  // Fail-closed guard: NEVER active in production!
  if (process.env.APP_ENV === 'production') return false;
  if (process.env.NODE_ENV === 'production' && process.env.APP_ENV !== 'beta' && !process.env.VERCEL) return false;
  // Kill switch check
  if (process.env.BETA_FULL_ACCESS === 'false') return false;
  return true;
}

function base64UrlEncode(str) {
  return Buffer.from(str)
    .toString('base64')
    .replace(/=/g, '')
    .replace(/\+/g, '-')
    .replace(/\//g, '_');
}

function base64UrlDecode(str) {
  let base64 = str.replace(/-/g, '+').replace(/_/g, '/');
  while (base64.length % 4) {
    base64 += '=';
  }
  return Buffer.from(base64, 'base64').toString('utf8');
}

/**
 * Issues a server-signed, short-lived beta session token.
 */
function issueBetaToken(installationId) {
  if (!isBetaAllowed()) {
    throw new Error('BETA_ACCESS_DISABLED: Beta sessions are not permitted in this environment.');
  }

  const safeInstallId =
    typeof installationId === 'string' && installationId.trim()
      ? installationId.trim().substring(0, 64)
      : crypto.randomUUID();

  // Pseudonymize installationId into an opaque anonymous subject
  const sub =
    'beta_guest_' +
    crypto.createHash('sha256').update(safeInstallId).digest('hex').substring(0, 16);

  const payload = {
    sub,
    scope: 'beta_coach',
    exp: Date.now() + 24 * 60 * 60 * 1000, // 24 hours
    iat: Date.now(),
  };

  const payloadEncoded = base64UrlEncode(JSON.stringify(payload));
  const signature = crypto
    .createHmac('sha256', getBetaSecret())
    .update(payloadEncoded)
    .digest('base64url');

  return `beta_${payloadEncoded}.${signature}`;
}

/**
 * Verifies a server-signed beta session token.
 * Returns { id, isBeta: true } or null.
 */
function verifyBetaToken(token) {
  if (!isBetaAllowed()) {
    return null;
  }

  if (typeof token !== 'string' || !token.startsWith('beta_')) {
    return null;
  }

  const raw = token.slice(5); // strip 'beta_'
  const dotIdx = raw.lastIndexOf('.');
  if (dotIdx === -1) return null;

  const payloadEncoded = raw.slice(0, dotIdx);
  const signature = raw.slice(dotIdx + 1);

  // Timing safe HMAC comparison
  const expectedSignature = crypto
    .createHmac('sha256', getBetaSecret())
    .update(payloadEncoded)
    .digest('base64url');

  if (signature.length !== expectedSignature.length) return null;
  const isMatch = crypto.timingSafeEqual(
    Buffer.from(signature),
    Buffer.from(expectedSignature),
  );
  if (!isMatch) return null;

  try {
    const payload = JSON.parse(base64UrlDecode(payloadEncoded));
    if (payload.scope !== 'beta_coach') return null;
    if (typeof payload.exp !== 'number' || Date.now() > payload.exp) return null;
    if (typeof payload.sub !== 'string' || !payload.sub.startsWith('beta_guest_')) return null;

    return {
      id: payload.sub,
      isBeta: true,
    };
  } catch {
    return null;
  }
}

module.exports = {
  issueBetaToken,
  verifyBetaToken,
  isBetaAllowed,
};
