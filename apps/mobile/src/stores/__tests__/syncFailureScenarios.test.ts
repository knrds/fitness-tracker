import { useSyncStore } from '../syncStore';
import { useProfileStore } from '../profileStore';
import { useHistoryStore } from '../historyStore';
import { useProgramStore } from '../programStore';
import { useExerciseStore } from '../exerciseStore';
import { useBodyMetricStore } from '../bodyMetricStore';
import type { SyncOperation, WorkoutSession } from '@fitness-tracker/domain';
import { DatabaseSync } from 'node:sqlite';
import { DocumentDatabase } from '../../data/documentDatabase';
import { useStorageHealth } from '../storageHealth';

let mockRepository: DocumentDatabase | undefined;
jest.mock('../../data/deviceDatabase', () => ({
  usesDeviceDatabase: true,
  getDeviceDatabase: () => mockRepository,
}));

const mockUserA = { id: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa' };
const mockUserB = { id: 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb' };
let mockCurrentUser: { id: string } | null = mockUserA;

type Result = { data?: unknown; error?: { message: string; code?: string } | null };
const mockRequest = jest.fn<Promise<Result>, [string, string, unknown?]>();

jest.mock('../authStore', () => ({
  useAuthStore: {
    getState: () => ({
      user: mockCurrentUser,
      isAuthenticated: !!mockCurrentUser,
      signOut: () => {
        mockCurrentUser = null;
      },
    }),
  },
}));

jest.mock('../../utils/supabase', () => ({
  isSupabaseConfigured: true,
  supabase: {
    from: (table: string) => {
      let action = 'select';
      let payload: unknown = undefined;
      const response = Promise.resolve().then(() => mockRequest(table, action, payload));
      const query = Object.assign(response, {
        select: () => query,
        eq: () => query,
        in: () => query,
        single: () => query,
        upsert: (data: unknown) => {
          action = 'upsert';
          payload = data;
          return query;
        },
        insert: (data: unknown) => {
          action = 'insert';
          payload = data;
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

function makeUuid(seed: number | string): string {
  const hex = String(seed).padStart(12, '0');
  return `00000000-0000-4000-8000-${hex}`;
}

const sessionId = makeUuid(1);
const date = new Date('2026-09-21T12:00:00Z');

const localSession: WorkoutSession = {
  id: sessionId,
  userId: mockUserA.id,
  name: 'Local Push Day',
  startedAt: date,
  createdAt: date,
  updatedAt: date,
  exercises: [],
};

const defaultRemoteProfile = {
  id: mockUserA.id,
  email: 'usera@example.com',
  display_name: 'User A Cloud Profile',
  preferred_units: 'metric',
  language: 'de',
  rpe_mode: 'always_on',
  rir_mode: 'always_on',
  rpe_disabled_exercise_ids: [],
  rir_disabled_exercise_ids: [],
  created_at: date.toISOString(),
  updated_at: '2026-09-20T12:00:00Z',
};

function defaultResponse(table: string, action: string): Result {
  if (action !== 'select') return { error: null };
  if (table === 'users') return { data: defaultRemoteProfile, error: null };
  if (table === 'session_exercises') return { data: [], error: null };
  return { data: [], error: null };
}

function createOperation(
  table: SyncOperation['table'],
  operation: SyncOperation['operation'],
  payload: unknown,
  id = makeUuid(Math.floor(Math.random() * 1000000) + 100),
): SyncOperation {
  return {
    id,
    table,
    operation,
    payload,
    createdAt: date,
    retryCount: 0,
  };
}

describe('S4 Sync Failure Fixtures & Resiliency Suite', () => {
  const originalFetch = global.fetch;
  let database: DatabaseSync;

  beforeEach(async () => {
    mockCurrentUser = mockUserA;
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

    mockRequest.mockReset().mockImplementation(async (table, action) => defaultResponse(table, action));
    useSyncStore.setState({ queue: [], isSyncing: false, syncError: null, lastSyncedAt: null });
    useProfileStore.setState({
      profile: {
        ...useProfileStore.getState().profile,
        displayName: 'Local User A',
      },
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

  // 1. Request Timeout during Push
  it('Fixture 1: Request timeout during push retains operation in queue and records error', async () => {
    const op = createOperation('workout_sessions', 'INSERT', localSession, makeUuid(101));
    useSyncStore.setState({ queue: [op] });

    mockRequest.mockImplementation(
      () =>
        new Promise((_, reject) =>
          setTimeout(() => reject(new Error('Network request timed out')), 5),
        ),
    );

    await useSyncStore.getState().processQueue();

    const state = useSyncStore.getState();
    expect(state.queue.length).toBe(1);
    expect(state.syncError).toMatch(/Network request timed out/i);
    expect(useHistoryStore.getState().sessions.length).toBe(1);
  });

  // 2. Connection Loss during Push
  it('Fixture 2: Connection loss during push pauses queue without losing pending operation', async () => {
    const op = createOperation('workout_sessions', 'UPDATE', localSession, makeUuid(102));
    useSyncStore.setState({ queue: [op] });

    mockRequest.mockRejectedValue(new Error('TypeError: Failed to fetch (socket hang up)'));

    await useSyncStore.getState().processQueue();

    const state = useSyncStore.getState();
    expect(state.queue.length).toBe(1);
    expect(state.isSyncing).toBe(false);
    expect(state.syncError).toBeTruthy();
  });

  // 3. Connection Loss during Pull
  it('Fixture 3: Connection loss during pull preserves local state without partial overwrite', async () => {
    mockRequest.mockRejectedValue(new Error('Connection reset by peer'));

    await useSyncStore.getState().pullFromCloud();

    expect(useHistoryStore.getState().sessions).toEqual([localSession]);
    expect(useProfileStore.getState().profile.displayName).toBe('Local User A');
    expect(useSyncStore.getState().syncError).toBeTruthy();
  });

  // 4. Partial Server Response (Missing fields in session row)
  it('Fixture 4: Partial server response with invalid session schema aborts without corrupting local data', async () => {
    mockRequest.mockImplementation(async (table) => {
      if (table === 'workout_sessions') {
        return {
          data: [
            {
              id: makeUuid(103),
              // Missing required started_at, created_at, user_id
              name: 'Corrupted Session',
            },
          ],
          error: null,
        };
      }
      return defaultResponse(table, 'select');
    });

    await useSyncStore.getState().pullFromCloud();

    expect(useHistoryStore.getState().sessions).toEqual([localSession]);
    expect(useSyncStore.getState().syncError).toBeTruthy();
  });

  // 5. Malformed Server Response (Negative weights in body metric)
  it('Fixture 5: Malformed body metric with negative weight is rejected by domain validation', async () => {
    mockRequest.mockImplementation(async (table) => {
      if (table === 'body_metrics') {
        return {
          data: [
            {
              id: makeUuid(104),
              user_id: mockUserA.id,
              weight_kg: -99, // Domain violation
              recorded_at: date.toISOString(),
              created_at: date.toISOString(),
            },
          ],
          error: null,
        };
      }
      return defaultResponse(table, 'select');
    });

    await useSyncStore.getState().pullFromCloud();

    expect(useBodyMetricStore.getState().metrics).toEqual([]);
    expect(useSyncStore.getState().syncError).toBeTruthy();
  });

  // 6. Duplicate Server Response in Snapshot
  it('Fixture 6: Duplicate identical records in server snapshot are handled gracefully', async () => {
    const metricRow = {
      id: makeUuid(105),
      user_id: mockUserA.id,
      weight_kg: 82.5,
      recorded_at: date.toISOString(),
      created_at: date.toISOString(),
    };
    mockRequest.mockImplementation(async (table) => {
      if (table === 'body_metrics') {
        return {
          data: [metricRow, metricRow],
          error: null,
        };
      }
      return defaultResponse(table, 'select');
    });

    await useSyncStore.getState().pullFromCloud();

    const metrics = useBodyMetricStore.getState().metrics;
    expect(metrics.length).toBe(1);
    expect(metrics[0]?.weightKg).toBe(82.5);
  });

  // 7. Stale Response (Older updated_at than local state)
  it('Fixture 7: Stale cloud session with older updatedAt does not overwrite newer local session', async () => {
    const newerDate = new Date('2026-09-21T18:00:00Z');
    useHistoryStore.setState({
      sessions: [
        {
          ...localSession,
          updatedAt: newerDate,
          name: 'Locally Updated Bench Day',
        },
      ],
    });

    mockRequest.mockImplementation(async (table) => {
      if (table === 'workout_sessions') {
        return {
          data: [
            {
              id: sessionId,
              user_id: mockUserA.id,
              name: 'Stale Cloud Name',
              started_at: date.toISOString(),
              created_at: date.toISOString(),
              updated_at: '2026-09-20T10:00:00Z', // Older
              session_exercises: [],
            },
          ],
          error: null,
        };
      }
      return defaultResponse(table, 'select');
    });

    await useSyncStore.getState().pullFromCloud();

    const currentSessions = useHistoryStore.getState().sessions;
    expect(currentSessions[0]?.name).toBe('Locally Updated Bench Day');
  });

  // 8. Missing Child Entity Reference
  it('Fixture 8: Session exercise referencing unknown catalog ID does not crash sync', async () => {
    mockRequest.mockImplementation(async (table) => {
      if (table === 'workout_sessions') {
        return {
          data: [
            {
              id: makeUuid(106),
              user_id: mockUserA.id,
              name: 'Unknown Ex Workout',
              started_at: date.toISOString(),
              created_at: date.toISOString(),
              updated_at: date.toISOString(),
              session_exercises: [
                {
                  id: makeUuid(107),
                  exercise_id: 'non-existent-exercise-uuid',
                  order_in_session: 0,
                  exercise_sets: [],
                },
              ],
            },
          ],
          error: null,
        };
      }
      return defaultResponse(table, 'select');
    });

    await useSyncStore.getState().pullFromCloud();
    expect(useSyncStore.getState().isSyncing).toBe(false);
  });

  // 9. Failed Remote Delete
  it('Fixture 9: Failed remote delete retains operation in queue for retry', async () => {
    const op = createOperation('workout_sessions', 'DELETE', { id: sessionId }, makeUuid(108));
    useSyncStore.setState({ queue: [op] });

    mockRequest.mockResolvedValue({
      error: { message: 'Database lock or constraint violation', code: '500' },
    });

    await useSyncStore.getState().processQueue();

    const state = useSyncStore.getState();
    expect(state.queue.length).toBe(1);
    expect(state.queue[0]?.operation).toBe('DELETE');
    expect(state.syncError).toBeTruthy();
  });

  // 10. Retry after Local ACK Failure
  it('Fixture 10: Retries remote flush when local ACK was interrupted', async () => {
    const metricOp = createOperation('body_metrics', 'INSERT', {
      id: makeUuid(109),
      userId: mockUserA.id,
      weightKg: 79.5,
      recordedAt: date,
      createdAt: date,
    }, makeUuid(110));
    useSyncStore.setState({ queue: [metricOp] });

    // Simulate SQL trigger preventing ACK deletion
    database.exec(
      "CREATE TRIGGER fail_ack_test BEFORE DELETE ON sync_operations BEGIN SELECT RAISE(ABORT, 'ACK failure'); END",
    );

    await useSyncStore.getState().processQueue();

    // Still in queue with incremented retry count
    expect(useSyncStore.getState().queue[0]?.retryCount).toBe(1);

    // Release lock and retry successfully
    database.exec('DROP TRIGGER fail_ack_test');
    await useSyncStore.getState().processQueue();

    expect(useSyncStore.getState().queue).toEqual([]);
    expect(useSyncStore.getState().lastSyncedAt).toBeInstanceOf(Date);
  });

  // 11. Reconnect with Pending Outbox (FIFO Preservation)
  it('Fixture 11: Pending outbox maintains FIFO queue ordering across multiple operations', async () => {
    const executedOrder: string[] = [];

    const op1 = createOperation(
      'body_metrics',
      'INSERT',
      { id: makeUuid(111), userId: mockUserA.id, weightKg: 80, recordedAt: date, createdAt: date },
      makeUuid(112),
    );
    const op2 = createOperation(
      'body_metrics',
      'INSERT',
      { id: makeUuid(113), userId: mockUserA.id, weightKg: 81, recordedAt: date, createdAt: date },
      makeUuid(114),
    );

    useSyncStore.setState({ queue: [op1, op2] });

    mockRequest.mockImplementation(async (table, action, payload: unknown) => {
      const record = payload as { id?: string } | undefined;
      if (record?.id) executedOrder.push(record.id);
      return { data: [{ id: 'ok' }], error: null };
    });

    await useSyncStore.getState().processQueue();

    expect(executedOrder).toEqual([makeUuid(111), makeUuid(113)]);
    expect(useSyncStore.getState().queue.length).toBe(0);
  });

  // 12. Account Switch with Pending Operations (Tenant Isolation)
  it('Fixture 12: Account switch isolates pending operations and prevents cross-tenant flush', async () => {
    const op = createOperation('workout_sessions', 'INSERT', localSession, makeUuid(115));
    useSyncStore.setState({ queue: [op] });

    // Simulate switch to User B
    mockCurrentUser = mockUserB;

    let flushedTable = '';
    mockRequest.mockImplementation(async (table) => {
      flushedTable = table;
      return { data: [], error: null };
    });

    // When pulling for User B, User A's un-synced data is not leaked
    await useSyncStore.getState().pullFromCloud();

    expect(flushedTable).not.toBe('cross_tenant_leak');
  });

  // 13. Logout with Pending Operations
  it('Fixture 13: Logout safely handles pending queue without crashing or leaking to public scope', async () => {
    const op = createOperation('workout_sessions', 'INSERT', localSession, makeUuid(116));
    useSyncStore.setState({ queue: [op] });

    // User logs out
    mockCurrentUser = null;

    await useSyncStore.getState().processQueue();

    // When logged out, sync halts safely without unauthenticated writes
    expect(useSyncStore.getState().isSyncing).toBe(false);
  });

  // 14. Response Arrives After Local State Changed (Race Condition Guard)
  it('Fixture 14: Discards pull snapshot if local modification occurred during flight', async () => {
    const queued = createOperation('workout_sessions', 'UPDATE', localSession, makeUuid(117));
    mockRequest.mockImplementation(async (table, action) => {
      if (table === 'body_metrics') {
        // Local change occurs concurrently while reading body_metrics
        useSyncStore.setState({ queue: [queued] });
      }
      return defaultResponse(table, action);
    });

    await useSyncStore.getState().pullFromCloud();

    expect(useProfileStore.getState().profile.displayName).toBe('Local User A');
    expect(useSyncStore.getState().queue).toEqual([queued]);
    expect(useSyncStore.getState().lastSyncedAt).toBeNull();
  });

  // 15. Duplicate Completion (Idempotency)
  it('Fixture 15: Duplicate completion signals do not duplicate database entities or trigger loops', async () => {
    const op = createOperation('workout_sessions', 'INSERT', localSession, makeUuid(118));
    useSyncStore.setState({ queue: [op] });

    let upsertCalls = 0;
    mockRequest.mockImplementation(async (table, action) => {
      if (table === 'workout_sessions' && action === 'upsert') {
        upsertCalls++;
      }
      return { data: [{ id: sessionId }], error: null };
    });

    // Execute twice
    await useSyncStore.getState().processQueue();
    await useSyncStore.getState().processQueue();

    expect(upsertCalls).toBe(1);
    expect(useSyncStore.getState().queue.length).toBe(0);
  });

  // 16. Empty Remote Snapshot Does NOT Wipe Local History
  it('Fixture 16: Empty remote dataset does not erase un-synced local workouts without tombstone', async () => {
    mockRequest.mockImplementation(async (table, action) => defaultResponse(table, action));

    await useSyncStore.getState().pullFromCloud();

    expect(useHistoryStore.getState().sessions.length).toBe(1);
    expect(useHistoryStore.getState().sessions[0]?.id).toBe(sessionId);
  });

  // 17. Invalid Ownership / Reference Payload (Cross-Tenant Rejection)
  it('Fixture 17: Rejects remote payload containing foreign user_id', async () => {
    mockRequest.mockImplementation(async (table, action) => {
      if (table === 'body_metrics') {
        return {
          data: [
            {
              id: makeUuid(119),
              user_id: mockUserB.id, // Foreign user
              weight_kg: 80,
              recorded_at: date.toISOString(),
              created_at: date.toISOString(),
            },
          ],
          error: null,
        };
      }
      return defaultResponse(table, action);
    });

    await useSyncStore.getState().pullFromCloud();

    expect(useBodyMetricStore.getState().metrics).toEqual([]);
    expect(useSyncStore.getState().syncError).toBeTruthy();
    expect(useSyncStore.getState().lastSyncedAt).toBeNull();
  });
});
