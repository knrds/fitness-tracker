import React from 'react';
import { Tabs, usePathname } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@fitness-tracker/ui';
import { StyleSheet, Platform, Pressable, Animated, View } from 'react-native';
import { isIOS } from '../../src/utils/platform';
import { MinimizedWorkoutBar } from '../../src/components/workout/MinimizedWorkoutBar';

export default function TabLayout() {
  const theme = useTheme();
  const pathname = usePathname();
  const isHomeFocused = pathname === '/';

  // Animated value for pulsing Home button glow
  const glowAnim = React.useRef(new Animated.Value(0)).current;

  React.useEffect(() => {
    const glowLoop = Animated.loop(
      Animated.sequence([
        Animated.timing(glowAnim, {
          toValue: 1,
          duration: 1500,
          useNativeDriver: false,
        }),
        Animated.timing(glowAnim, {
          toValue: 0,
          duration: 1500,
          useNativeDriver: false,
        }),
      ]),
    );
    glowLoop.start();

    return () => {
      glowLoop.stop();
    };
  }, [glowAnim]);

  const animatedShadowRadius = glowAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [6, 14],
  });

  const animatedShadowOpacity = glowAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0.4, 0.9],
  });

  const animatedElevation = glowAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [8, 14],
  });

  return (
    <View style={{ flex: 1 }}>
      <Tabs
        screenOptions={{
          headerShown: false,
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
              <Ionicons name={focused ? 'analytics' : 'analytics-outline'} size={22} color={color} />
            ),
          }}
        />
        <Tabs.Screen
          name="workouts"
          options={{
            title: 'Plans',
            tabBarLabel: 'Plans',
            tabBarIcon: ({ color, focused }) => (
              <Ionicons name={focused ? 'barbell' : 'barbell-outline'} size={22} color={color} />
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
                              shadowOpacity: animatedShadowOpacity,
                              shadowRadius: animatedShadowRadius,
                              elevation: animatedElevation,
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
              <Ionicons name={focused ? 'body' : 'body-outline'} size={22} color={color} />
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
