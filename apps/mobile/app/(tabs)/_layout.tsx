import { TabIcon } from '../../src/components/TabIcon';
import { useReducedMotion } from 'react-native-reanimated';
import React from 'react';
import { Tabs } from 'expo-router';
import { useTheme } from '@fitness-tracker/ui';
import { View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { MinimizedWorkoutBar } from '../../src/components/workout/MinimizedWorkoutBar';

export default function TabLayout() {
  const theme = useTheme();
  const reducedMotion = useReducedMotion();
  const insets = useSafeAreaInsets();

  return (
    <View style={{ flex: 1, backgroundColor: theme.colors.background }}>
      <View style={{ flex: 1, width: '100%', maxWidth: 1040, alignSelf: 'center' }}>
        <Tabs
          screenOptions={{
            headerShown: false,
            animation: reducedMotion ? 'none' : 'fade',
            tabBarActiveTintColor: theme.colors.primary,
            tabBarInactiveTintColor: theme.colors.muted,
            tabBarLabelStyle: { fontFamily: 'Manrope_600SemiBold', fontSize: 11 },
            tabBarStyle: {
              backgroundColor: theme.colors.surface,
              borderTopColor: theme.colors.border,
              borderTopWidth: 1,
              height: 72 + insets.bottom,
              paddingBottom: Math.max(insets.bottom, 8),
              paddingTop: 8,
            },
          }}
        >
          <Tabs.Screen
            name="history"
            options={{
              title: 'History',
              tabBarLabel: 'History',
              tabBarAccessibilityLabel: 'History',
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
              tabBarAccessibilityLabel: 'Plans',
              tabBarIcon: ({ color, focused }) => (
                <TabIcon
                  name={focused ? 'barbell' : 'barbell-outline'}
                  color={color}
                  focused={focused}
                />
              ),
            }}
          />
          <Tabs.Screen
            name="index"
            options={{
              title: 'Home',
              tabBarLabel: 'Home',
              tabBarAccessibilityLabel: 'Home',
              tabBarIcon: ({ color, focused }) => (
                <TabIcon
                  name={focused ? 'flash' : 'flash-outline'}
                  color={color}
                  focused={focused}
                />
              ),
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
              tabBarAccessibilityLabel: 'Coach',
              tabBarIcon: ({ color, focused }) => (
                <TabIcon
                  name={focused ? 'chatbubble-ellipses' : 'chatbubble-ellipses-outline'}
                  color={color}
                  focused={focused}
                />
              ),
            }}
          />
          <Tabs.Screen
            name="body"
            options={{
              title: 'Body',
              tabBarLabel: 'Body',
              tabBarAccessibilityLabel: 'Body',
              tabBarIcon: ({ color, focused }) => (
                <TabIcon name={focused ? 'body' : 'body-outline'} color={color} focused={focused} />
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
      </View>
      <MinimizedWorkoutBar />
    </View>
  );
}
