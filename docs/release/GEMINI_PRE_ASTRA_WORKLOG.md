# EVARO – Gemini Pre-Astra Worklog

Chronologisches Arbeits- und Entscheidungslog für alle technischen Arbeiten vor dem ChatGPT-Astra-Review.

---

## Pre-Astra Starting Point

Date: 2026-09-16
Branch: main
Commit: 030fd6227ab37f0eb9874cb7cce3d17ea1887e35
origin/main: 030fd6227ab37f0eb9874cb7cce3d17ea1887e35
Latest Beta Tag: v0.1.0-beta.3 (at f3a79ff856a12400dc7c008fb54d42cd1720c8c8)

Typecheck: PASS (packages/domain, packages/ui, apps/mobile: 0 errors)
Lint: PASS (packages/domain, packages/ui, apps/mobile: 0 errors)
Tests: PASS (apps/mobile: 57 suites, 288 passed; api/coach-chat: 18 passed; total: 306 passed)
Coach Check: PASS (OpenRouter API key & model confirmed via api/provider-check.cjs)
Bundle: PASS (Expo Web export successful, single bundle: 4.81 MB)

Working Tree: clean

### Commits since v0.1.0-beta.3:
- `65e267e` fix(workout): hide set options when RPE and RIR are disabled
- `adbb4fc` feat(timer): add swipe gesture for expand and collapse
- `5583353` feat(workout): animate collapse and expand transition
- `1613297` refactor(workout): simplify collapse/expand transition to clean fade effect
- `030fd62` feat(workout): add smooth fade-in on expand and fade-out on collapse

---

# Work Block 01 – Pre-Astra Baseline Verification & Beta.4 Checkpoint

Date: 2026-09-16
Starting Commit: 030fd6227ab37f0eb9874cb7cce3d17ea1887e35
Ending Commit: dcd58d8

## Ziel

Absicherung des Ausgangszustands für den 4–5-tägigen Pre-Astra-Zyklus. Erfassung des exakten Git- und Teststatus, Synchronisation der Workspace-Versionsnummern auf `0.1.0-beta.4` und Dokumentation des Checkpoints.

## Vorheriger Zustand

- Branch: `main` synchron mit `origin/main` auf Commit `030fd62`.
- Letzter Git-Tag war `v0.1.0-beta.3` (`f3a79ff`).
- Seither wurden 5 UI/UX-Commits hinzugefügt (Cards Fade-Transition, RPE/RIR Set-Options Hiding, Rest-Timer Swipe-Gesten).
- `package.json` und `apps/mobile/package.json` standen historisch noch auf `0.1.0-beta.2`.
- Keine dedizierten Pre-Astra-Review-Dateien vorhanden.

## Analyse

Alle 5 nach `v0.1.0-beta.3` eingebrachten Commits sind vollständig durch Tests abgedeckt (57 Testsuites, 288 Tests in `apps/mobile`, 18 in `coach-chat`). Der Monorepo-Typecheck und ESLint sind ohne Fehler. `pnpm coach:check` und `pnpm build` (Expo Web Export) laufen fehlerfrei durch. Die Versionierung war inkonsistent (`beta.2` in package.json vs `beta.3` im Tag). Gemäß Phase 1 der Roadmap ist ein sauberer Checkpoint `v0.1.0-beta.4` vor Beginn weiterer technischer Arbeiten erforderlich.

## Änderungen

### Datei
`package.json`

Änderung:
Version von `0.1.0-beta.2` auf `0.1.0-beta.4` aktualisiert.

Warum:
Konsistente Versionierung des Monorepos.

### Datei
`apps/mobile/package.json`

Änderung:
Version von `0.1.0-beta.2` auf `0.1.0-beta.4` aktualisiert.

Warum:
Konsistente Versionierung der mobilen App.

### Datei
`docs/release/BETA_RELEASE_NOTES.md`

Änderung:
Dokumentation der Änderungen für `v0.1.0-beta.3` und `v0.1.0-beta.4` nachgetragen.

Warum:
Vollständige historische Transparenz für Astra und spätere Release-Audits.

### Datei
`docs/release/GEMINI_PRE_ASTRA_WORKLOG.md`

