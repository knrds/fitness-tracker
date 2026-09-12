import { describe, it, expect } from 'vitest';
import { EXERCISES, MuscleGroup, matchesMuscleRegion, getMuscleActivity } from '../index';
import type { WorkoutSession } from '../types';

describe('muscle regions', () => {
  it('lists imported shoulder exercises for the Shoulders filter and both heatmap shoulders', () => {
    const shoulders = EXERCISES.filter((ex) => ex.primaryMuscles.includes(MuscleGroup.SideDelts));
    expect(shoulders.length).toBeGreaterThan(20);
    for (const ex of shoulders) {
      expect(matchesMuscleRegion(ex, MuscleGroup.FrontDelts)).toBe(true);
      expect(matchesMuscleRegion(ex, MuscleGroup.RearDelts)).toBe(true);
    }
  });
  it('includes triceps in Arms and hamstrings in Legs', () => {
    expect(
      EXERCISES.filter((ex) => ex.primaryMuscles.includes(MuscleGroup.Triceps)).every((ex) =>
        matchesMuscleRegion(ex, MuscleGroup.Biceps),
      ),
    ).toBe(true);
    expect(
      EXERCISES.filter((ex) => ex.primaryMuscles.includes(MuscleGroup.Hamstrings)).every((ex) =>
        matchesMuscleRegion(ex, MuscleGroup.Quads),
      ),
    ).toBe(true);
  });
  it('counts bodyweight working sets without inventing weight and excludes warmups and unfinished sets', () => {
    const ex = EXERCISES.find((ex) => ex.primaryMuscles.includes(MuscleGroup.SideDelts))!;
    const date = new Date('2026-09-11T10:00:00Z');
    const workout: WorkoutSession = {
      id: 's',
      userId: 'u',
      name: 'Test',
      startedAt: date,
      createdAt: date,
      updatedAt: date,
      exercises: [
        {
          id: 'e',
          exerciseId: ex.id,
          order: 0,
          sets: [
            { id: '1', setNumber: 1, type: 'working', completed: true, reps: 10 },
            { id: '2', setNumber: 2, type: 'warmup', completed: true, weight: 20, reps: 10 },
            { id: '3', setNumber: 3, type: 'working', completed: false, weight: 20, reps: 10 },
          ],
        },
      ],
    };
    expect(getMuscleActivity([workout], [ex], date)[MuscleGroup.FrontDelts]).toBe(1);
    expect(getMuscleActivity([workout], [ex], new Date(date.getTime() + 1))).toEqual({});
  });
});
