# CLAUDE.md

Short guide for Claude Code. Full context: [AGENTS.md](./AGENTS.md).

**Project:** pnpm monorepo — Expo 52 / React Native 0.76 fitness tracker with a pure-TypeScript domain layer.

**Layout:**
- `apps/mobile` — Expo app, Expo Router **v4** (file-based routes in `app/`).
- `packages/domain` — types & Zod schemas; **no React**. Source of truth.
- `packages/ui` — shared RN components (placeholder).
- `docs/` — `schema.sql`, `data-model.md`, architecture.

**Types/Schemas:** import from `@fitness-tracker/domain` (`packages/domain/src/{types,schemas}/index.ts`). Never redefine domain shapes.

**Stack:** Zustand (state), Zod (validation), react-hook-form, MMKV (storage).

**Conventions:** strict TS, **no `any`**; `StyleSheet.create` (no inline styles); components `PascalCase.tsx`, other files `kebab-case.ts`; schemas `<Type>Schema`. Import order: RN → third-party → `@fitness-tracker/*` → local.

**Scripts (root):** `pnpm dev` (Expo web), `pnpm typecheck`, `pnpm lint`, `pnpm format`. `pnpm test` is **not configured yet**.

**MVP — OUT of scope:** no social, no marketplace/IAP, no AI coach, no nutrition. Flag tasks that need these.

**Never:** change `docs/schema.sql` or domain types without approval; commit `.env`/secrets; push or merge to `main`/`master` without review; use `any` or silence strict/ESLint errors.

**Done =** `pnpm typecheck` + `pnpm lint` pass, external data Zod-validated, domain types reused, in-scope, runs in the app, docs updated if the model changed.
