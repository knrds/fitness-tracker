# EVARO – Gemini P0 Scaffolding Report

## Starting Point

- **Branch:** `main`
- **Commit:** `4dd430e`
- **Tag:** `v0.1.0-beta.5`
- **Tests:** 393 / 393 PASS (Clean Baseline)
- **Quality Gates:** Typecheck PASS, Lint PASS, Coach PASS, Web Build PASS

---

## Final Point

- **Branch:** `main`
- **Tag:** `v0.1.0-beta.5`
- **Tests:** 447 / 447 PASS (+54 neue automatisierte Tests)
- **Typecheck:** PASS (0 Errors across all workspaces)
- **Lint:** PASS (0 Warnings/Errors)
- **Coach Check:** PASS
- **Web Build:** PASS

---

## Implemented

### Security
- **Secure Storage Adapter (`apps/mobile/src/utils/secureStorage.ts`):** Vollständige `SecureStorageAdapter`-Klasse mit Hardware-Keychain-Schutz (`AFTER_FIRST_UNLOCK`), In-Memory-Fallback für Headless-Umgebungen und sicherem Logout-Purge.
- **Dual-Read Migration (`migrateSessionWithDualRead`):** Unterbrechungsfreie, transaktionale Migrationslogik von MMKV zu SecureStore mit 11 dedizierten Unit-Tests.
- **RLS Security Audit (`docs/release/RLS_SECURITY_AUDIT.md`):** Statischer Audit aller 9 user-owned Tabellen; Nachweis der Notwendigkeit von Remote-Foreign-Key- und Owner-Prüfungen.
- **RLS Negative Test Matrix (`docs/release/RLS_NEGATIVE_TEST_MATRIX.md`):** 9 Angriffsszenarien (User A liest/schreibt/löscht User B, anonyme Abfragen, expired JWT, wrong owner id).

### Data Integrity
- **Sync Failure Test Harness (`apps/mobile/src/stores/__tests__/syncFailureHarness.test.ts`):** 7 deterministische Härtungstests für duplicate enqueues, network retries, non-retryable errors, head-of-line blocking, account switches und idempotente Deletes.
- **Dependency Audit (`docs/release/DEPENDENCY_SECURITY_AUDIT.md`):** Audit aller direkten und transitiven Pakete; Isolierung von 2 transitiven Dev-ReDoS-Befunden in Vite 6.4.1.

### Account Lifecycle
- **Account Deletion Service (`apps/mobile/src/services/accountDeletionService.ts`):** Client-Abstraktion nach Apple Guideline 5.1.1(v) mit expliziter Bestätigungswort-Prüfung (`DELETE` / `LÖSCHEN`), Double-Submit-Sperre und Offline-Blockade.
- **Ehrliches Deletion Safety Gate:** Verhindert Fake-Löschungen, solange das Cloud-RPC im Backend noch inaktiv ist (`BACKEND_NOT_CONFIGURED`), und verweist transparent auf den lokalen Datenreset.
- **UI Integration in Profil (`apps/mobile/app/profile.tsx`):** Direkter Einstiegspunkt unter *Account & Synchronisation*.

### Export
- **GDPR Art. 20 Export Collector (`apps/mobile/src/services/dataExportService.ts`):** Zentralisierter, deterministischer Datenkollektor mit Schema Version 2.
- **Transparente Kennzeichnung:** Eindeutiges Flag `exportScope: "LOCAL_EXPORT_ONLY"` (keine irreführende Behauptung eines vollständigen Cloud-Backups).
- **Zahlen- und Textintegrität:** Numerische Werte serialisieren als kanonische Fließkommazahlen unabhängig von deutschen Display-Kommas; vollständige Erhaltung von Umlauten und Emojis.

### Entitlements
- **Provider-Agnostischer Entitlement-Service (`apps/mobile/src/services/entitlementService.ts`):** Saubere Entkopplung von Store-SDKs mit Cache-, Grace-Period- und Trial-Unterstützung.
- **Beta-Schutz (`BETA_ALL_FEATURES_ENABLED = true`):** Standardmäßig aktiv; kein bestehender Beta-Tester verliert Funktionen.
- **Restore Purchases UI:** *"Käufe wiederherstellen"* in `profile.tsx` integriert (Apple Guideline 3.1.1).

