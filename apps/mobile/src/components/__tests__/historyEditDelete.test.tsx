import { useHistoryStore } from '../../stores/historyStore';
import { useExerciseStore } from '../../stores/exerciseStore';
import { useProfileStore } from '../../stores/profileStore';
import { useAchievementStore } from '../../stores/achievementStore';
import { recalculateDerivedStatsAfterHistoryMutation } from '../../utils/historyRecalculation';
import { coachContextBuilder } from '../../services/coachContextBuilder';
import { WorkoutSession, MuscleGroup, Equipment, MovementPattern } from '@fitness-tracker/domain';

describe('History Workout Edit & Delete Suite', () => {
  const benchExerciseId = 'ex-bench-001';
  const squatExerciseId = 'ex-squat-001';

  beforeEach(() => {
    useHistoryStore.getState().clearHistory();
    useExerciseStore.setState({
      exercises: [
        {
          id: benchExerciseId,
          name: 'Barbell Bench Press',
          movementPattern: MovementPattern.HorizontalPush,
          equipment: Equipment.Barbell,
          isCustom: false,
          primaryMuscles: [MuscleGroup.Chest],
          secondaryMuscles: [MuscleGroup.Triceps],
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        {
          id: squatExerciseId,
          name: 'Barbell Back Squat',
          movementPattern: MovementPattern.Squat,
          equipment: Equipment.Barbell,
          isCustom: false,
          primaryMuscles: [MuscleGroup.Quads],
          secondaryMuscles: [MuscleGroup.Glutes],
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ],
    });
    useProfileStore.getState().updateProfile({
      benchPressMaxKg: undefined,
      squatMaxKg: undefined,
      deadliftMaxKg: undefined,
    });
  });

  const createSampleSession = (
    id: string,
    name: string,
    benchWeight: number,
    date = new Date(2026, 5, 10, 10, 0),
  ): WorkoutSession => ({
    id,
    userId: 'user-test-1',
    name,
    startedAt: date,
    durationSeconds: 3600,
    notes: 'Sample workout',
    createdAt: date,
    updatedAt: date,
    exercises: [
      {
        id: `sess-ex-${id}-1`,
        exerciseId: benchExerciseId,
        order: 1,
        sets: [
          {
            id: `set-${id}-1`,
            setNumber: 1,
            type: 'working',
            weight: benchWeight,
            reps: 5,
            completed: true,
          },
        ],
      },
    ],
  });

  describe('1. HistoryStore updateSession & deleteSession', () => {
    test('updateSession updates existing record without creating duplicate', () => {
      const initial = createSampleSession('session-1', 'Push Day A', 100);
      useHistoryStore.getState().addSession(initial);

      expect(useHistoryStore.getState().sessions).toHaveLength(1);
      expect(useHistoryStore.getState().sessions[0]?.name).toBe('Push Day A');

      const updated = {
        ...initial,
        name: 'Push Day A (Edited)',
        durationSeconds: 4200,
      };
      useHistoryStore.getState().updateSession(updated);

      const sessions = useHistoryStore.getState().sessions;
      expect(sessions).toHaveLength(1);
      expect(sessions[0]?.id).toBe('session-1');
      expect(sessions[0]?.name).toBe('Push Day A (Edited)');
      expect(sessions[0]?.durationSeconds).toBe(4200);
    });

    test('deleteSession removes only targeted session', () => {
      const s1 = createSampleSession('session-1', 'Push Day', 100);
      const s2 = createSampleSession('session-2', 'Leg Day', 140);
      useHistoryStore.getState().addSession(s1);
      useHistoryStore.getState().addSession(s2);

      expect(useHistoryStore.getState().sessions).toHaveLength(2);

      useHistoryStore.getState().deleteSession('session-1');

      const sessions = useHistoryStore.getState().sessions;
      expect(sessions).toHaveLength(1);
      expect(sessions[0]?.id).toBe('session-2');
    });
  });

  describe('2. Deterministic PR & Statistics Recalculation', () => {
    test('recalculates Big Three PRs when high weight is reduced', () => {
      const s1 = createSampleSession('session-1', 'Bench Session', 100);
      useHistoryStore.getState().addSession(s1);
      recalculateDerivedStatsAfterHistoryMutation();

      // Profile PR should reflect 100kg
      expect(useProfileStore.getState().profile.benchPressMaxKg).toBe(100);

      // Edit: reduce weight from 100kg to 80kg
      const s1Reduced = createSampleSession('session-1', 'Bench Session (Corrected)', 80);
      useHistoryStore.getState().updateSession(s1Reduced);
      recalculateDerivedStatsAfterHistoryMutation();

      // Stale 100kg PR must be replaced with the true max (80kg)
      expect(useProfileStore.getState().profile.benchPressMaxKg).toBe(80);
    });

    test('clears PR when the only session for that lift is deleted', () => {
      const s1 = createSampleSession('session-1', 'Bench Session', 100);
      useHistoryStore.getState().addSession(s1);
      recalculateDerivedStatsAfterHistoryMutation();
      expect(useProfileStore.getState().profile.benchPressMaxKg).toBe(100);

      // Delete the only session
      useHistoryStore.getState().deleteSession('session-1');
      recalculateDerivedStatsAfterHistoryMutation();

      // PR should be undefined, not stale 100kg
      expect(useProfileStore.getState().profile.benchPressMaxKg).toBeUndefined();
    });

    test('recalculates lifetime volume and streaks dynamically without drift', () => {
      const s1 = createSampleSession('session-1', 'Session 1', 100);
      const s2 = createSampleSession('session-2', 'Session 2', 100);
      useHistoryStore.getState().addSession(s1);
      useHistoryStore.getState().addSession(s2);

      const statsBefore = useProfileStore.getState().getStatistics();
      expect(statsBefore.totalWorkouts).toBe(2);
      expect(statsBefore.totalVolume).toBe(1000); // 100kg * 5 reps * 2 sessions

      // Delete one session
      useHistoryStore.getState().deleteSession('session-1');
      recalculateDerivedStatsAfterHistoryMutation();

      const statsAfter = useProfileStore.getState().getStatistics();
      expect(statsAfter.totalWorkouts).toBe(1);
      expect(statsAfter.totalVolume).toBe(500); // 100kg * 5 reps * 1 session
    });
  });

  describe('3. XP & Progression Protection (No Duplicate XP)', () => {
    test('editing a workout does NOT award duplicate XP', () => {
      const s1 = createSampleSession('session-1', 'Workout 1', 100);
      useHistoryStore.getState().addSession(s1);

      // Simulate initial workout completion XP award
      useAchievementStore.getState().awardXpAndCheckAchievements(s1);
      const xpAfterCompletion = useAchievementStore.getState().xp;

      // History Edit: update session and recalculate
      const s1Edited = createSampleSession('session-1', 'Workout 1 Edited', 105);
      useHistoryStore.getState().updateSession(s1Edited);
      recalculateDerivedStatsAfterHistoryMutation();

      // XP must NOT change after edit!
      expect(useAchievementStore.getState().xp).toBe(xpAfterCompletion);
    });
  });

  describe('4. Coach Context Freshness', () => {
    test('coachContextBuilder reflects updated history immediately without caching stale values', () => {
      const s1 = createSampleSession('session-1', 'Bench Session', 100);
      useHistoryStore.getState().addSession(s1);
      recalculateDerivedStatsAfterHistoryMutation();

      const profileBefore = coachContextBuilder.getUserTrainingProfile();
      expect(profileBefore.benchPressMaxKg).toBe(100);

      // Edit session weight to 90
      const s1Edited = createSampleSession('session-1', 'Bench Session', 90);
      useHistoryStore.getState().updateSession(s1Edited);
      recalculateDerivedStatsAfterHistoryMutation();

      const profileAfter = coachContextBuilder.getUserTrainingProfile();
      expect(profileAfter.benchPressMaxKg).toBe(90);
    });
  });

});
