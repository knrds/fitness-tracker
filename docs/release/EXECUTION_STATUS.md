# EVARO (knrds/fitness-tracker) – Baseline Execution Status

**Stand:** 15. September 2026  
**Rolle:** Supporting Mobile/Backend Release Preparation Agent (Gemini)  
**Lead Architect / Next Agent:** ChatGPT-Astra  
**Pre-Cleanup Safepoint:** `a9043bd` (Branch: `main`, Tests: PASS)  
**Branch:** `main`  
**Working Tree:** Sauber  

---

## 1. Baseline Repository Audit

### 1.1 Git- & Repository-Status
- **Branch:** `main` (vollständig getestet und verifiziert)
- **Monorepo-Struktur:**
  - `apps/mobile`: Expo SDK 54 / React Native 0.81.5 App
  - `packages/domain`: React-freie Fach- und Berechnungslogik (Vitest)
  - `packages/ui`: Shared EVARO Design-System & Primitives
  - `api`: Node.js Coach API Backend (CommonJS)
  - `evaro_release_execution_pack`: Umbenanntes und konsolidiertes Release-Paket

### 1.2 Entwicklungs- und Build-Kommandos
| Kommando | Beschreibung | Status / Resultat | Relevante Dateien |
|---|---|---|---|
| `pnpm install` | Installation aller Workspace-Dependencies | PASS (Lockfile synchron, Node >=24, pnpm 11.5.0) | `package.json`, `pnpm-lock.yaml` |
| `pnpm -r typecheck` | TypeScript-Prüfung über alle Pakete | **PASS (0 Fehler)** | `apps/mobile`, `packages/domain`, `packages/ui` |
| `pnpm -r lint` | ESLint über alle Pakete | **PASS (0 Fehler / 0 Warnings)** | `.eslintrc.js` |
| `pnpm test` | Gesamte automatisierte Testsuite | **PASS (326 Tests grün)** | 57 Domain (Vitest), 251 Mobile (Jest, 52 Suites), 18 Coach API (`node:test`) |
| `pnpm verify` | Zentrales Quality Gate (Typecheck + Lint + Test) | **PASS (0 Fehler)** | `package.json`, `.github/workflows/ci.yml` |
| `pnpm coach:check` | OpenRouter Preflight-Check | **PASS (Modell & Key bestätigt)** | `api/provider-check.cjs`, `.env.coach.local` |
| `pnpm dev` | Lokaler Web-Entwicklungsserver | Funktional auf Port 8081 | `apps/mobile/scripts/web-dev-preview.cjs` |
| `pnpm coach:local` | Lokaler Coach-Proxy-Server | Funktional auf Port 8096 (127.0.0.1) | `api/local-server.cjs` |
| `pnpm dev-client` | Start mit Expo Dev Client (LAN) | Vorbereitet | `apps/mobile/scripts/expo-start.cjs` |
| `eas build` | Cloud-Builds für iOS / Android | Vorbereitet in `eas.json`, aber **noch nicht ausgeführt** (Apple Dev Membership / Credentials fehlen) | `apps/mobile/eas.json` |

---

## 2. Technische Subsysteme & Audit-Befunde

### 2.1 Expo / React Native / EAS
- **Expo SDK:** `~54.0.37`
- **React Native:** `0.81.5`
- **React:** `19.1.0`
- **New Architecture:** `newArchEnabled: true` in `app.json`
- **Display Name (`app.json`):** `"EVARO"` (Aktualisiert; Display-Branding konsistent)
- **Slug (`app.json`):** `"fitness-tracker"` (Legacy-Identifier, absichtlich erhalten)
- **Scheme (`app.json`):** `"fitness-tracker"` (Legacy-Identifier, absichtlich erhalten)
- **iOS Bundle Identifier:** `com.fitnesstracker.app` (Varianten: `.development`, `.preview` – unberührt für Astra)
- **Android Package Name:** `com.fitnesstracker.app` (Varianten: `.development`, `.preview` – unberührt für Astra)
- **EAS Profile:** `development` (devClient, internal), `preview` (internal APK), `production` (AAB / iOS Store)
- **EAS CLI:** `>= 16.0.0`, Node 24.13.0 / pnpm 11.5.0 gepinnt.

