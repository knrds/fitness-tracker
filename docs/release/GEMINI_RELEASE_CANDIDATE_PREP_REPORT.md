# EVARO – Gemini Release Candidate Preparation Report

## Starting Point

- **Commit:** `8272b88` (Pre-RC verification start)
- **Tag:** `v0.1.0-beta.5`
- **Tests:** 460 Tests passing (372 Mobile, 57 Domain, 31 API)

---

## Verified

- **Independent Verification Pass:** Alle 10 Scaffolding- und Service-Komponenten unabhängig auditiert (`PRE_ASTRA_VERIFICATION_REPORT.md`).
- **Secure Storage:** 14 Unit-Test-Szenarien verifiziert (Keystore-Ausfall, MMKV-Fallback, Concurrency-Idempotenz, Token-Ablauf).
- **Account Deletion:** Client-Service und UI gegen Offline-Zustände, Netzwerkabbrüche und Backend-Nichtkonfiguration abgesichert.
- **Data Export:** JSON- und CSV-Export aus lokalen SQLite-Tabellen voll funktional und 100% offline einsatzfähig.
- **Entitlements:** Beta-Schutz (`BETA_ALL_FEATURES_ENABLED`) garantiert vollen Funktionsumfang für bestehende Tester; Store-Billing-Fehler werden defensiv abgefangen.
- **Exercise Media:** Zentrale Anbindung von `getExerciseMedia()` in allen relevanten UI-Komponenten mit Graceful Fallback auf `barbell-outline`.
- **AI Safety & Validation:** Dyspnoe-Notfälle (`Atemnot`), Brustschmerzen, Extrem-Diäten (<500 kcal) und Prompt-Injections werden deterministisch blockiert. Reguläre Trainingsfragen bleiben nachweislich unblockiert (False-Positive-Prüfung).
- **React Error Boundary:** Root-Navigation geschützt; keine White Screens bei unerwarteten JS-Fehlern.

---

## Bugs Found

1. **Account Deletion Response Handling:** Bei unerwarteter oder leerer Antwort vom Backend konnte der Service in unklare Zustände laufen.
2. **Deceptive Restore Purchases Alert:** Klick auf "Käufe wiederherstellen" simulierte Erfolg im Alert, obwohl noch kein StoreKit/Billing angebunden ist.
3. **Missing Acute Dyspnea Trigger:** In `coach-safety.cjs` war akute Atemnot (`Atemnot`, `keine Luft mehr`) nicht explizit in der Notfall-Erkennungsliste hinterlegt.
4. **Decoupled Exercise Media:** `getExerciseMedia()` war implementiert, wurde aber in `ExerciseCard`, `ExerciseRow` und Übungsdetails noch nicht aufgerufen (Bilder luden direkt ungeschützt).
5. **Type Signature Mismatch in Test:** `releaseCandidateCoreRegression.test.ts` referenzierte veraltete Store-Properties (`activeProgramId`, `defaultSets`).

---

## Bugs Fixed

1. **Defensive Response Guard (`accountDeletionService.ts`):** Strikte Validierung der Backend-Antwortform; bei undefinierten oder fehlerhaften Daten wird kein Löschvorgang vorgetäuscht.
2. **Transparente Beta-Kennzeichnung (`profile.tsx`):** Restore Purchases mit "Beta"-Badge versehen; ehrliche Information, dass in der Beta alle Features standardmäßig freigeschaltet sind.
3. **Notfall-Trigger Atemnot (`coach-safety.cjs`):** `EMERGENCY_DYSPNEA` hinzugefügt; leitet bei akuter Atemnot deterministisch an den Notarzt weiter und stoppt LLM-Calls.
4. **Zentrale Medienanbindung:** `ExerciseCard`, `ExerciseRow` und `apps/mobile/app/exercise/[id].tsx` nutzen nun einheitlich `getExerciseMedia()`.
5. **Typsicherheit:** Alle Regressionstests strikt an die `packages/domain` Schemas angepasst.

---

## Regression Coverage Added

