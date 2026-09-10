import { useSyncStore } from '../syncStore';

const mockEq = jest.fn();
let mockId = 0;
jest.mock('expo-crypto', () => ({
  randomUUID: () => `00000000-0000-4000-8000-${String(++mockId).padStart(12, '0')}`,
}));
const mockUser = { id: '22222222-2222-4222-8222-222222222222' };
jest.mock('../authStore', () => ({
  useAuthStore: { getState: () => ({ user: mockUser }) },
}));
jest.mock('../../utils/supabase', () => ({
  isSupabaseConfigured: true,
  supabase: { from: () => ({ delete: () => ({ eq: mockEq }) }) },
}));

describe('sync worker durability', () => {
  const originalFetch = global.fetch;
  beforeEach(() => {
    process.env.EXPO_PUBLIC_SUPABASE_URL = 'https://example.invalid';
    global.fetch = jest.fn().mockResolvedValue({ ok: true });
    mockEq.mockReset().mockResolvedValue({ error: null });
    useSyncStore.setState({ queue: [], isSyncing: true, syncError: null });
  });
  afterEach(() => {
    global.fetch = originalFetch;
    delete process.env.EXPO_PUBLIC_SUPABASE_URL;
    jest.restoreAllMocks();
  });
  it('does not lose an operation appended while a request is in flight', async () => {
    let release!: (value: { error: null }) => void;
    let entered!: () => void;
    const started = new Promise<void>((resolve) => {
      entered = resolve;
    });
    mockEq.mockImplementationOnce(() => {
      entered();
      return new Promise((resolve) => {
        release = resolve;
      });
    });
    useSyncStore.getState().addToQueue('body_metrics', 'DELETE', { id: 'first' });
    useSyncStore.setState({ isSyncing: false });
    const processing = useSyncStore.getState().processQueue();
    await started;
    useSyncStore.getState().addToQueue('body_metrics', 'DELETE', { id: 'second' });
    release({ error: null });
    await processing;
    const secondWasSent = mockEq.mock.calls.some((call) => call[1] === 'second');
    const secondStillQueued = useSyncStore
      .getState()
      .queue.some((op) => (op.payload as { id: string }).id === 'second');
    expect(secondWasSent || secondStillQueued).toBe(true);
  });
  it('retains a failed operation for explicit retry instead of discarding it', async () => {
    jest.spyOn(console, 'error').mockImplementation(() => {});
    mockEq.mockResolvedValue({ error: { message: 'constraint failure' } });
    useSyncStore.getState().addToQueue('body_metrics', 'DELETE', { id: 'failed' });
    useSyncStore.setState({ isSyncing: false });
    await useSyncStore.getState().processQueue();
    expect(useSyncStore.getState().queue).toHaveLength(1);
    expect(useSyncStore.getState().syncError).toBe('constraint failure');
  });
  it('takes the worker lock before checking connectivity', async () => {
    let release!: (value: Response) => void;
    global.fetch = jest.fn(
      () =>
        new Promise((resolve) => {
          release = resolve;
        }),
    ) as typeof fetch;
    useSyncStore.getState().addToQueue('body_metrics', 'DELETE', { id: 'one' });
    useSyncStore.setState({ isSyncing: false });
    const first = useSyncStore.getState().processQueue();
    const second = useSyncStore.getState().processQueue();
    expect(global.fetch).toHaveBeenCalledTimes(1);
    release(new Response());
    await Promise.all([first, second]);
  });
});
