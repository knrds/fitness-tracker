# Datenbank und Persistenz

Ist: KV-Snapshots pro Store, Date-Reviver, Zod-Hydration. SQL: users, exercises, workout_templates, template_exercises, programs, program_workouts, workout_sessions, session_exercises, exercise_sets, personal_records, body_metrics. RLS auf allen elf Tabellen definiert, aber nicht live geprüft.

Ziel: SQLite-Transaktionen für Session/Set/History plus Outbox, Migrationstabelle und Benutzerpartition. kg/cm/Meter bleiben kanonisch. UI zeigt gewählte Einheiten. Stabile UUIDs; Defaultprogramme je Konto neu instanziieren. Server erhält explizite DTOs, keine generische ungeprüfte Case-Conversion.

Outbox: operationId, ownerId, aggregateId, baseRevision, payload, retry/nextAttempt/status. Fehler behalten. Deletes brauchen Tombstones. Lokaler Import: Backup → Validierung/Quarantäne → atomarer Import → Mengen/Volumenvergleich → Marker. Legacy-Rohdaten bis zur bestätigten Abnahme behalten. Dies ist Zielmodell, keine bereits installierte SQLite-Datenbank.
