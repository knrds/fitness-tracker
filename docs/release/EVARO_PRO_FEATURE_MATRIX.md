# EVARO Pro – Feature Entitlement Matrix

**Document Version:** 1.0.0  
**Date:** 2026-09-16  
**Status:** PROPOSED (Pre-Astra Monetization Planning Baseline)  
**Notice:** All commercial tier allocations in this document are **PROPOSED** models designed for technical analysis. Final business pricing and gating decisions reside with the project owner / Astra.  
**Astra Review ID:** AR-008  

---

## 1. Executive Summary & Design Principles

EVARO's monetization model follows a **transparent freemium architecture**:
1. **Core Workout Tracking is Never Gated:** Logging workouts, tracking sets/reps/weight, local history, resting timer, personal records, and GDPR data export must remain 100% free, permanent, and functional offline without an account or subscription.
2. **Heavy Operational Cost Drivers are Pro:** High-cost token/compute features (AI Coach, Voice Whisper, Computer Vision posture checks, multi-device cloud synchronization) require a paid subscription (`EVARO Pro`) to ensure sustainable unit economics.
3. **No Lock-In Loop:** If an active subscription expires or is cancelled, existing user workout history and templates remain completely accessible in read/write mode locally.

---

## 2. Comprehensive Entitlement Matrix

| Feature / Capability | Free Tier [PROPOSED] | EVARO Pro [PROPOSED] | Client Gate | Server Gate | Offline Behavior | Store Dependency | Status |
|---|---|---|---|---|---|---|---|
| **Workout Logging & Sets** | Unbegrenzt | Unbegrenzt | Keiner | Keiner | Vollständig offline | Keine | `PROPOSED` |
| **Lokale Historie & PRs** | Unbegrenzt | Unbegrenzt | Keiner | Keiner | Vollständig offline | Keine | `PROPOSED` |
| **Katalog & Anatomie-Heatmap** | Vollzugriff | Vollzugriff | Keiner | Keiner | Vollständig offline | Keine | `PROPOSED` |
| **Rest Timer & Haptik** | Vollzugriff | Vollzugriff | Keiner | Keiner | Vollständig offline | Keine | `PROPOSED` |
| **DSGVO Datenexport (JSON)** | Vollzugriff | Vollzugriff | Keiner | Keiner | Vollständig offline | Keine | `PROPOSED` |
| **Workout Templates (Vorlagen)** | 3 Templates | Unbegrenzt | `template-builder.tsx` | Nein (lokal) | Gecachte Templates editierbar | Keine | `PROPOSED` |
| **AI Coach: Text-Chat** | 3 Test-Prompts (Total) | Unbegrenzt (Fair Use) | `CoachComposer.tsx` | `api/coach-chat.js` (HTTP 403) | Nicht verfügbar (Netzwerk nötig) | RevenueCat Entitlement | `PROPOSED` |
| **AI Coach: Voice (Audio/Whisper)** | Gesperrt | Unbegrenzt | `useCoachRecorder.ts` | `api/coach-chat.js` | Nicht verfügbar | RevenueCat Entitlement | `PROPOSED` |
| **AI Coach: Multi-Wochen-Planung** | Gesperrt | Unbegrenzt | `coach.tsx:PlanMode` | `api/coach-chat.js` | Nicht verfügbar | RevenueCat Entitlement | `PROPOSED` |
| **AI Coach: Vision / Fotoanalyse** | Gesperrt | Unbegrenzt | `coach.tsx:ImagePicker` | `api/coach-chat.js` | Nicht verfügbar | RevenueCat Entitlement | `PROPOSED` |
| **Multi-Device Cloud Sync** | 1 Gerät (Lokal) | Unbegrenzt synchronisiert | `syncWorker.ts` | Supabase RLS / Proxy | Lokale Queue puffert offline | RevenueCat Entitlement | `PROPOSED` |
| **Erweiterte Volumen-Telemetrie** | Letzte 30 Tage | Unbegrenzt + Trendkurven | `DashboardSummary.tsx` | Nein (lokal berechnet) | Vollständig offline | RevenueCat Entitlement | `PROPOSED` |
| **Custom Colorways / Themes** | Standard (Glacier, Arctic) | Alle Farbwelten (Titanium, etc.) | `AppearanceSettings.tsx` | Nein (lokal) | Vollständig offline | RevenueCat Entitlement | `PROPOSED` |

