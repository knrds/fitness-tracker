import React, { useEffect } from 'react';
import { create } from 'zustand';
import { View, StyleSheet } from 'react-native';
import type { CelebrationEffect } from '../../stores/profileStore';
import { WorkoutCelebrationOverlay } from './WorkoutCelebrationOverlay';

const preview = create<{ effect: CelebrationEffect | null; sequence: number }>(() => ({
  effect: null,
  sequence: 0,
}));
/** Render at the app root: independent of scroll position and never intercepting taps. */
export function CelebrationPreviewHost() {
  const { effect, sequence } = preview();
  return effect ? (
    <View
      testID="celebration-viewport"
      pointerEvents="none"
      style={[StyleSheet.absoluteFillObject, { zIndex: 10000 }]}
    >
      <WorkoutCelebrationOverlay key={sequence} effect={effect} />
    </View>
  ) : null;
}
export function CelebrationPreview({ effect }: { effect: CelebrationEffect }) {
  useEffect(() => {
    const sequence = preview.getState().sequence + 1;
    preview.setState({ effect, sequence });
    return () => {
      // An older source must not cancel a newer preview, even for the same effect.
      if (preview.getState().sequence === sequence) preview.setState({ effect: null });
    };
  }, [effect]);
  return null;
}
