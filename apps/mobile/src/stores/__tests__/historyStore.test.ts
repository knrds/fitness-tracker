import { useHistoryStore } from '../historyStore';
import { WorkoutSession } from '@fitness-tracker/domain';

jest.mock('react-native-mmkv', () => ({
  MMKV: jest.fn().mockImplementation(() => ({
    set: jest.fn(),
    getString: jest.fn(),
    delete: jest.fn(),
  })),
}));

describe('historyStore', () => {
  beforeEach(() => {
    useHistoryStore.setState({ sessions: [] });
  });

  it('adds and deletes a session', () => {
    const session = {
      id: 'session-1',
      userId: 'user-1',
      name: 'Test Workout',
      startedAt: new Date(),
      createdAt: new Date(),
      updatedAt: new Date(),
      exercises: [],
    } as WorkoutSession;

    useHistoryStore.getState().addSession(session);
    expect(useHistoryStore.getState().sessions.length).toBe(1);

    useHistoryStore.getState().deleteSession('session-1');
    expect(useHistoryStore.getState().sessions.length).toBe(0);
  });

  it('calculates streaks correctly', () => {
    const today = new Date();

    const yesterday = new Date(today);
    yesterday.setDate(today.getDate() - 1);

    const twoDaysAgo = new Date(today);
    twoDaysAgo.setDate(today.getDate() - 2);

    useHistoryStore
      .getState()
      .addSession({ id: 's1', startedAt: today, exercises: [] } as unknown as WorkoutSession);
    useHistoryStore
      .getState()
      .addSession({ id: 's2', startedAt: yesterday, exercises: [] } as unknown as WorkoutSession);
    useHistoryStore
      .getState()
      .addSession({ id: 's3', startedAt: twoDaysAgo, exercises: [] } as unknown as WorkoutSession);

    expect(useHistoryStore.getState().getStreak()).toBe(3);
  });

  it('calculates PRs correctly', () => {
    const session = {
      id: 's1',
      startedAt: new Date(),
      exercises: [
        {
          exerciseId: 'ex-1',
          sets: [
            { completed: true, weight: 100, reps: 5 },
            { completed: true, weight: 110, reps: 3 }, // PR
            { completed: false, weight: 120, reps: 1 }, // Ignored
          ],
        },
      ],
    } as unknown as WorkoutSession;

    useHistoryStore.getState().addSession(session);
    const prs = useHistoryStore.getState().getPRs();

    expect(prs['ex-1']).toBe(110);
  });
});