### 2.2 EVARO Branding Audit (Fundstellen & Status)
Die App heißt offiziell **EVARO** (Premium: **EVARO Pro**).
Im Code und in der Dokumentation wurden alle sichtbaren Alt-Namen bereinigt:
1. **Sichtbare UI-Texte & Colorways (Vollständig erledigt durch Gemini):**
   - `apps/mobile/app.json`: Display-Name `"name": "EVARO"`.
   - `packages/ui/src/theme.ts`: `Volt Verde` -> `EVARO Verde`, `Volt Ember` -> `EVARO Ember`.
   - `apps/mobile/src/utils/rewards.ts`: Display-Namen `EVARO Verde`, `EVARO Ember`.
   - `apps/mobile/src/components/BattlePassModal.tsx`: `EVARO SEASON 1: ASCEND`, `EVARO Verde`, `EVARO Ember`, `EVARO Master`.
   - `apps/mobile/src/utils/level.ts`: Rank 10 Titel auf `EVARO Master`.
   - `apps/mobile/src/components/LevelProgress.tsx`: Header auf `Max Rank ${rankInfo.rank} (EVARO Master) erreicht`.
   - `apps/mobile/src/components/CoachComposer.tsx`: Chip-Text auf `EVARO Coach`.
   - `api/coach-chat.js`: System-Prompt-Persona `EVARO Coach` und Request-Header `X-OpenRouter-Title: EVARO`.
   - Share-Strings in `workouts.tsx`, `programs.tsx`, `history/[id].tsx`: Vereinheitlicht auf EVARO.
   - Profile-Export: `EVARO Backup`.
   - Release Pack Verzeichnis: umbenannt auf `evaro_release_execution_pack/`.
2. **Technisch kritische Identifier (NICHT eigenständig geändert – für ASTRA dokumentiert):**
   - `apps/mobile/src/data/documentDatabase.ts`: `key === 'volt-sync-store'` (SQLite-Persistenz)
   - `apps/mobile/src/stores/coachStore.ts`: `name: 'volt-coach-store'` (Zustand-Persistenz)
   - Bundle-ID `com.fitnesstracker.app` (EAS/App Store Connect)
   - Slug & Scheme `fitness-tracker` (Deep-Linking)
   - Assets: `apps/mobile/assets/volt-emblem.png` (wird ersetzt sobald neues Logo vorliegt)

### 2.3 Persistence / Lokale SQLite
- **SQLite Engine:** `expo-sqlite` (`openDatabaseSync('training.sqlite')`)
- **Schema-Version:** `user_version = 2` (mit WAL-Mode, `synchronous = FULL`, `foreign_keys = ON`)
- **Tabellenstruktur:**
  - `state_documents (partition, key, value)`
  - `legacy_imports (partition, key, raw, imported_at)`
  - `normalization_backups (partition, key, raw)`
  - `workout_sessions (partition, collection, id, position, data)`
  - `session_exercises (partition, collection, session_id, id, position, data)`
  - `exercise_sets (partition, collection, session_id, exercise_id, id, position, data)`
  - `sync_operations (partition, collection, id, position, data)` (Outbox Queue)
- **Transaktionssicherheit:** Atomarer Commit für Workout-Abschluss (History, Queue, XP, Koffein, Status) mit Rollback.
- **Offline-Fähigkeit:** 100 % lokal ohne Netzwerk lauffähig.
- **Offene Punkte (ASTRA):** Keine SQLCipher-Verschlüsselung; JS-Projektionen großer Verläufe noch nicht paginiert.

### 2.4 Supabase / Cloud / Auth
- **Client:** `@supabase/supabase-js` (`apps/mobile/src/utils/supabase.ts`)
- **Session-Speicher:** MMKV (`supabase-auth-storage`), Fallback AsyncStorage. **Sicherheitsbefund:** MMKV ist unverschlüsselt (keine Bindung an iOS Keychain / Android Keystore).
- **Auth Flows:** Email/Password (Login, Register mit Email-Verifizierung, Password-Reset).
- **Cloud-Schema:** `docs/schema.sql` (409 Zeilen PostgreSQL mit RLS-Entwürfen).
- **Status:** RLS-Policies sind in `docs/schema.sql` definiert, aber Cross-Account-Negativtests wurden im Repo nicht identifiziert. Live-Projekt-Deployment steht aus (`PARTIAL` / `ASTRA_REVIEW_REQUIRED`).

### 2.5 AI Coach Backend
- **Architektur:** Node.js Backend (`api/coach-chat.js`).
- **Secret-Handling:** Sauber – keine Provider-Keys im Client (`apps/mobile` enthält kein `OPENROUTER_API_KEY`).
- **Modelle:**
  - Plan-Modus: `openai/gpt-5.6-luna`
  - Fast-Modus: `deepseek/deepseek-v4-flash-0731`
  - Vision: `google/gemini-2.5-flash`
  - Transkription: `openai/whisper-large-v3-turbo`