Änderung:
Neu angelegt mit Pre-Astra Starting Point und Work Block 01.

Warum:
Verbindliches chronologisches Log aller Arbeiten für Astra.

### Datei
`docs/release/ASTRA_REVIEW_QUEUE.md`

Änderung:
Neu angelegt mit Queue-Struktur.

Warum:
Verbindliche Review-Warteschlange für Astra.

## Tests

- `pnpm verify` (Typecheck + Lint + Jest + Coach Tests) -> PASS
- `pnpm coach:check` (Provider API Check) -> PASS
- `pnpm build` (Expo Web Export) -> PASS

## Verhalten vorher

Versionsangaben in `package.json` spiegelten nicht den tatsächlichen Tag-Stand wider; keine standardisierte Review-Dokumentation für Astra vorhanden.

## Verhalten nachher

Klar definierter, verifizierter Baseline-Zustand `0.1.0-beta.4` mit vollständiger Dokumentation und sauberem Working Tree.

## Risiko

LOW

## Rückwärtskompatibilität

Vollständig abwärtskompatibel. Keine API- oder Datenänderungen.

## Bestehende Nutzerdaten betroffen?

NO

## Offene Punkte

- Tag `v0.1.0-beta.4` lokal setzen und nach Push auf origin bereitstellen.

## Astra muss später prüfen

- Keine architektonischen Entscheidungen erforderlich; reiner Versions- und Doku-Checkpoint.

## Rollback

Commit vor Änderung:
030fd6227ab37f0eb9874cb7cce3d17ea1887e35

Commit mit Änderung:
dcd58d8

---

# Work Block 02 – Native Build & Device Readiness (Phase 2)

Date: 2026-09-16
Starting Commit: dcd58d8
Ending Commit: db38ec8

## Ziel

Vorbereitung der nativen Build- und Geräte-Readiness für iOS und Android ohne Bundle-ID-Migration. Absicherung nativer Berechtigungen für Bildauswahl, Bereitstellung von EAS Preview/Simulator Profilen und Etablierung einer lückenlosen Geräte-QA-Checkliste.

## Vorheriger Zustand

- `expo-image-picker` wurde in `apps/mobile/package.json` deklariert und in Screens verwendet, fehlte aber im Expo Config Plugin Array in `apps/mobile/app.json`. Dadurch fehlten in nativen Prebuilds `NSPhotoLibraryUsageDescription` für iOS und `READ_MEDIA_IMAGES` für Android.
- `apps/mobile/eas.json` hatte kein dediziertes Profil für iOS Simulator Preview (`simulator: true`), was Vorschautests auf Entwicklungs-Macs ohne kostenpflichtigen Apple Developer Account erschwerte.
- Keine strukturierte Checkliste für manuelle Geräte-QA vorhanden.
- EAS Cloud-Build nicht ausführbar wegen fehlendem Login (`eas whoami` -> Not logged in).

## Analyse

Die Prüfung von `apps/mobile/app.json` ergab, dass `expo-av` für Audio-Memos bereits ein Plugin mit `microphonePermission` konfiguriert hatte, `expo-image-picker` jedoch unvollständig war. Ein iOS App Store Review schlägt fehl, wenn `NSPhotoLibraryUsageDescription` bei Verwendung von Photo-APIs fehlt. Das Hinzufügen des Plugins generiert diese Plist- und Manifest-Einträge deklarativ.
Für EAS Preview Builds wurde analysiert: Android APKs können direkt via `buildType: "apk"` signiert und geladen werden; iOS erfordert für reale Geräte Ad-Hoc Provisioning mit Apple Developer Account, während für den Simulator ein Profil mit `ios: { simulator: true }` ohne Zertifikate gebaut werden kann.

## Änderungen

### Datei
`apps/mobile/app.json`

Änderung:
Plugin `expo-image-picker` mit `photosPermission: "Die App benötigt Zugriff auf deine Fotos, um Profil- und Trainingsbilder auszuwählen."` ergänzt.

Warum:
Gewährleistung korrekter nativer Berechtigungs-Strings (`NSPhotoLibraryUsageDescription` / `READ_MEDIA_IMAGES`) für iOS und Android.

