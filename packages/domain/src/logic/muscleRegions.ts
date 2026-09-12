import { Exercise, MuscleGroup, WorkoutSession } from '../types';

const shoulders = [MuscleGroup.FrontDelts, MuscleGroup.SideDelts, MuscleGroup.RearDelts];
const filterGroups: Partial<Record<MuscleGroup, MuscleGroup[]>> = {
  [MuscleGroup.FrontDelts]: shoulders,
  [MuscleGroup.SideDelts]: shoulders,
  [MuscleGroup.RearDelts]: shoulders,
  [MuscleGroup.UpperBack]: [
    MuscleGroup.UpperBack,
    MuscleGroup.LowerBack,
    MuscleGroup.Lats,
    MuscleGroup.Traps,
  ],
  [MuscleGroup.Quads]: [
    MuscleGroup.Quads,
    MuscleGroup.Hamstrings,
    MuscleGroup.Glutes,
    MuscleGroup.Calves,
  ],
  [MuscleGroup.Biceps]: [MuscleGroup.Biceps, MuscleGroup.Triceps, MuscleGroup.Forearms],
  [MuscleGroup.Abs]: [MuscleGroup.Abs, MuscleGroup.Obliques],
  [MuscleGroup.Traps]: [MuscleGroup.Traps, MuscleGroup.UpperBack],
  [MuscleGroup.Lats]: [MuscleGroup.Lats, MuscleGroup.UpperBack],
};

export function matchesMuscleRegion(exercise: Exercise, region: MuscleGroup): boolean {
  if (
    (region === MuscleGroup.Obliques || region === MuscleGroup.Abs) &&
    isObliqueExercise(exercise)
  )
    return true;
  const muscles = filterGroups[region] ?? [region];
  return muscles.some(
    (m) => exercise.primaryMuscles.includes(m) || exercise.secondaryMuscles.includes(m),
  );
}

export function isObliqueExercise(exercise: Exercise): boolean {
  return (
    exercise.primaryMuscles.includes(MuscleGroup.Obliques) ||
    exercise.secondaryMuscles.includes(MuscleGroup.Obliques) ||
    ['oblique', 'side bend', 'side plank', 'russian twist', 'woodchop', 'wood chop', 'twist'].some(
      (word) => exercise.name.toLowerCase().includes(word),
    )
  );
}

export function getHeatmapMuscles(region: MuscleGroup): MuscleGroup[] {
  switch (region) {
    case MuscleGroup.FrontDelts:
      return [MuscleGroup.FrontDelts, MuscleGroup.SideDelts];
    case MuscleGroup.RearDelts:
      return [MuscleGroup.RearDelts, MuscleGroup.SideDelts];
    case MuscleGroup.Traps:
      return [MuscleGroup.Traps, MuscleGroup.UpperBack];
    case MuscleGroup.Lats:
      return [MuscleGroup.Lats, MuscleGroup.UpperBack];
    case MuscleGroup.Abs:
      return [MuscleGroup.Abs, MuscleGroup.Obliques];
    default:
      return [region];
  }
}

/** Recorded working sets, not inferred load or physiological muscle stimulus. */
export function getMuscleActivity(
  sessions: WorkoutSession[],
  exercises: Exercise[],
  since: Date,
): Partial<Record<MuscleGroup, number>> {
  const result: Partial<Record<MuscleGroup, number>> = {};
  const byId = new Map(exercises.map((ex) => [ex.id, ex]));
  for (const session of sessions) {
    if (session.startedAt < since) continue;
    for (const occurrence of session.exercises) {
      const definition = byId.get(occurrence.exerciseId);
      if (!definition) continue;
      const count = occurrence.sets.filter((set) => set.completed && set.type !== 'warmup').length;
      for (const region of Object.values(MuscleGroup)) {
        if (
          getHeatmapMuscles(region).some((m) => definition.primaryMuscles.includes(m)) ||
          ((region === MuscleGroup.Obliques || region === MuscleGroup.Abs) &&
            isObliqueExercise(definition))
        ) {
          result[region] = (result[region] ?? 0) + count;
        }
      }
    }
  }
  return result;
}
