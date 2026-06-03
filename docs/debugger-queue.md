# Debugger Queue

This queue tracks bugs, architectural violations, and other technical debt to be resolved by the Debugger Agent (Codex).

## Architecture Violations (to be fixed in Mission H0 / Block 2)

The following violations against the Architecture Guidelines (Section 1b of `FITNESS_TRACKER_COMPLETE_WORKFLOW.md`) were identified:

### 1. Timezone Bug with `toISOString()`
- **File**: `apps/mobile/src/stores/historyStore.ts`
- **Location**: `getStreak()` function
- **Violation**: Uses `d.toISOString()` (UTC) to generate date comparison keys after setting hours to 0 local time. This causes incorrect streak calculations for users in non-UTC time zones because UTC midnight shifts the day key.
- **Guideline Ref**: Rule 4: Datumsvergleiche immer in lokaler Zeit (lokale Keys `YYYY-MM-DD`, kein `toISOString()`).

### 2. Warmups Included in Volume Calculations
- **Files**:
  - `apps/mobile/src/stores/historyStore.ts` (in `getExerciseVolumeHistory`)
  - `apps/mobile/src/stores/profileStore.ts` (in `getStatistics` total volume loop)
  - `apps/mobile/src/stores/achievementStore.ts` (in `calculateTotalVolume` and `sessionVolume` loop)
- **Violation**: The calculation loops do not filter out sets where `set.type === 'warmup'`. Warmup sets are counted toward the user's workload volume.
- **Guideline Ref**: Rule 2: Warmups zählen nie als Arbeitsvolumen oder PR.

### 3. Warmups Included in PR Calculations
- **Files**:
  - `apps/mobile/src/stores/historyStore.ts` (in `getPRs`)
  - `apps/mobile/src/stores/achievementStore.ts` (in `calculatePRs`)
- **Violation**: Does not filter out warmup sets (`set.type === 'warmup'`). If a user lifts a heavy weight during a warmup, it can be flagged as a PR.
- **Guideline Ref**: Rule 2: Warmups zählen nie als Arbeitsvolumen oder PR.

### 4. PRs are Weight-Based instead of e1RM-Based
- **Files**:
  - `apps/mobile/src/stores/historyStore.ts` (in `getPRs`)
  - `apps/mobile/src/stores/achievementStore.ts` (in `calculatePRs` / PR updates)
- **Violation**: PRs are tracked simply by comparing max weight (`weight > prs[id]`), ignoring the reps completed. The guidelines mandate that PRs are tracked via estimated One-Rep Max (e1RM) using the Epley formula.
- **Guideline Ref**: Rule 3: PRs sind e1RM-basiert.

### 5. Duplicated Business & Calculation Logic
- **Files**:
  - `apps/mobile/src/stores/historyStore.ts`
  - `apps/mobile/src/stores/profileStore.ts`
  - `apps/mobile/src/stores/achievementStore.ts`
- **Violation**: Calculation logic for Volume, PRs, and Streaks is implemented and duplicated across multiple store files.
- **Guideline Ref**: Rule 1: Geschäftslogik gehört in `packages/domain/src/logic/` — nicht in Stores/UI.

### 6. Workout Timer Drift
- **File**: `apps/mobile/app/workout/session.tsx` (and `apps/mobile/src/stores/workoutStore.ts`)
- **Violation**: Elapsed time is accumulated using `setInterval` ticking `tickWorkoutTimer(1)` every second in a React `useEffect`, which drifts when backgrounded. It should be derived from `startedAt` + accumulated pause duration.
- **Guideline Ref**: Rule 6: Zeitmessung driftfrei.