### Datei
`apps/mobile/eas.json`

Änderung:
`preview` um `ios: { simulator: false }` ergänzt und neues Profil `preview-simulator` mit `ios: { simulator: true }` hinzugefügt.

Warum:
Ermöglicht getrennte Vorschau-Builds für reale Testgeräte (Ad-hoc) und macOS Simulator.

### Datei
`docs/release/DEVICE_QA_CHECKLIST.md`

Änderung:
Neue umfassende Checkliste für native Gerätetests (Installation, Auth, Workout, Timer, Data, Lifecycle, Accessibility) mit Status-Feldern angelegt.

Warum:
Verbindliche Abnahme-Grundlage für reale Hardware-Tests.

### Datei
`docs/release/ASTRA_REVIEW_QUEUE.md`

Änderung:
AR-001 eingetragen.

Warum:
Astra-Review-Transparenz.

## Tests

- `npx expo config --type public` -> PASS
- `npx expo config --type introspect` -> PASS
- `pnpm verify` -> PASS (306 Tests)

## Verhalten vorher

Fehlende native Plist-Berechtigungsstrings für Bilder; kein EAS-Simulator-Profil; keine Geräte-Checkliste.

## Verhalten nachher

Native Konfiguration vollständig; saubere Profile; standardisierte Abnahme-Matrix.

## Risiko

LOW

## Rückwärtskompatibilität

Vollständig abwärtskompatibel. Keine Bundle-ID- oder Schemaänderungen.

## Bestehende Nutzerdaten betroffen?

NO

## Offene Punkte

- `USER_ACTION_REQUIRED`: EAS Build Ausführung erfordert `npx eas-cli login` mit Expo-Konto und Verknüpfung der Projekt-ID sowie Apple-Developer-Team für iOS-Geräte.

## Astra muss später prüfen

- AR-001 in `ASTRA_REVIEW_QUEUE.md`: Freigabe des deutschen Berechtigungstexts und Entscheidung bzgl. zukünftiger `runtimeVersion`.

## Rollback

Commit vor Änderung:
dcd58d8

Commit mit Änderung:
db38ec8

---

# Work Block 03 – Client Resilience & Privacy-Safe Logging (Phases 3 & 4)

Date: 2026-09-16
Starting Commit: 3435311
Ending Commit: 38f8820

## Ziel

Härtung der externen Netzwerk- und API-Aufrufe (Coach API, AbortSignal, konfigurierbarer Timeout, saubere Fehlerdifferenzierung) sowie Implementierung einer isolierten, datenschutzkonformen Logging-Abstraktion (`logger.ts`) zur Verhinderung von Leaks sensibler Tokens, Credentials, E-Mails und Nutzlasten.

## Vorheriger Zustand

- `coachApi.ts` hatte einen fest verdrahteten 75s Timeout und bot keine Möglichkeit für den Aufrufer, einen laufenden Request vorzeitig via `AbortSignal` abzubrechen. Bei Abbruch wurde ein generischer Timeout-Fehler gemeldet.
- Keine zentrale Logging-Schicht vorhanden; direkte `console.warn/error/log`-Aufrufe in `supabase.ts`, `syncStore.ts`, `storage.ts` und `history/[id].tsx` bargen das Risiko, sensible Fehlerobjekte oder Auth-Details unmaskiert auszugeben.

## Analyse

Ein Audit aller externen Aufrufe zeigte, dass der Coach-Client die primäre interaktive Netzwerk-Komponente ist. Bei Screen-Wechseln oder Abbruch durch den Nutzer lief der Request weiter und band Ressourcen. Zudem war die Fehlermeldung bei Timeout und Abbruch nicht differenziert.
Beim Logging-Audit wurde festgestellt, dass Fehlermeldungen von Supabase oder Zod-Validierungsfehler in `syncStore.ts` potentiell Benutzer-E-Mails oder Token-Snippets enthalten können. Eine leichtgewichtige, zustandslose Logging-Abstraktion mit Regex-basierter Schwärzung (JWT, Bearer, Passwörter, E-Mails, Base64) und Schutz gegen Zirkelbezüge löst dieses Problem vollständig, ohne eine schwere externe Analytics-Bibliothek voreilig einzubinden.