Neue Test-Suite: `apps/mobile/src/__tests__/releaseCandidateCoreRegression.test.ts` (11 Tests)
- **Workout Flow:** Start -> Übung hinzufügen -> Satz anpassen (Weight/Reps/RPE/RIR) -> abhaken -> Satz löschen -> beenden -> Historie prüfen.
- **Workout Persistence:** Mehrere Übungen, viele Sätze, Duplikationsschutz.
- **Restart & Recovery Guard:** State-Reload, Erkennung unfertiger Workouts, Resume Guard.
- **Body Metrics:** Gewicht & KFA erfassen/löschen, Verlauf, DE/EN Übersetzungs-Parität (`Not enough data` / `Noch nicht genügend Daten`).
- **Program & Template Lifecycle:** Template anlegen, editieren, löschen.
- **Gast-Isolation:** Gastdaten bleiben isoliert und werden nicht mit Server-Accounts vermischt.
- **Subscription Errors:** Entitlement-Service Test-Coverage für Store-Timeouts, Billing-Fehler und Offline-Cache.

---

## Device QA

### iOS
- **Automatisierte Tests:** PASS (Jest / Vitest / Expo Config Introspect)
- **Physische Gerätetests:** `PHYSICAL_DEVICE_TEST_REQUIRED`
- **Kritische offene Punkte:** TestFlight-Installation, Hardware-Taptic Engine bei Satz-Checkmark, Silent-Switch Verhalten bei Timer-Alarm, Dynamic Type Skalierung auf echtem Display.

### Android
- **Automatisierte Tests:** PASS (Jest / Vitest / Android Manifest Introspect)
- **Physische Gerätetests:** `PHYSICAL_DEVICE_TEST_REQUIRED`
- **Kritische offene Punkte:** APK-Sideload, Back-Button-Verhalten während aktivem Workout, Tastaturverhalten bei Dezimalkomma auf verschiedenen OEM-Keyboards (Samsung, Gboard).

---

## Accessibility

- **Touch Targets:** Alle primären Taster (Checkmarks, Timer +/- 10s/30s/60s, Satz-Drei-Punkte-Menü, Add Set) erfüllen min. 44x44 pt bzw. 48 pt Höhe.
- **Accessibility Attributes:** `accessibilityRole="checkbox"` mit `accessibilityState={{ checked: isDone }}` und `accessibilityLabel` auf allen Satzzeilen.
- **Reduced Motion:** Animations-Hooks respektieren System-Einstellungen.

---

## Performance

- **Benchmark Suite (`largeDatasetPerformance.test.ts`):** 5/5 Tests PASS in 1.46s.
- **1.000 Workouts & 10.000+ Sätze:** In 37 ms verarbeitet ohne Heap-Erschöpfung.
- **500 Körpermetriken:** Sortierung und Filterung in 3 ms.
- **100 Templates & 50 Programme:** Retrieval in 1 ms.
- **800+ Katalog-Übungen:** Fuzzy-Suche in 4 ms.

---

## Native Build Readiness

- **Expo Public Config (`npx expo config --type public`):** PASS (0 Fehler).
- **Expo Introspect (`npx expo config --type introspect`):** PASS (0 Fehler; Android Manifest, iOS Plist, Permissions intakt).
- **Plugins:** `expo-router`, `expo-font`, `expo-sqlite`, `expo-av` (Mikrofon-Zweck), `expo-image-picker` (Foto-Zweck).
- **EAS Build Status:** Konfiguriert in `eas.json` (`preview`, `preview-simulator`, `production`). Bereit zur Ausführung, sobald Dev-Credentials vorliegen.

---

## Observability Preparation

- **Diagnostics Service (`apps/mobile/src/services/diagnosticsService.ts`):** Lokale, provider-unabhängige Abstraktion implementiert.
- **Privacy-Safe:** Ring-Buffer für max. 50 non-sensitive Fehlercodes.
- **Strikte Datenschutzgrenzen:** Keine PII, keine Workouts, kein Körpergewicht, keine Coach-Nachrichten, keine Auth-Tokens.
- **Event-Taxonomie:** In `docs/release/OBSERVABILITY_EVENT_MODEL.md` für künftige Sentry/PostHog-Integration dokumentiert.

---

## Store Submission Preparation

- **Store Compliance Audit:** `docs/release/STORE_TECHNICAL_READINESS.md` aktualisiert.
- **Store Submission Checklist:** `docs/release/STORE_SUBMISSION_CHECKLIST.md` mit detaillierten Apple- und Google Play-Kriterien angelegt.
- **Store Review Notes:** `docs/release/STORE_REVIEW_NOTES_TEMPLATE.md` als Vorlage für Reviewer erstellt.

---

## RLS Preparation

