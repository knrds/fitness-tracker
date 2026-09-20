# EVARO – Sync & Data Integrity Test Matrix

## Astra-Checkpoint 20.09.2026 — maßgebliche Ergänzung

Risiko CRITICAL; Schutzbedarf PERSONAL/SENSITIVE/HIGH_SENSITIVITY. Vertrauensgrenzen: nicht vertrauenswürdige Cloud-Antwort → validierte Domain-Daten → kontoabhängige lokale SQLite-Persistenz. Ownership wird zusätzlich clientseitig geprüft, ersetzt aber niemals RLS. Fehlermeldungen der Pull-Protokollierung enthalten keine Cloud-Rohdaten.

18 neue Regressionen in syncResponseFailures.test.ts prüfen Child-Read/Delete-Fehler, alle sechs Pull-Abfragen, fehlende Beziehungen/null-Antworten, fremde Owner, Pending-Outbox vor/während Pull, erfolgreichen Merge sowie Rollback bei echtem SQLite-Triggerfehler nach bereits geschriebenem Profil und Verlauf. Ein früherer Stand hatte 15 rote Negativfälle; finale Nachweise stehen in EXECUTION_STATUS.md.

Implementiert: fehlgeschlagene Push-Operationen bleiben in FIFO; vollständige Pull-Validierung vor Store-Änderungen; native lokale Transaktion mit Memory-Rollback. Keine neue Dependency, Datenformatmigration oder Produktions-RPC. Revert benötigt keine lokale Datenkonvertierung, würde jedoch die behobenen Fehler erneut einführen.

Offen: Cloud-Aggregate können vor Fehlern teilweise geändert sein; Retries sind keine bewiesene serverseitige Idempotenz. Sechs Pull-Requests bilden keinen konsistenten Server-Snapshot. updatedAt-Merge bleibt uhrenabhängig; Revisionen, Tombstones und Mehrgeräte-Konflikte sind nicht gelöst. Web-Preview besitzt keine äquivalente dauerhafte SQLite-Atomizität. Physische Geräte-/Prozessabbruch- und echte Supabase-End-to-End-Tests bleiben erforderlich. S4 ist PARTIAL, keine Produktionsfreigabe.

Diese Matrix dokumentiert den aktuellen Implementierungs- und Teststatus aller Synchronisations- und Persistenzszenarien für die mobile EVARO-App (Offline-First-Architektur mit SQLite, MMKV-Storage und Supabase Cloud-Sync).

**Status-Definitionen:**
- `TESTED`: Vollständig durch automatisierte Unit-/Integrationstests abgesichert.
- `PARTIAL`: Grundlogik implementiert und teilweise getestet, Edge-Cases noch offen.
- `NOT_TESTED`: Implementiert, aber bisher ohne dedizierten automatisierten Testfall.
- `NOT_IMPLEMENTED`: Noch nicht in der Codebase implementiert (Architektur-Lücke).
- `ASTRA_REQUIRED`: Architekturentscheidung / Freigabe durch Astra erforderlich (Konfliktauflösung, Schema-Migration, etc.).

---

## 1. Sync-Szenarien Matrix

| Szenario | Status | Komponenten | Getestet in | Anmerkungen / Astra-Fokus |
|---|---|---|---|---|
| **offline create** | `TESTED` | `syncStore`, `outbox`, SQLite | `syncStore.test.ts`, `normalizedDatabase.test.ts` | Neuer Datensatz wird lokal in SQLite gespeichert und in die persistente Sync-Queue eingereiht. |
| **offline edit** | `TESTED` | `syncStore`, `outbox` | `syncStore.test.ts` | Bestehender lokaler Datensatz wird aktualisiert; Queue erfasst Operation als Update. |
| **offline delete** | `TESTED` | `syncStore`, `outbox` | `syncStore.test.ts` | Lokale Löschung reiht Delete-Operation in Queue ein. |
| **online reconnect** | `TESTED` | `syncWorker`, `syncStore` | `syncWorker.test.ts`, `syncStore.test.ts` | Bei Wiederherstellung der Verbindung arbeitet der Worker die Queue sequentiell ab. |
| **same entity changed twice** | `PARTIAL` | `syncStore`, `outbox` | `syncStore.test.ts` | Mehrfache lokale Änderungen derselben Entität vor dem Sync. Aktuell: mehrere Queue-Einträge; Coalescing / Deduplizierung in Queue noch optimierbar. |
| **two-device edit** | `ASTRA_REQUIRED` | Cloud-Schema, Conflict Resolution | - | Gleichzeitige Änderung auf zwei Geräten. Aktuell greift Supabase Last-Write-Wins (LWW) auf Zeilenebene. Feldweises Merging (CRDT / Revisions) erfordert Astra-Architekturentscheidung. |
| **delete vs update** | `ASTRA_REQUIRED` | Tombstones, Conflict Resolution | - | Gerät A löscht Entität offline, Gerät B aktualisiert sie offline. Aktuell keine serverseitigen Tombstones in Supabase. Klärung für P0-Release notwendig. |
| **duplicate upload** | `TESTED` | `syncStore`, `outbox` | `syncStore.test.ts` | Wiederholter Upload bei idempotenten Upserts (`ON CONFLICT (id) DO UPDATE`). Keine Duplikate in Cloud-Tabellen. |
| **retry after timeout** | `TESTED` | `syncWorker` | `syncWorker.test.ts` | Bei Netzwerk-Timeout erhöht der Worker `retryCount`, behält die Operation in der Queue und wartet auf den nächsten Zyklus. |
| **partial sync failure** | `TESTED` | `syncWorker` | `syncWorker.test.ts` | Wenn eine Operation scheitert (z.B. 500), stoppt die Queue-Abarbeitung für diese Entität, ohne nachfolgende unabhängige Daten zu korrumpieren. |
| **auth change during sync** | `TESTED` | `syncAccountBoundary` | `syncAccountBoundary.test.ts` | Token-Ablauf oder User-Wechsel während eines laufenden Sync-Laufs bricht den Vorgang ab und verwirft keine fremden Daten. |
| **account switch** | `TESTED` | `storageScope`, `documentDatabase` | `syncAccountBoundary.test.ts`, `storage.test.ts` | Abmeldung und Neuanmeldung mit anderem Account schottet lokale Daten per Partition ab; kein Cross-Account-Data-Leak. |

