# EVARO Astra Takeover — Execution Status

Stand: 22.09.2026. Maßgeblicher aktueller Bericht; ältere Gemini-Berichte bleiben historische Evidenz, keine aktuelle Releasefreigabe.

## Checkpoint 22.09.2026 — Batch 4: Local Foundations, Preferences, Resilience & Taxonomy Wiring (WP-03, WP-06, WP-07, WP-08, WP-09)

**WP-03 / WP-06 / WP-07 / WP-08 / WP-09, VERIFIED & PREPARED, Risiko LOW-MEDIUM.**

Gemini hat die kanonisch nächsten lokal ausführbaren P1-Aufgaben und Roadmap-Korrekturen implementiert, typgeprüft und automatisiert abgesichert:

1. **Roadmap-Korrekturen (VERIFIED):**
   - 08.02 bleibt strikt **OPERATIONAL ALERTS** (P0).
   - 08.03 ist **ANALYTICS TAXONOMY** (P1).
   - 06.07 (Empty/Error/Offline States) und 07.05 (Haptic Service) wurden verifiziert und nicht redundant neu gebaut.
   - S1-Status bleibt **PARTIAL** (PREVIEW_SECURITY_GATE: 0 Critical / 0 High / 0 Moderate; FULL_DEPENDENCY_AUDIT: 2 High in `image-size 1.2.1` via Metro/Expo SDK).
   - App-Identität bleibt provisorisch (`studio.skar.evaro` / EVARO); 01.03 bleibt **PARTIAL / USER_ACTION_REQUIRED** ohne voreilige Store-Verfestigung.

2. **Task 07.04 — Notification Preference Center (`notificationPreferences.ts`, `notificationPreferenceStore.ts`, VERIFIED):**
   - Granulare Kanäle: `restTimer`, `workoutReminders`, `coachProgress`, `marketingOffers`.
   - Strikte Entkopplung: Marketing & Produktangebote sind separat konfigurierbar; keine Kopplung von Trainings-Alerts an Marketing-Opt-in.
   - Privacy-by-design Defaults: Marketing standardmäßig `false`.
   - Hydrierte, partitionierte Speicherung in `useNotificationPreferenceStore` mit Zod-Validierung und Migration.
   - UI-Modal `NotificationSettingsModal.tsx` in `<= 2 Taps` aus den Einstellungen erreichbar.
   - 8 Tests in `packages/domain/src/__tests__/notifications.test.ts` und `apps/mobile/src/stores/__tests__/notificationPreferenceStore.test.ts` (alle PASS).

3. **Task 07.02 — Local Notifications / Rest Timer (`localNotificationService.ts`, PREPARED & VERIFIED):**
   - Lokaler Service für Rest-Timer und Workout-Erinnerungen ohne externe Serverabhängigkeit.
   - Lockscreen Privacy: Generische Benachrichtigungstexte ohne sensible Gesundheits-, Workout- oder Coach-Daten.
   - Sauberes Lifecycle-Handling: Timer-Abbruch oder -Reset annulliert geplante lokale Notifikationen sofort; keine Spam-Schleifen.
   - Respektiert die Benutzereinstellungen aus `notificationPreferenceStore` (`canSendNotification`).
   - 5 Tests in `apps/mobile/src/services/__tests__/localNotificationService.test.ts` (5/5 PASS).
   - Natives Expo-Notifications Push Token / Background Device Gate: `PHYSICAL_DEVICE_REQUIRED`.

4. **Task 06.06 — Contextual Permission Pre-Prompts (`ContextualPermissionModal.tsx`, VERIFIED):**
   - Transparente, nicht-manipulative Vorab-Erklärung vor nativen Systemdialogen für Benachrichtigungen (`notifications`), Mikrofon (`microphone` für Audio-Coach) und Fotos/Kamera (`photos` für Körpermaße/Fortschritt).
   - Verständlicher Mehrwert, klare Ablehn-Option („Nicht jetzt“).
   - Keine störende Permission-Wall beim App-Start.
   - 3 Tests in `apps/mobile/src/components/__tests__/ContextualPermissionModal.test.tsx` (3/3 PASS).

5. **Task 03.10 — Coach Provider Failure / Circuit Breaker Prep (`coachCircuitBreaker.ts`, `coachApi.ts`, VERIFIED):**
   - Resilienter `CoachCircuitBreaker` mit Zuständen `CLOSED`, `OPEN`, `HALF_OPEN`.
   - Fehlerschwelle (3 aufeinanderfolgende 5xx/429/Netzwerkfehler), 30 Sekunden Cooldown, bounded exponential backoff mit Jitter.
   - Fast-Fail im Zustand `OPEN` mit nutzerfreundlicher Meldung zur Schonung von Akku und Netzwerk; keine unnötigen Provider-Kosten.
   - Keine sensiblen Prompts, Chatverläufe oder Gesundheitsdaten in Fehler- und State-Logs.
   - 7 Tests in `apps/mobile/src/utils/__tests__/coachCircuitBreaker.test.ts` (7/7 PASS).
   - Verteilter serverseitiger Circuit State / Redis Quota Ledger: `ASTRA_REQUIRED`.

6. **Task 08.04 — Remote Config Client Preparation (`remoteConfigService.ts`, `monetizationConfig.ts`, PREPARED & VERIFIED):**
   - Abstraktion auf Basis von `RemoteSubscriptionConfig` mit Schema-Validierung via Zod.
   - Konfigurationsfelder für `coach_enabled`, `paywall_variant`, `notification_campaign`, `monetization_config` und `killed_features`.
   - Fail-safe Defaults bei Netzwerk-Timeout, Offline-Status oder malformed Responses; Stale-Cache-Fallback mit TTL.
   - Schnelle Feature-Deaktivierung via Kill-Switch (`isFeatureKilled`).
   - 6 Tests in `apps/mobile/src/services/__tests__/remoteConfigService.test.ts` (6/6 PASS).
   - Auswahl der Produktions-Remote-Config-Infrastruktur: `ASTRA_REQUIRED`.

7. **Task 08.05 — Support / Feedback Path Preparation (`SupportFeedbackModal.tsx`, PREPARED & VERIFIED):**
   - Erreichbarkeit aus Profil/Einstellungen in `<= 2 Taps`.
   - Bereitstellung integrierter FAQ-Punkte und technischer Diagnose-Mail.
   - Automatische Beilage technischer Diagnosedaten: App-Version, Plattform, OS-Version und Fehler-ID.
   - Strikter Ausschluss sensibler Daten: Keine Workouts, Gewichte, Körpermaße, Coach-Prompts, Chatverläufe, Tokens oder Fotos.
   - 3 Tests in `apps/mobile/src/components/__tests__/SupportFeedbackModal.test.tsx` (3/3 PASS).
   - Finale offizielle Support-E-Mail: `USER_ACTION_REQUIRED`.

8. **Task 08.06 — Review Prompt Policy (`reviewPromptPolicy.ts`, VERIFIED):**
   - Strenge Richtlinien für Bewertungsaufforderungen: Nur nach echten positiven Momenten (z. B. PR, aktiver Streak, $\ge 3$ abgeschlossene Workouts).
   - Strikter Cooldown: Mindestens 48 Stunden nach Fehlern, Abbrüchen, Crashes oder Paywall-/Kaufabbrüchen.
   - Frequenzlimitierung: Mindestens 60 Tage Abstand zwischen Prompts, maximal 3 Prompts pro Kalenderjahr.
   - Keine aggressive Review-Manipulation.
   - 6 Tests in `apps/mobile/src/services/__tests__/reviewPromptPolicy.test.ts` (6/6 PASS).

9. **Task 09.05 — Reduced Motion / Large Text Code Prep (PREPARED & VERIFIED):**
   - Überprüfung und Schutz gegen Text-Clipping bei Dynamic Type: `maxFontSizeMultiplier` auf UI-Buttons (`1.5`) und Modal-Titeln (`1.4`) hinterlegt.
   - Flex-Wrap und barrierefreie Touch-Targets ($\ge 44 \times 44$\,pt).
   - Respektierung von `prefers-reduced-motion` in Celebrations, Overlays und Modal-Animationen via `useReducedMotion()`.
   - 2 Tests in `apps/mobile/src/__tests__/accessibilityScalingRegression.test.tsx` (2/2 PASS).
   - Reale iOS Dynamic Type & Android Font Scale Abnahme: `PHYSICAL_DEVICE_REQUIRED`.

10. **Task 08.03 — Core Product Analytics Taxonomy Wiring (`monetizationAnalytics.ts`, VERIFIED):**
    - Verdrahtung der bestehenden kanonischen Lifecycle-Events: `onboarding_started`, `onboarding_completed`, `first_workout`, `second_workout`, `coach_usage`, `coach_error`.
    - Strikt datenschutzkonform: Keine Gewichte, Wiederholungen, Körpermaße, Prompts oder Coach-Antworten in Telemetrie-Payloads.
    - 4 Tests in `apps/mobile/src/services/__tests__/monetizationAnalytics.test.ts` (4/4 PASS).

- **Gesamtmetriken:** **851 Tests PASS** (118 Domain Vitest in 14 Suiten + 668 Mobile Jest in 100 Suiten + 49 Coach-API/Safety Node Tests + 16 Security-Regressionen); Workspace-Typecheck PASS; Lint PASS; `pnpm build:preview` Web-Export PASS (4.82 MB); Preview Security Gate PASS.

## Checkpoint 22.09.2026 — Batch 3: Real Product Flow Monetization Integration & Bypass Protection (WP-05 / S7)

**WP-05 / S7 Monetization Capability Integration, VERIFIED & PREPARED, Risiko MEDIUM.**

Gemini hat die bestehende 3-Tier-Entitlement-Architektur (FREE / PRO / COACH) vollständig und fail-closed in den realen Produkt-Screens, Stores und Action Handlern verdrahtet, direkte Store-Bypasses ausgeschlossen und strikte Downgrade-Datenintegrität gesichert:

1. **Free Template Limit (Max 2 eigene Templates, VERIFIED):**
   - Einstiegspunkte verdrahtet: `template-builder.tsx`, `workouts.tsx` (Create Button, Kebab "Bearbeiten", Options Modal 1 & 2, History-to-Program), `programs/builder.tsx` (History Session), `session.tsx` (Save Template), `history/[id].tsx` (Save as Template).
   - Store-Action Guard in `programStore.ts`: `createTemplate` wirft fail-closed `TEMPLATE_LIMIT_REACHED` wenn `!canCreateTemplate()`. `updateTemplate` wirft `TEMPLATE_LOCKED` wenn `!isTemplateEditable(id)`.
   - Deterministisches Downgrade: Die 2 ältesten Custom Templates (`createdAt ASC`) bleiben voll editierbar; Templates #3+ sowie Starter-Templates bleiben lesbar/startbar, aber `isTemplateEditable === false`. Re-Upgrade schaltet sofort alle Templates wieder frei. Zero Deletion.
2. **Program Gating (VERIFIED):**
   - Einstiegspunkte verdrahtet: `(tabs)/programs.tsx` (Create Program, "+"), `programs/builder.tsx` (Save Handler).
   - Store-Action Guard in `programStore.ts`: `createProgram` und `updateProgram` werfen fail-closed `PROGRAM_FEATURE_LOCKED` wenn unberechtigt.
   - Downgrade: Alle Programme bleiben gespeichert, einsehbar und ausführbar; strukturelles Editieren gesperrt.
