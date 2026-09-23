import React from 'react';
import { fireEvent, render } from '@testing-library/react-native';
import { ThemeProvider } from '@fitness-tracker/ui';
import { LevelProgress } from '../LevelProgress';

jest.mock('@expo/vector-icons', () => ({
  Ionicons: () => null,
}));

jest.mock('expo-haptics', () => ({
  impactAsync: jest.fn(),
  notificationAsync: jest.fn(),
  selectionAsync: jest.fn(),
  ImpactFeedbackStyle: { Light: 'light' },
}));

describe('Level Interactions (Tasks 2 & 3)', () => {
  it('renders LevelProgress with button role and accessibility label when onPress is provided', () => {
    const handlePress = jest.fn();
    const { getByRole, getByLabelText } = render(
      <ThemeProvider>
        <LevelProgress level={5} xp={2400} onPress={handlePress} />
      </ThemeProvider>,
    );

    const button = getByRole('button');
    expect(button).toBeTruthy();
    expect(getByLabelText(/Level 5.*Level-Pass/i)).toBeTruthy();

    fireEvent.press(button);
    expect(handlePress).toHaveBeenCalledTimes(1);
  });

  it('renders compact LevelProgress with accessibility role button and triggers onPress', () => {
    const handlePress = jest.fn();
    const { getByRole, getByLabelText } = render(
      <ThemeProvider>
        <LevelProgress level={3} xp={1100} compact onPress={handlePress} />
      </ThemeProvider>,
    );

    const button = getByRole('button');
    expect(button).toBeTruthy();
    expect(getByLabelText(/Level 3.*Level-Pass/i)).toBeTruthy();

    fireEvent.press(button);
    expect(handlePress).toHaveBeenCalledTimes(1);
  });

  it('does not assign button accessibility role when onPress is not provided', () => {
    const { queryByRole } = render(
      <ThemeProvider>
        <LevelProgress level={2} xp={500} />
      </ThemeProvider>,
    );

    expect(queryByRole('button')).toBeNull();
  });
});