- **Negative Test Script:** `docs/release/rls_negative_tests.sql` mit 10 automatisierten Testfällen vorbereitet.
- **Execution Guide:** `docs/release/RLS_LOCAL_TEST_HARNESS.md` dokumentiert die reproduzierbare Ausführung via Supabase Local CLI.
- **Produktionsstatus:** RLS bleibt bis zur Astra-Freigabe lokal vorbereitet und unberührt auf Remote.

---

## Subscription Mock Coverage

- Entitlement-Service deckt Free, Pro, Beta-All-Access, Billing-Fehler, Timeouts und Cache-Fallbacks ab.
- Keine Fake-Transaktionen im UI; Beta-Modus transparent deklariert.

---

## Still Astra Required

1. **Secure Storage Activation:** Verknüpfung von `secureStorage.ts` als Supabase Session-Storage nach physischem Gerätetest (`AR-011`).
2. **RLS Cloud Deployment:** Ausführen von `rls_negative_tests.sql` auf lokaler Supabase-Instanz und Übernahme in Migrationen (`AR-014`).
3. **Account Deletion Cloud Backend:** Bereitstellung der Supabase RPC `delete_user_account()` (`AR-015`).
4. **AI Coach Production Infrastructure:** HTTPS-Hosting mit distributed Rate-Limiting & Auth-Validation (`AR-013`).
5. **RevenueCat SDK:** Installation von `react-native-purchases` und StoreKit/Play Billing Integration (`AR-016`).
6. **ExerciseDB Asset Lizenzierung:** Austausch der Hotlink-URLs durch lizenzierte Assets (`AR-001`).

---

## User Action Required

1. Apple Developer Account einrichten ($99/Jahr).
2. Google Play Console Account einrichten ($25 einmalig).
3. Finalen Bundle Identifier (`com.evaro.app` vs. `com.fitnesstracker.app`) festlegen.
4. EAS CLI Credentials für iOS & Android hinterlegen.
5. ExerciseDB Lizenz klären oder Start ohne GIFs bestätigen.
6. Higgsfield Nutzungsrechte für Video-Assets prüfen.
7. RevenueCat Projekt anlegen und API Keys bereitstellen.
8. Preise für EVARO Pro festlegen (Monat / Jahr).
9. Öffentliche Datenschutzerklärung (URL) bereitstellen.
10. Öffentliche AGB / EULA (URL) bereitstellen.
11. Impressum (§ 5 DDG) bereitstellen.
12. Support-URL oder Support-E-Mail hinterlegen.
13. Physische Gerätetests anhand `docs/release/DEVICE_QA_CHECKLIST.md` durchführen.

---

## Recommended Astra Order

1. **Secure Storage Activation:** Physische Verifikation auf iOS/Android -> Session Storage aktivieren.
2. **RLS & Sync Architecture:** Lokalen Test via `rls_negative_tests.sql` fahren -> Cloud DDL migrieren.
3. **Account Deletion Backend:** RPC `delete_user_account()` in Supabase deployen.
4. **AI Production Hosting:** Coach Proxy mit Upstash Redis & Auth auf Vercel deployen.
5. **Exercise Licensing:** Asset-Lösung gemäß Konrads Entscheidung einpflegen.
6. **RevenueCat / Entitlements:** SDK installieren, Paywall aktivieren, Beta-Bypass deaktivieren.

---

## Final Verification

- **Typecheck:** PASS (0 Fehler in allen Workspaces)
- **Lint:** PASS (0 Fehler / 0 Warnungen)
- **Tests:** PASS (488/488 Tests grün; 394 Mobile, 57 Domain, 37 API)
- **Coach Preflight:** PASS (OpenRouter Modell & Key bestätigt)
- **Build:** PASS (Expo Web Single-Bundle 4.82 MB exportiert)
- **Audit:** PASS (Dokumentierte transitive Tooling-Findings unverändert)

---

## Git

- **Branch:** `main`
- **Commit:** `0cb299f` (und nachfolgende Dokumentations-Commits)
- **origin/main:** `8272b88`
- **Working Tree:** Clean nach Abschluss

---

## Beta Status

**READY_FOR_BETA_6_TAG:** **YES**
- Alle 15 P0-Sicherheitsgrenzen eingehalten.
- Keine unfertigen Production-Systeme aktiviert.
- Umfassende Regression- und Store-Readiness hergestellt.