---

## 2. Lokale Datenintegritäts-Matrix (SQLite & MMKV)

| Datenbereich | Operation | Status | Getestet in | Details |
|---|---|---|---|---|
| **Workout** | Workout speichern | `TESTED` | `workoutPersistence.test.ts`, `dataIntegrityContracts.test.ts` | Vollständige Workouts mit Sätzen und Übungen fehlerfrei serialisiert und deserialisiert. |
| **Workout** | Keine doppelten Sets | `TESTED` | `dataIntegrityContracts.test.ts` | Set-IDs innerhalb einer Session sind strikt eindeutig. |
| **Workout** | Set Updates | `TESTED` | `workoutStore.test.ts`, `dataIntegrityContracts.test.ts` | Gezielte Aktualisierung einzelner Sätze (Gewicht, Reps, RPE, RIR) ohne Nebeneffekte auf Nachbarsätze. |
| **Workout** | Set Delete | `TESTED` | `workoutStore.test.ts`, `dataIntegrityContracts.test.ts` | Satz-Löschung ordnet verbleibende Sätze sauber neu (`setNumber`). |
| **Workout** | Restart / Rehydration | `TESTED` | `workoutPersistence.test.ts` | Persistenter State übersteht App-Kill und Rehydration verlustfrei. |
| **Measurements** | Gewicht speichern | `TESTED` | `bodyMetricStore.test.ts`, `dataIntegrityContracts.test.ts` | Erfassung mit Datum, Einheiten und optionalen Notizen. |
| **Measurements** | Körperfett speichern | `TESTED` | `bodyMetricStore.test.ts`, `dataIntegrityContracts.test.ts` | KFA-Werte numerisch validiert und chronologisch abgelegt. |
| **Measurements** | Mehrere Datenpunkte / History | `TESTED` | `dataIntegrityContracts.test.ts` | Sortierung nach Timestamp (`recordedAt DESC`), `getLatestMetric()` liefert verlässlich den neuesten Wert. |
| **Programs** | Template speichern | `TESTED` | `programStore.test.ts`, `dataIntegrityContracts.test.ts` | Templates mit Übungsliste, Sätzen und Notizen intakt. |
| **Programs** | Template laden & ändern | `TESTED` | `programStore.test.ts`, `dataIntegrityContracts.test.ts` | Bearbeitung, Umbenennung und Umsortierung funktional. |
| **Programs** | Program Aktivierung | `TESTED` | `programStore.test.ts`, `dataIntegrityContracts.test.ts` | Nur genau ein aktives Programm gleichzeitig erlaubt. |
| **IDs** | UUID-Kollisionsprüfung | `TESTED` | `dataIntegrityContracts.test.ts` | 1.000 generierte Crypto-UUIDs ohne Kollision; strikte RFC4122-Konformität. |

---

## 3. Offene Punkte für Astra (Architecture Decisions)

1. **Tombstones / Soft-Delete:**
   - Aktuell werden Entitäten bei lokaler Löschung in die Sync-Queue eingereiht, um in Supabase gelöscht zu werden. Fehlt die Netzwerkverbindung auf einem zweiten Gerät, erfährt dieses nichts von der Löschung.
   - *Astra-Entscheidung:* Sollen serverseitig `deleted_at`-Spalten (Tombstones) eingeführt werden?
2. **Sync Outbox Coalescing:**
   - Wenn ein Nutzer einen Satz offline fünfmal hintereinander editiert, landen aktuell fünf Update-Operationen in der Queue.
   - *Astra-Entscheidung:* Soll ein lokaler Queue-Kompaktierer vor dem Absenden redundante Zwischenschritte zusammenfassen?