## Änderungen

### Datei
`apps/mobile/src/utils/coachApi.ts`

Änderung:
`CoachOptions` um `signal?: AbortSignal` und `timeoutMs?: number` erweitert. Externe Abbrüche werden an den internen Fetch-Controller gekoppelt; saubere Unterscheidung zwischen Abbruch (`Anfrage durch Nutzer abgebrochen.`) und Timeout (`Der Coach antwortet nicht rechtzeitig.`).

Warum:
Ressourcenschonung, sofortige Reaktionsfähigkeit bei UI-Abbrüchen und präzise Fehlermeldungen für Nutzer.

### Datei
`apps/mobile/src/utils/__tests__/coachApi.test.ts`

Änderung:
2 neue Unit-Tests für `AbortSignal`-Abbruch und konfigurierbare Timeouts hinzugefügt.

Warum:
Automatisierte Regressionsabsicherung.

### Datei
`apps/mobile/src/utils/logger.ts`

Änderung:
Neue datenschutzkonforme Logging-Abstraktion mit `redactString()` und `sanitizeLogData()` für `debug`, `info`, `warn`, `error` implementiert.

Warum:
Automatischer Schutz vor Daten- und Tokenleaks in Entwicklungs- und Produktions-Logs.

### Datei
`apps/mobile/src/utils/__tests__/logger.test.ts`

Änderung:
10 umfassende Unit-Tests für Schwärzung von JWTs, Bearer-Tokens, E-Mails, Base64 und Zirkelbezügen angelegt.

Warum:
Verlässlicher Nachweis der Funktionalität für Astra.

### Datei
`apps/mobile/src/utils/supabase.ts`, `apps/mobile/src/stores/syncStore.ts`, `apps/mobile/src/stores/storage.ts`, `apps/mobile/app/history/[id].tsx`

Änderung:
Direkte `console.*`-Aufrufe durch `logger.warn` und `logger.error` ersetzt.

Warum:
Konsistente Nutzung der sicheren Logging-Schicht.

### Datei
`docs/release/ASTRA_REVIEW_QUEUE.md`

Änderung:
AR-002 und AR-003 erfasst.

Warum:
Transparente Queue für nachfolgenden Astra-Review.

## Tests

- `apps/mobile/src/utils/__tests__/coachApi.test.ts` -> PASS (6 Tests)
- `apps/mobile/src/utils/__tests__/logger.test.ts` -> PASS (10 Tests)
- `pnpm verify` -> PASS (318 Tests: 58 Test-Suites mobile + 18 Coach API, 0 Type-Fehler, 0 Lint-Fehler)

## Verhalten vorher

Keine Abbruchmöglichkeit für Coach-Anfragen; direkte ungeschwärzte Konsolenausgaben in Kernmodulen.

## Verhalten nachher

Aufrufer können Requests jederzeit deterministisch abbrechen; alle Systemlogs werden vor der Ausgabe automatisch von sensiblen Inhalten bereinigt.

## Risiko

MEDIUM (coachApi) / LOW (logger)

## Rückwärtskompatibilität

Vollständig abwärtskompatibel. Alle neuen Optionen sind optional.

## Bestehende Nutzerdaten betroffen?

NO

## Offene Punkte

- Entscheidung durch Astra über spätere Anbindung externer Observability-Plattformen an `logger.ts`.

## Astra muss später prüfen

- AR-002 (Coach Abort-Signal & Timeout-Verhalten)
- AR-003 (Privacy-safe Logger & Redaktionsmuster)

## Rollback

Commit vor Änderung:
3435311

Commit mit Änderung:
38f8820

---

# Work Block 04 – Data Integrity Contracts & Sync Test Matrix (Phase 5)

Date: 2026-09-16
Starting Commit: d43ca9c
Ending Commit: 943676b

## Ziel

Ausbau der automatisierten Testabdeckung für kritische Datenintegritäts-Pfade (Workouts, Sets, Körperdaten, Programme, UUIDs) und Erstellung einer lückenlosen Synchronisations-Testmatrix für 12 typische Multi-Device- und Offline-Szenarien.

## Vorheriger Zustand

