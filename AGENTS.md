# AGENTS.md

Universal context for any AI agent (Gemini, Codex, Claude, …) working on this
repository. Read this first. Claude Code users: see also the short
[CLAUDE.md](./CLAUDE.md).

---

## Project

A cross-platform fitness tracker for logging strength workouts, programs, and
body metrics. Built as a pnpm monorepo with an Expo/React Native app and a pure
TypeScript domain layer shared across the codebase.

---

## Tech Stack

| Concern            | Choice                         | Version    |
| ------------------ | ------------------------------ | ---------- |
| Package manager    | pnpm (workspaces)              | ≥ 9        |
| Runtime/SDK        | Expo                           | 52         |
| Framework          | React Native                   | 0.76       |
| Navigation         | Expo Router (file-based)       | v4         |
| Language           | TypeScript (strict)            | 5.3        |
| State management   | Zustand                        | 5          |
| Validation         | Zod                            | 3          |
| Forms              | react-hook-form + @hookform/resolvers | 7 / 3 |
| Local persistence  | react-native-mmkv             | 3          |
| Backend (planned)  | Supabase (PostgreSQL + RLS)    | —          |

> **Note:** Expo SDK 52 ships **Expo Router v4** (v3 belonged to SDK 51). Use v4
> APIs.

---

## Directory Structure

```
fitness-tracker/
├── apps/
│   └── mobile/                  # Expo app — the only deployable
│       ├── app/                 # Expo Router routes (file-based navigation)
│       │   ├── _layout.tsx      # Root Stack navigator
│       │   └── (tabs)/          # Tab group: index (Home), workouts
│       ├── assets/              # Images, icons, fonts
│       ├── app.json             # Expo config
│       ├── metro.config.js      # Metro tuned for the monorepo
│       └── babel.config.js
├── packages/
│   ├── domain/                  # Pure TS business logic — NO React, NO RN
│   │   └── src/
│   │       ├── types/index.ts   # All interfaces & enums (source of truth)
│   │       ├── schemas/index.ts # Zod schemas mirroring the types
│   │       └── index.ts         # Barrel re-export
│   └── ui/                      # Shared RN components (placeholder for now)
│       └── src/index.ts
├── docs/
│   ├── README.md                # Architecture overview
│   ├── data-model.md            # Mermaid ER diagram
│   ├── schema.sql               # Supabase/PostgreSQL schema + RLS
│   └── agents/                  # Agent briefings & templates
├── .agent/skills/               # Reusable knowledge for agents (see below)
├── AGENTS.md                    # This file
├── CLAUDE.md                    # Short Claude-specific guide
├── pnpm-workspace.yaml
├── tsconfig.base.json           # strict mode, shared by all packages
├── .prettierrc / .eslintrc.js
└── .gitignore
```

**Package names:** `@fitness-tracker/mobile`, `@fitness-tracker/domain`,
`@fitness-tracker/ui`. The mobile app imports the domain via
`@fitness-tracker/domain` (workspace protocol) — never relative paths into
another package.

---

## Code Conventions

**Naming**
- Components & types/interfaces: `PascalCase` (`WorkoutCard`, `ExerciseSet`).
- Variables, functions, hooks: `camelCase` (`useActiveWorkout`).
- Constants/enums values: enums use `PascalCase` members mapping to
  `snake_case` string values (matches the SQL enums).
- Files: components `PascalCase.tsx`; everything else `kebab-case.ts`. Expo
  Router route files follow Router conventions (`_layout.tsx`, `(tabs)/`).
- Zod schemas are named `<Type>Schema` (e.g. `WorkoutSessionSchema`).

**File layout (within a file)**
1. Imports (see order below)
2. Types / interfaces local to the file
3. Constants
4. The component / function (one primary export per file)
5. Styles (`StyleSheet.create`) at the bottom for components

**Import order** (blank line between groups):
1. React / React Native
2. Third-party packages
3. Workspace packages (`@fitness-tracker/*`)
4. Local/relative imports (`./`, `../`)

**Style**
- TypeScript strict; **no `any`** — use `unknown` and narrow.
- No inline style objects — always `StyleSheet.create`.
- Prefer derived state (`useMemo`, selectors) over `useEffect`-driven copies.
- Prettier + ESLint are authoritative; do not hand-format around them.

---

