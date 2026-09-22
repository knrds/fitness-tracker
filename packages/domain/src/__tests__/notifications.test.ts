import { describe, it, expect } from 'vitest';
import {
  NotificationPreferencesSchema,
  DEFAULT_NOTIFICATION_PREFERENCES,
  canSendNotification,
  NotificationPreferences,
} from '../schemas/notifications';

describe('Notification Preferences & Permissions Domain Logic', () => {
  it('enforces privacy-friendly defaults', () => {
    const defaults = NotificationPreferencesSchema.parse({});
    expect(defaults.restTimer).toBe(true);
    expect(defaults.workoutReminder).toBe(false);
    expect(defaults.progressCoach).toBe(false);
    expect(defaults.productOffers).toBe(false);
    expect(defaults).toEqual(DEFAULT_NOTIFICATION_PREFERENCES);
  });

  it('keeps marketing / product offers strictly separated from rest timer and workout alerts', () => {
    const prefs: NotificationPreferences = {
      restTimer: true,
      workoutReminder: true,
      progressCoach: true,
      productOffers: false, // User opts out of marketing
    };

    expect(canSendNotification(prefs, 'rest_timer')).toBe(true);
    expect(canSendNotification(prefs, 'workout_reminder')).toBe(true);
    expect(canSendNotification(prefs, 'progress_coach')).toBe(true);
    expect(canSendNotification(prefs, 'product_offers')).toBe(false);
  });

  it('allows disabling rest timer notification without affecting other channels', () => {
    const prefs: NotificationPreferences = {
      restTimer: false,
      workoutReminder: true,
      progressCoach: false,
      productOffers: false,
    };

    expect(canSendNotification(prefs, 'rest_timer')).toBe(false);
    expect(canSendNotification(prefs, 'workout_reminder')).toBe(true);
  });

  it('safely handles missing or malformed fields using safeParse defaults', () => {
    const parsed = NotificationPreferencesSchema.safeParse({
      restTimer: false,
      unknownField: 'garbage',
    });

    expect(parsed.success).toBe(true);
    if (parsed.success) {
      expect(parsed.data.restTimer).toBe(false);
      expect(parsed.data.productOffers).toBe(false); // Default applied
    }
  });
});
