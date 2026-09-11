import { DatabaseSync } from 'node:sqlite';
import { DocumentDatabase } from '../../data/documentDatabase';
import { useWorkoutStore } from '../workoutStore';
import { useHistoryStore } from '../historyStore';
import { useSyncStore } from '../syncStore';
import { useAchievementStore } from '../achievementStore';
import { useCaffeineStore } from '../caffeineStore';
import { useStorageHealth } from '../storageHealth';
import { withoutStorageWrites } from '../../data/storageTransaction';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { z } from 'zod';
import { createHydratedStorage, StorageHydrationError } from '../storage';
import { applyAccountSession, useAuthStore } from '../authStore';
import { useCoachStore } from '../coachStore';
import { useProfileStore } from '../profileStore';
import {
  beginScopeChange,
  completeScopeChange,
  selectStoragePartition,
  isScopeChanging,
} from '../../data/storageScope';
import type { Session } from '@supabase/supabase-js';
import type { WorkoutTemplate } from '@fitness-tracker/domain';

let mockRepository: DocumentDatabase | undefined;
jest.mock('../../data/deviceDatabase', () => ({
  usesDeviceDatabase: true,
  getDeviceDatabase: () => mockRepository,
}));
jest.mock('expo-crypto', () => ({
  randomUUID: () => jest.requireActual<typeof import('node:crypto')>('node:crypto').randomUUID(),
}));
jest.mock('react-native-mmkv', () => ({
  MMKV: jest
    .fn()
    .mockImplementation(() => ({ getString: () => undefined, set: jest.fn(), delete: jest.fn() })),
}));

