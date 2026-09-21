import { useAuthStore, applyAccountSession } from '../authStore';
import { useHistoryStore } from '../historyStore';
import { useExerciseStore } from '../exerciseStore';
import { useProgramStore } from '../programStore';
import { useBodyMetricStore } from '../bodyMetricStore';
import { useAchievementStore } from '../achievementStore';
import { useSyncStore } from '../syncStore';
import { LOCAL_USER_ID } from '../local-user';
import {
  captureGuestSnapshot,
  hasGuestData,
  migrateGuestSnapshotToAccount,
} from '../authMigration';
import {
  beginScopeChange,
  completeScopeChange,
  selectStoragePartition,
  getStorageScope,
} from '../../data/storageScope';
import { WorkoutSession } from '@fitness-tracker/domain';
import * as storageModule from '../storage';

jest.mock('../../utils/supabase', () => ({
  isSupabaseConfigured: false,
  supabase: {
    auth: {
      getSession: jest.fn().mockResolvedValue({ data: { session: null }, error: null }),
      onAuthStateChange: jest.fn(() => ({ data: { subscription: { unsubscribe: jest.fn() } } })),
    },
  },
}));

function resetToScope(partition: string) {
  const generation = beginScopeChange();
  selectStoragePartition(partition, generation);
  completeScopeChange(generation);
}

const mockUserA = {
  id: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
  email: 'user-a@example.com',
  app_metadata: {},
  user_metadata: {},
  aud: 'authenticated',
  created_at: '2026-01-01T00:00:00.000Z',
};

const mockSessionA = {
  access_token: 'token-a',
  refresh_token: 'refresh-a',
  expires_in: 3600,
  token_type: 'bearer' as const,
  user: mockUserA,
};

const mockUserB = {
  id: 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',
  email: 'user-b@example.com',
  app_metadata: {},
  user_metadata: {},
  aud: 'authenticated',
  created_at: '2026-01-01T00:00:00.000Z',
};

const mockSessionB = {
  access_token: 'token-b',
  refresh_token: 'refresh-b',
  expires_in: 3600,
  token_type: 'bearer' as const,
  user: mockUserB,
};

