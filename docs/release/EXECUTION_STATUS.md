# EVARO (knrds/fitness-tracker) – Baseline Execution Status

**Stand:** 14. September 2026  
**Rolle:** Supporting Mobile/Backend Release Preparation Agent (Gemini)  
**Lead Architect / Next Agent:** ChatGPT-Astra  
**Aktueller Branch:** `main`  
**Aktueller Commit:** `4aff956` (`fix(mobile): localize plate calculator, save template modal, auth flows, and history details`)  
**Working Tree:** Sauber (bis auf `volt_release_execution_pack/`)

---

## 1. Baseline Repository Audit

### 1.1 Git- & Repository-Status
- **Branch:** `main` (synchronisiert mit `origin/main`)
- **Lokale Branches:** `main`, `feat/ascendapi-exercisedb`
- **Remote Branches:** `origin/main`, `origin/feat/ascendapi-exercisedb`
- **Working Tree:** Sauber, uncommitted files: nur `volt_release_execution_pack/`
- **Monorepo-Struktur:**
  - `apps/mobile`: Expo SDK 54 / React Native 0.81.5 App
  - `packages/domain`: React-freie Fach- und Berechnungslogik (Vitest)
  - `packages/ui`: Shared Volt/EVARO Design-System & Primitives
  - `api`: Node.js Coach API Backend (CommonJS)

### 1.2 Entwicklungs- und Build-Kommandos
| Kommando | Beschreibung | Status / Resultat | Relevante Dateien |
|---|---|---|---|
| `pnpm install` | Installation aller Workspace-Dependencies | PASS (Lockfile synchron, Node >=24, pnpm 11.5.0) | `package.json`, `pnpm-lock.yaml` |
| `pnpm -r typecheck` | TypeScript-Prüfung über alle Pakete | **PASS (0 Fehler)** | `apps/mobile`, `packages/domain`, `packages/ui` |
| `pnpm -r lint` | ESLint über alle Pakete | **PASS (0 Fehler / 0 Warnings)** | `.eslintrc.js` |
| `pnpm test` | Gesamte automatisierte Testsuite | **PASS (315 Tests grün)** | 57 Domain (Vitest), 240 Mobile (Jest, 50 Suites), 18 Coach API (`node:test`) |
| `pnpm coach:check` | OpenRouter Preflight-Check | **PASS (Modell & Key bestätigt)** | `api/provider-check.cjs`, `.env.coach.local` |
| `pnpm dev` | Lokaler Web-Entwicklungsserver | Funktional auf Port 8081 | `apps/mobile/scripts/web-dev-preview.cjs` |
| `pnpm coach:local` | Lokaler Coach-Proxy-Server | Funktional auf Port 8096 (127.0.0.1) | `api/local-server.cjs` |
| `pnpm dev-client` | Start mit Expo Dev Client (LAN) | Vorbereitet | `apps/mobile/scripts/expo-start.cjs` |
| `eas build` | Cloud-Builds für iOS / Android | Vorbereitet in `eas.json`, aber **noch nicht ausgeführt** (Apple Dev Membership fehlt) | `apps/mobile/eas.json` |

---

## 2. Technische Subsysteme & Audit-Befunde

### 2.1 Expo / React Native / EAS
- **Expo SDK:** `~54.0.37`
- **React Native:** `0.81.5`
- **React:** `19.1.0`
- **New Architecture:** `newArchEnabled: true` in `app.json`
- **Display Name (`app.json`):** `"Fitness Tracker"` (Inkonsistent mit Markenname **EVARO**)
- **Slug (`app.json`):** `"fitness-tracker"`
- **Scheme (`app.json`):** `"fitness-tracker"`
- **iOS Bundle Identifier:** `com.fitnesstracker.app` (Varianten: `.development`, `.preview`)
- **Android Package Name:** `com.fitnesstracker.app` (Varianten: `.development`, `.preview`)
- **EAS Profile:** `development` (devClient, internal), `preview` (internal APK), `production` (AAB / iOS Store)
- **EAS CLI:** `>= 16.0.0`, Node 24.13.0 / pnpm 11.5.0 gepinnt.

