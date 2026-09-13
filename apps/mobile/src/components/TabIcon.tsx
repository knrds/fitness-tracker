import React, { useEffect } from 'react';
import { Ionicons } from '@expo/vector-icons';
import { useTheme, withAlpha } from '@fitness-tracker/ui';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  useReducedMotion,
  interpolateColor,
} from 'react-native-reanimated';

export function TabIcon({
  name,
  color,
  focused,
}: {
  name: React.ComponentProps<typeof Ionicons>['name'];
  color: string;
  focused: boolean;
}) {
  const theme = useTheme();
  const reduced = useReducedMotion();
  const selection = useSharedValue(focused ? 1 : 0);
  useEffect(() => {
    selection.value = withTiming(focused ? 1 : 0, { duration: reduced ? 0 : 180 });
  }, [focused, reduced, selection]);
  const style = useAnimatedStyle(() => ({
    transform: [{ translateY: -2 * selection.value }, { scale: 1 + 0.06 * selection.value }],
    backgroundColor: interpolateColor(
      selection.value,
      [0, 1],
      [withAlpha(theme.colors.primary, 0), withAlpha(theme.colors.primary, 0.14)],
    ),
  }));
  return (
    <Animated.View
      accessible={false}
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      style={[
        {
          width: 44,
          height: 28,
          borderRadius: theme.radius.sm,
          alignItems: 'center',
          justifyContent: 'center',
        },
        style,
      ]}
    >
      <Ionicons name={name} color={color} size={22} />
    </Animated.View>
  );
}
