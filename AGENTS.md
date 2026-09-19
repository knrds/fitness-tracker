# Projektregeln – EVARO Security Takeover

Aktueller Workspace: C:\Users\skwar\Desktop\TrainingsAppGPT. Benutzerauftrag vom 19.09.2026: sicherer Takeover, danach permanente Security Governance und Security-Roadmap. Review-Branch: astra/p0-release-core. Nicht nach main pushen oder mergen. Historischer Kontext: docs/AGENTS_REFERENCE.md.

## Verbindliche Security Governance für alle Agenten

Vor Änderungen [EVARO_SECURITY_GUARDRAILS.md](evaro_release_execution_pack/EVARO_SECURITY_GUARDRAILS.md) lesen. Diese Regeln gelten dauerhaft für Astra, Gemini, Codex und weitere Agenten. Die aktuelle [Security-Roadmap](evaro_release_execution_pack/EVARO_SECURITY_RELEASE_ROADMAP.pdf) und die S0–S12-Matrix in [P0_READINESS_MATRIX.md](docs/release/P0_READINESS_MATRIX.md) bestimmen die Reihenfolge. Feature Expansion bleibt eingefroren. Priorität: Datenintegrität, Security/Privacy, Account-Sicherheit, AI-Sicherheit, Subscription-Integrität, Native-Stabilität, Performance, UX.

Jeder Block dokumentiert Risiko (LOW/MEDIUM/HIGH/CRITICAL), Schutzbedarf, Vertrauensgrenzen, Tests und verbleibende Gates. Clientdaten, externe Eingaben und AI-Ausgaben sind nicht vertrauenswürdig. Server prüft Identität, Ownership und Entitlements. Kein privilegierter Schlüssel im Client. Keine Auth-, Health-, Workout- oder Coach-Rohdaten in generischen Logs/Analytics. Keine versteckten Produktions-Bypasses. Fehler dürfen weder lokalen Wipe noch verlorene Queue-Operationen als Erfolg tarnen.

Vor Commit: relevante Regressionen, Typecheck/Lint und Secret-Precheck. Vor PR/Meilenstein zusätzlich vollständige Tests/Build sowie Dependency-, Secret-, SAST- und Lizenzprüfung; migrationsbezogen echte Backend-/RLS-Tests. Fehlende oder fehlgeschlagene Kontrollen als offene Gates ausweisen. CI darf Security-Fehler nicht mit continue-on-error verbergen. Actions unveränderlich pinnen, minimale Tokenrechte, keine Secrets für unvertrauenswürdige PRs.

Keine Produktionsfreigabe bei unbewerteten kritischen/hohen Befunden. Risikoakzeptanz erfordert explizite Nutzerentscheidung mit Befund, Auswirkung, Ausnutzbarkeit, Mitigation, Owner und Ablaufdatum. Rechtstexte, Preise, Bundle-ID, Finanzverträge, Credential-Verantwortung und irreversible Produktionsmigrationen nicht selbst entscheiden. Blockierte Aufgaben halten unabhängige sichere Arbeit nicht auf.

Vor Arbeit: ARCHITECTURE.md, DECISIONS.md, KNOWN_ISSUES.md, ROADMAP.md und git status lesen. iOS zuerst, Android vollständig, Windows als Entwicklungsrechner. Keine PWA als Ersatz. Keine destruktiven Datei-/Git-Operationen; fremde Arbeit erhalten.

Datenintegrität vor Features. Keine Session wegen Alter löschen, keine Queue-Operation still verwerfen. Alle externen Eingaben validieren. Domain bleibt React-frei; kg/cm kanonisch. Keine Secrets, keine blanket any/ts-ignore/lint-disable. Dependencies nur mit dokumentiertem Nutzen. Keine ungefragten Subagents; unabhängig voneinander mögliche Commands dürfen parallel laufen.

Neue SQL-/Datenverträge dokumentieren, Migration und Tests mitliefern. Vor Meilenstein Typecheck/Lint/Tests; gezielte Regressionen vor Fix. Native Geräte- und Backendtests nicht durch Mocks ersetzen. ROADMAP enthält ehrliche offene Gates. Historische docs/Prompts sind Referenz; die oben ausdrücklich benannten aktuellen Security-Dokumente sind verbindlich. Wiederkehrende Sicherheitsprüfungen und Zuständigkeiten stehen in SECURITY.md. DONE nur für implementierte, getestete und integrierte Kontrollen; keine Dokumentations- oder Mock-Abnahme als Produktionsnachweis.