### 2.2 EVARO Branding Audit (Fundstellen & Status)
Die App heißt offiziell **EVARO** (Premium: **EVARO Pro**).
Im Code und in der Dokumentation finden sich zahlreiche Alt-Namen:
1. **Sichtbare UI-Texte (harmlos, für Gemini-Korrektur geeignet):**
   - `apps/mobile/app/profile.tsx` (Zeile 961): `VOLT Fitness Tracker`
   - `apps/mobile/src/components/AuthHeader.tsx` (Zeile 24): `<Text ...>VOLT</Text>`
   - `apps/mobile/app/auth/verify.tsx` (Zeile 26): `Welcome to Volt.` / `Willkommen bei Volt.`
   - `apps/mobile/src/i18n/translations.ts` (Zeilen 306, 610): `VOLT und die Empfehlungen...` / `VOLT and AI Coach recommendations...`
   - `apps/mobile/src/components/VoltDashboard.tsx`: Dashboard-Komponente und Backdrop tragen internen Prefix `Volt`.
2. **Technisch kritische Identifier (NICHT eigenständig ändern – für ASTRA vormerken):**
   - `app.json`: `"name": "Fitness Tracker"`, `"slug": "fitness-tracker"`
   - `apps/mobile/src/data/documentDatabase.ts`: `key === 'volt-sync-store'`
   - Bundle-ID `com.fitnesstracker.app`
   - Assets: `apps/mobile/assets/volt-emblem.png`

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
- **Laufzeit-Status:** Läuft aktuell nur als lokaler Loopback-Server (`127.0.0.1:8096`). Für echte native iPhones fehlt ein öffentliches HTTPS-Deployment.
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
- **Haptik:** `expo-haptics` ist installiert und in 10 Komponenten aktiv (Workouts, Reorder, Achievements, etc.).
- **Audio:** **Befund:** `timerAudio.ts` nutzt die `Web Audio API` (`AudioContext`). Diese existiert auf nativen iOS/Android-Runtimes nicht. Der Rest-Timer bleibt auf physischen Smartphones ohne Ton. Es sind keine statischen Audio-Dateien im Repository hinterlegt.
- Technische Bestandsaufnahme abgeschlossen: `docs/release/AUDIO_HAPTICS_AUDIT.md`.

### 2.9 Analytics & Crash Monitoring
- **Status:** `NOT_STARTED`
- Kein Sentry, PostHog oder Firebase installiert.
- `@opentelemetry/api` wurde als ungenutzt verifiziert und sauber entfernt (Lockfile bereinigt, 315 Tests grün).

### 2.10 Legal / Privacy
- **Impressum:** UI-Menüeintrag als Platzhalter in `profile.tsx` vorbereitet; finale Angaben ausstehend (`LEGAL_REVIEW_REQUIRED`).
- **Datenschutzerklärung (DSE):** UI-Menüeintrag in `profile.tsx` vorbereitet; finale URL/Inhalt ausstehend (`LEGAL_REVIEW_REQUIRED`).
- **Nutzungsbedingungen / EULA:** UI-Menüeintrag in `profile.tsx` vorbereitet (`LEGAL_REVIEW_REQUIRED`).
- **Art. 9 DSGVO (Gesundheitsdaten):** Keine eigenmächtige Checkbox implementiert; Status als `LEGAL_REVIEW_REQUIRED` / `ASTRA_REVIEW_REQUIRED` dokumentiert.
- **Account-Löschung:** Lokaler Reset via `profileStore.clearAllData()` implementiert. Cloud-Delete-Endpoint (Supabase RPC/Admin) fehlt noch. UI-Eintrag "Account löschen" in `profile.tsx` vorbereitet. Technische Map erstellt: `docs/release/ACCOUNT_DATA_MAP.md`.
- **Datenexport:** JSON-Export (`exportData()`) in `profileStore.ts` vorhanden (`DONE`).

