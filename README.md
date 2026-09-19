# EVARO – Native Mobile Trainings-App

React Native / Expo Trainings-App für iOS und Android, unter Windows entwickelt. Aktueller Workspace: `C:\Users\skwar\Desktop\TrainingsAppGPT`.

## Start
Node 24 (getestet: 24.13.0), pnpm 11.5.0.
- Installieren: `pnpm install --frozen-lockfile`
- Prüfen: `pnpm verify` (Checkpoint 19.09.2026: 598 Tests PASS; aktuelle Gates siehe Ausführungsstatus)
- Coach Check: `pnpm coach:check`
- Nativer Development Client: `pnpm dev-client`. (Passendes Development-Binary erforderlich; siehe `IOS_SETUP.md` und `ANDROID_SETUP.md`).

Die optionale Web-Vorschau startet mit `pnpm dev`, einschließlich lokalem Coach-Server. Sie nutzt einen statischen Export ohne Fast Refresh und ohne native SQLite-Garantien. OpenRouter-Konfiguration: `BACKEND.md`.

## Dokumentation & Release-Vorbereitung
- **Verbindliche Security-Regeln:** [`AGENTS.md`](AGENTS.md), [`EVARO_SECURITY_GUARDRAILS.md`](evaro_release_execution_pack/EVARO_SECURITY_GUARDRAILS.md)
- **Security-Roadmap S0–S12:** [`Roadmap PDF`](evaro_release_execution_pack/EVARO_SECURITY_RELEASE_ROADMAP.pdf), [`aktuelle Matrix`](docs/release/P0_READINESS_MATRIX.md), [`Security-Betrieb`](SECURITY.md)
- **Aktueller Ausführungsstatus:** [`docs/release/EXECUTION_STATUS.md`](docs/release/EXECUTION_STATUS.md)
- **Beta Checkpoint Release Notes:** [`docs/release/BETA_RELEASE_NOTES.md`](docs/release/BETA_RELEASE_NOTES.md)
- **Astra Handoff:** [`docs/release/ASTRA_HANDOFF.md`](docs/release/ASTRA_HANDOFF.md)
- **Release Execution Pack:** [`evaro_release_execution_pack/MASTER_CHECKLIST.md`](evaro_release_execution_pack/MASTER_CHECKLIST.md)
- **Architektur & Historie:** [`ARCHITECTURE.md`](ARCHITECTURE.md), [`ROADMAP.md`](ROADMAP.md), [`DECISIONS.md`](DECISIONS.md)
