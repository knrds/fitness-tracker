# EVARO Beta Release Notes

## Unreleased — beta finalization candidate

- Reversible plan hiding, protected GK/PPL defaults, Free 3-template/1-program limits, folder chooser and consistent exercise back controls.
- Improved theme/effect previews, additional light colorway, clearer date picker and larger metrics sheet.
- Fixed multi-digit template weight propagation, stale daily program selection and inconsistent working-set counts.
- Samsung hydration report and further requested Coach cosmetics remain under investigation/implementation; this is not a release-ready claim.

- Independent template set prescriptions and shared live/template/history controls; zero and empty optional values remain distinct.
- Custom exercises can target multiple muscles and equipment. Returning from exercise details preserves selection.
- Central Beta Tester preference, visible capability dialogs, viewport cosmetic previews and consistent heat intensity colors.
- Coach new-chat cancels stale responses; scoped guest signing fails closed outside explicit beta configuration. Added server kill switch and per-instance concurrency protection; distributed quotas remain pending.
- Future workout XP calibrated to 1,314 XP for the representative 16-set/10,000-kg workout. Approximately 225 such workouts to level 30 and 1,000 to level 50, before achievement bonuses. Existing XP/levels unchanged.
- This is not a tagged release or commercial readiness claim. Follow EXECUTION_STATUS.md for current checks and remaining gates.

## EVARO Beta 0.1.0-beta.8 (DateWheel Unification, Workout History Management & Beta Full-Access)

**Release-Datum:** 23. September 2026  
**Commit-Basis:** `main` (Merge von `astra/p0-release-core`)  
**Status:** `PRE-RELEASE / BETA CANDIDATE` (Automated CI Green; Ready for Physical Device Verification)

### Neu / Behoben in Beta 0.1.0-beta.8

- **Einheitlicher DateWheelPicker über alle Datumseingaben:**
  - Zentraler iOS-Style Wheel-Picker (`DatePickerModal` / `DateWheelPicker`) konsistent über die gesamte App integriert:
    - **Profil:** Auswahl des Geburtsdatums mit sofortiger Alters- und Validierungsanzeige.
    - **Body-Metriken:** Schnell-Erfassung von Körpergewicht, KFA und Umfangswerten mit Datumswahl per Wheel.
    - **Body-Metriken-Historie:** Nachträgliches Bearbeiten des Eintragsdatums im Detail-Modal.
    - **Workout-Historie:** Nachträgliches Anpassen des Trainingsdatums im Workout-Edit-Modal.
  - Vollständige Barrierefreiheit: 44x44-pt Mindest-Touch-Targets, Haptik-Feedback bei Ziffernwechsel, Screenreader-Aktionen (`increment`/`decrement`) sowie Web-/Desktop-Tastatur- und Scrollrad-Support.
  - Sichere Bestätigungs-Logik: Keine unabsichtliche Persistierung; Änderungen werden erst bei Klick auf *Fertig* / *Done* übernommen; *Abbrechen* verwirft sauber.

- **Workout-Historie: Bearbeiten & Löschen mit deterministischer Neuberechnung:**
  - Neues Overflow-Aktionsmenü (`⋯`) in der Historienliste sowie auf der Workout-Detailseite (`/history/[id]`).
  - **Umfassendes Workout-Edit-Modal:**
    - Anpassung von Datum, Dauer (Minuten) und Notizen.
    - Vollständige Satz-Bearbeitung: Gewicht, Wiederholungen, RPE (Rating of Perceived Exertion) und Status (abgeschlossen).
    - Hinzufügen neuer Sätze sowie Löschen einzelner Sätze mit sofortiger Validierung.
  - **Sicherheits-Löschdialog:** Explizite Bestätigung vor dem Löschen eines Trainings mit Haptik und destruktivem Alert.
  - **Deterministische Neuberechnung (`historyRecalculation.ts`):**
    - Automatische Neuberechnung der Big-Three-Bestleistungen (Bankdrücken, Kniebeuge, Kreuzheben) aus allen verbleibenden Trainings (Wiederherstellung vorheriger PRs bei Löschen/Abwerten).
    - Neuberechnung von Gesamtvolumen und Trainingsserien (Streaks).
    - **XP- und Level-Integrität:** Kein doppelter XP-Zuwachs bei Bearbeitung; Trainings-XP bleibt strikt an den ursprünglichen Trainingsabschluss gekoppelt.

