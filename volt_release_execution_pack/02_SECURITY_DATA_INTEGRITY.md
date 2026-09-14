# WP-02 - Security, Auth & Data Integrity Hardening

**Ziel:** Datenverlust, Cross-Account-Zugriff und unsichere Token-/Sync-Flows vor Monetarisierung ausschließen.

**Warum jetzt:** Fitnesshistorie und Measurements sind Vertrauensdaten. Der Audit nennt sichere Token-Speicherung, RLS, Cloud-Sync, Revisionen/Tombstones, Account-Löschung und Dependency-Findings als offene Release-Gates.

**Zeitrahmen:** Woche 1-3 als Planungsrahmen, nicht als Versprechen.

**Der Agent darf selbst:** Codeanalyse, Tests, RLS-Testharness, Storage-Migration, Export-/Delete-Flows und Security-Dokumentation implementieren.

**User/extern nötig:** Rotation realer Provider-/Service-Keys, Supabase-Productionzugang, Risikoakzeptanz bei nicht patchbaren Dependencies.

## Tasks

| ID | Prio | Aufwand | Task | Konkrete Maßnahme | Definition of Done |
| --- | --- | --- | --- | --- | --- |
| 02.01 | P0 | M | Secret-Scan inkl. Git-History | OpenRouter, Service Role, Provider Keys, private Credentials und alte Commits prüfen; kompromittierte Keys rotieren. | Dokumentierter Scan ohne aktive Secrets im Client oder Git-Verlauf. |
| 02.02 | P0 | M | Secure Token Storage | Refresh-/Session-Tokens auf iOS Keychain und Android Keystore-backed Secure Storage migrieren. | Tokens liegen nicht in normalem AsyncStorage/MMKV; Migration getestet. |
| 02.03 | P0 | L | RLS vollständig härten | Für jede user-owned Supabase-Tabelle Policies definieren, deny-by-default prüfen und Cross-Account-Integrationstests schreiben. | Account A kann niemals Daten von Account B lesen/ändern/löschen. |
| 02.04 | P0 | L | Sync-Konflikte robust machen | Revisionen, Tombstones, Pull/Push-Konflikte, idempotente Outbox und Retry-Verhalten vervollständigen. | Offline/online und Zwei-Geräte-Szenarien erzeugen keinen stillen Datenverlust. |
| 02.05 | P0 | M | Transaktionale Cloud-Befehle | Mehrschrittige kritische Mutationen serverseitig/RPC atomar machen. | Keine halbfertigen Programme/Workouts bei Request-Abbruch. |
| 02.06 | P0 | M | Guest-/Installations-ID finalisieren | Lokale Besitzverhältnisse und Migration Guest -> Account eindeutig definieren. | Keine Datenvermischung bei Login/Logout/Accountwechsel. |
| 02.07 | P0 | M | Account Deletion End-to-End | Cloud Rows, Storage, Coach History, Sessions/Auth User und lokale Daten nach Bestätigung löschen. | In-App Delete Account erfüllt Store- und Datenschutzanforderungen; E2E-Test vorhanden. |
| 02.08 | P0 | M | Vollständiger Datenexport | Maschinenlesbarer JSON-Export plus sinnvolle CSVs für Workouts/Measurements. | Export enthält alle nutzerbezogenen Produktdaten und wird getestet. |
| 02.09 | P0 | M | Dependency-Audit triagieren | Die dokumentierten Findings nach Production Reachability, Fix, Mitigation, akzeptiertem Restrisiko klassifizieren. | Kein ungeklärtes High-Risk-Produktionsfinding bleibt offen. |
| 02.10 | P1 | M | iOS Backup/File Protection prüfen | SQLite/WAL/SHM und sensible Dateien gegen ungeeignete Cloud-Backups prüfen; OS File Protection nutzen. | Dokumentierte Backup-Strategie für Fitness-/Gesundheitsdaten. |

## Empfohlener Ablauf

1. Lies zuerst `00_EXECUTION_RULES_AND_STATUS.md` und den aktuellen `docs/release/EXECUTION_STATUS.md`.
2. Inspiziere die tatsächlich betroffenen Dateien und bestehende Dokumentation, bevor du Änderungen planst.
3. Erstelle einen kurzen Implementierungsplan mit konkreten Dateipfaden und Tests.
4. Bearbeite zuerst P0, dann P1. P2/P3 nur, wenn kein höherer Blocker offen ist.
5. Nach jedem logisch abgeschlossenen Batch: Tests ausführen, Evidence dokumentieren, Status aktualisieren.
6. Wenn Credentials, Store-Konsole, Vertrag/Lizenz oder Rechtsfreigabe nötig ist, erzeuge eine präzise `USER_ACTION_REQUIRED`-Liste statt zu raten.

## Nicht tun

- Kein Full Rewrite des bestehenden Tracker-Cores.
- Keine neue große Produktdomäne einführen.
- Keine Production-Daten löschen oder Migrationen ohne Recovery-Pfad ausrollen.
- Keine sensitiven Daten in Logs/Analytics hinzufügen.
- Keine Aufgabe als abgeschlossen markieren, nur weil Code kompiliert.

## Work-Package Gate

**Data-integrity Testmatrix und Cross-Account-RLS-Test sind grün; Delete/Export funktionieren real.**

## Handover-Format

```md
### WP-02 Handover
Status: DONE | BLOCKED | READY_FOR_USER
Changes:
- ...
Tests:
- ...
Evidence:
- ...
User action required:
- ...
Residual risks:
- ...
Next recommended work package:
- ...
```