## MVP Scope

**In scope**
- Auth (Supabase) and a single user profile.
- Exercise library (shared + custom) and custom exercise creation.
- Workout templates and programs (multi-week scheduling).
- Live workout logging: sets with weight/reps/RPE/RIR/rest, rest timer.
- Workout history, personal records, body metrics + basic progress charts.
- Local-first via MMKV; sync to Supabase.

**Explicitly OUT of scope (do not build)**
- ❌ Social features (feeds, following, sharing, comments, leaderboards).
- ❌ Marketplace / paid programs / in-app purchases.
- ❌ AI coach / auto-generated programming / form analysis.
- ❌ Nutrition/calorie tracking, wearable integrations, web app.

If a task seems to require an out-of-scope feature, stop and flag it rather than
building it.

---

## Where Things Live

- **Types & enums:** [`packages/domain/src/types/index.ts`](./packages/domain/src/types/index.ts) — the single source of truth.
- **Zod schemas:** [`packages/domain/src/schemas/index.ts`](./packages/domain/src/schemas/index.ts).
- **DB schema & RLS:** [`docs/schema.sql`](./docs/schema.sql).
- **ER diagram:** [`docs/data-model.md`](./docs/data-model.md).
- Import types/schemas from the package root: `import { WorkoutSession, WorkoutSessionSchema } from '@fitness-tracker/domain'`.

---

## Scripts

Run from the repo root.

| Command            | Effect                                                   |
| ------------------ | -------------------------------------------------------- |
| `pnpm install`     | Install all workspace dependencies.                      |
| `pnpm dev`         | Start the Expo app (web). Alias for the mobile `dev`.    |
| `pnpm build`       | `expo export` for the mobile app.                        |
| `pnpm lint`        | ESLint across all packages (`pnpm -r lint`).             |
| `pnpm typecheck`   | `tsc --noEmit` across all packages.                      |
| `pnpm format`      | Prettier write across the repo.                          |
| `pnpm test`        | Run all package test suites (`pnpm -r test`).            |

Platform variants: `pnpm --filter @fitness-tracker/mobile ios | android | web`.

**Test stack:** Vitest for `packages/domain` (pure TS, schemas/logic); Jest +
React Native Testing Library for `apps/mobile` (components, app code). Run a
single package with `pnpm --filter <pkg> test`. CI runs `pnpm typecheck` then
`pnpm test` on every push and PR to `main` (`.github/workflows/ci.yml`).

---

## Definition of Done

A feature task is complete only when **all** of the following hold:

1. **Compiles:** `pnpm typecheck` passes with zero errors (strict mode).
2. **Lints:** `pnpm lint` passes with no new warnings/errors.
3. **Validated I/O:** all external/untrusted data (API, storage, forms) is
   parsed through a Zod schema from `@fitness-tracker/domain`.
4. **Types reused:** no duplicated/ad-hoc type that should come from the domain
   package; new shared shapes are added there, not inline.
5. **Scope-clean:** nothing from the OUT-of-scope list was introduced.
6. **Conventions:** naming, file layout, import order, and styles follow this
   document.
7. **Runs:** the relevant screen/flow launches and behaves as expected
   (verified in the app, not just by reading the code).
8. **Tests:** `pnpm test` passes; add/update tests for the change. Domain logic
   and schemas are tested with **Vitest** (`packages/domain`); components and
   app code with **Jest + React Native Testing Library** (`apps/mobile`).
9. **Docs:** if behaviour or the data model changed, the relevant file in
   `docs/` is updated in the same change.

---

## Hard Rules — Agents must NEVER:

- ❌ **Change the database schema** (`docs/schema.sql`) or domain types/enums
  without explicit human approval — these are contracts other code depends on.
- ❌ **Commit secrets** — never commit `.env`, API keys, tokens, or Supabase
  service-role keys. They are gitignored; keep them that way.
- ❌ **Merge to `main` without human review.** Work on a branch and open a PR.
  Do not push directly to `main`/`master`.
- ❌ Add a dependency without justification, or introduce an out-of-scope
  feature.
- ❌ Use `any`, disable strict checks, or silence ESLint/TS errors with blanket
  ignores to "make it pass".
- ❌ Run destructive git or filesystem commands (`reset --hard`, force-push,
  bulk deletes) without being explicitly asked.