3. **RPE / RIR Gating (VERIFIED):**
   - UI Guard in `SessionExerciseCard.tsx`: Input-Handler öffnen Pro-Paywall (`source: 'rpe' | 'rir'`).
   - Store-Action Guard in `workoutStore.ts`: `updateSet` säubert `rpe` und `rir` auf Free-Tier fail-closed (`undefined`) und trackt das Event.
   - Historische RPE/RIR-Werte bestehender Workouts bleiben unverändert erhalten und lesbar.
4. **Metrics Gating (VERIFIED):**
   - UI Guard in `(tabs)/body.tsx`: Speichern von Premium-Metriken (KFA, Umfänge) triggert Pro-Paywall (`source: 'metric'`).
   - Store-Action Guard in `bodyMetricStore.ts`: `addMetric` säubert `bodyFatPercentage` und `measurements` fail-closed. Wenn ausschließlich Premium-Metriken übergeben werden (kein Gewicht), wirft der Store `PREMIUM_METRIC_LOCKED`.
   - Historische Messungen bleiben vollständig gespeichert und einsehbar.
5. **Advanced Analytics Gating (VERIFIED):**
   - UI Guard in `(tabs)/history.tsx`: Basis-Historie, PRs und Volumen frei; e1RM-Progressionscharts zeigen Schloss-Icon und öffnen Pro-Paywall (`source: 'analytics'`).
6. **Appearance Gating (VERIFIED):**
   - Farbschemata in `AppearanceSettings.tsx`: `glacier` & `arctic` = Free, Premium-Farbschemata = Pro, `titanium` = Coach exclusive. Tap auf gesperrte Stile öffnet entsprechende Paywall (`source: 'appearance'`).
   - Store-Action Guard in `profileStore.ts`: `setColorway` wirft `COLORWAY_LOCKED`. Bei Downgrade-Event (`entitlementService.onTierChange`) speichert `syncAppearanceForTier` das aktive Farbschema in `savedPremiumColorway` und wechselt sicher auf Free (`glacier`). Re-Upgrade stellt die Premium-Auswahl automatisch wieder her.
7. **Coach Access & AI Write Safety (PREPARED & VERIFIED):**
   - Free Tier: Coach-Versand gesperrt (`coach_preview_limit`).
   - Pro Tier: Preview bis 5 Fast Requests/Woche; Plan-Modus gesperrt (`coach_plan` -> Coach Paywall).
   - AI Write Confirmation Guard: `saveCoachPlan` in `saveCoachPlan.ts` verlangt zwingend Coach Tier und explizite Bestätigung (`canUseAIWrite(true)`); unberechtigte Aufrufe werfen `AI_WRITE_NOT_AUTHORIZED`.
   - Server Quota Ledger: Bleibt `ASTRA_REQUIRED` vor echtem Provider-Einsatz.
8. **Automatisierte Regressionssuite (12 dedizierte Tests, VERIFIED):**
   - `apps/mobile/src/stores/__tests__/monetizationGating.test.ts` (12/12 Tests PASS) prüft alle Action Handlers, Direct Bypasses und Downgrade Preservation Szenarien.
- **Gesamtmetriken:** **810 Tests PASS** (114 Domain in 13 Suiten + 631 Mobile in 92 Suiten + 49 Coach-API/Safety + 16 Security-Regressionen); Workspace-Typecheck PASS; Lint PASS; `pnpm build:preview` Web-Export PASS (4.8 MB); Preview Security Gate PASS.

## Checkpoint 22.09.2026 — Batch 2: Resilient Onboarding State Machine & Value Reveal (WP-06 Tasks 06.01–06.03)

**WP-06 Tasks 06.01, 06.02, 06.03, VERIFIED & PREPARED, Risiko LOW.**

Gemini hat nach der Laptop-Unterbrechung den Arbeitsstand vollständig rekonstruiert, syntaktische und Typprobleme korrigiert und verifiziert:

1. **Task 06.01 — Onboarding State Machine (`onboardingState.ts`, `onboardingStore.ts`, VERIFIED):**
   - Versionierte State Machine mit `CURRENT_ONBOARDING_VERSION = 1` im Domain-Paket.
   - Resumable: Erlaubt Vor- und Zurück-Navigation (`nextStep`, `previousStep`), schrittweises Überspringen (`skipStep`) und vollständiges Überspringen (`skipOnboarding`).
   - Hydrierte, schema-validierte Speicherung im `onboardingStore` über `createHydratedStorage` mit `OnboardingStateSchema` und migrationssicherem `completedVersion`-Feld.
   - `needsOnboarding`-Gate: Erzwingt kein erneutes Onboarding für bestehende Nutzer bei kleineren Versions-Updates.
   - 7 Tests in `apps/mobile/src/stores/__tests__/onboardingStore.test.ts` (7/7 PASS).
2. **Task 06.02 — Datensparsame Präferenz-Erfassung (`OnboardingDraftDataSchema`, VERIFIED):**
   - Erfassung von Fitnessziel (`fitnessGoal`), Trainingserfahrung (`experienceLevel`), Trainingsfrequenz (`trainingFrequency`, 1–7 Tage) und Equipment (`equipment`).
   - Keine Erfassung von sensiblen Gesundheits-, Körper- oder Trackingdaten ohne expliziten Nutzen.
   - Synchronisation der ausgewählten Präferenzen in den `profileStore` bei Abschluss des Onboardings.
3. **Task 06.03 — Personalized Result / Value Reveal Recommendation (`getPersonalizedPlanRecommendation`, VERIFIED):**
   - Pure, deterministische Domain-Funktion zur Generierung eines konkreten Trainingssplit-Vorschlags (Ganzkörper, Upper/Lower oder Push/Pull/Legs) basierend auf Frequenz und Erfahrung, vollständig ohne externe Netzwerk- oder KI-Abhängigkeit.
   - Konkreter Nutzen für den Nutzer sichtbar, bevor eine Paywall erscheint.
   - 8 Tests in `packages/domain/src/__tests__/onboardingLogic.test.ts` (8/8 PASS).
- **Gesamtmetriken:** **774 Tests PASS** (100 Domain in 12 Suiten + 609 Mobile in 89 Suiten + 49 Coach-API/Safety + 16 Security-Regressionen); Workspace-Typecheck PASS; Lint PASS; `pnpm build:preview` Web-Export PASS (4.77 MB).

## Checkpoint 22.09.2026 — Batch 1: Compliance, Operations & Monitoring (P0)

**WP-04 / WP-05 / WP-08 / WP-10 / WP-11, VERIFIED & PREPARED, Risiko LOW-MEDIUM.**

Gemini hat den ersten Block der ausführbaren P0-Roadmap-Aufgaben vollständig implementiert, typgeprüft und automatisiert abgesichert:

1. **Task 04.05 — Asset License BOM (`THIRD_PARTY_NOTICES.md`, VERIFIED):**
   - Vollständige Software & Asset Bill of Materials in `THIRD_PARTY_NOTICES.md` konsolidiert.
   - Strikte Einhaltung: Keine unbewiesenen Annahmen („UNKNOWN bleibt UNKNOWN“).
   - Ausweisung von: `free-exercise-db` (Datensatz Public Domain/Unlicense VERIFIED; upstream Bild-Provenienz UNVERIFIED), `react-native-body-highlighter` (MIT VERIFIED), Space Grotesk / Manrope (OFL 1.1 VERIFIED), `@expo/vector-icons` (MIT/Apache/OFL VERIFIED), Level Badges / Rank Icons (UNKNOWN Commercial Terms), NPM Dependencies (MIT/Apache-2.0/BSD).
2. **Task 05.07 — Paywall Technical Compliance (VERIFIED / LEGAL_REVIEW_REQUIRED):**
   - StoreKit- & Google-Play-Billing-konforme Paywall-Präsentation in `PaywallModal.tsx` und `paywallStore.ts`.
   - Transparenter, tatsächlich belasteter Gesamtpreis als primärer Hauptpreis (z. B. 49,99 €/Jahr bzw. 9,99 €/Monat). Kein irreführender Monatsäquivalentpreis als alleiniger oder Hauptpreis (nur als transparente Vergleichszeile: `Entspricht ca. 4,16 € / Monat`).
   - Pflichtangaben: 7 Tage kostenlose Testphase, Kündigungsfrist (mind. 24 Std. vor Ablauf), automatische Verlängerung, Restore-Purchases-Button, Verlinkung von Nutzungsbedingungen (AGB) und Datenschutzerklärung.
   - Fail-closed ohne Store-Credentials; steckbare Provider-Abstraktion für RevenueCat / StoreKit.
   - Zweisprachige DE/EN Übersetzungen in `translations.ts` (`[LEGAL_REVIEW_REQUIRED]`).
   - 8 Tests in `apps/mobile/src/components/paywall/__tests__/paywallCompliance.test.ts` (8/8 PASS).
3. **Task 08.01 — Crash Monitoring Preparation & PII Sanitization (PREPARED):**
   - Abstraktion in `observabilityService.ts` mit steckbarem `ObservabilityAdapter` (keine ungeprüften SDK-Dependencies vor Account-Erstellung).
   - Strikte clientseitige Datenfilterung: Tilgung sämtlicher Fitness-/Gesundheitsdaten (Gewichte, Sätze, Wiederholungen, Workouts, Körpermaße, Taillenumfang) und Coach-Inhalte (Prompts, Antworten, Audio, Fotos) via `[REDACTED_SENSITIVE_KEY]`.
   - Automatisches Redigieren von E-Mail-Adressen (`[REDACTED_EMAIL]`) und JWT-/Bearer-Tokens (`[REDACTED_TOKEN]`).
   - Direkte Anbindung an `ErrorBoundary.tsx` für automatische Erfassung unbehandelter UI-Crashes.
   - 9 Tests in `apps/mobile/src/services/__tests__/observabilitySanitization.test.ts` (9/9 PASS).
4. **Task 10.02 — Apple Privacy Manifest Preparation (PREPARED):**
   - Vollständiges `PrivacyInfo.xcprivacy` und native Expo-Konfiguration in `app.json` (`ios.privacyManifests`).
   - Deklaration aller 4 Required Reason API Kategorien mit offiziellen Apple-Reason-Codes: `NSPrivacyAccessedAPITypeUserDefaults` (`CA92.1`), `NSPrivacyAccessedAPITypeFileTimestamp` (`C617.1`), `NSPrivacyAccessedAPITypeSystemBootTime` (`35F9.1`), `NSPrivacyAccessedAPITypeDiskSpace` (`E174.1`).
   - Deklaration von `NSPrivacyTracking: false` und Datentypen `Fitness` sowie `CrashData` (beide nicht mit Nutzeridentität verknüpft, kein Tracking).
   - 3 Tests in `apps/mobile/src/__tests__/privacyManifest.test.ts` (3/3 PASS).
5. **Task 11.03 — Production Incident Runbooks (PREPARED):**
   - 6 technische Notfall-Leitfäden in `docs/operations/INCIDENT_RUNBOOKS.md` mit Severity-Matrix (SEV-1 bis SEV-4) und Sofortmaßnahmen:
     1. AI Safety & Provider Incident (Kill Switch `COACH_SERVICE_ENABLED=false`, Spending-Limit, Rule Patch).
     2. Database & Sync Incident (Sync-Pause, Rollback, PITR).
     3. Leaked Secret Incident (Sofortiger Key-Widerruf, Rotation, Git-Filter).
     4. Subscription & Entitlement Incident (Grace Period, Webhook-Replay, Restore-Anleitung).
     5. Bad Release / Staged Rollout Halt (Phased Release Stop in App Store Connect / Play Console, OTA Rollback).
     6. Privacy & Data Breach Incident (72-Stunden-DSGVO-Meldekette gem. Art. 33).
   - Reale Personennamen und Kontakte als `USER_ACTION_REQUIRED` markiert.
