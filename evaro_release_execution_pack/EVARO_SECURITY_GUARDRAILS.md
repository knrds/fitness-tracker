# EVARO Security & Development Guardrails

**Version:** 1.0 - 19.09.2026  
**Gilt fuer:** Astra, Gemini und jeden weiteren Coding-Agenten im EVARO-Repository.  
**Quellenbasis:** Deep Research "Security, Legal, Compliance und Production Readiness" (19.09.2026) + aktuelle EVARO-Release-Roadmap.  

> Diese Datei ist eine verbindliche Engineering-Richtlinie. Sie ersetzt keine individuelle Rechtsberatung. Rechts-/Store-/Lizenzfragen mit materieller Wirkung bleiben `USER_ACTION_REQUIRED` bzw. `LEGAL_REVIEW_REQUIRED`.

## 1. Prioritaeten

`Data Integrity > Authorization/Security > Privacy > Subscription Integrity > Crash Stability > Performance > UX > neue Features`

Feature Freeze bleibt bis zum Release Gate bestehen. Keine Social-, Nutrition-, Running-, Wearable-, Marketplace- oder Community-Erweiterung, solange P0 nicht gruen ist.

## 2. Status-Sprache

Nur diese Status verwenden:

- `DONE` - implementiert, integriert und verifiziert.
- `VERIFIED` - vorhandene Implementierung adversarial geprueft.
- `PARTIAL` - Teilfunktion vorhanden, Zielzustand noch nicht erreicht.
- `PREPARED` - Scaffold/Plan/Tests vorhanden, Production-Aktivierung fehlt.
- `ASTRA_REQUIRED` - Architektur/Security/Migration/Billing-Entscheidung.
- `USER_ACTION_REQUIRED` - Konto, Credentials, Pricing, Rechts-/Business-Entscheidung.
- `LEGAL_REVIEW_REQUIRED` - rechtliche Einordnung/Textsicherheit nicht rein technisch loesbar.
- `PHYSICAL_DEVICE_REQUIRED` - nur auf echtem iOS/Android belastbar testbar.
- `BLOCKED` - externer Blocker verhindert Fortsetzung.

**Dokumentation oder ein Scaffold ist niemals automatisch `DONE`.**

## 3. Verbindliche Security Constitution

1. Deny by default.
2. Der Client ist manipulierbar und keine Security Boundary.
3. Authentifizierung serverseitig bzw. durch vertrauenswuerdigen Auth-Provider verifizieren.
4. Jede geschuetzte Ressource bei jeder Operation autorisieren.
5. `userId`, `ownerId`, `role`, `premium` niemals aus untrusted Clientdaten als Autoritaet verwenden.
6. Jede user-owned DB-Tabelle braucht ein explizites, getestetes Ownership-/RLS-Modell.
7. `service_role`, AI-Provider-Secrets, OAuth-Secrets und private Keys niemals in Mobile/Web-Bundles.
8. Secrets, die jemals exponiert waren, rotieren; blosses Loeschen reicht nicht.
9. Tokens/Sessions nur in geeigneter sicherer nativer Speicherung persistieren.
10. Neue Storage-/Auth-Migrationen muessen Data-Loss-, Logout- und Rollback-Verhalten dokumentieren.
11. Server-seitige Schema- und Domain-Validierung ist Pflicht; Clientvalidierung ist nur UX.
12. Mass Assignment vermeiden; schreibbare Felder allowlisten.
13. Destruktive und kostenrelevante Operationen muessen idempotent sein.
14. Offline-/Sync-Retries duerfen keine Doppelwirkungen oder Datenverluste erzeugen.
15. Multi-Device-Konflikte brauchen eine explizite, getestete Policy.
16. Keine sensiblen Health-/Workout-/Coach-Rohdaten in generische Telemetrie oder Crash-Logs.
17. AI ist untrusted reasoning, niemals Security Principal.
18. System Prompts sind keine Autorisierungsschicht.
19. Destruktive AI-/Agent-Aktionen benoetigen deterministic Backend Checks und ggf. Human Confirmation.
20. AI-Provider erhalten nur den minimal benoetigten Kontext.
21. Teure Endpunkte brauchen Auth, Quotas, Payload-Limits, Rate Limits und Kostenbudgets.
22. Premium/Entitlement ist serverseitig zu validieren; Client-Cache dient nur UX.
23. File Uploads sind hostile input; private-by-default, size/type/content limits, sichere Object Keys.
24. Neue Dependencies brauchen Nutzen-, Herkunft-, Lizenz- und Advisory-Pruefung.
25. Lockfiles sind verbindlich; keine blinden Major-Upgrades.
26. GitHub Actions/CI mit minimalen Permissions; kritische Drittanbieter-Actions immutable pinnen.
27. Jeder Security-Fix erhaelt einen Regressionstest.
28. Backups zaehlen erst nach erfolgreichem Restore-Test.
29. Profile/Fotos/Social-Funktionen sind private-by-default.
30. Neue personenbezogene Daten erfordern Privacy-/Retention-/Export-/Delete-Review.
31. Neue Drittanbieter erfordern Security-, Privacy-, DPA-/Transfer- und Subprocessor-Review.
32. Neue User-facing Funktionen werden im selben Change DE/EN lokalisiert und accessibility-geprueft.
33. Keine Fake-Success-UX fuer Billing, Delete, Sync, Restore Purchases oder AI.
34. Keine Production-Debug-Stacks, Dev-Secrets oder unsicheren Bypasses.
35. Kein `eval()` und keine Shell-Commands aus untrusted Input.

