import { useProfileStore } from '../profileStore';
import { useHistoryStore } from '../historyStore';
import { WorkoutSession } from '@fitness-tracker/domain';

jest.mock('react-native-mmkv', () => ({
  MMKV: jest.fn().mockImplementation(() => ({
    set: jest.fn(),
    getString: jest.fn(),
    delete: jest.fn(),
  }))
}));

describe('profileStore', () => {
  beforeEach(() => {
    useProfileStore.setState({
      profile: {
        displayName: 'User',
        preferredUnits: 'metric',
      }
    });
    useHistoryStore.getState().clearHistory();
  });

  it('should update profile fields', () => {
    const store = useProfileStore.getState();
    store.updateProfile({ displayName: 'Konrad', fitnessGoal: 'build_muscle' });

    const state = useProfileStore.getState();
    expect(state.profile.displayName).toBe('Konrad');
    expect(state.profile.fitnessGoal).toBe('build_muscle');
  });

  it('should update and save biological sex, height, weight, and maxes', () => {
    const store = useProfileStore.getState();
    store.updateProfile({
      biologicalSex: 'male',
      heightCm: 180,
      weightKg: 85,
      benchPressMaxKg: 120,
      squatMaxKg: 140,
      deadliftMaxKg: 180
    });

    const state = useProfileStore.getState();
    expect(state.profile.biologicalSex).toBe('male');
    expect(state.profile.heightCm).toBe(180);
    expect(state.profile.weightKg).toBe(85);
    expect(state.profile.benchPressMaxKg).toBe(120);
    expect(state.profile.squatMaxKg).toBe(140);
    expect(state.profile.deadliftMaxKg).toBe(180);
  });

  it('should calculate statistics correctly (workouts, volume, streaks)', () => {
    const store = useProfileStore.getState();

    const d1 = new Date('2026-06-01T18:00:00.000Z');
    const d2 = new Date('2026-06-02T18:00:00.000Z');

    const mockSession1: WorkoutSession = {
      id: 'session-1',
      userId: 'user-1',
      name: 'Push Day',
      startedAt: d1,
      completedAt: d1,
      durationSeconds: 1000,
      createdAt: d1,
      updatedAt: d1,
      exercises: [
        {
          id: 'se-1',
          exerciseId: 'ex-1',
          order: 0,
          sets: [
            { id: 'set-1', setNumber: 1, type: 'working', completed: true, weight: 100, reps: 10 }
          ]
        }
      ]
    };

    const mockSession2: WorkoutSession = {
      id: 'session-2',
      userId: 'user-1',
      name: 'Pull Day',
      startedAt: d2,
      completedAt: d2,
      durationSeconds: 1200,
      createdAt: d2,
      updatedAt: d2,
      exercises: [
        {
          id: 'se-2',
          exerciseId: 'ex-2',
          order: 0,
          sets: [
            { id: 'set-2', setNumber: 1, type: 'working', completed: true, weight: 80, reps: 8 }
          ]
        }
      ]
    };

    // Push sessions to history
    useHistoryStore.getState().addSession(mockSession1);
    useHistoryStore.getState().addSession(mockSession2);

    // Get statistics
    const stats = store.getStatistics();
    
    // Workouts: 2
    expect(stats.totalWorkouts).toBe(2);
    // Volume: (100 * 10) + (80 * 8) = 1000 + 640 = 1640 kg
    expect(stats.totalVolume).toBe(1640);
    // Longest streak: 2 days (June 1st and June 2nd are consecutive)
    expect(stats.longestStreak).toBe(2);
  });

  it('should convert volume statistics to imperial if units set to imperial', () => {
    const store = useProfileStore.getState();
    store.updateProfile({ preferredUnits: 'imperial' });

    const d1 = new Date('2026-06-01T18:00:00.000Z');
    const mockSession: WorkoutSession = {
      id: 'session-1',
      userId: 'user-1',
      name: 'Leg Day',
      startedAt: d1,
      completedAt: d1,
      durationSeconds: 1000,
      createdAt: d1,
      updatedAt: d1,
      exercises: [
        {
          id: 'se-1',
          exerciseId: 'ex-1',
          order: 0,
          sets: [
            { id: 'set-1', setNumber: 1, type: 'working', completed: true, weight: 100, reps: 10 }
          ]
        }
      ]
    };

    useHistoryStore.getState().addSession(mockSession);

    const stats = store.getStatistics();
    // 1000 kg * 2.20462 = 2205 lbs
    expect(stats.totalVolume).toBe(2205);
  });
});