### Exercise Media
- **Central Multi-Tier Resolver (`apps/mobile/src/utils/getExerciseMedia.ts`):** Entkoppelt die UI von der ungelösten Lizenzfrage (1.492 GIFs).
- **4 Fallback-Stufen:** `REMOTE_GIF`, `LOCAL_IMAGE`, `ANATOMY_FALLBACK`, `NO_MEDIA` mit automatischem Muskelgruppen-Mapping (`MuscleGroup`).

### AI Safety
- **AI Safety Interceptor (`api/coach-safety.cjs`):** Deterministischer Preflight-Schutz für lebensbedrohliche Notfälle (Brustschmerz, Bewusstlosigkeit), extreme Kalorienrestriktion (< 500 kcal), trockenes Fasten, Doping/Steroide, Prompt Injections und System-Prompt-Leaks.
- **Backend Request Validation (`api/coach-chat.js`):** Strikte Content-Type-Prüfung (`application/json` -> HTTP 415), maximale Message-Länge (50.000 Zeichen -> HTTP 400) und Base64-Image-Validierung.
- **Keine API-Kosten:** Alle 13 Safety-Tests laufen lokal ohne LLM-Aufruf (insgesamt 31/31 API-Tests PASS).

### Dependencies
- `expo-secure-store@~15.0.8` passend zu Expo SDK 54 sauber installiert.

### Store Readiness
- **Store Technical Audit (`docs/release/STORE_TECHNICAL_READINESS.md`):** Detaillierter Audit aller 17 Store-Vorgaben für Apple App Store Connect und Google Play Console.
- **Beta Regression Suite (`docs/release/BETA_REGRESSION_MATRIX.md`):** Vollständige Absicherungsmatrix aller Kernflows und jüngsten UI-Fixes (RPE/RIR Dots, Swipe Delete, Rest Timer Gestures, Workout Collapse, EVARO Colorways, Deutsche Lokalisierung, Haptics/Audio-Settings).
- **Error Boundary (`apps/mobile/src/components/ErrorBoundary.tsx`):** Kapselt `_layout.tsx` und verhindert App-Abstürze / White Screens bei unerwarteten JS-Fehlern.

---

## Prepared but not activated

- **Supabase Session Storage Switch:** `supabase.ts` nutzt vorerst weiterhin MMKV. Die Scharfschaltung auf `secureStorage` ist als Astra Review Item **AR-013** vorbereitet.
- **Account Deletion Cloud RPC:** `delete_user_account()` im Backend noch nicht aktiv geschaltet; Client verhält sich defensiv (**AR-014**).
- **RevenueCat SDK:** SDK-Installation und Paywall-Verknüpfung für **AR-016** vorbereitet, Beta-Bypass bleibt aktiv.
- **Exercise Media Fallback Switch:** `EXERCISE_MEDIA_SOURCE_OVERRIDE` steht auf `REMOTE_GIF` (**AR-017**).

---

## Production behavior intentionally unchanged

- Alle bestehenden Workouts, Sessions, Timer und Coach-Features verhalten sich für Beta-Tester zu 100% identisch wie vor dem Block.
- Keine Datenmigrationen im Hintergrund ausgeführt.
- Keine Paywall-Sperren aktiviert.
- Keine Remote-GIFs gelöscht oder deaktiviert.

---

## Bugs found

1. `dataExportService.test.ts`: TypeScript meldete Inkompatibilität von String-Timestamps mit Domain-`Date`-Typen und fehlende Enums (`MuscleGroup`, `Equipment`, `MovementPattern`).
2. `syncFailureHarness.test.ts`: Nicht-gecastete Mock-User-Objekte und Array-Index-Warnungen bei `noUncheckedIndexedAccess`.
3. `profile.tsx`: Fehlender "Käufe wiederherstellen"-Einstiegspunkt für Apple Guideline 3.1.1.

---

## Bugs fixed

1. Typisierungen und Enums in `dataExportService.test.ts` auf strikte Domain-Modelle angepasst.
2. `syncFailureHarness.test.ts` sauber typisiert und mit Non-Null-Assertions abgesichert.
3. In `profile.tsx` die Methoden `handleRestorePurchases()` und `handleDeleteAccount()` typ- und fehlersicher implementiert.

---

## New Astra Review Items

