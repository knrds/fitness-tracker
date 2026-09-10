# Entscheidungen

## ADR-001 – Hybrid statt Komplettrewrite (10.09.2026)
Expo/RN passt zu Windows+iPhone und vorhandenen 136 Tests. Domain/UI erhalten, riskante Datenpfade vertikal erneuern. Flutter/Bare würden die Datenfehler nicht automatisch lösen. Referenz bleibt Commit 570383a.

## ADR-002 – Persistenz vor Cloud
Workouts müssen lokal ohne Account/Netz funktionieren. Ziel: SQLite+Outbox in einer Transaktion. Kleine Zustand-Projektionen, MMKV nur Settings/Import. Keine zweite lokale Wahrheit.

## ADR-003 – Keine stille Löschung
Alter, fehlende abgeschlossene Sets, Zod-Fehler oder drei Sync-Fehler sind keine Löschgründe. Recovery, Quarantäne und sichtbare Fehler statt Defaults ohne Backup.

## ADR-004 – Plattformnachweis
JS-Bundle ist kein signierter nativer Build. Gerätetests bleiben Pflicht. Apple-Mitgliedschaft noch offen. SDK-Majorupgrade separat, damit Recovery-Fixes eindeutig prüfbar bleiben.
