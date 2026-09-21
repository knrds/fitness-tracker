# EVARO Astra Takeover — Execution Status

Stand: 2026-09-20. Maßgeblicher aktueller Bericht; ältere Gemini-Berichte bleiben historische Evidenz, keine aktuelle Releasefreigabe.

21.09.2026 — Abschluss auf Nutzerwunsch wegen Wochenbudget: `61f80cd` gepusht, danach ausschließlich Coach-Testumgebung isoliert (LOW). Tatsächlicher Vercel-Build brach vor Audit wegen geerbtem VERCEL/NODE_ENV ab; reproduziert und Testfixtures korrigiert. 38/38 API-Tests in beiden Umgebungen PASS; produktiver Auth-Handler unverändert, Hosted-Identity-Negativtest bleibt aktiv. Keine erneute Vollsuite für reine Testfixture-Änderung; letzte 640er-Vollsuite/Typecheck/Lint/Build gilt für unveränderten Anwendungscode. Nächster Remote-Build noch zu prüfen; Audit bleibt 43 high/14 moderate. Wiedereinstieg mit konkreten Belegen/Grenzen am Anfang von ASTRA_HANDOFF.md. Production `6471138` im Vercel-Dashboard bestätigt und unverändert.

## Checkpoint 20.09.2026 — kostenloser iPhone-Testpfad

**P01/P09/S8/S11, PARTIAL, Risiko MEDIUM.** Bestehende Expo-Web-App wiederverwendet; SDK 54, native Bundle-IDs und Datenformate unverändert. Vom Nutzer angelegte EAS-Verknüpfung übernommen. Statischer WLAN-Server liefert ausschließlich den Export, bindet gezielt eine private Schnittstelle, sperrt API, Schreibmethoden, Secrets/Maps und Pfadausbruch. Exportierte pnpm-Schriften benötigen die eng begrenzte Ausnahme `assets/__node_modules/.pnpm`; mit HTTP-Regression geprüft. Safe-Area-Viewport, Manifest, Home-Screen-Metadaten und vorhandenes Icon ergänzt, ohne Service Worker oder Offline-Versprechen.

WLAN-Startfehler nachvollzogen: Expo-Web-UUID benötigt `crypto.randomUUID`, das auf HTTP-LAN fehlt. Gemeinsamer UUID-Einstieg belässt Native bei Expo und nutzt im Web alternativ CSPRNG `getRandomValues` mit UUID-v4-Bits. Keine schwache Zufallsquelle, kein Datenreset und keine ID-/Schemamigration. Fünf Regressionen prüfen Entropie, Format und Fail-closed. Die nach EAS/Expo-Generierung sichtbaren DOM/RN-Typkonflikte bei zwei Timern und AbortSignal minimal korrigiert.

**Vertrauensgrenzen/Privacy:** HTTP-WLAN nur synthetische Gastdaten im privaten Netz, kein Login/Provider. HTTPS-Preview ist keine Freigabe für reale Gesundheitsdaten. Keine neue Dependency, keine Telemetrie und keine Providerkosten. Keine Lizenzfreigabe für bestehende Assets behauptet. Code-Rollback braucht keine Datenkonvertierung, würde den LAN-Startfehler wieder öffnen.

**Browserbeleg:** bestehendes Vercel-Projekt `fitness-tracker`, Deployment `96e4joyXE1p2bwHnznaBdiYR2GyH`, Ready / Preview / `3bd4713`. Dashboard und Pläne laden. Lokaler neuer Export bei 390 × 844: Dashboard, Workout/Übung, Testsatz 20 kg × 8, Reload erhält Wert und Abschluss; Fonts/Icons nach Serverkorrektur sichtbar. Das ist Chromium am PC, keine Safari-/Geräteabnahme. Bestehender englischer Wiederaufnahme-Dialog in DE als P1 offen.

**Deployment-Gate:** Vercel-Git war bereits aktiv und wartete nicht nachweislich auf GitHub-Security-Gates. Neuer Review-Build `pnpm build:preview` verlangt Verify → Audit (high) → Web-Build. Offene hohe Befunde blockieren das Update; die alte HTTPS-Preview bleibt ausdrücklich ein älterer Teststand. SAST/Lizenz/SBOM, vollständige CI-Abhängigkeit und Remote-Konfiguration noch offen. Kein Main-Merge, Production-Deploy, Remote-SQL, Billing oder Store-Upload. Vercel-Connector 403 für den Dashboard-Scope, Browserzugang funktioniert.

Schritt-für-Schritt-Befehle, konkrete URLs, Env-Matrix, Staging-Voraussetzungen und Soll-Ergebnisse: [IPHONE_FREE_TEST_GUIDE.md](IPHONE_FREE_TEST_GUIDE.md). Prüfprotokolle: `output/iphone-checkpoint-verify.log`, `iphone-checkpoint-final-build.log`, `iphone-checkpoint-bundle-secrets.log`. Nächster Architekturblock bleibt S4 serverseitige Atomizität/Idempotenz/Konflikte; S5 folgt danach. Hohe Supply-Chain-Befunde blockieren inzwischen auch neue HTTPS-Previews und müssen separat kompatibel behoben werden.

