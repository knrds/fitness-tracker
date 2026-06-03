import React from 'react';
import { StyleSheet, Pressable, PressableProps, Text, ActivityIndicator, Platform } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  Easing,
} from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import { useTheme } from '../ThemeProvider';

export interface ButtonProps extends PressableProps {
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger';
  title: string;
  isLoading?: boolean;
}

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

export const Button: React.FC<ButtonProps> = ({
  variant = 'primary',
  title,
  isLoading = false,
  disabled,
  onPress,
  style,
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
    if (!disabled && !isLoading) {
      scale.value = withTiming(0.96, { duration: 100, easing: Easing.out(Easing.quad) });
    }
  };

  const handlePressOut = () => {
    if (!disabled && !isLoading) {
      scale.value = withTiming(1, { duration: 150, easing: Easing.out(Easing.quad) });
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
      textColor = '#FFFFFF';
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
        <Text style={[styles.text, { color: textColor, ...theme.typography.button }]}>
          {title}
        </Text>
      )}
    </AnimatedPressable>
  );
};

const styles = StyleSheet.create({
  button: {
    height: 56,
    paddingHorizontal: 24,
    justifyContent: 'center',
    alignItems: 'center',
    flexDirection: 'row',
  },
  text: {
    textAlign: 'center',
  },
});
