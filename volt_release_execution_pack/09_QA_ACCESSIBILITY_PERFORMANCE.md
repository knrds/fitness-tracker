# WP-09 - QA, Accessibility, Performance & Recovery

**Ziel:** Den Store-Build unter realistischen Langzeit-, Offline-, Accessibility- und Failure-Szenarien abnehmen.

**Warum jetzt:** Die Repo-Dokumentation nennt Device QA, große History, Accessibility und reale Migrationen ausdrücklich als offene Gates.

**Zeitrahmen:** Woche 6-8 als Planungsrahmen, nicht als Versprechen.

**Der Agent darf selbst:** Fixture-Generatoren, Tests, Accessibility-Fixes, Performance-Profiling und Recovery-Code implementieren.

**User/extern nötig:** Physische Testgeräte/Tester und manuelle Abnahme von UX/A11y.

## Tasks

| ID | Prio | Aufwand | Task | Konkrete Maßnahme | Definition of Done |
| --- | --- | --- | --- | --- | --- |
| 09.01 | P0 | L | Golden Device Matrix | Fresh install, upgrade, kill/reopen, offline, reconnect, account switch, coach, purchase, restore, permissions denied, timezone/DST. | Alle P0-Szenarien auf iOS und Android mit Evidence. |
| 09.02 | P0 | M | Migration & Recovery Tests | Alte Beta-Datenbanken upgraden; Abbruch während Migration simulieren; Recovery definieren. | Kein Datenverlust bei Upgrade. |
| 09.03 | P0 | M | Large Dataset Test | 600-1000 Workouts, 10k+ Sets, lange Coach-History, viele Measurements/Templates. | Kernnavigation und History bleiben performant; Pagination/Optimierung falls nötig. |
| 09.04 | P1 | M | VoiceOver/TalkBack | Labels, Fokusreihenfolge, Controls, dynamische Texte, Touch Targets. | Kernflows screenreader-bedienbar. |
| 09.05 | P1 | M | Reduced Motion / Large Text | Animationen respektieren prefers-reduced-motion; Layout bei großen Schriftgrößen. | Keine abgeschnittenen Kernaktionen. |
| 09.06 | P1 | M | Low Network/Provider Failure | Timeout, 429, 5xx, offline; verständliche Retry-UX ohne Request-Storm. | Fehler werden kontrolliert behandelt. |
| 09.07 | P1 | S | Low Storage & DB Failure | Schreibfehler/fehlender Speicher sinnvoll melden. | Kein stiller Datenverlust. |

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

**Release Candidate besteht dokumentierte P0 Device Matrix und Migrationstest.**

## Handover-Format

```md
### WP-09 Handover
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
