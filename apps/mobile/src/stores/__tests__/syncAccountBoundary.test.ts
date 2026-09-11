import { useSyncStore } from '../syncStore';
import { useProfileStore } from '../profileStore';
import {
  beginScopeChange,
  completeScopeChange,
  selectStoragePartition,
} from '../../data/storageScope';
import { withoutStorageWrites } from '../../data/storageTransaction';

const mockUser = { id: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa' };
const mockFrom = jest.fn();
jest.mock('../authStore', () => ({ useAuthStore: { getState: () => ({ user: mockUser }) } }));
jest.mock('../../utils/supabase', () => ({
  isSupabaseConfigured: true,
  supabase: { from: (table: string) => mockFrom(table) },
}));

function deferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((done) => {
    resolve = done;
  });
  return { resolve, promise };
}
function changeScope(partition: string) {
  const generation = beginScopeChange();
  selectStoragePartition(partition, generation);
  completeScopeChange(generation);
}
describe('late cloud responses at account boundaries', () => {
  const originalFetch = global.fetch;
  beforeEach(async () => {
    changeScope('legacy');
    mockUser.id = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
    process.env.EXPO_PUBLIC_SUPABASE_URL = 'https://example.invalid';
    global.fetch = jest.fn().mockResolvedValue({ ok: true });
    mockFrom.mockReset();
    await Promise.all([useSyncStore.persist.rehydrate(), useProfileStore.persist.rehydrate()]);
    useSyncStore.setState({ queue: [], isSyncing: true, lastSyncedAt: null, syncError: null });
  });
  afterEach(() => {
    global.fetch = originalFetch;
    delete process.env.EXPO_PUBLIC_SUPABASE_URL;
  });
  it('ignores a late profile response and leaves the next account worker lock intact', async () => {
    const response = deferred<{ data: unknown }>();
    const entered = deferred<void>();
    mockFrom.mockReturnValue({
      select: () => ({
        eq: () => ({
          single: () => {
            entered.resolve();
            return response.promise;
          },
        }),
      }),
    });
    useSyncStore.setState({ isSyncing: false });
    const pull = useSyncStore.getState().pullFromCloud();
    await entered.promise;
    mockUser.id = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb';
    changeScope('account:B');
    withoutStorageWrites(() => {
      useProfileStore.setState({
        profile: { ...useProfileStore.getState().profile, displayName: 'B private' },
      });
      useSyncStore.setState({ isSyncing: true });
    });
    response.resolve({
      data: { id: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', display_name: 'A private' },
    });
    await pull;
    expect(useProfileStore.getState().profile.displayName).toBe('B private');
    expect(useSyncStore.getState().isSyncing).toBe(true);
    expect(useSyncStore.getState().lastSyncedAt).toBeNull();
    expect(mockFrom).toHaveBeenCalledTimes(1);
  });
  it('stops a multi-request upload after A→B→A even when the user ID matches again', async () => {
    const response = deferred<{ error: null }>();
    const entered = deferred<void>();
    mockFrom.mockReturnValue({
      upsert: () => {
        entered.resolve();
        return response.promise;
      },
    });
    useSyncStore.getState().addToQueue('workout_sessions', 'INSERT', {
      id: 'cccccccc-cccc-4ccc-8ccc-cccccccccccc',
      userId: mockUser.id,
      name: 'A session',
      startedAt: new Date(),
      createdAt: new Date(),
      updatedAt: new Date(),
      exercises: [],
    });
    useSyncStore.setState({ isSyncing: false });
    const push = useSyncStore.getState().processQueue();
    await entered.promise;
    changeScope('account:B');
    changeScope('account:A');
    withoutStorageWrites(() =>
      useSyncStore.setState({ queue: [], isSyncing: true, lastSyncedAt: null }),
    );
    response.resolve({ error: null });
    await push;
    expect(mockFrom.mock.calls).toEqual([['workout_sessions']]);
    expect(useSyncStore.getState().isSyncing).toBe(true);
    expect(useSyncStore.getState().queue).toEqual([]);
    expect(useSyncStore.getState().lastSyncedAt).toBeNull();
  });
  it('does not acknowledge a previous account delete in a newly loaded queue', async () => {
    const response = deferred<{ error: null }>();
    const entered = deferred<void>();
    mockFrom.mockReturnValue({
      delete: () => ({
        eq: () => {
          entered.resolve();
          return response.promise;
        },
      }),
    });
    useSyncStore.getState().addToQueue('body_metrics', 'DELETE', { id: 'first' });
    const oldOperation = useSyncStore.getState().queue[0]!;
    useSyncStore.setState({ isSyncing: false });
    const push = useSyncStore.getState().processQueue();
    await entered.promise;
    changeScope('account:B');
    const replacement = { ...oldOperation, payload: { id: 'B-private' } };
    withoutStorageWrites(() => useSyncStore.setState({ queue: [replacement], isSyncing: true }));
    response.resolve({ error: null });
    await push;
    expect(useSyncStore.getState().queue).toEqual([replacement]);
    expect(useSyncStore.getState().isSyncing).toBe(true);
  });
});
