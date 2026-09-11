# Lokale Datenbank und Migration

expo-sqlite ~16.0.10, Expo SDK 54; native Datei training.sqlite. PRAGMA user_version = 2, WAL, synchronous=FULL, busy_timeout=3000, foreign_keys=ON. Neuere Versionen werden verweigert.

| Tabelle | Schlüssel / Beziehungen | Inhalt |
| --- | --- | --- |
| state_documents | partition, key | Validierte Store-Metadaten; andere Stores weiter als Dokument |
| legacy_imports | partition, key | Originalbytes, Importzeitpunkt und idempotenter Marker |
| normalization_backups | partition, key | Unveränderte v1-Dokumente vor der Tabellenmigration |
| workout_sessions | partition, collection, id | Session-Metadaten und Position; collection = history / active / finished |
| session_exercises | partition, collection, session_id, id | Übungs-Metadaten und Position, FK auf Session |
| exercise_sets | partition, collection, session_id, exercise_id, id | Vollständige Satzdaten und Position, FK auf Übung |
| sync_operations | partition, collection, id | Einzelner Queue-Auftrag samt Payload, Retry-Zähler und Position |

Metadaten/Fachattribute werden pro Zeile als validiertes JSON gespeichert. Verschachtelte Übungen/Sätze liegen ausschließlich in ihren eigenen Tabellen. active/current enthält den aktiven Store-Zustand; finished hält den zuletzt abgeschlossenen Dialog-Snapshot. History bleibt der Verlauf. Outbox-Payloads bleiben eigenständige unveränderliche Synchronisationsaufträge.

Alle Werte werden gebunden. Die Tabellenhierarchie verwendet zusammengesetzte Fremdschlüssel und ON DELETE CASCADE. Identische IDs in unterschiedlichen Partitionen kollidieren nicht. Löschen, Backup-Cleanup und Importmarker sind ebenfalls partitionsbezogen. Datumsfelder werden ausschließlich durch Fachschemas konvertiert.

## Migration
Schema 0/1 wird innerhalb einer einzigen BEGIN-IMMEDIATE-Transaktion auf Schema 2 gebracht. Vorhandene Dokumente und Importmarker erhalten die Partition legacy. Die drei betroffenen Store-Dokumente werden validiert, ihre unveränderten Bytes gesichert, anschließend in Zeilen aufgeteilt. Erst nach Erfolg wird user_version=2 gesetzt. Ein Fehler in einem späteren Dokument rollt Tabellen, Daten und Versionsnummer gemeinsam zurück.

MMKV/AsyncStorage wird ausschließlich in legacy einmalig importiert. Existiert ein Marker, wird nur SQLite gelesen. Der Erstimport schreibt validierte Daten, Originalbytes und Marker atomar. Ein neuer Account beginnt mit seinem eigenen leeren Speicherbereich; lokale Altdaten werden ihm nicht automatisch zugeordnet.

## Workout-Commit und granulare Writes
BEGIN IMMEDIATE → History + Outbox + XP + Koffein + finished-Workout → COMMIT. Fehler rollen SQL und UI-Projektionen zurück. Jede andere mehrzeilige Repository-Schreiboperation ist ebenfalls atomar und beteiligt sich an einem bereits laufenden Finish-Commit.

Die Zeilendifferenz erhält unveränderte Sessions/Übungen/Sätze. Ein geänderter Satz ersetzt nicht den gesamten Verlauf. Entfernte Eltern löschen ausschließlich ihre eigenen Nachkommen. Die ursprüngliche Array-Reihenfolge bleibt über position erhalten.

## Nachweise und offene Arbeiten
24 Integrationstests in drei Suites verwenden echte SQLite. Geprüft: v1-Migration und Rollback, Originalbytes, Reopen, vollständige Satzparameter, einzelne SQL-Updates, Sortierung, CASCADE, doppelte IDs, Partitionen, tatsächlicher Konto-/Store-Wechsel, lokaler Reset und atomarer Finish.

Noch offen: granulare Fachattribute/Abfragen statt ganzer JS-Snapshots, Pagination, Mengen-/Geräteprofiling, Outbox-Revisionen/Retry-Zeit/Tombstones, vollständige Export-/Recovery-UI und historische Eigentümerzuordnung. Kein Nachweis physischer Löschung alter SQLite-/WAL-Seiten oder Verschlüsselung.

Server docs/schema.sql ist unverändert und nicht auf ein externes Projekt angewendet. Lokale Atomizität ersetzt keine serverseitige RPC/RLS-Abnahme.

Quelle: https://docs.expo.dev/versions/v54.0.0/sdk/sqlite/