describe('Guest to Account Migration (WP-02 Task 02.06)', () => {
  beforeEach(async () => {
    resetToScope('legacy');
    useAuthStore.setState({
      session: null,
      user: null,
      isLoading: false,
      isConfigured: false,
      isInitialized: true,
      isSwitchingAccount: false,
      sessionError: null,
    });
    useHistoryStore.setState({ sessions: [] });
    useExerciseStore.setState({ customExercises: [] });
    useProgramStore.setState({ customFolders: [] });
    useBodyMetricStore.setState({ metrics: [] });
    useAchievementStore.setState({ xp: 0, level: 1, unlockedAchievements: {}, awardedSessionIds: [] });
    useSyncStore.setState({ queue: [] });
  });

  it('1. empty guest: does not fail or enqueue sync items when guest has no data', async () => {
    const snapshot = captureGuestSnapshot();
    expect(hasGuestData(snapshot)).toBe(false);

    await applyAccountSession(mockSessionA);

    expect(useAuthStore.getState().user?.id).toBe(mockUserA.id);
    expect(useHistoryStore.getState().sessions).toHaveLength(0);
    expect(useSyncStore.getState().queue).toHaveLength(0);
  });

  it('2. guest with workouts: reassigns userId, enqueues sync, and purges legacy storage', async () => {
    const guestSession: WorkoutSession = {
      id: '11111111-1111-4111-8111-111111111111',
      userId: LOCAL_USER_ID,
      name: 'Leg Day',
      startedAt: new Date('2026-09-20T10:00:00Z'),
      createdAt: new Date('2026-09-20T10:00:00Z'),
      updatedAt: new Date('2026-09-20T10:00:00Z'),
      exercises: [],
    };
    useHistoryStore.setState({ sessions: [guestSession] });

    const purgeSpy = jest.spyOn(storageModule, 'purgeLegacyPartition');

    await applyAccountSession(mockSessionA);

    expect(useAuthStore.getState().user?.id).toBe(mockUserA.id);
    const accountSessions = useHistoryStore.getState().sessions;
    expect(accountSessions).toHaveLength(1);
    expect(accountSessions[0]?.userId).toBe(mockUserA.id);
    expect(accountSessions[0]?.name).toBe('Leg Day');

    // Verify enqueued in syncStore
    const queue = useSyncStore.getState().queue;
    expect(queue.some((item) => item.table === 'workout_sessions' && item.operation === 'INSERT')).toBe(true);

    // Verify purge was called
    expect(purgeSpy).toHaveBeenCalled();
    purgeSpy.mockRestore();
  });

  it('3. existing account data: preserves existing account workouts when merging guest data', async () => {
    const existingSession: WorkoutSession = {
      id: '22222222-2222-4222-8222-222222222222',
      userId: mockUserA.id,
      name: 'Account Bench',
      startedAt: new Date('2026-09-19T10:00:00Z'),
      createdAt: new Date('2026-09-19T10:00:00Z'),
      updatedAt: new Date('2026-09-19T10:00:00Z'),
      exercises: [],
    };

    // Simulate account already having data
    resetToScope(`account:${mockUserA.id}`);
    useHistoryStore.setState({ sessions: [existingSession] });

    // Switch back to legacy guest with 1 new workout
    resetToScope('legacy');
    const guestSession: WorkoutSession = {
      id: '33333333-3333-4333-8333-333333333333',
      userId: LOCAL_USER_ID,
      name: 'Guest Squat',
      startedAt: new Date('2026-09-20T10:00:00Z'),
      createdAt: new Date('2026-09-20T10:00:00Z'),
      updatedAt: new Date('2026-09-20T10:00:00Z'),
      exercises: [],
    };
    useHistoryStore.setState({ sessions: [guestSession] });

    const snapshot = captureGuestSnapshot();
    resetToScope(`account:${mockUserA.id}`);
    useHistoryStore.setState({ sessions: [existingSession] });

    await migrateGuestSnapshotToAccount(snapshot, mockUserA.id);

    const merged = useHistoryStore.getState().sessions;
    expect(merged).toHaveLength(2);
    expect(merged.some((s) => s.id === existingSession.id && s.name === 'Account Bench')).toBe(true);
    expect(merged.some((s) => s.name === 'Guest Squat' && s.userId === mockUserA.id)).toBe(true);
  });

  it('4. guest + existing account collision: reallocates unique ID for colliding guest session to prevent overwrites', async () => {
    const collidingId = '44444444-4444-4444-8444-444444444444';
    const existingSession: WorkoutSession = {
      id: collidingId,
      userId: mockUserA.id,
      name: 'Account Pre-existing Workout',
      startedAt: new Date('2026-09-10T10:00:00Z'),
      createdAt: new Date('2026-09-10T10:00:00Z'),
      updatedAt: new Date('2026-09-10T10:00:00Z'),
      exercises: [],
    };

    const guestCollidingSession: WorkoutSession = {
      id: collidingId,
      userId: LOCAL_USER_ID,
      name: 'Guest Workout With Same ID',
      startedAt: new Date('2026-09-20T15:00:00Z'),
      createdAt: new Date('2026-09-20T15:00:00Z'),
      updatedAt: new Date('2026-09-20T15:00:00Z'),
      exercises: [],
    };

    const snapshot: import('../authMigration').GuestSnapshot = {
      sessions: [guestCollidingSession],
      customExercises: [],
      templates: [],
      programs: [],
      metrics: [],
      activeSession: null,
      achievements: { xp: 0, level: 1, unlockedAchievements: {}, repeatCounts: {}, awardedSessionIds: [] },
      profile: {},
    };

    resetToScope(`account:${mockUserA.id}`);
    useHistoryStore.setState({ sessions: [existingSession] });

    await migrateGuestSnapshotToAccount(snapshot, mockUserA.id);

    const sessions = useHistoryStore.getState().sessions;
    expect(sessions).toHaveLength(2);
    // Existing session must remain untouched
    const accountSession = sessions.find((s) => s.name === 'Account Pre-existing Workout');
    expect(accountSession?.id).toBe(collidingId);
    expect(accountSession?.userId).toBe(mockUserA.id);

    // Colliding guest session must be allocated a new UUID
    const migratedGuest = sessions.find((s) => s.name === 'Guest Workout With Same ID');
    expect(migratedGuest).toBeDefined();
    expect(migratedGuest?.id).not.toBe(collidingId);
    expect(migratedGuest?.userId).toBe(mockUserA.id);
  });

  it('5. interrupted migration: leaves legacy data intact if migration fails before completion', async () => {
    const purgeSpy = jest.spyOn(storageModule, 'purgeLegacyPartition').mockRejectedValueOnce(new Error('MMKV locked'));

    const guestSession: WorkoutSession = {
      id: '55555555-5555-4555-8555-555555555555',
      userId: LOCAL_USER_ID,
      name: 'Critical Guest Workout',
      startedAt: new Date(),
      createdAt: new Date(),
      updatedAt: new Date(),
      exercises: [],
    };
    useHistoryStore.setState({ sessions: [guestSession] });

    // Attempting migration should fail and throw
    const snapshot = captureGuestSnapshot();
    await expect(migrateGuestSnapshotToAccount(snapshot, mockUserA.id)).rejects.toThrow('MMKV locked');

    purgeSpy.mockRestore();
  });

  it('6. repeated migration: is idempotent and does not create duplicate entries', async () => {
    const guestSession: WorkoutSession = {
      id: '66666666-6666-4666-8666-666666666666',
      userId: LOCAL_USER_ID,
      name: 'Idempotent Workout',
      startedAt: new Date('2026-09-20T12:00:00Z'),
      createdAt: new Date('2026-09-20T12:00:00Z'),
      updatedAt: new Date('2026-09-20T12:00:00Z'),
      exercises: [],
    };
    const snapshot: import('../authMigration').GuestSnapshot = {
      sessions: [guestSession],
      customExercises: [],
      templates: [],
      programs: [],
      metrics: [],
      activeSession: null,
      achievements: { xp: 50, level: 1, unlockedAchievements: {}, repeatCounts: {}, awardedSessionIds: [] },
      profile: {},
    };

    resetToScope(`account:${mockUserA.id}`);
    useHistoryStore.setState({ sessions: [] });

    // Run first time
    await migrateGuestSnapshotToAccount(snapshot, mockUserA.id);
    expect(useHistoryStore.getState().sessions).toHaveLength(1);

    // Run second time with identical snapshot
    await migrateGuestSnapshotToAccount(snapshot, mockUserA.id);
    expect(useHistoryStore.getState().sessions).toHaveLength(1);
  });

  it('7. logout/login: does not leak account data to guest mode on logout', async () => {
    // 1. User logs in
    await applyAccountSession(mockSessionA);
    expect(getStorageScope().partition).toBe(`account:${mockUserA.id}`);

    // 2. Add an account workout
    const accountWorkout: WorkoutSession = {
      id: '77777777-7777-4777-8777-777777777777',
      userId: mockUserA.id,
      name: 'Private Account Session',
      startedAt: new Date(),
      createdAt: new Date(),
      updatedAt: new Date(),
      exercises: [],
    };
    useHistoryStore.setState({ sessions: [accountWorkout] });

    // 3. User logs out
    await applyAccountSession(null);
    expect(useAuthStore.getState().user).toBeNull();
    expect(getStorageScope().partition).toBe('legacy');

    // Guest state must be empty; no private account data leaked
    expect(useHistoryStore.getState().sessions).toHaveLength(0);
  });

  it('8. account switch A→B: never migrates Account A data to Account B', async () => {
    // 1. User A logs in
    await applyAccountSession(mockSessionA);
    const sessionA: WorkoutSession = {
      id: '88888888-8888-4888-8888-888888888888',
      userId: mockUserA.id,
      name: 'User A Secret Workout',
      startedAt: new Date(),
      createdAt: new Date(),
      updatedAt: new Date(),
      exercises: [],
    };
    useHistoryStore.setState({ sessions: [sessionA] });

    // 2. Direct switch to User B
    await applyAccountSession(mockSessionB);

    expect(useAuthStore.getState().user?.id).toBe(mockUserB.id);
    expect(getStorageScope().partition).toBe(`account:${mockUserB.id}`);

    // User B must NOT see User A's workout
    expect(useHistoryStore.getState().sessions.some((s) => s.name === 'User A Secret Workout')).toBe(false);
  });

  it('9. rollback on persistence failure: sets sessionError and fails closed without wiping', async () => {
    const lifecycle = await import('../persistenceLifecycle');
    const switchSpy = jest.spyOn(lifecycle, 'switchPersistencePartition').mockRejectedValueOnce(new Error('Storage partition corrupted'));

    await applyAccountSession(mockSessionA);

    expect(useAuthStore.getState().sessionError).toContain('konnten nicht sicher geladen werden');
    expect(useAuthStore.getState().user).toBeNull();

    switchSpy.mockRestore();
  });
});
