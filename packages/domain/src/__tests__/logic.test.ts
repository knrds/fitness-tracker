import { describe, expect, it } from 'vitest';
import {
  calculateVolume,
  estimateOneRepMax,
  calculateStreak,
  calculateLongestStreak,
  detectPRs,
  summarizeWorkout,
  WorkoutSession,
  UUID
} from '../index';

const UUID_1 = '11111111-1111-4111-8111-111111111111';
const UUID_2 = '22222222-2222-4222-8222-222222222222';
const EX_UUID_1 = '33333333-3333-4333-8333-333333333333';
const EX_UUID_2 = '44444444-4444-4444-8444-444444444444';

function createMockSession(id: string, startedAt: Date, exercises: any[]): WorkoutSession {
  return {
    id,
    userId: 'test-user',
    name: 'Test Session',
    startedAt,
    exercises: exercises.map((ex, order) => ({
      id: `${id}-ex-${order}`,
      exerciseId: ex.exerciseId,
      order,
      sets: ex.sets.map((set: any, setNumber: number) => ({
        id: `${id}-ex-${order}-set-${setNumber}`,
        setNumber: setNumber + 1,
        type: set.type || 'working',
        weight: set.weight,
        reps: set.reps,
        completed: set.completed ?? true,
      })),
    })),
    createdAt: new Date(),
    updatedAt: new Date(),
  } as WorkoutSession;
}

describe('estimateOneRepMax', () => {
  it('handles basic values', () => {
    expect(estimateOneRepMax(100, 1)).toBe(100);
    expect(estimateOneRepMax(100, 0)).toBe(0);
    expect(estimateOneRepMax(100, 10)).toBe(100 * (1 + 10 / 30));
  });
});

describe('calculateVolume', () => {
  it('calculates volume and excludes warmups by default', () => {
    const session = createMockSession('s1', new Date(), [
      {
        exerciseId: EX_UUID_1,
        sets: [
          { weight: 100, reps: 5, type: 'working' },
          { weight: 80, reps: 10, type: 'warmup' },
          { weight: 100, reps: 5, type: 'working', completed: false },
        ],
      },
    ]);
    expect(calculateVolume(session)).toBe(500); // 100 * 5 only
    expect(calculateVolume(session, { includeWarmups: true })).toBe(1300); // 500 + 80 * 10
  });
});

describe('calculateStreak & calculateLongestStreak', () => {
  const dayMs = 24 * 60 * 60 * 1000;

  it('handles empty session list', () => {
    expect(calculateStreak([])).toBe(0);
    expect(calculateLongestStreak([])).toBe(0);
  });

  it('calculates streaks timezone safely', () => {
    const today = new Date();
    const yesterday = new Date(today.getTime() - dayMs);
    const dayBeforeYesterday = new Date(today.getTime() - 2 * dayMs);

    const sToday = createMockSession('s1', today, []);
    const sYesterday = createMockSession('s2', yesterday, []);
    const sDBY = createMockSession('s3', dayBeforeYesterday, []);

    // Consecutive 3 days (today, yesterday, dayBeforeYesterday)
    expect(calculateStreak([sToday, sYesterday, sDBY])).toBe(3);
    expect(calculateLongestStreak([sToday, sYesterday, sDBY])).toBe(3);

    // Broken streak
    const threeDaysAgo = new Date(today.getTime() - 3 * dayMs);
    const s3DA = createMockSession('s4', threeDaysAgo, []);
    // Gap yesterday, session today and 2/3 days ago
    expect(calculateStreak([sToday, sDBY, s3DA])).toBe(1); // Today only
    expect(calculateLongestStreak([sToday, sDBY, s3DA])).toBe(2); // 2 days ago and 3 days ago form streak of 2
  });
});

describe('detectPRs', () => {
  it('detects a new PR based on e1RM', () => {
    const pastSession = createMockSession('s1', new Date(Date.now() - 86400000), [
      {
        exerciseId: EX_UUID_1,
        sets: [
          { weight: 100, reps: 5, type: 'working' }, // e1RM = 100 * (1 + 5/30) = 116.67
        ],
      },
    ]);

    const currentSession = createMockSession('s2', new Date(), [
      {
        exerciseId: EX_UUID_1,
        sets: [
          { weight: 110, reps: 5, type: 'working' }, // e1RM = 110 * (1 + 5/30) = 128.33 (NEW PR)
        ],
      },
    ]);

    const prs = detectPRs(currentSession, [pastSession]);
    expect(prs).toHaveLength(1);
    expect(prs[0]?.exerciseId).toBe(EX_UUID_1);
    expect(prs[0]?.newE1RM).toBeCloseTo(128.33, 2);
  });

  it('excludes warmups from PR detection', () => {
    const pastSession = createMockSession('s1', new Date(Date.now() - 86400000), [
      {
        exerciseId: EX_UUID_1,
        sets: [
          { weight: 100, reps: 5, type: 'working' },
        ],
      },
    ]);

    const currentSession = createMockSession('s2', new Date(), [
      {
        exerciseId: EX_UUID_1,
        sets: [
          { weight: 150, reps: 5, type: 'warmup' }, // Heavy warmup
        ],
      },
    ]);

    const prs = detectPRs(currentSession, [pastSession]);
    expect(prs).toHaveLength(0);
  });
});

describe('summarizeWorkout', () => {
  it('correctly summarizes a session', () => {
    const session = createMockSession('s1', new Date(), [
      {
        exerciseId: EX_UUID_1,
        sets: [
          { weight: 100, reps: 5, type: 'working', completed: true },
          { weight: 100, reps: 5, type: 'working', completed: false },
        ],
      },
    ]);
    session.durationSeconds = 1200;

    const summary = summarizeWorkout(session);
    expect(summary.durationSeconds).toBe(1200);
    expect(summary.setCount).toBe(1);
    expect(summary.totalVolume).toBe(500);
  });
});
