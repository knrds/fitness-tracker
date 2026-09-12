# Entwicklung unter Windows

Hauptworkspace: D:\TrainingsAppGPT. Node 24 (lokal getestet 24.13.0), pnpm 11.5.0. CI nutzt Node 24; EAS-Profile pinnen Node 24.13.0 und pnpm 11.5.0. node:sqlite wird nur in Tests verwendet, Expo SQLite auf Geräten.

Installieren: pnpm install --frozen-lockfile. Prüfen: pnpm typecheck, pnpm lint, pnpm test. Kleine lokale Commits auf rebuild/clean-mobile-app. Kein Push/Merge nach main.

Nativer Tagesstart: pnpm dev-client. Das setzt APP_VARIANT=development und startet Metro über LAN. Zuvor muss ein Development-Binary mit expo-dev-client und expo-sqlite installiert sein. Nach Native-Modulen/App-Konfiguration neu bauen, nach TS/UI-Änderungen Fast Refresh verwenden.

Legacy-Startkommandos pnpm expo / expo:tunnel bleiben verfügbar. pnpm dev baut die Web-Vorschau und startet den lokalen Coach-Server auf Port 8081. pnpm coach:local nutzt den vorhandenen Export auf Port 8096. Konfiguration: BACKEND.md. Nicht während eines laufenden Exports Browser-Smoke-Tests durchführen; dist wird dabei erneuert.

Providersecrets niemals unter EXPO_PUBLIC_ konfigurieren. Der lokale SQLite-Stand ist noch nicht für Konto-/Cloud-Betrieb freigegeben. Siehe KNOWN_ISSUES.md.
