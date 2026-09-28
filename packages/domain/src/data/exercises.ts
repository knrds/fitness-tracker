import { Exercise, MuscleGroup, MuscleRegion } from '../types';
import rawData from './raw/free-exercise-db.json';
import { mapExercises, RawExercise } from './mapExercises';

// Map the raw free-exercise-db JSON array to our typed domain Exercise array
export const EXERCISES: Exercise[] = mapExercises(rawData as unknown as RawExercise[]);

/** Preserve finer source anatomy for display without changing persisted DB enums. */
export const EXERCISE_REGION_OVERRIDES = new Map<
  string,
  { primaryMuscles: MuscleRegion[]; secondaryMuscles: MuscleRegion[] }
>();
rawData.forEach((raw, index) => {
  const hipAdduction = raw.id === 'Cable_Hip_Adduction';
  const primaryAdductors = raw.primaryMuscles.includes('adductors') || hipAdduction;
  const secondaryAdductors = raw.secondaryMuscles.includes('adductors');
  if (!primaryAdductors && !secondaryAdductors) return;
  const exercise = EXERCISES[index]!;
  const primaryMuscles: MuscleRegion[] = exercise.primaryMuscles.filter(
    (muscle) =>
      muscle !== MuscleGroup.Quads || (!hipAdduction && raw.primaryMuscles.includes('quadriceps')),
  );
  const secondaryMuscles: MuscleRegion[] = exercise.secondaryMuscles.filter(
    (muscle) => muscle !== MuscleGroup.Quads || raw.secondaryMuscles.includes('quadriceps'),
  );
  if (primaryAdductors) primaryMuscles.push('adductors');
  else if (secondaryAdductors) secondaryMuscles.push('adductors');
  EXERCISE_REGION_OVERRIDES.set(exercise.id, { primaryMuscles, secondaryMuscles });
});

// Maintain backwards compatibility alias for EXERCISE_LIBRARY
export const EXERCISE_LIBRARY: Exercise[] = EXERCISES;
