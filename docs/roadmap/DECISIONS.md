# Entscheidungen und Quellenübernahme

## Technische Entscheidungen

| Entscheidung | Begründung / Konsequenz | Neubewertung bei |
| --- | --- | --- |
| Bestehendes Expo/RN-Monorepo behalten | Native Geräte und Web mit gemeinsamen Domain-/UIverträgen; ein Rewrite behebt Datenfehler nicht. Keine getrennten Repos/FastAPI/Next.js ohne Bedarf. | Belegtem Plattform-/Buildlimit |
| SQLite + Outbox als native lokale Wahrheit | Offline-Training, atomarer Finish und vorhandene Migration/Tests; Zustand bleibt Projektion. Web hat separate KVgrenzen. | Gemessenen Speicher-/Abfrageengpässen, nicht UIvorlieben |
| PostgreSQL als Basis; Hosting/Auth offen | Betreiber bestätigt 30.09.: noch kein Supabase-Projekt. Vorbereitete Auth/RLS/Clientpfade erhalten; neue Grundlagen portabel. Keine Datenmigration erforderlich. | Konkretem Kosten-/Betriebs-/Regionen-/Authvergleich vor Cloudaktivierung |
| Kleiner stateless Node-Coach auf Vercel | Bestehender HTTPSpfad, überschaubare Trust Boundary. Kein Clientproviderkey. | Gemessenen Laufzeit-/Medien-/Kostenlimits |
| Quoten zuerst atomar in PostgreSQL | Private Tages-/Versuchsreservierung lokal implementiert und echt getestet; keine Eurokosten-/Produktivfreigabe. | Gemessenem Bedarf für separate Redislimits/Queue |
| SecureStore dual-read/readback/marker | Kein nativer Klartextfallback, Originalbytes bis bestätigtem Commit erhalten, Logoutresurrection verhindern. | Realem Payload-/Backup-/Geräteproblem; kompatibler Forward-Fix |
| Keine automatische Datenreparatur/Löschung | Korrupte/unbekannte Bytes sind Nutzerdaten, nicht Wegwerfmaterial. Recovery/Quarantäne zuerst. | Explizitem Nutzerreset mit Scope-/Backupschutz |
| Gemeinsame Editoren/Domainberechnungen | Live/Template/History, Satzstatistik/Planung/PR/Datum nicht parallel neu implementieren. | Versioniertem Fachvertrag mit Migration |
| RevenueCat bevorzugter Billingkandidat | StoreKit/Play-Abstraktion, aber kein SDK oder Webhook aktiv. Entscheidung erst mit Storeprodukten/Verträgen abschließen. | Betriebskosten-/Privacy-/SDKvergleich |
| Keine automatische Levelmigration | Neue Workout-XP erfüllen Progressionsziel, bestehende XP/Level erhalten. | Neue ausdrückliche Produktentscheidung mit Datenplan |
| Regionale/Storepflichten fallbezogen | Tatsächlicher Datenfluss/Markt/Feature bestimmt Prüfauftrag; kein generischer Artikel als Rechtsfreigabe. | Neuem Markt, Provider, Daten-/Social-/Billingfeature |

## Welche Quellen geprüft und ersetzt wurden

Geprüfte Ausgangsbasis `39b2b3e153f23db0a940f45b478012316d5440ab`, 30.09.2026. Die alten versionierten Unterlagen sind über Git rekonstruierbar, beispielsweise `git show 39b2b3e:ROADMAP.md`. Dies erhält Quellenhistorie ohne einen weiteren aktiven Archiv-/Roadmapordner.

