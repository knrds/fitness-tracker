import { describe, expect, it } from 'vitest';
import {
  createPlannedSet,
  hasTemplateChanges,
  repeatSessionExercises,
  startTemplateExercises,
  templateExercisesFromSession,
} from '../logic/workoutPlanning';
import type { SessionExercise, TemplateExercise } from '../types';

let nextId = 0;
const createId = () => `new-${++nextId}`;
const exercise: SessionExercise = {
  id: 'old-exercise',
  exerciseId: 'library-exercise',
  order: 0,
  notes: 'Keep elbows steady',
  supersetGroup: 'A',
  sets: [
    {
      id: 'old-set',
      setNumber: 1,
      type: 'drop',
      weight: 80,
      reps: 8,
      rpe: 8,
      rir: 0,
      restSeconds: 0,
      durationSeconds: 45,
      distanceMeters: 15,
      notes: 'Pause at bottom',
      completed: true,
      completedAt: new Date('2026-09-10T10:00:00Z'),
    },
  ],
};
const template: TemplateExercise = {
  id: 'template-slot',
  exerciseId: 'library-exercise',
  order: 0,
  targetSets: 2,
  targetWeight: 80,
  targetReps: 8,
  targetRepsMax: 12,
  targetRpe: 8,
  targetRir: 0,
  targetRestSeconds: 0,
  supersetGroup: 'A',
  notes: 'Keep elbows steady',
};

describe('workout prescription parity', () => {
  it('repeats every parameter with fresh identities and no inherited completion', () => {
    const original = { ...exercise, sets: exercise.sets.map((set) => ({ ...set })) };
    const repeated = repeatSessionExercises([exercise], createId)[0]!;
    expect(repeated).toMatchObject({
      exerciseId: exercise.exerciseId,
      notes: exercise.notes,
      supersetGroup: 'A',
    });
    expect(repeated.sets[0]).toMatchObject({
      type: 'drop',
      weight: 80,
      reps: 8,
      rpe: 8,
      rir: 0,
      restSeconds: 0,
      durationSeconds: 45,
      distanceMeters: 15,
      notes: 'Pause at bottom',
      completed: false,
    });
    expect(repeated.id).not.toBe(exercise.id);
    expect(repeated.sets[0]?.id).not.toBe(exercise.sets[0]?.id);
    expect(repeated.sets[0]).not.toHaveProperty('completedAt');
    repeated.sets[0]!.weight = 120;
    expect(exercise).toEqual(original);
  });
  it('copies a new set without fabricating optional values or dropping zero targets', () => {
    const planned = createPlannedSet(exercise.sets[0]!, 2, createId);
    expect(planned).toMatchObject({ setNumber: 3, rir: 0, restSeconds: 0 });
    const minimal = createPlannedSet(
      { id: 'minimal', type: 'working', setNumber: 1, completed: false },
      0,
      createId,
    );
    expect(minimal).not.toHaveProperty('weight');
    expect(minimal).not.toHaveProperty('rpe');
  });
  it('starts uniform target sets with RIR, rest, notes and superset groups', () => {
    const started = startTemplateExercises([template], createId)[0]!;
    expect(started.sets).toHaveLength(2);
    expect(new Set(started.sets.map((set) => set.id)).size).toBe(2);
    expect(started).toMatchObject({ notes: template.notes, supersetGroup: 'A' });
    started.sets.forEach((set) =>
      expect(set).toMatchObject({
        weight: 80,
        reps: 8,
        rpe: 8,
        rir: 0,
        restSeconds: 0,
        completed: false,
      }),
    );
    expect(hasTemplateChanges([template], [started])).toBe(false);
  });
  it('retains rep ranges and slot IDs when other targets change within the prescribed range', () => {
    const started = startTemplateExercises([template], createId);
    started[0]!.sets[0]!.reps = 10;
    started[0]!.sets[0]!.weight = 85;
    const updated = templateExercisesFromSession(started, createId, [template])[0]!;
    expect(updated).toMatchObject({
      id: template.id,
      targetReps: 8,
      targetRepsMax: 12,
      targetWeight: 85,
      targetRir: 0,
      targetRestSeconds: 0,
      supersetGroup: 'A',
    });
    expect(hasTemplateChanges([template], started)).toBe(true);
  });
  it('detects changes to every supported editable target and to grouping', () => {
    for (const [field, value] of [
      ['weight', 90],
      ['reps', 6],
      ['rpe', 9],
      ['rir', 2],
      ['restSeconds', 120],
    ] as const) {
      const started = startTemplateExercises([template], createId);
      started[0]!.sets[0]![field] = value;
      expect(hasTemplateChanges([template], started), field).toBe(true);
    }
    const started = startTemplateExercises([template], createId);
    started[0]!.supersetGroup = 'B';
    expect(hasTemplateChanges([template], started)).toBe(true);
  });
  it('matches repeated exercise occurrences independently instead of finding the first exercise ID', () => {
    const templates = [
      template,
      { ...template, id: 'second-slot', order: 1, targetWeight: 60, notes: 'Second occurrence' },
    ];
    const started = startTemplateExercises(templates, createId);
    expect(hasTemplateChanges(templates, started)).toBe(false);
    started[1]!.sets[0]!.rir = 3;
    const updated = templateExercisesFromSession(started, createId, templates);
    expect(updated[0]).toMatchObject({ id: template.id, targetRir: 0 });
    expect(updated[1]).toMatchObject({ id: 'second-slot', targetWeight: 60, targetRir: 3 });
  });
  it('uses working-set targets rather than warmup targets when creating a template', () => {
    const live = { ...exercise, sets: exercise.sets.map((set) => ({ ...set })) };
    live.sets.unshift({
      id: 'warmup',
      type: 'warmup',
      setNumber: 1,
      weight: 20,
      reps: 15,
      completed: true,
    });
    const created = templateExercisesFromSession([live], createId)[0]!;
    expect(created).toMatchObject({
      targetSets: 1,
      targetWeight: 80,
      targetReps: 8,
      targetRir: 0,
      targetRestSeconds: 0,
      supersetGroup: 'A',
      notes: live.notes,
    });
    expect(created.id).not.toBe(exercise.id);
  });
  it('does not turn an unfilled zero-rep set into an invalid zero-rep prescription', () => {
    const live: SessionExercise = {
      id: 'empty',
      exerciseId: 'library',
      order: 0,
      sets: [{ id: 'set', setNumber: 1, type: 'working', weight: 0, reps: 0, completed: false }],
    };
    const created = templateExercisesFromSession([live], createId)[0]!;
    expect(created.targetSets).toBe(1);
    expect(created.targetWeight).toBe(0);
    expect(created).not.toHaveProperty('targetReps');
    expect(live.sets[0]?.reps).toBe(0);
  });
});
