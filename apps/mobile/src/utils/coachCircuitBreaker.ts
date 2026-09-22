export type CircuitState = 'CLOSED' | 'OPEN' | 'HALF_OPEN';

export interface CircuitBreakerOptions {
  failureThreshold?: number; // Number of consecutive failures to trip circuit (default: 3)
  cooldownMs?: number; // Duration circuit stays open in ms (default: 30000ms = 30s)
  maxRetries?: number; // Max bounded retries per call for transient errors (default: 1)
  baseBackoffMs?: number; // Base exponential backoff in ms (default: 300ms)
}

export class CoachCircuitBreaker {
  private state: CircuitState = 'CLOSED';
  private consecutiveFailures = 0;
  private nextAttemptTime = 0;
  private readonly failureThreshold: number;
  private readonly cooldownMs: number;
  private readonly maxRetries: number;
  private readonly baseBackoffMs: number;

  constructor(options: CircuitBreakerOptions = {}) {
    this.failureThreshold = options.failureThreshold ?? 3;
    this.cooldownMs = options.cooldownMs ?? 30000;
    this.maxRetries = options.maxRetries ?? 1;
    this.baseBackoffMs = options.baseBackoffMs ?? 300;
  }

  public getState(): CircuitState {
    if (this.state === 'OPEN' && Date.now() >= this.nextAttemptTime) {
      this.state = 'HALF_OPEN';
    }
    return this.state;
  }

  public getConsecutiveFailures(): number {
    return this.consecutiveFailures;
  }

  public getNextAttemptTime(): number {
    return this.nextAttemptTime;
  }

  public canExecute(): { allowed: boolean; retryAfterSeconds?: number; reason?: string } {
    const currentState = this.getState();
    if (currentState === 'CLOSED' || currentState === 'HALF_OPEN') {
      return { allowed: true };
    }

    const remainingMs = Math.max(0, this.nextAttemptTime - Date.now());
    const retryAfterSeconds = Math.max(1, Math.ceil(remainingMs / 1000));
    return {
      allowed: false,
      retryAfterSeconds,
      reason: `Der KI-Coach ist vorübergehend nicht erreichbar. Schutzpause aktiv für ${retryAfterSeconds}s.`,
    };
  }

  public recordSuccess(): void {
    this.consecutiveFailures = 0;
    this.state = 'CLOSED';
    this.nextAttemptTime = 0;
  }

  public recordFailure(statusOrError?: number | string | Error): void {
    // Determine if this is a transient/infrastructure failure that trips the breaker
    // 401 (Unauthorized) and 403 (Forbidden) are auth issues, NOT provider outages.
    if (typeof statusOrError === 'number') {
      if (statusOrError === 401 || statusOrError === 403 || statusOrError === 400) {
        return;
      }
    }

    this.consecutiveFailures += 1;

    if (this.state === 'HALF_OPEN' || this.consecutiveFailures >= this.failureThreshold) {
      this.state = 'OPEN';
      this.nextAttemptTime = Date.now() + this.cooldownMs;
    }
  }

  public reset(): void {
    this.state = 'CLOSED';
    this.consecutiveFailures = 0;
    this.nextAttemptTime = 0;
  }

  public getMaxRetries(): number {
    return this.maxRetries;
  }

  public getBaseBackoffMs(): number {
    return this.baseBackoffMs;
  }

  /**
   * Helper to compute bounded backoff delay with jitter.
   */
  public getBackoffDelay(attempt: number): number {
    const delay = this.baseBackoffMs * Math.pow(2, attempt);
    const jitter = Math.random() * (this.baseBackoffMs * 0.5);
    return Math.min(delay + jitter, 5000);
  }
}

// Global singleton instance for coach requests
export const defaultCoachCircuitBreaker = new CoachCircuitBreaker();
