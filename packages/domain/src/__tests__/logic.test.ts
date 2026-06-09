import { describe, expect, it } from 'vitest';
import {
  calculateVolume,
  estimateOneRepMax,
  calculateStreak,
  calculateLongestStreak,
  detectPRs,
  getBestE1RMs,
  getBestWeights,
  getExerciseProgressHistory,
  formatDateLocal,
  summarizeWorkout,
  summarizeSessionExercise,
  WorkoutSession,
} from '../index';

const EX_UUID_1 = '33333333-3333-4333-8333-333333333333';

type MockSet = {
  weight?: number;
  reps?: number;
  type?: WorkoutSession['exercises'][number]['sets'][number]['type'];
  completed?: boolean;
};

type MockExercise = {
  exerciseId: string;
  sets: MockSet[];
};

function createMockSession(id: string, startedAt: Date, exercises: MockExercise[]): WorkoutSession {
  return {
    id,
    userId: 'test-user',
    name: 'Test Session',
    startedAt,
    exercises: exercises.map((ex, order) => ({
      id: `${id}-ex-${order}`,
      exerciseId: ex.exerciseId,
      order,
      sets: ex.sets.map((set, setNumber) => ({
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

  it('uses realistic divisors based on exercise name', () => {
    expect(estimateOneRepMax(100, 10, undefined, undefined, 'Barbell Squat')).toBe(
      100 * (1 + 10 / 45),
    );
    expect(estimateOneRepMax(100, 10, undefined, undefined, 'Romanian Deadlift')).toBe(
      100 * (1 + 10 / 45),
    );
    expect(estimateOneRepMax(100, 10, undefined, undefined, 'Barbell Curl')).toBe(
      100 * (1 + 10 / 60),
    );
    expect(estimateOneRepMax(100, 10, undefined, undefined, 'Plank')).toBe(100 * (1 + 10 / 60));
    expect(
      estimateOneRepMax(100, 10, undefined, undefined, 'Barbell Bench Press - Medium Grip'),
    ).toBe(100 * (1 + 10 / 50));
    expect(estimateOneRepMax(100, 10, undefined, undefined, 'Dips - Chest Version')).toBe(
      100 * (1 + 10 / 50),
    );
  });

  it('takes RPE and RIR into account', () => {
    // 10 reps at RPE 8 -> 10 + 2 = 12 effective reps
    expect(estimateOneRepMax(100, 10, 8)).toBe(100 * (1 + 12 / 30));

    // 10 reps at RIR 3 -> 10 + 3 = 13 effective reps
    expect(estimateOneRepMax(100, 10, undefined, 3)).toBe(100 * (1 + 13 / 30));

    // When both are provided, RIR is preferred
    expect(estimateOneRepMax(100, 10, 8, 3)).toBe(100 * (1 + 13 / 30));
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

  it('formats date keys from local calendar parts', () => {
    const date = new Date(2026, 5, 8, 23, 30, 0);

    expect(formatDateLocal(date)).toBe('2026-06-08');
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
        sets: [{ weight: 100, reps: 5, type: 'working' }],
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

describe('analytics helpers', () => {
  it('summarizes a session exercise without counting warmups as working volume', () => {
    const session = createMockSession('s1', new Date(), [
      {
        exerciseId: EX_UUID_1,
        sets: [
          { weight: 60, reps: 10, type: 'warmup', completed: true },
          { weight: 100, reps: 5, type: 'working', completed: true },
          { weight: 110, reps: 3, type: 'working', completed: true },
          { weight: 120, reps: 1, type: 'working', completed: false },
        ],
      },
    ]);

    const summary = summarizeSessionExercise(session.exercises[0]!);

    expect(summary.completedSetCount).toBe(3);
    expect(summary.workingSetCount).toBe(2);
    expect(summary.totalVolume).toBe(830);
    expect(summary.maxWeight).toBe(110);
    expect(summary.averageWeight).toBe(105);
  });

  it('returns warmup-safe best weights and e1RMs', () => {
    const sessions = [
      createMockSession('s1', new Date('2026-06-01T10:00:00'), [
        {
          exerciseId: EX_UUID_1,
          sets: [
            { weight: 150, reps: 1, type: 'warmup' },
            { weight: 100, reps: 5, type: 'working' },
          ],
        },
      ]),
      createMockSession('s2', new Date('2026-06-02T10:00:00'), [
        {
          exerciseId: EX_UUID_1,
          sets: [{ weight: 105, reps: 5, type: 'working' }],
        },
      ]),
    ];

    expect(getBestWeights(sessions)[EX_UUID_1]).toBe(105);
    expect(getBestE1RMs(sessions)[EX_UUID_1]?.weight).toBe(105);
  });

  it('builds chronological exercise progress and marks e1RM PR points', () => {
    const sessions = [
      createMockSession('s1', new Date('2026-06-01T10:00:00'), [
        {
          exerciseId: EX_UUID_1,
          sets: [{ weight: 100, reps: 5, type: 'working' }],
        },
      ]),
      createMockSession('s2', new Date('2026-06-02T10:00:00'), [
        {
          exerciseId: EX_UUID_1,
          sets: [
            { weight: 80, reps: 10, type: 'warmup' },
            { weight: 105, reps: 5, type: 'working' },
          ],
        },
      ]),
    ];

    const points = getExerciseProgressHistory(EX_UUID_1, sessions);

    expect(points).toHaveLength(2);
    expect(points[0]?.volume).toBe(500);
    expect(points[0]?.isPR).toBe(true);
    expect(points[1]?.volume).toBe(525);
    expect(points[1]?.isPR).toBe(true);
  });
});
