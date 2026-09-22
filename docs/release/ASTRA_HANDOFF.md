# ASTRA START HERE — aktueller Handoff 2026-09-22

## Aktueller Checkpoint — 22.09.2026: Batch 3 (Monetization Integration, Action Guards & Downgrade Preservation)

Gemini hat die bestehende 3-Tier-Monetarisierungsarchitektur (FREE / PRO / COACH) in den realen Produkt-Screens, Stores und Action Handlern fail-closed verdrahtet:

- **WP-05 / S7 — Template Limit & Downgrade Preservation (VERIFIED):**
  - Einstiegspunkte verdrahtet: `template-builder.tsx`, `workouts.tsx`, `builder.tsx`, `session.tsx`, `history/[id].tsx`.
  - Fail-closed Store Action Guards: `createTemplate` (`TEMPLATE_LIMIT_REACHED`), `updateTemplate` (`TEMPLATE_LOCKED`).
  - Deterministisches Downgrade: Älteste 2 Custom Templates editierbar; Rest read-only. Zero Deletion. Re-Upgrade stellt Vollzugriff wieder her.
- **WP-05 / S7 — Program Gating (VERIFIED):**
  - Einstiegspunkte verdrahtet: `programs.tsx`, `builder.tsx`, `workouts.tsx`.
  - Store Action Guards: `createProgram`, `updateProgram` (`PROGRAM_FEATURE_LOCKED`).
  - Downgrade: Alle Programme bleiben gespeichert und lesbar/startbar; strukturelles Editieren gesperrt.
- **WP-05 / S7 — RPE / RIR & Metrics Gating (VERIFIED):**
  - UI Guards in `SessionExerciseCard.tsx` und `body.tsx`.
  - Store Action Guards: `workoutStore.updateSet` säubert RPE/RIR fail-closed; `bodyMetricStore.addMetric` säubert KFA/Umfänge und wirft `PREMIUM_METRIC_LOCKED`. Historische Werte bleiben 100% erhalten.
- **WP-05 / S7 — Appearance Gating (VERIFIED):**
  - Farbschema-Wechsel geschützt (`COLORWAY_LOCKED`); bei Downgrade automatischer sicherer Fallback auf `glacier` mit Speicherung der Auswahl in `savedPremiumColorway` und Wiederherstellung bei Re-Upgrade.
- **WP-05 / S7 — Coach Access & AI Write Safety (PREPARED & VERIFIED):**
  - Pro Plan Mode gesperrt (`COACH_PLAN_LOCKED`); AI Write erfordert Coach Tier und explizite User Confirmation (`saveCoachPlan.ts`).
  - Server Authoritative Quota Ledger: Bleibt `ASTRA_REQUIRED`.
- **Regressionssuite (12 Tests, VERIFIED):**
  - `apps/mobile/src/stores/__tests__/monetizationGating.test.ts` (12/12 PASS).
- **Gesamtmetriken:** **810 Tests PASS** (114 Domain + 631 Mobile in 92 Suiten + 49 Coach-API/Safety + 16 Security-Regressionen). `pnpm verify` PASS, `pnpm build:preview` Web-Export PASS (4.8 MB).

## Vorheriger Checkpoint — 22.09.2026: Batch 2 (Onboarding State Machine & Value Reveal)

Gemini hat den nach der Laptop-Unterbrechung unvollständigen Stand rekonstruiert, syntaktische und Typprobleme korrigiert und verifiziert:

- **WP-06 Task 06.01 — Onboarding State Machine (VERIFIED):**
  - Resumable, versionierte Onboarding State Machine (`CURRENT_ONBOARDING_VERSION = 1`) in Domain & `onboardingStore.ts`.
  - Vor-, Zurück- und Überspringen-Optionen mit hydrierter `createHydratedStorage`-Speicherung und Zod-Validierung.
  - 7 Tests in `onboardingStore.test.ts` (7/7 PASS).
- **WP-06 Task 06.02 — Datensparsame Präferenz-Erfassung (VERIFIED):**
  - Erfassung von Fitnessziel, Trainingslevel, Frequenz (1–7 Tage) und Equipment ohne sensible Gesundheitsdaten.
- **WP-06 Task 06.03 — Value Reveal Recommendation (VERIFIED):**
  - Pure deterministische Domain-Funktion `getPersonalizedPlanRecommendation` für Trainingsplan-Vorschläge vor Paywall-Anzeige.
  - 8 Tests in `onboardingLogic.test.ts` (8/8 PASS).
