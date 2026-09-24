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

  let body;
  try {
    const raw = typeof req.body === 'string' ? req.body : JSON.stringify(req.body);
    if (!raw || Buffer.byteLength(raw) > 1024) return res.status(413).json({ error: 'Request too large' });
    body = JSON.parse(raw);
  } catch { return res.status(400).json({ error: 'Invalid JSON' }); }
  if (!body || typeof body.installationId !== 'string' || !/^[A-Za-z0-9_-]{8,64}$/.test(body.installationId)) {
    return res.status(400).json({ error: 'Invalid installation identity' });
  }
  const installationId = body.installationId;

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
