import { isCompletedWorkingSet } from './workingSets';
import { WorkoutSession } from '../types';
import { calculateVolume } from './calculateVolume';

export interface WorkoutSummary {
  durationSeconds: number;
  totalVolume: number;
  setCount: number;
}

export function summarizeWorkout(session: WorkoutSession): WorkoutSummary {
  const setCount = session.exercises.reduce(
    (sum, exercise) => sum + exercise.sets.filter(isCompletedWorkingSet).length,
    0,
  );

  return {
    durationSeconds: session.durationSeconds || 0,
    totalVolume: calculateVolume(session, { includeWarmups: false }),
    setCount,
  };
}
