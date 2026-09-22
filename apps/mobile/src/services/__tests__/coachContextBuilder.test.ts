import {
  coachContextBuilder,
  getUserTrainingProfile,
  getTemplatesSummary,
  getTemplateById,
  getProgramsSummary,
  getProgramById,
  getActiveProgram,
  getNextProgramWorkout,
  getWorkoutHistorySummary,
  getRecentExerciseHistory,
  getExercisePerformance,
  getRelevantPRs,
  getRelevantMetrics,
  getCurrentTrainingState,
  buildResourceIndex,
  buildContextForQuery,
} from '../coachContextBuilder';
import { useProfileStore } from '../../stores/profileStore';
import { useExerciseStore } from '../../stores/exerciseStore';
import { useProgramStore } from '../../stores/programStore';
import { useHistoryStore } from '../../stores/historyStore';
import { useBodyMetricStore } from '../../stores/bodyMetricStore';
import { useAchievementStore } from '../../stores/achievementStore';
import { entitlementService } from '../entitlementService';
import {
  MuscleGroup,
  Equipment,
  MovementPattern,
  WorkoutSession,
  WorkoutTemplate,
  Program,
  Exercise,
} from '@fitness-tracker/domain';

jest.mock('../../stores/storage', () => ({
  createHydratedStorage: jest.fn(() => ({
    getItem: jest.fn(),
    setItem: jest.fn(),
    removeItem: jest.fn(),
  })),
}));

