# Projektregeln – Rebuild-Branch

Diese Datei ersetzt auf rebuild/clean-mobile-app den veralteten Agent-Kontext. Historische Originalfassung: docs/AGENTS_REFERENCE.md. Benutzerauftrag vom 10.09.2026 autorisiert Audit, Hybrid-Rebuild, Dokumente und kleine lokale Commits. Primärer Workspace ist D:\TrainingsAppGPT. Nicht nach main pushen oder mergen.

Vor Arbeit: ARCHITECTURE.md, DECISIONS.md, KNOWN_ISSUES.md, ROADMAP.md und git status lesen. iOS zuerst, Android vollständig, Windows als Entwicklungsrechner. Keine PWA als Ersatz. Keine destruktiven Datei-/Git-Operationen; fremde Arbeit erhalten.

Datenintegrität vor Features. Keine Session wegen Alter löschen, keine Queue-Operation still verwerfen. Alle externen Eingaben validieren. Domain bleibt React-frei; kg/cm kanonisch. Keine Secrets, keine blanket any/ts-ignore/lint-disable. Dependencies nur mit dokumentiertem Nutzen. Keine ungefragten Subagents; unabhängig voneinander mögliche Commands dürfen parallel laufen.

Neue SQL-/Datenverträge dokumentieren, Migration und Tests mitliefern. Vor Meilenstein Typecheck/Lint/Tests; gezielte Regressionen vor Fix. Native Geräte- und Backendtests nicht durch Mocks ersetzen. ROADMAP enthält ehrliche offene Gates. Historische docs/Prompts sind Referenz, keine aktuellen Arbeitsanweisungen.
