import { describe, it, expect } from 'vitest';
import { EXERCISES, MuscleGroup, matchesMuscleRegion, matchesMuscleGroup, getMuscleActivity, getHeatmapActivity, getMuscleDistribution } from '../index';
import type { Exercise, WorkoutSession } from '../types';

const date = new Date('2026-09-11T10:00:00Z');
function session(exercises: Exercise[]): WorkoutSession {
  return {
    id: 's', userId: 'u', name: 'Muscle activity', startedAt: date, createdAt: date, updatedAt: date,
    exercises: exercises.map((exercise, order) => ({ id: String(order), order, exerciseId: exercise.id,
      sets: [
        { id: `${order}-1`, setNumber: 1, type: 'working', completed: true, reps: 10 },
        { id: `${order}-2`, setNumber: 2, type: 'drop', completed: true, reps: 8 },
        { id: `${order}-3`, setNumber: 3, type: 'failure', completed: true, reps: 0 },
        { id: `${order}-4`, setNumber: 4, type: 'warmup', completed: true, reps: 10 },
        { id: `${order}-5`, setNumber: 5, type: 'working', completed: false, reps: 10 },
      ],
    })),
  };
}

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
    const activity = getMuscleActivity([workout], [ex], date);
    expect(activity[MuscleGroup.SideDelts]).toBe(1);
    expect(activity[MuscleGroup.FrontDelts]).toBeUndefined();
    expect(getHeatmapActivity(activity, MuscleGroup.FrontDelts)).toBe(1);
    expect(getMuscleActivity([workout], [ex], new Date(date.getTime() + 1))).toEqual({});
  });
  it('weights secondary muscles without double-counting duplicate roles or failure markers', () => {
    const exercise: Exercise = { ...EXERCISES[0]!, isCustom: true,
      primaryMuscles: [MuscleGroup.Biceps, MuscleGroup.Biceps],
      secondaryMuscles: [MuscleGroup.Biceps, MuscleGroup.Forearms, MuscleGroup.Forearms],
    };
    expect(getMuscleActivity([session([exercise])], [exercise], date)).toEqual({ biceps: 2, forearms: 1 });
  });
  it('includes curated forearm assignments for hammer curl variants and imported RDL support muscles', () => {
    for (const name of ['Hammer Curls', 'Incline Hammer Curls', 'Cable Hammer Curls - Rope Attachment']) {
      const exercise = EXERCISES.find((item) => item.name === name)!;
      const activity = getMuscleActivity([session([exercise])], [exercise], date);
      expect(activity.biceps).toBe(2);
      expect(activity.forearms).toBe(1);
    }
    const rdl = EXERCISES.find((item) => item.name === 'Romanian Deadlift')!;
    const activity = getMuscleActivity([session([rdl])], [rdl], date);
    expect(activity.hamstrings).toBe(2);
    expect(activity.glutes).toBe(1);
    expect(activity.lower_back).toBe(1);
  });
  it('preserves adductors as a separate display region without inferring them for all quads', () => {
    for (const name of ['Thigh Adductor', 'Cable Hip Adduction']) {
      const exercise = EXERCISES.find((item) => item.name === name)!;
      const activity = getMuscleActivity([session([exercise])], [exercise], date);
      expect(activity.adductors).toBe(2);
      expect(activity.quads).toBeUndefined();
      expect(matchesMuscleGroup(exercise, 'adductors')).toBe(true);
      expect(matchesMuscleGroup(exercise, MuscleGroup.Quads)).toBe(false);
    }
    const extension = EXERCISES.find((item) => item.name === 'Leg Extensions')!;
    expect(extension).toBeDefined();
    expect(matchesMuscleGroup(extension, 'adductors')).toBe(false);
    expect(getMuscleActivity([session([extension])], [extension], date).adductors).toBeUndefined();
  });
  it('uses exact muscle filters for individual groups while including secondary roles', () => {
    const exercise: Exercise = { ...EXERCISES[0]!, isCustom: true, primaryMuscles: [MuscleGroup.Triceps], secondaryMuscles: [MuscleGroup.Forearms] };
    expect(matchesMuscleGroup(exercise, MuscleGroup.Triceps)).toBe(true);
    expect(matchesMuscleGroup(exercise, MuscleGroup.Forearms)).toBe(true);
    expect(matchesMuscleGroup(exercise, MuscleGroup.Biceps)).toBe(false);
  });
  it('fills the leader ring completely and scales others while retaining honest shares', () => {
    const result = getMuscleDistribution({ biceps: 8, forearms: 4, chest: 2, calves: 0 });
    expect(result.total).toBe(14);
    expect(result.entries.map((entry) => entry.relative)).toEqual([1, 0.5, 0.25]);
    expect(result.entries[0]!.share).toBeCloseTo(8 / 14);
    expect(result.entries.reduce((sum, entry) => sum + entry.share, 0)).toBeCloseTo(1);
    expect(getMuscleDistribution({ calves: 0 }).entries).toEqual([]);
  });
});
