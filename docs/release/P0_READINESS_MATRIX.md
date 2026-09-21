# EVARO Current State Matrix — Astra / Gemini 2026-09-21

Aktualisierung 21.09.2026 (Roadmap-Blöcke 1–5: A11y, S4 Fixtures, Supply Chain Triage, S5 Deletion, AI Safety DE/EN): Barrierefreiheits-Audit & Touch-Targets $\ge 44 \times 44$\,pt implementiert und getestet; „Jahre / years“-Badge über Geburtsdatum in Profile entfernt; 17 S4 Sync Failure Fixtures implementiert; 41 von 43 High Dependency Findings via Minor/Patch Overrides behoben (verbleibend nur 2 in `image-size`); S5 Account Deletion Contract Suite (13 Tests, Zero Data Loss); zweisprachige AI Safety DE/EN Suite (49 Tests). **721 Tests grün** (Typecheck/Lint/Build PASS). S4, S5 und AI-Cost-Architektur für Astra vorbereitet (`ASTRA_REQUIRED`). Keine Production-/Main-Integration, Remote-Migration oder Billing-Aktivierung.

## Security Roadmap S0–S12 — maßgeblicher Ausführungspfad

Basis: Code-Audit und Checkpoint `6c01522`, Guardrails und zehnseitige Security-Roadmap im Release-Pack. Owner bedeutet technische Zuständigkeit, keine bereits erteilte Produktionsfreigabe. Kein Bereich ist allein aufgrund vorhandener Dokumente DONE. Feature Expansion bleibt eingefroren.

