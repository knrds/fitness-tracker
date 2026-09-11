import { WorkoutSession, UUID } from '../types';
import { EXERCISES } from '../data/exercises';
import { getBestE1RMs } from './getBestE1RMs';
import { summarizeSessionExercise } from './summarizeSessionExercise';

export interface ExerciseProgressPoint {
  date: Date;
  volume: number;
  maxWeight: number;
  maxE1RM: number;
  isPR: boolean;
  isWeightPR: boolean;
  isE1RMPR: boolean;
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
  let historicalMaxE1RM = 0;

  sortedSessions.forEach((session) => {
    const occurrences = session.exercises.filter((entry) => entry.exerciseId === exerciseId);
    if (occurrences.length === 0) return;
    const summaries = occurrences.map(summarizeSessionExercise);
    const volume = summaries.reduce((total, summary) => total + summary.totalVolume, 0);
    const sessionMaxWeight = Math.max(0, ...summaries.map((summary) => summary.maxWeight));
    const sessionMaxE1RM =
      getBestE1RMs(
        [{ ...session, exercises: occurrences }],
        exerciseName === undefined ? undefined : { [exerciseId]: exerciseName },
      )[exerciseId]?.e1RM ?? 0;

    if (volume > 0) {
      const isWeightPR = sessionMaxWeight > historicalMaxWeight;
      const isE1RMPR = sessionMaxE1RM > historicalMaxE1RM;
      historicalMaxWeight = Math.max(historicalMaxWeight, sessionMaxWeight);
      historicalMaxE1RM = Math.max(historicalMaxE1RM, sessionMaxE1RM);

      points.push({
        date: session.startedAt,
        volume,
        maxWeight: sessionMaxWeight,
        maxE1RM: sessionMaxE1RM,
        isPR: isE1RMPR,
        isWeightPR,
        isE1RMPR,
      });
    }
  });

  return points;
}
