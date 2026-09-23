# EVARO Subscription Integration Map

Dieses Dokument dient als architektonische und funktionale Bestandsaufnahme für die bevorstehende Monetarisierung von EVARO (EVARO Pro). Es identifiziert alle kostenintensiven und hochwertigen Features, mappt relevante Screens und definiert die Integrationspunkte für RevenueCat, Supabase und das Backend, ohne voreilige Abhängigkeiten zu installieren.

---

## 1. Existing Premium-Related Code

Im aktuellen Repository-Bestand (Stand 22.09.2026):
- **Keine native In-App-Purchase-Bibliothek:** Weder `react-native-purchases` (RevenueCat) noch `expo-in-app-purchases` sind installiert (bleibt `ASTRA_REQUIRED`).
- **Client-Entitlement-State & Capability Layer (VERIFIED):** `entitlementService.ts` und Domain `Capabilities` (`FREE`, `PRO`, `COACH`) vollständig implementiert, Zustand-Stores (`programStore`, `workoutStore`, `bodyMetricStore`, `coachStore`, `profileStore`, `paywallStore`) mit fail-closed Action Guards und Downgrade-Preservation verdrahtet.
- **Aktive Screens verdrahtet (VERIFIED):** Template Builder, Programs, Workout Session, History, Body Metrics, Coach Chat und Appearance Settings triggern deterministisch entsprechende Paywalls (`pro` vs `coach`).
- **Backend-Schutz (`api/coach-chat.js`):**
  - Prüft aktuell, ob ein gültiger Supabase-Auth-Token vorliegt (`/auth/v1/user`).
  - Rate-Limiting: 10 Anfragen/Minute für eingeloggte Nutzer; 6 Anfragen/Tag für Prototyp-Nutzer (`prototype-`).
  - **Offenes Gate:** Serverseitiges Usage- & Quota-Ledger für Token-/Credit-Verbuchung bleibt `ASTRA_REQUIRED`.
- **Settings-Platzhalter:** Unter `profile.tsx` wurde im Profilmenü der Menüeintrag "Abonnement verwalten" vorbereitet (`ASTRA_REVIEW_REQUIRED`).

---

## 2. 3-Tier Monetization Architecture (FREE / PRO / COACH)

EVARO strukturiert alle Features in genau 3 Tiers (`COACH` > `PRO` > `FREE`):

### Core / Free Tier (Muss frei und offline nutzbar bleiben)
- **Unbegrenztes Workout-Tracking:** Echte Workouts starten, Sätze/Reps/Gewichte loggen, Übungen austauschen. Kein Workout-Zähler.
- **Lokale Historie & Basic PRs:** Lokale Trainingshistorie, Basic PRs, Basic Progression.
- **Starter Templates:** Feste Starter-Splits (Push/Pull/Legs etc.) mit anpassbaren Gewichten/Reps, aber fixierter Übungsstruktur.
- **Eigene Templates:** Maximal 2 eigene Templates. Versuch von Template #3 triggert PRO Paywall.
- **Downgrade-Garantie:** Alle Templates bleiben gespeichert; 2 bleiben editierbar, Rest wird read-only.
- **DSGVO Datenexport:** Vollständiger JSON-Export, niemals hinter Paywall.

### PRO Tier (Launch Defaults: 4,99 €/Monat, 29,99 €/Jahr)
- **Unbegrenzte Templates & Full Editing:** Volles Anlegen und strukturelles Editieren beliebig vieler Templates.
- **Program-System:** Mehrwöchige Programme, Trainingsblöcke, Periodisierung.
- **RPE & RIR:** Vollständige Eingabe und Auswertung im Workout-Logger.
- **Advanced Metrics:** Umfangreiche Körpermaße (Taille, Brust, Arme, KFA etc.) und Verlaufscharts.
- **Advanced Analytics:** Muskelgruppen-Heatmaps, langfristige Volumenentwicklung und Progression.
- **Premium Themes & Rewards:** Zusätzliche visuelle Stile und Themes.
- **Coach Fast Preview:** 5 Fast Requests / Woche (remote konfigurierbar, AI_READ=limited, AI_WRITE=false).

### COACH Tier (Launch Defaults: 11,99 €/Monat, 69,99 €/Jahr mit 14 Tagen Trial)
- **Erbt alle PRO Capabilities.**
- **Fast Mode + Plan Mode:** Volle Trainingsplanung, Deloads, Periodisierungsanpassungen (300 Credits / Monat; Fast=1, Plan=5).
- **Strukturierte AI Aktionen:** Generierung von `ProgramDraft` / `WorkoutTemplateDraft`.
- **Menschliche Bestätigung Pflicht:** `AI_WRITE` erfordert zwingend User Confirmation im Preview/Diff-Modal vor Persistierung.
- **Coach-exclusive Prestige Cosmetics:** Exklusive Rank-Embleme und UI-Elemente.

---

## 3. Screens & Capabilities Mapping

