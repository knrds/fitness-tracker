import React, { useEffect, useRef } from 'react';
import {
  View,
  Text,
  Pressable,
  StyleSheet,
  Platform,
  LayoutChangeEvent,
} from 'react-native';
import { Tabs } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useTheme, withAlpha } from '@fitness-tracker/ui';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  useReducedMotion,
} from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';

export type AnimatedTabBarProps = Parameters<
  NonNullable<React.ComponentProps<typeof Tabs>['tabBar']>
>[0];

interface TabConfig {
  name: string;
  label: string;
  iconOutline: React.ComponentProps<typeof Ionicons>['name'];
  iconFilled: React.ComponentProps<typeof Ionicons>['name'];
  isCenter?: boolean;
}

const TAB_CONFIGS: Record<string, TabConfig> = {
  history: {
    name: 'history',
    label: 'Hist',
    iconOutline: 'time-outline',
    iconFilled: 'time',
  },
  workouts: {
    name: 'workouts',
    label: 'Plans',
    iconOutline: 'calendar-outline',
    iconFilled: 'calendar',
  },
  index: {
    name: 'index',
    label: 'Home',
    iconOutline: 'flash',
    iconFilled: 'flash',
    isCenter: true,
  },
  coach: {
    name: 'coach',
    label: 'Coach',
    iconOutline: 'chatbubble-ellipses-outline',
    iconFilled: 'chatbubble-ellipses',
  },
  body: {
    name: 'body',
    label: 'Body',
    iconOutline: 'body-outline',
    iconFilled: 'body',
  },
};

export function AnimatedTabBar({ state, descriptors, navigation }: AnimatedTabBarProps) {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const reducedMotion = useReducedMotion();

  // Filter out hidden routes (e.g. href: null)
  const visibleRoutes = state.routes.filter((route) => {
    const descriptor = descriptors[route.key];
    return (descriptor?.options as { href?: unknown })?.href !== null && TAB_CONFIGS[route.name] !== undefined;
  });

  const activeRoute = state.routes[state.index];
  const activeRouteName = activeRoute?.name || 'index';

  // Measure tab item positions for the sliding indicator
  const tabLayouts = useRef<{ [key: string]: { x: number; width: number } }>({});
  const indicatorX = useSharedValue(0);
  const indicatorWidth = useSharedValue(0);
  const indicatorOpacity = useSharedValue(0);

  const updateIndicator = (routeName: string) => {
    const layout = tabLayouts.current[routeName];
    if (layout && !reducedMotion) {
      if (routeName === 'index') {
        // Center orb has its own elevated glow; smoothly hide the pill indicator
        indicatorOpacity.value = withSpring(0, { damping: 20, stiffness: 200 });
      } else {
        indicatorX.value = withSpring(layout.x + 4, {
          damping: 18,
          stiffness: 220,
          mass: 0.7,
        });
        indicatorWidth.value = withSpring(layout.width - 8, {
          damping: 18,
          stiffness: 220,
          mass: 0.7,
        });
        indicatorOpacity.value = withSpring(1, { damping: 18, stiffness: 200 });
      }
    } else if (layout && reducedMotion) {
      indicatorX.value = layout.x + 4;
      indicatorWidth.value = layout.width - 8;
      indicatorOpacity.value = routeName === 'index' ? 0 : 1;
    }
  };

  useEffect(() => {
    updateIndicator(activeRouteName);
  }, [activeRouteName, reducedMotion]);

  const animatedIndicatorStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: indicatorX.value }],
    width: indicatorWidth.value,
    opacity: indicatorOpacity.value,
  }));

  return (
    <View
      pointerEvents="box-none"
      style={[
        styles.outerContainer,
        {
          paddingBottom: Math.max(insets.bottom, 12),
        },
      ]}
    >
      <View
        style={[
          styles.barContainer,
          {
            backgroundColor: theme.colors.surfaceElevated,
            borderColor: withAlpha(theme.colors.primary, 0.25),
            shadowColor: theme.colors.primary,
          },
        ]}
      >
        {/* Animated Sliding Pill Indicator behind active tab */}
        <Animated.View
          style={[
            styles.slidingIndicator,
            {
              backgroundColor: withAlpha(theme.colors.primary, 0.12),
              borderColor: withAlpha(theme.colors.primary, 0.35),
            },
            animatedIndicatorStyle,
          ]}
        />

        {/* Tab Items */}
        {visibleRoutes.map((route) => {
          const config = TAB_CONFIGS[route.name];
          if (!config) return null;

          const isFocused = state.routes[state.index]?.key === route.key;

          const onPress = () => {
            const event = navigation.emit({
              type: 'tabPress',
              target: route.key,
              canPreventDefault: true,
            });

            if (Platform.OS !== 'web') {
              void Haptics.selectionAsync();
            }

            if (!isFocused && !event.defaultPrevented) {
              navigation.navigate(route.name);
            }
          };

          return (
            <TabItemView
              key={route.key}
              config={config}
              isFocused={isFocused}
              onPress={onPress}
              onLayout={(e) => {
                const { x, width } = e.nativeEvent.layout;
                tabLayouts.current[config.name] = { x, width };
                if (config.name === activeRouteName) {
                  updateIndicator(config.name);
                }
              }}
            />
          );
        })}
      </View>
    </View>
  );
}

