# EVARO – 3-Tier Feature Entitlement Matrix (FREE / PRO / COACH)

**Document Version:** 2.0.0  
**Date:** 2026-09-22  
**Status:** SPECIFICATION / ARCHITECTURAL BASELINE (WP-05 / S7)  
**Notice:** Commercial pricing numbers are **LAUNCH DEFAULTS** for UI preview/mocking. Platform store receipts (App Store Connect / Google Play Billing) are the authoritative production source of truth.  
**Hierarchy:** `COACH` > `PRO` > `FREE` (COACH inherits all PRO rights; PRO inherits all FREE rights).

---

## 1. Executive Summary & Design Principles

EVARO's monetization architecture follows a **transparent 3-tier freemium model**:
1. **Core Workout Tracking is Never Gated (FREE):** Logging workouts, tracking sets/reps/weight, local history, resting timer, personal records, and GDPR data export remain 100% free, permanent, and functional offline. Workout count is **never limited**.
2. **Advanced Tracker Capabilities & Progressions are PRO:** Unlimited templates, program/periodization system, RPE/RIR tracking, advanced body metrics, detailed muscle group and volume analytics, and premium appearance. Includes a remote-configurable **Coach Preview** (Default: 5 Fast Requests / week, AI_READ=limited, AI_WRITE=false).
3. **Hyper-Personalized AI Training Partner is COACH:** Everything in PRO plus Full AI (Fast Mode + Plan Mode), structured action generation (`ProgramDraft`, `WorkoutTemplateDraft`, `Diff`), strict human confirmation before persisting changes (`AI_WRITE = confirmation_required`), and monthly credit quota (Default: 300 credits/mo, Fast=1, Plan=5).
4. **Zero-Data-Loss Downgrade Policy:** If a PRO or COACH subscription expires:
   - All historical data is preserved (RPE/RIR records, body metrics, custom templates, generated programs).
   - Up to 2 custom templates remain editable; surplus templates (#3+) become read-only/locked.
   - Programs become read-only.
   - Re-subscribing instantly unlocks full editing access.

---

## 2. Launch Pricing Defaults (Preview / Configuration Baseline)

| Tier | Billing Period | Launch Default Price | Effective Monthly | Trial / Conditions | Positioning |
|---|---|---|---|---|---|
| **FREE** | Permanent | **0,00 €** | 0,00 € | Forever Free | "Der vollwertige EVARO Fitness Tracker" |
| **PRO** | Monthly | **4,99 € / Monat** | 4,99 € | Keiner | "EVARO ohne Tracker-Einschränkungen" |
| **PRO** | Annual | **29,99 € / Jahr** | ~2,50 € / Monat | Visuell bevorzugt | "EVARO ohne Tracker-Einschränkungen" |
| **COACH** | Monthly | **11,99 € / Monat** | 11,99 € | Keiner | "Tracker + persönlicher AI Trainingscoach" |
| **COACH** | Annual | **69,99 € / Jahr** | ~5,83 € / Monat | **14 Tage Trial** (Visuell bevorzugt) | "Tracker + persönlicher AI Trainingscoach" |

*Note: Production pricing is dynamically injected via RevenueCat / StoreKit / Play Billing. In-app code never hardcodes prices as authoritative business logic.*

---

## 3. Comprehensive Entitlement & Capability Matrix

| Feature / Capability | FREE | PRO | COACH | Client Capability API | Server Enforcement | Downgrade Behavior |
|---|---|---|---|---|---|---|
| **Workout Logging & Sets** | Unbegrenzt | Unbegrenzt | Unbegrenzt | `canLogWorkout()` | Keiner (Client-first) | Vollständig erhalten |
| **Lokale Historie & Basic PRs** | Unbegrenzt | Unbegrenzt | Unbegrenzt | `canViewBasicHistory()` | Keiner | Vollständig erhalten |
| **Starter Vorlagen (P/P/L, etc.)** | Ausführbar, Reps/Kg editierbar (Struktur fix) | Voll editierbar | Voll editierbar | `canEditStarterTemplate()` | Keiner | Zurück auf feste Struktur |
| **Eigene Vorlagen (Custom Templates)** | Max. 2 Templates | Unbegrenzt | Unbegrenzt | `canCreateTemplate()` | Sync/DB validation | Alle behalten; max 2 editierbar, Rest read-only |
| **Programm-System & Periodisierung** | Read-only | Vollzugriff | Vollzugriff | `canCreateProgram()` | Sync/DB validation | Alle Programme behalten; read-only |
| **RPE & RIR Erfassung** | Gesperrt (Historie sichtbar) | Vollzugriff | Vollzugriff | `canUseRPE()`, `canUseRIR()` | API/Ingest Gate | Historische Daten sichtbar; neue Eingabe gesperrt |
| **Body Metrics** | Basis (Gewicht, Größe) | Voll (Taille, Brust, KFA, etc.) | Voll | `canUseAdvancedMetrics()` | Ingest Gate | Historie erhalten; Premium-Eingabe gesperrt |
| **Advanced Analytics & Heatmaps** | Basis Historie & PRs | Voll (Volumen, Muskelgruppen, Trends) | Voll | `canUseAdvancedAnalytics()` | Ingest Gate | Basis Stats sichtbar; Advanced Charts gesperrt |
| **Appearance & Themes** | Basis Themes | Premium Themes & Rewards | Alle + Coach Prestige | `canUsePremiumAppearance()` | Local UI | Zurück auf Standard-Theme |
| **AI Coach: Fast Mode** | Gesperrt | Preview (5 / Woche) | Voll (1 Credit / Req) | `canUseCoachFast()` | `api/coach-chat.js` (Token/Credit Gate) | Preview-Limit oder gesperrt |
| **AI Coach: Plan Mode** | Gesperrt | Gesperrt (Coach Paywall) | Voll (5 Credits / Req) | `canUseCoachPlan()` | `api/coach-chat.js` (HTTP 403) | Gesperrt |
| **AI Coach: Persistenter Write** | Gesperrt | Gesperrt | Nur mit User Confirmation | `canUseAIWrite()` | Draft/Diff Validation | Gesperrt |

---

## 4. Quota & Credit Governance

1. **PRO Preview Window:**
   - Default: 5 Fast Requests / Woche.
   - Fenster wird serverseitig rolling / wöchentlich berechnet.
   - Kein Plan Mode, kein AI Write.
2. **COACH Monthly Credits:**
   - Default: 300 Credits / Monat.
   - Fast Request: 1 Credit.
   - Plan Request: 5 Credits.
   - Idempotente Reservierung vor Provider-Call; Verbuchung nach erfolgreicher Antwort.
   - Quota-Warnschwellen: 80% (`quota_warning_threshold_1`) und 95% (`quota_warning_threshold_2`).

---

## 5. Security & Privacy Guardrails

1. **Client is Untrusted:** Clientseitige `tier` Flags steuern nur UI-Routing und Optimistic Rendering. Alle AI-Calls und Backend-Syncs prüfen serverseitig `public.subscriptions` und verbleibende Quotas.
2. **Zero Telemetry Leakage:** Monetarisierungs-Events (`paywall_viewed`, `subscription_started`, `ai_fast_requested`) übertragen niemals Chat-Prompts, Antworten, Trainingsgewichte oder Körperdaten.
3. **Structured Write Safety:** AI erzeugt strukturierte Drafts (`ProgramDraft`, `WorkoutTemplateDraft`). Persistierung erfordert explizite Bestätigung durch den Nutzer im Preview/Diff-Modal.
