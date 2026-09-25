import React from 'react';
import { render, act, fireEvent } from '@testing-library/react-native';
import { createTheme, colorways, migrateColorway } from '@fitness-tracker/ui';
import { CelebrationPreview, CelebrationPreviewHost } from '../workout/CelebrationPreview';
import { PaywallHost } from '../paywall/PaywallHost';
import { usePaywallStore } from '../../stores/paywallStore';

jest.mock('../workout/WorkoutCelebrationOverlay', () => ({ WorkoutCelebrationOverlay: () => null }));
jest.mock('../paywall/PaywallModal', () => {
  const { Pressable, Text } = jest.requireActual('react-native');
  return { PaywallModal: ({ visible, onClose }: { visible: boolean; onClose: () => void }) => visible
    ? <Pressable onPress={onClose}><Text>Visible paywall</Text></Pressable> : null };
});

it('uses the strongest theme token at the highest heat bucket in every colorway', () => {
  for (const option of colorways) {
    const theme = createTheme(option.id);
    expect(theme.anatomy.heat[3]).toBe(theme.colors.primary);
    expect(new Set(theme.anatomy.heat).size).toBe(4);
  }
});

it('hosts cosmetic previews outside the scrolled source and never intercepts touches', () => {
  const host = render(<CelebrationPreviewHost />);
  const trigger = render(<CelebrationPreview effect="classic" />);
  expect(host.getByTestId('celebration-viewport').props.pointerEvents).toBe('none');
  trigger.unmount();
  expect(host.queryByTestId('celebration-viewport')).toBeNull();
});

it('turns a store capability denial into a visible, dismissible paywall', () => {
  usePaywallStore.setState({ source: null });
  const screen = render(<PaywallHost />);
  expect(screen.queryByText('Visible paywall')).toBeNull();
  act(() => usePaywallStore.setState({ source: 'template_limit' }));
  fireEvent.press(screen.getByText('Visible paywall'));
  expect(usePaywallStore.getState().source).toBeNull();
  expect(screen.queryByText('Visible paywall')).toBeNull();
});

it('replaces retired Coach palettes without blocking existing saved preferences', () => {
  expect(colorways.map(c => c.name)).toEqual(expect.arrayContaining(['Mocha Cream', 'Ink & Cherry', 'Ultraviolet', 'Bordeaux Noir']));
  for (const retired of ['pearl', 'nocturne', 'prism', 'eclipse']) {
    expect(colorways.some(c => c.id === retired)).toBe(false);
    expect(createTheme(migrateColorway(retired))).toBeDefined();
  }
  expect(createTheme('mocha').colors.background).toBe('#F7F0E8');
  expect(createTheme('bordeaux').colors.onPrimary).toBe('#FFFFFF');
});
