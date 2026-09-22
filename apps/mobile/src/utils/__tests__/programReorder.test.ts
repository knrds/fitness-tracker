import { reorderProgramWorkout } from '../programReorderGeometry';
import { ProgramWorkout } from '@fitness-tracker/domain';

const sampleWorkouts: ProgramWorkout[] = [
  // Week 1, Day 1 (Monday)
  { id: 'pw-1', templateId: 'tmpl-a', week: 1, dayOfWeek: 1, order: 0 },
  { id: 'pw-2', templateId: 'tmpl-b', week: 1, dayOfWeek: 1, order: 1 },
  // Week 1, Day 2 (Tuesday)
  { id: 'pw-3', templateId: 'tmpl-c', week: 1, dayOfWeek: 2, order: 0 },
  // Week 1, Day 3 (Wednesday)
  { id: 'pw-4', templateId: 'tmpl-d', week: 1, dayOfWeek: 3, order: 0 },
  { id: 'pw-5', templateId: 'tmpl-e', week: 1, dayOfWeek: 3, order: 1 },
  { id: 'pw-6', templateId: 'tmpl-f', week: 1, dayOfWeek: 3, order: 2 },
  // Week 2, Day 1
  { id: 'pw-7', templateId: 'tmpl-a', week: 2, dayOfWeek: 1, order: 0 },
];