| Block | Current state / Gemini preparation | Verified controls | Missing controls | Risk / release relevance | Astra action / owner | Status |
|---|---|---|---|---|---|---|
| S0 Repository Truth / Threat Model | Architektur, Datenkarte, Security-Specs; neue verbindliche Guardrails | Codebezogene Grenzen und Angriffe in SECURITY.md; Agent-Einstieg verlinkt | Team-/Betriebsabnahme, deployed Datenflüsse und Owner bestätigen | HIGH / P0 | Threat Model bei Vertragsänderung pflegen; Astra + Nutzer Betrieb | PARTIAL |
| S1 Secrets / Supply Chain / CI | 41 von 43 High Findings behoben; Frozen Lockfile, gehärtete CI; Preview Security Gate (Zero Critical) | History-/Bundle-Scan, Fixture-Triage, SHA/Minimalrechte; Overrides in pnpm-workspace.yaml | Noch 2 Audit-Befunde (image-size DoS in Build-Tools); SAST/Lizenzen/SBOM, Branch Protection | HIGH / P0 | Rest-Upgrade via künftiges Expo SDK 53+; Astra, Nutzer Remote-Settings | PARTIAL |
| S2 Authentication / Secure Session Storage | Gemini Adapter jetzt native Integration | 598 Gesamt-Tests; Dual-Read, Readback, Serialisierung, Fehler-/Logoutguards | Echte iOS/Android-Migration, große Sessions, Reboot/Backup; Deep Links/Refresh/Reauth | HIGH / P0 | Native Abnahme + Auth-Missbrauchstests; Astra / Geräteowner | PHYSICAL_DEVICE_REQUIRED |
| S3 Authorization / RLS / Multi-Tenant Isolation | Versionierte restrictive Guards, korrigierter Harness, echter lokaler PostgreSQL | 304 Assertions; Baseline-Angriff reproduziert; permissive OR-Bypasses und Migrations-Abbruch geprüft | Supabase Auth/PostgREST/Remote-Schema/Grants und reales Deployment | CRITICAL / P0 | Lokalen Vertrag für Sync nutzen; Remote-Abnahme separat, Astra + Nutzer Zugang | PARTIAL |
| S4 Sync / Data Integrity | SQLite/Scope/FIFO, strikte Pull-Validierung, Fehlerweitergabe, Rollback und 17 Failure-Fixtures | 39 Resilienz-Regressionen inklusive echter SQLite-Fehlerinjektion und Failure-Fixtures | Cloud-Atomizität, Idempotenz, Konflikte, Tombstones, Multi-Device | CRITICAL / P0 | Serverseitigen Transaktionsvertrag ergänzen; Astra | PARTIAL |
| S5 Account Lifecycle / Privacy / Health Data | Defensiver Delete-Client, lokaler Export, S5 RPC-Spec & 13 Contract-Tests (Zero-Data-Loss) | 13 Client-Contract-Tests (No-IDOR, Idempotenz, Wipe nach Cloud-Success) | Delete-RPC/Auth-Cascade/Idempotenz auf Supabase, Cloud-Export, Retention | CRITICAL / P0 | Backendvertrag auf Supabase deployen; Astra, Nutzer Privacy | PREPARED |
| S6 AI Coach Security / Safety / Cost Controls | Serverproxy; öffentlicher Prototyp-Bypass entfernt; zweisprachige DE/EN Guardrail-Schicht | 49 API-/Safety-Tests (Notfälle DE/EN, Starvation, PEDs, Injection, System-Prompt); Auth gesperrt | Server-Pro, verteilte Limits/Budget, Kill Switch; reale Auth-/Hosting-Abnahme | CRITICAL / P0 | Produktionsvertrag vervollständigen; Astra / Nutzer Providerbetrieb | PARTIAL |
| S7 Subscription / Premium Integrity | Entitlement-Abstraktion, globaler Beta-Bypass | Client-Vertragstests | Store-IAP, Serverquelle/Webhooks/Restore, Produktkonfiguration | HIGH / P1, vor Paid Release | Keine Client-Pro-Autorität; Astra / Nutzer Store-Verträge | PREPARED |
| S8 Infrastructure / Backup / Monitoring / Incident Response | Lokale Backups und Diagnosebuffer | Lokale Recovery-Tests | Echte Cloud-Restoreprobe, IAM, Alarmierung, Incident-/Deploymentprozesse | HIGH / P0–P1 | Restore/Runbooks ohne Rohdaten; Astra / Nutzer Betrieb | PARTIAL |
| S9 AppSec Automation / Security Testing | Validierung, gebundene lokale SQL, bestehende Media-Grenzen, 721 Tests | 721 Tests, Scope-Regressionen, Supply-Chain-Triage, Preview Security Gate | SAST/DAST, Deep-Link-/Upload-/Netzwerk-Missbrauch, Plattformkonfiguration | HIGH / P0–P1 | Angriffsflächen gezielt testen; Astra | PARTIAL |
| S10 Legal / Store / Accessibility / Release Compliance | Checklisten, Herkunftsdokumente, DE/EN UI, A11y-Audit (Touch $\ge 44 \times 44$\,pt) | Dataset-Blob kompatibel; A11y-Komponentensuite (6 Tests PASS) | Medienrechte, Texte/Verträge/Retention, Store-Privacy, reale VoiceOver-Abnahme auf iPhone | HIGH / P0–P1 | Technische Fakten liefern; Nutzer Recht/Business, Astra A11y | USER_ACTION_REQUIRED |
| S11 Physical Device / Pre-Launch Red Team | Geräte-/Beta-Matrizen; kostenloser iPhone Safari QA-Pfad aktiv | Hosttests und Web-Build; 13-Schritte Safari QA | Reale iOS/Android-Abnahme, Pen-/Missbrauchstests, signierte Builds, Restore/Purchase | CRITICAL / P0 | Checklisten auf Builds ausführen; Geräteowner + Astra | PHYSICAL_DEVICE_REQUIRED |
| S12 Post-Launch Security Operations | Guardrails nennen Betriebsrhythmus | Rhythmus und Eskalation in SECURITY.md verankert | Verantwortliche, Infrastruktur, praktische IR-/Restoreübungen | HIGH / P2+ dauerhaft | Regelbetrieb vor Launch besetzen; Nutzer Betrieb + Astra | PREPARED |

Security-Gates bleiben releaseblockierend, auch wenn die technische Test-Suite grün ist. Reihenfolge: S0/S1, S2-Gerätenachweis, S3/S4/S5; parallel unabhängig vorbereitbare S6-Korrekturen. Keine Remote-Migration ohne Review.