| Alte Quelle / Kategorie | Übernahme / Grund der Entfernung |
| --- | --- |
| `evaro_release_execution_pack/00…11`, Master-Checklist, beide PDFs (28+10 Seiten) | Alle WP00–11/S0–12 zu MASTER_ROADMAP mit Abhängigkeiten/Kriterien zusammengeführt; historische VOLT-/Test-/Zeitannahmen ersetzt |
| Execution-/Agent-/Securityprompts und Decisiontemplate im Pack | Gültige Guardrails in SECURITY_PRIVACY, Arbeitsweise in AGENTS; Modellzuständigkeiten und starre Pause-/Approvalprompts nicht als heutige Autorität |
| Root ARCHITECTURE/BACKEND/DATABASE/MIGRATION/DECISIONS/ROADMAP/KNOWN_ISSUES/FEATURES | Ist/Ziel/Datenverträge/Entscheidungen/Produkt in zentralem Bereich; widersprüchliche Chronologie entfernt |
| DEVELOPMENT/TESTING/IOS_SETUP/ANDROID_SETUP/Workflow | Aktuelle pnpm/EAS/Gate-/Gerätekommandos in DEPLOYMENT_OPERATIONS; alte Workspace-/Branch-/Bundleangaben entfernt |
| `docs/release/EXECUTION_STATUS`, Astra/Gemini/Handoff/Review/Prep/Cleanupberichte, `docs/archive`, `.agent/skills` | Belegte Controls/Gaps übernommen; keine konkurrierenden Freigabematrizen. Falsche Reset-/„Tests fehlen“-Anweisungen entfernt |
| Technische Draftspecs zu Delete/Export/Sync/Entitlements/Observability | Sinnvolle Verträge/Negativfälle in ARCHITECTURE/ROADMAP/Security; Void-Delete/Fake-Abnahme/alte Cachefristen verworfen |
| Store/QA/Performance/Audiomatrizen | Geräte-/RC-/Permission-/Performance-/Supportkriterien übernommen; keine behauptete native Abnahme aus Hosttests |
| Assetinventar/Provenienz/Replacement | Kompakt in reference/ASSETS plus vorhandene Anatomy/LICENSE und THIRD_PARTY_NOTICES |
| RLS-Harness/SecureStorageplan | Spezialverträge in reference/RLS_TESTING und SECURE_STORAGE behalten/aktualisiert; ausführbare SQL- und Migrationsdateien unverändert |
| `inspo/`, `apps/mobile/assets/Design_idea/` | Keine Produkt-/Buildreferenzen; Rangkopien byteidentisch mit erhaltenen Runtimeassets. 36,3 MB redundante Referenzmaterialien entfernt |

Pasted Quelle: `b7c5fa01-350b-4723-b15e-90359362d6d8/Eingefügter Text.txt`, vollständig geprüft (ca. 93 kB). Enthält fremde Store-/Legalartikel und Architekturvorschläge. Nützliche Prüfaufträge übernommen: SDK-/Egressinventar, externe Löschung, reale Maildelivery, Permission-denied, Reviewerzugang, Betriebs-/Rollbacknachweise, Marktauswahl. Eingebettete „log every conversation“, Stop-/Designapprovalprompts, universelle Rechtsbehauptungen/Finebeträge und AWS/FastAPI-Rewrite wurden nicht als Nutzeranweisung übernommen.

Der vom Nutzer hervorgehobene [Rechtsskill-Repository](https://github.com/Klotzkette/claude-fuer-deutsches-recht) ist experimentelle Recherchehilfe; nicht automatisch installiert und keine juristische Autorität. Primärquellen direkt in SECURITY_PRIVACY/DEPLOYMENT verlinkt und am 30.09.2026 geprüft; bei Release erneut auf Anwendbarkeit/Aktualität prüfen.

## Korrigierte Altannahmen

- Lokaler JSONexport ist kein vollständiger Cloudexport; Providerenv ist kein DPA-/Legalreview.
- Native SecureStoremigration **ist** integriert; Gerätefreigabe bleibt offen. Automatischer Guestimport **ist** im Authpfad vorhanden und muss geprüft werden.
- Supabasemigrationen existieren; nur Ownership-Migration nachgewiesen, kein deployed Sync/Delete/Billingvertrag.
- DE/EN-Coach-Safety und `COACH_ENABLED` bestehen; verteilte Quoten/serverseitige Bezahlrechte fehlen. €10/Providerbestätigung ist kein Nutzerledger.
- Kein aktiver RevenueCat-/Remote-Telemetry-/Remoteconfigprovider aus einem Interface ableiten. Restore-Infodialog ist kein Kaufrestore.
- Alte „vollständig barrierefrei“, „100% rechtssicher“, „AUDITED/READY“ und pauschale Runtime-Entwarnungen sind keine gültigen Freigaben.
- Expo ist SDK54, Node24.x; veraltete SDK53-/MMKV-only-/237/598-Testangaben sind ersetzt. Bestehende Artworks/Themes und DateWheel wurden nicht entfernt.

Neue Entscheidungen hier kurz mit Anlass, Konsequenz, Risiko und Überprüfungsbedingung ergänzen. Aktuellen Taskstatus ausschließlich in MASTER_ROADMAP pflegen.

Betreiberklärung 30.09.2026: Supabase enthält eine echte PostgreSQL-Datenbank samt verwalteten Zusatzdiensten ([Primärquelle](https://supabase.com/docs/guides/database/overview)). Ein reiner PostgreSQL-Host macht Skalierung nicht automatisch einfacher; Auth/API, Berechtigungen, Pooling, Backups/Restore und Betrieb müssen separat gedeckt sein. Noch kein Cloud-Projekt vorhanden: kein fiktiver Umzug. Neue Grundlagen sind unabhängig vom Hosting. Keine bezahlten Projekte/Branches, externen AI-Generierungen oder produktiven Schemaänderungen in diesem Checkpoint.
