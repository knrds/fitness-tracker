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

  it('allows tapping a level with rewards to view miniature reward details', () => {
    const { getByLabelText, getByText } = render(
      <ThemeProvider>
        <BattlePassModal visible={true} onClose={jest.fn()} level={4} xp={1850} />
      </ThemeProvider>,
    );

    // Tap Level 11 which unlocks Crimson Neon & Cyber Neon Rain
    const lvl11Pill = getByLabelText('Level 11 Details anzeigen');
    fireEvent.press(lvl11Pill);

    // Inspection modal opens
    expect(getByText('BELOHNUNGEN AUF LEVEL 11')).toBeTruthy();
    expect(getByText('Crimson Neon')).toBeTruthy();
    expect(getByText('Cyber Neon Rain')).toBeTruthy();

    // Close inspection modal
    const doneBtn = getByLabelText('Detailansicht schließen');
    fireEvent.press(doneBtn);
  });

  it('allows tapping a level without rewards to view missing XP and milestone info', () => {
    const { getByLabelText, getByText } = render(
      <ThemeProvider>
        <BattlePassModal visible={true} onClose={jest.fn()} level={2} xp={600} />
      </ThemeProvider>,
    );

    // Tap Level 4 (no cosmetic reward)
    const lvl4Pill = getByLabelText('Level 4 Details anzeigen');
    fireEvent.press(lvl4Pill);

    // Inspection shows milestone progress and missing XP
    expect(getByText('Meilenstein-Aufstieg')).toBeTruthy();
    // Total XP for L4 is 1500, user has 600 -> 900 XP missing
    expect(getByText('Noch 900 XP benötigt')).toBeTruthy();

    // Close inspection modal
    const doneBtn = getByLabelText('Detailansicht schließen');
    fireEvent.press(doneBtn);
  });
});