## Produkt- und technische Ausgangsmatrix

Auditbasis: `6471138`, frisch gefetchtes `origin/main`; Branch `astra/p0-release-core`. Diese Bewertung hat Vorrang vor dem historischen Gemini-Stand unten. Hosttests ersetzen keine Geräte-/Cloud-Abnahme. Messergebnisse: `EXECUTION_STATUS.md`.

| Area | Current implementation | Gemini preparation | Tests / evidence | Risk | Remaining work | Astra action |
|---|---|---|---|---|---|---|
| Native | Expo 54 / RN 0.81, SQLite, EAS-Profile | Preview/Simulator, Permissions | Config + Hosttests | HIGH | Signierte Builds, Geräte; Bundle-ID erhalten | VERIFY |
| Auth | Supabase, Partitionen/Generation-Guard | Auth-/Scope-Tests | `authStore`, `accountScope` | HIGH | Persistenz, Fehlerpfade, Deep-Links/Refresh | MODIFY |
| Secure Storage | Native Supabase-Integration mit serialisiertem Dual-Read, Readback/Logout-Marker; keine RAM-Fallbacks | Adapter/Tests korrigiert und wiederverwendet | Regressionen + installierter Supabase-SDK; keine Geräteabnahme | HIGH | Reale Migration, große Payloads, Reboot/Backup/Rollback prüfen | PARTIAL / PHYSICAL_DEVICE_REQUIRED |
| RLS | 11 Tabellen plus restrictive Ownership-/FK-Guards als Migration | Gemini-Matrix wiederverwendet, Harness ersetzt | Echte PostgreSQL-17.11-Tests: 304 Assertions, adversarial Policies, Rollback/Preflight | CRITICAL | Supabase API-/Deploymentzustand und Bestandsdaten prüfen | PARTIAL |
| Sync | FIFO-Outbox, Retry-Erhalt, Scope; Cloud-Fehler behandelt, Pull vor Anwendung validiert | 17 Failure-Fixtures in `syncFailureScenarios.test.ts` implementiert | 39 Fehlergrenzen-Regressionen; kein Multi-Device-Backendtest | CRITICAL | Atomare Cloud-Aggregate, Konflikte/Tombstones, Seeds | PARTIAL |
| Data Integrity | SQLite v2, Finish-Transaktion, Backups/Hydration | Vertrags-/Recovery-Tests | Echte Host-SQLite-Tests vorhanden | CRITICAL | Cloud-Atomizität, Altbesitzer, Gastidentität, Crash/Low-Space | VERIFY / MODIFY |
| Account Deletion | Client-RPC; 13 Contract-Tests (No-IDOR, Idempotenz, Zero Data Loss) | Spec, Client-Vertragstests in `accountDeletionContract.test.ts` | 13 Contract-Tests PASS; lokaler Wipe erst nach Remote-Success | CRITICAL | Supabase-Deployment des RPCs, Cascade/Auth-Delete | PREPARED / ASTRA_REQUIRED |
| Data Export | Lokaler Collector plus Profil-Export | Spec, Collector-Tests | LOCAL_EXPORT_ONLY; kein Cloud-Export | HIGH | Exportpfade/Umfang prüfen; aktuelles Workout/Settings/Queue/Cloud | VERIFY / MODIFY |
| AI Backend | Node-Proxy, Tokenprüfung, Timeout, Serverkey; öffentlicher Prototyp-Bypass entfernt | Client-/API-Tests korrigiert | 49 API-/Safety-Tests; Provider hier nicht konfiguriert | CRITICAL | HTTPS-Deployment, Pro/Budget, reale Auth-Abnahme | PARTIAL |
| AI Safety | Deterministische Regeln, zweisprachige DE/EN Notfall- und Guardrail-Schicht | 49 Safety-Tests in `coach-safety.test.cjs` | Notfälle DE & EN, Starvation, PEDs, Injections, Leaks | HIGH | Serverseitiges Token-Ledger & Quota-Storage | VERIFY |
| AI Cost Control | In-Memory-Limit | Produktions-Testplan | Kein verteiltes Usage-/Budget-Ledger | CRITICAL | Server-Pro, verteilte Limits, Budget, wirksamer Kill-Switch | ASTRA_REQUIRED |
| Subscriptions | Kein natives Billing-SDK | Integrationsplan, Fehler-Mocks | Keine echten Käufe/Restore | HIGH | SDKs, Produkte, Webhooks, Verträge | ASTRA_REQUIRED / USER_ACTION_REQUIRED |
| Entitlements | Provider-Abstraktion, evaro_pro, globaler Beta-Bypass true | Cache-/Provider-Tests | Clientzustand ist keine Autorisierung | HIGH | Produktions-Bypass sperren, Serverautorität, Scope | MODIFY |
| Exercise Dataset | 873 Free-DB-Übungen, deterministische IDs, Fotofallback | Kompatibilität/Provenienz | Dataset-Blob identisch mit Beta 5 (`494916a8`); Foto-Rechtekette unbewiesen | HIGH | Medienrechte/Alternative, Quellen pinnen | VERIFY / USER_ACTION_REQUIRED |
| Privacy | Logger, Platzhaltertexte, lokaler Export | Datenkarte/Redaktionstests | Keine vollständige Rechts-/Consent-Freigabe | HIGH | Consent, Texte/Kontakte, Cloud-Export | ASTRA_REQUIRED / USER_ACTION_REQUIRED |
| Observability | Lokaler Ringbuffer, ErrorBoundary | Eventmodell/Sanitizer | Keine Drittanbieter-Telemetrie; beliebige Metadaten als Restrisiko | MEDIUM | Allowlist vor externem Versand; Flags auf Durchsetzung prüfen | VERIFY / MODIFY |
| Accessibility | Labels/Roles, Touch-Targets $\ge 44 \times 44$\,pt, UI-Härtung | A11y-Audit-Suite in `accessibilityAudit.test.tsx` | 6 A11y-Tests PASS; Gesten und Roles geprüft | MEDIUM | Reales VoiceOver/TalkBack auf echtem Gerät | PHYSICAL_DEVICE_REQUIRED |
| Device QA | Host-Regressionssuite | Smoke-/Beta-/Device-Matrizen | Keine reale iOS-/Android-Abnahme | HIGH | Haptik/Audio/Keyboard/Gesten/Lock/Kill/Permissions/Käufe/Restore | PHYSICAL_DEVICE_REQUIRED |
| Store Readiness | EAS, Metadata-/Review-Entwürfe | Submission-/Screenshot-Plan | Keine Einreichung | HIGH | P0-Gates, Identität, Legal, Produkte, Reviewzugang | USER_ACTION_REQUIRED |

