# Entwicklung unter Windows

Hauptworkspace: D:\TrainingsAppGPT. Node 22 LTS empfohlen, pnpm 11.5.0 gepinnt. Audit wurde außerdem unter Node 24.13.0 bestanden. Installieren: pnpm install --frozen-lockfile. Prüfen: pnpm typecheck, pnpm lint, pnpm test. Nur auf Arbeitsbranch committen; nicht nach main pushen.

Bestehender Start: pnpm expo (LAN), pnpm expo:tunnel als Ausweichweg. Für eigene native Development Builds wird expo-dev-client installiert und Metro mit --dev-client gestartet. Nach TS/UI-Änderungen Fast Refresh, nach Native-Modulen/App-Konfiguration neues Binary.

pnpm dev ist lediglich ein statischer Web-Export mit Server. Direkte Unterrouten liefern im Referenzpreview 404; Home öffnen und in der App navigieren. Das Webpreview ist kein Ersatz für Geräteabnahme. Niemals echte Provider-Secrets in EXPO_PUBLIC_ Variablen verwenden.