- **Beta Full Access & Coach Guest-Authentifizierung:**
  - **Zentrale Beta-Konfiguration (`betaAccessConfig.ts`):**
    - Strikter Produktions-Fail-Closed-Schutz (`isFailClosedProduction()`): Beta-Bypässe und Test-Tokens werden in Produktions-Umgebungen hart deaktiviert.
    - Beta-Tester erhalten vollen COACH-Zugriff ohne störende Paywall.
  - **Server-seitige Scoped Beta-Tokens (`/api/beta-session.js` & `api/beta-auth.cjs`):**
    - HMAC-SHA256 signierte Kurzzeit-Tokens für anonymer KI-Coach-Nutzung ohne Zwang zum Sofort-Login.
    - Deterministische Pseudonymisierung der Geräte-Installations-ID (`beta_guest_<hash>`) – kein Durchsickern nativer Hardware-Fingerabdrücke an Dritte.
  - **Provider Circuit Breaker Verfeinerung (`coachCircuitBreaker.ts`):**
    - Client-Fehler (401, 403, 400, 404, 422) lösen keinen Circuit-Breaker-Ausfall mehr aus; nur echte Provider-Überlastungen (429) und Serverfehler (5xx) zählen als Ausfall.
  - **KI-Sicherheitsgating:** Planänderungen durch den KI-Coach bleiben strikt bestätigungspflichtig (`confirmation_required`).

### Status der Release-Voraussetzungen (Gates)

| Komponente | Status | Anmerkung |
| :--- | :--- | :--- |
| **Lokale Persistenz & Stores** | **VERIFIED** | Deterministische PR- & History-Neuberechnung; Hydration-Resilienz intakt |
| **Automatisierte Tests** | **VERIFIED** | 1031 Tests bestanden (829 Mobile + 133 Domain + 49 Coach API + 20 Security) |
| **TypeScript / Typecheck** | **VERIFIED** | 0 Fehler über alle Workspaces |
| **ESLint / Linter** | **VERIFIED** | 0 Fehler über alle Workspaces |
| **Web Preview Export** | **VERIFIED** | Erfolgreich generiert und geprüft |
| **Preview Security Gate** | **VERIFIED** | 0 Critical, 0 High, 0 Moderate in Client-Reichweite |
| **Gitleaks Secret Scan** | **VERIFIED** | 0 Leaks über 238 Commits |
| **PostgreSQL RLS Gate** | **VERIFIED** | Echte RLS-Assertions und Rollback-Proof bestanden |
| **In-App Billing (Store)** | **PREPARED** | *ASTRA_REQUIRED* (Kein Store-Billing vor Produktions-Setup) |
| **Supabase Cloud Sync** | **PREPARED** | *ASTRA_REQUIRED* (RLS-Migrationen lokal geprüft; kein Cloud-Push) |
| **Physische Geräteprüfung** | **REQUIRED** | *PHYSICAL_DEVICE_REQUIRED* (iPhone TestFlight/Safari & Samsung S25) |

---

## EVARO Beta 0.1.0-beta.7 (Release Candidate – Stability, Recovery & Architecture Hardening)

**Release-Datum:** 23. September 2026  
**Commit-Basis:** `main` (Merge von `astra/p0-release-core`)  
**Status:** `PRE-RELEASE / BETA CANDIDATE` (Automated Beta Ready; Physical Device Validation Required)

### Neu / Behoben in Beta 0.1.0-beta.7

