import {
  WorkoutSession,
  WorkoutTemplate,
  getWorkoutsForDate,
  hasWorkoutOnDate,
  toLocalDateKey,
  calculateAge,
  parseBirthDateInput,
  calculateBMI,
} from '@fitness-tracker/domain';
import { useWorkoutStore } from '../stores/workoutStore';
import { useHistoryStore } from '../stores/historyStore';
import { useProgramStore } from '../stores/programStore';
import { useProfileStore } from '../stores/profileStore';
import { useAchievementStore } from '../stores/achievementStore';
import { useCoachStore } from '../stores/coachStore';
import { sanitizeDiagnosticMeta } from '../services/diagnosticsService';

const mockStreamCoachResponse = jest.fn();

jest.mock('../utils/coachApi', () => ({
  streamCoachResponse: (...args: unknown[]) => mockStreamCoachResponse(...args),
  checkConnectivity: jest.fn().mockResolvedValue(true),
}));

jest.mock('react-native-mmkv', () => ({
  MMKV: jest.fn().mockImplementation(() => ({
    set: jest.fn(),
    getString: jest.fn(),
    delete: jest.fn(),
  })),
}));

jest.mock('expo-crypto', () => {
  let counter = 5000;
  return {
    randomUUID: () => `test-uuid-${++counter}`,
  };
});

