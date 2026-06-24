const OPENROUTER_URL = 'https://openrouter.ai/api/v1/chat/completions';
const GROQ_URL = 'https://api.groq.com/openai/v1/chat/completions';
const GEMINI_BASE_URL = 'https://generativelanguage.googleapis.com/v1beta/models';

const DEFAULT_MODELS = {
  openrouter: 'google/gemini-2.5-flash:free',
  groq: 'openai/gpt-oss-120b',
  gemini: 'gemini-2.5-flash',
};

const SUPPORTED_PROVIDERS = ['openrouter', 'groq', 'gemini'];

class LLMProviderError extends Error {
  constructor({ provider, model, statusCode, message, cause }) {
    super(message);
    this.name = 'LLMProviderError';
    this.provider = provider;
    this.model = model;
    this.statusCode = statusCode;
    this.cause = cause;
  }
}

const isRecord = (value) => typeof value === 'object' && value !== null && !Array.isArray(value);

const getTimeoutMs = () => {
  const parsed = Number.parseInt(process.env.LLM_TIMEOUT_MS || '', 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 20000;
};

const getModelForProvider = (provider) => {
  if (provider === 'openrouter') {
    return process.env.OPENROUTER_MODEL || process.env.LLM_MODEL || DEFAULT_MODELS.openrouter;
  }
  if (provider === 'groq') {
    return process.env.GROQ_MODEL || process.env.LLM_MODEL || DEFAULT_MODELS.groq;
  }
  if (provider === 'gemini') {
    return process.env.GEMINI_MODEL || process.env.LLM_MODEL || DEFAULT_MODELS.gemini;
  }
  return process.env.LLM_MODEL || 'unknown';
};

const getApiKeyForProvider = (provider) => {
  if (provider === 'openrouter') return process.env.OPENROUTER_API_KEY;
  if (provider === 'groq') return process.env.GROQ_API_KEY;
  if (provider === 'gemini') return process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY;
  return undefined;
};

const parseProviderList = (value) =>
  (value || '')
    .split(',')
    .map((item) => item.trim().toLowerCase())
    .filter((item) => SUPPORTED_PROVIDERS.includes(item));

const getProviderOrder = () => {
  const primary = (process.env.LLM_PROVIDER || 'openrouter').trim().toLowerCase();
  const allowFallback = process.env.LLM_ALLOW_PROVIDER_FALLBACK !== 'false';
  const configuredFallbacks = parseProviderList(process.env.LLM_FALLBACK_PROVIDERS);

  const order = [];
  if (primary === 'auto') {
    order.push(...SUPPORTED_PROVIDERS);
  } else if (SUPPORTED_PROVIDERS.includes(primary)) {
    order.push(primary);
  } else {
    order.push('openrouter');
  }

  if (allowFallback) {
    order.push(...configuredFallbacks);
    if (configuredFallbacks.length === 0) {
      order.push(...SUPPORTED_PROVIDERS);
    }
  }

  return [...new Set(order)];
};

const safeLog = (level, message, details = {}) => {
  const sanitized = Object.fromEntries(
    Object.entries(details).filter(([key]) => !key.toLowerCase().includes('key')),
  );
  console[level](`[coach-llm] ${message}`, sanitized);
};

const fetchWithTimeout = async (url, init, timeoutMs) => {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  try {
    return await fetch(url, { ...init, signal: controller.signal });
  } finally {
    clearTimeout(timeoutId);
  }
};

const parseJsonResponse = async (response) => {
  const text = await response.text();
  if (!text) return null;

  try {
    return JSON.parse(text);
  } catch {
    return { text };
  }
};

const extractOpenAiReply = (data) => {
  if (!isRecord(data)) return null;
  const choices = data.choices;
  if (!Array.isArray(choices)) return null;

  const firstChoice = choices[0];
  if (!isRecord(firstChoice)) return null;

  if (typeof firstChoice.text === 'string') return firstChoice.text.trim();
  const message = firstChoice.message;
  if (isRecord(message) && typeof message.content === 'string') {
    return message.content.trim();
  }

  return null;
};

const extractGeminiReply = (data) => {
  if (!isRecord(data) || !Array.isArray(data.candidates)) return null;

  const parts = data.candidates
    .flatMap((candidate) =>
      isRecord(candidate) && isRecord(candidate.content) ? candidate.content.parts : [],
    )
    .filter((part) => isRecord(part) && typeof part.text === 'string')
    .map((part) => part.text.trim())
    .filter(Boolean);

  return parts.length > 0 ? parts.join('\n').trim() : null;
};

const getProviderErrorMessage = (data, fallback) => {
  if (isRecord(data)) {
    const error = data.error;
    if (typeof error === 'string') return error;
    if (isRecord(error) && typeof error.message === 'string') return error.message;
    if (typeof data.message === 'string') return data.message;
    if (typeof data.text === 'string') return data.text.slice(0, 300);
  }
  return fallback;
};

const callOpenAiCompatibleProvider = async ({
  provider,
  url,
  apiKey,
  model,
  messages,
  timeoutMs,
  extraHeaders = {},
}) => {
  const response = await fetchWithTimeout(
    url,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
        ...extraHeaders,
      },
      body: JSON.stringify({
        model,
        temperature: 0.35,
        max_tokens: 260,
        messages,
      }),
    },
    timeoutMs,
  );

  const data = await parseJsonResponse(response);
  if (!response.ok) {
    throw new LLMProviderError({
      provider,
      model,
      statusCode: response.status,
      message: getProviderErrorMessage(data, `${provider} failed with HTTP ${response.status}.`),
    });
  }

  const reply = extractOpenAiReply(data);
  if (!reply) {
    throw new LLMProviderError({
      provider,
      model,
      statusCode: response.status,
      message: `${provider} returned no assistant text.`,
    });
  }

  return { reply, statusCode: response.status };
};

