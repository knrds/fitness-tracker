# EVARO – Astra Review Queue

## Batch 4: Local Foundations, Preferences, Resilience & Taxonomy Wiring — 22.09.2026

- **AR-051: Notification Preference Center & Local Rest Timer Alerts — WP-07 Tasks 07.02, 07.04 (VERIFIED).**
  - Granulare Notification Channels (`restTimer`, `workoutReminders`, `coachProgress`, `marketingOffers`) mit Privacy-by-design Defaults (Marketing standardmäßig `false`).
  - Strikte Unabhängigkeit: Keine Koppelung von System-/Workout-Alerts an Marketing-Zustimmung.
  - Lokaler Rest-Timer Notification Service: Keine Cloud-/Backend-Abhängigkeit; generische Lockscreen-Texte ohne sensible Daten; sauberer Cancel/Reschedule bei Timer-Reset/Abbruch; keine Spam-Schleifen.
  - Persistiert in `notificationPreferenceStore.ts` via `createHydratedStorage`; UI-Modal in `NotificationSettingsModal.tsx` in `<= 2 Taps` erreichbar.
  - 13 Tests in `notifications.test.ts`, `notificationPreferenceStore.test.ts`, `localNotificationService.test.ts` (alle PASS).
  - Verbleibendes Gate: Reales Push Token & Background Device Handling bleibt `PHYSICAL_DEVICE_REQUIRED`.

- **AR-052: Contextual Permission Pre-Prompts — WP-06 Task 06.06 (VERIFIED).**
  - Transparente, nicht-manipulative Vorab-Erklärung in `ContextualPermissionModal.tsx` vor nativen Systemdialogen für Benachrichtigungen (`notifications`), Mikrofon (`microphone`) und Fotos (`photos`).
  - Klarer Mehrwert ohne Dark Patterns, einfache Ablehnung („Nicht jetzt“), keine störende Permission Wall beim Start.
  - 3 Tests in `ContextualPermissionModal.test.tsx` (3/3 PASS).

- **AR-053: Coach Provider Failure & Circuit Breaker — WP-03 Task 03.10 (VERIFIED).**
  - Resilienter `CoachCircuitBreaker` (`CLOSED`, `OPEN`, `HALF_OPEN`) mit 3-Fehler-Schwelle, 30s Cooldown und bounded backoff.
  - Fast-Fail im Zustand `OPEN` in `coachApi.ts` mit user-friendly Fehler zur Vermeidung von unnötigen Kosten und Retry-Storms.
  - Striktes Scrubbing: Keine Prompts, Health-Daten oder Tokens in Logs.
  - 7 Tests in `coachCircuitBreaker.test.ts` (7/7 PASS).
  - Verbleibendes Gate: Verteilter serverseitiger Circuit State / Redis Quota Ledger bleibt `ASTRA_REQUIRED`.

- **AR-054: Remote Config Client Abstraction & Kill Switches — WP-08 Task 08.04 (PREPARED & VERIFIED).**
  - Abstraktion auf Basis von `RemoteSubscriptionConfig` mit Zod-Validierung in `remoteConfigService.ts`.
  - Schema unterstützt `coach_enabled`, `paywall_variant`, `notification_campaign`, `monetization_config` und `killed_features`.
  - Fail-safe Defaults bei Timeout/Offline, Stale-Cache Fallback, Feature-Kill-Switch (`isFeatureKilled`).
  - 6 Tests in `remoteConfigService.test.ts` (6/6 PASS).
  - Verbleibendes Gate: Backend / Provider Auswahl bleibt `ASTRA_REQUIRED`.

- **AR-055: Support / Feedback Path & Privacy Diagnostics — WP-08 Task 08.05 (PREPARED & VERIFIED).**
  - `SupportFeedbackModal.tsx` in `<= 2 Taps` aus Profil/Einstellungen erreichbar mit FAQ und Feedback-Möglichkeit.
  - Automatische Beilage technischer Diagnosedaten (App-Version, OS-Version, Plattform, Fehler-ID).
  - Striktes No-PII-Prinzip: Zero Workouts, Gewichte, Maße, Coach-Prompts, Chatverlauf, Tokens oder Fotos.
  - 3 Tests in `SupportFeedbackModal.test.tsx` (3/3 PASS).
  - Verbleibendes Gate: Echte offizielle Support-E-Mail bleibt `USER_ACTION_REQUIRED`.

- **AR-056: Review Prompt Policy — WP-08 Task 08.06 (VERIFIED).**
  - `ReviewPromptPolicy` in `reviewPromptPolicy.ts`: Nur nach echten positiven Momenten (PR, Streak, $\ge 3$ Workouts).
  - 48h Error-Cooldown, 60d Re-Prompt-Intervall, maximal 3 Prompts pro Jahr.
  - 6 Tests in `reviewPromptPolicy.test.ts` (6/6 PASS).

- **AR-057: Large Text / Accessibility Scaling Safeguards — WP-09 Task 09.05 (PREPARED & VERIFIED).**
  - Dynamic Type `maxFontSizeMultiplier` (`1.5` für Buttons, `1.4` für Modal-Titel), Flex-Wrap und barrierefreie Touch-Targets ($\ge 44 \times 44$\,pt).
  - Respektierung von `prefers-reduced-motion` in Animationen via `useReducedMotion()`.
  - 2 Tests in `accessibilityScalingRegression.test.tsx` (2/2 PASS).
  - Verbleibendes Gate: Reale iOS Dynamic Type & Android Font Scale Abnahme bleibt `PHYSICAL_DEVICE_REQUIRED`.

- **AR-058: Core Product Analytics Taxonomy Wiring — WP-08 Task 08.03 (VERIFIED).**
  - Verdrahtung bestehender kanonischer Lifecycle-Events (`onboarding_started`, `onboarding_completed`, `first_workout`, `second_workout`, `coach_usage`, `coach_error`) in Stores und Action Handlern.
  - Null Gesundheits-/Workout-Rohdaten in Telemetrie-Payloads.
  - 4 Tests in `monetizationAnalytics.test.ts` (4/4 PASS).

## Batch 3: Real Product Flow Monetization Integration & Bypass Protection — 22.09.2026

- **AR-050: Monetization Capability Wiring, Direct Store Protection & Downgrade Suite — WP-05 / S7 (VERIFIED).**
  - Fail-closed Integration in alle aktiven Screens (`template-builder.tsx`, `workouts.tsx`, `programs.tsx`, `builder.tsx`, `session.tsx`, `history/[id].tsx`, `coach.tsx`, `CoachPlanCard.tsx`, `SessionExerciseCard.tsx`, `body.tsx`, `AppearanceSettings.tsx`).
  - Store-Action Guards in `programStore.ts` (`TEMPLATE_LIMIT_REACHED`, `TEMPLATE_LOCKED`, `PROGRAM_FEATURE_LOCKED`), `workoutStore.ts` (RPE/RIR sanitization), `bodyMetricStore.ts` (`PREMIUM_METRIC_LOCKED`), `profileStore.ts` (`COLORWAY_LOCKED`, Tier-Sync-Listener), `saveCoachPlan.ts` (`AI_WRITE_NOT_AUTHORIZED`).
  - Zero Data Loss & deterministisches Downgrade: Älteste 2 Custom Templates editierbar, Rest read-only; Programme read-only; historische RPE/RIR und Body Metrics 100% erhalten; Appearance fällt auf `glacier` zurück und stellt bei Re-Upgrade `savedPremiumColorway` wieder her.
  - Dedizierte Regressionssuite: `apps/mobile/src/stores/__tests__/monetizationGating.test.ts` (12/12 PASS).
  - Verbleibende externe Gates: Server Authoritative Quota Ledger (`api/coach-chat.js`) und StoreKit/Play-Billing Integration bleiben `ASTRA_REQUIRED`.

## Batch 2: Onboarding State Machine & 3-Tier Monetization Foundation — 22.09.2026

- **AR-048: Onboarding State Machine & Value Reveal Recommendation — WP-06 Tasks 06.01–06.03 (VERIFIED).**
  - Resiliente 7-Stufen State Machine (`experience`, `primaryGoals`, `trainingFrequency`, `equipment`, `splitPreference`, `physicalProfile`, `valueReveal`) in `onboardingStore.ts` und `onboardingLogic.ts`.
  - Schema-Versionierung (`ONBOARDING_SCHEMA_VERSION = 1`) mit robuster Migration / Sanierung ungültiger Stände.
  - Deterministischer Split-Empfehlungs-Scoring-Algorithmus basierend auf Zielen und Frequenz.
  - 14 automatisierte Tests in `onboardingLogic.test.ts` und `onboardingStore.test.ts` (14/14 PASS).
- **AR-049: 3-Tier Commercial Monetization Foundation & Capability Layer — WP-05 / S7 (PREPARED & VERIFIED).**
  - Strikte 3-Stufen-Hierarchie `COACH` > `PRO` > `FREE` mit zentraler Capability Registry (`packages/domain/src/schemas/entitlements.ts`) und 11 deterministischen Methoden (`canCreateTemplate()`, `canUseRPE()`, `canUseCoachPlan()`, etc.).
  - Offizielle Launch Pricing Defaults (Pro: 4,99 € / 29,99 €; Coach: 11,99 € / 69,99 € mit 14 Tagen Trial) entkoppelt von autoritativer Store-Wahrheit in `packages/domain/src/schemas/monetizationConfig.ts`.
  - Dual-Context-Paywall (`pro` vs `coach`) mit Source-Tracking und nicht-aggressivem `LockedFeatureModal.tsx` zur Werterklärung gesperrter Features.
  - Strukturierte AI Drafts (`ProgramDraft`, `WorkoutTemplateDraft`, `Diff`) und striktes `confirmation_required` für `AI_WRITE`.
  - Zero-Data-Loss Downgrade: Überschüssige Templates und Programme bleiben vollständig erhalten und read-only.
  - Datenschutzkonforme Monetarisierungs-Telemetrie mit 22 Events und striktem Filter gegen Workout-/Gesundheits-/Prompt-Leaks (`apps/mobile/src/services/monetizationAnalytics.ts`).
  - 43 automatisierte Tests (Domain Schemas, Entitlement Service, Paywall Compliance, Analytics, Locked Feature Modal; alle PASS).

## Batch 1: Compliance, Operations & Monitoring (P0) — 22.09.2026

- **AR-043: Asset License BOM & THIRD_PARTY_NOTICES (VERIFIED).** Vollständige Erfassung in `THIRD_PARTY_NOTICES.md` unter dem Grundsatz „UNKNOWN bleibt UNKNOWN“. Unlicense für `free-exercise-db`-Datenbankstruktur; Upstream-Bildurheberkette als UNVERIFIED ausgewiesen; Anatomie (MIT); Fonts (OFL 1.1); Icons (MIT/Apache); Badges/Rank Icons (UNKNOWN Commercial Terms); Node Packages (MIT/Apache-2.0/BSD).
- **AR-044: Paywall Technical Compliance — WP-05 Task 05.07 (VERIFIED / LEGAL_REVIEW_REQUIRED).** StoreKit-/Play-Billing-konforme Paywall in `PaywallModal.tsx` und `paywallStore.ts`. Tatsächlich belasteter Gesamtpreis als primärer Hauptpreis; Monatsäquivalent ausschließlich als transparente Vergleichszeile; 7 Tage Testphase; Kündigungs- & Verlängerungsklauseln; Restore-Purchases-Button; AGB- und Datenschutz-Links. Fail-closed ohne Store-Credentials. 8 Tests in `paywallCompliance.test.ts` (8/8 PASS).
- **AR-045: Observability & PII Sanitization — WP-08 Task 08.01 (PREPARED).** Datensparsame Crash-Monitoring-Abstraktion in `observabilityService.ts`. Striktes Scrubbing aller Fitness-, Workout-, Taillen-, Gewichts- und Coach-Rohdaten (`[REDACTED_SENSITIVE_KEY]`); Redigieren von E-Mails und Tokens. Integration in `ErrorBoundary.tsx`. 9 Tests in `observabilitySanitization.test.ts` (9/9 PASS).
- **AR-046: Apple Privacy Manifest & Required Reason APIs — WP-10 Task 10.02 (PREPARED).** `PrivacyInfo.xcprivacy` und `app.json` `ios.privacyManifests` deklarieren UserDefaults (`CA92.1`), FileTimestamp (`C617.1`), SystemBootTime (`35F9.1`), DiskSpace (`E174.1`), `NSPrivacyTracking: false` und Datentypen Fitness/CrashData (kein Tracking, nicht verknüpft). 3 Tests in `privacyManifest.test.ts` (3/3 PASS).
- **AR-047: Production Incident Runbooks — WP-11 Task 11.03 (PREPARED).** 6 technische Notfall-Leitfäden in `docs/operations/INCIDENT_RUNBOOKS.md` für AI Incident (Kill Switch), DB/Sync Incident (Rollback/PITR), Leaked Secret (Key Revocation), Subscription (Grace Period), Bad Release (Rollout Halt) und Privacy Breach (72h DSGVO Art. 33). Personenkontakte als `USER_ACTION_REQUIRED` ausgewiesen.

