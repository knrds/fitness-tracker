# START HERE – EVARO Astra Handoff

**Stable Commit:** `0cb299f` (ahead of `origin/main`)  
**Stable Base Tag:** `v0.1.0-beta.5`  
**Empfohlener nächster Checkpoint:** `READY_FOR_BETA_6_TAG`  
**Teststatus:** **488 / 488 Tests PASS** (Mobile Jest: 394, Domain Vitest: 57, API Node: 37)  
**Quality Gates:** Typecheck (0 Errors), Lint (0 Warnings), Build (Metro single-bundle 4.82MB), Coach Preflight PASS  

---

## Review first (Prioritäre Reihenfolge für Astra)

1. **Secure Storage Activation (`AR-011` / `AR-012`):**
   - Prüfe `apps/mobile/src/utils/secureStorage.ts`. Adapter ist mit 14 Scenarios gehärtet (inkl. Keystore-Read-Failure-Fallback auf MMKV, Concurrency-Idempotenz und Token-Validierung).
   - *Astra-Aufgabe:* Nach physischem E2E-Gerätetest auf iOS/Android als Session Storage in `supabase.ts` verdrahten. Migration beim Kaltstart kontrolliert scharfschalten.

2. **RLS + Sync Architektur (`AR-014` / `docs/release/RLS_LOCAL_TEST_HARNESS.md`):**
   - Prüfe `docs/schema.sql` und führe `docs/release/rls_negative_tests.sql` lokal auf Supabase aus.
   - Alle 10 Negative Tests stellen sicher: User A kann User B nicht lesen/ändern/löschen; anonyme Clients erhalten keine Daten.
   - *Astra-Aufgabe:* Migration nach `supabase/migrations/` überführen und RLS auf Supabase Cloud deployen.

3. **Account Deletion Backend RPC (`AR-015`):**
   - Prüfe `apps/mobile/src/services/accountDeletionService.ts` und UI-Guard in `apps/mobile/app/profile.tsx`.
   - UI warnt den Nutzer ehrlich, solange RPC inaktiv ist (`BACKEND_NOT_CONFIGURED`), und löscht keine Daten unter falschen Vorwänden.
   - *Astra-Aufgabe:* Supabase RPC `delete_user_account()` bereitstellen und verknüpfen.

4. **AI Production Infrastruktur (`AR-013`):**
   - Prüfe `api/coach-safety.cjs` und `api/coach-chat.js`. Safety Layer fängt medizinische Notfälle (Brustschmerz, Atemnot, K.O.), Extremdiäten und Injections deterministisch ab. Payload-Limits (50kB, max 10 Msgs, 415/405 Handling) sind verifiziert.
   - *Astra-Aufgabe:* Serverless / Edge Deployment (z.B. Vercel) mit Redis/Upstash Rate-Limiting und Auth-Token-Validierung aufsetzen.

5. **Exercise Licensing Transition (`AR-001`):**
   - Prüfe `apps/mobile/src/utils/getExerciseMedia.ts`. Ist zentral in `ExerciseCard`, `ExerciseRow` und `app/exercise/[id].tsx` eingebunden.
   - *Astra / PO:* Sobald Konrad die Lizenzstrategie (ExerciseDB API vs. eigene Grafiken) festlegt, Remote GIF URLs durch lizenzierte Assets austauschen.

6. **RevenueCat / Entitlements (`AR-016`):**
   - Prüfe `apps/mobile/src/services/entitlementService.ts`. Beta-Bypass (`BETA_ALL_FEATURES_ENABLED: true`) hält die App für aktuelle Tester voll offen. Restore Purchases zeigt transparentes Beta-Badge.
   - *Astra-Aufgabe:* `react-native-purchases` SDK installieren, Entitlement-Checks scharfschalten und StoreKit / Google Play Billing anbinden.

---

## Verified Gemini Work (Bereits vollständig implementiert & verifiziert)

- **Independent Verification Pass:** Alle 10 Komponenten aus Phase A auditiert (`docs/release/PRE_ASTRA_VERIFICATION_REPORT.md`).
- **Core Flow Regression Suite:** Vollständige automatisierte Regression (`releaseCandidateCoreRegression.test.ts`):
  - Workout erstellen, Übungen hinzufügen, Sätze editieren/abhaken/löschen, Speichern, Deduplikation.
  - Startup-Recovery & State-Reload Guard.
  - Körpermaße & DE/EN Lokalisierungs-Parität (`Not enough data` / `Noch nicht genügend Daten`).
  - Template Lifecycle (Erstellen, Aktualisieren, Löschen).
  - Gast-Isolation (Gastdaten verbleiben isoliert vom Server).