### 2.11 Exercise Database & Asset Provenienz
| Asset / Datensatz | Quelle | Lizenz bekannt? | Kommerziell bestätigt? | Status |
|---|---|---|---|---|
| Übungsdaten (`exercisedb.json`) | `free-exercise-db` | Unklar / Keine Lizenzdatei | Commercial usage rights could not be verified from repository evidence | `BLOCKED pending provenance/license verification` |
| Übungs-GIFs (`exerciseGifs.json`) | `https://static.exercisedb.dev/media/...` | Hotlink auf fremden Server | Commercial usage rights could not be verified from repository evidence | `BLOCKED pending provenance/license verification` |
| Anatomie-Grafiken (`AnatomyFigure.tsx`) | `react-native-body-highlighter` | MIT (Lizenz liegt in `anatomy/LICENSE`) | **JA** | `DONE` |
| Fonts (Manrope, Space Grotesk) | Google Fonts | SIL Open Font License (OFL) | **JA** | `DONE` |
| Icons (Ionicons) | `@expo/vector-icons` | MIT | **JA** | `DONE` |
| Level-Badges | Higgsfield AI | Proprietär generiert (Job im Readme) | Terms ungeprüft | `ASTRA_REVIEW_REQUIRED` |

---

## 3. MASTER_CHECKLIST – Status aller P0-Gates

