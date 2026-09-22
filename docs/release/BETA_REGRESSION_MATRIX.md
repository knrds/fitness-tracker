# EVARO – Beta Regression Suite & Quality Assurance Matrix
## Kostenloser iPhone-Testpfad — 20.09.2026

Ausführung und Environment-Matrix: [IPHONE_FREE_TEST_GUIDE](IPHONE_FREE_TEST_GUIDE.md). Lokaler WLAN-Server ist statisch und providerfrei; nur erfundene Gastdaten über HTTP. HTTPS-/Auth-/Cloud-Abnahme erst mit separatem Staging und erfüllten Gates. SDK 54 bleibt bestehen. Manifest/Home-Screen-Metadaten sind keine Offline-/Native-Garantie.

| Bereich | Test Surface | Status / Erwartung |
|---|---|---|
| Onboarding, Navigation, Profile, History, Programs/Templates, Measurements, Settings, DE/EN | WEB_IPHONE, AUTOMATED | WEB_TESTABLE; manuelle Schritte A–D im Guide, echter Safari-Durchgang noch offen |
| Keyboard, Safe Areas, Modals, Scrolling, Orientation, Accessibility | WEB_IPHONE | PHYSICAL_DEVICE_REQUIRED für Aussage zum echten iPhone |
| Browser-Offline/Reload/Origin-Wechsel | WEB_IPHONE, AUTOMATED | PARTIALLY_WEB_TESTABLE; kein Service Worker/garantierter Offline-Kaltstart |
| Auth, Logout, Accountwechsel, Sessionablauf | WEB_IPHONE, SUPABASE, AUTOMATED | PARTIALLY_WEB_TESTABLE nach HTTPS-Staging-Provisioning |
| Sync/Retry/Ownership | SUPABASE, BACKEND, AUTOMATED, WEB_IPHONE | PARTIAL; lokale SQLite-Faults geprüft, Cloud-Konflikte offen |
| RLS und Migrations-Preflight | BACKEND, SUPABASE | Lokaler PostgreSQL-Harness VERIFIED; Supabase JWT/PostgREST offen |
| Coach-UI, Fehlerzustände | WEB_IPHONE, AUTOMATED, BACKEND | UI ohne Providerkosten testbar; kein Fake-Providererfolg |
| SecureStore/Keychain, native SQLite, OS-Backup/Kill/Haptik/Permissions | IOS_NATIVE, ANDROID_NATIVE | NATIVE_REQUIRED + PHYSICAL_DEVICE_REQUIRED |
| StoreKit, RevenueCat, Push, native OTA/Deep Links | IOS_NATIVE, ANDROID_NATIVE, BACKEND | PREPARED/offene Native-Gates; nicht durch Safari abgenommen |
| Signierter iPhone-Build/TestFlight im EAS-Workflow | IOS_NATIVE | APPLE_DEVELOPER_REQUIRED |

## Aktuelle Abnahme pro freizugebendem Block — 20.09.2026

Die historischen Vollständigkeitsbehauptungen unten ersetzen keine aktuelle Geräte-/Cloud-Abnahme. Pro Block Testbuild/Commit, Gerät/OS, Testkonto, Ergebnis und beobachtete Abweichung festhalten. Keine echten Gesundheitsdaten für Fehlerprovokation verwenden. Gleiche App-Identität beim Upgrade erhalten; vor Migration lokalen Export sichern (kein vollständiges Cloud-Backup).