| Screen / Feature | Datei / Hook | Tier Gate | Capability Check | UI-Reaktion bei gesperrtem Zugriff |
|---|---|---|---|---|
| **Template Erstellung (#3+)** | `app/programs/template-builder.tsx` | PRO | `canCreateTemplate()` | PRO Paywall Modal (`source: 'template_limit'`) |
| **Programm-Erstellung** | `app/programs/index.tsx` | PRO | `canCreateProgram()` | Locked Feature Modal / PRO Paywall (`source: 'program'`) |
| **RPE / RIR Eingabe** | `SetRow.tsx`, `ExerciseCard.tsx` | PRO | `canUseRPE()`, `canUseRIR()` | Locked Feature Explanation (`source: 'rpe'/'rir'`) |
| **Advanced Body Metrics** | `app/profile/measurements.tsx` | PRO | `canUseAdvancedMetrics()` | PRO Paywall (`source: 'metric'`) |
| **Advanced Analytics** | `app/analytics/index.tsx` | PRO | `canUseAdvancedAnalytics()` | PRO Paywall (`source: 'analytics'`) |
| **Premium Appearance** | `app/settings/appearance.tsx` | PRO / COACH | `canUsePremiumAppearance()` | Locked Feature Modal (`source: 'appearance'`) |
| **Coach Fast Mode** | `src/components/CoachComposer.tsx` | PRO (Preview) / COACH | `canUseCoachFast()` | Coach Paywall wenn Quota aufgebraucht (`source: 'coach_preview_limit'`) |
| **Coach Plan Mode** | `apps/mobile/app/(tabs)/coach.tsx` | COACH | `canUseCoachPlan()` | COACH Paywall Modal (`source: 'coach_plan'`) |
| **Backend AI Endpoint** | `api/coach-chat.js` | Server-Gate | Token + Quota Check | HTTP 403 `ENTITLEMENT_REQUIRED` |

---

## 4. Required Integration Points

### 4.1 Mobile Client (React Native / Expo)
- **Bibliothek:** Integration von `react-native-purchases` (RevenueCat SDK).
- **Entitlement Hook:** Bereitstellung von `useSubscription()` bzw. `useEntitlement('evaro_pro')`.
- **Paywall Component:**
  - Hochwertiges BottomSheet / Modal mit Vorteils-Matrix (EVARO Free vs. EVARO Pro).
  - Rechtlich konforme Darstellung von Preis, Laufzeit, Testphase, Kündigungsbedingungen, EULA- und Datenschutz-Links (Apple Guideline 3.1.2).
  - "Käufe wiederherstellen" (Restore Purchases) Button.
- **Offline Resilience:** Gecachte Entitlement-Prüfung, damit Pro-Funktionen bei instabilem Netz im Fitnessstudio nicht flackern.

### 4.2 Backend (`api/coach-chat.js`)
- **Server-Side Gate vor Modellanfrage:**
  - Bevor ein kostenintensiver Call an OpenRouter abgesetzt wird, muss das serverseitig bestätigte Entitlement validiert werden.
  - Niemals allein auf einen Client-Header `isPremium: true` vertrauen.
- **Entitlement-Cache:** Schnelle Abfrage über Supabase-Tabelle `subscriptions` oder direkte RevenueCat REST API (`/v1/subscribers/{app_user_id}`).

### 4.3 Supabase Database
- **Tabelle `subscriptions`:**
  - Spalten: `user_id` (FK `users.id`), `status` (active, past_due, canceled, expired), `product_id`, `expires_at`, `platform` (ios, android), `original_transaction_id`.
  - RLS: Nur der Eigentümer darf seine Subscription lesen; Schreibrechte nur via Service-Role (Webhook).
- **RevenueCat Webhook:**
  - Ein Edge-Function- oder Serverless-Webhook empfängt Events von RevenueCat (`INITIAL_PURCHASE`, `RENEWAL`, `CANCELLATION`, `EXPIRATION`) und aktualisiert die Tabelle `subscriptions` atomar.

### 4.4 RevenueCat Dashboard (External Setup)
- Erstellung des Projekts in RevenueCat.
- Konfiguration des Entitlement Identifiers (z. B. `pro` oder `evaro_pro`).
- Verknüpfung von Apple App Store Shared Secret und Google Play Service Account.
- Webhook-Weiterleitung an die Produktions-Backend-URL.

### 4.5 Store Configuration (Apple / Google)
- Anlegen der In-App-Purchases (Auto-Renewable Subscriptions) in App Store Connect und Google Play Console.
- Bereitstellung von Standard-Intervallen (z. B. Monat / Jahr).
- Konfiguration der Family-Sharing- und Grace-Period-Optionen.

---

## 5. Detaillierte Spezifikationen & Architektur-Blueprints

Vollständige Vorbereitungen für die Implementierung durch Astra liegen vor in:
- **Feature-Matrix (Free vs Pro, Gates, Offline):** [EVARO_PRO_FEATURE_MATRIX.md](file:///d:/TrainingsAppGPT/docs/release/EVARO_PRO_FEATURE_MATRIX.md) (AR-008)
- **Architektur-Spezifikation (RevenueCat, StoreKit, Webhooks):** [ENTITLEMENT_ARCHITECTURE_SPEC.md](file:///d:/TrainingsAppGPT/docs/release/ENTITLEMENT_ARCHITECTURE_SPEC.md) (AR-008)

---

## 6. ASTRA_REVIEW_REQUIRED

- [ ] **Freemium Limits beschließen:** Finale Festlegung der Free-Kontingente für den AI Coach (3 Test-Prompts vs. 0) und Template-Obergrenze (3 Templates).
- [ ] **RevenueCat SDK Setup:** Installation von `react-native-purchases` und Initialisierung in `app/_layout.tsx`.
- [ ] **Webhook Endpoint:** Bereitstellung von `api/webhooks/revenuecat.js` zur atomaren Pflege von `public.subscriptions` und `public.users.is_pro`.
- [ ] **Serverseitiges Gating:** Aktivierung des `is_pro`-Checks in `api/coach-chat.js` vor Weiterleitung an OpenRouter.
- [ ] **Paywall UI:** Implementierung des nativen Paywall-Modals inklusive "Käufe wiederherstellen"-Button (Guideline 3.1.1).
- [ ] **App Review Test Account:** Vorkonfigurierter Sandbox-Test-Account mit aktivem Pro-Status für die Apple App Store Reviewer.

