# Teststrategie

Baseline 10.09.2026: Domain/Vitest 4 Dateien, 36 Tests; Mobile/Jest 22 Suites, 100 Tests. Alle erfolgreich, keine gemeldeten Skips. Typecheck/Lint erfolgreich. Coverage gezielt für Mobile-Stores/Utils: Lines 65,22 %, Branches 49,22 %; nicht Gesamt-App-Coverage.

Commands: pnpm test; pnpm --filter @fitness-tracker/domain test; pnpm --filter @fitness-tracker/mobile exec jest --runInBand; pnpm typecheck; pnpm lint. Native JS-Check aus apps/mobile: pnpm exec expo export --platform ios --platform android --output-dir dist-native.

Priorität: IO-Fehler, Crash/Restart, Migration, doppelte Finalize-Aktion, Queue-Erweiterung während Sync, Benutzerwechsel, Zeitzonen, Einheiten, Warmup-Filter. Auth/Sync-Mocks sind keine Backend-Abnahme. SQL-Integration braucht zwei echte Testbenutzer. Geräte-E2E: Start → Übung → Set → Flugmodus → OS-Kill → Resume → Finish → History → Neustart. Keine bekannten P0/P1 für Release.
