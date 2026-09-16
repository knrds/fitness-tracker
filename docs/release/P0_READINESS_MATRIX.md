# EVARO P0 Readiness Matrix

**Stand:** 16. September 2026  
**Checkpoint:** `READY_FOR_BETA_6_TAG` (Head `0cb299f`, 488 Tests Passing)  
**Zweck:** Vollständiger, ehrlicher Ist-Zustand aller P0- und geschäftskritischen Bereiche für den nachfolgenden ChatGPT-Astra-Agenten. Keine Behauptung von Production-Readiness ohne hieb- und stichfeste technische Evidenz.

---

## Matrix-Übersicht

| Bereich | Aktueller Status | Implementiert | Getestet | Production-ready | Astra Review | User Action |
|---|---|---|---|---|---|---|
| **Native Release Foundation** | `READY_FOR_PREVIEW` | YES (Expo SDK 54, `app.json` Plugins, EAS Profiles) | YES (Typecheck, Lint, Config Introspect) | PARTIAL (EAS Preview bereit, Store-Provisioning offen) | AR-001 | Apple Developer Team & Google Play Console Account verknüpfen |
| **Data Integrity** | `SCAFFOLDED & VERIFIED` | YES (SQLite v2 Document/Normalized Schema, Zod Hydration) | YES (Contract Tests, Large Dataset Benchmarks) | YES (Lokal für Beta-User, Cloud-Synchronisation entkoppelt) | AR-004, AR-010 | Keine |
| **Sync Engine** | `PREPARED / LOCAL_ONLY` | PARTIAL (Outbox-Queue, Retry-Loop, Scope Boundary) | PARTIAL (Local Queue Tests, Mock Reconnect) | NO (Konfliktmodell, Revisions & Server-Tombstones fehlen) | AR-004 | Supabase Realtime & Replication aktivieren |
| **Authentication** | `FUNCTIONAL_BETA` | YES (Supabase Email/Passwort, Gast-Modus, Session Cache) | YES (AuthStore Tests, Reset Flows) | PARTIAL (OAuth Apple/Google fehlt, Session-Storage noch MMKV) | AR-005 | Apple Developer Sign-in Service ID registrieren |
| **Secure Storage** | `SCAFFOLDED` | YES (`secureStorage.ts` Adapter vorbereitet) | YES (Dual-Read/Fallback Unit Tests) | NO (Aktive Session-Migration bewusst auf Astra geparkt) | AR-005, AR-013 | Keychain Sharing / Keystore Auth bestätigen |
| **RLS (Row Level Security)** | `AUDITED / SCHEMA_READY` | YES (`docs/schema.sql` enthält 12 RLS-Policies) | PARTIAL (Statischer Audit, Negative-Test-Matrix definiert) | NO (Noch nicht auf aktiver Supabase-Produktions-DB deployed) | AR-014 | Supabase DDL Migration anwenden |
| **Account Deletion** | `SPECIFIED & SCAFFOLDED` | YES (Client Service Abstraktion, SQL RPC Spezifikation) | YES (Client State Cleanup Tests, Mock Guards) | NO (PostgreSQL `delete_user_account()` RPC auf Cloud offen) | AR-006, AR-015 | SQL-Funktion in Supabase Dashboard einspielen |
| **Data Export (Art. 20)** | `SCAFFOLDED & TESTED` | YES (`dataExportService.ts` mit JSON Collector) | YES (DSGVO Contract Test, Benchmark 38 ms) | PARTIAL (Lokaler Komplett-Export fertig; Cloud-Export abhängig von Sync) | AR-006, AR-016 | Keine |
| **AI Backend (Coach API)** | `HARDENED_PROXY` | YES (Vercel Serverless Proxy, Timeout, AbortSignal) | YES (Client Resilience Tests, Provider Checks) | PARTIAL (Lokal/Vercel verifiziert; Produktions-Auth an Supabase gebunden) | AR-002, AR-007 | OpenRouter/Groq Produktions-Guthaben hinterlegen |
| **AI Safety & Guardrails** | `TEST_HARNESS_READY` | YES (Strukturierte Aktions-Validierung, Safety Matrix) | YES (Deterministsche Safety-Cases für Notfälle/Verletzungen) | PARTIAL (System-Prompt Hardening für medizinische Notfälle vorbereitet) | AR-007, AR-017 | Notfall-Haftungsausschluss juristisch freigeben |
| **AI Cost & Rate Limits** | `PREPARED` | PARTIAL (Prototyp-Limit 6 Req/Tag, Server Validierung) | YES (Unit Tests für 429 & Credit Preservation) | NO (Serverseitiges Redis/Usage-Ledger für Pro-Tier fehlt) | AR-007 | OpenRouter Spending Limit festlegen |
| **Exercise Licensing** | `DECOUPLED / PLAN_READY` | YES (`getExerciseMedia.ts` Multi-Tier Fallback Resolver) | YES (Fallback Tests auf AnatomyFigure & Barbell Icon) | NO (ExerciseDB Lizenznachweis noch unbestätigt) | AR-009, AR-018 | Kommerziellen Lizenznachweis für ExerciseDB klären |
| **In-App Subscriptions** | `SPECIFIED` | PARTIAL (Architektur-Spec für RevenueCat & StoreKit 2) | PARTIAL (Mocks & Matrix dokumentiert) | NO (`react-native-purchases` noch nicht produktiv gebündelt) | AR-008, AR-019 | RevenueCat Projekt anlegen & Shared Secret eintragen |
| **Feature Entitlements** | `SCAFFOLDED` | YES (`entitlementService.ts` Provider-Abstraktion) | YES (Feature Gating Tests, Grace Period Tests) | YES (Beta-Modus: Alle Features aktiv, kein Nutzer gesperrt) | AR-008, AR-020 | Pricing & Free-Tier Limits final bestätigen |
| **Privacy & DSGVO** | `SPECIFIED` | YES (Privacy-safe Logger, Consent Flags vorbereitet) | YES (Automatisierte Token-Redaktionstests) | PARTIAL (Datenschutzerklärung & Impressum müssen verlinkt werden) | AR-003 | Offizielle Datenschutz-URL bereitstellen |
| **Store Compliance** | `TECHNICAL_AUDIT_PASS` | YES (Permission Strings in `app.json`, Account Delete Hook) | YES (EAS Config Introspect) | PARTIAL (Screenshots, Marketingtexte, Reviewer-Account fehlen) | AR-021 | Demo-Account für Apple App Review Team anlegen |
| **Physical Device QA** | `CHECKLIST_READY` | YES (`DEVICE_QA_CHECKLIST.md` für 7 Test-Kategorien) | PARTIAL (Simulatoren & Web-Smoke grün; physische iOS/Android Geräte offen) | NO (Physische On-Device Abnahme vor TestFlight notwendig) | AR-001 | TestFlight Build auf echtem iPhone installieren |

---

## Legende

- **READY_FOR_PREVIEW:** Technische Voraussetzungen im Repository erfüllt, erfordert Cloud-Credentials.
- **SCAFFOLDED:** Code-Interfaces, Adapter und Test-Harnesses existieren und sind getestet, laufen aber noch isoliert bzw. im sicheren Entwicklungsmodus.
- **AUDITED:** Vollständige statische und dynamische Sicherheitsanalyse abgeschlossen.
- **PARTIAL:** Wesentliche Kernkomponenten vorhanden, einzelne Gates (z. B. externe Konfiguration) offen.
- **NO:** Bewusst nicht produktiv geschaltet, um Risiken oder Datenverlust für Beta-Nutzer auszuschließen.
