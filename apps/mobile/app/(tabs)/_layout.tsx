import { AnimatedTabBar } from '../../src/components/AnimatedTabBar';
import { TabIcon } from '../../src/components/TabIcon';
import { useReducedMotion } from 'react-native-reanimated';
import React from 'react';
import { Tabs } from 'expo-router';
import { useTheme } from '@fitness-tracker/ui';
import { View } from 'react-native';
import { MinimizedWorkoutBar } from '../../src/components/workout/MinimizedWorkoutBar';

export default function TabLayout() {
  const theme = useTheme();
  const reducedMotion = useReducedMotion();

  return (
    <View style={{ flex: 1, backgroundColor: theme.colors.background }}>
      <View style={{ flex: 1, width: '100%', maxWidth: 1040, alignSelf: 'center' }}>
        <Tabs
          tabBar={(props) => <AnimatedTabBar {...props} />}
          screenOptions={{
            headerShown: false,
            animation: reducedMotion ? 'none' : 'shift',
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
              tabBarLabel: () => null,
              tabBarAccessibilityLabel: 'Home',
              tabBarIcon: ({ color, focused }) => (
                <TabIcon
                  name="flash"
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
