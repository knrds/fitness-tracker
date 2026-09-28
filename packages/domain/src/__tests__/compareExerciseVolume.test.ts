import { describe, expect, it } from 'vitest';
import { compareExerciseVolume, getPreviousExercisePerformance } from '../logic';
import type { ExerciseSet, SessionExercise, WorkoutSession } from '../types';

const set = (weight: number, extra: Partial<ExerciseSet> = {}): ExerciseSet => ({
  id: `set-${weight}`,
  setNumber: 1,
  type: 'working',
  completed: true,
  weight,
  reps: 12,
  ...extra,
});
const occurrence = (id: string, sets: ExerciseSet[], order = 0): SessionExercise => ({
  id,
  exerciseId: 'lateral-raise',
  order,
  sets,
});
const session = (id: string, day: number, exercises: SessionExercise[]): WorkoutSession => ({
  id,
  userId: 'user',
  name: id,
  startedAt: new Date(2026, 8, day),
  completedAt: new Date(2026, 8, day, 1),
  createdAt: new Date(2026, 8, day),
  updatedAt: new Date(2026, 8, day),
  exercises,
});
const previousSets = [set(18), set(18), set(15)];
const currentSets = [set(18), set(18), set(16.5)];

describe('exercise volume comparisons', () => {
  it('compares the reported 630 kg against 612 kg without rounding the calculation', () => {
    const comparison = compareExerciseVolume(occurrence('now', currentSets), {
      sets: previousSets,
    });
    expect(comparison).toMatchObject({ currentVolume: 630, previousVolume: 612, status: 'ready' });
    expect(comparison.deltaPercent).toBeCloseTo(2.9411764706, 8);
  });

  it('includes each completed working/drop/failure set once and excludes warmups and plans', () => {
    const comparison = compareExerciseVolume(
      occurrence('now', [
        set(18),
        set(18, { type: 'drop' }),
        set(16.5, { type: 'failure', rir: 0 }),
        set(100, { type: 'warmup' }),
        set(200, { completed: false }),
      ]),
      { sets: [...previousSets, set(300, { type: 'warmup' }), set(400, { completed: false })] },
    );
    expect(comparison).toMatchObject({
      currentVolume: 630,
      previousVolume: 612,
      completedWorkingSetCount: 3,
      workingSetCount: 4,
      status: 'pending',
    });
    expect(comparison.deltaPercent).toBeCloseTo(2.9411764706, 8);
  });

  it('marks two confirmed sets as an explicitly partial comparison against the full baseline', () => {
    const comparison = compareExerciseVolume(
      occurrence('now', [set(18), set(18), set(16.5, { completed: false })]),
      { sets: previousSets },
    );
    expect(comparison).toMatchObject({
      currentVolume: 432,
      completedWorkingSetCount: 2,
      workingSetCount: 3,
      status: 'pending',
    });
    expect(comparison.deltaPercent).toBeCloseTo(-29.4117647059, 8);
  });

  it('does not manufacture -100% before any working set is confirmed', () => {
    expect(
      compareExerciseVolume(
        occurrence('now', [set(18, { completed: false }), set(20, { type: 'warmup' })]),
        { sets: previousSets },
      ),
    ).toMatchObject({ currentVolume: 0, status: 'pending', deltaPercent: null });
    expect(
      compareExerciseVolume(occurrence('empty', []), { sets: previousSets }).deltaPercent,
    ).toBeNull();
  });

  it('does not let an unfinished warmup prevent a final comparison', () => {
    expect(
      compareExerciseVolume(
        occurrence('now', [...currentSets, set(10, { type: 'warmup', completed: false })]),
        { sets: previousSets },
      ).status,
    ).toBe('ready');
  });

  it('keeps real decreases and equal volumes, and has no percentage for missing or zero baselines', () => {
    const current = occurrence('now', [set(10)]);
    expect(compareExerciseVolume(current, { sets: [set(20)] }).deltaPercent).toBe(-50);
    expect(compareExerciseVolume(current, { sets: [set(10)] }).deltaPercent).toBe(0);
    for (const previous of [null, { sets: [set(0)] }, { sets: [] }]) {
      expect(compareExerciseVolume(current, previous)).toMatchObject({
        status: 'no-baseline',
        deltaPercent: null,
      });
    }
  });
});

describe('previous exercise occurrence selection', () => {
  it('selects the most recent strictly earlier session independent of history ordering', () => {
    const older = session('older', 10, [occurrence('older-raise', [set(10)])]);
    const previous = session('previous', 20, [occurrence('previous-raise', previousSets)]);
    const current = session('current', 27, [occurrence('current-raise', currentSets)]);
    const future = session('future', 28, [occurrence('future-raise', [set(100)])]);
    const history = [current, older, future, previous];
    const result = getPreviousExercisePerformance(history, 'lateral-raise', 0, {
      beforeStartedAt: current.startedAt,
      excludeSessionId: current.id,
    });
    expect(result).toMatchObject({
      sessionId: 'previous',
      sessionExerciseId: 'previous-raise',
      sets: previousSets,
    });
    expect(history).toEqual([current, older, future, previous]);
    expect(
      getPreviousExercisePerformance([current, previous], 'lateral-raise', 0, {
        excludeSessionId: current.id,
      })?.sessionId,
    ).toBe('previous');
  });

  it('matches exercise IDs and occurrence order, with older fallback when the latest lacks it', () => {
    const first = occurrence('first', [set(40)], 0);
    const second = occurrence('second', previousSets, 2);
    const unrelated = { ...occurrence('other', [set(500)], 1), exerciseId: 'other-exercise' };
    const older = session('older', 20, [second, unrelated, first]);
    const latest = session('latest', 25, [occurrence('latest-first', [set(50)])]);
    const result = getPreviousExercisePerformance([older, latest], 'lateral-raise', 1);
    expect(result).toMatchObject({
      sessionId: 'older',
      sessionExerciseId: 'second',
      sets: previousSets,
    });
    expect(getPreviousExercisePerformance([older, latest], 'lateral-raise', 0)?.sessionId).toBe(
      'latest',
    );
    expect(older.exercises).toEqual([second, unrelated, first]);
    expect(getPreviousExercisePerformance([older, latest], 'lateral-raise', 2)).toBeNull();
    expect(getPreviousExercisePerformance([older], 'lateral-raise', -1)).toBeNull();
  });

  it('skips warmup-only or unperformed entries and returns only confirmed historical sets', () => {
    const good = session('good', 20, [
      occurrence('good-raise', [...previousSets, set(90, { completed: false })]),
    ]);
    const warmup = session('warmup', 24, [
      occurrence('warmup-raise', [set(90, { type: 'warmup' })]),
    ]);
    const planned = session('planned', 25, [
      occurrence('planned-raise', [set(90, { completed: false })]),
    ]);
    expect(getPreviousExercisePerformance([planned, warmup, good], 'lateral-raise')).toMatchObject({
      sessionId: 'good',
      sets: previousSets,
    });
  });
});
