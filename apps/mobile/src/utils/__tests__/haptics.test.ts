import { Platform } from 'react-native';
import * as Haptics from 'expo-haptics';
import { hapticFeedback } from '../haptics';
import { useProfileStore } from '../../stores/profileStore';

jest.mock('expo-haptics', () => ({
  selectionAsync: jest.fn().mockResolvedValue(undefined),
  impactAsync: jest.fn().mockResolvedValue(undefined),
  notificationAsync: jest.fn().mockResolvedValue(undefined),
  ImpactFeedbackStyle: {
    Light: 'light',
    Medium: 'medium',
    Heavy: 'heavy',
  },
  NotificationFeedbackType: {
    Success: 'success',
    Warning: 'warning',
    Error: 'error',
  },
}));

describe('hapticFeedback', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (Platform as { OS: string }).OS = 'ios';
    useProfileStore.setState({
      profile: {
        ...useProfileStore.getState().profile,
        hapticsEnabled: true,
      },
    });
  });

  it('triggers selection when enabled on mobile', async () => {
    await hapticFeedback.selection();
    expect(Haptics.selectionAsync).toHaveBeenCalledTimes(1);
  });

  it('triggers impact feedback with appropriate styles', async () => {
    await hapticFeedback.impact('light');
    expect(Haptics.impactAsync).toHaveBeenCalledWith('light');

    await hapticFeedback.impact('heavy');
    expect(Haptics.impactAsync).toHaveBeenCalledWith('heavy');
  });

  it('triggers success, warning, and error notifications', async () => {
    await hapticFeedback.success();
    expect(Haptics.notificationAsync).toHaveBeenCalledWith('success');

    await hapticFeedback.warning();
    expect(Haptics.notificationAsync).toHaveBeenCalledWith('warning');

    await hapticFeedback.error();
    expect(Haptics.notificationAsync).toHaveBeenCalledWith('error');
  });

  it('suppresses feedback when user disabled haptics in profile', async () => {
    useProfileStore.setState({
      profile: {
        ...useProfileStore.getState().profile,
        hapticsEnabled: false,
      },
    });

    await hapticFeedback.selection();
    await hapticFeedback.impact('medium');
    await hapticFeedback.success();

    expect(Haptics.selectionAsync).not.toHaveBeenCalled();
    expect(Haptics.impactAsync).not.toHaveBeenCalled();
    expect(Haptics.notificationAsync).not.toHaveBeenCalled();
  });

  it('suppresses feedback on web platform', async () => {
    (Platform as { OS: string }).OS = 'web';

    await hapticFeedback.selection();
    await hapticFeedback.impact('light');

    expect(Haptics.selectionAsync).not.toHaveBeenCalled();
    expect(Haptics.impactAsync).not.toHaveBeenCalled();
  });

  it('catches and suppresses any native haptic exceptions gracefully', async () => {
    (Haptics.selectionAsync as jest.Mock).mockRejectedValueOnce(new Error('Hardware unsupported'));

    await expect(hapticFeedback.selection()).resolves.toBeUndefined();
  });
});
