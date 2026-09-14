import React, { useEffect, useRef } from 'react';
import { Animated, Dimensions, Platform, StyleSheet, View, ViewStyle } from 'react-native';
import { useReducedMotion } from 'react-native-reanimated';
import { useTheme } from '@fitness-tracker/ui';
import { CelebrationEffect, useProfileStore } from '../../stores/profileStore';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

interface Particle {
  id: number;
  x: number;
  size: number;
  heightRatio: number;
  borderRadius: number;
  color: string;
  delay: number;
  duration: number;
  animY: Animated.Value;
  animX: Animated.Value;
  animRotate: Animated.Value;
  animScale: Animated.Value;
}

export interface WorkoutCelebrationOverlayProps {
  effect?: CelebrationEffect;
  style?: ViewStyle;
}

export function WorkoutCelebrationOverlay({ effect: propEffect, style }: WorkoutCelebrationOverlayProps) {
  const theme = useTheme();
  const reducedMotion = useReducedMotion();
  const profileEffect = useProfileStore((s) => s.profile.celebrationEffect ?? 'classic');
  const effect = propEffect ?? profileEffect;

  const getColors = (effectType: CelebrationEffect) => {
    switch (effectType) {
      case 'neon':
        return ['#00F0FF', '#FF007F', '#39FF14', '#CCFF00', '#A855F7'];
      case 'gold':
        return ['#FFD700', '#F59E0B', '#FBBF24', '#D97706', '#FEF3C7'];
      case 'cosmic':
        return ['#C084FC', '#38BDF8', '#F43F5E', '#818CF8', '#FFFFFF', '#F472B6'];
      case 'classic':
      default:
        return [theme.colors.primary, '#38BDF8', '#FFB84D', '#57DFAB', '#FF6686'];
    }
  };

  const colors = getColors(effect);

  const particles = useRef<Particle[]>(
    Array.from({ length: effect === 'neon' ? 24 : 20 }).map((_, i) => {
      const isNeon = effect === 'neon';
      const isGold = effect === 'gold';
      const isCosmic = effect === 'cosmic';

      const size = isNeon ? Math.random() * 3 + 3 : isGold ? Math.random() * 8 + 7 : isCosmic ? Math.random() * 10 + 6 : Math.random() * 8 + 6;
      const heightRatio = isNeon ? Math.random() * 4 + 3 : isCosmic && i % 2 === 0 ? 1.4 : 1;
      const borderRadius = isNeon ? 2 : isGold ? size / 2 : isCosmic ? (i % 2 === 0 ? 1 : size / 2) : (i % 2 === 0 ? 2 : size / 2);

      return {
        id: i,
        x: Math.random() * SCREEN_WIDTH,
        size,
        heightRatio,
        borderRadius,
        color: colors[Math.floor(Math.random() * colors.length)] || theme.colors.primary,
        delay: Math.random() * 900,
        duration: isNeon ? Math.random() * 1000 + 1400 : Math.random() * 1400 + 1900,
        animY: new Animated.Value(-25),
        animX: new Animated.Value(0),
        animRotate: new Animated.Value(0),
        animScale: new Animated.Value(1),
      };
    }),
  ).current;

  useEffect(() => {
    if (reducedMotion) return;

    const anims = particles.map((p) => {
      p.animY.setValue(-25);
      p.animX.setValue(0);
      p.animRotate.setValue(0);

      const anim = Animated.sequence([
        Animated.delay(p.delay),
        Animated.parallel([
          Animated.timing(p.animY, {
            toValue: SCREEN_HEIGHT + 30,
            duration: p.duration,
            useNativeDriver: Platform.OS !== 'web',
          }),
          Animated.timing(p.animX, {
            toValue: (Math.random() - 0.5) * (effect === 'neon' ? 60 : 150),
            duration: p.duration,
            useNativeDriver: Platform.OS !== 'web',
          }),
          Animated.timing(p.animRotate, {
            toValue: Math.random() * (effect === 'neon' ? 90 : 720),
            duration: p.duration,
            useNativeDriver: Platform.OS !== 'web',
          }),
        ]),
      ]);
      anim.start();
      return anim;
    });

    return () => {
      anims.forEach((anim) => anim.stop());
    };
  }, [particles, effect, reducedMotion]);

  if (reducedMotion) return null;

  return (
    <View style={[StyleSheet.absoluteFill, style]} pointerEvents="none">
      {particles.map((p) => (
        <Animated.View
          key={p.id}
          style={[
            styles.particle,
            {
              left: p.x,
              width: p.size,
              height: p.size * p.heightRatio,
              borderRadius: p.borderRadius,
              backgroundColor: p.color,
              shadowColor: p.color,
              shadowOpacity: effect === 'neon' || effect === 'cosmic' ? 0.8 : 0.3,
              shadowRadius: effect === 'neon' ? 6 : 3,
              transform: [
                { translateY: p.animY },
                { translateX: p.animX },
                {
                  rotate: p.animRotate.interpolate({
                    inputRange: [0, 360],
                    outputRange: ['0deg', '360deg'],
                  }),
                },
              ],
            },
          ]}
        />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  particle: {
    position: 'absolute',
    top: 0,
  },
});