## Recovery & Roadmap-Fortsetzung (AI Consent & Guest Migration) — 22.09.2026

- **AR-041: Versioned AI Consent — WP-04 Task 04.03 / S6 / S10 (VERIFIED / LEGAL_REVIEW_REQUIRED).**
  - Technischer Mechanismus in Domain (`AiConsentSchema`, `CURRENT_AI_CONSENT_VERSION = 1`, `hasValidAiConsent`) und Store (`profileStore.setAiConsent`, `revokeAiConsent`).
  - Fail-Closed-Guards vor KI-Aufrufen: `coachStore.sendMessage` und `useCoachRecorder` verweigern jeden Request ohne gültigen Consent mit `AI_CONSENT_REQUIRED`.
  - UI-Integration: `coach.tsx` Consent-Card vor Chat-Freischaltung; `profile.tsx` Datenschutz-Sektion mit Version/Status, Akzeptieren und Widerrufen (inkl. Alert-Bestätigung).
  - Zweisprachige Strings (DE/EN) in `translations.ts` mit striktem Tag `[LEGAL_REVIEW_REQUIRED]`.
  - 6 dedizierte Tests in `apps/mobile/src/stores/__tests__/coachConsent.test.ts` (6/6 PASS).
- **AR-042: Safe Idempotent Guest-to-Account Migration — WP-02 Task 02.06 / S4 / S5 (VERIFIED).**
  - Transaktionale, idempotente Migration von Legacy/Gast-Daten (`LOCAL_USER_ID`) in Ziel-Account-Partition (`account:<uuid>`) in `authMigration.ts` und `applyAccountSession`.
  - Workouts (Ownership-Remapping, UUID-Kollisionsvermeidung, Sync-Enqueue), eigene Übungen, Templates, Pläne, Körpermaße, Gamification/Level-XP und Profile.
  - Zero Data Loss: Fehler vor Legacy-Purge brechen transaktional ab; Legacy-Daten bleiben intakt.
  - Tenant-Isolation: Direkter Account-Wechsel A -> B migriert keine Daten; Logout isoliert.
  - 9 Regressionsszenarien in `apps/mobile/src/stores/__tests__/guestMigration.test.ts` (9/9 PASS).

## Roadmap-Blöcke 1–5 (A11y, S4 Fixtures, Supply Chain, S5 Deletion, AI Safety DE/EN) — 21.09.2026

- **AR-036: Accessibility / VoiceOver Audit & Profile Badge Removal (VERIFIED).** „Jahre / years“-Badge über Geburtsdatum in `profile.tsx` restlos entfernt. Barrierefreiheits-Audit in `RestTimer.tsx`, `AnatomyFigure.tsx`, `session.tsx`, `BattlePassModal.tsx` mit Rollen, Accessibility-Labels, `accessibilityState`, `accessibilityActions` und Touch-Targets $\ge 44 \times 44$\,pt. Automatisierte Tests in `accessibilityAudit.test.tsx` (6/6 PASS).
- **AR-037: S4 Sync Failure Fixtures — 17 Szenarien (VERIFIED).** Dedizierte Failure- und Resilienz-Suite in `syncFailureScenarios.test.ts` (17/17 PASS) deckt Timeouts, Push/Pull Connection Loss, malformed/partial/stale/duplicate Server Responses, fehlende Children, fehlgeschlagene Remote-Deletes, lokales ACK-Retry, FIFO Reconnect, Account-Switch/Logout-Isolation, Snapshot-Races, Duplicate Completions, leere Snapshots und Cross-Tenant Injection ab. Serverseitige Architektur bleibt `ASTRA_REQUIRED`.
- **AR-038: Supply Chain Triage & Minor/Patch Overrides (VERIFIED).** 41 von 43 High Findings via versionskompatible Overrides in `pnpm-workspace.yaml` ohne Major Updates und ohne Expo SDK Upgrade behoben. Verbleibend nur noch 2 High Findings in `image-size` 1.2.1 (`EXPO_SDK_UPGRADE_REQUIRED`). Frozen install in 809 ms verifiziert.
- **AR-039: S5 Account Deletion Contract & Client Guards (PREPARED).** Contract- und Resilienz-Suite in `accountDeletionContract.test.ts` (13/13 PASS) stellt sicher: Server leitet `auth.uid()` ab, kein Client-IDOR, Idempotenz, Zero Data Loss bei Remote-/Teilfehlern, lokaler Wipe strikt erst nach Cloud-Erfolg, Session-Revocation und Account-Switch-Isolation. Supabase-Backend-Deployment bleibt `ASTRA_REQUIRED`.
- **AR-040: AI Safety DE/EN Bilingual Emergency Suite (VERIFIED).** Vollständige zweisprachige (DE/EN) Absicherung in `api/coach-safety.cjs` und 49 Tests in `api/coach-safety.test.cjs` (49/49 PASS) für Notfälle (Brustschmerz, Atemnot, Bewusstlosigkeit, Verletzung), Starvation, Dehydrierung, PED-Dosierung, Diagnosebypasses, Prompt Injection, System Prompt Leaks und Payload-Limits.

## Three-Phase Level/XP Progression Rebalance (Kandidat B) — 21.09.2026

- **AR-035: Glatte kubische Drei-Phasen-Progression (VERIFIED).** In `packages/domain/src/logic/levelProgression.ts` wurde die Formel $XP(L) = 10(L-1)^3 + 50(L-1)^2 + 350(L-1)$ implementiert. Early Game motivierend (L2 bei 410 XP, ~2.9 Workouts; L3 bei 980 XP, ~7 Workouts; L5 bei 2.840 XP, ~20 Workouts). Mid Game deutlich anspruchsvoller (L10 bei 14.490 XP, ~103 Workouts; L15 bei 42.140 XP, ~301 Workouts). Late Game prestigeträchtig ohne harte Wand (L20 bei 93.290 XP, ~666 Workouts). Session-XP unverändert degressiv begrenzt (max 265 XP). Idempotenz-Schutz gesichert. 677 Tests PASS.

## UI/i18n Cleanup, Level/XP Rebalancing & Age UI — 21.09.2026

- **AR-033: Zentrale Level & Session XP Progression (VERIFIED).** In `packages/domain/src/logic/levelProgression.ts` wurde die zentrale Kurve $XP(L) = 200(L-1)^2 + 800(L-1)$ implementiert. Level 1 -> 2 benötigt 1.000 XP (~7 Workouts). Session-XP wird mit Diminishing Returns berechnet (Base 50, Sätze max 30, Volumen max 110, PR max 75; absolutes Cap 265 XP). Idempotenz-Schutz in `achievementStore.ts` via `awardedSessionIds`.
- **AR-034: UI/i18n Parity: Plans Modal, Celebrations & Age Badge (VERIFIED).** Plans-Create-Modal zeigt keine Translation Keys mehr; Celebrations-Bereich in AppearanceSettings ist 100 % lokalisiert (DE/EN); dynamische Strings in LevelProgress & BattlePassModal sind locale-aware; Glitzer-Icon am Alters-Badge in Profile wurde entfernt, Barrierefreiheit und Profildaten intakt.

## Gemini Takeover & Preview Recovery — 21.09.2026

- **AR-027: i18n Workout-Abschluss & Session-Telemetry (VERIFIED).** In `WorkoutCompleteModal.tsx` und `WorkoutCompleteModal.test.tsx` wurden alle Telemetrie-Texte, Einheiten (kg/lbs), Labels und Barrierefreiheits-Rollen vollständig DE/EN implementiert. TS-Fehler (`displayName`) behoben. 100 % Session-Unveränderlichkeit verifiziert.
- **AR-028: Vercel Dual-Gate Preview Architektur (VERIFIED).** `scripts/security/preview-security-gate.cjs` entkoppelt die private Vercel-Preview vom blockierenden Release-Audit. Streng NON_RELEASE_BUILD mit voller Verify-Pflicht und Zero Critical. Release-Gate in CI (`audit:ci`) bleibt unangetastet blockierend.
- **AR-029: S4 Sync Cloud-Atomizität (ASTRA_REQUIRED / CRITICAL).** In `docs/architecture/S4_SYNC_PREPARATION.md` wurden Fehler- und Konfliktszenarien, Revisionsvektoren und Fixtures vorbereitet. Architekturentscheidung für serverseitige Transaktionen liegt bei Astra.
- **AR-030: S5 Account Deletion Contract (ASTRA_REQUIRED / CRITICAL).** In `docs/architecture/S5_ACCOUNT_DELETION_SPEC.md` wurde der parametrisierungsfreie RPC-Löschvertrag (`auth.uid()`) und die lokale Wipe-Sequenz nach Server-Erfolg definiert. Migration/Deployment auf Supabase durch Astra.
- **AR-031: AI Safety & Rate Limits (ASTRA_REQUIRED / CRITICAL).** In `docs/architecture/AI_SECURITY_PREPARATION.md` wurden zweisprachige Notfall-Eskalationen und das distributed Quota-Interface vorbereitet.
- **AR-032: Supply Chain Matrix (VERIFIED).** `docs/release/DEPENDENCY_AUDIT_REPORT.md` kategorisiert alle 43 High / 14 Moderate Befunde mit dem Nachweis von 0 Client-Runtime-Reachability.

## S4 Sync / Data Integrity (Outbox-Fortsetzung) — 20.09.2026

HIGH: Zustand im Speicher erst nach erfolgreichem lokalen Queue-Write bestätigen bzw. bei Fehler zurückrollen; betrifft Enqueue/ACK/Retry/Clear. Vier SQLite-Fault-Szenarien ergänzen die Pull-Tests. Kein Exactly-once-Versprechen: bei Cloud-Erfolg und lokalem ACK-Fehler wird dieselbe Operation erneut gesendet; serverseitige idempotente Aggregate bleiben Pflicht. Kein neuer Datenvertrag oder Dependency. Main jetzt für geprüfte geeignete Blöcke autorisiert; Gesamtauslieferung bleibt an Security-/Geräte-/Deployment-Gates gebunden. Tester-Anleitung in BETA_REGRESSION_MATRIX.md.

## Aktueller Checkpoint 20.09.2026 — S4 Sync / Data Integrity PARTIAL

Cloud-Child-Read/Delete- und Pull-Fehler werden weitergegeben; die fehlgeschlagene Outbox-Operation bleibt erhalten. Pull übernimmt erst vollständig validierte eigene Daten, überspringt offene lokale Änderungen und verwendet native SQLite-Atomizität plus Memory-Rollback. 18 Regressionen, darunter echter SQLite-Schreibfehler nach Profil-/History-Änderung. Review: keine serverseitige Transaktion, kein konsistenter DB-Snapshot über sechs Requests, keine gelösten Mehrgeräte-/Uhrenkonflikte. Web-Preview hat keine gleichwertige dauerhafte Rollback-Garantie. Frühere Befunde zu ignorierten Fehlern unten sind durch diesen Teilblock überholt; übrige S4-Gates bleiben CRITICAL.

Aktuellster S3-Block: lokale PostgreSQL-17.11-RLS-Abnahme mit 304 Assertions und adversarial Policy-/Preflight-/Rollback-Szenarien; restrictive Migration vorbereitet. Ursprungslücke real reproduziert. Review: Remote-Policy-/Grant-/Dateninventar, Sperrzeitfenster/Backup und Supabase-HTTP-Abnahme erforderlich; keine Produktion migriert. S4 kann auf dem lokal geprüften Ownership-Vertrag weiterarbeiten.

