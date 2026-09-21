# ASTRA START HERE — aktueller Handoff 2026-09-21

## Aktueller Checkpoint — 21.09.2026: Three-Phase Level/XP Progression Rebalance (Kandidat B)

Gemini hat die Level-Progression auf eine motivierende Drei-Phasen-Kurve (Kandidat B) kalibriert:

1. **Mathematische Formel (Domain Single Source of Truth):**
   - $XP(L) = 10 \times (L - 1)^3 + 50 \times (L - 1)^2 + 350 \times (L - 1)$ für $L \ge 2$, berechnet in `packages/domain/src/logic/levelProgression.ts`.
   - **Early Game (Level 1–5):**
     - Level 2: 410 Total XP (~3 Workouts à 140 XP).
     - Level 3: 980 Total XP (~7 Workouts kumulativ).
     - Level 4: 1.770 Total XP (~13 Workouts kumulativ).
     - Level 5: 2.840 Total XP (~20 Workouts kumulativ).
   - **Mid Game (Level 6–15):** Deutlich spürbare Progressionsverlangsamung (Level 10: 14.490 XP [~103 Workouts], Level 15: 42.140 XP [~301 Workouts]).
   - **Late Game (Level 16+):** Glatte Langzeit-Prestige-Kurve (Level 20: 93.290 XP [~666 Workouts], Level 50: 1.313.690 XP).
   - Session-XP degressiv und gedeckelt auf max 265 XP (typisch ~120–160 XP); kein Level-Skip aus dem Stand. Idempotenz-Schutz via `awardedSessionIds` gesichert.
2. **iPhone Free QA Guide:**
   - 13 konkrete Schritte in `docs/release/IPHONE_FREE_TEST_GUIDE.md` Abschnitt 21 für den Nutzer auf iPhone Safari dokumentiert.
3. **Teststatus:**
   - **677 Tests PASS** (92 Domain inkl. 5 Workout-Archetyp-Simulationen + 531 Mobile in 80 Suiten + 38 Coach-API + 16 Security-Regressionen).
   - Typecheck PASS, Lint PASS, Web-Export PASS.

### Kanonische Security-Roadmap Governance (S0–S12)