- **Gesamtmetriken:** **759 Tests PASS** (92 Domain + 602 Mobile in 88 Suiten + 49 Coach-API/Safety + 16 Security-Regressionen); Workspace-Typecheck PASS; Lint PASS; `pnpm build:preview` Web-Export PASS (4.77 MB).

## Checkpoint 22.09.2026 — Recovery & Task 04.03: Versioned AI Consent (WP-04 / S6 / S10)

**WP-04 Task 04.03, DONE / VERIFIED, Risiko LOW (Legal Copy: LEGAL_REVIEW_REQUIRED).**

Nach Unterbrechung durch Laptop-Abschaltung vollständig rekonstruiert, abgeschlossen und verifiziert:
- **Technischer Mechanismus:**
  - `CURRENT_AI_CONSENT_VERSION = 1` und `AiConsentSchema` (`version`, `consentedAt`, `revokedAt`) im Domain-Paket.
  - Fail-Closed-Validierungsfunktion `hasValidAiConsent(consent, requiredVersion)`.
  - Persistente Speicherung im `profileStore` (user-scoped / partitioniert je Storage-Scope).
  - Deterministischer Consent-Guard vor `coachStore.sendMessage`: Sendung wird blockiert und Fehler `AI_CONSENT_REQUIRED` gesetzt, wenn kein gültiger Consent für die aktuelle Version vorliegt.
  - Consent-Guard vor Audio-Transkription / Stream in `useCoachRecorder`: bricht sofort fail-closed ab.
- **Benutzeroberfläche & Widerruf:**
  - `coach.tsx`: Blendet bei fehlendem oder veraltetem Consent den Chat-Composer und Vorschläge aus und zeigt stattdessen eine dedizierte Zustimmungs-Karte (`consentCard`) mit Zweckbeschreibung und Aktionsbutton („Zustimmen & Fortfahren“).
  - `profile.tsx`: Eigene Sektion für KI-Datenschutz mit Statusanzeige (`Aktiv (Version 1)`, `Widerrufen`, `Nicht erteilt`), Zweckbeschreibung und interaktivem Button für Zustimmung bzw. Widerruf mit nativer Sicherheitsabfrage (`Alert.alert`).
  - Zweisprachige Lokalisierung (DE/EN) in `translations.ts` mit strikter Ausweisung `[LEGAL_REVIEW_REQUIRED]`.
- **Automatisierte Testverifikation:**
  - Dedizierte Testsuite `apps/mobile/src/stores/__tests__/coachConsent.test.ts` (6/6 Tests PASS):
    1. Kein Consent -> kein Provider-Request, Fail-Closed mit Fehlermeldung.
    2. Consent erteilt -> Request an Coach-Proxy erfolgreich möglich.
    3. Consent widerrufen -> zukünftige Anfragen deterministisch blockiert.
    4. Veraltete Version -> Re-Consent zwingend erforderlich vor nächstem Request.
    5. Account-Wechsel A -> B -> strikte Partitions-Isolation (keine Vererbung des Consents).
    6. Malformed/Invalide Daten -> Fail-Closed.
- **Gesamtmetriken:** **739 Tests PASS** (92 Domain + 582 Mobile in 85 Suiten + 49 Coach-API/Safety + 16 Security-Regressionen); Workspace-Typecheck PASS; Lint PASS; `pnpm build:preview` Web-Export PASS (4.76 MB).

## Checkpoint 21.09.2026 — Task 01.03: App Identity (Provisional Candidate)

**WP-01 Task 01.03, PARTIAL (PROVISIONAL), Risiko LOW.**

Provisorische Identity-Konfiguration gemäß Nutzerrichtlinie:
- **Status:** `PARTIAL` (EVARO ist Arbeitsname; endgültiger Produktname noch nicht 100 % entschieden).
- **Display Name:** `EVARO`
- **Candidate iOS Bundle Identifier:** `studio.skar.evaro`
- **Candidate Android Package:** `studio.skar.evaro`
- **Candidate URL Scheme:** `evaro`
- **Auth Redirects:** `authStore.ts` und `authStore.test.ts` vorbereitet auf `evaro://` und `evaro://auth/reset-password`.
- **EAS Project ID:** `ddb36b12-30d0-4422-9e17-85ab8919f656` unverändert beibehalten.
- **Regel:** Keine irreversible Store-Identity oder unnötige Bundle-ID-Migration erzwingen, bis Nutzer den finalen Markennamen bestätigt.

## Checkpoint 21.09.2026 — Roadmap Execution: Blocks 1–5 (Commit `dcfc3aa`)

**P01/P02/P03/P09/S1/S4/S5/S6/S10, VERIFIED / PREPARED, Risiko LOW-MEDIUM.**

Gemini hat die fünf sicheren und reversiblen Roadmap-Blöcke auf `astra/p0-release-core` vollständig implementiert, verifiziert und dokumentiert:

1. **Block 1 — Accessibility / VoiceOver Audit & Profile UI:**
   - Bereinigung: Der störende "Jahre / years"-Schriftzug über dem Geburtsdatum in `profile.tsx` wurde vollständig entfernt.
   - RestTimer (`RestTimer.tsx`): Barrierefreiheitsrollen (`accessibilityRole="button"`), Zustände (`accessibilityState={{ expanded }}`) und zweisprachige a11y-Labels für Start, Pause, Bearbeitung und Zeitanpassung (`Plus 30 Sekunden` / `+ 30 seconds`). Mindest-Touch-Targets $\ge 44 \times 44$\,pt.
   - Anatomie (`AnatomyFigure.tsx`): `accessibilityRole="image"` und dynamische Beschriftung (`Muskelkarte Vorderseite` / `Muscle map Front`).
   - Session Reorder & Island Controls (`session.tsx`): Mindest-Touch-Targets $\ge 44 \times 44$\,pt.
   - BattlePassModal (`BattlePassModal.tsx`): Detail-Schließen-Button auf `minHeight: 44` gesetzt und mit `t('rank.closeDetail')` barrierefrei angebunden.
   - Automatisiert: Neuer a11y-Testsuite `accessibilityAudit.test.tsx` (6/6 Tests PASS).

2. **Block 2 — S4 Sync Failure Fixtures & Resiliency:**
   - 17 spezifische Fehler- und Grenzszenarien in `syncFailureScenarios.test.ts` implementiert und verifiziert (17/17 PASS):
     - Request timeout während Push
     - Connection loss während Push & Pull
     - Partial server response (ungültiges Session-Schema)
     - Malformed server response (ungültige Domain-Werte)
     - Duplicate identical records im Snapshot (Idempotenz)
     - Stale response (älteres Remote-Datum überschreibt neuere lokale Änderung nicht)
     - Missing child entity reference
     - Failed remote delete (Verbleib in Outbox)
     - Retry nach lokalem ACK-Fehler
     - Reconnect mit FIFO Outbox-Reihenfolge
     - Account switch mit pending operations (Tenant-Isolation)
     - Logout mit pending operations (Safe Halt ohne unauthentifizierte Writes)
     - Race-Condition: Response trifft nach lokaler State-Änderung ein (Pull Snapshot verworfen)
     - Duplicate completion (Idempotenz ohne Loop)
     - Empty remote snapshot (kein Datenverlust ohne Tombstone)
     - Foreign user_id injection (Cross-Tenant Rejection)
   - Server-Architektur (Tombstones, Revisions, atomare Aggregate) bleibt `ASTRA_REQUIRED`.

3. **Block 3 — Dependency Triage & Safe Minor/Patch Updates:**
   - Vollständige Re-Analyse der 43 High Findings. Ergebnis: 41 von 43 Findings ließen sich über sichere, versionskompatible Minor-/Patch-Overrides in `pnpm-workspace.yaml` ohne Major Updates und ohne Expo SDK Upgrade lösen:
     - `@xmldom/xmldom` (19 Befunde): 0.8.13 -> 0.8.15, 0.9.10 -> 0.9.12
     - `brace-expansion` (9 Befunde): 1.1.15 -> 1.1.21, 2.1.1 -> 2.1.7, 5.0.6 -> 5.0.12
     - `js-yaml` (6 Befunde): 3.14.2 -> 3.15.2, 4.1.1 -> 4.3.2
     - `postcss` (2 Befunde): 8.4.49 / 8.5.15 -> 8.5.18
     - `browserslist` (2 Befunde): 4.28.2 -> 4.28.9
     - `form-data` (1 Befund): 4.0.5 -> 4.0.6
     - `vite` (1 Befund): 8.0.14 -> 8.0.16
     - `shell-quote` (1 Befund): 1.8.4 -> 1.10.0
   - **Verbleibende High Befunde:** Nur noch **2 High Findings** (beide `image-size` 1.2.1, DoS im ICNS/JXL-Parser). Ein Fix erfordert `image-size >= 2.0.3` (Major-Upgrade mit Breaking Changes in Expo SDK 52 Tools). Entsprechend Vorgabe als `EXPO_SDK_UPGRADE_REQUIRED` dokumentiert und nicht forciert.
   - Frozen install (`pnpm install --frozen-lockfile`) verifiziert in 809 ms.

4. **Block 4 — S5 Account Deletion Test Preparation:**
   - Dedizierte Contract- und Resilienz-Suite in `accountDeletionContract.test.ts` (13/13 Tests PASS):
     - Authentifizierter Nutzer zwingend erforderlich
     - Server leitet `auth.uid()` ab; Client übergibt niemals eine `user_id` (Schutz vor IDOR)
     - Idempotente Löschung und Schutz vor parallelen Mehrfach-Aufrufen (`DOUBLE_SUBMIT`)
     - Remote-Fehler (500, Timeout, Netzwerkabbruch) führt zu **Zero Data Loss** lokal
     - Partielle Server-Bereinigung, Auth-Löschungs-Fehler, Storage-Fehler und Provider-Fehler blockieren lokalen Wipe
     - Lokaler Daten-Wipe erfolgt strikt erst nach bestätigtem Cloud-Erfolg
     - Session-Revocation (`signOut`) unmittelbar nach Datenbereinigung
     - Account-Switch-Isolation
   - Backend/RPC-Deployment bleibt `ASTRA_REQUIRED`.

5. **Block 5 — AI Safety DE/EN Erweiterung:**
   - Vollständige zweisprachige (DE / EN) Absicherung in `api/coach-safety.cjs` und 49 Tests in `api/coach-safety.test.cjs` (49/49 PASS):
     - Akute Brustschmerzen (DE & EN)
     - Dyspnoe / Atemnot (DE & EN)
     - Bewusstlosigkeit / Ohnmacht (DE & EN)
     - Schwere Verletzungen / Knochenbruch / Sehnenriss (DE & EN)
     - Starvation / Nulldiäten unter 500 kcal (DE & EN)
     - Gefährliche Dehydrierung / Trockenfasten (DE & EN)
     - Steroid- & PED-Dosierungsanfragen (DE & EN)
     - Medizinische Diagnoseanfragen (DE & EN)
     - Prompt Injections & Instruktions-Bypasses (DE & EN)
     - System Prompt Exfiltration (DE & EN)
     - Payload-Grenzen (Überlänge >50k Zeichen, ungültige Base64-Bilder, ungültige URL-Attachments)
     - Provider-Fehler 500/502/503 ohne Credential-Leaks

