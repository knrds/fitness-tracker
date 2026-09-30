# Master-Roadmap und Release-Gates

Stand 30.09.2026. Keine pauschale Prozentangabe zur Releasebereitschaft. Die aktuelle private Beta ist ein Produktcheckpoint; öffentlicher Store-/Cloud-/Bezahlbetrieb benötigt die nachfolgenden Nachweise.

`P0` blockiert den jeweiligen Launchumfang. `P1` folgt nach Kernintegrität bzw. vor betroffenen erweiterten Funktionen. Aufgaben mit externen Anforderungen können vorbereitet werden; nie als abgeschlossen verbuchen. Engineering-Owner muss vom Betreiber einer konkreten Person zugeordnet werden; AI-Agenten sind keine Rufbereitschaft.

## Reihenfolge und Abschlusskriterien

| ID / Priorität | Ist-Zustand und nächster Schritt | Abgeschlossen erst wenn | Abhängigkeit / Owner |
| --- | --- | --- | --- |
| R01 P0 — Kontolöschung | Client gehärtet (41 Tests); serverseitiger Orchestrierungskern mit 26 Fake-Adapter-Tests, standardmäßig OFF. Konkrete Journal-/Reauth-/Auth-/Storage-/Provideradapter, unabhängige Abschlussprüfung und Route fehlen. | Receipt an ursprünglichen Nutzer/Scope gebunden; genau ein Cleanup; Teilfehler ehrlich; echte Reauth/Auth-/Cloud-/Storage-/Providerlöschung, Replay/IDOR/in-flight Kontowechsel negativ getestet; Retention erklärt; öffentliches Lösch-Webziel vorhanden. | Engineering; Remote-Testsystem + Betreiber + Legal |
| R02 P0 — Cloud-Isolation | SQLite/Scopes und echte lokale RLS-Negativtests vorhanden. Betreiber bestätigt: noch kein Cloudprojekt. PostgreSQL-Hosting und Auth/API wählen; vorbereiteten Supabase-Pfad gezielt beibehalten oder ersetzen. | A/B/Anonymous × CRUD über reale Auth/API, alle fremden FK-Referenzen/Ownerwechsel, RPC/View/Storage/privilegierte Pfade, nullable DTOs und Katalogseeds geprüft; Gastübernahme/Altbesitzerpolicy und Originaldaten bewahrt. | Engineering/Security; kostenloses Staging oder lokaler Auth/API-Harness, R05 |
| R03 P0 — Atomarer Sync | Sequenzielle Remote-Schreibvorgänge, Zeitstempelmerge, keine Tombstones. | Transaktionales Aggregate-RPC, stabile Idempotenz/Revisionen, explizite Konflikte/Tombstones/Cursor. Zwei Geräte: offline edits/deletes, Replay/Reorder/Timeout nach Commit, Accountwechsel, Dauerfehler und Wiederherstellung ohne Verlust/Duplikate. | Engineering; R02, isolierter Restore |
| R04 P0 — AI-Kosten/Auth | HTTPS-Beta/Safety funktionieren. Portable private PostgreSQL-Reservierungen, Tages-/Globalcaps, Dispatch-/Completion-Idempotenz und optionaler API-Controller lokal geprüft (24 neue API-Tests, echte SQL-/Paralleltests). Standardmäßig OFF; nur Versuchseinheiten, kein Eurobudget. Privates SQL ist nicht an den vorläufigen REST-Transport gebunden. | Dauerhaft angebundenes request/usage ledger, gemessene Kosten/User-/Perioden-/Globalcaps, getrennte Text/Bild/Audioreserve, serverseitige Rechte vor Kosten, idempotente Completion, Mint-/Identitätsrotation/parallel Instanzen getestet; Storeausfall fail-closed; Kill-Switch und Krediterschöpfung real geprüft. | Backend/Security; R02, R07, Provideraccount |
| R05 P0 — Supply Chain/CI | Lokale Gates grün; zwei Buildtool-High-Ausnahmen strikt auf GHSA/Version/Pfade begrenzt, Re-Review spätestens 21.10.2026 UTC. Dokumentlinks und beide SQL-Harnesses in CI. Menschlicher Owner, Runtime-Artefaktbeleg und Main-Schutz offen. | SAST, SBOM/Lizenzscan, historischer/Bundle/native Secretscan, Required Checks/Review/Environmentschutz nachgewiesen; Ausnahme auf echte Version/Pfade begrenzt, konkreter Owner/Expiry; kein ungeklärter High/Critical; ausgelieferte Artefakte zum SHA zuordenbar. | Engineering + Betreiber GitHub/IAM |
| R06 P0 — Datenrechte/Legal | Lokaler Export/Consent und Lizenzdaten vorhanden; Remoteumfang/Texte ungeprüft. | Vollständiges Dateninventar, lokaler/cloudweiter Export mit Umfang/JSON/CSV; Versionierte widerrufbare AI-Einwilligung technisch vor erster Drittanbieterübermittlung durchgesetzt; Provider-/Modell-Allowlist, nur freigegebene Fallbacks, Training-/Retentionpolicy und DPA/Transfer geprüft; Liveurls/Betreiber/Länder/Alter/Health-/DPIA-/KI-/USA-Einordnung abgenommen; Medienrechte geklärt oder Fotos ersetzt, IDs erhalten. | Legal + Betreiber; R01–03; `LEGAL_REVIEW_REQUIRED` |
| R07 P0 bei bezahltem Launch — Billing | Capabilities/Cache/Paywall, kein aktiver Storeprovider. | Produkte/Preise/Trial/Markets entschieden, natives SDK und autoritative Entitlements/Webhooks; Sandbox purchase/restore/renew/cancel/expiry/grace/refund/accountswitch/new-device geprüft. Restore/Manage in Settings/Paywall sichtbar und getestet; tatsächlicher Gesamtpreis, Takt, Trial/Verlängerung und Terms/Privacy klar. Betaausnahmen in Production unwirksam; Export/Delete/Support frei. | Engineering + Betreiber Stores; R02, R06; echte Geräte |
| R08 P0 — Native/Recovery/QA | Expo54/EAS vorhanden, Hosttests; Samsung-S25-Startbericht noch nicht real reproduziert. | Signierte iOS/Android-RCs, Upgrade mit echten Altbeständen derselben ID, SecureStore groß/korrupt/reboot/restore, SQLite low-space/kill/rollback, Offline/Accountswitch/Keyboard/Gesten/Permissions/Media/DST/dezimal; VoiceOver/TalkBack/große Schrift/reduced motion; Bugnachweise grün. | QA + Betreiber; `PHYSICAL_DEVICE_REQUIRED`; R01–04 |
| R09 P0 — Betrieb/Backups | Redigierte lokale Telemetrie, keine nachgewiesenen Remotealerts/Restoreübungen. | Minimale echte Crash/API/DB/Sync/Delete/Billing/Kostenmetriken; Alerts mit Testauslösung; IAM/MFA/Retention/Supportowner; isolierter Cloud+Storage-Restore und Datenabgleich; Rolloutstop-/IR-/Recoveryübung dokumentiert. | Operations + Betreiber; R02–04, R06 |
| R10 P0 — Store-RC | Identifiers/Manifeste/EAS vorbereitet; Storeidentität/disclosures nicht freigegeben. | Publisher-/Accountberechtigung, TestFlight/Closed-Testing-Voraussetzungen aktuell bestätigt, vollständige Produktreview-Metadaten; Version/build IDs/SDKanforderungen aktuell, tatsächlich ausgelieferte SDK-/Egressinventare, Apple Privacy/Required Reason und Google Data Safety/Health korrekt; reale Screenshots/DEEN/revieweraccount/Backendzugang; App/iPad-Zielumfang bestätigt, vollständige Gates je RC-SHA. | Releaseowner + Betreiber + Legal; R05–09 |
| R11 P0 Kernabnahme / P1 Optimierung — UX/Performance | Moderne Editor-/Theme-/Dashboard-Updates lokal getestet. | Produktvertrag am RC regressionsgeprüft; versioniertes resumables Onboarding mit Skip/Back, optionalen sensitiven Feldern, Value-Reveal und erstem Gastworkout ohne Login; Permission-denied/Offline/Empty/Paywallpfade verständlich; ~1.000 Workouts/10.000 Sätze auf echten Geräten gemessen, P95/RAM/Framebudgets abgenommen; Paging/JS-Projektionen gezielt optimiert. | Frontend/QA; R08 |
| R12 P1 — Notifications/Support | Lokale Timer/Prefs/Adapter vorhanden, Fern-Push/Delivery offen. | Lokaler Lock-/Background-/Audio-/Haptikpfad auf Geräten, globale Disableoptionen; falls Fern-Push: Tokenlebenszyklus/Invalidierung/Kategorien/Frequenz/Marketingoptin. Support in zwei Settings-Taps; reale Mailzustellung SPF/DKIM/DMARC/Gmail/Outlook geprüft. | Engineering + Betreiber; R06/R08 |
| R13 Launch + erste 30 Tage | Kein öffentlicher Launch begonnen. | Alle P0 im genehmigten Umfang geschlossen, begrenzter Rollout mit Stopkriterien/Owner; reale Fehler/Activation/Retention/Refund-/Churn-/AIcostdaten datensparsam; P0/P1 vor Expansion; kontrollierte Experimente nach Baseline. | Betreiber + Operations; R10 |