- **Gesamtmetriken:** **774 Tests PASS** (100 Domain + 609 Mobile in 89 Suiten + 49 Coach-API/Safety + 16 Security-Regressionen). `pnpm verify` PASS, `pnpm build:preview` Web-Export PASS (4.77 MB).

## Vorheriger Checkpoint — 22.09.2026: Batch 1 (Compliance, Operations & Monitoring)

Gemini hat den ersten Block der ausführbaren P0-Roadmap-Aufgaben vollständig implementiert und verifiziert:

- **WP-04 Task 04.05 — Asset License BOM (VERIFIED):**
  - Vollständige Software & Asset Bill of Materials in `THIRD_PARTY_NOTICES.md` konsolidiert.
  - Strikter Grundsatz: „UNKNOWN bleibt UNKNOWN“.
- **WP-05 Task 05.07 — Paywall Technical Compliance (VERIFIED / LEGAL_REVIEW_REQUIRED):**
  - StoreKit-/Play-Billing-konformes `PaywallModal.tsx` & `paywallStore.ts`.
  - Tatsächlich belasteter Gesamtpreis als primärer Preis; Monatsäquivalent ausschließlich als sekundäre Vergleichszeile; 7 Tage Testphase; Kündigungs-/Verlängerungsklauseln; Restore Purchases; AGB/Privacy-Links.
  - 8 Tests in `paywallCompliance.test.ts` (8/8 PASS).
- **WP-08 Task 08.01 — Observability & PII Sanitization (PREPARED):**
  - Datensparsamer `observabilityService.ts` mit automatischem Redigieren aller Fitness-, Workout-, Taillen-, Gewichts- und Coach-Rohdaten (`[REDACTED_SENSITIVE_KEY]`) sowie E-Mails/Tokens. Anbindung an `ErrorBoundary.tsx`.
  - 9 Tests in `observabilitySanitization.test.ts` (9/9 PASS).
- **WP-10 Task 10.02 — Apple Privacy Manifest & Required Reason APIs (PREPARED):**
  - `PrivacyInfo.xcprivacy` und Expo `app.json` mit allen 4 Required Reason API Kategorien (`UserDefaults`, `FileTimestamp`, `SystemBootTime`, `DiskSpace`) und Datentypen `Fitness`/`CrashData` (kein Tracking, nicht verknüpft).
  - 3 Tests in `privacyManifest.test.ts` (3/3 PASS).
- **WP-11 Task 11.03 — Production Incident Runbooks (PREPARED):**
  - 6 technische Notfall-Leitfäden in `docs/operations/INCIDENT_RUNBOOKS.md` für AI, DB/Sync, Secrets, Subscriptions, Bad Release und Privacy Breaches.
- **Gesamtmetriken:** **759 Tests PASS** (92 Domain + 602 Mobile in 88 Suiten + 49 Coach-API/Safety + 16 Security-Regressionen). `pnpm verify` PASS, `pnpm build:preview` Web-Export PASS (4.77 MB).

## Vorheriger Checkpoint — 22.09.2026: Recovery, Task 04.03 (AI Consent) & Task 02.06 (Guest Migration)

Gemini hat nach der Laptop-Abschaltung den Arbeitsstand vollständig rekonstruiert, verifiziert und erweitert:

- **WP-04 Task 04.03 — Versioned AI Consent (VERIFIED / LEGAL_REVIEW_REQUIRED):**
  - Technischer Mechanismus: `AiConsentSchema`, `CURRENT_AI_CONSENT_VERSION = 1`, `hasValidAiConsent` in Domain.
  - Fail-Closed-Guards: `coachStore.sendMessage` und `useCoachRecorder` verweigern jeden Request ohne gültigen Consent mit `AI_CONSENT_REQUIRED`.
  - UI-Integration: `coach.tsx` Consent-Card; `profile.tsx` Datenschutz-Sektion mit Version/Status, Akzeptieren und Widerrufen (inkl. nativer Bestätigung).
  - Zweisprachige Strings (DE/EN) in `translations.ts` mit striktem Tag `[LEGAL_REVIEW_REQUIRED]`.
  - 6 Tests in `apps/mobile/src/stores/__tests__/coachConsent.test.ts` (6/6 PASS).
- **WP-02 Task 02.06 — Safe Idempotent Guest Migration (VERIFIED):**
  - Transaktionale, idempotente Migration von Gast-Daten in Ziel-Account-Partition (`account:<uuid>`).
  - Workouts, eigene Übungen, Templates, Pläne, Körpermaße, Gamification/Level-XP und Profile.
  - Zero Data Loss & Rollback bei Fehlern; strikte Tenant-Isolation.
  - 9 Regressionsszenarien in `apps/mobile/src/stores/__tests__/guestMigration.test.ts` (9/9 PASS).