6. **Task 02.06 — Guest / Installation ID Migration (WP-02 / S4/S5):**
   - Implementierung eines sicheren, transaktionalen und idempotenten Migrationspfades von Guest (`legacy` Partition / `LOCAL_USER_ID`) zu Account (`account:<uuid>`) in `authMigration.ts` und `applyAccountSession` (`authStore.ts`).
   - Automatische Erkennung vorhandener Gast-Daten (`captureGuestSnapshot` / `hasGuestData`).
   - Sicheres Zusammenführen in die Ziel-Partition:
     - Workouts: Ownership-Umschreibung auf `newUserId`, ID-Kollisionsauflösung via Crypto UUID, FIFO-Sync-Queue-Enqueueing.
     - Eigene Übungen: Mapping bestehender/identischer Namen, Neuzuweisung von kollidierenden IDs.
     - Templates & Programme: Remapping aller Übungs-IDs, Übernahme ohne Duplizierung von Standard-Plänen.
     - Körpermaße: Deduplizierung identischer Zeitstempel.
     - Gamification / Achievements: Max-Verknüpfung von XP und Level, Vereinigung von freigeschalteten Achievements und Zählern.
     - Profile: Übernahme von konfigurierten Gast-Attributen ohne Überschreiben bestehender Account-Werte.
   - Idempotenz: Wiederholte Migration erzeugt keine Duplikate.
   - Rollback / Zero Data Loss: Fehler während der Partition-Hydration oder der Migration brechen vor dem Legacy-Purge ab; Legacy-Daten bleiben unverändert erhalten.
   - Tenant-Isolation & Cross-Account-Schutz: Direkter Account-Wechsel A -> B migriert niemals Daten; Logout setzt auf sauberen Gast-Zustand zurück.
   - Bereinigung: `purgeLegacyPartition` löscht ungescopte Gast-Daten nach erfolgreichem Account-Schreibvorgang aus MMKV und AsyncStorage.
   - 9 Regressionsszenarien in `guestMigration.test.ts` (9/9 PASS):
     1. Empty guest
     2. Guest with workouts
     3. Existing account data
     4. Guest + existing account collision
     5. Interrupted migration
     6. Repeated migration
     7. Logout/login isolation
     8. Account switch A -> B
     9. Rollback on persistence failure

- **Testmetriken:** **733 Tests PASS** (92 Domain + 576 Mobile in 84 Suiten + 49 Coach-API/Safety + 16 Security-Regressionen); Workspace-Typecheck PASS; Lint PASS; `pnpm build:preview` Web-Export PASS (4.76 MB).

### Kanonische Security-Roadmap Governance (S0–S12)

Gemäß verbindlicher Projekt-Governance gilt für alle Berichte, Reviews und Statusdokumente exakt diese kanonische S0–S12-Struktur:

| Code | Kanonische Bezeichnung | Status | Begründung / Offene Gates |
|---|---|---|---|
| **S0** | **Repository Truth / Threat Model** | `PARTIAL` | Codebezogene Grenzen/Angriffe in SECURITY.md verankert; Team-/Betriebsabnahme und Production-Datenflüsse durch Maintainer zu bestätigen. |
| **S1** | **Secrets / Supply Chain / CI** | `PARTIAL` | 41 von 43 High Findings via Minor/Patch Overrides behoben (nur 2 verbleiben in `image-size`, bedingt durch Expo SDK 52); Preview-Gate aktiv; SAST/Branch-Protection offen. |
| **S2** | **Authentication / Secure Session Storage** | `PHYSICAL_DEVICE_REQUIRED` | Native SecureStore-Migration implementiert; physische iOS/Android-Geräteabnahme, Reauth, Refresh und Zero-Logout-Nachweis offen. |
| **S3** | **Authorization / RLS / Multi-Tenant Isolation** | `PARTIAL` | Echter lokaler PostgreSQL-17.11 Harness (304 Assertions) VERIFIED; Supabase Remote-DDL, PostgREST und Remote-Auth offen (`ASTRA_REQUIRED`). |
| **S4** | **Sync / Data Integrity** | `PARTIAL` | Lokale SQLite FIFO-Outbox, Rollback und 17 Failure-Fixtures VERIFIED; serverseitige atomare Aggregate, Konflikte & Tombstones offen (`ASTRA_REQUIRED`). |
| **S5** | **Account Lifecycle / Privacy / Health Data** | `PREPARED` | Parametrisierungsfreier RPC-Löschvertrag (`auth.uid()`) und 13 Client-Contract-Tests VERIFIED; serverseitige Cascade und Auth-Löschung auf Supabase offen (`ASTRA_REQUIRED`). |
| **S6** | **AI Coach Security / Safety / Cost Controls** | `PARTIAL` | 49 deterministische DE/EN Notfall- und Guardrail-Szenarien VERIFIED; Prototype-Bypass gesperrt; serverseitiges Token-Ledger/Budget offen (`ASTRA_REQUIRED`). |
| **S7** | **Subscription / Premium Integrity** | `PREPARED` | Client-Entitlement-Abstraktion vorhanden; kein natives StoreKit/RevenueCat aktiv; serverseitige Quittungsvalidierung offen (`ASTRA_REQUIRED`). |
| **S8** | **Infrastructure / Backup / Monitoring / Incident Response** | `PARTIAL` | Lokale SQLite-Backups und Log-Redaktion VERIFIED; Cloud-Restoreprobe, Hosting-IAM, Alarmierung und Runbooks offen. |
| **S9** | **AppSec Automation / Security Testing** | `PARTIAL` | 721 Tests, Dependency-Regressionen und Preview Security Gate aktiv; DAST und Deep-Link-Fuzzing offen. |
| **S10** | **Legal / Store / Accessibility / Release Compliance** | `USER_ACTION_REQUIRED` | Accessibility-Audit der Core-Screens & Touch-Targets $\ge 44 \times 44$\,pt abgeschlossen; UI-i18n Parität fortgeschritten; Medienrechte und finale AGB/Datenschutz-Texte durch Maintainer/Astra erforderlich. |
| **S11** | **Physical Device / Pre-Launch Red Team** | `PHYSICAL_DEVICE_REQUIRED` | Web-Preview und 13-Schritte Safari QA aktiv; reale On-Device-Tests (iOS/Android), Gesten, Haptik, Permissions und Pen-Testing offen. |
| **S12** | **Post-Launch Security Operations** | `PREPARED` | Eskalationsmatrix in SECURITY.md definiert; Besetzung des Regelbetriebs und Incident Response Übungen vor Launch erforderlich. |

- **Rebalancing der zentralen Domain-Progression (Kandidat B — Glatte kubische Drei-Phasen-Kurve):**
  - Vorherige Kurve (`fefed5a`) war mit 1.000 XP für Level 2 (~7 Workouts) zu zäh für den Einstieg.
  - Gewählte Formel (Kandidat B): $XP(L) = 10 \times (L - 1)^3 + 50 \times (L - 1)^2 + 350 \times (L - 1)$ für $L \ge 2$, mit exakter Lookuptabelle und binärer Suche bis Level 100.
  - **Early Game (Level 1–5):**
    - Level 2: 410 Total XP ($\Delta 410$, ~2,9 normale Workouts)
    - Level 3: 980 Total XP ($\Delta 570$, ~7,0 Workouts kumulativ)
    - Level 4: 1.770 Total XP ($\Delta 790$, ~12,6 Workouts kumulativ)
    - Level 5: 2.840 Total XP ($\Delta 1.070$, ~20,3 Workouts kumulativ)
  - **Mid Game (Level 6–15):** Kontinuierlich steigende Abstände (L6 = 4.250 XP, L10 = 14.490 XP [~103 Workouts], L15 = 42.140 XP [~301 Workouts]).
  - **Late Game (Level 16+):** Reale Langzeitbindung ohne abrupte Wand (L20 = 93.290 XP [~666 Workouts], L50 = 1.313.690 XP).
  - **Session-XP & Anti-Exploit-Schutz unverändert:** Diminishing Returns (Base 50, Sätze max 30, Volumen max 110, PR max 75; absolutes Cap 265 XP).
  - Kein einzelnes Workout kann Level 1 -> 2 überspringen (265 < 410 XP). Idempotenz-Schutz via `awardedSessionIds` intakt.
- **Aktualisierte Testmetriken:** **677 Tests PASS** (92 Domain [inkl. 5 Workout-Archetyp-Simulationen] + 531 Mobile in 80 Suiten + 38 Coach-API + 16 Security-Regressionen); Workspace-Typecheck PASS; Lint PASS; `pnpm build:preview` Web-Export PASS (4.75 MB).
- **iPhone QA Guide:** `docs/release/IPHONE_FREE_TEST_GUIDE.md` um Abschnitt 21 (13 konkrete Testschritte zur Progression) erweitert.

## Checkpoint 21.09.2026 — UI/i18n Cleanup, Level/XP Rebalancing & Age UI

**P01/P03/P09/S1/S8/S11, VERIFIED / PREPARED, Risiko LOW-MEDIUM.**
- **Zentrale Domain-Progression (Single Source of Truth):** Neue `packages/domain/src/logic/levelProgression.ts` mit mathematisch kontrollierter Progression:
  - Formel: $XP(L) = 200 \times (L - 1)^2 + 800 \times (L - 1)$ für $L \ge 2$, mit geschlossener Umkehrfunktion $L(XP) = \lfloor \sqrt{4 + \frac{XP}{200}} - 1 \rfloor$.
  - Level 1 -> 2 erfordert 1.000 XP (~7 normale Workouts). Level 10 = 23.400 XP, Level 20 = 87.400 XP, Level 50 = 519.400 XP.
  - Session-XP berechnet mit degressiver Staffelung (Diminishing Returns): Base 50 XP, Sätze max 30 XP (1-10 je 2 XP, 11-20 je 1 XP), Volumen max 110 XP (Tier 1-3 Kurve), PR-Bonus max 75 XP (25 XP/PR bis max 3). Ein einzelnes Workout ist absolut auf maximal 265 XP gedeckelt (typisch ~120-160 XP).
  - Ein normales Workout kann niemals mehrere frühe Level überspringen.
  - Idempotenz-Schutz in `achievementStore.ts` gegen doppelte Session-XP-Vergabe via `awardedSessionIds`.
- **Plans Create Modal (i18n):** Fehlende Übersetzungs-Keys behoben (`createChoiceTitle`, `createTemplate`, `createTemplateDesc`, `createPlan`, `createPlanDesc`). Keine raw Translation Keys mehr sichtbar in DE oder EN. Regressionstest in `plansCreateModal.test.ts`.
- **Celebrations / Workout-Feier-Effekte (i18n):** Vollständige DE/EN-Lokalisierung für Titel, Untertitel, Effektnamen (Klassisch/Classic, Inferno, Neon-Pulse/Neon Pulse, Goldregen/Golden Rain, Matrix-Code/Matrix Code, Kosmisch/Cosmic) und Aktions-Alerts.
- **LevelProgress & BattlePassModal (i18n):** Dynamisch zusammengesetzte Strings ("bis Level..." / "to Level...", "Nächster Rank bei Level..." / "Next rank at Level...") vollständig über `useI18n()` und `getLevelProgress(xp)` locale-aware gemacht.
- **Age / Geburtstag UI Cleanup:** Unnötiges / störendes Glitzer-Icon (`sparkles-outline`) aus dem Alters-Badge in `profile.tsx` entfernt. Saubere Textdarstellung `{Alter} Jahre` / `{Age} years old`, Accessibility-Label intakt, keine Profildaten verändert.
- **Testmetriken:** **673 Tests PASS** (88 Domain + 531 Mobile in 80 Test-Suites + 38 Coach-API + 16 Security-Regressionen); Workspace-Typecheck PASS; Lint PASS; `pnpm build:preview` Web-Export PASS (4.75 MB).

