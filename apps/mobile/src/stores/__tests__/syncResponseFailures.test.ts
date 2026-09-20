import { useSyncStore } from '../syncStore';
import { useProfileStore } from '../profileStore';
import { useHistoryStore } from '../historyStore';
import { useProgramStore } from '../programStore';
import { useExerciseStore } from '../exerciseStore';
import { useBodyMetricStore } from '../bodyMetricStore';
import type { SyncOperation } from '@fitness-tracker/domain';
import { DatabaseSync } from 'node:sqlite';
import { DocumentDatabase } from '../../data/documentDatabase';
import { useStorageHealth } from '../storageHealth';

let mockRepository: DocumentDatabase | undefined;
jest.mock('../../data/deviceDatabase', () => ({
  usesDeviceDatabase: true,
  getDeviceDatabase: () => mockRepository,
}));

const mockUser = { id: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa' };
type Result = { data?: unknown; error?: { message: string } | null };
const mockRequest = jest.fn<Promise<Result>, [string, string]>();
jest.mock('../authStore', () => ({ useAuthStore: { getState: () => ({ user: mockUser }) } }));
jest.mock('../../utils/supabase', () => ({
  isSupabaseConfigured: true,
  supabase: {
    from: (table: string) => {
      let action = 'select';
      const response = Promise.resolve().then(() => mockRequest(table, action));
      const query = Object.assign(response, {
        select: () => query,
        eq: () => query,
        in: () => query,
        single: () => query,
        upsert: () => {
          action = 'upsert';
          return query;
        },
        insert: () => {
          action = 'insert';
          return query;
        },
        delete: () => {
          action = 'delete';
          return query;
        },
      });
      return query;
    },
  },
}));
const id = 'cccccccc-cccc-4ccc-8ccc-cccccccccccc';
const date = new Date('2026-09-19T12:00:00Z');
const localSession = {
  id,
  userId: mockUser.id,
  name: 'Local history',
  startedAt: date,
  createdAt: date,
  updatedAt: date,
  exercises: [],
};
const remoteProfile = {
  id: mockUser.id,
  email: 'fixture@example.test',
  display_name: 'Cloud profile',
  preferred_units: 'metric',
  created_at: date.toISOString(),
  updated_at: date.toISOString(),
};
function defaults(table: string, action: string): Result {
  if (action !== 'select') return { error: null };
  if (table === 'users') return { data: remoteProfile, error: null };
  if (table === 'session_exercises') return { data: [{ id }], error: null };
  return { data: [], error: null };
}
function operation(table: SyncOperation['table'], payload: unknown): SyncOperation {
  return { id, table, operation: 'UPDATE', payload, createdAt: date, retryCount: 0 };
}

describe('sync response failure boundaries', () => {
  const originalFetch = global.fetch;
  let database: DatabaseSync;
  beforeEach(async () => {
    database = new DatabaseSync(':memory:');
    mockRepository = new DocumentDatabase({
      execSync: (sql) => database.exec(sql),
      runSync: (sql, ...parameters) => database.prepare(sql).run(...parameters),
      getFirstSync: (sql, ...parameters) => database.prepare(sql).get(...parameters) ?? null,
      getAllSync: (sql, ...parameters) => database.prepare(sql).all(...parameters),
    });
    useStorageHealth.setState({ blockedStores: [], writeError: false });
    await Promise.all([
      useSyncStore.persist.rehydrate(),
      useProfileStore.persist.rehydrate(),
      useHistoryStore.persist.rehydrate(),
      useProgramStore.persist.rehydrate(),
      useExerciseStore.persist.rehydrate(),
      useBodyMetricStore.persist.rehydrate(),
    ]);
    process.env.EXPO_PUBLIC_SUPABASE_URL = 'https://example.invalid';
    global.fetch = jest.fn().mockResolvedValue({ ok: true });
    mockRequest.mockReset().mockImplementation(async (table, action) => defaults(table, action));
    useSyncStore.setState({ queue: [], isSyncing: false, syncError: null, lastSyncedAt: null });
    useProfileStore.setState({
      profile: { ...useProfileStore.getState().profile, displayName: 'Local profile' },
    });
    useHistoryStore.setState({ sessions: [localSession] });
    useProgramStore.setState({ templates: [], programs: [] });
    useExerciseStore.setState({ customExercises: [] });
    useBodyMetricStore.setState({ metrics: [] });
    jest.spyOn(console, 'error').mockImplementation(() => {});
    jest.spyOn(console, 'warn').mockImplementation(() => {});
  });
  afterEach(() => {
    global.fetch = originalFetch;
    delete process.env.EXPO_PUBLIC_SUPABASE_URL;
    jest.restoreAllMocks();
    database.close();
    mockRepository = undefined;
  });

  const aggregates: [SyncOperation['table'], unknown, string, string][] = [
    ['workout_sessions', localSession, 'session_exercises', 'select'],
    ['workout_sessions', localSession, 'exercise_sets', 'delete'],
    ['workout_sessions', localSession, 'session_exercises', 'delete'],
    [
      'workout_templates',
      {
        id,
        userId: mockUser.id,
        name: 'Template',
        exercises: [],
        isArchived: false,
        createdAt: date,
        updatedAt: date,
      },
      'template_exercises',
      'delete',
    ],
    [
      'programs',
      {
        id,
        userId: mockUser.id,
        name: 'Program',
        durationWeeks: 4,
        workouts: [],
        isActive: false,
        createdAt: date,
        updatedAt: date,
      },
      'program_workouts',
      'delete',
    ],
  ];
  it.each(aggregates)(
    'retains %s when %s preparation fails (%s/%s)',
    async (table, payload, failedTable, failedAction) => {
      mockRequest.mockImplementation(async (name, action) =>
        name === failedTable && action === failedAction
          ? { data: null, error: { message: 'Cloud request failed' } }
          : defaults(name, action),
      );
      const queued = operation(table, payload);
      useSyncStore.setState({ queue: [queued] });
      await useSyncStore.getState().processQueue();
      expect(useSyncStore.getState().queue).toEqual([{ ...queued, retryCount: 1 }]);
      expect(useSyncStore.getState().lastSyncedAt).toBeNull();
      expect(useSyncStore.getState().isSyncing).toBe(false);
      expect(mockRequest.mock.calls.at(-1)).toEqual([failedTable, failedAction]);
    },
  );

  it.each([
    'users',
    'exercises',
    'workout_templates',
    'programs',
    'workout_sessions',
    'body_metrics',
  ])('does not apply any pull data when %s fails', async (failedTable) => {
    mockRequest.mockImplementation(async (table, action) =>
      table === failedTable
        ? { data: null, error: { message: 'Cloud read failed' } }
        : defaults(table, action),
    );
    await useSyncStore.getState().pullFromCloud();
    expect(useProfileStore.getState().profile.displayName).toBe('Local profile');
    expect(useHistoryStore.getState().sessions).toEqual([localSession]);
    expect(useSyncStore.getState().lastSyncedAt).toBeNull();
    expect(useSyncStore.getState().syncError).toBeTruthy();
    expect(useSyncStore.getState().isSyncing).toBe(false);
  });

  it('does not replace local history when an embedded relation is missing', async () => {
    mockRequest.mockImplementation(async (table, action) =>
      table === 'workout_sessions'
        ? {
            data: [
              {
                id,
                user_id: mockUser.id,
                name: 'Incomplete cloud row',
                started_at: date.toISOString(),
                created_at: date.toISOString(),
                updated_at: '2026-09-20T12:00:00Z',
              },
            ],
            error: null,
          }
        : defaults(table, action),
    );
    await useSyncStore.getState().pullFromCloud();
    expect(useProfileStore.getState().profile.displayName).toBe('Local profile');
    expect(useHistoryStore.getState().sessions).toEqual([localSession]);
    expect(useSyncStore.getState().lastSyncedAt).toBeNull();
    expect(useSyncStore.getState().syncError).toBeTruthy();
  });

  it('treats a null collection without an error as an invalid response', async () => {
    mockRequest.mockImplementation(async (table, action) =>
      table === 'body_metrics' ? { data: null, error: null } : defaults(table, action),
    );
    await useSyncStore.getState().pullFromCloud();
    expect(useProfileStore.getState().profile.displayName).toBe('Local profile');
    expect(useSyncStore.getState().lastSyncedAt).toBeNull();
    expect(useSyncStore.getState().syncError).toBeTruthy();
  });

  it('does not pull over a pending local update', async () => {
    const queued = operation('workout_sessions', localSession);
    useSyncStore.setState({ queue: [queued] });
    await useSyncStore.getState().pullFromCloud();
    expect(mockRequest).not.toHaveBeenCalled();
    expect(useSyncStore.getState().queue).toEqual([queued]);
    expect(useProfileStore.getState().profile.displayName).toBe('Local profile');
  });

  it('discards a read snapshot when a local change appears during its requests', async () => {
    const queued = operation('workout_sessions', localSession);
    mockRequest.mockImplementation(async (table, action) => {
      if (table === 'body_metrics') useSyncStore.setState({ queue: [queued] });
      return defaults(table, action);
    });
    await useSyncStore.getState().pullFromCloud();
    expect(useProfileStore.getState().profile.displayName).toBe('Local profile');
    expect(useSyncStore.getState().queue).toEqual([queued]);
    expect(useSyncStore.getState().lastSyncedAt).toBeNull();
  });

  it('applies a complete successful pull without deleting local-only history', async () => {
    await useSyncStore.getState().pullFromCloud();
    expect(useProfileStore.getState().profile.displayName).toBe('Cloud profile');
    expect(useHistoryStore.getState().sessions).toEqual([localSession]);
    expect(useSyncStore.getState().lastSyncedAt).toBeInstanceOf(Date);
    expect(useSyncStore.getState().syncError).toBeNull();
  });

  it('rolls back SQLite and all memory projections when a later store write fails', async () => {
    const originalProfile = mockRepository!.read('profile-storage');
    const originalHistory = mockRepository!.read('history-storage');
    expect(originalHistory).not.toBeNull();
    const writes = jest.spyOn(mockRepository!, 'write');
    mockRequest.mockImplementation(async (table, action) =>
      table === 'body_metrics'
        ? {
            data: [
              {
                id,
                user_id: mockUser.id,
                weight_kg: 80,
                recorded_at: date.toISOString(),
                created_at: date.toISOString(),
              },
            ],
            error: null,
          }
        : table === 'workout_sessions'
          ? {
              data: [
                {
                  id,
                  user_id: mockUser.id,
                  name: 'Cloud history',
                  started_at: date.toISOString(),
                  created_at: date.toISOString(),
                  updated_at: '2026-09-20T12:00:00Z',
                  session_exercises: [],
                },
              ],
              error: null,
            }
          : defaults(table, action),
    );
    database.exec(
      "CREATE TRIGGER fail_pull BEFORE INSERT ON state_documents WHEN NEW.key = 'body-metric-storage' BEGIN SELECT RAISE(ABORT, 'test write failure'); END",
    );
    await useSyncStore.getState().pullFromCloud();
    expect(writes).toHaveBeenCalledWith(
      'history-storage',
      expect.stringContaining('Cloud history'),
      expect.any(String),
    );
    expect(useProfileStore.getState().profile.displayName).toBe('Local profile');
    expect(useHistoryStore.getState().sessions).toEqual([localSession]);
    expect(useBodyMetricStore.getState().metrics).toEqual([]);
    expect(mockRepository!.read('profile-storage')).toEqual(originalProfile);
    expect(mockRepository!.read('history-storage')).toEqual(originalHistory);
    expect(useSyncStore.getState().lastSyncedAt).toBeNull();
    expect(useSyncStore.getState().syncError).toBeTruthy();
  });

  it('rejects rows owned by another account without applying the snapshot', async () => {
    mockRequest.mockImplementation(async (table, action) =>
      table === 'body_metrics'
        ? {
            data: [
              {
                id,
                user_id: 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',
                weight_kg: 80,
                recorded_at: date.toISOString(),
                created_at: date.toISOString(),
              },
            ],
            error: null,
          }
        : defaults(table, action),
    );
    await useSyncStore.getState().pullFromCloud();
    expect(useProfileStore.getState().profile.displayName).toBe('Local profile');
    expect(useBodyMetricStore.getState().metrics).toEqual([]);
    expect(useSyncStore.getState().lastSyncedAt).toBeNull();
    expect(useSyncStore.getState().syncError).toBeTruthy();
  });
});