---

## 3. Detailed Gating Specifications

### 3.1 AI Coach (Text, Voice, Plan Generation)
- **Client Gate (`apps/mobile`):**
  - Wenn `!hasProEntitlement`: Composer zeigt Badge *"EVARO Pro"*. Beim Tippen auf Senden oder Mikrofon öffnet sich das Paywall-Modal.
  - Wenn Free-Test-Kontingent (z. B. 3 Prompts) aktiv ist, zählt ein lokaler / serverseitiger Zähler herunter (*"Noch 2 kostenlose Coach-Fragen"*).
- **Server Gate (`api/coach-chat.js`):**
  - **Zwingend serverseitige Validierung:** Das Backend vertraut niemals dem Client.
  - Bei fehlendem Pro-Status antwortet das Backend mit HTTP 403:
    ```json
    {
      "code": "ENTITLEMENT_REQUIRED",
      "error": "Der KI-Coach ist Teil von EVARO Pro. Bitte aktiviere dein Abonnement."
    }
    ```

### 3.2 Template Limit (Free = 3, Pro = Unbegrenzt)
- **Client Gate (`apps/mobile/app/programs/template-builder.tsx`):**
  - Beim Klick auf *"Vorlage speichern"* prüft der Store:
    ```typescript
    if (!hasPro && templates.length >= 3) {
      showPaywall({ trigger: 'template_limit_reached' });
      return;
    }
    ```
- **Fallback bei Abo-Ablauf:**
  - Hat ein Nutzer während seines Pro-Abos 10 Templates erstellt und kündigt danach, bleiben **alle 10 Templates lesbar und trainierbar**. Der Nutzer kann lediglich kein 11. Template anlegen. Kein Datenverlust, keine feindliche Nutzererfahrung.

### 3.3 Cloud Sync & Multi-Device
- **Client Gate (`apps/mobile/src/stores/syncWorker.ts`):**
  - Im Free-Modus verbleiben alle Änderungen in der lokalen SQLite-Datenbank (`training.sqlite`).
  - Der `syncWorker` pausiert den Upload nach Supabase und informiert den Nutzer im Profil über die Backup-Vorteile von EVARO Pro.
  - Lokaler JSON-Export bleibt jederzeit kostenlos verfügbar.

---

## 4. Offline Resilience & Grace Handling

1. **Fitnessstudio-Szenario (Funkloch):**
   - Nutzer trainieren häufig in Kellern oder Funklöchern ohne LTE/5G.
   - Ein flüchtiges Netzproblem darf niemals mitten im Workout den Pro-Status entziehen!
2. **Cached Entitlement Policy:**
   - Das RevenueCat SDK cached den Entitlement-Zustand lokal verschlüsselt.
   - **Offline Grace Period:** 72 Stunden. Wenn das Gerät 72 Stunden lang offline ist, bleibt der gecachte Pro-Status aktiv. Erst nach 72 Stunden kontinuierlichem Offline-Zustand ohne Revalidierung greift ein sanftes Fallback für rein lokale Pro-Features.

---

## 5. Offene Entscheidungen für Astra (ASTRA_REQUIRED)

- [ ] **Exaktes Free-Kontingent für Coach:** Soll es 3 kostenlose Lifetime-Prompts geben oder 1 Prompt pro Tag oder 0 Prompts (harte Paywall)?
- [ ] **Cloud-Sync Gating:** Bleibt Cloud-Sync für 1 Gerät kostenlos (als Disaster Recovery) und wird erst ab dem 2. Gerät kostenpflichtig, oder ist Cloud-Sync generell Pro?
- [ ] **Template-Deckel:** Ist die Obergrenze von 3 Vorlagen für Free-Nutzer wettbewerbsfähig gegenüber Strong/Hevy (dort meist 3 Vorlagen)?