const callGeminiProvider = async ({ apiKey, model, messages, timeoutMs }) => {
  const prompt = messages
    .map((message) => `${message.role.toUpperCase()}:\n${message.content}`)
    .join('\n\n');
  const response = await fetchWithTimeout(
    `${GEMINI_BASE_URL}/${encodeURIComponent(model)}:generateContent?key=${encodeURIComponent(apiKey)}`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        contents: [
          {
            role: 'user',
            parts: [{ text: prompt }],
          },
        ],
        generationConfig: {
          temperature: 0.35,
          maxOutputTokens: 260,
        },
      }),
    },
    timeoutMs,
  );

  const data = await parseJsonResponse(response);
  if (!response.ok) {
    throw new LLMProviderError({
      provider: 'gemini',
      model,
      statusCode: response.status,
      message: getProviderErrorMessage(data, `gemini failed with HTTP ${response.status}.`),
    });
  }

  const reply = extractGeminiReply(data);
  if (!reply) {
    throw new LLMProviderError({
      provider: 'gemini',
      model,
      statusCode: response.status,
      message: 'gemini returned no assistant text.',
    });
  }

  return { reply, statusCode: response.status };
};

const callProvider = async ({ provider, messages, timeoutMs }) => {
  const apiKey = getApiKeyForProvider(provider);
  const model = getModelForProvider(provider);

  if (!apiKey) {
    throw new LLMProviderError({
      provider,
      model,
      statusCode: 0,
      message: `${provider} API key is not configured.`,
    });
  }

  if (provider === 'openrouter') {
    return {
      provider,
      model,
      ...(await callOpenAiCompatibleProvider({
        provider,
        url: OPENROUTER_URL,
        apiKey,
        model,
        messages,
        timeoutMs,
        extraHeaders: {
          'HTTP-Referer': process.env.OPENROUTER_SITE_URL || 'https://fitness-tracker.vercel.app',
          'X-OpenRouter-Title': 'Volt Fitness Tracker',
        },
      })),
    };
  }

  if (provider === 'groq') {
    return {
      provider,
      model,
      ...(await callOpenAiCompatibleProvider({
        provider,
        url: GROQ_URL,
        apiKey,
        model,
        messages,
        timeoutMs,
      })),
    };
  }

  if (provider === 'gemini') {
    return {
      provider,
      model,
      ...(await callGeminiProvider({ apiKey, model, messages, timeoutMs })),
    };
  }

  throw new LLMProviderError({
    provider,
    model,
    statusCode: 0,
    message: `${provider} is not supported.`,
  });
};

const sendCoachMessage = async (messages, options = {}) => {
  const providerOrder = options.providerOrder || getProviderOrder();
  const timeoutMs = options.timeoutMs || getTimeoutMs();
  const attempts = [];

  for (const provider of providerOrder) {
    const model = getModelForProvider(provider);
    const startedAt = Date.now();
    safeLog('info', 'provider attempt started', { provider, model, timeoutMs });

    try {
      const result = await callProvider({ provider, messages, timeoutMs });
      const latencyMs = Date.now() - startedAt;
      attempts.push({
        provider,
        model: result.model,
        status: 'success',
        statusCode: result.statusCode,
        latencyMs,
      });
      safeLog('info', 'provider attempt succeeded', {
        provider,
        model: result.model,
        statusCode: result.statusCode,
        latencyMs,
      });
      return {
        reply: result.reply,
        provider,
        model: result.model,
        statusCode: result.statusCode,
        fallbackUsed: attempts.length > 1,
        attempts,
      };
    } catch (error) {
      const latencyMs = Date.now() - startedAt;
      const statusCode = error instanceof LLMProviderError ? error.statusCode : 0;
      const message = error instanceof Error ? error.message : 'Unknown provider error.';
      attempts.push({
        provider,
        model,
        status: 'error',
        statusCode,
        latencyMs,
        message,
      });
      safeLog('warn', 'provider attempt failed', {
        provider,
        model,
        statusCode,
        latencyMs,
        message,
      });
    }
  }

  throw new LLMProviderError({
    provider: 'none',
    model: 'none',
    statusCode: 0,
    message: 'No configured LLM provider returned a response.',
    cause: attempts,
  });
};

const getProviderDiagnostics = () => {
  const providerOrder = getProviderOrder();
  return {
    providerOrder,
    timeoutMs: getTimeoutMs(),
    providers: SUPPORTED_PROVIDERS.map((provider) => ({
      provider,
      model: getModelForProvider(provider),
      configured: Boolean(getApiKeyForProvider(provider)),
    })),
  };
};

module.exports = {
  DEFAULT_MODELS,
  LLMProviderError,
  SUPPORTED_PROVIDERS,
  getProviderDiagnostics,
  sendCoachMessage,
};
