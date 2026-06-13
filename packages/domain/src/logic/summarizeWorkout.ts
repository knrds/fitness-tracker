import { WorkoutSession } from '../types';
import { calculateVolume } from './calculateVolume';
import { summarizeSessionExercise } from './summarizeSessionExercise';

export interface WorkoutSummary {
  durationSeconds: number;
  totalVolume: number;
  setCount: number;
}

export function summarizeWorkout(session: WorkoutSession): WorkoutSummary {
  const setCount = session.exercises.reduce(
    (sum, exercise) => sum + summarizeSessionExercise(exercise).completedSetCount,
    0,
  );

  return {
    durationSeconds: session.durationSeconds || 0,
    totalVolume: calculateVolume(session, { includeWarmups: false }),
    setCount,
  };
}