- **Beta-Blocker #1 – Profilbild-Persistenz (iOS & Android & Web):**
  - Ursache behoben: Temporäre Image-Picker-Cache-URIs (`/tmp/ImagePicker/`) wurden im Profil persistiert und nach App-Neustart bzw. OS-Cache-Eviction invalidiert.
  - Neuer `avatarStorageService`: Kopiert gewählte Profilbilder sofort in ein persistentes, app-eigenes Verzeichnis (`Paths.document/avatars/`).
  - Container-UUID-Resilienz für iOS: Speicherung als Sandbox-relativer Pfad (`avatars/avatar_<partition>.jpg`), wodurch iOS-Container-UUID-Rotationen bei App-Updates sicher überstanden werden.
  - Strikte Account-Isolation: Getrennte Speicherung nach Account-Scope/Partition (`legacy`, `guest`, `account:<id>`). Beim Logout/Account-Wechsel kein Leck; beim Account-Löschen saubere Bereinigung.
  - Web/Safari/PWA: Persistente Data-URIs statt flüchtiger `blob:`-URLs.
  - Sichere Migration: Bestehende lesbare Altdaten werden beim Laden automatisch in das persistente Verzeichnis überführt; gelöschte Dateien fallen ohne Absturz auf den Initialen-Avatar zurück.

- **Beta-Blocker #2 – Android Storage Hydration & Safe Recovery (Samsung Galaxy S25 / Android 14+):**
  - Ursache behoben: Synchrones Schema-Parsing in `storage.ts:decode()` warf vor der Ausführung von Zustands `migrate()` einen unüberwindbaren `StorageHydrationError`, der im `useStorageHealth`-Store gefangen blieb. Die "Erneut laden"-Funktion setzte geblockte Stores nicht zurück.
  - Gestufte, nicht-destruktive Recovery-Architektur:
    - **Level 1 (Normal Hydrate):** Zod-Parsing mit Defaults und Transformationen.
    - **Level 2 (Schema Version Migration):** Ältere Schema-Payloads werden intakt an Zustands `migrate()`-Funktion weitergereicht, anstatt vorab blockiert zu werden.
    - **Level 3 (Safe Field-Level Repair):** Fehlende nicht-kritische additive Felder werden atomar mit Vorgabewerten ergänzt, ohne Workouts, Templates oder Verläufe anzutasten.
    - **Level 4 (Non-PII Diagnostics):** Detaillierte Fehlercode- und Schemapfad-Anzeige in der UI (`PersistenceGate`) ohne Exposition sensibler Gesundheits- oder Trainingsdaten.
  - Echte Retry-Logik: `retryHydration()` setzt den Health-Zustand zurück und führt eine frische Rehydration aus.

- **Program Schedule & Preview Wrap-Around:**
  - `getProgramScheduleStatus` behoben: Liegt der aktuelle Wochentag hinter den geplanten Trainingstagen der Woche, während die Gesamtdauer noch nicht abgelaufen ist, schlägt der Home-Screen-Preview nahtlos das erste Workout der Folgewoche vor.

- **Neues Onboarding & Wertversprechen:**
  - Multistep-Onboarding mit Zielabfrage, Trainingserfahrung, Frequenz, dynamischer XP-Vorschau und reibungslosem Übergang in den Guest-Modus (kein Zwangs-Login vor dem ersten Training).

- **Monetarisierungsarchitektur (FREE / PRO / COACH Gates):**
  - Saubere Trennung der Berechtigungsstufen im Entitlement-System:
    - **FREE:** Unbegrenzte echte Workouts, max. 2 Custom-Templates, kein AI-Coach.
    - **PRO:** Unbegrenzte Templates, Trainingsprogramme, RPE/RIR, erweiterte Metriken, Coach-Vorschau.
    - **COACH:** Vollständige KI-Planung, Confirmation-Pflicht für Trainingsplanänderungen.
  - Strikte Downgrade-Datenintegrität: Bei Statuswechsel bleiben alle zuvor erstellten Templates, Workouts und Programme vollständig und unverändert erhalten.

- **Coach Context Intelligence & Datensparsamkeit:**
  - Context-Builder liefert zielgerichtete, minimierte Trainingsdaten (relevante Übungshistorie, PRs, aktuelles Programm) an den KI-Coach. Keine unnötigen Voll-Dumps der gesamten Datenbank.
  - Vollständige Account-Isolation für Coach-Kontexte und Verwerfen temporärer KI-Entwürfe bei Accountwechsel.

- **Program UX & Drag-and-Drop:**
  - Robuste Neuordnung von Tagen und Übungen in Programmen mit Kollisionserkennung und Vermeidung doppelter Zuweisungen.
  - Workout-Preview-Modal auf dem Home-Screen: Ermöglicht Vorschau vor Start ohne versehentliches Auslösen.

