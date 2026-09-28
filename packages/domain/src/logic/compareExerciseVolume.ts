import type { ExerciseSet, SessionExercise, UUID, WorkoutSession } from '../types';
import { summarizeSessionExercise } from './summarizeSessionExercise';

export interface PreviousPerformanceOptions {
  beforeStartedAt?: Date | undefined;
  excludeSessionId?: UUID | undefined;
}

export interface PreviousExercisePerformance {
  sessionId: UUID;
  sessionExerciseId: UUID;
  date: Date;
  sets: ExerciseSet[];
}

/** Match the same ordered occurrence, using confirmed work from the latest eligible history entry. */
export function getPreviousExercisePerformance(
  sessions: readonly WorkoutSession[],
  exerciseId: UUID,
  occurrenceIndex = 0,
  options: PreviousPerformanceOptions = {},
): PreviousExercisePerformance | null {
  if (!Number.isInteger(occurrenceIndex) || occurrenceIndex < 0) return null;
  const eligibleSessions = sessions
    .filter(
      (session) =>
        session.id !== options.excludeSessionId &&
        (!options.beforeStartedAt ||
          session.startedAt.getTime() < options.beforeStartedAt.getTime()),
    )
    .sort((a, b) => b.startedAt.getTime() - a.startedAt.getTime());

  for (const session of eligibleSessions) {
    const occurrence = session.exercises
      .filter((exercise) => exercise.exerciseId === exerciseId)
      .sort((a, b) => a.order - b.order)[occurrenceIndex];
    if (!occurrence?.sets.some((set) => set.completed && set.type !== 'warmup')) continue;
    return {
      sessionId: session.id,
      sessionExerciseId: occurrence.id,
      date: session.startedAt,
      sets: occurrence.sets.filter((set) => set.completed),
    };
  }
  return null;
}

/** A partial workout is progress, not a final performance decrease. All loads remain canonical kg. */
export function compareExerciseVolume(
  current: SessionExercise,
  previous: Pick<PreviousExercisePerformance, 'sets'> | null,
) {
  const currentSummary = summarizeSessionExercise(current);
  const previousVolume = previous
    ? summarizeSessionExercise({ ...current, sets: previous.sets }).totalVolume
    : 0;
  const workingSetCount = current.sets.filter((set) => set.type !== 'warmup').length;
  const isComplete = workingSetCount > 0 && currentSummary.workingSetCount === workingSetCount;
  const status = !isComplete ? 'pending' : previousVolume > 0 ? 'ready' : 'no-baseline';

  return {
    currentVolume: currentSummary.totalVolume,
    previousVolume,
    completedWorkingSetCount: currentSummary.workingSetCount,
    workingSetCount,
    status,
    deltaPercent:
      previousVolume > 0 && currentSummary.workingSetCount > 0
        ? ((currentSummary.totalVolume - previousVolume) / previousVolume) * 100
        : null,
  };
}
