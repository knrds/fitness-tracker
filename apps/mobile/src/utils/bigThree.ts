import { Exercise, ExerciseSet, FitnessGoal, WorkoutSession } from '@fitness-tracker/domain';

export type BigThreeLift = 'bench' | 'squat' | 'deadlift';

/**
 * Checks if an exercise is a flat or standard bench press.
 */
export function isBenchPressExercise(name: string): boolean {
  const n = name.toLowerCase();
  return n.includes('bench press') && !n.includes('reverse') && !n.includes('seated');
}

/**
 * Checks if an exercise is a squat (barbell, goblet, etc.), excluding cleans and snatches.
 */
export function isSquatExercise(name: string): boolean {
  const n = name.toLowerCase();
  return (
    n.includes('squat') &&
    !n.includes('clean') &&
    !n.includes('snatch') &&
    !n.includes('thrust') &&
    !n.includes('jump')
  );
}

/**
 * Checks if an exercise is a deadlift (conventional, sumo, romanian, trap bar).
 */
export function isDeadliftExercise(name: string): boolean {
  const n = name.toLowerCase();
  return n.includes('deadlift');
}

/**
 * Categorizes an exercise name into one of the Big 3 lifts, or null if unrelated.
 */
export function getBigThreeCategory(name: string): BigThreeLift | null {
  if (isBenchPressExercise(name)) return 'bench';
  if (isSquatExercise(name)) return 'squat';
  if (isDeadliftExercise(name)) return 'deadlift';
  return null;
}

export interface BigThreeMaxes {
  benchPressMaxKg?: number;
  squatMaxKg?: number;
  deadliftMaxKg?: number;
}

/**
 * Extracts the maximum completed set weight for each Big 3 category in a session.
 */
export function extractBigThreeMaxesFromSession(
  session: WorkoutSession,
  exercises: Exercise[],
): BigThreeMaxes {
  const exMap = new Map<string, string>();
  exercises.forEach((e) => exMap.set(e.id, e.name));

  let benchMax = 0;
  let squatMax = 0;
  let deadliftMax = 0;

  session.exercises.forEach((ex) => {
    const name = exMap.get(ex.exerciseId) || '';
    const category = getBigThreeCategory(name);
    if (!category) return;

    ex.sets.forEach((set: ExerciseSet) => {
      if (!set.completed || set.type === 'warmup') return;
      const w = set.weight || 0;
      if (w <= 0) return;

      if (category === 'bench' && w > benchMax) benchMax = w;
      if (category === 'squat' && w > squatMax) squatMax = w;
      if (category === 'deadlift' && w > deadliftMax) deadliftMax = w;
    });
  });

  return {
    ...(benchMax > 0 ? { benchPressMaxKg: benchMax } : {}),
    ...(squatMax > 0 ? { squatMaxKg: squatMax } : {}),
    ...(deadliftMax > 0 ? { deadliftMaxKg: deadliftMax } : {}),
  };
}

/**
 * Extracts all-time best weights for the Big 3 from an array of workout sessions.
 */
export function extractBigThreePRsFromHistory(
  sessions: WorkoutSession[],
  exercises: Exercise[],
): BigThreeMaxes {
  const exMap = new Map<string, string>();
  exercises.forEach((e) => exMap.set(e.id, e.name));

  let benchMax = 0;
  let squatMax = 0;
  let deadliftMax = 0;

  sessions.forEach((session) => {
    session.exercises.forEach((ex) => {
      const name = exMap.get(ex.exerciseId) || '';
      const category = getBigThreeCategory(name);
      if (!category) return;

      ex.sets.forEach((set: ExerciseSet) => {
        if (!set.completed || set.type === 'warmup') return;
        const w = set.weight || 0;
        if (w <= 0) return;

        if (category === 'bench' && w > benchMax) benchMax = w;
        if (category === 'squat' && w > squatMax) squatMax = w;
        if (category === 'deadlift' && w > deadliftMax) deadliftMax = w;
      });
    });
  });

  return {
    ...(benchMax > 0 ? { benchPressMaxKg: benchMax } : {}),
    ...(squatMax > 0 ? { squatMaxKg: squatMax } : {}),
    ...(deadliftMax > 0 ? { deadliftMaxKg: deadliftMax } : {}),
  };
}

/**
 * Calculates a sensible first working set weight and rep count based on the user's 1RM and fitness goal.
 * Rounds cleanly to the nearest 2.5 kg step (standard plate increment).
 */
export function calculateSuggestedWorkingSet(
  oneRepMaxKg: number,
  goal?: FitnessGoal,
): { weight: number; reps: number } {
  if (!oneRepMaxKg || oneRepMaxKg <= 0) {
    return { weight: 0, reps: 0 };
  }

  let intensity = 0.7; // default 70%
  let reps = 8;

  switch (goal) {
    case 'gain_strength':
      intensity = 0.8; // 80% 1RM
      reps = 5;
      break;
    case 'build_muscle':
      intensity = 0.725; // 72.5% 1RM
      reps = 8;
      break;
    case 'lose_fat':
    case 'general_fitness':
      intensity = 0.65; // 65% 1RM
      reps = 10;
      break;
    default:
      intensity = 0.7;
      reps = 8;
      break;
  }

  const rawWeight = oneRepMaxKg * intensity;
  // Round to nearest 2.5 kg
  const roundedWeight = Math.round(rawWeight / 2.5) * 2.5;
  return {
    weight: Math.max(20, roundedWeight), // At least empty barbell (20kg)
    reps,
  };
}
