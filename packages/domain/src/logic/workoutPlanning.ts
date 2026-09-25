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
    sets: materializeTemplateSets(exercise, createId).map((set, setIndex) => createPlannedSet(set, setIndex, createId)),
  }));
}

/** Materialize legacy uniform prescriptions without modifying the source. */
export function materializeTemplateSets(exercise: TemplateExercise, createId: CreateId): ExerciseSet[] {
  if (exercise.sets?.length) return exercise.sets.map(set => ({ ...set }));
  return Array.from({ length: exercise.targetSets }, (_, index) => ({
    id: createId(), setNumber: index + 1, type: 'working', completed: false,
    ...(exercise.targetWeight !== undefined ? { weight: exercise.targetWeight } : {}),
    ...(exercise.targetReps !== undefined ? { reps: exercise.targetReps } : {}),
    ...(exercise.targetRpe !== undefined ? { rpe: exercise.targetRpe } : {}),
    ...(exercise.targetRir !== undefined ? { rir: exercise.targetRir } : {}),
    ...(exercise.targetRestSeconds !== undefined ? { restSeconds: exercise.targetRestSeconds } : {}),
  }));
}

/** Only the edited row changes; first-row values fill truly unset later values. */
export function updateIndependentSet(sets: readonly ExerciseSet[], id: UUID, updates: Partial<ExerciseSet>): ExerciseSet[] {
  const first = sets[0]?.id === id;
  return sets.map(set => {
    if (set.id === id) return { ...set, ...updates };
    if (!first || set.completed) return set;
    const next = { ...set };
    for (const key of ['weight', 'reps', 'rpe', 'rir'] as const) {
      const value = updates[key];
      if (next[key] === undefined && value !== undefined) next[key] = value;
    }
    return next;
  });
}

/** Preserve independent prescriptions as well as legacy summary fields. */
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
      sets: (working.length ? working : exercise.sets).map((set, i) => createPlannedSet(set, i, createId)),
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
    prescriptionKeys.some((key) => exercise[key] !== originals[index]?.[key]) ||
    (originals[index]?.sets === undefined && exercise.sets?.some(set => ['weight', 'reps', 'rpe', 'rir'].some(key => set[key as keyof ExerciseSet] !== exercise.sets?.[0]?.[key as keyof ExerciseSet]))) ||
    (originals[index]?.sets !== undefined && JSON.stringify(exercise.sets?.map(({ id: _id, ...set }) => set)) !== JSON.stringify(originals[index]?.sets?.map(({ id: _id, ...set }) => set))),
  );
}

/** Track only values inherited during this editing session; prefilled rows remain independent. */
export function createSetDraftUpdater() {
  type Field = 'weight' | 'reps';
  const inherited = new WeakMap<readonly ExerciseSet[], Map<string, UUID>>();
  return (sets: readonly ExerciseSet[], id: UUID, updates: Partial<ExerciseSet>): ExerciseSet[] => {
    const sourceIndex = sets.findIndex(set => set.id === id);
    if (sourceIndex < 0) return [...sets];
    const provenance = new Map(inherited.get(sets));
    for (const field of ['weight', 'reps'] as const) {
      if (Object.prototype.hasOwnProperty.call(updates, field)) provenance.delete(`${id}:${field}`);
    }
    const next = sets.map((set, index) => {
      if (set.id === id) return { ...set, ...updates };
      if (index <= sourceIndex || set.completed || set.type !== sets[sourceIndex]!.type) return set;
      const row = { ...set };
      for (const field of ['weight', 'reps'] as Field[]) {
        if (!Object.prototype.hasOwnProperty.call(updates, field)) continue;
        const key = `${set.id}:${field}`;
        if (set[field] === undefined || provenance.get(key) === id) {
          const value = updates[field];
          if (value === undefined) delete row[field];
          else row[field] = value;
          provenance.set(key, id);
        }
      }
      return row;
    });
    inherited.set(next, provenance);
    return next;
  };
}