- **Barrierefreiheit & System-Settings:**
  - Einhaltung der 44x44-pt Touch-Targets, Reduzierte-Bewegung-Support (`reduceMotion`), dynamische Schriftgrößenskalierung (`largeText`), i18n-Vollständigkeit (DE/EN) und Notification Preference Center.

### Status der Release-Voraussetzungen (Gates)

| Komponente | Status | Anmerkung |
| :--- | :--- | :--- |
| **Lokale Persistenz & Stores** | **VERIFIED** | Alle 13 Stores auditiert; Hydration- und Migrations-Fixtures grün |
| **Automatisierte Tests** | **VERIFIED** | 824 Tests bestanden (759 Mobile + 49 Coach API/Safety + 16 Security) |
| **TypeScript / Typecheck** | **VERIFIED** | 0 Fehler über alle Workspaces |
| **ESLint / Linter** | **VERIFIED** | 0 Fehler über alle Workspaces |
| **Web Preview Export** | **VERIFIED** | Erfolgreich generiert und geprüft |
| **Preview Security Gate** | **VERIFIED** | 0 Critical, 0 High, 0 Moderate in Client-Reichweite |
| **In-App Billing (Store)** | **PREPARED** | *ASTRA_REQUIRED* (Kein Store-Billing vor Produktions-Setup) |
| **Supabase Cloud Sync** | **PREPARED** | *ASTRA_REQUIRED* (RLS-Migrationen lokal geprüft; kein Cloud-Push) |
| **Physische Android-Prüfung** | **REQUIRED** | *PHYSICAL_DEVICE_REQUIRED* (Samsung S25 Verifikation vor Store) |

---

## EVARO Beta 0.1.0-beta.6 (RC Preparation & Exercise Dataset Consolidation)

**Release-Datum:** 16. September 2026  
**Commit-Basis:** baut auf `4dd430e` (`v0.1.0-beta.5`) auf  
**Status:** `PRE-RELEASE` (RC Preparation & Exercise Dataset Consolidation Checkpoint)

### Neu / Verbessert
- **ExerciseDB Removal & Dataset Consolidation:**
  - Kommerzielle ExerciseDB-Artefakte (`exerciseGifs.json` mit 1.492 externen Hotlinks und ungenutzte `exercisedb-v1.json` mit 1,4 MB) vollständig aus dem Repository entfernt.
  - Verbleibender Katalog konsolidiert in `packages/domain/src/data/raw/free-exercise-db.json` (873 Übungen, Upstream: `yuhonas/free-exercise-db`).
  - `gifUrl` vollständig aus Domain-Typen, Zod-Schemas und UI-Komponenten bereinigt.
- **Exercise ID Stabilität & Kompatibilitätsnachweis:**
  - 100% deterministische Beibehaltung aller 873 Exercise-UUIDs garantiert (`exerciseCatalogCompatibility.test.ts`).
  - Vollständige Rückwärtskompatibilität für persistierte Altdaten mit vorhandenem `gifUrl` über Zod-Schema-Stripping.
  - Alle Workout-Templates und Standardprogramme lösen deterministisch auf vorhandene Katalog-IDs auf.
- **Media Fallback & Animation Hardening:**
  - Zwei-Bilder-Animation (`0.jpg` Start, `1.jpg` Ende) gehärtet: sauberes Timer-Cleanup bei Unmount/Screen-Wechsel, Abfangen fehlender Zweitbilder (`secondImageMissing`), automatischer Fallback auf Barbell-Vektoricon bei Netzwerk- oder Ladefehlern.
  - Vollständige Accessibility-Kennzeichnung (`accessibilityRole`, `accessibilityLabel`, Touch-Targets >= 44x44, Berücksichtigung von `AccessibilityInfo.isReduceMotionEnabled()`).
- **Privacy-Safe Local Diagnostics:**
  - `DiagnosticsService` zur lokalen Fehlererfassung ohne Übertragung personenbezogener Daten (keine Auth-Tokens, Workout-Inhalte, Körpergewichte oder Coach-Nachrichten).