Abschlussmessung: **pnpm verify PASS, 640 Tests = 77 Domain + 511 Mobile (78 Suites) + 38 API + 14 Security**; Typecheck/Lint PASS. Web-Build und Export-Metadatenprüfung PASS, Expo public/introspect beide Exit 0, Bundle-Gitleaks keine Treffer. Erneuter Online-Audit nach initialem Netzwerkfehler: **57 Befunde = 43 high + 14 moderate**, Exit 1, keine Ausnahme. Lokaler PostgreSQL-Harness zuvor in dieser Session erneut 304 + 304 Assertions und Bestands-Preflight PASS; SQL seither unverändert. Native und Remote-Supabase-Gates bleiben offen. Kein vollständiger SAST-/Lizenznachweis.

## Fortsetzung 20.09.2026 — dauerhafte lokale Outbox und Beta-Abnahme

Nutzer hat geeignete Main-Integrationen jetzt autorisiert, mit Testanleitung pro abgeschlossenem Block; AGENTS.md/ROADMAP.md entsprechend aktualisiert. Das frühere pauschale Main-Verbot gilt nicht mehr. Der aktive Beta-/Hostingkanal ist noch unbestätigt (Vercel-Konfiguration und EAS-Profile sind nur vorbereitete Repository-Konfiguration). Kein Main-Push/Deployment in diesem Block: Gesamtbranch enthält offene native Migrationsgates und die bekannten Security-Gates. Konkrete Nutzer-Testschritte mit Soll-Ergebnissen jetzt in BETA_REGRESSION_MATRIX.md.

**P02 / S4, HIGH:** Fehler beim lokalen Enqueue/ACK/Retry/Clear dürfen Memory-Queue und persistierte Queue nicht auseinanderlaufen lassen. Besonders Cloud-Erfolg + SQLite-ACK-Fehler konnte die Operation zunächst im Speicher entfernen und anschließend endgültig verlieren. Vier echte SQLite-Triggerregressionen ergänzen den vorhandenen Harness; drei ursprüngliche Fehlerfälle reproduziert. Vorhandene Transaktions-/Rollback-Helfer wiederverwendet; geschachtelte Workout-/Coach-Plan-Befehle nehmen an der äußeren Transaktion teil. Kein Schemawechsel, keine neue Dependency, keine Rohdatenlogs, keine Remote-Migration. Rollback des Codes braucht keine Datenkonvertierung, würde die Lücke aber wieder öffnen. Schutzbedarf SENSITIVE/HIGH_SENSITIVITY, Grenze lokale Memory-Projektion → dauerhafte kontogebundene Queue.

Gezielte Integration **40 Tests PASS**. Erster Volltest fand neun Integrationsfehler durch unerlaubte verschachtelte SQL-Transaktionen; Ursache korrigiert, nicht ignoriert. Erneutes vollständiges **pnpm verify PASS: 625 Tests = 77 Domain + 506 Mobile (77 Suites) + 38 API + 4 Security**, Typecheck/Lint PASS. Logs: output/outbox-durability-red.log, outbox-durability-integration.log, outbox-durability-final-verify.log. Keine Änderung an zuvor getesteter RLS-Migration (304 PostgreSQL-Assertions unverändert gültig).

Abschluss dieses Blocks: Web-Build PASS (4.74 MB), Staged- und Bundle-Secret-Scan ohne Treffer. Kein nativer Build/OTA und keine Produktionsänderung. Testlogs: output/outbox-durability-build.log und outbox-durability-bundle-secrets.log.

Gates bleiben offen: Audit zuletzt heute **57 Befunde (43 high/14 moderate)**, SAST/SBOM/Lizenz-Gesamtabnahme, native Geräte und tatsächlicher Auslieferungsweg. Paket-/Lockfile seit diesem Scan unverändert. Cloud-Erfolg ohne lokalen ACK kann Retry auslösen: keine Exactly-once-Behauptung. S4 bleibt PARTIAL bis atomare serverseitige Aggregate, Idempotenz/Revisionen/Konflikte/Tombstones und reale Supabase-End-to-End-Abnahme fertig sind. Anschließend S5 Account-Löschung; Produkt- und Security-Roadmap bleiben abgestimmt.

## Sicherer Engineering-Checkpoint — S4 Sync-Fehlergrenzen, 20.09.2026

Fortsetzung nach **8b0a6e1**. Risiko **CRITICAL**, S4 **PARTIAL**. Schutzbedarf: Profil, Workout-History, Programme/Templates, eigene Übungen und Körpermesswerte. Cloud-Antworten sind untrusted; Ownership und vollständige Beziehungen werden vor jeder lokalen Anwendung validiert. Clientprüfung ersetzt keine serverseitige Autorisierung.

