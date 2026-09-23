import { monetizationAnalytics } from '../monetizationAnalytics';

describe('Monetization Analytics Privacy & Funnel (WP-08 / WP-05 / S5 / S7)', () => {
  beforeEach(() => {
    monetizationAnalytics.clear();
  });

  it('1. Successfully records privacy-preserving paywall funnel events', () => {
    monetizationAnalytics.track('paywall_viewed', {
      tier: 'pro',
      paywall_source: 'template_limit',
      billing_period: 'year',
      trial: false,
    });

    monetizationAnalytics.track('subscription_checkout_started', {
      tier: 'pro',
      product_selected: 'studio.skar.evaro.pro.annual',
      billing_period: 'year',
    });

    monetizationAnalytics.track('subscription_started', {
      tier: 'pro',
      product_selected: 'studio.skar.evaro.pro.annual',
      billing_period: 'year',
    });

    const events = monetizationAnalytics.getRecordedEvents();
    expect(events.length).toBe(3);
    expect(events[0]!.event).toBe('paywall_viewed');
    expect(events[0]!.properties.tier).toBe('pro');
    expect(events[0]!.properties.paywall_source).toBe('template_limit');
    expect(events[1]!.event).toBe('subscription_checkout_started');
    expect(events[2]!.event).toBe('subscription_started');
  });

  it('2. Records Coach paywall view and trial progression events', () => {
    monetizationAnalytics.track('coach_paywall_viewed', {
      tier: 'coach',
      paywall_source: 'coach_plan',
      trial: true,
      billing_period: 'year',
    });

    monetizationAnalytics.track('trial_started', {
      tier: 'coach',
      product_selected: 'studio.skar.evaro.coach.annual',
      trial: true,
    });

    const events = monetizationAnalytics.getRecordedEvents();
    expect(events.length).toBe(2);
    expect(events[0]!.event).toBe('coach_paywall_viewed');
    expect(events[0]!.properties.trial).toBe(true);
    expect(events[1]!.event).toBe('trial_started');
  });

  it('3. Strict privacy guard: Never persists workout weights, reps, health metrics, or coach prompts', () => {
    // Attempting to pass forbidden keys in arbitrary payload
    const dirtyPayload: Record<string, unknown> = {
      tier: 'coach',
      paywall_source: 'coach_preview_limit',
      workoutName: 'Heavy Chest Day',
      benchPressKg: 100,
      userPrompt: 'Can you help me rehab my shoulder?',
      coachResponse: 'Please consult a doctor.',
      bodyWeightKg: 82.5,
    };

    monetizationAnalytics.track('ai_limit_reached', dirtyPayload as unknown as Parameters<typeof monetizationAnalytics.track>[1]);

    const events = monetizationAnalytics.getRecordedEvents();
    const recorded = events[0]!;

    expect(recorded.event).toBe('ai_limit_reached');
    expect(recorded.properties.tier).toBe('coach');
    expect(recorded.properties.paywall_source).toBe('coach_preview_limit');

    // Forbidden keys must be stripped by sanitizedProps
    const props = recorded.properties as Record<string, unknown>;
    expect(props.workoutName).toBeUndefined();
    expect(props.benchPressKg).toBeUndefined();
    expect(props.userPrompt).toBeUndefined();
    expect(props.coachResponse).toBeUndefined();
    expect(props.bodyWeightKg).toBeUndefined();
  });

  it('4. Successfully records canonical activation & core lifecycle events (08.03)', () => {
    monetizationAnalytics.track('onboarding_started', { step: 0 });
    monetizationAnalytics.track('onboarding_completed', { step: 4 });
    monetizationAnalytics.track('first_workout', { duration_seconds: 1800 });
    monetizationAnalytics.track('second_workout', { duration_seconds: 2400 });
    monetizationAnalytics.track('coach_usage', { mode: 'plan' });
    monetizationAnalytics.track('coach_error', { error_code: 'CIRCUIT_OPEN' });

    const events = monetizationAnalytics.getRecordedEvents();
    expect(events.length).toBe(6);
    expect(events.map((e) => e.event)).toEqual([
      'onboarding_started',
      'onboarding_completed',
      'first_workout',
      'second_workout',
      'coach_usage',
      'coach_error',
    ]);
    expect(events[0]!.properties.step).toBe(0);
    expect(events[1]!.properties.step).toBe(4);
    expect(events[2]!.properties.duration_seconds).toBe(1800);
    expect(events[3]!.properties.duration_seconds).toBe(2400);
    expect(events[4]!.properties.mode).toBe('plan');
    expect(events[5]!.properties.error_code).toBe('CIRCUIT_OPEN');
  });
});
