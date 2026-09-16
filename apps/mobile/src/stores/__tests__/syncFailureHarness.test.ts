import { useSyncStore } from '../syncStore';
import { useAuthStore } from '../authStore';
import { User as SupabaseUser } from '@supabase/supabase-js';

jest.mock('expo-crypto', () => {
  let counter = 0;
  return {
    randomUUID: () => `test-uuid-${++counter}`,
  };
});

// Mock Supabase client
let mockIsConfigured = true;
let mockFetchFail = false;
let mockSupabaseFail = false;
let mockPostgresError: Error | null = null;
const mockUpsertSpy = jest.fn();
const mockDeleteSpy = jest.fn();

process.env.EXPO_PUBLIC_SUPABASE_URL = 'https://mock.supabase.co';

jest.mock('../../utils/supabase', () => ({
  get isSupabaseConfigured() {
    return mockIsConfigured;
  },
  supabase: {
    from: (table: string) => ({
      upsert: jest.fn(async (payload) => {
        mockUpsertSpy(table, payload);
        if (mockSupabaseFail) return { error: { message: 'Network request failed', code: 'PGRST' } };
        if (mockPostgresError) return { error: { message: mockPostgresError.message, code: '23505' } };
        return { error: null };
      }),
      delete: jest.fn(() => ({
        eq: jest.fn(async (col, val) => {
          mockDeleteSpy(table, col, val);
          if (mockSupabaseFail) return { error: { message: 'Network request failed', code: 'PGRST' } };
          if (mockPostgresError) return { error: { message: mockPostgresError.message, code: '23505' } };
          return { error: null };
        }),
        in: jest.fn(async () => ({ error: null })),
      })),
      select: jest.fn(() => ({
        eq: jest.fn(async () => ({ data: [] })),
      })),
    }),
  },
}));

// Mock fetch for connectivity check
const originalFetch = global.fetch;
beforeAll(() => {
  global.fetch = jest.fn(async () => {
    if (mockFetchFail) throw new Error('Network unreachable');
    return new Response(null, { status: 200 });
  }) as jest.Mock;
});

afterAll(() => {
  global.fetch = originalFetch;
});