- **[AR-013](file:///d:/TrainingsAppGPT/docs/release/ASTRA_REVIEW_QUEUE.md#ar-013--secure-storage-adapter-implementation--dual-read-migration):** Secure Storage Adapter Implementation & Dual-Read Migration (P0, HIGH, Action: ACTIVATE)
- **[AR-014](file:///d:/TrainingsAppGPT/docs/release/ASTRA_REVIEW_QUEUE.md#ar-014--account-deletion-service-client-architecture--safety-gate):** Account Deletion Service: Client Architecture & Safety Gate (P0, HIGH, Action: ACTIVATE)
- **[AR-015](file:///d:/TrainingsAppGPT/docs/release/ASTRA_REVIEW_QUEUE.md#ar-015--data-export-hardening-gdpr-art-20-collector-service):** Data Export Hardening: GDPR Art. 20 Collector Service (P0, LOW, Action: VERIFY)
- **[AR-016](file:///d:/TrainingsAppGPT/docs/release/ASTRA_REVIEW_QUEUE.md#ar-016--entitlement-abstraction-provider-agnostic-pro-management):** Entitlement Abstraction: Provider-Agnostic Pro Management (P1, MEDIUM, Action: ACTIVATE)
- **[AR-017](file:///d:/TrainingsAppGPT/docs/release/ASTRA_REVIEW_QUEUE.md#ar-017--exercise-media-decoupling-central-multi-tier-resolver):** Exercise Media Decoupling: Central Multi-Tier Resolver (P0, MEDIUM, Action: ACTIVATE)
- **[AR-018](file:///d:/TrainingsAppGPT/docs/release/ASTRA_REVIEW_QUEUE.md#ar-018--ai-safety-test-harness--backend-request-validation):** AI Safety Test Harness & Backend Request Validation (P0, LOW, Action: VERIFY)
- **[AR-019](file:///d:/TrainingsAppGPT/docs/release/ASTRA_REVIEW_QUEUE.md#ar-019--sync-failure-test-harness--offlinefifo-resilience):** Sync Failure Test Harness & Offline/FIFO Resilience (P0, LOW, Action: VERIFY)
- **[AR-020](file:///d:/TrainingsAppGPT/docs/release/ASTRA_REVIEW_QUEUE.md#ar-020--react-error-boundary--graceful-crash-recovery):** React Error Boundary & Graceful Crash Recovery (P1, LOW, Action: VERIFY)
- **[AR-021](file:///d:/TrainingsAppGPT/docs/release/ASTRA_REVIEW_QUEUE.md#ar-021--store-compliance-technical-audit--in-app-readiness):** Store Compliance Technical Audit & In-App Readiness (P0, MEDIUM, Action: USER_DECISION)

---

## Existing Astra Items affected

- **AR-005 (Secure Storage Plan):** Technische Basis durch AR-013 vollständig implementiert.
- **AR-006 (Account Deletion & Export Spec):** Durch AR-014 und AR-015 in lauffähigen Client-Code überführt.
- **AR-007 (AI Coach Safety):** Durch AR-018 um deterministische Safety-Interception und Backend-Tests erweitert.
- **AR-008 (Monetization & Entitlements):** Durch AR-016 um Provider-unabhängigen Client-Service ergänzt.
- **AR-009 (Exercise Media Blocker):** Durch AR-017 technisch entkoppelt.

---

## USER_ACTION_REQUIRED

1. **Rechtstexte & URLs bereitstellen:** Echte URLs für Datenschutzerklärung (`https://evaro.app/privacy`), AGB (`https://evaro.app/terms`), Impressum und Support hinterlegen.
2. **Entwickler-Accounts verknüpfen:** Apple Developer Team ID und Google Play Console für EAS Build konfigurieren; klären, ob `com.evaro.app` als finale Bundle ID registriert wird.
3. **Übungsmedien-Lizenzentscheidung:** Finale Klärung der Exercise-GIF-Nutzungsrechte (oder Bestätigung des Wechsels auf Anatomie-Fallbacks).

---

## Recommended Astra Order

1. **AR-013 (Secure Storage):** In `supabase.ts` einbinden und Dual-Read-Migration aktivieren.
2. **AR-018 (AI Safety):** Safety-Preflight in Server-Deployment verifizieren.
3. **AR-014 (Account Deletion):** Supabase RPC `delete_user_account()` in Migration einbauen und testen.
4. **AR-017 (Exercise Media):** Nach Lizenzfreigabe zentralen Schalter umlegen oder beibehalten.
5. **AR-016 (Entitlements / RevenueCat):** `react-native-purchases` installieren und Paywall anbinden.

---

## Git State

- **Branch:** `main`
- **Working Tree:** Clean (nach bevorstehendem Commit)
- **Baseline Tag:** `v0.1.0-beta.5`
- **Origin Sync:** `main == origin/main`