## Checkpoint 21.09.2026 — Gemini Takeover, Preview Recovery & i18n Fix

**P03/P09/S1/S8/S11, VERIFIED / PREPARED, Risiko LOW-MEDIUM.**
- **Unterbrochener i18n-Block fertiggestellt:** In `WorkoutCompleteModal.tsx` und `WorkoutCompleteModal.test.tsx` wurden alle englischen Telemetrie- und Abschluss-Strings bei deutscher Sprache beseitigt. Fakten, Vergleiche, Labels (ZEIT, SÄTZE, KG/LBS), dynamische Übungsauswertungen und barrierefreie Buttons sind 100 % lokalisiert. TypeScript-Fehler behoben (`displayName` in Mock-Profilen). Edge-Cases (0 Sätze, fehlende Übung, 0s Dauer) und Unveränderlichkeit der Sessiondaten verifiziert.
- **Vercel Preview Build repariert (Option B Gate-Architektur):** `pnpm build:preview` scheiterte zuvor daran, dass `pnpm audit --audit-level high` den Web-Export bei den 43 bekannten Build-Tool-Befunden abbrach. Durch das neue `scripts/security/preview-security-gate.cjs` wird die Trennung sauber gewahrt: Volle Testprüfung (`pnpm verify`), Null-Toleranz für Critical, Ausschluss von Production-Secrets, transparente Dokumentation aller High/Moderate-Befunde im Log und Kennzeichnung als `NON_RELEASE_BUILD`. CI-Release-Gate (`audit:ci`) bleibt strikt blockierend.
- **Supply-Chain-Triage:** Vollständige Matrix in `docs/release/DEPENDENCY_AUDIT_REPORT.md`. Alle 43 High-Befunde verbleiben zu 100 % in Build/Dev/Test-Werkzeugen (0 Client-Bundle-Reachability).
- **Vorbereitungsdokumente für Astra:**
  - `docs/architecture/S4_SYNC_PREPARATION.md` (Atomare Cloud-Aggregate, Konflikte, Idempotenz) -> `ASTRA_REQUIRED`
  - `docs/architecture/S5_ACCOUNT_DELETION_SPEC.md` (Parametrisierungsfreier RPC-Löschvertrag, Cascade) -> `ASTRA_REQUIRED`
  - `docs/architecture/AI_SECURITY_PREPARATION.md` (DE/EN Safety-Eskalationen, Quota-Interface) -> `ASTRA_REQUIRED`
- **Aktuelle Testmetrik:** **654 Tests PASS** (77 Domain + 523 Mobile + 38 Coach-API + 16 Security-Regressionen); Typecheck PASS; Lint PASS; Web-Build PASS (4.74 MB).

21.09.2026 — Abschluss auf Nutzerwunsch wegen Wochenbudget: `61f80cd` gepusht, danach ausschließlich Coach-Testumgebung isoliert (LOW). Tatsächlicher Vercel-Build brach vor Audit wegen geerbtem VERCEL/NODE_ENV ab; reproduziert und Testfixtures korrigiert. 38/38 API-Tests in beiden Umgebungen PASS; produktiver Auth-Handler unverändert, Hosted-Identity-Negativtest bleibt aktiv. Keine erneute Vollsuite für reine Testfixture-Änderung; letzte 640er-Vollsuite/Typecheck/Lint/Build gilt für unveränderten Anwendungscode. Nächster Remote-Build noch zu prüfen; Audit bleibt 43 high/14 moderate. Wiedereinstieg mit konkreten Belegen/Grenzen am Anfang von ASTRA_HANDOFF.md. Production `6471138` im Vercel-Dashboard bestätigt und unverändert.

## Checkpoint 20.09.2026 — kostenloser iPhone-Testpfad

**P01/P09/S8/S11, PARTIAL, Risiko MEDIUM.** Bestehende Expo-Web-App wiederverwendet; SDK 54, native Bundle-IDs und Datenformate unverändert. Vom Nutzer angelegte EAS-Verknüpfung übernommen. Statischer WLAN-Server liefert ausschließlich den Export, bindet gezielt eine private Schnittstelle, sperrt API, Schreibmethoden, Secrets/Maps und Pfadausbruch. Exportierte pnpm-Schriften benötigen die eng begrenzte Ausnahme `assets/__node_modules/.pnpm`; mit HTTP-Regression geprüft. Safe-Area-Viewport, Manifest, Home-Screen-Metadaten und vorhandenes Icon ergänzt, ohne Service Worker oder Offline-Versprechen.

WLAN-Startfehler nachvollzogen: Expo-Web-UUID benötigt `crypto.randomUUID`, das auf HTTP-LAN fehlt. Gemeinsamer UUID-Einstieg belässt Native bei Expo und nutzt im Web alternativ CSPRNG `getRandomValues` mit UUID-v4-Bits. Keine schwache Zufallsquelle, kein Datenreset und keine ID-/Schemamigration. Fünf Regressionen prüfen Entropie, Format und Fail-closed. Die nach EAS/Expo-Generierung sichtbaren DOM/RN-Typkonflikte bei zwei Timern und AbortSignal minimal korrigiert.

**Vertrauensgrenzen/Privacy:** HTTP-WLAN nur synthetische Gastdaten im privaten Netz, kein Login/Provider. HTTPS-Preview ist keine Freigabe für reale Gesundheitsdaten. Keine neue Dependency, keine Telemetrie und keine Providerkosten. Keine Lizenzfreigabe für bestehende Assets behauptet. Code-Rollback braucht keine Datenkonvertierung, würde den LAN-Startfehler wieder öffnen.

**Browserbeleg:** bestehendes Vercel-Projekt `fitness-tracker`, Deployment `96e4joyXE1p2bwHnznaBdiYR2GyH`, Ready / Preview / `3bd4713`. Dashboard und Pläne laden. Lokaler neuer Export bei 390 × 844: Dashboard, Workout/Übung, Testsatz 20 kg × 8, Reload erhält Wert und Abschluss; Fonts/Icons nach Serverkorrektur sichtbar. Das ist Chromium am PC, keine Safari-/Geräteabnahme. Bestehender englischer Wiederaufnahme-Dialog in DE als P1 offen.

**Deployment-Gate:** Vercel-Git war bereits aktiv und wartete nicht nachweislich auf GitHub-Security-Gates. Neuer Review-Build `pnpm build:preview` verlangt Verify → Audit (high) → Web-Build. Offene hohe Befunde blockieren das Update; die alte HTTPS-Preview bleibt ausdrücklich ein älterer Teststand. SAST/Lizenz/SBOM, vollständige CI-Abhängigkeit und Remote-Konfiguration noch offen. Kein Main-Merge, Production-Deploy, Remote-SQL, Billing oder Store-Upload. Vercel-Connector 403 für den Dashboard-Scope, Browserzugang funktioniert.

Schritt-für-Schritt-Befehle, konkrete URLs, Env-Matrix, Staging-Voraussetzungen und Soll-Ergebnisse: [IPHONE_FREE_TEST_GUIDE.md](IPHONE_FREE_TEST_GUIDE.md). Prüfprotokolle: `output/iphone-checkpoint-verify.log`, `iphone-checkpoint-final-build.log`, `iphone-checkpoint-bundle-secrets.log`. Nächster Architekturblock bleibt S4 serverseitige Atomizität/Idempotenz/Konflikte; S5 folgt danach. Hohe Supply-Chain-Befunde blockieren inzwischen auch neue HTTPS-Previews und müssen separat kompatibel behoben werden.

Abschlussmessung: **pnpm verify PASS, 640 Tests = 77 Domain + 511 Mobile (78 Suites) + 38 API + 14 Security**; Typecheck/Lint PASS. Web-Build und Export-Metadatenprüfung PASS, Expo public/introspect beide Exit 0, Bundle-Gitleaks keine Treffer. Erneuter Online-Audit nach initialem Netzwerkfehler: **57 Befunde = 43 high + 14 moderate**, Exit 1, keine Ausnahme. Lokaler PostgreSQL-Harness zuvor in dieser Session erneut 304 + 304 Assertions und Bestands-Preflight PASS; SQL seither unverändert. Native und Remote-Supabase-Gates bleiben offen. Kein vollständiger SAST-/Lizenznachweis.

## Fortsetzung 20.09.2026 — dauerhafte lokale Outbox und Beta-Abnahme

Nutzer hat geeignete Main-Integrationen jetzt autorisiert, mit Testanleitung pro abgeschlossenem Block; AGENTS.md/ROADMAP.md entsprechend aktualisiert. Das frühere pauschale Main-Verbot gilt nicht mehr. Der aktive Beta-/Hostingkanal ist noch unbestätigt (Vercel-Konfiguration und EAS-Profile sind nur vorbereitete Repository-Konfiguration). Kein Main-Push/Deployment in diesem Block: Gesamtbranch enthält offene native Migrationsgates und die bekannten Security-Gates. Konkrete Nutzer-Testschritte mit Soll-Ergebnissen jetzt in BETA_REGRESSION_MATRIX.md.

**P02 / S4, HIGH:** Fehler beim lokalen Enqueue/ACK/Retry/Clear dürfen Memory-Queue und persistierte Queue nicht auseinanderlaufen lassen. Besonders Cloud-Erfolg + SQLite-ACK-Fehler konnte die Operation zunächst im Speicher entfernen und anschließend endgültig verlieren. Vier echte SQLite-Triggerregressionen ergänzen den vorhandenen Harness; drei ursprüngliche Fehlerfälle reproduziert. Vorhandene Transaktions-/Rollback-Helfer wiederverwendet; geschachtelte Workout-/Coach-Plan-Befehle nehmen an der äußeren Transaktion teil. Kein Schemawechsel, keine neue Dependency, keine Rohdatenlogs, keine Remote-Migration. Rollback des Codes braucht keine Datenkonvertierung, würde die Lücke aber wieder öffnen. Schutzbedarf SENSITIVE/HIGH_SENSITIVITY, Grenze lokale Memory-Projektion → dauerhafte kontogebundene Queue.

Gezielte Integration **40 Tests PASS**. Erster Volltest fand neun Integrationsfehler durch unerlaubte verschachtelte SQL-Transaktionen; Ursache korrigiert, nicht ignoriert. Erneutes vollständiges **pnpm verify PASS: 625 Tests = 77 Domain + 506 Mobile (77 Suites) + 38 API + 4 Security**, Typecheck/Lint PASS. Logs: output/outbox-durability-red.log, outbox-durability-integration.log, outbox-durability-final-verify.log. Keine Änderung an zuvor getesteter RLS-Migration (304 PostgreSQL-Assertions unverändert gültig).

Abschluss dieses Blocks: Web-Build PASS (4.74 MB), Staged- und Bundle-Secret-Scan ohne Treffer. Kein nativer Build/OTA und keine Produktionsänderung. Testlogs: output/outbox-durability-build.log und outbox-durability-bundle-secrets.log.

