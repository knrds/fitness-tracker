import { useOnboardingStore, needsOnboarding } from '../onboardingStore';
import { useProfileStore } from '../profileStore';
import { CURRENT_ONBOARDING_VERSION } from '@fitness-tracker/domain';

describe('Onboarding State Machine (WP-06 Task 06.01)', () => {
  beforeEach(() => {
    useOnboardingStore.getState().resetOnboarding();
  });

  it('1. Initializes in fresh, incomplete state at step 0', () => {
    const state = useOnboardingStore.getState();
    expect(state.currentStepIndex).toBe(0);
    expect(state.getCurrentStep()).toBe('welcome');
    expect(state.completed).toBe(false);
    expect(state.skipped).toBe(false);
    expect(needsOnboarding(state)).toBe(true);
  });

  it('2. Advances through steps with nextStep and respects upper bound', () => {
    expect(useOnboardingStore.getState().getCurrentStep()).toBe('welcome');

    useOnboardingStore.getState().nextStep();
    expect(useOnboardingStore.getState().getCurrentStep()).toBe('goal');

    useOnboardingStore.getState().nextStep();
    expect(useOnboardingStore.getState().getCurrentStep()).toBe('experience');

    // Fast-forward past the end
    for (let i = 0; i < 20; i++) {
      useOnboardingStore.getState().nextStep();
    }
    expect(useOnboardingStore.getState().getCurrentStep()).toBe('paywall');
  });

  it('3. Navigates backward with previousStep and respects lower bound 0', () => {
    useOnboardingStore.getState().nextStep();
    useOnboardingStore.getState().nextStep();
    expect(useOnboardingStore.getState().getCurrentStep()).toBe('experience');

    useOnboardingStore.getState().previousStep();
    expect(useOnboardingStore.getState().getCurrentStep()).toBe('goal');

    useOnboardingStore.getState().previousStep();
    expect(useOnboardingStore.getState().getCurrentStep()).toBe('welcome');

    // Below 0 bound
    useOnboardingStore.getState().previousStep();
    expect(useOnboardingStore.getState().getCurrentStep()).toBe('welcome');
  });

  it('4. Collects and persists draft preferences', () => {
    useOnboardingStore.getState().setGoal('gain_strength');
    useOnboardingStore.getState().setExperience('advanced');
    useOnboardingStore.getState().setFrequency(4);
    useOnboardingStore.getState().setEquipment('full_gym');

    const draft = useOnboardingStore.getState().draftData;
    expect(draft.fitnessGoal).toBe('gain_strength');
    expect(draft.experienceLevel).toBe('advanced');
    expect(draft.trainingFrequency).toBe(4);
    expect(draft.equipment).toBe('full_gym');
  });

  it('5. Completes onboarding, sets version, and syncs profile preferences', () => {
    useOnboardingStore.getState().setGoal('build_muscle');
    useOnboardingStore.getState().setExperience('intermediate');

    useOnboardingStore.getState().completeOnboarding();

    const state = useOnboardingStore.getState();
    expect(state.completed).toBe(true);
    expect(state.completedVersion).toBe(CURRENT_ONBOARDING_VERSION);
    expect(state.skipped).toBe(false);
    expect(needsOnboarding(state)).toBe(false);

    // ProfileStore must have received the onboarding choices
    const profile = useProfileStore.getState().profile;
    expect(profile.fitnessGoal).toBe('build_muscle');
    expect(profile.experienceLevel).toBe('intermediate');
  });

  it('6. Explicit skip terminates onboarding without forced re-prompts', () => {
    useOnboardingStore.getState().skipOnboarding();

    const state = useOnboardingStore.getState();
    expect(state.skipped).toBe(true);
    expect(state.completed).toBe(false);
    expect(needsOnboarding(state)).toBe(false);
  });

  it('7. Reset restores clean initial state', () => {
    useOnboardingStore.getState().completeOnboarding();
    expect(useOnboardingStore.getState().completed).toBe(true);

    useOnboardingStore.getState().resetOnboarding();
    const state = useOnboardingStore.getState();
    expect(state.completed).toBe(false);
    expect(state.currentStepIndex).toBe(0);
    expect(needsOnboarding(state)).toBe(true);
  });
});