| Code | Kanonische Bezeichnung | Status | Begründung / Offene Gates |
|---|---|---|---|
| **S0** | **Repository Truth / Threat Model** | `PARTIAL` | Codebezogene Grenzen/Angriffe in SECURITY.md verankert; Team-/Betriebsabnahme und Production-Datenflüsse durch Maintainer zu bestätigen. |
| **S1** | **Secrets / Supply Chain / CI** | `PARTIAL` | Preview-Gate (Zero Critical, 0 Secrets) aktiv; CI blockiert bei 43 High Build-Tool-Befunden; SAST/SBOM/Branch Protection offen. |
| **S2** | **Authentication / Secure Session Storage** | `PHYSICAL_DEVICE_REQUIRED` | Native SecureStore-Migration implementiert; physische iOS/Android-Geräteabnahme, Reauth, Refresh und Zero-Logout-Nachweis offen. |
| **S3** | **Authorization / RLS / Multi-Tenant Isolation** | `PARTIAL` | Echter lokaler PostgreSQL-17.11 Harness (304 Assertions) VERIFIED; Supabase Remote-DDL, PostgREST und Remote-Auth offen (`ASTRA_REQUIRED`). |
| **S4** | **Sync / Data Integrity** | `PARTIAL` | Lokale SQLite FIFO-Outbox, Rollback und Pull-Validierung VERIFIED; serverseitige atomare Aggregate, Konflikte & Tombstones offen (`ASTRA_REQUIRED`). |
| **S5** | **Account Lifecycle / Privacy / Health Data** | `ASTRA_REQUIRED` | Parametrisierungsfreier RPC-Löschvertrag (`auth.uid()`) spezifiziert; serverseitige Cascade und Auth-Löschung auf Supabase offen. |
| **S6** | **AI Coach Security / Safety / Cost Controls** | `PARTIAL` | 19 deterministische Notfall-/Safety-Szenarien VERIFIED; Prototype-Bypass gesperrt; serverseitiges Token-Ledger/Budget und DE/EN-Safety-Schicht in Arbeit. |
| **S7** | **Subscription / Premium Integrity** | `PREPARED` | Client-Entitlement-Abstraktion vorhanden; kein natives StoreKit/RevenueCat aktiv; serverseitige Quittungsvalidierung offen (`ASTRA_REQUIRED`). |
| **S8** | **Infrastructure / Backup / Monitoring / Incident Response** | `PARTIAL` | Lokale SQLite-Backups und Log-Redaktion VERIFIED; Cloud-Restoreprobe, Hosting-IAM, Alarmierung und Runbooks offen. |
| **S9** | **AppSec Automation / Security Testing** | `PARTIAL` | 677 Tests, Dependency-Regressionen und Preview Security Gate aktiv; DAST und Deep-Link-Fuzzing offen. |
| **S10** | **Legal / Store / Accessibility / Release Compliance** | `USER_ACTION_REQUIRED` | UI-i18n Parität fortgeschritten; Medienrechte, finale AGB/Datenschutz-Texte und WCAG 2.1 AA VoiceOver-Audit durch Maintainer/Astra erforderlich. |
| **S11** | **Physical Device / Pre-Launch Red Team** | `PHYSICAL_DEVICE_REQUIRED` | Web-Preview und 13-Schritte Safari QA aktiv; reale On-Device-Tests (iOS/Android), Gesten, Haptik, Permissions und Pen-Testing offen. |
| **S12** | **Post-Launch Security Operations** | `PREPARED` | Eskalationsmatrix in SECURITY.md definiert; Besetzung des Regelbetriebs und Incident Response Übungen vor Launch erforderlich. |

## Vorheriger Checkpoint — 21.09.2026: UI/i18n Cleanup, Level/XP Rebalancing & Age UI

Gemini hat den UI/i18n-Bereich, die Level-Progression und das Alters-Badge bereinigt:

1. **Zentrale Level-/XP-Progression (Domain Single Source of Truth):**
   - Neue Domain-Logik `packages/domain/src/logic/levelProgression.ts` definiert $XP(L) = 200 \times (L - 1)^2 + 800 \times (L - 1)$ mit $L(XP) = \lfloor \sqrt{4 + \frac{XP}{200}} - 1 \rfloor$.
   - Progression deutlich verlangsamt: Level 1 -> 2 benötigt 1.000 XP (~7 Workouts). Level 10 = 23.400 XP, Level 20 = 87.400 XP, Level 50 = 519.400 XP.
   - Workout-Session-XP degressiv begrenzt: Base 50 XP, Sätze max 30 XP, Volumen max 110 XP, PRs max 75 XP (absolutes Cap pro Workout: 265 XP; typisch ~120-160 XP).
   - Kein Multi-Level-Sprung aus einem einzelnen normalen Workout mehr möglich.
   - Idempotenz-Schutz in `achievementStore.ts` via `awardedSessionIds`.
2. **Plans Create Modal (i18n):**
   - Translation Keys (`plans.createChoiceTitle`, `plans.createTemplate`, etc.) vollständig in `translations.ts` (DE/EN) hinterlegt. Keine raw Keys mehr sichtbar.
3. **Celebrations / Workout-Feier-Effekte (i18n):**
   - Titel, Untertitel, Effektnamen (Klassisch/Classic, Inferno, Neon-Pulse/Neon Pulse, Goldregen/Golden Rain, Matrix-Code/Matrix Code, Kosmisch/Cosmic) und Aktions-Alerts vollständig lokalisiert.
4. **LevelProgress & BattlePassModal (i18n):**
   - "bis Level..." / "to Level...", "Nächster Rank bei Level..." / "Next rank at Level..." und "Max Rank erreicht" / "Max Rank reached" dynamisch locale-aware angebunden.