- **WP-01 Task 01.03 — Provisorische Identity (PARTIAL / PROVISIONAL):**
  - Display Name `EVARO`, iOS/Android Package `studio.skar.evaro`, Scheme `evaro`.
  - Bleibt `PARTIAL`, bis der finale Produktname durch den Nutzer ausdrücklich bestätigt wird.
- **Gesamtmetriken:** **739 Tests PASS** (92 Domain + 582 Mobile in 85 Suiten + 49 Coach-API/Safety + 16 Security-Regressionen). `pnpm verify` PASS, `pnpm build:preview` Web-Export PASS (4.76 MB).

## Vorheriger Checkpoint — 21.09.2026: Roadmap-Blöcke 1–5 (A11y, S4 Fixtures, Supply Chain Triage, S5 Deletion, AI Safety)

Gemini hat fünf sichere, reversible Roadmap-Blöcke auf `astra/p0-release-core` implementiert und verifiziert:

1. **Profile Cleanup & Accessibility / VoiceOver Audit (Block 1):**
   - Der überflüssige „Jahre / years“-Schriftzug/Badge über dem Geburtsdatums-Eintrag im Profilmenü (`apps/mobile/app/profile.tsx`) wurde restlos entfernt.
   - Systematischer A11y-Audit der Kernscreens (`RestTimer.tsx`, `AnatomyFigure.tsx`, `session.tsx`, `BattlePassModal.tsx`): Rollen (`button`), Accessibility-Labels mit Kontext & Werten, `accessibilityState` (`expanded`), Aktionen (`accessibilityActions`) und Einhaltung von Mindest-Touch-Targets ($\ge 44 \times 44$\,pt).
   - Automatisierte Barrierefreiheits-Tests in `apps/mobile/src/components/__tests__/accessibilityAudit.test.tsx` (6/6 PASS).
2. **S4 Sync Failure Fixtures (Block 2):**
   - 17 deterministische Resilienz- und Failure-Szenarien in `apps/mobile/src/stores/__tests__/syncFailureScenarios.test.ts` (17/17 PASS):
     - Request timeout, Connection loss während Push & Pull
     - Partielle, fehlerhafte (`malformed`), duplizierte und veraltete (`stale`) Server-Antworten
     - Fehlende untergeordnete Entitäten (`missing child entity`)
     - Fehlgeschlagene Remote-Löschung (sicherer Verbleib in Outbox)
     - Retry nach lokalem ACK-Fehler
     - Reconnect mit garantierter FIFO Outbox-Reihenfolge
     - Account-Switch-Isolation mit offenen Operationen (Tenant-Isolation)
     - Logout-Isolation mit offenen Operationen (Safe Halt ohne unauthentifizierte Writes)
     - Race-Condition: Antwort trifft nach lokaler Statusänderung ein (Pull Snapshot verworfen)
     - Duplicate completion (Idempotenz ohne Loop)
     - Leere Remote-Snapshots (Schutz vor versehentlichem Daten-Wipe ohne Tombstone)
     - Foreign user_id injection (Cross-Tenant Rejection)
   - Serverseitige Architektur (Tombstones, Revisionsvektoren, atomare Aggregate) bleibt strikt `ASTRA_REQUIRED`.
3. **Supply Chain Triage & Safe Minor/Patch Overrides (Block 3):**
   - Re-Analyse der 43 High Findings: 41 von 43 Findings wurden durch versionskompatible Minor-/Patch-Overrides in `pnpm-workspace.yaml` ohne Major Updates und ohne Expo SDK Upgrade behoben (`@xmldom/xmldom` 0.8.15 / 0.9.12, `brace-expansion` 1.1.21 / 2.1.7 / 5.0.12, `js-yaml` 3.15.2 / 4.3.2, `postcss` 8.5.18, `browserslist` 4.28.9, `form-data` 4.0.6, `vite` 8.0.16, `shell-quote` 1.10.0).
   - **Verbleibend:** Nur noch **2 High Findings** (beide `image-size` 1.2.1, DoS im ICNS/JXL-Parser). Fix erfordert `image-size >= 2.0.3` (Major-Bump mit Breaking Changes in `@expo/image-utils`). Als `EXPO_SDK_UPGRADE_REQUIRED` isoliert und nicht forciert.
   - Frozen install (`pnpm install --frozen-lockfile`) verifiziert in 809 ms.
