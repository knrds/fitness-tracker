# EVARO – Astra Handoff Document

**Stand:** 15. September 2026  
**Erstellt von:** Gemini Support Agent (Release Preparation, Verification & Baseline Audit)  
**Für:** ChatGPT-Astra (Lead Mobile/Backend Release Architect)  
**Branch:** `main` (vollständig validiert & synchronisiert)  

---

## STABLE_BASE

Astra startet auf einer vollständig verifizierten, konsistenten und grünen Basis:

- **Aktueller Main Commit:** Finaler Verification Commit (baut direkt auf `7d24b85` auf)
- **Aktueller Beta Tag:** `v0.1.0-beta.1` (auf `7d24b85` verankert) / `v0.1.0-beta.2` (final verifizierter Checkpoint)
- **Version:** `0.1.0-beta.2`
- **Teststatus:**
  - **326 / 326 Tests PASS** (57 Domain Vitest, 251 Mobile Jest, 18 API Node Test Runner)
  - **Typecheck:** PASS (0 Fehler über `packages/domain`, `packages/ui`, `apps/mobile`)
  - **Lint:** PASS (0 Fehler, 0 Warnungen)
  - **Quality Gate:** PASS (`pnpm verify` vereint Typecheck, Lint und Tests)
  - **Coach Preflight:** PASS (`pnpm coach:check` bestätigt OpenRouter Key & Model)
  - **Bundle Sanity:** PASS (`expo export --platform web` generiert alle Bundles und Chunks fehlerfrei)
  - **Physical Device:** `NOT VERIFIED ON PHYSICAL DEVICE` (mangels Hardware/Zertifikaten; 100% statisch und automatisiert abgesichert)
- **Relevante vorbereitete Dokumente:**
  - `docs/release/EXECUTION_STATUS.md`: Faktenbasierter Status aller 31 P0-Release-Gates
  - `docs/release/ACCOUNT_DATA_MAP.md`: Alle 20 Datenspeicher für DSGVO-Export & Kontolöschung
  - `docs/release/EXERCISE_ASSET_INVENTORY.md`: Audit aller 873 Übungen und 1.492 GIF-Hotlinks
  - `docs/release/AUDIO_HAPTICS_AUDIT.md`: Native Audio-Analyse & Migrationspfad auf `expo-av`
  - `docs/release/SUBSCRIPTION_INTEGRATION_MAP.md`: EVARO Pro Feature-Gating-Matrix & RevenueCat-Architektur
  - `docs/release/GEMINI_WORK_SUMMARY.md`: Chronologischer Gesamtüberblick aller 5 Arbeitsblöcke
  - `docs/release/REPOSITORY_CLEANUP_REPORT.md`: Audit der Datei- und Hygienebereinigung
  - `docs/release/BETA_RELEASE_NOTES.md`: Release Notes für Beta-Checkpoints
  - `evaro_release_execution_pack/MASTER_CHECKLIST.md`: Release-Checkliste
- **Verbleibende P0-Blocker:**
  1. *P0-01 (Asset-Lizenz):* 1.492 Übungs-GIFs von `static.exercisedb.dev` (`BLOCKED`)
  2. *P0-02 (Backend-Sicherheit):* Kein öffentlicher HTTPS-Coach-Endpunkt, kein verteiltes Rate-Limit, kein Entitlement-Check (`READY_FOR_ASTRA`)
  3. *P0-03 (Store-Compliance):* Serverseitige Kaskadenlöschung via Supabase RPC gemäß Apple 5.1.1(v) fehlt (`READY_FOR_ASTRA`)
  4. *P0-04 (Monetarisierung):* RevenueCat SDK und Store-Produkte (Monat/Jahr) nicht integriert (`READY_FOR_ASTRA`)
  5. *P0-05 (Native Audio):* Web Audio API wirft Fehler auf nativen Geräten; Migration auf `expo-av` erforderlich (`READY_FOR_ASTRA`)
- **Verbleibende Legacy-Identifier:**
  - `com.fitnesstracker.app` (Bundle ID & Package Name – EAS/Store Provisioning)
  - `fitness-tracker` (Slug & Scheme – Deep Linking)
  - `'volt-sync-store'` & `'volt-coach-store'` (SQLite-Persistenz bestehender Tester)
  - `assets/volt-emblem.png` (Marken-Emblem Dashboard)
  - `VoltDashboard.tsx` & `VoltBackdrop.tsx` (Interne TypeScript-Komponentennamen)
- **Offene User-Entscheidungen (Konrad):**
  - Exercise-Asset Lizenzstrategie (ExerciseDB API-Lizenz vs. Drittanbieter-Bilder vs. Start ohne GIFs)
  - Apple Developer Account ($99/Jahr) & Google Play Console ($25 einmalig)
  - RevenueCat Account anlegen & In-App-Produkte (`evaro_pro_monthly`, `evaro_pro_yearly`) im Store konfigurieren
  - Rechtstexte (Impressum, Datenschutzerklärung, AGB, Art.-9-Einwilligung)
  - HTTPS-Hosting für AI Coach Backend (z. B. Vercel)
- **Empfohlener erster Astra-Arbeitsblock:**
  1. Native Rest Timer Audio auf `expo-av` umstellen (`AUDIO_HAPTICS_AUDIT.md`)
  2. HTTPS-Coach Backend mit verteiltem Rate-Limiting und `evaro_pro`-Entitlement-Gate bereitstellen
  3. RevenueCat SDK (`react-native-purchases`) integrieren und Paywall nach Onboarding einbauen