Implementiert: bislang ignorierte Child-Read/Delete- und Pull-Fehler propagieren; fehlgeschlagene Outbox-Operation bleibt erhalten. Pull bei ausstehenden lokalen Änderungen auslassen; während Requests neu entstandene Queue verhindert Anwendung des Snapshots. Alle sechs Antworten erst validieren, dann lokale Stores gemeinsam mit vorhandener SQLite-Transaktion anwenden. Bei Schreibfehler alle Memory-Projektionen zurückrollen; lastSyncedAt nur bei erfolgreicher Übernahme. Keine Cloud-Rohdaten in Pull-Fehlerlogs.

**18 neue Regressionen PASS**, inklusive echter SQLite-Triggerfehlerinjektion nach Profil-/Verlaufsänderung und Kontrolle wiederhergestellter persistierter Daten. Gesamtlauf **pnpm verify PASS: 621 Tests = 77 Domain + 502 Mobile (77 Suites) + 38 API + 4 Dependency-Security**; Typecheck/Lint PASS. Logs: output/sync-checkpoint-verify.log und sync-checkpoint-targeted.log. Vorheriger S3-Nachweis bleibt 304 PostgreSQL-Assertions, keine neue SQL-Migration im S4-Block.

Aktueller Registry-Audit am 20.09. nach Wiederholung mit Netzwerkzugriff: **57 Befunde = 43 high + 14 moderate, 0 critical** (unverändert). Audit bleibt FAIL/Release-Gate; ursprünglicher Abruf scheiterte mit fetch failed. Staged-Secret-Precheck ohne Treffer. Coach-Providercheck weiterhin mangels Providerkonfiguration blockiert; Expo public/introspect aus vorigem unverändertem Native-Konfigurationsstand PASS.

Abschluss: Web-Build PASS (4.74 MB), erneuter Bundle-Secret-Scan ohne Treffer; abschließender Typecheck und Lint der geänderten Dateien PASS. Der eigene PostgreSQL-Testserver läuft beim Checkpoint nicht mehr (pg_ctl status und kein Listener auf 55432 bestätigt); Daten/Logs bleiben erhalten.

Keine Datenformatänderung oder neue Dependency. Revert braucht keine lokale Konvertierung, würde jedoch behobene Fehler wieder einführen. Web-Preview besitzt keine gleichwertige dauerhafte SQLite-Atomizität. **Nicht gelöst:** mehrstufige Cloud-Aggregate können teilweise geschrieben werden, sechs Requests sind kein konsistenter DB-Snapshot, Zeitstempel-Merge ist keine revisionsbasierte Konfliktlösung; serverseitige Idempotenz, Tombstones und Multi-Device bleiben offen. Nächster Block: atomarer serverseitiger Sync-Vertrag mit realen Backendtests, danach Account-Lifecycle.

### Folgen einer späteren Main-Übernahme für Betatester

Ein Git-Merge ist noch kein geprüfter nativer Rollout. Automatische externe Deploymentverknüpfungen sind nicht verifiziert; Build/OTA-/Backend-Auslieferung bewusst kontrollieren. Es wurde hier weder main geändert noch eine Produktionsmigration oder Veröffentlichung ausgeführt.

- SecureStore schützt Sessions nativ und migriert erst nach verifiziertem Write; große Sessionwerte/OS-Fehler können Login oder Migration blockieren. Geräte-/Upgrade-/Backup-/Rollback-Abnahme fehlt, Zero-Logout ist nicht garantiert. Native Build-Kompatibilität vor OTA prüfen; alte MMKV-only-Version ist kein sicherer Zero-Logout-Rollback.
- Sync verweigert jetzt fehlerhafte/unvollständige Cloud-Antworten, statt Teilzustände als Erfolg anzunehmen. Betatester können dadurch häufiger ehrliche Sync-Fehler/offene Queue sehen; lokal vorhandene Daten werden in den getesteten Fehlerfällen erhalten. Bestehende Cloud-Konfliktrisiken sind noch nicht vollständig behoben.
- Öffentlicher Coach benötigt gültige Anmeldung; bisherige anonyme Prototypnutzung endet. Reale Provider-/Auth-/Hosting-Abnahme bleibt offen.
- RLS-Migration ist vorbereitet und lokal getestet, nicht remote angewendet. Bei inkonsistenten vorhandenen Referenzen verweigert sie die Migration; keine automatische Löschung/Reparatur.
- Keine neuen Features, Preise, Bundle-ID oder Billing-Aktivierung. CI stoppt bei verbleibenden hohen Dependency-Befunden; grüne Funktionstests sind keine Releasefreigabe.

### Gesicherte Blöcke seit Takeover

1. 6c01522 — native Session-Migration, Supabase-/Auth-Integration und Roadmap-Audit.
2. 27fccac — dauerhafte Security-Governance, Secret-Scans, gehärtete CI.
3. 26e29d1 — gezielte nanoid/undici/tar-Patches mit Angriffsregressionen.
4. 3585062 — öffentlicher Coach-Auth-Bypass geschlossen.
5. 8b0a6e1 — restrictive RLS-/Referenzmigration und echter PostgreSQL-Harness.
6. Folgender Commit — S4 Sync-Fehlergrenzen und dieser Checkpoint; genaue ID aus Git, um Selbstreferenz zu vermeiden.

