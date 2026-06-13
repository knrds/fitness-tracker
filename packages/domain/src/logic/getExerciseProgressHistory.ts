import { WorkoutSession, UUID } from '../types';
import { EXERCISES } from '../data/exercises';
import { estimateOneRepMax } from './estimateOneRepMax';
import { summarizeSessionExercise } from './summarizeSessionExercise';

export interface ExerciseProgressPoint {
  date: Date;
  volume: number;
  maxWeight: number;
  maxE1RM: number;
  isPR: boolean;
}

export function getExerciseProgressHistory(
  exerciseId: UUID,
  sessions: WorkoutSession[],
  exerciseName = EXERCISES.find((exercise) => exercise.id === exerciseId)?.name,
): ExerciseProgressPoint[] {
  const points: ExerciseProgressPoint[] = [];
  const sortedSessions = [...sessions].sort(
    (a, b) => a.startedAt.getTime() - b.startedAt.getTime(),
  );
  let historicalMaxWeight = 0;

  sortedSessions.forEach((session) => {
    const exercise = session.exercises.find((entry) => entry.exerciseId === exerciseId);
    if (!exercise) return;

    const volume = summarizeSessionExercise(exercise).totalVolume;
    let sessionMaxE1RM = 0;
    let sessionMaxWeight = 0;

    exercise.sets.forEach((set) => {
      if (!set.completed || set.type === 'warmup' || set.weight === undefined) {
        return;
      }

      sessionMaxWeight = Math.max(sessionMaxWeight, set.weight);

      if (set.reps !== undefined) {
        const e1RM = estimateOneRepMax(set.weight, set.reps, set.rpe, set.rir, exerciseName);
        sessionMaxE1RM = Math.max(sessionMaxE1RM, e1RM);
      }
    });

    if (volume > 0) {
      const isPR = sessionMaxWeight > historicalMaxWeight;
      if (isPR) {
        historicalMaxWeight = sessionMaxWeight;
      }

      points.push({
        date: session.startedAt,
        volume,
        maxWeight: sessionMaxWeight,
        maxE1RM: sessionMaxE1RM,
        isPR,
      });
    }
  });

  return points;
}
