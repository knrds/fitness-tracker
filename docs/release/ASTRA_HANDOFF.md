# ASTRA START HERE — aktueller Handoff 2026-09-19

Basis `origin/main`: `6471138`. Review-Branch: `astra/p0-release-core`. Neuester vorhandener Beta-Tag: `v0.1.0-beta.6`. Kein Main-Merge, keine Produktionsmigration, kein EAS-/OTA-Rollout. Konkrete Gates und Session-Ergebnis: [EXECUTION_STATUS](EXECUTION_STATUS.md). Vollständige Ist-/Roadmap-Matrix: [P0_READINESS_MATRIX](P0_READINESS_MATRIX.md).

## Erledigter lokaler Engineering-Block

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

1. Lokalen PostgreSQL/Supabase-Nachweis herstellen. Docker, Supabase CLI und psql sind auf diesem Desktop nicht verfügbar. Vorhandenen `rls_negative_tests.sql` nicht als gültigen Test übernehmen: falsche Spalten/Pflichtfelder, keine Assertions, Fehlerfortsetzung und persistente Fixtures. Erst auf tatsächlich ausführbare, rückrollende Tests umbauen.
2. SELECT/INSERT/UPDATE/DELETE aller 11 Tabellen für Owner, fremden User und anon; zusätzlich FK-Verknüpfungen mit fremden Übungen/Templates/Programmen/Sessions prüfen. Versionierte Migration erst aus diesen Ergebnissen ableiten. Keine Production-Policy blind deployen.
3. `syncStore.ts`: ignorierte Child-Delete-/Pull-Fehler; sequenzielle Aggregate-Ersetzung ohne Cloudtransaktion. Lokale FIFO-Outbox ist kein Cloud-Idempotenz-/Konfliktnachweis. Atomare RPCs plus begründete Revision-/Tombstone-Strategie gemeinsam mit echtem Backend testen.

## Weitere bestätigte P0-Risiken

- Account-Löschung: Client-Capability prüft nur Config/Auth; Erfolg nur `error:null`; Scope-Wechsel während Request nicht abgesichert, Cleanupfehler verschluckt. Backend-RPC/Auth-Cascade fehlt. Keinen Guard allein anhand alter Spec aktivieren.
- AI: `ALLOW_PROTOTYPE_COACH=true` kann öffentliche Auth umgehen. Keine serverseitigen Pro-Entitlements, verteilten Quoten/Budgets oder nachgewiesenes HTTPS-Deployment. Deterministische Safety-Replies sind ausschließlich Deutsch; DE/EN selbst im Safety-Layer lösen.
- Billing: `BETA_ALL_FEATURES_ENABLED=true`, kein natives Kauf-SDK; Providerabstraktion vorbereitet. Keine Produktionsfreigabe aus Client-Pro ableiten.
- Export: lokal, kein vollständiger Cloud-/DSGVO-Nachweis. Medien: ExerciseDB technisch entfernt; Foto-Rechtekette weiterhin unbestätigt.
- Audit: 67 Befunde (47 high/18 moderate/2 low). Kein pauschaler Ausschluss der Runtime-Exposition aus alten Berichten.

## Bestehende Vorarbeit erhalten

History-Tagesauswahl, direkte Plans-Erstellung und optionale Profildaten sind in `6471138` vorhanden. Free-DB-JSON entspricht exakt dem Beta-5-Blob; vorhandene Kompatibilitäts-/SQLite-/Scope-/UI-/Diagnostics-/API-Tests weiterverwenden. Vollständige i18n-/Screenreader-/Geräteabnahme bleibt offen. Feature Expansion bleibt eingefroren.

Alte Gemini-Berichte dokumentieren frühere Absichten und Testläufe; sie überschreiben diesen Handoff nicht. Keine Subagents ohne ausdrücklichen Auftrag. Ein sauberer P0-Block pro Commit, Review-Branch pushen, nicht automatisch nach main integrieren.
