import React, { useEffect, useState } from 'react';
import { View } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  useReducedMotion,
  Easing,
  runOnJS,
} from 'react-native-reanimated';
import { useTheme } from '../ThemeProvider';

/** Measures real content so wrapping text and Dynamic Type never clip an open panel. */
export function AnimatedDisclosure({
  expanded,
  children,
}: {
  expanded: boolean;
  children: React.ReactNode;
}) {
  const theme = useTheme();
  const reduced = useReducedMotion();
  const [height, setHeight] = useState(0);
  const [mounted, setMounted] = useState(expanded);
  const progress = useSharedValue(expanded ? 1 : 0);
  useEffect(() => {
    if (expanded) setMounted(true);
    progress.value = withTiming(
      expanded ? 1 : 0,
      {
        duration: reduced ? 0 : theme.motion.standard,
        easing: Easing.out(Easing.cubic),
      },
      (finished) => {
        if (finished && !expanded) runOnJS(setMounted)(false);
      },
    );
  }, [expanded, progress, reduced, theme.motion.standard]);
  const style = useAnimatedStyle(() => ({
    height: height * progress.value,
    opacity: progress.value,
  }));
  return (
    <Animated.View
      style={[{ overflow: 'hidden' }, style]}
      pointerEvents={expanded ? 'auto' : 'none'}
      accessibilityElementsHidden={!expanded}
      importantForAccessibility={expanded ? 'auto' : 'no-hide-descendants'}
      aria-hidden={!expanded}
    >
      {mounted && (
        <View
          onLayout={(event) => setHeight(event.nativeEvent.layout.height)}
          style={{ position: 'absolute', top: 0, left: 0, right: 0 }}
        >
          {children}
        </View>
      )}
    </Animated.View>
  );
}