function TabItemView({
  config,
  isFocused,
  onPress,
  onLayout,
}: {
  config: TabConfig;
  isFocused: boolean;
  onPress: () => void;
  onLayout: (e: LayoutChangeEvent) => void;
}) {
  const theme = useTheme();
  const reducedMotion = useReducedMotion();
  const scale = useSharedValue(1);

  useEffect(() => {
    if (!reducedMotion) {
      scale.value = withSpring(isFocused ? 1.06 : 1, {
        damping: 15,
        stiffness: 220,
      });
    }
  }, [isFocused, reducedMotion]);

  const animatedItemStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  // Center Elevated Volt Orb
  if (config.isCenter) {
    return (
      <View onLayout={onLayout} style={styles.centerTabWrapper}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Home Dashboard"
          accessibilityState={{ selected: isFocused }}
          onPress={onPress}
          style={({ pressed }) => [
            styles.centerOrb,
            {
              backgroundColor: theme.colors.primary,
              shadowColor: theme.colors.primary,
              transform: [{ scale: pressed ? 0.93 : 1 }],
            },
          ]}
        >
          <Ionicons
            name="flash"
            size={22}
            color={theme.colors.onPrimary || theme.colors.background}
          />
        </Pressable>
      </View>
    );
  }

  return (
    <View onLayout={onLayout} style={styles.tabItemWrapper}>
      <Pressable
        accessibilityRole="tab"
        accessibilityLabel={config.label}
        accessibilityState={{ selected: isFocused }}
        onPress={onPress}
        style={styles.tabButton}
      >
        <Animated.View style={[styles.iconWrap, animatedItemStyle]}>
          <Ionicons
            name={isFocused ? config.iconFilled : config.iconOutline}
            size={20}
            color={isFocused ? theme.colors.primary : theme.colors.muted}
          />
        </Animated.View>
        <Text
          style={[
            styles.tabLabel,
            {
              color: isFocused ? theme.colors.primary : theme.colors.muted,
              fontFamily: isFocused ? 'SpaceGrotesk_700Bold' : 'SpaceGrotesk_600SemiBold',
            },
          ]}
        >
          {config.label}
        </Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  outerContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 100,
  },
  barContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    width: '92%',
    maxWidth: 420,
    height: 60,
    borderRadius: 36,
    borderWidth: 1,
    paddingHorizontal: 8,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.25,
    shadowRadius: 18,
    elevation: 12,
  },
  slidingIndicator: {
    position: 'absolute',
    top: 6,
    bottom: 6,
    borderRadius: 24,
    borderWidth: 1,
    zIndex: 0,
  },
  tabItemWrapper: {
    flex: 1,
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1,
  },
  tabButton: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 2,
  },
  iconWrap: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  tabLabel: {
    fontSize: 9,
    letterSpacing: 0.5,
    textTransform: 'uppercase',
    lineHeight: 12,
  },
  centerTabWrapper: {
    flex: 1,
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 2,
  },
  centerOrb: {
    width: 46,
    height: 46,
    borderRadius: 23,
    marginTop: -12,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: 'rgba(255, 255, 255, 0.35)',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.65,
    shadowRadius: 12,
    elevation: 10,
  },
});