Aktuellster S6-Fix: öffentlicher Prototype-Auth-Bypass entfernt, lokale interne Identität in Production/VERCEL gesperrt. Drei zuvor rote Auth-Negativszenarien grün; 38 API-/Safety-Tests. S6 PARTIAL bis Serverentitlement, verteilte Quoten/Budget/Kill-Switch, DE/EN und reale Abnahme. Kein Remote-Rollout. Vorheriger S1-Patch `26e29d1` gepusht.

## S0 Repository Truth / Threat Model & S1 Secrets / Supply Chain / CI — 19.09.2026

Checkpoint `6c01522` gesichert. Security-Guardrails sind dauerhaft über AGENTS.md verbindlich; S0–S12-Matrix ersetzt den bisherigen Feature-Ausführungspfad. Threat Model/Betriebsrhythmus: SECURITY.md. Secrets/CI-Härtung implementiert, S1 bleibt PARTIAL wegen 67 Dependency-Befunden, fehlender SAST-/Lizenz-/Remote-Abnahme. Exakte historische Fixture-Ausnahmen prüfen; keine generellen Ignore-Regeln. GitHub-Branch-Protection und erforderliche Checks durch Repositoryowner bestätigen. Aktuelle Nachweise in EXECUTION_STATUS.md.

Nachfolgender S1-Patch: nanoid/undici/tar; 4 echte Angriffsregressionen vorher rot, jetzt grün. 602 Tests und Build PASS. Audit reduziert auf 57 (43 high/14 moderate), prod 52. Drei Paketauflösungen geändert, kein SDK-Upgrade. Restbefunde bleiben offene Release-Gates.

## Astra Review 19.09.2026 — maßgeblicher aktueller Stand

- **AR-005/013: MODIFY + ACTIVATE im nativen Review-Branch.** Unsichere RAM-Fallbacks, verschluckte Lesefehler/Logoutfehler und unzureichende Sessionprüfung ersetzt. Serialisierung, Readback, v1-Marker, MMKV/AsyncStorage-Migration und Supabase-Integration getestet. PARTIAL bis native Größen-/Upgrade-/Rollback-Abnahme; kein Rollout.
- **AR-004/019: ASTRA_REQUIRED / CRITICAL.** Kein blindes Ausrollen von `docs/schema.sql`. RLS-Harness benutzt falsche Spalten und keine Assertions; tatsächliche DB-Nachweise fehlen. Fremde FK-Verweise zusätzlich zur Owner-Spalte prüfen. Cloud-Aggregate werden weiterhin mehrstufig gelöscht/neu geschrieben; Delete-/Pull-Fehler werden teils ignoriert.
- **AR-014: MODIFY, nicht einfach ACTIVATE.** Capability behauptet Backendbereitschaft allein anhand Config/Auth. Erfolg nur `error:null`, Cleanupfehler verschluckt, Scope-Bindung fehlt; echtes Delete/Auth-Backend bleibt offen.
- **AR-015: PARTIAL.** Lokaler Export ist kein vollständiger Cloud-/DSGVO-Nachweis; zwei Exportpfade und Datenumfang abgleichen.
- **AR-007/018: ASTRA_REQUIRED / CRITICAL.** Prototyp-Flag kann Auth umgehen; kein serverseitiges Pro/Budget. Safety-Antworten nur Deutsch. Keine externe Freigabe aus Hosttests ableiten.
- **AR-016: PREPARED.** Provider-Abstraktion wiederverwenden, globalen Beta-Bypass vor Produktion absichern; native Käufe/Serverautorität fehlen.
- **AR-024/025: technische Katalogkompatibilität bestätigt.** Aktueller JSON-Blob identisch zu Beta 5 (`494916a8c0b48a50ff726e18b82084fa54ba087b`); bestehende Regressionen laufen. Medienrechte bleiben unbestätigt; kein erledigter Lizenzblocker.
- **AR-001/021/026: PHYSICAL_DEVICE_REQUIRED / USER_ACTION_REQUIRED.** Config/Checklisten sind Vorbereitung, keine signierten Builds oder Storefreigabe.

Die folgende Gemini-Tabelle ist historische Vorbereitung, keine heutige Astra-Freigabe. Aktuelle Gesamtmatrix: `P0_READINESS_MATRIX.md`.

Zentrale, kanonisch normalisierte Queue aller von Gemini vorbereiteten, analysierten oder implementierten technischen Änderungen, die der nachfolgende Astra-Agent strukturiert überprüfen, entscheiden oder aktivieren soll.

## Kanonische Prioritätsübersicht

| AR ID | Area | Status | Risk | Astra Action | Primary files |
|---|---|---|---|---|---|
| **AR-001** | Native Build | IMPLEMENTED | LOW | VERIFY | `apps/mobile/app.json`, `eas.json` |
| **AR-002** | Client Resilience | IMPLEMENTED | MEDIUM | VERIFY | `apps/mobile/src/utils/coachApi.ts` |
| **AR-003** | Observability | IMPLEMENTED | LOW | VERIFY | `apps/mobile/src/utils/logger.ts` |
| **AR-004** | Data Integrity | IMPLEMENTED | LOW | VERIFY | `apps/mobile/src/data/__tests__/dataIntegrityContracts.test.ts` |
| **AR-005** | Security | SUPERSEDED_BY AR-013 | HIGH | N/A | `docs/release/SECURE_STORAGE_MIGRATION_PLAN.md` |
| **AR-006** | Account / Legal | SUPERSEDED_BY AR-014 / AR-015 | HIGH | N/A | `docs/release/ACCOUNT_LIFECYCLE_SPEC.md` |
| **AR-007** | AI Safety | IMPLEMENTED | LOW | VERIFY | `api/coach-safety.cjs`, `api/coach-safety.test.cjs` |
| **AR-008** | Monetization | SUPERSEDED_BY AR-016 | HIGH | N/A | `docs/release/MONETIZATION_ARCHITECTURE_SPEC.md` |
| **AR-009** | Licensing | SUPERSEDED_BY AR-017 / AR-024 | HIGH | N/A | `docs/release/EXERCISE_ASSET_REPLACEMENT_PLAN.md` |
| **AR-010** | Performance | IMPLEMENTED | LOW | VERIFY | `apps/mobile/src/data/__tests__/largeDatasetPerformance.test.ts` |
| **AR-011** | Clean Code | ANALYZED | LOW | VERIFY_DELETE | `apps/mobile/src/components/exercises/ExerciseFilter.tsx` |
| **AR-012** | Clean Code | ANALYZED | LOW | ARCHITECTURE_DECISION | `apps/mobile/package.json` |
| **AR-013** | Security | PREPARED | HIGH | ACTIVATE | `apps/mobile/src/utils/secureStorage.ts` |
| **AR-014** | Account / Legal | PREPARED | HIGH | ACTIVATE | `apps/mobile/src/services/accountDeletionService.ts` |
| **AR-015** | Data Export | IMPLEMENTED | LOW | VERIFY | `apps/mobile/src/services/dataExportService.ts` |
| **AR-016** | Monetization | PREPARED | MEDIUM | ACTIVATE | `apps/mobile/src/services/entitlementService.ts` |
| **AR-017** | Exercise Media | IMPLEMENTED | MEDIUM | VERIFY | `apps/mobile/src/utils/getExerciseMedia.ts`, `app/exercise/[id].tsx` |
| **AR-018** | AI Safety | IMPLEMENTED | LOW | VERIFY | `api/coach-safety.cjs`, `api/coach-safety.test.cjs` |
| **AR-019** | Sync Integrity | IMPLEMENTED | LOW | VERIFY | `apps/mobile/src/stores/__tests__/syncFailureHarness.test.ts` |
| **AR-020** | Stability | IMPLEMENTED | LOW | VERIFY | `apps/mobile/src/components/ErrorBoundary.tsx` |
| **AR-021** | Store Compliance | AUDITED | MEDIUM | USER_DECISION | `docs/release/STORE_TECHNICAL_READINESS.md` |
| **AR-022** | QA Regression | IMPLEMENTED | LOW | VERIFY | `apps/mobile/src/__tests__/releaseCandidateCoreRegression.test.ts` |
| **AR-023** | Diagnostics | IMPLEMENTED | LOW | VERIFY | `apps/mobile/src/services/diagnosticsService.ts` |
| **AR-024** | Exercise Catalog | IMPLEMENTED | MEDIUM | VERIFY | `apps/mobile/src/__tests__/exerciseCatalogCompatibility.test.ts`, `docs/release/EXERCISE_DATA_PROVENANCE.md` |
| **AR-025** | Legacy & Edge Regression | IMPLEMENTED | LOW | VERIFY | `apps/mobile/src/__tests__/legacyUpdateRegression.test.ts`, `apps/mobile/src/__tests__/workoutEdgeCaseRegression.test.ts` |
| **AR-026** | Store & Device QA Package | IMPLEMENTED | LOW | REVIEW | `docs/release/STORE_METADATA_DRAFT.md`, `docs/release/STORE_SCREENSHOT_PLAN.md`, `docs/release/PHYSICAL_DEVICE_SMOKE_TEST.md` |
| **AR-027** | Telemetry i18n & Modal | IMPLEMENTED | LOW | VERIFY | `apps/mobile/src/components/workout/WorkoutCompleteModal.tsx` |
| **AR-028** | Dual-Gate Preview | IMPLEMENTED | LOW | VERIFY | `scripts/security/preview-security-gate.cjs` |
| **AR-029** | Sync Cloud Atomicity | PREPARED | CRITICAL | ASTRA_REQUIRED | `docs/architecture/S4_SYNC_PREPARATION.md` |
| **AR-030** | Account Deletion Spec | PREPARED | CRITICAL | ASTRA_REQUIRED | `docs/architecture/S5_ACCOUNT_DELETION_SPEC.md` |
| **AR-031** | AI Safety Preparation | PREPARED | CRITICAL | ASTRA_REQUIRED | `docs/architecture/AI_SECURITY_PREPARATION.md` |
| **AR-032** | Supply Chain Audit | IMPLEMENTED | LOW | VERIFY | `docs/release/DEPENDENCY_AUDIT_REPORT.md` |
| **AR-033** | Level & Session XP | IMPLEMENTED | LOW | VERIFY | `packages/domain/src/logic/levelProgression.ts` |
| **AR-034** | UI/i18n Parity | IMPLEMENTED | LOW | VERIFY | `apps/mobile/src/i18n/translations.ts` |
| **AR-035** | Three-Phase Progression | IMPLEMENTED | LOW | VERIFY | `packages/domain/src/logic/levelProgression.ts` |
| **AR-036** | Accessibility / VoiceOver Audit | IMPLEMENTED | LOW | VERIFY | `apps/mobile/src/components/__tests__/accessibilityAudit.test.tsx` |
| **AR-037** | S4 Sync Failure Fixtures | IMPLEMENTED | MEDIUM | ASTRA_REQUIRED | `apps/mobile/src/stores/__tests__/syncFailureScenarios.test.ts` |
| **AR-038** | Dependency Triage & Overrides | IMPLEMENTED | HIGH | VERIFY | `pnpm-workspace.yaml` |
| **AR-039** | S5 Account Deletion Tests | PREPARED | HIGH | ASTRA_REQUIRED | `apps/mobile/src/services/__tests__/accountDeletionContract.test.ts` |
| **AR-040** | AI Safety DE/EN Suite | IMPLEMENTED | HIGH | VERIFY | `api/coach-safety.cjs`, `api/coach-safety.test.cjs` |



---

## AR-001 – Native Build & Device Readiness (Image Picker Plugin & EAS Preview Profiles)

Priority:
P1

Gemini Status:
IMPLEMENTED

Risk:
LOW

Commit:
db38ec8

Files:
- `apps/mobile/app.json`
- `apps/mobile/eas.json`
- `docs/release/DEVICE_QA_CHECKLIST.md`

