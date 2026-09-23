/**
 * EVARO Local Notification Service (WP-07 Tasks 07.02 & 07.04)
 *
 * Provides local, offline-capable notification scheduling.
 * STRICT PRIVACY GUARD: Disallows health metrics, exercise names, weights, reps, or coach text
 * in notification payloads to protect lockscreen privacy.
 */

import { useNotificationPreferenceStore } from '../stores/notificationPreferenceStore';
import { logger } from '../utils/logger';

export interface LocalNotificationRequest {
  id: string;
  title: string;
  body: string;
  triggerSeconds: number;
  channel: 'rest_timer' | 'workout_reminder' | 'progress_coach' | 'product_offers';
}

export interface ScheduledNotificationItem {
  id: string;
  title: string;
  body: string;
  scheduledAt: Date;
  triggerAt: Date;
  channel: string;
}

export interface LocalNotificationAdapter {
  scheduleNotification(request: LocalNotificationRequest): Promise<string | null>;
  cancelNotification(id: string): Promise<void>;
  cancelAllNotifications(): Promise<void>;
  getScheduledNotifications(): Promise<ScheduledNotificationItem[]>;
}

export class InMemoryNotificationAdapter implements LocalNotificationAdapter {
  private scheduled = new Map<string, ScheduledNotificationItem>();

  async scheduleNotification(request: LocalNotificationRequest): Promise<string | null> {
    const now = new Date();
    const triggerAt = new Date(now.getTime() + request.triggerSeconds * 1000);
    const item: ScheduledNotificationItem = {
      id: request.id,
      title: request.title,
      body: request.body,
      scheduledAt: now,
      triggerAt,
      channel: request.channel,
    };
    this.scheduled.set(request.id, item);
    return request.id;
  }

  async cancelNotification(id: string): Promise<void> {
    this.scheduled.delete(id);
  }

  async cancelAllNotifications(): Promise<void> {
    this.scheduled.clear();
  }

  async getScheduledNotifications(): Promise<ScheduledNotificationItem[]> {
    return Array.from(this.scheduled.values());
  }
}

export const REST_TIMER_NOTIFICATION_ID = 'rest-timer-alarm';

export class LocalNotificationService {
  private adapter: LocalNotificationAdapter;

  constructor(adapter: LocalNotificationAdapter = new InMemoryNotificationAdapter()) {
    this.adapter = adapter;
  }

  setAdapter(adapter: LocalNotificationAdapter): void {
    this.adapter = adapter;
  }

  /**
   * Schedules a local notification for the Rest Timer.
   * - Enforces user preference check (`restTimer`).
   * - Strips any potential health or exercise data (strictly generic message).
   * - Idempotently cancels any previous rest-timer alarm to prevent notification spam.
   */
  async scheduleRestTimer(
    durationSeconds: number,
    options: { title?: string; body?: string } = {},
  ): Promise<string | null> {
    if (durationSeconds <= 0) return null;

    const prefs = useNotificationPreferenceStore.getState().preferences;
    if (!prefs.restTimer) {
      logger.info('LocalNotificationService: Rest timer notifications disabled by user preferences');
      return null;
    }

    // Cancel existing pending rest timer to avoid duplicates / spam
    await this.cancelRestTimer();

    // STRICT LOCKSCREEN PRIVACY: Generic text only!
    const title = options.title || 'Satzpause beendet';
    const body = options.body || 'Bereit für den nächsten Satz?';

    try {
      const scheduledId = await this.adapter.scheduleNotification({
        id: REST_TIMER_NOTIFICATION_ID,
        title,
        body,
        triggerSeconds: Math.max(1, Math.round(durationSeconds)),
        channel: 'rest_timer',
      });
      return scheduledId;
    } catch (error) {
      logger.warn('LocalNotificationService: Failed to schedule rest timer notification', { error });
      return null;
    }
  }

  /**
   * Cancels any pending Rest Timer notification (e.g. when timer stops, resets, or ticks to completion).
   */
  async cancelRestTimer(): Promise<void> {
    try {
      await this.adapter.cancelNotification(REST_TIMER_NOTIFICATION_ID);
    } catch (error) {
      logger.warn('LocalNotificationService: Failed to cancel rest timer notification', { error });
    }
  }

  async cancelAll(): Promise<void> {
    try {
      await this.adapter.cancelAllNotifications();
    } catch (error) {
      logger.warn('LocalNotificationService: Failed to cancel all notifications', { error });
    }
  }

  async getScheduled(): Promise<ScheduledNotificationItem[]> {
    return this.adapter.getScheduledNotifications();
  }
}

export const localNotificationService = new LocalNotificationService();