| # | Prio | Bereich | Gate | Status | Evidence / Begründung |
|---|---|---|---|---|---|
| 01 | P0 | Native | Echter iOS-Build auf physischem Gerät | `NOT_STARTED` / `USER_ACTION_REQUIRED` | Apple Developer Account fehlt; kein EAS-Build gestartet (`IOS_SETUP.md`). |
| 02 | P0 | Native | Echter Android-Build auf physischem Gerät | `NOT_STARTED` | Profil `preview` in `eas.json` konfiguriert, aber noch kein APK-Build erzeugt. |
| 03 | P0 | Identity | Bundle ID / Package / Scheme / Brand final | `PARTIAL` / `USER_ACTION_REQUIRED` | `app.json` hat noch Name `"Fitness Tracker"` und Bundle-ID `com.fitnesstracker.app`. Finaler Name EVARO muss im Decision Log bestätigt werden. |
| 04 | P0 | Security | Keine Provider-/Service-Secrets im Client/Git | `DONE` | `apps/mobile` enthält keine Secrets; `.env.coach.local` ist in `.gitignore`. |
| 05 | P0 | Security | Secure token storage | `PARTIAL` / `ASTRA_REVIEW_REQUIRED` | Supabase Session liegt in plain MMKV (`supabase-auth-storage`), nicht in Keychain/Keystore. |
| 06 | P0 | Security | RLS Cross-Account Tests | `PARTIAL` / `ASTRA_REVIEW_REQUIRED` | RLS-Policies in `docs/schema.sql` definiert, aber Cross-Account-Negativtests im Repo nicht identifiziert. |
| 07 | P0 | Data | Offline/Online ohne Datenverlust | `PARTIAL` | Lokale SQLite Schema 2 mit Outbox läuft offline (240 Tests PASS). Remote-Sync ungetestet. |
| 08 | P0 | Data | Zwei-Geräte-Konflikte ohne Datenverlust | `NOT_STARTED` / `ASTRA_REVIEW_REQUIRED` | Keine Tombstones oder Multi-Device Conflict Resolution im Sync-Worker. |
| 09 | P0 | Data | Account löschen löscht Cloud + Auth + Lokal | `PARTIAL` / `ASTRA_REVIEW_REQUIRED` | Lokaler SQLite-Reset via `clearAllData()` implementiert. Cloud-Delete-Endpoint (Supabase RPC/Admin) fehlt noch (`ACCOUNT_DATA_MAP.md`). |
| 10 | P0 | Data | Vollständiger Datenexport | `DONE` | `exportData()` in `profileStore.ts` exportiert alle Stores in Schema-2-JSON. |
| 11 | P0 | Backend | Production HTTPS Coach endpoint | `NOT_STARTED` / `USER_ACTION_REQUIRED` | Coach läuft nur lokal auf `127.0.0.1:8096`. Deployment auf Render/Fly/Supabase fehlt. |
| 12 | P0 | Backend | Distributed AI rate limits | `NOT_STARTED` / `ASTRA_REVIEW_REQUIRED` | Nur In-Memory-Limiter im Node-Prozess. |
| 13 | P0 | Backend | Global + per-user cost guard | `PARTIAL` / `USER_ACTION_REQUIRED` | 6 Req/Tag Limit im Prototyp vorhanden, aber kein Hard Spending Cap auf Provider-Ebene. |
| 14 | P0 | Backend | Premium entitlement serverseitig | `NOT_STARTED` / `ASTRA_REVIEW_REQUIRED` | Coach prüft noch kein aktives Abonnement (`SUBSCRIPTION_INTEGRATION_MAP.md`). |
| 15 | P0 | AI | Freigegebene Provider/Modelle dokumentiert | `DONE` | `.env.coach.local` und `api/.env.example` dokumentieren Whisper, DeepSeek, GPT-5.6, Gemini. |
| 16 | P0 | AI | AI consent + transparency | `PARTIAL` | Allgemeine Texte vorhanden, aber keine explizite Einwilligung vor dem ersten Chat. |
| 17 | P0 | Licensing | Exercise DB Provenance & Commercial Rights | `BLOCKED` | Commercial usage rights could not be verified from repository evidence (`EXERCISE_ASSET_INVENTORY.md`). |
| 18 | P0 | Licensing | Lizenz-BOM (Bilder, Anatomie, Fonts, Sounds) | `PARTIAL` | Anatomie (MIT) und Fonts (OFL) dokumentiert; statische Sounds fehlen im Repo, GIFs ungeklärt. |
| 19 | P0 | Legal | Privacy Policy live | `NOT_STARTED` / `USER_ACTION_REQUIRED` | Öffentliche Datenschutzerklärung fehlt; UI-Menüeintrag in `profile.tsx` vorbereitet. |
| 20 | P0 | Legal | Impressum live | `NOT_STARTED` / `USER_ACTION_REQUIRED` | § 5 DDG Impressum fehlt in App und Web; UI-Menüeintrag in `profile.tsx` vorbereitet. |
| 21 | P0 | Legal | Terms live | `NOT_STARTED` / `USER_ACTION_REQUIRED` | AGB / EULA fehlt; UI-Menüeintrag in `profile.tsx` vorbereitet. |
| 22 | P0 | Legal | Processor / DPA Register | `NOT_STARTED` / `USER_ACTION_REQUIRED` | AVV mit Supabase und OpenRouter noch nicht gezeichnet. |
| 23 | P0 | Monetization | StoreKit purchase/restore | `NOT_STARTED` / `ASTRA_REVIEW_REQUIRED` | Keine RevenueCat/StoreKit-Integration (`SUBSCRIPTION_INTEGRATION_MAP.md`). |
| 24 | P0 | Monetization | Google Billing purchase/restore | `NOT_STARTED` / `ASTRA_REVIEW_REQUIRED` | Keine Google Play Billing-Integration. |
| 25 | P0 | Monetization | Renewal/cancel/expiry/refund getestet | `NOT_STARTED` / `ASTRA_REVIEW_REQUIRED` | Fehlt komplett. |
| 26 | P0 | Monitoring | Crash/Error/Sync/AI spend Monitoring | `NOT_STARTED` / `ASTRA_REVIEW_REQUIRED` | Kein Sentry/Monitoring integriert. |
| 27 | P0 | Store | Apple Privacy Manifest (`PrivacyInfo.xcprivacy`) | `NOT_STARTED` / `ASTRA_REVIEW_REQUIRED` | Apple Privacy Manifest fehlt. |
| 28 | P0 | Store | Google Data Safety Declaration | `NOT_STARTED` / `USER_ACTION_REQUIRED` | Erklärung noch nicht vorbereitet. |
| 29 | P0 | Store | Reviewer Demo Account | `NOT_STARTED` / `USER_ACTION_REQUIRED` | Testzugang mit Daten für App Review fehlt. |
| 30 | P0 | QA | Migration von Beta-Daten getestet | `PARTIAL` | SQLite v1->v2 unit-getestet, aber keine echte Geräteprüfung. |
| 31 | P0 | QA | Release Candidate P0 Device Matrix | `NOT_STARTED` / `USER_ACTION_REQUIRED` | Physische Gerätetests stehen aus. |

---

## 4. Aufgabenaufteilung (Delta-Plan)

