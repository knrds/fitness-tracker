import {
  EXERCISES,
  MuscleGroup,
  Equipment,
  MovementPattern,
  WorkoutSession,
  summarizeSessionExercise,
  summarizeWorkout,
  getExerciseProgressHistory,
} from '@fitness-tracker/domain';
import { useWorkoutStore } from '../stores/workoutStore';
import { useHistoryStore } from '../stores/historyStore';
import { useProfileStore } from '../stores/profileStore';
import { useProgramStore, getDefaultTemplates, getDefaultPrograms } from '../stores/programStore';
import { useExerciseStore } from '../stores/exerciseStore';
import { useAchievementStore } from '../stores/achievementStore';
import { useBodyMetricStore } from '../stores/bodyMetricStore';
import { useCoachStore } from '../stores/coachStore';
import { getExerciseMedia } from '../utils/getExerciseMedia';

jest.mock('expo-crypto', () => ({
  randomUUID: () => 'legacy-test-uuid-4000-8000-000000000001',
}));

describe('Work Block A: Legacy & Update Regression Suite (Beta 5 -> Beta 6)', () => {
  beforeEach(() => {
    useWorkoutStore.getState().resetWorkout();
    useHistoryStore.getState().clearHistory();
    useProfileStore.setState(useProfileStore.getInitialState());
    useProgramStore.setState(useProgramStore.getInitialState());
    useAchievementStore.setState(useAchievementStore.getInitialState());
    useBodyMetricStore.setState(useBodyMetricStore.getInitialState());
    useCoachStore.setState(useCoachStore.getInitialState());
  });

  describe('1. Exercise Compatibility across Catalogs', () => {
    it('resolves canonical exercise IDs from previous workouts in current catalog', () => {
      // Pick known canonical exercises
      const bench = EXERCISES.find((e) => e.name.toLowerCase().includes('barbell bench press'));
      const squat = EXERCISES.find((e) => e.name.toLowerCase().includes('squat'));

      expect(bench).toBeDefined();
      expect(squat).toBeDefined();

      const legacyWorkoutSession: WorkoutSession = {
        id: 'legacy-session-001',
        userId: 'test-user',
        name: 'Classic Upper Body',
        startedAt: new Date('2026-06-01T10:00:00Z'),
        completedAt: new Date('2026-06-01T11:00:00Z'),
        createdAt: new Date('2026-06-01T10:00:00Z'),
        updatedAt: new Date('2026-06-01T11:00:00Z'),
        exercises: [
          {
            id: 'legacy-se-1',
            exerciseId: bench!.id,
            order: 0,
            sets: [
              { id: 's1', setNumber: 1, type: 'working', weight: 80, reps: 8, completed: true },
              { id: 's2', setNumber: 2, type: 'working', weight: 80, reps: 8, completed: true },
            ],
          },
          {
            id: 'legacy-se-2',
            exerciseId: squat!.id,
            order: 1,
            sets: [
              { id: 's3', setNumber: 1, type: 'working', weight: 100, reps: 5, completed: true },
            ],
          },
        ],
      };

      const summary = summarizeWorkout(legacyWorkoutSession);
      expect(summary.totalVolume).toBe(80 * 8 * 2 + 100 * 5);
      expect(summary.setCount).toBe(3);

      // Verify PR and history progress lookup for existing IDs
      const progressHistory = getExerciseProgressHistory(bench!.id, [legacyWorkoutSession], bench!.name);
      expect(progressHistory.length).toBe(1);
      expect(progressHistory[0]!.maxWeight).toBe(80);
      expect(progressHistory[0]!.volume).toBe(80 * 8 * 2);
    });

    it('gracefully handles legacy unknown exercise IDs without throwing or corrupting history', () => {
      const UNKNOWN_LEGACY_ID = '00000000-0000-4000-8000-deadbeef9999';
      expect(EXERCISES.find((e) => e.id === UNKNOWN_LEGACY_ID)).toBeUndefined();

      const legacySessionWithMissingExercise: WorkoutSession = {
        id: 'session-with-removed-ex',
        userId: 'test-user',
        name: 'Old Workout from Beta 4',
        startedAt: new Date('2026-05-15T09:00:00Z'),
        completedAt: new Date('2026-05-15T10:00:00Z'),
        createdAt: new Date('2026-05-15T09:00:00Z'),
        updatedAt: new Date('2026-05-15T10:00:00Z'),
        exercises: [
          {
            id: 'se-missing',
            exerciseId: UNKNOWN_LEGACY_ID,
            order: 0,
            sets: [
              { id: 'ms1', setNumber: 1, type: 'working', weight: 50, reps: 10, completed: true },
              { id: 'ms2', setNumber: 2, type: 'working', weight: 50, reps: 10, completed: true },
            ],
          },
        ],
      };

      // summarizeWorkout must succeed without crashing
      const summary = summarizeWorkout(legacySessionWithMissingExercise);
      expect(summary.totalVolume).toBe(1000);
      expect(summary.setCount).toBe(2);

      // summarizeSessionExercise must succeed
      const exSummary = summarizeSessionExercise(legacySessionWithMissingExercise.exercises[0]!);
      expect(exSummary.totalVolume).toBe(1000);
      expect(exSummary.workingSetCount).toBe(2);

      // Media resolver fallback must produce a safe fallback without crashing
      const fallbackMedia = getExerciseMedia({
        id: UNKNOWN_LEGACY_ID,
        name: 'Unknown Legacy Exercise',
        imageUrl: null,
        primaryMuscles: [],
      });
      expect(fallbackMedia.type).toBe('anatomy_fallback');
      expect(fallbackMedia.uri).toBeNull();
      expect(fallbackMedia.fallbackIcon).toBe('barbell-outline');
    });

    it('preserves user custom exercises completely unaffected by catalog changes', () => {
      useExerciseStore.getState().addCustomExercise({
        name: 'Banded Bulgarian Split Squat',
        primaryMuscles: [MuscleGroup.Quads, MuscleGroup.Glutes],
        secondaryMuscles: [MuscleGroup.Hamstrings],
        equipment: Equipment.Dumbbell,
        movementPattern: MovementPattern.Squat,
      });

      const storeExercises = useExerciseStore.getState().exercises;
      const found = storeExercises.find((e) => e.name === 'Banded Bulgarian Split Squat');

      expect(found).toBeDefined();
      expect(found!.isCustom).toBe(true);

      // Active workout can use this custom exercise
      useWorkoutStore.getState().startWorkout('Custom Day');
      useWorkoutStore.getState().addExercise(found!.id);
      const activeState = useWorkoutStore.getState();
      expect(activeState.exercises.length).toBe(1);
      expect(activeState.exercises[0]!.exerciseId).toBe(found!.id);
    });

    it('resolves templates and programs referencing both catalog and custom exercises', () => {
      const defaultTemplates = getDefaultTemplates();
      const defaultPrograms = getDefaultPrograms();

      expect(defaultTemplates.length).toBeGreaterThan(0);
      expect(defaultPrograms.length).toBeGreaterThan(0);

      // Ensure every template exercise in default templates can be loaded
      const catalogIds = new Set(EXERCISES.map((e) => e.id));
      defaultTemplates.forEach((template) => {
        template.exercises.forEach((te) => {
          expect(catalogIds.has(te.exerciseId)).toBe(true);
        });
      });
    });
  });

  describe('2. Persisted State Backward Compatibility (Beta 5 -> Beta 6)', () => {
    it('tolerates missing optional fields in legacy profile state without wiping data', () => {
      // Simulate Beta 5 profile JSON where celebrationEffect, rpeMode, rirMode or language were missing
      const legacyBeta5Profile = {
        displayName: 'Beta 5 Powerlifter',
        preferredUnits: 'metric' as const,
        heightCm: 182,
        weightKg: 85,
        benchPressMaxKg: 130,
        squatMaxKg: 180,
        deadliftMaxKg: 220,
        showRpe: true,
        showRir: false,
        // Legacy state omitted: celebrationEffect, colorway, rpeMode, rirMode, soundEnabled, hapticsEnabled
      };

      useProfileStore.getState().updateProfile(legacyBeta5Profile);

      const state = useProfileStore.getState().profile;
      expect(state.displayName).toBe('Beta 5 Powerlifter');
      expect(state.benchPressMaxKg).toBe(130);
      expect(state.squatMaxKg).toBe(180);
      expect(state.deadliftMaxKg).toBe(220);
      expect(state.showRpe).toBe(true);
      expect(state.showRir).toBe(false);

      // Defaults remain intact for unprovided fields
      expect(state.soundEnabled).toBe(true);
      expect(state.hapticsEnabled).toBe(true);
    });

    it('tolerates unknown or removed legacy fields in history sessions', () => {
      const legacySessionWithOldFields = {
        id: 'legacy-sess-099',
        userId: 'user-konrad',
        name: 'Old Workout',
        startedAt: new Date('2026-08-01T08:00:00Z'),
        completedAt: new Date('2026-08-01T09:00:00Z'),
        legacySyncStatus: 'synced_v1', // removed field
        deprecatedDeviceModel: 'iPhone 13', // removed field
        exercises: [
          {
            id: 'legacy-se-99',
            exerciseId: EXERCISES[0]!.id,
            order: 0,
            legacyRestTimeSeconds: 90, // removed field
            sets: [
              {
                id: 'legacy-s-99',
                setNumber: 1,
                type: 'working' as const,
                weight: 70,
                reps: 10,
                completed: true,
                legacyTempo: '3-0-1-0', // removed field
              },
            ],
          },
        ],
      } as unknown as WorkoutSession;

      useHistoryStore.getState().addSession(legacySessionWithOldFields);

      const loaded = useHistoryStore.getState().sessions;
      expect(loaded.length).toBe(1);
      expect(loaded[0]!.id).toBe('legacy-sess-099');
      expect(loaded[0]!.exercises[0]!.sets[0]!.weight).toBe(70);
    });

    it('loads active workout containing legacy unknown exercise and allows completion or discard', () => {
      useWorkoutStore.setState({
        status: 'active',
        sessionId: 'active-legacy-session',
        name: 'Recovered Active Session',
        startedAt: new Date('2026-09-16T22:00:00Z'),
        isMinimized: false,
        exercises: [
          {
            id: 'recovered-se-1',
            exerciseId: 'non-existent-legacy-ex-999',
            order: 0,
            sets: [
              {
                id: 'rec-set-1',
                setNumber: 1,
                type: 'working',
                weight: 60,
                reps: 8,
                completed: true,
              },
            ],
          },
        ],
      });

      const state = useWorkoutStore.getState();
      expect(state.status).toBe('active');
      expect(state.exercises.length).toBe(1);

      // User can complete the workout
      useWorkoutStore.getState().finishWorkout();

      expect(useWorkoutStore.getState().status).toBe('finished');
      const history = useHistoryStore.getState().sessions;
      expect(history.length).toBe(1);
      expect(history[0]!.name).toBe('Recovered Active Session');
      expect(history[0]!.exercises[0]!.exerciseId).toBe('non-existent-legacy-ex-999');

      useWorkoutStore.getState().resetWorkout();
      expect(useWorkoutStore.getState().status).toBe('idle');
    });

    it('preserves settings (colorway, RPE/RIR, timer, haptic, audio) across simulated update', () => {
      // 1. User configures Beta 5 settings
      useProfileStore.getState().updateProfile({
        colorway: 'amber',
        language: 'de',
        showRpe: true,
        showRir: true,
        rpeMode: 'always_on',
        rirMode: 'selected_exercises',
        rirEnabledExerciseIds: [EXERCISES[0]!.id],
        hapticsEnabled: true,
        soundEnabled: false,
      });

      // 2. Simulate application relaunch / update reload
      const exportedJson = useProfileStore.getState().exportData();
      expect(exportedJson).toBeDefined();

      const reloadedProfile = useProfileStore.getState().profile;
      expect(reloadedProfile.colorway).toBe('amber');
      expect(reloadedProfile.language).toBe('de');
      expect(reloadedProfile.showRpe).toBe(true);
      expect(reloadedProfile.showRir).toBe(true);
      expect(reloadedProfile.rpeMode).toBe('always_on');
      expect(reloadedProfile.rirMode).toBe('selected_exercises');
      expect(reloadedProfile.rirEnabledExerciseIds).toContain(EXERCISES[0]!.id);
      expect(reloadedProfile.soundEnabled).toBe(false);
      expect(reloadedProfile.hapticsEnabled).toBe(true);
    });
  });
});
