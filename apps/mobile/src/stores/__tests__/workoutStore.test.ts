import { useWorkoutStore } from '../workoutStore';
import { useHistoryStore } from '../historyStore';
import { WorkoutTemplate, WorkoutSession } from '@fitness-tracker/domain';
import { LOCAL_USER_ID } from '../local-user';

jest.mock('react-native-mmkv', () => ({
  MMKV: jest.fn().mockImplementation(() => ({
    set: jest.fn(),
    getString: jest.fn(),
    delete: jest.fn(),
  }))
}));

jest.mock('expo-crypto', () => ({
  randomUUID: () => 'mocked-uuid'
}));

describe('workoutStore', () => {
  beforeEach(() => {
    useWorkoutStore.getState().resetWorkout();
    useHistoryStore.getState().clearHistory();
  });

  it('should start a workout', () => {
    useWorkoutStore.getState().startWorkout('Leg Day');
    const state = useWorkoutStore.getState();
    expect(state.status).toBe('active');
    expect(state.name).toBe('Leg Day');
    expect(state.sessionId).toBe('mocked-uuid');
    expect(state.exercises.length).toBe(0);
  });

  it('should add an exercise', () => {
    useWorkoutStore.getState().startWorkout();
    useWorkoutStore.getState().addExercise('exercise-123');
    const state = useWorkoutStore.getState();
    expect(state.exercises.length).toBe(1);
    expect(state.exercises[0]!.exerciseId).toBe('exercise-123');
  });

  it('should add and complete a set', () => {
    useWorkoutStore.getState().startWorkout();
    useWorkoutStore.getState().addExercise('ex-1');
    const exId = useWorkoutStore.getState().exercises[0]!.id;
    
    const setId = useWorkoutStore.getState().exercises[0]!.sets[0]!.id;
    useWorkoutStore.getState().updateSet(exId, setId, { weight: 100, reps: 10 });
    let state = useWorkoutStore.getState();
    expect(state.exercises[0]!.sets.length).toBe(1);
    
    useWorkoutStore.getState().completeSet(exId, setId);
    state = useWorkoutStore.getState();
    expect(state.exercises[0]!.sets[0]!.completed).toBe(true);
    expect(state.restTimer.isRunning).toBe(true);
  });

  it('should add, complete and then uncomplete a set', () => {
    useWorkoutStore.getState().startWorkout();
    useWorkoutStore.getState().addExercise('ex-1');
    const exId = useWorkoutStore.getState().exercises[0]!.id;
    
    const setId = useWorkoutStore.getState().exercises[0]!.sets[0]!.id;
    useWorkoutStore.getState().updateSet(exId, setId, { weight: 100, reps: 10 });
    let state = useWorkoutStore.getState();
    
    // Complete the set
    useWorkoutStore.getState().completeSet(exId, setId);
    state = useWorkoutStore.getState();
    expect(state.exercises[0]!.sets[0]!.completed).toBe(true);
    expect(state.exercises[0]!.sets[0]!.completedAt).toBeDefined();
    
    // Turn off rest timer so we can check if it stays off
    useWorkoutStore.getState().stopRestTimer();
    
    // Uncomplete the set
    useWorkoutStore.getState().completeSet(exId, setId);
    state = useWorkoutStore.getState();
    expect(state.exercises[0]!.sets[0]!.completed).toBe(false);
    expect(state.exercises[0]!.sets[0]!.completedAt).toBeUndefined();
    // Rest timer should NOT have been started again
    expect(state.restTimer.isRunning).toBe(false);
  });

  it('should finish a workout and add it to the history store', () => {
    useWorkoutStore.getState().startWorkout('Leg Day');
    useWorkoutStore.getState().addExercise('exercise-123');
    const exId = useWorkoutStore.getState().exercises[0]!.id;
    useWorkoutStore.getState().addSet(exId, { weight: 100, reps: 10, completed: true });
    
    useWorkoutStore.getState().finishWorkout();
    
    expect(useWorkoutStore.getState().status).toBe('finished');
    const historySessions = useHistoryStore.getState().sessions;
    expect(historySessions.length).toBe(1);
    expect(historySessions[0]!.name).toBe('Leg Day');
    expect(historySessions[0]!.exercises[0]!.exerciseId).toBe('exercise-123');
  });

  it('should ignore duplicate finish calls after saving once', () => {
    useWorkoutStore.getState().startWorkout('Leg Day');
    useWorkoutStore.getState().addExercise('exercise-123');
    const exId = useWorkoutStore.getState().exercises[0]!.id;
    useWorkoutStore.getState().addSet(exId, { weight: 100, reps: 10, completed: true });

    const firstResult = useWorkoutStore.getState().finishWorkout();
    const secondResult = useWorkoutStore.getState().finishWorkout();

    expect(firstResult?.userId).toBe(LOCAL_USER_ID);
    expect(secondResult).toBeNull();
    expect(useHistoryStore.getState().sessions.length).toBe(1);
  });

  it('should start a workout from template with programId', () => {
    const mockTemplate = {
      id: 'template-uuid',
      name: 'Template Workout',
      exercises: [
        {
          exerciseId: 'ex-1',
          order: 0,
          targetSets: 3,
          targetWeight: 80,
          targetReps: 8,
          targetRpe: 9,
          notes: 'Test note',
        }
      ],
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    useWorkoutStore.getState().startWorkoutFromTemplate(mockTemplate as unknown as WorkoutTemplate, 'program-uuid');
    const state = useWorkoutStore.getState();
    expect(state.status).toBe('active');
    expect(state.name).toBe('Template Workout');
    expect(state.templateId).toBe('template-uuid');
    expect(state.programId).toBe('program-uuid');
    expect(state.exercises.length).toBe(1);
    expect(state.exercises[0]!.exerciseId).toBe('ex-1');
    expect(state.exercises[0]!.sets.length).toBe(3);
    expect(state.exercises[0]!.sets[0]!.weight).toBe(80);
    expect(state.exercises[0]!.sets[0]!.reps).toBe(8);
    expect(state.exercises[0]!.sets[0]!.rpe).toBe(9);
    expect(state.exercises[0]!.sets[0]!.completed).toBe(false);
  });

  it('should start a workout from session', () => {
    const mockSession = {
      id: 'session-uuid',
      name: 'Session Workout',
      exercises: [
        {
          id: 's-ex-id',
          exerciseId: 'ex-1',
          order: 0,
          notes: 'Session exercise note',
          sets: [
            {
              id: 'set-id-1',
              setNumber: 1,
              type: 'standard',
              completed: true,
              weight: 85,
              reps: 10,
              rpe: 8,
            }
          ]
        }
      ],
      startedAt: new Date(),
      durationSeconds: 1800,
    };

    useWorkoutStore.getState().startWorkoutFromSession(mockSession as unknown as WorkoutSession);
    const state = useWorkoutStore.getState();
    expect(state.status).toBe('active');
    expect(state.name).toBe('Session Workout');
    expect(state.exercises.length).toBe(1);
    expect(state.exercises[0]!.exerciseId).toBe('ex-1');
    expect(state.exercises[0]!.notes).toBe('Session exercise note');
    expect(state.exercises[0]!.sets.length).toBe(1);
    expect(state.exercises[0]!.sets[0]!.weight).toBe(85);
    expect(state.exercises[0]!.sets[0]!.reps).toBe(10);
    expect(state.exercises[0]!.sets[0]!.rpe).toBe(8);
    expect(state.exercises[0]!.sets[0]!.completed).toBe(false);
  });

  it('should update workout notes and save them in the history store session', () => {
    useWorkoutStore.getState().startWorkout('Leg Day');
    useWorkoutStore.getState().addExercise('ex-1');
    const exId = useWorkoutStore.getState().exercises[0]!.id;
    useWorkoutStore.getState().addSet(exId, { weight: 100, reps: 10, completed: true });

    useWorkoutStore.getState().updateWorkoutNotes('Felt really good today');
    expect(useWorkoutStore.getState().notes).toBe('Felt really good today');

    useWorkoutStore.getState().finishWorkout();
    const historySessions = useHistoryStore.getState().sessions;
    expect(historySessions.length).toBe(1);
    expect(historySessions[0]!.notes).toBe('Felt really good today');
  });

  it('should NOT save workout to history if there are no completed sets', () => {
    useWorkoutStore.getState().startWorkout('Empty Workout');
    useWorkoutStore.getState().addExercise('ex-1');
    const exId = useWorkoutStore.getState().exercises[0]!.id;
    useWorkoutStore.getState().addSet(exId, { weight: 100, reps: 10, completed: false }); // not completed

    const result = useWorkoutStore.getState().finishWorkout();

    expect(result).toBeNull();
    expect(useWorkoutStore.getState().status).toBe('idle');
    const historySessions = useHistoryStore.getState().sessions;
    expect(historySessions.length).toBe(0);
  });

  it('should calculate warmup sets', () => {
    useWorkoutStore.getState().startWorkout('Chest Day');
    useWorkoutStore.getState().addExercise('ex-bench');
    const exId = useWorkoutStore.getState().exercises[0]!.id;
 
    // Update the default working set
    const setId = useWorkoutStore.getState().exercises[0]!.sets[0]!.id;
    useWorkoutStore.getState().updateSet(exId, setId, { weight: 100, reps: 5, type: 'working' });
    
    // Calculate warmups based on 100kg target weight
    useWorkoutStore.getState().calculateWarmupSets(exId, 100);
 
    const exercise = useWorkoutStore.getState().exercises[0]!;
    // Should have 3 warmup sets prepended, and 1 working set (total 4)
    expect(exercise.sets.length).toBe(4);
    expect(exercise.sets[0]!.type).toBe('warmup');
    expect(exercise.sets[0]!.weight).toBe(50); // 50%
    expect(exercise.sets[0]!.reps).toBe(10);
    expect(exercise.sets[1]!.type).toBe('warmup');
    expect(exercise.sets[1]!.weight).toBe(70); // 70%
    expect(exercise.sets[1]!.reps).toBe(5);
    expect(exercise.sets[2]!.type).toBe('warmup');
    expect(exercise.sets[2]!.weight).toBe(90); // 90%
    expect(exercise.sets[2]!.reps).toBe(2);
    expect(exercise.sets[3]!.type).toBe('working');
    expect(exercise.sets[3]!.weight).toBe(100);
  });

  it('should link exercises as superset and toggle them', () => {
    useWorkoutStore.getState().startWorkout();
    useWorkoutStore.getState().addExercise('ex-1');
    useWorkoutStore.getState().addExercise('ex-2');

    const ex1Id = useWorkoutStore.getState().exercises[0]!.id;

    // Initially no superset
    expect(useWorkoutStore.getState().exercises[0]!.supersetGroup).toBeUndefined();
    expect(useWorkoutStore.getState().exercises[1]!.supersetGroup).toBeUndefined();

    // Toggle superset on first exercise (links with next)
    useWorkoutStore.getState().toggleSuperset(ex1Id);
    
    let state = useWorkoutStore.getState();
    const group = state.exercises[0]!.supersetGroup;
    expect(group).toBeDefined();
    expect(state.exercises[1]!.supersetGroup).toBe(group);

    // Toggle again to remove it (since only 2 elements in group, dissolves whole group)
    useWorkoutStore.getState().toggleSuperset(ex1Id);
    state = useWorkoutStore.getState();
    expect(state.exercises[0]!.supersetGroup).toBeUndefined();
    expect(state.exercises[1]!.supersetGroup).toBeUndefined();
  });
});
