import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { StyleSheet } from 'react-native';
import { ThemeProvider, SegmentedControl, createTheme } from '@fitness-tracker/ui';
import { AppearanceSettings } from '../AppearanceSettings';

jest.mock('../BattlePassModal', () => ({ BattlePassModal: () => null }));
jest.mock('../workout/CelebrationPreview', () => ({ CelebrationPreview: () => null }));
jest.mock('@expo/vector-icons', () => ({ Ionicons: 'Icon' }));

it.each([280, 360, 680, 980])(
  'keeps equal theme columns and stable title slots at %i px',
  (width) => {
    const screen = render(
      <ThemeProvider>
        <AppearanceSettings />
      </ThemeProvider>,
    );
    fireEvent(screen.getByTestId('theme-grid'), 'layout', {
      nativeEvent: { layout: { width, height: 500 } },
    });
    const cards = ['Ember Glow', 'Gotham Signal', 'Ultraviolet', 'Bordeaux Noir'].map((name) =>
      screen.getByRole('radio', { name: `${name} colorway` }),
    );
    const first = StyleSheet.flatten(cards[0]!.props.style);
    for (const card of cards) {
      const style = StyleSheet.flatten(card.props.style);
      expect(style.width).toBe(first.width);
      expect(style.width).toBeLessThanOrEqual(width);
      expect(style.flexGrow).toBe(0);
    }
    expect(StyleSheet.flatten(screen.getByTestId('theme-header-ember').props.style).minHeight).toBe(
      StyleSheet.flatten(screen.getByTestId('theme-header-gotham').props.style).minHeight,
    );
  },
);

it('uses the same rounded shape for keyboard focus and selected tab without changing the tab value', () => {
  const change = jest.fn();
  const theme = createTheme('ultraviolet');
  const screen = render(
    <ThemeProvider colorway="ultraviolet">
      <SegmentedControl
        label="Activity"
        value="history"
        onChange={change}
        options={[
          { value: 'history', label: 'History' },
          { value: 'progress', label: 'Progress' },
        ]}
      />
    </ThemeProvider>,
  );
  const tab = screen.getByRole('tab', { name: 'Progress' });
  fireEvent(tab, 'focus');
  expect(StyleSheet.flatten(tab.props.style).borderRadius).toBe(theme.premium!.buttonRadius);
  expect(StyleSheet.flatten(tab.props.style).borderColor).toBe(theme.colors.text);
  expect(StyleSheet.flatten(tab.props.style).outlineWidth).toBe(0);
  expect(change).not.toHaveBeenCalled();
  fireEvent.press(tab);
  expect(change).toHaveBeenCalledWith('progress');
  fireEvent(tab, 'blur');
  expect(StyleSheet.flatten(tab.props.style).borderColor).toBe('transparent');
});


it('offers six light and six dark palettes, matching premium thumbnails below them', () => {
  const screen = render(<ThemeProvider><AppearanceSettings /></ThemeProvider>);
  expect(screen.queryByRole('radio', { name: 'Verde Grove colorway' })).toBeNull();
  expect(screen.queryByRole('radio', { name: 'Soft Slate colorway' })).toBeNull();
  const thumbs = screen.getAllByTestId(/^theme-thumbnail-/);
  expect(thumbs).toHaveLength(18); // 2 defaults + 6 light + 6 dark + 4 premium
  expect(thumbs.slice(-4).map(node => node.props.testID)).toEqual([
    'theme-thumbnail-ultraviolet', 'theme-thumbnail-bordeaux', 'theme-thumbnail-mocha', 'theme-thumbnail-cherry',
  ]);
  thumbs.forEach(node => expect(StyleSheet.flatten(node.props.style).height).toBe(72));
});