| Block | Schritte auf dem zugehörigen Testbuild | Erwartetes Ergebnis | Offenes Gate |
|---|---|---|---|
| Sync / Offline-Warteschlange | Mit Testkonto online anmelden; Flugmodus aktivieren; kurzes Workout mit zwei unterscheidbaren Sätzen abschließen und eine Messung speichern; App vollständig schließen und neu öffnen; Werte prüfen; Netzwerk aktivieren und Sync-Indikator antippen; erneut öffnen | Verlauf/Sätze/Messung bleiben vorhanden, Warteschlange bleibt offline sichtbar und wird erst nach erfolgreicher Übertragung leer; keine doppelte lokale Session | iPhone und Android; Cloud-Bestand separat mit Testkonto prüfen, zweites Gerät ausschließlich lesend während dieses Tests |
| Sync / Cloud-Fehler | Auf isolierter Testumgebung Netzwerk beim Übertragen unterbrechen; anschließend neu verbinden und erneut synchronisieren | Offene Operationen bleiben erhalten, Fehler statt Fake-Erfolg; erfolgreicher Retry. Dieser manuelle Test beweist keinen SQLite-Schreibfehler | SQLite-Faults automatisiert mit echter DB geprüft; echte Supabase-/Prozessabbruch-Abnahme offen |
| Native Session-Migration | Alte Beta mit Testkonto anmelden und bekannte lokale Daten anlegen; kompatiblen neuen nativen Build darüber installieren; starten, App beenden, Gerät neu starten, wieder öffnen; Logout und Neustart | Daten bleiben vorhanden; gültige Session möglichst erhalten; nach erfolgreichem Logout kein altes Login wiederhergestellt. Fehler dürfen weder Datenreset noch versteckten Gastwechsel erzeugen | Vor breiter Beta auf beiden Plattformen, große Sessionwerte und Backup/Restore separat; kein blindes OTA und kein MMKV-only-Downgrade |
| Öffentlicher Coach-Auth-Fix | In isolierter öffentlicher Testbereitstellung ohne Anmeldung anfragen, dann mit gültigem Testkonto; ungültigen Token nur im API-Test verwenden | Ohne gültige Authentifizierung 401 und kein Provideraufruf; angemeldet reguläre Verarbeitung oder ehrlicher Providerfehler | Öffentlicher HTTPS-Endpoint/Providerzugang; kostenpflichtige Providerantwort nicht durch lokale Mocks bewiesen |
| Plans Create Modal (i18n) | Im Pläne-Tab auf '+' tippen (DE und EN) | Keine raw Translation Keys sichtbar; korrekte Titel und Beschreibungen | Automatisiert in `plansCreateModal.test.ts` abgedeckt; Safari-Sichtprüfung |
| Celebrations UI (i18n) | In Einstellungen -> Erscheinungsbild -> Celebrations öffnen (DE und EN) | Titel, Untertitel, Effektnamen und Alerts vollständig übersetzt | Automatisiert in `AppearanceSettings.test.tsx` abgedeckt; Safari-Sichtprüfung |
| Level / Rang Anzeige (i18n) | Profil / Rank / BattlePass öffnen (DE und EN) | 'bis Level' / 'to Level', 'Nächster Rank bei Level' / 'Next rank at Level' sauber lokalisiert | Automatisiert in `LevelProgressI18n.test.tsx` abgedeckt; Safari-Sichtprüfung |
| Profile Geburtsdatum UI | Profil-Tab öffnen | 'Jahre / years' Schriftzug über dem Geburtsdatum-Eintrag restlos entfernt; saubere Datumsangabe | Automatisiert via Typcheck/Profile-Tests; visuelle Safari-Prüfung |
| XP / Level Rebalancing | Vorherigen XP/Levelstand notieren, 1 normales Workout absolvieren | Kein Sprung über mehrere frühe Level (L1->2 erfordert 410 XP [~2.9 Workouts]; Workout liefert ~120-160 XP, max Cap 265 XP); Idempotenz-Schutz | Automatisiert in `levelProgression.test.ts` und `achievementStore.test.ts` |
| Barrierefreiheit / VoiceOver | VoiceOver / Screenreader aktivieren; RestTimer, AnatomyFigure, Session-Collapse und BattlePass bedienen | Alle interaktiven Buttons haben `accessibilityRole="button"`, präzise Labels, verständliche Werte/Zustände und Mindest-Touch-Targets $\ge 44 \times 44$\,pt | Automatisiert in `accessibilityAudit.test.tsx` (6/6 PASS); physische iPhone VoiceOver Abnahme |
| S4 Sync Failure Resilienz | Testsuite `syncFailureScenarios.test.ts` ausführen | 17/17 Szenarien PASS (Timeouts, Abbrüche, Partielle Antworten, Stale Snapshots, Tenant-Isolation, Outbox-FIFO) | Automatisiert (17 Tests PASS); serverseitige Transaktionen bleiben `ASTRA_REQUIRED` |
| Supply Chain Overrides | `pnpm audit --audit-level high` ausführen | 41 von 43 High Findings behoben; nur noch 2 Build-Tool Befunde in `image-size` 1.2.1 | `pnpm-workspace.yaml` Overrides; `EXPO_SDK_UPGRADE_REQUIRED` |
| S5 Account Deletion Contract | Testsuite `accountDeletionContract.test.ts` ausführen | 13/13 Tests PASS (Server leitet `auth.uid()` ab, kein Client-IDOR, Idempotenz, Zero Data Loss lokal bei Remote-Fehler) | Automatisiert (13 Tests PASS); Supabase RPC-Deployment bleibt `ASTRA_REQUIRED` |
| AI Safety Notfall DE/EN | Im Coach Notfallsätze eingeben: "Ich habe starke Brustschmerzen" bzw. "I have severe chest pain" | Sofortige deterministische Notfallanzeige mit Notruf 112 / 911 ohne LLM-Kosten oder Provideraufruf | Automatisiert in `coach-safety.test.cjs` (49/49 Tests PASS); Web-Preview Sichtprüfung |
| Onboarding State Machine & Value Reveal | Flow durchlaufen (Experience, Goals, Frequency, Equipment, Split, Physical, Value Reveal) | Determinische Empfehlung (z. B. Hypertrophie + 4 Tage -> Upper/Lower), fehlerhafte Schritte blockieren Navigation, vollständiger Kaltstart stellt validierten Zustand wieder her | Automatisiert in `onboardingLogic.test.ts` & `onboardingStore.test.ts` (14/14 PASS); Web-Preview / iPhone Safari |
| 3-Tier Monetization & Capabilities | Capabilities abfragen (`canUseRPE()`, `canCreateTemplate()`, `canUseCoachPlan()`), Paywall Context wechseln ('pro' vs 'coach') | FREE blockiert RPE/RIR Eingabe; 3. Template öffnet Pro Paywall; Coach Plan erfordert Coach Paywall; 0 Gesundheitsdaten in Telemetrie | Automatisiert in `entitlements.test.ts`, `entitlementService.test.ts`, `paywallCompliance.test.ts`, `monetizationAnalytics.test.ts`, `LockedFeatureModal.test.tsx` (43/43 PASS) |
| Monetization Action Guards & Downgrade Preservation | Testsuite `monetizationGating.test.ts` ausführen | 12/12 Szenarien PASS: Free Template Limit (1&2 ok, 3 blockiert, Default-Templates geschützt), Downgrade von 8 Templates belässt alle erhalten und 2 älteste editierbar; Program-Gating fail-closed; RPE/RIR & Body Metrics Sanitization fail-closed mit Historienerhalt; Appearance Revert & Restore; Coach Quota & AI Write Confirmation Guard | Automatisiert in `monetizationGating.test.ts` (12 Tests PASS); StoreKit / RevenueCat & Server Quota Ledger bleiben `ASTRA_REQUIRED` |
| RLS-Migration | Maintainer führt den lokalen SQL-Harness aus; danach kontrollierte Supabase-Staging-Abnahme mit zwei Testkonten und anonymem Client | Kein Lesen/Schreiben fremder Daten/Referenzen; fehlerhafter Altbestand stoppt Migration ohne Löschung | Keine Aktion normaler Betatester; kein Production-Apply allein aufgrund des lokalen Tests |

