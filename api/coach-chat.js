const DEFAULT_MODEL = 'openai/gpt-oss-120b:free';
const OPENROUTER_URL = 'https://openrouter.ai/api/v1/chat/completions';

const EVIDENCE_CONTEXT = [
  'Evidence anchors for resistance training advice:',
  '- ACSM resistance-training position stand, PubMed 41843416: progressive resistance training improves strength, hypertrophy, power, endurance, and function; advice should be individualized.',
  '- Refalo et al., Sports Medicine 2023, PMID 36334240: proximity to failure can matter for hypertrophy, but fatigue rises; most hypertrophy work should usually sit near failure rather than all sets to failure.',
  '- Schoenfeld et al. dose-response volume literature: more hard weekly sets can increase hypertrophy up to recoverable limits; adjust by performance and soreness.',
  '- Schoenfeld/Grgic load literature: hypertrophy can occur across broad rep ranges when effort is high; heavier loading is more specific for maximal strength.',
  '- Morton et al., British Journal of Sports Medicine 2018, PMID 28698222: protein supplementation helps resistance-training gains, with gains generally plateauing around 1.6 g/kg/day in healthy adults.',
  '- ISSN creatine position stand 2017, PMID 28615996: creatine monohydrate is well-supported for high-intensity exercise and resistance-training adaptations in healthy users.',
].join('\n');

const SYSTEM_PROMPT = [
  'You are the Volt fitness tracker coach.',
  'Answer in the same language as the user, usually German.',
  'Give short, concrete workout advice based on the supplied profile, stats, and recent workout log.',
  'Default to 2-4 bullets or one short paragraph. Stay under 110 words unless the user asks for detail.',
  'Focus on the next practical action: load, reps, sets, rest, recovery, or exercise choice.',
  'Use the evidence anchors as background. Do not invent study names or fake citations.',
  'If the log context is insufficient, say that briefly and ask one precise follow-up question.',
  'Do not give medical diagnosis or injury treatment. For pain/injury red flags, recommend professional help.',
  EVIDENCE_CONTEXT,
].join('\n\n');

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

const extractReply = (data) => {
  const choice = data?.choices?.[0];
  const content = choice?.message?.content ?? choice?.text;
  return typeof content === 'string' ? content.trim() : null;
};

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

  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) {
    res.status(500).json({ error: 'OPENROUTER_API_KEY is not configured.' });
    return;
  }

  const body = parseBody(req.body);
  const messages = sanitizeMessages(body.messages);
  const contextSummary = summarizeContext(body.context);
  const model = process.env.OPENROUTER_MODEL || DEFAULT_MODEL;

  try {
    const response = await fetch(OPENROUTER_URL, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': process.env.OPENROUTER_SITE_URL || 'https://fitness-tracker.vercel.app',
        'X-OpenRouter-Title': 'Volt Fitness Tracker',
      },
      body: JSON.stringify({
        model,
        temperature: 0.35,
        max_tokens: 260,
        messages: [
          { role: 'system', content: SYSTEM_PROMPT },
          {
            role: 'system',
            content: `Current app context from the user log:\n${contextSummary}`,
          },
          ...messages,
        ],
      }),
    });

    const data = await response.json().catch(() => null);

    if (!response.ok) {
      res.status(response.status).json({
        error: data?.error?.message || `OpenRouter request failed with HTTP ${response.status}.`,
      });
      return;
    }

    const reply = extractReply(data);
    if (!reply) {
      res.status(502).json({ error: 'OpenRouter returned an invalid response.' });
      return;
    }

    res.status(200).json({ reply, model });
  } catch (error) {
    res.status(500).json({
      error: error instanceof Error ? error.message : 'Coach request failed.',
    });
  }
};
