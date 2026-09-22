import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import {
  NotificationPreferences,
  NotificationPreferencesSchema,
  DEFAULT_NOTIFICATION_PREFERENCES,
  NotificationChannel,
} from '@fitness-tracker/domain';
import { createHydratedStorage } from './storage';
import { z } from 'zod';

const CURRENT_NOTIFICATION_PREFS_VERSION = 1;

export const PersistedNotificationPreferencesStateSchema = z.object({
  version: z.number(),
  preferences: NotificationPreferencesSchema,
});

type PersistedNotificationPreferencesState = z.infer<
  typeof PersistedNotificationPreferencesStateSchema
>;

export interface NotificationPreferenceState {
  preferences: NotificationPreferences;
  setPreference: (channel: NotificationChannel, enabled: boolean) => void;
  resetPreferences: () => void;
}

const defaultInitialState: PersistedNotificationPreferencesState = {
  version: CURRENT_NOTIFICATION_PREFS_VERSION,
  preferences: DEFAULT_NOTIFICATION_PREFERENCES,
};

export const useNotificationPreferenceStore = create<NotificationPreferenceState>()(
  persist(
    (set) => ({
      preferences: DEFAULT_NOTIFICATION_PREFERENCES,

      setPreference: (channel, enabled) =>
        set((state) => {
          const key =
            channel === 'rest_timer'
              ? 'restTimer'
              : channel === 'workout_reminder'
              ? 'workoutReminder'
              : channel === 'progress_coach'
              ? 'progressCoach'
              : channel === 'product_offers'
              ? 'productOffers'
              : (channel as keyof NotificationPreferences);

          return {
            preferences: {
              ...state.preferences,
              [key]: enabled,
            },
          };
        }),

      resetPreferences: () =>
        set({
          preferences: DEFAULT_NOTIFICATION_PREFERENCES,
        }),
    }),
    {
      name: 'notification-preferences-storage',
      storage: createHydratedStorage<PersistedNotificationPreferencesState>(
        'notification-preferences-storage',
        PersistedNotificationPreferencesStateSchema as unknown as z.ZodType<PersistedNotificationPreferencesState>,
        defaultInitialState,
        CURRENT_NOTIFICATION_PREFS_VERSION,
      ),
      partialize: (state) => ({
        version: CURRENT_NOTIFICATION_PREFS_VERSION,
        preferences: state.preferences,
      }),
      version: CURRENT_NOTIFICATION_PREFS_VERSION,
    },
  ),
);
