type MockAuthClient = {
  getSession?: jest.Mock;
  onAuthStateChange?: jest.Mock;
  signInWithPassword?: jest.Mock;
  signUp?: jest.Mock;
  signOut?: jest.Mock;
  resend?: jest.Mock;
  resetPasswordForEmail?: jest.Mock;
  updateUser?: jest.Mock;
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
  token_type: 'bearer' as const,
  user: {
    id: '99999999-9999-4999-8999-999999999999',
    app_metadata: {},
    user_metadata: {},
    aud: 'authenticated',
    created_at: '2026-06-01T00:00:00.000Z',
  },
};

describe('authStore', () => {
  it.each(['de', 'en'] as const)(
    'returns the storage failure in profile language %s',
    async (language) => {
      const { useProfileStore } = await import('../profileStore');
      const { translations } = await import('../../i18n/translations');
      const previous = useProfileStore.getState().profile;
      useProfileStore.setState({ profile: { ...previous, language } });
      try {
        mockIsSupabaseConfigured = true;
        mockSupabaseAuth = { signOut: jest.fn().mockRejectedValue(new Error('locked')) };
        useAuthStore.setState({ session: mockSession, user: mockSession.user });
        expect((await useAuthStore.getState().signOut()).error).toBe(
          translations[language].auth.sessionCleanupFailed,
        );
        expect(useAuthStore.getState().user?.id).toBe(mockSession.user.id);
      } finally {
        useProfileStore.setState({ profile: previous });
      }
    },
  );
  it.each(['signIn', 'signUp', 'updatePassword', 'signOut'] as const)(
    'reports storage rejection during %s without leaking credentials or retaining the loading state',
    async (operation) => {
      mockIsSupabaseConfigured = true;
      const reject = jest.fn().mockRejectedValue(new Error('private-refresh-token'));
      mockSupabaseAuth = {
        signInWithPassword: reject,
        signUp: reject,
        updateUser: reject,
        signOut: reject,
      };
      const current = useAuthStore.getState();
      const result =
        operation === 'signIn'
          ? await current.signIn({ email: 'test@example.com', password: 'password' })
          : operation === 'signUp'
            ? await current.signUp({
                email: 'test@example.com',
                password: 'password',
                displayName: 'Test',
              })
            : operation === 'updatePassword'
              ? await current.updatePassword('new-password')
              : await current.signOut();
      expect(result.error).toBeTruthy();
      expect(result.error).not.toContain('private-refresh-token');
      expect(useAuthStore.getState().isLoading).toBe(false);
    },
  );
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

  describe('new auth actions', () => {
    it('returns error when Supabase is not configured', async () => {
      mockIsSupabaseConfigured = false;
      const resendRes = await useAuthStore.getState().resendVerificationEmail('test@example.com');
      const resetRes = await useAuthStore.getState().sendPasswordResetEmail('test@example.com');
      const updateRes = await useAuthStore.getState().updatePassword('new-pass');

      expect(resendRes.error).toContain('Supabase is not configured');
      expect(resetRes.error).toContain('Supabase is not configured');
      expect(updateRes.error).toContain('Supabase is not configured');
    });

    it('successfully calls resend', async () => {
      mockIsSupabaseConfigured = true;
      const resendMock = jest.fn().mockResolvedValue({ error: null });
      mockSupabaseAuth = { resend: resendMock };

      const result = await useAuthStore.getState().resendVerificationEmail('test@example.com');
      expect(result.error).toBeUndefined();
      expect(resendMock).toHaveBeenCalledWith({
        type: 'signup',
        email: 'test@example.com',
        options: { emailRedirectTo: 'evaro://' },
      });
    });

    it('handles resend errors', async () => {
      mockIsSupabaseConfigured = true;
      mockSupabaseAuth = {
        resend: jest.fn().mockResolvedValue({ error: { message: 'Too many requests' } }),
      };

      const result = await useAuthStore.getState().resendVerificationEmail('test@example.com');
      expect(result.error).toBe('Too many requests');
    });

    it('successfully calls resetPasswordForEmail', async () => {
      mockIsSupabaseConfigured = true;
      const resetMock = jest.fn().mockResolvedValue({ error: null });
      mockSupabaseAuth = { resetPasswordForEmail: resetMock };

      const result = await useAuthStore.getState().sendPasswordResetEmail('test@example.com');
      expect(result.error).toBeUndefined();
      expect(resetMock).toHaveBeenCalledWith('test@example.com', {
        redirectTo: 'evaro://auth/reset-password',
      });
    });

    it('handles resetPasswordForEmail errors', async () => {
      mockIsSupabaseConfigured = true;
      mockSupabaseAuth = {
        resetPasswordForEmail: jest
          .fn()
          .mockResolvedValue({ error: { message: 'Email not found' } }),
      };

      const result = await useAuthStore.getState().sendPasswordResetEmail('test@example.com');
      expect(result.error).toBe('Email not found');
    });

    it('successfully calls updateUser to reset password', async () => {
      mockIsSupabaseConfigured = true;
      const updateMock = jest.fn().mockResolvedValue({ error: null });
      mockSupabaseAuth = { updateUser: updateMock };

      const result = await useAuthStore.getState().updatePassword('new-pass');
      expect(result.error).toBeUndefined();
      expect(updateMock).toHaveBeenCalledWith({ password: 'new-pass' });
    });

    it('handles updateUser errors', async () => {
      mockIsSupabaseConfigured = true;
      mockSupabaseAuth = {
        updateUser: jest.fn().mockResolvedValue({ error: { message: 'Password too weak' } }),
      };

      const result = await useAuthStore.getState().updatePassword('new-pass');
      expect(result.error).toBe('Password too weak');
    });
  });
});
