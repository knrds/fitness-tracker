import {
  isBenchPressExercise,
  isSquatExercise,
  isDeadliftExercise,
  getBigThreeCategory,
  extractBigThreeMaxesFromSession,
  extractBigThreePRsFromHistory,
  calculateSuggestedWorkingSet,
} from '../bigThree';
import { Exercise, WorkoutSession } from '@fitness-tracker/domain';

describe('bigThree utilities', () => {
  describe('classification', () => {
    it('identifies bench press exercises correctly', () => {
      expect(isBenchPressExercise('Barbell Bench Press')).toBe(true);
      expect(isBenchPressExercise('Flat Dumbbell Bench Press')).toBe(true);
      expect(isBenchPressExercise('Incline Bench Press')).toBe(true);
      expect(isBenchPressExercise('Overhead Press')).toBe(false);
      expect(isBenchPressExercise('Bicep Curl')).toBe(false);
    });

    it('identifies squat exercises correctly', () => {
      expect(isSquatExercise('Barbell Squat')).toBe(true);
      expect(isSquatExercise('Front Barbell Squat')).toBe(true);
      expect(isSquatExercise('Goblet Squat')).toBe(true);
      expect(isSquatExercise('Clean and Jerk')).toBe(false);
      expect(isSquatExercise('Snatch')).toBe(false);
    });

    it('identifies deadlift exercises correctly', () => {
      expect(isDeadliftExercise('Barbell Deadlift')).toBe(true);
      expect(isDeadliftExercise('Sumo Deadlift')).toBe(true);
      expect(isDeadliftExercise('Romanian Deadlift')).toBe(true);
      expect(isDeadliftExercise('Lat Pulldown')).toBe(false);
    });

    it('returns the correct category', () => {
      expect(getBigThreeCategory('Barbell Bench Press - Medium Grip')).toBe('bench');
      expect(getBigThreeCategory('Back Squat')).toBe('squat');
      expect(getBigThreeCategory('Conventional Deadlift')).toBe('deadlift');
      expect(getBigThreeCategory('Tricep Pushdown')).toBeNull();
    });
  });

  describe('extractBigThreeMaxesFromSession', () => {
    const mockExercises: Exercise[] = [
      { id: 'ex-bench', name: 'Barbell Bench Press' } as Exercise,
      { id: 'ex-squat', name: 'Barbell Squat' } as Exercise,
      { id: 'ex-deadlift', name: 'Barbell Deadlift' } as Exercise,
      { id: 'ex-curl', name: 'Bicep Curl' } as Exercise,
    ];

    it('extracts maximum completed weights for Big 3 in a workout session', () => {
      const session: WorkoutSession = {
        id: 's-1',
        userId: 'u-1',
        name: 'Full Body',
        startedAt: new Date(),
        completedAt: new Date(),
        createdAt: new Date(),
        updatedAt: new Date(),
        exercises: [
          {
            id: 'se-1',
            exerciseId: 'ex-bench',
            order: 0,
            sets: [
              { id: 'st-1', setNumber: 1, type: 'warmup', weight: 60, reps: 10, completed: true },
              { id: 'st-2', setNumber: 2, type: 'working', weight: 100, reps: 5, completed: true },
              { id: 'st-3', setNumber: 3, type: 'working', weight: 105, reps: 3, completed: true },
              { id: 'st-4', setNumber: 4, type: 'working', weight: 110, reps: 1, completed: false }, // Not completed!
            ],
          },
          {
            id: 'se-2',
            exerciseId: 'ex-squat',
            order: 1,
            sets: [
              { id: 'st-5', setNumber: 1, type: 'working', weight: 140, reps: 5, completed: true },
            ],
          },
        ],
      };

      const maxes = extractBigThreeMaxesFromSession(session, mockExercises);
      expect(maxes.benchPressMaxKg).toBe(105);
      expect(maxes.squatMaxKg).toBe(140);
      expect(maxes.deadliftMaxKg).toBeUndefined();
    });
  });

  describe('extractBigThreePRsFromHistory', () => {
    const mockExercises: Exercise[] = [
      { id: 'ex-bench', name: 'Barbell Bench Press' } as Exercise,
      { id: 'ex-deadlift', name: 'Deadlift' } as Exercise,
    ];

    it('extracts all-time PRs across multiple sessions', () => {
      const s1: WorkoutSession = {
        id: 's-1',
        userId: 'u-1',
        name: 'Session 1',
        startedAt: new Date('2026-06-01'),
        completedAt: new Date('2026-06-01'),
        createdAt: new Date(),
        updatedAt: new Date(),
        exercises: [
          {
            id: 'se-1',
            exerciseId: 'ex-bench',
            order: 0,
            sets: [{ id: 'st-1', setNumber: 1, type: 'working', weight: 95, completed: true }],
          },
        ],
      };

      const s2: WorkoutSession = {
        id: 's-2',
        userId: 'u-1',
        name: 'Session 2',
        startedAt: new Date('2026-06-05'),
        completedAt: new Date('2026-06-05'),
        createdAt: new Date(),
        updatedAt: new Date(),
        exercises: [
          {
            id: 'se-2',
            exerciseId: 'ex-bench',
            order: 0,
            sets: [{ id: 'st-2', setNumber: 1, type: 'working', weight: 102.5, completed: true }],
          },
          {
            id: 'se-3',
            exerciseId: 'ex-deadlift',
            order: 1,
            sets: [{ id: 'st-3', setNumber: 1, type: 'working', weight: 180, completed: true }],
          },
        ],
      };

      const prs = extractBigThreePRsFromHistory([s1, s2], mockExercises);
      expect(prs.benchPressMaxKg).toBe(102.5);
      expect(prs.deadliftMaxKg).toBe(180);
      expect(prs.squatMaxKg).toBeUndefined();
    });
  });

  describe('calculateSuggestedWorkingSet', () => {
    it('calculates 80% for strength goals', () => {
      const result = calculateSuggestedWorkingSet(100, 'gain_strength');
      expect(result.weight).toBe(80);
      expect(result.reps).toBe(5);
    });

    it('calculates ~72.5% rounded to 2.5kg for muscle building goals', () => {
      const result = calculateSuggestedWorkingSet(100, 'build_muscle');
      expect(result.weight).toBe(72.5);
      expect(result.reps).toBe(8);
    });

    it('enforces a minimum of 20kg barbell', () => {
      const result = calculateSuggestedWorkingSet(15, 'general_fitness');
      expect(result.weight).toBe(20);
    });

    it('returns 0 for zero or undefined 1RM', () => {
      expect(calculateSuggestedWorkingSet(0)).toEqual({ weight: 0, reps: 0 });
    });
  });
});
