import React, { useEffect } from 'react';
import { View, Text } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  useReducedMotion,
} from 'react-native-reanimated';
import { useTheme } from '@fitness-tracker/ui';

export function WaterVessel({ progress }: { progress: number }) {
  const theme = useTheme();
  const reduced = useReducedMotion();
  const fill = useSharedValue(Math.min(1, Math.max(0, progress)));
  useEffect(() => {
    fill.value = withTiming(Math.min(1, Math.max(0, progress)), { duration: reduced ? 0 : 450 });
  }, [progress, fill, reduced]);
  const style = useAnimatedStyle(() => ({ height: `${fill.value * 100}%` }));
  return (
    <View
      accessible
      accessibilityLabel={`Trinkziel zu ${Math.round(progress * 100)} Prozent erreicht`}
      style={{
        height: 112,
        width: 92,
        alignSelf: 'center',
        marginVertical: 12,
        borderWidth: 2,
        borderColor: theme.colors.primary,
        borderTopWidth: 1,
        borderRadius: 24,
        overflow: 'hidden',
        backgroundColor: theme.colors.background,
      }}
    >
      <Animated.View
        style={[
          {
            position: 'absolute',
            bottom: 0,
            width: '100%',
            backgroundColor: '#327EAA',
            borderTopLeftRadius: 14,
            borderTopRightRadius: 9,
            borderTopWidth: 3,
            borderColor: '#99E1FF',
          },
          style,
        ]}
      />
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
        <Text style={{ color: '#EAF8FF', fontFamily: 'SpaceGrotesk_700Bold', fontSize: 21 }}>
          {Math.round(progress * 100)}%
        </Text>
      </View>
    </View>
  );
}
