import { TabIcon } from '../../src/components/TabIcon';
import { useReducedMotion } from 'react-native-reanimated';
import React from 'react';
import { Tabs, usePathname } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@fitness-tracker/ui';
import { StyleSheet, Platform, Pressable, Animated, View } from 'react-native';
import { isIOS } from '../../src/utils/platform';
import { MinimizedWorkoutBar } from '../../src/components/workout/MinimizedWorkoutBar';

export default function TabLayout() {
  const theme = useTheme();
  const reducedMotion = useReducedMotion();
  const pathname = usePathname();
  const isHomeFocused = pathname === '/';

  return (
    <View style={{ flex: 1 }}>
      <Tabs
        screenOptions={{
          headerShown: false,
          animation: reducedMotion ? 'none' : 'fade',
          tabBarActiveTintColor: theme.colors.primary,
          tabBarInactiveTintColor: theme.colors.muted,
          tabBarStyle: {
            backgroundColor: theme.colors.background,
            borderTopColor: theme.colors.border,
            borderTopWidth: 1,
            height: isIOS ? 88 : 64,
            paddingBottom: isIOS ? 24 : 8,
            paddingTop: 8,
          },
        }}
      >
        <Tabs.Screen
          name="history"
          options={{
            title: 'History',
            tabBarLabel: 'History',
            tabBarIcon: ({ color, focused }) => (
              <TabIcon
                focused={focused}
                name={focused ? 'analytics' : 'analytics-outline'}
                color={color}
              />
            ),
          }}
        />
        <Tabs.Screen
          name="workouts"
          options={{
            title: 'Plans',
            tabBarLabel: 'Plans',
            tabBarIcon: ({ color, focused }) => (
              <Ionicons name={focused ? 'barbell' : 'barbell-outline'} color={color} />
            ),
          }}
        />
        <Tabs.Screen
          name="index"
          options={{
            title: 'Home',
            tabBarLabel: () => null,
            tabBarButton: (props) => {
              const focused = isHomeFocused;
              return (
                <Pressable
                  accessibilityRole="tab"
                  accessibilityLabel="Home"
                  accessibilityState={{ selected: focused }}
                  aria-selected={focused}
                  onPress={props.onPress}
                  onLongPress={props.onLongPress}
                  style={[props.style, styles.centerTabContainer]}
                >
                  <Animated.View
                    style={[
                      styles.centerTabCircle,
                      Platform.OS === 'web'
                        ? styles.centerTabCircleWebShadow
                        : styles.centerTabCircleNativeShadow,
                      {
                        backgroundColor: focused ? theme.colors.primary : '#1A1C23',
                        borderColor: focused ? theme.colors.primary : theme.colors.muted,
                        borderWidth: 2,
                      },
                      focused &&
                        (Platform.OS === 'web'
                          ? styles.centerTabFocusedWebShadow
                          : {
                              shadowColor: theme.colors.primary,
                              shadowOffset: { width: 0, height: 0 },
                              shadowOpacity: 0.35,
                              shadowRadius: 8,
                              elevation: 8,
                            }),
                    ]}
                  >
                    <Ionicons
                      name={focused ? 'home' : 'home-outline'}
                      size={26}
                      color={focused ? theme.colors.background : theme.colors.muted}
                    />
                  </Animated.View>
                </Pressable>
              );
            },
          }}
        />
        <Tabs.Screen
          name="exercises"
          options={{
            href: null,
          }}
        />
        <Tabs.Screen
          name="coach"
          options={{
            title: 'Coach',
            tabBarLabel: 'Coach',
            tabBarIcon: ({ color, focused }) => (
              <Ionicons
                name={focused ? 'chatbubble-ellipses' : 'chatbubble-ellipses-outline'}
                size={22}
                color={color}
              />
            ),
          }}
        />
        <Tabs.Screen
          name="body"
          options={{
            title: 'Body',
            tabBarLabel: 'Body',
            tabBarIcon: ({ color, focused }) => (
              <Ionicons name={focused ? 'body' : 'body-outline'} color={color} />
            ),
          }}
        />
        <Tabs.Screen
          name="programs"
          options={{
            href: null,
          }}
        />
      </Tabs>
      <MinimizedWorkoutBar />
    </View>
  );
}

const styles = StyleSheet.create({
  centerTabContainer: {
    top: isIOS ? -12 : -16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  centerTabCircle: {
    width: 54,
    height: 54,
    borderRadius: 27,
    justifyContent: 'center',
    alignItems: 'center',
  },
  centerTabCircleNativeShadow: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 6,
    elevation: 8,
  },
  centerTabCircleWebShadow: {
    boxShadow: '0 4px 14px rgba(0, 0, 0, 0.35)',
  },
  centerTabFocusedWebShadow: {
    boxShadow: '0 0 18px rgba(144, 213, 255, 0.7)',
  },
});
