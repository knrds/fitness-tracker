import React from 'react';
import { fireEvent, render } from '@testing-library/react-native';
import { StyleSheet } from 'react-native';
import { ThemeProvider } from '@fitness-tracker/ui';
import { WorkoutCelebrationOverlay } from '../workout/WorkoutCelebrationOverlay';
import type { CelebrationEffect } from '../../stores/profileStore';

it('rebuilds particles immediately when switching effects before a burst finishes', () => {
  const view = (effect: CelebrationEffect) => (
    <ThemeProvider>
      <WorkoutCelebrationOverlay effect={effect} />
    </ThemeProvider>
  );
  const screen = render(view('inferno'));
  fireEvent(screen.getByTestId('celebration-inferno', { includeHiddenElements: true }), 'layout', {
    nativeEvent: { layout: { x: 0, y: 0, width: 320, height: 568 } },
  });
  const color = () =>
    StyleSheet.flatten(
      screen.getByTestId('celebration-particle-0', { includeHiddenElements: true }).props.style,
    ).backgroundColor;
  expect(['#FF3B30', '#FF9500', '#FFCC00', '#FF2D55', '#FF4500']).toContain(color());
  screen.rerender(view('neon'));
  expect(screen.queryByTestId('celebration-inferno', { includeHiddenElements: true })).toBeNull();
  expect(['#00F0FF', '#FF007F', '#39FF14', '#CCFF00', '#A855F7']).toContain(color());
  screen.rerender(view('fireworks'));
  expect(
    screen.getAllByTestId(/celebration-particle-/, { includeHiddenElements: true }),
  ).toHaveLength(36);
  screen.rerender(view('matrix'));
  expect(color()).toBe('transparent');
  expect(screen.getAllByText('0\n1\n0', { includeHiddenElements: true }).length).toBeGreaterThan(0);
  screen.unmount();
});