R01–R04 zuerst engineeringseitig bearbeiten; R06/Storeaccounts/Devices parallel organisieren. Keine Produktionsmigration ausführen, bevor Backup/Restore, Bestandscheck und genehmigtes Zeitfenster vorhanden sind. Ein kostenloser Launch könnte R07 nur durch ausdrückliche Produktentscheidung und deaktivierte Kaufversprechen aus dem Launchumfang nehmen; Server-/Privacy-/Datenintegritätsgates bleiben.

## Abdeckung der gelieferten Roadmaps

| Ursprünglicher Bereich | Aktueller Masterpfad |
| --- | --- |
| WP00 / S0 Wahrheit und Threat Model | Einstieg, Architektur, Security, R05/R09 |
| WP01 Native Foundation | R08/R10 |
| WP02 / S2 Auth, S3 Autorisierung, S4 Sync, S5 Lifecycle | R01–03/R06/R08 |
| WP03 / S6 AI | R04 |
| WP04 / S10 Privacy/Legal/Licensing | R06/R10 |
| WP05 / S7 Monetization | R07 (P0 sobald bezahlt) |
| WP06 Onboarding/Paywall | R07/R11 |
| WP07 Push/Haptics/Audio | R12/R08 |
| WP08 / S8 Betrieb/Observability | R09/R12 |
| WP09 / S11 QA/Accessibility/Performance | R08/R11 |
| WP10 Store | R10 |
| WP11 / S12 Lifecycle/Launch | R13 und Betriebsrhythmus |
| S1 Secrets/Supply Chain/CI, S9 AppSec Automation | R05 |