4. **S5 Account Deletion Test Preparation (Block 4):**
   - Dedizierte Contract- und Resilienz-Suite in `accountDeletionContract.test.ts` (13/13 PASS):
     - Authentifizierter Nutzer zwingend erforderlich
     - Server leitet `auth.uid()` ab; Client übergibt niemals eine `user_id` (Schutz vor IDOR)
     - Idempotente Aufrufe und Schutz vor parallelen Mehrfach-Aufrufen (`DOUBLE_SUBMIT`)
     - Remote-Fehler (500, Timeout, Netzwerkabbruch) führt zu Zero Data Loss lokal
     - Partielle Server-Bereinigung, Auth-Löschungs-Fehler, Storage-Fehler und Provider-Fehler blockieren lokalen Wipe
     - Lokaler Daten-Wipe erfolgt strikt erst nach bestätigtem Cloud-Erfolg
     - Session-Revocation (`signOut`) unmittelbar nach Datenbereinigung
     - Account-Switch-Isolation
   - Supabase Backend/RPC-Deployment bleibt `ASTRA_REQUIRED`.
5. **AI Safety DE/EN zweisprachige Notfall- und Sicherheits-Schicht (Block 5):**
   - Zweisprachige (DE & EN) Notfall- und Guardrail-Logik in `api/coach-safety.cjs` und 49 Tests in `api/coach-safety.test.cjs` (49/49 PASS):
     - Akute Brustschmerzen, Dyspnoe / Atemnot, Bewusstlosigkeit, schwere Verletzungen
     - Starvation / Nulldiäten (<500 kcal), Dehydrierung / Trockenfasten, Steroid- / PED-Dosierungen, Diagnose-Anfragen
     - Prompt Injections, System Prompt Exfiltration, Payload-Grenzen (>50k Zeichen, ungültige Base64-Bilder, ungültige URL-Attachments)
     - Provider-Fehler 500/502/503 ohne Credential-Leaks
6. **Testmetriken:**
   - **721 Tests PASS** (92 Domain + 564 Mobile in 83 Suiten + 49 Coach-API/Safety + 16 Security-Regressionen).
   - Typecheck PASS, Lint PASS, Web-Export (`pnpm build:preview`) PASS (4.76 MB).

### Kanonische Security-Roadmap Governance (S0–S12)

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

## Vorheriger Checkpoint — 21.09.2026: Three-Phase Level/XP Progression Rebalance (Kandidat B)

## Vorheriger Checkpoint — 21.09.2026: UI/i18n Cleanup, Level/XP Rebalancing & Age UI

Gemini hat den UI/i18n-Bereich, die Level-Progression und das Alters-Badge bereinigt:

1. **Zentrale Level-/XP-Progression (Domain Single Source of Truth):**
   - Neue Domain-Logik `packages/domain/src/logic/levelProgression.ts` definiert $XP(L) = 200 \times (L - 1)^2 + 800 \times (L - 1)$ mit $L(XP) = \lfloor \sqrt{4 + \frac{XP}{200}} - 1 \rfloor$.
   - Progression deutlich verlangsamt: Level 1 -> 2 benötigt 1.000 XP (~7 Workouts). Level 10 = 23.400 XP, Level 20 = 87.400 XP, Level 50 = 519.400 XP.
   - Workout-Session-XP degressiv begrenzt: Base 50 XP, Sätze max 30 XP, Volumen max 110 XP, PRs max 75 XP (absolutes Cap pro Workout: 265 XP; typisch ~120-160 XP).
   - Kein Multi-Level-Sprung aus einem einzelnen normalen Workout mehr möglich.
   - Idempotenz-Schutz in `achievementStore.ts` via `awardedSessionIds`.
2. **Plans Create Modal (i18n):**
   - Translation Keys (`plans.createChoiceTitle`, `plans.createTemplate`, etc.) vollständig in `translations.ts` (DE/EN) hinterlegt. Keine raw Keys mehr sichtbar.
3. **Celebrations / Workout-Feier-Effekte (i18n):**
   - Titel, Untertitel, Effektnamen (Klassisch/Classic, Inferno, Neon-Pulse/Neon Pulse, Goldregen/Golden Rain, Matrix-Code/Matrix Code, Kosmisch/Cosmic) und Aktions-Alerts vollständig lokalisiert.
4. **LevelProgress & BattlePassModal (i18n):**
   - "bis Level..." / "to Level...", "Nächster Rank bei Level..." / "Next rank at Level..." und "Max Rank erreicht" / "Max Rank reached" dynamisch locale-aware angebunden.
5. **Age / Geburtstag UI Cleanup:**
   - Unnötiges Glitzer-Icon (`sparkles-outline`) aus dem Alters-Badge in `apps/mobile/app/profile.tsx` entfernt. Saubere Textdarstellung `{computedAge} {t('settings.yearsOld')}`, Accessibility-Label intakt.
