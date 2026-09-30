# Agentenvertrag — EVARO

Beginne mit `docs/roadmap/README.md`. Dieser Bereich ist die einzige aktive Projektorientierung. Lies den Produktvertrag und die für den Auftrag betroffenen Architektur-/Security-/Deploymentteile; keine historischen Reports als aktuellen Zustand interpretieren.

## Arbeitsweise

- Vor Änderungen `git status`, Branch, Remote/main und vorhandene Arbeit prüfen. Sichere Arbeitsbranch verwenden; kein reset/clean/force push. Nutzerautorisierung hat Vorrang vor alten Arbeitsanweisungen.
- Bestehende Domainlogik, Editoren, Stores und Adapter wiederverwenden; keine parallelen Implementierungen. React-freie Domain, kanonische kg/cm/metres und versionierte Schema-/DTOverträge erhalten.
- Priorität: Datenintegrität, Autorisierung/Sicherheit, Privacy, Entitlements/Billing, native Stabilität, Performance, UX. Keine neue Infrastruktur ohne belegten Bedarf.
- Jeder Bug-/Securityfix bekommt eine sinnvolle Regression. Nach Änderungen gezielte Tests, Typecheck/Lint und Secret-Precheck; vor Integration volle `pnpm build:preview`, `pnpm audit:ci` und CI. Betroffene DB-/RLS-/Migrationtests zusätzlich. Gates niemals abschalten.
- Dokumentlinks über `pnpm docs:check` prüfen. Aktuellen Task-/Releasezustand nur in `docs/roadmap/MASTER_ROADMAP.md` pflegen; keine weiteren Handoff-/AI-Zwischenberichte.
- Belege nennen Commit/Umgebung/Datum/Test/Ergebnis. Host/Mock/Browser/Local SQL/Remote/Physical unterscheiden. Kein Scaffold als fertige Integration und keine falschen Erfolgsmeldungen.

## Sicherheitsgrenzen

Verbindlich: `docs/roadmap/SECURITY_PRIVACY.md`. Keine Clientsecrets, Clientrolle/Pro/Beta als Serverautorität oder sensitive Rohdaten in Logs/Telemetry/Support. Jede geschützte Operation authentifizieren/autorisieren; RLS und Grants gemeinsam prüfen. Kostenoperationen haben feste Limits und serverseitige Quoten.

Nutzerdaten, Originalbytes, Backups und Outbox bei Fehlern erhalten. Kontowechsel und Async-Generationen beachten. Keine stillen Resets, Ownerzuweisungen, destruktiven Migrationen oder Token-Klartextfallbacks. Migration/Rollback/Data-Loss-Impact vor Änderungen prüfen.

Produktions-DB-/Store-/Billingaktivierungen benötigen dafür bestehende ausdrückliche Betreiberautorisierung und konkrete prüfbare Abnahme. Reversible lokale Vorbereitung autonom erledigen. Ungeklärte Critical/High blockieren Release; Risikoannahmen brauchen verantwortliche Person/Frist/Nachweis.

## Einstieg in den Code

- Expo-Routen: `apps/mobile/app/`
- Komponenten/Stores/Services/Data: `apps/mobile/src/`
- Domain/Schemas: `packages/domain/src/`
- UI/Tokens: `packages/ui/src/`
- Coach: `api/`
- Cloudmigrationen: `supabase/migrations/`; Baseline `docs/schema.sql`
- Gates: `scripts/security/`, `.github/workflows/ci.yml`

Native Speicher-/Session- und SQL-Testdetails unter `docs/reference/`. Echte iOS-/Android-/Samsung-Abnahme bleibt ein separates Gate. Keine automatischen Rechts-/Storefreigaben behaupten.