Remote-Abgleich am 20.09.: origin/main unverändert **64711388daf754453afb79928b2679a44c028fde**. Review-Branch bleibt astra/p0-release-core; kein Rebase/Reset/Clean/Force-Push. Ignorierte Toolcaches/Testlogs bleiben als reproduzierbare lokale Nachweise erhalten. SAST/SBOM/Lizenz-Gesamtabnahme, Remote-Schutz, physische Geräte und verbleibende P0-Gates sind weiterhin offen; keine Risikoakzeptanz vorgenommen.

## Neuester Daten-Security-Block — S3 RLS lokal verifiziert

Vorheriger S6-Commit **3585062** gepusht. S3 Risiko **CRITICAL**, Status **PARTIAL** bis Remote-/Supabase-API-Abnahme. PostgreSQL 17.11 portabel unter output/ gestartet, nur Loopback, SCRAM/Zufallspasswort; keine Systeminstallation oder Produktionsverbindung. Herkunft und Grenzen dokumentiert in RLS_LOCAL_TEST_HARNESS.md.

Der echte DB-Baseline-Test reproduziert einen fremden exercise_id-Verweis aus eigenem Template. Additive Migration `202609190001_rls_reference_ownership.sql` ergänzt restrictive Ownership-/Referenzprüfungen, sodass weitere permissive Policies sie nicht per OR umgehen. TRUNCATE/REFERENCES/TRIGGER-/Schema-CREATE-Clientprivilegien entzogen. Schreibsperren vor Bestandsprüfung, begrenzte Lock-/Statementzeit; ungültige Altdaten führen zum atomaren Abbruch, nicht zur automatischen Reparatur/Löschung.

**304 PostgreSQL-Assertions PASS**, wiederholt mit absichtlich großzügigen Policies; vollständiger Haupt-Fixture-/Helper-/Policy-Rollback zusätzlich bestätigt. Zweite isolierte Negativdatenbank: Migration verweigert inkonsistente Bestandsdaten und erhält sie unverändert. Runner in CI mit gepinntem offiziellem PG-Image eingebaut; GitHub-Ausführung separat offen. SQL-Tests setzen Claims selbst: keine Behauptung einer GoTrue/JWT/PostgREST-Abnahme. PostgreSQL-Engine ist echt, Auth-Transportschicht wird nicht simuliert als Beweis verwendet.

Abschlussmessung: erneuter Runner nach Einbau der Schreibsperren PASS; `pnpm verify` PASS mit **603 Hosttests**, Typecheck/Lint PASS; CI-YAML und Image-Digest geprüft. 14 neue restrictive Policies auf elf Tabellen, lokale Haupt-Testdatenbank danach null öffentliche Profile und null Auth-Fixtures. Keine App-/Lockfileänderung im S3-Block; vorheriger Build bleibt unverändert.

## Neuester Security-Block — S6 öffentlicher Auth-Bypass

Nach gepushtem S1-Patch **26e29d1** die unabhängig behebbare CRITICAL-Lücke im Coach geschlossen: ALLOW_PROTOTYPE_COACH wird ignoriert, keine IP-basierte anonyme Identität; fehlender Bearer 401 vor Providerkontakt, ungültiger Bearer durch Supabase verifiziert/abgelehnt. Local-Development-Identität ist bei NODE_ENV=production oder VERCEL gesperrt. Der bereits auf Loopback begrenzte lokale Server bleibt nutzbar. Absichtliche Verhaltensänderung: öffentliche anonyme Prototyprequests funktionieren nicht mehr.

Drei neue/korrigierte Negativszenarien gegen bisherigen Code reproduziert (ohne Token in mehreren Umgebungen/gefälschte Header+Body, ungültiger Bearer trotz Flag, lokale Identität in Production/Hosting); jetzt 38 API-/Safety-Tests PASS. Kein Provider-/Supabase-Live-Test, kein Deployment. Weiterhin CRITICAL offene S6-Gates: Server-Pro, verteilte Quoten und Budget/Kill-Switch, DE/EN Safety, reale Hosting-/Auth-Abnahme. RLS bleibt nächster Daten-P0; lokale DB-Werkzeuge fehlen hier.

Finales `pnpm verify` PASS: **603 Tests = 77 Domain + 484 Mobile + 38 API + 4 Security**, Typecheck/Lint PASS. Vorheriger Gesamtlauf: bestehender Fuzzy-Such-Benchmark 57 ms statt <50 ms; isoliert 22 ms und 5/5 PASS, anschließender unveränderter Gesamtlauf vollständig grün. Keine Testgrenze gelockert. Web-Build/Expo-Config unverändert seit grünem S1-Abschluss. Keine neue Dependency in diesem S6-Block.

