import { Exercise } from '../types';
import rawData from './raw/exercisedb.json';
import { mapExercises } from './mapExercises';

// Map the raw free-exercise-db JSON array to our typed domain Exercise array
export const EXERCISES: Exercise[] = mapExercises(rawData as any);

// Maintain backwards compatibility alias for EXERCISE_LIBRARY
export const EXERCISE_LIBRARY: Exercise[] = EXERCISES;
