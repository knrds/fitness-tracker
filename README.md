# Volt Performance – native Mobile Modernisierung

React Native/Expo Trainings-App für iOS und Android, unter Windows entwickelt. Workspace: D:\TrainingsAppGPT. Branch: rebuild/clean-mobile-app. Referenz: 570383a.

## Start
Node 24 (getestet: 24.13.0), pnpm 11.5.0. Installieren: `pnpm install --frozen-lockfile`. Prüfen: `pnpm typecheck`, `pnpm lint`, `pnpm test`. Nativer Development Client: `pnpm dev-client`. Ein installiertes passendes Development-Binary ist dafür erforderlich; siehe IOS_SETUP.md und ANDROID_SETUP.md.

Die optionale Web-Vorschau startet mit `pnpm dev`. Sie ist ein statischer Export ohne Fast Refresh und ohne native SQLite-Garantien.

## Stand vom 11.09.2026
Audit abgeschlossen. Recovery/Queue abgesichert, SQLite-Schema 2 mit granularen Workout-/Satz-/Outbox-Zeilen, Legacy-Import, atomarem Abschluss und lokalen Accountpartitionen implementiert. 201 Tests bestanden, darunter 26 mit echter SQLite-Engine. iOS-/Android-JS-Bündelung erfolgreich; noch keine native Geräteabnahme.

IMPLEMENTATION_STATUS.md enthält Änderungen, Nachweise und Grenzen. ROADMAP.md enthält die nächsten Schritte. docs/AUDIT_2026-09-10.md bleibt der unveränderte Ausgangsbefund. Keine App-Store- oder Sicherheitsfreigabe.
