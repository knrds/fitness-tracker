const crypto = require('crypto');

/**
 * Server-side scoped beta session token generator and validator.
 * Provides anonymous guest authentication for Beta testers without requiring manual login.
 */

function getBetaSecret() {
  const secret = process.env.BETA_SESSION_SECRET;
  if (typeof secret !== 'string' || Buffer.byteLength(secret) < 32) {
    throw new Error('BETA_SESSION_NOT_CONFIGURED');
  }
  return secret;
}

function isBetaAllowed() {
  // Hosting provider and public/client flags are never authorization.
  return process.env.APP_ENV === 'beta' && process.env.BETA_FULL_ACCESS !== 'false';
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

  if (token.length > 2048) return null;
  let secret;
  try { secret = getBetaSecret(); } catch { return null; }
  const raw = token.slice(5); // strip 'beta_'
  const dotIdx = raw.lastIndexOf('.');
  if (dotIdx === -1) return null;

  const payloadEncoded = raw.slice(0, dotIdx);
  const signature = raw.slice(dotIdx + 1);

  // Timing safe HMAC comparison
  const expectedSignature = crypto
    .createHmac('sha256', secret)
    .update(payloadEncoded)
    .digest('base64url');

  if (!/^[A-Za-z0-9_-]+$/.test(signature) || Buffer.byteLength(signature) !== Buffer.byteLength(expectedSignature)) return null;
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