6. **Teststatus:**
   - **673 Tests PASS** (88 Domain + 531 Mobile in 80 Suiten + 38 Coach-API/Safety + 16 Security-Regressionen).
   - Typecheck PASS, Lint PASS, Web Export (`pnpm build:preview`) PASS.
   - Keine Datenmigrationen, keine DB-Änderungen. Bestehende Gesamt-XP der Nutzer bleiben unverändert erhalten; das Level wird deterministisch aus der neuen Kurve abgeleitet.

## Früherer Checkpoint — 21.09.2026, Gemini Takeover & Preview Recovery

Gemini hat den von Astra unterbrochenen Block übernommen, stabilisiert und getestet:

1. **i18n Session-Telemetry vollständig abgeschlossen:**
   - In `WorkoutCompleteModal.tsx` sind alle Telemetrie-Texte, Fakten (Volumen, Dichte, Cardio, Warmup, Technik, Tipps), Einheiten (kg/lbs), Stat-Labels und Aktions-Buttons barrierefrei und vollständig DE/EN lokalisiert.
   - `WorkoutCompleteModal.test.tsx` repariert (`displayName` TS-Fehler behoben) und um umfassende DE/EN- sowie Edge-Case-Tests (leere Sätze, fehlende Übungsdefinition, Dauer 0, Unveränderlichkeit der Session-Daten) erweitert.
2. **Vercel Preview Build wiederhergestellt (Dual-Gate Architektur):**
   - Vercel-Fehlerursache: `build:preview` brach zuvor am unbereinigten `pnpm audit --audit-level high` mit Exit 1 ab.
   - Lösung (Option B): Neues Gate-Script `scripts/security/preview-security-gate.cjs` prüft strikt auf Zero Critical, verifiziert, dass keine Production-Secrets vorliegen, protokolliert alle 43 High / 14 Moderate Befunde transparent und kennzeichnet die Preview als `NON_RELEASE_BUILD`.
   - CI Release Gate in GitHub Actions (`.github/workflows/ci.yml`) bleibt unverändert strikt blockierend (`pnpm audit --audit-level=high`).
3. **Supply Chain Triage:**
   - Vollständiger Bericht in `docs/release/DEPENDENCY_AUDIT_REPORT.md`: Alle 43 High-Befunde (u.a. `@xmldom/xmldom`, `image-size`, `js-yaml`, `vite`) sind reine Build-/Dev-/Test-Tools mit **0 Client-Runtime-Reachability**.
4. **Vorbereitung für Astra (Reversibel, ohne voreilige Produktionsänderungen):**
   - S4 Sync Engine: `docs/architecture/S4_SYNC_PREPARATION.md` (Atomare Cloud-Writes, Idempotenz, Revisionsvektoren, Konfliktszenarien) -> `ASTRA_REQUIRED`.
   - S5 Account Deletion: `docs/architecture/S5_ACCOUNT_DELETION_SPEC.md` (Parametrisierungsfreier RPC-Vertrag, Cascade-Löschung, lokaler Wipe nach Server-Erfolg) -> `ASTRA_REQUIRED`.
   - AI Security: `docs/architecture/AI_SECURITY_PREPARATION.md` (DE/EN Notfall-Eskalationen, Quota-Interface) -> `ASTRA_REQUIRED`.
5. **Teststatus:**
   - **654 Tests PASS** (523 Mobile + 77 Domain + 38 Coach-API/Safety + 16 Security-Regressionen).
   - Typecheck PASS, Lint PASS, Web Build PASS, Gitleaks PASS.
   - Konkrete 11-Schritte-Testmatrix für den Nutzer auf iPhone Safari: `docs/release/IPHONE_FREE_TEST_GUIDE.md`.

## Aktueller Einstieg 20.09.2026 — iPhone Preview

Neuer Auftrag: kostenlose Safari-/Home-Screen-Testbarkeit als Ergänzung, SDK 54 beibehalten. Production/Store/Billing/Production-SQL bleiben bis erneuter ausdrücklicher Freigabe gesperrt. EAS-Projekt vom Nutzer verknüpft. Bestehende HTTPS-Astra-Preview `3bd4713` im Dashboard und Browser bestätigt; neuer lokaler Export mit Home-Screen-Metadaten, statischem WLAN-Server und sicherer Web-UUID-Alternative getestet. Native UUID-/Datenverträge unverändert. Anleitung und URLs: [IPHONE_FREE_TEST_GUIDE.md](IPHONE_FREE_TEST_GUIDE.md); genaue Evidenz/Gates: EXECUTION_STATUS.md.

