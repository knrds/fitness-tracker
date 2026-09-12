import React, { useEffect } from 'react';
import { Ionicons } from '@expo/vector-icons';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  useReducedMotion,
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
  const reduced = useReducedMotion();
  const selection = useSharedValue(focused ? 1 : 0);
  useEffect(() => {
    selection.value = withTiming(focused ? 1 : 0, { duration: reduced ? 0 : 180 });
  }, [focused, reduced, selection]);
  const style = useAnimatedStyle(() => ({
    transform: [{ translateY: -2 * selection.value }],
    backgroundColor: `rgba(144, 213, 255, ${0.13 * selection.value})`,
  }));
  return (
    <Animated.View
      style={[
        { width: 44, height: 30, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
        style,
      ]}
    >
      <Ionicons name={name} color={color} size={22} />
    </Animated.View>
  );
}