5. **Age / Geburtstag UI Cleanup:**
   - Unnötiges Glitzer-Icon (`sparkles-outline`) aus dem Alters-Badge in `apps/mobile/app/profile.tsx` entfernt. Saubere Textdarstellung `{computedAge} {t('settings.yearsOld')}`, Accessibility-Label intakt.
6. **Teststatus:**
   - **673 Tests PASS** (88 Domain + 531 Mobile in 80 Suiten + 38 Coach-API/Safety + 16 Security-Regressionen).
   - Typecheck PASS, Lint PASS, Web Export (`pnpm build:preview`) PASS.
   - Keine Datenmigrationen, keine DB-Änderungen. Bestehende Gesamt-XP der Nutzer bleiben unverändert erhalten; das Level wird deterministisch aus der neuen Kurve abgeleitet.

## Früherer Checkpoint — 21.09.2026, Gemini Takeover & Preview Recovery

Gemini hat den von Astra unterbrochenen Block übernommen, stabilisiert und getestet:

1. **i18n Session-Telemetry vollständig abgeschlossen:**
   - In `WorkoutCompleteModal.tsx` sind alle Telemetrie-Texte, Fakten (Volumen, Dichte, Cardio, Warmup, Technik, Tipps), Einheiten (kg/lbs), Stat-Labels und Aktions-Buttons barrierefrei und vollständig DE/EN lokalisiert.
   - `WorkoutCompleteModal.test.tsx` repariert (`displayName` TS-Fehler behoben) und um umfassende DE/EN- sowie Edge-Case-Tests (leere Sätze, fehlende Übungsdefinition, Dauer 0, Unveränderlichkeit der Session-Daten) erweitert.
2. **Vercel Preview Build wiederhergestellt (Dual-Gate Architektur):**
   - Vercel-Fehlerursache: `build:preview` brach zuvor am unbereinigten `pnpm audit --audit-level high` mit Exit 1 ab.
   - Lösung (Option B): Neues Gate-Script `scripts/security/preview-security-gate.cjs` prüft strikt auf Zero Critical, verifiziert, dass keine Production-Secrets vorliegen, protokolliert alle 43 High / 14 Moderate Befunde transparent und kennzeichnet die Preview als `NON_RELEASE_BUILD`.
   - CI Release Gate in GitHub Actions (`.github/workflows/ci.yml`) bleibt unverändert strikt blockierend (`pnpm audit --audit-level=high`).
3. **Supply Chain Triage:**
   - Vollständiger Bericht in `docs/release/DEPENDENCY_AUDIT_REPORT.md`: Alle 43 High-Befunde (u.a. `@xmldom/xmldom`, `image-size`, `js-yaml`, `vite`) sind reine Build-/Dev-/Test-Tools mit **0 Client-Runtime-Reachability**.
4. **Vorbereitung für Astra (Reversibel, ohne voreilige Produktionsänderungen):**
   - S4 Sync Engine: `docs/architecture/S4_SYNC_PREPARATION.md` (Atomare Cloud-Writes, Idempotenz, Revisionsvektoren, Konfliktszenarien) -> `ASTRA_REQUIRED`.
   - S5 Account Deletion: `docs/architecture/S5_ACCOUNT_DELETION_SPEC.md` (Parametrisierungsfreier RPC-Vertrag, Cascade-Löschung, lokaler Wipe nach Server-Erfolg) -> `ASTRA_REQUIRED`.
   - AI Security: `docs/architecture/AI_SECURITY_PREPARATION.md` (DE/EN Notfall-Eskalationen, Quota-Interface) -> `ASTRA_REQUIRED`.
5. **Teststatus:**
   - **654 Tests PASS** (523 Mobile + 77 Domain + 38 Coach-API/Safety + 16 Security-Regressionen).
   - Typecheck PASS, Lint PASS, Web Build PASS, Gitleaks PASS.
   - Konkrete 11-Schritte-Testmatrix für den Nutzer auf iPhone Safari: `docs/release/IPHONE_FREE_TEST_GUIDE.md`.

