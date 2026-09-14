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
    expect(getByText('Amber Forge')).toBeTruthy();
    expect(getByText('Arctic Lab (Light)')).toBeTruthy();
    expect(getByText('Solar Dune (Light)')).toBeTruthy();
    expect(getByText('Alpine Mist (Light)')).toBeTruthy();

    // Celebration names
    expect(getByText('Klassisches Konfetti')).toBeTruthy();
    expect(getByText('Cyber Neon Rain')).toBeTruthy();
  });

  it('allows selecting an unlocked theme and celebration effect', () => {
    const { getByText } = render(
      <ThemeProvider>
        <AppearanceSettings />
      </ThemeProvider>,
    );

    // Amber is unlocked at Level 1
    const amberTheme = getByText('Amber Forge');
    fireEvent.press(amberTheme);
    expect(useProfileStore.getState().profile.colorway).toBe('amber');

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

    // Solar Dune requires Level 16 - now unlocked!
    const solarTheme = getByText('Solar Dune (Light)');
    fireEvent.press(solarTheme);
    expect(useProfileStore.getState().profile.colorway).toBe('solar');

    // Cyber Neon requires Level 11 - now unlocked!
    const neonCelebration = getByText('Cyber Neon Rain');
    fireEvent.press(neonCelebration);
    expect(useProfileStore.getState().profile.celebrationEffect).toBe('neon');
  });
});
