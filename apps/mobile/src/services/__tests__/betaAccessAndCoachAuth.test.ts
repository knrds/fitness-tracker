import { randomBytes } from 'crypto';
import { useProfileStore } from '../../stores/profileStore';
import {
  isBetaFullAccess,
  isFailClosedProduction,
  setBetaFullAccessKillSwitch,
} from '../../utils/betaAccessConfig';
import { entitlementService } from '../entitlementService';
import { usePaywallStore } from '../../stores/paywallStore';
import { CoachCircuitBreaker, defaultCoachCircuitBreaker } from '../../utils/coachCircuitBreaker';
import {
  streamCoachResponse,
  resetBetaTokenCache,
} from '../../utils/coachApi';

// Import server beta-auth for token issuance & verification testing
// Note: beta-auth.cjs is located in root /api/beta-auth.cjs
// eslint-disable-next-line @typescript-eslint/no-require-imports
const { issueBetaToken, verifyBetaToken, isBetaAllowed } = require('../../../../../api/beta-auth.cjs');

jest.mock('../../utils/supabase', () => ({
  supabase: {
    auth: {
      getSession: jest.fn().mockResolvedValue({ data: { session: null }, error: null }),
    },
  },
  isSupabaseConfigured: false,
}));

describe('Beta Full Access and Coach Auth Integration', () => {
  const originalEnv = { ...process.env };

  beforeEach(() => {
    jest.clearAllMocks();
    for (const key of Object.keys(process.env)) {
      if (!(key in originalEnv)) {
        delete process.env[key];
      }
    }
    Object.assign(process.env, originalEnv);
    setBetaFullAccessKillSwitch(null);
    resetBetaTokenCache();
    defaultCoachCircuitBreaker.reset();
    usePaywallStore.setState({ source: null, context: 'pro' });
  });

  afterAll(() => {
    for (const key of Object.keys(process.env)) {
      if (!(key in originalEnv)) {
        delete process.env[key];
      }
    }
    Object.assign(process.env, originalEnv);
    setBetaFullAccessKillSwitch(null);
  });

  describe('1. Central Beta Access Configuration & Fail-Closed Guard', () => {
    it('honors the persisted tester preference without retaining synthetic entitlements', () => {
      process.env.EXPO_PUBLIC_APP_ENV = 'beta';
      useProfileStore.getState().updateProfile({ betaTesterEnabled: true });
      expect(entitlementService.getTier()).toBe('coach');
      useProfileStore.getState().updateProfile({ betaTesterEnabled: false });
      expect(isBetaFullAccess()).toBe(false);
      expect(entitlementService.getTier()).toBe('free');
      useProfileStore.getState().updateProfile({ betaTesterEnabled: true });
    });
    it('enables beta access in development, beta, and test environments', () => {
      delete process.env.APP_ENV;
      process.env.EXPO_PUBLIC_APP_ENV = 'beta';
      expect(isBetaFullAccess()).toBe(true);

      process.env.EXPO_PUBLIC_APP_ENV = 'development';
      expect(isBetaFullAccess()).toBe(true);
    });

    it('strictly fails closed in production environment', () => {
      process.env.APP_ENV = 'production';
      process.env.EXPO_PUBLIC_APP_ENV = 'production';
      expect(isFailClosedProduction()).toBe(true);
      expect(isBetaFullAccess()).toBe(false);

      // Even if someone attempts to override via killswitch, production fail-closed wins
      setBetaFullAccessKillSwitch(true);
      expect(isBetaFullAccess()).toBe(false);
    });

    it('respects explicit killswitch override outside production', () => {
      process.env.EXPO_PUBLIC_APP_ENV = 'beta';
      setBetaFullAccessKillSwitch(false);
      expect(isBetaFullAccess()).toBe(false);

      setBetaFullAccessKillSwitch(true);
      expect(isBetaFullAccess()).toBe(true);
    });

    it('respects EXPO_PUBLIC_BETA_FULL_ACCESS=false', () => {
      process.env.EXPO_PUBLIC_APP_ENV = 'beta';
      process.env.EXPO_PUBLIC_BETA_FULL_ACCESS = 'false';
      expect(isBetaFullAccess()).toBe(false);
    });
  });

  describe('2. Entitlement Service under Beta Full Access', () => {
    it('grants COACH tier and all capabilities to guest users when Beta Full Access is active', () => {
      setBetaFullAccessKillSwitch(true);

      const state = entitlementService.getEntitlementState();
      expect(state.tier).toBe('coach');
      expect(state.isPro).toBe(true);
      expect(state.isCoach).toBe(true);

      // Test all capabilities
      expect(entitlementService.canUseCoachPlan()).toBe(true);
      expect(entitlementService.canUseCoachFast()).toBe(true);
      expect(entitlementService.canCreateTemplate(100)).toBe(true);
      expect(entitlementService.canCreateProgram()).toBe(true);
      expect(entitlementService.canUseAdvancedMetrics()).toBe(true);
      expect(entitlementService.canUseAdvancedAnalytics()).toBe(true);
      expect(entitlementService.canUsePremiumAppearance()).toBe(true);
      expect(entitlementService.canUseRPE()).toBe(true);
      expect(entitlementService.canUseRIR()).toBe(true);
    });

    it('reverts to free tier if production fail-closed is triggered', () => {
      process.env.APP_ENV = 'production';
      process.env.EXPO_PUBLIC_APP_ENV = 'production';

      const state = entitlementService.getEntitlementState();
      expect(state.tier).toBe('free');
      expect(state.isPro).toBe(false);
      expect(state.isCoach).toBe(false);
      expect(entitlementService.canUseCoachPlan()).toBe(false);
      expect(entitlementService.canUseAdvancedMetrics()).toBe(false);
    });
  });

  describe('3. Paywall Store Bypass in Beta', () => {
    it('bypasses paywall display when Beta Full Access is active', () => {
      setBetaFullAccessKillSwitch(true);
      const { openPaywall } = usePaywallStore.getState();

      openPaywall('coach', 'coach_plan');
      expect(usePaywallStore.getState().source).toBeNull();
    });

    it('allows opening paywall when Beta Full Access is disabled', () => {
      setBetaFullAccessKillSwitch(false);
      const { openPaywall } = usePaywallStore.getState();

      openPaywall('coach', 'coach_plan');
      expect(usePaywallStore.getState().source).toBe('coach_plan');
      expect(usePaywallStore.getState().context).toBe('coach');
    });
  });

  describe('4. Server-Side Scoped Beta Token Auth (beta-auth.cjs)', () => {
    it('issues a well-formed signed beta token', () => {
      process.env.APP_ENV = 'beta';
      process.env.BETA_SESSION_SECRET = randomBytes(32).toString('hex');

      const token = issueBetaToken('test-installation-device-abc');
      expect(token).toMatch(/^beta_[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+$/);

      const verified = verifyBetaToken(token);
      expect(verified).not.toBeNull();
      expect(verified.isBeta).toBe(true);
      expect(verified.id).toMatch(/^beta_guest_[a-f0-9]{16}$/);
    });

    it('pseudonymizes installationId to avoid leaking device fingerprints', () => {
      process.env.APP_ENV = 'beta';
      process.env.BETA_SESSION_SECRET = randomBytes(32).toString('hex');

      const token1 = issueBetaToken('user-phone-serial-1234');
      const token2 = issueBetaToken('user-phone-serial-1234');

      const user1 = verifyBetaToken(token1);
      const user2 = verifyBetaToken(token2);

      // Same installation ID maps deterministically to same pseudonymized ID
      expect(user1.id).toBe(user2.id);
      expect(user1.id).not.toContain('user-phone-serial-1234');
    });

    it('rejects tampered or forged tokens', () => {
      process.env.APP_ENV = 'beta';
      process.env.BETA_SESSION_SECRET = randomBytes(32).toString('hex');

      const validToken = issueBetaToken('test-device');
      const forgedToken = validToken + 'invalid_signature_suffix';
      expect(verifyBetaToken(forgedToken)).toBeNull();

      expect(verifyBetaToken('invalid-format-token')).toBeNull();
      expect(verifyBetaToken(null)).toBeNull();
      expect(verifyBetaToken(undefined)).toBeNull();
    });

    it('fails closed in production: refuses token generation and verification', () => {
      process.env.APP_ENV = 'production';
      process.env.BETA_SESSION_SECRET = randomBytes(32).toString('hex');

      expect(isBetaAllowed()).toBe(false);
      expect(() => issueBetaToken('device-in-prod')).toThrow(/BETA_ACCESS_DISABLED/);
      expect(verifyBetaToken('beta_somepayload.somesig')).toBeNull();
    });
  });

  it('refuses hosted beta authentication without an explicit server environment and secret', () => {
    process.env.VERCEL = '1';
    delete process.env.APP_ENV;
    expect(isBetaAllowed()).toBe(false);
    process.env.APP_ENV = 'beta';
    delete process.env.BETA_SESSION_SECRET;
    expect(() => issueBetaToken('test-device')).toThrow('BETA_SESSION_NOT_CONFIGURED');
    expect(verifyBetaToken('beta_a.b')).toBeNull();
  });

  describe('5. Coach Circuit Breaker Auth & Validation Exclusion', () => {
    it('does not increment failures or trip on 401, 403, 400, or 404 client errors', () => {
      const cb = new CoachCircuitBreaker({ failureThreshold: 3 });

      cb.recordFailure(401);
      cb.recordFailure(403);
      cb.recordFailure(400);
      cb.recordFailure(404);
      cb.recordFailure(422);

      expect(cb.getConsecutiveFailures()).toBe(0);
      expect(cb.getState()).toBe('CLOSED');
      expect(cb.canExecute().allowed).toBe(true);
    });

    it('does not increment failures on client-side authentication or validation error objects', () => {
      const cb = new CoachCircuitBreaker({ failureThreshold: 3 });

      cb.recordFailure(new Error('Bitte anmelden, um den KI-Coach zu verwenden.'));
      cb.recordFailure(new Error('Dein Konto hat keinen Zugriff auf den KI-Coach.'));
      cb.recordFailure(new Error('Invalid plan validation failed'));
      cb.recordFailure(new Error('HTTP 401 Unauthorized'));

      expect(cb.getConsecutiveFailures()).toBe(0);
      expect(cb.getState()).toBe('CLOSED');
      expect(cb.canExecute().allowed).toBe(true);
    });

    it('trips on actual backend 5xx errors or 429 rate limits', () => {
      const cb = new CoachCircuitBreaker({ failureThreshold: 3 });

      cb.recordFailure(500);
      cb.recordFailure(503);
      cb.recordFailure(429);

      expect(cb.getConsecutiveFailures()).toBe(3);
      expect(cb.getState()).toBe('OPEN');
      expect(cb.canExecute().allowed).toBe(false);
    });
  });

  describe('6. Coach API Client Guest Auth Integration', () => {
    const originalFetch = global.fetch;

    afterEach(() => {
      global.fetch = originalFetch;
    });

    it('attaches scoped beta token when guest is unauthenticated and Beta Full Access is active', async () => {
      process.env.EXPO_PUBLIC_COACH_CHAT_ENDPOINT = 'https://coach.example.test/api/coach-chat';
      setBetaFullAccessKillSwitch(true);

      const capturedHeaders: Record<string, string>[] = [];

      global.fetch = jest.fn().mockImplementation((url: string, init?: RequestInit) => {
        if (url.includes('/api/beta-session')) {
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve({ token: 'beta_mock_session_token_123', expiresIn: 86400 }),
          });
        }

        if (url.includes('/api/coach-chat')) {
          capturedHeaders.push(init?.headers as Record<string, string>);
          return Promise.resolve({
            ok: true,
            text: () => Promise.resolve(JSON.stringify({ reply: 'Hallo! Wie kann ich dir helfen?' })),
          });
        }

        return Promise.reject(new Error('Unknown url: ' + url));
      }) as unknown as typeof fetch;

      const stream = streamCoachResponse(
        [{ id: '1', role: 'user', content: 'Hi', createdAt: new Date() }],
        { profile: { displayName: 'Tester', preferredUnits: 'metric' } },
      );

      const replies: string[] = [];
      for await (const chunk of stream) {
        replies.push(chunk);
      }

      expect(replies[0]).toBe('Hallo! Wie kann ich dir helfen?');
      expect(capturedHeaders.length).toBe(1);
      expect(capturedHeaders[0]!.Authorization).toBe('Bearer beta_mock_session_token_123');
    });

    it('does not trip circuit breaker after a 401 error', async () => {
      process.env.EXPO_PUBLIC_COACH_CHAT_ENDPOINT = 'https://coach.example.test/api/coach-chat';
      setBetaFullAccessKillSwitch(false); // Guest without beta token

      defaultCoachCircuitBreaker.reset();

      global.fetch = jest.fn().mockResolvedValue({
        ok: false,
        status: 401,
        json: () => Promise.resolve({}),
      });

      // Execute request that fails with 401
      const stream = streamCoachResponse(
        [{ id: '1', role: 'user', content: 'Hi', createdAt: new Date() }],
        { profile: { displayName: 'Tester', preferredUnits: 'metric' } },
      );

      await expect(async () => {
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        for await (const _ of stream) {
          // consume
        }
      }).rejects.toThrow(/anmelden/i);

      // Verify default circuit breaker was NOT tripped
      expect(defaultCoachCircuitBreaker.getState()).toBe('CLOSED');
      expect(defaultCoachCircuitBreaker.getConsecutiveFailures()).toBe(0);
      expect(defaultCoachCircuitBreaker.canExecute().allowed).toBe(true);
    });
  });
});

describe('persisted tester preference', () => {
  afterEach(() => { useProfileStore.getState().updateProfile({ betaTesterEnabled: true }); setBetaFullAccessKillSwitch(null); });
  it('toggles every capability without granting a real purchase', () => {
    process.env.EXPO_PUBLIC_APP_ENV = 'beta';
    entitlementService.setBetaBypass(true);
    useProfileStore.getState().updateProfile({ betaTesterEnabled: false });
    expect(isBetaFullAccess()).toBe(false);
    expect(entitlementService.canCreateProgram()).toBe(false);
    useProfileStore.getState().updateProfile({ betaTesterEnabled: true });
    expect(entitlementService.canCreateProgram()).toBe(true);
    process.env.EXPO_PUBLIC_APP_ENV = 'production';
    expect(entitlementService.canCreateProgram()).toBe(false);
  });
});
