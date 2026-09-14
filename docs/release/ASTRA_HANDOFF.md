# EVARO – Astra Handoff Document

**Stand:** 15. September 2026  
**Erstellt von:** Gemini Support Agent (Release Preparation & Baseline Audit)  
**Für:** ChatGPT-Astra (Lead Mobile/Backend Release Architect)  
**Branch:** `gemini/release-preparation`  

---

## 1. Repository Baseline

- **Branch:** `gemini/release-preparation` (streng lokal, kein Push auf `main` oder `origin`)
- **Commit Baseline:** `4d26533` (lokale Commits vor diesem Handoff-Update)
- **Tests:** `pnpm test` -> **315 Tests PASS** (57 Vitest Domain in 8 Files, 240 Jest Mobile in 50 Testsuites, 18 Node API Tests in `api/coach-chat.test.cjs`)
- **Typecheck:** `pnpm -r typecheck` -> **PASS (0 Fehler)**
- **Lint:** `pnpm -r lint` -> **PASS (0 Fehler, 0 Warnungen)**
- **Dependencies:** `@opentelemetry/api` wurde als ungenutzt verifiziert und sauber entfernt; Lockfile aktualisiert.

---

## 2. Gemini Completed (Vorbereitungsarbeiten)

1. **Baseline Audit & Checklisten-Pflege:**
   - Vollständiger Audit des Repositories erstellt (`docs/release/EXECUTION_STATUS.md`).
   - Alle 31 P0-Gates in `volt_release_execution_pack/MASTER_CHECKLIST.md` mit fundierter Evidence und Dokumentenlinks gepflegt.
2. **Branding-Bereinigung (Sichere Texte):**
   - Reste alter Bezeichnungen in sichtbaren UI-Texten und Personas korrigiert ("Volt Coach" -> "EVARO Coach" im Chat-Composer-Chip `CoachComposer.tsx` und Prompt-Persona `api/coach-chat.js`).
   - Vorherige Bereinigungen in `profile.tsx`, `AuthHeader.tsx`, `verify.tsx` und `translations.ts` verifiziert.
3. **Rechtliches UI & neutrale Vorbereitung (`profile.tsx`):**
   - Strukturierte Menüeinträge für Impressum (§ 5 DDG), Datenschutzerklärung, Nutzungsbedingungen / EULA, Support, Abonnement verwalten und Account löschen angelegt.
   - Alle Einträge mit neutralen Platzhalter-Meldungen und `TODO: Final legal content / URL pending.` versehen.
   - **Rechtsintegrität gewahrt:** Keine erfundenen URLs, keine fingierten Firmendaten, keine eigenmächtige Art.-9-DSGVO-Checkbox (dokumentiert als `LEGAL_REVIEW_REQUIRED` / `ASTRA_REVIEW_REQUIRED`).
4. **Erstellung technischer Maps:**
   - `docs/release/ACCOUNT_DATA_MAP.md`: Vollständiges Mapping aller 20 lokalen/serverseitigen Datenspeicher für Account-Löschung und Datenexport.
   - `docs/release/EXERCISE_ASSET_INVENTORY.md`: Detaillierte Lizenz- und Herkunftsanalyse aller 873 Übungen und 1.492 GIF-Hotlinks.
   - `docs/release/AUDIO_HAPTICS_AUDIT.md`: Native Audioproblematik (Web Audio API) und Migrationspfade via `expo-av` analysiert.
   - `docs/release/SUBSCRIPTION_INTEGRATION_MAP.md`: Kandidaten für EVARO Pro, Entitlement-Gates und RevenueCat-Integrationspunkte kartiert.
5. **Dependency-Bereinigung:**
   - `@opentelemetry/api` rückstandsfrei entfernt, Lockfile aktualisiert, 315 Tests grün.
6. **Evidence Quality Pass:**
   - Sämtliche Status-Aussagen auf strikt belegbare Evidence umgestellt (keine Spekulationen als Fakten).

---

## 3. Verified P0 Blockers

### P0-01: Commercial Rights & Asset Provenance (`exerciseGifs.json`)
- **Evidence:** `packages/domain/src/data/raw/exerciseGifs.json` verlinkt 1.492 GIFs via direktem Hotlink auf `https://static.exercisedb.dev/media/...`. Im Repository existiert kein Lizenz- oder Zahlungsnachweis.
- **Files:** `packages/domain/src/data/raw/exerciseGifs.json`, `packages/domain/src/data/mapExercises.ts`, `apps/mobile/src/components/exercises/ExerciseCard.tsx`, `apps/mobile/app/exercise/[id].tsx`.
- **Risk:** `CRITICAL` (Urheberrechtsabmahnung, Ausfall bei CDN-Hotlink-Blockade, App Store Rejection).
- **Recommended Astra Task:** Entkopplung der Hotlinks für den V1 Release; Anzeige hochwertiger Vektor-/Anatomie-Vorschauen oder Anbindung einer offiziell lizenzierten API-Schnittstelle.

