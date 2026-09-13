import React, { useEffect } from 'react';
import { Ionicons } from '@expo/vector-icons';
import { useTheme, withAlpha } from '@fitness-tracker/ui';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
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
  const isHome = name === 'flash' || name === 'flash-outline';
  const reduced = useReducedMotion();
  const selection = useSharedValue(focused ? 1 : 0);

  useEffect(() => {
    if (reduced) {
      selection.value = focused ? 1 : 0;
    } else {
      selection.value = withSpring(focused ? 1 : 0, {
        damping: 16,
        stiffness: 190,
      });
    }
  }, [focused, reduced, selection]);

  const style = useAnimatedStyle(() => ({
    transform: [
      { translateY: -2.5 * selection.value },
      { scale: 1 + 0.08 * selection.value },
    ],
    backgroundColor: interpolateColor(
      selection.value,
      [0, 1],
      [
        withAlpha(theme.colors.primary, 0),
        isHome ? theme.colors.primary : withAlpha(theme.colors.primary, 0.14),
      ],
    ),
    borderColor: interpolateColor(
      selection.value,
      [0, 1],
      [
        'transparent',
        isHome
          ? withAlpha(theme.colors.onPrimary, 0.3)
          : withAlpha(theme.colors.primary, 0.35),
      ],
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
          height: isHome ? 38 : 30,
          borderRadius: isHome ? 20 : theme.radius.sm,
          alignItems: 'center',
          justifyContent: 'center',
          borderWidth: 1,
        },
        style,
      ]}
    >
      <Ionicons
        name={name}
        color={isHome && focused ? theme.colors.onPrimary : color}
        size={isHome ? 24 : 20}
      />
    </Animated.View>
  );
}
