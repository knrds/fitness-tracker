import type { ExerciseSet, SessionExercise, TemplateExercise, UUID } from '../types';

type CreateId = () => UUID;

/** Copy the prescription, never the identity or completion of a performed set. */
export function createPlannedSet(set: ExerciseSet, index: number, createId: CreateId): ExerciseSet {
  const planned = { ...set, id: createId(), setNumber: index + 1, completed: false };
  delete planned.completedAt;
  return planned;
}

export function repeatSessionExercises(
  exercises: readonly SessionExercise[],
  createId: CreateId,
): SessionExercise[] {
  return exercises.map((exercise, index) => ({
    ...exercise,
    id: createId(),
    order: index,
    sets: exercise.sets.map((set, setIndex) => createPlannedSet(set, setIndex, createId)),
  }));
}

export function startTemplateExercises(
  exercises: readonly TemplateExercise[],
  createId: CreateId,
): SessionExercise[] {
  return exercises.map((exercise, index) => ({
    id: createId(),
    exerciseId: exercise.exerciseId,
    order: index,
    ...(exercise.notes !== undefined ? { notes: exercise.notes } : {}),
    ...(exercise.supersetGroup !== undefined ? { supersetGroup: exercise.supersetGroup } : {}),
    sets: Array.from({ length: exercise.targetSets }, (_, setIndex) => ({
      id: createId(),
      setNumber: setIndex + 1,
      type: 'working',
      completed: false,
      ...(exercise.targetWeight !== undefined ? { weight: exercise.targetWeight } : {}),
      ...(exercise.targetReps !== undefined ? { reps: exercise.targetReps } : {}),
      ...(exercise.targetRpe !== undefined ? { rpe: exercise.targetRpe } : {}),
      ...(exercise.targetRir !== undefined ? { rir: exercise.targetRir } : {}),
      ...(exercise.targetRestSeconds !== undefined
        ? { restSeconds: exercise.targetRestSeconds }
        : {}),
    })),
  }));
}

/** The current template contract prescribes uniform working sets from the first working set. */
export function templateExercisesFromSession(
  exercises: readonly SessionExercise[],
  createId: CreateId,
  originals: readonly TemplateExercise[] = [],
): TemplateExercise[] {
  return exercises.map((exercise, index) => {
    // Match occurrences by their ordered slot, not the first occurrence of an exercise ID.
    const original =
      originals[index]?.exerciseId === exercise.exerciseId ? originals[index] : undefined;
    const working = exercise.sets.filter((set) => set.type !== 'warmup');
    const first = working[0] ?? exercise.sets[0];
    const repsInOriginalRange =
      first?.reps !== undefined &&
      original?.targetReps !== undefined &&
      original.targetRepsMax !== undefined &&
      first.reps >= original.targetReps &&
      first.reps <= original.targetRepsMax;
    const reps = repsInOriginalRange
      ? original?.targetReps
      : first?.reps && first.reps > 0
        ? first.reps
        : undefined;
    const preserveRange = original && (repsInOriginalRange || first?.reps === original.targetReps);
    return {
      id: original?.id ?? createId(),
      exerciseId: exercise.exerciseId,
      order: index,
      targetSets: working.length || 1,
      ...(reps !== undefined ? { targetReps: reps } : {}),
      ...(preserveRange && original.targetRepsMax !== undefined
        ? { targetRepsMax: original.targetRepsMax }
        : {}),
      ...(first?.weight !== undefined ? { targetWeight: first.weight } : {}),
      ...(first?.rpe !== undefined ? { targetRpe: first.rpe } : {}),
      ...(first?.rir !== undefined ? { targetRir: first.rir } : {}),
      ...(first?.restSeconds !== undefined ? { targetRestSeconds: first.restSeconds } : {}),
      ...(exercise.supersetGroup !== undefined ? { supersetGroup: exercise.supersetGroup } : {}),
      ...(exercise.notes !== undefined ? { notes: exercise.notes } : {}),
    };
  });
}

const prescriptionKeys = [
  'exerciseId',
  'order',
  'targetSets',
  'targetReps',
  'targetRepsMax',
  'targetWeight',
  'targetRpe',
  'targetRir',
  'targetRestSeconds',
  'supersetGroup',
  'notes',
] as const;
export function hasTemplateChanges(
  originals: readonly TemplateExercise[],
  exercises: readonly SessionExercise[],
): boolean {
  if (originals.length !== exercises.length) return true;
  const projected = templateExercisesFromSession(exercises, () => '', originals);
  return projected.some((exercise, index) =>
    prescriptionKeys.some((key) => exercise[key] !== originals[index]?.[key]),
  );
}
