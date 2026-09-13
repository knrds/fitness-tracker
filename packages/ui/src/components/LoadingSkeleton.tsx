import React, { useEffect } from 'react';
import { StyleSheet, ViewStyle } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withSequence,
  withTiming,
  Easing,
  useReducedMotion,
  cancelAnimation,
} from 'react-native-reanimated';
import { useTheme } from '../ThemeProvider';

export interface LoadingSkeletonProps {
  style?: ViewStyle;
}

export const LoadingSkeleton: React.FC<LoadingSkeletonProps> = ({ style }) => {
  const theme = useTheme();
  const reducedMotion = useReducedMotion();
  const opacity = useSharedValue(0.5);

  useEffect(() => {
    if (reducedMotion) {
      opacity.value = 0.65;
      return;
    }
    opacity.value = withRepeat(
      withSequence(
        withTiming(1, { duration: 1000, easing: Easing.inOut(Easing.ease) }),
        withTiming(0.5, { duration: 1000, easing: Easing.inOut(Easing.ease) }),
      ),
      -1,
      true,
    );
    return () => cancelAnimation(opacity);
  }, [opacity, reducedMotion]);

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
  }));

  return (
    <Animated.View
      style={[
        styles.skeleton,
        {
          backgroundColor: theme.colors.surface,
          borderRadius: theme.radius.md,
        },
        style,
        animatedStyle,
      ]}
    />
  );
};

const styles = StyleSheet.create({
  skeleton: {
    height: 24,
    width: '100%',
  },
});
