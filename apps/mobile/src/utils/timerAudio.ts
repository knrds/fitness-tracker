import { audioAdapter } from './audioAdapter';
import { hapticFeedback } from './haptics';

/**
 * Plays a pleasant, latency-free double-tone bell chime (A5 -> D6)
 * via the centralized audioAdapter.
 */
export function playRestTimerChime(): void {
  void audioAdapter.playRestTimerChime();
}

/**
 * Triggers the full rest timer completion alarm:
 * - Double haptic vibration for pocket alert
 * - Bell chime sound
 */
export async function triggerRestTimerAlarm(): Promise<void> {
  void audioAdapter.playRestTimerChime();
  await hapticFeedback.warning();
  setTimeout(() => {
    void hapticFeedback.impact('heavy');
  }, 200);
}
