const { issueBetaToken, isBetaAllowed } = require('./beta-auth.cjs');

module.exports = async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store');
  const origin = req.headers.origin;
  const allowed = (process.env.COACH_ALLOWED_ORIGINS || '')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
  if (origin && (allowed.length === 0 || allowed.includes(origin))) {
    res.setHeader('Access-Control-Allow-Origin', origin);
    res.setHeader('Vary', 'Origin');
  }
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') return res.status(204).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  if (!isBetaAllowed()) {
    return res.status(403).json({ error: 'Beta sessions are not available in this environment' });
  }

  let body = {};
  if (req.body) {
    body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
  }

  const installationId = body.installationId || req.headers['x-installation-id'];

  try {
    const token = issueBetaToken(installationId);
    return res.status(200).json({
      token,
      expiresIn: 86400,
      tier: 'coach',
    });
  } catch (err) {
    return res.status(500).json({ error: 'Failed to issue beta session' });
  }
};
