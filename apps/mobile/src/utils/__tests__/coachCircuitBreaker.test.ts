import { CoachCircuitBreaker, defaultCoachCircuitBreaker } from '../coachCircuitBreaker';
import { streamCoachResponse } from '../coachApi';

describe('CoachCircuitBreaker', () => {
  beforeEach(() => {
    defaultCoachCircuitBreaker.reset();
  });

  it('starts in CLOSED state and allows execution', () => {
    const cb = new CoachCircuitBreaker();
    expect(cb.getState()).toBe('CLOSED');
    expect(cb.canExecute()).toEqual({ allowed: true });
    expect(cb.getConsecutiveFailures()).toBe(0);
  });

  it('ignores 401 and 403 as service outage failures', () => {
    const cb = new CoachCircuitBreaker({ failureThreshold: 3 });
    cb.recordFailure(401);
    cb.recordFailure(403);
    cb.recordFailure(400);

    expect(cb.getState()).toBe('CLOSED');
    expect(cb.getConsecutiveFailures()).toBe(0);
    expect(cb.canExecute().allowed).toBe(true);
  });

  it('trips to OPEN after consecutive 5xx or 429 failures reach threshold', () => {
    const cb = new CoachCircuitBreaker({ failureThreshold: 3, cooldownMs: 15000 });
    cb.recordFailure(503);
    expect(cb.getState()).toBe('CLOSED');
    expect(cb.getConsecutiveFailures()).toBe(1);

    cb.recordFailure(429);
    expect(cb.getState()).toBe('CLOSED');
    expect(cb.getConsecutiveFailures()).toBe(2);

    cb.recordFailure(500);
    expect(cb.getState()).toBe('OPEN');
    expect(cb.getConsecutiveFailures()).toBe(3);

    const check = cb.canExecute();
    expect(check.allowed).toBe(false);
    expect(check.retryAfterSeconds).toBeGreaterThan(0);
    expect(check.reason).toContain('Schutzpause aktiv');
  });

  it('transitions to HALF_OPEN after cooldown expires, and recovers on success', () => {
    const cb = new CoachCircuitBreaker({ failureThreshold: 2, cooldownMs: 1000 });
    cb.recordFailure(500);
    cb.recordFailure(500);
    expect(cb.getState()).toBe('OPEN');

    // Fast-forward time past cooldown
    const realNow = Date.now;
    try {
      Date.now = () => realNow() + 1500;
      expect(cb.getState()).toBe('HALF_OPEN');
      expect(cb.canExecute().allowed).toBe(true);

      // Successful trial request resets circuit to CLOSED
      cb.recordSuccess();
      expect(cb.getState()).toBe('CLOSED');
      expect(cb.getConsecutiveFailures()).toBe(0);
    } finally {
      Date.now = realNow;
    }
  });

  it('re-opens immediately if trial request in HALF_OPEN fails', () => {
    const cb = new CoachCircuitBreaker({ failureThreshold: 2, cooldownMs: 1000 });
    cb.recordFailure(500);
    cb.recordFailure(500);
    expect(cb.getState()).toBe('OPEN');

    const realNow = Date.now;
    try {
      Date.now = () => realNow() + 1500;
      expect(cb.getState()).toBe('HALF_OPEN');

      // Failure during HALF_OPEN trips immediately back to OPEN
      cb.recordFailure(503);
      expect(cb.getState()).toBe('OPEN');
      expect(cb.canExecute().allowed).toBe(false);
    } finally {
      Date.now = realNow;
    }
  });

  it('calculates bounded exponential backoff delay with jitter', () => {
    const cb = new CoachCircuitBreaker({ baseBackoffMs: 200 });
    const delay0 = cb.getBackoffDelay(0);
    const delay1 = cb.getBackoffDelay(1);
    const delay2 = cb.getBackoffDelay(2);

    expect(delay0).toBeGreaterThanOrEqual(200);
    expect(delay1).toBeGreaterThanOrEqual(400);
    expect(delay2).toBeGreaterThanOrEqual(800);
    expect(delay2).toBeLessThanOrEqual(5000);
  });

  it('fast-fails streamCoachResponse without network call when circuit is OPEN', async () => {
    let streamCoachResponseFn: typeof streamCoachResponse | undefined;
    let breaker: typeof defaultCoachCircuitBreaker | undefined;

    jest.isolateModules(() => {
      process.env.EXPO_PUBLIC_COACH_CHAT_ENDPOINT = 'https://coach.example.test/chat';
      const api = jest.requireActual<typeof import('../coachApi')>('../coachApi');
      streamCoachResponseFn = api.streamCoachResponse;
      breaker = api.defaultCoachCircuitBreaker;
    });

    // Trip the circuit breaker
    breaker!.recordFailure(503);
    breaker!.recordFailure(503);
    breaker!.recordFailure(503);

    expect(breaker!.getState()).toBe('OPEN');

    const fetchMock = jest.fn();
    global.fetch = fetchMock;

    const generator = streamCoachResponseFn!(
      [{ id: '1', role: 'user', content: 'hello', createdAt: new Date() }],
      {
        profile: { displayName: 'User', preferredUnits: 'metric' },
        stats: { totalWorkouts: 0, currentStreak: 0 },
      },
    );

    await expect(generator.next()).rejects.toThrow(/vorübergehend nicht erreichbar/);
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
