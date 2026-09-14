# EVARO – Astra Handoff Document

**Stand:** 14. September 2026  
**Erstellt von:** Gemini Support Agent (Release Preparation & Baseline Audit)  
**Für:** ChatGPT-Astra (Lead Mobile/Backend Release Architect)  
**Branch:** `main` (`4aff956`)

---

## 1. Aktueller Stand & Kontext
EVARO (`knrds/fitness-tracker`) ist eine funktionierende Krafttrainings-App in der Beta-Phase.
- **Kernarchitektur:** Offline-First SQLite (Schema 2) über `expo-sqlite`, React-freie Domain-Berechnungen in `packages/domain`, UI-Primitives in `packages/ui`, Expo Router App in `apps/mobile`.
- **Qualitätsstatus:** 315 Tests bestehen (57 Vitest Domain, 240 Jest Mobile über 50 Testsuites, 18 Node-API-Tests). TypeScript (`pnpm -r typecheck`) und ESLint (`pnpm -r lint`) laufen mit 0 Fehlern und 0 Warnungen durch.
- **Ziel:** Kommerzieller iOS-first (und danach Android) Store-Release unter der Marke **EVARO** mit **EVARO Pro** Abonnement.

---

## 2. Seit letzter Übergabe erledigt (Baseline Audit)
- Vollständiger Audit des Repositorys anhand `MASTER_CHECKLIST.md` und des Release Execution Packs.
- `docs/release/EXECUTION_STATUS.md` angelegt mit Status-Bewertung aller 31 P0-Gates.
- Branding-Befunde (Volt -> EVARO) in sichtbaren UI-Texten und technischen Identifiers kartiert.
- Kritisches Lizenz- und DMCA-Risiko bei `exerciseGifs.json` (Hotlinks auf `static.exercisedb.dev`) aufgedeckt.
- Nativen Audio-Bug aufgedeckt: `timerAudio.ts` nutzt Browser-`AudioContext`, der auf nativen iOS/Android-Geräten stumm bleibt.

---

## 3. Verifizierte Fakten
1. **Tests & Tooling:**
   - `pnpm -r typecheck`: PASS (0 Fehler)
   - `pnpm -r lint`: PASS (0 Fehler, 0 Warnings)
   - `pnpm test`: PASS (315 Tests grün)
   - `pnpm coach:check`: PASS (OpenRouter Preflight bestätigt)
2. **Offline-Persistenz:**
   - Native SQLite `training.sqlite` mit WAL-Modus und versioniertem Dokumentenschema (v2) mit normalisierten Sessions, Sets und Outbox-Queue.
   - Atomarer Finish-Befehl für Workouts rollt bei Fehlern sauber zurück.
3. **Secret Hygiene:**
   - Keine Provider-Secrets (`OPENROUTER_API_KEY`, Supabase Service Role) im Client-Code (`apps/mobile/`).
   - `.env.coach.local` ist in `.gitignore`.
4. **Anatomie & Icons:**
   - `AnatomyFigure.tsx` basiert auf `react-native-body-highlighter` (MIT-Lizenz dokumentiert in `apps/mobile/src/components/anatomy/LICENSE`).
   - Fonts (`Manrope`, `Space Grotesk`) sind OFL; Icons (`Ionicons`) sind MIT.

---

## 4. Offene P0-Probleme (Für Astra priorisiert)

### Problem 1: Unlizenzierte Exercise-GIFs & Hotlinks (DMCA / Urheberrecht)
- **Beschreibung:** `packages/domain/src/data/raw/exerciseGifs.json` verlinkt 1.494 GIFs direkt via Hotlink auf `https://static.exercisedb.dev/media/...`. Es existiert keine Lizenzdatei oder Zahlungsnachweis.
- **Risiko:** `CRITICAL` (App Store Rejection, DMCA Takedown, Abmahnung).
- **Betroffene Dateien:** `packages/domain/src/data/raw/exerciseGifs.json`, `packages/domain/src/data/mapExercises.ts`.
- **Empfohlene Astra-Aufgabe:** Bereinigung des Katalogs. Entfernen unlizenzierter Hotlinks. Umstellung auf reine Vektor-Muskelkarten oder Integration einer lizenzierten API (z. B. ExerciseDB RapidAPI Pro oder MuscleWiki).

### Problem 2: Fehlende In-App Purchases & Paywall (Monetarisierung)
- **Beschreibung:** Weder RevenueCat noch StoreKit sind integriert. Keine Paywall-Screens, keine In-App-Produkte, keine Entitlement-Gates.
- **Risiko:** `HIGH` (Hauptanforderung: Kommerzialisierung).
- **Betroffene Dateien:** `apps/mobile/package.json`, `apps/mobile/app/`, `api/coach-chat.js`.
- **Empfohlene Astra-Aufgabe:** Installation von `react-native-purchases`, Konfiguration der Entitlements (`evaro_pro`), Erstellung der Paywall mit 7-Tage-Trial und serverseitiger Entitlement-Check in der Coach-API.