Main-Integration ist vom Nutzer für abgeschlossene geeignete Blöcke autorisiert. Merge ist nicht gleich Auslieferung. Repository enthält Vercel-Konfiguration und manuelle EAS-Buildprofile, aber der aktive Hosting-Production-Branch/Updatekanal ist nicht verifiziert. Vor Main-Push den tatsächlichen Auslieferungsweg und erforderliche Checks bestätigen; Sicherheits-Gates nicht abschwächen. Aktuell keine pauschale Freigabe der gesamten astra/p0-release-core-Branch.


**Version:** 1.0.0  
**Baseline:** `v0.1.0-beta.5`  
**Datum:** 16. September 2026  
**Status:** ACTIVE REGRESSION BASELINE  
**Autor:** Antigravity (Gemini Implementation Agent)  
**Zielgruppe:** Astra, QA Engineers, Core Maintainers  

---

## 1. Regression Matrix Overview

Diese Matrix schützt alle Kernfunktionen sowie die spezifisch in den letzten Zyklen stabilisierten UI- und Interaktions-Fixes vor Regressionen während der kommenden Astra-Entwicklungsblöcke.

Alle Einträge sind entweder durch **automatisierte Unit-/Integrationstests** (`pnpm test`) abgedeckt oder als deterministische **Manual Verification Scenarios** für Device-QA definiert.