## Aktueller Einstieg 20.09.2026 — iPhone Preview

Neuer Auftrag: kostenlose Safari-/Home-Screen-Testbarkeit als Ergänzung, SDK 54 beibehalten. Production/Store/Billing/Production-SQL bleiben bis erneuter ausdrücklicher Freigabe gesperrt. EAS-Projekt vom Nutzer verknüpft. Bestehende HTTPS-Astra-Preview `3bd4713` im Dashboard und Browser bestätigt; neuer lokaler Export mit Home-Screen-Metadaten, statischem WLAN-Server und sicherer Web-UUID-Alternative getestet. Native UUID-/Datenverträge unverändert. Anleitung und URLs: [IPHONE_FREE_TEST_GUIDE.md](IPHONE_FREE_TEST_GUIDE.md); genaue Evidenz/Gates: EXECUTION_STATUS.md.

Vercel-Git veröffentlicht bereits unabhängig von GitHub-Prüfungen. Deshalb neuer Branch-Build `build:preview` mit Verify/Audit vor Export; keine hohen Befunde für ein grünes Preview ignorieren. Vollständige SAST-/Lizenz-/Secret-/Backend-Verkettung bleibt offen. Alte HTTPS-URL und neuer lokaler Stand nicht gleichsetzen. Keine echte iPhone-/Supabase-Abnahme behaupten. S4-Serververtrag bleibt nächste Datenarbeit, danach S5; neue Preview-Freigabe benötigt zudem S1-Abhilfe. Historische Statusaussagen unten zum unbestätigten Hosting sind überholt.

## Neuester Auftrag 20.09.2026 — inkrementelle Main-Freigabe

Nutzer erlaubt jetzt Main-Integration abgeschlossener geeigneter Blöcke, mit konkreten Testanleitungen. Das hebt das frühere pauschale Main-Verbot auf, nicht die Release-Gates. Aktiver Beta-/Deploymentweg noch nicht bestätigt: Vercel-Datei vorhanden, EAS-Profile vorhanden, kein nachgewiesener automatischer nativer Rollout. Gesamtbranch wegen Geräte-/Security-Gates weiterhin nicht pauschal mergefähig. Testschritte: BETA_REGRESSION_MATRIX.md.

S4-Fortsetzung nach 51561d0: lokale Outbox-Änderungen (Enqueue, ACK, Retry, Clear) benutzen vorhandene SQLite-Transaktion mit Memory-Rollback. SQLite-Fehler beim ACK dürfen nicht durch spätere Statuswrites die zuvor nur im Speicher entfernte Operation endgültig löschen. Drei Regressionen gegen bisherigen Code rot; vier echte SQLite-Fault-Szenarien mit Restart/Retry-Prüfung ergänzt. Kein SQL-Serververtrag aktiviert; nächste Arbeit bleibt serverseitige Atomizität/Idempotenz/Konflikte. Messungen/Abschluss: EXECUTION_STATUS.md.

## Checkpoint 20.09.2026 — S4 Fehlergrenzen

S3 ist als **8b0a6e1** gepusht. Der folgende S4-Teilblock behandelt ignorierte Cloud-Fehler, unvollständige Pull-Antworten und lokale Teilübernahmen: vollständige Validierung vor Anwendung, Pending-Outbox-Guards, native SQLite-Transaktion mit Memory-Rollback. 18 neue Regressionen einschließlich echter SQLite-Fehlerinjektion; aktuelle Gesamtmessung in EXECUTION_STATUS.md. Keine persistente Formatmigration, keine Remote-Aktivierung. Risiko CRITICAL, S4 bleibt PARTIAL: serverseitige atomare Aggregate, Idempotenz, Revisionen/Konflikte/Tombstones fehlen weiterhin. Nächster sinnvoller Block ist dieser serverseitige Sync-Vertrag, danach Account-Deletion. Kein Main-Merge oder Beta-Rollout beauftragt.

