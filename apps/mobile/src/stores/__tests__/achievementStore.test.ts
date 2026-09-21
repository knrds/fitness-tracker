import { useAchievementStore } from '../achievementStore';
import { useHistoryStore } from '../historyStore';
import { useExerciseStore } from '../exerciseStore';
import ioniconsGlyphMap from '@expo/vector-icons/build/vendor/react-native-vector-icons/glyphmaps/Ionicons.json';
import {
  ACHIEVEMENTS,
  WorkoutSession,
  MuscleGroup,
  Equipment,
  MovementPattern,
} from '@fitness-tracker/domain';

jest.mock('react-native-mmkv', () => ({
  MMKV: jest.fn().mockImplementation(() => ({
    set: jest.fn(),
    getString: jest.fn(),
    delete: jest.fn(),
  })),
}));

const ioniconNames = new Set(Object.keys(ioniconsGlyphMap));

const createBenchSession = (id: string, completedAt: Date): WorkoutSession => ({
  id,
  userId: 'user-1',
  name: 'Bench Practice',
  startedAt: completedAt,
  completedAt,
  durationSeconds: 1800,
  createdAt: completedAt,
  updatedAt: completedAt,
  exercises: [
    {
      id: `${id}-exercise`,
      exerciseId: 'ex-bench',
      order: 0,
      sets: [
        {
          id: `${id}-set`,
          setNumber: 1,
          type: 'working',
          completed: true,
          weight: 100,
          reps: 5,
        },
      ],
    },
  ],
});