## Neuester Abschluss — S1 Dependency-Patches

Governance-Commit `27fccac` ist gepusht. Anschließend drei gezielte Overrides: nanoid 3.3.18, undici 6.28.0, tar 7.5.21. Risiko HIGH, keine Datenmigration oder neue Hauptversion. Lockfile geprüft: nur diese drei Auflösungen/Integritäten/Referenzen geändert. Frozen-Reinstall PASS.

Vier Angriffsregressionen schlugen vor dem Patch fehl und bestehen danach; in reguläre Test-Suite integriert. **pnpm verify PASS: 602 Tests (77 Domain + 484 Mobile + 37 API + 4 Dependency-Security), Typecheck/Lint PASS. Web-Build PASS (4.74 MB), Expo public/introspect PASS, neuer Bundle-Secret-Scan ohne Treffer.** Keine Provider-/Device-/Production-Abnahme daraus ableiten.

Neuer Registry-Audit: **57 Befunde = 43 high + 14 moderate**, vorher 67. Produktionsdependencies: **52 = 41 high + 11 moderate**, vorher 62. Damit zehn Advisory-/Versionsbefunde beseitigt, keine Risikoakzeptanz für die übrigen. CI-Audit bleibt absichtlich blockierend. Quellen, Exposition, Lizenzmetadaten und Regressionen: SECURITY.md. Alle älteren Zahlen unten sind die bezeichneten Baselines.

## Repository / Desktop

- Workspace: `C:\Users\skwar\Desktop\TrainingsAppGPT` (ausdrücklicher aktueller Nutzerauftrag; D:-Verweise sind historisch).
- Remote: `https://github.com/knrds/fitness-tracker.git`.
- Eingang: sauberer `main`, `64711388daf754453afb79928b2679a44c028fde`.
- `git fetch --all --tags --prune` erfolgreich; HEAD/origin-main-Differenz 0/0. Kein Pull nötig, keine fremden Änderungen, kein Reset/Clean/Force-Push.
- Neue Review-Branch: `astra/p0-release-core`, von frisch gefetchtem `origin/main`. Kein Main-Merge und kein Production-Deployment.
- Neuester vorhandener Tag: `v0.1.0-beta.6` (`8f5c4ab`); vier spätere UI-/Regression-Commits bis `6471138` berücksichtigt.
- Node: `24.14.0` (Repo >=24; EAS pinnt 24.13.0). pnpm `11.5.0` per Corepack lokal bereitgestellt. Initiales Frozen-Install ohne Lockfileänderung; anschließend genau drei dokumentierte Security-Auflösungen und erneutes Frozen-Install erfolgreich.
- Für lokale Folgekommandos in PowerShell: `$env:COREPACK_HOME = "$PWD/output/corepack"; $env:PATH = "$PWD/output/toolchain;$env:PATH"`. Toolcache/Logs liegen ignoriert in `output/`.

## Frische Baseline vor Implementierung

| Gate | Tatsächliches Ergebnis |
|---|---|
| Typecheck | PASS, alle drei Workspace-Pakete |
| Lint | PASS, alle drei Workspace-Pakete |
| Domain | 77/77 Tests |
| Mobile | Erstlauf 457/458; PersistenceGate-Test überschritt 5 s unter paralleler Build-Last; isolierter Wiederholungslauf 4/4 dieser Suite bestanden |
| API | 37/37, separat ausgeführt, da verify nach Mobile-Timeout abbrach |
| pnpm verify | Erstlauf FAIL wegen des genannten Timeouts; nicht als ursprüngliches PASS umgedeutet |
| pnpm coach:check | BLOCKED: OPENROUTER_API_KEY und OPENROUTER_MODEL fehlen auf diesem Desktop; kein Provider-Nachweis |
| pnpm build | PASS: Expo-Webexport, 4.73 MB JS; kein nativer Binary-Nachweis |
| pnpm audit --json | Exit 1: 67 Befunde, 47 high / 18 moderate / 2 low / 0 critical; Exposition nicht pauschal freigegeben |
| Expo public / introspect | PASS, beide Konfigurationen aus apps/mobile; CLI direkt über installiertes Node-Paket (pnpm exec fand hier Windows-Shims nicht) |

Baseline-Logs lokal: `output/baseline-verify.log`, `baseline-build.log`, `baseline-audit.json`, `baseline-expo-*.log`. Vor neuen Tests umfasste der Code 572 Tests (77 + 458 + 37); die alten Gemini-Berichte mit 57 Domain-Tests waren nicht mehr aktuell.

## Astra P0-A — Secure Storage / Session Security

Status: PARTIAL (Code integriert; native Release-Gates offen). Risiko: HIGH.