Gates bleiben offen: Audit zuletzt heute **57 Befunde (43 high/14 moderate)**, SAST/SBOM/Lizenz-Gesamtabnahme, native Geräte und tatsächlicher Auslieferungsweg. Paket-/Lockfile seit diesem Scan unverändert. Cloud-Erfolg ohne lokalen ACK kann Retry auslösen: keine Exactly-once-Behauptung. S4 bleibt PARTIAL bis atomare serverseitige Aggregate, Idempotenz/Revisionen/Konflikte/Tombstones und reale Supabase-End-to-End-Abnahme fertig sind. Anschließend S5 Account-Löschung; Produkt- und Security-Roadmap bleiben abgestimmt.

## Sicherer Engineering-Checkpoint — S4 Sync-Fehlergrenzen, 20.09.2026

Fortsetzung nach **8b0a6e1**. Risiko **CRITICAL**, S4 **PARTIAL**. Schutzbedarf: Profil, Workout-History, Programme/Templates, eigene Übungen und Körpermesswerte. Cloud-Antworten sind untrusted; Ownership und vollständige Beziehungen werden vor jeder lokalen Anwendung validiert. Clientprüfung ersetzt keine serverseitige Autorisierung.

Implementiert: bislang ignorierte Child-Read/Delete- und Pull-Fehler propagieren; fehlgeschlagene Outbox-Operation bleibt erhalten. Pull bei ausstehenden lokalen Änderungen auslassen; während Requests neu entstandene Queue verhindert Anwendung des Snapshots. Alle sechs Antworten erst validieren, dann lokale Stores gemeinsam mit vorhandener SQLite-Transaktion anwenden. Bei Schreibfehler alle Memory-Projektionen zurückrollen; lastSyncedAt nur bei erfolgreicher Übernahme. Keine Cloud-Rohdaten in Pull-Fehlerlogs.

**18 neue Regressionen PASS**, inklusive echter SQLite-Triggerfehlerinjektion nach Profil-/Verlaufsänderung und Kontrolle wiederhergestellter persistierter Daten. Gesamtlauf **pnpm verify PASS: 621 Tests = 77 Domain + 502 Mobile (77 Suites) + 38 API + 4 Dependency-Security**; Typecheck/Lint PASS. Logs: output/sync-checkpoint-verify.log und sync-checkpoint-targeted.log. Vorheriger S3-Nachweis bleibt 304 PostgreSQL-Assertions, keine neue SQL-Migration im S4-Block.

Aktueller Registry-Audit am 20.09. nach Wiederholung mit Netzwerkzugriff: **57 Befunde = 43 high + 14 moderate, 0 critical** (unverändert). Audit bleibt FAIL/Release-Gate; ursprünglicher Abruf scheiterte mit fetch failed. Staged-Secret-Precheck ohne Treffer. Coach-Providercheck weiterhin mangels Providerkonfiguration blockiert; Expo public/introspect aus vorigem unverändertem Native-Konfigurationsstand PASS.

Abschluss: Web-Build PASS (4.74 MB), erneuter Bundle-Secret-Scan ohne Treffer; abschließender Typecheck und Lint der geänderten Dateien PASS. Der eigene PostgreSQL-Testserver läuft beim Checkpoint nicht mehr (pg_ctl status und kein Listener auf 55432 bestätigt); Daten/Logs bleiben erhalten.

Keine Datenformatänderung oder neue Dependency. Revert braucht keine lokale Konvertierung, würde jedoch behobene Fehler wieder einführen. Web-Preview besitzt keine gleichwertige dauerhafte SQLite-Atomizität. **Nicht gelöst:** mehrstufige Cloud-Aggregate können teilweise geschrieben werden, sechs Requests sind kein konsistenter DB-Snapshot, Zeitstempel-Merge ist keine revisionsbasierte Konfliktlösung; serverseitige Idempotenz, Tombstones und Multi-Device bleiben offen. Nächster Block: atomarer serverseitiger Sync-Vertrag mit realen Backendtests, danach Account-Lifecycle.

### Folgen einer späteren Main-Übernahme für Betatester

Ein Git-Merge ist noch kein geprüfter nativer Rollout. Automatische externe Deploymentverknüpfungen sind nicht verifiziert; Build/OTA-/Backend-Auslieferung bewusst kontrollieren. Es wurde hier weder main geändert noch eine Produktionsmigration oder Veröffentlichung ausgeführt.

- SecureStore schützt Sessions nativ und migriert erst nach verifiziertem Write; große Sessionwerte/OS-Fehler können Login oder Migration blockieren. Geräte-/Upgrade-/Backup-/Rollback-Abnahme fehlt, Zero-Logout ist nicht garantiert. Native Build-Kompatibilität vor OTA prüfen; alte MMKV-only-Version ist kein sicherer Zero-Logout-Rollback.
- Sync verweigert jetzt fehlerhafte/unvollständige Cloud-Antworten, statt Teilzustände als Erfolg anzunehmen. Betatester können dadurch häufiger ehrliche Sync-Fehler/offene Queue sehen; lokal vorhandene Daten werden in den getesteten Fehlerfällen erhalten. Bestehende Cloud-Konfliktrisiken sind noch nicht vollständig behoben.
- Öffentlicher Coach benötigt gültige Anmeldung; bisherige anonyme Prototypnutzung endet. Reale Provider-/Auth-/Hosting-Abnahme bleibt offen.
- RLS-Migration ist vorbereitet und lokal getestet, nicht remote angewendet. Bei inkonsistenten vorhandenen Referenzen verweigert sie die Migration; keine automatische Löschung/Reparatur.
- Keine neuen Features, Preise, Bundle-ID oder Billing-Aktivierung. CI stoppt bei verbleibenden hohen Dependency-Befunden; grüne Funktionstests sind keine Releasefreigabe.

### Gesicherte Blöcke seit Takeover

1. 6c01522 — native Session-Migration, Supabase-/Auth-Integration und Roadmap-Audit.
2. 27fccac — dauerhafte Security-Governance, Secret-Scans, gehärtete CI.
3. 26e29d1 — gezielte nanoid/undici/tar-Patches mit Angriffsregressionen.
4. 3585062 — öffentlicher Coach-Auth-Bypass geschlossen.
5. 8b0a6e1 — restrictive RLS-/Referenzmigration und echter PostgreSQL-Harness.
6. Folgender Commit — S4 Sync-Fehlergrenzen und dieser Checkpoint; genaue ID aus Git, um Selbstreferenz zu vermeiden.

Remote-Abgleich am 20.09.: origin/main unverändert **64711388daf754453afb79928b2679a44c028fde**. Review-Branch bleibt astra/p0-release-core; kein Rebase/Reset/Clean/Force-Push. Ignorierte Toolcaches/Testlogs bleiben als reproduzierbare lokale Nachweise erhalten. SAST/SBOM/Lizenz-Gesamtabnahme, Remote-Schutz, physische Geräte und verbleibende P0-Gates sind weiterhin offen; keine Risikoakzeptanz vorgenommen.

## Neuester Daten-Security-Block — S3 RLS lokal verifiziert

Vorheriger S6-Commit **3585062** gepusht. S3 Risiko **CRITICAL**, Status **PARTIAL** bis Remote-/Supabase-API-Abnahme. PostgreSQL 17.11 portabel unter output/ gestartet, nur Loopback, SCRAM/Zufallspasswort; keine Systeminstallation oder Produktionsverbindung. Herkunft und Grenzen dokumentiert in RLS_LOCAL_TEST_HARNESS.md.

Der echte DB-Baseline-Test reproduziert einen fremden exercise_id-Verweis aus eigenem Template. Additive Migration `202609190001_rls_reference_ownership.sql` ergänzt restrictive Ownership-/Referenzprüfungen, sodass weitere permissive Policies sie nicht per OR umgehen. TRUNCATE/REFERENCES/TRIGGER-/Schema-CREATE-Clientprivilegien entzogen. Schreibsperren vor Bestandsprüfung, begrenzte Lock-/Statementzeit; ungültige Altdaten führen zum atomaren Abbruch, nicht zur automatischen Reparatur/Löschung.

**304 PostgreSQL-Assertions PASS**, wiederholt mit absichtlich großzügigen Policies; vollständiger Haupt-Fixture-/Helper-/Policy-Rollback zusätzlich bestätigt. Zweite isolierte Negativdatenbank: Migration verweigert inkonsistente Bestandsdaten und erhält sie unverändert. Runner in CI mit gepinntem offiziellem PG-Image eingebaut; GitHub-Ausführung separat offen. SQL-Tests setzen Claims selbst: keine Behauptung einer GoTrue/JWT/PostgREST-Abnahme. PostgreSQL-Engine ist echt, Auth-Transportschicht wird nicht simuliert als Beweis verwendet.

Abschlussmessung: erneuter Runner nach Einbau der Schreibsperren PASS; `pnpm verify` PASS mit **603 Hosttests**, Typecheck/Lint PASS; CI-YAML und Image-Digest geprüft. 14 neue restrictive Policies auf elf Tabellen, lokale Haupt-Testdatenbank danach null öffentliche Profile und null Auth-Fixtures. Keine App-/Lockfileänderung im S3-Block; vorheriger Build bleibt unverändert.

## Neuester Security-Block — S6 öffentlicher Auth-Bypass

Nach gepushtem S1-Patch **26e29d1** die unabhängig behebbare CRITICAL-Lücke im Coach geschlossen: ALLOW_PROTOTYPE_COACH wird ignoriert, keine IP-basierte anonyme Identität; fehlender Bearer 401 vor Providerkontakt, ungültiger Bearer durch Supabase verifiziert/abgelehnt. Local-Development-Identität ist bei NODE_ENV=production oder VERCEL gesperrt. Der bereits auf Loopback begrenzte lokale Server bleibt nutzbar. Absichtliche Verhaltensänderung: öffentliche anonyme Prototyprequests funktionieren nicht mehr.

Drei neue/korrigierte Negativszenarien gegen bisherigen Code reproduziert (ohne Token in mehreren Umgebungen/gefälschte Header+Body, ungültiger Bearer trotz Flag, lokale Identität in Production/Hosting); jetzt 38 API-/Safety-Tests PASS. Kein Provider-/Supabase-Live-Test, kein Deployment. Weiterhin CRITICAL offene S6-Gates: Server-Pro, verteilte Quoten und Budget/Kill-Switch, DE/EN Safety, reale Hosting-/Auth-Abnahme. RLS bleibt nächster Daten-P0; lokale DB-Werkzeuge fehlen hier.

Finales `pnpm verify` PASS: **603 Tests = 77 Domain + 484 Mobile + 38 API + 4 Security**, Typecheck/Lint PASS. Vorheriger Gesamtlauf: bestehender Fuzzy-Such-Benchmark 57 ms statt <50 ms; isoliert 22 ms und 5/5 PASS, anschließender unveränderter Gesamtlauf vollständig grün. Keine Testgrenze gelockert. Web-Build/Expo-Config unverändert seit grünem S1-Abschluss. Keine neue Dependency in diesem S6-Block.

## Neuester Abschluss — S1 Dependency-Patches

Governance-Commit `27fccac` ist gepusht. Anschließend drei gezielte Overrides: nanoid 3.3.18, undici 6.28.0, tar 7.5.21. Risiko HIGH, keine Datenmigration oder neue Hauptversion. Lockfile geprüft: nur diese drei Auflösungen/Integritäten/Referenzen geändert. Frozen-Reinstall PASS.

