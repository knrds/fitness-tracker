import React, { useEffect, useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  useReducedMotion,
  Easing,
} from 'react-native-reanimated';
import { useTheme } from '../ThemeProvider';

export function SegmentedControl<T extends string>({
  options,
  value,
  onChange,
  label,
}: {
  options: readonly { value: T; label: string }[];
  value: T;
  onChange: (value: T) => void;
  label: string;
}) {
  const theme = useTheme();
  const reduced = useReducedMotion();
  const [width, setWidth] = useState(0);
  const position = useSharedValue(0);
  const itemWidth = Math.max(0, width - 8) / Math.max(1, options.length);
  const index = Math.max(
    0,
    options.findIndex((option) => option.value === value),
  );
  useEffect(() => {
    position.value = withTiming(index * itemWidth, {
      duration: reduced ? 0 : theme.motion.standard,
      easing: Easing.out(Easing.cubic),
    });
  }, [index, itemWidth, position, reduced, theme.motion.standard]);
  const indicatorStyle = useAnimatedStyle(() => ({ transform: [{ translateX: position.value }] }));
  return (
    <View
      onLayout={(event) => setWidth(event.nativeEvent.layout.width)}
      accessibilityLabel={label}
      style={{
        flexDirection: 'row',
        backgroundColor: theme.colors.surface,
        padding: 4,
        borderRadius: theme.radius.md,
        marginHorizontal: theme.spacing.md,
        marginBottom: theme.spacing.md,
      }}
    >
      {width > 0 && (
        <Animated.View
          pointerEvents="none"
          style={[
            {
              position: 'absolute',
              top: 4,
              bottom: 4,
              left: 4,
              width: itemWidth,
              borderRadius: theme.radius.sm,
              backgroundColor: theme.colors.surfaceElevated,
              borderWidth: 1,
              borderColor: theme.colors.borderActive,
            },
            indicatorStyle,
          ]}
        />
      )}
      {options.map((option) => {
        const selected = value === option.value;
        return (
          <Pressable
            key={option.value}
            accessibilityRole="tab"
            accessibilityLabel={option.label}
            accessibilityState={{ selected }}
            aria-selected={selected}
            onPress={() => onChange(option.value)}
            style={({ pressed }) => ({
              flex: 1,
              minWidth: 0,
              minHeight: theme.layout.minimumTarget,
              paddingVertical: 10,
              paddingHorizontal: 6,
              justifyContent: 'center',
              alignItems: 'center',
              borderRadius: theme.radius.sm,
              backgroundColor: 'transparent',
              opacity: pressed ? 0.8 : 1,
            })}
          >
            <Text
              style={[
                theme.typography.button,
                {
                  fontSize: 13,
                  textAlign: 'center',
                  color: selected ? theme.colors.primary : theme.colors.muted,
                },
              ]}
            >
              {option.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}
