import React from 'react';
import { View, ViewProps, StyleSheet, Pressable, Platform } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  Easing,
  useReducedMotion,
} from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import { useTheme } from '../ThemeProvider';
import { PremiumSurface, PremiumMaterialVariation } from './PremiumVisuals';

export interface CardProps extends ViewProps {
  onPress?: () => void;
  padding?: 'none' | 'sm' | 'md' | 'lg';
  variant?: 'default' | 'highlight';
  materialVariation?: PremiumMaterialVariation;
}

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

export const Card: React.FC<CardProps> = ({
  children,
  onPress,
  style,
  padding = 'lg',
  variant = 'default',
  materialVariation = 'quiet',
  ...props
}) => {
  const theme = useTheme();
  const reducedMotion = useReducedMotion();
  const scale = useSharedValue(1);

  const animatedStyle = useAnimatedStyle(() => {
    return {
      transform: [{ scale: scale.value }],
    };
  });

  const handlePressIn = () => {
    if (onPress) {
      scale.value = withTiming(reducedMotion ? 1 : 0.99, {
        duration: theme.motion.fast,
        easing: Easing.out(Easing.quad),
      });
    }
  };

  const handlePressOut = () => {
    if (onPress) {
      scale.value = withTiming(1, {
        duration: reducedMotion ? 0 : theme.motion.fast,
        easing: Easing.out(Easing.quad),
      });
    }
  };

  const handlePress = () => {
    if (onPress) {
      if (Platform.OS !== 'web') {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
      }
      onPress();
    }
  };

  const paddingValue =
    padding === 'none'
      ? 0
      : padding === 'sm'
        ? theme.spacing.sm
        : padding === 'md'
          ? theme.spacing.md
          : theme.spacing.lg;

  const borderColor = variant === 'highlight' ? theme.colors.primary : theme.colors.border;

  const cardStyle = [
    styles.card,
    {
      backgroundColor: theme.colors.surface,
      borderColor: borderColor,
      borderRadius: theme.radius.lg,
      padding: paddingValue,
      ...(theme.premium
        ? {
            shadowColor: theme.premium.shadow,
            shadowOffset: { width: 0, height: 4 },
            shadowOpacity: theme.isDark ? 0.12 : 0.1,
            shadowRadius: 12,
            elevation: 2,
          }
        : {}),
    },
    style,
  ];

  if (onPress) {
    return (
      <AnimatedPressable
        accessibilityRole="button"
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        onPress={handlePress}
        style={[cardStyle, animatedStyle]}
        {...props}
      >
        {theme.premium && (
          <PremiumSurface
            colors={theme.premium.surfaceGradient}
            radius={theme.radius.lg}
            material={theme.premium}
            variation={materialVariation}
          />
        )}
        {children}
      </AnimatedPressable>
    );
  }

  return (
    <View style={cardStyle} {...props}>
      {theme.premium && (
        <PremiumSurface
          colors={theme.premium.surfaceGradient}
          radius={theme.radius.lg}
          material={theme.premium}
          variation={materialVariation}
        />
      )}
      {children}
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    borderWidth: 1,
    overflow: 'hidden',
  },
});
