import { useSyncStore, keysToSnake, keysToCamel } from '../syncStore';
import { migrateLocalUserData } from '../authMigration';
import { useHistoryStore } from '../historyStore';
import { useExerciseStore } from '../exerciseStore';
import { useBodyMetricStore } from '../bodyMetricStore';
import { useProgramStore } from '../programStore';
import { useAuthStore } from '../authStore';
import { LOCAL_USER_ID } from '../local-user';

// Mock Supabase Client
let mockIsSupabaseConfigured = true;
const mockUpsert = jest.fn().mockResolvedValue({ error: null });
const mockDelete = jest.fn().mockResolvedValue({ error: null });
const mockEq = jest.fn().mockReturnValue({ delete: mockDelete });
const mockSelect = jest.fn().mockReturnValue({ eq: jest.fn().mockResolvedValue({ data: [] }) });
const mockFrom = jest.fn().mockReturnValue({
  upsert: mockUpsert,
  delete: mockDelete,
  eq: mockEq,
  select: mockSelect,
});

jest.mock('../../utils/supabase', () => ({
  get isSupabaseConfigured() {
    return mockIsSupabaseConfigured;
  },
  supabase: {
    from: (table: string) => mockFrom(table),
  },
}));

describe('syncStore & authMigration', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockIsSupabaseConfigured = true;

    // Reset stores
    useSyncStore.setState({
      queue: [],
      isSyncing: false,
      lastSyncedAt: null,
      syncError: null,
      isOnline: true,
    });

    useHistoryStore.setState({ sessions: [] });
    useExerciseStore.setState({ customExercises: [] });
    useBodyMetricStore.setState({ metrics: [] });
    useProgramStore.setState({ programs: [], templates: [] });
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    useAuthStore.setState({ user: { id: 'test-user-id', email: 'test@example.com' } as any });
  });

  describe('Key mapping helpers', () => {
    it('maps camelCase keys to snake_case', () => {
      const camel = {
        userId: '123',
        createdAt: new Date('2026-06-01T00:00:00.000Z'),
        nestedObj: {
          someField: 'val',
        },
      };

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const snake = keysToSnake(camel) as any;
      expect(snake.user_id).toBe('123');
      expect(snake.created_at).toBeInstanceOf(Date);
      expect(snake.nested_obj.some_field).toBe('val');
    });

    it('maps snake_case keys to camelCase', () => {
      const snake = {
        user_id: '123',
        created_at: new Date('2026-06-01T00:00:00.000Z'),
        nested_obj: {
          some_field: 'val',
        },
      };

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const camel = keysToCamel(snake) as any;
      expect(camel.userId).toBe('123');
      expect(camel.createdAt).toBeInstanceOf(Date);
      expect(camel.nestedObj.someField).toBe('val');
    });
  });

  describe('Queueing Operations', () => {
    it('adds operations to the queue', () => {
      const store = useSyncStore.getState();
      store.addToQueue('body_metrics', 'INSERT', { weightKg: 80 });

      const state = useSyncStore.getState();
      expect(state.queue.length).toBe(1);
      expect(state.queue[0]?.table).toBe('body_metrics');
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      expect((state.queue[0]?.payload as any).weightKg).toBe(80);
    });

    it('clears queue', () => {
      const store = useSyncStore.getState();
      store.addToQueue('body_metrics', 'INSERT', { weightKg: 80 });
      store.clearQueue();

      const state = useSyncStore.getState();
      expect(state.queue.length).toBe(0);
    });
  });

  describe('Auth user ID migration', () => {
    it('rewrites local items carrying LOCAL_USER_ID to the new authenticated user ID', () => {
      // Setup some local unauthenticated data
      useHistoryStore.setState({
        sessions: [
          { id: 'session-1', userId: LOCAL_USER_ID, name: 'Chest Day', exercises: [], startedAt: new Date(), createdAt: new Date(), updatedAt: new Date() },
        ],
      });

      useExerciseStore.setState({
        customExercises: [
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          { id: 'ex-1', ownerId: LOCAL_USER_ID, name: 'Custom Push', primaryMuscles: [], secondaryMuscles: [], equipment: 'other', movementPattern: 'isolation', isCustom: true, createdAt: new Date(), updatedAt: new Date() } as any,
        ],
      });

      useBodyMetricStore.setState({
        metrics: [
          { id: 'met-1', userId: LOCAL_USER_ID, weightKg: 75, recordedAt: new Date(), createdAt: new Date() },
        ],
      });

      // Migrate
      migrateLocalUserData('new-real-uuid');

      // Verify IDs updated
      expect(useHistoryStore.getState().sessions[0]?.userId).toBe('new-real-uuid');
      expect(useExerciseStore.getState().customExercises[0]?.ownerId).toBe('new-real-uuid');
      expect(useBodyMetricStore.getState().metrics[0]?.userId).toBe('new-real-uuid');

      // Verify sync queue enqueued those operations
      const syncQueue = useSyncStore.getState().queue;
      expect(syncQueue.length).toBe(4); // custom exercise + session + body metric + profile update
    });
  });
});