describe('Sync Failure Test Harness & Resilience Verification', () => {
  const TEST_USER = {
    id: '11111111-1111-4111-8111-111111111111',
    email: 'sync@evaro.app',
    displayName: 'Sync Tester',
    preferredUnits: 'metric' as const,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
    mockIsConfigured = true;
    mockFetchFail = false;
    mockSupabaseFail = false;
    mockPostgresError = null;

    useAuthStore.setState({
      user: { ...TEST_USER } as unknown as SupabaseUser,
    });

    useSyncStore.setState({
      queue: [],
      isSyncing: false,
      isOnline: true,
      syncError: null,
      lastSyncedAt: null,
    });
  });

  test('Harness 1: Duplicate enqueue of same entity appends distinct FIFO entries', () => {
    const metricPayload = {
      id: '00000000-0000-4000-8000-000000000001',
      userId: TEST_USER.id,
      recordedAt: new Date().toISOString(),
      weightKg: 80.0,
      createdAt: new Date().toISOString(),
    };

    useSyncStore.getState().addToQueue('body_metrics', 'INSERT', metricPayload);
    useSyncStore.getState().addToQueue('body_metrics', 'UPDATE', { ...metricPayload, weightKg: 80.5 });

    const queue = useSyncStore.getState().queue;
    expect(queue).toHaveLength(2);
    expect(queue[0]!.operation).toBe('INSERT');
    expect(queue[1]!.operation).toBe('UPDATE');
    expect(queue[0]!.id).not.toBe(queue[1]!.id);
  });

  test('Harness 2: Same mutation retried when network fails (increments retryCount and retains in queue)', async () => {
    mockSupabaseFail = true;

    const metricPayload = {
      id: '00000000-0000-4000-8000-000000000002',
      userId: TEST_USER.id,
      recordedAt: new Date().toISOString(),
      weightKg: 82.0,
      createdAt: new Date().toISOString(),
    };

    useSyncStore.setState({
      queue: [
        {
          id: 'op-1',
          table: 'body_metrics',
          operation: 'INSERT',
          payload: metricPayload,
          createdAt: new Date(),
          retryCount: 0,
        },
      ],
    });

    await useSyncStore.getState().processQueue();

    const state = useSyncStore.getState();
    expect(state.queue).toHaveLength(1);
    expect(state.queue[0]!.retryCount).toBe(1);
    expect(state.isOnline).toBe(false);
    expect(state.syncError).toContain('Network');
    expect(state.isSyncing).toBe(false);
  });

  test('Harness 3: Network timeout halts queue gracefully without dropping operations', async () => {
    mockFetchFail = true;

    useSyncStore.setState({
      queue: [
        {
          id: 'op-timeout',
          table: 'personal_records',
          operation: 'INSERT',
          payload: {
            id: '00000000-0000-4000-8000-000000000003',
            userId: TEST_USER.id,
            exerciseId: '22222222-2222-4222-8222-222222222222',
            type: 'one_rep_max',
            value: 120,
            achievedAt: new Date().toISOString(),
          },
          createdAt: new Date(),
          retryCount: 0,
        },
      ],
    });

    await useSyncStore.getState().processQueue();

    expect(useSyncStore.getState().queue).toHaveLength(1);
    expect(useSyncStore.getState().isSyncing).toBe(false);
  });

  test('Harness 4: Partial failure (first op fails) preserves remaining queue items in strict order', async () => {
    mockPostgresError = new Error('Database constraint violation');

    useSyncStore.setState({
      queue: [
        {
          id: 'op-corrupt',
          table: 'body_metrics',
          operation: 'INSERT',
          payload: {
            id: '00000000-0000-4000-8000-000000000004',
            userId: TEST_USER.id,
            recordedAt: new Date().toISOString(),
            createdAt: new Date().toISOString(),
          },
          createdAt: new Date(),
          retryCount: 0,
        },
        {
          id: 'op-subsequent',
          table: 'body_metrics',
          operation: 'INSERT',
          payload: {
            id: '00000000-0000-4000-8000-000000000005',
            userId: TEST_USER.id,
            recordedAt: new Date().toISOString(),
            weightKg: 75.0,
            createdAt: new Date().toISOString(),
          },
          createdAt: new Date(),
          retryCount: 0,
        },
      ],
    });

    await useSyncStore.getState().processQueue();

    // The failing op stopped execution, preserving FIFO sequence
    const queue = useSyncStore.getState().queue;
    expect(queue).toHaveLength(2);
    expect(queue[0]!.id).toBe('op-corrupt');
    expect(queue[0]!.retryCount).toBe(1);
    expect(queue[1]!.id).toBe('op-subsequent');
    expect(queue[1]!.retryCount).toBe(0);
  });

  test('Harness 5: ClearQueue empties queue explicitly (e.g. on manual reset or confirmed wipe)', () => {
    useSyncStore.setState({
      queue: [
        {
          id: 'op-1',
          table: 'body_metrics',
          operation: 'INSERT',
          payload: {},
          createdAt: new Date(),
          retryCount: 0,
        },
      ],
    });

    useSyncStore.getState().clearQueue();
    expect(useSyncStore.getState().queue).toHaveLength(0);
  });

  test('Harness 6: Logout / account switch aborts sync and does not process old queue', async () => {
    useSyncStore.setState({
      queue: [
        {
          id: 'op-user-1',
          table: 'body_metrics',
          operation: 'INSERT',
          payload: {
            id: '00000000-0000-4000-8000-000000000006',
            userId: TEST_USER.id,
            recordedAt: new Date().toISOString(),
            createdAt: new Date().toISOString(),
          },
          createdAt: new Date(),
          retryCount: 0,
        },
      ],
    });

    // Switch user to logged out
    useAuthStore.setState({
      user: null,
    });

    await useSyncStore.getState().processQueue();

    // Since user was null, processQueue returned immediately without calling Supabase
    expect(mockUpsertSpy).not.toHaveBeenCalled();
    // Queue remains intact for when user logs back in
    expect(useSyncStore.getState().queue).toHaveLength(1);
  });

  test('Harness 7: Delete queued twice executes safely', async () => {
    const deletePayload = { id: 'session-to-delete' };

    useSyncStore.setState({
      queue: [
        {
          id: 'del-1',
          table: 'workout_sessions',
          operation: 'DELETE',
          payload: deletePayload,
          createdAt: new Date(),
          retryCount: 0,
        },
        {
          id: 'del-2',
          table: 'workout_sessions',
          operation: 'DELETE',
          payload: deletePayload,
          createdAt: new Date(),
          retryCount: 0,
        },
      ],
    });

    await useSyncStore.getState().processQueue();

    // Both delete operations executed against Supabase idempotently
    expect(mockDeleteSpy).toHaveBeenCalledTimes(2);
    expect(useSyncStore.getState().queue).toHaveLength(0);
  });
});
