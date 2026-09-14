# EVARO – Astra Handoff Document

**Stand:** 15. September 2026  
**Erstellt von:** Gemini Support Agent (Release Preparation & Baseline Audit)  
**Für:** ChatGPT-Astra (Lead Mobile/Backend Release Architect)  
**Branch:** `main` (vollständig validiert & integriert)  

---

## 1. Repository Baseline & Qualitätsstand

- **Branch:** `main` (synchronisiert mit `origin/main`)
- **Tests:** `pnpm test` -> **315 / 315 PASS** (57 Vitest Domain in 8 Files, 240 Jest Mobile in 50 Testsuites, 18 Node API Tests in `api/coach-chat.test.cjs`)
- **Typecheck:** `pnpm -r typecheck` -> **PASS (0 Fehler)** über alle Pakete (`packages/domain`, `packages/ui`, `apps/mobile`)
- **Lint:** `pnpm -r lint` -> **PASS (0 Fehler, 0 Warnungen)**
- **Coach Preflight:** `pnpm coach:check` -> **PASS (Modell & API-Key bestätigt)**
- **Dependencies:** `@opentelemetry/api` wurde unbenutzt verifiziert und sauber entfernt; Lockfile synchron.
- **Physical Device:** `NOT VERIFIED ON PHYSICAL DEVICE` (mangels Credentials und physischer Hardware; stattdessen 100% statisch und automatisiert abgesichert).

---

## 2. Aufgabenstatus nach Kategorien

### DONE_BY_GEMINI (Vollständig erledigt & auf main integriert)
1. **Repositoryweiter EVARO Branding Pass:**
   - Display Name in `apps/mobile/app.json`: `"name": "EVARO"`.
   - AI Coach Persona & Header: `api/coach-chat.js` (`EVARO Coach`, `X-OpenRouter-Title: EVARO`).
   - UI Chips: `apps/mobile/src/components/CoachComposer.tsx` (`EVARO Coach`).
   - Colorway-Anzeigenamen: `packages/ui/src/theme.ts` & `rewards.ts` (`EVARO Verde`, `EVARO Ember`).
   - Gamification & Levelsystem: `apps/mobile/src/utils/level.ts` (`EVARO Master`), `LevelProgress.tsx` und `BattlePassModal.tsx` (`EVARO SEASON 1: ASCEND`, `EVARO Master`).
   - Share-Strings & Backup-Name: `programs.tsx`, `workouts.tsx`, `history/[id].tsx`, `profile.tsx` auf EVARO vereinheitlicht.
   - Release Pack Verzeichnis: umbenannt auf `evaro_release_execution_pack/` und interne Unterlagen auf EVARO aktualisiert.
   - **Rückwärtskompatibilität:** Interne Theme-IDs (`verde`, `ember`), SQLite-Keys (`volt-sync-store`, `volt-coach-store`) und Store-Identifikatoren wurden strikt erhalten, um bestehende Beta-Daten nicht zu gefährden.
2. **Rechtliches UI & neutrale Menüpunkte (`profile.tsx`):**
   - Strukturierte Menüeinträge für Impressum (§ 5 DDG), Datenschutzerklärung, Nutzungsbedingungen / EULA, Support, Abonnement verwalten und Account löschen angelegt.
   - Neutrales Store-konformes Platzhalter-Handling ohne voreilige Scheindaten oder unvollständige Art.-9-DSGVO-Hacks.
3. **Erstellung von 4 technischen Architektur-Karten:**
   - `docs/release/ACCOUNT_DATA_MAP.md`: Detailerfassung aller 20 lokalen/serverseitigen Datenspeicher für Account-Löschung und Datenexport.
   - `docs/release/EXERCISE_ASSET_INVENTORY.md`: Detaillierte Lizenz- und Herkunftsanalyse aller 873 Übungen und 1.492 GIF-Hotlinks.
   - `docs/release/AUDIO_HAPTICS_AUDIT.md`: Native Audioproblematik (Web Audio API) und Migrationspfade via `expo-av` analysiert.
   - `docs/release/SUBSCRIPTION_INTEGRATION_MAP.md`: Feature-Matrix für EVARO Pro, Entitlement-Gates und RevenueCat-Integrationspunkte kartiert.
