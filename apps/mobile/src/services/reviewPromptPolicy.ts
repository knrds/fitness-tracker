export interface ReviewPromptState {
  promptHistory: number[]; // Timestamps of past review prompts
  lastPromptedAt: number | null;
  lastNegativeEventAt: number | null;
  lastNegativeEventType: 'crash' | 'error' | 'abort' | 'subscription_failure' | null;
}

export interface ReviewPromptContext {
  totalCompletedWorkouts: number;
  hasRecentPr?: boolean;
  streakDays?: number;
  isCurrentWorkoutCompletedSuccessfully: boolean;
}

export const MIN_COMPLETED_WORKOUTS = 3;
export const COOLDOWN_MS = 60 * 24 * 60 * 60 * 1000; // 60 days
export const NEGATIVE_EVENT_COOLDOWN_MS = 48 * 60 * 60 * 1000; // 48 hours
export const MAX_PROMPTS_PER_YEAR = 3;
export const ONE_YEAR_MS = 365 * 24 * 60 * 60 * 1000;

export interface ReviewPromptAdapter {
  isAvailableAsync(): Promise<boolean>;
  requestReviewAsync(): Promise<void>;
}

export class InMemoryReviewPromptAdapter implements ReviewPromptAdapter {
  public requestedCount = 0;

  async isAvailableAsync(): Promise<boolean> {
    return true;
  }

  async requestReviewAsync(): Promise<void> {
    this.requestedCount += 1;
  }
}

export class ReviewPromptPolicy {
  private state: ReviewPromptState = {
    promptHistory: [],
    lastPromptedAt: null,
    lastNegativeEventAt: null,
    lastNegativeEventType: null,
  };
  private adapter: ReviewPromptAdapter;

  constructor(adapter?: ReviewPromptAdapter) {
    this.adapter = adapter ?? new InMemoryReviewPromptAdapter();
  }

  public setAdapter(adapter: ReviewPromptAdapter): void {
    this.adapter = adapter;
  }

  public getState(): ReviewPromptState {
    return { ...this.state };
  }

  public reset(): void {
    this.state = {
      promptHistory: [],
      lastPromptedAt: null,
      lastNegativeEventAt: null,
      lastNegativeEventType: null,
    };
  }

  public recordNegativeEvent(
    type: 'crash' | 'error' | 'abort' | 'subscription_failure',
    timestamp: number = Date.now(),
  ): void {
    this.state.lastNegativeEventAt = timestamp;
    this.state.lastNegativeEventType = type;
  }

  public canRequestReview(
    context: ReviewPromptContext,
    now: number = Date.now(),
  ): { canPrompt: boolean; reason?: string | undefined } {
    // 1. Never prompt if the current workout failed or was aborted
    if (!context.isCurrentWorkoutCompletedSuccessfully) {
      return {
        canPrompt: false,
        reason: 'Current workout was not completed successfully',
      };
    }

    // 2. Minimum completed workouts milestone check
    if (context.totalCompletedWorkouts < MIN_COMPLETED_WORKOUTS) {
      return {
        canPrompt: false,
        reason: `User has completed only ${context.totalCompletedWorkouts}/${MIN_COMPLETED_WORKOUTS} required workouts`,
      };
    }

    // 3. Negative event cooldown (crash/error/abort/subscription failure in last 48h)
    if (this.state.lastNegativeEventAt !== null) {
      const timeSinceNegative = now - this.state.lastNegativeEventAt;
      if (timeSinceNegative < NEGATIVE_EVENT_COOLDOWN_MS) {
        return {
          canPrompt: false,
          reason: `Recent negative event (${this.state.lastNegativeEventType}) within cooldown window`,
        };
      }
    }

    // 4. Cooldown between successive review prompts (60 days)
    if (this.state.lastPromptedAt !== null) {
      const timeSincePrompt = now - this.state.lastPromptedAt;
      if (timeSincePrompt < COOLDOWN_MS) {
        return {
          canPrompt: false,
          reason: `Prompt cooldown active (${Math.ceil((COOLDOWN_MS - timeSincePrompt) / (24 * 60 * 60 * 1000))} days remaining)`,
        };
      }
    }

    // 5. Maximum prompts per 365-day year (Apple StoreKit compliance: max 3 per year)
    const promptsInLastYear = this.state.promptHistory.filter(
      (timestamp) => now - timestamp < ONE_YEAR_MS,
    );
    if (promptsInLastYear.length >= MAX_PROMPTS_PER_YEAR) {
      return {
        canPrompt: false,
        reason: `Maximum of ${MAX_PROMPTS_PER_YEAR} prompts per year reached`,
      };
    }

    return { canPrompt: true };
  }

  public async triggerReviewIfEligible(
    context: ReviewPromptContext,
    now: number = Date.now(),
  ): Promise<{ prompted: boolean; reason?: string | undefined }> {
    const check = this.canRequestReview(context, now);
    if (!check.canPrompt) {
      return { prompted: false, reason: check.reason };
    }

    const isAvailable = await this.adapter.isAvailableAsync();
    if (!isAvailable) {
      return { prompted: false, reason: 'Review prompt not available on current platform' };
    }

    await this.adapter.requestReviewAsync();
    this.state.lastPromptedAt = now;
    this.state.promptHistory.push(now);

    return { prompted: true };
  }
}

export const defaultReviewPromptPolicy = new ReviewPromptPolicy();
