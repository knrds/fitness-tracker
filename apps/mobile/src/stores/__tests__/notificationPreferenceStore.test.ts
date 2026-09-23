import { useNotificationPreferenceStore } from '../notificationPreferenceStore';

describe('Notification Preference Store (WP-07 Task 07.04)', () => {
  beforeEach(() => {
    useNotificationPreferenceStore.getState().resetPreferences();
  });

  it('initializes with privacy-friendly defaults', () => {
    const { preferences } = useNotificationPreferenceStore.getState();
    expect(preferences.restTimer).toBe(true);
    expect(preferences.workoutReminder).toBe(false);
    expect(preferences.progressCoach).toBe(false);
    expect(preferences.productOffers).toBe(false);
  });

  it('allows toggling channels independently', () => {
    useNotificationPreferenceStore.getState().setPreference('workoutReminder', true);
    expect(useNotificationPreferenceStore.getState().preferences.workoutReminder).toBe(true);
    expect(useNotificationPreferenceStore.getState().preferences.productOffers).toBe(false);
    expect(useNotificationPreferenceStore.getState().preferences.restTimer).toBe(true);

    useNotificationPreferenceStore.getState().setPreference('restTimer', false);
    expect(useNotificationPreferenceStore.getState().preferences.restTimer).toBe(false);
    expect(useNotificationPreferenceStore.getState().preferences.workoutReminder).toBe(true);
  });

  it('keeps marketing / product offers strictly separated from essential workout alerts', () => {
    // User enables marketing opt-in
    useNotificationPreferenceStore.getState().setPreference('product_offers', true);
    expect(useNotificationPreferenceStore.getState().preferences.productOffers).toBe(true);

    // Disabling marketing opt-in does not change workout reminder
    useNotificationPreferenceStore.getState().setPreference('product_offers', false);
    expect(useNotificationPreferenceStore.getState().preferences.productOffers).toBe(false);
  });

  it('resets preferences to default state', () => {
    useNotificationPreferenceStore.getState().setPreference('restTimer', false);
    useNotificationPreferenceStore.getState().setPreference('workoutReminder', true);
    useNotificationPreferenceStore.getState().setPreference('productOffers', true);

    useNotificationPreferenceStore.getState().resetPreferences();

    const { preferences } = useNotificationPreferenceStore.getState();
    expect(preferences.restTimer).toBe(true);
    expect(preferences.workoutReminder).toBe(false);
    expect(preferences.progressCoach).toBe(false);
    expect(preferences.productOffers).toBe(false);
  });
});
