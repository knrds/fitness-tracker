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
    expect(getByText('EVARO SEASON 1: ASCEND')).toBeTruthy();

    // Current status
    expect(getByText('LEVEL 4')).toBeTruthy();
    expect(getByText('RANG 1')).toBeTruthy();

    // Ranks rendered in the roadmap (and current rank header)
    expect(getAllByText('Novice Lifter').length).toBeGreaterThanOrEqual(1);
    expect(getAllByText('Building Strength').length).toBeGreaterThanOrEqual(1);
    expect(getAllByText('EVARO Master').length).toBeGreaterThanOrEqual(1);

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

    // Tap Level 11 which unlocks Crimson Neon & Gold Medaillon
    const lvl11Pill = getByLabelText('Level 11 Details anzeigen');
    fireEvent.press(lvl11Pill);

    // Inspection modal opens
    expect(getByText('BELOHNUNGEN AUF LEVEL 11')).toBeTruthy();
    expect(getByText('Crimson Neon')).toBeTruthy();
    expect(getByText('Gold Medaillon')).toBeTruthy();

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
    // Total XP for L4 is 1770, user has 600 -> 1170 XP missing (formatted as 1.170 in DE locale)
    expect(getByText('Noch 1.170 XP benötigt')).toBeTruthy();

    // Close inspection modal
    const doneBtn = getByLabelText('Detailansicht schließen');
    fireEvent.press(doneBtn);
  });

  it('allows tapping mid-levels to view celebration rewards (L8 Inferno, L13 Cyber Neon)', () => {
    const { getByLabelText, getByText } = render(
      <ThemeProvider>
        <BattlePassModal visible={true} onClose={jest.fn()} level={10} xp={4800} />
      </ThemeProvider>,
    );

    // Tap mid-level 8 which unlocks Inferno Ember Storm
    const lvl8Pill = getByLabelText('Level 8 Details anzeigen');
    fireEvent.press(lvl8Pill);

    expect(getByText('BELOHNUNGEN AUF LEVEL 8')).toBeTruthy();
    expect(getByText('Inferno Ember Storm')).toBeTruthy();

    const doneBtn = getByLabelText('Detailansicht schließen');
    fireEvent.press(doneBtn);

    // Tap mid-level 13 which unlocks Cyber Neon Rain
    const lvl13Pill = getByLabelText('Level 13 Details anzeigen');
    fireEvent.press(lvl13Pill);

    expect(getByText('BELOHNUNGEN AUF LEVEL 13')).toBeTruthy();
    expect(getByText('Cyber Neon Rain')).toBeTruthy();

    fireEvent.press(getByLabelText('Detailansicht schließen'));
  });
});
