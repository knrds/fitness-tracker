# EVARO Beta 0.1.0-beta.1

## Zweck dieses Releases

Stabiler Pre-Production-Checkpoint vor größeren Release-, Security-, Subscription-, Backend- und Store-Arbeiten. Dieser Release dient als verifizierter, jederzeit wiederherstellbarer Ausgangspunkt für den folgenden Lead Release Architect (ChatGPT-Astra).

---

## Enthalten

- **Funktionierendes Workout Tracking:** Sets, Reps, Weight, RPE, Rest-Timer, aktives Session-HUD, Volume-Berechnungen und atomare Speicherung.
- **Exercise Library & Filter:** 873 strukturierte Übungen durchsuchbar und filterbar nach Muskelgruppen und Equipment.
- **Trainingsprogramme & Vorlagen:** Strukturierte Pläne (GK, OK/UK, PPL, Arnold Split), Drag-and-Drop Sortierung und Session-Zuordnung.
- **Workout History & PR-Tracking:** Detaillierte Verlaufsansicht mit e1RM-Tracking und Highlight-Badges.
- **Measurements & Charts:** Körperdaten, Gewichtshistorie und Verlaufsgrafiken.
- **Achievements & Gamification:** 10-stufiges Levelsystem bis EVARO Master und Season 1: Ascend.
- **Theme- & Colorway-System:** Vollständige Unterstützung für Interface-Farben inklusive `EVARO Verde` und `EVARO Ember`.
- **AI Coach (Entwicklungsmodus):** Lokaler Proxy-Server mit OpenRouter-Anbindung, PubMed-Forschungsvalidierung und Zod-Planvalidierung.
- **EVARO Branding Harmonization:** Repositoryweite Vereinheitlichung aller sichtbaren Markenbezeichnungen (App-Name in `app.json`, Persona, Chips, Gamification, Share-Signaturen).
- **Release-Dokumentation & Architektur-Karten:**
  - `docs/release/ACCOUNT_DATA_MAP.md`
  - `docs/release/EXERCISE_ASSET_INVENTORY.md`
  - `docs/release/AUDIO_HAPTICS_AUDIT.md`
  - `docs/release/SUBSCRIPTION_INTEGRATION_MAP.md`
  - `docs/release/EXECUTION_STATUS.md`
  - `docs/release/ASTRA_HANDOFF.md`
  - `docs/release/GEMINI_WORK_SUMMARY.md`
  - `evaro_release_execution_pack/MASTER_CHECKLIST.md`
- **Repository Cleanup:** Bereinigung ungenutzter Dependencies (`@opentelemetry/api`), Überprüfung der Git-Hygiene, strikte Rückwärtskompatibilität für alle gespeicherten Nutzerdaten.

---

## Technisch verifiziert

- **Typecheck:** PASS (`tsc --noEmit` über `packages/domain`, `packages/ui`, `apps/mobile` – 0 Fehler)
- **Lint:** PASS (`eslint` über alle Pakete – 0 Fehler, 0 Warnungen)
- **Tests:** PASS (**315 / 315 Tests grün**)
  - Domain: 57 / 57 PASS (Vitest)
  - Mobile: 240 / 240 PASS (Jest, 50 Testsuites)
  - Coach API: 18 / 18 PASS (Node Test Runner)
- **Coach Check:** PASS (`pnpm coach:check` – Modell und API-Key bestätigt)
- **Build/Bundle Check:** PASS (TypeScript und Metro-Bundle verifiziert)
- **Physical Device:** NOT VERIFIED ON PHYSICAL DEVICE (lokale Windows-Entwicklungsumgebung ohne native iOS/Android-Signatur-Credentials)

---

## Bekannte offene P0-Themen

1. **P0-01 (Lizenz/Assets):** 1.492 Übungs-GIFs werden via Hotlink von `static.exercisedb.dev` geladen; Klärung der kommerziellen Lizenz bzw. Ersatz durch eigene Vektoren erforderlich (`BLOCKED`).
2. **P0-02 (Backend-Sicherheit & AI-Kosten):** Coach-Backend läuft aktuell als lokaler Node-Server; benötigt öffentliches HTTPS-Deployment, verteiltes Rate-Limiting und serverseitigen Entitlement-Check (`READY_FOR_ASTRA`).
3. **P0-03 (Store-Compliance):** Kaskadierende Cloud-Account-Löschung gemäß Apple Guideline 5.1.1(v) fehlt serverseitig (`READY_FOR_ASTRA`).
4. **P0-04 (Monetarisierung):** RevenueCat SDK und Store-Produkte (Monat/Jahr) müssen integriert werden (`READY_FOR_ASTRA`).
5. **P0-05 (Native Rest-Timer Audio):** Web Audio API synthese in `timerAudio.ts` schlägt auf nativen Geräten fehl; Umstellung auf `expo-av` vorbereitet (`READY_FOR_ASTRA`).

---

## Noch nicht enthalten

- Production In-App Subscriptions (RevenueCat / StoreKit 2 / Google Play Billing)
- Finale serverseitige Account-Löschung (Supabase RPC)
- Sichere Keychain-/Keystore-Token-Speicherung (SecureStore)
- Store Production Setup & EAS Credentials
- Production HTTPS AI Backend mit Distributed Rate Limiting
- Finale rechtliche Datenschutz- und Art.-9-DSGVO-Freigaben
- Vollständige End-to-End-Qualitätssicherung auf physischen iOS-/Android-Geräten

---

## Safe Return Point

- **Git Tag:** `v0.1.0-beta.1`
- **Commit:** `4cc3303` (bzw. finaler Sync-Commit)
- **Zweck:** Garantierter, voll funktionsfähiger Rückkehrpunkt vor allen anstehenden Architektur-, Sicherheits- und Store-Umbauten.