## Offene Risiken und Entscheidungen

1. **Datenverlust / CRITICAL:** unatomare Cloud-Aggregate, Konflikte und fehlende Tombstones; Cloudnutzung nicht allein wegen lokaler Tests freigeben (R02–03).
2. **Löschung / CRITICAL:** Trotz lokal getestetem Orchestrierungskern fehlen reale Backendadapter und Löschabnahme. Der korrigierte Client erhält lokale Daten, solange kein gültiger kontogebundener Serverbeleg vorliegt (R01).
3. **Kosten / HIGH:** Das neue PostgreSQL-Ledger ist noch nicht produktiv angebunden. Freie Beta-Identitätsrotation und Serverinstanzen umgehen weiter nutzerlokale Limits; Guthabenbestätigung ist kein verteiltes Eurobudget (R04).
4. **Legacy-Eigentümer / HIGH:** automatische Guestübernahme existiert, historische Scopes/Originaldaten benötigen explizite Policy; keine stille Neu-Zuordnung (R02).
5. **Native Stabilität / HIGH:** Samsungreport ohne reproduzierten Gerätebeleg; SecureStore/SQLite-Recovery/Backup real offen (R08).
6. **Privacy/Lizenzen / HIGH:** Datenübermittlung, rechtliche URLs, Assetrechte und Manifestdeklarationen noch unbestätigt (R06/R10).
7. **Betrieb / HIGH:** kein belastbarer Restore-/Incident-/Alertbeweis und keine bestätigte Schutzkonfiguration (R05/R09).
8. **Performance / MEDIUM:** ganze History-/Chatprojektionen, vollständige Cloudpulls und Premiumeffekte auf schwächeren Geräten messen (R11). Hostbenchmark einmal 24 ms statt <20 ms; gezielter und vollständiger Wiederholungslauf grün. Mobile-Testworker meldet offene Handles trotz bestandener Tests; Teardown gezielt prüfen, keine Schwellen/Gates abschwächen.

Offene Betreiberentscheidungen: Veröffentlichungsregionen/Mindestalter, bestätigte Publisher-/Bundleidentität, Free/Pro/Coach-Storeprodukte/Preise, Zuständigkeiten, Support-/Legal-URLs, Fotoersatz oder dokumentierte Rechtefreigabe. Keine fiktiven Daten einsetzen.

## Nachweis und Abschluss

Jede Abnahme nennt ID, Commit/Artefakt, Umgebung/Gerät, Datum, reproduzierbaren Test und Ergebnis ohne sensitive Rohdaten. Scaffold/Mock/Local SQL/Browser/Physical/Remote werden getrennt benannt. Status hier aktualisieren; Details an passenden Vertrag anhängen, keinen weiteren Statusbericht erzeugen.

Integrierte Basis 30.09.2026: Konsolidierung und lokale Kontolöschkorrektur aus PR #24 / Main `39723d8`; 1.223 Tests, GitHub-Jobs und Vercel `dpl_ESdXBDz4a87ASaoYP8jNqohwTEsQ` READY, öffentliche HTTP-Negativsmokes grün.

Nächster kostenloser Engineeringcheckpoint: R01-Orchestrierungskern, R04-PostgreSQL-Reservierungen und API-Controller, gehärtetes R05-Ausnahmegate. Voller lokaler `pnpm build:preview` und `pnpm audit:ci` grün: **1.280 Tests** (158 Domain, 962 Mobile, 105 API, 49 Security, 6 Dokumentation), Typecheck/Lint/Web-Export; 0 Critical, 2 geprüfte High-Ausnahmen, 6 Moderate. Echte PostgreSQL 16.15-Prüfung lokal: RLS-Harness (304 Assertions × zwei Szenarien + Ownership-Preflight/Rollback), Quoten-Lifecycle/Rechte/Isolation und Konkurrenz (24 Clients → 4 Reservierungen bei 8 Einheiten; 16 gleiche Keys → 1 Reservierung). CI wiederholt SQL mit gepinntem PostgreSQL 17.11. GitHub-/Deployment-Abnahme jeweils dem neuen Commit zuordnen; lokale Belege sind keine Live-Abnahme. Keine Cloud-, Billing-, Providerkosten- oder Storeaktivierung. R01–R04 und sämtliche externen P0-Gates bleiben offen.
