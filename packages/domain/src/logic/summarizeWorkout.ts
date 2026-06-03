import { WorkoutSession } from '../types';
import { calculateVolume } from './calculateVolume';

export interface WorkoutSummary {
  durationSeconds: number;
  totalVolume: number;
  setCount: number;
}

export function summarizeWorkout(session: WorkoutSession): WorkoutSummary {
  let setCount = 0;
  session.exercises.forEach((ex) => {
    ex.sets.forEach((set) => {
      if (set.completed) {
        setCount++;
      }
    });
  });

  return {
    durationSeconds: session.durationSeconds || 0,
    totalVolume: calculateVolume(session, { includeWarmups: false }),
    setCount,
  };
}
