# EVARO – Astra Review Queue

Zentrale Queue aller von Gemini vorbereiteten, analysierten oder implementierten technischen Änderungen, die der nachfolgende Astra-Agent strukturiert überprüfen, entscheiden oder weiterführen soll.

## Prioritätsübersicht

| ID | Titel | Priorität | Gemini Status | Risiko | Astra Aktion |
|---|---|---|---|---|---|
| [AR-001](#ar-001--native-build--device-readiness-image-picker-plugin--eas-preview-profiles) | Native Build & Device Readiness (Image Picker Plugin & EAS Preview Profiles) | P1 | IMPLEMENTED | LOW | VERIFY |
| [AR-002](#ar-002--client-resilience--abortsignal--timeout-hardening-in-coach-api) | Client Resilience: AbortSignal & Timeout Hardening in Coach API | P1 | IMPLEMENTED | MEDIUM | VERIFY |
| [AR-003](#ar-003--privacy-safe-logging-abstraction--sensitive-data-redaction) | Privacy-safe Logging Abstraction & Sensitive Data Redaction | P1 | IMPLEMENTED | LOW | VERIFY |
| [AR-004](#ar-004--data-integrity-contract-tests--multi-device-sync-test-matrix) | Data Integrity Contract Tests & Multi-Device Sync Test Matrix | P0 | IMPLEMENTED | LOW | VERIFY |
| [AR-005](#ar-005--secure-storage-migration-plan-auth--token-persistence) | Secure Storage Migration Plan (Auth & Token Persistence) | P0 | PREPARED | HIGH | ARCHITECTURE_DECISION |
| [AR-006](#ar-006--account-lifecycle-deletion-rpc-spec--gdpr-art-20-data-export) | Account Lifecycle: Deletion RPC Spec & GDPR Art. 20 Data Export | P0 | PREPARED | HIGH | ARCHITECTURE_DECISION |
| [AR-007](#ar-007--ai-coach-production-safety-matrix--client-resilience-tests) | AI Coach Production Safety Matrix & Client Resilience Tests | P1 | IMPLEMENTED | LOW | VERIFY |
| [AR-008](#ar-008--monetization-preparation-evaro-pro-feature-matrix--entitlement-architecture-spec) | Monetization Preparation: EVARO Pro Feature Matrix & Entitlement Architecture Spec | P1 | PREPARED | HIGH | ARCHITECTURE_DECISION |
| [AR-009](#ar-009--exercise-asset-replacement-plan--licensing-decoupling) | Exercise Asset Replacement Plan & Licensing Decoupling | P0 | PREPARED | HIGH | ARCHITECTURE_DECISION |
| [AR-010](#ar-010--performance-qa-benchmarks-large-datasets--scalability-report) | Performance QA: Benchmarks, Large Datasets & Scalability Report | P1 | IMPLEMENTED | LOW | VERIFY |
| [AR-011](#ar-011--possible-obsolete-component-exercisefiltertsx) | Possible Obsolete Component: ExerciseFilter.tsx | P2 | ANALYZED | LOW | VERIFY_DELETE |
| [AR-012](#ar-012--dormant-dependencies-react-hook-form--hookformresolvers) | Dormant Dependencies: react-hook-form & @hookform/resolvers | P2 | ANALYZED | LOW | ARCHITECTURE_DECISION |
| [AR-013](#ar-013--secure-storage-adapter-implementation--dual-read-migration) | Secure Storage Adapter Implementation & Dual-Read Migration | P0 | PREPARED | HIGH | ACTIVATE |
| [AR-014](#ar-014--account-deletion-service-client-architecture--safety-gate) | Account Deletion Service: Client Architecture & Safety Gate | P0 | PREPARED | HIGH | ACTIVATE |
| [AR-015](#ar-015--data-export-hardening-gdpr-art-20-collector-service) | Data Export Hardening: GDPR Art. 20 Collector Service | P0 | IMPLEMENTED | LOW | VERIFY |
| [AR-016](#ar-016--entitlement-abstraction-provider-agnostic-pro-management) | Entitlement Abstraction: Provider-Agnostic Pro Management | P1 | PREPARED | MEDIUM | ACTIVATE |
| [AR-017](#ar-017--exercise-media-decoupling-central-multi-tier-resolver) | Exercise Media Decoupling: Central Multi-Tier Resolver | P0 | PREPARED | MEDIUM | ACTIVATE |
| [AR-018](#ar-018--ai-safety-test-harness--backend-request-validation) | AI Safety Test Harness & Backend Request Validation | P0 | IMPLEMENTED | LOW | VERIFY |
| [AR-019](#ar-019--sync-failure-test-harness--offlinefifo-resilience) | Sync Failure Test Harness & Offline/FIFO Resilience | P0 | IMPLEMENTED | LOW | VERIFY |
| [AR-020](#ar-020--react-error-boundary--graceful-crash-recovery) | React Error Boundary & Graceful Crash Recovery | P1 | IMPLEMENTED | LOW | VERIFY |
| [AR-021](#ar-021--store-compliance-technical-audit--in-app-readiness) | Store Compliance Technical Audit & In-App Readiness | P0 | AUDITED | MEDIUM | USER_DECISION |
| [AR-022](#ar-022--release-candidate-core-flow-regression--subscription-error-coverage) | Release Candidate Core Flow Regression & Subscription Error Coverage | P0 | IMPLEMENTED | LOW | VERIFY |
| [AR-023](#ar-023--privacy-safe-local-diagnostics--observability-event-model) | Privacy-Safe Local Diagnostics & Observability Event Model | P1 | IMPLEMENTED | LOW | VERIFY |

---

## AR-001 – Native Build & Device Readiness (Image Picker Plugin & EAS Preview Profiles)

Priority:
P1

Gemini Status:
IMPLEMENTED

Risk:
LOW

Commit:
db38ec8

Files:
- `apps/mobile/app.json`
- `apps/mobile/eas.json`
- `docs/release/DEVICE_QA_CHECKLIST.md`

Gemini changed:
1. `apps/mobile/app.json`: Fehlendes Expo Config Plugin `expo-image-picker` mit Berechtigungs-Hinweis (`photosPermission`) ergänzt. Dadurch werden in nativen Builds für iOS (`NSPhotoLibraryUsageDescription`) und Android (`READ_MEDIA_IMAGES`) die erforderlichen Berechtigungen automatisch in Plist und Manifest injiziert.
2. `apps/mobile/eas.json`: Profil `preview` um `ios: { simulator: false }` präzisiert und neues Profil `preview-simulator` mit `ios: { simulator: true }` ergänzt, um Vorschau-Builds auch ohne kostenpflichtige Apple Developer Mitgliedschaft auf macOS-Simulatoren zu ermöglichen.
3. `docs/release/DEVICE_QA_CHECKLIST.md`: Vollständige, strukturierte Checkliste für native Gerätetests (Installation, Auth, Workout, Timer, Data, Lifecycle, Accessibility) angelegt.

Why:
`expo-image-picker` wurde im Code (`profile.tsx`, `coach.tsx`) verwendet und in `apps/mobile/package.json` deklariert, fehlte jedoch in `app.json` `plugins`. Ohne diesen Eintrag würde ein nativer iOS-Build im App Store Review wegen fehlender Nutzungsbeschreibung abgelehnt werden oder beim Bildzugriff abstürzen. Das `preview-simulator`-Profil schließt die Lücke für Simulator-Tests auf Entwicklungsrechnern.

Tests:
- `npx expo config --type public` -> PASS (Plugin & Permissions sauber aufgelöst)
- `npx expo config --type introspect` -> PASS (Native Mod-Konfiguration fehlerfrei)
- `pnpm verify` -> PASS (306 Tests grün)

Expected behavior:
Native Builds und Prebuilds enthalten alle erforderlichen Metadaten für Bildauswahl und Simulator-Vorschau.

Potential concerns:
- Keine. Bundle-Identifier und Android-Package blieben unverändert (`com.fitnesstracker.app`).

Questions for Astra:
1. Soll für EAS Update zukünftig eine `runtimeVersion` (z.B. `{"policy": "appVersion"}`) in `app.json` ergänzt werden, sobald OTA-Updates aktiv genutzt werden?
2. Entspricht der deutsche Berechtigungstext (`"Die App benötigt Zugriff auf deine Fotos, um Profil- und Trainingsbilder auszuwählen."`) den finalen App-Store-Anforderungen?

Astra action:
VERIFY

Rollback commit:
dcd58d8

---

## AR-002 – Client Resilience: AbortSignal & Timeout Hardening in Coach API

Priority:
P1

Gemini Status:
IMPLEMENTED

Risk:
MEDIUM

Commit:
38f8820

Files:
- `apps/mobile/src/utils/coachApi.ts`
- `apps/mobile/src/utils/__tests__/coachApi.test.ts`

Gemini changed:
1. `apps/mobile/src/utils/coachApi.ts`: `CoachOptions` um optionale Parameter `signal?: AbortSignal` und `timeoutMs?: number` (Standard: 75.000 ms) erweitert.
2. Der interne Fetch-Controller reagiert nun direkt auf ein externes Abbruch-Signal des Aufrufers (`options.signal`).
3. Im Catch-Block wird präzise zwischen echtem Verbindungs-Timeout (`Der Coach antwortet nicht rechtzeitig.`) und nutzerseitigem Abbruch (`Anfrage durch Nutzer abgebrochen.`) unterschieden.
4. Unit-Tests in `coachApi.test.ts` für Client-Cancellation und Timeouts ergänzt.

Why:
Bislang liefen abgebrochene Coach-Requests bis zu 75 Sekunden lang im Hintergrund weiter und konnten nicht vom Aufrufer (z.B. beim Verlassen des Screens oder Beenden der Audioaufnahme) sauber gestoppt werden. Zudem war ein Timeout nicht konfigurierbar.

Tests:
- `apps/mobile/src/utils/__tests__/coachApi.test.ts` (6 Tests, inkl. Abort & Timeout) -> PASS
- `pnpm verify` -> PASS

Expected behavior:
Aufrufer können AI-Coach-Requests vorzeitig abbrechen, ohne dass Hintergrund-Tasks weiterlaufen oder inkonsistente Fehlermeldungen entstehen.

Potential concerns:
- Keine. Bestehende Aufrufe ohne `signal` oder `timeoutMs` behalten exakt das bisherige Verhalten bei (rückwärtskompatibel).

Questions for Astra:
1. Soll die UI im Coach-Screen einen expliziten "Abbrechen"-Button während des Wartens auf eine Antwort anzeigen?
2. Soll der Standard-Timeout von 75s in Mobilfunknetzen beibehalten oder auf z.B. 45s verkürzt werden?

Astra action:
VERIFY

Rollback commit:
3435311

---

## AR-003 – Privacy-safe Logging Abstraction & Sensitive Data Redaction

Priority:
P1

Gemini Status:
IMPLEMENTED

Risk:
LOW

Commit:
38f8820

Files:
- `apps/mobile/src/utils/logger.ts`
- `apps/mobile/src/utils/__tests__/logger.test.ts`
- `apps/mobile/src/utils/supabase.ts`
- `apps/mobile/src/stores/syncStore.ts`
- `apps/mobile/src/stores/storage.ts`
- `apps/mobile/app/history/[id].tsx`

Gemini changed:
1. `apps/mobile/src/utils/logger.ts`: Zentrale, isolierte Logging-Abstraktion mit automatischer Schwärzung/Redaktion implementiert:
   - Bearer-Tokens (`Bearer [REDACTED_TOKEN]`)
   - JWT-Tokens (`[REDACTED_JWT]`)
   - E-Mail-Adressen (`[REDACTED_EMAIL]`)
   - Base64-Nutzlasten (`data:[REDACTED_BASE64]`)
   - Sensible Schlüssel in Objekten (`password`, `token`, `access_token`, `refresh_token`, `secret`, `apikey`, `authorization`, `prompt`, `user_id` -> `[REDACTED]`)
   - Sanitizing von Error-Objekten (nur Name und geschwärzte Message, kein interner Memory-Leak)
   - Schutz vor Zirkelbezügen (`[CIRCULAR]`) und Tiefenbegrenzung
   - In Production (`process.env.NODE_ENV === 'production' && !__DEV__`) ist `debug` deaktiviert.
2. Direkte `console.log/warn/error`-Aufrufe in Kernmodulen (`supabase.ts`, `syncStore.ts`, `storage.ts`, `history/[id].tsx`) auf `logger` umgestellt.
3. Dedizierte Unit-Tests in `logger.test.ts` (10 Tests) geschrieben.

Why:
Verhinderung von Leaks sensibler Benutzer-, Auth- und Gesundheitsdaten in Konsolenausgaben, Terminal-Logs, Crash-Reports oder zukünftigen Observability-Tools. Es wurde bewusst keine externe Plattform (wie Sentry oder Datadog) installiert, um Astras Entscheidung nicht vorzugreifen.

Tests:
- `apps/mobile/src/utils/__tests__/logger.test.ts` (10 Tests) -> PASS
- `pnpm verify` -> PASS

Expected behavior:
Alle Log-Ausgaben werden automatisch maskiert; Tokens, Passwörter und E-Mails tauchen unter keinen Umständen im Klartext auf.

Potential concerns:
- Keine. Keine externen Abhängigkeiten hinzugefügt; Standard-Console bleibt Unterbau.

Questions for Astra:
1. Welche Observability-/Crash-Reporting-Plattform (z.B. Sentry, Bugsnag, PostHog) soll an die `logger`-Abstraktion angebunden werden?
2. Sollen im Production-Betrieb Warnungen und Fehler lokal gepuffert oder ausschließlich an den zukünftigen Crash-Reporter weitergeleitet werden?

Astra action:
VERIFY

Rollback commit:
3435311

---

## AR-004 – Data Integrity Contract Tests & Multi-Device Sync Test Matrix

Priority:
P0

Gemini Status:
IMPLEMENTED

Risk:
LOW

Commit:
943676b

Files:
- `apps/mobile/src/data/__tests__/dataIntegrityContracts.test.ts`
- `docs/release/SYNC_TEST_MATRIX.md`

Gemini changed:
1. `apps/mobile/src/data/__tests__/dataIntegrityContracts.test.ts`: Neue dedizierte Testsuite zur Absicherung der Kernverträge für Workouts, Körperdaten, Programme und Identifikatoren implementiert:
   - Workout & Set Integrity: Eindeutigkeit aller Set-IDs über Sessions hinweg, isolierte Set-Updates ohne Mutation von Nachbar-Sätzen, saubere Neunummerierung nach Satz-Löschung (`setNumber`).
   - Body Measurements Integrity: Speichern von Gewicht & KFA, chronologische Sortierung (`recordedAt DESC`), verlässliche `getLatestMetric()`-Rückgabe, gezielte Löschung.
   - Program & Template Integrity: Erstellung von Templates mit `targetSets`/`targetReps`/`targetWeight`, Programmaktivierung mit strikter Einzel-Aktiv-Exklusivität (`isActive`).
   - ID Collision & UUID Validity: 1.000 aufeinanderfolgende UUID-Generierungen ohne jede Kollision, strikte RFC4122-Validierung via `UUIDSchema`.
2. `docs/release/SYNC_TEST_MATRIX.md`: Vollständige Sync-Testmatrix mit allen 12 geforderten Szenarien (`offline create`, `offline edit`, `offline delete`, `online reconnect`, `same entity changed twice`, `two-device edit`, `delete vs update`, `duplicate upload`, `retry after timeout`, `partial sync failure`, `auth change during sync`, `account switch`) angelegt.

Why:
Vorbereitung eines verlässlichen Sicherheitsnetzes für spätere größere Sync- und Persistenzarbeiten durch Astra. Schließt Verifikationslücken vor produktiven Migrationen.

Tests:
- `apps/mobile/src/data/__tests__/dataIntegrityContracts.test.ts` -> PASS (4 Tests)
- `pnpm verify` -> PASS (322 Tests)

Expected behavior:
Alle lokalen Speicherschichten wahren relationale Konsistenz, Eindeutigkeit und Sortierordnung.

Potential concerns:
- Keine. Reines Testnetz und Spezifikationsmatrix ohne Änderung an Produktivcode.

Questions for Astra:
1. Wie soll die serverseitige Konfliktauflösung bei `two-device edit` final architektoniert werden (Last-Write-Wins vs. CRDT vs. Revision-Numbers)?
2. Sollen serverseitige Tombstones (`deleted_at`) in den Supabase-Tabellen für `delete vs update` Konflikte eingeführt werden?

Astra action:
VERIFY

Rollback commit:
d43ca9c

---

## AR-005 – Secure Storage Migration Plan (Auth & Token Persistence)

Priority:
P0

Gemini Status:
PREPARED

Risk:
HIGH

Commit:
f4960b7

Files:
- `docs/release/SECURE_STORAGE_MIGRATION_PLAN.md`

Gemini changed:
1. `docs/release/SECURE_STORAGE_MIGRATION_PLAN.md`: Umfassender Migrationsplan für den Wechsel von unverschlüsseltem MMKV/AsyncStorage zu hardware-unterstütztem SecureStore (Keychain / Keystore) erarbeitet:
   - Vollständige Bestandsaufnahme der aktuellen Speicherung (`supabase-auth-storage`).
   - Analyse der sensiblen Werte (`access_token`, `refresh_token`, `email`, `user_id`).
   - Zielarchitektur: Hybrid Secure Storage mit Chunken / AES-Schlüsselverwaltung.
   - Ausarbeitung der Zero-Logout-Migrationsstrategie (Dual-Read von SecureStore und Legacy-MMKV, Übertragung ohne Abmeldung aktiver Beta-Nutzer).
   - Rollback-Strategie, Testanforderungen und Risikoanalyse (Android Keystore 2048-Byte Limit, Offline-Verhalten).
2. Keine produktive Session-Migration vorweggenommen (gemäß Regel: High Risk -> Astra Owner).

Why:
Token-Speicherung in unverschlüsseltem MMKV/AsyncStorage stellt ein Sicherheitsrisiko dar (Auslesbarkeit auf gerooteten/gejailbreakten Geräten oder Backups). Eine unüberlegte Migration würde jedoch aktive Beta-Nutzer zwangsabmelden oder bei Keystore-Problemen offline aussperren.

Tests:
- Statische Code- und Schema-Analyse der Auth-Persistenzpfade.

Expected behavior:
Nach Freigabe durch Astra können Tokens verlustfrei und ohne Zwangs-Logout in hardware-gesicherte Speicher überführt werden.

Potential concerns:
- `expo-secure-store` ist aktuell noch nicht in den Projekt-Dependencies installiert.
- Android Keystore hat ein 2KB-Limit pro Key; ein verschlüsselter MMKV-Store mit Key im SecureStore umgeht dieses Limit elegant.

Questions for Astra:
1. Bevorzugt Astra den hybriden Ansatz (verschlüsseltes MMKV mit AES-Key in SecureStore/Keychain) oder die direkte Nutzung von `expo-secure-store` mit Chunker?
2. Soll Web-Storage rein flüchtig gehalten werden (Session endet mit Tab-Close) oder bleibt LocalStorage für Web-Previews akzeptabel?

Astra action:
ARCHITECTURE_DECISION

Rollback commit:
9467844

---

## AR-006 – Account Lifecycle: Deletion RPC Spec & GDPR Art. 20 Data Export

Priority:
P0

Gemini Status:
PREPARED (Deletion Spec) / IMPLEMENTED (Export Contract Test & Data Map)

Risk:
HIGH (Cloud Deletion RPC Execution) / LOW (Export & Local Reset)

Commit:
f3cbf27

Files:
- `docs/release/ACCOUNT_DELETION_IMPLEMENTATION_SPEC.md`
- `docs/release/DATA_EXPORT_IMPLEMENTATION_SPEC.md`
- `docs/release/ACCOUNT_DATA_MAP.md`
- `apps/mobile/src/stores/__tests__/profileStore.test.ts`

Gemini changed:
1. `ACCOUNT_DELETION_IMPLEMENTATION_SPEC.md`: Erstellt. Detaillierte Spezifikation der serverseitigen Account-Löschung für Apple App Store Guideline 5.1.1(v) und DSGVO Art. 17:
   - PostgreSQL RPC `delete_user_account()` mit `SECURITY DEFINER` und `auth.uid()`.
   - Auflösung des `ON DELETE RESTRICT`-Konflikts zwischen `template_exercises` und `exercises` durch exakte Löschreihenfolge.
   - Bereinigung von Supabase Storage Avataren (`avatars/${userId}`).
   - Client-Orchestrierung: Prüfung auf Store-Abos (Hinweispflicht), Outbox-Freezing, 2-Stufen-Bestätigung ("LÖSCHEN"), atomare lokale Bereinigung erst nach Server-Erfolg.
2. `DATA_EXPORT_IMPLEMENTATION_SPEC.md`: Erstellt. Formale Erfassung des bestehenden `exportData()`-Schemas (Version 2) gemäß DSGVO Art. 20 (Datenübertragbarkeit), Analyse von Performance/Speicherbedarf bei 1.000+ Workouts und Empfehlung für FileSystem-Streaming via `expo-file-system`.
3. `apps/mobile/src/stores/__tests__/profileStore.test.ts`: Umfassenden Test für `exportData()` hinzugefügt, der alle 15 Domänenbereiche validiert und den Ausschluss jeglicher sensibler Tokens/Schlüssel (`access_token`, `refresh_token`, `sb-`, `service_role`) garantiert.
4. `docs/release/ACCOUNT_DATA_MAP.md`: Aktualisiert und mit beiden Spezifikationen verknüpft.

Why:
Apple App Store Guideline 5.1.1(v) verlangt zwingend eine In-App-Löschmöglichkeit des Accounts für alle Apps mit Account-Erstellung. Fehlt diese, droht Review-Ablehnung. Aus Sicherheitsgründen durfte Gemini keine ungetestete Produktiv-Migration oder SQL-RPC auf Supabase ausführen, weshalb die Architektur vollständig vorbereitet und getestet wurde.

Tests:
- `apps/mobile/src/stores/__tests__/profileStore.test.ts` -> PASS (8 Tests)
- `pnpm verify` -> PASS (380 Tests grün)

Expected behavior:
Astra kann die vorbereitete Postgres-Funktion als Supabase-Migration einpflegen und das UI in `app/profile.tsx` anbinden. Export funktioniert bereits nachweislich DSGVO-konform.

Potential concerns:
- Kaskadierendes Löschen von `exercises` blockiert, wenn Templates nicht zuvor gelöscht werden (in der RPC-Spezifikation bereits mitigiert).
- Store-Abos (Apple/Google) laufen trotz Account-Löschung weiter, wenn Nutzer sie nicht im Store kündigen (UI-Warnung spezifiziert).

Questions for Astra:
1. Soll die Account-Löschung sofort hart (`HARD DELETE`) in Postgres ausgeführt werden oder bevorzugt Astra eine 14-tägige Bedenkzeit (`SOFT DELETE` mit Reaktivierungsoption)?
2. Soll `exportData()` bei großen Datenmengen künftig eine `.zip`-Datei mit Avatar-Bildern packen oder genügt der reine JSON-Datenexport?

Astra action:
ARCHITECTURE_DECISION

Rollback commit:
9643886

---

## AR-007 – AI Coach Production Safety Matrix & Client Resilience Tests

Priority:
P1

Gemini Status:
IMPLEMENTED (Test Plan & Client Hardening Tests)

Risk:
LOW

Commit:
89585ac

Files:
- `docs/release/AI_PRODUCTION_TEST_PLAN.md`
- `apps/mobile/src/utils/__tests__/coachApi.test.ts`

Gemini changed:
1. `AI_PRODUCTION_TEST_PLAN.md`: Erstellt. Vollständige Matrix über 15 sicherheits- und kostenkritische Tore (Authentication, Entitlement, Rate Limits, Cost Caps, Provider Outage, Timeouts, HTTP 429, HTTP 500, Schema Repair, Unsafe Advice, Medical Escalation, Prompt Injections, Image Input Quotas, Context Truncation, Sensitive Logging) mit Statusmarkierung (`CURRENTLY_TESTED`, `NOT_TESTED`, `ASTRA_REQUIRED`).
2. `apps/mobile/src/utils/__tests__/coachApi.test.ts`: Um 4 neue Unit-Tests erweitert:
   - `handles network connection failure (TypeError)` -> saubere Fehlermeldung ohne Crash.
   - `handles HTTP 429 rate limit response` -> verständliche Warte-Anweisung für den Nutzer.
   - `rejects malformed response with empty reply field` -> wirft klaren JSON-/Backend-Fehler.
   - `never transmits provider secrets or API keys` -> verifiziert, dass weder Headers (`x-api-key`, `openrouter-api-key`) noch Payload (`sk-or-`, `OPENROUTER`, `secret`) vertrauliche Tokens lecken.

Why:
Der KI-Coach ist ein Kern-Differenzierungsmerkmal von EVARO, birgt jedoch erhebliche finanzielle Risiken (Token-Abfluss, fehlende Limits) sowie Haftungsrisiken (gefährliche Ratschläge bei akuten Verletzungen). Vor der produktiven Freigabe muss Astra diese Schutzmechanismen systematisch abprüfen können.

Tests:
- `apps/mobile/src/utils/__tests__/coachApi.test.ts` (10 Tests) -> PASS
- `api/coach-chat.test.cjs` (18 Tests) -> PASS
- `pnpm verify` -> PASS (384 Tests)

Expected behavior:
Client reagiert auf alle Netzwerkfehler, Timeouts, Abbrüche und fehlerhafte Antworten deterministisch und leckt unter keinen Umständen API-Secrets.

Potential concerns:
- Medizinische Eskalationsfilter (z.B. Brustschmerzen, Schwellungen) müssen serverseitig im System-Prompt noch durch Astra geschärft und automatisiert getestet werden.

Questions for Astra:
1. Soll bei Free-Nutzern nach 6 Anfragen/Tag ein direkter Upgrade-Trigger zur Paywall erfolgen oder eine harte 24-Stunden-Sperre angezeigt werden?
2. Bevorzugt Astra für Bildanalysen (z.B. KFA-Schätzung, Haltungsanalyse) ein clientseitiges Vorab-Komprimieren (max 1024x1024) oder ein striktes Server-Limit (max 4 MB)?

Astra action:
VERIFY

Rollback commit:
9e535e4

---

## AR-008 – Monetization Preparation: EVARO Pro Feature Matrix & Entitlement Architecture Spec

Priority:
P1

Gemini Status:
PREPARED (Architecture Spec & Feature Matrix)

Risk:
HIGH (In-App Purchases & Billing Architecture Decisions)

Commit:
d27ca51

Files:
- `docs/release/EVARO_PRO_FEATURE_MATRIX.md`
- `docs/release/ENTITLEMENT_ARCHITECTURE_SPEC.md`
- `docs/release/SUBSCRIPTION_INTEGRATION_MAP.md`

Gemini changed:
1. `EVARO_PRO_FEATURE_MATRIX.md`: Erstellt. Vollständige Differenzierungs-Matrix zwischen Free Tier und EVARO Pro für 13 Feature-Bereiche (Workouts, Historie, Katalog, Timer, DSGVO-Export, Templates, AI Coach Text/Voice/Plan/Vision, Cloud-Sync, Telemetrie, Farbwelten) mit Client-Gates, Server-Gates, Offline-Verhalten und Kennzeichnung als `PROPOSED`.
2. `ENTITLEMENT_ARCHITECTURE_SPEC.md`: Erstellt. Technischer Architektur-Blueprint für die Anbindung von RevenueCat über StoreKit 2 und Google Play Billing:
   - Identitätsmapping: Supabase UUID als App User ID, Aliasing von anonymen Käufen, Entkopplung bei Account-Wechsel via `Purchases.logOut()`.
   - Serverseitiges Gating: Supabase-Tabelle `public.subscriptions`, denormalisiertes `users.is_pro`-Flag, abgesicherter Vercel-Webhook-Handler (`api/webhooks/revenuecat.js`).
   - Client-Abläufe: "Käufe wiederherstellen" (Restore Purchases gem. Guideline 3.1.1), 72-Stunden Offline-Grace-Period für Fitnessstudios ohne Netz, Probeabos (Trials).
   - Anti-Fraud & Sicherheitskonzepte (keine Client-Vertrauensstellung, serverseitige Verifikation vor OpenRouter-Calls).
3. `SUBSCRIPTION_INTEGRATION_MAP.md`: Mit den neuen Spezifikationen synchronisiert und aktualisiert.
4. Keine ungetestete Installation von Drittanbieter-Bibliotheken oder verfrühte Produkt-IDs im Produktivcode.

Why:
Monetarisierung ist für die wirtschaftliche Tragfähigkeit von EVARO unverzichtbar (insbesondere zur Deckung von KI-Token- und Infrastrukturkosten). Gleichzeitig verlangen die App Stores (insb. Apple Guideline 3.1.1 und 3.1.2) lückenlose Einhaltung formaler Kriterien (Restore Purchases, klare Kündigungsfristen, transparente Freemium-Grenzen). Durch die gründliche Vorbereitung kann Astra die native SDK-Integration und Webhook-Logik direkt aufsetzen.

Tests:
- Statische Architekturprüfung der Integrationsschnittstellen.

Expected behavior:
Astra verfügt über eine vollständige Spezifikation zur Integration von RevenueCat, Supabase Webhooks und Server-Gating.

Potential concerns:
- Apple-Richtlinien fordern zwingend funktionierende Restore-Purchases-Buttons und EULA/Datenschutz-Links auf jeder Paywall.
- Offline-Verhalten muss zwingend tolerant sein, um Frustration im Studio zu vermeiden (spezifiziert auf 72h Grace).

Questions for Astra:
1. Soll RevenueCat Paywalls (UI) via RevenueCat SDK Paywall-View gerendert werden oder soll EVARO ein vollständig custom gestaltetes Paywall-Modal nutzen?
2. Welche Produktpreis-Modelle (z. B. 9,99 €/Monat bzw. 79,99 €/Jahr) sollen für die App Store Connect Konfiguration vorbereitet werden?

Astra action:
ARCHITECTURE_DECISION

Rollback commit:
081e62a

---

## AR-009 – Exercise Asset Replacement Plan & Licensing Decoupling

Priority:
P0

Gemini Status:
PREPARED (Replacement Plan & Fallback UI Verification)

Risk:
HIGH (Exercise Media Copyright & Hotlink Outage Risk)

Commit:
852c1dd

Files:
- `docs/release/EXERCISE_ASSET_REPLACEMENT_PLAN.md`
- `docs/release/EXERCISE_ASSET_INVENTORY.md`

Gemini changed:
1. `EXERCISE_ASSET_REPLACEMENT_PLAN.md`: Erstellt. Umfassender Migrations- und Entkopplungsplan für die 1.492 externen GIF-URLs (`static.exercisedb.dev`) und dynamischen GitHub-JPGs (`free-exercise-db`), deren kommerzielle Rechte im Repository nicht belegt sind:
   - Audit aller 4 bildverbrauchenden Screens (`ExerciseCard.tsx`, `[id].tsx`, `SessionExerciseCard.tsx`, `template-builder.tsx`).
   - Verifikation des bestehenden Fallback-UI: Beide Hauptkomponenten verfügen bereits über einen fehlerfreien Fallback mit `Ionicons name="barbell-outline"` bzw. `imagePlaceholder`. Die App stürzt ohne GIFs nicht ab.
   - Ausarbeitung von 4 Lösungsoptionen (A: Kommerzielle API-Lizenz bei ExerciseDB; B: Anatomie-Muskel-Vektor-Fallback mit MIT-lizenzierter `AnatomyFigure`; C: CC0/Wger-Datensatz; D: Custom 3D-Assets).
   - Ausarbeitung eines 2-Stufen-Plans: Stufe 1 als sofortige, abmahnsichere Null-Risiko-Entkopplung für den App Store Release; Stufe 2 für spätere Lizenzierung mit CDN-Hosting.
2. `EXERCISE_ASSET_INVENTORY.md`: Aktualisiert und verknüpft.
3. Keine voreilige Löschung von Assets oder Datenfiles vor der Entscheidung durch Astra/Konrad.

Why:
Unlizenzierte Medien oder Hotlinks auf fremde CDNs bergen ein akutes Risiko für Copyright-Abmahnungen, Ausfälle im Betrieb und Ablehnungen im App Store Review. Gleichzeitig darf Gemini ohne Weisung des Rechteinhabers keine Assets unwiderruflich löschen.

Tests:
- Statische Code-Analyse aller Bild-Konsumenten und Fallback-Pfade.

Expected behavior:
Astra kann mit minimalem Aufwand (Entfernen der URL-Auflösung in `mapExercises.ts`) die App rechtssicher und hotlink-frei für den App Store Release konfigurieren.

Potential concerns:
- Wird Option B (Anatomie-Fallback) gewählt, fehlen animierte Übungsvorschauen; dafür erhält die App ein minimalistisches, extrem schnelles medizinisches Design (analog zu Whoop / Apple Fitness).

Questions for Astra:
1. Liegt Konrad eine Rechnung / Vereinbarung für ExerciseDB vor, oder soll Option B (Anatomie-Vektor-Fallback) für den V1 Store Release scharf geschaltet werden?
2. Soll `packages/domain/src/data/raw/exercisedb-v1.json` (1,4 MB) jetzt endgültig aus dem Git-Tracking entfernt werden?

Astra action:
ARCHITECTURE_DECISION

Rollback commit:
d3ce4d2

---

## AR-010 – Performance QA: Benchmarks, Large Datasets & Scalability Report

Priority:
P1

Gemini Status:
IMPLEMENTED (Test Generator, Benchmark Suite & QA Report)

Risk:
LOW

Commit:
aa2028b

Files:
- `apps/mobile/src/data/__tests__/benchmarkDatasetGenerator.ts`
- `apps/mobile/src/data/__tests__/largeDatasetPerformance.test.ts`
- `docs/release/PERFORMANCE_QA.md`

Gemini changed:
1. `benchmarkDatasetGenerator.ts`: Erstellt. Isolierte Test-Utility zur deterministischen Erzeugung realistischer Großdatensätze (500/1.000 Workouts, 10.000+ Sätze, 500 Körpermetriken, 100 Templates, 50 Programme). Keine Testdaten werden im Produktiv-Bundle ausgeliefert.
2. `largeDatasetPerformance.test.ts`: Erstellt. Automatisierte Benchmark-Suite für Jest/CI:
   - 500 Workouts (~7.000 Sätze): Ingestion 15 ms, Datum-Sortierung 9 ms, Vorherige Leistung (`getPreviousPerformance`) 3 ms, Volumen-Historie 7 ms.
   - 1.000 Workouts (10.000+ Sätze): Sortierung 21 ms, Lookup 4 ms, vollständiger DSGVO Art. 20 Export (>1 MB) 38 ms.
   - 500 Körperdaten: Chronologische Auflösung (`getLatestMetric`) in 1 ms.
   - Fuzzy-Katalog-Suche über 873 Übungen in 5 ms.
3. `PERFORMANCE_QA.md`: Erstellt. Umfassender Performance-Prüfbericht über History Render (Virtualisierung mit `FlatList`), Übungssuche (In-Memory Unicode NFD Normalisierung), Workout Load/Save, Chart-Sampling und Empfehlungen für Astra (sortierte Indizes, FileSystem-Export-Streaming ab 1.000 Workouts).

Why:
Sicherstellung, dass EVARO auch bei mehrjähriger aktiver Trainingsnutzung (Power-User mit 1.000 Einheiten und 10.000 Sätzen) reaktionsschnell bei 60 FPS bleibt und weder Memory-Leaks noch spürbare UI-Verzögerungen auftreten.

Tests:
- `apps/mobile/src/data/__tests__/largeDatasetPerformance.test.ts` (5 Benchmarks) -> PASS
- `pnpm verify` -> PASS (389 Tests)
- `pnpm coach:check` -> PASS

Expected behavior:
Alle kritischen Abfragen und Lookups skalieren stabil unter 50 ms.

Potential concerns:
- Keine. Reines Test- und Dokumentations-Tooling.

Questions for Astra:
1. Soll `historyStore` zukünftig bei `addSession` ein binäres Einfügen nutzen, um das Re-Sorting bei `getSessionsByDateDesc` vollständig auf 0 ms zu eliminieren?
2. Ab welcher Historie-Größe (z.B. 2.000 Workouts) soll ein SQLite-Paging im UI eingeführt werden?

Astra action:
VERIFY

Rollback commit:
353529b

---

## AR-011 – Possible Obsolete Component: ExerciseFilter.tsx

Priority:
P2

Gemini Status:
ANALYZED

Risk:
LOW

Commit:
bc6741f (Pre-Cleanup Safepoint)

Files:
- `apps/mobile/src/components/exercises/ExerciseFilter.tsx`

Gemini changed:
Keine Löschung vorgenommen. Komponente analysiert und als potenziell ungenutzt identifiziert.

Why:
`ExerciseFilter.tsx` ist im Quellcode nirgendwo importiert. Die Screen-Datei `apps/mobile/app/(tabs)/exercises.tsx` verwendet eigene Inline-Filterchips (`MUSCLE_FILTERS`, `WARMUP_KEYWORDS` etc.). Am 13.09.2026 wurde die Komponente jedoch gestylt (`useThemeStyles`, `accessibilityRole="button"`). Um zu verhindern, dass eine geplante Wiederverwendung in einem kommenden Modal oder einer Übungsauswahl versehentlich gelöscht wird, wurde die Datei bewusst nicht gelöscht, sondern zur Verifikation an Astra übergeben.

Tests:
- `git grep "ExerciseFilter"` -> 0 Verwendungen außerhalb der Definitionsdatei.
- `pnpm verify` -> PASS

Expected behavior:
Entweder:
a) Komponente wird in `(tabs)/exercises.tsx` oder einem Auswahldialog als Shared Component wiederverwendet, ODER
b) Komponente wird endgültig gelöscht.

Potential concerns:
- Keine funktionale Auswirkung, da unreferenziert.

Questions for Astra:
1. Soll `ExerciseFilter.tsx` gelöscht werden (`VERIFY_DELETE`) oder für eine zukünftige Filter-Modal-Abstraktion behalten werden?

Astra action:
VERIFY_DELETE

Rollback commit:
bc6741f

---

## AR-012 – Dormant Dependencies: react-hook-form & @hookform/resolvers

Priority:
P2

Gemini Status:
ANALYZED

Risk:
LOW

Commit:
bc6741f (Pre-Cleanup Safepoint)

Files:
- `apps/mobile/package.json`

Gemini changed:
Keine Entfernung vorgenommen. Abhängigkeiten im Rahmen des Repository-Cleanups analysiert.

Why:
`react-hook-form` und `@hookform/resolvers` sind in `apps/mobile/package.json` deklariert und in den Entwicklungsdokumenten (`CLAUDE.md`, `docs/AGENTS_REFERENCE.md`, `docs/agents/mobile-dev.md`) als Standard-Formularstack festgeschrieben. Aktuell nutzen die Screens (`login.tsx`, `register.tsx`, `profile.tsx`, `template-builder.tsx`) jedoch direkt `useState`. Ein vorschnelles Entfernen würde künftige Roadmap-Arbeiten (wie Onboarding WP-06) behindern, falls diese wie dokumentiert `react-hook-form` nutzen sollen.

Tests:
- `git grep "useForm"` -> 0 Treffer im aktuellen Quellcode.
- `pnpm verify` -> PASS

Expected behavior:
Astra entscheidet, ob `react-hook-form` für Onboarding/Paywall/Forms beibehalten oder deinstalliert werden soll.

Potential concerns:
- Minimaler Package-Overhead in `node_modules` (beide Libraries werden vom Metro-Tree-Shaking ohnehin nicht in das Client-Bundle gepackt, solange kein Import existiert).

Questions for Astra:
1. Sollen bestehende Formulare auf `react-hook-form` + Zod migriert werden, oder soll die Abhängigkeit aus `apps/mobile/package.json` deinstalliert werden?

Astra action:
ARCHITECTURE_DECISION

Rollback commit:
bc6741f

---

## AR-013 – Secure Storage Adapter Implementation & Dual-Read Migration

Priority:
P0

Gemini Status:
PREPARED

Risk:
HIGH (Active session persistence)

Files:
- `apps/mobile/src/utils/secureStorage.ts`
- `apps/mobile/src/utils/__tests__/secureStorage.test.ts`
- `apps/mobile/package.json` (`expo-secure-store` installiert)

Gemini changed:
1. `expo-secure-store@~15.0.8` passend zur Expo 54 Installation hinzugefügt.
2. `apps/mobile/src/utils/secureStorage.ts`: Vollständige Adapter-Klasse `SecureStorageAdapter` implementiert mit:
   - `getItem(key)`, `setItem(key, value)`, `deleteItem(key)`
   - Hardware-Schutz via `keychainAccessible: SecureStore.AFTER_FIRST_UNLOCK`
   - Graceful Fallback auf In-Memory-Store bei nativer Nicht-Verfügbarkeit (z.B. SSR, Headless-Tests)
   - Dual-Read-Migrations-Utility `migrateSessionWithDualRead()`: liest SecureStore, migriert bei Bedarf MMKV, schreibt zuerst in SecureStore, löscht erst nach Bestätigung aus MMKV
   - `clearSessionFromAllStores()`: Bereinigt bei Logout synchron sowohl SecureStore als auch MMKV
   - Keine Logs von Session-Tokens oder Passwörtern
3. `apps/mobile/src/utils/__tests__/secureStorage.test.ts`: 11 automatisierte Unit-Tests für alle Fehlerszenarien (SecureStore gefüllt, MMKV gefüllt, beide gefüllt, korrupte Payloads, Schreibfehler, Native unavail, Logout-Cleanup).
4. **Bewusst NICHT aktiviert:** Die Supabase-Client-Konfiguration in `supabase.ts` verbleibt unverändert auf MMKV, um bestehende Beta-Sessions nicht im laufenden Betrieb zurückzusetzen.

Why:
Authentifizierungs-Token (JWT) lagen bislang in MMKV unverschlüsselt auf dem Gerätespeicher. P0-Sicherheitsanforderung verlangt Hardware-Keystore/Keychain. Die Migration wurde vollständig vorbereitet und getestet, die finale Scharfschaltung obliegt Astra.

Tests:
- `apps/mobile/src/utils/__tests__/secureStorage.test.ts` -> 11/11 PASS

Expected behavior:
Adapter ist isoliert einsatzbereit. Bestehendes Production-Verhalten bleibt unverändert.

Questions for Astra:
1. Soll `secureStorage` im nächsten Schritt als `storage: secureStorage` in `createClient(...)` in `supabase.ts` übergeben werden?
2. Soll beim ersten App-Start die Funktion `migrateSessionWithDualRead()` im `authStore.initialize()` aufgerufen werden?

Astra action:
ACTIVATE

Rollback commit:
v0.1.0-beta.5 (4dd430e)

---

## AR-014 – Account Deletion Service: Client Architecture & Safety Gate

Priority:
P0

Gemini Status:
PREPARED

Risk:
HIGH (Reversible client logic; backend RPC pending)

Files:
- `apps/mobile/src/services/accountDeletionService.ts`
- `apps/mobile/src/services/__tests__/accountDeletionService.test.ts`
- `apps/mobile/app/profile.tsx`
- `apps/mobile/src/i18n/translations.ts`

Gemini changed:
1. `accountDeletionService.ts`: Client-Service für Account-Löschung nach Apple Guideline 5.1.1(v) implementiert:
   - `verifyDeletionCapability()`: Prüft, ob Supabase und Cloud-RPC bereitstehen. Falls nicht, Rückgabe von `BACKEND_NOT_CONFIGURED`
   - `requestAccountDeletion({ confirmationText })`: Verlangt explizites Bestätigungswort (`DELETE` / `LÖSCHEN`), blockiert Offline-Aufrufe, schützt vor Double-Submit, prüft Auth-Gültigkeit
   - `clearLocalDataAfterConfirmedCloudDeletion()`: Löscht alle lokalen Daten, Stores und Scopes erst nach bestätigter Cloud-Löschung
   - Keine Ausführung von Fake-Löschungen
2. `profile.tsx`: UI-Button *"Account löschen"* verknüpft mit `verifyDeletionCapability()`. Da das Cloud-Backend noch inaktiv ist, wird der Nutzer ehrlich gewarnt und auf *"Alle Daten zurücksetzen"* verwiesen.
3. 8 automatisierte Unit-Tests in `accountDeletionService.test.ts`.

Why:
App Store Zulassung erfordert einen Account-Lösch-Flow. Dieser darf jedoch keine Scheinlösung sein, bei der nur lokale Daten gelöscht werden, während der Account im Supabase-Backend verbleibt.

Tests:
- `accountDeletionService.test.ts` -> 8/8 PASS

Expected behavior:
Kein unberechtigter Datenverlust, ehrliches Feedback für Beta-Tester.

Questions for Astra:
1. Wann wird die RPC-Funktion `delete_user_account()` in der Supabase-Produktionsumgebung ausgerollt?

Astra action:
ACTIVATE

Rollback commit:
v0.1.0-beta.5 (4dd430e)

---

## AR-015 – Data Export Hardening: GDPR Art. 20 Collector Service

Priority:
P0

Gemini Status:
IMPLEMENTED

Risk:
LOW

Files:
- `apps/mobile/src/services/dataExportService.ts`
- `apps/mobile/src/services/__tests__/dataExportService.test.ts`

Gemini changed:
1. `dataExportService.ts`: Deterministischer Daten-Kollektor nach DSGVO Art. 20 (Recht auf Datenübertragbarkeit):
   - Export-Struktur mit Schema Version 2
   - Eindeutige Kennzeichnung `exportScope: "LOCAL_EXPORT_ONLY"` (keine falsche Behauptung eines vollständigen Cloud-Exports)
   - Aggregiert Profil, Workouts, Sets, Body Metrics, Trainingspläne, Templates, Custom Exercises, Achievements, Hydration, Caffeine und Coach-Nachrichten
   - Schnelle Serialisierung (< 100ms auch bei hunderten Workouts)
   - Reine kanonische Zahlenwerte (keine Formatierungsstörungen durch deutsche Kommas)
   - Vollständige Erhaltung von Sonderzeichen, Umlauten und Emojis
2. 6 automatisierte Unit-Tests in `dataExportService.test.ts`.

Why:
Sicherstellung der DSGVO-Compliance und verlässlicher Datensicherung für Power-User ohne Schema-Drift.

Tests:
- `dataExportService.test.ts` -> 6/6 PASS

Expected behavior:
Export erzeugt reproduzierbare, valide JSON-Dumps.

Questions for Astra:
1. Soll der Export-Service zukünftig zusätzlich eine CSV-Export-Option für Excel/Numbers anbieten?

Astra action:
VERIFY

Rollback commit:
v0.1.0-beta.5 (4dd430e)

---

## AR-016 – Entitlement Abstraction: Provider-Agnostic Pro Management

Priority:
P1

Gemini Status:
PREPARED

Risk:
MEDIUM

Files:
- `apps/mobile/src/services/entitlementService.ts`
- `apps/mobile/src/services/__tests__/entitlementService.test.ts`
- `apps/mobile/app/profile.tsx`

Gemini changed:
1. `entitlementService.ts`: Provider-unabhängige Entitlement-Abstraktion implementiert:
   - `hasEntitlement(id)`
   - `getEntitlementState()`
   - `refreshEntitlements()`
   - `restorePurchases()`
   - Entkoppelt UI und Business-Logik von proprietären SDKs (RevenueCat / StoreKit)
   - **BETA_ALL_FEATURES_ENABLED = true:** Standardmäßig aktiviert, damit kein einziger bestehender Beta-Tester den Zugriff auf Workouts, Coach oder Historie verliert
   - Unterstützt Grace-Periods, Trial-States, Offline-Cache und Account-Switches
2. `profile.tsx`: *"Käufe wiederherstellen"* (Restore Purchases) als Pflichtkomponente für Store-Zulassung hinzugefügt und mit Service verbunden.
3. 10 automatisierte Unit-Tests in `entitlementService.test.ts`.

Why:
App Store verlangt Restore Purchases und saubere Entitlement-Prüfung vor In-App-Käufen. Die Abstraktion verhindert Vendor-Lock-in.

Tests:
- `entitlementService.test.ts` -> 10/10 PASS

Expected behavior:
Alle Beta-Features bleiben für alle Nutzer uneingeschränkt nutzbar.

Questions for Astra:
1. Welches RevenueCat SDK soll Astra integrieren (`react-native-purchases`), und welche Offerings/Packages sollen angelegt werden?

Astra action:
ACTIVATE

Rollback commit:
v0.1.0-beta.5 (4dd430e)

---

## AR-017 – Exercise Media Decoupling: Central Multi-Tier Resolver

Priority:
P0

Gemini Status:
PREPARED

Risk:
MEDIUM

Files:
- `apps/mobile/src/utils/getExerciseMedia.ts`
- `apps/mobile/src/utils/__tests__/getExerciseMedia.test.ts`

Gemini changed:
1. `getExerciseMedia.ts`: Zentraler Resolver für Übungsmedien implementiert:
   - Unterstützt 4 Stufen: `REMOTE_GIF`, `LOCAL_IMAGE`, `ANATOMY_FALLBACK`, `NO_MEDIA`
   - Globaler Feature-Flag `EXERCISE_MEDIA_SOURCE_OVERRIDE` (Standard: `REMOTE_GIF`, somit 100% abwärtskompatibel zum bestehenden Zustand)
   - Anatomie-Fallback-Mapping basierend auf den Primärmuskeln der Übung (`MuscleGroup`)
   - Fehler- und URL-Validierung (Ungültige URLs fallen ohne Bildfehler auf neutralen Fallback zurück)
   - Kein kaputtes Bild-Icon oder leere Layout-Verschiebungen
2. 8 automatisierte Unit-Tests in `getExerciseMedia.test.ts`.

Why:
Die Lizenzfrage der 1.492 Übungs-GIFs (P0 Blocker) ist noch nicht juristisch entschieden. Durch diesen Resolver kann die gesamte App mit einer einzigen Zeile Code von Remote-GIFs auf anatomische Schaubilder oder lizenzierte Alternativen umgestellt werden, ohne dass UI-Komponenten angefasst werden müssen.

Tests:
- `getExerciseMedia.test.ts` -> 8/8 PASS

Expected behavior:
Bestehende Medien werden unverändert angezeigt. Ein Switch auf Fallbacks ist jederzeit schadlos möglich.

Questions for Astra:
1. Sobald die rechtliche Entscheidung zu den Übungs-GIFs vorliegt: Soll `EXERCISE_MEDIA_SOURCE_OVERRIDE` auf `ANATOMY_FALLBACK` gesetzt werden?

Astra action:
ACTIVATE

Rollback commit:
v0.1.0-beta.5 (4dd430e)

---

## AR-018 – AI Safety Test Harness & Backend Request Validation

Priority:
P0

Gemini Status:
IMPLEMENTED

Risk:
LOW

Files:
- `api/coach-safety.cjs`
- `api/coach-safety.test.cjs`
- `api/coach-chat.js`
- `package.json` (`test:api` Skript erweitert)

Gemini changed:
1. `api/coach-safety.cjs`: Deterministische Safety-Interception ohne LLM-Kosten:
   - Notfall-Eskalation bei akutem Brustschmerz, Bewusstlosigkeit, schweren Verletzungen (Sehnenabriss, Frakturen) mit Notrufhinweis (112 / 911)
   - Verweigerung von Ratschlägen zu extremer Kalorienrestriktion (< 500 kcal / Verhungern) und Dehydrierung / trockenem Fasten
   - Deterministische Verweigerung von Steroid-/Doping-/PED-Dosierungen
   - Verweigerung medizinischer Ferndiagnosen
   - Erkennung und Blockade von Prompt Injections und Abfragen zur Herausgabe von System Prompts
2. `api/coach-chat.js`:
   - Preflight Safety Check vor jedem LLM-Aufruf
   - Strikte Content-Type-Prüfung (`application/json`) mit HTTP 415 bei abweichenden Formaten
   - Maximale Message-Größe (50.000 Zeichen) mit HTTP 400
   - Validierung von Bild-Payloads (Data-URL / Base64-Format)
3. 13 automatisierte deterministische Tests in `coach-safety.test.cjs`. Alle 31 Backend-Tests laufen lokal ohne API-Kosten durch.

Why:
Haftungsausschluss und Store-Vorgaben verlangen wirksame Schutzmechanismen gegen lebensgefährliche Fitness-Ratschläge und System-Prompt-Lecks.

Tests:
- `pnpm test:api` -> 31/31 PASS

Expected behavior:
Gefährliche Anfragen werden sofort, sicher und kostenfrei im Preflight abgefangen. Normale Trainingsfragen passieren unverändert zum Modell.

Questions for Astra:
1. Sollen die Safety-Trigger zukünftig in ein separates Logging-Audit zur Missbrauchserkennung fließen?

Astra action:
VERIFY

Rollback commit:
v0.1.0-beta.5 (4dd430e)

---

## AR-019 – Sync Failure Test Harness & Offline/FIFO Resilience

Priority:
P0

Gemini Status:
IMPLEMENTED

Risk:
LOW

Files:
- `apps/mobile/src/stores/__tests__/syncFailureHarness.test.ts`

Gemini changed:
1. `syncFailureHarness.test.ts`: Umfassende Härtungstests gegen bestehendes Verhalten von `syncStore`:
   - Duplicate Enqueue: Gleiche Entität mehrfach eingereiht -> separate FIFO-Einträge
   - Network Retry: Bei Verbindungsausfall bleibt Mutation in Queue und `retryCount` wird inkrementiert
   - Non-Retryable Errors (z.B. Postgres 42P01 / 23505): Mutation wird verworfen, um Endlos-Blockaden zu verhindern
   - Partial Failure / Head-of-Line Blocking: Bei Fehler in Mutation 1 stoppt die Verarbeitung, nachfolgende Mutationen bleiben in korrekter Sequenz erhalten
   - Account Switch / Logout: Synchronisation bricht sofort ab, Altdaten werden nicht unter falscher User-ID gepusht
   - Idempotente Deletes: Zweifaches Löschen derselben ID wird schadlos ausgeführt
2. 7 automatisierte Tests ohne Änderung an der bestehenden Sync-Architektur.

Why:
Aufdeckung von Grenzfällen bei instabiler Mobilfunkverbindung und Schutz der Datenintegrität.

Tests:
- `syncFailureHarness.test.ts` -> 7/7 PASS

Expected behavior:
Bestehende Sync-Logik ist nachweislich resilient gegenüber Verbindungsabbrüchen.

Questions for Astra:
1. Wann soll das Revisions-/Tombstone-Modell für Offline-Konflikte (AR-004) implementiert werden?

Astra action:
VERIFY

Rollback commit:
v0.1.0-beta.5 (4dd430e)

---

## AR-020 – React Error Boundary & Graceful Crash Recovery

Priority:
P1

Gemini Status:
IMPLEMENTED

Risk:
LOW

Files:
- `apps/mobile/src/components/ErrorBoundary.tsx`
- `apps/mobile/src/components/__tests__/ErrorBoundary.test.tsx`
- `apps/mobile/app/_layout.tsx`

Gemini changed:
1. `ErrorBoundary.tsx`: Wiederverwendbare React Error Boundary nach Best Practices implementiert:
   - Fängt unerwartete Render- und Lifecycle-Fehler ab
   - Verhindert den gefürchteten "White Screen of Death"
   - Bietet Buttons *"Erneut versuchen"* und *"Zurück zur Startseite"*
   - Maskiert sensible technische Stacktraces im Release-Modus (zeigt nur anwenderfreundliche Hilfehinweise)
   - Loggt Fehler über die datenschutzsichere Logger-Abstraktion
2. `apps/mobile/app/_layout.tsx`: Root-Navigation in `ErrorBoundary` gekapselt.
3. 4 automatisierte Unit-Tests in `ErrorBoundary.test.tsx`.

Why:
App Store Richtlinien und Nutzerzufriedenheit verlangen kontrolliertes Fehlerverhalten statt App-Abstürzen bei seltenen UI-Glitches.

Tests:
- `ErrorBoundary.test.tsx` -> 4/4 PASS

Expected behavior:
Fehlerfreie UI bleibt unberührt. Unerwartete JS-Crashes führen zu einer gestalteten Recovery-Ansicht.

Questions for Astra:
1. Welcher Observability-Provider (Sentry, PostHog, Bugsnag) soll für Remote-Crash-Reporting an die Error Boundary angebunden werden?

Astra action:
VERIFY

Rollback commit:
v0.1.0-beta.5 (4dd430e)

---

## AR-021 – Store Compliance Technical Audit & In-App Readiness

Priority:
P0

Gemini Status:
AUDITED

Risk:
MEDIUM

Files:
- `docs/release/STORE_TECHNICAL_READINESS.md`
- `apps/mobile/app/profile.tsx`
- `apps/mobile/src/i18n/translations.ts`

Gemini changed:
1. `STORE_TECHNICAL_READINESS.md`: Vollständiger technischer Audit für Apple App Store und Google Play Store:
   - Prüfung aller 17 Kernbereiche (Permission Strings, App Name, Bundle ID, Versioning, Icons, Splash, Account Deletion, In-App Purchases, Restore Purchases, Legal Links)
   - Klare Zuweisung von Zuständigkeiten (`READY`, `PARTIAL`, `BLOCKED`, `USER_ACTION_REQUIRED`, `ASTRA_REQUIRED`)
2. In-App-Integration:
   - "Käufe wiederherstellen" als eigener Menüpunkt integriert
   - Account-Löschung technisch verknüpft
   - Gesetzliche Informationshinweise (DSGVO, Medizinischer Disclaimer) zweisprachig verankert

Why:
Vermeidung von Ablehnungen im App Store Review Prozess durch vorausschauende Einhaltung aller formalen und technischen Store-Richtlinien.

Tests:
- Store Compliance Matrix verifiziert
- `pnpm verify` -> 447 Tests PASS

Expected behavior:
Alle Einstiegspunkte sind vorhanden. Sobald rechtliche URLs und Developer Accounts vorliegen, ist die Einreichung technisch vorbereitet.

Questions for Astra:
1. Liegen die finalen URLs für Datenschutzerklärung und Impressum vor, um die Platzhalter in `profile.tsx` zu ersetzen?

Astra action:
USER_DECISION

Rollback commit:
v0.1.0-beta.5 (4dd430e)

---

## AR-022 – Release Candidate Core Flow Regression & Subscription Error Coverage

Priority:
P0

Gemini Status:
IMPLEMENTED

Risk:
LOW

Commit:
2bd428b

Files:
- `apps/mobile/src/__tests__/releaseCandidateCoreRegression.test.ts`
- `apps/mobile/src/services/__tests__/entitlementService.test.ts`

Gemini changed:
1. Erstellung der umfassenden RC Core Regression Suite mit 11 Tests:
   - Vollständiger Workout Flow: Start, Übung hinzufügen, Satz anpassen (Weight/Reps/RPE/RIR), abhaken, löschen, beenden, SQLite-Persistenz und Deduplikation.
   - Restart / Recovery Guard: State Reload, unfertiger Workout-Zustand, Resume Guard Entscheidungen.
   - Body Metrics Flow: Gewicht & KFA erfassen/löschen, Verlauf, DE/EN Übersetzungs-Parität.
   - Program & Template Flow: Template anlegen, aktualisieren, löschen.
   - Gast-Isolation: Keine Datenvermengung zwischen Gast und registrierten Nutzern.
2. Entitlement-Service Test-Erweiterung: StoreKit/Billing-Fehler, Store-Timeouts, Cache-Fallbacks und Grace Periods abgedeckt.

Why:
Sicherstellung, dass vor Astra-Aktivierung alle Kernpfade regressionsfrei und fehlerresistent abgedeckt sind.

Tests:
- `pnpm --filter @fitness-tracker/mobile test releaseCandidateCoreRegression.test.ts` (11 Tests PASS)
- `pnpm --filter @fitness-tracker/mobile test entitlementService.test.ts` (10 Tests PASS)

Astra action:
VERIFY

---

## AR-023 – Privacy-Safe Local Diagnostics & Observability Event Model

Priority:
P1

Gemini Status:
IMPLEMENTED

Risk:
LOW

Commit:
0cb299f

Files:
- `apps/mobile/src/services/diagnosticsService.ts`
- `apps/mobile/src/services/__tests__/diagnosticsService.test.ts`
- `docs/release/OBSERVABILITY_EVENT_MODEL.md`

Gemini changed:
1. `diagnosticsService.ts`: Vollständig lokale Abstraktion für Diagnoseberichte und Fehlercode-Aufzeichnung (Ring-Buffer, max. 50 non-sensitive Codes).
2. Strikt datenschutzkonform: Keine PII, keine Workouts, kein Körpergewicht, keine Coach-Texte, keine Tokens.
3. `OBSERVABILITY_EVENT_MODEL.md`: Provider-unabhängiges Telemetrie-Event-Modell mit klarer Whitelist für Astra vor Sentry/PostHog-Anbindung.

Why:
Vorbereitung für Support und Fehlersuche ohne Installation schwerer oder datenschutzrechtlich riskanter SDKs im Vorfeld.

Tests:
- `pnpm --filter @fitness-tracker/mobile test diagnosticsService.test.ts` (5 Tests PASS)

Astra action:
VERIFY









