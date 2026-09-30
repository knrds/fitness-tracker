# Entwicklung, Deployment und Betrieb

## Lokale Entwicklung

Workspace nicht fest codieren. Node `24.x` gemäß package.json/.nvmrc/CI; EAS pinnt `24.13.0`, pnpm `11.5.0` gemäß packageManager. Expo54/RN0.81.5-Majorupgrades als eigenen überprüfbaren Change durchführen.

```powershell
pnpm install --frozen-lockfile
pnpm docs:check
pnpm verify
pnpm build:preview
pnpm audit:ci
```

`verify` prüft Dokumentlinks, Typecheck, Lint, Domain/Mobile/API/Security-/Dokumenttests. `build:preview` ergänzt Dependency-Previewgate und geprüften Webexport. Echte PostgreSQL-Ownership/RLS-Tests laufen separat über `bash scripts/security/run-rls-tests.sh` mit isoliertem lokalen PostgreSQL oder in CI; `test:security` alleine führt diesen SQL-Harness nicht aus. [RLS-Anleitung](../reference/RLS_TESTING.md).

`pnpm dev` baut Webvorschau und startet lokalen Coach; `pnpm coach:local` bedient vorhandenen Export über Loopback (8096). `pnpm dev-client` benötigt eigenes installiertes natives Development-Binary; Expo Go/Browser haben andere Persistenz-/Modulgrenzen. Native Module/Plugins/Identität benötigen einen Neubuild.

Providerkonfiguration serverseitig nach [api/.env.example](../../api/.env.example). Öffentliche Appkonfiguration nach [mobile example](../../apps/mobile/.env.example). Native Coach-URL muss absolute HTTPS-URL sein; localhost bezeichnet das Gerät. Kein Secret in CLI-Argumenten/Outputs/Clientenv. Entwicklung, Staging und kommerzielle Produktion strikt trennen.

## Umgebungen und Identität

| Ziel | Konfiguration | Freigabegrenze |
| --- | --- | --- |
| Lokal | Loopbackserver, synthetische Daten, `.env.coach.local` ignoriert | Keine öffentliche unautorisierte API |
| Web-Beta | `APP_ENV=beta` + serverseitiger zufälliger `BETA_SESSION_SECRET`; Client `EXPO_PUBLIC_APP_ENV=beta` | Signierte Beta-Gäste, aktuelle Instanzlimits; keine Storefreigabe |
| Staging | Eigenes Supabase/Auth/Providerbudget, eigene Testkonten, geschützter Zugang | Echte RLS/Sync/Delete/Billing-Abnahme ohne Produktivdaten |
| Produktion | `APP_ENV=production`, Client `EXPO_PUBLIC_APP_ENV=production`, serverseitige Autorität | Keine Beta-/Local-Authausnahme; sämtliche P0-Gates geschlossen |

`APP_VARIANT` steuert native Appidentität, **nicht** allein die Sicherheits-/Betaumgebung. Native Basis derzeit `studio.skar.evaro`, Scheme `evaro`, EAS-Projekt `ddb36b12-30d0-4422-9e17-85ab8919f656`, Owner `knrd.s`; Development/Preview mit Suffix, Production ohne. Betreiber muss Identität bestätigen. EAS `appVersionSource=remote`/autoIncrement nutzen; nicht widersprüchliche Buildnummern erfinden. Paketbeta und native Marketingversion getrennt behandeln.

## Sicherer Git-/Beta-Checkpoint

1. Gitstatus, main/Remote, aktive Arbeitsbranches, Tags und uncommittete Metadaten prüfen; keine Reset/Clean/Force-Operation.
2. Enge Arbeitsbranch, relevante Regressionen; volle `verify`/Build/Dependency-/Secret-Gates vor Integration. History und Webbundle via checksum-geprüftem Gitleaks mit Redaktion scannen; native Artefakte separat.
3. Branch pushen, PR mit konkreter Änderung/Tests/Restrisiken, neue GitHubchecks und Vercel-Deployment dieses SHAs prüfen. Required-Checks-Konfiguration nicht allein aus grünen Jobs ableiten.
4. Erst nach grünen Checks sicher mergen. Merged main prüfen; neue Mainchecks/Deployment-SHA/READY und Kernsmoke nachweisen. Datenmigrationen bleiben eine getrennte Freigabe.
5. Ein Beta-Produktcheckpoint muss nicht automatisch neuen Tag erhalten. Nur bei vollständig geschlossenem freigegebenem Beta-Gate nächste tatsächlich vorhandene Prereleasenummer bestimmen, Release Notes pflegen, annotierten Tag auf geprüften SHA setzen, pushen, Entwicklungsbranches vorwärts synchronisieren, sauberen Baum prüfen.

Vercel vercel.json baut `pnpm build:preview`, veröffentlicht `apps/mobile/dist`, routet `/api/*` zum Nodehandler und restliche Pfade zum Export. API `no-store`, Expoassets immutable. Release-Smoke: Home/Assets/Deep Links, HTTPS-Beta-/Authpfad, echte kurze Coachantwort mit synthetischem Kontext, kontrollierte 401/403/429/502/503, kein Credentialleak. Cloudmutation/Storekauf nur in dafür freigegebener Testumgebung.

## Native RC und Gerätegate

Signierte EAS-RCs auf echtem iPhone und Android, zusätzlich Samsung Galaxy S25 5G für den gemeldeten Startupfehler. Browser/PWA und Node-SQLite beweisen nicht den nativen Pfad. Gleiche Bundle-ID beim Upgrade, Originalbeta-Daten zuerst sichern; nach Defekt kein automatischer Reset.

