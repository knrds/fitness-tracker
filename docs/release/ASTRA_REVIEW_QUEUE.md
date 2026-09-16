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




