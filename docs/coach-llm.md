# Coach Chat LLM Providers

The mobile app never calls LLM providers directly with secret keys. On web/Vercel,
the client posts to `/api/coach-chat`, and the Vercel function selects a
server-side provider.

## Supported Providers

- `openrouter`: OpenRouter chat completions, default model
  `google/gemini-2.5-flash:free`
- `groq`: Groq OpenAI-compatible chat completions, default model
  `openai/gpt-oss-120b`
- `gemini`: Google AI Studio Gemini `generateContent`, default model
  `gemini-2.5-flash`

These providers mirror the free/free-tier API idea from
`cheahjs/free-llm-api-resources`: test legitimate free tiers first, keep keys
server-side, and avoid tying the app to one vendor.

## Vercel Environment Variables

Choose a primary provider:

```env
LLM_PROVIDER=openrouter
LLM_FALLBACK_PROVIDERS=groq,gemini
LLM_ALLOW_PROVIDER_FALLBACK=true
LLM_TIMEOUT_MS=20000
```

Configure at least one provider key:

```env
OPENROUTER_API_KEY=sk-or-v1-...
OPENROUTER_MODEL=google/gemini-2.5-flash:free
OPENROUTER_SITE_URL=https://your-vercel-domain.vercel.app

GROQ_API_KEY=gsk_...
GROQ_MODEL=openai/gpt-oss-120b

GEMINI_API_KEY=...
GEMINI_MODEL=gemini-2.5-flash
```

`LLM_MODEL` can be used as a global model override, but provider-specific model
variables are clearer when testing fallbacks.

## Debugging

Check provider configuration without exposing secrets:

```bash
curl https://your-vercel-domain.vercel.app/api/coach-chat-debug
```

Run a real test call:

```bash
curl -X POST https://your-vercel-domain.vercel.app/api/coach-chat-debug \
  -H "Content-Type: application/json" \
  -d "{\"message\":\"Gib mir einen kurzen Tipp fürs Bankdrücken.\"}"
```

The response includes the active provider, model, status code, provider fallback
usage, and sanitized attempt logs.

## App Fallback

If every configured server-side provider fails, `/api/coach-chat` returns an
error payload. The mobile client then uses its local fallback response, clearly
prefixed with `[Lokaler Fallback]`, so fallback answers are no longer mistaken
for real LLM output.
