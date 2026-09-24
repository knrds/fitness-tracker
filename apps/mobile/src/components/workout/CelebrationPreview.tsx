import React, { useEffect } from 'react';
import { create } from 'zustand';
import { View, StyleSheet } from 'react-native';
import type { CelebrationEffect } from '../../stores/profileStore';
import { WorkoutCelebrationOverlay } from './WorkoutCelebrationOverlay';

const preview = create<{ effect: CelebrationEffect | null }>(() => ({ effect: null }));
/** Render at the app root: independent of scroll position and never intercepting taps. */
export function CelebrationPreviewHost() {
  const effect = preview(state => state.effect);
  return effect ? <View testID="celebration-viewport" pointerEvents="none" style={[StyleSheet.absoluteFillObject, { zIndex: 10000 }]}><WorkoutCelebrationOverlay key={effect} effect={effect} /></View> : null;
}
export function CelebrationPreview({ effect }: { effect: CelebrationEffect }) {
  useEffect(() => {
    preview.setState({ effect });
    return () => { preview.setState({ effect: null }); };
  }, [effect]);
  return null;
}
