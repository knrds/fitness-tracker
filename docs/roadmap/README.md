# EVARO — Projektorientierung

Stand: 30.09.2026. Integrierte Ausgangsbasis: `39723d8` (main, PR #24), anschließend kostenloser Engineeringcheckpoint für R01/R04/R05. Dieser Bereich ist die einzige aktive Projekt- und Release-Roadmap. Git enthält die ersetzten Unterlagen weiterhin; ihre alten Freigaben gelten nicht.

## Einstieg

1. [Produkt und bestehendes Verhalten](PRODUCT.md): Was EVARO leisten soll und was bei Änderungen erhalten bleiben muss.
2. [Architektur und Datenverträge](ARCHITECTURE.md): Codekarte, Datenbank, Backend, technische Grenzen.
3. [Master-Roadmap](MASTER_ROADMAP.md): Reihenfolge, Verantwortlichkeit, konkrete Abschlusskriterien und Risiken.
4. [Security und Privacy](SECURITY_PRIVACY.md): verbindliche Regeln, Vertrauensgrenzen, rechtliche Prüfaufträge.
5. [Entwicklung, Deployment und Betrieb](DEPLOYMENT_OPERATIONS.md): Kommandos, Release-Gates, Rollback und Geräteprüfung.
6. [Entscheidungen und Quellenübernahme](DECISIONS.md): bewusst gewählte Architektur, verworfene Annahmen, Herkunft der Konsolidierung.

**Aktueller Zustand: funktionsreiche private Beta, keine Freigabe für öffentlichen oder kommerziellen Store-Launch.** Ein grüner Web-Build beweist weder native Gerätequalität noch sichere Cloud-Synchronisierung.

## Was belegt ist

| Bereich | Befund | Beweisgrenze |
| --- | --- | --- |
| Produkt | Workout-/Template-/History-Editor, Programme, Körperwerte, Coach, Premium-Themes, kompakter Home-Screen | Automatisierte Tests und vorherige Browser-Smokes; reale native Abnahme offen |
| Lokal | Accountpartitionen, validierte Persistenz, native SQLite-v2-Transaktionen, wiederholbare Outbox, SecureStore-Adapter | Nicht jeder Befehl atomar; keine vollständige Geräte-/Recovery-Freigabe |
| CI | Typecheck, Lint, Tests, Web-Export, Secret-/Dependency-Gates und echte PostgreSQL-RLS-Tests | Keine Remote-Supabase-Abnahme; SAST/Lizenz/SBOM und Schutzregeln fehlen |
| Kostenloser Engineeringcheckpoint | 1.280 lokale Tests, Typecheck/Lint/Web-Export/Audit grün; echte PostgreSQL-RLS-/Quoten-/Paralleltests | Neue Backendkerne sind nicht produktiv angebunden; keine Remote-/Gerätefreigabe |
| Web-Beta an integrierter Basis | PR #24 / Main `39723d8`, GitHub-Jobs grün; Vercel `dpl_ESdXBDz4a87ASaoYP8jNqohwTEsQ` READY; HTTP 200 und API-Negativsmokes 401/400 | Zeitpunktbezogener Nachweis; neue Änderungen am jeweiligen SHA nachweisen |
| Version | Paket `0.1.0-beta.8`; letzter Beta-Tag `v0.1.0-beta.8`; native Marketingversion `1.0.0` | Main enthält spätere unversionierte Beta-Updates; vor Store-Release abgleichen |

Beta-URL: [fitness-tracker-one-eta.vercel.app](https://fitness-tracker-one-eta.vercel.app). Die Bezeichnung „Production“ in Vercel bedeutet derzeit das Main-Ziel der Beta, keine kommerzielle Freigabe.

## Nächster Arbeitsauftrag

Betreiberklärung 30.09.2026: **Es gibt noch kein EVARO-Supabase-Projekt.** Der Konnektor listet keine Projekte; Supabase ist ein vorbereiteter Codepfad. PostgreSQL ist die Datenbankbasis, Hosting/Auth bleiben offen. Neue Grundlagen werden deshalb kostenlos lokal und mit synthetischen Daten geprüft. Kein kostenpflichtiges Projekt angelegt, keine vorhandenen Nutzerdaten migriert.

Zuerst R01–R04 der [Master-Roadmap](MASTER_ROADMAP.md): die lokal geprüften Lösch-/Quotenkerne an echte serverseitige Adapter anbinden, Cloud-Autorisierung und atomare Synchronisierung fertigstellen. PostgreSQL-Hosting/Auth bewusst auswählen; bestehender Supabase-Code ist kein eingerichtetes Projekt. Parallel Betreiber-/Legal-/Store-Entscheidungen und Gerätezugang klären. Kosmetische Erweiterungen haben derzeit geringere Priorität als Datenintegrität.

Für jeden Auftrag: aktuellen Git-/Remote-Stand prüfen, betroffenen Code und Tests lesen, eng begrenzten Change umsetzen, Regression nachweisen, diesen Dokumentationsbereich aktualisieren. Niemals aus einer alten Testzahl, einem Interface oder einem UI-Button auf eine deployte Integration schließen.

## Statuskonvention

- `IMPLEMENTIERT`: Code im Produktpfad vorhanden; noch keine vollständige Release-Abnahme.
- `TEILWEISE`: nützliche Umsetzung vorhanden, genannte Kriterien fehlen.
- `OFFEN`: Umsetzung oder Nachweis fehlt.
- `ABGENOMMEN`: alle genannten Kriterien mit Commit, Umgebung, Datum und Ergebnis belegt.

Externe Abhängigkeiten separat kennzeichnen: `USER_ACTION_REQUIRED`, `LEGAL_REVIEW_REQUIRED`, `PHYSICAL_DEVICE_REQUIRED`. `ASTRA_REQUIRED` aus Altunterlagen bedeutet qualifizierten Engineering-/Security-Review, keinen magischen Modell- oder Freigabestatus. Ein schriftlicher Plan ist kein bestandener Test.

Nur hier den aktuellen Gesamtstatus pflegen. Spezielle technische Verträge, SQL-Harness und Lizenznachweise sind verlinkte Referenzen, keine konkurrierenden Roadmaps. Keine neuen Handoff-/Zwischenstandsberichte erzeugen.
