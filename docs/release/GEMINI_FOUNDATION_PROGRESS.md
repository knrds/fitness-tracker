# EVARO – Gemini Foundation Progress

**Stand:** 15. September 2026  
**Rolle:** Supporting Implementation & Release Preparation Engineer (Gemini)  
**Branch:** `main`  
**Ziel:** Umsetzung der fundamentalen, risikoarmen Release-Grundlagen der EVARO-Roadmap zur Vorbereitung komplexer P0-Systeme für Astra.

---

## Starting Point

- **Commit:** `343334a` (origin/main synchronisiert)
- **Tag:** `v0.1.0-beta.2` (stabil verankert)
- **Tests:** 315 / 315 PASS (57 Domain Vitest, 240 Mobile Jest, 18 API Node Runner)
- **Status:** Typecheck & Lint PASS (0 Fehler, 0 Warnungen)

---

## Native Foundation

- **Display Name:** Durchgängig als `EVARO` in `app.json`, UI-Titeln, Level-System, Share-Signaturen und Themes validiert.
- **Orientation & Status Bar:** Auf Portrait und `light` (im Dark-Theme-Design) konsistent geführt.
- **Expo Plugins:** `expo-router`, `expo-font`, `expo-sqlite`, `expo-av` sauber konfiguriert.
- **Bundle ID & Package:** `com.fitnesstracker.app` (mit Suffixen für `.development` und `.preview`) absichtlich erhalten (`ASTRA_REVIEW_REQUIRED`).
- **Icons & Splash:** Native Bilddateien in `apps/mobile/assets/` vorhanden und in `app.json` referenziert.

---

## Release Configuration

- **EAS Build:** Profile für `development`, `preview` und `production` in `apps/mobile/eas.json` gepflegt; Node 24.13.0 und pnpm 11.5.0 gepinnt; `autoIncrement: true` für Production aktiv.
- **Environment Validation:** `apps/mobile/src/utils/envValidation.ts` implementiert. Prüft in `__DEV__` oder beim Start das Vorhandensein von Supabase- und Coach-Endpunkten, ohne jemals sensible Token oder Secrets zu loggen.
- **Offline-First Safety:** Klar dokumentiert, dass fehlende Cloud-Credentials kein Fehler sind, da EVARO 100% lokal lauffähig ist.

---

## CI / Quality Gates

- **Unified Quality Gate:** Neuer Befehl `pnpm verify` in `package.json` eingeführt (`pnpm typecheck && pnpm lint && pnpm test`).
- **GitHub Actions (`.github/workflows/ci.yml`):**
  - Dependency Installation mit `--frozen-lockfile` (pnpm 11.5.0 / Node 24).
  - Typecheck (`pnpm typecheck`).
  - Linting (`pnpm lint`).
  - Vollständige Testsuite (`pnpm test`).
  - Web Bundle Export Verifikation (`pnpm build`).

---

## Internationalization (i18n)

- **Auth-Namespace:** Vollständiges deutsches und englisches Lokalisierungsmodul unter `auth` für Login, Registrierung, Passwort vergessen und E-Mail-Bestätigung angelegt.
- **Coach-Strings:** Fehlermeldungen bei Dateigröße/MIME-Typen sowie der "Erneut senden"-Button dynamisch über `t()` lokalisiert.
- **Workout-Strings:** Abbruch-, Verwerfen- und Bestätigungsdialoge sowie Barrierefreiheitsbeschriftungen in `workout` integriert.
- **Übungsfilter-Empty-State:** 0 Übungen gefunden und Hinweistext in `exercises` dynamisch angebunden.
- **Automatisierter Paritätstest:** `i18n.test.ts` rekursiv um 100%-Schlüsselabgleich zwischen `de` und `en` erweitert (verhindert unbemerkte Sprachdiskrepanzen).

---

## Accessibility (a11y)

- **Reduced Motion:** Bereits in 15+ Kernkomponenten via `useReducedMotion()` nativ berücksichtigt (`ALREADY_GOOD`).
- **Workout Session:** Hardcodierte deutsche `accessibilityLabel`-Attribute (z. B. "Training beenden", "Training minimieren", "Koffein eintragen", "Übungen sortieren") auf dynamische Sprachschlüssel umgestellt.
- **Touch Targets:** Mindestgrößen von 44x44 pt für Schließen-, Minimieren-, Reorder- und Retry-Buttons sichergestellt.

---

## UX Hardening

- **Empty States:** Einheitliche Nutzung der `EmptyState`-Komponente in Historie und Übungskatalog mit kontextuellen Hilfetexten.
- **Error Banner:** Im Coach-Screen mit dynamischer "Erneut senden"-Aktion und klaren deutschen/englischen Rückmeldungen abgesichert.
- **Dialoge:** Saubere Trennung zwischen Abbruch und Weitertrainieren im aktiven Workout ohne Datenverlust.