## 4. Agenten-Zuständigkeit

### Astra muss fuehren bei
- Auth-/Session-Architektur und Secure-Storage-Aktivierung
- RLS, Grants, RPCs, DB-Migrationen
- Sync/Conflict/Revision/Tombstone/Outbox-Architektur
- Account-Deletion-Backend
- Production-AI-Backend, Rate Limits, Budgets, Entitlements
- RevenueCat/StoreKit/Play Billing/Webhooks
- irreversible oder datenveraendernde Migrationen
- Security Findings `HIGH`/`CRITICAL`

### Gemini darf selbststaendig bei
- UI/i18n/a11y
- Tests und Regression-Harnesses
- Dokumentation, Checklisten, Inventare
- kleine reversible LOW/MEDIUM Fixes ohne Migration
- Performance-/QA-Hardening
- Store-/Device-Testvorbereitung
- statische Audits und Beweissammlung

Gemini darf kritische Bereiche vorbereiten, aber nicht eigenmaechtig Production-aktivieren.

## 5. Vor jedem groesseren Change

1. `git status`, Branch, Remote-Stand verifizieren.
2. Relevante Architektur/Tests lesen - keine Annahmen.
3. Change klassifizieren: `LOW | MEDIUM | HIGH | CRITICAL`.
4. Betroffene Trust Boundaries, Datenklassen und Userdaten benennen.
5. Migrations-/Rollback-/Data-Loss-Risiko pruefen.
6. Minimal-invasiven Plan schreiben.

## 6. Datenklassen

- `PUBLIC`: Uebungskatalog, oeffentliche statische Inhalte.
- `PERSONAL`: E-Mail, Profil, Ziele.
- `SENSITIVE`: Workout-History, Kraftwerte, Templates, Programme.
- `HIGH_SENSITIVITY`: Koerpergewicht, KFA, Masse, Verletzungen, Gesundheitsnotizen, Progress-Fotos, AI-Coach-Inhalte.
- `SECRET`: Tokens, Provider Keys, private Keys, Service-Role Keys.

`HIGH_SENSITIVITY` darf nicht in generische Analytics, Support-Dumps oder unredacted Logs gelangen.

## 7. Auth & Session

- Session-Identity kommt aus verifizierter Session, nie aus Request-Body.
- Logout/Reset/Account-Switch muessen Cache/Session-Scope korrekt leeren.
- SecureStore-Migration: Dual-read, fail-safe, kein Legacy-Wipe vor bestaetigtem Write.
- Password Reset / OAuth auf Enumeration, Replay, PKCE/state und Redirect-Allowlist pruefen.

## 8. Authorization & Supabase

Fuer jede user-owned Tabelle/Resource eine Matrix pflegen:

`SELECT | INSERT | UPDATE | DELETE x own | other-user | anonymous`

- RLS und PostgreSQL Grants gemeinsam testen.
- Views, RPCs, `SECURITY DEFINER` und Service-Role Pfade separat pruefen.
- `with check` fuer Owner-Spoofing beachten.
- Mindestens zwei echte Testnutzer fuer adversarial Tests.

## 9. Sync & Data Integrity

- Jede Mutation bekommt stabile IDs/Idempotency-Eigenschaften.
- Replay eines Requests darf keine doppelte Wirkung erzeugen.
- Deletes brauchen eine definierte Offline-/Multi-Device-Strategie.
- Account Switch darf keine Daten/Caches des vorherigen Users sichtbar lassen.
- Konfliktregeln dokumentieren; kein stilles Last-Write-Wins ohne bewusste Entscheidung.
- Beta-Daten vor Schema-/Storage-Migrationen erhalten.

## 10. Account Lifecycle & Privacy

