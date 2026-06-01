import { useWorkoutStore } from '../workoutStore';
import * as Crypto from 'expo-crypto';

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
});
