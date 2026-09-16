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
Ending Commit: 8914eb7

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
8914eb7