describe('Targeted UI/UX Enhancements Regression Suite', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    useWorkoutStore.getState().resetWorkout();
    useHistoryStore.getState().clearHistory();
    useProgramStore.setState({ programs: [], templates: [], customFolders: [] });
    useProfileStore.setState({
      profile: { displayName: 'User', preferredUnits: 'metric' },
    });
    useAchievementStore.getState().resetAchievements();
  });

  describe('PHASE A: History Interactive Calendar Logic', () => {
    const createMockSession = (id: string, date: Date, name: string): WorkoutSession => ({
      id,
      userId: 'user-1',
      name,
      startedAt: date,
      completedAt: new Date(date.getTime() + 3600000),
      durationSeconds: 3600,
      exercises: [],
      createdAt: date,
      updatedAt: date,
    });

    test('correctly identifies empty days with 0 workouts', () => {
      const sessions: WorkoutSession[] = [];
      const testDate = new Date(2026, 8, 15); // Sep 15, 2026
      expect(hasWorkoutOnDate(sessions, testDate)).toBe(false);
      expect(getWorkoutsForDate(sessions, testDate)).toEqual([]);
    });

    test('correctly identifies single and multiple workouts on the same day', () => {
      const day = new Date(2026, 8, 15, 10, 0, 0);
      const session1 = createMockSession('s1', new Date(2026, 8, 15, 9, 30), 'Push Day');
      const session2 = createMockSession('s2', new Date(2026, 8, 15, 18, 0), 'Abendtraining');

      const sessions = [session1, session2];

      expect(hasWorkoutOnDate(sessions, day)).toBe(true);
      const matched = getWorkoutsForDate(sessions, day);
      expect(matched.length).toBe(2);
      expect(matched[0]?.name).toBe('Push Day');
      expect(matched[1]?.name).toBe('Abendtraining');
    });

    test('preserves local date boundary at 23:30 without UTC day shift', () => {
      // Workout started late evening local time
      const lateEvening = new Date(2026, 8, 18, 23, 30, 0);
      const nextMorning = new Date(2026, 8, 19, 8, 0, 0);

      const session = createMockSession('late-1', lateEvening, 'Night Session');
      const sessions = [session];

      // Must be present on Sep 18
      expect(hasWorkoutOnDate(sessions, new Date(2026, 8, 18, 12, 0, 0))).toBe(true);
      expect(getWorkoutsForDate(sessions, new Date(2026, 8, 18, 12, 0, 0)).length).toBe(1);

      // Must NOT bleed into Sep 19
      expect(hasWorkoutOnDate(sessions, nextMorning)).toBe(false);
      expect(getWorkoutsForDate(sessions, nextMorning)).toEqual([]);
    });

    test('toLocalDateKey produces expected YYYY-MM-DD format', () => {
      const date = new Date(2026, 0, 5, 23, 59); // Jan 5, 2026
      expect(toLocalDateKey(date)).toBe('2026-01-05');
    });
  });

  describe('PHASE B: Plans & Direct Template / Program Creation', () => {
    test('creating and configuring a template saves to store without affecting workout history', () => {
      const templateStore = useProgramStore.getState();
      const initialSessionCount = useHistoryStore.getState().sessions.length;
      const initialStats = useProfileStore.getState().getStatistics();
      const initialXP = useAchievementStore.getState().xp;

      const now = new Date();
      const newTemplate: WorkoutTemplate = {
        id: 'tmpl-101',
        userId: 'user-1',
        name: 'Upper Hypertrophy',
        isArchived: false,
        createdAt: now,
        updatedAt: now,
        exercises: [
          {
            id: 'item-1',
            exerciseId: 'ex-bench',
            order: 0,
            targetSets: 4,
            targetReps: 10,
            targetRestSeconds: 90,
          },
          {
            id: 'item-2',
            exerciseId: 'ex-row',
            order: 1,
            targetSets: 3,
            targetReps: 12,
            targetRestSeconds: 60,
          },
        ],
      };

      templateStore.createTemplate(newTemplate);

      // 1. Template is saved and accessible
      const savedTemplates = useProgramStore.getState().templates;
      const found = savedTemplates.find((t) => t.id === 'tmpl-101');
      expect(found).toBeDefined();
      expect(found?.name).toBe('Upper Hypertrophy');
      expect(found?.exercises.length).toBe(2);

      // 2. CRITICAL: ZERO workout execution side effects
      expect(useHistoryStore.getState().sessions.length).toBe(initialSessionCount);
      const afterStats = useProfileStore.getState().getStatistics();
      expect(afterStats.totalWorkouts).toBe(initialStats.totalWorkouts);
      expect(afterStats.currentStreak).toBe(initialStats.currentStreak);
      expect(afterStats.totalVolume).toBe(initialStats.totalVolume);
      expect(useAchievementStore.getState().xp).toBe(initialXP);
    });

    test('creating a program directly assigns templates without side effects', () => {
      const programStore = useProgramStore.getState();
      const initialSessions = useHistoryStore.getState().sessions.length;

      programStore.createProgram({
        id: 'prog-200',
        name: 'Upper Lower Split 4x',
        description: '4-day hypertrophy split',
        durationWeeks: 6,
      });

      const prog = useProgramStore.getState().programs.find((p) => p.id === 'prog-200');
      expect(prog).toBeDefined();
      expect(prog?.name).toBe('Upper Lower Split 4x');
      expect(prog?.durationWeeks).toBe(6);

      // Zero workout side effects
      expect(useHistoryStore.getState().sessions.length).toBe(initialSessions);
      expect(useAchievementStore.getState().xp).toBe(0);
    });

    test('deleting a template removes it cleanly', () => {
      const programStore = useProgramStore.getState();
      programStore.createTemplate({
        id: 'tmpl-del',
        userId: 'user-1',
        name: 'To Delete',
        isArchived: false,
        createdAt: new Date(),
        updatedAt: new Date(),
        exercises: [],
      });

      expect(useProgramStore.getState().templates.some((t) => t.id === 'tmpl-del')).toBe(true);
      programStore.deleteTemplate('tmpl-del');
      expect(useProgramStore.getState().templates.some((t) => t.id === 'tmpl-del')).toBe(false);
    });
  });

  describe('PHASE C: Profile Personalization, Age & Privacy', () => {
    test('profile without age defaults cleanly to undefined and calculateAge returns undefined', () => {
      const profile = useProfileStore.getState().profile;
      expect(profile.dateOfBirth).toBeUndefined();
      expect(profile.birthYear).toBeUndefined();
      expect(calculateAge(profile.dateOfBirth || profile.birthYear)).toBeUndefined();
    });

    test('age calculation is accurate for full birth date and birth year', () => {
      const currentYear = new Date().getFullYear();
      // Year only
      expect(calculateAge(2000)).toBe(currentYear - 2000);

      // ISO string
      expect(calculateAge('2000-01-01')).toBeGreaterThanOrEqual(currentYear - 2000 - 1);

      // Invalid input yields undefined
      expect(calculateAge('invalid-date')).toBeUndefined();
      expect(calculateAge(1800)).toBeUndefined();
      expect(calculateAge(currentYear + 5)).toBeUndefined();
    });

    test('parseBirthDateInput handles multiple valid user formats', () => {
      // YYYY-MM-DD
      const res1 = parseBirthDateInput('1995-04-20');
      expect(res1.isValid).toBe(true);
      expect(res1.birthYear).toBe(1995);
      expect(res1.normalizedIso).toBe('1995-04-20');

      // DD.MM.YYYY
      const res2 = parseBirthDateInput('20.04.1995');
      expect(res2.isValid).toBe(true);
      expect(res2.birthYear).toBe(1995);
      expect(res2.normalizedIso).toBe('1995-04-20');

      // YYYY
      const res3 = parseBirthDateInput('1995');
      expect(res3.isValid).toBe(true);
      expect(res3.birthYear).toBe(1995);
      expect(res3.normalizedIso).toBeUndefined();

      // Invalid
      expect(parseBirthDateInput('abc').isValid).toBe(false);
      expect(parseBirthDateInput('1850').isValid).toBe(false);
    });

    test('BMI calculation follows canonical weight / height^2 without age/sex bias', () => {
      // 80 kg, 180 cm -> 80 / (1.8^2) = 24.69 -> 24.7
      const bmi = calculateBMI(80, 180);
      expect(bmi).toBe(24.7);

      // Invalid inputs
      expect(calculateBMI(0, 180)).toBeNull();
      expect(calculateBMI(80, 0)).toBeNull();
    });

    test('profile updates persist dateOfBirth and birthYear', () => {
      useProfileStore.getState().updateProfile({
        dateOfBirth: '1996-08-12',
        birthYear: 1996,
        fitnessGoal: 'build_muscle',
        experienceLevel: 'intermediate',
        biologicalSex: 'female',
      });

      const p = useProfileStore.getState().profile;
      expect(p.dateOfBirth).toBe('1996-08-12');
      expect(p.birthYear).toBe(1996);
      expect(p.fitnessGoal).toBe('build_muscle');
      expect(p.experienceLevel).toBe('intermediate');
      expect(p.biologicalSex).toBe('female');
    });

    test('exportData includes personal fields and clearAllData wipes them completely', async () => {
      useProfileStore.getState().updateProfile({
        dateOfBirth: '1992-03-15',
        birthYear: 1992,
      });

      const jsonStr = useProfileStore.getState().exportData();
      const parsed = JSON.parse(jsonStr);
      expect(parsed.profile.dateOfBirth).toBe('1992-03-15');
      expect(parsed.profile.birthYear).toBe(1992);

      // Clear all data
      await useProfileStore.getState().clearAllData();
      const wiped = useProfileStore.getState().profile;
      expect(wiped.dateOfBirth).toBeUndefined();
      expect(wiped.birthYear).toBeUndefined();
    });

    test('diagnostics service strictly redacts personal fields and biometrics', () => {
      const sensitiveMeta = {
        age: 28,
        birthdate: '1998-05-14',
        dateofbirth: '1998-05-14',
        birthyear: 1998,
        sex: 'male',
        biologicalsex: 'male',
        height: 182,
        heightcm: 182,
        weight: 85,
        weightkg: 85,
        allowedCode: 'ERR_TIMEOUT',
      };

      const sanitized = sanitizeDiagnosticMeta(sensitiveMeta);
      expect(sanitized).toBeDefined();
      expect(sanitized?.allowedCode).toBe('ERR_TIMEOUT');
      expect(sanitized?.age).toBeUndefined();
      expect(sanitized?.birthdate).toBeUndefined();
      expect(sanitized?.dateofbirth).toBeUndefined();
      expect(sanitized?.birthyear).toBeUndefined();
      expect(sanitized?.sex).toBeUndefined();
      expect(sanitized?.biologicalsex).toBeUndefined();
      expect(sanitized?.height).toBeUndefined();
      expect(sanitized?.heightcm).toBeUndefined();
      expect(sanitized?.weight).toBeUndefined();
      expect(sanitized?.weightkg).toBeUndefined();
    });

    test('coach context receives computed age only, never exact dateOfBirth', async () => {
      useProfileStore.getState().updateProfile({
        displayName: 'TestAthlete',
        dateOfBirth: '2000-01-01',
        birthYear: 2000,
        experienceLevel: 'advanced',
        fitnessGoal: 'gain_strength',
      });
      useProfileStore.getState().setAiConsent();

      mockStreamCoachResponse.mockImplementation(async function* () {
        yield 'Hello!';
      });

      await useCoachStore.getState().sendMessage('Give me advice');

      expect(mockStreamCoachResponse).toHaveBeenCalled();
      const passedContext = mockStreamCoachResponse.mock.calls[0][1];

      // Age must be present as a computed number
      expect(typeof passedContext.profile.age).toBe('number');
      expect(passedContext.profile.age).toBeGreaterThanOrEqual(20);

      // CRITICAL: exact date of birth and birthYear must NOT be leaked
      expect((passedContext.profile as Record<string, unknown>).dateOfBirth).toBeUndefined();
      expect((passedContext.profile as Record<string, unknown>).birthYear).toBeUndefined();
    });
  });
});