- Cloud-Loeschung muss bestaetigt sein, bevor lokaler destruktiver Cleanup startet.
- Account Delete umfasst relevante Cloud-Daten, Sessions, Storage-Objekte und dokumentierte Providerdaten.
- Export muss klar kennzeichnen, ob lokal-only oder vollstaendig Cloud-weit.
- Retention/Backups muessen mit Privacy-Texten uebereinstimmen.
- Art.-9-/DPIA-Screening fuer Health-/Koerper-/AI-Daten vor oeffentlichem Launch.

## 11. AI Coach

- Provider-Key backend-only.
- Auth und serverseitiges `evaro_pro`-Entitlement vor teuren Calls.
- Distributed Rate Limit; kein reines In-Memory-Limit als Production-Control.
- Per-user/per-period Budget und globaler Circuit Breaker/Kill Switch.
- Payload-/Message-/Image-Limits und Timeouts.
- Safety-Responses selbst DE/EN locale-aware; geblockte Requests werden nicht vom LLM nachtraeglich uebersetzt.
- Keine Diagnose-/Therapie-Versprechen; bei akuten Symptomen aus Fitness-Scope eskalieren.
- Prompts/Coach-Content nicht roh in Telemetrie loggen.

## 12. Subscriptions

- Store/RevenueCat bzw. verifizierter Serverzustand ist Source of Truth.
- Webhooks: Signatur, Idempotenz, Replay-Schutz, Refund/Cancellation.
- Client kann Premium nicht autoritativ setzen.
- `BETA_ALL_FEATURES_ENABLED` vor Production entfernen oder strikt build-/env-scopen.
- Restore Purchases darf keinen Fake-Erfolg anzeigen.

## 13. CI/CD Minimum Gate

Bei jedem PR mindestens:
- lint
- typecheck
- unit/integration tests
- build
- SAST (CodeQL/Semgrep)
- dependency scan
- secret scan (inkl. Git-History in Security-Audit-Jobs)
- license scan
- relevante Migration/RLS Security Tests

Production-Deployments brauchen geschuetzte Environments und minimale Workflow-Permissions.

## 14. Logging, Monitoring, Incident Response

Nicht loggen: Passwoerter, Tokens, Session Cookies, Secrets, komplette Health-/Workout-/Coach-Inhalte.

Monitoren: 401/403-Spikes, Login-Failures, 5xx, DB-Fehler, AI Tokens/Kosten, Rate-Limit-Verletzungen, Payment-Webhooks, Account-Delete-Fehler, Secret-Scan-Findings.

Incident-Ablauf: `Detect -> Contain -> Eradicate -> Recover -> Notify -> Post-Mortem`.

## 15. Definition of Done fuer jedes Feature

Ein Feature ist erst `DONE`, wenn:
- Funktion implementiert und integriert
- relevante Tests gruen
- Auth/AuthZ geprueft
- Inputs/Outputs/Fehlerfaelle geprueft
- Rate-/Abuse-Risiko betrachtet
- Logging/Privacy geprueft
- Dependency-/Lizenzimpact geprueft
- Migration/Data-Loss-Impact geprueft
- Security Regression hinzugefuegt, falls relevant
- DE/EN vollstaendig
- Accessibility betrachtet
- Dokumentation/Status aktualisiert
- Working Tree sauber

## 16. Harte Release-Gates

Release = `FAIL` bei:
- Critical offen oder High ungeklärt
- Secret-Leak
- ungetesteter Cross-User-Zugriff/RLS
- unvollstaendiger Account Delete
- AI ohne Auth/Quota/Budget
- client-authoritatives Premium
- kein erfolgreicher Backup-Restore
- Privacy-/Store-Texte widersprechen Realitaet
- ungeklärte Rechte an ausgelieferten Assets
- fehlende reale iOS-/Android-Kern-Smoke-Tests

`High accepted` braucht schriftlich: Finding, Impact, Exploitability, Mitigation, Owner, Ablaufdatum.

## 17. Wiederkehrender Zyklus

- Jeder Commit: targeted tests, lint/typecheck, Secret-Precheck.
- Jeder PR: full gates + Security Regression.
- Jedes Deployment: Migration Check, immutable build, smoke test.
- Woechentlich: Security/Dependency Alerts, Kostenanomalien.
- Monatlich: IAM, Logs, Dependencies, Vendor-Changes.
- Quartalsweise: Restore-Test, Threat Model, DAST, Access Review.
- Halbjaehrlich: Incident Exercise, Privacy/Vendor Review.
- Jaehrlich bzw. vor Major Launch: externe Security-/Legal-/Privacy-Pruefung.
