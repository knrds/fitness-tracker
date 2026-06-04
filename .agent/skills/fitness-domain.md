# Skill: Fitness Domain Knowledge

Vocabulary and concepts an agent needs to model and reason about strength
training correctly in this app. These terms map directly to fields in
[`packages/domain/src/types/index.ts`](../../packages/domain/src/types/index.ts).

---

## RPE — Rate of Perceived Exertion

A subjective intensity scale, **1–10**, capturing how hard a set felt.

- **10** = maximal effort, no more reps possible (true failure).
- **9** = ~1 rep left in the tank.
- **8** = ~2 reps left, etc.

Used to autoregulate load day-to-day. In the model: `ExerciseSet.rpe`
(`number`, validated `1 ≤ rpe ≤ 10`). Allows half-steps (e.g. 8.5), hence
`numeric(3,1)` in SQL.

## RIR — Reps In Reserve

The inverse, more concrete framing: how many more reps you _could_ have done.

- `RIR 0` = went to failure (≈ RPE 10).
- `RIR 2` = could have done 2 more (≈ RPE 8).

Relationship: **RPE ≈ 10 − RIR**. We store both because lifters prefer one or
the other; either may be null. In the model: `ExerciseSet.rir`
(`0 ≤ rir ≤ 5`, integer).

## Training Volume

The total amount of work performed. Common definitions:

- **Working sets** — count of non-warmup sets (simplest weekly volume metric;
  filter `ExerciseSet.type !== 'warmup'`).
- **Volume load** — `Σ (weight × reps)` across working sets. The standard
  tonnage metric for progress tracking.
- Tracked **per muscle group** by attributing each set's volume to the
  exercise's `primaryMuscles` (see `Exercise.primaryMuscles`).

Warm-up sets (`SetType = 'warmup'`) are **excluded** from volume analytics.

## PR — Personal Record

A best-ever performance for an exercise. Modelled by `PersonalRecord` with a
`PersonalRecordType`:

- `one_rep_max` — measured 1RM (a single max-effort rep).
- `estimated_one_rep_max` — calculated from a submaximal set (e.g. Epley:
  `1RM ≈ weight × (1 + reps/30)`).
- `max_weight` — heaviest load for a given rep count (`reps` field set).
- `max_reps` — most reps at a load.
- `max_volume` — highest single-set or single-session volume load.
- `best_time` / `max_distance` — for timed/cardio work.

A PR stores `value`, optional `previousValue` (for the improvement delta), and
links back to the `sessionId`/`setId` that achieved it.

## Mesocycle (and the training-cycle hierarchy)

Periodisation splits training into nested time blocks:

- **Microcycle** — usually one week of training.
- **Mesocycle** — a block of ~3–6 weeks with a focused goal (e.g. hypertrophy
  accumulation), typically ending in a deload. This is what a **`Program`**
  represents in our model (`Program.durationWeeks`, scheduled via
  `ProgramWorkout` across weeks/days).
- **Macrocycle** — the long-term plan (months) chaining mesocycles. Not modelled
  explicitly in the MVP.

A `Program` schedules `WorkoutTemplate`s onto specific `week` + `dayOfWeek`
slots; performing one produces a `WorkoutSession`.

## Quick term → field map

| Term        | Where it lives                                  |
| ----------- | ----------------------------------------------- |
| RPE         | `ExerciseSet.rpe`, `TemplateExercise.targetRpe` |
| RIR         | `ExerciseSet.rir`, `TemplateExercise.targetRir` |
| Working set | `ExerciseSet.type === 'working'`                |
| Volume load | derived: `Σ weight × reps`                      |
| PR          | `PersonalRecord` + `PersonalRecordType`         |
| Mesocycle   | `Program` (`durationWeeks`, `ProgramWorkout`)   |
| Session     | `WorkoutSession` (the performed record)         |
