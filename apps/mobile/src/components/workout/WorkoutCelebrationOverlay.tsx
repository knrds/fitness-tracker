import React, { useEffect, useMemo } from 'react';
import { Animated, Platform, StyleSheet, View, ViewStyle, Text, useWindowDimensions, Easing } from 'react-native';
import { useReducedMotion } from 'react-native-reanimated';
import { useTheme } from '@fitness-tracker/ui';
import { CelebrationEffect, useProfileStore } from '../../stores/profileStore';


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
  startY: number;
  endY: number;
  endX: number;
}

export interface WorkoutCelebrationOverlayProps {
  effect?: CelebrationEffect;
  style?: ViewStyle;
}

export function WorkoutCelebrationOverlay({ effect: propEffect, style }: WorkoutCelebrationOverlayProps) {
  const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = useWindowDimensions();
  const theme = useTheme();
  const reducedMotion = useReducedMotion();
  const profileEffect = useProfileStore((s) => s.profile.celebrationEffect ?? 'classic');
  const effect = propEffect ?? profileEffect;

  const getColors = (effectType: CelebrationEffect) => {
    switch (effectType) {
      case 'aurora':
        return ['#5EEAD4', '#A78BFA', '#F9A8D4'];
      case 'fireworks':
        return ['#FCD34D', '#FB7185', '#38BDF8'];
      case 'neon':
        return ['#00F0FF', '#FF007F', '#39FF14', '#CCFF00', '#A855F7'];
      case 'inferno':
        return ['#FF3B30', '#FF9500', '#FFCC00', '#FF2D55', '#FF4500'];
      case 'gold':
        return ['#FFD700', '#F59E0B', '#FBBF24', '#D97706', '#FEF3C7'];
      case 'matrix':
        return ['#00FF66', '#00F0FF', '#10B981', '#34D399', '#A7F3D0'];
      case 'cosmic':
        return ['#C084FC', '#38BDF8', '#F43F5E', '#818CF8', '#FFFFFF', '#F472B6'];
      case 'classic':
      default:
        return [theme.colors.primary, '#38BDF8', '#FFB84D', '#57DFAB', '#FF6686'];
    }
  };

  const colors = getColors(effect);

  const particles = useMemo<Particle[]>(() =>
    Array.from({ length: effect === 'fireworks' ? 36 : 24 }).map((_, i) => {
      const isNeon = effect === 'neon';
      const isInferno = effect === 'inferno';
      const isGold = effect === 'gold';
      const isMatrix = effect === 'matrix';
      const isCosmic = effect === 'cosmic';
      const isAurora = effect === 'aurora';
      const isFireworks = effect === 'fireworks';
      const angle = (i / 36) * Math.PI * 2;
      const radius = Math.min(SCREEN_WIDTH, SCREEN_HEIGHT) * (0.25 + Math.random() * 0.25);

      const size = isNeon
        ? Math.random() * 3 + 3
        : isMatrix
        ? 12
        : isInferno
        ? Math.random() * 6 + 5
        : isGold
        ? Math.random() * 8 + 7
        : isCosmic
        ? Math.random() * 10 + 6
        : Math.random() * 8 + 6;
      const heightRatio = isAurora ? 9 : isNeon
        ? Math.random() * 4 + 3
        : isMatrix
        ? 3.5
        : isInferno
        ? Math.random() * 1.6 + 1
        : isCosmic && i % 2 === 0
        ? 1.4
        : 1;
      const borderRadius = isNeon || isMatrix
        ? 2
        : isInferno || isGold
        ? size / 2
        : isCosmic
        ? (i % 2 === 0 ? 1 : size / 2)
        : (i % 2 === 0 ? 2 : size / 2);

      return {
        id: i,
        x: isFireworks ? SCREEN_WIDTH / 2 : Math.random() * SCREEN_WIDTH,
        size,
        heightRatio,
        borderRadius,
        color: colors[Math.floor(Math.random() * colors.length)] || theme.colors.primary,
        delay: Math.random() * 180,
        duration: isNeon ? 1100 : isMatrix ? 1600 : isGold ? 2100 : 1800,
        startY: isFireworks ? SCREEN_HEIGHT * 0.4 : isInferno ? SCREEN_HEIGHT : -50,
        endY: isFireworks ? SCREEN_HEIGHT * 0.4 + Math.sin(angle) * radius : isInferno ? SCREEN_HEIGHT * 0.1 : SCREEN_HEIGHT + 50,
        endX: isFireworks ? Math.cos(angle) * radius : isAurora ? (i % 2 ? -1 : 1) * SCREEN_WIDTH * 0.6 : isNeon ? -SCREEN_WIDTH * 0.45 : isMatrix ? 0 : (Math.random() - 0.5) * 150,
        animY: new Animated.Value(-25),
        animX: new Animated.Value(0),
        animRotate: new Animated.Value(0),
        animScale: new Animated.Value(1),
      };
    }), [effect, SCREEN_WIDTH, SCREEN_HEIGHT, theme.colors.primary]);

  useEffect(() => {
    if (reducedMotion) return;

    const anims = particles.map((p) => {
      p.animY.setValue(p.startY);
      p.animX.setValue(0);
      p.animRotate.setValue(0);

      const anim = Animated.sequence([
        Animated.delay(p.delay),
        Animated.parallel([
          Animated.timing(p.animY, {
            toValue: p.endY,
            easing: effect === 'fireworks' ? Easing.out(Easing.cubic) : Easing.linear,
            duration: p.duration,
            useNativeDriver: Platform.OS !== 'web',
          }),
          Animated.timing(p.animX, {
            toValue: p.endX,
            duration: p.duration,
            useNativeDriver: Platform.OS !== 'web',
          }),
          Animated.timing(p.animRotate, {
            toValue: effect === 'matrix' ? 0 : effect === 'neon' ? -30 : Math.random() * 720,
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
    <View testID={`celebration-${effect}`} style={[StyleSheet.absoluteFill, { overflow: 'hidden' }, style]} pointerEvents="none">
      {particles.map((p) => (
        <Animated.View
          key={`${effect}-${p.id}`}
          testID={`celebration-particle-${p.id}`}
          style={[
            styles.particle,
            {
              left: p.x,
              width: p.size,
              height: p.size * p.heightRatio,
              borderRadius: p.borderRadius,
              backgroundColor: effect === 'matrix' || effect === 'cosmic' ? 'transparent' : p.color,
              shadowColor: p.color,
              shadowOpacity:
                effect === 'neon' || effect === 'cosmic' || effect === 'inferno' || effect === 'matrix'
                  ? 0.85
                  : 0.3,
              shadowRadius:
                effect === 'neon' || effect === 'matrix'
                  ? 6
                  : effect === 'inferno'
                  ? 8
                  : 3,
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
        >
          {(effect === 'matrix' || effect === 'cosmic') && <Text style={{ color: p.color, fontSize: effect === 'matrix' ? 12 : p.size, lineHeight: effect === 'matrix' ? 13 : p.size, fontWeight: '700' }}>
            {effect === 'matrix' ? (p.id % 2 ? '1\n0\n1' : '0\n1\n0') : '✦'}
          </Text>}
        </Animated.View>
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