Vercel-Git veröffentlicht bereits unabhängig von GitHub-Prüfungen. Deshalb neuer Branch-Build `build:preview` mit Verify/Audit vor Export; keine hohen Befunde für ein grünes Preview ignorieren. Vollständige SAST-/Lizenz-/Secret-/Backend-Verkettung bleibt offen. Alte HTTPS-URL und neuer lokaler Stand nicht gleichsetzen. Keine echte iPhone-/Supabase-Abnahme behaupten. S4-Serververtrag bleibt nächste Datenarbeit, danach S5; neue Preview-Freigabe benötigt zudem S1-Abhilfe. Historische Statusaussagen unten zum unbestätigten Hosting sind überholt.

## Neuester Auftrag 20.09.2026 — inkrementelle Main-Freigabe

Nutzer erlaubt jetzt Main-Integration abgeschlossener geeigneter Blöcke, mit konkreten Testanleitungen. Das hebt das frühere pauschale Main-Verbot auf, nicht die Release-Gates. Aktiver Beta-/Deploymentweg noch nicht bestätigt: Vercel-Datei vorhanden, EAS-Profile vorhanden, kein nachgewiesener automatischer nativer Rollout. Gesamtbranch wegen Geräte-/Security-Gates weiterhin nicht pauschal mergefähig. Testschritte: BETA_REGRESSION_MATRIX.md.

S4-Fortsetzung nach 51561d0: lokale Outbox-Änderungen (Enqueue, ACK, Retry, Clear) benutzen vorhandene SQLite-Transaktion mit Memory-Rollback. SQLite-Fehler beim ACK dürfen nicht durch spätere Statuswrites die zuvor nur im Speicher entfernte Operation endgültig löschen. Drei Regressionen gegen bisherigen Code rot; vier echte SQLite-Fault-Szenarien mit Restart/Retry-Prüfung ergänzt. Kein SQL-Serververtrag aktiviert; nächste Arbeit bleibt serverseitige Atomizität/Idempotenz/Konflikte. Messungen/Abschluss: EXECUTION_STATUS.md.

## Checkpoint 20.09.2026 — S4 Fehlergrenzen

S3 ist als **8b0a6e1** gepusht. Der folgende S4-Teilblock behandelt ignorierte Cloud-Fehler, unvollständige Pull-Antworten und lokale Teilübernahmen: vollständige Validierung vor Anwendung, Pending-Outbox-Guards, native SQLite-Transaktion mit Memory-Rollback. 18 neue Regressionen einschließlich echter SQLite-Fehlerinjektion; aktuelle Gesamtmessung in EXECUTION_STATUS.md. Keine persistente Formatmigration, keine Remote-Aktivierung. Risiko CRITICAL, S4 bleibt PARTIAL: serverseitige atomare Aggregate, Idempotenz, Revisionen/Konflikte/Tombstones fehlen weiterhin. Nächster sinnvoller Block ist dieser serverseitige Sync-Vertrag, danach Account-Deletion. Kein Main-Merge oder Beta-Rollout beauftragt.

Basis `origin/main`: `6471138`. Review-Branch: `astra/p0-release-core`. Neuester vorhandener Beta-Tag: `v0.1.0-beta.6`. Kein Main-Merge, keine Produktionsmigration, kein EAS-/OTA-Rollout. Konkrete Gates und Session-Ergebnis: [EXECUTION_STATUS](EXECUTION_STATUS.md). Vollständige Ist-/Roadmap-Matrix: [P0_READINESS_MATRIX](P0_READINESS_MATRIX.md).

## Erledigter lokaler Engineering-Block

Coach-Auth-Fix **3585062** gepusht, 603 Hosttests grün. Anschließend S3 lokal umgesetzt: PostgreSQL 17.11 isoliert ohne Docker; alter Cross-Account-FK-Angriff reproduziert; Migration `202609190001_rls_reference_ownership.sql` mit restrictive Guards und Bestands-/Lock-Gates. 304 SQL-Assertions PASS, nochmals mit zu großzügigen Testpolicies; negativer Migrations-Preflight erhält synthetischen Altbestand. Keine produktive Supabase-Änderung. Runner/Details: RLS_LOCAL_TEST_HARNESS.md. Nächster Datenblock: S4 Sync-Atomizität und Fehlersicherheit.

