# EVARO - Astra Security Takeover & P0 Hardening Prompt

Du uebernimmst jetzt den sicherheitskritischen Release-Pfad von EVARO. Arbeite gegen den tatsaechlichen aktuellen Git-Stand und behandle alle bisherigen Gemini-Reports als Hinweise, nicht als Beweis.

## 1. Ziele dieser Session

1. Repository auf diesem Desktop/Workspace sauber auf den aktuellen Remote-Stand bringen, ohne lokale Arbeit zu zerstoeren.
2. `docs/release/` und `EVARO_SECURITY_GUARDRAILS.md` lesen und mit dem echten Code abgleichen.
3. Eine `CURRENT_SECURITY_STATE`-Matrix erstellen: `VERIFIED / PARTIAL / PREPARED / MISSING / BLOCKED`.
4. Alle P0-Sicherheitskontrollen priorisieren.
5. Direkt mit dem hoechsten offenen P0-Block beginnen und ihn moeglichst vollstaendig abschliessen.
6. Credits effizient einsetzen: gezielte Searches/Diffs/Tests statt Repository blind komplett erneut zu lesen.

## 2. Erste Git-/Baseline-Schritte

```bash
git status
git branch --show-current
git remote -v
git fetch --all --tags --prune
git status -sb
git log --oneline --decorate -n 30
git tag --sort=-creatordate
```

Wenn `main` clean und nur behind ist: `git pull --ff-only origin main`.

Wenn dirty/diverged: NICHT resetten/cleanen/force-pushen. Zustand sichern und dokumentieren.

Fuer kritische Arbeit danach Branch anlegen, z.B.:

```text
astra/security-p0-hardening
```

## 3. Kanonische Dokumente zuerst

Lies gezielt:

```text
EVARO_SECURITY_GUARDRAILS.md
docs/release/ASTRA_HANDOFF.md
docs/release/EXECUTION_STATUS.md
docs/release/P0_READINESS_MATRIX.md
docs/release/ASTRA_REVIEW_QUEUE.md
docs/release/PRE_ASTRA_VERIFICATION_REPORT.md
docs/release/GEMINI_FINAL_PRE_ASTRA_REPORT.md (falls vorhanden)
docs/release/RLS_SECURITY_AUDIT.md
docs/release/RLS_LOCAL_TEST_HARNESS.md
docs/release/SECURE_STORAGE_MIGRATION_PLAN.md
docs/release/ACCOUNT_DELETION_IMPLEMENTATION_SPEC.md
docs/release/AI_PRODUCTION_TEST_PLAN.md
docs/release/ENTITLEMENT_ARCHITECTURE_SPEC.md
```

Keine neue Report-Datei erstellen, wenn ein kanonisches Dokument aktualisiert werden kann.

## 4. Baseline Quality/Security Gates

```bash
pnpm verify
pnpm coach:check
pnpm build
pnpm audit
npx expo config --type public
```

Zusaetzlich Security-Baseline erheben:

- vorhandene CI/SAST/Secret/Lizenz-Scans
- `.github/workflows`
- `.env*`/Config/Expo public config
- direkte + transitive Dependencies/Lockfile
- Supabase schema/migrations/functions/policies
- alle externen API-Endpunkte
- Session-/Storage-Implementierung
- AI Backend
- Entitlement/Billing-Code

Keine alten Testzahlen uebernehmen.

## 5. Geminis vorbereitete Kontrollen verifizieren

Suche und bewerte insbesondere:

- SecureStore Adapter + Dual-Read Tests (`PREPARED` erwartet)
- Account Deletion Client Service (`PREPARED`, Cloud Backend ggf. fehlend)
- Data Export Service (lokal vs Cloud-Vollstaendigkeit unterscheiden)
- RLS Audit / Negative SQL Tests (Tests sind kein Production-Deploy)
- Sync Failure Harness (pruefen, ob echte Production-Invarianten oder nur Simulation)
- AI Safety + Request Validation (aktive Runtime-Aenderungen adversarial testen)
- Entitlement Abstraction / Beta Bypass
- Diagnostics / safe logger / ErrorBoundary
- Exercise-Dataset-Provenienz und Legacy-ID-Kompatibilitaet
- Store/Device QA Docs

Fuer jeden Bereich: `VERIFIED | PARTIAL | PREPARED | MISSING` + Risiko + naechste Aktion.

## 6. Execution Order - P0

### P0-A: Secrets & Supply Chain Quick Gate

Bevor Architektur aktiviert wird:

- Git-History/Client-Bundle auf privilegierte Secrets pruefen.
- GitHub Actions `permissions` und externe Actions pruefen.
- Dependency Audit exakt klassifizieren: package/path/severity/runtime-vs-dev.
- Keine blinden Overrides/Major Upgrades.

Wenn echtes Secret gefunden: Wert nicht ausgeben; als kompromittiert behandeln und `USER_ACTION_REQUIRED: ROTATE` markieren.

### P0-B: Secure Session Storage

Verifiziere Geminis Adapter und aktiviere nur, wenn folgende Tests belastbar sind:

- secure empty + legacy valid
- secure valid + legacy valid
- corrupt secure
- corrupt legacy
- secure read/write failure
- interrupted migration
- concurrent startup
- logout clears both
- new login writes secure
- no token logging

Ziel: Zero Data Loss und moeglichst Zero Forced Logout.

Dokumentiere Migration Trigger, Rollback und Failure Behavior.

### P0-C: Authorization / RLS / Grants

Inventarisiere jede user-owned Tabelle/View/RPC/Function und baue Matrix:

`SELECT/INSERT/UPDATE/DELETE x own/other-user/anonymous`.

