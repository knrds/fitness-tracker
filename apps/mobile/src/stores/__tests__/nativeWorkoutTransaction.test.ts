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
    db = new DatabaseSync(':memory:');
    mockRepository = new DocumentDatabase({
      execSync: (sql) => db.exec(sql),
      runSync: (sql, ...parameters) => db.prepare(sql).run(...parameters),
      getFirstSync: (sql, ...parameters) => db.prepare(sql).get(...parameters) ?? null,
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
    const rowsBefore = db.prepare('SELECT * FROM state_documents ORDER BY key').all();
    db.exec(
      "CREATE TRIGGER fail_finish BEFORE INSERT ON state_documents WHEN NEW.key = 'workout-storage' BEGIN SELECT RAISE(ABORT, 'injected full disk'); END;",
    );
    expect(() => useWorkoutStore.getState().finishWorkout()).toThrow();
    expect(stores.map((store) => store.getState())).toEqual(previous);
    expect(db.prepare('SELECT * FROM state_documents ORDER BY key').all()).toEqual(rowsBefore);
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
});
