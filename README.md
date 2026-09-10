# Volt Performance – native Mobile Modernisierung

React Native/Expo Trainings-App für iOS und Android, primär unter Windows entwickelt. Branch: rebuild/clean-mobile-app. Referenz: 570383a. Der vorhandene Funktionsumfang bleibt erhalten; Persistenz und Sync werden vertikal erneuert.

## Einstieg
Node 22 LTS und pnpm 11.5.0. Im Repository: pnpm install --frozen-lockfile, pnpm typecheck, pnpm lint, pnpm test. Täglicher nativer Start: pnpm expo. Web-Vorschau: pnpm dev; diese exportiert statisch und bietet aktuell kein Fast Refresh.

Lies DEVELOPMENT.md, IOS_SETUP.md und KNOWN_ISSUES.md. Der vollständige Ausgangsbefund steht in docs/AUDIT_2026-09-10.md. ROADMAP.md trennt implementierte Schritte von offenen Geräte-/Releaseprüfungen. Dies ist noch kein freigegebener App-Store-Stand.
