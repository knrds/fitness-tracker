import {
  LocalNotificationService,
  InMemoryNotificationAdapter,
  REST_TIMER_NOTIFICATION_ID,
} from '../localNotificationService';
import { useNotificationPreferenceStore } from '../../stores/notificationPreferenceStore';
import { useWorkoutStore } from '../../stores/workoutStore';

describe('Local Notification Service (WP-07 Task 07.02 & 07.04)', () => {
  let adapter: InMemoryNotificationAdapter;
  let service: LocalNotificationService;

  beforeEach(() => {
    adapter = new InMemoryNotificationAdapter();
    service = new LocalNotificationService(adapter);
    useNotificationPreferenceStore.getState().resetPreferences();
    useWorkoutStore.getState().resetRestTimer();
  });

  it('schedules a rest timer notification when user preference is enabled', async () => {
    const scheduledId = await service.scheduleRestTimer(90);
    expect(scheduledId).toBe(REST_TIMER_NOTIFICATION_ID);

    const scheduled = await service.getScheduled();
    expect(scheduled).toHaveLength(1);
    expect(scheduled[0]?.id).toBe(REST_TIMER_NOTIFICATION_ID);
    expect(scheduled[0]?.title).toBe('Satzpause beendet');
    expect(scheduled[0]?.body).toBe('Bereit für den nächsten Satz?');
  });

  it('guarantees zero health, exercise, or workout details in lockscreen payload', async () => {
    await service.scheduleRestTimer(60);
    const scheduled = await service.getScheduled();
    const item = scheduled[0]!;

    // Enforce lockscreen privacy: no weights, reps, exercises, or sensitive keywords
    const forbidden = ['kg', 'lbs', 'reps', 'rpe', 'rir', 'bench', 'squat', 'deadlift', 'workout'];
    const combinedText = `${item.title} ${item.body}`.toLowerCase();

    for (const word of forbidden) {
      expect(combinedText).not.toContain(word);
    }
  });

  it('does NOT schedule when rest timer notification preference is disabled', async () => {
    useNotificationPreferenceStore.getState().setPreference('restTimer', false);

    const result = await service.scheduleRestTimer(90);
    expect(result).toBeNull();

    const scheduled = await service.getScheduled();
    expect(scheduled).toHaveLength(0);
  });

  it('cancels pending notification idempotently without spam', async () => {
    await service.scheduleRestTimer(120);
    expect(await service.getScheduled()).toHaveLength(1);

    // Scheduling a second timer cancels the first one instead of stacking duplicates
    await service.scheduleRestTimer(45);
    const scheduled = await service.getScheduled();
    expect(scheduled).toHaveLength(1);
    expect(scheduled[0]?.id).toBe(REST_TIMER_NOTIFICATION_ID);

    // Cancel rest timer
    await service.cancelRestTimer();
    expect(await service.getScheduled()).toHaveLength(0);
  });

  it('wires into workoutStore startRestTimer, stopRestTimer, and resetRestTimer', async () => {
    // Inject test adapter into singleton
    const { localNotificationService } = await import('../localNotificationService');
    const testAdapter = new InMemoryNotificationAdapter();
    localNotificationService.setAdapter(testAdapter);

    // Starting timer schedules notification
    useWorkoutStore.getState().startRestTimer(75);
    await new Promise((r) => setTimeout(r, 20));
    let items = await localNotificationService.getScheduled();
    expect(items).toHaveLength(1);

    // Stopping timer cancels notification
    useWorkoutStore.getState().stopRestTimer();
    await new Promise((r) => setTimeout(r, 20));
    items = await localNotificationService.getScheduled();
    expect(items).toHaveLength(0);

    // Starting again and resetting timer cancels notification
    useWorkoutStore.getState().startRestTimer(60);
    await new Promise((r) => setTimeout(r, 20));
    expect(await localNotificationService.getScheduled()).toHaveLength(1);

    useWorkoutStore.getState().resetRestTimer();
    await new Promise((r) => setTimeout(r, 20));
    expect(await localNotificationService.getScheduled()).toHaveLength(0);
  });
});
