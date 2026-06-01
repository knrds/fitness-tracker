import { describe, expect, it } from 'vitest';

import {
  Equipment,
  ExerciseSchema,
  ExerciseSetSchema,
  MovementPattern,
  MuscleGroup,
  WorkoutSessionSchema,
} from '../index';

// A fixed, syntactically-valid UUID used across fixtures.
const UUID = '11111111-1111-4111-8111-111111111111';
const UUID_2 = '22222222-2222-4222-8222-222222222222';

describe('ExerciseSetSchema', () => {
  const validSet = {
    id: UUID,
    setNumber: 1,
    type: 'working' as const,
    weight: 100,
    reps: 5,
    rpe: 8,
    rir: 2,
    restSeconds: 120,
    completed: true,
  };

  it('accepts a valid working set', () => {
    const result = ExerciseSetSchema.safeParse(validSet);
    expect(result.success).toBe(true);
  });

  it('rejects RPE above 10', () => {
    const result = ExerciseSetSchema.safeParse({ ...validSet, rpe: 11 });
    expect(result.success).toBe(false);
  });

  it('rejects RIR above 5', () => {
    const result = ExerciseSetSchema.safeParse({ ...validSet, rir: 6 });
    expect(result.success).toBe(false);
  });

  it('rejects a negative weight', () => {
    const result = ExerciseSetSchema.safeParse({ ...validSet, weight: -10 });
    expect(result.success).toBe(false);
  });

  it('rejects a non-integer setNumber', () => {
    const result = ExerciseSetSchema.safeParse({ ...validSet, setNumber: 1.5 });
    expect(result.success).toBe(false);
  });

  it('rejects an unknown set type', () => {
    const result = ExerciseSetSchema.safeParse({ ...validSet, type: 'megaset' });
    expect(result.success).toBe(false);
  });
});

describe('ExerciseSchema', () => {
  const libraryExercise = {
    id: UUID,
    name: 'Barbell Bench Press',
    primaryMuscles: [MuscleGroup.Chest],
    secondaryMuscles: [MuscleGroup.Triceps, MuscleGroup.FrontDelts],
    equipment: Equipment.Barbell,
    movementPattern: MovementPattern.HorizontalPush,
    isCustom: false,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  it('accepts a valid library exercise (no owner)', () => {
    const result = ExerciseSchema.safeParse(libraryExercise);
    expect(result.success).toBe(true);
  });

  it('accepts a custom exercise with an ownerId', () => {
    const result = ExerciseSchema.safeParse({
      ...libraryExercise,
      isCustom: true,
      ownerId: UUID_2,
    });
    expect(result.success).toBe(true);
  });

  it('rejects a custom exercise WITHOUT an ownerId (refine rule)', () => {
    const result = ExerciseSchema.safeParse({ ...libraryExercise, isCustom: true });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0]?.path).toContain('ownerId');
    }
  });

  it('rejects an empty primaryMuscles array', () => {
    const result = ExerciseSchema.safeParse({ ...libraryExercise, primaryMuscles: [] });
    expect(result.success).toBe(false);
  });

  it('rejects an invalid muscle group', () => {
    const result = ExerciseSchema.safeParse({
      ...libraryExercise,
      primaryMuscles: ['left_eyebrow'],
    });
    expect(result.success).toBe(false);
  });
});

describe('WorkoutSessionSchema', () => {
  const validSession = {
    id: UUID,
    userId: UUID_2,
    name: 'Push Day A',
    startedAt: new Date('2026-01-01T09:00:00Z'),
    exercises: [
      {
        id: UUID,
        exerciseId: UUID_2,
        order: 0,
        sets: [
          {
            id: UUID,
            setNumber: 1,
            type: 'working' as const,
            weight: 80,
            reps: 8,
            completed: true,
          },
        ],
      },
    ],
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  it('accepts a valid session with nested exercises and sets', () => {
    const result = WorkoutSessionSchema.safeParse(validSession);
    expect(result.success).toBe(true);
  });

  it('coerces an ISO date string for startedAt into a Date', () => {
    const result = WorkoutSessionSchema.safeParse({
      ...validSession,
      startedAt: '2026-01-01T09:00:00Z',
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.startedAt).toBeInstanceOf(Date);
    }
  });

  it('rejects an empty name', () => {
    const result = WorkoutSessionSchema.safeParse({ ...validSession, name: '' });
    expect(result.success).toBe(false);
  });

  it('rejects a non-UUID userId', () => {
    const result = WorkoutSessionSchema.safeParse({ ...validSession, userId: 'not-a-uuid' });
    expect(result.success).toBe(false);
  });

  it('rejects a perceivedExertion outside 1–10', () => {
    const result = WorkoutSessionSchema.safeParse({ ...validSession, perceivedExertion: 12 });
    expect(result.success).toBe(false);
  });
});
