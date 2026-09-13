import { TabIcon } from '../../src/components/TabIcon';
import { useReducedMotion } from 'react-native-reanimated';
import React from 'react';
import { Tabs } from 'expo-router';
import { useTheme, withAlpha } from '@fitness-tracker/ui';
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
            animation: reducedMotion ? 'none' : 'shift',
            tabBarActiveTintColor: theme.colors.primary,
            tabBarInactiveTintColor: theme.colors.muted,
            tabBarLabelStyle: {
              fontFamily: 'SpaceGrotesk_700Bold',
              fontSize: 9.5,
              letterSpacing: 0.5,
              textTransform: 'uppercase',
              marginTop: 2,
              lineHeight: 12,
              flexShrink: 0,
            },
            tabBarIconStyle: { height: 32, justifyContent: 'center', alignItems: 'center' },
            tabBarItemStyle: { height: 52, padding: 0, justifyContent: 'center', alignItems: 'center' },
            tabBarLabelPosition: 'below-icon',
            tabBarStyle: {
              backgroundColor: theme.colors.surfaceElevated,
              borderTopWidth: 0,
              marginHorizontal: 16,
              marginBottom: Math.max(insets.bottom, 10),
              borderWidth: 1,
              borderColor: withAlpha(theme.colors.primary, 0.25),
              borderRadius: 36,
              height: 66,
              paddingTop: 7,
              paddingBottom: 7,
              shadowColor: theme.colors.primary,
              shadowOffset: { width: 0, height: 4 },
              shadowOpacity: 0.18,
              shadowRadius: 16,
              elevation: 10,
            },
          }}
        >
          <Tabs.Screen
            name="history"
            options={{
              title: 'History',
              tabBarLabel: 'Hist',
              tabBarAccessibilityLabel: 'History',
              tabBarIcon: ({ color, focused }) => (
                <TabIcon
                  focused={focused}
                  name={focused ? 'time' : 'time-outline'}
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
                  name={focused ? 'calendar' : 'calendar-outline'}
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
                  name={focused ? 'home' : 'home-outline'}
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
