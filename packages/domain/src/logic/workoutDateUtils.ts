import { WorkoutSession } from '../types';
import { formatDateLocal } from './calculateStreak';

/**
 * Normalizes a date or date string to local YYYY-MM-DD format.
 */
export function toLocalDateKey(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  return formatDateLocal(d);
}

/**
 * Returns all workout sessions that took place on the given local calendar date.
 * Avoids any UTC / timezone off-by-one shifts.
 */
export function getWorkoutsForDate(sessions: WorkoutSession[], date: Date | string): WorkoutSession[] {
  const targetKey = toLocalDateKey(date);
  return sessions.filter((s) => toLocalDateKey(s.startedAt) === targetKey);
}

/**
 * Returns true if at least one session took place on the given local calendar date.
 */
export function hasWorkoutOnDate(sessions: WorkoutSession[], date: Date | string): boolean {
  const targetKey = toLocalDateKey(date);
  return sessions.some((s) => toLocalDateKey(s.startedAt) === targetKey);
}