### P0-02: Native Silent Rest Timer (Web Audio API)
- **Evidence:** `apps/mobile/src/utils/timerAudio.ts` instanziiert `globalThis.AudioContext`. Auf nativen React-Native-Runtimes (iOS/Android Hermes) ist `AudioContext` nicht vorhanden (`undefined`). Der Timer bleibt auf physischen Mobilgeräten stumm.
- **Files:** `apps/mobile/src/utils/timerAudio.ts`, `apps/mobile/src/components/workout/RestTimer.tsx`.
- **Risk:** `HIGH` (Wesentliches Nutzerfeedback im Gym fehlt; schlechte Store-Reviews).
- **Recommended Astra Task:** Migration auf `expo-av` (`Audio.Sound.createAsync`) mit lokaler Chime-Audiodatei (`.mp3` in `assets/sounds/`) und Audio-Session-Konfiguration für iOS (Silent-Switch-Bypass, Audio-Ducking für Musik).

### P0-03: Fehlendes In-App Subscription System & ungeschütztes Backend
- **Evidence:** Weder RevenueCat (`react-native-purchases`) noch StoreKit sind installiert. `api/coach-chat.js` prüft zwar Auth-Tokens, aber kein bezahltes Abonnement. Jeder registrierte Nutzer kann unlimitiert teure OpenRouter-Modelle aufrufen.
- **Files:** `apps/mobile/package.json`, `api/coach-chat.js`, `apps/mobile/app/profile.tsx`, `apps/mobile/src/components/CoachComposer.tsx`.
- **Risk:** `CRITICAL` (Finanzielles Risiko durch AI-Kosten; fehlende Kommerzialisierung).
- **Recommended Astra Task:** Installation von `react-native-purchases`, Implementierung von Paywall-Screen und serverseitigem Entitlement-Gate in `api/coach-chat.js`.

### P0-04: Vollständige Account-Löschung fehlt (Apple Guideline 5.1.1(v))
- **Evidence:** `apps/mobile/app/profile.tsx` bietet aktuell nur einen lokalen SQLite-Reset (`clearAllData()`). Die Löschung des Cloud-Accounts (`auth.users`, Postgres-Tabellen) existiert serverseitig nicht.
- **Files:** `apps/mobile/app/profile.tsx`, `docs/schema.sql`, Supabase Backend.
- **Risk:** `CRITICAL` (Zwingender Rejection-Grund bei der iOS App Store Prüfung).
- **Recommended Astra Task:** Implementierung eines Supabase Postgres RPCs mit `SECURITY DEFINER` zur Bereinigung aller Daten von `auth.uid()` inkl. Auth-User-Löschung; Aufruf im UI-Löschdialog.

### P0-05: Plain Token Storage in MMKV
- **Evidence:** `apps/mobile/src/utils/supabase.ts:13` speichert Supabase Auth-Tokens in `new MMKV({ id: 'supabase-auth-storage' })` ohne Verschlüsselung/Keychain-Schutz.
- **Files:** `apps/mobile/src/utils/supabase.ts`.
- **Risk:** `HIGH` (Token-Extraktion auf kompromittierten Geräten).
- **Recommended Astra Task:** Umstellung auf `expo-secure-store` oder hardware-unterstütztes verschlüsseltes MMKV.

### P0-06: Coach-API nur lokal – kein HTTPS-Produktionsdeployment
- **Evidence:** Der AI-Coach läuft derzeit als lokaler Node.js-Prozess auf `127.0.0.1:8096`. Native iOS-Builds können via ATS keine ungesicherten lokalen HTTP-Verbindungen nutzen.
- **Files:** `api/coach-chat.js`, `apps/mobile/src/utils/coachApi.ts`.
- **Risk:** `CRITICAL` für den nativen Betrieb des AI Coaches.
- **Recommended Astra Task:** Bereitstellung eines Dockerfiles / Cloud-Deployments (Render, Fly.io oder Supabase Edge Function) mit öffentlich erreichbarer HTTPS-URL.

### P0-07: Unverifizierte Supabase RLS & Cross-Account Tests
- **Evidence:** `docs/schema.sql` enthält 409 Zeilen PostgreSQL mit RLS-Policies, es existieren jedoch keine automatisierten Cross-Account-Tests im Repository, die sicherstellen, dass Nutzer A niemals Daten von Nutzer B lesen/schreiben kann.
- **Files:** `docs/schema.sql`.
- **Risk:** `HIGH` (Datenschutzverletzungen bei fehlerhaften RLS-Policies).
- **Recommended Astra Task:** Deployment auf Supabase Test-Projekt und automatisierte Negative-Tests für RLS.