- **Subscription Error Simulation:** EntitlementService deckt Billing-Fehler, Store-Timeouts und Cache-Fallbacks ab.
- **Privacy-Safe Observability & Diagnostics:** 
  - `DiagnosticsService` (`diagnosticsService.ts`) generiert lokale Berichte ohne PII, ohne Workout-Inhalte und ohne Auth-Tokens.
  - Event-Modell in `docs/release/OBSERVABILITY_EVENT_MODEL.md` definiert.
- **Native & EAS Release Readiness:**
  - `npx expo config --type public` und `--type introspect` geprüft (0 Fehler).
  - Permissions für Mikrofon und Foto-Bibliothek in `app.json` konkret begründet.
- **Store Technical Readiness:**
  - `docs/release/STORE_SUBMISSION_CHECKLIST.md` (vollständige Apple & Google Play Checklisten).
  - `docs/release/STORE_REVIEW_NOTES_TEMPLATE.md` (Vorbelegtes Template für App Reviewer).
- **Device QA Matrix:**
  - `docs/release/DEVICE_QA_CHECKLIST.md` mit dedizierten Spalten für iOS und Android, ehrlicher Kennzeichnung von `PHYSICAL_DEVICE_TEST_REQUIRED`.
- **Accessibility & Touch Targets:**
  - Checkmarks, Three-Dot-Menüs, Timer-Buttons und Inputs besitzen min. 44x44 pt Touch Targets.
  - `accessibilityRole`, `accessibilityLabel` und `accessibilityState` flächendeckend implementiert.
- **Performance Benchmarks:**
  - 1.000 Workouts und 10.000+ Sätze in 37 ms verarbeitet (`largeDatasetPerformance.test.ts`).

---

## User Decisions Required (`USER_ACTION_REQUIRED`)

Diese Punkte erfordern manuelle Bereitstellung, juristische Dokumente oder Account-Konfigurationen durch den Product Owner (Konrad) und können nicht durch Code automatisiert werden:

1. **Apple Developer Account:** Enrollment ($99/Jahr), Team ID und Zertifikate für EAS.
2. **Google Play Console:** Developer Account ($25 einmalig), 20-Tester-Phase für Internal Track.
3. **Final Bundle Identifier:** Bestätigung von `com.evaro.app` vs. Legacy `com.fitnesstracker.app`.
4. **EAS Credentials:** Hinterlegung der Store-Credentials in EAS CLI.
5. **ExerciseDB Lizenzentscheidung:** Kommerzielle API-Subscription vs. alternative Asset-Bibliothek.
6. **Higgsfield Commercial Rights:** Klärung der Nutzungsrechte für KI-animierte Übungs-Assets.
7. **RevenueCat Account:** Anlegen des Projekts und Hinterlegen der öffentlichen API-Keys.
8. **Subscription Pricing:** Festlegung der finalen Monats- und Jahrespreise (z.B. 4,99 € / Monat, 39,99 € / Jahr).
9. **Datenschutzerklärung (Privacy Policy):** Veröffentlichung einer DSGVO-konformen URL (z.B. `https://evaro.app/privacy`).
10. **AGB / EULA:** Bereitstellung von AGB und Widerrufsbelehrung (z.B. `https://evaro.app/terms`).
11. **Impressum:** Anbieterkennzeichnung nach § 5 DDG (Name, Adresse, Kontakt, ggf. USt-ID).
12. **Support URL / Kontakt:** E-Mail-Adresse (`support@evaro.app`) oder Kontaktformular.
13. **Physische Gerätetests:** Vollständiges Durchführen der Checkliste in `docs/release/DEVICE_QA_CHECKLIST.md` auf echten iPhones und Android-Geräten.

---

## Do Not Activate Without Review (`ASTRA_REQUIRED`)

1. **Keine Supabase Session Migration auf SecureStore ohne physischen Test.**
2. **Keine RLS-Policies direkt auf Supabase Cloud deployen ohne `rls_negative_tests.sql` auszuführen.**
3. **Keine Account-Löschung als erfolgreich melden, ohne dass die Cloud RPC läuft.**
4. **Keine Paywall aktivieren, solange `react-native-purchases` nicht verknüpft ist.**
5. **Kein Exercise-GIF-Löschskript ausführen, bevor Ersatz-Assets vorliegen.**