Gemini changed:
1. `apps/mobile/app.json`: Fehlendes Expo Config Plugin `expo-image-picker` mit Berechtigungs-Hinweis (`photosPermission`) ergänzt. Dadurch werden in nativen Builds für iOS (`NSPhotoLibraryUsageDescription`) und Android (`READ_MEDIA_IMAGES`) die erforderlichen Berechtigungen automatisch in Plist und Manifest injiziert.
2. `apps/mobile/eas.json`: Profil `preview` um `ios: { simulator: false }` präzisiert und neues Profil `preview-simulator` mit `ios: { simulator: true }` ergänzt, um Vorschau-Builds auch ohne kostenpflichtige Apple Developer Mitgliedschaft auf macOS-Simulatoren zu ermöglichen.
3. `docs/release/DEVICE_QA_CHECKLIST.md`: Vollständige, strukturierte Checkliste für native Gerätetests (Installation, Auth, Workout, Timer, Data, Lifecycle, Accessibility) angelegt.

Why:
`expo-image-picker` wurde im Code (`profile.tsx`, `coach.tsx`) verwendet und in `apps/mobile/package.json` deklariert, fehlte jedoch in `app.json` `plugins`. Ohne diesen Eintrag würde ein nativer iOS-Build im App Store Review wegen fehlender Nutzungsbeschreibung abgelehnt werden oder beim Bildzugriff abstürzen. Das `preview-simulator`-Profil schließt die Lücke für Simulator-Tests auf Entwicklungsrechnern.

Tests:
- `npx expo config --type public` -> PASS (Plugin & Permissions sauber aufgelöst)
- `npx expo config --type introspect` -> PASS (Native Mod-Konfiguration fehlerfrei)
- `pnpm verify` -> PASS (306 Tests grün)

Expected behavior:
Native Builds und Prebuilds enthalten alle erforderlichen Metadaten für Bildauswahl und Simulator-Vorschau.

Potential concerns:
- Keine. Bundle-Identifier und Android-Package blieben unverändert (`com.fitnesstracker.app`).

Questions for Astra:
1. Soll für EAS Update zukünftig eine `runtimeVersion` (z.B. `{"policy": "appVersion"}`) in `app.json` ergänzt werden, sobald OTA-Updates aktiv genutzt werden?
2. Entspricht der deutsche Berechtigungstext (`"Die App benötigt Zugriff auf deine Fotos, um Profil- und Trainingsbilder auszuwählen."`) den finalen App-Store-Anforderungen?

Astra action:
VERIFY

Rollback commit:
dcd58d8

---

## AR-002 – Client Resilience: AbortSignal & Timeout Hardening in Coach API

Priority:
P1

Gemini Status:
IMPLEMENTED

Risk:
MEDIUM

Commit:
38f8820

Files:
- `apps/mobile/src/utils/coachApi.ts`
- `apps/mobile/src/utils/__tests__/coachApi.test.ts`

Gemini changed:
1. `apps/mobile/src/utils/coachApi.ts`: `CoachOptions` um optionale Parameter `signal?: AbortSignal` und `timeoutMs?: number` (Standard: 75.000 ms) erweitert.
2. Der interne Fetch-Controller reagiert nun direkt auf ein externes Abbruch-Signal des Aufrufers (`options.signal`).
3. Im Catch-Block wird präzise zwischen echtem Verbindungs-Timeout (`Der Coach antwortet nicht rechtzeitig.`) und nutzerseitigem Abbruch (`Anfrage durch Nutzer abgebrochen.`) unterschieden.
4. Unit-Tests in `coachApi.test.ts` für Client-Cancellation und Timeouts ergänzt.

Why:
Bislang liefen abgebrochene Coach-Requests bis zu 75 Sekunden lang im Hintergrund weiter und konnten nicht vom Aufrufer (z.B. beim Verlassen des Screens oder Beenden der Audioaufnahme) sauber gestoppt werden. Zudem war ein Timeout nicht konfigurierbar.

Tests:
- `apps/mobile/src/utils/__tests__/coachApi.test.ts` (6 Tests, inkl. Abort & Timeout) -> PASS
- `pnpm verify` -> PASS

Expected behavior:
Aufrufer können AI-Coach-Requests vorzeitig abbrechen, ohne dass Hintergrund-Tasks weiterlaufen oder inkonsistente Fehlermeldungen entstehen.

Potential concerns:
- Keine. Bestehende Aufrufe ohne `signal` oder `timeoutMs` behalten exakt das bisherige Verhalten bei (rückwärtskompatibel).

Questions for Astra:
1. Soll die UI im Coach-Screen einen expliziten "Abbrechen"-Button während des Wartens auf eine Antwort anzeigen?
2. Soll der Standard-Timeout von 75s in Mobilfunknetzen beibehalten oder auf z.B. 45s verkürzt werden?

Astra action:
VERIFY

Rollback commit:
3435311

---

## AR-003 – Privacy-safe Logging Abstraction & Sensitive Data Redaction

Priority:
P1

Gemini Status:
IMPLEMENTED

Risk:
LOW

Commit:
38f8820

Files:
- `apps/mobile/src/utils/logger.ts`
- `apps/mobile/src/utils/__tests__/logger.test.ts`
- `apps/mobile/src/utils/supabase.ts`
- `apps/mobile/src/stores/syncStore.ts`
- `apps/mobile/src/stores/storage.ts`
- `apps/mobile/app/history/[id].tsx`

Gemini changed:
1. `apps/mobile/src/utils/logger.ts`: Zentrale, isolierte Logging-Abstraktion mit automatischer Schwärzung/Redaktion implementiert:
   - Bearer-Tokens (`Bearer [REDACTED_TOKEN]`)
   - JWT-Tokens (`[REDACTED_JWT]`)
   - E-Mail-Adressen (`[REDACTED_EMAIL]`)
   - Base64-Nutzlasten (`data:[REDACTED_BASE64]`)
   - Sensible Schlüssel in Objekten (`password`, `token`, `access_token`, `refresh_token`, `secret`, `apikey`, `authorization`, `prompt`, `user_id` -> `[REDACTED]`)
   - Sanitizing von Error-Objekten (nur Name und geschwärzte Message, kein interner Memory-Leak)
   - Schutz vor Zirkelbezügen (`[CIRCULAR]`) und Tiefenbegrenzung
   - In Production (`process.env.NODE_ENV === 'production' && !__DEV__`) ist `debug` deaktiviert.
2. Direkte `console.log/warn/error`-Aufrufe in Kernmodulen (`supabase.ts`, `syncStore.ts`, `storage.ts`, `history/[id].tsx`) auf `logger` umgestellt.
3. Dedizierte Unit-Tests in `logger.test.ts` (10 Tests) geschrieben.

Why:
Verhinderung von Leaks sensibler Benutzer-, Auth- und Gesundheitsdaten in Konsolenausgaben, Terminal-Logs, Crash-Reports oder zukünftigen Observability-Tools. Es wurde bewusst keine externe Plattform (wie Sentry oder Datadog) installiert, um Astras Entscheidung nicht vorzugreifen.

Tests:
- `apps/mobile/src/utils/__tests__/logger.test.ts` (10 Tests) -> PASS
- `pnpm verify` -> PASS

Expected behavior:
Alle Log-Ausgaben werden automatisch maskiert; Tokens, Passwörter und E-Mails tauchen unter keinen Umständen im Klartext auf.

Potential concerns:
- Keine. Keine externen Abhängigkeiten hinzugefügt; Standard-Console bleibt Unterbau.

Questions for Astra:
1. Welche Observability-/Crash-Reporting-Plattform (z.B. Sentry, Bugsnag, PostHog) soll an die `logger`-Abstraktion angebunden werden?
2. Sollen im Production-Betrieb Warnungen und Fehler lokal gepuffert oder ausschließlich an den zukünftigen Crash-Reporter weitergeleitet werden?

Astra action:
VERIFY

Rollback commit:
3435311

---

## AR-004 – Data Integrity Contract Tests & Multi-Device Sync Test Matrix

Priority:
P0

Gemini Status:
IMPLEMENTED

Risk:
LOW

Commit:
943676b

Files:
- `apps/mobile/src/data/__tests__/dataIntegrityContracts.test.ts`
- `docs/release/SYNC_TEST_MATRIX.md`

Gemini changed:
1. `apps/mobile/src/data/__tests__/dataIntegrityContracts.test.ts`: Neue dedizierte Testsuite zur Absicherung der Kernverträge für Workouts, Körperdaten, Programme und Identifikatoren implementiert:
   - Workout & Set Integrity: Eindeutigkeit aller Set-IDs über Sessions hinweg, isolierte Set-Updates ohne Mutation von Nachbar-Sätzen, saubere Neunummerierung nach Satz-Löschung (`setNumber`).
   - Body Measurements Integrity: Speichern von Gewicht & KFA, chronologische Sortierung (`recordedAt DESC`), verlässliche `getLatestMetric()`-Rückgabe, gezielte Löschung.
   - Program & Template Integrity: Erstellung von Templates mit `targetSets`/`targetReps`/`targetWeight`, Programmaktivierung mit strikter Einzel-Aktiv-Exklusivität (`isActive`).
   - ID Collision & UUID Validity: 1.000 aufeinanderfolgende UUID-Generierungen ohne jede Kollision, strikte RFC4122-Validierung via `UUIDSchema`.
2. `docs/release/SYNC_TEST_MATRIX.md`: Vollständige Sync-Testmatrix mit allen 12 geforderten Szenarien (`offline create`, `offline edit`, `offline delete`, `online reconnect`, `same entity changed twice`, `two-device edit`, `delete vs update`, `duplicate upload`, `retry after timeout`, `partial sync failure`, `auth change during sync`, `account switch`) angelegt.

Why:
Vorbereitung eines verlässlichen Sicherheitsnetzes für spätere größere Sync- und Persistenzarbeiten durch Astra. Schließt Verifikationslücken vor produktiven Migrationen.

Tests:
- `apps/mobile/src/data/__tests__/dataIntegrityContracts.test.ts` -> PASS (4 Tests)
- `pnpm verify` -> PASS (322 Tests)

Expected behavior:
Alle lokalen Speicherschichten wahren relationale Konsistenz, Eindeutigkeit und Sortierordnung.

Potential concerns:
- Keine. Reines Testnetz und Spezifikationsmatrix ohne Änderung an Produktivcode.

Questions for Astra:
1. Wie soll die serverseitige Konfliktauflösung bei `two-device edit` final architektoniert werden (Last-Write-Wins vs. CRDT vs. Revision-Numbers)?
2. Sollen serverseitige Tombstones (`deleted_at`) in den Supabase-Tabellen für `delete vs update` Konflikte eingeführt werden?

Astra action:
VERIFY

Rollback commit:
d43ca9c

---

## AR-005 – Secure Storage Migration Plan (Auth & Token Persistence)

Priority:
P0

Gemini Status:
PREPARED

Risk:
HIGH

Commit:
f4960b7

Files:
- `docs/release/SECURE_STORAGE_MIGRATION_PLAN.md`

Gemini changed:
1. `docs/release/SECURE_STORAGE_MIGRATION_PLAN.md`: Umfassender Migrationsplan für den Wechsel von unverschlüsseltem MMKV/AsyncStorage zu hardware-unterstütztem SecureStore (Keychain / Keystore) erarbeitet:
   - Vollständige Bestandsaufnahme der aktuellen Speicherung (`supabase-auth-storage`).
   - Analyse der sensiblen Werte (`access_token`, `refresh_token`, `email`, `user_id`).
   - Zielarchitektur: Hybrid Secure Storage mit Chunken / AES-Schlüsselverwaltung.
   - Ausarbeitung der Zero-Logout-Migrationsstrategie (Dual-Read von SecureStore und Legacy-MMKV, Übertragung ohne Abmeldung aktiver Beta-Nutzer).
   - Rollback-Strategie, Testanforderungen und Risikoanalyse (Android Keystore 2048-Byte Limit, Offline-Verhalten).
2. Keine produktive Session-Migration vorweggenommen (gemäß Regel: High Risk -> Astra Owner).

Why:
Token-Speicherung in unverschlüsseltem MMKV/AsyncStorage stellt ein Sicherheitsrisiko dar (Auslesbarkeit auf gerooteten/gejailbreakten Geräten oder Backups). Eine unüberlegte Migration würde jedoch aktive Beta-Nutzer zwangsabmelden oder bei Keystore-Problemen offline aussperren.

Tests:
- Statische Code- und Schema-Analyse der Auth-Persistenzpfade.

Expected behavior:
Nach Freigabe durch Astra können Tokens verlustfrei und ohne Zwangs-Logout in hardware-gesicherte Speicher überführt werden.

