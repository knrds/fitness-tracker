# WP-01 - Native Release Foundation & Store Identity

**Ziel:** Echte signierte iOS-/Android-Builds auf realen Geräten herstellen und die dauerhafte Store-Identität festlegen.

**Warum jetzt:** Der Deep-Research-Audit markiert echte Device Builds, Apple Developer Enrollment, EAS-Verknüpfung und native Release-Gates als offen.

**Zeitrahmen:** Tag 1-7 als Planungsrahmen, nicht als Versprechen.

**Der Agent darf selbst:** Expo/EAS-Konfiguration prüfen und vorbereiten, Buildfehler beheben, Smoke-Test-Checklisten erzeugen.

**User/extern nötig:** Apple-/Google-Accounts, Identitätsprüfung, Zahlungsdaten, Zertifikats-/Credential-Freigaben.

## Tasks

| ID | Prio | Aufwand | Task | Konkrete Maßnahme | Definition of Done |
| --- | --- | --- | --- | --- | --- |
| 01.01 | P0 | S | Apple Developer Program abschließen | Mitgliedschaft und richtige Account-/Organization-Strategie klären. | App kann signiert, über TestFlight verteilt und später eingereicht werden. |
| 01.02 | P0 | S | Google Play Developer Account vorbereiten | Accounttyp, Identitätsverifikation und ggf. 12-Tester/14-Tage-Anforderung frühzeitig klären. | Play Console ist aktiv; notwendiger Closed Test ist terminiert oder gestartet. |
| 01.03 | P0 | M | Finale App Identity festlegen | Display Name, Bundle Identifier, Android Package, URL Scheme, Support-/Privacy-/Terms-URLs finalisieren. | Identity ist in Expo/EAS und Store-Konfiguration konsistent. |
| 01.04 | P0 | M | EAS Projekt und Buildprofile validieren | development/preview/production sauber trennen; keine Produktionssecrets in Client-Config. | iOS- und Android-Builds laufen reproduzierbar. |
| 01.05 | P0 | M | Echter iPhone Development Build | Fresh install, cold start, Workout, History, Measurements, Coach smoke-test. | Smoke-Test auf physischem iPhone bestanden; Ergebnisse dokumentiert. |
| 01.06 | P0 | M | Echter Android Development Build | Analog iOS, mindestens ein reales Gerät unterschiedlicher DPI/Version. | Smoke-Test auf realem Android bestanden. |
| 01.07 | P1 | S | iPad-Support bewusst entscheiden | Entweder vollständig testen oder Zielgeräte/Layouts entsprechend einschränken. | Keine ungeprüfte Tablet-Versprechung im Store. |

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

**Mindestens ein realer iOS- und Android-Build ist grün; Bundle/Package-Identität ist final.**

## Handover-Format

```md
### WP-01 Handover
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