describe('achievementStore', () => {
  it('does not count planned but uncompleted exercises and muscles as trained', () => {
    const session = createBenchSession('partially-completed', new Date('2026-06-09T18:00:00'));
    const base = useExerciseStore.getState().exercises[0]!;
    const planned = Object.values(MuscleGroup)
      .slice(0, 9)
      .map((muscle, index) => ({
        ...base,
        id: `planned-${index}`,
        name: `Planned ${index}`,
        primaryMuscles: [muscle],
      }));
    useExerciseStore.setState({ exercises: [base, ...planned] });
    session.exercises.push(
      ...planned.map((exercise, index) => ({
        ...session.exercises[0]!,
        id: `planned-session-${index}`,
        exerciseId: exercise.id,
        sets: [{ ...session.exercises[0]!.sets[0]!, id: `planned-set-${index}`, completed: false }],
      })),
    );
    useHistoryStore.getState().addSession(session);
    useAchievementStore.getState().awardXpAndCheckAchievements(session);
    expect(
      useAchievementStore.getState().unlockedAchievements['unique_exercises_10'],
    ).toBeUndefined();
    expect(useAchievementStore.getState().unlockedAchievements['muscles_5']).toBeUndefined();
  });
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

  it('uses valid Ionicons names for every achievement icon', () => {
    const invalidIcons = ACHIEVEMENTS.filter(
      (achievement) => !ioniconNames.has(achievement.icon),
    ).map((achievement) => `${achievement.id}:${achievement.icon}`);

    expect(invalidIcons).toEqual([]);
  });

  it('does not award a PR using a different formula for a custom exercise', () => {
    useExerciseStore.setState({
      exercises: useExerciseStore
        .getState()
        .exercises.map((ex) => ({ ...ex, name: 'Custom Curl', isCustom: true })),
    });
    const past = createBenchSession('past', new Date('2026-09-01T10:00:00Z'));
    past.exercises[0]!.sets[0]!.reps = 1;
    const current = createBenchSession('current', new Date('2026-09-02T10:00:00Z'));
    current.exercises[0]!.sets[0]!.weight = 90;
    useHistoryStore.setState({ sessions: [past, current] });
    useAchievementStore.getState().awardXpAndCheckAchievements(current);
    expect(useAchievementStore.getState().repeatCounts['rep_session_pr']).toBeUndefined();
  });

  it('awards PR bonus only once for repeated occurrences of the same exercise', () => {
    const current = createBenchSession('current', new Date('2026-09-02T10:00:00Z'));
    const first = current.exercises[0]!;
    current.exercises.push({
      ...first,
      id: 'second',
      order: 1,
      sets: [{ ...first.sets[0]!, id: 'second-set', weight: 110 }],
    });
    useHistoryStore.setState({ sessions: [current] });
    useAchievementStore.getState().awardXpAndCheckAchievements(current);
    expect(useAchievementStore.getState().xp).toBe(264);
    expect(useAchievementStore.getState().repeatCounts['rep_session_pr']).toBe(1);
  });

  it('should award XP and unlock first_workout achievement on first session finished', () => {
    const mockSession: WorkoutSession = {
      id: 'session-1',
      userId: 'user-1',
      name: 'Chest Day',
      startedAt: new Date('2026-06-03T10:00:00'),
      completedAt: new Date('2026-06-03T10:30:00'),
      durationSeconds: 1800,
      createdAt: new Date('2026-06-03T10:00:00'),
      updatedAt: new Date('2026-06-03T10:30:00'),
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
              reps: 10, // 1000 kg volume
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

    // Rebalanced XP calculation:
    // - Base: 50 XP
    // - Set bonus: 1 set = 2 XP
    // - Volume bonus: 1000 kg tier 1 = 10 XP
    // - PR bonus: ex-bench is a new PR = 25 XP
    // One-time achievements: first_workout (50) + first_pr (50) = 100 XP
    // Repeatable achievements earned this session:
    //   - rep_workout_complete (+25), rep_session_pr (+50) = 75 XP
    // Total XP = 50 + 2 + 10 + 25 + 100 + 75 = 262 XP
    expect(state.xp).toBe(262);
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

  it('should handle level up when XP crosses 1000 XP boundary (Level 2)', () => {
    // Manually set state near level up boundary (Level 2 is 1000 XP)
    useAchievementStore.setState({ xp: 850, level: 1 });

    const mockSession: WorkoutSession = {
      id: 'session-2',
      userId: 'user-1',
      name: 'Powerlifting Session',
      startedAt: new Date('2026-06-03T11:00:00'),
      completedAt: new Date('2026-06-03T11:40:00'),
      durationSeconds: 2400,
      createdAt: new Date('2026-06-03T11:00:00'),
      updatedAt: new Date('2026-06-03T11:40:00'),
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
              reps: 10,
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

    // XP crossed 1000 threshold -> Level 2
    expect(state.xp).toBeGreaterThanOrEqual(1000);
    expect(state.level).toBe(2);
    expect(state.levelUpTo).toBe(2);

    // Duplicate call with the same session does not award duplicate XP
    const xpAfterFirst = state.xp;
    useAchievementStore.getState().awardXpAndCheckAchievements(mockSession);
    expect(useAchievementStore.getState().xp).toBe(xpAfterFirst);
  });

  it('does not award XP for an empty session with no completed sets', () => {
    const emptySession: WorkoutSession = {
      id: 'empty-session-test',
      userId: 'user-1',
      name: 'Empty Session',
      startedAt: new Date(),
      completedAt: new Date(),
      durationSeconds: 100,
      createdAt: new Date(),
      updatedAt: new Date(),
      exercises: [],
    };
    useAchievementStore.getState().awardXpAndCheckAchievements(emptySession);
    expect(useAchievementStore.getState().xp).toBe(0);
    expect(useAchievementStore.getState().level).toBe(1);
  });

  it('unlocks exercise-specific niche achievements from cumulative history', () => {
    const sessions = Array.from({ length: 10 }, (_, index) =>
      createBenchSession(`bench-session-${index}`, new Date(2026, 5, index + 1, 18)),
    );

    sessions.forEach((session) => useHistoryStore.getState().addSession(session));
    useAchievementStore.getState().awardXpAndCheckAchievements(sessions[9]!);

    const state = useAchievementStore.getState();

    expect(state.unlockedAchievements['bench_specialist']).toBeDefined();
    expect(state.unlockedAchievements['powerlifting_apprentice']).toBeDefined();
    expect(state.unlockedAchievements['bench_technician']).toBeUndefined();
  });

  it('unlocks meta achievements based on other non-meta achievements', () => {
    const unlockedAchievements = Object.fromEntries(
      ACHIEVEMENTS.filter(
        (achievement) => achievement.category !== 'meta' && !achievement.repeatable,
      )
        .slice(0, 5)
        .map((achievement) => [achievement.id, new Date('2026-06-01').toISOString()]),
    );
    const session = createBenchSession('meta-session', new Date('2026-06-09T18:00:00'));

    useAchievementStore.setState({ unlockedAchievements });
    useHistoryStore.getState().addSession(session);
    useAchievementStore.getState().awardXpAndCheckAchievements(session);

    expect(useAchievementStore.getState().unlockedAchievements['meta_ach_5']).toBeDefined();
  });
});
