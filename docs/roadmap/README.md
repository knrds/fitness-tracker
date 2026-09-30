# EVARO — Projektorientierung

Stand: 30.09.2026. Geprüfte Ausgangsbasis: `39b2b3e153f23db0a940f45b478012316d5440ab` (main, PR #23). Dieser Bereich ist die einzige aktive Projekt- und Release-Roadmap. Git enthält die ersetzten Unterlagen weiterhin; ihre alten Freigaben gelten nicht.

## Einstieg

1. [Produkt und bestehendes Verhalten](PRODUCT.md): Was EVARO leisten soll und was bei Änderungen erhalten bleiben muss.
2. [Architektur und Datenverträge](ARCHITECTURE.md): Codekarte, Datenbank, Backend, technische Grenzen.
3. [Master-Roadmap](MASTER_ROADMAP.md): Reihenfolge, Verantwortlichkeit, konkrete Abschlusskriterien und Risiken.
4. [Security und Privacy](SECURITY_PRIVACY.md): verbindliche Regeln, Vertrauensgrenzen, rechtliche Prüfaufträge.
5. [Entwicklung, Deployment und Betrieb](DEPLOYMENT_OPERATIONS.md): Kommandos, Release-Gates, Rollback und Geräteprüfung.
6. [Entscheidungen und Quellenübernahme](DECISIONS.md): bewusst gewählte Architektur, verworfene Annahmen, Herkunft der Konsolidierung.

**Aktueller Zustand: funktionsreiche private Beta, keine Freigabe für öffentlichen oder kommerziellen Store-Launch.** Ein grüner Web-Build beweist weder native Gerätequalität noch sichere Cloud-Synchronisierung.

## Was belegt ist

| Bereich | Befund an der Ausgangsbasis | Beweisgrenze |
| --- | --- | --- |
| Produkt | Workout-/Template-/History-Editor, Programme, Körperwerte, Coach, Premium-Themes, kompakter Home-Screen | Automatisierte Tests und vorherige Browser-Smokes; reale native Abnahme offen |
| Lokal | Accountpartitionen, validierte Persistenz, native SQLite-v2-Transaktionen, wiederholbare Outbox, SecureStore-Adapter | Nicht jeder Befehl atomar; keine vollständige Geräte-/Recovery-Freigabe |
| CI | Typecheck, Lint, Tests, Web-Export, Secret-/Dependency-Gates und echte PostgreSQL-RLS-Tests | Keine Remote-Supabase-Abnahme; SAST/Lizenz/SBOM und Schutzregeln fehlen |
| Letzter geprüfter Produktcheckpoint | 1.198 Tests: 158 Domain, 944 Mobile, 55 API, 41 Security; zusätzlich 304 SQL-Assertions in zwei RLS-Szenarien | Historischer Nachweis für `39b2b3e`, neue Änderungen neu prüfen |
| Konsolidierungscheckpoint 30.09.2026 | Voller lokaler `pnpm build:preview` grün: 1.223 Tests (158 Domain, 962 Mobile, 55 API, 42 Security, 6 Dokumentation), Typecheck/Lint/Web-Export; Dependency-Gate und Secret-Scans grün | Zwei dokumentierte Buildtool-High-Ausnahmen bleiben; neue Remote-CI-/Deployment-Abnahme getrennt nachweisen |
| Web-Beta | Main-Deployment `dpl_5YE7UGJTmWViuZ9SrasqMMoDVPLQ` READY; HTTPS-Beta-Session und Coach erfolgreich geprüft | Zeitpunktbezogene Vorprüfung, keine laufende Verfügbarkeitsgarantie |
| Version | Paket `0.1.0-beta.8`; letzter Beta-Tag `v0.1.0-beta.8`; native Marketingversion `1.0.0` | Main enthält spätere unversionierte Beta-Updates; vor Store-Release abgleichen |

Beta-URL: [fitness-tracker-one-eta.vercel.app](https://fitness-tracker-one-eta.vercel.app). Die Bezeichnung „Production“ in Vercel bedeutet derzeit das Main-Ziel der Beta, keine kommerzielle Freigabe.

## Nächster Arbeitsauftrag

Zuerst R01–R04 der [Master-Roadmap](MASTER_ROADMAP.md): Kontolöschvertrag, Cloud-Autorisierung/atomare Synchronisierung und verteilte Coach-Kostenkontrolle. Parallel Betreiber-/Legal-/Store-Entscheidungen und Gerätezugang klären. Kosmetische Erweiterungen haben derzeit geringere Priorität als Datenintegrität.

Für jeden Auftrag: aktuellen Git-/Remote-Stand prüfen, betroffenen Code und Tests lesen, eng begrenzten Change umsetzen, Regression nachweisen, diesen Dokumentationsbereich aktualisieren. Niemals aus einer alten Testzahl, einem Interface oder einem UI-Button auf eine deployte Integration schließen.

## Statuskonvention

- `IMPLEMENTIERT`: Code im Produktpfad vorhanden; noch keine vollständige Release-Abnahme.
- `TEILWEISE`: nützliche Umsetzung vorhanden, genannte Kriterien fehlen.
- `OFFEN`: Umsetzung oder Nachweis fehlt.
- `ABGENOMMEN`: alle genannten Kriterien mit Commit, Umgebung, Datum und Ergebnis belegt.

Externe Abhängigkeiten separat kennzeichnen: `USER_ACTION_REQUIRED`, `LEGAL_REVIEW_REQUIRED`, `PHYSICAL_DEVICE_REQUIRED`. `ASTRA_REQUIRED` aus Altunterlagen bedeutet qualifizierten Engineering-/Security-Review, keinen magischen Modell- oder Freigabestatus. Ein schriftlicher Plan ist kein bestandener Test.

Nur hier den aktuellen Gesamtstatus pflegen. Spezielle technische Verträge, SQL-Harness und Lizenznachweise sind verlinkte Referenzen, keine konkurrierenden Roadmaps. Keine neuen Handoff-/Zwischenstandsberichte erzeugen.
