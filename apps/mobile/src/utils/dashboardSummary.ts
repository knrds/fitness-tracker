import { WorkoutSession, summarizeSessionExercise } from '@fitness-tracker/domain';

/** Calendar week in the device's timezone; never includes unfinished or warm-up sets. */
export function dashboardSummary(sessions: WorkoutSession[], now: Date) {
  const monday = new Date(now);
  monday.setDate(now.getDate() - ((now.getDay() + 6) % 7));
  monday.setHours(0, 0, 0, 0);
  const end = new Date(monday);
  end.setDate(end.getDate() + 7);
  const weekly = sessions.filter(
    (s) => new Date(s.startedAt) >= monday && new Date(s.startedAt) < end,
  );
  const sets = weekly
    .flatMap((s) => s.exercises.flatMap((e) => e.sets))
    .filter((s) => s.completed && s.type !== 'warmup');
  const volume = weekly.reduce(
    (n, s) => n + s.exercises.reduce((v, e) => v + summarizeSessionExercise(e).totalVolume, 0),
    0,
  );
  const rpes = sets.flatMap((s) => (s.rpe !== undefined && s.rpe > 0 ? [s.rpe] : []));
  return {
    monday,
    weekly,
    setCount: sets.length,
    volume,
    averageRpe: rpes.length ? rpes.reduce((n, v) => n + v, 0) / rpes.length : null,
  };
}