- **Quellenvalidierung:** Automatische PubMed / Europe PMC Abstract-Prüfung bei Hypertrophie- und Planfragen.
- **Laufzeit-Status:** Läuft aktuell als lokaler Loopback-Server (`127.0.0.1:8096`). Für echte native iPhones fehlt ein öffentliches HTTPS-Deployment.
- **Rate-Limiting:** Nur In-Memory (10 Req/Min im Prozess); kein verteiltes Redis/KV-Limit oder serverseitiger Entitlement-Check.

### 2.6 Subscriptions / Monetarisierung
- **Status:** `NOT_STARTED`
- Weder RevenueCat (`react-native-purchases`) noch StoreKit 2 oder Google Play Billing sind installiert.
- Technische Bestandsaufnahme abgeschlossen: `docs/release/SUBSCRIPTION_INTEGRATION_MAP.md`.
- Platzhalter "Abonnement verwalten" im Profil-UI vorbereitet.

### 2.7 Push Notifications
- **Status:** `NOT_STARTED`
- `expo-notifications` ist nicht installiert.
- Weder lokale Timer-Benachrichtigungen noch Remote Push vorhanden.

### 2.8 Haptik & Audio
- **Haptik:** `expo-haptics` implementiert und verifiziert (`triggerHaptic`).
- **Audio:** Web Audio API Fallback (`window.AudioContext`) in `apps/mobile/src/utils/timerAudio.ts` schlägt in React Native Hermes fehl.
- Bestandsaufnahme & Migrationsplan auf `expo-av` dokumentiert in `docs/release/AUDIO_HAPTICS_AUDIT.md`.

### 2.9 Privacy & Legal
- **Rechtstexte:** Platzhalter für Impressum, Datenschutzerklärung und Nutzungsbedingungen in `apps/mobile/app/profile.tsx` und Translations angelegt.
- **Account Deletion:** Lokale Datenlöschung vorhanden; kaskadierende Supabase Cloud-Löschung gemäß Apple Guideline 5.1.1(v) steht noch aus (`docs/release/ACCOUNT_DATA_MAP.md`).
- **Art. 9 DSGVO:** Gesundheitsdaten-Einwilligung erfordert noch finale Formulierung vor Registrierungs-Aktivierung.

### 2.10 Exercise Asset Lizenzierung
- **Inventar:** 873 geladene Übungen, 1.492 Remote-GIFs auf `static.exercisedb.dev`.
- **Status:** `BLOCKED` – Unlizenzierte Remote-Bilder müssen vor Store-Release ersetzt oder lizenziert werden (`docs/release/EXERCISE_ASSET_INVENTORY.md`).

---

## 3. P0-Gates Master-Übersicht

