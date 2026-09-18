import { describe, it, expect } from 'vitest';
import { getWorkoutsForDate, hasWorkoutOnDate, toLocalDateKey } from '../logic/workoutDateUtils';
import { WorkoutSession } from '../types';

describe('workoutDateUtils', () => {
  const createMockSession = (id: string, startedAt: Date): WorkoutSession => ({
    id,
    userId: 'user-1',
    name: `Session ${id}`,
    startedAt,
    exercises: [],
    createdAt: startedAt,
    updatedAt: startedAt,
  });

  const session1 = createMockSession('1', new Date('2026-09-18T10:00:00'));
  const session2 = createMockSession('2', new Date('2026-09-18T18:30:00'));
  // Late evening local session (23:45)
  const session3 = createMockSession('3', new Date('2026-09-18T23:45:00'));
  const sessionNextDay = createMockSession('4', new Date('2026-09-19T08:00:00'));

  const sessions = [session1, session2, session3, sessionNextDay];

  it('correctly normalizes local date keys', () => {
    expect(toLocalDateKey(new Date('2026-09-18T14:20:00'))).toBe('2026-09-18');
  });

  it('retrieves all workouts for a specific date (multiple workouts on same day)', () => {
    const workoutsSept18 = getWorkoutsForDate(sessions, new Date('2026-09-18T12:00:00'));
    expect(workoutsSept18).toHaveLength(3);
    expect(workoutsSept18.map((s) => s.id)).toEqual(['1', '2', '3']);
  });

  it('correctly handles empty day (0 workouts)', () => {
    const workoutsSept17 = getWorkoutsForDate(sessions, new Date('2026-09-17T12:00:00'));
    expect(workoutsSept17).toHaveLength(0);
    expect(hasWorkoutOnDate(sessions, new Date('2026-09-17T12:00:00'))).toBe(false);
  });

  it('correctly handles day with exactly 1 workout', () => {
    const workoutsSept19 = getWorkoutsForDate(sessions, new Date('2026-09-19T12:00:00'));
    expect(workoutsSept19).toHaveLength(1);
    expect(workoutsSept19[0]?.id).toBe('4');
    expect(hasWorkoutOnDate(sessions, new Date('2026-09-19T12:00:00'))).toBe(true);
  });

  it('preserves late evening sessions without off-by-one errors into next day', () => {
    const dateSept18 = new Date('2026-09-18T00:00:00');
    const workouts = getWorkoutsForDate(sessions, dateSept18);
    expect(workouts.some((s) => s.id === '3')).toBe(true);
  });
});
