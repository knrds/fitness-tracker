import React from 'react';
import {
  StyleSheet,
  Pressable,
  PressableProps,
  Text,
  ActivityIndicator,
  Platform,
  StyleProp,
  TextStyle,
} from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  Easing,
  useReducedMotion,
} from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import { useTheme } from '../ThemeProvider';

export interface ButtonProps extends PressableProps {
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger';
  title: string;
  isLoading?: boolean;
  textStyle?: StyleProp<TextStyle>;
}

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

export const Button: React.FC<ButtonProps> = ({
  variant = 'primary',
  title,
  isLoading = false,
  disabled,
  onPress,
  style,
  textStyle,
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
    if (!disabled && !isLoading) {
      scale.value = withTiming(reducedMotion ? 1 : 0.98, {
        duration: theme.motion.fast,
        easing: Easing.out(Easing.quad),
      });
    }
  };

  const handlePressOut = () => {
    if (!disabled && !isLoading) {
      scale.value = withTiming(1, {
        duration: reducedMotion ? 0 : theme.motion.fast,
        easing: Easing.out(Easing.quad),
      });
    }
  };

  const handlePress = (e: import('react-native').GestureResponderEvent) => {
    if (!disabled && !isLoading && onPress) {
      if (Platform.OS !== 'web') {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
      }
      onPress(e);
    }
  };

  let backgroundColor = 'transparent';
  let borderColor = 'transparent';
  let textColor = theme.colors.text;

  switch (variant) {
    case 'primary':
      backgroundColor = theme.colors.primary;
      textColor = theme.colors.background;
      break;
    case 'secondary':
      backgroundColor = theme.colors.surface;
      borderColor = theme.colors.border;
      break;
    case 'danger':
      backgroundColor = theme.colors.accent;
      textColor = theme.colors.onError;
      break;
    case 'ghost':
      // Text color stays theme.colors.text
      break;
  }

  const isDisabled = disabled || isLoading;

  const buttonStyle = [
    styles.button,
    {
      backgroundColor,
      borderColor,
      borderWidth: variant === 'secondary' ? 1 : 0,
      borderRadius: theme.radius.md,
      opacity: isDisabled ? 0.5 : 1,
    },
    style,
  ];

  return (
    <AnimatedPressable
      accessibilityRole="button"
      accessibilityState={{ disabled: isDisabled, busy: isLoading }}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      onPress={handlePress}
      disabled={isDisabled}
      style={[buttonStyle, animatedStyle]}
      {...props}
    >
      {isLoading ? (
        <ActivityIndicator color={textColor} />
      ) : (
        <Text style={[styles.text, { color: textColor, ...theme.typography.button }, textStyle]}>
          {title}
        </Text>
      )}
    </AnimatedPressable>
  );
};

const styles = StyleSheet.create({
  button: {
    minHeight: 48,
    paddingVertical: 12,
    paddingHorizontal: 20,
    justifyContent: 'center',
    alignItems: 'center',
    flexDirection: 'row',
  },
  text: {
    textAlign: 'center',
    textAlignVertical: 'center',
    includeFontPadding: false,
  },
});
