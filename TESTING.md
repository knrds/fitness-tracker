# Testnachweise – 10.09.2026

171 Tests bestanden: Domain/Vitest 40 Tests in 5 Dateien, Mobile/Jest 131 Tests in 29 Suites. Keine Tests deaktiviert. Baseline: 136 Tests. Typecheck und Lint erfolgreich.

## Was tatsächlich geprüft wurde
- Recovery einmal nach Hydration, leere/alte Sessions bleiben erhalten.
- Queue-Erweiterung während Upload, Single-flight und dauerhafte Fehlerqueue.
- Ungültiges JSON, unbekannte Persistenzversion, Async-Hydration-Rennen, unveränderte Backups, Schema-Defaults, ISO-Notizen.
- Workout-Hydration für Version 0/1 erhält Session-/Template-/Programm-IDs, Sets und Daten.
- Elf Tests in zwei Suites nutzen eine echte SQLite-Engine über node:sqlite (Node 24.13.0, SQLite 3.50.4): Datei erneut öffnen, idempotenter Import, SQL-Fehlerinjektion, Importmarker-Rollback, Backup-Löschung ohne Wiederimport, gebundene SQL-Werte, Versionsschutz, tatsächlicher Store-Finalize inklusive Queue/XP, SQL- und UI-Rollback, einmaliger Retry, fehlgeschlagene Set-Eingabe sowie native Legacy-Importpfade.
- Drei UI-Tests für Ladebarriere, Recovery-Retry und sichtbaren Schreibfehler.
- Lokaler Reset berücksichtigt Coach, Queue und Backup-Cleanup.

Jest-Komponententests mocken die Expo-Gerätebindung. Die beiden SQLite-Suites ersetzen nur diese Bindung durch node:sqlite und benutzen dieselbe Repository-/Store-Implementierung. Das ist kein iPhone-Test.

## Browserprüfung
Chromium 390×844: erster Start funktioniert; Übung Barbell Curl → 20 kg × 10 → abgeschlossen → Reload → Resume erhält Werte → Finish → 200 kg/1 Set → erneuter Start → History bleibt vorhanden. Leeres Finish zeigt Weitertrainieren/Verwerfen; Weitertrainieren erhält die Session. Gezielte Korruption im Testprofil sperrt die Oberfläche; Retry lässt die beschädigten Bytes unverändert; nach Wiederherstellen der gesicherten Testbytes lädt dieselbe Session wieder.

Screenshots wurden visuell geprüft. Web-Animation meldete einen bekannten useNativeDriver-Fallback. Keine Übertragung von echten Trainingsdaten für diese Prüfung.

## Builds
Expo dependency check und Expo Doctor (18/18 Prüfungen) erfolgreich. Web-Export und Hermes-JS-Export für iOS/Android erfolgreich; beide nativen Bündel enthalten den training.sqlite-Pfad. EAS-Konfigurationen haben getrennte Development-/Preview-/Production-IDs. Kein signierter IPA/APK-Build, keine Geräteinstallation und keine Remote-CI-Ausführung dieses lokalen Branches.

## Befehle
`pnpm install --frozen-lockfile`
`pnpm typecheck`
`pnpm lint`
`pnpm test`
`pnpm --filter @fitness-tracker/mobile exec expo install --check`
`pnpm --filter @fitness-tracker/mobile exec expo export --platform ios --platform android --output-dir dist-native`

Noch erforderlich: echtes iPhone/Android, Flugmodus, OS-Kill, Speicherfehler auf Geräten, Migration realer Altbestände, Performance bei großen Verläufen, zwei Testbenutzer und serverseitige RLS-/Konflikttests.