- **Core Flow & Safety Regression:**
  - 512 automatisierte Tests grün (71 Mobile Suites [418 Tests] + 8 Domain Suites [57 Tests] + 2 API Suites [37 Tests]).
  - Olympic-Lift-Instruktionen in `ExerciseSchema` auf 5.000 Zeichen erweitert (unterstützt Power Clean und Clean and Jerk).
- **Store Preparation:**
  - Apple App Store und Google Play Submission Checklisten, Reviewer-Notes Template und Native Permissions (`expo-image-picker`, `expo-av`) vollständig auditiert.
  - Web Bundle Export auf 4,71 MB komprimiert.

### Verbleibende Blocker für Astra (P0)
1. **Secure Storage:** Native iOS Keychain / Android Keystore Session-Migration nach realen Gerätetests verdrahten.
2. **RLS & Sync:** Supabase Cloud Deployment der RLS-Policies und Outbox-Replikation.
3. **Account Deletion:** PostgreSQL RPC `delete_user_account()` in Supabase einspielen.
4. **AI Backend:** Production Deployment der Coach API mit Upstash Redis Rate-Limiting.
5. **Monetarisierung:** RevenueCat SDK verdrahten und IAP In-App-Käufe konfigurieren.

---

## EVARO Beta 0.1.0-beta.5 (Clean Pre-P0 Baseline)

**Release-Datum:** 16. September 2026  
**Commit-Basis:** baut auf `3273e6b` (`v0.1.0-beta.4`) auf  
**Status:** `PRE-RELEASE` (Clean Pre-P0 Baseline Safepoint)

### Neu / Verbessert
- **Full Project Cleanup & Repository Compaction:**
  - Bereinigung von 40+ MB flüchtigen lokalen Build- und Test-Artefakten (`dist-native`, `.playwright-cli`, `.expo`).
  - Bereinigung redundanter Gitignore-Muster und Härtung gegen versehentliche Commits temporärer Dateien (`*.tmp`, `*.bak`, `*.old`).
  - Entfernung von 0-Byte-Root-Altlasten (`GEMINI.md`).
  - Ausführlicher Bericht in `LOCAL_PROJECT_CLEANUP_REPORT.md`.
- **Workout Template Update UX Polish:**
  - Stark vergrößerter, prominenter Hero-Button „Template aktualisieren“ in `SaveTemplateModal.tsx` mit Refresh-Icon, Space-Grotesk-Typografie und Haptic Feedback.
  - Strukturierte ODER-Trennlinie zur visuellen Trennung der primären Aktualisierungsaktion von alternativen Speicheroptionen.
- **Erweiterte Test-Abdeckung:**
  - Neue Test-Suite für `SaveTemplateModal` (61 Mobile Test Suites, 318 Mobile Tests, 393 Tests gesamt).

### Technische Verifikation
- **Typecheck:** PASS (0 Fehler über Monorepo)
- **Lint:** PASS (0 Fehler über Monorepo)
- **Tests:** PASS (393 Tests grün: 61 Mobile Suites [318 Tests] + 57 Domain Tests + 18 Coach API Tests)
- **Coach Check:** PASS (Modell und API-Key validiert)
- **Bundle Export:** PASS (Web-Export single-bundle 4.81 MB fehlerfrei)

---

## EVARO Beta 0.1.0-beta.4 (Pre-Astra UI Polish & Gesture Checkpoint)

**Release-Datum:** 16. September 2026  
**Commit-Basis:** baut auf `f3a79ff` (`v0.1.0-beta.3`) auf  
**Status:** `PRE-RELEASE` (Pre-Astra Baseline Safepoint)

### Neu / Verbessert
- **SessionExerciseCard Animation & Übergänge:**
  - Sanfte Fade-in / Fade-out Übergänge beim Auf- und Zuklappen von Übungskarten im aktiven Workout (`SessionExerciseCardCollapse`).
  - Sauberes Ausblenden der Satz-Optionen (Warmup, Drop-Set, Failure), wenn RPE und RIR in den Einstellungen deaktiviert sind (`SessionExerciseCardSetOptions`).