### GEMINI_TASKS (Kleine, risikoarme Vorbereitungsaufgaben)
1. [ ] **EVARO Branding Bereinigung:** Ersetzen von sichtbaren "Volt"-Strings durch "EVARO" in UI-Texten und Translations (`profile.tsx`, `AuthHeader.tsx`, `verify.tsx`, `translations.ts`).
2. [ ] **Legal UI-Verdrahtung vorbereiten:** In `profile.tsx` Platzhalter-Einträge für Impressum, Datenschutzerklärung und Nutzungsbedingungen (EULA) anlegen.
3. [ ] **Art. 9 DSGVO Checkbox-Entwurf:** Einwilligungs-Checkbox für Gesundheitsdaten in `register.tsx` vorbereiten.
4. [ ] **Audio-Bugfix Vorbereitung:** Recherche und Bereitstellung lizenzfreier Chime-Sounds für native Wiedergabe via `expo-av`.
5. [ ] **Ungenutzte Dependency entfernen:** `@opentelemetry/api` aufräumen.
6. [ ] **Dokumentation pflegen:** Laufende Aktualisierung von `EXECUTION_STATUS.md` und `ASTRA_HANDOFF.md`.

### ASTRA_TASKS (Komplexe, architektonische & sicherheitskritische Aufgaben)
1. **WP-01 Native Identity:** Finalisierung von Bundle-ID / App-Name (`app.json`, `eas.json`) und EAS Project Link.
2. **WP-02 Token Security:** Umstellung des Supabase-Session-Speichers von Plain MMKV auf verschlüsselte SecureStore / Keychain-Speicherung.
3. **WP-02 Cloud RLS & Migration:** Bereitstellung und Verifikation von `docs/schema.sql` auf Supabase mit Cross-Account Tests.
4. **WP-02 Account Deletion:** Implementierung der serverseitigen und lokalen Account-Löschung nach Apple Guideline 5.1.1(v).
5. **WP-03 Backend Deployment:** Containerisierung und Deployment von `api/coach-chat.js` mit HTTPS und verteiltes Rate-Limiting.
6. **WP-03 Server-side Entitlement:** Absicherung der Coach-API gegen unberechtigte Nutzung ohne EVARO Pro Abo.
7. **WP-04 Exercise DB Bereinigung:** Entfernung der illegalen `static.exercisedb.dev` GIF-Hotlinks und Umstellung auf legale Vektoren / lizensierte API.
8. **WP-05 Subscriptions:** Integration von RevenueCat (`react-native-purchases`), Entitlement-Mapping (`evaro_pro`), Restore Purchases und Webhooks.
9. **WP-06 Onboarding & Paywall:** Implementierung des mehrstufigen Questionnaires und der High-Converting Paywall mit 7-Tage-Trial.
10. **WP-07 Native Audio & Push:** Native Audiowiedergabe mit `expo-av` und Hintergrund-Timer via `expo-notifications`.
11. **WP-08 Observability:** Sentry-Integration ohne Übertragung von PII/Gesundheitsdaten.

### USER_ACTION_REQUIRED (Manuelle Accounts, Lizenzen & Rechtliches)
1. **Apple Developer Account:** Registrierung (99 $/Jahr), D-U-N-S Nummer (falls Organisation) und Team-ID bereitstellen.
2. **Google Play Console:** Entwicklerkonto anlegen (einmalig 25 $).
3. **Supabase Production:** Neues Cloud-Projekt anlegen und URL / Anon-Key bereitstellen.
4. **Backend-Hosting:** Account bei Render.com / Railway / Hetzner anlegen für HTTPS Coach-API.
5. **OpenRouter Hard Cap:** Monatliches Ausgabenlimit im OpenRouter-Dashboard setzen.
6. **Rechtstexte:** Impressums-Daten (Name, Anschrift, E-Mail), Datenschutzerklärung und AGB bereitstellen / juristisch abnehmen lassen.
7. **Exercise-Lizenz-Entscheidung:** Entscheidung treffen: A) ExerciseDB RapidAPI Pro Lizenz kaufen, B) MuscleWiki API lizenzieren oder C) Reine Vektor-Muskelkarten ohne Fremd-GIFs nutzen.
