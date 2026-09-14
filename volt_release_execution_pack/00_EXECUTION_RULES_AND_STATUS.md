# 00 - Execution Rules & Status Protocol

## Mission

Bringe Volt Performance vom funktionierenden Beta-Stand in einen kommerziell belastbaren iOS-first Release, ohne unnötiges Rewriting und ohne den bestehenden Tracker-Core zu destabilisieren.

## Harte Regeln für den Agenten

- **Feature Freeze:** Keine neuen Großbereiche wie Nutrition, Running/GPS, Social Feed, Marketplace, Wearable-Ökosystem oder Web-Dashboard vor dem ersten kommerziellen Release.
- **Bestehenden Stack bevorzugen:** Expo/React Native, SQLite, Zustand/Domain-Layer, Supabase, bestehender Coach-Backend-Ansatz. Kein Architekturwechsel nur weil ein anderer Stack moderner wirkt.
- **Security vor Conversion:** Keine Paywall-Politur darf P0-Arbeit an Data Loss, RLS, Token Storage, Secrets, Account Deletion oder Exercise-Lizenzen verdrängen.
- **Keine Secrets:** Niemals Credentials in Source, Markdown, Logs oder Chat-Ausgaben schreiben. Nur Variablennamen und Setup-Schritte dokumentieren.
- **Keine fiktiven Erfolge:** "Implementiert" ist nicht "fertig". Fertig ist eine Aufgabe erst, wenn die Definition of Done inklusive Tests/Evidence erfüllt ist.
- **Keine rechtlichen Behauptungen erfinden:** Drafts und technische Umsetzung sind erlaubt. Finale Rechtsfreigabe bleibt bei User/Jurist.
- **Keine Store-Aktionen vortäuschen:** Apple/Google/RevenueCat-Konsole kann nur als vorbereitet markiert werden, solange keine echte Bestätigung vorliegt.
- **Kleine reversible Änderungen:** Keine massiven Refactorings über mehrere Subsysteme. Lieber kleine Changesets mit Tests.
- **Datenmigration immer rückwärtsdenken:** Vor Schema-/Persistence-Änderungen Beta-/Legacy-Datenpfade und Recovery testen.
- **Sensible Telemetrie minimieren:** Keine Gewichte, Maße, Coach-Inhalte, Bilder, Tokens oder vollständige Workouts in Analytics/Error-Logs.

## Statusdatei im Repository

Lege `docs/release/EXECUTION_STATUS.md` an und halte sie aktuell. Format pro Work Package:

```md
## WP-02 Security & Data Integrity
Status: NOT_STARTED | IN_PROGRESS | BLOCKED | READY_FOR_USER | DONE
Owner: AGENT | USER | EXTERNAL
Last update: YYYY-MM-DD

### Completed
- [x] ...

### Evidence
- Tests: `npm ...` -> PASS
- Files: `path/to/file.ts`
- Manual checks: ...

### Open blockers
- USER_ACTION_REQUIRED: ...

### Next action
- ...
```

## Prioritäten

- **P0:** Launch-Blocker. Ohne Abschluss kein kommerzieller Store-Release.
- **P1:** Vor Launch stark empfohlen. Kann nur mit dokumentierter Risikoakzeptanz verschoben werden.
- **P2:** Kurz nach Launch. Sollte bereits als Backlog mit Messkriterium geplant sein.
- **P3:** Später. Kein V1-Grund, den Release zu verzögern.

## Definition of Done für Code-Aufgaben

Eine Code-Aufgabe ist nur `DONE`, wenn mindestens gilt:

1. Bestehende relevanten Tests vor/nach Änderung ausgeführt.
2. Neue Logik hat Unit-/Integrationstest oder nachvollziehbaren manuellen Testpfad.
3. Typecheck/Lint/Build-Gate entsprechend Repo-Konvention läuft.
4. Keine Secrets/PII/Health-Daten in Logs hinzugefügt.
5. Migrations-/Rollback-Risiko beurteilt.
6. Dokumentation und `EXECUTION_STATUS.md` aktualisiert.
7. Offene manuelle Schritte klar als `USER_ACTION_REQUIRED` markiert.

## Stop Conditions

Der Agent stoppt und fordert eine User-Entscheidung, wenn:

- Apple/Google/Supabase/OpenRouter/RevenueCat Credentials oder Zahlungs-/Steuerdaten erforderlich sind.
- eine Lizenzquelle/Invoice/Vertragsdatei nicht im Repo nachweisbar ist.
- eine Änderung existierende Nutzerdaten löschen oder irreversible Migrationen durchführen könnte.
- eine rechtliche Einordnung zwischen mehreren plausiblen Varianten eine Geschäftsentscheidung erfordert.
- Pricing, Brand, Publisher Identity oder Free/Pro-Scope final bestätigt werden muss.
- ein Security-Finding nur durch Risikoakzeptanz statt Fix lösbar ist.

## Reihenfolge

Arbeite in dieser Reihenfolge: 00 Baseline -> 01 Native Foundation -> 02 Security/Data -> 03 Backend/AI -> 04 Privacy/Legal/Licensing (parallel) -> 05 Subscriptions -> 06 Onboarding -> 07 Native Feel -> 08 Observability -> 09 QA -> 10 Submission -> 11 Launch.

Parallelisierung ist nur erlaubt, wenn ein Work Package kein ungelöstes P0-Gate des vorherigen Pakets voraussetzt.
