import type { ExerciseSet } from '../types';

/** Product analytics count completed work, drop, AMRAP and backoff sets only. */
export function isCompletedWorkingSet(set: ExerciseSet): boolean {
  return set.completed && set.type !== 'warmup' && set.type !== 'failure';
}