describe('programReorderGeometry', () => {
  it('moves a workout from Day 1 to Day 2 at end of Day 2', () => {
    const result = reorderProgramWorkout({
      workouts: sampleWorkouts,
      workoutId: 'pw-1',
      targetWeek: 1,
      targetDay: 2,
    });

    const day1 = result.filter((w) => w.week === 1 && w.dayOfWeek === 1);
    const day2 = result.filter((w) => w.week === 1 && w.dayOfWeek === 2);

    expect(day1).toHaveLength(1);
    expect(day1[0]?.id).toBe('pw-2');
    expect(day1[0]?.order).toBe(0);

    expect(day2).toHaveLength(2);
    expect(day2[0]?.id).toBe('pw-3');
    expect(day2[0]?.order).toBe(0);
    expect(day2[1]?.id).toBe('pw-1');
    expect(day2[1]?.order).toBe(1);
    expect(day2[1]?.dayOfWeek).toBe(2);
  });

  it('moves a workout from Day 1 to Day 2 at position 0 (first)', () => {
    const result = reorderProgramWorkout({
      workouts: sampleWorkouts,
      workoutId: 'pw-1',
      targetWeek: 1,
      targetDay: 2,
      targetIndex: 0,
    });

    const day2 = result.filter((w) => w.week === 1 && w.dayOfWeek === 2);
    expect(day2).toHaveLength(2);
    expect(day2[0]?.id).toBe('pw-1');
    expect(day2[0]?.order).toBe(0);
    expect(day2[1]?.id).toBe('pw-3');
    expect(day2[1]?.order).toBe(1);
  });

  it('reorders within same day: first to last (Day 3: pw-4, pw-5, pw-6 -> pw-5, pw-6, pw-4)', () => {
    const result = reorderProgramWorkout({
      workouts: sampleWorkouts,
      workoutId: 'pw-4',
      targetWeek: 1,
      targetDay: 3,
      targetIndex: 2,
    });

    const day3 = result
      .filter((w) => w.week === 1 && w.dayOfWeek === 3)
      .sort((a, b) => a.order - b.order);

    expect(day3.map((w) => w.id)).toEqual(['pw-5', 'pw-6', 'pw-4']);
    expect(day3.map((w) => w.order)).toEqual([0, 1, 2]);
  });

  it('reorders within same day: last to first (Day 3: pw-4, pw-5, pw-6 -> pw-6, pw-4, pw-5)', () => {
    const result = reorderProgramWorkout({
      workouts: sampleWorkouts,
      workoutId: 'pw-6',
      targetWeek: 1,
      targetDay: 3,
      targetIndex: 0,
    });

    const day3 = result
      .filter((w) => w.week === 1 && w.dayOfWeek === 3)
      .sort((a, b) => a.order - b.order);

    expect(day3.map((w) => w.id)).toEqual(['pw-6', 'pw-4', 'pw-5']);
    expect(day3.map((w) => w.order)).toEqual([0, 1, 2]);
  });

  it('handles adjacent reorder within same day (swap pw-4 and pw-5)', () => {
    const result = reorderProgramWorkout({
      workouts: sampleWorkouts,
      workoutId: 'pw-4',
      targetWeek: 1,
      targetDay: 3,
      targetIndex: 1,
    });

    const day3 = result
      .filter((w) => w.week === 1 && w.dayOfWeek === 3)
      .sort((a, b) => a.order - b.order);

    expect(day3.map((w) => w.id)).toEqual(['pw-5', 'pw-4', 'pw-6']);
    expect(day3.map((w) => w.order)).toEqual([0, 1, 2]);
  });

  it('handles repeated reorders in sequence deterministically', () => {
    let current = sampleWorkouts;

    // Step 1: Move pw-1 to Day 2
    current = reorderProgramWorkout({
      workouts: current,
      workoutId: 'pw-1',
      targetWeek: 1,
      targetDay: 2,
    });

    // Step 2: Move pw-3 to Day 1
    current = reorderProgramWorkout({
      workouts: current,
      workoutId: 'pw-3',
      targetWeek: 1,
      targetDay: 1,
    });

    // Step 3: Reorder within Day 2
    current = reorderProgramWorkout({
      workouts: current,
      workoutId: 'pw-1',
      targetWeek: 1,
      targetDay: 2,
      targetIndex: 0,
    });

    expect(current).toHaveLength(sampleWorkouts.length);
    const day1 = current.filter((w) => w.week === 1 && w.dayOfWeek === 1);
    expect(day1.map((w) => w.id)).toEqual(['pw-2', 'pw-3']);
  });

  it('preserves all untouched weeks and workouts without data loss', () => {
    const result = reorderProgramWorkout({
      workouts: sampleWorkouts,
      workoutId: 'pw-1',
      targetWeek: 1,
      targetDay: 2,
    });

    expect(result).toHaveLength(sampleWorkouts.length);
    const week2 = result.filter((w) => w.week === 2);
    expect(week2).toHaveLength(1);
    expect(week2[0]?.id).toBe('pw-7');
  });

  it('ensures all IDs are unique and no duplicates are created', () => {
    const result = reorderProgramWorkout({
      workouts: sampleWorkouts,
      workoutId: 'pw-1',
      targetWeek: 1,
      targetDay: 3,
      targetIndex: 1,
    });

    const ids = result.map((w) => w.id);
    const uniqueIds = new Set(ids);
    expect(uniqueIds.size).toBe(sampleWorkouts.length);
  });

  it('preserves stable IDs: original workout IDs remain unchanged', () => {
    const result = reorderProgramWorkout({
      workouts: sampleWorkouts,
      workoutId: 'pw-5',
      targetWeek: 1,
      targetDay: 1,
    });

    const found = result.find((w) => w.id === 'pw-5');
    expect(found).toBeDefined();
    expect(found?.templateId).toBe('tmpl-e');
    expect(found?.dayOfWeek).toBe(1);
  });

  it('returns original array without mutation when targetDay is invalid (< 1 or > 7)', () => {
    const resultInvalid0 = reorderProgramWorkout({
      workouts: sampleWorkouts,
      workoutId: 'pw-1',
      targetWeek: 1,
      targetDay: 0,
    });
    expect(resultInvalid0).toEqual(sampleWorkouts);

    const resultInvalid8 = reorderProgramWorkout({
      workouts: sampleWorkouts,
      workoutId: 'pw-1',
      targetWeek: 1,
      targetDay: 8,
    });
    expect(resultInvalid8).toEqual(sampleWorkouts);
  });

  it('returns original array when workoutId is not found', () => {
    const result = reorderProgramWorkout({
      workouts: sampleWorkouts,
      workoutId: 'non-existent-id',
      targetWeek: 1,
      targetDay: 2,
    });
    expect(result).toEqual(sampleWorkouts);
  });
});
