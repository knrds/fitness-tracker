import React from 'react';
import { fireEvent, render } from '@testing-library/react-native';
import { ThemeProvider } from '@fitness-tracker/ui';
import { BattlePassModal } from '../BattlePassModal';

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
  NotificationFeedbackType: { Success: 'success' },
}));

describe('BattlePassModal', () => {
  it('renders correctly when visible and displays user level and ranks', () => {
    const handleClose = jest.fn();
    const { getByText, getAllByText, getByLabelText } = render(
      <ThemeProvider>
        <BattlePassModal visible={true} onClose={handleClose} level={4} xp={1850} />
      </ThemeProvider>,
    );

    // Title and tag
    expect(getByText('LEVEL-PASS')).toBeTruthy();
    expect(getByText('VOLT SEASON 1: ASCEND')).toBeTruthy();

    // Current status
    expect(getByText('LEVEL 4')).toBeTruthy();
    expect(getByText('RANG 1')).toBeTruthy();

    // Ranks rendered in the roadmap (and current rank header)
    expect(getAllByText('Novice Lifter').length).toBeGreaterThanOrEqual(1);
    expect(getAllByText('Building Strength').length).toBeGreaterThanOrEqual(1);
    expect(getAllByText('VOLT Master').length).toBeGreaterThanOrEqual(1);

    // Close button triggers onClose
    const closeBtn = getByLabelText('Schließen');
    fireEvent.press(closeBtn);
    expect(handleClose).toHaveBeenCalledTimes(1);
  });
});
