const { COACH_SYSTEM_PROMPT } = require('./_lib/coachPrompt');
const { LLMProviderError, sendCoachMessage } = require('./_lib/llmProvider');

const parseBody = (body) => {
  if (!body) return {};
  if (typeof body === 'string') {
    try {
      return JSON.parse(body);
    } catch {
      return {};
    }
  }
  return body;
};

const isRecord = (value) => typeof value === 'object' && value !== null && !Array.isArray(value);

const sanitizeMessages = (messages) => {
  if (!Array.isArray(messages)) return [];

  return messages
    .filter((message) => isRecord(message))
    .map((message) => {
      const role = ['user', 'assistant', 'system'].includes(message.role) ? message.role : 'user';
      const content = typeof message.content === 'string' ? message.content.slice(0, 1200) : '';
      return { role, content };
    })
    .filter((message) => message.content.trim().length > 0)
    .slice(-10);
};

const summarizeContext = (context) => {
  if (!isRecord(context)) return 'No app context was provided.';
  return JSON.stringify(context, null, 2).slice(0, 6000);
};

const getPublicAttempts = (attempts = []) =>
  attempts.map((attempt) => ({
    provider: attempt.provider,
    model: attempt.model,
    status: attempt.status,
    statusCode: attempt.statusCode,
    latencyMs: attempt.latencyMs,
    ...(attempt.message ? { message: attempt.message } : {}),
  }));

module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    res.status(204).end();
    return;
  }

  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  const body = parseBody(req.body);
  const userMessages = sanitizeMessages(body.messages);
  const contextSummary = summarizeContext(body.context);
  const messages = [
    { role: 'system', content: COACH_SYSTEM_PROMPT },
    {
      role: 'system',
      content: `Current app context from the user log:\n${contextSummary}`,
    },
    ...userMessages,
  ];

  try {
    const result = await sendCoachMessage(messages);
    res.status(200).json({
      reply: result.reply,
      provider: result.provider,
      model: result.model,
      statusCode: result.statusCode,
      providerFallbackUsed: result.fallbackUsed,
      attempts: getPublicAttempts(result.attempts),
    });
  } catch (error) {
    const attempts = error instanceof LLMProviderError ? error.cause : undefined;
    console.warn('[coach-chat] no provider succeeded', {
      message: error instanceof Error ? error.message : 'Unknown error',
      attempts: getPublicAttempts(Array.isArray(attempts) ? attempts : []),
    });
    res.status(502).json({
      error: error instanceof Error ? error.message : 'Coach provider request failed.',
      fallback: 'local-client-fallback',
      attempts: getPublicAttempts(Array.isArray(attempts) ? attempts : []),
    });
  }
};
