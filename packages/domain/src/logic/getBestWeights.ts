import { WorkoutSession, UUID } from '../types';

export function getBestWeights(sessions: WorkoutSession[]): Record<UUID, number> {
  const bestWeights: Record<UUID, number> = {};

  sessions.forEach((session) => {
    session.exercises.forEach((exercise) => {
      exercise.sets.forEach((set) => {
        if (!set.completed || set.type === 'warmup' || set.weight === undefined) return;

        if (bestWeights[exercise.exerciseId] === undefined || set.weight > bestWeights[exercise.exerciseId]!) {
          bestWeights[exercise.exerciseId] = set.weight;
        }
      });
    });
  });

  return bestWeights;
}
