import { Platform } from 'react-native';
import * as Haptics from 'expo-haptics';

// Minimal browser audio contract, keeping DOM globals out of the native TypeScript target.
interface AudioParameter {
  setValueAtTime(value: number, time: number): void;
  linearRampToValueAtTime(value: number, time: number): void;
  exponentialRampToValueAtTime(value: number, time: number): void;
}
interface AudioConnection {
  connect(destination: AudioConnection): void;
}
interface BrowserAudioContext {
  currentTime: number;
  destination: AudioConnection;
  createOscillator(): AudioConnection & {
    type: string;
    frequency: AudioParameter;
    start(time: number): void;
    stop(time: number): void;
  };
  createGain(): AudioConnection & { gain: AudioParameter };
  close(): Promise<void>;
}

/**
 * Plays a pleasant, latency-free double-tone bell chime (A5 -> D6)
 * using Web Audio API on web/browsers without downloading external audio files.
 */
export function playRestTimerChime(): void {
  if (typeof globalThis === 'undefined') return;
  try {
    const g = globalThis as unknown as {
      AudioContext?: new () => BrowserAudioContext;
      webkitAudioContext?: new () => BrowserAudioContext;
    };
    const AudioCtx = g.AudioContext || g.webkitAudioContext;
    if (!AudioCtx) return;

    const ctx = new AudioCtx();
    const now = ctx.currentTime;

    // Tone 1: 880 Hz (A5)
    const osc1 = ctx.createOscillator();
    const gain1 = ctx.createGain();
    osc1.type = 'sine';
    osc1.frequency.setValueAtTime(880, now);
    gain1.gain.setValueAtTime(0, now);
    gain1.gain.linearRampToValueAtTime(0.18, now + 0.02);
    gain1.gain.exponentialRampToValueAtTime(0.0001, now + 0.35);
    osc1.connect(gain1);
    gain1.connect(ctx.destination);
    osc1.start(now);
    osc1.stop(now + 0.35);

    // Tone 2: 1174.66 Hz (D6) - classic Apple Watch timer chime
    const osc2 = ctx.createOscillator();
    const gain2 = ctx.createGain();
    osc2.type = 'sine';
    osc2.frequency.setValueAtTime(1174.66, now + 0.12);
    gain2.gain.setValueAtTime(0, now + 0.12);
    gain2.gain.linearRampToValueAtTime(0.22, now + 0.15);
    gain2.gain.exponentialRampToValueAtTime(0.0001, now + 0.7);
    osc2.connect(gain2);
    gain2.connect(ctx.destination);
    osc2.start(now + 0.12);
    osc2.stop(now + 0.7);
    // Release audio resources even when browser autoplay leaves the context suspended.
    setTimeout(() => {
      void ctx.close().catch(() => {});
    }, 1200);
  } catch {
    // Gracefully ignore audio errors (e.g. autoplay restrictions)
  }
}

/**
 * Triggers the full rest timer completion alarm:
 * - Double haptic vibration for pocket alert
 * - Bell chime sound
 */
export async function triggerRestTimerAlarm(): Promise<void> {
  playRestTimerChime();
  if (Platform.OS !== 'web') {
    try {
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
      setTimeout(() => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy).catch(() => {});
      }, 200);
    } catch {
      // Ignore haptics failure if unsupported
    }
  }
}
