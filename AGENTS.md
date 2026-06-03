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

---

## App Architecture

### Zustand Stores (`apps/mobile/src/stores/`)
- **`workoutStore.ts`**: Manages the active workout session logging state, elapsed time, set logs, rest timer countdown, superset groupings, and warmup set calculations.
- **`historyStore.ts`**: Manages the completed workout sessions history, streak tracking, personal records (PRs), exercise volume history, and previous performance retrieval.
- **`exerciseStore.ts`**: Manages the exercise library (built-in + custom), muscle/equipment filters, favorite exercise IDs, and custom default rest timer durations.
- **`profileStore.ts`**: Manages the user profile settings (display name, units, sex, height, strength maxes), overall statistics, and data export/clear functionality.
- **`bodyMetricStore.ts`**: Manages body metric records (weight, body fat %, heart rate, and body circumferences) over time.
- **`achievementStore.ts`**: Manages XP tracking, level calculations, locked/unlocked achievements, and achievement checks.
- **`programStore.ts`**: Manages structured training programs and reusable workout templates.

### Expo Router Screens (`apps/mobile/app/`)
- **`/app/(tabs)/index.tsx`**: Home tab showing the welcome dashboard, current streak, active program workout preview, and upcoming achievements.
- **`/app/(tabs)/workouts.tsx`**: Screen to start an empty workout, quick-start from templates, or go to template/program creation.
- **`/app/(tabs)/exercises.tsx`**: Searchable exercise library with filtering by muscle group and equipment.
- **`/app/(tabs)/history.tsx`**: List of all past workout sessions, streaks, and PR counters.
- **`/app/(tabs)/body.tsx`**: Body metrics entry, weight/body fat charts, and measurements overview.
- **`/app/(tabs)/programs.tsx`**: Active program overview and week-by-week calendar of scheduled templates.
- **`/app/profile.tsx`**: Setup and edit settings for display name, biological sex, height, units, and strength maxes.
- **`/app/exercise/[id].tsx`**: Detailed view of an exercise with category tags, instructions, and default rest timer configuration.
- **`/app/history/[id].tsx`**: Summary detail view of a completed workout session.
- **`/app/workout/quick-start.tsx`**: Template picker list to start a workout session from a template.
- **`/app/workout/session.tsx`**: Active workout sheet logging page containing multiline workout notes.
- **`/app/programs/builder.tsx`**: Multi-week program builder interface.
- **`/app/programs/template-builder.tsx`**: Reusable workout template designer.

### Core Components (`apps/mobile/src/components/`)
- **`SessionExerciseCard.tsx`**: Renders exercise sets list in the active session, displaying previous performance, real-time e1RM estimates, RIR inputs, set type selectors (Warmup, Drop-set, Failure, Normal), superset connections, and the warmup calculator button.
- **`RestTimer.tsx`**: Countdown overlay rest timer.
- **`SaveTemplateModal.tsx`**: Modal requesting to save the completed session as a template.
- **`PlateCalculatorModal.tsx`**: Visual barbell plate loading calculator for a standard 20kg bar.
- **`AchievementCelebration.tsx`**: Confetti overlay screen celebrating unlocked achievements and level-ups.
- **`ExercisePickerModal.tsx`**: Modal picker to add exercises to the active session.

---

## Project Status

### Completed Missions (on `main`)
- **✅ Mission 6: Stabilisierung + Templates**
- **✅ Mission 7: Achievements + Gamification**
- **✅ Mission 8: Body Tracking + Profil**
- **✅ Mission 9: Workout-Verbesserungen**

### Mission 9 Features
- **Set Types (Set-Typen)**: Cycle through Normal, Warmup (`W`), Drop-set (`D`), and Failure (`F`) set types with distinct color badges.
- **Previous Performance**: Displays details of the previous completed sets and date for that exercise.
- **e1RM & RIR**: Displays real-time estimated 1-Rep Max (Epley) and includes an RIR input next to RPE.
- **Plate Calculator**: Barbell icon trigger opening a visual 20kg bar plate combination visualizer.
- **Warmup Rechner**: Prepopulates and prepends 3 warmup sets (50% x 10, 70% x 5, 90% x 2) based on the first set's weight.
- **Supersätze**: Links consecutive exercises visually with a left-edge blue border bar and "SUPERSET" badge.
- **Share Summary**: Triggers system-wide sharing with a text summary of the finished workout.
- **Workout-Notiz**: Adds a text area for general notes about the workout session.

---

## Architectural Debt (To Be Addressed by Codex in Mission H0)

> [!WARNING]
> The Debugger Agent (Codex) must address the following debts during the Block 2 stabilization/hardening phase (Mission H0):

1. **Business Logic Location**: Volume, PR, and Streak calculations are currently duplicated across `historyStore`, `achievementStore`, and `profileStore`. They must be extracted into pure TS functions under [`packages/domain/src/logic/`](./packages/domain/src/logic/) and tested with Vitest.
2. **Warmups & Analytics**: Volume and PR calculations currently count warmup sets. Warmups must be filtered out (`set.type !== 'warmup'`).
3. **e1RM-based PRs**: Personal records are currently calculated purely on max weight. They must be transitioned to e1RM-based (using Epley formula).
4. **Timezone Bug**: Streak tracker uses UTC (`Date.toISOString()`) which causes shifting issues across days. It must use local `YYYY-MM-DD` date keys.
5. **MMKV Persistent Stores**: Persistent stores copy `reviveDates` and custom storage logic. This should be refactored into a single helper (`apps/mobile/src/stores/storage.ts`) that validates stored data against Zod schemas on hydration, and includes versioning + migration paths.
6. **Timer Drift**: The elapsed active workout timer counts up using `setInterval` (prone to drift when backgrounded). It should derive elapsed seconds dynamically from `startedAt` + accumulated pause durations.
7. **finishWorkout Guard**: Guard against saving sessions without any completed sets (should not record in history or award XP).