Für jeden Kernablauf Startzustand, Schritte, Erwartung, Ergebnis und Build/Gerät notieren: kalter Start/Resume, gespeicherte Daten, aktive Session und Finish, Kill/Low Space/Offline, SecureStoremigration und Logout, Accountwechsel, Synckonflikt, Avatar, Tastatur/Edge-Swipe, Timer im Background/Lock, Kamera/Mikro verweigert, Audio silent/disable, Screenreader/Fontscale/reduced motion, date-only/DST, Purchase/Restore auf neuem Gerät. Samsungmeldung ohne Diagnosecode bleibt unreproduziert, nicht geschlossen.

## Öffentliches Release-Gate

R01–R10 sowie die P0-Kern-/Großdatengeräteabnahme aus R11 der [Master-Roadmap](MASTER_ROADMAP.md) für genehmigten Umfang abnehmen. [Apple Review](https://developer.apple.com/app-store/review/guidelines/) und [Google Health declaration](https://support.google.com/googleplay/android-developer/answer/14738291?hl=en) unmittelbar vor Submission erneut prüfen. Reale SDK-/Permission-/Netzwerkflüsse mit Privacy Manifest/Store Privacy/Data Safety abstimmen; aktuelle Store-SDK-/Target-Anforderungen am RC nachschlagen. Kein Webwrapper-Versprechen „eine native Funktion reicht“. Tablets unterstützen wie konfiguriert oder Zielumfang bewusst anpassen und testen.

Reviewerzugang, echte Funktionen/Screenshots/DEEN, erreichbare Liveurls und Backend, richtige Storeprodukte, keine Debugbypässe/Platzhalter. Signierter Build, Commit, native Version/Buildnummer, CIevidence und Storeeinreichung müssen zusammenpassen. Kein Storeupload, Billingaktivierung oder destruktive Produktionsmigration ohne dafür bestehende ausdrückliche Betreiberfreigabe.

## Betrieb und Incidentverfahren

Konkrete Menschen/Vertretung/Kontakte sowie Reaktions- und Recoveryziele vor Launch benennen; keine erfundene 15-Minuten-SLA. Monitoren: Crashrate/Startup, Auth 401/403-Anomalien, API5xx/Latenz, DB-/Sync-/Deletefehler, Queuealter, Budget/Tokenkosten, Webhooks und Abonnementzustand. Alerts mit synthetischem Vorfall auslösen. Keine Rohgesundheitsdaten im Alarm.

| Vorfall | Unmittelbare kontrollierte Handlung | Wiederaufnahme erst nach |
| --- | --- | --- |
| Provider/Safety/Kosten | Aktueller API-Kill-Switch heißt `COACH_ENABLED=false`; bei Envänderung wirksames Deployment verifizieren, Providercap/Key sperren. Keine unbelegte sofortige Fernwirkung behaupten. | Regression, globale Kostenkontrolle und synthetischer End-to-End-Nachweis |
| Datenintegrität/RLS | Betroffene Cloudwrites kontrolliert sperren, lokale Outbox erhalten, Schema/IAM/Logs redigiert sichern. | Isoliertem Restore/Abgleich und realer A/B/AuthZ-/Syncabnahme; niemals blind Produktion zurückspielen |
| Secret | Widerrufen/rotieren, Reichweite und Accesslogs prüfen, neue Credentials sicher deployen. | Sauberem History/Bundle-/Logscan und geklärtem Missbrauch; Gitumschreibung nur separat koordiniert |
| Billing | Provider-/Webhookzustand prüfen; vorhandene Cachepolicy beibehalten, keine freie globale Provergabe. | Verifizierter Replay-/Order-/Restoreabnahme; fehlende Billingintegration nicht vortäuschen |
| Schlechter Build | Stufenrollout stoppen/pausieren, kompatiblen Forward-Fix/letzten sicheren Build bewerten. | Migration-/Readerkompatibilität und erneuten Geräte-/RCtests |
| Datenabfluss | Zugriff begrenzen, Belege sichern, Betreiber/Privacyowner einbeziehen. | Ursachenbehebung, Wiederherstellungsnachweis und rechtlich bewerteter Benachrichtigung |

EAS-OTA-/Rollbackkanal ist nicht als aktiv nachgewiesen. Vor Nutzung Runtimekompatibilität, Signierung/Channel, Storepolicy und Probe-Rollback prüfen. Keine spekulativen CLI-Rollbackbefehle als produktionsbereit dokumentieren. Nach SecureStoremigration kein MMKV-only-Rollback; [Readervertrag](../reference/SECURE_STORAGE.md).

Backups zählen nach isoliertem Restore: DB + private Storageobjekte + nötige Konfiguration, definierte RPO/RTO/Retention/Encryption/Access und gelöschte Konten im Restoreprozess beachten. PostgreSQLbackup alleine enthält nicht automatisch Storageobjects. Kein Restore auf produktive Daten ohne geprüftes Verfahren.

Betriebsrhythmus: wöchentlich Security-/Kostenwarnungen; monatlich IAM/Dependencies/Logs/Vendor; quartalsweise Restore/AuthZ/DAST/Threatreview; halbjährlich Incident-/Privacyübung; jährlich sowie vor großem Launch unabhängiger Security-/Privacy-/Legalreview. Erreichbaren Securitykontakt/Vulnerability-Intake und geltende Incident-Meldepflichten mit dem Betreiber festlegen. Ergebnis/Owner/Datum in Roadmapnachweis pflegen. Erste 30 Tage begrenzter Rollout, Crash-/Kosten-/Retentionbaseline, P0/P1 vor Experimenten.
