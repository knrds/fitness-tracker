import { useWorkoutStore } from '../../../stores/workoutStore';

describe('Workout Collapse / Expand State Preservation', () => {
  beforeEach(() => {
    useWorkoutStore.getState().resetWorkout();
  });

  it('preserves exercises, sets, reps, weights, and notes through collapse and expand cycles', () => {
    const store = useWorkoutStore.getState();
    store.startWorkout('Full Body Hypertrophy');

    store.addExercise('exercise-bench-press');

    const ex = useWorkoutStore.getState().exercises[0]!;
    const exId = ex.id;
    const setId = ex.sets[0]!.id;

    // Enter reps, weight, RPE
    store.updateSet(exId, setId, {
      reps: 10,
      weight: 85,
      rpe: 8,
      rir: 2,
    });
    store.updateWorkoutNotes('Felt strong on set 1');

    // Verify initial values
    let current = useWorkoutStore.getState();
    expect(current.exercises[0]?.sets[0]?.reps).toBe(10);
    expect(current.exercises[0]?.sets[0]?.weight).toBe(85);
    expect(current.exercises[0]?.sets[0]?.rpe).toBe(8);
    expect(current.exercises[0]?.sets[0]?.rir).toBe(2);
    expect(current.notes).toBe('Felt strong on set 1');
    expect(current.isMinimized).toBe(false);

    // Minimize (collapse)
    store.setMinimized(true);
    current = useWorkoutStore.getState();
    expect(current.isMinimized).toBe(true);
    expect(current.exercises[0]?.sets[0]?.reps).toBe(10);
    expect(current.exercises[0]?.sets[0]?.weight).toBe(85);
    expect(current.exercises[0]?.sets[0]?.rpe).toBe(8);
    expect(current.exercises[0]?.sets[0]?.rir).toBe(2);
    expect(current.notes).toBe('Felt strong on set 1');

    // Restore (expand)
    store.setMinimized(false);
    current = useWorkoutStore.getState();
    expect(current.isMinimized).toBe(false);
    expect(current.exercises[0]?.sets[0]?.reps).toBe(10);
    expect(current.exercises[0]?.sets[0]?.weight).toBe(85);
    expect(current.exercises[0]?.sets[0]?.rpe).toBe(8);
    expect(current.exercises[0]?.sets[0]?.rir).toBe(2);
    expect(current.notes).toBe('Felt strong on set 1');
  });

  it('preserves rest timer state through collapse and expand cycles', () => {
    const store = useWorkoutStore.getState();
    store.startWorkout('Leg Day');

    // Start a 90 second rest timer
    store.startRestTimer(90);
    let current = useWorkoutStore.getState();
    expect(current.restTimer.isRunning).toBe(true);
    expect(current.restTimer.durationSeconds).toBe(90);
    const endsAtTime = current.restTimer.endsAt?.getTime();
    expect(endsAtTime).toBeDefined();

    // Collapse
    store.setMinimized(true);
    current = useWorkoutStore.getState();
    expect(current.isMinimized).toBe(true);
    expect(current.restTimer.isRunning).toBe(true);
    expect(current.restTimer.endsAt?.getTime()).toBe(endsAtTime);

    // Expand
    store.setMinimized(false);
    current = useWorkoutStore.getState();
    expect(current.isMinimized).toBe(false);
    expect(current.restTimer.isRunning).toBe(true);
    expect(current.restTimer.endsAt?.getTime()).toBe(endsAtTime);
  });
});