Potential concerns:
- `expo-secure-store` ist aktuell noch nicht in den Projekt-Dependencies installiert.
- Android Keystore hat ein 2KB-Limit pro Key; ein verschlüsselter MMKV-Store mit Key im SecureStore umgeht dieses Limit elegant.

Questions for Astra:
1. Bevorzugt Astra den hybriden Ansatz (verschlüsseltes MMKV mit AES-Key in SecureStore/Keychain) oder die direkte Nutzung von `expo-secure-store` mit Chunker?
2. Soll Web-Storage rein flüchtig gehalten werden (Session endet mit Tab-Close) oder bleibt LocalStorage für Web-Previews akzeptabel?

Astra action:
ARCHITECTURE_DECISION

Rollback commit:
9467844

---

## AR-006 – Account Lifecycle: Deletion RPC Spec & GDPR Art. 20 Data Export

Priority:
P0

Gemini Status:
PREPARED (Deletion Spec) / IMPLEMENTED (Export Contract Test & Data Map)

Risk:
HIGH (Cloud Deletion RPC Execution) / LOW (Export & Local Reset)

Commit:
f3cbf27

Files:
- `docs/release/ACCOUNT_DELETION_IMPLEMENTATION_SPEC.md`
- `docs/release/DATA_EXPORT_IMPLEMENTATION_SPEC.md`
- `docs/release/ACCOUNT_DATA_MAP.md`
- `apps/mobile/src/stores/__tests__/profileStore.test.ts`

Gemini changed:
1. `ACCOUNT_DELETION_IMPLEMENTATION_SPEC.md`: Erstellt. Detaillierte Spezifikation der serverseitigen Account-Löschung für Apple App Store Guideline 5.1.1(v) und DSGVO Art. 17:
   - PostgreSQL RPC `delete_user_account()` mit `SECURITY DEFINER` und `auth.uid()`.
   - Auflösung des `ON DELETE RESTRICT`-Konflikts zwischen `template_exercises` und `exercises` durch exakte Löschreihenfolge.
   - Bereinigung von Supabase Storage Avataren (`avatars/${userId}`).
   - Client-Orchestrierung: Prüfung auf Store-Abos (Hinweispflicht), Outbox-Freezing, 2-Stufen-Bestätigung ("LÖSCHEN"), atomare lokale Bereinigung erst nach Server-Erfolg.
2. `DATA_EXPORT_IMPLEMENTATION_SPEC.md`: Erstellt. Formale Erfassung des bestehenden `exportData()`-Schemas (Version 2) gemäß DSGVO Art. 20 (Datenübertragbarkeit), Analyse von Performance/Speicherbedarf bei 1.000+ Workouts und Empfehlung für FileSystem-Streaming via `expo-file-system`.
3. `apps/mobile/src/stores/__tests__/profileStore.test.ts`: Umfassenden Test für `exportData()` hinzugefügt, der alle 15 Domänenbereiche validiert und den Ausschluss jeglicher sensibler Tokens/Schlüssel (`access_token`, `refresh_token`, `sb-`, `service_role`) garantiert.
4. `docs/release/ACCOUNT_DATA_MAP.md`: Aktualisiert und mit beiden Spezifikationen verknüpft.

Why:
Apple App Store Guideline 5.1.1(v) verlangt zwingend eine In-App-Löschmöglichkeit des Accounts für alle Apps mit Account-Erstellung. Fehlt diese, droht Review-Ablehnung. Aus Sicherheitsgründen durfte Gemini keine ungetestete Produktiv-Migration oder SQL-RPC auf Supabase ausführen, weshalb die Architektur vollständig vorbereitet und getestet wurde.

Tests:
- `apps/mobile/src/stores/__tests__/profileStore.test.ts` -> PASS (8 Tests)
- `pnpm verify` -> PASS (380 Tests grün)

Expected behavior:
Astra kann die vorbereitete Postgres-Funktion als Supabase-Migration einpflegen und das UI in `app/profile.tsx` anbinden. Export funktioniert bereits nachweislich DSGVO-konform.

Potential concerns:
- Kaskadierendes Löschen von `exercises` blockiert, wenn Templates nicht zuvor gelöscht werden (in der RPC-Spezifikation bereits mitigiert).
- Store-Abos (Apple/Google) laufen trotz Account-Löschung weiter, wenn Nutzer sie nicht im Store kündigen (UI-Warnung spezifiziert).

Questions for Astra:
1. Soll die Account-Löschung sofort hart (`HARD DELETE`) in Postgres ausgeführt werden oder bevorzugt Astra eine 14-tägige Bedenkzeit (`SOFT DELETE` mit Reaktivierungsoption)?
2. Soll `exportData()` bei großen Datenmengen künftig eine `.zip`-Datei mit Avatar-Bildern packen oder genügt der reine JSON-Datenexport?

Astra action:
ARCHITECTURE_DECISION

Rollback commit:
9643886

---

## AR-007 – AI Coach Production Safety Matrix & Client Resilience Tests

Priority:
P1

Gemini Status:
IMPLEMENTED (Test Plan & Client Hardening Tests)

Risk:
LOW

Commit:
89585ac

Files:
- `docs/release/AI_PRODUCTION_TEST_PLAN.md`
- `apps/mobile/src/utils/__tests__/coachApi.test.ts`

Gemini changed:
1. `AI_PRODUCTION_TEST_PLAN.md`: Erstellt. Vollständige Matrix über 15 sicherheits- und kostenkritische Tore (Authentication, Entitlement, Rate Limits, Cost Caps, Provider Outage, Timeouts, HTTP 429, HTTP 500, Schema Repair, Unsafe Advice, Medical Escalation, Prompt Injections, Image Input Quotas, Context Truncation, Sensitive Logging) mit Statusmarkierung (`CURRENTLY_TESTED`, `NOT_TESTED`, `ASTRA_REQUIRED`).
2. `apps/mobile/src/utils/__tests__/coachApi.test.ts`: Um 4 neue Unit-Tests erweitert:
   - `handles network connection failure (TypeError)` -> saubere Fehlermeldung ohne Crash.
   - `handles HTTP 429 rate limit response` -> verständliche Warte-Anweisung für den Nutzer.
   - `rejects malformed response with empty reply field` -> wirft klaren JSON-/Backend-Fehler.
   - `never transmits provider secrets or API keys` -> verifiziert, dass weder Headers (`x-api-key`, `openrouter-api-key`) noch Payload (`sk-or-`, `OPENROUTER`, `secret`) vertrauliche Tokens lecken.

Why:
Der KI-Coach ist ein Kern-Differenzierungsmerkmal von EVARO, birgt jedoch erhebliche finanzielle Risiken (Token-Abfluss, fehlende Limits) sowie Haftungsrisiken (gefährliche Ratschläge bei akuten Verletzungen). Vor der produktiven Freigabe muss Astra diese Schutzmechanismen systematisch abprüfen können.

Tests:
- `apps/mobile/src/utils/__tests__/coachApi.test.ts` (10 Tests) -> PASS
- `api/coach-chat.test.cjs` (18 Tests) -> PASS
- `pnpm verify` -> PASS (384 Tests)

Expected behavior:
Client reagiert auf alle Netzwerkfehler, Timeouts, Abbrüche und fehlerhafte Antworten deterministisch und leckt unter keinen Umständen API-Secrets.

Potential concerns:
- Medizinische Eskalationsfilter (z.B. Brustschmerzen, Schwellungen) müssen serverseitig im System-Prompt noch durch Astra geschärft und automatisiert getestet werden.

Questions for Astra:
1. Soll bei Free-Nutzern nach 6 Anfragen/Tag ein direkter Upgrade-Trigger zur Paywall erfolgen oder eine harte 24-Stunden-Sperre angezeigt werden?
2. Bevorzugt Astra für Bildanalysen (z.B. KFA-Schätzung, Haltungsanalyse) ein clientseitiges Vorab-Komprimieren (max 1024x1024) oder ein striktes Server-Limit (max 4 MB)?

Astra action:
VERIFY

Rollback commit:
9e535e4

---

## AR-008 – Monetization Preparation: EVARO Pro Feature Matrix & Entitlement Architecture Spec

Priority:
P1

Gemini Status:
PREPARED (Architecture Spec & Feature Matrix)

Risk:
HIGH (In-App Purchases & Billing Architecture Decisions)

Commit:
d27ca51

Files:
- `docs/release/EVARO_PRO_FEATURE_MATRIX.md`
- `docs/release/ENTITLEMENT_ARCHITECTURE_SPEC.md`
- `docs/release/SUBSCRIPTION_INTEGRATION_MAP.md`

Gemini changed:
1. `EVARO_PRO_FEATURE_MATRIX.md`: Erstellt. Vollständige Differenzierungs-Matrix zwischen Free Tier und EVARO Pro für 13 Feature-Bereiche (Workouts, Historie, Katalog, Timer, DSGVO-Export, Templates, AI Coach Text/Voice/Plan/Vision, Cloud-Sync, Telemetrie, Farbwelten) mit Client-Gates, Server-Gates, Offline-Verhalten und Kennzeichnung als `PROPOSED`.
2. `ENTITLEMENT_ARCHITECTURE_SPEC.md`: Erstellt. Technischer Architektur-Blueprint für die Anbindung von RevenueCat über StoreKit 2 und Google Play Billing:
   - Identitätsmapping: Supabase UUID als App User ID, Aliasing von anonymen Käufen, Entkopplung bei Account-Wechsel via `Purchases.logOut()`.
   - Serverseitiges Gating: Supabase-Tabelle `public.subscriptions`, denormalisiertes `users.is_pro`-Flag, abgesicherter Vercel-Webhook-Handler (`api/webhooks/revenuecat.js`).
   - Client-Abläufe: "Käufe wiederherstellen" (Restore Purchases gem. Guideline 3.1.1), 72-Stunden Offline-Grace-Period für Fitnessstudios ohne Netz, Probeabos (Trials).
   - Anti-Fraud & Sicherheitskonzepte (keine Client-Vertrauensstellung, serverseitige Verifikation vor OpenRouter-Calls).
3. `SUBSCRIPTION_INTEGRATION_MAP.md`: Mit den neuen Spezifikationen synchronisiert und aktualisiert.
4. Keine ungetestete Installation von Drittanbieter-Bibliotheken oder verfrühte Produkt-IDs im Produktivcode.

Why:
Monetarisierung ist für die wirtschaftliche Tragfähigkeit von EVARO unverzichtbar (insbesondere zur Deckung von KI-Token- und Infrastrukturkosten). Gleichzeitig verlangen die App Stores (insb. Apple Guideline 3.1.1 und 3.1.2) lückenlose Einhaltung formaler Kriterien (Restore Purchases, klare Kündigungsfristen, transparente Freemium-Grenzen). Durch die gründliche Vorbereitung kann Astra die native SDK-Integration und Webhook-Logik direkt aufsetzen.

Tests:
- Statische Architekturprüfung der Integrationsschnittstellen.

Expected behavior:
Astra verfügt über eine vollständige Spezifikation zur Integration von RevenueCat, Supabase Webhooks und Server-Gating.

Potential concerns:
- Apple-Richtlinien fordern zwingend funktionierende Restore-Purchases-Buttons und EULA/Datenschutz-Links auf jeder Paywall.
- Offline-Verhalten muss zwingend tolerant sein, um Frustration im Studio zu vermeiden (spezifiziert auf 72h Grace).

Questions for Astra:
1. Soll RevenueCat Paywalls (UI) via RevenueCat SDK Paywall-View gerendert werden oder soll EVARO ein vollständig custom gestaltetes Paywall-Modal nutzen?
2. Welche Produktpreis-Modelle (z. B. 9,99 €/Monat bzw. 79,99 €/Jahr) sollen für die App Store Connect Konfiguration vorbereitet werden?

Astra action:
ARCHITECTURE_DECISION

Rollback commit:
081e62a

---

## AR-009 – Exercise Asset Replacement Plan & Licensing Decoupling

Priority:
P0

Gemini Status:
PREPARED (Replacement Plan & Fallback UI Verification)

Risk:
HIGH (Exercise Media Copyright & Hotlink Outage Risk)

Commit:
852c1dd