---

## 2. Kritische Kernbereiche & Testzuordnung

| Bereich | Feature / User Flow | Kritische Erwartung | Automatisierter Testpfad | Manual Verification Case |
|---|---|---|---|---|
| **Auth** | Sign Up & Sign In | Formularvalidierung, JWT Session Persistence, Fehleranzeige | `apps/mobile/src/stores/__tests__/authStore.test.ts` | Test auf echtem Gerät mit Offline-Modus |
| **Auth** | Guest Mode | Lokale MMKV/SQLite-Nutzung ohne Zwang zu Account | `apps/mobile/src/stores/__tests__/authStore.test.ts` | Gast-Modus starten, App schließen, Daten prüfen |
| **Workout** | Live Workout Lifecycle | Starten, Pausieren, Beenden, Session Persistenz bei Crash | `apps/mobile/src/stores/__tests__/workoutStore.test.ts`<br>`apps/mobile/src/stores/__tests__/workoutPersistence.test.ts` | Aktives Workout starten, App via iOS App Switcher killen, neu öffnen |
| **Set Logging** | Satz hinzufügen & abhaken | Set-Zählung (Warmup, Working, Drop, Failure), Checkbox Toggle | `apps/mobile/src/stores/__tests__/workoutStore.test.ts` | Checkbox antippen -> Haptisches Feedback |
| **Set Logging** | RPE Tracking | 3-Punkte-Menü öffnet RPE-Picker (6.0 - 10.0 in 0.5er Schritten) | `apps/mobile/src/components/workout/__tests__/SessionExerciseCardSetOptions.test.tsx` | Drei-Punkte-Button antippen -> Dialog erscheint |
| **Set Logging** | RIR Tracking | 3-Punkte-Menü öffnet RIR-Picker (0, 1, 2, 3, 4+) | `apps/mobile/src/components/workout/__tests__/SessionExerciseCardSetOptions.test.tsx` | Drei-Punkte-Button antippen -> RIR auswählen |
| **Set Delete** | Swipe-to-Delete Satz | Horizontaler Wisch nach links deckt roten Lösch-Button auf | `apps/mobile/src/utils/__tests__/setSwipe.test.ts` | Wischgeste auf Satzzeile -> Satz wird entfernt |
| **Workout UI** | Exercise Collapse | Einklappen/Ausklappen einzelner Übungskarten im Workout | `apps/mobile/src/components/workout/__tests__/workoutCollapse.test.tsx`<br>`apps/mobile/src/components/workout/__tests__/SessionExerciseCardCollapse.test.tsx` | Übungstitel antippen -> Karte klappt animiert zu |
| **Rest Timer** | Rest Timer Swipe Gesture | Wisch nach oben: +30s; Wisch nach unten: -15s; Wisch links: Skip | `apps/mobile/src/utils/__tests__/timerSwipe.test.ts`<br>`apps/mobile/src/components/workout/__tests__/RestTimerGestures.test.tsx`<br>`apps/mobile/src/components/workout/__tests__/RestTimer.test.tsx` | Floating Timer nach oben/unten wischen |
| **History** | Workout History | Historienanzeige, PR-Extraktion, Kalender, Sortierung nach Datum | `apps/mobile/src/stores/__tests__/historyStore.test.ts`<br>`apps/mobile/src/utils/__tests__/bigThree.test.ts` | Historien-Tab aufrufen -> korrekte Sätze und PRs |
| **Measurements** | Body Metrics | Gewicht, KFA, Umfänge, metrische/imperiale Konvertierung | `apps/mobile/src/stores/__tests__/bodyMetricStore.test.ts`<br>`apps/mobile/src/utils/__tests__/decimalInput.test.ts` | Neue Wiegung eintragen mit Komma (`82,5`) |
| **Programs** | Trainingspläne | Pläne erstellen, Tage zuweisen, Reorder-Gesten | `apps/mobile/src/stores/__tests__/programStore.test.ts`<br>`apps/mobile/src/hooks/__tests__/useFolderTemplateReorder.test.ts`<br>`apps/mobile/src/hooks/__tests__/useMeasuredReorder.test.ts` | Workout-Template per Drag & Drop verschieben |
| **Exercises** | Katalog & Custom Exercises | Suche, Muskelgruppen-Filter, Equipment-Filter, eigene Übungen | `apps/mobile/src/stores/__tests__/exerciseStore.test.ts`<br>`apps/mobile/src/utils/__tests__/exerciseSearch.test.ts` | Suche nach "Bankdrücken" -> Treffer |
| **Themes** | EVARO Colorways | Dark Mode, Neon Lime, Cyber Cyan, Crimson Pulse, Minimalist Monochrom | `packages/ui` Design Token Tests | Theme in Profile/Settings wechseln -> sofortiges UI-Update |
| **Achievements** | Gamification & Level | XP-Berechnung, Level-Aufstieg, Streaks, Abzeichen | `apps/mobile/src/stores/__tests__/achievementStore.test.ts`<br>`apps/mobile/src/utils/__tests__/rewards.test.ts`<br>`apps/mobile/src/utils/__tests__/level.test.ts` | Workout abschließen -> Level-Fortschrittsbalken wächst |
| **AI Coach** | Coach Chat & Safety | Trainingsberatung, Form-Tipps, medizinische Notfall-Eskalation | `api/coach-chat.test.cjs`<br>`api/coach-safety.test.cjs`<br>`apps/mobile/src/stores/__tests__/coachStore.test.ts`<br>`apps/mobile/src/utils/__tests__/coachApi.test.ts` | Nachricht "Ich habe Schmerzen in der Brust" -> Emergency |
| **Data Export** | DSGVO Datenexport | Vollständiger JSON-Export aller lokalen Datenstrukturen | `apps/mobile/src/services/__tests__/dataExportService.test.ts` | *Profil -> Daten exportieren* -> valider JSON-String |
| **Settings** | Einstellungen | Einheiten (kg/lb, cm/in), Haptik, Audio-Sounds | `apps/mobile/src/stores/__tests__/profileStore.test.ts` | Toggles umschalten -> State bleibt nach App-Neustart |
| **Languages** | Mehrsprachigkeit (DE & EN) | 100% konsistente Übersetzungen ohne gemischte Sprachen | `apps/mobile/src/i18n/__tests__/i18n.test.ts` | Sprache umschalten -> alle Labels aktualisieren sich |
| **Accessibility**| Barrierefreiheit & Reduced Motion | `prefers-reduced-motion` respektiert, Screenreader Labels | Automatisierte Accessibility Props in UI-Komponenten | iOS Barrierefreiheit: "Bewegung reduzieren" aktivieren |

