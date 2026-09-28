import React from 'react';
import { Animated, Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { fireEvent, render } from '@testing-library/react-native';
import * as Reanimated from 'react-native-reanimated';
import { ThemeProvider } from '@fitness-tracker/ui';
import { CelebrationModal } from '../CelebrationModal';
import { CelebrationPreview, CelebrationPreviewHost } from '../CelebrationPreview';
import { WorkoutCelebrationOverlay } from '../WorkoutCelebrationOverlay';
import type { CelebrationEffect } from '../../../stores/profileStore';

const decorative = { includeHiddenElements: true };
const mockAnimation = (): Animated.CompositeAnimation => ({
  start: jest.fn(),
  stop: jest.fn(),
  reset: jest.fn(),
});

beforeEach(() => {
  jest.spyOn(Animated, 'timing').mockImplementation(mockAnimation);
  jest.spyOn(Animated, 'sequence').mockImplementation(mockAnimation);
  jest.spyOn(Animated, 'parallel').mockImplementation(mockAnimation);
  jest.spyOn(Animated, 'delay').mockImplementation(mockAnimation);
});

afterEach(() => jest.restoreAllMocks());

function layout(element: Parameters<typeof fireEvent>[0], width = 320, height = 568) {
  fireEvent(element, 'layout', { nativeEvent: { layout: { x: 0, y: 0, width, height } } });
}

it('starts above modal content only after presentation, while the close control remains usable', () => {
  const onClose = jest.fn();
  const screen = render(
    <ThemeProvider>
      <CelebrationModal visible transparent onRequestClose={onClose}>
        <View testID="opaque-summary-card" style={{ flex: 1, backgroundColor: '#FFFFFF' }}>
          <Pressable onPress={onClose}>
            <Text>Close summary</Text>
          </Pressable>
        </View>
      </CelebrationModal>
    </ThemeProvider>,
  );
  expect(screen.queryByTestId('celebration-classic', decorative)).toBeNull();
  fireEvent(screen.UNSAFE_getByType(Modal), 'show');
  const overlay = screen.getByTestId('celebration-classic', decorative);
  layout(overlay);
  const frame = screen.getByTestId('celebration-modal-viewport');
  const order = frame.findAll((node: { props: { testID?: string } }) =>
    ['opaque-summary-card', 'celebration-classic'].includes(node.props.testID ?? ''),
  );
  expect(order[0]?.props.testID).toBe('opaque-summary-card');
  expect(order[order.length - 1]?.props.testID).toBe('celebration-classic');
  expect(overlay.props.pointerEvents).toBe('none');
  expect(StyleSheet.flatten(overlay.props.style).zIndex).toBeGreaterThan(0);
  expect(screen.getAllByTestId(/celebration-particle-/, decorative)).toHaveLength(24);
  fireEvent.press(screen.getByText('Close summary'));
  expect(onClose).toHaveBeenCalledTimes(1);
});

it.each<CelebrationEffect>([
  'classic',
  'gold',
  'aurora',
  'neon',
  'matrix',
  'cosmic',
  'inferno',
  'fireworks',
])('measures the actual phone viewport before animating %s', (effect) => {
  const screen = render(
    <ThemeProvider>
      <WorkoutCelebrationOverlay effect={effect} />
    </ThemeProvider>,
  );
  const overlay = screen.getByTestId(`celebration-${effect}`, decorative);
  expect(screen.queryAllByTestId(/celebration-particle-/, decorative)).toHaveLength(0);
  expect(Animated.timing).not.toHaveBeenCalled();
  layout(overlay);
  const particles = screen.getAllByTestId(/celebration-particle-/, decorative);
  for (const particle of particles) {
    const style = StyleSheet.flatten(particle.props.style);
    expect(style.left).toBeGreaterThanOrEqual(0);
    expect(style.left + style.width).toBeLessThanOrEqual(320);
  }
  const first = StyleSheet.flatten(particles[0]!.props.style);
  if (effect === 'fireworks') {
    expect(first.left + first.width / 2).toBeCloseTo(160);
    expect(first.transform[0].translateY).toBeCloseTo(568 * 0.4);
  }
  if (effect === 'inferno') expect(first.transform[0].translateY).toBe(568);
  expect(overlay.props.accessibilityElementsHidden).toBe(true);
  expect(overlay.props.importantForAccessibility).toBe('no-hide-descendants');
});

it('rebuilds the burst for the measured viewport after rotation', () => {
  const screen = render(
    <ThemeProvider>
      <WorkoutCelebrationOverlay effect="fireworks" />
    </ThemeProvider>,
  );
  const overlay = screen.getByTestId('celebration-fireworks', decorative);
  layout(overlay);
  layout(overlay, 568, 320);
  const first = StyleSheet.flatten(
    screen.getByTestId('celebration-particle-0', decorative).props.style,
  );
  expect(first.left + first.width / 2).toBeCloseTo(284);
  expect(first.transform[0].translateY).toBeCloseTo(128);
});

it('keeps Reduced Motion static and never starts particle animations', () => {
  jest.spyOn(Reanimated, 'useReducedMotion').mockReturnValue(true);
  const screen = render(
    <ThemeProvider colorway="bordeaux">
      <WorkoutCelebrationOverlay />
    </ThemeProvider>,
  );
  layout(screen.getByTestId('celebration-classic', decorative));
  expect(screen.getByTestId('premium-success-accent', decorative)).toBeTruthy();
  expect(screen.queryAllByTestId(/celebration-particle-/, decorative)).toHaveLength(0);
  expect(Animated.timing).not.toHaveBeenCalled();
});

it('replays the same preview and keeps a newer source active when the old source unmounts', () => {
  const view = (first: boolean, second: boolean) => (
    <ThemeProvider>
      <CelebrationPreviewHost />
      {first && <CelebrationPreview key="first" effect="classic" />}
      {second && <CelebrationPreview key="second" effect="classic" />}
    </ThemeProvider>
  );
  const screen = render(view(true, false));
  layout(screen.getByTestId('celebration-classic', decorative));
  expect(screen.getAllByTestId(/celebration-particle-/, decorative)).toHaveLength(24);
  screen.rerender(view(true, true));
  // A new measured overlay must be mounted even if the effect name is unchanged.
  expect(screen.queryAllByTestId(/celebration-particle-/, decorative)).toHaveLength(0);
  screen.rerender(view(false, true));
  expect(screen.getByTestId('celebration-classic', decorative)).toBeTruthy();
  layout(screen.getByTestId('celebration-classic', decorative));
  expect(screen.getAllByTestId(/celebration-particle-/, decorative)).toHaveLength(24);
  screen.rerender(view(false, false));
  expect(screen.queryByTestId('celebration-viewport')).toBeNull();
});