Implementiert:
- Native Supabase-Sessionstorage aktiviert, bestehende SecureStore-Dependency wiederverwendet; keine RAM-/Klartext-Fallbacks bei nativen Fehlern.
- Byteerhaltende Dual-Read-Migration aus MMKV/AsyncStorage mit Session-Strukturprüfung, Write-Readback und versioniertem nicht sensiblen Marker.
- Serialisierung von Migration, Refresh und Logout plus Supabase processLock.
- Logout entfernt beide Altquellen und SecureStore-Payload; Marker verhindert Resurrection bei Teilfehlern; Cleanupfehler werden gemeldet.
- Native Fehlermeldungen enthalten keine Rohdaten. Authfehler räumen Ladezustände auf und erscheinen DE/EN.
- SecureStore-Config-Plugin mit Android-Backup-Ausschlüssen und ohne Biometriepflicht.
- Expliziter Rollbackvertrag: Reader behalten; kein einfaches Revert auf MMKV-only nach Migration.

Verifiziert:
- Fünf gezielte neue Regressionen schlugen am alten Scaffold fehl (`output/secure-storage-red.log`).
- Zieltests einschließlich tatsächlichem installiertem Supabase-JS-SDK, MMKV/AsyncStorage/Expo Go, Logout-Teilfehlern, Readback, Korruption, Concurrent Migration/Refresh/Logout und großer Payload-Ablehnung/Retry.
- Expo public/introspect mit neuem Plugin PASS; Android `fullBackupContent` und `dataExtractionRules` referenzieren SecureStore-Ausschlussregeln.
- Finales Gesamtgate: siehe Abschlussmessung unten.

Offen: reale iPhone-/Android-Upgrades mit gleicher Bundle-ID, Sperre/Reboot/Prozess-Kill/Offline/Low-Space, große reale Sessionwerte, Keychain-Neuinstallation/Backup und kompatibler Rollback. Direkte SecureStore-Werte können vom OS wegen Größe abgelehnt werden; Originalbytes bleiben erhalten, Anmeldung kann dann blockieren. Vor Auslieferung nachweisen oder separat geprüfte Größenstrategie ergänzen. Kein Device-Test durch Mocks ersetzt.

## Current Roadmap

| Phase | Status |
|---|---|
| P00 Baseline / Freeze | PARTIAL |
| P01 Native Foundation | PARTIAL |
| P02 Security / Data Integrity | ASTRA_REQUIRED |
| P03 AI Backend | ASTRA_REQUIRED |
| P04 Privacy / Legal / Licensing | USER_ACTION_REQUIRED |
| P05 Subscriptions | PREPARED |
| P06 Onboarding / Paywall | PARTIAL |
| P07 Push / Haptics / Audio | PARTIAL |
| P08 Analytics / Monitoring / Support | PARTIAL |
| P09 QA / Accessibility / Performance | PARTIAL |
| P10 Store Submission | PREPARED |
| P11 Launch | BLOCKED |

19-Bereiche-Matrix mit Code-/Test-/Risikoabgleich: [P0_READINESS_MATRIX.md](P0_READINESS_MATRIX.md).

## Gemini Work Verified / Modified

- VERIFY/REUSE: SQLite-/Scope-/Outbox-/Recoverytests, Export-/Entitlement-/Diagnostics-Scaffolds, Exercise-/Legacy-/UI-Regressionen und native Konfigurationsvorarbeit.
- MODIFY/ACTIVATE: SecureStore-Adapter samt Tests und echte native Supabase-Anbindung. Bisherige Tests erlaubten unsicheren RAM-Fallback, fehlende Readback-Verifikation und verschluckte Fehler.
- VERIFIED technisch: Free-DB-JSON identisch zur Beta-5-Quelldatei; Git-Blob `494916a8c0b48a50ff726e18b82084fa54ba087b`. Foto-Urheberschaft bleibt offen; keine rechtliche Abschlussbehauptung.
- UI im Code: History-Tagesauswahl, direkte Template-/Programmanlage und optionale Profilangaben vorhanden; DE/EN weiterhin lückenhaft (insbesondere Safety und Recoverytexte). Storetests sind keine vollständigen UI-End-to-End-Tests.

## Critical Remaining — nächste Reihenfolge

1. **RLS / CRITICAL:** Lokaler SQL-Vertrag inzwischen mit 304 Assertions auf echter PostgreSQL-Engine verifiziert; vorhandener Gemini-Harness korrigiert und FK-Lücken geschlossen. Supabase-/PostgREST-/Deploymentzustand und reale Bestandsdaten weiterhin unbekannt. Kein Remote-Apply.
2. **Sync / CRITICAL:** Child-Delete-/Pull-Fehler nicht durchgehend geprüft; Aggregate werden ohne Transaktion gelöscht/neu geschrieben. Cloud-RPCs, fachliches Konflikt-/Revisionsmodell und Tombstones begründet implementieren, dann echte Multi-Device-Abnahme. Lokale Outbox schützt nicht vor unvollständigen Cloud-Aggregaten.
3. **Account Deletion / CRITICAL:** Echter parameterloser, authentifizierter Serververtrag fehlt. Client prüft keinen expliziten Erfolg und keine Ursprungsgeneration vor lokalem Cleanup; verschluckt Cleanupfehler. Erst Backend+Scope+Idempotenz+Fehlertests, dann Aktivierung.
4. **AI / CRITICAL:** Öffentlicher Prototyp-Bypass inzwischen geschlossen; weiterhin globale Pro-Freigabe im Client, kein Serverentitlement, verteiltes Budget/Limits oder bestätigtes HTTPS-Deployment. Safety antwortet nur DE. Keine Produktivfreigabe.
5. **Privacy/Billing:** Vollständigen Cloud-Export, Consent, Rechtstexte und native Billing-/Serverentitlements vervollständigen. Dependency-Exposition gezielt prüfen.

