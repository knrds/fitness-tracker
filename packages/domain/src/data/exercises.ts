import { Exercise } from '../types';
import rawData from './raw/exercisedb.json';
import { mapExercises, RawExercise } from './mapExercises';

// Map the raw free-exercise-db JSON array to our typed domain Exercise array
export const EXERCISES: Exercise[] = mapExercises(rawData as unknown as RawExercise[]);

// Maintain backwards compatibility alias for EXERCISE_LIBRARY
export const EXERCISE_LIBRARY: Exercise[] = EXERCISES;
