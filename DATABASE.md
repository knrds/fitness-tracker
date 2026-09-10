# Lokale Datenbank und Migration

## Installiert
expo-sqlite ~16.0.10, Expo SDK 54. Native Datei: training.sqlite. Schema-Version: PRAGMA user_version = 1. Konfiguration: WAL, synchronous=FULL, busy_timeout=3000. Eine neuere Schema-Version wird ohne Migration verweigert.

| Tabelle | Spalten | Zweck |
| --- | --- | --- |
| state_documents | key TEXT PRIMARY KEY, value TEXT NOT NULL | Validierte Zustand-Persistenzumschläge als JSON |
| legacy_imports | key TEXT PRIMARY KEY, raw TEXT NULL, imported_at TEXT NOT NULL | Originalbytes und idempotenter Importmarker |

SQL-Werte werden gebunden. Es gibt keine dynamischen Tabellen-/Spaltennamen aus Benutzereingaben. Datumskonvertierung erfolgt pro Zod-Feld; ISO-Text in Notizen bleibt Text.

## Einmaliger Import
1. Existiert ein Importmarker, wird nur SQLite gelesen.
2. Sonst wird MMKV gelesen; bei fehlendem Wert folgt AsyncStorage, auch wenn MMKV verfügbar ist.
3. Envelope, unterstützte Version und Fachschema werden validiert. Bekannte Achievement-v1-Daten bekommen repeatCounts={} ohne Verlust bisheriger XP.
4. Validiertes Dokument, unveränderte Originalbytes und Marker werden zusammen committed.
5. Ein Fehler lässt Quelldaten bestehen und verhindert den Marker. Auch neuere/defekte Formate sperren Writes; keine Default-Ersetzung.

Die alten Quellen bleiben als Rückfallmaterial erhalten. Beim ausdrücklich bestätigten lokalen Datenreset werden ursprüngliche native KV-Quellen, zusätzliche Backups und SQL-Rohbackups entfernt. Importmarker bleiben erhalten, damit alte Daten nicht wieder importiert werden. Physische Löschung alter SQLite-/WAL-Seiten und Verschlüsselung sind noch kein verifiziertes Releaseversprechen.

Web-KV legt die erste gelesene Fassung unter <name>.pre-rebuild-backup ab. Diese Backups gehören zum lokalen Reset. Sie werden nicht automatisch übertragen.

## Workout-Commit
BEGIN IMMEDIATE → History + Queue + XP + Koffein + finished-Workout → COMMIT. Jeder Fehler → ROLLBACK und Rücksetzen aller fünf UI-Projektionen. Zweiter Finish bei bereits abgeschlossenem Zustand erzeugt keine zweite Session. Ein Workout ohne abgeschlossene Sets bleibt erhalten, bis der Nutzer es ausdrücklich verwirft.

## Noch offen
Normalisierte Session-/Set-Zeilen, Queue-Zeilen mit Owner/Revision/Retry-Zeit, Foreign Keys, Benutzerpartitionen, große Datenmengen, vollständige Export-/Recovery-Oberfläche. Reparatur unbekannter beschädigter Altformate ist bewusst kein automatisches Löschen: Original sichern, Format gezielt reparieren und über „Erneut laden“ validieren.

Server: docs/schema.sql bleibt unverändert. Elf RLS-Tabellen sind definiert, aber kein produktiver Supabase-/RLS-Test wurde durchgeführt. Lokale SQLite-Atomizität behebt nicht die bisherige mehrstufige Remote-Upsert-Sequenz.

Quelle: https://docs.expo.dev/versions/v54.0.0/sdk/sqlite/