Vier Angriffsregressionen schlugen vor dem Patch fehl und bestehen danach; in reguläre Test-Suite integriert. **pnpm verify PASS: 602 Tests (77 Domain + 484 Mobile + 37 API + 4 Dependency-Security), Typecheck/Lint PASS. Web-Build PASS (4.74 MB), Expo public/introspect PASS, neuer Bundle-Secret-Scan ohne Treffer.** Keine Provider-/Device-/Production-Abnahme daraus ableiten.

Neuer Registry-Audit: **57 Befunde = 43 high + 14 moderate**, vorher 67. Produktionsdependencies: **52 = 41 high + 11 moderate**, vorher 62. Damit zehn Advisory-/Versionsbefunde beseitigt, keine Risikoakzeptanz für die übrigen. CI-Audit bleibt absichtlich blockierend. Quellen, Exposition, Lizenzmetadaten und Regressionen: SECURITY.md. Alle älteren Zahlen unten sind die bezeichneten Baselines.

## Repository / Desktop

- Workspace: `C:\Users\skwar\Desktop\TrainingsAppGPT` (ausdrücklicher aktueller Nutzerauftrag; D:-Verweise sind historisch).
- Remote: `https://github.com/knrds/fitness-tracker.git`.
- Eingang: sauberer `main`, `64711388daf754453afb79928b2679a44c028fde`.
- `git fetch --all --tags --prune` erfolgreich; HEAD/origin-main-Differenz 0/0. Kein Pull nötig, keine fremden Änderungen, kein Reset/Clean/Force-Push.
- Neue Review-Branch: `astra/p0-release-core`, von frisch gefetchtem `origin/main`. Kein Main-Merge und kein Production-Deployment.
- Neuester vorhandener Tag: `v0.1.0-beta.6` (`8f5c4ab`); vier spätere UI-/Regression-Commits bis `6471138` berücksichtigt.
- Node: `24.14.0` (Repo >=24; EAS pinnt 24.13.0). pnpm `11.5.0` per Corepack lokal bereitgestellt. Initiales Frozen-Install ohne Lockfileänderung; anschließend genau drei dokumentierte Security-Auflösungen und erneutes Frozen-Install erfolgreich.
- Für lokale Folgekommandos in PowerShell: `$env:COREPACK_HOME = "$PWD/output/corepack"; $env:PATH = "$PWD/output/toolchain;$env:PATH"`. Toolcache/Logs liegen ignoriert in `output/`.

## Frische Baseline vor Implementierung

| Gate | Tatsächliches Ergebnis |
|---|---|
| Typecheck | PASS, alle drei Workspace-Pakete |
| Lint | PASS, alle drei Workspace-Pakete |
| Domain | 77/77 Tests |
| Mobile | Erstlauf 457/458; PersistenceGate-Test überschritt 5 s unter paralleler Build-Last; isolierter Wiederholungslauf 4/4 dieser Suite bestanden |
| API | 37/37, separat ausgeführt, da verify nach Mobile-Timeout abbrach |
| pnpm verify | Erstlauf FAIL wegen des genannten Timeouts; nicht als ursprüngliches PASS umgedeutet |
| pnpm coach:check | BLOCKED: OPENROUTER_API_KEY und OPENROUTER_MODEL fehlen auf diesem Desktop; kein Provider-Nachweis |
| pnpm build | PASS: Expo-Webexport, 4.73 MB JS; kein nativer Binary-Nachweis |
| pnpm audit --json | Exit 1: 67 Befunde, 47 high / 18 moderate / 2 low / 0 critical; Exposition nicht pauschal freigegeben |
| Expo public / introspect | PASS, beide Konfigurationen aus apps/mobile; CLI direkt über installiertes Node-Paket (pnpm exec fand hier Windows-Shims nicht) |

Baseline-Logs lokal: `output/baseline-verify.log`, `baseline-build.log`, `baseline-audit.json`, `baseline-expo-*.log`. Vor neuen Tests umfasste der Code 572 Tests (77 + 458 + 37); die alten Gemini-Berichte mit 57 Domain-Tests waren nicht mehr aktuell.

## Astra P0-A — Secure Storage / Session Security

Status: PARTIAL (Code integriert; native Release-Gates offen). Risiko: HIGH.

Implementiert:
- Native Supabase-Sessionstorage aktiviert, bestehende SecureStore-Dependency wiederverwendet; keine RAM-/Klartext-Fallbacks bei nativen Fehlern.
- Byteerhaltende Dual-Read-Migration aus MMKV/AsyncStorage mit Session-Strukturprüfung, Write-Readback und versioniertem nicht sensiblen Marker.
- Serialisierung von Migration, Refresh und Logout plus Supabase processLock.
- Logout entfernt beide Altquellen und SecureStore-Payload; Marker verhindert Resurrection bei Teilfehlern; Cleanupfehler werden gemeldet.
- Native Fehlermeldungen enthalten keine Rohdaten. Authfehler räumen Ladezustände auf und erscheinen DE/EN.
- SecureStore-Config-Plugin mit Android-Backup-Ausschlüssen und ohne Biometriepflicht.
- Expliziter Rollbackvertrag: Reader behalten; kein einfaches Revert auf MMKV-only nach Migration.

Verifiziert:
- Fünf gezielte neue Regressionen schlugen am alten Scaffold fehl (`output/secure-storage-red.log`).
- Zieltests einschließlich tatsächlichem installiertem Supabase-JS-SDK, MMKV/AsyncStorage/Expo Go, Logout-Teilfehlern, Readback, Korruption, Concurrent Migration/Refresh/Logout und großer Payload-Ablehnung/Retry.
- Expo public/introspect mit neuem Plugin PASS; Android `fullBackupContent` und `dataExtractionRules` referenzieren SecureStore-Ausschlussregeln.
- Finales Gesamtgate: siehe Abschlussmessung unten.

Offen: reale iPhone-/Android-Upgrades mit gleicher Bundle-ID, Sperre/Reboot/Prozess-Kill/Offline/Low-Space, große reale Sessionwerte, Keychain-Neuinstallation/Backup und kompatibler Rollback. Direkte SecureStore-Werte können vom OS wegen Größe abgelehnt werden; Originalbytes bleiben erhalten, Anmeldung kann dann blockieren. Vor Auslieferung nachweisen oder separat geprüfte Größenstrategie ergänzen. Kein Device-Test durch Mocks ersetzt.

## Current Roadmap

| Phase | Status |
|---|---|
| P00 Baseline / Freeze | PARTIAL |
| P01 Native Foundation | PARTIAL |
| P02 Security / Data Integrity | ASTRA_REQUIRED |
| P03 AI Backend | ASTRA_REQUIRED |
| P04 Privacy / Legal / Licensing | USER_ACTION_REQUIRED |
| P05 Subscriptions | PREPARED |
| P06 Onboarding / Paywall | PARTIAL |
| P07 Push / Haptics / Audio | PARTIAL |
| P08 Analytics / Monitoring / Support | PARTIAL |
| P09 QA / Accessibility / Performance | PARTIAL |
| P10 Store Submission | PREPARED |
| P11 Launch | BLOCKED |

19-Bereiche-Matrix mit Code-/Test-/Risikoabgleich: [P0_READINESS_MATRIX.md](P0_READINESS_MATRIX.md).

## Gemini Work Verified / Modified

- VERIFY/REUSE: SQLite-/Scope-/Outbox-/Recoverytests, Export-/Entitlement-/Diagnostics-Scaffolds, Exercise-/Legacy-/UI-Regressionen und native Konfigurationsvorarbeit.
- MODIFY/ACTIVATE: SecureStore-Adapter samt Tests und echte native Supabase-Anbindung. Bisherige Tests erlaubten unsicheren RAM-Fallback, fehlende Readback-Verifikation und verschluckte Fehler.
- VERIFIED technisch: Free-DB-JSON identisch zur Beta-5-Quelldatei; Git-Blob `494916a8c0b48a50ff726e18b82084fa54ba087b`. Foto-Urheberschaft bleibt offen; keine rechtliche Abschlussbehauptung.
- UI im Code: History-Tagesauswahl, direkte Template-/Programmanlage und optionale Profilangaben vorhanden; DE/EN weiterhin lückenhaft (insbesondere Safety und Recoverytexte). Storetests sind keine vollständigen UI-End-to-End-Tests.

## Critical Remaining — nächste Reihenfolge

1. **RLS / CRITICAL:** Lokaler SQL-Vertrag inzwischen mit 304 Assertions auf echter PostgreSQL-Engine verifiziert; vorhandener Gemini-Harness korrigiert und FK-Lücken geschlossen. Supabase-/PostgREST-/Deploymentzustand und reale Bestandsdaten weiterhin unbekannt. Kein Remote-Apply.
2. **Sync / CRITICAL:** Child-Delete-/Pull-Fehler nicht durchgehend geprüft; Aggregate werden ohne Transaktion gelöscht/neu geschrieben. Cloud-RPCs, fachliches Konflikt-/Revisionsmodell und Tombstones begründet implementieren, dann echte Multi-Device-Abnahme. Lokale Outbox schützt nicht vor unvollständigen Cloud-Aggregaten.
3. **Account Deletion / CRITICAL:** Echter parameterloser, authentifizierter Serververtrag fehlt. Client prüft keinen expliziten Erfolg und keine Ursprungsgeneration vor lokalem Cleanup; verschluckt Cleanupfehler. Erst Backend+Scope+Idempotenz+Fehlertests, dann Aktivierung.
4. **AI / CRITICAL:** Öffentlicher Prototyp-Bypass inzwischen geschlossen; weiterhin globale Pro-Freigabe im Client, kein Serverentitlement, verteiltes Budget/Limits oder bestätigtes HTTPS-Deployment. Safety antwortet nur DE. Keine Produktivfreigabe.
5. **Privacy/Billing:** Vollständigen Cloud-Export, Consent, Rechtstexte und native Billing-/Serverentitlements vervollständigen. Dependency-Exposition gezielt prüfen.

## USER_ACTION_REQUIRED

- EAS-Projekt und Apple-/Google-Zugänge; finale Bundle-ID bewusst bestätigen (bestehende IDs unverändert).
- Provider-/Hosting-/Supabase-Konfiguration und Credential-Verantwortung; Secrets nicht im Chat/Repo ablegen.
- RevenueCat/Storeprodukte, Preise, finanzielle Verträge.
- Rechtstexte/Business-/Supportdaten sowie Medienrechte bzw. Ersatzstrategie.
- Supabase-Testprojekt oder lokale vollständige Supabase-Umgebung für Auth-/PostgREST-Abnahme; reine SQL-RLS-Tests laufen inzwischen ohne Docker. Produktionsfreigabe bleibt getrennt.

## PHYSICAL_DEVICE_REQUIRED

iPhone und Android: Sessionmigration/Logout/Accountwechsel, Sperre/Reboot/Kill/Backup, große Sessions, Offline/Low-Space, Haptik, Audio, Keyboard, Gesten, Permissions, Screenreader, Kauf/Restore. Kein signierter Build wurde in dieser Session gestartet.

## Abschlussmessung / Commit

`pnpm verify` PASS: Typecheck/Lint aller Workspaces, 77 Domain-Tests (10 Suites), 484 Mobile-Tests (76 Suites), 37 API-Tests = **598 Tests**. Gegenüber dem Eingang 26 zusätzliche Tests. Ein zwischenzeitlicher Gesamtlauf zeigte eine echte Integrationslücke im unkonfigurierten Gastbetrieb: Placeholder-Auth startete Storage/Refresh. Persistenz und Auto-Refresh sind jetzt nur bei konfiguriertem Supabase aktiv; beide Konfigurationszustände werden getestet. Keine unsichere Test-Ausnahme eingebaut.

