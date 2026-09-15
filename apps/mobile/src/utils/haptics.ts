import { Platform } from 'react-native';
import * as Haptics from 'expo-haptics';
import { useProfileStore } from '../stores/profileStore';

export type HapticImpactStyle = 'light' | 'medium' | 'heavy';
export type HapticNotificationType = 'success' | 'warning' | 'error';

function isHapticsEnabled(): boolean {
  if (Platform.OS === 'web') return false;
  try {
    const profile = useProfileStore.getState().profile;
    return profile?.hapticsEnabled ?? true;
  } catch {
    return true;
  }
}

/**
 * Safe, centralized haptic feedback abstraction for EVARO.
 * Respects athlete user settings (hapticsEnabled) and safely no-ops on unsupported environments.
 */
export const hapticFeedback = {
  async selection(): Promise<void> {
    if (!isHapticsEnabled()) return;
    try {
      await Haptics.selectionAsync();
    } catch {
      // Gracefully no-op on unsupported hardware
    }
  },

  async impact(style: HapticImpactStyle = 'light'): Promise<void> {
    if (!isHapticsEnabled()) return;
    try {
      const feedbackStyle =
        style === 'heavy'
          ? Haptics.ImpactFeedbackStyle.Heavy
          : style === 'medium'
            ? Haptics.ImpactFeedbackStyle.Medium
            : Haptics.ImpactFeedbackStyle.Light;
      await Haptics.impactAsync(feedbackStyle);
    } catch {
      // Gracefully no-op on unsupported hardware
    }
  },

  async notification(type: HapticNotificationType = 'success'): Promise<void> {
    if (!isHapticsEnabled()) return;
    try {
      const notifType =
        type === 'error'
          ? Haptics.NotificationFeedbackType.Error
          : type === 'warning'
            ? Haptics.NotificationFeedbackType.Warning
            : Haptics.NotificationFeedbackType.Success;
      await Haptics.notificationAsync(notifType);
    } catch {
      // Gracefully no-op on unsupported hardware
    }
  },

  async success(): Promise<void> {
    return this.notification('success');
  },

  async warning(): Promise<void> {
    return this.notification('warning');
  },

  async error(): Promise<void> {
    return this.notification('error');
  },
};