const stores = [
  useWorkoutStore,
  useHistoryStore,
  useSyncStore,
  useAchievementStore,
  useCaffeineStore,
];
describe('native workout path with a real SQLite engine', () => {
  let db: DatabaseSync;
  beforeEach(async () => {
    const generation = beginScopeChange();
    selectStoragePartition('legacy', generation);
    completeScopeChange(generation);
    useAuthStore.setState(useAuthStore.getInitialState(), true);
    db = new DatabaseSync(':memory:');
    mockRepository = new DocumentDatabase({
      execSync: (sql) => db.exec(sql),
      runSync: (sql, ...parameters) => db.prepare(sql).run(...parameters),
      getFirstSync: (sql, ...parameters) => db.prepare(sql).get(...parameters) ?? null,
      getAllSync: (sql, ...parameters) => db.prepare(sql).all(...parameters),
    });
    useStorageHealth.setState({ blockedStores: [], writeError: false });
    await Promise.all(stores.map((store) => store.persist.rehydrate()));
    useWorkoutStore.getState().resetWorkout();
    useHistoryStore.getState().clearHistory();
    useAchievementStore.getState().resetAchievements();
    useSyncStore.getState().clearQueue();
    useCaffeineStore.setState({ currentWorkoutMg: 0, lastWorkoutMg: 0 });
    useWorkoutStore.getState().startWorkout('Atomic workout');
    useWorkoutStore.getState().addExercise('46a26651-02df-41d4-84ca-8452ebd20001');
    const exercise = useWorkoutStore.getState().exercises[0]!;
    useWorkoutStore
      .getState()
      .updateSet(exercise.id, exercise.sets[0]!.id, { weight: 20, reps: 10 });
    useWorkoutStore.getState().completeSet(exercise.id, exercise.sets[0]!.id);
  });
  afterEach(() => {
    db.close();
    mockRepository = undefined;
  });

  it('imports AsyncStorage data even when an empty MMKV instance is available, then reads only SQLite', async () => {
    const raw = JSON.stringify({ state: { count: 12 }, version: 1 });
    await AsyncStorage.setItem('legacy-test', raw);
    const storage = createHydratedStorage('legacy-test', z.object({ count: z.number() }), {
      count: 0,
    });
    expect((await storage.getItem('legacy-test'))?.state.count).toBe(12);
    await AsyncStorage.setItem('legacy-test', JSON.stringify({ state: { count: 99 }, version: 1 }));
    expect((await storage.getItem('legacy-test'))?.state.count).toBe(12);
    expect(db.prepare('SELECT raw FROM legacy_imports WHERE key = ?').get('legacy-test')?.raw).toBe(
      raw,
    );
  });

  it('leaves corrupt legacy data untouched and creates no successful import marker', async () => {
    await AsyncStorage.setItem('legacy-invalid', '{broken');
    const storage = createHydratedStorage('legacy-invalid', z.object({ count: z.number() }), {
      count: 0,
    });
    await expect(storage.getItem('legacy-invalid')).rejects.toThrow(StorageHydrationError);
    expect(() => storage.setItem('legacy-invalid', { state: { count: 0 } })).toThrow();
    expect(await AsyncStorage.getItem('legacy-invalid')).toBe('{broken');
    expect(mockRepository?.hasImported('legacy-invalid')).toBe(false);
  });

  it('commits history, outbox and completion once and restores them on hydration', async () => {
    const session = useWorkoutStore.getState().finishWorkout();
    expect(session?.id).toBeDefined();
    expect(useWorkoutStore.getState().finishWorkout()).toBeNull();
    expect(useHistoryStore.getState().sessions).toHaveLength(1);
    expect(useSyncStore.getState().queue).toHaveLength(1);
    const xp = useAchievementStore.getState().xp;
    withoutStorageWrites(() => {
      useHistoryStore.setState({ sessions: [] });
      useWorkoutStore.getState().resetWorkout();
      useSyncStore.setState({ queue: [] });
      useAchievementStore.setState({ xp: 0 });
    });
    await Promise.all(stores.map((store) => store.persist.rehydrate()));
    expect(useWorkoutStore.getState().status).toBe('finished');
    expect(useWorkoutStore.getState().lastFinishedSession?.id).toBe(session?.id);
    expect(useHistoryStore.getState().sessions[0]?.id).toBe(session?.id);
    expect(useSyncStore.getState().queue).toHaveLength(1);
    expect(useAchievementStore.getState().xp).toBe(xp);
  });
  it('rolls back SQL and UI on the last write, then allows a single successful retry', () => {
    const previous = stores.map((store) => store.getState());
    const snapshot = () =>
      [
        'state_documents',
        'workout_sessions',
        'session_exercises',
        'exercise_sets',
        'sync_operations',
      ].map((table) => db.prepare(`SELECT * FROM ${table} ORDER BY rowid`).all());
    const rowsBefore = snapshot();
    db.exec(
      "CREATE TRIGGER fail_finish BEFORE INSERT ON state_documents WHEN NEW.key = 'workout-storage' BEGIN SELECT RAISE(ABORT, 'injected full disk'); END;",
    );
    expect(() => useWorkoutStore.getState().finishWorkout()).toThrow();
    expect(stores.map((store) => store.getState())).toEqual(previous);
    expect(snapshot()).toEqual(rowsBefore);
    db.exec('DROP TRIGGER fail_finish');
    expect(useWorkoutStore.getState().finishWorkout()).not.toBeNull();
    expect(useHistoryStore.getState().sessions).toHaveLength(1);
    expect(useSyncStore.getState().queue).toHaveLength(1);
  });
  it('retains the last saved set in memory and SQLite if a set edit fails', () => {
    const previous = useWorkoutStore.getState();
    db.exec(
      "CREATE TRIGGER fail_set BEFORE INSERT ON state_documents WHEN NEW.key = 'workout-storage' BEGIN SELECT RAISE(ABORT, 'injected full disk'); END;",
    );
    const exercise = previous.exercises[0]!;
    useWorkoutStore.getState().updateSet(exercise.id, exercise.sets[0]!.id, { reps: 99 });
    expect(useWorkoutStore.getState()).toEqual(previous);
    expect(useStorageHealth.getState().writeError).toBe(true);
  });

  const account = (id: string): Session => ({
    access_token: 'test',
    refresh_token: 'test',
    expires_in: 3600,
    token_type: 'bearer',
    user: {
      id,
      app_metadata: {},
      user_metadata: {},
      aud: 'authenticated',
      created_at: '2026-09-11T10:00:00Z',
    },
  });
  const a = account('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa');
  const b = account('bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb');

  it('restores A, B and device-local data independently through the actual auth and hydration path', async () => {
    const guest = useWorkoutStore.getState().sessionId;
    await applyAccountSession(a);
    expect(useAuthStore.getState().sessionError).toBeNull();
    expect(useWorkoutStore.getState().status).toBe('idle');
    expect(useHistoryStore.getState().sessions).toEqual([]);
    expect(useSyncStore.getState().queue).toEqual([]);
    useProfileStore.getState().updateProfile({ displayName: 'A private' });
    useWorkoutStore.getState().startWorkout('A workout');
    useWorkoutStore.getState().addExercise('46a26651-02df-41d4-84ca-8452ebd20001');
    const exercise = useWorkoutStore.getState().exercises[0]!;
    useWorkoutStore
      .getState()
      .updateSet(exercise.id, exercise.sets[0]!.id, { weight: 80, reps: 5 });
    useWorkoutStore.getState().completeSet(exercise.id, exercise.sets[0]!.id);
    const finished = useWorkoutStore.getState().finishWorkout();
    expect(finished?.userId).toBe(a.user.id);
    useCoachStore.setState({
      messages: [
        {
          id: 'cccccccc-cccc-4ccc-8ccc-cccccccccccc',
          role: 'user',
          content: 'A private message',
          createdAt: new Date(),
        },
      ],
    });
    await applyAccountSession(b);
    expect(useAuthStore.getState().user?.id).toBe(b.user.id);
    expect(useHistoryStore.getState().sessions).toEqual([]);
    expect(useSyncStore.getState().queue).toEqual([]);
    expect(useCoachStore.getState().messages).toEqual([]);
    expect(useProfileStore.getState().profile.displayName).not.toBe('A private');
    useWorkoutStore.getState().startWorkout('B unfinished');
    const bWorkout = useWorkoutStore.getState().sessionId;
    await applyAccountSession(a);
    expect(useHistoryStore.getState().sessions[0]?.id).toBe(finished?.id);
    expect(useSyncStore.getState().queue).toHaveLength(1);
    expect(useProfileStore.getState().profile.displayName).toBe('A private');
    expect(useCoachStore.getState().messages[0]?.content).toBe('A private message');
    await applyAccountSession(null);
    expect(useWorkoutStore.getState().sessionId).toBe(guest);
    expect(useWorkoutStore.getState().status).toBe('active');
    expect(useHistoryStore.getState().sessions).toEqual([]);
    await applyAccountSession(b);
    expect(useWorkoutStore.getState().sessionId).toBe(bWorkout);
    expect(useWorkoutStore.getState().name).toBe('B unfinished');
    expect(isScopeChanging()).toBe(false);
  });
  it('keeps the account gate closed when B cannot hydrate and permits a protected retry', async () => {
    await applyAccountSession(a);
    useProfileStore.getState().updateProfile({ displayName: 'A preserved' });
    db.exec(
      "CREATE TRIGGER fail_b BEFORE INSERT ON legacy_imports WHEN NEW.partition LIKE '%bbbbbbbb%' BEGIN SELECT RAISE(ABORT, 'disk full'); END;",
    );
    await applyAccountSession(b);
    expect(useAuthStore.getState().user).toBeNull();
    expect(useAuthStore.getState().sessionError).not.toBeNull();
    expect(isScopeChanging()).toBe(true);
    db.exec('DROP TRIGGER fail_b');
    await applyAccountSession(b);
    expect(useAuthStore.getState().user?.id).toBe(b.user.id);
    expect(useAuthStore.getState().sessionError).toBeNull();
    await applyAccountSession(a);
    expect(useProfileStore.getState().profile.displayName).toBe('A preserved');
  });
  it('lets the newest rapid account change win without hydrating the superseded account into it', async () => {
    await Promise.all([applyAccountSession(a), applyAccountSession(b)]);
    expect(useAuthStore.getState().user?.id).toBe(b.user.id);
    expect(useAuthStore.getState().sessionError).toBeNull();
    expect(isScopeChanging()).toBe(false);
    expect(useWorkoutStore.getState().status).toBe('idle');
  });
  it('resets only the current account while preserving another account and device-local workouts', async () => {
    const guestId = useWorkoutStore.getState().sessionId;
    await applyAccountSession(a);
    useProfileStore.getState().updateProfile({ displayName: 'A private' });
    await applyAccountSession(b);
    useWorkoutStore.getState().startWorkout('B saved');
    const bId = useWorkoutStore.getState().sessionId;
    await applyAccountSession(a);
    await useProfileStore.getState().clearAllData();
    expect(useProfileStore.getState().profile.displayName).not.toBe('A private');
    await applyAccountSession(b);
    expect(useWorkoutStore.getState().sessionId).toBe(bId);
    await applyAccountSession(null);
    expect(useWorkoutStore.getState().sessionId).toBe(guestId);
  });
  it('persists all copied session/set details across native hydration with fresh IDs', async () => {
    const originalExercise = useWorkoutStore.getState().exercises[0]!;
    useWorkoutStore.setState({
      exercises: [{ ...originalExercise, supersetGroup: 'A', notes: 'Exercise cue' }],
    });
    useWorkoutStore.getState().updateWorkoutNotes('Workout cue');
    useWorkoutStore
      .getState()
      .updateSet(originalExercise.id, originalExercise.sets[0]!.id, {
        rir: 0,
        restSeconds: 125,
        durationSeconds: 45,
        distanceMeters: 20,
        notes: 'Set cue',
      });
    const history = useWorkoutStore.getState().finishWorkout()!;
    useWorkoutStore.getState().startWorkoutFromSession(history);
    const repeatedId = useWorkoutStore.getState().sessionId;
    const repeatedExercise = useWorkoutStore.getState().exercises[0]!;
    useWorkoutStore.getState().addSet(repeatedExercise.id);
    withoutStorageWrites(() => useWorkoutStore.getState().resetWorkout());
    await useWorkoutStore.persist.rehydrate();
    const restored = useWorkoutStore.getState();
    expect(restored.sessionId).toBe(repeatedId);
    expect(restored.sessionId).not.toBe(history.id);
    expect(restored.notes).toBe('Workout cue');
    expect(restored.exercises[0]).toMatchObject({ notes: 'Exercise cue', supersetGroup: 'A' });
    expect(restored.exercises[0]?.sets).toHaveLength(2);
    for (const set of restored.exercises[0]!.sets) {
      expect(set).toMatchObject({
        rir: 0,
        restSeconds: 125,
        durationSeconds: 45,
        distanceMeters: 20,
        notes: 'Set cue',
        completed: false,
      });
      expect(set).not.toHaveProperty('completedAt');
      expect(set.id).not.toBe(history.exercises[0]?.sets[0]?.id);
    }
    expect(useHistoryStore.getState().sessions[0]?.exercises[0]?.sets).toHaveLength(1);
    expect(useHistoryStore.getState().sessions[0]?.exercises[0]?.sets[0]?.completed).toBe(true);
  });
  it('restores template targets and uses prescribed rest including explicit zero', async () => {
    const template: WorkoutTemplate = {
      id: 'dddddddd-dddd-4ddd-8ddd-dddddddddddd',
      userId: a.user.id,
      name: 'Target test',
      isArchived: false,
      createdAt: new Date(),
      updatedAt: new Date(),
      exercises: [
        {
          id: 'eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee',
          exerciseId: '46a26651-02df-41d4-84ca-8452ebd20001',
          order: 0,
          targetSets: 2,
          targetReps: 8,
          targetRir: 0,
          targetRestSeconds: 125,
          supersetGroup: 'A',
          notes: 'Controlled',
        },
      ],
    };
    useWorkoutStore.getState().startWorkoutFromTemplate(template);
    withoutStorageWrites(() => useWorkoutStore.getState().resetWorkout());
    await useWorkoutStore.persist.rehydrate();
    const exercise = useWorkoutStore.getState().exercises[0]!;
    expect(exercise).toMatchObject({ supersetGroup: 'A', notes: 'Controlled' });
    expect(exercise.sets[0]).toMatchObject({ rir: 0, restSeconds: 125 });
    useWorkoutStore.getState().completeSet(exercise.id, exercise.sets[0]!.id);
    expect(useWorkoutStore.getState().restTimer).toMatchObject({
      isRunning: true,
      durationSeconds: 125,
    });
    useWorkoutStore.getState().updateSet(exercise.id, exercise.sets[1]!.id, { restSeconds: 0 });
    useWorkoutStore.getState().completeSet(exercise.id, exercise.sets[1]!.id);
    expect(useWorkoutStore.getState().restTimer).toEqual({ isRunning: false, durationSeconds: 0 });
  });
});
