import {
  formatDateLocal,
  getExerciseProgressHistory,
  WorkoutSession,
} from '@fitness-tracker/domain';

/** Same record calculation as Progress; themes only render the resulting date markers. */
export function calendarRecordDays(sessions: WorkoutSession[]): Set<string> {
  const dates = new Set<string>();
  const exercises = new Set(
    sessions.flatMap((session) => session.exercises.map((ex) => ex.exerciseId)),
  );
  for (const exerciseId of exercises) {
    for (const point of getExerciseProgressHistory(exerciseId, sessions)) {
      if (point.isWeightPR || point.isE1RMPR) dates.add(formatDateLocal(point.date));
    }
  }
  return dates;
}
