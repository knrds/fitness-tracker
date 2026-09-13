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
      { translateY: isHome ? -2 * selection.value : -1 * selection.value },
      { scale: 1 + (isHome ? 0.06 : 0.04) * selection.value },
    ],
    backgroundColor: isHome
      ? theme.colors.primary
      : interpolateColor(
          selection.value,
          [0, 1],
          [withAlpha(theme.colors.primary, 0), withAlpha(theme.colors.primary, 0.12)],
        ),
    borderColor: isHome
      ? withAlpha(theme.colors.onPrimary, 0.3)
      : interpolateColor(
          selection.value,
          [0, 1],
          ['transparent', withAlpha(theme.colors.primary, 0.3)],
        ),
  }));

  if (isHome) {
    return (
      <Animated.View
        accessible={false}
        accessibilityElementsHidden
        importantForAccessibility="no-hide-descendants"
        style={[
          {
            width: 44,
            height: 44,
            borderRadius: 22,
            alignItems: 'center',
            justifyContent: 'center',
            borderWidth: 1,
            shadowColor: theme.colors.primary,
            shadowOffset: { width: 0, height: 0 },
            shadowOpacity: 0.65,
            shadowRadius: 12,
            elevation: 8,
          },
          style,
        ]}
      >
        <Ionicons
          name="flash"
          color={theme.colors.onPrimary || theme.colors.background}
          size={24}
        />
      </Animated.View>
    );
  }

  return (
    <Animated.View
      accessible={false}
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      style={[
        {
          width: 38,
          height: 28,
          borderRadius: 14,
          alignItems: 'center',
          justifyContent: 'center',
          borderWidth: 1,
        },
        style,
      ]}
    >
      <Ionicons
        name={name}
        color={focused ? theme.colors.primary : color}
        size={20}
      />
    </Animated.View>
  );
}
