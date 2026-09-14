import React from 'react';
import { fireEvent, render } from '@testing-library/react-native';
import { ThemeProvider } from '@fitness-tracker/ui';
import { AppearanceSettings } from '../AppearanceSettings';
import { useProfileStore } from '../../stores/profileStore';
import { useAchievementStore } from '../../stores/achievementStore';

jest.mock('@expo/vector-icons', () => ({
  Ionicons: () => null,
}));

jest.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: () => ({ top: 44, bottom: 34, left: 0, right: 0 }),
}));

jest.mock('expo-haptics', () => ({
  impactAsync: jest.fn(),
  notificationAsync: jest.fn(),
  selectionAsync: jest.fn(),
  ImpactFeedbackStyle: { Light: 'light' },
  NotificationFeedbackType: { Success: 'success', Warning: 'warning' },
}));

describe('AppearanceSettings', () => {
  beforeEach(() => {
    useProfileStore.setState({
      profile: {
        displayName: 'User',
        preferredUnits: 'metric',
        colorway: 'glacier',
        celebrationEffect: 'classic',
      },
    });
    useAchievementStore.setState({ level: 1, xp: 100 });
  });

  it('renders theme categories and celebration effects', () => {
    const { getByText } = render(
      <ThemeProvider>
        <AppearanceSettings />
      </ThemeProvider>,
    );

    // Section headers
    expect(getByText('THEMES & FARBWELTEN')).toBeTruthy();
    expect(getByText('LIGHT MODES (HELLE THEMES)')).toBeTruthy();
    expect(getByText('DARK MODES (DUNKLE THEMES)')).toBeTruthy();
    expect(getByText('WORKOUT-FEIER EFFEKTE (CELEBRATIONS)')).toBeTruthy();

    // Colorway names
    expect(getByText('Glacier Core')).toBeTruthy();
    expect(getByText('Crimson Neon')).toBeTruthy();
    expect(getByText('Arctic Lab (Light)')).toBeTruthy();
    expect(getByText('Solar Dune (Light)')).toBeTruthy();
    expect(getByText('Porcelain Rose (Light)')).toBeTruthy();
    expect(getByText('Alpine Mist (Light)')).toBeTruthy();

    // Celebration names
    expect(getByText('Klassisches Konfetti')).toBeTruthy();
    expect(getByText('Cyber Neon Rain')).toBeTruthy();
  });

  it('allows selecting an unlocked Light Mode and celebration effect from Level 1', () => {
    const { getByText } = render(
      <ThemeProvider>
        <AppearanceSettings />
      </ThemeProvider>,
    );

    // Arctic Lab is available from Level 1!
    const arcticTheme = getByText('Arctic Lab (Light)');
    fireEvent.press(arcticTheme);
    expect(useProfileStore.getState().profile.colorway).toBe('arctic');

    // Classic is unlocked at Level 1
    const classicCelebration = getByText('Klassisches Konfetti');
    fireEvent.press(classicCelebration);
    expect(useProfileStore.getState().profile.celebrationEffect).toBe('classic');
  });

  it('unlocks higher tier colorways and celebration effects when user levels up', () => {
    useAchievementStore.setState({ level: 20, xp: 9500 });

    const { getByText } = render(
      <ThemeProvider>
        <AppearanceSettings />
      </ThemeProvider>,
    );

    // Crimson Neon requires Level 11 - now unlocked!
    const crimsonTheme = getByText('Crimson Neon');
    fireEvent.press(crimsonTheme);
    expect(useProfileStore.getState().profile.colorway).toBe('crimson');

    // Porcelain Rose requires Level 16 - now unlocked!
    const roseTheme = getByText('Porcelain Rose (Light)');
    fireEvent.press(roseTheme);
    expect(useProfileStore.getState().profile.colorway).toBe('rose');

    // Cyber Neon requires Level 11 - now unlocked!
    const neonCelebration = getByText('Cyber Neon Rain');
    fireEvent.press(neonCelebration);
    expect(useProfileStore.getState().profile.celebrationEffect).toBe('neon');
  });
});
