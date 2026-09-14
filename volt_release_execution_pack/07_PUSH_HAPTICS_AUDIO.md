# WP-07 - Push Notifications, Haptics & Audio

**Ziel:** Die bereits visuell starke App auch nativ fühlbar machen, ohne sie nervig oder spammy zu machen.

**Warum jetzt:** expo-haptics ist laut Audit vorhanden; Push fehlt, Audio nutzt einen zu modernisierenden Pfad. Diese Schicht verbessert Retention und native Qualität, ist aber nach P0-Sicherheit einzuordnen.

**Zeitrahmen:** Woche 5-6 als Planungsrahmen, nicht als Versprechen.

**Der Agent darf selbst:** Notification/Haptic/Audio-Code, Preference Model und Tests implementieren.

**User/extern nötig:** APNs/FCM Credentials, finale Copy für Marketing Push und Opt-in-Strategie.

## Tasks

| ID | Prio | Aufwand | Task | Konkrete Maßnahme | Definition of Done |
| --- | --- | --- | --- | --- | --- |
| 07.01 | P1 | M | Notification Infrastructure | expo-notifications/APNs/FCM bzw. Expo Push sauber integrieren; Device Tokens pro User+Device speichern. | Push kann auf Testgeräten zugestellt und invalidierte Tokens bereinigt werden. |
| 07.02 | P1 | M | Local Notifications | Rest Timer und geplante Workout Reminder lokal, wo kein Server nötig ist. | Funktioniert offline und benötigt keine unnötige Backend-Abhängigkeit. |
| 07.03 | P1 | M | Server Push | Re-engagement/Coach-/Lifecycle-Nachrichten mit Frequency Caps und Preference Checks. | Kein Versand ohne passende Opt-ins/Settings. |
| 07.04 | P1 | S | Notification Preference Center | Workout, Rest Timer, Progress/Coach, Product/Offers separat. | Marketing ist separat opt-in/abschaltbar. |
| 07.05 | P1 | S | Haptic Service | selection/action/success/warning/error zentral kapseln und sparsam verwenden. | Konsistente Haptik an Set Complete, PR, Workout Complete, destructive actions. |
| 07.06 | P1 | M | Audio Service | Rest-complete, PR und Workout-complete Sounds; Silent Mode/Settings respektieren; Migration vom alten Audio-Stack planen. | Sounds können global deaktiviert werden und sind nicht aufdringlich. |
| 07.07 | P2 | S | Notification Experimentation | Nach Launch Timing und Frequenz anhand Retention testen. | Keine willkürliche Push-Flut; Experimente haben Holdout/Metrik. |

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

**Alle Notifications respektieren Consent/Preferences; haptisches/audio Feedback ist global abschaltbar.**

## Handover-Format

```md
### WP-07 Handover
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
