import {
  observabilityService,
  sanitizeString,
  sanitizeContext,
  ObservabilityAdapter,
} from '../observabilityService';

describe('Observability & Crash Monitoring Sanitization (WP-08 Task 08.01)', () => {
  beforeEach(() => {
    observabilityService.setAdapter(null);
    observabilityService.clearBreadcrumbs();
  });

  describe('String PII Scrubbing', () => {
    it('redacts email addresses from messages', () => {
      const msg = 'User athlete.test@example.com reported failure at checkout.';
      expect(sanitizeString(msg)).toBe('User [REDACTED_EMAIL] reported failure at checkout.');
    });

    it('redacts JWT and bearer tokens', () => {
      const fakeJwt =
        'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIn0.dozG4m1pMdfg9z_48hV9xZ8v1234567890abcdef123';
      const raw = `Authorization: Bearer ${fakeJwt}`;
      const sanitized = sanitizeString(raw);
      expect(sanitized).not.toContain(fakeJwt);
      expect(sanitized).toContain('[REDACTED_TOKEN]');
    });
  });

  describe('Context & Health Data Scrubbing', () => {
    it('redacts health and workout metric keys completely', () => {
      const rawContext = {
        appVersion: '0.1.0-beta.8',
        platform: 'ios',
        weight: 85.5,
        gewicht: 85.5,
        reps: 10,
        sets: 3,
        volume: 2500,
        workout: { name: 'Upper Body', duration: 3600 },
        session: { id: 'sess-123' },
        exercise: { name: 'Bench Press' },
        waist: 82,
        chest: 105,
      };

      const sanitized = sanitizeContext(rawContext);

      expect(sanitized.appVersion).toBe('0.1.0-beta.8');
      expect(sanitized.platform).toBe('ios');

      // All health/workout keys must be redacted
      expect(sanitized.weight).toBe('[REDACTED_SENSITIVE_KEY]');
      expect(sanitized.gewicht).toBe('[REDACTED_SENSITIVE_KEY]');
      expect(sanitized.reps).toBe('[REDACTED_SENSITIVE_KEY]');
      expect(sanitized.sets).toBe('[REDACTED_SENSITIVE_KEY]');
      expect(sanitized.volume).toBe('[REDACTED_SENSITIVE_KEY]');
      expect(sanitized.workout).toBe('[REDACTED_SENSITIVE_KEY]');
      expect(sanitized.session).toBe('[REDACTED_SENSITIVE_KEY]');
      expect(sanitized.exercise).toBe('[REDACTED_SENSITIVE_KEY]');
      expect(sanitized.waist).toBe('[REDACTED_SENSITIVE_KEY]');
      expect(sanitized.chest).toBe('[REDACTED_SENSITIVE_KEY]');
    });

    it('redacts AI coach prompts, completions and messages', () => {
      const rawContext = {
        screen: 'CoachScreen',
        prompt: 'How do I train my triceps with shoulder impingement?',
        completion: 'Focus on neutral-grip pushdowns...',
        message: 'Direct user message text',
        coachResponse: 'Private coach output',
      };

      const sanitized = sanitizeContext(rawContext);
      expect(sanitized.screen).toBe('CoachScreen');
      expect(sanitized.prompt).toBe('[REDACTED_SENSITIVE_KEY]');
      expect(sanitized.completion).toBe('[REDACTED_SENSITIVE_KEY]');
      expect(sanitized.message).toBe('[REDACTED_SENSITIVE_KEY]');
      expect(sanitized.coachResponse).toBe('[REDACTED_SENSITIVE_KEY]');
    });

    it('redacts auth credentials, tokens and passwords', () => {
      const rawContext = {
        component: 'LoginScreen',
        email: 'user@test.org',
        password: 'SuperSecretPassword123!',
        token: 'secret-token-xyz',
        cookie: 'session_id=987654321',
      };

      const sanitized = sanitizeContext(rawContext);
      expect(sanitized.component).toBe('LoginScreen');
      expect(sanitized.email).toBe('[REDACTED_SENSITIVE_KEY]');
      expect(sanitized.password).toBe('[REDACTED_SENSITIVE_KEY]');
      expect(sanitized.token).toBe('[REDACTED_SENSITIVE_KEY]');
      expect(sanitized.cookie).toBe('[REDACTED_SENSITIVE_KEY]');
    });
  });

  describe('Service & Adapter Lifecycle', () => {
    it('captures exception and returns sanitized payload without active adapter', () => {
      const error = new Error('Network error connecting to user@domain.com');
      const payload = observabilityService.captureException(error, {
        route: '/history',
        weight: 90,
      });

      expect(payload.name).toBe('Error');
      expect(payload.message).toBe('Network error connecting to [REDACTED_EMAIL]');
      expect(payload.context.route).toBe('/history');
      expect(payload.context.weight).toBe('[REDACTED_SENSITIVE_KEY]');
    });

    it('forwards sanitized context to pluggable adapter', () => {
      const mockAdapter: ObservabilityAdapter = {
        captureException: jest.fn(),
        captureBreadcrumb: jest.fn(),
        setUser: jest.fn(),
      };

      observabilityService.setAdapter(mockAdapter);

      const err = new TypeError('Cannot read property of undefined');
      observabilityService.captureException(err, {
        userEmail: 'athlete@gmail.com',
        waist: 75,
        component: 'RestTimer',
      });

      expect(mockAdapter.captureException).toHaveBeenCalledTimes(1);
      const passedContext = (mockAdapter.captureException as jest.Mock).mock.calls[0][1];
      expect(passedContext.component).toBe('RestTimer');
      expect(passedContext.waist).toBe('[REDACTED_SENSITIVE_KEY]');
    });

    it('swallows adapter exceptions to never crash the host application', () => {
      const failingAdapter: ObservabilityAdapter = {
        captureException: jest.fn().mockImplementation(() => {
          throw new Error('Sentry network timeout');
        }),
        captureBreadcrumb: jest.fn().mockImplementation(() => {
          throw new Error('Sentry buffer overflow');
        }),
        setUser: jest.fn(),
      };

      observabilityService.setAdapter(failingAdapter);

      expect(() => {
        observabilityService.captureException(new Error('UI Crash'));
        observabilityService.captureBreadcrumb('navigation', 'Navigated to Profile');
      }).not.toThrow();
    });

    it('retains rolling breadcrumbs up to maximum limit', () => {
      for (let i = 0; i < 25; i++) {
        observabilityService.captureBreadcrumb('action', `Step ${i}`);
      }

      const breadcrumbs = observabilityService.getRecentBreadcrumbs();
      expect(breadcrumbs.length).toBe(20);
      expect(breadcrumbs[breadcrumbs.length - 1]?.message).toBe('Step 24');
    });
  });
});
