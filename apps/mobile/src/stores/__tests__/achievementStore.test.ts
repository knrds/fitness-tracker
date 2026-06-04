import { useAchievementStore } from '../achievementStore';
import { useHistoryStore } from '../historyStore';
import { useExerciseStore } from '../exerciseStore';
import { WorkoutSession, MuscleGroup, Equipment, MovementPattern } from '@fitness-tracker/domain';

jest.mock('react-native-mmkv', () => ({
  MMKV: jest.fn().mockImplementation(() => ({
    set: jest.fn(),
    getString: jest.fn(),
    delete: jest.fn(),
  })),
}));

describe('achievementStore', () => {
  beforeEach(() => {
    useAchievementStore.getState().resetAchievements();
    useHistoryStore.getState().clearHistory();
    // Seed default exercise for muscle training checks
    useExerciseStore.setState({
      exercises: [
        {
          id: 'ex-bench',
          name: 'Bench Press',
          primaryMuscles: [MuscleGroup.Chest],
          secondaryMuscles: [],
          equipment: Equipment.Barbell,
          movementPattern: MovementPattern.HorizontalPush,
          isCustom: false,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ],
    });
  });

  it('should initialize with default states', () => {
    const state = useAchievementStore.getState();
    expect(state.xp).toBe(0);
    expect(state.level).toBe(1);
    expect(state.unlockedAchievements).toEqual({});
    expect(state.newlyUnlocked).toEqual([]);
    expect(state.levelUpTo).toBeNull();
  });

  it('should award XP and unlock first_workout achievement on first session finished', () => {
    const mockSession: WorkoutSession = {
      id: 'session-1',
      userId: 'user-1',
      name: 'Chest Day',
      startedAt: new Date(),
      completedAt: new Date(),
      durationSeconds: 1800,
      createdAt: new Date(),
      updatedAt: new Date(),
      exercises: [
        {
          id: 's-ex-1',
          exerciseId: 'ex-bench',
          order: 0,
          sets: [
            {
              id: 'set-1',
              setNumber: 1,
              type: 'working',
              completed: true,
              weight: 100,
              reps: 10, // 1000 kg volume = 10 XP bonus
            },
          ],
        },
      ],
    };

    // Add session to history store as it's required for calculation
    useHistoryStore.getState().addSession(mockSession);

    // Call store action
    useAchievementStore.getState().awardXpAndCheckAchievements(mockSession);

    const state = useAchievementStore.getState();

    // XP calculation:
    // - Base: 50 XP
    // - Volume bonus: 1000 kg / 100 = 10 XP
    // - PR bonus: ex-bench is a new PR = 100 XP
    // One-time achievements: first_workout (50) + first_pr (50) = 100 XP
    // Repeatable achievements earned this session:
    //   - rep_workout_complete (+25), rep_session_pr (+50) = 75 XP
    // Total XP = 50 + 10 + 100 + 100 + 75 = 335 XP
    expect(state.xp).toBe(335);
    expect(state.level).toBe(1);
    expect(state.unlockedAchievements['first_workout']).toBeDefined();
    expect(state.unlockedAchievements['first_pr']).toBeDefined(); // First PR unlocked as well
    expect(state.newlyUnlocked).toContain('first_workout');
    expect(state.newlyUnlocked).toContain('first_pr');
    // Repeatable achievements track a count and are not part of the celebration list.
    expect(state.repeatCounts['rep_workout_complete']).toBe(1);
    expect(state.repeatCounts['rep_session_pr']).toBe(1);
    expect(state.newlyUnlocked).not.toContain('rep_workout_complete');
    expect(state.levelUpTo).toBeNull();
  });

  it('should handle level up when XP crosses 500 XP boundary', () => {
    // Manually set state near level up boundary
    useAchievementStore.setState({ xp: 450, level: 1 });

    const mockSession: WorkoutSession = {
      id: 'session-2',
      userId: 'user-1',
      name: 'Powerlifting Session',
      startedAt: new Date(),
      completedAt: new Date(),
      durationSeconds: 2400,
      createdAt: new Date(),
      updatedAt: new Date(),
      exercises: [
        {
          id: 's-ex-2',
          exerciseId: 'ex-bench',
          order: 0,
          sets: [
            {
              id: 'set-2',
              setNumber: 1,
              type: 'working',
              completed: true,
              weight: 100,
              reps: 10, // 10 XP volume bonus
            },
          ],
        },
      ],
    };

    // Add to history store
    useHistoryStore.getState().addSession(mockSession);

    // Call action
    useAchievementStore.getState().awardXpAndCheckAchievements(mockSession);

    const state = useAchievementStore.getState();

    // XP calculation:
    // - Pre-existing: 450 XP
    // - Base: 50 XP
    // - Volume bonus: 10 XP
    // - PR: 100 XP (ex-bench max weight 100 kg is first PR)
    // - Achievements first_workout + first_pr = 100 XP reward
    // - Repeatable: rep_workout_complete (25) + rep_session_pr (50) = 75 XP
    // Total XP = 450 + 50 + 10 + 100 + 100 + 75 = 785 XP
    // Level = Math.floor(785 / 500) + 1 = 2
    expect(state.level).toBe(2);
    expect(state.levelUpTo).toBe(2);
  });
});