## Roadmap gegen Code

| Phase | Status | Offenes Gate |
|---|---|---|
| P00 Baseline / Freeze | PARTIAL | Frische Gates dokumentieren; Feature Freeze gilt |
| P01 Native Foundation | PARTIAL | Signierte Builds und Geräteabnahme |
| P02 Security / Data Integrity | PARTIAL | Native SecureStore-Abnahme, Supabase-RLS, Cloud-Konflikte/Atomizität, Account-Löschung |
| P03 AI Backend | PARTIAL | HTTPS-Preview vorhanden; reale Auth/Pro, verteilte Quoten/Budget, DE/EN Safety offen |
| P04 Privacy / Legal / Licensing | USER_ACTION_REQUIRED | Rechtstexte/Kontakte, Foto-Rechte; Consent/Export technisch offen |
| P05 Subscriptions | PREPARED | SDKs/Serverentitlements, Produkte/Verträge |
| P06 Onboarding / Paywall | PARTIAL | Onboarding vorhanden, reale Paywall fehlt |
| P07 Push / Haptics / Audio | PARTIAL | Audio/Haptik vorhanden, Push fehlt, Geräteabnahme |
| P08 Analytics / Monitoring / Support | PARTIAL | Lokale Diagnostics; Support/Production-Monitoring offen |
| P09 QA / Accessibility / Performance | PARTIAL | Hosttests; Geräte/Screenreader/Performance offen |
| P10 Store Submission | PREPARED | Checklisten/Entwürfe; P0-Gates/Submission offen |
| P11 Launch | BLOCKED | Keine Releasefreigabe |