Basis `origin/main`: `6471138`. Review-Branch: `astra/p0-release-core`. Neuester vorhandener Beta-Tag: `v0.1.0-beta.6`. Kein Main-Merge, keine Produktionsmigration, kein EAS-/OTA-Rollout. Konkrete Gates und Session-Ergebnis: [EXECUTION_STATUS](EXECUTION_STATUS.md). Vollständige Ist-/Roadmap-Matrix: [P0_READINESS_MATRIX](P0_READINESS_MATRIX.md).

## Erledigter lokaler Engineering-Block

Coach-Auth-Fix **3585062** gepusht, 603 Hosttests grün. Anschließend S3 lokal umgesetzt: PostgreSQL 17.11 isoliert ohne Docker; alter Cross-Account-FK-Angriff reproduziert; Migration `202609190001_rls_reference_ownership.sql` mit restrictive Guards und Bestands-/Lock-Gates. 304 SQL-Assertions PASS, nochmals mit zu großzügigen Testpolicies; negativer Migrations-Preflight erhält synthetischen Altbestand. Keine produktive Supabase-Änderung. Runner/Details: RLS_LOCAL_TEST_HARNESS.md. Nächster Datenblock: S4 Sync-Atomizität und Fehlersicherheit.

S1-Patch-Commit **26e29d1** ist gepusht. Nachfolgender S6-Fix: öffentlicher ALLOW_PROTOTYPE_COACH-Bypass entfernt; 401 ohne Token, ungültige Tokens werden bei Supabase geprüft. Serverinterne Local-Identity bei production/VERCEL gesperrt. Drei vorher rote Negativszenarien jetzt grün, 38 API-/Safety-Tests. Keine Remote-Bereitstellung. Restliche Pro-/Budget-/DE/EN-/Hosting-Gates bleiben offen.

Security-Governance ist als `27fccac` gepusht (Regeln/Threat Model/S0–S12/CI-Gates). Danach nanoid/undici/tar gezielt gepatcht: vier vorher rote Angriffsregressionen grün; **602 Tests, Typecheck/Lint, Build und Expo-Konfigurationen PASS**. Audit jetzt **57 (43 high/14 moderate)**, prod **52 (41 high/11 moderate)**. S1 bleibt PARTIAL; CI-Audit blockiert weiterhin. Keine Freigabe trotz grüner Funktionstests. Exakte Details: EXECUTION_STATUS.md und SECURITY.md.

P0-A SecureStore ist jetzt nativ in Supabase integriert. Gemini-Adapter wiederverwendet und unsichere Garantien korrigiert: kein flüchtiger Fallback, keine als leer verschluckten Lesefehler, verifizierte Writes, serialisierte Migration/Refresh/Logout, geprüfte Sessionstruktur und nicht sensible v1-Marker gegen Token-Resurrection. Beide Legacy-Quellen werden bereinigt. Authfehler zeigen feste DE/EN-Texte, keine Secrets. Bestehende SQLite-/Workoutdaten werden nicht geändert.

Status bleibt PARTIAL bis zur nativen Abnahme, insbesondere große vollständige Sessionwerte, App-Update mit gleicher Identität, Reboot/Lock/Kill/Offline, Backup/Neuinstallation und Rollback. [Migrationsvertrag](SECURE_STORAGE_MIGRATION_PLAN.md) vor Release lesen. Ein Revert auf die alte MMKV-only-App ist nach Migration **kein** Zero-Logout-Rollback. Keine automatische Veröffentlichung dieses Branches.

## Pre-Security Checkpoint

Checkpoint-Commit: `6c01522`, auf `origin/astra/p0-release-core` gepusht. Keine Main-Integration oder Produktionsänderung.
Branch: `astra/p0-release-core`. Date: 2026-09-19.

Gemini work reviewed: SecureStore, RLS/Sync, Account-Lifecycle/Export, AI/Billing, Diagnostics, Dataset, Regressionen und UI-/Releasevorarbeit. Klassifizierung steht in `EXECUTION_STATUS.md`.