## USER_ACTION_REQUIRED

- EAS-Projekt und Apple-/Google-Zugänge; finale Bundle-ID bewusst bestätigen (bestehende IDs unverändert).
- Provider-/Hosting-/Supabase-Konfiguration und Credential-Verantwortung; Secrets nicht im Chat/Repo ablegen.
- RevenueCat/Storeprodukte, Preise, finanzielle Verträge.
- Rechtstexte/Business-/Supportdaten sowie Medienrechte bzw. Ersatzstrategie.
- Supabase-Testprojekt oder lokale vollständige Supabase-Umgebung für Auth-/PostgREST-Abnahme; reine SQL-RLS-Tests laufen inzwischen ohne Docker. Produktionsfreigabe bleibt getrennt.

## PHYSICAL_DEVICE_REQUIRED

iPhone und Android: Sessionmigration/Logout/Accountwechsel, Sperre/Reboot/Kill/Backup, große Sessions, Offline/Low-Space, Haptik, Audio, Keyboard, Gesten, Permissions, Screenreader, Kauf/Restore. Kein signierter Build wurde in dieser Session gestartet.

## Abschlussmessung / Commit

`pnpm verify` PASS: Typecheck/Lint aller Workspaces, 77 Domain-Tests (10 Suites), 484 Mobile-Tests (76 Suites), 37 API-Tests = **598 Tests**. Gegenüber dem Eingang 26 zusätzliche Tests. Ein zwischenzeitlicher Gesamtlauf zeigte eine echte Integrationslücke im unkonfigurierten Gastbetrieb: Placeholder-Auth startete Storage/Refresh. Persistenz und Auto-Refresh sind jetzt nur bei konfiguriertem Supabase aktiv; beide Konfigurationszustände werden getestet. Keine unsichere Test-Ausnahme eingebaut.

Checkpoint-Build PASS (4.74 MB Web-JS), Expo public/introspect PASS. Erneuter `pnpm coach:check` weiterhin BLOCKED wegen fehlender Providerkonfiguration. `git fetch origin` vor Commit erfolgreich; origin/main unverändert `6471138`. Drei neu vom Nutzer bereitgestellte Security-Dateien im Release-Pack bleiben beim Checkpoint unangetastet und werden im nachfolgenden Governance-Block übernommen. Checkpoint-Hash wird dort verlinkt.

## Gemini-Klassifizierung am Pre-Security Checkpoint

| Arbeit | Status | Einordnung |
|---|---|---|
| Secure Storage Scaffold | SUPERSEDED | Unsichere Annahmen durch geprüfte native Integration ersetzt; Gerätefreigabe PARTIAL |
| RLS Audit / Negative Tests | BROKEN | Schemaabweichungen und fehlende Assertions; echte Isolation ASTRA_REQUIRED |
| Sync Failure Harness | VERIFIED | Host-Failure-/FIFO-Tests grün; Cloud-Invarianten ASTRA_REQUIRED |
| Account Deletion Client | PARTIAL | Fehlerguards vorhanden; Vertrag, Scope und Cleanup nicht releasefähig |
| Data Export | PARTIAL | Lokaler Export, kein vollständiger Cloud-Nachweis |
| AI Safety / bilingual | PARTIAL | Deterministische Regeln getestet, ausschließlich DE |
| AI Request Validation | VERIFIED | Bestehende API-Regressionen grün; Production-Gesamtsystem offen |
| Entitlement Abstraction | PREPARED | Kein natives Billing, globaler Beta-Bypass |
| Diagnostics / Logging | PARTIAL | Lokaler Buffer/Redaktion getestet; kein allgemeiner Datenschutzbeweis |
| Exercise Dataset Migration | VERIFIED | Blob identisch zu Beta 5; Medienrechte USER_ACTION_REQUIRED |
| Regression Tests | VERIFIED | Aktueller finaler Lauf 598 Tests |
| Store Readiness | PREPARED | Entwürfe/Checklisten, keine Einreichung |
| Device QA | PREPARED | Checklisten, keine reale Geräteabnahme |
| Profile / History / Plans | VERIFIED | Code und Store-Regressionen vorhanden; visuelle/native Abnahme offen |

Checkpoint **6c01522** ist auf `origin/astra/p0-release-core` gepusht. CHECKPOINT_COMPLETE. Keine Main-Integration oder Produktionsänderung.