---

## Haptics

- **Zentraler Wrapper:** `apps/mobile/src/utils/haptics.ts` erstellt.
- **Methoden:** `selection()`, `impact(light|medium|heavy)`, `notification(success|warning|error)`, `success()`, `warning()`, `error()`.
- **Einstellungsrespekt:** Berücksichtigt `profile.hapticsEnabled` aus dem Zustand-Store (Standard: `true`).
- **Fehlertoleranz:** Wirft auf unsupported Hardware oder im Web niemals Exceptions.
- **Tests:** 6 automatisierte Unit-Tests in `haptics.test.ts`.

---

## Audio

- **Audio-Adapter:** `apps/mobile/src/utils/audioAdapter.ts` vorbereitet.
- **Browser Chime:** Bewährter Web Audio Zweiklang-Glockenton bleibt für Web-Previews unberührt erhalten.
- **Einstellungsrespekt:** Berücksichtigt `profile.soundEnabled` aus dem Profil (Standard: `true`).
- **Native Vorbereitung:** Struktur für `expo-av` offline Sound-Playback vorbereitet; physischer Gerätetest als offen dokumentiert (`ASTRA_REVIEW_REQUIRED`).

---

## Notifications

- **Audit-Ergebnis:** `expo-notifications` ist nicht installiert; keine unüberlegten Native-Dependencies ohne Rücksprache hinzugefügt (`ALREADY_GOOD / ARCHITECTURE_PRESERVED`).
- **Architekturpfad:** Lokale Timer-Benachrichtigungen für Hintergrundsperre dokumentiert für Astra.

---

## Settings / Metadata

- **Haptik- & Ton-Toggles:** Im Profil-Screen unter "Einstellungen" als Schalter integriert und mit `profileStore` verdrahtet.
- **App Version Display:** Dynamischer Abruf via `Constants.expoConfig?.version ?? '0.1.0'` statt statischem Text.
- **Rechtliche Menüpunkte:** Neutrale, Store-konforme Dialog-Platzhalter für Impressum, Datenschutz, AGB, Support und Account-Löschung beibehalten (keine irreführenden Scheinfunktionen).

---

## Tests Added

1. `apps/mobile/src/utils/__tests__/envValidation.test.ts` (4 Tests)
2. `apps/mobile/src/utils/__tests__/haptics.test.ts` (6 Tests)
3. `apps/mobile/src/i18n/__tests__/i18n.test.ts` (+ 1 rekursiver 100%-Paritätstest)

Gesamtzahl Tests im Monorepo: **326 Tests PASS** (zuvor 315).

---

## Bugs Fixed

1. Fehlende Lokalisierung des "Erneut senden"-Buttons im Coach-Chat (war hardcoded deutsch).
2. Hardcodierte deutsche Fehlermeldungen bei Bild-Uploads im Coach-Screen.
3. Hardcodierte deutsche `accessibilityLabel`-Attribute im Workout-Screen (wurden Screenreadern englischsprachiger Nutzer auf Deutsch vorgelesen).
4. Fehlende Typensicherheit bei Auth-Strings (wurden durch Inline-Ternaries statt `t()` gepflegt).
5. Statische Anzeige der App-Version im About-Bereich dynamisiert.

---

## Not Changed Due To Risk (Astra Reserved)

- **Bundle Identifier (`com.fitnesstracker.app`):** Keine eigenmächtige Änderung wegen EAS-, Provisioning- und Store-Auswirkungen.
- **Exercise DB Visuals:** 1.492 fremde GIF-Hotlinks (`static.exercisedb.dev`) bleiben geblockt bis Konrads Lizenzentscheidung vorliegt.
- **Supabase Edge Function Account Deletion:** Kaskadierende Cloud-Löschung erfordert Backend-Deployment.
- **RevenueCat / StoreKit:** SDK-Installation und Paywall-Integration erfordern In-App-Produkt-Setup.
- **SecureStore Migration:** Verschiebung des Supabase-Auth-Tokens von MMKV in iOS Keychain.

---

## Ready for Astra

Die Arbeitsbasis auf `main` ist nun signifikant gehärtet, durchgängig lokalisiert, barrierefreier und mit automatisierten Quality Gates versehen.

Astra kann direkt mit den komplexen P0-Subsystemen beginnen:
1. Native Rest Timer Audio mit lokalen Assets in `apps/mobile/assets/sounds/` via `expo-av`.
2. Public HTTPS Coach Backend mit serverseitigem Rate-Limiting & Entitlement Gate.
3. RevenueCat SDK Integration & Paywall nach Onboarding.
4. Supabase RPC für Kontolöschung gemäß Apple Guideline 5.1.1(v).