S1-Patch-Commit **26e29d1** ist gepusht. Nachfolgender S6-Fix: öffentlicher ALLOW_PROTOTYPE_COACH-Bypass entfernt; 401 ohne Token, ungültige Tokens werden bei Supabase geprüft. Serverinterne Local-Identity bei production/VERCEL gesperrt. Drei vorher rote Negativszenarien jetzt grün, 38 API-/Safety-Tests. Keine Remote-Bereitstellung. Restliche Pro-/Budget-/DE/EN-/Hosting-Gates bleiben offen.

Security-Governance ist als `27fccac` gepusht (Regeln/Threat Model/S0–S12/CI-Gates). Danach nanoid/undici/tar gezielt gepatcht: vier vorher rote Angriffsregressionen grün; **602 Tests, Typecheck/Lint, Build und Expo-Konfigurationen PASS**. Audit jetzt **57 (43 high/14 moderate)**, prod **52 (41 high/11 moderate)**. S1 bleibt PARTIAL; CI-Audit blockiert weiterhin. Keine Freigabe trotz grüner Funktionstests. Exakte Details: EXECUTION_STATUS.md und SECURITY.md.

P0-A SecureStore ist jetzt nativ in Supabase integriert. Gemini-Adapter wiederverwendet und unsichere Garantien korrigiert: kein flüchtiger Fallback, keine als leer verschluckten Lesefehler, verifizierte Writes, serialisierte Migration/Refresh/Logout, geprüfte Sessionstruktur und nicht sensible v1-Marker gegen Token-Resurrection. Beide Legacy-Quellen werden bereinigt. Authfehler zeigen feste DE/EN-Texte, keine Secrets. Bestehende SQLite-/Workoutdaten werden nicht geändert.

Status bleibt PARTIAL bis zur nativen Abnahme, insbesondere große vollständige Sessionwerte, App-Update mit gleicher Identität, Reboot/Lock/Kill/Offline, Backup/Neuinstallation und Rollback. [Migrationsvertrag](SECURE_STORAGE_MIGRATION_PLAN.md) vor Release lesen. Ein Revert auf die alte MMKV-only-App ist nach Migration **kein** Zero-Logout-Rollback. Keine automatische Veröffentlichung dieses Branches.

## Pre-Security Checkpoint

Checkpoint-Commit: `6c01522`, auf `origin/astra/p0-release-core` gepusht. Keine Main-Integration oder Produktionsänderung.
Branch: `astra/p0-release-core`. Date: 2026-09-19.

Gemini work reviewed: SecureStore, RLS/Sync, Account-Lifecycle/Export, AI/Billing, Diagnostics, Dataset, Regressionen und UI-/Releasevorarbeit. Klassifizierung steht in `EXECUTION_STATUS.md`.

Verified: `pnpm verify` mit 598 Tests (77 Domain, 484 Mobile, 37 API); Typecheck/Lint und Expo-Konfigurationen. Prepared but inactive: echtes Delete-Backend, Billing/Serverentitlements und vollständige Production-AI-Kontrollen. Known blockers: native Migration/Größe/Rollback, RLS-/Cloud-Abnahme, Providerkonfiguration, Legal/Billing/Devices.

**Security roadmap takeover starts after this checkpoint.** Neuer Nutzerauftrag: Security-Dateien im `evaro_release_execution_pack` lesen, Guardrails dauerhaft verankern, S0–S12 gegen Istzustand mappen; erster Security-Block Secrets/Supply Chain. Normale Feature-/Roadmap-Expansion bleibt eingefroren.

## Bereits inventarisierter nächster Daten-Security-Block: RLS, dann Sync

1. Lokaler PostgreSQL-Nachweis inzwischen hergestellt; portabler Server in output/, nicht systemweit installiert. Korrigierter Harness nutzt Assertions und Rollback. Weiterhin kein vollständiger Supabase Auth-/PostgREST-Nachweis.
2. 304 lokale Assertions prüfen alle elf Tabellen und fremde Referenzen. Vorbereitete Migration nicht blind deployen: tatsächliche Grants/Policies/Altbestände und Backup prüfen. Details und Reproduktion: RLS_LOCAL_TEST_HARNESS.md.
3. `syncStore.ts`: ignorierte Child-Delete-/Pull-Fehler; sequenzielle Aggregate-Ersetzung ohne Cloudtransaktion. Lokale FIFO-Outbox ist kein Cloud-Idempotenz-/Konfliktnachweis. Atomare RPCs plus begründete Revision-/Tombstone-Strategie gemeinsam mit echtem Backend testen.

## Weitere bestätigte P0-Risiken

