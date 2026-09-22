import { ProgramWorkout } from '@fitness-tracker/domain';

export interface ReorderProgramWorkoutParams {
  workouts: ProgramWorkout[];
  workoutId: string;
  targetWeek: number;
  targetDay: number;
  targetIndex?: number;
}

/**
 * Reorders or moves a ProgramWorkout to a specific week, day, and position within the day.
 * - Re-indexes `order` within source and destination days deterministically.
 * - Preserves all workout properties and stable IDs without creating duplicates or dropping items.
 * - If targetDay is invalid (< 1 or > 7) or workoutId is not found, returns the original array.
 */
export function reorderProgramWorkout({
  workouts,
  workoutId,
  targetWeek,
  targetDay,
  targetIndex,
}: ReorderProgramWorkoutParams): ProgramWorkout[] {
  if (targetDay < 1 || targetDay > 7) {
    return workouts;
  }

  const movingWorkout = workouts.find((w) => w.id === workoutId);
  if (!movingWorkout) {
    return workouts;
  }

  const originWeek = movingWorkout.week;
  const originDay = movingWorkout.dayOfWeek;

  // Items from unaffected weeks
  const unaffectedWorkouts = workouts.filter(
    (w) => w.week !== originWeek && w.week !== targetWeek,
  );

  // Workouts in target week excluding the moved workout
  const otherWorkoutsInTargetWeek = workouts.filter(
    (w) => w.week === targetWeek && w.id !== workoutId,
  );

  // If moving across weeks, also collect other workouts in origin week
  const otherWorkoutsInOriginWeek =
    originWeek !== targetWeek
      ? workouts.filter((w) => w.week === originWeek && w.id !== workoutId)
      : [];

  // 1. Prepare destination day workouts
  const destinationSiblings = otherWorkoutsInTargetWeek
    .filter((w) => w.dayOfWeek === targetDay)
    .sort((a, b) => a.order - b.order);

  const insertAt =
    targetIndex === undefined || targetIndex < 0
      ? destinationSiblings.length
      : Math.min(targetIndex, destinationSiblings.length);

  const updatedMovingWorkout: ProgramWorkout = {
    ...movingWorkout,
    week: targetWeek,
    dayOfWeek: targetDay,
  };

  destinationSiblings.splice(insertAt, 0, updatedMovingWorkout);

  // Re-assign order for destination day
  const reorderedDestination = destinationSiblings.map((w, order) => ({
    ...w,
    order,
  }));

  // 2. Prepare source day workouts (if day or week changed)
  const isSameDayAndWeek = originWeek === targetWeek && originDay === targetDay;
  let reorderedSource: ProgramWorkout[] = [];

  if (!isSameDayAndWeek) {
    const sourcePool =
      originWeek === targetWeek ? otherWorkoutsInTargetWeek : otherWorkoutsInOriginWeek;
    const sourceSiblings = sourcePool
      .filter((w) => w.dayOfWeek === originDay)
      .sort((a, b) => a.order - b.order);

    reorderedSource = sourceSiblings.map((w, order) => ({
      ...w,
      order,
    }));
  }

  // 3. Collect untouched days in affected weeks
  const untouchedInTargetWeek = otherWorkoutsInTargetWeek.filter(
    (w) => w.dayOfWeek !== targetDay && (isSameDayAndWeek || w.dayOfWeek !== originDay),
  );

  const untouchedInOriginWeek =
    originWeek !== targetWeek
      ? otherWorkoutsInOriginWeek.filter((w) => w.dayOfWeek !== originDay)
      : [];

  return [
    ...unaffectedWorkouts,
    ...untouchedInOriginWeek,
    ...untouchedInTargetWeek,
    ...(isSameDayAndWeek ? [] : reorderedSource),
    ...reorderedDestination,
  ];
}
