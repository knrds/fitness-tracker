import React, { useEffect } from 'react';
import { StyleSheet } from 'react-native';
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
  const isHome =
    name === 'home' ||
    name === 'home-outline' ||
    name === 'flash' ||
    name === 'flash-outline';
  const reduced = useReducedMotion();
  const progress = useSharedValue(focused ? 1 : 0);

  useEffect(() => {
    if (reduced) {
      progress.value = focused ? 1 : 0;
    } else {
      progress.value = withSpring(focused ? 1 : 0, {
        damping: 15,
        stiffness: 200,
        mass: 0.6,
      });
    }
  }, [focused, reduced, progress]);

  const animatedStyle = useAnimatedStyle(() => {
    const translateY = -2 * progress.value;
    const scale = 1 + 0.08 * progress.value;

    if (isHome) {
      return {
        transform: [{ translateY }, { scale }],
        backgroundColor: interpolateColor(
          progress.value,
          [0, 1],
          [
            withAlpha(theme.colors.surfaceElevated, 0.85),
            theme.colors.primary,
          ],
        ),
        borderColor: interpolateColor(
          progress.value,
          [0, 1],
          [
            withAlpha(theme.colors.border, 0.9),
            withAlpha(theme.colors.onPrimary || '#FFFFFF', 0.45),
          ],
        ),
        shadowOpacity: 0.55 * progress.value,
      };
    }

    return {
      transform: [{ translateY }, { scale }],
      backgroundColor: interpolateColor(
        progress.value,
        [0, 1],
        ['transparent', withAlpha(theme.colors.primary, 0.15)],
      ),
      borderColor: interpolateColor(
        progress.value,
        [0, 1],
        ['transparent', withAlpha(theme.colors.primary, 0.35)],
      ),
      shadowOpacity: 0,
    };
  });

  const iconColor = isHome
    ? focused
      ? (theme.colors.onPrimary || theme.colors.background)
      : theme.colors.muted
    : focused
    ? theme.colors.primary
    : color;

  return (
    <Animated.View
      accessible={false}
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      style={[
        styles.iconBadge,
        isHome ? styles.homeBadge : styles.tabBadge,
        {
          shadowColor: theme.colors.primary,
          shadowOffset: { width: 0, height: 2 },
          shadowRadius: 8,
          elevation: isHome && focused ? 6 : 0,
        },
        animatedStyle,
      ]}
    >
      <Ionicons
        name={name}
        color={iconColor}
        size={isHome ? 20 : 19}
      />
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  iconBadge: {
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },
  homeBadge: {
    width: 38,
    borderRadius: 16,
  },
  tabBadge: {
    width: 44,
    borderRadius: 14,
  },
});
