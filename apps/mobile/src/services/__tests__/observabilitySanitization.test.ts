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

  it('never sends original error objects or raw breadcrumb strings across the adapter boundary', () => {
    const adapter = {
      captureException: jest.fn(),
      captureBreadcrumb: jest.fn(),
      setUser: jest.fn(),
    };
    observabilityService.setAdapter(adapter);
    const original = new Error('Request failed for private@example.com api_key=test-only-secret', {
      cause: { prompt: 'private training details' },
    });
    original.stack = 'Error at private@example.com password=test-only-password';
    Object.assign(original, { rawBody: 'private training payload' });
    observabilityService.captureException(original, {
      access_token: 'private token',
      bodyMeasurements: { waist: 85 },
    });
    const [sent, context] = adapter.captureException.mock.calls[0]!;
    expect(sent).not.toBe(original);
    expect(sent.cause).toBeUndefined();
    expect(sent.rawBody).toBeUndefined();
    expect(sent.message + sent.stack + JSON.stringify(context)).not.toMatch(
      /private@example|test-only-secret|test-only-password|private token|85/,
    );
    expect(original.message).toContain('private@example.com');
    observabilityService.captureBreadcrumb('user private@example.com', 'api_key=test-only-secret', {
      audio_url: 'private audio',
    });
    expect(JSON.stringify(adapter.captureBreadcrumb.mock.calls)).not.toMatch(
      /private@example|test-only-secret|private audio/,
    );
  });

  it('bounds recursive contexts and never invokes getters while handling a crash', () => {
    const cyclic: Record<string, unknown> = { code: 'OFFLINE' };
    cyclic.self = cyclic;
    cyclic.children = [cyclic];
    const getter = jest.fn(() => {
      throw new Error('must not run');
    });
    Object.defineProperty(cyclic, 'danger', { enumerable: true, get: getter });
    const result = sanitizeContext(cyclic);
    expect(result.code).toBe('OFFLINE');
    expect(result.self).toEqual({ circular: true });
    expect(getter).not.toHaveBeenCalled();
    const deep = { next: { next: { next: { next: { next: { secret: 'hidden' } } } } } };
    expect(JSON.stringify(sanitizeContext(deep))).toContain('truncated');
    expect(JSON.stringify(sanitizeContext(deep))).not.toContain('hidden');
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
      expect(payload.message).toBe('Application error');
      expect(payload.context.route).toBe('/history');
      expect(payload.context.weight).toBeUndefined();
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
      expect(passedContext.waist).toBeUndefined();
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
      expect(breadcrumbs[breadcrumbs.length - 1]?.message).toBe('Operational event');
    });
  });
});

it('never forwards freeform health, chat, stack or custom context through telemetry', () => {
  const adapter = { captureException: jest.fn(), captureBreadcrumb: jest.fn(), setUser: jest.fn() };
  observabilityService.setAdapter(adapter);
  try {
    const raw = new Error('I weigh 82 kg and my private training plan is heavy');
    const context = {
      custom: 'personal conversation',
      component: 'RestTimer',
      route: '/profile?email=private',
      errorId: 'ERR-ABC123',
    };
    const result = observabilityService.captureException(raw, context);
    expect(result.message).toBe('Application error');
    expect(result.stack).toBeUndefined();
    const [reported, metadata] = adapter.captureException.mock.calls[0]!;
    expect(reported.message).toBe('Application error');
    expect(reported.stack).toBeUndefined();
    expect(metadata).toEqual({ component: 'RestTimer', errorId: 'ERR-ABC123' });
    observabilityService.captureBreadcrumb('my health', 'private training plan', context);
    expect(adapter.captureBreadcrumb).toHaveBeenCalledWith('action', 'Operational event', metadata);
    const getter = jest.fn(() => {
      throw new Error('do not execute');
    });
    const list: unknown[] = [];
    Object.defineProperty(list, '0', { get: getter });
    expect(sanitizeContext({ list })).toEqual({ list: ['[ACCESSOR]'] });
    expect(getter).not.toHaveBeenCalled();
    expect(() =>
      observabilityService.captureException(
        raw,
        new Proxy({}, { getOwnPropertyDescriptor: getter }),
      ),
    ).not.toThrow();
  } finally {
    observabilityService.setAdapter(null);
  }
});