### Problem 3: Fehlende Account-Löschung nach Apple Guideline 5.1.1(v)
- **Beschreibung:** Da die App Auth/Login besitzt, verlangt Apple zwingend eine direkte Möglichkeit zur Account-Löschung in der App. Aktuell existiert nur ein lokaler Datenreset.
- **Risiko:** `CRITICAL` (Garantierter Rejection-Grund beim App Review).
- **Betroffene Dateien:** `apps/mobile/app/profile.tsx`, `apps/mobile/src/stores/authStore.ts`, Supabase Schema / RPC.
- **Empfohlene Astra-Aufgabe:** Erstellung eines Supabase RPCs `delete_user_account()` und Verdrahtung eines "Account unwiderruflich löschen"-Dialogs in `profile.tsx`.

### Problem 4: Unsichere Token-Speicherung (MMKV statt SecureStore)
- **Beschreibung:** `supabase-auth-storage` liegt in unverschlüsseltem Plain MMKV (`apps/mobile/src/utils/supabase.ts`), nicht in der iOS Keychain oder Android Keystore.
- **Risiko:** `MEDIUM` / `HIGH` (App-Store Security Audit).
- **Betroffene Dateien:** `apps/mobile/src/utils/supabase.ts`.
- **Empfohlene Astra-Aufgabe:** Absicherung via `expo-secure-store` oder verschlüsseltem MMKV mit Keychain-Key.

### Problem 5: Coach-API nur lokal – kein HTTPS-Produktionsdeployment
- **Beschreibung:** Der Node.js Coach läuft auf `127.0.0.1:8096`. Auf physischen iPhones ist `localhost` unerreichbar (Apple ATS verlangt HTTPS).
- **Risiko:** `CRITICAL` für den nativen Coach.
- **Betroffene Dateien:** `api/coach-chat.js`, `api/local-server.cjs`, `apps/mobile/src/utils/coachApi.ts`.
- **Empfohlene Astra-Aufgabe:** Bereitstellung eines Dockerfiles / Cloud-Deployments (Render.com, Railway, Fly.io oder Supabase Edge Function) mit HTTPS-Domain.

### Problem 6: Ungetestete Supabase Cloud RLS & Migrationen
- **Beschreibung:** `docs/schema.sql` existiert als Entwurf, wurde aber auf keinem externen Supabase-Projekt angewendet oder mit echten Multi-Account-Tests verifiziert.
- **Risiko:** `HIGH` (Datenintegrität und Mandantentrennung).
- **Betroffene Dateien:** `docs/schema.sql`.
- **Empfohlene Astra-Aufgabe:** Migration auf echtes Supabase-Projekt und Durchführung von Cross-Account-Sicherheitsprüfungen.

---

## 5. Offene Entscheidungen (Für User / Astra)
1. **Exercise Database:** Soll eine kommerzielle RapidAPI/ExerciseDB-Lizenz erworben werden, oder startet EVARO V1 mit eigenen Vektor-Karten und Community-Übungen?
2. **Hosting-Plattform:** Soll die Coach-API auf Render.com / Railway gehostet werden oder als Supabase Edge Function umgeschrieben werden?
3. **App Display Name:** Bestätigung der Umbenennung in `app.json` von `"Fitness Tracker"` zu `"EVARO"`.

---

## 6. USER_ACTION_REQUIRED
- [ ] Apple Developer Account (99 $/Jahr) registrieren und Team-ID bereitstellen.
- [ ] Google Play Console Account (25 $) anlegen.
- [ ] Supabase Cloud-Projekt erstellen und URL + Anon-Key übermitteln.
- [ ] OpenRouter monatliches Ausgabenlimit festlegen.
- [ ] Impressums-Daten (Name, ladungsfähige Anschrift) bereitstellen.

---

## 7. Sinnvollster nächster Schritt
- **Gemini (dieser Agent):** Kann sofort kleine, risikoarme Bereinigungen vornehmen:
  - Ersetzen der restlichen sichtbaren "Volt"-Texte durch "EVARO" in `profile.tsx`, `verify.tsx`, `AuthHeader.tsx` und `translations.ts`.
  - Vorbereitung von Impressum- und Legal-Links in `profile.tsx`.
- **Astra (Hauptagent):** Übernahme von **WP-01 (Native Identity & EAS)**, **WP-04 (Exercise DB Lizenzbereinigung)** und **WP-05 (RevenueCat Subscriptions)**.
