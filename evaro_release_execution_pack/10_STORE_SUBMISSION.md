# WP-10 - App Store / Play Store Submission

**Ziel:** Store-Metadaten, Privacy-Disclosures, Subscriptions und Review-Zugänge vollständig einreichen.

**Warum jetzt:** Ein funktionierender Build ist noch kein Store-Produkt. Review scheitert häufig an Metadaten, Privacy, Accountzugang oder unvollständigen Backend-Flows.

**Zeitrahmen:** Woche 7-10 als Planungsrahmen, nicht als Versprechen.

**Der Agent darf selbst:** Store-Metadatenentwürfe, Privacy-Fragebogen aus Data Map, Review Notes, Screenshotspec und Buildchecks vorbereiten.

**User/extern nötig:** Store Console Eingaben, rechtliche/steuerliche Agreements, Upload/Submit-Freigabe.

## Tasks

| ID | Prio | Aufwand | Task | Konkrete Maßnahme | Definition of Done |
| --- | --- | --- | --- | --- | --- |
| 10.01 | P0 | M | Apple App Store Connect Setup | App Record, Categories, Age Rating, Support/Privacy URLs, Export Compliance, Review Notes, Demo Account. | Reviewer kann alle relevanten Features reproduzieren. |
| 10.02 | P0 | M | Apple Privacy Details/Manifest | Privacy Labels aus Data Map; PrivacyInfo.xcprivacy/Required Reason APIs und SDK Manifests prüfen. | Keine widersprüchlichen Angaben oder Build-Warnungen. |
| 10.03 | P0 | M | Google Play Console Setup | Data Safety, Health Apps Declaration, Content Rating, App Access, Store Listing, Production Track. | Deklarationen stimmen mit realem Verhalten/SDKs überein. |
| 10.04 | P0 | M | Store Assets | Screenshots zeigen reale App; Feature Graphic/Descriptions/Keywords ohne unzulässige Claims. | Vollständige Assets für Zielgeräte und Sprachen. |
| 10.05 | P0 | S | Review Account | Vorgefüllter Demo/Premium-Account mit History, Plans, Measurements und Coach. | Reviewer muss nicht erst Daten erzeugen. |
| 10.06 | P0 | M | TestFlight / Closed Testing | RC an interne/externe Tester; Android erforderliche Testdauer einhalten. | Keine P0 Bugs mehr; Release Notes gepflegt. |
| 10.07 | P0 | S | Backend Review Freeze | Während Review keine breaking Backendänderung; Uptime sicherstellen. | Review kann jederzeit auf funktionierende Services zugreifen. |

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

**Alle Store-Formulare konsistent; Release Candidate ist identisch mit getestetem Build.**

## Handover-Format

```md
### WP-10 Handover
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
