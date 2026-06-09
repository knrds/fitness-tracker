type MockAuthClient = {
  getSession?: jest.Mock;
  onAuthStateChange?: jest.Mock;
  signInWithPassword?: jest.Mock;
  signOut?: jest.Mock;
};

let mockIsSupabaseConfigured = false;
let mockSupabaseAuth: MockAuthClient = {};

jest.mock('../../utils/supabase', () => ({
  get isSupabaseConfigured() {
    return mockIsSupabaseConfigured;
  },
  supabase: {
    get auth() {
      return mockSupabaseAuth;
    },
  },
}));

import { useAuthStore } from '../authStore';

const mockSession = {
  access_token: 'token',
  refresh_token: 'refresh',
  expires_in: 3600,
  token_type: 'bearer',
  user: {
    id: '99999999-9999-4999-8999-999999999999',
    app_metadata: {},
    user_metadata: {},
    aud: 'authenticated',
    created_at: '2026-06-01T00:00:00.000Z',
  },
};

describe('authStore', () => {
  beforeEach(() => {
    mockIsSupabaseConfigured = false;
    mockSupabaseAuth = {};
    useAuthStore.setState({
      session: null,
      user: null,
      isLoading: false,
      isConfigured: false,
      isInitialized: false,
    });
  });

  it('initializes without blocking local mode when Supabase is not configured', async () => {
    await useAuthStore.getState().initialize();

    expect(useAuthStore.getState().isConfigured).toBe(false);
    expect(useAuthStore.getState().isLoading).toBe(false);
    expect(useAuthStore.getState().session).toBeNull();
  });

  it('hydrates the current Supabase session and supports sign out', async () => {
    const signOut = jest.fn().mockResolvedValue({ error: null });
    mockIsSupabaseConfigured = true;
    mockSupabaseAuth = {
      getSession: jest.fn().mockResolvedValue({ data: { session: mockSession }, error: null }),
      onAuthStateChange: jest.fn((_handler: unknown) => ({
        data: {
          subscription: {
            unsubscribe: jest.fn(),
          },
        },
      })),
      signOut,
    };
    useAuthStore.setState({
      isConfigured: true,
      isLoading: true,
      isInitialized: false,
    });

    await useAuthStore.getState().initialize();
    expect(useAuthStore.getState().session).toEqual(mockSession);
    expect(useAuthStore.getState().user?.id).toBe(mockSession.user.id);

    const result = await useAuthStore.getState().signOut();
    expect(result.error).toBeUndefined();
    expect(signOut).toHaveBeenCalledTimes(1);
    expect(useAuthStore.getState().session).toBeNull();
  });

  it('returns login errors from Supabase', async () => {
    mockIsSupabaseConfigured = true;
    mockSupabaseAuth = {
      signInWithPassword: jest.fn().mockResolvedValue({
        error: { message: 'Invalid login credentials' },
      }),
    };
    useAuthStore.setState({
      isConfigured: true,
      isInitialized: true,
    });

    const result = await useAuthStore
      .getState()
      .signIn({ email: 'user@example.com', password: 'wrong-password' });

    expect(result.error).toBe('Invalid login credentials');
  });
});
