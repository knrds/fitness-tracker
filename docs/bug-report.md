# Bug Report - fix/bugfixes

## Fixed Critical / High

### 1. Double Finish Can Save/Share Twice

- **Severity**: KRITISCH
- **File**: `apps/mobile/src/stores/workoutStore.ts:216`
- **Description**: `finishWorkout()` previously returned `void` and always transitioned to `finished` after side effects. Rapid repeated finish actions could re-enter the UI flow and share stale state.
- **Fix**: `finishWorkout()` now returns `WorkoutSession | null`, exits when status is no longer active/paused, resets empty sessions without saving, and returns the saved session only once.

### 2. Share Summary Ran Before Store Guard

- **Severity**: HOCH
- **File**: `apps/mobile/app/workout/session.tsx:90`
- **Description**: the screen built a share message from active store state before `finishWorkout()` could reject an empty workout. It also duplicated volume/set calculations in UI.
- **Fix**: the screen now calls `finishWorkout()` first, shares only when a saved session is returned, and builds the message from `summarizeWorkout()`.

### 3. Persistent Stores Used Old MMKV Adapters

- **Severity**: HOCH
- **Files**:
  - `apps/mobile/src/stores/bodyMetricStore.ts:75`
  - `apps/mobile/src/stores/exerciseStore.ts:135`
  - `apps/mobile/src/stores/programStore.ts:107`
- **Description**: these stores still used copied MMKV adapters or `createJSONStorage`, so they bypassed the shared hydration validation strategy.
- **Fix**: all three now use `createHydratedStorage()` with store-specific Zod schemas.

### 4. Persistent Stores Had No Migration Functions

- **Severity**: HOCH
- **Files**: `apps/mobile/src/stores/*Store.ts`
- **Description**: H0 added `version` to several stores, but no `migrate`, leaving version changes without a safe fallback path.
- **Fix**: every persistent store now has `version: 1` and a schema-backed `migrate` fallback.

### 5. Local MVP IDs Violated Domain UUID Schemas

- **Severity**: HOCH
- **Files**:
  - `apps/mobile/src/stores/workoutStore.ts:242`
  - `apps/mobile/src/stores/bodyMetricStore.ts:38`
  - `apps/mobile/src/stores/programStore.ts:47`
  - `apps/mobile/src/stores/exerciseStore.ts:111`
- **Description**: new local records used `local-user`, which fails `UUIDSchema` during Zod hydration.
- **Fix**: added `LOCAL_USER_ID` as a stable UUID and use it for locally-created records.

### 6. Rest Timer Unsafe `endsAt` Access

- **Severity**: HOCH
- **File**: `apps/mobile/src/components/workout/RestTimer.tsx:33`
- **Description**: the timer used `restTimer.endsAt!` inside an interval callback, which could crash if state changed unexpectedly.
- **Fix**: capture `endsAt` after the guard and use the local checked value.

### 7. Achievement Progress Counted Warmups

- **Severity**: HOCH
- **File**: `apps/mobile/src/hooks/useAchievementCheck.ts`
- **Description**: volume achievement progress still had a copied `weight * reps` loop after H0 and counted warmup sets.
- **Fix**: replaced the loop with `calculateVolume(session, { includeWarmups: false })`.

## Remaining Medium Findings

### 8. Per-exercise Analytics Still Duplicate Aggregation

- **Severity**: MITTEL
- **File**: `apps/mobile/src/stores/historyStore.ts:65`
- **Description**: all-time PR and per-exercise volume history still aggregate in the store. They exclude warmups, but do not fully satisfy the "domain logic only" guideline.
- **Fix**: left in queue for a focused domain helper cleanup.

### 9. Set Input Sanitization Needs Dedicated Edge Tests

- **Severity**: MITTEL
- **File**: `apps/mobile/src/components/workout/SessionExerciseCard.tsx`
- **Description**: UI parsers still need explicit coverage for empty text, negative numbers, and non-numeric input.
- **Fix**: queued for `fix/edge-cases`.

### 10. Route Casts Need Type Hardening

- **Severity**: MITTEL
- **Files**: multiple `apps/mobile/app/**` routes
- **Description**: dynamic route strings use `as unknown as Parameters<typeof router.push>[0]`.
- **Fix**: queued for `fix/typescript-hardening`.
