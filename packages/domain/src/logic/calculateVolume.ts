import { WorkoutSession } from '../types';

export function calculateVolume(
  session: WorkoutSession,
  options: { includeWarmups?: boolean } = {},
): number {
  const includeWarmups = options.includeWarmups ?? false;
  let volume = 0;

  session.exercises.forEach((ex) => {
    ex.sets.forEach((set) => {
      if (set.completed && set.weight && set.reps) {
        if (includeWarmups || set.type !== 'warmup') {
          volume += set.weight * set.reps;
        }
      }
    });
  });

  return volume;
}
