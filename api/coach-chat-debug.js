const { COACH_SYSTEM_PROMPT } = require('./_lib/coachPrompt');
const { getProviderDiagnostics, sendCoachMessage } = require('./_lib/llmProvider');

module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    res.status(204).end();
    return;
  }

  if (req.method === 'GET') {
    res.status(200).json({
      ...getProviderDiagnostics(),
      testHint: 'POST to this route with {"message":"Test"} to run a real provider call.',
    });
    return;
  }

  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  const message =
    typeof req.body?.message === 'string'
      ? req.body.message.slice(0, 500)
      : 'Gib mir einen kurzen Tipp für mein nächstes Krafttraining.';

  try {
    const result = await sendCoachMessage([
      { role: 'system', content: COACH_SYSTEM_PROMPT },
      {
        role: 'system',
        content: 'Debug request. Keep the response very short and include no private data.',
      },
      { role: 'user', content: message },
    ]);

    res.status(200).json({
      ok: true,
      provider: result.provider,
      model: result.model,
      statusCode: result.statusCode,
      providerFallbackUsed: result.fallbackUsed,
      attempts: result.attempts,
      replyPreview: result.reply.slice(0, 240),
    });
  } catch (error) {
    res.status(502).json({
      ok: false,
      error: error instanceof Error ? error.message : 'Debug provider call failed.',
      diagnostics: getProviderDiagnostics(),
      attempts: Array.isArray(error?.cause) ? error.cause : [],
    });
  }
};