- Account-Löschung: Client-Capability prüft nur Config/Auth; Erfolg nur `error:null`; Scope-Wechsel während Request nicht abgesichert, Cleanupfehler verschluckt. Backend-RPC/Auth-Cascade fehlt. Keinen Guard allein anhand alter Spec aktivieren.
- AI: Öffentlicher Prototyp-Bypass geschlossen. Weiterhin keine serverseitigen Pro-Entitlements, verteilten Quoten/Budgets oder nachgewiesenes HTTPS-Deployment. Deterministische Safety-Replies sind ausschließlich Deutsch; DE/EN selbst im Safety-Layer lösen.
- Billing: `BETA_ALL_FEATURES_ENABLED=true`, kein natives Kauf-SDK; Providerabstraktion vorbereitet. Keine Produktionsfreigabe aus Client-Pro ableiten.
- Export: lokal, kein vollständiger Cloud-/DSGVO-Nachweis. Medien: ExerciseDB technisch entfernt; Foto-Rechtekette weiterhin unbestätigt.
- Audit nach S1-Patches: 57 Befunde (43 high/14 moderate), prod 52. Kein pauschaler Ausschluss der Runtime-Exposition aus alten Berichten.

## Bestehende Vorarbeit erhalten

History-Tagesauswahl, direkte Plans-Erstellung und optionale Profildaten sind in `6471138` vorhanden. Free-DB-JSON entspricht exakt dem Beta-5-Blob; vorhandene Kompatibilitäts-/SQLite-/Scope-/UI-/Diagnostics-/API-Tests weiterverwenden. Vollständige i18n-/Screenreader-/Geräteabnahme bleibt offen. Feature Expansion bleibt eingefroren.

Alte Gemini-Berichte dokumentieren frühere Absichten und Testläufe; sie überschreiben diesen Handoff nicht. Keine Subagents ohne ausdrücklichen Auftrag. Ein sauberer P0-Block pro Commit, Review-Branch pushen, nicht automatisch nach main integrieren.

---

## Monetization Foundation Handoff — WP-05 / S7 (22.09.2026)

### 1. Reconstructed & Verified State
- **Branch:** `astra/p0-release-core`
- **Recovery Checkpoint:** Commit `97a14f2` (WP-06 Onboarding State Machine & Value Reveal, 14 tests PASS).
- **Monetization Foundation:** FREE / PRO / COACH Tier Hierarchy (`COACH` > `PRO` > `FREE`).
- **Total Repo Tests:** 798 PASS (114 Domain vitest, 619 Mobile jest, 49 API test runner, 16 Security scripts).
- **Web Export & Preview:** PASS (4.78 MB, safe-area viewport, Home Screen metadata, icon verified).

### 2. Architecture Implemented
1. **Tier Hierarchy & Capability Layer:** `packages/domain/src/schemas/entitlements.ts` defines `tier` (`free`, `pro`, `coach`) and `Capabilities` registry with 11 granular methods (`canCreateTemplate()`, `canUseRPE()`, `canUseCoachPlan()`, etc.). UI queries Capability Layer, never scattering ad-hoc `if (isPro)`.
2. **Launch Pricing Defaults:** `packages/domain/src/schemas/monetizationConfig.ts` documents launch baseline (Pro: 4.99 €/mo, 29.99 €/yr; Coach: 11.99 €/mo, 69.99 €/yr with 14-day trial). Explicitly decoupled: runtime uses localized store prices as authoritative source of truth.
3. **Dual-Context Paywall & Locked Feature Explanation:** `apps/mobile/src/stores/paywallStore.ts` and `apps/mobile/src/components/paywall/LockedFeatureModal.tsx` support contextual triggers (`pro` vs `coach`) and non-aggressive locked feature values reveal.
4. **Structured AI Action Drafts & Human Confirmation:** `packages/domain/src/schemas/aiActionDrafts.ts` defines strict schemas (`ProgramDraft`, `WorkoutTemplateDraft`, `Diff`). `canUseAIWrite()` is strictly `confirmation_required`—AI cannot mutate user data directly.
5. **Zero-Data-Loss Downgrade:** Templates beyond the free limit (2) and programs remain safely persisted as read-only on downgrade.
6. **Privacy-Preserving Telemetry:** `apps/mobile/src/services/monetizationAnalytics.ts` tracks 22 lifecycle events with zero leakage of prompts, workouts, or health metrics.

### 3. Open Gates for Astra (ASTRA_REQUIRED)
- Echte Store-In-App-Purchases via RevenueCat SDK (`react-native-purchases`).
- Webhook Ingestion & Supabase Migration (`public.subscriptions` & `public.users.tier`).
- Distributed / Serverseitiges AI Usage Ledger in `api/coach-chat.js`.
- Native iOS / Android In-App Purchase Sandbox Verification.
