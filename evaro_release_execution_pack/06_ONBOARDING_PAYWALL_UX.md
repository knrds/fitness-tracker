# WP-06 - Onboarding, Activation & Paywall UX

**Ziel:** Neue Nutzer schnell zum ersten Wertmoment führen, relevante Daten freiwillig erfassen und dann fair monetarisieren.

**Warum jetzt:** Die Kern-App ist fertig genug; der kommerzielle Funnel fehlt. Onboarding soll personalisieren, nicht den Nutzer mit einem Tutorial erschlagen.

**Zeitrahmen:** Woche 4-6 als Planungsrahmen, nicht als Versprechen.

**Der Agent darf selbst:** Onboarding/Paywall UI, State Machine, Analytics Events und Permission Pre-prompts implementieren.

**User/extern nötig:** Finale Pricing-/Free-Pro-Strategie, Copy/Brand-Ton und ggf. Designfreigabe.

## Tasks

| ID | Prio | Aufwand | Task | Konkrete Maßnahme | Definition of Done |
| --- | --- | --- | --- | --- | --- |
| 06.01 | P0 | M | Onboarding State Machine | Versioniertes, resumierbares Onboarding mit Skip/Back und migrationssicherem completed_version-Feld. | Onboarding kann abgebrochen und korrekt fortgesetzt werden. |
| 06.02 | P0 | M | Goal/Experience/Frequency/Equipment erfassen | Nur produktrelevante Felder; sensible Körperdaten optional und mit Zweckhinweis. | Datensparsame Profileingabe ohne unnötige Zwangsfelder. |
| 06.03 | P0 | M | Personalized Result Screen | Aus Eingaben konkreten Nutzen zeigen, bevor Paywall erscheint. | Nutzer versteht, wie EVARO seine Auswahl nutzt. |
| 06.04 | P0 | M | Paywall nach Value Reveal | Jahresabo primär, Monatsabo sekundär, Trial klar, Continue Free sichtbar falls Freemium-Strategie gewählt. | Paywall ist transparent und Store-konform. |
| 06.05 | P0 | M | Guest Mode erhalten | Lokales Tracking ohne erzwungenen Account; Account erst für Sync/Backup/Coach/Premium wenn Produktstrategie so bleibt. | First workout ist ohne unnötigen Login möglich. |
| 06.06 | P1 | M | Contextual Permissions | Notifications/Microphone/Photos erst unmittelbar vor Nutzen erklären und dann Systemdialog öffnen. | Keine Permission Wall beim ersten Start. |
| 06.07 | P1 | M | Empty/Error/Offline States | History, Coach, Sync, Subscription, Network und leere Programme mit klaren Next Actions. | Keine Sackgassen oder technische Rohfehlermeldungen. |
| 06.08 | P1 | S | Onboarding Analytics | started, step_completed, completed, paywall_viewed, trial_started ohne Health-Daten als Event Properties. | Funnel ist messbar. |

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

**Neuer Nutzer kann von Install -> Onboarding -> erstes Workout bzw. Trial ohne Sackgasse gelangen.**

## Handover-Format

```md
### WP-06 Handover
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
