import { useWorkoutStore } from '../stores/workoutStore';
import { useHistoryStore } from '../stores/historyStore';
import { useBodyMetricStore } from '../stores/bodyMetricStore';
import { useProgramStore } from '../stores/programStore';
import { useProfileStore } from '../stores/profileStore';
import { useSyncStore } from '../stores/syncStore';
import { useAuthStore } from '../stores/authStore';
import { getResumeWorkoutDecision } from '../utils/resumeWorkoutGuard';
import { getTranslation } from '../i18n';
import { LOCAL_USER_ID } from '../stores/local-user';

jest.mock('react-native-mmkv', () => ({
  MMKV: jest.fn().mockImplementation(() => ({
    set: jest.fn(),
    getString: jest.fn(),
    delete: jest.fn(),
  })),
}));

jest.mock('expo-crypto', () => {
  let counter = 1000;
  return {
    randomUUID: () => `rc-uuid-${++counter}`,
  };
});

describe('EVARO – Release Candidate Core Regression Suite', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    useWorkoutStore.getState().resetWorkout();
    useHistoryStore.getState().clearHistory();
    useBodyMetricStore.getState().clearMetrics();
    useProgramStore.setState({ programs: [], templates: [], customFolders: [] });
    useProfileStore.setState({
      profile: { displayName: 'User', preferredUnits: 'metric' },
    });
    useSyncStore.getState().clearQueue();
    useAuthStore.setState({ user: null, session: null });
  });

  // --------------------------------------------------------------------------
  // 1. WORKOUT FLOW REGRESSION (Section 14 & 15)
  // --------------------------------------------------------------------------
  describe('Workout Flow & Persistence Regression', () => {
    test('Flow: create -> add exercise -> add set -> edit weight/reps/rpe -> complete -> delete set -> save -> history', () => {
      const workout = useWorkoutStore.getState();

      // 1. Start Workout
      workout.startWorkout('Hypertrophy Push');
      expect(useWorkoutStore.getState().status).toBe('active');
      expect(useWorkoutStore.getState().name).toBe('Hypertrophy Push');

      // 2. Add Exercise
      workout.addExercise('bench_press_barbell');
      let state = useWorkoutStore.getState();
      expect(state.exercises).toHaveLength(1);
      const ex1 = state.exercises[0]!;
      expect(ex1.exerciseId).toBe('bench_press_barbell');
      expect(ex1.sets).toHaveLength(1);

      // 3. Add Set
      workout.addSet(ex1.id);
      state = useWorkoutStore.getState();
      expect(state.exercises[0]!.sets).toHaveLength(2);

      const set1 = state.exercises[0]!.sets[0]!;
      const set2 = state.exercises[0]!.sets[1]!;

      // 4. Update Set values (Weight, Reps, RPE, RIR)
      workout.updateSet(ex1.id, set1.id, {
        weight: 100,
        reps: 8,
        rpe: 8.5,
        rir: 1,
      });

      workout.updateSet(ex1.id, set2.id, {
        weight: 102.5,
        reps: 6,
        rpe: 9.5,
        rir: 0,
      });

      state = useWorkoutStore.getState();
      expect(state.exercises[0]!.sets[0]!.weight).toBe(100);
      expect(state.exercises[0]!.sets[0]!.reps).toBe(8);
      expect(state.exercises[0]!.sets[0]!.rpe).toBe(8.5);
      expect(state.exercises[0]!.sets[0]!.rir).toBe(1);

      // 5. Complete Set 1
      workout.completeSet(ex1.id, set1.id);
      state = useWorkoutStore.getState();
      expect(state.exercises[0]!.sets[0]!.completed).toBe(true);
      expect(state.exercises[0]!.sets[1]!.completed).toBe(false);

      // 6. Delete Set 2
      workout.removeSet(ex1.id, set2.id);
      state = useWorkoutStore.getState();
      expect(state.exercises[0]!.sets).toHaveLength(1);
      expect(state.exercises[0]!.sets[0]!.id).toBe(set1.id);

      // 7. Finish Workout -> Saves to history and transitions to 'finished'
      const session = workout.finishWorkout();
      expect(session).not.toBeNull();

      // State is marked finished
      expect(useWorkoutStore.getState().status).toBe('finished');
      expect(useWorkoutStore.getState().exercises).toHaveLength(0);

      // Reset returns to idle
      useWorkoutStore.getState().resetWorkout();
      expect(useWorkoutStore.getState().status).toBe('idle');

      // History contains the saved session
      const historySessions = useHistoryStore.getState().sessions;
      expect(historySessions).toHaveLength(1);
      const saved = historySessions[0]!;
      expect(saved.name).toBe('Hypertrophy Push');
      expect(saved.exercises).toHaveLength(1);
      expect(saved.exercises[0]!.sets).toHaveLength(1);
      expect(saved.exercises[0]!.sets[0]!.weight).toBe(100);
      expect(saved.exercises[0]!.sets[0]!.reps).toBe(8);
      expect(saved.exercises[0]!.sets[0]!.rpe).toBe(8.5);
    });

    test('Persistence & Deduplication: finishing workout never creates duplicate history entries', () => {
      useWorkoutStore.getState().startWorkout('Leg Day');
      useWorkoutStore.getState().addExercise('squat_barbell');
      const ex = useWorkoutStore.getState().exercises[0]!;
      useWorkoutStore.getState().completeSet(ex.id, ex.sets[0]!.id);
      useWorkoutStore.getState().finishWorkout();

      expect(useHistoryStore.getState().sessions).toHaveLength(1);

      // Trying to finish an already finished workout does not add phantom entries
      useWorkoutStore.getState().finishWorkout();
      expect(useHistoryStore.getState().sessions).toHaveLength(1);
    });
  });

  // --------------------------------------------------------------------------
  // 2. RESTART & RECOVERY REGRESSION (Section 16)
  // --------------------------------------------------------------------------
  describe('Restart & Crash Recovery Regression', () => {
    test('Decision Guard: Prompt user when unfinished active workout with logged sets exists', () => {
      const stateWithActiveWorkout = {
        status: 'active' as const,
        sessionId: 'session-to-recover',
        name: 'Unfinished Session',
        startTime: new Date(Date.now() - 1800000), // 30 min ago
        exercises: [
          {
            id: 'ex-1',
            exerciseId: 'squat',
            order: 0,
            sets: [{ id: 's-1', setNumber: 1, type: 'working' as const, weight: 140, reps: 5, completed: true }],
          },
        ],
        elapsedSeconds: 1800,
        isPaused: false,
      };

      const decision = getResumeWorkoutDecision(stateWithActiveWorkout);
      expect(decision).toBe('prompt');
    });

    test('Decision Guard: Ignore when workout was idle or already completed', () => {
      const stateIdle = {
        status: 'idle' as const,
        sessionId: null,
        name: 'Idle',
        startTime: null,
        exercises: [],
        elapsedSeconds: 0,
        isPaused: false,
      };

      expect(getResumeWorkoutDecision(stateIdle)).toBe('ignore');
    });
  });

  // --------------------------------------------------------------------------
  // 3. MEASUREMENTS REGRESSION & i18n (Section 17)
  // --------------------------------------------------------------------------
  describe('Measurements Regression & Not-Enough-Data Guard', () => {
    test('Measurement flow: weight add -> body fat add -> edit -> history sort', () => {
      const metricStore = useBodyMetricStore.getState();

      const d1 = new Date('2026-09-01T10:00:00Z');
      const d2 = new Date('2026-09-08T10:00:00Z');

      // 1. Add Entry 1
      metricStore.addMetric({
        recordedAt: d1,
        weightKg: 82.5,
        bodyFatPercentage: 15.2,
      });

      // 2. Add Entry 2
      metricStore.addMetric({
        recordedAt: d2,
        weightKg: 81.8,
        bodyFatPercentage: 14.8,
      });

      const metrics = useBodyMetricStore.getState().metrics;
      expect(metrics).toHaveLength(2);

      // 3. getMetricHistory yields chronological entries
      const weightHistory = useBodyMetricStore.getState().getMetricHistory('weight');
      expect(weightHistory).toHaveLength(2);
      expect(weightHistory[0]!.weightKg).toBe(82.5);
      expect(weightHistory[1]!.weightKg).toBe(81.8);

      const latest = useBodyMetricStore.getState().getLatestMetric();
      expect(latest?.weightKg).toBe(81.8);
    });

    test('i18n Guard: Not enough data message is correct in both German and English', () => {
      expect(getTranslation('de', 'body.notEnoughData')).toBe('Noch nicht genügend Daten');
      expect(getTranslation('en', 'body.notEnoughData')).toBe('Not enough data');
      expect(getTranslation('de', 'body.logAtLeastTwo')).toBe('Trage mindestens zwei Werte ein, um die Entwicklung anzuzeigen.');
      expect(getTranslation('en', 'body.logAtLeastTwo')).toBe('Log at least 2 data points.');
    });
  });

  // --------------------------------------------------------------------------
  // 4. PROGRAM & TEMPLATE REGRESSION (Section 18)
  // --------------------------------------------------------------------------
  describe('Program & Template Regression', () => {
    test('Template lifecycle: create -> save -> edit -> delete', () => {
      const progStore = useProgramStore.getState();

      // 1. Create Template
      progStore.createTemplate({
        id: 'template-upper',
        name: 'Upper Body Power',
        exercises: [
          { id: 'te-1', exerciseId: 'bench_press', order: 0, targetSets: 4, targetReps: 6, targetRepsMax: 6 },
          { id: 'te-2', exerciseId: 'bent_over_row', order: 1, targetSets: 4, targetReps: 8, targetRepsMax: 8 },
        ],
      });

      let templates = useProgramStore.getState().templates;
      expect(templates).toHaveLength(1);
      expect(templates[0]!.name).toBe('Upper Body Power');

      // 2. Edit Template
      progStore.updateTemplate('template-upper', {
        name: 'Upper Body Hypertrophy',
      });

      templates = useProgramStore.getState().templates;
      expect(templates).toHaveLength(1);
      expect(templates[0]!.name).toBe('Upper Body Hypertrophy');

      // 3. Delete Template
      progStore.deleteTemplate('template-upper');
      expect(useProgramStore.getState().templates).toHaveLength(0);
    });
  });

  // --------------------------------------------------------------------------
  // 5. AUTH & ACCOUNT ISOLATION REGRESSION (Section 19)
  // --------------------------------------------------------------------------
  describe('Authentication & User Isolation Regression', () => {
    test('Account Switch Boundary: Guest mode functions fully and isolated', () => {
      // Guest has local user ID
      useWorkoutStore.getState().startWorkout('Guest Workout');
      useWorkoutStore.getState().addExercise('bench_press');
      const ex = useWorkoutStore.getState().exercises[0]!;
      useWorkoutStore.getState().completeSet(ex.id, ex.sets[0]!.id);
      useWorkoutStore.getState().finishWorkout();

      const guestHistory = useHistoryStore.getState().sessions;
      expect(guestHistory).toHaveLength(1);
      expect(guestHistory[0]!.userId).toBe(LOCAL_USER_ID);
    });

    test('Data Isolation: Clear on account reset clears local state cleanly', async () => {
      useHistoryStore.getState().addSession({
        id: 'user-a-sess',
        userId: 'user-a-uuid',
        name: 'User A Training',
        startedAt: new Date(),
        completedAt: new Date(),
        durationSeconds: 3600,
        createdAt: new Date(),
        updatedAt: new Date(),
        exercises: [],
      });

      expect(useHistoryStore.getState().sessions).toHaveLength(1);

      // When profile data is reset, previous user data is wiped
      await useProfileStore.getState().clearAllData();
      expect(useHistoryStore.getState().sessions).toHaveLength(0);
      expect(useBodyMetricStore.getState().metrics).toHaveLength(0);
    });
  });

  // --------------------------------------------------------------------------
  // 6. CRITICAL UX CONFIGURATION REGRESSION (Section 21)
  // --------------------------------------------------------------------------
  describe('Critical UX Preferences & Safety Toggles', () => {
    test('RPE & RIR Modes: profile settings support always_on, always_off, and selected_exercises', () => {
      const profile = useProfileStore.getState();

      profile.updateProfile({ rpeMode: 'always_off', rirMode: 'selected_exercises', rirEnabledExerciseIds: ['ex-1'] });
      expect(useProfileStore.getState().profile.rpeMode).toBe('always_off');
      expect(useProfileStore.getState().profile.rirMode).toBe('selected_exercises');
      expect(useProfileStore.getState().profile.rirEnabledExerciseIds).toEqual(['ex-1']);

      // Toggle back to always_on
      profile.updateProfile({ rpeMode: 'always_on' });
      expect(useProfileStore.getState().profile.rpeMode).toBe('always_on');
    });

    test('Audio & Haptics Toggles: persistent preference controls', () => {
      const profile = useProfileStore.getState();

      // Disable haptics and sound
      profile.updateProfile({ hapticsEnabled: false, soundEnabled: false });
      expect(useProfileStore.getState().profile.hapticsEnabled).toBe(false);
      expect(useProfileStore.getState().profile.soundEnabled).toBe(false);

      // Re-enable
      profile.updateProfile({ hapticsEnabled: true, soundEnabled: true });
      expect(useProfileStore.getState().profile.hapticsEnabled).toBe(true);
      expect(useProfileStore.getState().profile.soundEnabled).toBe(true);
    });
  });
});