| Gate-ID | Prio | Subsystem | Beschreibung | Status | Evidenz / Befund |
|---|---|---|---|---|---|
| 01 | P0 | Identity | iOS Deployment Target & Capabilities | `PASS` | `app.json`, `Podfile.properties.json` |
| 02 | P0 | Identity | Android Min/Target SDK | `PASS` | `app.json` (SDK 35, Min 24) |
| 03 | P0 | Identity | Bundle ID / Package / Scheme / Brand final | `PARTIAL` | Name auf `EVARO` aktualisiert; Bundle-ID bleibt `com.fitnesstracker.app` |
| 04 | P0 | Build | EAS Build Pipeline & Secrets | `USER_ACTION_REQUIRED` | `eas.json` gepflegt; Account/Credentials erforderlich |
| 05 | P0 | Security | SQLite WAL-Mode & Integrität | `PASS` | `documentDatabase.ts:25` (WAL, FULL, foreign keys ON) |
| 06 | P0 | Security | Secure Token Storage | `FAIL` | MMKV unverschlüsselt; Migration auf SecureStore ausstehend |
| 07 | P0 | Security | Cloud RLS Policies | `PARTIAL` | `docs/schema.sql` vorhanden, Deployment/Tests ausstehend |
| 08 | P0 | Security | Hardened Session/Auth Lifecycle | `PASS` | Supabase Session Listener, Auto-Refresh aktiv |
| 09 | P0 | Security | Account Deletion (Apple 5.1.1(v)) | `FAIL` | Nur lokaler Reset; serverseitige Löschung fehlt (`ACCOUNT_DATA_MAP.md`) |
| 10 | P0 | Backend | HTTPS Coach Endpoint | `FAIL` | Nur lokaler Node-Server (`127.0.0.1:8096`) |
| 11 | P0 | Backend | Serverseitige Session-Validierung | `PASS` | `api/coach-chat.js:117` prüft Supabase Auth Token |
| 12 | P0 | Backend | Distributed Rate Limiting | `FAIL` | In-Memory Map (10 req/min); kein Redis/KV-Cluster |
| 13 | P0 | Backend | AI Usage Ledger & Cost Guard | `FAIL` | Keine serverseitige Token-/Kosten-Persistenz |
| 14 | P0 | Backend | Server-side Entitlement Gate | `FAIL` | Backend prüft kein aktives EVARO Pro Abo |
| 15 | P0 | Legal | Vollständiges Impressum | `PARTIAL` | UI-Link & Translation vorhanden; echte Daten ausstehend |
| 16 | P0 | Legal | Datenschutzerklärung & DSGVO | `PARTIAL` | UI-Link & Translation vorhanden; echtes Dokument ausstehend |
| 17 | P0 | Legal | Art. 9 DSGVO Gesundheitsdaten-Consent | `FAIL` | Checkbox vor Register fehlt noch |
| 18 | P0 | Legal | EULA / Nutzungsbedingungen | `PARTIAL` | UI-Link vorhanden; Text ausstehend |
| 19 | P0 | Legal | Exercise Asset Lizenzfreigabe | `BLOCKED` | 1.492 Fremd-GIFs auf `static.exercisedb.dev` (`EXERCISE_ASSET_INVENTORY.md`) |
| 20 | P0 | Monetarisierung | Produktmodell Free vs EVARO Pro | `PASS` | Matrix finalisiert in `SUBSCRIPTION_INTEGRATION_MAP.md` |
| 21 | P0 | Monetarisierung | Store-Produkte (Monat/Jahr) | `USER_ACTION_REQUIRED` | In App Store Connect / Play Console anzulegen |
| 22 | P0 | Monetarisierung | RevenueCat SDK Integration | `FAIL` | SDK nicht installiert; Architektur vorbereitet |
| 23 | P0 | Monetarisierung | Serverseitige Entitlement-Spiegelung | `FAIL` | Webhook-Handler noch nicht implementiert |
| 24 | P0 | Monetarisierung | Restore Purchases Flow | `PARTIAL` | UI-Platzhalter vorhanden; StoreKit-Aufruf fehlt |
| 25 | P0 | Onboarding | Versionierte Onboarding State Machine | `PASS` | `apps/mobile/app/onboarding.tsx` funktional |
| 26 | P0 | Onboarding | High-Converting Paywall | `FAIL` | Paywall-Screen nach Onboarding fehlt |
| 27 | P0 | Audio | Native Timer Audio | `FAIL` | Web Audio bricht auf nativem Gerät ab (`AUDIO_HAPTICS_AUDIT.md`) |
| 28 | P0 | Store | App Store Icons & Splash Screens | `PASS` | Generierte Assets vorhanden |
| 29 | P0 | Store | Store Screenshots | `USER_ACTION_REQUIRED` | Physische Screenshots nach Paywall-Einbau |
| 30 | P0 | Store | Apple Review Demo Account | `USER_ACTION_REQUIRED` | Testaccount in Supabase anzulegen |
| 31 | P0 | Store | App Store Privacy Nutrition Labels | `PARTIAL` | Erfasst in `ACCOUNT_DATA_MAP.md` |

---

## 4. Aufgabenstatus & Übergabe

