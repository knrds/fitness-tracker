jest.mock('expo-crypto', () => ({
  randomUUID: () => crypto.randomUUID(),
}));

import { randomUUID } from 'node:crypto';
import { UUIDSchema } from '@fitness-tracker/domain';
import { useWorkoutStore } from '../../stores/workoutStore';
import { useBodyMetricStore } from '../../stores/bodyMetricStore';
import { useProgramStore } from '../../stores/programStore';

describe('Data Integrity Contracts', () => {
  beforeEach(() => {
    useWorkoutStore.getState().resetWorkout();
    useBodyMetricStore.setState({ metrics: [] });
    useProgramStore.setState({ programs: [], templates: [] });
  });

  describe('1. Workout & Set Integrity', () => {
    it('creates and updates sets without duplicate IDs or cross-contamination', () => {
      const workout = useWorkoutStore.getState();
      workout.startWorkout('Integrity Test Workout');

      const exerciseId1 = randomUUID();
      const exerciseId2 = randomUUID();
      workout.addExercise(exerciseId1);
      workout.addExercise(exerciseId2);

      const stateWithExercises = useWorkoutStore.getState();
      expect(stateWithExercises.exercises).toHaveLength(2);

      const sessionEx1 = stateWithExercises.exercises[0]!;
      const sessionEx2 = stateWithExercises.exercises[1]!;

      // By default each new exercise initializes with 1 set
      expect(sessionEx1.sets).toHaveLength(1);
      expect(sessionEx2.sets).toHaveLength(1);

      // Add 2 additional sets to exercise 1 (total 3)
      workout.addSet(sessionEx1.id);
      workout.addSet(sessionEx1.id);

      const updatedState = useWorkoutStore.getState();
      const updatedEx1 = updatedState.exercises.find((e) => e.id === sessionEx1.id)!;
      const updatedEx2 = updatedState.exercises.find((e) => e.id === sessionEx2.id)!;

      expect(updatedEx1.sets).toHaveLength(3);
      expect(updatedEx2.sets).toHaveLength(1);

      // Verify all set IDs across the entire workout are unique and valid UUIDs
      const allSetIds = updatedState.exercises.flatMap((e) => e.sets.map((s) => s.id));
      const uniqueSetIds = new Set(allSetIds);
      expect(uniqueSetIds.size).toBe(allSetIds.length);
      expect(allSetIds).toHaveLength(4);
      allSetIds.forEach((id) => {
        expect(UUIDSchema.safeParse(id).success).toBe(true);
      });

      // Verify set numbering is sequential (1, 2, 3)
      expect(updatedEx1.sets.map((s) => s.setNumber)).toEqual([1, 2, 3]);

      // Update set 2 specifically
      const targetSetId = updatedEx1.sets[1]!.id;
      workout.updateSet(updatedEx1.id, targetSetId, {
        weight: 85,
        reps: 8,
        rpe: 8.5,
        rir: 1.5,
        completed: true,
      });

      const stateAfterSetUpdate = useWorkoutStore.getState();
      const ex1AfterUpdate = stateAfterSetUpdate.exercises.find((e) => e.id === sessionEx1.id)!;
      const modifiedSet = ex1AfterUpdate.sets.find((s) => s.id === targetSetId)!;

      expect(modifiedSet.weight).toBe(85);
      expect(modifiedSet.reps).toBe(8);
      expect(modifiedSet.rpe).toBe(8.5);
      expect(modifiedSet.rir).toBe(1.5);
      expect(modifiedSet.completed).toBe(true);

      // Verify neighbor sets were NOT mutated
      const set1 = ex1AfterUpdate.sets[0]!;
      const set3 = ex1AfterUpdate.sets[2]!;
      expect(set1.weight).not.toBe(85);
      expect(set3.weight).not.toBe(85);

      // Delete the target set
      workout.removeSet(updatedEx1.id, targetSetId);
      const stateAfterDelete = useWorkoutStore.getState();
      const ex1AfterDelete = stateAfterDelete.exercises.find((e) => e.id === sessionEx1.id)!;

      expect(ex1AfterDelete.sets).toHaveLength(2);
      expect(ex1AfterDelete.sets.some((s) => s.id === targetSetId)).toBe(false);

      // Renumbering verification: remaining sets must have setNumber 1, 2
      expect(ex1AfterDelete.sets.map((s) => s.setNumber)).toEqual([1, 2]);
    });
  });

  describe('2. Body Measurements Integrity', () => {
    it('stores weight and body fat, maintains chronological order, and retrieves latest accurately', () => {
      const store = useBodyMetricStore.getState();

      const t1 = new Date('2026-09-01T08:00:00Z');
      const t2 = new Date('2026-09-10T08:00:00Z');
      const t3 = new Date('2026-09-05T08:00:00Z'); // Inserted out of order intentionally

      store.addMetric({
        weightKg: 80.5,
        bodyFatPercentage: 15.2,
        recordedAt: t1,
        notes: 'Initial measurement',
      });

      store.addMetric({
        weightKg: 79.8,
        bodyFatPercentage: 14.8,
        recordedAt: t2,
        notes: 'Peak condition',
      });

      store.addMetric({
        weightKg: 80.1,
        bodyFatPercentage: 15.0,
        recordedAt: t3,
        notes: 'Midweek check',
      });

      const metrics = useBodyMetricStore.getState().metrics;
      expect(metrics).toHaveLength(3);

      // Check chronological retrieval: getLatestMetric should return t2 (September 10)
      const latest = useBodyMetricStore.getState().getLatestMetric();
      expect(latest).toBeDefined();
      expect(latest?.recordedAt).toEqual(t2);
      expect(latest?.weightKg).toBe(79.8);
      expect(latest?.bodyFatPercentage).toBe(14.8);

      // Check delete metric
      const metricToDelete = metrics[0]!;
      useBodyMetricStore.getState().deleteMetric(metricToDelete.id);
      expect(useBodyMetricStore.getState().metrics).toHaveLength(2);
      expect(useBodyMetricStore.getState().metrics.some((m) => m.id === metricToDelete.id)).toBe(false);
    });
  });

  describe('3. Program & Template Integrity', () => {
    it('creates, modifies, and activates programs with strict single-active exclusivity', () => {
      const programStore = useProgramStore.getState();

      const tId = randomUUID();
      programStore.createTemplate({
        id: tId,
        name: 'Push Day A',
        exercises: [
          {
            id: randomUUID(),
            exerciseId: randomUUID(),
            order: 0,
            targetSets: 3,
            targetReps: 8,
            targetWeight: 80,
          },
        ],
      });

      const template = useProgramStore.getState().templates.find((t) => t.id === tId);
      expect(template).toBeDefined();
      expect(template?.name).toBe('Push Day A');
      expect(template?.exercises).toHaveLength(1);

      // Create two programs
      const p1Id = randomUUID();
      const p2Id = randomUUID();
      programStore.createProgram({
        id: p1Id,
        name: 'Hypertrophy 4-Day',
        durationWeeks: 8,
        workouts: [],
      });

      programStore.createProgram({
        id: p2Id,
        name: 'Strength 3-Day',
        durationWeeks: 12,
        workouts: [],
      });

      expect(useProgramStore.getState().programs).toHaveLength(2);

      // Activate p1
      programStore.setActiveProgram(p1Id);
      let programs = useProgramStore.getState().programs;
      expect(programs.find((p) => p.id === p1Id)?.isActive).toBe(true);
      expect(programs.find((p) => p.id === p2Id)?.isActive).toBe(false);

      // Activate p2 -> p1 must become inactive (exclusivity)
      programStore.setActiveProgram(p2Id);
      programs = useProgramStore.getState().programs;
      expect(programs.find((p) => p.id === p1Id)?.isActive).toBe(false);
      expect(programs.find((p) => p.id === p2Id)?.isActive).toBe(true);

      // Update template
      programStore.updateTemplate(tId, {
        name: 'Push Day A (Updated)',
      });
      const updatedTemplate = useProgramStore.getState().templates.find((t) => t.id === tId);
      expect(updatedTemplate?.name).toBe('Push Day A (Updated)');

      // Delete program p1
      programStore.deleteProgram(p1Id);
      programs = useProgramStore.getState().programs;
      expect(programs).toHaveLength(1);
      expect(programs[0]!.id).toBe(p2Id);
    });
  });

  describe('4. ID Collision & UUID Validity', () => {
    it('generates 1,000 distinct UUIDs with zero collisions and validates RFC4122 compliance', () => {
      const generated = new Set<string>();
      const count = 1000;

      for (let i = 0; i < count; i++) {
        const id = randomUUID();
        const parseResult = UUIDSchema.safeParse(id);
        expect(parseResult.success).toBe(true);
        generated.add(id);
      }

      expect(generated.size).toBe(count);
    });
  });
});