History-Tagesauswahl (inklusive leerem Tag/mehreren Sessions), direkte Template-/Programmanlage und optionale Profilangaben sind im Code vorhanden. `targetedUiEnhancementsRegression.test.ts` prüft Storepfade ohne History/XP-Nebeneffekte, nicht vollständige UI-End-to-End-Abläufe. Vollständige DE/EN-Abnahme bleibt offen; Safety ist ein bestätigtes P0-Detail.

## Historischer Gemini-Stand (überholt; keine aktuelle Freigabe)

**Stand:** 17. September 2026  
**Checkpoint:** `READY_FOR_ASTRA_CORE_TAKEOVER` (Head, 537 Tests Passing)  
**Zweck:** Vollständiger, ehrlicher Ist-Zustand aller P0- und geschäftskritischen Bereiche für den nachfolgenden ChatGPT-Astra-Agenten. Keine Behauptung von Production-Readiness ohne hieb- und stichfeste technische Evidenz.

---

## Matrix-Übersicht

| Bereich | Aktueller Status | Implementiert | Getestet | Production-ready | Astra Review | User Action |
|---|---|---|---|---|---|---|
| **Native Release Foundation** | `READY_FOR_PREVIEW` | YES (Expo SDK 54, `app.json` Plugins, EAS Profiles) | YES (Typecheck, Lint, Config Introspect) | PARTIAL (EAS Preview bereit, Store-Provisioning offen) | AR-001 | Apple Developer Team & Google Play Console Account verknüpfen |
| **Data Integrity** | `SCAFFOLDED & VERIFIED` | YES (SQLite v2 Document/Normalized Schema, Zod Hydration) | YES (Contract Tests, Large Dataset Benchmarks) | YES (Lokal für Beta-User, Cloud-Synchronisation entkoppelt) | AR-004, AR-010 | Keine |
| **Sync Engine** | `PREPARED / LOCAL_ONLY` | PARTIAL (Outbox-Queue, Retry-Loop, Scope Boundary) | PARTIAL (Local Queue Tests, Mock Reconnect) | NO (Konfliktmodell, Revisions & Server-Tombstones fehlen) | AR-004, AR-019 | Supabase Realtime & Replication aktivieren |
| **Authentication** | `FUNCTIONAL_BETA` | YES (Supabase Email/Passwort, Gast-Modus, Session Cache) | YES (AuthStore Tests, Reset Flows) | PARTIAL (OAuth Apple/Google fehlt, Session-Storage noch MMKV) | AR-005, AR-013 | Apple Developer Sign-in Service ID registrieren |
| **Secure Storage** | `SCAFFOLDED` | YES (`secureStorage.ts` Adapter vorbereitet) | YES (Dual-Read/Fallback Unit Tests) | NO (Aktive Session-Migration bewusst auf Astra geparkt) | AR-013 | Keychain Sharing / Keystore Auth bestätigen |
| **RLS (Row Level Security)** | `AUDITED / SCHEMA_READY` | YES (`docs/schema.sql` enthält 12 RLS-Policies) | PARTIAL (Statischer Audit, Negative-Test-Matrix definiert) | NO (Noch nicht auf aktiver Supabase-Produktions-DB deployed) | AR-004, AR-019 | Supabase DDL Migration anwenden |
| **Account Deletion** | `SPECIFIED & SCAFFOLDED` | YES (Client Service Abstraktion, SQL RPC Spezifikation) | YES (Client State Cleanup Tests, Mock Guards) | NO (PostgreSQL `delete_user_account()` RPC auf Cloud offen) | AR-014 | SQL-Funktion in Supabase Dashboard einspielen |
| **Data Export (Art. 20)** | `SCAFFOLDED & TESTED` | YES (`dataExportService.ts` mit JSON Collector) | YES (DSGVO Contract Test, Benchmark 38 ms) | PARTIAL (Lokaler Komplett-Export fertig; Cloud-Export abhängig von Sync) | AR-015 | Keine |
| **AI Backend (Coach API)** | `HARDENED_PROXY` | YES (Vercel Serverless Proxy, Timeout, AbortSignal) | YES (Client Resilience Tests, Provider Checks) | PARTIAL (Lokal/Vercel verifiziert; Produktions-Auth an Supabase gebunden) | AR-002, AR-007 | OpenRouter/Groq Produktions-Guthaben hinterlegen |
| **AI Safety & Guardrails** | `TEST_HARNESS_READY` | YES (Strukturierte Aktions-Validierung, Safety Matrix) | YES (Deterministsche Safety-Cases für Notfälle/Verletzungen) | PARTIAL (System-Prompt Hardening für medizinische Notfälle vorbereitet) | AR-007, AR-018 | Notfall-Haftungsausschluss juristisch freigeben |
| **AI Cost & Rate Limits** | `PREPARED` | PARTIAL (Prototyp-Limit 6 Req/Tag, Server Validierung) | YES (Unit Tests für 429 & Credit Preservation) | NO (Serverseitiges Redis/Usage-Ledger für Pro-Tier fehlt) | AR-007, AR-018 | OpenRouter Spending Limit festlegen |
| **Exercise Licensing** | `PARTIAL` | YES (Kostenlose `free-exercise-db`, ExerciseDB restlos entfernt) | YES (873 Übungen, ID-Stabilität 100%, Schema & Legacy gifUrl Tests) | PARTIAL (Data: Unlicense VERIFIED; Fotos: Vorherige Urheberschaft unbestätigt) | AR-017, AR-024 | Entscheidung: Option A (Fotos mit Fallback) vs. Option B (SVG Anatomie) |
| **Feature Entitlements** | `SCAFFOLDED` | YES (`entitlementService.ts` Provider-Abstraktion) | YES (Feature Gating Tests, Grace Period Tests) | YES (Beta-Modus: Alle Features aktiv, kein Nutzer gesperrt) | AR-016 | Pricing & Free-Tier Limits final bestätigen |
| **Privacy & DSGVO** | `SPECIFIED` | YES (Privacy-safe Logger, Consent Flags vorbereitet) | YES (Automatisierte Token-Redaktionstests) | PARTIAL (Datenschutzerklärung & Impressum müssen verlinkt werden) | AR-003, AR-015 | Offizielle Datenschutz-URL bereitstellen |
| **Store Compliance** | `TECHNICAL_AUDIT_PASS` | YES (Permission Strings in `app.json`, Account Delete Hook) | YES (EAS Config Introspect) | PARTIAL (Screenshots, Marketingtexte, Reviewer-Account fehlen) | AR-021 | Demo-Account für Apple App Review Team anlegen |
| **Physical Device QA** | `CHECKLIST_READY` | YES (`DEVICE_QA_CHECKLIST.md` für 7 Test-Kategorien) | PARTIAL (Simulatoren & Web-Smoke grün; physische iOS/Android Geräte offen) | NO (Physische On-Device Abnahme vor TestFlight notwendig) | AR-001 | TestFlight Build auf echtem iPhone installieren |

---

## Legende

- **READY_FOR_PREVIEW:** Technische Voraussetzungen im Repository erfüllt, erfordert Cloud-Credentials.
- **SCAFFOLDED:** Code-Interfaces, Adapter und Test-Harnesses existieren und sind getestet, laufen aber noch isoliert bzw. im sicheren Entwicklungsmodus.
- **AUDITED:** Vollständige statische und dynamische Sicherheitsanalyse abgeschlossen.
- **PARTIAL:** Wesentliche Kernkomponenten vorhanden, einzelne Gates (z. B. externe Konfiguration oder Medienbeweis) offen.
- **NO:** Bewusst nicht produktiv geschaltet, um Risiken oder Datenverlust für Beta-Nutzer auszuschließen.