---

## 4. Prepared Technical Maps

Alle Details und Bestandsaufnahmen sind in folgenden Dokumenten ausgearbeitet:
- [`ACCOUNT_DATA_MAP.md`](file:///d:/TrainingsAppGPT/docs/release/ACCOUNT_DATA_MAP.md): Vollständige Matrix aller 20 Datenarten, Speicherorte, Delete- und Export-Pfade.
- [`EXERCISE_ASSET_INVENTORY.md`](file:///d:/TrainingsAppGPT/docs/release/EXERCISE_ASSET_INVENTORY.md): Exakte Herkunft, Domains und Lizenzstatus aller Übungen und Medien.
- [`AUDIO_HAPTICS_AUDIT.md`](file:///d:/TrainingsAppGPT/docs/release/AUDIO_HAPTICS_AUDIT.md): Detailanalyse von `timerAudio.ts`, Call Sites, iOS-Risiken und Migrationsoptionen.
- [`SUBSCRIPTION_INTEGRATION_MAP.md`](file:///d:/TrainingsAppGPT/docs/release/SUBSCRIPTION_INTEGRATION_MAP.md): Architektur für EVARO Pro, Entitlements, Paywall und Backend-Gates.

---

## 5. Branding / Identifier Migration

### 5.1 Bereits sicher auf EVARO geändert
- Sichtbare UI-Texte im Profil ("EVARO Pro" Info, Version, About-Text).
- Auth-Header und Verify-Screen ("Willkommen bei EVARO").
- Coach-Composer: Chip "EVARO Coach".
- AI Coach Prompt Persona in `api/coach-chat.js` ("You are EVARO Coach...").
- Lokale Übersetzungsdateien in `apps/mobile/src/i18n/translations.ts`.

### 5.2 Noch vorhandene technische Alt-Identifier
- **Datei:** `apps/mobile/app.json`
  - **Identifier:** `"name": "Fitness Tracker"`, `"slug": "fitness-tracker"`, `"scheme": "fitness-tracker"`, `"bundleIdentifier": "com.fitnesstracker.app"`, `"package": "com.fitnesstracker.app"`
  - **Mögliche Auswirkung:** Änderung betrifft Deep-Linking (OAuth Redirects), EAS Build-Profile und App Store App ID.
  - **Empfehlung:** Erst beim Einrichten des finalen EAS-/StoreKit-Deployments gemeinsam mit Konrad anpassen.
- **Datei:** `apps/mobile/src/data/documentDatabase.ts:32` & `normalizedState.ts:22`
  - **Identifier:** `'volt-sync-store'` (SQLite Dokument-Key)
  - **Mögliche Auswirkung:** Eine Umbenennung führt bei Bestandstestdaten zum Verlust der Sync-Queue.
  - **Empfehlung:** Als internen Datenbank-Key belassen oder versionierte SQLite-Migration bereitstellen.
- **Datei:** `apps/mobile/src/stores/coachStore.ts:280`
  - **Identifier:** `'volt-coach-store'` (Zustand Persist-Key in SQLite)
  - **Mögliche Auswirkung:** Chatverlauf wird bei Änderung zurückgesetzt.
  - **Empfehlung:** Als internen Speicher-Key beibehalten.
- **Datei:** `apps/mobile/src/stores/authStore.ts:138, 153`
  - **Identifier:** `fitness-tracker://`
  - **Mögliche Auswirkung:** Deep-Link für E-Mail-Verifizierung und Passwort-Reset in Supabase Auth.
  - **Empfehlung:** Erst synchron mit den Redirect-URLs im Supabase Dashboard auf `evaro://` umstellen.
- **Datei:** Root `package.json` und Workspace Packages (`@fitness-tracker/*`)
  - **Identifier:** `@fitness-tracker/domain`, `@fitness-tracker/ui`, `@fitness-tracker/mobile`
  - **Mögliche Auswirkung:** Reine Monorepo-Verdrahtung ohne Außenwirkung.
  - **Empfehlung:** Beibehalten, um keine Paketauflösungen zu brechen.

### 5.3 ASTRA_REVIEW_REQUIRED
- **Gamification Ranks & Lore:**
  - `apps/mobile/src/utils/level.ts:44`: Rank 10 Title `'VOLT Master'`.
  - `apps/mobile/src/components/BattlePassModal.tsx:156`: `'VOLT SEASON 1: ASCEND'`.
  - *Frage an Produkt/Astra:* Soll das Gamification-Thema "VOLT" als Lore/Energiebegriff erhalten bleiben, oder soll es in "EVARO Master" / "EVARO Season 1" umbenannt werden?
- **Themes:**
  - `Volt Verde` und `Volt Ember` in `packages/ui/src/theme.ts`. (Können als Farbwelt-Namen beibehalten oder neutralisiert werden).
- **Komponentennamen:**
  - `VoltDashboard.tsx` und `VoltBackdrop.tsx` in `apps/mobile/src/components/`. (Reine interne Codenamen, keine UI-Sichtbarkeit).

---

## 6. Safe Remaining Gemini Tasks

Falls vor Astras Arbeitsbeginn noch Zuarbeit gewünscht wird:
- Pflege von Dokumentationen und Übersetzungen.
- Erstellung statischer Dummy-Komponenten für Modals.
- Vorbereitung lokaler SVG-Assets.

---

## 7. ASTRA_TASKS (Empfohlene Arbeitsreihenfolge)

### Priorität 1: Kritische Native- & Sicherheits-Blocker
1. **P0-02 Native Audio Fix:** Umstellung von `timerAudio.ts` auf `expo-av` mit lokalem Audio-Chime-Asset und iOS-Audiomodus-Konfiguration.
2. **P0-05 Secure Token Storage:** Migration von `supabase-auth-storage` aus plain MMKV in `expo-secure-store`.
3. **P0-04 Account Deletion Backend:** Postgres RPC / Endpoint für vollständige Account-Löschung (Supabase Auth + Datenkaskade) und UI-Verbindung.
4. **P0-01 Asset-Bereinigung:** Entkopplung der unlizenzierten Hotlinks in `exerciseGifs.json`.

### Priorität 2: Monetarisierung & Kostenkontrolle
5. **P0-03 RevenueCat Integration:** Installation von `react-native-purchases`, Definition der Entitlements (`evaro_pro`), Erstellung des Paywall-Screens.
6. **P0-03 Server-Side Gate:** Absicherung von `api/coach-chat.js` gegen unautorisierte Modellaufrufe durch Free-User.

### Priorität 3: Externe Infrastruktur & Store Readiness
7. **P0-06 Coach Production Deployment:** Dockerfile / Hosting für die Coach-API mit HTTPS-Zertifikat.
8. **P0-07 Supabase RLS Testing:** Validierung der Row Level Security auf einer Live-Instanz mit Cross-Account Tests.
9. **P0-27 Apple Privacy Manifest:** Anlegen der `PrivacyInfo.xcprivacy` Datei für iOS.

---

## 8. USER_ACTION_REQUIRED

Folgende Punkte können nicht durch Agenten im Code gelöst werden, sondern erfordern manuelle Schritte von Konrad:

1. **Apple Developer Account (99 $/Jahr):**
   - Account registrieren, Team-ID und Zertifikate für EAS Build bereitstellen.
2. **Google Play Console Account (25 $ einmalig):**
   - Entwickler-Account anlegen.
3. **Supabase Cloud-Instanz:**
   - Bereitstellung des produktiven Supabase-Projekts (URL und Anon-Key).
4. **OpenRouter API Key & Hard Cap:**
   - Monatliches Spending-Limit im OpenRouter-Dashboard konfigurieren, um Kostenüberraschungen auszuschließen.
5. **Rechtliche Pflichtangaben:**
   - Name und ladungsfähige Anschrift für das Impressum (§ 5 DDG).
   - Domain / Hosting für die öffentlich erreichbare Datenschutzerklärung.

---

## 9. Decisions Required from Konrad

1. **Exercise Database / Medien:**
   - Soll für V1 eine offizielle kommerzielle API-Lizenz (z. B. ExerciseDB Pro) erworben werden, oder startet EVARO mit reinen Vektor-Muskelkarten und ohne externe GIFs?
2. **Hosting-Plattform für AI Coach:**
   - Präferenz zwischen Render.com, Railway, Fly.io oder Umschreiben auf Supabase Edge Functions.
3. **App Store Display Name & Identifiers:**
   - Freigabe zur Umbenennung in `app.json`: Name "EVARO", Bundle-ID z. B. `com.evaro.app`.
4. **Gamification Lore:**
   - Beibehaltung von "VOLT Master" / "VOLT Season 1" als sportliches Thema oder Umbenennung auf EVARO.

---

## 10. Recommended First Astra Work Block

> **Fokus-Block: Native Reliability & Security Baseline (WP-01)**
> 1. Native Audio Fix in `apps/mobile/src/utils/timerAudio.ts` via `expo-av` und Glockenton-Asset.
> 2. Token Security: Umstellung von `apps/mobile/src/utils/supabase.ts` auf sicheren Speicher (`expo-secure-store`).
> 3. Account-Löschungs-Flow: Supabase RPC anlegen und UI-Löschaktion in `profile.tsx` scharf schalten.
> 4. Entkopplung der Exercise-GIFs in `packages/domain/src/data/mapExercises.ts`.
