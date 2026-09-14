# WP-11 - Launch, Release Day & First 30 Days

**Ziel:** Kontrolliert ausrollen, Kosten/Stabilität überwachen und nur datenbasiert nachsteuern.

**Warum jetzt:** Der erste kommerzielle Monat entscheidet, ob technische Probleme, AI-Kosten oder schlechter Funnel früh erkannt werden.

**Zeitrahmen:** Launch + 30 Tage als Planungsrahmen, nicht als Versprechen.

**Der Agent darf selbst:** Dashboardspec, Runbooks, KPI-Abfragen, Bugs und kleine Release-Hotfixes vorbereiten.

**User/extern nötig:** Rollout-Freigaben, Pricing/Marketing-Entscheidungen und Support-Priorisierung.

## Tasks

| ID | Prio | Aufwand | Task | Konkrete Maßnahme | Definition of Done |
| --- | --- | --- | --- | --- | --- |
| 11.01 | P0 | S | Staged Rollout | iOS/Android nicht unnötig sofort maximal ausrollen; Monitoring während jeder Stufe. | Stop/Rollback-Kriterien sind definiert. |
| 11.02 | P0 | S | Release-Day Dashboard | Crashes, API error rate, sync failures, purchases, restore, AI spend, trial starts. | Alle kritischen Signale an einem Ort. |
| 11.03 | P0 | S | Incident Runbook | Coach kill switch, subscription incident, DB issue, privacy incident, bad release. | Konkrete Owner und Reihenfolge für Reaktion. |
| 11.04 | P1 | M | 30-Day KPI Review | Activation, first/second workout, D1/D7/D30, trial start, trial-to-paid, churn, ARPU, AI cost/paid user. | Jede Produktänderung wird an einer KPI-Hypothese aufgehängt. |
| 11.05 | P1 | M | Support Triage | Bugs nach severity; keine Feature-Wunsch-Flut in V1.0.x. | P0/P1 Bugs priorisiert, Wünsche in Post-Launch-Backlog. |
| 11.06 | P2 | M | Conversion Experiments | Paywall Copy/Order, Trial, Onboarding steps, annual emphasis mit kontrollierten Experimenten. | Nur ein klarer Experimentfaktor pro Test. |
| 11.07 | P3 | L | Neue Produktbereiche | Nutrition, Running, Social etc. erst nach belastbarem Core-Retention-/Revenue-Signal. | Roadmap basiert auf Daten, nicht auf Feature-FOMO. |

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

**30 Tage ohne ungeklärte kritische Security/Data-Loss/Subscription-Probleme; Unit Economics beobachtbar.**

## Handover-Format

```md
### WP-11 Handover
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