---

## 3. Explizit geschützte UI-Fixes der jüngsten Iterationen

Folgende spezifische Fehlerbehebungen und UX-Optimierungen dürfen von Astra nicht regressiert oder unbemerkt rückgängig gemacht werden:

### 1. RPE/RIR Three-Dot Visibility
* **Problemstellung:** In früheren Versionen war das Kontextmenü für RPE/RIR auf schmalen Bildschirmen (z.B. iPhone SE) abgeschnitten oder unsichtbar.
* **Soll-Zustand:** Der Drei-Punkte-Button (`SessionExerciseCardSetOptions`) ist für jeden Satz dauerhaft erreichbar und öffnet das Modal unabhängig von Spaltenbreiten.
* **Testabsicherung:** `SessionExerciseCardSetOptions.test.tsx` (Test: *"renders 3-dot trigger button for every set row"*).

### 2. Swipe Delete auf Satz- und Übungsebene
* **Problemstellung:** Beim Wischen konnte es zu versehentlichem horizontalem Scrollen oder ruckelnder Listenanimation kommen.
* **Soll-Zustand:** Horizontale Wischgeste ist richtungsstabil, deckt den roten Papierkorb auf und löscht den Satz erst nach bewusstem Klick oder Schwellenwert-Swipe.
* **Testabsicherung:** `setSwipe.test.ts`.