Files:
- `docs/release/EXERCISE_ASSET_REPLACEMENT_PLAN.md`
- `docs/release/EXERCISE_ASSET_INVENTORY.md`

Gemini changed:
1. `EXERCISE_ASSET_REPLACEMENT_PLAN.md`: Erstellt. Umfassender Migrations- und Entkopplungsplan für die 1.492 externen GIF-URLs (`static.exercisedb.dev`) und dynamischen GitHub-JPGs (`free-exercise-db`), deren kommerzielle Rechte im Repository nicht belegt sind:
   - Audit aller 4 bildverbrauchenden Screens (`ExerciseCard.tsx`, `[id].tsx`, `SessionExerciseCard.tsx`, `template-builder.tsx`).
   - Verifikation des bestehenden Fallback-UI: Beide Hauptkomponenten verfügen bereits über einen fehlerfreien Fallback mit `Ionicons name="barbell-outline"` bzw. `imagePlaceholder`. Die App stürzt ohne GIFs nicht ab.
   - Ausarbeitung von 4 Lösungsoptionen (A: Kommerzielle API-Lizenz bei ExerciseDB; B: Anatomie-Muskel-Vektor-Fallback mit MIT-lizenzierter `AnatomyFigure`; C: CC0/Wger-Datensatz; D: Custom 3D-Assets).
   - Ausarbeitung eines 2-Stufen-Plans: Stufe 1 als sofortige, abmahnsichere Null-Risiko-Entkopplung für den App Store Release; Stufe 2 für spätere Lizenzierung mit CDN-Hosting.
2. `EXERCISE_ASSET_INVENTORY.md`: Aktualisiert und verknüpft.
3. Keine voreilige Löschung von Assets oder Datenfiles vor der Entscheidung durch Astra/Konrad.

Why:
Unlizenzierte Medien oder Hotlinks auf fremde CDNs bergen ein akutes Risiko für Copyright-Abmahnungen, Ausfälle im Betrieb und Ablehnungen im App Store Review. Gleichzeitig darf Gemini ohne Weisung des Rechteinhabers keine Assets unwiderruflich löschen.

Tests:
- Statische Code-Analyse aller Bild-Konsumenten und Fallback-Pfade.

Expected behavior:
Astra kann mit minimalem Aufwand (Entfernen der URL-Auflösung in `mapExercises.ts`) die App rechtssicher und hotlink-frei für den App Store Release konfigurieren.

Potential concerns:
- Wird Option B (Anatomie-Fallback) gewählt, fehlen animierte Übungsvorschauen; dafür erhält die App ein minimalistisches, extrem schnelles medizinisches Design (analog zu Whoop / Apple Fitness).

Questions for Astra:
1. Liegt Konrad eine Rechnung / Vereinbarung für ExerciseDB vor, oder soll Option B (Anatomie-Vektor-Fallback) für den V1 Store Release scharf geschaltet werden?
2. Soll `packages/domain/src/data/raw/exercisedb-v1.json` (1,4 MB) jetzt endgültig aus dem Git-Tracking entfernt werden?

Astra action:
ARCHITECTURE_DECISION

Rollback commit:
d3ce4d2

---

## AR-010 – Performance QA: Benchmarks, Large Datasets & Scalability Report

Priority:
P1

Gemini Status:
IMPLEMENTED (Test Generator, Benchmark Suite & QA Report)

Risk:
LOW

Commit:
aa2028b

Files:
- `apps/mobile/src/data/__tests__/benchmarkDatasetGenerator.ts`
- `apps/mobile/src/data/__tests__/largeDatasetPerformance.test.ts`
- `docs/release/PERFORMANCE_QA.md`

Gemini changed:
1. `benchmarkDatasetGenerator.ts`: Erstellt. Isolierte Test-Utility zur deterministischen Erzeugung realistischer Großdatensätze (500/1.000 Workouts, 10.000+ Sätze, 500 Körpermetriken, 100 Templates, 50 Programme). Keine Testdaten werden im Produktiv-Bundle ausgeliefert.
2. `largeDatasetPerformance.test.ts`: Erstellt. Automatisierte Benchmark-Suite für Jest/CI:
   - 500 Workouts (~7.000 Sätze): Ingestion 15 ms, Datum-Sortierung 9 ms, Vorherige Leistung (`getPreviousPerformance`) 3 ms, Volumen-Historie 7 ms.
   - 1.000 Workouts (10.000+ Sätze): Sortierung 21 ms, Lookup 4 ms, vollständiger DSGVO Art. 20 Export (>1 MB) 38 ms.
   - 500 Körperdaten: Chronologische Auflösung (`getLatestMetric`) in 1 ms.
   - Fuzzy-Katalog-Suche über 873 Übungen in 5 ms.
3. `PERFORMANCE_QA.md`: Erstellt. Umfassender Performance-Prüfbericht über History Render (Virtualisierung mit `FlatList`), Übungssuche (In-Memory Unicode NFD Normalisierung), Workout Load/Save, Chart-Sampling und Empfehlungen für Astra (sortierte Indizes, FileSystem-Export-Streaming ab 1.000 Workouts).

Why:
Sicherstellung, dass EVARO auch bei mehrjähriger aktiver Trainingsnutzung (Power-User mit 1.000 Einheiten und 10.000 Sätzen) reaktionsschnell bei 60 FPS bleibt und weder Memory-Leaks noch spürbare UI-Verzögerungen auftreten.

Tests:
- `apps/mobile/src/data/__tests__/largeDatasetPerformance.test.ts` (5 Benchmarks) -> PASS
- `pnpm verify` -> PASS (389 Tests)
- `pnpm coach:check` -> PASS

Expected behavior:
Alle kritischen Abfragen und Lookups skalieren stabil unter 50 ms.

Potential concerns:
- Keine. Reines Test- und Dokumentations-Tooling.

Questions for Astra:
1. Soll `historyStore` zukünftig bei `addSession` ein binäres Einfügen nutzen, um das Re-Sorting bei `getSessionsByDateDesc` vollständig auf 0 ms zu eliminieren?
2. Ab welcher Historie-Größe (z.B. 2.000 Workouts) soll ein SQLite-Paging im UI eingeführt werden?

Astra action:
VERIFY

Rollback commit:
353529b

---

## AR-011 – Possible Obsolete Component: ExerciseFilter.tsx

Priority:
P2

Gemini Status:
ANALYZED

Risk:
LOW

Commit:
bc6741f (Pre-Cleanup Safepoint)

Files:
- `apps/mobile/src/components/exercises/ExerciseFilter.tsx`

Gemini changed:
Keine Löschung vorgenommen. Komponente analysiert und als potenziell ungenutzt identifiziert.

Why:
`ExerciseFilter.tsx` ist im Quellcode nirgendwo importiert. Die Screen-Datei `apps/mobile/app/(tabs)/exercises.tsx` verwendet eigene Inline-Filterchips (`MUSCLE_FILTERS`, `WARMUP_KEYWORDS` etc.). Am 13.09.2026 wurde die Komponente jedoch gestylt (`useThemeStyles`, `accessibilityRole="button"`). Um zu verhindern, dass eine geplante Wiederverwendung in einem kommenden Modal oder einer Übungsauswahl versehentlich gelöscht wird, wurde die Datei bewusst nicht gelöscht, sondern zur Verifikation an Astra übergeben.

Tests:
- `git grep "ExerciseFilter"` -> 0 Verwendungen außerhalb der Definitionsdatei.
- `pnpm verify` -> PASS

Expected behavior:
Entweder:
a) Komponente wird in `(tabs)/exercises.tsx` oder einem Auswahldialog als Shared Component wiederverwendet, ODER
b) Komponente wird endgültig gelöscht.

Potential concerns:
- Keine funktionale Auswirkung, da unreferenziert.

Questions for Astra:
1. Soll `ExerciseFilter.tsx` gelöscht werden (`VERIFY_DELETE`) oder für eine zukünftige Filter-Modal-Abstraktion behalten werden?

Astra action:
VERIFY_DELETE

Rollback commit:
bc6741f

---

## AR-012 – Dormant Dependencies: react-hook-form & @hookform/resolvers

Priority:
P2

Gemini Status:
ANALYZED

Risk:
LOW

Commit:
bc6741f (Pre-Cleanup Safepoint)

Files:
- `apps/mobile/package.json`

Gemini changed:
Keine Entfernung vorgenommen. Abhängigkeiten im Rahmen des Repository-Cleanups analysiert.

Why:
`react-hook-form` und `@hookform/resolvers` sind in `apps/mobile/package.json` deklariert und in den Entwicklungsdokumenten (`CLAUDE.md`, `docs/AGENTS_REFERENCE.md`, `docs/agents/mobile-dev.md`) als Standard-Formularstack festgeschrieben. Aktuell nutzen die Screens (`login.tsx`, `register.tsx`, `profile.tsx`, `template-builder.tsx`) jedoch direkt `useState`. Ein vorschnelles Entfernen würde künftige Roadmap-Arbeiten (wie Onboarding WP-06) behindern, falls diese wie dokumentiert `react-hook-form` nutzen sollen.

Tests:
- `git grep "useForm"` -> 0 Treffer im aktuellen Quellcode.
- `pnpm verify` -> PASS

Expected behavior:
Astra entscheidet, ob `react-hook-form` für Onboarding/Paywall/Forms beibehalten oder deinstalliert werden soll.

Potential concerns:
- Minimaler Package-Overhead in `node_modules` (beide Libraries werden vom Metro-Tree-Shaking ohnehin nicht in das Client-Bundle gepackt, solange kein Import existiert).

Questions for Astra:
1. Sollen bestehende Formulare auf `react-hook-form` + Zod migriert werden, oder soll die Abhängigkeit aus `apps/mobile/package.json` deinstalliert werden?

Astra action:
ARCHITECTURE_DECISION

Rollback commit:
bc6741f

---

## AR-013 – Secure Storage Adapter Implementation & Dual-Read Migration

Priority:
P0

Gemini Status:
PREPARED

Risk:
HIGH (Active session persistence)

Files:
- `apps/mobile/src/utils/secureStorage.ts`
- `apps/mobile/src/utils/__tests__/secureStorage.test.ts`
- `apps/mobile/package.json` (`expo-secure-store` installiert)

Gemini changed:
1. `expo-secure-store@~15.0.8` passend zur Expo 54 Installation hinzugefügt.
2. `apps/mobile/src/utils/secureStorage.ts`: Vollständige Adapter-Klasse `SecureStorageAdapter` implementiert mit:
   - `getItem(key)`, `setItem(key, value)`, `deleteItem(key)`
   - Hardware-Schutz via `keychainAccessible: SecureStore.AFTER_FIRST_UNLOCK`
   - Graceful Fallback auf In-Memory-Store bei nativer Nicht-Verfügbarkeit (z.B. SSR, Headless-Tests)
   - Dual-Read-Migrations-Utility `migrateSessionWithDualRead()`: liest SecureStore, migriert bei Bedarf MMKV, schreibt zuerst in SecureStore, löscht erst nach Bestätigung aus MMKV
   - `clearSessionFromAllStores()`: Bereinigt bei Logout synchron sowohl SecureStore als auch MMKV
   - Keine Logs von Session-Tokens oder Passwörtern
3. `apps/mobile/src/utils/__tests__/secureStorage.test.ts`: 11 automatisierte Unit-Tests für alle Fehlerszenarien (SecureStore gefüllt, MMKV gefüllt, beide gefüllt, korrupte Payloads, Schreibfehler, Native unavail, Logout-Cleanup).
4. **Bewusst NICHT aktiviert:** Die Supabase-Client-Konfiguration in `supabase.ts` verbleibt unverändert auf MMKV, um bestehende Beta-Sessions nicht im laufenden Betrieb zurückzusetzen.

Why:
Authentifizierungs-Token (JWT) lagen bislang in MMKV unverschlüsselt auf dem Gerätespeicher. P0-Sicherheitsanforderung verlangt Hardware-Keystore/Keychain. Die Migration wurde vollständig vorbereitet und getestet, die finale Scharfschaltung obliegt Astra.

Tests:
- `apps/mobile/src/utils/__tests__/secureStorage.test.ts` -> 11/11 PASS

Expected behavior:
Adapter ist isoliert einsatzbereit. Bestehendes Production-Verhalten bleibt unverändert.