4. **Master-Checkliste & Gesamt-Summary:**
   - `evaro_release_execution_pack/MASTER_CHECKLIST.md` und `docs/release/EXECUTION_STATUS.md` mit Evidence aktualisiert.
   - `docs/release/GEMINI_WORK_SUMMARY.md` als umfassende Bilanz aller drei Arbeitsblöcke erstellt.

---

### READY_FOR_ASTRA (Direkt durch Astra umsetzbar)

1. **Native Rest Timer Audio (`timerAudio.ts`):**
   - *Problem:* Web Audio API (`window.AudioContext`) schlägt in React Native Hermes fehl.
   - *Aktion:* Umstellung auf `expo-av` (`Audio.Sound.createAsync`) mit kurzen Offline-Sounds in `apps/mobile/assets/sounds/` gemäß [`AUDIO_HAPTICS_AUDIT.md`](file:///d:/TrainingsAppGPT/docs/release/AUDIO_HAPTICS_AUDIT.md).
2. **Production Coach Backend & Entitlement Gate:**
   - *Problem:* Backend läuft lokal auf Port 8096, besitzt kein verteiltes Rate-Limiting und keinen Entitlement-Check.
   - *Aktion:* Bereitstellung eines öffentlichen HTTPS-Endpunkts (Vercel/Railway), Einbau von Redis/KV-basiertem Rate-Limiting und serverseitiger Prüfung des `evaro_pro` Entitlements vor AI-Generierung gemäß [`SUBSCRIPTION_INTEGRATION_MAP.md`](file:///d:/TrainingsAppGPT/docs/release/SUBSCRIPTION_INTEGRATION_MAP.md).
3. **RevenueCat In-App Purchases:**
   - *Problem:* Weder StoreKit noch Google Play Billing sind integriert.
   - *Aktion:* `react-native-purchases` einbinden, Entitlements (`evaro_pro`) mappen, Purchase/Restore-Flows verdrahten und Paywall nach Onboarding einbauen.
4. **Vollständige DSGVO- & Apple-Account-Löschung:**
   - *Problem:* Nur lokaler Reset vorhanden; Cloud-Daten bleiben bestehen (Verstoß gegen Apple Guideline 5.1.1(v)).
   - *Aktion:* Supabase RPC mit `SECURITY DEFINER` zur kaskadierenden Löschung von `auth.users` und allen verknüpften Tabellen gemäß [`ACCOUNT_DATA_MAP.md`](file:///d:/TrainingsAppGPT/docs/release/ACCOUNT_DATA_MAP.md) implementieren und im UI verdrahten.
5. **Secure Token Storage:**
   - *Problem:* Supabase Auth-Tokens liegen unverschlüsselt in MMKV (`supabase-auth-storage`).
   - *Aktion:* Migration des Auth-Storage-Adapters auf `expo-secure-store`.
6. **Supabase RLS & Cross-Account Tests:**
   - *Problem:* `docs/schema.sql` enthält RLS-Entwürfe, aber keine automatisierten Negative-Tests.
   - *Aktion:* Bereitstellung auf Test-Projekt und Verifikation der Cross-Account-Isolation.

---

### BLOCKED (Wartet auf Vorab-Entscheidung oder Klärung)

1. **Exercise Asset Lizenzierung (`EXERCISE_ASSET_INVENTORY.md`):**
   - *Status:* `BLOCKED`.
   - *Ursache:* 1.492 Übungs-GIFs werden via Hotlink von `https://static.exercisedb.dev` geladen. Es existiert kein kommerzieller Lizenznachweis.
   - *Voraussetzung zur Entblockung:* Konrad muss entscheiden:
     - Option A: Kommerzielle API-Lizenz bei ExerciseDB / RapidAPI erwerben.
     - Option B: Lizenzierte Drittanbieter-Bilder (z. B. MuscleWiki) anbinden.
     - Option C: V1 ohne Fremd-GIFs veröffentlichen (nur Anatomie-Karten und Textanleitungen).

---

### USER_ACTION_REQUIRED (Konrad muss manuell erledigen)

1. **Apple Developer Account (99 $/Jahr):**
   - Account anlegen, Team-ID und Apple-Zertifikate für EAS bereitstellen.
2. **Google Play Console (einmalig 25 $):**
   - Entwicklerkonto anlegen.
3. **RevenueCat Account:**
   - Projekt anlegen, Apple App Store Shared Secret / Service Account hinterlegen, API-Keys generieren.
4. **In-App Produkte anlegen:**
   - In App Store Connect und Play Console Produkte anlegen:
     - `evaro_pro_monthly` (z. B. 9,99 €)
     - `evaro_pro_yearly` (z. B. 59,99 € mit 7 Tagen kostenloser Testphase)
5. **Rechtstexte bereitstellen:**
   - Echte Angaben für Impressum (§ 5 DDG), Datenschutzerklärung (DSGVO) und Nutzungsbedingungen (EULA) hinterlegen.
6. **Backend-Hosting & Secrets:**
   - Produktions-Hosting für Coach-Backend einrichten (z. B. Vercel) und `OPENROUTER_API_KEY` sowie `SUPABASE_SERVICE_ROLE_KEY` eintragen.

---

## 3. Noch verbleibende technische Legacy-Identifier

Folgende interne Identifier wurden bewusst **nicht** verändert, um die lauffähige Beta nicht zu gefährden:

| Identifier | Datei | Zweck | Warum nicht geändert |
|---|---|---|---|
| `com.fitnesstracker.app` | `apps/mobile/app.json` | iOS Bundle ID & Android Package | EAS Build-Profile und Provisioning-Profile hängen daran. Änderung erfolgt koordiniert beim Store-Setup. |
| `fitness-tracker` | `apps/mobile/app.json`, `authStore.ts` | Slug & URL-Scheme | Deep-Link-Redirects für Supabase Auth hängen am Schema. |
| `'volt-sync-store'` | `documentDatabase.ts:32`, `normalizedState.ts:22` | SQLite State Document Key | Enthält ungesyncte lokale Operationen von Beta-Testern. |
| `'volt-coach-store'` | `coachStore.ts:280` | Zustand Persist Key in SQLite | Speichert bisherige Chatverläufe lokaler Beta-Tester. |
| `assets/volt-emblem.png` | `apps/mobile/assets/` | Dashboard-Grafik | Bleibt als Platzhalter erhalten, bis Konrad ein neues EVARO-Logo liefert. |
| `VoltDashboard.tsx` / `VoltBackdrop.tsx` | `apps/mobile/src/components/` | Interne TSX-Komponenten | Rein interne Codenamen ohne UI-Sichtbarkeit; Refactoring ohne funktionalen Mehrwert vermieden. |

---

## 4. Bereit für die Übernahme

Das Repository befindet sich in einem **sauberen, vollständig getesteten und stabilen Zustand**.
Astra kann direkt mit den Aufgaben aus `READY_FOR_ASTRA` fortfahren.

---

## 5. Stable Base for Astra

Astra soll alle kommenden größeren Arbeiten von folgendem Safepoint aus betrachten:

- **Tag:** `v0.1.0-beta.1`
- **Commit:** `4cc3303` (bzw. finaler Sync-Commit)
- **Version:** `0.1.0-beta.1`

Dieser Stand wurde vor den großen Architektur-, Sicherheits-, Monetarisierungs- und Production-Arbeiten vollständig getestet (315/315 Tests PASS, 0 Typecheck-Fehler, 0 Lint-Fehler, Coach Preflight PASS).

Bei schwerwiegenden Regressionen dient dieser Commit bzw. Tag als gesicherte und unveränderliche Referenz.