describe('coachContextBuilder', () => {
  const benchExerciseId = 'ex-bench-123';
  const squatExerciseId = 'ex-squat-456';

  const mockExercises: Exercise[] = [
    {
      id: benchExerciseId,
      name: 'Bankdrücken',
      primaryMuscles: [MuscleGroup.Chest],
      secondaryMuscles: [MuscleGroup.Triceps],
      equipment: Equipment.Barbell,
      isCustom: false,
      movementPattern: MovementPattern.HorizontalPush,
      createdAt: new Date('2026-01-01'),
      updatedAt: new Date('2026-01-01'),
    },
    {
      id: squatExerciseId,
      name: 'Kniebeuge',
      primaryMuscles: [MuscleGroup.Quads],
      secondaryMuscles: [MuscleGroup.Glutes],
      equipment: Equipment.Barbell,
      isCustom: false,
      movementPattern: MovementPattern.Squat,
      createdAt: new Date('2026-01-01'),
      updatedAt: new Date('2026-01-01'),
    },
  ];

  const mockTemplatePush: WorkoutTemplate = {
    id: 'tmpl-push-1',
    userId: 'user-1',
    name: 'Push Tag A',
    folder: 'PPL',
    isArchived: false,
    createdAt: new Date(),
    updatedAt: new Date(),
    exercises: [
      {
        id: 'te-1',
        exerciseId: benchExerciseId,
        order: 0,
        targetSets: 4,
        targetReps: 8,
        targetRepsMax: 10,
        targetWeight: 80,
        targetRpe: 8,
        targetRestSeconds: 120,
        notes: 'Pausen strikt einhalten für maximale Hypertrophie',
      },
    ],
  };

  const mockTemplateLegs: WorkoutTemplate = {
    id: 'tmpl-legs-1',
    userId: 'user-1',
    name: 'Leg Day',
    isArchived: false,
    createdAt: new Date(),
    updatedAt: new Date(),
    exercises: [
      {
        id: 'te-2',
        exerciseId: squatExerciseId,
        order: 0,
        targetSets: 5,
        targetReps: 5,
        targetWeight: 100,
      },
    ],
  };

  const mockProgram: Program = {
    id: 'prog-ppl-1',
    userId: 'user-1',
    name: 'PPL Hypertrophie',
    description: '6 Tage Push Pull Legs Routine',
    durationWeeks: 8,
    isActive: true,
    startedAt: new Date(Date.now() - 3 * 86400000), // 3 days ago
    createdAt: new Date(),
    updatedAt: new Date(),
    workouts: [
      {
        id: 'pw-1',
        templateId: 'tmpl-push-1',
        week: 1,
        dayOfWeek: 1,
        order: 0,
      },
      {
        id: 'pw-2',
        templateId: 'tmpl-legs-1',
        week: 1,
        dayOfWeek: 2,
        order: 0,
      },
    ],
  };

  const mockSession: WorkoutSession = {
    id: 'sess-1',
    userId: 'user-1',
    name: 'Push Workout',
    startedAt: new Date(Date.now() - 86400000), // yesterday
    durationSeconds: 3600,
    createdAt: new Date(),
    updatedAt: new Date(),
    exercises: [
      {
        id: 'se-1',
        exerciseId: benchExerciseId,
        order: 0,
        sets: [
          {
            id: 'set-1',
            setNumber: 1,
            type: 'working',
            weight: 80,
            reps: 8,
            completed: true,
            rpe: 8,
            rir: 2,
          },
          {
            id: 'set-2',
            setNumber: 2,
            type: 'working',
            weight: 85,
            reps: 6,
            completed: true,
            rpe: 9,
          },
        ],
      },
    ],
  };

  beforeEach(() => {
    jest.clearAllMocks();

    // Setup Profile
    useProfileStore.setState({
      profile: {
        displayName: 'Max Mustermann',
        birthYear: 1995,
        experienceLevel: 'intermediate',
        fitnessGoal: 'build_muscle',
        biologicalSex: 'male',
        preferredUnits: 'metric',
        heightCm: 182,
        weightKg: 82.5,
        benchPressMaxKg: 105,
        squatMaxKg: 140,
        deadliftMaxKg: 180,
        language: 'de',
        aiConsent: { version: 1, consentedAt: new Date().toISOString() },
      },
    });

    // Setup Exercise Store
    useExerciseStore.setState({
      exercises: mockExercises,
    });

    // Setup Program Store
    useProgramStore.setState({
      templates: [mockTemplatePush, mockTemplateLegs],
      programs: [mockProgram],
    });

    // Setup History Store
    useHistoryStore.setState({
      sessions: [mockSession],
    });

    // Setup Body Metric Store
    useBodyMetricStore.setState({
      metrics: [
        {
          id: 'metric-1',
          userId: 'user-1',
          weightKg: 82.5,
          bodyFatPercentage: 14.2,
          measurements: { waist: 81, chest: 104 },
          recordedAt: new Date(),
          createdAt: new Date(),
        },
      ],
    });

    // Setup Achievement Store
    useAchievementStore.setState({
      level: 5,
      xp: 1250,
      unlockedAchievements: { first_workout: new Date() },
    });

    // Default to Coach tier for unit tests
    jest.spyOn(entitlementService, 'getTier').mockReturnValue('coach');
  });

  describe('getUserTrainingProfile', () => {
    it('exports all builder methods on coachContextBuilder object', () => {
      expect(coachContextBuilder.buildContextForQuery).toBe(buildContextForQuery);
      expect(coachContextBuilder.getUserTrainingProfile).toBe(getUserTrainingProfile);
      expect(coachContextBuilder.buildResourceIndex).toBe(buildResourceIndex);
    });

    it('returns structured athlete profile without PII or sensitive keys', () => {
      const profile = getUserTrainingProfile();

      expect(profile.displayName).toBe('Max Mustermann');
      expect(profile.preferredUnits).toBe('metric');
      expect(profile.age).toBeDefined();
      expect(profile.experienceLevel).toBe('intermediate');
      expect(profile.fitnessGoal).toBe('build_muscle');
      expect(profile.heightCm).toBe(182);
      expect(profile.weightKg).toBe(82.5);
      expect(profile.benchPressMaxKg).toBe(105);

      // Verify zero PII leak
      const raw = JSON.stringify(profile);
      expect(raw).not.toContain('email');
      expect(raw).not.toContain('password');
      expect(raw).not.toContain('token');
      expect(raw).not.toContain('auth');
    });
  });

  describe('Template queries', () => {
    it('getTemplatesSummary returns list of templates with exercise names and set counts', () => {
      const summaries = getTemplatesSummary();
      expect(summaries.length).toBe(2);

      const pushSummary = summaries.find((s) => s.id === 'tmpl-push-1');
      expect(pushSummary).toBeDefined();
      expect(pushSummary?.name).toBe('Push Tag A');
      expect(pushSummary?.folder).toBe('PPL');
      expect(pushSummary?.exerciseCount).toBe(1);
      expect(pushSummary?.exerciseNames).toEqual(['Bankdrücken']);
      expect(pushSummary?.totalTargetSets).toBe(4);
    });

    it('getTemplateById returns detailed template with exercise parameters', () => {
      const template = getTemplateById('tmpl-push-1');
      expect(template).not.toBeNull();
      expect(template?.name).toBe('Push Tag A');
      expect(template?.exercises.length).toBe(1);
      expect(template?.exercises[0]?.name).toBe('Bankdrücken');
      expect(template?.exercises[0]?.targetSets).toBe(4);
      expect(template?.exercises[0]?.targetReps).toBe(8);
      expect(template?.exercises[0]?.targetRepsMax).toBe(10);
      expect(template?.exercises[0]?.targetWeight).toBe(80);
      expect(template?.exercises[0]?.notes).toContain('Pausen strikt einhalten');
    });

    it('getTemplateById returns null for unknown ID', () => {
      expect(getTemplateById('unknown-id')).toBeNull();
    });
  });

  describe('Program queries', () => {
    it('getProgramsSummary returns list of programs with metadata', () => {
      const programs = getProgramsSummary();
      expect(programs.length).toBe(1);
      expect(programs[0]?.name).toBe('PPL Hypertrophie');
      expect(programs[0]?.durationWeeks).toBe(8);
      expect(programs[0]?.isActive).toBe(true);
      expect(programs[0]?.workoutCount).toBe(2);
    });

    it('getProgramById returns detailed program with mapped template names', () => {
      const program = getProgramById('prog-ppl-1');
      expect(program).not.toBeNull();
      expect(program?.name).toBe('PPL Hypertrophie');
      expect(program?.workouts.length).toBe(2);
      expect(program?.workouts[0]?.templateName).toBe('Push Tag A');
      expect(program?.workouts[1]?.templateName).toBe('Leg Day');
    });

    it('getActiveProgram returns active program', () => {
      const active = getActiveProgram();
      expect(active?.id).toBe('prog-ppl-1');
      expect(active?.isActive).toBe(true);
    });

    it('getNextProgramWorkout returns schedule evaluation', () => {
      const next = getNextProgramWorkout();
      expect(next.hasActiveProgram).toBe(true);
      expect(next.currentWeek).toBe(1);
    });
  });

  describe('Exercise & History queries', () => {
    it('getWorkoutHistorySummary returns recent sessions with top set and volume', () => {
      const history = getWorkoutHistorySummary(5);
      expect(history.length).toBe(1);
      expect(history[0]?.name).toBe('Push Workout');
      expect(history[0]?.totalVolume).toBeGreaterThan(0);
      expect(history[0]?.exercises.length).toBe(1);
      expect(history[0]?.exercises[0]?.name).toBe('Bankdrücken');
      expect(history[0]?.exercises[0]?.topSet).toBeDefined();
    });

    it('getRecentExerciseHistory returns occurrences of exercise across sessions', () => {
      const exerciseHistory = getRecentExerciseHistory(benchExerciseId, 5);
      expect(exerciseHistory.length).toBe(1);
      expect(exerciseHistory[0]?.sessionName).toBe('Push Workout');
      expect(exerciseHistory[0]?.workingSets).toBe(2);
      expect(exerciseHistory[0]?.topSet).toContain('85 kg');
    });

    it('getExercisePerformance calculates PR, times performed and estimated 1RM', () => {
      const perf = getExercisePerformance(benchExerciseId);
      expect(perf.exerciseId).toBe(benchExerciseId);
      expect(perf.exerciseName).toBe('Bankdrücken');
      expect(perf.totalTimesPerformed).toBe(1);
      expect(perf.estimated1RM).toBeGreaterThan(85);
    });

    it('getRelevantPRs returns personal records with resolved exercise names', () => {
      const prs = getRelevantPRs();
      expect(prs.length).toBeGreaterThan(0);
      const benchPR = prs.find((p) => p.exerciseId === benchExerciseId);
      expect(benchPR?.bestWeightKg).toBe(85);
      expect(benchPR?.exerciseName).toBe('Bankdrücken');
    });
  });

  describe('Metrics & State queries', () => {
    it('getRelevantMetrics returns latest weight, bodyfat, and measurements', () => {
      const metrics = getRelevantMetrics();
      expect(metrics.latestWeightKg).toBe(82.5);
      expect(metrics.bodyFatPercentage).toBe(14.2);
      expect(metrics.measurements?.waist).toBe(81);
    });

    it('getCurrentTrainingState returns workout count, streak and active program summary', () => {
      const state = getCurrentTrainingState();
      expect(state.totalWorkouts).toBeDefined();
      expect(state.currentStreak).toBeDefined();
      expect(state.activeProgram?.name).toBe('PPL Hypertrophie');
    });

    it('buildResourceIndex builds a compact index of all resources', () => {
      const index = buildResourceIndex();
      expect(index.templates.length).toBe(2);
      expect(index.programs.length).toBe(1);
      expect(index.activeProgram?.id).toBe('prog-ppl-1');
      expect(index.frequentlyUsedExercises.length).toBeGreaterThan(0);
      expect(index.frequentlyUsedExercises[0]?.name).toBe('Bankdrücken');
    });
  });

  describe('buildContextForQuery Gating & Selective Retrieval', () => {
    it('blocks FREE tier and throws descriptive error', () => {
      jest.spyOn(entitlementService, 'getTier').mockReturnValue('free');

      expect(() => buildContextForQuery('Was soll ich trainieren?')).toThrow(
        /COACH_LOCKED/,
      );
    });

    it('returns reduced preview context for PRO tier', () => {
      jest.spyOn(entitlementService, 'getTier').mockReturnValue('pro');

      const context = buildContextForQuery('Trainingsplan');
      expect(context.resourceIndex).toBeDefined();
      expect(context.profile).toBeDefined();
      expect(context.currentState).toBeDefined();
      expect(context.stats).toBeDefined();
      expect(context.recentWorkouts?.length).toBeLessThanOrEqual(2);
      expect(context.activeProgram).toBeUndefined(); // PRO does not get full program details
      expect(context.matchedTemplates).toBeUndefined();
    });

    it('selectively fetches exercise history and PRs when exercise is mentioned (COACH tier)', () => {
      jest.spyOn(entitlementService, 'getTier').mockReturnValue('coach');

      const context = buildContextForQuery('Wie läuft mein Bankdrücken aktuell?');

      expect(context.matchedExercises).toBeDefined();
      expect(context.matchedExercises?.length).toBe(1);
      expect(context.matchedExercises?.[0]?.performance.exerciseName).toBe('Bankdrücken');
      expect(context.matchedExercises?.[0]?.history.length).toBe(1);
      expect(context.personalRecords).toBeDefined();
    });

    it('selectively fetches program and next workout when program or schedule is queried', () => {
      jest.spyOn(entitlementService, 'getTier').mockReturnValue('coach');

      const context = buildContextForQuery('Was steht heute im Programm an?');

      expect(context.activeProgram).toBeDefined();
      expect(context.activeProgram?.name).toBe('PPL Hypertrophie');
      expect(context.nextProgramWorkout).toBeDefined();
    });

    it('selectively fetches metrics when weight/body metrics are queried', () => {
      jest.spyOn(entitlementService, 'getTier').mockReturnValue('coach');

      const context = buildContextForQuery('Wie hat sich mein Körpergewicht entwickelt?');

      expect(context.metrics).toBeDefined();
      expect(context.metrics?.latestWeightKg).toBe(82.5);
    });

    it('mode "plan" includes active program, all relevant templates, and extended history', () => {
      jest.spyOn(entitlementService, 'getTier').mockReturnValue('coach');

      const context = buildContextForQuery('Erstelle mir einen neuen Split', {
        mode: 'plan',
        includeAllTemplates: true,
      });

      expect(context.activeProgram).toBeDefined();
      expect(context.recentWorkouts?.length).toBeLessThanOrEqual(5);
      expect(context.matchedTemplates?.length).toBeGreaterThan(0);
      expect(context.resourceIndex.templates.length).toBe(2);
    });
  });
});