- **Rest Timer Gesten-Interaktion:**
  - Swipe-Down und Swipe-Up Gesten zur intuitiven Minimierung und Maximierung des aktiven Pausentimers (`RestTimerGestures`).
- **Test-Absicherung:**
  - Dedizierte Komponenten- und Gestentests für RestTimer-Gesten und ExerciseCard-Transitions (57 Suites, 288 Tests in `apps/mobile`).

### Technische Verifikation
- **Typecheck:** PASS (0 Fehler über alle 3 Monorepo-Pakete)
- **Lint:** PASS (0 Fehler über alle 3 Monorepo-Pakete)
- **Tests:** PASS (306 Tests grün: 57 Mobile Suites [288 Tests] + 18 Coach API Tests)
- **Coach Check:** PASS (Modell und API-Key validiert)
- **Bundle Export:** PASS (Web-Export single-bundle 4.81 MB fehlerfrei)

---

## EVARO Beta 0.1.0-beta.3 (Fundamental Release Foundation)

**Release-Datum:** 15. September 2026  
**Commit-Basis:** baut auf `343334a` (`v0.1.0-beta.2`) auf  
**Tag:** `v0.1.0-beta.3` (`f3a79ff`)  
**Status:** `PRE-RELEASE`

### Neu / Verbessert
- **CI Quality Gates:**
  - Zentrales `pnpm verify` Skript für Typecheck, Lint und Unit-Tests.
  - Safe Environment Validation (`envValidation.ts`) gegen unvollständige Konfigurationen.
- **Haptik & Audio-Abstraktion:**
  - Zentrale sichere Haptik-Helfer (`haptics.ts`) mit Plattform-Fallback.
  - Dedizierter Audio-Adapter (`audioAdapter.ts`) für zuverlässige Tonwiedergabe.
- **i18n & A11y:**
  - Vollständige Sprachparität für Authentifizierung, Workout und Übungen.
  - A11y-Hardening für Screenreader und Barrierefreiheit.

---

## EVARO Beta 0.1.0-beta.2 (Final Verification & i18n Checkpoint)

**Release-Datum:** 15. September 2026  
**Commit-Basis:** baut auf `7d24b85` (`v0.1.0-beta.1`) auf  
**Status:** `PRE-RELEASE` (Pre-Production Safepoint)

### Neu / Korrigiert
- **Korrektur deutscher Übersetzungsfehler im Body Tracking (`body.tsx`):**
  - Leere Diagramme für Gewicht und Körperfett zeigen nun den gewünschten deutschen Text: `"Noch nicht genügend Daten"` und `"Trage mindestens zwei Werte ein, um die Entwicklung anzuzeigen."` (im englischen Modus unverändert `"Not enough data"` / `"Log at least 2 data points."`).
  - Interaktiver Diagramm-Tipp vollständig übersetzt: `"Tippe auf einen Punkt im Diagramm für Details"`.
  - Körperfett-Erklärungsdialog und Validierungs-Alerts (Datum, Größe, Gewicht, Körperfettanteil, Trinkziel) zweisprachig angebunden.
- **Vollständige Lokalisierung Übungsdetails (`exercise/[id].tsx`):**
  - Alle englischen Resttexte übersetzt: Ausrüstung, Schwierigkeit, Hauptmuskeln, Hilfsmuskeln, Anleitung, leere Anleitungen, Übungs-Optionen, RPE/RIR-Spalten, Button-Beschriftungen und Hinzufügen-Alerts.
  - Kanonische Formatierung über `formatEquipment()` und `formatLevel()`; ungenutzte Alt-Helfer entfernt.
- **Supersatz-Alerts (`SessionExerciseCard.tsx`):**
  - Alert-Titel in deutscher Sprache auf `"Supersatz"` lokalisiert.
- **Automatisierte i18n-Tests:**
  - `apps/mobile/src/i18n/__tests__/i18n.test.ts` erweitert um Validierung der neuen Translation-Keys.
- **Bundle-Sanity-Check:**
  - Vollständiger Expo Web-Export (`expo export --platform web`) erfolgreich verifiziert (54 Assets, JS-Bundle, HTML, Manifest).