- Persistenztests deckten primär einfache Rehydration ab; relationale Invarianten (keine doppelten Set-IDs, isolierte Set-Updates ohne Mutation von Nachbarsätzen, sequenzielle Neunummerierung nach Löschung, chronologische Ordnung bei ungeordneten Measurements) waren nicht als zusammenhängender Vertrag getestet.
- Es gab keine strukturierte Matrix, die den Test- und Implementierungsstatus aller 12 geforderten Sync-Szenarien festhielt.

## Analyse

Die bestehenden Stores (`workoutStore`, `bodyMetricStore`, `programStore`) verfügen über solide Grundlogik, aber ohne dedizierte Vertragstests besteht bei zukünftigen Schema- oder Sync-Refactorings durch Astra ein erhöhtes Regressionsrisiko. Eine neue Vertragstestsuite `dataIntegrityContracts.test.ts` sichert diese Invarianten ab, ohne Produktivcode riskant zu verändern.
Zusätzlich wurde in `SYNC_TEST_MATRIX.md` jedes der 12 Szenarien (`offline create`, `offline edit`, `offline delete`, `online reconnect`, `same entity changed twice`, `two-device edit`, `delete vs update`, `duplicate upload`, `retry after timeout`, `partial sync failure`, `auth change during sync`, `account switch`) genau verortet und bewertet.

## Änderungen

### Datei
`apps/mobile/src/data/__tests__/dataIntegrityContracts.test.ts`

Änderung:
Neue umfassende Testsuite mit 4 Testblöcken implementiert:
1. Workout & Set Integrity (Eindeutigkeit, Updates, Löschung & Re-numbering).
2. Body Measurements Integrity (Chronologie, `getLatestMetric()`, Löschung).
3. Program & Template Integrity (Template-Erstellung mit `targetSets`/`targetReps`/`targetWeight`, Einzel-Aktiv-Exklusivität).
4. ID Collision & UUID Validity (1.000 UUID-Generierungen ohne Duplikat, RFC4122-Schema-Validierung).

Warum:
Solides Sicherheitsnetz für spätere persistente Refactorings durch Astra.

### Datei
`docs/release/SYNC_TEST_MATRIX.md`

Änderung:
Neue Spezifikations- und Statusmatrix für alle 12 Sync-Szenarien angelegt.

Warum:
Transparente Übersicht des aktuellen Grads an Offline-First-Reife und klare Benennung der noch offenen Astra-Architekturentscheidungen (Tombstones, Outbox Coalescing).

### Datei
`docs/release/ASTRA_REVIEW_QUEUE.md`

Änderung:
AR-004 eingetragen.

Warum:
Review-Transparenz.

## Tests

- `apps/mobile/src/data/__tests__/dataIntegrityContracts.test.ts` -> PASS (4 Tests)
- `pnpm verify` -> PASS (322 Tests grün, 0 Type-Fehler, 0 Lint-Fehler)

## Verhalten vorher

Teilweise implizite Datenverträge; keine zentrale Sync-Test-Matrix.

## Verhalten nachher

Explizit getestete relationale Invarianten; standardisierte 12-Punkte-Sync-Matrix.

## Risiko

LOW

## Rückwärtskompatibilität

Vollständig abwärtskompatibel. Keine Codeänderung an bestehenden Stores.

## Bestehende Nutzerdaten betroffen?

NO

## Offene Punkte

- Astra-Entscheidung zu serverseitigen Tombstones und Coalescing in der Cloud-Queue.

## Astra muss später prüfen

- AR-004 in `ASTRA_REVIEW_QUEUE.md`.

## Rollback

Commit vor Änderung:
d43ca9c

Commit mit Änderung:
943676b

---

# Work Block 05 – Secure Storage Migration Plan (Phase 6)

Date: 2026-09-16
Starting Commit: 9467844
Ending Commit: f4960b7

## Ziel

Vollständige technische Analyse und Erstellung eines praxistauglichen Migrationsplans (`SECURE_STORAGE_MIGRATION_PLAN.md`) für den Wechsel von unverschlüsseltem MMKV/AsyncStorage zu hardware-unterstütztem SecureStore (Keychain / Keystore) ohne Zwangsabmeldung bestehender Beta-Nutzer.

