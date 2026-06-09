import { WorkoutSession, UUID } from '../types';
import { EXERCISES } from '../data/exercises';
import { estimateOneRepMax } from './estimateOneRepMax';

export interface BestE1RM {
  e1RM: number;
  weight: number;
  reps: number;
  sessionId: UUID;
  setId: UUID;
  achievedAt: Date;
}

function resolveExerciseName(exerciseId: UUID, exerciseNames?: Record<UUID, string>): string | undefined {
  return exerciseNames?.[exerciseId] ?? EXERCISES.find((exercise) => exercise.id === exerciseId)?.name;
}

export function getBestE1RMs(
  sessions: WorkoutSession[],
  exerciseNames?: Record<UUID, string>,
): Record<UUID, BestE1RM> {
  const bestE1RMs: Record<UUID, BestE1RM> = {};

  sessions.forEach((session) => {
    session.exercises.forEach((exercise) => {
      const exerciseName = resolveExerciseName(exercise.exerciseId, exerciseNames);

      exercise.sets.forEach((set) => {
        if (
          !set.completed ||
          set.type === 'warmup' ||
          set.weight === undefined ||
          set.reps === undefined
        ) {
          return;
        }

        const e1RM = estimateOneRepMax(set.weight, set.reps, set.rpe, set.rir, exerciseName);
        const currentBest = bestE1RMs[exercise.exerciseId];

        if (!currentBest || e1RM > currentBest.e1RM) {
          bestE1RMs[exercise.exerciseId] = {
            e1RM,
            weight: set.weight,
            reps: set.reps,
            sessionId: session.id,
            setId: set.id,
            achievedAt: session.completedAt ?? session.startedAt,
          };
        }
      });
    });
  });

  return bestE1RMs;
}
