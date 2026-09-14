# WP-04 - Privacy, Legal, Health Data & Licensing

**Ziel:** Alle für Deutschland/EU und Stores relevanten Daten-, Vertrags- und Rechtefragen vor Einreichung beweisbar machen.

**Warum jetzt:** Der Audit stuft Exercise-DB-Provenienz, AI-Datenweitergabe, Art.-9-Risiko, Account-Löschung, Privacy-Labels und Asset-Rechte als echte Launch-Blocker ein.

**Zeitrahmen:** Parallel Woche 1-5 als Planungsrahmen, nicht als Versprechen.

**Der Agent darf selbst:** Data Map, technische Datenschutzhooks, Consent-Versionierung, Lizenzinventar und Draft-Dokumentation erstellen.

**User/extern nötig:** Vertragsannahme, Rechnungen/Lizenzen bereitstellen, Unternehmens-/Impressumsdaten, finale Rechtsberatung und Freigabe.

## Tasks

| ID | Prio | Aufwand | Task | Konkrete Maßnahme | Definition of Done |
| --- | --- | --- | --- | --- | --- |
| 04.01 | P0 | M | Dateninventar/Data Map | Für jede Datenkategorie Zweck, Rechtsgrundlage, Speicherort, Empfänger, Drittlandtransfer, Retention und Löschung dokumentieren. | Eine zentrale Data Map speist Privacy Policy, Apple Privacy und Google Data Safety. |
| 04.02 | P0 | M | Health-Data Assessment | Measurements, Workout-/Strength-Daten, Fotos/Audio und abgeleitete Profile auf DSGVO-Art.-9-Relevanz bewerten. | Dokumentierte Einstufung und Schutzmaßnahmen; Rechtsprüfung markiert. |
| 04.03 | P0 | M | AI Consent Flow | Vor erster Third-party-AI-Verarbeitung klar informieren und Einwilligungs-/Kontrollmechanismus in App vorsehen. | Consent ist versioniert, widerrufbar und technisch durchgesetzt. |
| 04.04 | P0 | L | Exercise DB Provenance | Exakte Quelle, Commit/Version, Lizenz, Media-Lizenz, Attribution und Importhistorie feststellen. | Kein kommerzieller Release, solange Herkunft/Lizenz ungeklärt ist. |
| 04.05 | P0 | M | Asset License BOM | Anatomie, Übungsbilder/-animationen, Icons, Fonts, Sounds, Illustrationen, Libraries in THIRD_PARTY_NOTICES/Software BOM erfassen. | Für jedes Asset gibt es Quelle, Lizenz und Commercial-Use-Nachweis. |
| 04.06 | P0 | M | Privacy Policy + Impressum + Terms vorbereiten | Deutsche/EU Texte mit App-spezifischen Datenflüssen und Subscription-/AI-Regeln; in App und Web erreichbar. | Store-URLs existieren und App verlinkt Legal-Bereich. |
| 04.07 | P0 | M | Processor/DPA Register | Supabase, Hosting, OpenRouter/Provider, Analytics, Crash, RevenueCat, E-Mail etc. mit AVV/DPA, Region und Subprozessoren. | Kein produktiver Dienst ohne dokumentierte Vertrags-/Transferbasis. |
| 04.08 | P0 | M | Retention & Deletion Schedule | Dauer und Löschtrigger je Datentyp definieren, inklusive Backups/Logs. | Löschung ist technisch und organisatorisch konsistent. |
| 04.09 | P1 | M | DPIA/Risikoanalyse | Schlanke Datenschutz-Folgen-/Risikoanalyse für Fitness-/AI-Daten erstellen. | Risiken, Eintritt, Schaden und Mitigation dokumentiert. |
| 04.10 | P1 | S | AI Transparency Text | Klar kennzeichnen, dass Coach KI ist und keine medizinische Diagnose/Therapie ersetzt. | UI- und Terms-Text konsistent. |
| 04.11 | P1 | M | External Legal Review | Deutscher IT-/Datenschutzjurist prüft Privacy, Terms, Art.-9-Ansatz, AI Consent und Subscription-Texte. | Freigabe/Änderungsliste archiviert. |

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

**Keine ungeklärte Datenquelle/Lizenz; Legal-URLs live; Store-Disclosure-Daten aus derselben Data Map ableitbar.**

## Handover-Format

```md
### WP-04 Handover
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
