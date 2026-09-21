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
    expect(getByText('Inferno Ember Storm')).toBeTruthy();
    expect(getByText('Quantum Matrix Stream')).toBeTruthy();
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

    // Inferno requires Level 8 - now unlocked at level 20!
    const infernoCelebration = getByText('Inferno Ember Storm');
    fireEvent.press(infernoCelebration);
    expect(useProfileStore.getState().profile.celebrationEffect).toBe('inferno');
  });

  it('allows beta testers to adjust level dynamically via stepper and milestone pills', () => {
    const { getByText } = render(
      <ThemeProvider>
        <AppearanceSettings />
      </ThemeProvider>,
    );

    // Initial state: Level 1
    expect(getByText('LEVEL & RANG SIMULATOR')).toBeTruthy();
    expect(getByText('LEVEL 1')).toBeTruthy();
    expect(getByText('Rang 1: Novice Lifter')).toBeTruthy();

    // Step +5
    const plusFiveBtn = getByText('+5');
    fireEvent.press(plusFiveBtn);
    expect(useAchievementStore.getState().level).toBe(6);
    expect(getByText('LEVEL 6')).toBeTruthy();
    expect(getByText('Rang 2: Building Strength')).toBeTruthy();

    // Quick Milestone jump to L13 (which unlocks Cyber Neon Rain)
    const l13Pill = getByText('L13 Neon ⚡');
    fireEvent.press(l13Pill);
    expect(useAchievementStore.getState().level).toBe(13);
    expect(getByText('LEVEL 13')).toBeTruthy();
    expect(getByText('Rang 3: Consistent Lifter')).toBeTruthy();
  });

  it('renders English headings, celebration effects, and descriptions when language is EN', () => {
    useProfileStore.setState({
      profile: {
        displayName: 'Athlete',
        language: 'en',
        preferredUnits: 'imperial',
        colorway: 'glacier',
        celebrationEffect: 'classic',
      },
    });

    const { getByText } = render(
      <ThemeProvider>
        <AppearanceSettings />
      </ThemeProvider>,
    );

    // English Section Headers
    expect(getByText('THEMES & COLORWAYS')).toBeTruthy();
    expect(getByText('LIGHT MODES')).toBeTruthy();
    expect(getByText('DARK MODES')).toBeTruthy();
    expect(getByText('WORKOUT CELEBRATION EFFECTS')).toBeTruthy();
    expect(
      getByText(
        'Choose the animation effect shown after completed workouts. Tap one to preview it.',
      ),
    ).toBeTruthy();

    // English celebration name
    expect(getByText('Classic Confetti')).toBeTruthy();
    expect(
      getByText('Colorful dynamic particles after every completed workout.'),
    ).toBeTruthy();
  });
});