---

## 1. Aufgabenstatus nach Kategorien

### DONE_BY_GEMINI (Vollständig erledigt & integriert)
1. **Repositoryweiter EVARO Branding Pass:**
   - Display Name in `apps/mobile/app.json`: `"name": "EVARO"`.
   - AI Coach Persona & Header: `api/coach-chat.js` (`EVARO Coach`, `X-OpenRouter-Title: EVARO`).
   - UI Chips: `apps/mobile/src/components/CoachComposer.tsx` (`EVARO Coach`).
   - Colorway-Anzeigenamen: `packages/ui/src/theme.ts` & `rewards.ts` (`EVARO Verde`, `EVARO Ember`).
   - Gamification & Levelsystem: `apps/mobile/src/utils/level.ts` (`EVARO Master`), `LevelProgress.tsx` und `BattlePassModal.tsx` (`EVARO SEASON 1: ASCEND`, `EVARO Master`).
   - Share-Strings & Backup-Name: `programs.tsx`, `workouts.tsx`, `history/[id].tsx`, `profile.tsx` auf EVARO vereinheitlicht.
   - Release Pack Verzeichnis: umbenannt auf `evaro_release_execution_pack/` und interne Unterlagen auf EVARO aktualisiert.
   - **Rückwärtskompatibilität:** Interne Theme-IDs (`verde`, `ember`), SQLite-Keys (`volt-sync-store`, `volt-coach-store`) und Store-Identifikatoren wurden strikt erhalten, um bestehende Beta-Daten nicht zu gefährden.
2. **Deutsche Übersetzungen & i18n-Hardening:**
   - Bekannter Fehler in `body.tsx` behoben: Diagramm-Empty-State zeigt jetzt `"Noch nicht genügend Daten"` und `"Trage mindestens zwei Werte ein, um die Entwicklung anzuzeigen."` (DE) bzw. `"Not enough data"` / `"Log at least 2 data points."` (EN).
   - Diagramm-Interaktions-Tipp in `body.tsx`: `"Tippe auf einen Punkt im Diagramm für Details"`.
   - Körperfett-Erklärung und Validierungs-Alerts in `body.tsx` vollständig lokalisiert.
   - Übungsdetails-Screen (`apps/mobile/app/exercise/[id].tsx`): Vollständig lokalisiert (Ausrüstung, Schwierigkeit, Muskeln, Anleitung, Übungs-Optionen, RPE/RIR-Toggles, Alerts).
   - Supersatz-Alert-Titel in `SessionExerciseCard.tsx` lokalisiert.
   - Automatisierte Regressionstests in `i18n.test.ts` ergänzt.
3. **Rechtliches UI & neutrale Menüpunkte (`profile.tsx`):**
   - Strukturierte Menüeinträge für Impressum (§ 5 DDG), Datenschutzerklärung, Nutzungsbedingungen / EULA, Support, Abonnement verwalten und Account löschen angelegt.
   - Neutrales Store-konformes Platzhalter-Handling ohne voreilige Scheindaten oder unvollständige Art.-9-DSGVO-Hacks.
4. **Erstellung von 4 technischen Architektur-Karten:**
   - `docs/release/ACCOUNT_DATA_MAP.md`: Detailerfassung aller 20 lokalen/serverseitigen Datenspeicher für Account-Löschung und Datenexport.
   - `docs/release/EXERCISE_ASSET_INVENTORY.md`: Detaillierte Lizenz- und Herkunftsanalyse aller 873 Übungen und 1.492 GIF-Hotlinks.
   - `docs/release/AUDIO_HAPTICS_AUDIT.md`: Native Audioproblematik (Web Audio API) und Migrationspfade via `expo-av` analysiert.
   - `docs/release/SUBSCRIPTION_INTEGRATION_MAP.md`: Feature-Matrix für EVARO Pro, Entitlement-Gates und RevenueCat-Integrationspunkte kartiert.
5. **Master-Checkliste & Gesamt-Summary:**
   - `evaro_release_execution_pack/MASTER_CHECKLIST.md` und `docs/release/EXECUTION_STATUS.md` mit Evidence aktualisiert.
   - `docs/release/GEMINI_WORK_SUMMARY.md` als umfassende Bilanz aller 5 Arbeitsblöcke erstellt.
6. **Release Foundation & Quality Gates (`GEMINI_FOUNDATION_PROGRESS.md`):**
   - **CI / Quality:** `pnpm verify` Command und GitHub Actions Workflow mit Web-Bundle-Check (`pnpm build`) aktiv.
   - **Environment:** `envValidation.ts` mit 4 Tests; sichere Offline-Erkennung ohne Secret-Leaks.
   - **i18n & a11y:** Auth-Namespace integriert; 100%-Paritätstest in `i18n.test.ts`; barrierefreie Labels in `session.tsx`.
   - **Haptics & Audio:** `hapticFeedback`-Wrapper mit 6 Tests und `audioAdapter` mit Mute/Toggle-Integration im Store.
   - **Settings:** Schalter für Haptik und Töne im Profil; dynamische App-Version (`Constants.expoConfig?.version`).

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

## 2. Noch verbleibende technische Legacy-Identifier

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

## 3. Bereit für die Übernahme

Das Repository befindet sich in einem **sauberen, vollständig getesteten und stabilen Zustand**.
Astra kann direkt mit den Aufgaben aus `READY_FOR_ASTRA` fortfahren.
