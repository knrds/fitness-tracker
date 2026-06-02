import { useWorkoutStore } from '../workoutStore';
import { useHistoryStore } from '../historyStore';

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
    
    useWorkoutStore.getState().addSet(exId, { weight: 100, reps: 10 });
    let state = useWorkoutStore.getState();
    expect(state.exercises[0]!.sets.length).toBe(1);
    const setId = state.exercises[0]!.sets[0]!.id;
    
    useWorkoutStore.getState().completeSet(exId, setId);
    state = useWorkoutStore.getState();
    expect(state.exercises[0]!.sets[0]!.completed).toBe(true);
    expect(state.restTimer.isRunning).toBe(true);
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
});