### Technische Verifikation
- **Typecheck:** PASS (0 Fehler über alle 3 Monorepo-Pakete)
- **Lint:** PASS (0 Fehler, 0 Warnungen)
- **Tests:** PASS (**315 / 315 Tests grün**)
  - Domain: 57 / 57 PASS (Vitest)
  - Mobile: 240 / 240 PASS (Jest, 50 Testsuites)
  - Coach API: 18 / 18 PASS (Node Test Runner)
- **Coach Check:** PASS (`pnpm coach:check` – Modell und API-Key bestätigt)

---

## EVARO Beta 0.1.0-beta.1 (Baseline Checkpoint)

**Release-Datum:** 15. September 2026  
**Commit:** `7d24b85` (auf `origin/main`)  
**Tag:** `v0.1.0-beta.1`

### Enthalten
- **Funktionierendes Workout Tracking:** Sets, Reps, Weight, RPE, Rest-Timer, aktives Session-HUD, Volume-Berechnungen und atomare Speicherung.
- **Exercise Library & Filter:** 873 strukturierte Übungen durchsuchbar und filterbar nach Muskelgruppen und Equipment.
- **Trainingsprogramme & Vorlagen:** Strukturierte Pläne (GK, OK/UK, PPL, Arnold Split), Drag-and-Drop Sortierung und Session-Zuordnung.
- **Workout History & PR-Tracking:** Detaillierte Verlaufsansicht mit e1RM-Tracking und Highlight-Badges.
- **Measurements & Charts:** Körperdaten, Gewichtshistorie und Verlaufsgrafiken.
- **Achievements & Gamification:** 10-stufiges Levelsystem bis EVARO Master und Season 1: Ascend.
- **Theme- & Colorway-System:** Vollständige Unterstützung für Interface-Farben inklusive `EVARO Verde` und `EVARO Ember`.
- **AI Coach (Entwicklungsmodus):** Lokaler Proxy-Server mit OpenRouter-Anbindung, PubMed-Forschungsvalidierung und Zod-Planvalidierung.
- **EVARO Branding Harmonization:** Repositoryweite Vereinheitlichung aller sichtbaren Markenbezeichnungen (App-Name in `app.json`, Persona, Chips, Gamification, Share-Signaturen).
- **Release-Dokumentation & Architektur-Karten:**
  - `docs/release/ACCOUNT_DATA_MAP.md`
  - `docs/release/EXERCISE_ASSET_INVENTORY.md`
  - `docs/release/AUDIO_HAPTICS_AUDIT.md`
  - `docs/release/SUBSCRIPTION_INTEGRATION_MAP.md`
  - `docs/release/EXECUTION_STATUS.md`
  - `docs/release/ASTRA_HANDOFF.md`
  - `docs/release/GEMINI_WORK_SUMMARY.md`
  - `evaro_release_execution_pack/MASTER_CHECKLIST.md`
- **Repository Cleanup:** Bereinigung ungenutzter Dependencies (`@opentelemetry/api`), Überprüfung der Git-Hygiene, strikte Rückwärtskompatibilität für alle gespeicherten Nutzerdaten.

---

## Bekannte offene P0-Themen für Astra

1. **P0-01 (Lizenz/Assets):** 1.492 Übungs-GIFs werden via Hotlink von `static.exercisedb.dev` geladen (`BLOCKED`).
2. **P0-02 (Backend-Sicherheit & AI-Kosten):** Coach-Backend benötigt HTTPS-Deployment, verteiltes Rate-Limiting und serverseitigen Entitlement-Check (`READY_FOR_ASTRA`).
3. **P0-03 (Store-Compliance):** Kaskadierende Cloud-Account-Löschung gemäß Apple Guideline 5.1.1(v) fehlt serverseitig (`READY_FOR_ASTRA`).
4. **P0-04 (Monetarisierung):** RevenueCat SDK und Store-Produkte (Monat/Jahr) müssen integriert werden (`READY_FOR_ASTRA`).
5. **P0-05 (Native Rest-Timer Audio):** Web Audio API synthese in `timerAudio.ts` schlägt auf nativen Geräten fehl; Umstellung auf `expo-av` vorbereitet (`READY_FOR_ASTRA`).
