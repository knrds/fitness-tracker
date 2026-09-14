# WP-08 - Analytics, Crash Monitoring, Remote Config & Support

**Ziel:** Produktion beobachtbar machen, ohne sensible Fitnessdaten in Telemetrie zu leaken.

**Warum jetzt:** Ohne Crash-/API-/Sync-/Subscription-Monitoring fliegst du nach Launch blind. Gleichzeitig dürfen Health-/Coach-Inhalte nicht in generischen Analytics landen.

**Zeitrahmen:** Woche 4-7 als Planungsrahmen, nicht als Versprechen.

**Der Agent darf selbst:** Monitoring SDKs datensparsam integrieren, Events abstrahieren, Flags/Support UI und Alerting-Runbook vorbereiten.

**User/extern nötig:** Vendor-Auswahl/Accounts, Support-E-Mail/Domain und Datenschutzfreigabe.

## Tasks

| ID | Prio | Aufwand | Task | Konkrete Maßnahme | Definition of Done |
| --- | --- | --- | --- | --- | --- |
| 08.01 | P0 | M | Crash/Error Monitoring | JS/native crashes, API 5xx, sync failures, migration failures und subscription webhook errors erfassen. | Crash-free und Fehlerraten sind sichtbar; Payloads sind datensparsam. |
| 08.02 | P0 | M | Operational Alerts | Coach error rate/latency, global AI spend, webhook failures, DB errors mit sinnvollen Schwellen. | Kritische Vorfälle erzeugen Alerts statt erst Nutzerbeschwerden. |
| 08.03 | P1 | M | Analytics Taxonomy | Install, onboarding, first_workout, second_workout, trial, paid, churn, coach usage, D1/D7/D30. | Event Dictionary dokumentiert; keine Gewichte/Coachtexte als Properties. |
| 08.04 | P1 | M | Remote Config/Feature Flags | coach_enabled, paywall_variant, notification_campaign etc. serverseitig kontrollierbar. | Kritische Features können ohne App-Review deaktiviert werden. |
| 08.05 | P1 | S | Support/Feedback Path | In-App Support, FAQ, Bug report mit Appversion/Device aber ohne automatische sensible Inhalte. | Nutzer erreicht Support in <=2 Taps aus Settings. |
| 08.06 | P1 | S | Review Prompt Policy | Store Review Prompt nach positivem Moment und nur selten. | Kein Prompt direkt nach Fehler/Abbruch. |

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

**Produktionsfehler, Sync, Coach und Subscription sind sichtbar; Telemetrie enthält keine sensiblen Rohdaten.**

## Handover-Format

```md
### WP-08 Handover
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