Checkpoint-Build PASS (4.74 MB Web-JS), Expo public/introspect PASS. Erneuter `pnpm coach:check` weiterhin BLOCKED wegen fehlender Providerkonfiguration. `git fetch origin` vor Commit erfolgreich; origin/main unverändert `6471138`. Drei neu vom Nutzer bereitgestellte Security-Dateien im Release-Pack bleiben beim Checkpoint unangetastet und werden im nachfolgenden Governance-Block übernommen. Checkpoint-Hash wird dort verlinkt.

## Gemini-Klassifizierung am Pre-Security Checkpoint

| Arbeit | Status | Einordnung |
|---|---|---|
| Secure Storage Scaffold | SUPERSEDED | Unsichere Annahmen durch geprüfte native Integration ersetzt; Gerätefreigabe PARTIAL |
| RLS Audit / Negative Tests | BROKEN | Schemaabweichungen und fehlende Assertions; echte Isolation ASTRA_REQUIRED |
| Sync Failure Harness | VERIFIED | Host-Failure-/FIFO-Tests grün; Cloud-Invarianten ASTRA_REQUIRED |
| Account Deletion Client | PARTIAL | Fehlerguards vorhanden; Vertrag, Scope und Cleanup nicht releasefähig |
| Data Export | PARTIAL | Lokaler Export, kein vollständiger Cloud-Nachweis |
| AI Safety / bilingual | PARTIAL | Deterministische Regeln getestet, ausschließlich DE |
| AI Request Validation | VERIFIED | Bestehende API-Regressionen grün; Production-Gesamtsystem offen |
| Entitlement Abstraction | PREPARED | Kein natives Billing, globaler Beta-Bypass |
| Diagnostics / Logging | PARTIAL | Lokaler Buffer/Redaktion getestet; kein allgemeiner Datenschutzbeweis |
| Exercise Dataset Migration | VERIFIED | Blob identisch zu Beta 5; Medienrechte USER_ACTION_REQUIRED |
| Regression Tests | VERIFIED | Aktueller finaler Lauf 598 Tests |
| Store Readiness | PREPARED | Entwürfe/Checklisten, keine Einreichung |
| Device QA | PREPARED | Checklisten, keine reale Geräteabnahme |
| Profile / History / Plans | VERIFIED | Code und Store-Regressionen vorhanden; visuelle/native Abnahme offen |

Checkpoint **6c01522** ist auf `origin/astra/p0-release-core` gepusht. CHECKPOINT_COMPLETE. Keine Main-Integration oder Produktionsänderung.

## Security Takeover — S0 / S1 (19.09.2026)

Status **PARTIAL**, Risiko **HIGH**. Nutzer-Guardrails, Prompt und zehnseitige Roadmap übernommen. AGENTS.md bindet alle Agenten dauerhaft an die Regeln; README/SECURITY.md verlinken sie. S0–S12-Istmatrix in P0_READINESS_MATRIX.md; codebezogenes Threat Model und wiederkehrender Betriebsrhythmus in SECURITY.md. Feature Expansion bleibt eingefroren.

### Verifiziert und implementiert

- Gitleaks v8.30.1 vom offiziellen Release, Windows-SHA256 `d29144deff3a68aa93ced33dddf84b7fdc26070add4aa0f4513094c8332afc4e` gegen Manifest geprüft.
- Alle 196 erreichbaren Commits (7.93 MB): fünf ausschließlich synthetische Redaktions-Testfixtures. Zwei bekannte JWT-Beispiele, ein sequenzieller Fake-Key, zwei unvollständige JWT-Platzhalter. Ausschließlich deren exakte historische Fingerprints ausgenommen; Wiederholung ohne weitere Treffer. Keine History-Umschreibung.
- Aktueller getrackter/unignorierter Dateistand plus Expo-public/introspect-Ausgaben (4.19 MB): dieselben fünf Fixtures, keine zusätzlichen Treffer. Exportiertes Web-Bundle (4.75 MB): null Treffer. Frisch generierter künstlicher Canary wird mit Exit 1 zurückgewiesen. Keine Credentialwerte in diesem Bericht.
- Kein Vollständigkeitsbeweis für unbekannte Secretformate, unerreichbare gelöschte Refs, Remote-Secrets oder native signierte Artefakte. Kein echter Credentialfund, deshalb keine grundlose Rotation. Remote-Secrets/IAM bleiben USER_ACTION_REQUIRED.
- CI: contents:read, keine persistierten Checkout-Credentials, unveränderliche SHA-Pins für Checkout/Node/pnpm, Job-Timeouts, Gitleaks-History-/Bundle-Gates und blockierendes `pnpm audit --audit-level=high`. Scannerdownload versions-/SHA256-gebunden. Kein continue-on-error und keine globale Regel-/Testordnerausnahme.
- Typecheck/Lint PASS; Shell-Syntax und Diff-Whitespace-Prüfung PASS. Unveränderte App: vorangehende 598 Tests und Web-Build PASS. GitHub-Runner-Ausführung dieser neuen CI nicht lokal behauptet; wegen der bestehenden High-Befunde wird das Audit-Gate derzeit scheitern.

### Supply-Chain-Exposition, keine Risikoakzeptanz

67 Advisory-/Versionsbefunde: 47 high, 18 moderate, 2 low in 17 Paketgruppen. Separater erneuter Registry-Audit mit `--prod`: **62 Befunde (45 high, 15 moderate, 2 low)**. Der erste Netzwerkversuch schlug fehl; Wiederholung mit Netzwerkzugriff lieferte diese Werte. Expo führt auch Buildwerkzeuge über Produktionsdependencies; `--prod` beweist weder Runtime-Ausnutzbarkeit noch deren Ausschluss. Kürzeste aufgelöste Pfade und nächste Aktionen:

| Gruppe | Anzahl | Beobachteter Pfad / nächste Aktion |
|---|---:|---|
| @xmldom/xmldom | 23 | Expo CLI → plist/config-plugins; XML-Buildinputs und Patchkompatibilität |
| brace-expansion | 9 | eslint/minimatch und Expo CLI; kompatible Branch-Patches |
| js-yaml | 8 | eslint und Jest/Expo; YAML-Tooling-Patches |
| undici | 7 | Expo CLI; HTTP-/WebSocket-Tooling, kein Runtime-Attest |
| postcss | 4 | Expo Metro und Vitest/Vite; CSS-Verarbeitung |
| vite / vitest / @vitest/mocker | 4 | Domain-Testwerkzeuge; kompatible Patches, keine öffentlichen Testserver |
| image-size | 2 | Metro; bösartige Asset-Metadaten beim Build |
| nanoid / decode-uri-component | 3 | Expo Router/query-string; mögliche Clientpfade untersuchen |
| browserslist / baseline-browser-mapping | 3 | Babel/Metro Buildkette; Patch-/Lizenzprüfung |
| tar / shell-quote / form-data / uuid | 4 | Expo CLI, RN DevTools, jsdom, xcode; früherer tar-Patch beseitigt nicht alle aktuellen Advisories |

Keine ungetesteten Massenupdates oder stillen Lockfileänderungen. Offene S1-Gates: kompatible Fixes/Reachability, SAST, Lizenz-/SBOM-Nachweis, Branch Protection/required checks, Signing-/EAS-/Hosting-IAM. Projektowner muss Remote-Kontrollen bestätigen. Native/Cloud-/RLS- und Legal-Gates unverändert.

---

## Recovery & Onboarding State Machine — WP-06 (Tasks 06.01–06.03) — 22.09.2026

Status: **COMPLETE & VERIFIED**. Commit `97a14f2` auf `origin/astra/p0-release-core` gepusht.
- **Laptop-Abbruch-Wiederherstellung:** Arbeitsstand analysiert, Syntax/Typ-Inkonsistenzen in `onboardingLogic.test.ts` (`general_health` Typo) und `onboardingStore.ts` (Storage-Signatur) behoben.
- **Implementiert:**
  - Resiliente 7-Schritte-State-Machine (`experience`, `primaryGoals`, `trainingFrequency`, `equipment`, `splitPreference`, `physicalProfile`, `valueReveal`).
  - Schema Versionierung (`ONBOARDING_SCHEMA_VERSION = 1`) mit robuster Migration / Sanierung ungültiger Stände.
  - Value Reveal & deterministischer Split-Scoring-Algorithmus (14/14 Tests PASS).
  - Web Preview Build (4.77 MB) und CI Verification PASS (774 Tests).

---

## 3-Tier Commercial Monetization Foundation — WP-05 / S7 — 22.09.2026

Status: **PREPARED & VERIFIED**. Risiko: **MEDIUM**.
- **Architektur:** 3-Stufen-Hierarchie `COACH` > `PRO` > `FREE`. COACH erbt alle PRO-Rechte, PRO erbt alle FREE-Rechte.
- **Domain Foundation (`packages/domain`):**
  - Schemas für `Tier` (`free`, `pro`, `coach`), `Capabilities` Registry mit 11 deterministischen Methoden (`canCreateTemplate()`, `canUseRPE()`, `canUseCoachPlan()`, etc.).
  - Remote Config Schema mit Validierung (`RemoteSubscriptionConfig`, Defaults: Free Templates = 2, Pro Fast Requests = 5/Woche, Coach Credits = 300/Monat, Quota-Warnschwellen 80% / 95%).
  - Strukturierte AI Drafts (`ProgramDraft`, `WorkoutTemplateDraft`, `ExerciseDraft`, `SetSchemeDraft`, `RepRange`, `AiActionDiff`).
  - AI Safety: `canUseAIWrite()` erfordert zwingend menschliche Bestätigung (`confirmation_required`) via Preview/Diff vor Persistierung.
  - 14 Domain-Tests PASS (`packages/domain/src/__tests__/entitlements.test.ts`).
- **Client Entitlement & Paywall Layer (`apps/mobile`):**
  - `entitlementService.ts`: 3-Tier-Unterstützung (`tier`, `isCoach`, `isPro`, `EVARO_COACH_ENTITLEMENT_ID`), Capability-Query-Methoden (15/15 Tests PASS).
  - `monetizationAnalytics.ts`: 22 datenschutzkonforme Events (Paywalls, Subscriptions, AI Usage), strikte Payload-Sanitisierung: keine Prompts, Antworten, Gewichte, Reps oder Körperdaten in Telemetrie (3/3 Tests PASS).
  - `paywallStore.ts`: Dual-Context-Paywall (`pro` vs `coach`), Source-Tracking, offizielle Launch-Pricing-Defaults (`PRO_PAYWALL_PACKAGES`: 29,99 € / 4,99 €; `COACH_PAYWALL_PACKAGES`: 69,99 € / 11,99 € mit 14-Tage-Trial).
  - `LockedFeatureModal.tsx`: Nicht-aggressive Erklärung gesperrter Funktionen mit Option zum Pro-Ansehen oder "Nicht jetzt" (3/3 Tests PASS).
  - `paywallCompliance.test.ts`: 8/8 Tests PASS.
- **Gesamtergebnis:** 798 Tests PASS, Build Preview (4.78 MB) PASS, Security Gate PASS.
- **Verbleibende externe Gates (ASTRA_REQUIRED):**
  - Native StoreKit 2 / Google Play Billing SDK Setup (`react-native-purchases`).
  - Echte App Store Connect / Google Play Console In-App-Abonnement-IDs & Pricing Source of Truth.
  - Serverseitiges Usage-Ledger für Quota-Reservierung / Verbuchung (`api/coach-chat.js`).