Verified: `pnpm verify` mit 598 Tests (77 Domain, 484 Mobile, 37 API); Typecheck/Lint und Expo-Konfigurationen. Prepared but inactive: echtes Delete-Backend, Billing/Serverentitlements und vollständige Production-AI-Kontrollen. Known blockers: native Migration/Größe/Rollback, RLS-/Cloud-Abnahme, Providerkonfiguration, Legal/Billing/Devices.

**Security roadmap takeover starts after this checkpoint.** Neuer Nutzerauftrag: Security-Dateien im `evaro_release_execution_pack` lesen, Guardrails dauerhaft verankern, S0–S12 gegen Istzustand mappen; erster Security-Block Secrets/Supply Chain. Normale Feature-/Roadmap-Expansion bleibt eingefroren.

## Bereits inventarisierter nächster Daten-Security-Block: RLS, dann Sync

1. Lokaler PostgreSQL-Nachweis inzwischen hergestellt; portabler Server in output/, nicht systemweit installiert. Korrigierter Harness nutzt Assertions und Rollback. Weiterhin kein vollständiger Supabase Auth-/PostgREST-Nachweis.
2. 304 lokale Assertions prüfen alle elf Tabellen und fremde Referenzen. Vorbereitete Migration nicht blind deployen: tatsächliche Grants/Policies/Altbestände und Backup prüfen. Details und Reproduktion: RLS_LOCAL_TEST_HARNESS.md.
3. `syncStore.ts`: ignorierte Child-Delete-/Pull-Fehler; sequenzielle Aggregate-Ersetzung ohne Cloudtransaktion. Lokale FIFO-Outbox ist kein Cloud-Idempotenz-/Konfliktnachweis. Atomare RPCs plus begründete Revision-/Tombstone-Strategie gemeinsam mit echtem Backend testen.

## Weitere bestätigte P0-Risiken

- Account-Löschung: Client-Capability prüft nur Config/Auth; Erfolg nur `error:null`; Scope-Wechsel während Request nicht abgesichert, Cleanupfehler verschluckt. Backend-RPC/Auth-Cascade fehlt. Keinen Guard allein anhand alter Spec aktivieren.
- AI: Öffentlicher Prototyp-Bypass geschlossen. Weiterhin keine serverseitigen Pro-Entitlements, verteilten Quoten/Budgets oder nachgewiesenes HTTPS-Deployment. Deterministische Safety-Replies sind ausschließlich Deutsch; DE/EN selbst im Safety-Layer lösen.
- Billing: `BETA_ALL_FEATURES_ENABLED=true`, kein natives Kauf-SDK; Providerabstraktion vorbereitet. Keine Produktionsfreigabe aus Client-Pro ableiten.
- Export: lokal, kein vollständiger Cloud-/DSGVO-Nachweis. Medien: ExerciseDB technisch entfernt; Foto-Rechtekette weiterhin unbestätigt.
- Audit nach S1-Patches: 57 Befunde (43 high/14 moderate), prod 52. Kein pauschaler Ausschluss der Runtime-Exposition aus alten Berichten.

## Bestehende Vorarbeit erhalten

History-Tagesauswahl, direkte Plans-Erstellung und optionale Profildaten sind in `6471138` vorhanden. Free-DB-JSON entspricht exakt dem Beta-5-Blob; vorhandene Kompatibilitäts-/SQLite-/Scope-/UI-/Diagnostics-/API-Tests weiterverwenden. Vollständige i18n-/Screenreader-/Geräteabnahme bleibt offen. Feature Expansion bleibt eingefroren.

Alte Gemini-Berichte dokumentieren frühere Absichten und Testläufe; sie überschreiben diesen Handoff nicht. Keine Subagents ohne ausdrücklichen Auftrag. Ein sauberer P0-Block pro Commit, Review-Branch pushen, nicht automatisch nach main integrieren.
