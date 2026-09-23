import { z } from 'zod';

export const NotificationPreferencesSchema = z.object({
  /** Satzpause-Timer Benachrichtigung (lokal, datensparsam) */
  restTimer: z.boolean().default(true),
  /** Geplante Trainingserinnerungen */
  workoutReminder: z.boolean().default(false),
  /** Fortschritts- und Coach-Updates */
  progressCoach: z.boolean().default(false),
  /**
   * Produktneuigkeiten & Angebote (STRIKT SEPARATES Marketing Opt-In).
   * Darf niemals mit notwendigen Trainings-Alerts gekoppelt werden.
   */
  productOffers: z.boolean().default(false),
});

export type NotificationPreferences = z.infer<typeof NotificationPreferencesSchema>;

export const DEFAULT_NOTIFICATION_PREFERENCES: NotificationPreferences = {
  restTimer: true,
  workoutReminder: false,
  progressCoach: false,
  productOffers: false,
};

export type NotificationChannel =
  | 'restTimer'
  | 'workoutReminder'
  | 'progressCoach'
  | 'productOffers'
  | 'rest_timer'
  | 'workout_reminder'
  | 'progress_coach'
  | 'product_offers';

const CHANNEL_KEY_MAP: Record<NotificationChannel, keyof NotificationPreferences> = {
  restTimer: 'restTimer',
  rest_timer: 'restTimer',
  workoutReminder: 'workoutReminder',
  workout_reminder: 'workoutReminder',
  progressCoach: 'progressCoach',
  progress_coach: 'progressCoach',
  productOffers: 'productOffers',
  product_offers: 'productOffers',
};

/**
 * Pure domain check: Verifies if a notification is permitted under current preferences.
 */
export function canSendNotification(
  preferences: NotificationPreferences,
  channel: NotificationChannel,
): boolean {
  const key = CHANNEL_KEY_MAP[channel];
  if (!key) return false;
  return Boolean(preferences[key]);
}
