# EVARO – kostenlos auf dem iPhone testen

Stand: 21.09.2026 (Gemini Stabilization & Preview Recovery). Branch: `astra/p0-release-core`. SDK 54 bleibt unverändert. Kein Apple-Abo oder Store-Upload nötig.

## Zwei Testwege:
- **Vercel HTTPS-Preview (Aktualisierter Stand):** [EVARO in Safari öffnen](https://fitness-tracker-git-a-808f13-skwarskikonrad1-gmailcoms-projects.vercel.app/).
  - Nach Gemini Takeover: i18n Session-Telemetry vollständig DE/EN, barrierefreie Buttons, Preview-Security-Gate mit Zero-Critical-Garantie und 0 Client-Runtime-Reachability.
  - Streng NON-RELEASE: Nur erfundene Testdaten, kein Billing, keine Production-Secrets.
- **Lokaler WLAN-Stand:** per `pnpm preview:iphone` im eigenen privaten WLAN öffnen.
  - Unabhängig von Vercel und externen Servern; bindet deine lokale WLAN-IPv4 (z. B. `http://192.168.x.x:8097`).

## Dual-Gate Sicherheitsarchitektur
- **Release / Production:** Bleibt in GitHub Actions CI strikt blockiert (`pnpm audit --audit-level=high`), solange 43 High Findings in Build-Tools (Metro, Plist, Jest) offen sind.
- **Private Test Preview:** Führt `pnpm verify` (alle 654 Tests), `scripts/security/preview-security-gate.cjs` (Sicherheitsprüfung, Protokollierung aller Befunde) und `pnpm build` aus. Ermöglicht Safari-Tests auf dem echten iPhone ohne Verharmlosung der Release-Gates.

Windows-PC und iPhone im **selben vertrauenswürdigen privaten WLAN**, PC eingeschaltet. PowerShell, Git für Windows, Node 24 und pnpm 11.5.0. Auf diesem Desktop sind pnpm, Testtools und Dependencies bereits vorhanden.

Für den lokalen Weg brauchst du keinen weiteren Account. Für späteres HTTPS: Vercel-Zugang; für Auth/Cloud: separates Supabase-Testprojekt. Expo-Zugang ist bereits vorhanden. Kein Apple-Abo kaufen, solange nur Safari getestet wird.

Kostenhinweis: Vercel Hobby ist laut Anbieter auf persönliche/nichtkommerzielle Nutzung begrenzt. Eine künftige kommerzielle EVARO-App ist dadurch nicht pauschal kostenfrei abgedeckt. Keine Pro-Testphase/Abos aktivieren. Supabase Free erlaubt derzeit zwei aktive kostenlose Projekte über die relevanten Organisationen hinweg; kein neues Projekt in einer kostenpflichtigen Organisation anlegen. Quellen unten.

## 3. Richtigen Ordner und Git-Stand prüfen

PowerShell öffnen. Die Befehle einzeln ausführen:

```powershell
Set-Location 'C:\Users\skwar\Desktop\TrainingsAppGPT'
git status -sb
git branch --show-current
git log -1 --oneline
git remote -v
```

Erwartet: `astra/p0-release-core`, Remote `knrds/fitness-tracker`. Bei Änderungen nicht resetten/cleanen und nichts überschreiben. Eine neu hinzugefügte EAS-Verknüpfung ist keine kaputte Datei.

Nur wenn die Arbeitskopie sauber ist und der Branch existiert:

```powershell
git fetch --all --tags --prune
git switch astra/p0-release-core
git pull --ff-only origin astra/p0-release-core
```

Wenn Git einen Konflikt oder eine nicht mögliche Fast-Forward-Aktualisierung meldet: stoppen, Meldung weitergeben. Kein Force-Push, kein Main-Merge für diese Tests.

## 4. Toolchain in jedem neuen PowerShell-Fenster aktivieren

```powershell
Set-Location 'C:\Users\skwar\Desktop\TrainingsAppGPT'
$env:COREPACK_HOME = "$PWD/output/corepack"
$env:PATH = "$PWD/output/toolchain;$env:PATH"
node --version
pnpm --version
```

Auf diesem Desktop geprüft: Node `v24.14.0`, pnpm `11.5.0`. Die lokale pnpm-Abkürzung liegt unter output/toolchain. Falls sie auf einem anderen Desktop fehlt, zuerst Node 24/Corepack korrekt installieren; nicht wahllos Paketversionen ändern.

Nur bei fehlenden/seit dem Pull geänderten Dependencies:

```powershell
pnpm install --frozen-lockfile
```

Lockfilefehler nicht mit `--no-frozen-lockfile` übergehen.

## 5. Automatisierte Prüfungen vor manuellen Tests

```powershell
pnpm verify
```

Enthält Typecheck, Lint, Domain-/Mobile-/API-/Security-Tests. Jede rote Assertion zuerst klären. React-Testwarnungen sind nicht automatisch ein Fehlschlag; maßgeblich sind PASS/FAIL und der Exitcode:

```powershell
$LASTEXITCODE
```

Erwartet `0`. Einzelne Gruppen zum gezielten Wiederholen:

```powershell
pnpm --filter @fitness-tracker/mobile test syncResponseFailures nativeWorkoutTransaction saveCoachPlan --runInBand
pnpm test:api
pnpm test:security
pnpm --filter @fitness-tracker/mobile test uuid.web.test.ts --runInBand
```

Danach Web-Export:

```powershell
pnpm build
```

Erwartet `Exported: dist`, tatsächlicher Ordner `apps/mobile/dist`. Das ist **kein** nativer iPhone-Build.

```powershell
Push-Location apps/mobile
node node_modules/expo/bin/cli config --type public
node node_modules/expo/bin/cli config --type introspect
Pop-Location
```

Beide Konfigurationsprüfungen müssen ohne Fehler enden. Ausgaben nicht ungeprüft öffentlich posten: öffentliche Projektkonfiguration kann URLs/öffentliche Schlüssel enthalten.

## 6. Security-Checks verstehen

```powershell
pnpm audit --audit-level=high
```

Aktuell bekannt: 57 Befunde, davon 43 high und 14 moderate. Dieser Befehl ist deshalb **nicht grün**. Keine automatische Reparatur mit `audit fix --force`, keine Audit-Ausnahmen zum Grünfärben. Für einen öffentlichen Rollout bleiben die Befunde ein Gate.

Auf diesem Desktop ist Gitleaks vorbereitet:

```powershell
& .\output\security-tools\gitleaks\gitleaks.exe dir apps/mobile/dist --redact=100 --ignore-gitleaks-allow --no-banner
```

Erwartet `no leaks found`. Das ist ein Scan dieses Artefakts, kein Beweis für sichere Remote-Einstellungen. Native Binärdateien und Source Maps sind separat zu prüfen. Keine Source Maps öffentlich bereitstellen.

## 7. Sofortiger kostenloser iPhone-Test im WLAN

Nach erfolgreichem Build im Repository-Ordner:

```powershell
pnpm preview:iphone
```

Das Terminal zeigt zum Beispiel `iPhone URL: http://192.168.1.42:8097`. **Benutze die tatsächlich ausgegebene Adresse, nicht diese Beispiel-IP.** Der Server bindet nur die erkannte private WLAN-Adresse, nicht alle VPN-/Netzwerkadapter. Bei mehrdeutigen Adaptern die private WLAN-IPv4 ausdrücklich angeben: `pnpm preview:iphone --host 192.168.0.158` (durch deine aktuelle Adresse ersetzen). Zum Nachschauen:

```powershell
Get-NetIPConfiguration | Select-Object InterfaceAlias, IPv4Address, IPv4DefaultGateway
```

1. PC und iPhone in dasselbe private WLAN bringen.
2. iPhone: Safari öffnen.
3. Die angezeigte `http://...:8097`-Adresse eingeben.
4. EVARO muss laden. Als Gast starten; ausschließlich erfundene Trainingsdaten verwenden.
5. Serverterminal offen lassen. Mit **Strg+C** beenden.

Falls Windows nach Netzwerkzugriff für Node fragt: nur das eigene **private** Netzwerk erlauben, nicht öffentliche Netzwerke. Keine Firewall komplett abschalten und keine Router-Portweiterleitung einrichten. Falls eine verwaltete Firewall den Zugriff verhindert, die Netzwerkfreigabe mit dem Geräteowner klären; keine Sicherheitswarnungen umgehen.

Wichtig: `localhost` oder `127.0.0.1` auf dem iPhone bezeichnet das iPhone, nicht deinen PC. Der WLAN-Test ist HTTP, nicht HTTPS. Daher hier keine echten Zugangsdaten, kein Cloud-Auth und keine echten Gesundheitsdaten. Kamera/Mikrofon oder andere Secure-Context-Funktionen können eingeschränkt sein. Der bisherige `pnpm coach:local`-Server bleibt ausschließlich auf Loopback und wird niemals ins WLAN freigegeben.

## 8. Vollständige iPhone-Testmatrix (11 Testschritte)

Vor jedem Durchgang Commit, iPhone-Modell, iOS-Version und Uhrzeit notieren.
Nur synthetische Gastdaten verwenden! Keine echten Gesundheitsdaten in Preview.

### Schritt 1: Start
- Seite in Safari auf dem iPhone laden.
- **Erwartetes Ergebnis:** Dashboard ist sichtbar, Icons (Ionicons/FontAwesome) werden scharf geladen, Fonts (Space Grotesk / Manrope) sind korrekt gerendert. Kein endloser Ladebalken.

### Schritt 2: Sprache (DE / EN)
- In Profil/Einstellungen die App-Sprache auf **Deutsch** stellen.
- Workout-Abschluss und Session-Telemetry öffnen.
- **Erwartetes Ergebnis:** Vollständige Anzeige auf Deutsch („Training abgeschlossen“, „SÄTZE“, „ZEIT“, „Volumen“, „Arbeitssätze“, „TRAININGSAUSWERTUNG“, „SUPER“, Koffeinhinweise auf Deutsch). Keine unnötigen englischen Produkttexte.
- Anschließend Sprache auf **English** stellen.
- **Erwartetes Ergebnis:** Dieselbe Oberfläche stellt sauberes Englisch dar („Workout completed“, „SETS“, „TIME“, „volume“, „working sets“, „SESSION TELEMETRY“, „AWESOME“). Dynamische Werte bleiben 100 % identisch.

### Schritt 3: Workout & Persistenz
- Neues Workout starten („Quick Start“ oder leeres Workout).
- Übung hinzufügen, Satz mit **20 kg** und **8 Wiederholungen** eintragen und Satz per Checkbox abhaken.
- Seite in Safari neu laden (Reload).
- **Erwartetes Ergebnis:** Eingegebene Werte (20 kg, 8 Wdh.) und der Set-Haken bleiben vollständig erhalten. Workout kann sofort weitergeführt werden.

### Schritt 4: Workout abschließen
- Workout über den Beenden-Button abschließen.
- Verlauf-Tab (History) öffnen.
- **Erwartetes Ergebnis:** Genau **ein** neuer History-Eintrag. Korrekte Session-Telemetry, korrekte Sprache, keine doppelten Einträge.

### Schritt 5: Template
- Im Pläne-Tab ein neues Template erstellen und speichern.
- Verlauf und XP prüfen.
- **Erwartetes Ergebnis:** Template ist in der Liste vorhanden. Kein neuer History-Eintrag, kein XP-Zuwachs, kein Fake-Workout erzeugt.

### Schritt 6: Trainingsplan
- Einen neuen Wochen-Trainingsplan anlegen.
- Verlauf und XP prüfen.
- **Erwartetes Ergebnis:** Plan ist angelegt. Kein absolviertes Workout, kein History-Eintrag, kein XP-Zuwachs.

### Schritt 7: Profil / Messungen
- Im Körper-Tab ein erfundenes Testgewicht (z. B. 75.5 kg) eingeben.
- **Sicherheitsvorgabe:** Nur synthetische Testdaten! Keine echten medizinischen oder Gesundheitsdaten in die Preview eingeben.
- **Erwartetes Ergebnis:** Dezimalwert wird korrekt formatiert und gespeichert.

### Schritt 8: Theme
- Theme nacheinander auf **Light**, **Dark** und **System** umstellen.
- **Erwartetes Ergebnis:** Kontraste und Farben passen sich sauber an; Schrift bleibt überall lesbar.

### Schritt 9: Tastatur & Formulareingaben
- Auf dem iPhone Tastatur in verschiedenen Inputs öffnen: Gewicht, Wiederholungen, Profilname, Messung.
- **Erwartetes Ergebnis:** Eingabefelder und Bestätigungsbuttons werden nicht hinter der iOS-Bildschirmtastatur verdeckt. Scrollen bleibt möglich.

### Schritt 10: Bildschirm-Rotation
- iPhone ins Querformat (Landscape) drehen und zurück ins Hochformat (Portrait).
- **Erwartetes Ergebnis:** Layout reagiert responsiv; keine abgeschnittenen Bedienelemente oder Darstellungsfehler.

### Schritt 11: Zum Home-Bildschirm hinzufügen
- In Safari auf das Teilen-Symbol tippen -> **„Zum Home-Bildschirm“** wählen.
- **Erwartetes Ergebnis:** EVARO-App-Icon erscheint auf dem Home-Screen.
- Beim Antippen öffnet die App als Web-App im Standalone-Modus mit sauberer Statusleiste und Navigation.

---

## 9. Web-Grenzen – Was Web-Previews NICHT beweisen können (`IOS_NATIVE_REQUIRED`)

Safari- und Home-Screen-Tests sind eine hervorragende kostenlose Ergänzung für UI-, i18n- und Ablauf-Prüfungen. Sie ersetzen jedoch **keine** native iOS-Freigabe für:
- Echtes natives **SecureStore** (Keychain-Verschlüsselung)
- Native **SQLite**-Transaktionen unter Prozessabbruch (Process Death / Low-Memory Kill)
- Native **Haptik** (`expo-haptics`) und Audio-Ducking
- StoreKit / In-App-Purchases (RevenueCat)
- Push-Notifications und native Background Tasks
- Native Deep-Links (`evaro://`)
- Native App-Berechtigungen

Status für diese Komponenten bleibt strikt: `IOS_NATIVE_REQUIRED` / `PHYSICAL_DEVICE_REQUIRED`.

---

## 10. Vercel: Build & Preview Deployment

Öffne https://vercel.com/dashboard mit deinem bestehenden Konto. Projekt `fitness-tracker` ist vorhanden; Astra-Deployment `96e4joyXE1p2bwHnznaBdiYR2GyH` wurde als Ready / Preview / Commit `3bd4713` bestätigt. Es wurde kein neues Projekt angelegt und kein Production-Deployment ausgelöst.

Wenn `fitness-tracker`/EVARO bereits vorhanden ist: dieses Projekt öffnen, keine Dublette anlegen. Settings → Build and Deployment bzw. Build & Development Settings. Die genaue Beschriftung kann variieren.

| Einstellung | Wert für dieses Repository |
|---|---|
| Git Repository | knrds/fitness-tracker |
| Root Directory | Repository-Wurzel (`.` bzw. leer); **nicht apps/mobile** |
| Framework Preset | Other |
| Install Command | pnpm install --frozen-lockfile |
| Build Command, neuer Review-Stand | pnpm build:preview |
| Output Directory | apps/mobile/dist |
| Node.js | 24.x |
| Preview Branch | astra/p0-release-core |

Repository-Wurzel ist nötig, damit pnpm-Workspace, vercel.json und api/coach-chat.js zusammenbleiben. Die Build-/Outputwerte stehen in vercel.json. `build:preview` führt `pnpm verify` (alle Tests & Lints), dann `node scripts/security/preview-security-gate.cjs` (Sicherheitsprüfung, Protokollierung der 43 High / 14 Moderate Befunde, Verifikation von 0 Client-Reachability und Non-Release-Status), dann `pnpm build` aus. Der lokale reine Web-Build bleibt `pnpm build`.

## 11. Vercel: Security-Gates vor jeder HTTPS-Veröffentlichung

Eine normale Vercel-Git-Verknüpfung wartet nicht automatisch auf alle GitHub-Tests. Vercels Deployment Checks betreffen insbesondere Production-Promotion; sie dürfen nicht als bereits eingerichtete Preview-Sperre ausgegeben werden.

Neuer Review-Code trennt Release- und Preview-Sicherheitsziele sauber ab: In GitHub Actions CI für Releases bleibt der `pnpm audit --audit-level=high`-Gate strikt blockierend. Für Vercel-Previews werden alle Tests und Lints erzwungen, keine Produktions-Schlüssel zugelassen und alle Abhängigkeitsbefunde transparent protokolliert. Die Preview ist strikt als `NON_RELEASE` gekennzeichnet. Kein Force-Promote nach Production! Verfügbare Vercel-Authentifizierung/Deployment Protection beibehalten; geschützte Preview auf dem iPhone mit berechtigtem Konto öffnen.

Nach tatsächlicher Gate-Freigabe: Projekt → Deployments → Create Deployment (falls angeboten) → Repository/Branch `astra/p0-release-core` bzw. freigegebenen Commit wählen → Ziel **Preview** prüfen → Deploy. Bei abweichendem Dialog nicht auf Verdacht Production wählen. Alternativ nach eingerichteter, geprüfter Preview-Automation löst der Branch-Push das Deployment aus. Im Ergebnis müssen **Ready**, **Preview** und der richtige Commit stehen. Den dortigen HTTPS-Link kopieren; keine URL erraten.

## 12. Environment-Matrix

Diese Matrix beschreibt den aktuellen Vertrag und offene Gates; sie erfindet keine neuen Flags.

| Modus | App/API | Supabase | AI | Logging | Flags/Billing/Analytics |
|---|---|---|---|---|---|
| Lokale WLAN-Preview | HTTP :8097, statische API aus | Für Gasttest leer | Kein Provider, API gesperrt | Server loggt nur Start/URLs; App-Logger redigiert | Globaler Beta-Pro-Bypass weiterhin true; keine echten Käufe; lokale Diagnostics |
| Lokale PC-Entwicklung | Loopback :8096 mit coach:local | Optional nur separates Testprojekt | Provider nur ausdrücklich lokal konfigurieren; Kosten möglich | Redigierte Logs, debug im Entwicklungsmodus | Wie bestehender Code, keine Produktionsfreigabe |
| HTTPS Preview | Vercel-Preview + gleiches /api/coach-chat | Nur separates Staging-Projekt | Providerkeys zunächst weglassen; 503 bei angemeldetem Request erwartet | Keine Rohdaten, tatsächliche Hostinglogs noch abnehmen | Beta-Bypass noch nicht environment-scoped; Billing nicht aktiviert |
| Staging | Stabile bestätigte HTTPS-Testadresse | Eigenes Testprojekt, keine Productiondaten | Später kontrollierter Testprovider/Quoten | IAM/Retention/Monitoring offen | Serverentitlements weiterhin PREPARED |
| Production | Nicht freigegeben | Eigenes Productionprojekt | Auth, Pro, Budget, verteilte Limits/Kill-Switch fehlen teilweise | Betriebsabnahme offen | Kein globaler Pro-Bypass zulässig; noch nicht umgesetzt |

`APP_VARIANT` steuert native App-ID/Name; es erzeugt **keine** Supabase-Umgebung, keine Sicherheitsgrenze und keinen Billing-Schalter. Es gibt keinen bewiesenen universellen LOG_LEVEL-/ANALYTICS_OFF-Schalter. Keine Flags dokumentieren, die der Code nicht auswertet.

## 13. Öffentliche Client-Konfiguration

Nur für die spätere HTTPS-Staging-Preview bzw. lokale sichere PC-Entwicklung. Für den ersten WLAN-Gasttest nicht erforderlich.

```powershell
Set-Location 'C:\Users\skwar\Desktop\TrainingsAppGPT'
if (-not (Test-Path apps/mobile/.env.local)) {
  Copy-Item apps/mobile/.env.preview.example apps/mobile/.env.local
}
notepad apps/mobile/.env.local
```

Lokal ersetzen, nicht in den Chat posten:

```dotenv
EXPO_PUBLIC_SUPABASE_URL=https://<STAGING_PROJECT_REF>.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=<INSERT_LOCALLY_PUBLIC_ANON_KEY>
EXPO_PUBLIC_COACH_CHAT_ENDPOINT=/api/coach-chat
```

Nur öffentlicher anon/publishable Client-Schlüssel; niemals `service_role`, `sb_secret_...` oder OpenRouter-Key im Client. Aktuelle Beispiel-/Integrationspfade verwenden `ANON_KEY`; nicht ohne Prüfung auf einen anderen Schlüsseltyp umstellen. Platzhalter nicht als gültige Konfiguration bauen. Wenn Auth nicht eingerichtet ist, die Variablen ganz weglassen statt Fakewerte eintragen.

Auf Vercel: Project → Settings → Environment Variables → ausschließlich **Preview**, bei Bedarf auf den Astra-Branch eingrenzen. Dieselben drei Namen verwenden; Für Vercel-Web den Coach-Endpoint ausdrücklich auf `/api/coach-chat` setzen: Bei konfiguriertem Supabase und leerem Endpoint wählt der aktuelle Client sonst dessen `/functions/v1/coach-chat`. Native Builds brauchen eine absolute HTTPS-URL. Keine localhost-URL für ein iPhone-Backend. Clientwerte sind im Bundle öffentlich. Nach Änderungen neu bauen; ein Browser-Reload ersetzt keinen Build.

Für späteren Coach-Server zusätzlich serverseitig SUPABASE_URL und SUPABASE_ANON_KEY aus **demselben Staging-Projekt**, COACH_ALLOWED_ORIGINS mit genau freigegebener HTTPS-Origin. OPENROUTER_API_KEY/MODEL zunächst weglassen: kein kostenpflichtiger Providerbetrieb, keine erfundene Mock-Erfolgsantwort.

## 14. Supabase Free/Staging vorbereiten

1. https://supabase.com/dashboard öffnen und selbst anmelden.
2. Bestehende Projekte zuerst ansehen. Name/Projekt-ID/Organisation eindeutig auf Staging prüfen.
3. Falls nötig New Project → eine **Free**-Organisation wählen → Name z. B. `evaro-staging` → Region passend zum Testbedarf → DB-Passwort nur lokal im Passwortmanager speichern.
4. Keine kostenpflichtigen Add-ons, kein Pro-Branching, keine Production-Verbindung wählen. Wenn Free-Slot fehlt, stoppen statt kostenpflichtig upgraden oder ein Projekt löschen.
5. Im Projekt Connect bzw. Settings → API/Data API: Projekt-URL und öffentlichen anon-Schlüssel für die lokale/Vercel-Preview-Konfiguration entnehmen.
6. Authentication → URL Configuration: später die feste HTTPS-Preview-Origin als Site URL und nur benötigte Callback-URLs erlauben. Keine Wildcard für sämtliche vercel.app-Projekte. Wechselnde Preview-URLs brauchen gezielte Pflege; für wiederkehrende Tests stabile Branch-URL bevorzugen.
7. Authentication → Providers: Email-Verhalten prüfen; Bestätigungsmails im Test durchlaufen, Bestätigung nicht als Workaround global abschalten.

**Noch kein vollständiger Cloud-Sync nach Projektanlage:** Das Basisschema plus RLS-Migration muss gegen das echte leere Staging-Projekt geprüft werden. Auth.users ist nicht automatisch dasselbe wie public.users; derzeit fehlt im Basisschema ein nachgewiesener automatischer Profil-Provisioning-Trigger. Der Übungskatalog muss mit stabilen passenden IDs serverseitig verfügbar sein. Sonst können Login funktionieren, aber Profil-Pull/FKs/Sync scheitern. Keine erfolgreichen End-to-End-Tests behaupten.

SQL zur Review vorbereiten, ohne es auszuführen:

```powershell
Get-Content docs/schema.sql, supabase/migrations/202609190001_rls_reference_ownership.sql |
  Set-Content -Encoding utf8 output/staging-schema-review.sql
notepad output/staging-schema-review.sql
```

Nicht blind in Production oder eine bereits befüllte Datenbank kopieren. Staging-Projekt-ID, leeren Zustand, Rollen/Grants und Provisioning/Seed-Vertrag zunächst mit dem nächsten Backendblock abnehmen. Das lokale Bootstrap-Skript mit künstlichem auth.users gehört **niemals** in Supabase.

## 15. Login/Logout und Accountwechsel – erst auf HTTPS-Staging

Zwei eigene Testkonten A/B mit erfundenen Profil-/Workoutdaten verwenden. Keine echten Patientendaten, keine fremden Konten.

1. A registrieren, Bestätigungsmail öffnen, anmelden.
2. Seite neu laden, Safari schließen/öffnen: Session und A-Daten prüfen.
3. A abmelden: geschützte Ansicht muss verschwinden; nach Reload kein wiederhergestelltes A-Login.
4. B anmelden: keine A-Trainings/Messungen/Coachinhalte sichtbar.
5. Wieder A anmelden: A-Daten wieder vorhanden.
6. Falsches Passwort testen: sichtbarer Fehler, kein falscher Login-Erfolg.
7. Netzwerkverlust: keine Fake-Sync-Bestätigung; nach Rückkehr erneuter Versuch.

Abgelaufene/ungültige Sessions automatisiert prüfen; manuelle Tokenmanipulation im produktiven Browser ist keine Nicht-Dev-Aufgabe. Passwort/Token nie in Screenshots/Chat posten. Fehlende public.users-Zeile als Backendfehler melden, nicht Browserdaten löschen.

## 16. Cloud-Sync testen – nach bestätigtem Staging-Schema/Seed

1. A online anmelden und Ausgangsdaten prüfen.
2. App geladen lassen, Netzwerk trennen; Testtraining und Messung anlegen.
3. Netzwerk einschalten, Sync-Indikator antippen.
4. Soll: Warteschlange wird nach Erfolg leer; bei Fehler bleibt sie erhalten.
5. Supabase Table Editor im **Staging-Projekt**: passende eigene Session, session_exercises/exercise_sets und body_metrics ansehen. IDs/Anzahl/Werte vergleichen.
6. Zweites Gerät zunächst nur lesend mit A verwenden. Keine gleichzeitigen Änderungen als bereits gelösten Multi-Device-Test ausgeben.
7. Test mit B wiederholen; B darf A-Daten nicht sehen. Ein Admin-Table-Editor umgeht RLS und beweist keine Endnutzerberechtigung: hierfür echte A/B/Anonymous-API-Tests erforderlich.

Serverseitige Atomizität, Idempotenz, Revisionen/Tombstones und Konflikte bleiben S4-Gates. Ein erfolgreicher einzelner Upload ist kein Beweis dafür.

## 17. Coach und Fehler ohne Providerkosten prüfen

```powershell
pnpm test:api
pnpm coach:check
```

Der erste Befehl verwendet Tests/Mocks. Der zweite kann fehlende OPENROUTER_API_KEY/MODEL melden; das ist aktuell erwartet. Achtung: coach:check kann trotz Fehlkonfigurationsmeldung Exitcode 0 liefern. Inhalt lesen, nicht allein den Exitcode.

Auf einer später freigegebenen öffentlichen Preview ohne Login:

```powershell
$previewUrl = 'https://<ACTUAL_PREVIEW_HOST>'
curl.exe -i -X POST "$previewUrl/api/coach-chat" -H "Content-Type: application/json" --data-raw '{}'
```

Erwartet vom App-Handler 401; vorgeschaltete Deployment Protection kann stattdessen ihre Anmeldeseite liefern. Eine angemeldete Anfrage ohne Providerkonfiguration ergibt 503 und eine ehrliche Fehlermeldung. Im statischen WLAN-Server sind APIs generell aus; POST liefert 405. Kein Providerkey nötig. Reale AI-Antworten, Pro-Entitlements, DE/EN-Safety und Kostenkontrollen bleiben separat abzunehmen.

## 18. Lokale echte RLS-Prüfung auf diesem Desktop

Nur die vorbereitete lokale Datenbank verwenden, niemals Connection-String/Passwort von Production einsetzen. Kein Systemdienst und kein Docker nötig. In PowerShell im Repository:

```powershell
$pgBin = Join-Path $PWD 'output/security-tools/postgresql-17.11-3/pgsql/bin'
& "$pgBin/pg_ctl.exe" -D output/rls-postgres-data status
```

Wenn bereits ein Server läuft, dessen Herkunft prüfen und keinen zweiten starten. Wenn `no server running`:

```powershell
& "$pgBin/pg_ctl.exe" -D output/rls-postgres-data -l output/rls-manual.log -o '-h 127.0.0.1 -p 55432' -w start
```

Nur bei erfolgreichem Start fortsetzen:

```powershell
try {
  $env:PGPASSWORD = [IO.File]::ReadAllText("$PWD/output/rls-postgres-password")
  $env:PGPORT = '55432'
  $env:PGUSER = 'evaro_test_admin'
  & 'C:/Program Files/Git/bin/bash.exe' -c 'export PATH="/usr/bin:/mingw64/bin:/c/Users/skwar/Desktop/TrainingsAppGPT/output/security-tools/postgresql-17.11-3/pgsql/bin:$PATH"; bash scripts/security/run-rls-tests.sh'
  if ($LASTEXITCODE -ne 0) { throw 'RLS-Test fehlgeschlagen; Ausgabe prüfen.' }
} finally {
  Remove-Item Env:PGPASSWORD -ErrorAction SilentlyContinue
  & "$pgBin/pg_ctl.exe" -D output/rls-postgres-data -m fast -w stop
}
```

Erwartet: Baseline-Lücke reproduziert; zweimal 304 Assertions (normale und absichtlich großzügige Policies); Rollback bestätigt; Preflight lehnt inkonsistente Daten ab und erhält sie. Neue lokale Testdatenbanken werden angelegt, keine bestehende DB gelöscht. Das ist echte PostgreSQL-RLS, aber kein Supabase JWT-/PostgREST-Test.

## 19. Was Safari nicht beweisen kann

| Funktion | Aussagekraft |
|---|---|
| Navigation, Formulare, Layout, History-/Plan-/Coach-UI, DE/EN | WEB_TESTABLE; echtes iPhone trotzdem selbst prüfen |
| Auth/Logout/Accountwechsel/Cloudfehler | PARTIALLY_WEB_TESTABLE, nur nach HTTPS-Staging-Einrichtung |
| Offline-Persistenz, Audio/Bildauswahl, Safari-Lifecycle | PARTIALLY_WEB_TESTABLE |
| SecureStore/Keychain, native SQLite-Atomizität | NATIVE_REQUIRED + PHYSICAL_DEVICE_REQUIRED |
| App-Kill, Hintergrund, OS-Backup/Restore, native Permissions/Haptik | NATIVE_REQUIRED + PHYSICAL_DEVICE_REQUIRED |
| Push, StoreKit/RevenueCat, native Deep Links/OTA | NATIVE_REQUIRED; Billing weiterhin PREPARED |
| EAS-signierte iPhone-Builds/TestFlight in diesem Windows-Workflow | APPLE_DEVELOPER_REQUIRED |

Kein SDK-Upgrade nur für Expo Go. Später Apple-Mitgliedschaft → EAS-Credentials bewusst zuordnen → Development/Preview-Build → iPhone-Abnahme → kontrolliertes TestFlight → Store. Die Web-/Staging-/Backend-Tests bleiben dabei bestehen. Bei Session-Upgrades gleiche bestehende App-ID und kompatible Signierung verwenden; separate Preview-ID beweist diese Migration nicht.

## 20. Fehlerdiagnose und Rückmeldung

| Symptom | Prüfen / nächster Schritt |
|---|---|
| pnpm fehlt | Abschnitt 4 in genau diesem PowerShell-Fenster ausführen |
| iPhone erreicht URL nicht | Beide Geräte im gleichen WLAN, PC wach, richtige IPv4, Port 8097, Server läuft; Gast-WLAN/Client-Isolation prüfen |
| Port belegt | Anderen eigenen Preview-Prozess mit Strg+C stoppen; keinen unbekannten Prozess beenden |
| Browser zeigt alten Stand | Server verwendet letzten Export: `pnpm build` erneut, danach Seite neu laden; nicht „Websitedaten löschen“ |
| Daten fehlen unter neuer URL | Host/Port, privates Surfen und Konto prüfen; Browser-Originwechsel nicht mit Datenmigration verwechseln |
| Login nicht verfügbar | WLAN-Gasttest hat bewusst kein Auth; für HTTPS Staging-Clientwerte und neuen Build prüfen |
| Sync scheitert nach Login | public.users/Übungs-Seed/RLS/Grants prüfen; Queue und Originaldaten behalten |
| Coach 401 | Anmeldung oder vorgeschaltete Preview-Authentifizierung fehlt |
| Coach 503 / statisch 405 | Ohne Provider/API in diesem Modus erwartet; kein Schlüssel im Client nachrüsten |
| Safari Offline-Reload scheitert | Kein Service Worker; bekannte Grenze, keine native Offline-Abnahme |
| Audit rot | Bekannte Security-Befunde bearbeiten, Gate nicht deaktivieren |

Für Feedback: Commit, URL ohne Tokens, Gerät/iOS, Konto nur A/B, Schritte, Erwartung, tatsächliches Ergebnis. Screenshots vorher von personenbezogenen Daten bereinigen. Keine `.env`-, Session-, Auth- oder Coach-Rohdaten hochladen.

## Quellen und aktueller Reviewpunkt

- [Vercel Git-/Preview-Verhalten](https://vercel.com/docs/git)
- [Vercel Hobby-Nutzungsgrenzen](https://vercel.com/docs/plans/hobby)
- [Vercel Build-Konfiguration](https://vercel.com/docs/builds/configure-a-build)
- [Vercel Deployment Checks](https://vercel.com/docs/deployment-checks)
- [Supabase Free-Projekte](https://supabase.com/docs/guides/platform/billing-faq)
- [Supabase Umgebungen](https://supabase.com/docs/guides/deployment/managing-environments)
- [Expo interne Builds](https://docs.expo.dev/build/internal-distribution/)

Aktuelle Messwerte/Commits und nicht erreichte Gates stehen in EXECUTION_STATUS.md und P0_READINESS_MATRIX.md. Diese Anleitung ist keine Production- oder vollständige Native-Freigabe. Der erste sichere kostenlose Schritt ist der lokale Gast-/UI-Test; eine echte HTTPS-Preview folgt erst mit Projektzugang und erfüllten Security-Gates.
