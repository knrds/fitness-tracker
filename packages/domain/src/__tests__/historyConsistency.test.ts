import { describe, expect, it } from 'vitest';
import { detectPRs, getBestE1RMs, getExerciseProgressHistory } from '../logic';
import type { ExerciseSet, WorkoutSession } from '../types';

const exId = 'custom-curl';
const names = { [exId]: 'Custom Curl' };
const set = (weight: number, reps = 5, extra: Partial<ExerciseSet> = {}): ExerciseSet => ({
  id: `set-${weight}`,
  setNumber: 1,
  type: 'working',
  completed: true,
  weight,
  reps,
  ...extra,
});
const session = (id: string, day: number, occurrences: ExerciseSet[][]): WorkoutSession => ({
  id,
  userId: 'user',
  name: id,
  startedAt: new Date(2026, 8, day),
  createdAt: new Date(2026, 8, day),
  updatedAt: new Date(2026, 8, day),
  exercises: occurrences.map((sets, order) => ({
    id: `${id}-${order}`,
    exerciseId: exId,
    order,
    sets,
  })),
});

describe('history consistency', () => {
  it('includes all occurrences in one chronological progress point without mutating history', () => {
    const first = session('first', 1, [
      [set(20, 10)],
      [set(30, 5), set(200, 1, { type: 'warmup' })],
    ]);
    const later = session('later', 2, [[set(40, 5, { completed: false })], [set(35, 5)]]);
    const history = [later, first];
    const points = getExerciseProgressHistory(exId, history, names[exId]);
    expect(points.map((p) => [p.volume, p.maxWeight])).toEqual([
      [350, 30],
      [175, 35],
    ]);
    expect(points[0]?.maxE1RM).toBe(getBestE1RMs([first], names)[exId]?.e1RM);
    expect(history).toEqual([later, first]);
  });

  it('awards one PR per exercise using the best of repeated occurrences', () => {
    const past = session('past', 1, [[set(10)]]);
    const current = session('current', 2, [[set(20)], [set(30)]]);
    const prs = detectPRs(current, [past, current], names);
    expect(prs).toHaveLength(1);
    expect(prs[0]).toMatchObject({ exerciseId: exId, weight: 30, reps: 5 });
    expect(prs[0]?.newE1RM).toBe(getBestE1RMs([current], names)[exId]?.e1RM);
  });

  it('distinguishes a weight record from an estimated strength record', () => {
    const past = session('past', 1, [[set(100, 1)]]);
    const current = session('current', 2, [[set(95, 10)]]);
    const point = getExerciseProgressHistory(exId, [current, past], names[exId])[1];
    expect(point).toMatchObject({ isWeightPR: false, isE1RMPR: true, isPR: true });
    expect(detectPRs(current, [past], names)).toHaveLength(1);
  });

  it('does not count equal estimates, warmups, or unfinished sets as new records', () => {
    const past = session('past', 1, [[set(30)]]);
    const current = session('current', 2, [
      [set(30), set(100, 5, { type: 'warmup' })],
      [set(200, 5, { completed: false })],
    ]);
    expect(detectPRs(current, [past], names)).toEqual([]);
    expect(getExerciseProgressHistory(exId, [past, current], names[exId])[1]).toMatchObject({
      isWeightPR: false,
      isE1RMPR: false,
    });
  });

  it('does not manufacture an estimated record from zero or missing repetitions or load', () => {
    const missingReps = set(40);
    delete missingReps.reps;
    const missingWeight = set(40);
    delete missingWeight.weight;
    const invalid = session('invalid', 1, [
      [set(100, 0), set(0, 10), missingReps, missingWeight],
    ]);
    expect(getBestE1RMs([invalid], names)).toEqual({});
    expect(detectPRs(invalid, [], names)).toEqual([]);
  });

  it('uses the same custom exercise name and RIR precedence in every estimate', () => {
    const current = session('current', 1, [[set(60, 8, { rpe: 7, rir: 0 })]]);
    const expected = 68;
    expect(getBestE1RMs([current], names)[exId]?.e1RM).toBe(expected);
    expect(detectPRs(current, [], names)[0]?.newE1RM).toBe(expected);
    expect(getExerciseProgressHistory(exId, [current], names[exId])[0]?.maxE1RM).toBe(expected);
  });
});