## Security Takeover — S0 / S1 (19.09.2026)

Status **PARTIAL**, Risiko **HIGH**. Nutzer-Guardrails, Prompt und zehnseitige Roadmap übernommen. AGENTS.md bindet alle Agenten dauerhaft an die Regeln; README/SECURITY.md verlinken sie. S0–S12-Istmatrix in P0_READINESS_MATRIX.md; codebezogenes Threat Model und wiederkehrender Betriebsrhythmus in SECURITY.md. Feature Expansion bleibt eingefroren.

### Verifiziert und implementiert

- Gitleaks v8.30.1 vom offiziellen Release, Windows-SHA256 `d29144deff3a68aa93ced33dddf84b7fdc26070add4aa0f4513094c8332afc4e` gegen Manifest geprüft.
- Alle 196 erreichbaren Commits (7.93 MB): fünf ausschließlich synthetische Redaktions-Testfixtures. Zwei bekannte JWT-Beispiele, ein sequenzieller Fake-Key, zwei unvollständige JWT-Platzhalter. Ausschließlich deren exakte historische Fingerprints ausgenommen; Wiederholung ohne weitere Treffer. Keine History-Umschreibung.
- Aktueller getrackter/unignorierter Dateistand plus Expo-public/introspect-Ausgaben (4.19 MB): dieselben fünf Fixtures, keine zusätzlichen Treffer. Exportiertes Web-Bundle (4.75 MB): null Treffer. Frisch generierter künstlicher Canary wird mit Exit 1 zurückgewiesen. Keine Credentialwerte in diesem Bericht.
- Kein Vollständigkeitsbeweis für unbekannte Secretformate, unerreichbare gelöschte Refs, Remote-Secrets oder native signierte Artefakte. Kein echter Credentialfund, deshalb keine grundlose Rotation. Remote-Secrets/IAM bleiben USER_ACTION_REQUIRED.
- CI: contents:read, keine persistierten Checkout-Credentials, unveränderliche SHA-Pins für Checkout/Node/pnpm, Job-Timeouts, Gitleaks-History-/Bundle-Gates und blockierendes `pnpm audit --audit-level=high`. Scannerdownload versions-/SHA256-gebunden. Kein continue-on-error und keine globale Regel-/Testordnerausnahme.
- Typecheck/Lint PASS; Shell-Syntax und Diff-Whitespace-Prüfung PASS. Unveränderte App: vorangehende 598 Tests und Web-Build PASS. GitHub-Runner-Ausführung dieser neuen CI nicht lokal behauptet; wegen der bestehenden High-Befunde wird das Audit-Gate derzeit scheitern.

### Supply-Chain-Exposition, keine Risikoakzeptanz

67 Advisory-/Versionsbefunde: 47 high, 18 moderate, 2 low in 17 Paketgruppen. Separater erneuter Registry-Audit mit `--prod`: **62 Befunde (45 high, 15 moderate, 2 low)**. Der erste Netzwerkversuch schlug fehl; Wiederholung mit Netzwerkzugriff lieferte diese Werte. Expo führt auch Buildwerkzeuge über Produktionsdependencies; `--prod` beweist weder Runtime-Ausnutzbarkeit noch deren Ausschluss. Kürzeste aufgelöste Pfade und nächste Aktionen:

| Gruppe | Anzahl | Beobachteter Pfad / nächste Aktion |
|---|---:|---|
| @xmldom/xmldom | 23 | Expo CLI → plist/config-plugins; XML-Buildinputs und Patchkompatibilität |
| brace-expansion | 9 | eslint/minimatch und Expo CLI; kompatible Branch-Patches |
| js-yaml | 8 | eslint und Jest/Expo; YAML-Tooling-Patches |
| undici | 7 | Expo CLI; HTTP-/WebSocket-Tooling, kein Runtime-Attest |
| postcss | 4 | Expo Metro und Vitest/Vite; CSS-Verarbeitung |
| vite / vitest / @vitest/mocker | 4 | Domain-Testwerkzeuge; kompatible Patches, keine öffentlichen Testserver |
| image-size | 2 | Metro; bösartige Asset-Metadaten beim Build |
| nanoid / decode-uri-component | 3 | Expo Router/query-string; mögliche Clientpfade untersuchen |
| browserslist / baseline-browser-mapping | 3 | Babel/Metro Buildkette; Patch-/Lizenzprüfung |
| tar / shell-quote / form-data / uuid | 4 | Expo CLI, RN DevTools, jsdom, xcode; früherer tar-Patch beseitigt nicht alle aktuellen Advisories |

Keine ungetesteten Massenupdates oder stillen Lockfileänderungen. Offene S1-Gates: kompatible Fixes/Reachability, SAST, Lizenz-/SBOM-Nachweis, Branch Protection/required checks, Signing-/EAS-/Hosting-IAM. Projektowner muss Remote-Kontrollen bestätigen. Native/Cloud-/RLS- und Legal-Gates unverändert.
