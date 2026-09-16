import { useProfileStore } from '../profileStore';
import { useHistoryStore } from '../historyStore';
import { WorkoutSession, Equipment, MuscleGroup, MovementPattern } from '@fitness-tracker/domain';
import { useAchievementStore } from '../achievementStore';
import { useBodyMetricStore } from '../bodyMetricStore';
import { useExerciseStore } from '../exerciseStore';
import { getDefaultPrograms, getDefaultTemplates, useProgramStore } from '../programStore';
import { useWorkoutStore } from '../workoutStore';
import { useCaffeineStore } from '../caffeineStore';
import { useHydrationStore } from '../hydrationStore';
import { useSyncStore } from '../syncStore';
import { useCoachStore } from '../coachStore';

jest.mock('react-native-mmkv', () => ({
  MMKV: jest.fn().mockImplementation(() => ({
    set: jest.fn(),
    getString: jest.fn(),
    delete: jest.fn(),
  })),
}));

describe('profileStore', () => {
  it('exports training plans, preferences, coach history and progress without runtime credentials', () => {
    useProgramStore.setState({ programs: getDefaultPrograms(), templates: getDefaultTemplates() });
    useExerciseStore.setState({
      persistentNotes: { exercise: 'Seat 4' },
      exerciseRestDurations: { exercise: 90 },
    });
    const exported = JSON.parse(useProfileStore.getState().exportData());
    expect(exported.schemaVersion).toBe(2);
    expect(exported.programs).toHaveLength(getDefaultPrograms().length);
    expect(exported.templates).toHaveLength(getDefaultTemplates().length);
    expect(exported.exercisePreferences.persistentNotes.exercise).toBe('Seat 4');
    expect(exported.hydration.dailyGoalMl).toBe(2500);
    expect(exported.achievements.xp).toBe(0);
    expect(exported.coachMessages).toEqual(useCoachStore.getState().messages);
    expect(exported.sync).toBeUndefined();
    expect(exported.auth).toBeUndefined();
  });

  it('generates a complete GDPR Art. 20 export payload containing all 15 required domain sections without credential leaks', () => {
    const testDate = new Date('2026-06-15T10:00:00.000Z');
    useHistoryStore.getState().addSession({
      id: 'session-export-1',
      userId: 'user-export-1',
      name: 'Full Body A',
      startedAt: testDate,
      completedAt: testDate,
      durationSeconds: 3600,
      createdAt: testDate,
      updatedAt: testDate,
      exercises: [
        {
          id: 'se-1',
          exerciseId: 'bench-press',
          order: 0,
          sets: [{ id: 'set-1', setNumber: 1, type: 'working', weight: 100, reps: 5, completed: true }],
        },
      ],
    });
    useBodyMetricStore.getState().addMetric({
      weightKg: 82.5,
      bodyFatPercentage: 14.2,
      recordedAt: testDate,
    });
    useExerciseStore.getState().addCustomExercise({
      name: 'Zercher Squat',
      instructions: 'Hold bar in crook of elbows.',
      primaryMuscles: [MuscleGroup.Quads],
      secondaryMuscles: [MuscleGroup.Glutes],
      equipment: Equipment.Barbell,
      movementPattern: MovementPattern.Squat,
    });
    useExerciseStore.getState().toggleFavorite('bench-press');
    useCoachStore.setState({
      messages: [
        { id: 'msg-1', role: 'user', content: 'What is my split for tomorrow?', createdAt: testDate },
        { id: 'msg-2', role: 'assistant', content: 'You have Upper Body scheduled.', createdAt: testDate },
      ],
    });

    const exportRaw = useProfileStore.getState().exportData();
    expect(typeof exportRaw).toBe('string');
    expect(exportRaw).not.toContain('access_token');
    expect(exportRaw).not.toContain('refresh_token');
    expect(exportRaw).not.toContain('sb-');
    expect(exportRaw).not.toContain('service_role');

    const parsed = JSON.parse(exportRaw);
    expect(parsed.schemaVersion).toBe(2);
    expect(typeof parsed.exportedAt).toBe('string');
    expect(parsed.profile.displayName).toBe('User');
    expect(parsed.history).toHaveLength(1);
    expect(parsed.history[0].name).toBe('Full Body A');
    expect(parsed.history[0].exercises[0].sets[0].weight).toBe(100);
    expect(parsed.bodyMetrics).toHaveLength(1);
    expect(parsed.bodyMetrics[0].weightKg).toBe(82.5);
    expect(parsed.customExercises).toHaveLength(1);
    expect(parsed.customExercises[0].name).toBe('Zercher Squat');
    expect(parsed.favorites).toContain('bench-press');
    expect(parsed.coachMessages).toHaveLength(2);
    expect(parsed.workout).toBeDefined();
    expect(parsed.achievements).toBeDefined();
    expect(parsed.hydration).toBeDefined();
    expect(parsed.caffeine).toBeDefined();
    expect(parsed.exercisePreferences).toBeDefined();
    expect(parsed.programs).toBeDefined();
    expect(parsed.templates).toBeDefined();
  });
  beforeEach(() => {
    useProfileStore.setState({
      profile: {
        displayName: 'User',
        preferredUnits: 'metric',
        showExerciseDeleteConfirmation: true,
      },
    });
    useHistoryStore.getState().clearHistory();
    useAchievementStore.getState().resetAchievements();
    useBodyMetricStore.getState().clearMetrics();
    useExerciseStore.setState({
      favoriteIds: [],
      customExercises: [],
      exerciseRestDurations: {},
      persistentNotes: {},
    });
    useProgramStore.setState({ programs: [], templates: [] });
    useWorkoutStore.getState().resetWorkout();
    useCaffeineStore.setState({ isEnabled: true, currentWorkoutMg: 0, lastWorkoutMg: 0 });
    useHydrationStore.setState({ dateKey: '2026-06-01', dailyGoalMl: 2500, todayIntakeMl: 0 });
  });

  it('should support showExerciseDeleteConfirmation setting', () => {
    const store = useProfileStore.getState();
    expect(store.profile.showExerciseDeleteConfirmation).toBe(true);

    store.updateProfile({ showExerciseDeleteConfirmation: false });
    expect(useProfileStore.getState().profile.showExerciseDeleteConfirmation).toBe(false);
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
      deadliftMaxKg: 180,
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
            { id: 'set-1', setNumber: 1, type: 'working', completed: true, weight: 100, reps: 10 },
          ],
        },
      ],
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
            { id: 'set-2', setNumber: 1, type: 'working', completed: true, weight: 80, reps: 8 },
          ],
        },
      ],
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
            { id: 'set-1', setNumber: 1, type: 'working', completed: true, weight: 100, reps: 10 },
          ],
        },
      ],
    };

    useHistoryStore.getState().addSession(mockSession);

    const stats = store.getStatistics();
    // 1000 kg * 2.20462 = 2205 lbs
    expect(stats.totalVolume).toBe(2205);
  });

  it('should clear all local data across stores', async () => {
    const date = new Date('2026-06-01T18:00:00.000Z');
    const session: WorkoutSession = {
      id: 'session-1',
      userId: 'user-1',
      name: 'Push Day',
      startedAt: date,
      completedAt: date,
      durationSeconds: 1000,
      createdAt: date,
      updatedAt: date,
      exercises: [],
    };

    useHistoryStore.getState().addSession(session);
    useWorkoutStore.setState({
      status: 'active',
      name: 'Dirty Workout',
      lastFinishedSession: session,
    });
    useAchievementStore.setState({
      xp: 1000,
      level: 3,
      unlockedAchievements: { first_workout: date.toISOString() },
      repeatCounts: { rep_workout_complete: 2 },
      newlyUnlocked: ['first_workout'],
      levelUpTo: 3,
    });
    useExerciseStore.setState({
      favoriteIds: ['exercise-1'],
      exerciseRestDurations: { 'exercise-1': 120 },
      persistentNotes: { 'exercise-1': 'Seat 4' },
    });
    useBodyMetricStore.setState({
      metrics: [
        {
          id: 'metric-1',
          userId: 'user-1',
          recordedAt: date,
          weightKg: 80,
          createdAt: date,
        },
      ],
    });
    useCaffeineStore.setState({ isEnabled: false, currentWorkoutMg: 420, lastWorkoutMg: 300 });
    useHydrationStore.setState({
      dateKey: '2026-06-01',
      dailyGoalMl: 3500,
      todayIntakeMl: 1250,
    });

    useCoachStore.setState({
      messages: [
        { id: 'test-message', role: 'user', content: 'Private test note', createdAt: date },
      ],
    });
    await useProfileStore.getState().clearAllData();

    expect(useHistoryStore.getState().sessions).toHaveLength(0);
    expect(useSyncStore.getState().queue).toHaveLength(0);
    expect(useCoachStore.getState().messages).toHaveLength(0);
    expect(useSyncStore.getState().isSyncing).toBe(false);
    expect(useCoachStore.getState().isSending).toBe(false);
    expect(useWorkoutStore.getState().status).toBe('idle');
    expect(useWorkoutStore.getState().lastFinishedSession).toBeUndefined();
    expect(useAchievementStore.getState().xp).toBe(0);
    expect(useAchievementStore.getState().newlyUnlocked).toEqual([]);
    expect(useExerciseStore.getState().favoriteIds).toEqual([]);
    expect(useExerciseStore.getState().persistentNotes).toEqual({});
    expect(useBodyMetricStore.getState().metrics).toEqual([]);
    expect(useProgramStore.getState().programs).toEqual(getDefaultPrograms());
    expect(useProgramStore.getState().templates).toEqual(getDefaultTemplates());
    expect(useCaffeineStore.getState().isEnabled).toBe(true);
    expect(useCaffeineStore.getState().currentWorkoutMg).toBe(0);
    expect(useCaffeineStore.getState().lastWorkoutMg).toBe(0);
    expect(useHydrationStore.getState().dailyGoalMl).toBe(2500);
    expect(useHydrationStore.getState().todayIntakeMl).toBe(0);
  });
});
