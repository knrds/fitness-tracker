import React from 'react';
import { View, ViewProps, StyleSheet, Pressable, Platform } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  Easing,
} from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import { useTheme } from '../ThemeProvider';

export interface CardProps extends ViewProps {
  onPress?: () => void;
  padding?: 'none' | 'sm' | 'md' | 'lg';
  variant?: 'default' | 'highlight';
}

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

export const Card: React.FC<CardProps> = ({
  children,
  onPress,
  style,
  padding = 'lg',
  variant = 'default',
  ...props
}) => {
  const theme = useTheme();
  const scale = useSharedValue(1);

  const animatedStyle = useAnimatedStyle(() => {
    return {
      transform: [{ scale: scale.value }],
    };
  });

  const handlePressIn = () => {
    if (onPress) {
      scale.value = withTiming(0.96, { duration: 100, easing: Easing.out(Easing.quad) });
    }
  };

  const handlePressOut = () => {
    if (onPress) {
      scale.value = withTiming(1, { duration: 150, easing: Easing.out(Easing.quad) });
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
    },
    style,
  ];

  if (onPress) {
    return (
      <AnimatedPressable
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        onPress={handlePress}
        style={[cardStyle, animatedStyle]}
        {...props}
      >
        {children}
      </AnimatedPressable>
    );
  }

  return (
    <View style={cardStyle} {...props}>
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