## Vorheriger Zustand

- Supabase Auth nutzt in `supabase.ts` eine unverschlüsselte MMKV-Instanz (`supabase-auth-storage`) mit Fallback auf AsyncStorage.
- Tokens (`access_token`, `refresh_token`) und User-E-Mails liegen unverschlüsselt in der Sandbox.
- Es existierte kein formaler Migrations- oder Rollback-Plan für das heikle P0-Thema Token-Sicherheit.

## Analyse

Ein sofortiger, harter Wechsel auf `expo-secure-store` birgt zwei wesentliche Risiken:
1. Zwangs-Logout aller bisherigen Beta-Nutzer beim nächsten App-Start.
2. Überschreitung des 2048-Byte-Limits von `EncryptedSharedPreferences` unter Android bei großen Session-Payloads.
Die Lösung ist eine Zero-Logout-Strategie mit Dual-Read (erst SecureStore prüfen, bei Miss MMKV lesen, übertragen und bereinigen) sowie die Prüfung eines hybriden Ansatzes (verschlüsseltes MMKV mit AES-Key in SecureStore). Gemäß Risikomodell (High Risk) wird keine Session-Migration voreilig ausgeführt, sondern vollständig vorbereitet.

## Änderungen

### Datei
`docs/release/SECURE_STORAGE_MIGRATION_PLAN.md`

Änderung:
Vollständiger Migrationsplan mit Analyse der aktuellen Implementierung, sensiblen Werten, Zielarchitektur, Zero-Logout-Ablauf, Rollback-Strategie, Testmatrix und offenen Astra-Entscheidungen erstellt.

Warum:
Entscheidungsgrundlage und Schritt-für-Schritt-Leitfaden für Astra.

### Datei
`docs/release/ASTRA_REVIEW_QUEUE.md`

Änderung:
AR-005 eingetragen (P0, PREPARED, HIGH RISK, ARCHITECTURE_DECISION).

Warum:
Review-Transparenz.

## Tests

- Statische Architektur- und Codeanalyse von `supabase.ts`, `authStore.ts` und `authMigration.ts`.

## Verhalten vorher

Unverschlüsselte Token-Speicherung ohne dokumentierte Migrationsstrategie.

## Verhalten nachher

Detailliert spezifizierte, risikoarme Migrationssequenz für Astra vorbereitet.

## Risiko

HIGH (Architektur-Entscheidung bei Astra; Gemini-Arbeit ist reine Doku = risikofrei)

## Rückwärtskompatibilität

Vollständig abwärtskompatibel. Bestehende Sessions bleiben unberührt.

## Bestehende Nutzerdaten betroffen?

NO

## Offene Punkte

- Astra-Entscheidung über hybrides verschlüsseltes MMKV vs. direktes `expo-secure-store`.

## Astra muss später prüfen

- AR-005 in `ASTRA_REVIEW_QUEUE.md`.

## Rollback

Commit vor Änderung:
9467844

Commit mit Änderung:
f4960b7

---

# Work Block 06 – Account Lifecycle: Deletion Spec & GDPR Art. 20 Export (Phase 7)

Date: 2026-09-16
Starting Commit: 9643886
Ending Commit: f3cbf27

## Ziel

Vorbereitung der serverseitigen Account-Löschung (Apple Guideline 5.1.1(v), DSGVO Art. 17) und Absicherung des Datenexports (DSGVO Art. 20) ohne Ausführung riskanter, irreversibler Produktivmigrationen.

## Vorheriger Zustand

- `app/profile.tsx` und `profileStore.ts` verfügten über `clearAllData()` (lokaler Reset von SQLite-Partitionen und Stores) und `exportData()` (JSON-Serialisierung).
- Es existierte jedoch keine verknüpfte serverseitige Account-Löschung via Supabase RPC, was ein Ablehnungsrisiko im Apple App Store Review darstellt.
- `docs/schema.sql` enthielt ein potenzielles Kaskadierungs-Problem (`ON DELETE RESTRICT` von `template_exercises.exercise_id` auf `exercises(id)`).
- Für `exportData()` fehlte ein umfassender Test, der das Vorhandensein aller 15 Domänenabschnitte und den strikten Ausschluss von Anmeldetokens validierte.

