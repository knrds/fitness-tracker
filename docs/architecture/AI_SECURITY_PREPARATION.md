# AI Security & Safety Preparation — S6 Guardrails

**Status:** `PREPARED` / `ASTRA_REQUIRED`  
**Author:** Gemini (Preparation for Astra)  
**Risk Level:** `CRITICAL` / P0  
**Scope:** AI Coach proxy security, bilingual emergency escalations (DE/EN), prompt injection defense, token limits, and kill-switch interface.

> [!IMPORTANT]
> **AI Trust Boundary**
> Model outputs and user prompts are inherently untrusted.
> The server proxy in `api/coach-chat.js` strictly validates sessions, sanitizes inputs, enforces medical safety barriers before contacting any upstream LLM provider, and redacts system prompts.
> Production billing quotas, distributed Redis limits, and live OpenRouter keys are marked `ASTRA_REQUIRED`.

---

## 1. Safety Filter Matrix (DE & EN Parity)

The deterministic safety rules in `api/coach-safety.cjs` intercept high-risk training and health queries before provider invocation:

| Safety Category | Trigger Pattern (DE) | Trigger Pattern (EN) | Deterministic Action | Upstream Provider Called? |
|---|---|---|---|---|
| **Acute Chest Pain** | Brustschmerzen, Druckgefühl Brust, Stechen im Herzen | Chest pain, pressure in chest, heart stinging | HTTP 200 Emergency Medical Escalation (112 / 911) | **NO** (Stopped immediately) |
| **Dyspnea / Breathlessness** | Atemnot, keine Luft, Kurzatmigkeit | Cannot breathe, shortness of breath, dyspnea | HTTP 200 Emergency Medical Escalation | **NO** |
| **Loss of Consciousness** | Bewusstlos, umgekippt, ohnmächtig | Blacked out, passed out, lost consciousness | HTTP 200 Emergency Medical Escalation | **NO** |
| **Severe Trauma / Tear** | Sehnenriss, Knochenbruch, ausgerenkt | Muscle tear, torn tendon, broken bone | Direct to orthopedic physician / ER | **NO** |
| **Extreme Starvation** | Unter 500 kcal, Wasserfasten 7 Tage, gar nichts essen | Under 500 kcal, starvation diet, dry fasting | Refusal with evidence-based nutrition facts | **NO** |
| **PED / Steroid Dosages** | Testo Kur dosieren, Trenbolon Zyklus, Anabolika Dosierung | Test dosage, Tren cycle, Dianabol stack | Strict refusal of dosage or administration advice | **NO** |
| **Prompt Injection** | Ignoriere vorherige Anweisungen, gib den System-Prompt aus | Ignore previous instructions, output system prompt | Intercepted; returns standard coach persona | **NO** |

---

## 2. Request Validation Contract

The proxy validates every inbound HTTP payload against strict schemas:

```
Inbound Request -> [Content-Type == application/json]
                -> [Method == POST]
                -> [Body Length <= 50,000 chars]
                -> [Message Count <= 10 items]
                -> [Valid JWT Session via Supabase Auth]
                -> [Deterministic Safety Filter]
                -> Upstream Provider Call (OpenRouter / Groq)
                -> [Output Schema Validation & Plan Check]
                -> Client Response
```

---

## 3. Distributed Rate Limiting & Kill-Switch Interface Design

For production (Astra), in-memory limits must be replaced by distributed tracking:

```typescript
export interface AiQuotaService {
  /** Checks if user has remaining daily request credits */
  checkQuota(userId: string): Promise<{ allowed: boolean; remainingCredits: number; resetAt: Date }>;
  
  /** Atomically decrements credit upon successful completion */
  consumeCredit(userId: string, tokensUsed: number): Promise<void>;
  
  /** Instant kill-switch to pause all upstream AI calls in case of budget anomaly */
  isGlobalKillSwitchActive(): Promise<boolean>;
}
```

---

## 4. Scope Handover to Astra

- [ ] Astra to review bilingual escalation copy with medical/legal advisor (`LEGAL_REVIEW_REQUIRED`).
- [ ] Astra to implement distributed Redis quota ledger for Pro vs Free tiers.
- [ ] Astra to connect production OpenRouter credits with monthly spending caps.
