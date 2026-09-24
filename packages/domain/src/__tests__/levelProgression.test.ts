import { describe, it, expect } from 'vitest';
import {
  getXpRequiredForLevel,
  getDeltaXpForLevel,
  calculateLevelFromXp,
  getLevelProgress,
  calculateSessionXp,
  estimateWorkoutsToLevel,
  REPRESENTATIVE_WORKOUT_XP,
} from '../logic/levelProgression';
import type { WorkoutSession } from '../types';

describe('levelProgression domain logic', () => {
  it('calibrates the reference workout without migrating existing XP or rewarding idle time', () => {
    const date = new Date('2026-09-24T10:00:00Z');
    const session: WorkoutSession = {
      id: 'reference', userId: 'u', name: 'Reference', startedAt: date,
      createdAt: date, updatedAt: date, durationSeconds: 7200,
      exercises: [{ id: 'e', exerciseId: 'squat', order: 0,
        sets: Array.from({ length: 16 }, (_, i) => ({
          id: `s-${i}`, setNumber: i + 1, weight: 62.5, reps: 10,
          completed: true, type: 'working' as const,
        })),
      }],
    };
    expect(calculateSessionXp(session).totalSessionXp).toBe(1314);
    expect(REPRESENTATIVE_WORKOUT_XP).toBe(1314);
    expect(calculateSessionXp({ ...session, durationSeconds: 14400 })).toEqual(calculateSessionXp(session));
    expect(estimateWorkoutsToLevel(0, 50)).toBe(1000);
    expect(estimateWorkoutsToLevel(0, 30)).toBeGreaterThanOrEqual(200);
    expect(estimateWorkoutsToLevel(0, 30)).toBeLessThanOrEqual(300);
    expect(estimateWorkoutsToLevel(0, 5)).toBe(3);
    expect(estimateWorkoutsToLevel(getXpRequiredForLevel(50), 50)).toBe(0);
    expect(calculateLevelFromXp(600)).toBe(2);
    expect(estimateWorkoutsToLevel(0, 50, Array(5).fill(session))).toBe(1000);
  });
  describe('getXpRequiredForLevel & getDeltaXpForLevel', () => {
    it('returns 0 for Level 1 or below', () => {
      expect(getXpRequiredForLevel(1)).toBe(0);
      expect(getXpRequiredForLevel(0)).toBe(0);
      expect(getXpRequiredForLevel(-5)).toBe(0);
      expect(getDeltaXpForLevel(1)).toBe(0);
    });

    it('matches exact three-phase curve thresholds', () => {
      expect(getXpRequiredForLevel(2)).toBe(410);
      expect(getDeltaXpForLevel(2)).toBe(410);

      expect(getXpRequiredForLevel(3)).toBe(980);
      expect(getDeltaXpForLevel(3)).toBe(570);

      expect(getXpRequiredForLevel(4)).toBe(1770);
      expect(getDeltaXpForLevel(4)).toBe(790);

      expect(getXpRequiredForLevel(5)).toBe(2840);
      expect(getDeltaXpForLevel(5)).toBe(1070);

      expect(getXpRequiredForLevel(6)).toBe(4250);
      expect(getDeltaXpForLevel(6)).toBe(1410);

      expect(getXpRequiredForLevel(10)).toBe(14490);
      expect(getDeltaXpForLevel(10)).toBe(3370);

      expect(getXpRequiredForLevel(20)).toBe(93290);
      expect(getDeltaXpForLevel(20)).toBe(12470);

      expect(getXpRequiredForLevel(50)).toBe(1313690);
    });

    it('is strictly faster in early game than legacy fefed5a curve', () => {
      // Legacy fefed5a: L2=1000, L3=2400, L4=4200, L5=6400
      expect(getXpRequiredForLevel(2)).toBeLessThan(1000);
      expect(getXpRequiredForLevel(3)).toBeLessThan(2400);
      expect(getXpRequiredForLevel(4)).toBeLessThan(4200);
      expect(getXpRequiredForLevel(5)).toBeLessThan(6400);
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
      expect(calculateLevelFromXp(409)).toBe(1);
    });

    it('accurately resolves exact level boundaries', () => {
      expect(calculateLevelFromXp(410)).toBe(2);
      expect(calculateLevelFromXp(979)).toBe(2);
      expect(calculateLevelFromXp(980)).toBe(3);
      expect(calculateLevelFromXp(1769)).toBe(3);
      expect(calculateLevelFromXp(1770)).toBe(4);
      expect(calculateLevelFromXp(2839)).toBe(4);
      expect(calculateLevelFromXp(2840)).toBe(5);
      expect(calculateLevelFromXp(4250)).toBe(6);
      expect(calculateLevelFromXp(14490)).toBe(10);
      expect(calculateLevelFromXp(93290)).toBe(20);
      expect(calculateLevelFromXp(1313690)).toBe(50);
    });

    it('is an exact left-inverse of getXpRequiredForLevel', () => {
      for (let lvl = 1; lvl <= 50; lvl++) {
        const xp = getXpRequiredForLevel(lvl);
        expect(calculateLevelFromXp(xp)).toBe(lvl);
      }
    });
  });

  describe('getLevelProgress', () => {
    it('returns correct structure at level 1 with 200 XP', () => {
      const progress = getLevelProgress(200);
      expect(progress.level).toBe(1);
      expect(progress.currentLevelBaseXp).toBe(0);
      expect(progress.nextLevelBaseXp).toBe(410);
      expect(progress.xpInCurrentLevel).toBe(200);
      expect(progress.xpRequiredForNextLevel).toBe(410);
      expect(progress.remainingXp).toBe(210);
      expect(progress.progressPercent).toBeCloseTo((200 / 410) * 100, 2);
    });

    it('returns correct structure at level 2 with 600 XP', () => {
      const progress = getLevelProgress(600);
      expect(progress.level).toBe(2);
      expect(progress.currentLevelBaseXp).toBe(410);
      expect(progress.nextLevelBaseXp).toBe(980);
      expect(progress.xpInCurrentLevel).toBe(190);
      expect(progress.xpRequiredForNextLevel).toBe(570);
      expect(progress.remainingXp).toBe(380);
      expect(progress.progressPercent).toBeCloseTo((190 / 570) * 100, 2);
    });
  });

  describe('calculateSessionXp', () => {
    const createMassiveSession = (): WorkoutSession => ({
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
    });
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
      expect(xp.baseXp).toBe(450);
      expect(xp.setBonus).toBe(162);
      expect(xp.volumeBonus).toBe(351);
      expect(xp.prBonus).toBe(225);
      expect(xp.totalSessionXp).toBe(1188);

      // Early levels arrive quickly under the current award policy.
      expect(calculateLevelFromXp(xp.totalSessionXp)).toBeGreaterThan(1);
    });

    it('caps extreme workout awards while allowing fast early progression', () => {
      const massiveSession = createMassiveSession();

      // 50 sets completed! 100,000 kg volume! 10 PRs claimed!
      const xp = calculateSessionXp(massiveSession, 10);
      expect(xp.baseXp).toBe(450);
      expect(xp.setBonus).toBe(270); // Capped at 30
      expect(xp.volumeBonus).toBe(990); // Capped at 110
      expect(xp.prBonus).toBe(675); // Capped at 75 (max 3 PRs)
      expect(xp.totalSessionXp).toBe(2385); // Base cap 265, scaled by 9.

      // The unchanged curve yields level 4 for this capped award.
      expect(calculateLevelFromXp(xp.totalSessionXp)).toBeGreaterThan(1);
    });

    it('simulates the 5 archetype workouts cleanly and deterministically', () => {
      // 1. Small workout (2 exercises, 5 sets, 1500 kg volume, 0 PRs)
      const smallSession: WorkoutSession = {
        id: 'sess-small',
        userId: 'u-1',
        name: 'Quick Arms',
        startedAt: new Date(),
        exercises: [
          {
            id: 'e-1',
            exerciseId: 'curl',
            order: 0,
            sets: [
              { id: 's-1', setNumber: 1, reps: 10, weight: 30, completed: true, type: 'working' },
              { id: 's-2', setNumber: 2, reps: 10, weight: 30, completed: true, type: 'working' },
              { id: 's-3', setNumber: 3, reps: 10, weight: 30, completed: true, type: 'working' },
            ],
          },
          {
            id: 'e-2',
            exerciseId: 'tricep',
            order: 1,
            sets: [
              { id: 's-4', setNumber: 1, reps: 10, weight: 30, completed: true, type: 'working' },
              { id: 's-5', setNumber: 2, reps: 10, weight: 30, completed: true, type: 'working' },
            ],
          },
        ],
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      const smallXp = calculateSessionXp(smallSession, 0);
      expect(smallXp.totalSessionXp).toBe(675); // 50 base + 10 sets + 15 vol = 75
      expect(calculateLevelFromXp(smallXp.totalSessionXp)).toBe(2);

      // 2. Normal workout (3 exercises, 10 sets, 4000 kg volume, 1 PR)
      const normalSession: WorkoutSession = {
        id: 'sess-norm',
        userId: 'u-1',
        name: 'Push Day',
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
              { id: 's-4', setNumber: 4, reps: 10, weight: 80, completed: true, type: 'working' },
            ],
          },
          {
            id: 'e-2',
            exerciseId: 'ohp',
            order: 1,
            sets: [
              { id: 's-5', setNumber: 1, reps: 8, weight: 20, completed: true, type: 'working' },
              { id: 's-6', setNumber: 2, reps: 8, weight: 20, completed: true, type: 'working' },
              { id: 's-7', setNumber: 3, reps: 8, weight: 20, completed: true, type: 'working' },
            ],
          },
          {
            id: 'e-3',
            exerciseId: 'lateral',
            order: 2,
            sets: [
              { id: 's-8', setNumber: 1, reps: 12, weight: 9, completed: true, type: 'working' },
              { id: 's-9', setNumber: 2, reps: 12, weight: 9, completed: true, type: 'working' },
              { id: 's-10', setNumber: 3, reps: 12, weight: 9, completed: true, type: 'working' },
            ],
          },
        ],
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      const normalXp = calculateSessionXp(normalSession, 1);
      // 10 sets (20 XP) + 3200 + 480 + 324 = 4004 kg (40 XP) + 50 base + 25 PR = 135 XP
      expect(normalXp.totalSessionXp).toBe(1215);
      expect(calculateLevelFromXp(normalXp.totalSessionXp)).toBe(3);

      // Level 1 user with 300 XP completes normal workout:
      // 300 + 135 = 435 XP -> advances to Level 2 (435 >= 410 and < 980)
      expect(calculateLevelFromXp(300 + normalXp.totalSessionXp)).toBe(3);
      // Does NOT jump to Level 3
      expect(calculateLevelFromXp(300 + normalXp.totalSessionXp)).toBeLessThan(4);

      // 3. Large workout (5 exercises, 18 sets, 9000 kg volume, 1 PR)
      const largeSession: WorkoutSession = {
        id: 'sess-large',
        userId: 'u-1',
        name: 'Heavy Leg Day',
        startedAt: new Date(),
        exercises: Array.from({ length: 5 }, (_, i) => ({
          id: `e-${i}`,
          exerciseId: `leg-ex-${i}`,
          order: i,
          sets: Array.from({ length: i === 0 ? 6 : 3 }, (_, j) => ({
            id: `s-${i}-${j}`,
            setNumber: j + 1,
            reps: 10,
            weight: 50, // 18 sets * 500 kg = 9000 kg
            completed: true,
            type: 'working' as const,
          })),
        })),
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      const largeXp = calculateSessionXp(largeSession, 1);
      // Base: 50, Sets: 10*2 + 8*1 = 28, Vol: 50 + Math.floor(4000/250) = 66, PR: 25 -> 169 XP
      expect(largeXp.totalSessionXp).toBe(1521);
      expect(calculateLevelFromXp(largeXp.totalSessionXp)).toBe(3);

      // 4. PR-heavy workout (4 exercises, 12 sets, 6000 kg volume, 3 PRs)
      const prHeavySession: WorkoutSession = {
        id: 'sess-pr-heavy',
        userId: 'u-1',
        name: 'Record Breaker',
        startedAt: new Date(),
        exercises: Array.from({ length: 4 }, (_, i) => ({
          id: `e-${i}`,
          exerciseId: `compound-${i}`,
          order: i,
          sets: Array.from({ length: 3 }, (_, j) => ({
            id: `s-${i}-${j}`,
            setNumber: j + 1,
            reps: 10,
            weight: 50, // 12 sets * 500 kg = 6000 kg
            completed: true,
            type: 'working' as const,
          })),
        })),
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      const prHeavyXp = calculateSessionXp(prHeavySession, 3);
      // Base: 50, Sets: 10*2 + 2*1 = 22, Vol: 50 + Math.floor(1000/250) = 54, PR: 3*25 = 75 -> 201 XP
      expect(prHeavyXp.totalSessionXp).toBe(1809);
      expect(calculateLevelFromXp(prHeavyXp.totalSessionXp)).toBe(4);

      // 5. Max-Cap workout (50 sets, 100k kg volume, 10 PRs)
      const maxCapXp = calculateSessionXp(createMassiveSession(), 10);
      expect(maxCapXp.totalSessionXp).toBe(2385);
      expect(calculateLevelFromXp(maxCapXp.totalSessionXp)).toBe(4);
    });

    it('confirms templates and plans generate zero session XP', () => {
      // Empty session (such as when rendering/editing template definitions)
      const templateMockSession: WorkoutSession = {
        id: 'tmpl-sess-0',
        userId: 'u-1',
        name: 'Template Placeholder',
        startedAt: new Date(),
        exercises: [],
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      const tmplXp = calculateSessionXp(templateMockSession, 0);
      expect(tmplXp.totalSessionXp).toBe(0);
      expect(tmplXp.baseXp).toBe(0);
      expect(tmplXp.volumeBonus).toBe(0);
      expect(tmplXp.setBonus).toBe(0);
      expect(tmplXp.prBonus).toBe(0);
    });

    it('demonstrates that mid and late game progression scales exponentially in effort compared to early game', () => {
      // Early game (L1 -> L5): 0 to 2,840 XP (Delta: 2,840 XP)
      const earlyGameXp = getXpRequiredForLevel(5) - getXpRequiredForLevel(1);
      // Late game (L16 -> L20): 50,250 to 93,290 XP (Delta: 43,040 XP)
      const lateGameXp = getXpRequiredForLevel(20) - getXpRequiredForLevel(16);

      expect(earlyGameXp).toBe(2840);
      expect(lateGameXp).toBe(43040);
      // Late game takes over 15x more XP for the same 4-level span!
      expect(lateGameXp).toBeGreaterThan(earlyGameXp * 15);
    });
  });
});