### 3. Rest Timer Gestures (Swipe Up / Down / Left)
* **Problemstellung:** Timer war rein statisch oder nur über kleine Buttons bedienbar.
* **Soll-Zustand:** Wischgesten auf dem RestTimer-Overlay passen Zeit präzise an (+30s aufwärts, -15s abwärts, Schließen/Skip nach links).
* **Testabsicherung:** `RestTimerGestures.test.tsx` und `timerSwipe.test.ts`.

### 4. Workout Card Collapse Animation
* **Problemstellung:** Einklappen von Übungskarten blockierte den Hauptthread bei langen Workouts mit vielen Sätzen.
* **Soll-Zustand:** Die Animation nutzt Reanimated / LayoutAnimation mit optimierter Render-Pipeline, sodass die Framerate flüssig bleibt.
* **Testabsicherung:** `workoutCollapse.test.tsx` und `SessionExerciseCardCollapse.test.tsx`.

### 5. EVARO Colorway Theming System
* **Problemstellung:** Hartkodierte Hex-Codes führten zu unleserlichen Kontrasten in einzelnen Screens.
* **Soll-Zustand:** Alle Komponenten referenzieren strikt `theme.colors.*` (`primary`, `background`, `surface`, `border`, `text`, `muted`).
* **Testabsicherung:** `useTheme()` / `useThemeStyles()` Typechecks und UI Token Definitionen.

### 6. Vollständige deutsche Lokalisierung
* **Problemstellung:** Denglische Wortkombinationen wie *"Set gelöscht successfully"* oder fehlende Umlaute.
* **Soll-Zustand:** Alle Strings laufen über `t(...)` mit vollständigem Key-Paritätsabgleich zwischen DE und EN.
* **Testabsicherung:** `i18n.test.ts`.

### 7. Haptics & Audio Setting Toggles
* **Problemstellung:** Haptik und Sound liefen auch dann, wenn der Nutzer sie in den Einstellungen deaktiviert hatte.
* **Soll-Zustand:** `hapticsEnabled` und `soundEnabled` in `profileStore` werden vor jedem Vibrations- oder Audio-Aufruf (`expo-haptics`, `expo-av`) geprüft.
* **Testabsicherung:** Unit Tests für Store-Settings und Event-Guards.

---

## 4. Automatisierte Ausführung der Regressionssuite

Vor jedem Release-Zweig oder Meilenstein-Merge muss die vollständige Suite lokal ausgeführt werden:

```bash
# 1. Typecheck (Zero Errors)
pnpm typecheck

# 2. Lint (Zero Warnings)
pnpm lint

# 3. Unit- und Integrationstests (Alle 447 Tests müssen grün sein)
pnpm test

# 4. AI Coach Preflight & Safety Test
pnpm coach:check

# 5. Production Web Bundle
pnpm build
```
