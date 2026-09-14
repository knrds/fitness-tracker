# EVARO - Commercial Release Execution Pack

Stand: 14. September 2026

Dieses Paket übersetzt den Deep-Research-Audit des Repositories `knrds/fitness-tracker` in eine ausführbare Release-Struktur für einen KI-Agenten und für manuelle Arbeiten in Apple/Google/Vertragsportalen.

## Empfohlene Nutzung

1. Lege den gesamten Ordner in das Projekt-Repository, idealerweise unter `docs/release/` oder als temporären Projektordner neben dem Repo.
2. Starte den Agenten mit `AGENT_INITIAL_PROMPT.md`.
3. Der Agent liest zuerst `00_EXECUTION_RULES_AND_STATUS.md`, danach nur das aktuelle Work Package.
4. Der Agent arbeitet **eine Phase nach der anderen**, aktualisiert nach jedem Batch den Status und liefert Evidence (Tests, Pfade, Screenshots/Logs soweit möglich).
5. Aufgaben mit Credentials, rechtlicher Freigabe, Store Agreements oder echten Zahlungen werden nicht simuliert. Der Agent bereitet sie vor und markiert sie als `USER_ACTION_REQUIRED`.

## Kernprinzip

V1 bleibt im Feature Freeze. Vor dem ersten Umsatz werden Datenintegrität, Security, Backend, Lizenz-/Datenschutzlage, Subscriptions und reale Device-QA abgeschlossen. Nutrition, Running/GPS, Social Feed, Marketplace und ähnliche große Erweiterungen gehören nicht in den Commercial-Launch-Scope.

## Dateien

- `MASTER_ROADMAP.pdf` - lange Gesamtdokumentation und strategische/technische Roadmap.
- `00_EXECUTION_RULES_AND_STATUS.md` - Steuerungsregeln, Statusformat, Evidence-Regeln und Prioritäten.
- `01_NATIVE_RELEASE_FOUNDATION.md`
- `02_SECURITY_DATA_INTEGRITY.md`
- `03_BACKEND_AI_PRODUCTION.md`
- `04_PRIVACY_LEGAL_LICENSING.md`
- `05_MONETIZATION_SUBSCRIPTIONS.md`
- `06_ONBOARDING_PAYWALL_UX.md`
- `07_PUSH_HAPTICS_AUDIO.md`
- `08_ANALYTICS_OBSERVABILITY_SUPPORT.md`
- `09_QA_ACCESSIBILITY_PERFORMANCE.md`
- `10_STORE_SUBMISSION.md`
- `11_LAUNCH_FIRST_30_DAYS.md`
- `MASTER_CHECKLIST.md` - kompakte Statusliste für den gesamten Release.
- `DECISION_LOG_TEMPLATE.md` - Entscheidungen, Trade-offs und offene User-Fragen.
- `AGENT_INITIAL_PROMPT.md` - initialer Startprompt.

## Definition "Minimum Commercial Launch"

Ein Minimum Commercial Launch bedeutet hier **nicht** maximalen Funktionsumfang. Er bedeutet: stabiler Tracker-Core + sichere Daten + produktionsfähiger Coach + native Subscriptions + transparentes Onboarding/Paywall + Compliance + Monitoring + Store-Abnahme. Alles andere wird nach Umsatz und Retention priorisiert.
