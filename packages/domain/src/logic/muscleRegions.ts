import { isCompletedWorkingSet } from './workingSets';
import { EXERCISE_REGION_OVERRIDES } from '../data/exercises';
import { Exercise, MuscleActivity, MuscleGroup, MuscleRegion, WorkoutSession } from '../types';

/** A UI weighting convention, not a measurement of physiological muscle stimulus. */
export const SECONDARY_MUSCLE_WEIGHT = 0.5;

export function getExerciseMuscleRegions(exercise: Exercise): {
  primaryMuscles: readonly MuscleRegion[];
  secondaryMuscles: readonly MuscleRegion[];
} {
  return (!exercise.isCustom && EXERCISE_REGION_OVERRIDES.get(exercise.id)) || exercise;
}

/** Exact named-muscle filter, including secondary assignments. */
export function matchesMuscleGroup(exercise: Exercise, muscle: MuscleRegion): boolean {
  const regions = getExerciseMuscleRegions(exercise);
  return (
    regions.primaryMuscles.includes(muscle) ||
    regions.secondaryMuscles.includes(muscle) ||
    (muscle === MuscleGroup.Obliques && isObliqueExercise(exercise))
  );
}

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

export function getHeatmapMuscles(region: MuscleRegion): MuscleRegion[] {
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

/** Shared artwork regions use the strongest matching group, without adding duplicate sets. */
export function getHeatmapActivity(activity: MuscleActivity, region: MuscleRegion): number {
  return Math.max(0, ...getHeatmapMuscles(region).map((muscle) => activity[muscle] ?? 0));
}

/** Ring fill is relative to the leader; labels remain shares of all weighted assignments. */
export function getMuscleDistribution(activity: MuscleActivity) {
  const entries = Object.entries(activity)
    .filter((entry): entry is [MuscleRegion, number] => Number.isFinite(entry[1]) && entry[1] > 0)
    .sort((a, b) => b[1] - a[1]);
  const total = entries.reduce((sum, [, value]) => sum + value, 0);
  const maximum = entries[0]?.[1] ?? 0;
  return {
    total,
    maximum,
    entries: entries.map(([muscle, value]) => ({
      muscle,
      value,
      share: value / total,
      relative: value / maximum,
    })),
  };
}

/** Weighted recorded set assignments: primary 1, secondary 0.5; no load/stimulus inference. */
export function getMuscleActivity(
  sessions: WorkoutSession[],
  exercises: Exercise[],
  since: Date,
): MuscleActivity {
  const result: MuscleActivity = {};
  const byId = new Map(exercises.map((ex) => [ex.id, ex]));
  for (const session of sessions) {
    if (session.startedAt < since) continue;
    for (const occurrence of session.exercises) {
      const definition = byId.get(occurrence.exerciseId);
      if (!definition) continue;
      const count = occurrence.sets.filter(isCompletedWorkingSet).length;
      if (!count) continue;
      const regions = getExerciseMuscleRegions(definition);
      const primary = new Set(regions.primaryMuscles);
      if (
        !regions.secondaryMuscles.includes(MuscleGroup.Obliques) &&
        isObliqueExercise(definition)
      ) {
        primary.add(MuscleGroup.Obliques);
      }
      for (const muscle of primary) {
        result[muscle] = (result[muscle] ?? 0) + count;
      }
      for (const muscle of new Set(regions.secondaryMuscles)) {
        if (primary.has(muscle)) continue;
        result[muscle] = (result[muscle] ?? 0) + count * SECONDARY_MUSCLE_WEIGHT;
      }
    }
  }
  return result;
}
