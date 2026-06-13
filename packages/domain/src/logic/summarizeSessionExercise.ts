import { SessionExercise } from '../types';

export interface SessionExerciseSummary {
  completedSetCount: number;
  workingSetCount: number;
  totalVolume: number;
  maxWeight: number;
  averageWeight: number;
}

export function summarizeSessionExercise(sessionExercise: SessionExercise): SessionExerciseSummary {
  let completedSetCount = 0;
  let workingSetCount = 0;
  let totalVolume = 0;
  let maxWeight = 0;
  let totalWeight = 0;
  let weightedSetCount = 0;

  sessionExercise.sets.forEach((set) => {
    if (!set.completed) return;

    completedSetCount++;

    if (set.type === 'warmup') return;

    workingSetCount++;

    if (set.weight !== undefined) {
      maxWeight = Math.max(maxWeight, set.weight);
      totalWeight += set.weight;
      weightedSetCount++;
    }

    if (set.weight !== undefined && set.reps !== undefined) {
      totalVolume += set.weight * set.reps;
    }
  });

  return {
    completedSetCount,
    workingSetCount,
    totalVolume,
    maxWeight,
    averageWeight: weightedSetCount > 0 ? totalWeight / weightedSetCount : 0,
  };
}
