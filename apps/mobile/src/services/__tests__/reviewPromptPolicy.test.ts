import {
  ReviewPromptPolicy,
  InMemoryReviewPromptAdapter,
  COOLDOWN_MS,
  NEGATIVE_EVENT_COOLDOWN_MS,
} from '../reviewPromptPolicy';

describe('ReviewPromptPolicy', () => {
  let policy: ReviewPromptPolicy;
  let adapter: InMemoryReviewPromptAdapter;

  beforeEach(() => {
    adapter = new InMemoryReviewPromptAdapter();
    policy = new ReviewPromptPolicy(adapter);
  });

  it('rejects review prompt if current workout failed or was aborted', async () => {
    const res = await policy.triggerReviewIfEligible({
      totalCompletedWorkouts: 5,
      isCurrentWorkoutCompletedSuccessfully: false,
    });

    expect(res.prompted).toBe(false);
    expect(res.reason).toContain('not completed successfully');
    expect(adapter.requestedCount).toBe(0);
  });

  it('rejects review prompt if user has completed fewer than 3 workouts', async () => {
    const res = await policy.triggerReviewIfEligible({
      totalCompletedWorkouts: 2,
      isCurrentWorkoutCompletedSuccessfully: true,
    });

    expect(res.prompted).toBe(false);
    expect(res.reason).toContain('2/3 required workouts');
    expect(adapter.requestedCount).toBe(0);
  });

  it('triggers review prompt successfully on valid positive milestone', async () => {
    const now = 1700000000000;
    const res = await policy.triggerReviewIfEligible(
      {
        totalCompletedWorkouts: 3,
        isCurrentWorkoutCompletedSuccessfully: true,
        hasRecentPr: true,
      },
      now,
    );

    expect(res.prompted).toBe(true);
    expect(adapter.requestedCount).toBe(1);
    expect(policy.getState().lastPromptedAt).toBe(now);
    expect(policy.getState().promptHistory).toEqual([now]);
  });

  it('blocks prompt within 48h of a negative event (e.g. crash or abort)', async () => {
    const now = 1700000000000;
    policy.recordNegativeEvent('abort', now);

    const res = await policy.triggerReviewIfEligible(
      {
        totalCompletedWorkouts: 10,
        isCurrentWorkoutCompletedSuccessfully: true,
      },
      now + 24 * 60 * 60 * 1000, // 24 hours later (inside 48h cooldown)
    );

    expect(res.prompted).toBe(false);
    expect(res.reason).toContain('Recent negative event (abort) within cooldown window');
    expect(adapter.requestedCount).toBe(0);

    // After 48h has elapsed, prompt becomes eligible again
    const eligibleRes = await policy.triggerReviewIfEligible(
      {
        totalCompletedWorkouts: 10,
        isCurrentWorkoutCompletedSuccessfully: true,
      },
      now + NEGATIVE_EVENT_COOLDOWN_MS + 1000,
    );

    expect(eligibleRes.prompted).toBe(true);
    expect(adapter.requestedCount).toBe(1);
  });

  it('enforces 60-day cooldown between successive review prompts', async () => {
    const t0 = 1700000000000;
    const first = await policy.triggerReviewIfEligible(
      { totalCompletedWorkouts: 3, isCurrentWorkoutCompletedSuccessfully: true },
      t0,
    );
    expect(first.prompted).toBe(true);

    // Try again 30 days later (within 60d cooldown)
    const t1 = t0 + 30 * 24 * 60 * 60 * 1000;
    const second = await policy.triggerReviewIfEligible(
      { totalCompletedWorkouts: 15, isCurrentWorkoutCompletedSuccessfully: true },
      t1,
    );
    expect(second.prompted).toBe(false);
    expect(second.reason).toContain('Prompt cooldown active');

    // Try again 61 days later
    const t2 = t0 + COOLDOWN_MS + 1000;
    const third = await policy.triggerReviewIfEligible(
      { totalCompletedWorkouts: 25, isCurrentWorkoutCompletedSuccessfully: true },
      t2,
    );
    expect(third.prompted).toBe(true);
  });

  it('enforces maximum 3 prompts per year', async () => {
    const t0 = 1700000000000;

    // Prompt 1 at t0
    await policy.triggerReviewIfEligible(
      { totalCompletedWorkouts: 3, isCurrentWorkoutCompletedSuccessfully: true },
      t0,
    );

    // Prompt 2 at t0 + 70 days
    await policy.triggerReviewIfEligible(
      { totalCompletedWorkouts: 6, isCurrentWorkoutCompletedSuccessfully: true },
      t0 + 70 * 24 * 60 * 60 * 1000,
    );

    // Prompt 3 at t0 + 140 days
    await policy.triggerReviewIfEligible(
      { totalCompletedWorkouts: 9, isCurrentWorkoutCompletedSuccessfully: true },
      t0 + 140 * 24 * 60 * 60 * 1000,
    );

    expect(policy.getState().promptHistory.length).toBe(3);

    // Prompt 4 at t0 + 210 days (still within 1 year of t0)
    const fourth = await policy.triggerReviewIfEligible(
      { totalCompletedWorkouts: 12, isCurrentWorkoutCompletedSuccessfully: true },
      t0 + 210 * 24 * 60 * 60 * 1000,
    );

    expect(fourth.prompted).toBe(false);
    expect(fourth.reason).toContain('Maximum of 3 prompts per year reached');
  });
});