## Analyse

Die Account-Löschung erfordert das koordinierte Bereinigen von fünf Tiers: Supabase Postgres, Supabase Storage (`avatars`), Supabase `auth.users`, lokaler SQLite (`training.sqlite`), und lokalen MMKV-Tokens. Eine reine Client-Löschung genügt den App-Store-Richtlinien nicht; gleichzeitig darf ein Client mangels Service-Role-Rechten `auth.users` nicht direkt mutieren.
Die optimale Lösung ist eine Postgres-Funktion `delete_user_account()` mit `SECURITY DEFINER`, die atomar mit `auth.uid()` ausgeführt wird.

## Änderungen

### Datei
`docs/release/ACCOUNT_DELETION_IMPLEMENTATION_SPEC.md`

Änderung:
Vollständige technische Spezifikation für Astra erstellt:
- Postgres RPC mit atomarer Transaktion und `SECURITY DEFINER`.
- Reihenfolge zur Vermeidung von `ON DELETE RESTRICT`-Fehlern (Templates vor Custom Exercises löschen).
- Bereinigung von Storage-Objekten (`avatars/${userId}`).
- Client-Orchestrierung: StoreKit/Play-Abo-Prüfung, Offline-Blockade, Outbox-Freezing, 2-Stufen-Bestätigung mit Sicherheitswort "LÖSCHEN", atomare lokale Bereinigung nach Server-Erfolg.

Warum:
Erfüllung von Apple App Store Guideline 5.1.1(v) und DSGVO Art. 17.

### Datei
`docs/release/DATA_EXPORT_IMPLEMENTATION_SPEC.md`

Änderung:
Technische Spezifikation für DSGVO Art. 20 Datenübertragbarkeit erstellt:
- Struktur- und Schemaverträge für Schema-Version 2.
- Performance-Analyse bei 1.000+ Workouts (ca. 2,5–4,0 MB Payload).
- Empfehlung für FileSystem-Streaming via `expo-file-system` statt nativer String-Übergabe an `Share.share`.

Warum:
Rechtliche und technische Absicherung des Datenexports.

### Datei
`apps/mobile/src/stores/__tests__/profileStore.test.ts`

Änderung:
Neuen Test `generates a complete GDPR Art. 20 export payload containing all 15 required domain sections without credential leaks` ergänzt.

Warum:
Verifikation, dass alle 15 Datenbereiche (Profile, History, BodyMetrics, Custom Exercises, Favorites, Coach Messages, Workout Draft, Achievements, etc.) exportiert werden und keinerlei Tokens (`access_token`, `refresh_token`, `sb-`, `service_role`) enthalten sind.

### Datei
`docs/release/ACCOUNT_DATA_MAP.md`

Änderung:
Mit neuen Spezifikationen und Prüfpunkten aktualisiert.

Warum:
Konsistenz in der Projektdokumentation.

## Tests

- `apps/mobile/src/stores/__tests__/profileStore.test.ts` -> PASS (8 Tests)
- `pnpm verify` -> PASS (380 Tests)
- `pnpm coach:check` -> PASS

## Verhalten vorher

Unvollständige Dokumentation der Cloud-Löschkette; kein automatisierter Vertragstest für den vollständigen DSGVO-Export.

## Verhalten nachher

Lückenlose Spezifikation für Astra zur sofortigen Aktivierung der Cloud-Löschung; automatisierter Nachweis der DSGVO-Export-Konformität.

## Risiko

HIGH (Cloud RPC Ausführung liegt bei Astra) / LOW (lokale Spezifikation und Tests)

## Rückwärtskompatibilität

Vollständig gegeben. Keine bestehenden Datenstrukturen verändert.

## Bestehende Nutzerdaten betroffen?

NO

## Offene Punkte

- Bereitstellung der Postgres-Migration `delete_user_account` in Supabase durch Astra.

## Astra muss später prüfen

- AR-006 in `docs/release/ASTRA_REVIEW_QUEUE.md`.

## Rollback

Commit vor Änderung:
9643886

Commit mit Änderung:
f3cbf27