### DURCH GEMINI ERLEDIGT (DONE_BY_GEMINI)
1. [x] **EVARO Branding Bereinigung:** Repositoryweites Ersetzen sichtbarer "Volt"-Strings durch "EVARO" in UI, Colorways (`EVARO Verde`, `EVARO Ember`), Gamification (`EVARO Master`, `EVARO Season 1: Ascend`), Share-Signaturen und `app.json`.
2. [x] **Release-Pack Normalisierung:** Verzeichnis von `volt_release_execution_pack/` zu `evaro_release_execution_pack/` umbenannt und alle Unterlagen auf EVARO angepasst.
3. [x] **Account Data Map:** Vollständige Erfassung aller Datentypen für Export & Löschung (`docs/release/ACCOUNT_DATA_MAP.md`).
4. [x] **Exercise Asset Inventory:** Analyse aller 1.492 GIF-URLs und Klärung von Lizenzrisiken (`docs/release/EXERCISE_ASSET_INVENTORY.md`).
5. [x] **Audio/Haptics Audit:** Nachweis des Web-Audio-Problems und Ausarbeitung des Migrationspfads auf `expo-av` (`docs/release/AUDIO_HAPTICS_AUDIT.md`).
6. [x] **Subscription Integration Map:** Architektur und Feature-Matrix für EVARO Pro (`docs/release/SUBSCRIPTION_INTEGRATION_MAP.md`).
7. [x] **Legal UI-Verdrahtung:** Neutrale Platzhalter für Impressum, Datenschutz, AGB und Support in `profile.tsx`.
8. [x] **Deutsche Übersetzung & i18n-Hardening:** Bekannter Fehler bei zu wenigen Körperdaten behoben; Übungsdetails (`exercise/[id].tsx`) und Supersatz-Alerts vollständig lokalisiert; Auth-Namespace (`login`, `register`) modularisiert; Coach- und Workout-Strings lokalisiert; rekursiver 100%-Paritätstest in `i18n.test.ts` implementiert.
9. [x] **Zentraler Haptik-Wrapper & Audio-Adapter:** `hapticFeedback` (`selection`, `impact`, `notification`) und `audioAdapter` mit 6 Unit-Tests (`haptics.test.ts`) implementiert; Mute/Haptics-Toggles im User-Profile verankert; Web-Chime bleibt unberührt.
10. [x] **Sichere Environment-Validierung:** `apps/mobile/src/utils/envValidation.ts` mit 4 Unit-Tests (`envValidation.test.ts`) implementiert; prüft Cloud-Status ohne Secret-Leaks.
11. [x] **CI & Quality Gates:** Zentrales `pnpm verify` Skript eingerichtet; GitHub Actions Workflow (`ci.yml`) mit Web-Bundle-Build-Export abgesichert.
12. [x] **Accessibility & Settings Hardening:** Workout-Session-Buttons mit dynamischen Screenreader-Labels versehen; App-Version im Profile-UI dynamisch aus App-Metadaten bezogen (`Constants.expoConfig?.version`).
13. [x] **Vollständige Validierung & Bundle-Check:** 326/326 Tests PASS (57 Domain, 251 Mobile in 52 Suites, 18 API), 0 Typecheck-Fehler, 0 Lint-Fehler, Coach-Check PASS, `expo export --platform web` PASS.

### ASTRA_TASKS (Komplexe architektonische & sicherheitskritische Arbeiten)
1. **Exercise DB Bereinigung:** Ersatz oder lizenzierte Bereitstellung der Exercise-Visuals umsetzen.
2. **Production Coach Backend:** Bereitstellung eines öffentlichen HTTPS-Endpunkts, verteiltes Rate-Limiting und serverseitiger Entitlement-Check.
3. **RevenueCat Integration:** `react-native-purchases` einbinden, Entitlements spiegeln und Paywall nach Onboarding einbauen.
4. **Account Deletion RPC:** Supabase Edge Function / RPC für kaskadierende Kontolöschung implementieren.
5. **Secure Token Storage:** Umstellung der Supabase Session auf SecureStore.
6. **Native Audio:** Umstellung von `timerAudio.ts` auf `expo-av`.

### USER_ACTION_REQUIRED (Konrad)
1. **Apple Developer Account / Google Play Console:** Bereitstellung der Zugänge / Team-IDs.
2. **RevenueCat Account & Store Products:** Anlegen der monatlichen und jährlichen Abos.
3. **Exercise-Asset-Entscheidung:** Klären der Lizenzstrategie für die Übungs-GIFs.
4. **Rechtstexte:** Bereitstellung von echtem Impressum, Datenschutzerklärung und EULA.
5. **Hosting & Secrets:** HTTPS-Server für Coach Backend bereitstellen.

---

## 5. Stable Beta Checkpoint

**Version:** `0.1.0-beta.2` (Basis: `0.1.0-beta.1` auf `7d24b85`)  
**Tag:** `v0.1.0-beta.2` (sowie vorhandener Remote-Tag `v0.1.0-beta.1`)  
**Commit:** Final Verification Pass  
**Date:** 15. September 2026  
**Typecheck:** PASS (0 Fehler über alle Pakete)  
**Lint:** PASS (0 Fehler, 0 Warnungen)  
**Tests:** 315 / 315 PASS (100% grün)  
**Coach Check:** PASS (Modell & API-Key bestätigt)  
**Bundle Check:** PASS (`expo export --platform web` fehlerfrei)  
**Physical iOS:** NOT VERIFIED  
**Physical Android:** NOT VERIFIED  
**Status:** `STABLE_BETA_CHECKPOINT`  