- RLS + Grants gemeinsam pruefen.
- Owner-Spoofing (`WITH CHECK`) pruefen.
- Views und `SECURITY DEFINER` separat pruefen.
- Service-role ausschliesslich serverseitig.
- Mindestens User A/User B adversarial testen.

Keine Production-RLS blind deployen. Erst lokal/staging beweisen; Remote Apply nur bei sicherer Freigabe/Config, sonst Migration vorbereiten + USER_ACTION_REQUIRED.

### P0-D: Sync & Data Integrity

Pruefe echten Code fuer:

- idempotent outbox/retries
- duplicate enqueue/replay
- ordering
- deletes
- offline -> reconnect
- account switch/logout
- multi-device update conflicts
- revision/tombstone necessity

Fuehre nur Architektur ein, die durch reale Failure Modes benoetigt wird. Keine theoretischen Komplett-Rewrites.

Definition: Kein Verlust/Duplikat von Workout History, Measurements, Programs, Templates oder Custom Exercises unter Retry/Offline/Account-Switch.

### P0-E: Account Deletion & Export

Implementiere/verifiziere echtes Cloud-Loeschkonzept:

- authenticated/reauth where appropriate
- owned rows/storage/provider mappings
- auth user removal
- idempotent response contract
- Cloud failure -> local data PRESERVED
- confirmed Cloud success -> local cleanup

Export ehrlich kennzeichnen: `LOCAL_ONLY` vs kompletter Cloud-Export.

### P0-F: AI Production Security

Zielarchitektur:

- HTTPS backend
- provider key server-only
- authenticated user
- server-side Pro entitlement
- distributed rate limit
- per-user + global budget/circuit breaker
- message/payload/image limits
- timeout/retry controls
- safe logging
- kill switch
- DE/EN locale-aware Safety
- keine Diagnose/Therapie-Positionierung

Adversarial testen: unauthenticated, free-user, prompt injection, payload abuse, parallel cost abuse, provider failure, invalid locale, emergency DE/EN.

## 7. Danach P1 - Subscription Integrity

Wenn P0 stabil:

- RevenueCat/StoreKit/Play Billing integrieren
- `evaro_pro` serverseitig verifizieren
- Webhook signature/idempotency/replay/refund/cancel
- Restore Purchases real testen
- Beta-All-Features-Bypass vor Production sicher entfernen/scopen

Credentials, Pricing, Store Agreements = `USER_ACTION_REQUIRED`.

## 8. Parallel/anschliessend Release Controls

- CI: CodeQL/Semgrep + Gitleaks + dependency + license scan + RLS/migration tests.
- Backup/Restore Drill.
- Monitoring fuer 401/403, 5xx, AI-Kosten, rate limits, Billing Webhooks, Delete Failures.
- Incident Runbook.
- Privacy/Data Map gegen echten Datenfluss pruefen.
- Apple/Google Account Deletion/Health/Data Safety Anforderungen gegen Implementierung pruefen.
- Physical iOS/Android Testpaket vorbereiten; Ergebnisse niemals faken.

## 9. Release Gate

EVARO darf nicht als release-ready markiert werden bei:

- Critical offen / High ungeklärt
- Secret exposure
- Cross-user/RLS unbewiesen
- unvollstaendiger Account Delete
- AI ohne Auth/Quota/Budget
- client-authoritativem Premium
- keinem erfolgreichen Restore
- Privacy/Store-Docs widersprechen Datenfluss
- ungeklaerten ausgelieferten Asset-Rechten
- fehlender physischer Device-QA fuer Kernflows

`High accepted` nur mit Finding, Impact, Exploitability, Mitigation, Owner, Expiry.

## 10. Credits-effiziente Arbeitsweise

- Erst `git diff`, `rg`, relevante Tests und kanonische Docs.
- Keine Vollanalyse bereits verifizierter UI-Bereiche ohne Anlass.
- Kleine Aenderung -> targeted tests; Work-Block-Ende -> `pnpm verify`.
- Keine Low-value Refactors/Renames/Style-Cleanups.
- Bestehende Geminis Tests/Scaffolds wiederverwenden, nicht neu erfinden.
- Einen kritischen Block sauber abschliessen statt fuenf halb.

## 11. Commits / Safety

Keine Force Pushes, kein destructive clean/reset, keine irreversiblen Production-Migrationen ohne Freigabe.

Pro Work Block logischer Commit. Kritische Arbeit auf Astra-Branch; nicht automatisch in `main` mergen.

## 12. Bericht nach jedem Block

```md
## Astra Security Progress
Block:
Status:
Risk:

Verified:
- ...

Implemented:
- ...

Security tests:
- ...

Remaining:
- ...

USER_ACTION_REQUIRED:
- ...

Commit:
...
```

## 13. Finaler Session-Report

```md
# EVARO Security Takeover - Session Result

## Git
Branch:
Commit:
origin/main:
Working tree:

## Baseline
Typecheck:
Lint:
Tests:
Build:
Coach:
Audit:

## Current Security State
S0 Repository/Threat Model:
S1 Secrets/Supply Chain:
S2 Auth/Secure Storage:
S3 RLS/Authorization:
S4 Sync/Data Integrity:
S5 Account/Privacy:
S6 AI Security:
S7 Subscription Integrity:
S8 Backup/Monitoring/IR:
S9 CI Security Gates:
S10 Store/Legal/A11y:
S11 Device/Red-Team:

## Completed this session
- ...

## Critical remaining
1. ...

## User/Legal actions
- ...

## Release Gate
PASS / FAIL
Reasons:
- ...

## Recommended next Astra block
...
```

Beginne jetzt mit Git/Baseline, lies `EVARO_SECURITY_GUARDRAILS.md`, verifiziere Geminis Scaffolds und starte danach direkt mit dem hoechsten offenen P0-Security-Block.