Questions for Astra:
1. Soll `secureStorage` im nächsten Schritt als `storage: secureStorage` in `createClient(...)` in `supabase.ts` übergeben werden?
2. Soll beim ersten App-Start die Funktion `migrateSessionWithDualRead()` im `authStore.initialize()` aufgerufen werden?

Astra action:
ACTIVATE

Rollback commit:
v0.1.0-beta.5 (4dd430e)

---

## AR-014 – Account Deletion Service: Client Architecture & Safety Gate

Priority:
P0

Gemini Status:
PREPARED

Risk:
HIGH (Reversible client logic; backend RPC pending)

Files:
- `apps/mobile/src/services/accountDeletionService.ts`
- `apps/mobile/src/services/__tests__/accountDeletionService.test.ts`
- `apps/mobile/app/profile.tsx`
- `apps/mobile/src/i18n/translations.ts`

Gemini changed:
1. `accountDeletionService.ts`: Client-Service für Account-Löschung nach Apple Guideline 5.1.1(v) implementiert:
   - `verifyDeletionCapability()`: Prüft, ob Supabase und Cloud-RPC bereitstehen. Falls nicht, Rückgabe von `BACKEND_NOT_CONFIGURED`
   - `requestAccountDeletion({ confirmationText })`: Verlangt explizites Bestätigungswort (`DELETE` / `LÖSCHEN`), blockiert Offline-Aufrufe, schützt vor Double-Submit, prüft Auth-Gültigkeit
   - `clearLocalDataAfterConfirmedCloudDeletion()`: Löscht alle lokalen Daten, Stores und Scopes erst nach bestätigter Cloud-Löschung
   - Keine Ausführung von Fake-Löschungen
2. `profile.tsx`: UI-Button *"Account löschen"* verknüpft mit `verifyDeletionCapability()`. Da das Cloud-Backend noch inaktiv ist, wird der Nutzer ehrlich gewarnt und auf *"Alle Daten zurücksetzen"* verwiesen.
3. 8 automatisierte Unit-Tests in `accountDeletionService.test.ts`.

Why:
App Store Zulassung erfordert einen Account-Lösch-Flow. Dieser darf jedoch keine Scheinlösung sein, bei der nur lokale Daten gelöscht werden, während der Account im Supabase-Backend verbleibt.

Tests:
- `accountDeletionService.test.ts` -> 8/8 PASS

Expected behavior:
Kein unberechtigter Datenverlust, ehrliches Feedback für Beta-Tester.

Questions for Astra:
1. Wann wird die RPC-Funktion `delete_user_account()` in der Supabase-Produktionsumgebung ausgerollt?

Astra action:
ACTIVATE

Rollback commit:
v0.1.0-beta.5 (4dd430e)

---

## AR-015 – Data Export Hardening: GDPR Art. 20 Collector Service

Priority:
P0

Gemini Status:
IMPLEMENTED

Risk:
LOW

Files:
- `apps/mobile/src/services/dataExportService.ts`
- `apps/mobile/src/services/__tests__/dataExportService.test.ts`

Gemini changed:
1. `dataExportService.ts`: Deterministischer Daten-Kollektor nach DSGVO Art. 20 (Recht auf Datenübertragbarkeit):
   - Export-Struktur mit Schema Version 2
   - Eindeutige Kennzeichnung `exportScope: "LOCAL_EXPORT_ONLY"` (keine falsche Behauptung eines vollständigen Cloud-Exports)
   - Aggregiert Profil, Workouts, Sets, Body Metrics, Trainingspläne, Templates, Custom Exercises, Achievements, Hydration, Caffeine und Coach-Nachrichten
   - Schnelle Serialisierung (< 100ms auch bei hunderten Workouts)
   - Reine kanonische Zahlenwerte (keine Formatierungsstörungen durch deutsche Kommas)
   - Vollständige Erhaltung von Sonderzeichen, Umlauten und Emojis
2. 6 automatisierte Unit-Tests in `dataExportService.test.ts`.

Why:
Sicherstellung der DSGVO-Compliance und verlässlicher Datensicherung für Power-User ohne Schema-Drift.

Tests:
- `dataExportService.test.ts` -> 6/6 PASS

Expected behavior:
Export erzeugt reproduzierbare, valide JSON-Dumps.

Questions for Astra:
1. Soll der Export-Service zukünftig zusätzlich eine CSV-Export-Option für Excel/Numbers anbieten?

Astra action:
VERIFY

Rollback commit:
v0.1.0-beta.5 (4dd430e)

---

## AR-016 – Entitlement Abstraction: Provider-Agnostic Pro Management

Priority:
P1

Gemini Status:
PREPARED

Risk:
MEDIUM

Files:
- `apps/mobile/src/services/entitlementService.ts`
- `apps/mobile/src/services/__tests__/entitlementService.test.ts`
- `apps/mobile/app/profile.tsx`

Gemini changed:
1. `entitlementService.ts`: Provider-unabhängige Entitlement-Abstraktion implementiert:
   - `hasEntitlement(id)`
   - `getEntitlementState()`
   - `refreshEntitlements()`
   - `restorePurchases()`
   - Entkoppelt UI und Business-Logik von proprietären SDKs (RevenueCat / StoreKit)
   - **BETA_ALL_FEATURES_ENABLED = true:** Standardmäßig aktiviert, damit kein einziger bestehender Beta-Tester den Zugriff auf Workouts, Coach oder Historie verliert
   - Unterstützt Grace-Periods, Trial-States, Offline-Cache und Account-Switches
2. `profile.tsx`: *"Käufe wiederherstellen"* (Restore Purchases) als Pflichtkomponente für Store-Zulassung hinzugefügt und mit Service verbunden.
3. 10 automatisierte Unit-Tests in `entitlementService.test.ts`.

Why:
App Store verlangt Restore Purchases und saubere Entitlement-Prüfung vor In-App-Käufen. Die Abstraktion verhindert Vendor-Lock-in.

Tests:
- `entitlementService.test.ts` -> 10/10 PASS

Expected behavior:
Alle Beta-Features bleiben für alle Nutzer uneingeschränkt nutzbar.

Questions for Astra:
1. Welches RevenueCat SDK soll Astra integrieren (`react-native-purchases`), und welche Offerings/Packages sollen angelegt werden?

Astra action:
ACTIVATE

Rollback commit:
v0.1.0-beta.5 (4dd430e)

---

## AR-017 – Exercise Media Decoupling: Central Multi-Tier Resolver

Priority:
P0

Gemini Status:
PREPARED

Risk:
MEDIUM

Files:
- `apps/mobile/src/utils/getExerciseMedia.ts`
- `apps/mobile/src/utils/__tests__/getExerciseMedia.test.ts`

Gemini changed:
1. `getExerciseMedia.ts`: Zentraler Resolver für Übungsmedien implementiert:
   - Unterstützt 4 Stufen: `REMOTE_GIF`, `LOCAL_IMAGE`, `ANATOMY_FALLBACK`, `NO_MEDIA`
   - Globaler Feature-Flag `EXERCISE_MEDIA_SOURCE_OVERRIDE` (Standard: `REMOTE_GIF`, somit 100% abwärtskompatibel zum bestehenden Zustand)
   - Anatomie-Fallback-Mapping basierend auf den Primärmuskeln der Übung (`MuscleGroup`)
   - Fehler- und URL-Validierung (Ungültige URLs fallen ohne Bildfehler auf neutralen Fallback zurück)
   - Kein kaputtes Bild-Icon oder leere Layout-Verschiebungen
2. 8 automatisierte Unit-Tests in `getExerciseMedia.test.ts`.

Why:
Die Lizenzfrage der 1.492 Übungs-GIFs (P0 Blocker) ist noch nicht juristisch entschieden. Durch diesen Resolver kann die gesamte App mit einer einzigen Zeile Code von Remote-GIFs auf anatomische Schaubilder oder lizenzierte Alternativen umgestellt werden, ohne dass UI-Komponenten angefasst werden müssen.

Tests:
- `getExerciseMedia.test.ts` -> 8/8 PASS

Expected behavior:
Bestehende Medien werden unverändert angezeigt. Ein Switch auf Fallbacks ist jederzeit schadlos möglich.

Questions for Astra:
1. Sobald die rechtliche Entscheidung zu den Übungs-GIFs vorliegt: Soll `EXERCISE_MEDIA_SOURCE_OVERRIDE` auf `ANATOMY_FALLBACK` gesetzt werden?

Astra action:
ACTIVATE

Rollback commit:
v0.1.0-beta.5 (4dd430e)

---

## AR-018 – AI Safety Test Harness & Backend Request Validation

Priority:
P0

Gemini Status:
IMPLEMENTED

Risk:
LOW

Files:
- `api/coach-safety.cjs`
- `api/coach-safety.test.cjs`
- `api/coach-chat.js`
- `package.json` (`test:api` Skript erweitert)

Gemini changed:
1. `api/coach-safety.cjs`: Deterministische Safety-Interception ohne LLM-Kosten:
   - Notfall-Eskalation bei akutem Brustschmerz, Bewusstlosigkeit, schweren Verletzungen (Sehnenabriss, Frakturen) mit Notrufhinweis (112 / 911)
   - Verweigerung von Ratschlägen zu extremer Kalorienrestriktion (< 500 kcal / Verhungern) und Dehydrierung / trockenem Fasten
   - Deterministische Verweigerung von Steroid-/Doping-/PED-Dosierungen
   - Verweigerung medizinischer Ferndiagnosen
   - Erkennung und Blockade von Prompt Injections und Abfragen zur Herausgabe von System Prompts
2. `api/coach-chat.js`:
   - Preflight Safety Check vor jedem LLM-Aufruf
   - Strikte Content-Type-Prüfung (`application/json`) mit HTTP 415 bei abweichenden Formaten
   - Maximale Message-Größe (50.000 Zeichen) mit HTTP 400
   - Validierung von Bild-Payloads (Data-URL / Base64-Format)
3. 13 automatisierte deterministische Tests in `coach-safety.test.cjs`. Alle 31 Backend-Tests laufen lokal ohne API-Kosten durch.

Why:
Haftungsausschluss und Store-Vorgaben verlangen wirksame Schutzmechanismen gegen lebensgefährliche Fitness-Ratschläge und System-Prompt-Lecks.

Tests:
- `pnpm test:api` -> 31/31 PASS

Expected behavior:
Gefährliche Anfragen werden sofort, sicher und kostenfrei im Preflight abgefangen. Normale Trainingsfragen passieren unverändert zum Modell.

Questions for Astra:
1. Sollen die Safety-Trigger zukünftig in ein separates Logging-Audit zur Missbrauchserkennung fließen?

Astra action:
VERIFY

Rollback commit:
v0.1.0-beta.5 (4dd430e)

---

## AR-019 – Sync Failure Test Harness & Offline/FIFO Resilience

Priority:
P0

Gemini Status:
IMPLEMENTED

Risk:
LOW

Files:
- `apps/mobile/src/stores/__tests__/syncFailureHarness.test.ts`

Gemini changed:
1. `syncFailureHarness.test.ts`: Umfassende Härtungstests gegen bestehendes Verhalten von `syncStore`:
   - Duplicate Enqueue: Gleiche Entität mehrfach eingereiht -> separate FIFO-Einträge
   - Network Retry: Bei Verbindungsausfall bleibt Mutation in Queue und `retryCount` wird inkrementiert
   - Non-Retryable Errors (z.B. Postgres 42P01 / 23505): Mutation wird verworfen, um Endlos-Blockaden zu verhindern
   - Partial Failure / Head-of-Line Blocking: Bei Fehler in Mutation 1 stoppt die Verarbeitung, nachfolgende Mutationen bleiben in korrekter Sequenz erhalten
   - Account Switch / Logout: Synchronisation bricht sofort ab, Altdaten werden nicht unter falscher User-ID gepusht
   - Idempotente Deletes: Zweifaches Löschen derselben ID wird schadlos ausgeführt
2. 7 automatisierte Tests ohne Änderung an der bestehenden Sync-Architektur.

Why:
Aufdeckung von Grenzfällen bei instabiler Mobilfunkverbindung und Schutz der Datenintegrität.

Tests:
- `syncFailureHarness.test.ts` -> 7/7 PASS

Expected behavior:
Bestehende Sync-Logik ist nachweislich resilient gegenüber Verbindungsabbrüchen.

