# Debugger Queue

This queue tracks bugs, architectural violations, and technical debt for the Debugger Agent.

## H0 Audit

### 1. Timezone Bug with `toISOString()` - [FIXED by H0]
- **Original file**: `apps/mobile/src/stores/historyStore.ts`
- **Result**: `historyStore.getStreak()` now delegates to `calculateStreak()` from `@fitness-tracker/domain`, which uses local `YYYY-MM-DD` keys via `formatDateLocal()`.
- **Evidence**: `packages/domain/src/logic/calculateStreak.ts`; `packages/domain/src/__tests__/logic.test.ts`.

### 2. Warmups Included in Volume Calculations - [FIXED by H0 + fix/bugfixes]
- **Original files**: `historyStore`, `profileStore`, `achievementStore`.
- **Result**: Store-level total volume uses `calculateVolume(..., { includeWarmups: false })`. `useAchievementCheck` still had a copied volume loop after H0 and was fixed in `fix/bugfixes`.
- **Evidence**: `packages/domain/src/logic/calculateVolume.ts`; `apps/mobile/src/hooks/useAchievementCheck.ts`.

### 3. Warmups Included in PR Calculations - [FIXED by H0]
- **Original files**: `historyStore`, `achievementStore`.
- **Result**: PR calculation paths exclude `set.type === 'warmup'`.
- **Evidence**: `packages/domain/src/logic/detectPRs.ts`; `apps/mobile/src/stores/historyStore.ts`.

### 4. PRs are Weight-Based instead of e1RM-Based - [FIXED by H0]
- **Original files**: `historyStore`, `achievementStore`.
- **Result**: PR calculations use e1RM through `estimateOneRepMax()`.
- **Evidence**: `packages/domain/src/logic/estimateOneRepMax.ts`; `packages/domain/src/logic/detectPRs.ts`.

### 5. Duplicated Business & Calculation Logic - [PARTIALLY FIXED]
- **Fixed**: `profileStore`, `achievementStore`, and `useAchievementCheck` no longer duplicate total-volume logic.
- **Still open**: `historyStore.getPRs()` and `historyStore.getExerciseVolumeHistory()` still contain local aggregation loops, and `SessionExerciseCard` still calculates display e1RM directly for the row preview.
- **Next branch**: `fix/typescript-hardening` or a follow-up domain-logic cleanup should either justify these as view-specific aggregations or add missing domain helpers.

### 6. Workout Timer Drift - [FIXED by H0]
- **Original file**: `apps/mobile/app/workout/session.tsx`.
- **Result**: active workout elapsed display is derived from `startedAt`, `pausedAt`, and `accumulatedPauseMs`; the interval only refreshes derived UI.
- **Evidence**: `apps/mobile/app/workout/session.tsx`.

## Fixed After H0

### 7. Persistent Stores Missing Shared MMKV Helper / Migration - [FIXED by fix/bugfixes]
- **Files**: `bodyMetricStore`, `programStore`, `exerciseStore`, plus H0 stores.
- **Result**: all persistent stores use `createHydratedStorage(...)`, Zod validation, `version: 1`, and `migrate`.

### 8. Finish Workout Double Action / Share Before Guard - [FIXED by fix/bugfixes]
- **Files**: `workoutStore`, `app/workout/session.tsx`.
- **Result**: `finishWorkout()` is idempotent and returns `WorkoutSession | null`; the UI shares only a returned, saved session and uses `summarizeWorkout()`.

### 9. Rest Timer Non-null Assertion - [FIXED by fix/bugfixes]
- **File**: `apps/mobile/src/components/workout/RestTimer.tsx`.
- **Result**: `endsAt` is captured after the guard; no `restTimer.endsAt!` access remains.

## Open Follow-up Queue

### A. Numeric Input Edge Cases
- **Files**: `SessionExerciseCard`, `workoutStore`.
- **Issue**: empty, text, negative, and zero values need explicit tests and central sanitization.
- **Target branch**: `fix/edge-cases`.

### B. Hydration Edge Cases
- **Files**: persistent stores and tests.
- **Issue**: active session hydration and invalid persisted payload fallback need explicit Jest coverage.
- **Target branch**: `fix/edge-cases`.

### C. TypeScript Hardening
- **Files**: `storage.ts`, `SessionExerciseCard`, tests, route casts.
- **Issue**: remove remaining production `any` casts, review non-null assertions, and add explicit public return types.
- **Target branch**: `fix/typescript-hardening`.
