import { afterEach, describe, expect, it, vi } from 'vitest';
import { calculateStreak } from '../logic/calculateStreak';
import { WorkoutSession } from '../types';

afterEach(() => {
  vi.unstubAllEnvs();
  vi.useRealTimers();
});

describe('calendar streaks', () => {
  it.each(['America/Los_Angeles', 'Europe/Berlin', 'UTC'])('counts today in %s', (timezone) => {
    vi.stubEnv('TZ', timezone);
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2026, 8, 10, 18));
    const session: WorkoutSession = {
      id: 'one',
      userId: 'local',
      name: 'Workout',
      exercises: [],
      startedAt: new Date(2026, 8, 10, 10),
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    expect(calculateStreak([session])).toBe(1);
  });
  it('counts consecutive calendar days across daylight saving', () => {
    vi.stubEnv('TZ', 'Europe/Berlin');
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2026, 2, 30, 10));
    const sessions = [28, 29, 30].map(
      (day): WorkoutSession => ({
        id: String(day),
        userId: 'local',
        name: 'Workout',
        exercises: [],
        startedAt: new Date(2026, 2, day, 9),
        createdAt: new Date(),
        updatedAt: new Date(),
      }),
    );
    expect(calculateStreak(sessions)).toBe(3);
  });
});
