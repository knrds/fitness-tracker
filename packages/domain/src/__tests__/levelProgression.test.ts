import { describe, it, expect } from 'vitest';
import {
  getXpRequiredForLevel,
  getDeltaXpForLevel,
  calculateLevelFromXp,
  getLevelProgress,
  calculateSessionXp,
} from '../logic/levelProgression';
import type { WorkoutSession } from '../types';

describe('levelProgression domain logic', () => {
  describe('getXpRequiredForLevel & getDeltaXpForLevel', () => {
    it('returns 0 for Level 1 or below', () => {
      expect(getXpRequiredForLevel(1)).toBe(0);
      expect(getXpRequiredForLevel(0)).toBe(0);
      expect(getXpRequiredForLevel(-5)).toBe(0);
      expect(getDeltaXpForLevel(1)).toBe(0);
    });

    it('matches exact quadratic curve thresholds', () => {
      expect(getXpRequiredForLevel(2)).toBe(1000);
      expect(getDeltaXpForLevel(2)).toBe(1000);

      expect(getXpRequiredForLevel(3)).toBe(2400);
      expect(getDeltaXpForLevel(3)).toBe(1400);

      expect(getXpRequiredForLevel(4)).toBe(4200);
      expect(getDeltaXpForLevel(4)).toBe(1800);

      expect(getXpRequiredForLevel(5)).toBe(6400);
      expect(getDeltaXpForLevel(5)).toBe(2200);

      expect(getXpRequiredForLevel(6)).toBe(9000);
      expect(getDeltaXpForLevel(6)).toBe(2600);

      expect(getXpRequiredForLevel(10)).toBe(23400);
      expect(getXpRequiredForLevel(20)).toBe(87400);
      expect(getXpRequiredForLevel(50)).toBe(519400);
    });

    it('ensures monotonic progression and increasing delta up to level 50', () => {
      for (let lvl = 2; lvl <= 50; lvl++) {
        expect(getXpRequiredForLevel(lvl)).toBeGreaterThan(getXpRequiredForLevel(lvl - 1));
        if (lvl > 2) {
          expect(getDeltaXpForLevel(lvl)).toBeGreaterThan(getDeltaXpForLevel(lvl - 1));
        }
      }
    });
  });

  describe('calculateLevelFromXp', () => {
    it('handles boundary and negative values safely', () => {
      expect(calculateLevelFromXp(0)).toBe(1);
      expect(calculateLevelFromXp(-100)).toBe(1);
      expect(calculateLevelFromXp(999)).toBe(1);
    });

    it('accurately resolves exact level boundaries', () => {
      expect(calculateLevelFromXp(1000)).toBe(2);
      expect(calculateLevelFromXp(2399)).toBe(2);
      expect(calculateLevelFromXp(2400)).toBe(3);
      expect(calculateLevelFromXp(4199)).toBe(3);
      expect(calculateLevelFromXp(4200)).toBe(4);
      expect(calculateLevelFromXp(6399)).toBe(4);
      expect(calculateLevelFromXp(6400)).toBe(5);
      expect(calculateLevelFromXp(9000)).toBe(6);
      expect(calculateLevelFromXp(87400)).toBe(20);
      expect(calculateLevelFromXp(519400)).toBe(50);
    });

    it('is an exact left-inverse of getXpRequiredForLevel', () => {
      for (let lvl = 1; lvl <= 50; lvl++) {
        const xp = getXpRequiredForLevel(lvl);
        expect(calculateLevelFromXp(xp)).toBe(lvl);
      }
    });
  });

  describe('getLevelProgress', () => {
    it('returns correct structure at level 1 with 350 XP', () => {
      const progress = getLevelProgress(350);
      expect(progress.level).toBe(1);
      expect(progress.currentLevelBaseXp).toBe(0);
      expect(progress.nextLevelBaseXp).toBe(1000);
      expect(progress.xpInCurrentLevel).toBe(350);
      expect(progress.xpRequiredForNextLevel).toBe(1000);
      expect(progress.remainingXp).toBe(650);
      expect(progress.progressPercent).toBe(35);
    });

    it('returns correct structure at level 2 with 1700 XP', () => {
      const progress = getLevelProgress(1700);
      expect(progress.level).toBe(2);
      expect(progress.currentLevelBaseXp).toBe(1000);
      expect(progress.nextLevelBaseXp).toBe(2400);
      expect(progress.xpInCurrentLevel).toBe(700);
      expect(progress.xpRequiredForNextLevel).toBe(1400);
      expect(progress.remainingXp).toBe(700);
      expect(progress.progressPercent).toBe(50);
    });
  });

  describe('calculateSessionXp', () => {
    it('returns 0 XP for empty or zero-set workouts', () => {
      const emptySession: WorkoutSession = {
        id: 'sess-1',
        userId: 'u-1',
        name: 'Empty Workout',
        exercises: [],
        startedAt: new Date(),
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      const xp = calculateSessionXp(emptySession, 0);
      expect(xp.totalSessionXp).toBe(0);
      expect(xp.baseXp).toBe(0);
    });

    it('awards base XP and modest set/volume bonus for typical workout', () => {
      const normalSession: WorkoutSession = {
        id: 'sess-2',
        userId: 'u-1',
        name: 'Push Workout',
        startedAt: new Date(),
        exercises: [
          {
            id: 'e-1',
            exerciseId: 'bench',
            order: 0,
            sets: [
              { id: 's-1', setNumber: 1, reps: 10, weight: 80, completed: true, type: 'working' },
              { id: 's-2', setNumber: 2, reps: 10, weight: 80, completed: true, type: 'working' },
              { id: 's-3', setNumber: 3, reps: 10, weight: 80, completed: true, type: 'working' },
            ],
          },
          {
            id: 'e-2',
            exerciseId: 'shoulder_press',
            order: 1,
            sets: [
              { id: 's-4', setNumber: 1, reps: 10, weight: 20, completed: true, type: 'working' },
              { id: 's-5', setNumber: 2, reps: 10, weight: 20, completed: true, type: 'working' },
              { id: 's-6', setNumber: 3, reps: 10, weight: 20, completed: true, type: 'working' },
            ],
          },
          {
            id: 'e-3',
            exerciseId: 'triceps_pushdown',
            order: 2,
            sets: [
              { id: 's-7', setNumber: 1, reps: 12, weight: 25, completed: true, type: 'working' },
              { id: 's-8', setNumber: 2, reps: 12, weight: 25, completed: true, type: 'working' },
              { id: 's-9', setNumber: 3, reps: 12, weight: 25, completed: true, type: 'working' },
            ],
          },
        ],
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      // 9 sets: set bonus = 9 * 2 = 18 XP
      // Volume = 2400 + 600 + 900 = 3900 kg -> 39 XP volume bonus
      // Base XP = 50 XP
      // PR bonus = 1 PR * 25 = 25 XP
      // Total = 50 + 18 + 39 + 25 = 132 XP
      const xp = calculateSessionXp(normalSession, 1);
      expect(xp.baseXp).toBe(50);
      expect(xp.setBonus).toBe(18);
      expect(xp.volumeBonus).toBe(39);
      expect(xp.prBonus).toBe(25);
      expect(xp.totalSessionXp).toBe(132);

      // Normal workout does NOT level up user from level 1 (132 < 1000)
      expect(calculateLevelFromXp(xp.totalSessionXp)).toBe(1);
    });

    it('caps extreme workouts so no single workout causes multi-level jumps', () => {
      const massiveSession: WorkoutSession = {
        id: 'sess-huge',
        userId: 'u-1',
        name: 'Extreme Volume Workout',
        startedAt: new Date(),
        exercises: Array.from({ length: 10 }, (_, i) => ({
          id: `ex-${i}`,
          exerciseId: `heavy-compound-${i}`,
          order: i,
          sets: Array.from({ length: 5 }, (_, j) => ({
            id: `s-${i}-${j}`,
            setNumber: j + 1,
            reps: 10,
            weight: 200,
            completed: true,
            type: 'working' as const,
          })),
        })),
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      // 50 sets completed! 100,000 kg volume! 10 PRs claimed!
      const xp = calculateSessionXp(massiveSession, 10);
      expect(xp.baseXp).toBe(50);
      expect(xp.setBonus).toBe(30); // Capped at 30
      expect(xp.volumeBonus).toBe(110); // Capped at 110
      expect(xp.prBonus).toBe(75); // Capped at 75 (max 3 PRs)
      expect(xp.totalSessionXp).toBe(265); // Strictly capped at 265 XP!

      // Even this extreme workout CANNOT jump past Level 1 (265 < 1000 XP)
      expect(calculateLevelFromXp(xp.totalSessionXp)).toBe(1);
    });
  });
});