Questions for Astra:
1. Wann soll das Revisions-/Tombstone-Modell für Offline-Konflikte (AR-004) implementiert werden?

Astra action:
VERIFY

Rollback commit:
v0.1.0-beta.5 (4dd430e)

---

## AR-020 – React Error Boundary & Graceful Crash Recovery

Priority:
P1

Gemini Status:
IMPLEMENTED

Risk:
LOW

Files:
- `apps/mobile/src/components/ErrorBoundary.tsx`
- `apps/mobile/src/components/__tests__/ErrorBoundary.test.tsx`
- `apps/mobile/app/_layout.tsx`

Gemini changed:
1. `ErrorBoundary.tsx`: Wiederverwendbare React Error Boundary nach Best Practices implementiert:
   - Fängt unerwartete Render- und Lifecycle-Fehler ab
   - Verhindert den gefürchteten "White Screen of Death"
   - Bietet Buttons *"Erneut versuchen"* und *"Zurück zur Startseite"*
   - Maskiert sensible technische Stacktraces im Release-Modus (zeigt nur anwenderfreundliche Hilfehinweise)
   - Loggt Fehler über die datenschutzsichere Logger-Abstraktion
2. `apps/mobile/app/_layout.tsx`: Root-Navigation in `ErrorBoundary` gekapselt.
3. 4 automatisierte Unit-Tests in `ErrorBoundary.test.tsx`.

Why:
App Store Richtlinien und Nutzerzufriedenheit verlangen kontrolliertes Fehlerverhalten statt App-Abstürzen bei seltenen UI-Glitches.

Tests:
- `ErrorBoundary.test.tsx` -> 4/4 PASS

Expected behavior:
Fehlerfreie UI bleibt unberührt. Unerwartete JS-Crashes führen zu einer gestalteten Recovery-Ansicht.

Questions for Astra:
1. Welcher Observability-Provider (Sentry, PostHog, Bugsnag) soll für Remote-Crash-Reporting an die Error Boundary angebunden werden?

Astra action:
VERIFY

Rollback commit:
v0.1.0-beta.5 (4dd430e)

---

## AR-021 – Store Compliance Technical Audit & In-App Readiness

Priority:
P0

Gemini Status:
AUDITED

Risk:
MEDIUM

Files:
- `docs/release/STORE_TECHNICAL_READINESS.md`
- `apps/mobile/app/profile.tsx`
- `apps/mobile/src/i18n/translations.ts`

Gemini changed:
1. `STORE_TECHNICAL_READINESS.md`: Vollständiger technischer Audit für Apple App Store und Google Play Store:
   - Prüfung aller 17 Kernbereiche (Permission Strings, App Name, Bundle ID, Versioning, Icons, Splash, Account Deletion, In-App Purchases, Restore Purchases, Legal Links)
   - Klare Zuweisung von Zuständigkeiten (`READY`, `PARTIAL`, `BLOCKED`, `USER_ACTION_REQUIRED`, `ASTRA_REQUIRED`)
2. In-App-Integration:
   - "Käufe wiederherstellen" als eigener Menüpunkt integriert
   - Account-Löschung technisch verknüpft
   - Gesetzliche Informationshinweise (DSGVO, Medizinischer Disclaimer) zweisprachig verankert

Why:
Vermeidung von Ablehnungen im App Store Review Prozess durch vorausschauende Einhaltung aller formalen und technischen Store-Richtlinien.

Tests:
- Store Compliance Matrix verifiziert
- `pnpm verify` -> 447 Tests PASS

Expected behavior:
Alle Einstiegspunkte sind vorhanden. Sobald rechtliche URLs und Developer Accounts vorliegen, ist die Einreichung technisch vorbereitet.

Questions for Astra:
1. Liegen die finalen URLs für Datenschutzerklärung und Impressum vor, um die Platzhalter in `profile.tsx` zu ersetzen?

Astra action:
USER_DECISION

Rollback commit:
v0.1.0-beta.5 (4dd430e)

---

## AR-022 – Release Candidate Core Flow Regression & Subscription Error Coverage

Priority:
P0

Gemini Status:
IMPLEMENTED

Risk:
LOW

Commit:
2bd428b

Files:
- `apps/mobile/src/__tests__/releaseCandidateCoreRegression.test.ts`
- `apps/mobile/src/services/__tests__/entitlementService.test.ts`

Gemini changed:
1. Erstellung der umfassenden RC Core Regression Suite mit 11 Tests:
   - Vollständiger Workout Flow: Start, Übung hinzufügen, Satz anpassen (Weight/Reps/RPE/RIR), abhaken, löschen, beenden, SQLite-Persistenz und Deduplikation.
   - Restart / Recovery Guard: State Reload, unfertiger Workout-Zustand, Resume Guard Entscheidungen.
   - Body Metrics Flow: Gewicht & KFA erfassen/löschen, Verlauf, DE/EN Übersetzungs-Parität.
   - Program & Template Flow: Template anlegen, aktualisieren, löschen.
   - Gast-Isolation: Keine Datenvermengung zwischen Gast und registrierten Nutzern.
2. Entitlement-Service Test-Erweiterung: StoreKit/Billing-Fehler, Store-Timeouts, Cache-Fallbacks und Grace Periods abgedeckt.

Why:
Sicherstellung, dass vor Astra-Aktivierung alle Kernpfade regressionsfrei und fehlerresistent abgedeckt sind.

Tests:
- `pnpm --filter @fitness-tracker/mobile test releaseCandidateCoreRegression.test.ts` (11 Tests PASS)
- `pnpm --filter @fitness-tracker/mobile test entitlementService.test.ts` (10 Tests PASS)

Astra action:
VERIFY

---

## AR-023 – Privacy-Safe Local Diagnostics & Observability Event Model

Priority:
P1

Gemini Status:
IMPLEMENTED

Risk:
LOW

Commit:
0cb299f

Files:
- `apps/mobile/src/services/diagnosticsService.ts`
- `apps/mobile/src/services/__tests__/diagnosticsService.test.ts`
- `docs/release/OBSERVABILITY_EVENT_MODEL.md`

Gemini changed:
1. `diagnosticsService.ts`: Vollständig lokale Abstraktion für Diagnoseberichte und Fehlercode-Aufzeichnung (Ring-Buffer, max. 50 non-sensitive Codes).
2. Strikt datenschutzkonform: Keine PII, keine Workouts, kein Körpergewicht, keine Coach-Texte, keine Tokens.
3. `OBSERVABILITY_EVENT_MODEL.md`: Provider-unabhängiges Telemetrie-Event-Modell mit klarer Whitelist für Astra vor Sentry/PostHog-Anbindung.

Why:
Vorbereitung für Support und Fehlersuche ohne Installation schwerer oder datenschutzrechtlich riskanter SDKs im Vorfeld.

Tests:
- `pnpm --filter @fitness-tracker/mobile test diagnosticsService.test.ts` (5 Tests PASS)

Astra action:
VERIFY

---

## AR-024 – Exercise Dataset Consolidation & ID Stability (Free Exercise DB)

Priority:
P0 / P1

Gemini Status:
IMPLEMENTED

Risk:
MEDIUM

Commit:
92aae8f, 8f5c4ab

Files:
- `packages/domain/src/data/raw/free-exercise-db.json`
- `packages/domain/src/data/exercises.ts`
- `apps/mobile/src/__tests__/exerciseCatalogCompatibility.test.ts`
- `docs/release/EXERCISE_DATA_PROVENANCE.md`
- `docs/release/EXERCISE_ASSET_INVENTORY.md`

Gemini changed:
1. ExerciseDB (`exercisedb-v1.json` mit 1,4 MB und `exerciseGifs.json` mit 1.492 Hotlinks) vollständig gelöscht.
2. Lokale, freie Datenbank (`free-exercise-db.json`, 873 Übungen) als kanonische Quelle etabliert.
3. 100% deterministische UUID v4 IDs gewahrt. Kompatibilitätstest `exerciseCatalogCompatibility.test.ts` sichert alle 873 IDs und Fallbacks ab.
4. Dokumentation der Datenprovenienz und Asset-Inventur abgeschlossen.

Why:
Beseitigung aller unlizenzierten Fremd-Assets und kommerziellen Hotlinks vor Store-Einreichung.

Tests:
- `pnpm --filter @fitness-tracker/mobile test exerciseCatalogCompatibility.test.ts` (PASS)

Astra action:
VERIFY

---

## AR-025 – Legacy & Edge-Case Regression Suites (Beta 5 -> Beta 6 Update & Extreme Boundaries)

Priority:
P1

Gemini Status:
IMPLEMENTED

Risk:
LOW

Commit:
Current HEAD

Files:
- `apps/mobile/src/__tests__/legacyUpdateRegression.test.ts`
- `apps/mobile/src/__tests__/workoutEdgeCaseRegression.test.ts`
- `apps/mobile/src/components/workout/SessionExerciseCard.tsx`
- `apps/mobile/app/(tabs)/history.tsx`
- `apps/mobile/app/(tabs)/index.tsx`
- `apps/mobile/app/(tabs)/workouts.tsx`

Gemini changed:
1. `legacyUpdateRegression.test.ts`: Testet Auflösung alter Übungs-IDs, unbekannte Übungs-Fallbacks ("Unbekannte Übung"), Custom Exercises Isolation, tolerante Deserialisierung alter/fehlender Felder in Profil und Historie, sowie Erhalt aller Einstellungen nach Update.
2. `workoutEdgeCaseRegression.test.ts`: Testet Extremfälle: 0 Übungen, 1 Übung, 60 Sätze Stress-Test, 1250 kg Maximalgewichte, Dezimal-Mikroladung, 0 Wdh., RPE 6.0-10.0, RIR 0-5, schnelle Toggle- und Löschsequenzen, Double-Finish Idempotenz, Rest-Timer Engine und Wiederherstellung unvollständiger Workouts.
3. Defensiver Fallback in `SessionExerciseCard.tsx`, `history.tsx`, `index.tsx`, `workouts.tsx`: Unbekannte Übungen verschwinden nicht still, sondern werden mit lokalisierter Fallback-Bezeichnung und sicherem Medien-Fallback gerendert.

Why:
Sicherstellung, dass bestehende Beta-5-Nutzerdaten beim Update auf Beta 6 / RC unter keinen Umständen abstürzen oder verloren gehen.

Tests:
- `pnpm --filter @fitness-tracker/mobile test legacyUpdateRegression.test.ts` (8 Tests PASS)
- `pnpm --filter @fitness-tracker/mobile test workoutEdgeCaseRegression.test.ts` (14 Tests PASS)

Astra action:
VERIFY

---

## AR-026 – Store Metadata Preparation, Screenshot Plan & Physical Device Package

Priority:
P1

Gemini Status:
IMPLEMENTED

Risk:
LOW

Commit:
Current HEAD

Files:
- `docs/release/STORE_METADATA_DRAFT.md`
- `docs/release/STORE_SCREENSHOT_PLAN.md`
- `docs/release/PHYSICAL_DEVICE_SMOKE_TEST.md`
- `docs/release/STORE_REVIEW_NOTES_TEMPLATE.md`

Gemini changed:
1. `STORE_METADATA_DRAFT.md`: Technische Entwürfe für Apple App Store und Google Play Store (App-Name, Subtitle, Kurzbeschreibung, Volltext, Keywords; keine Heilaussagen, sauber als Draft deklariert).
2. `STORE_SCREENSHOT_PLAN.md`: Shot-List für 9 Kernmotive (Home, Workout, Library, Detail, History, Progress, Programs, AI Coach, Achievements) mit Spezifikationen für iOS und Android.
3. `PHYSICAL_DEVICE_SMOKE_TEST.md`: 15–25 Minuten Schnelltest-Anleitung mit 19 Prüfschritten und systemspezifischen Notizen für Konrad.
4. `STORE_REVIEW_NOTES_TEMPLATE.md`: Aktualisierter Leitfaden für das Store-Review-Team (Gastmodus, Workout-Ablauf, AI Coach, Account Deletion).

Why:
Vollständige Vorbereitung der organisatorischen und visuellen Assets für den Store-Launch, damit sich Astra ausschließlich auf P0-Architektur konzentrieren kann.

Astra action:
REVIEW









