import React, { useId } from 'react';
import { View, StyleSheet } from 'react-native';
import Svg, { Defs, RadialGradient, Stop, Rect } from 'react-native-svg';
import { useTheme } from '@fitness-tracker/ui';

/** Materials live in Card; this quiet edge light must not duplicate them. */
export function VoltBackdrop() {
  const theme = useTheme();
  const id = `volt${useId().replace(/:/g, '')}`;
  return (
    <View
      pointerEvents="none"
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      style={[StyleSheet.absoluteFill, { borderRadius: theme.radius.lg, overflow: 'hidden' }]}
    >
      <Svg width="100%" height="100%" preserveAspectRatio="none">
        <Defs>
          <RadialGradient id={id} cx="100%" cy="0%" rx="65%" ry="90%">
            <Stop
              offset="0"
              stopColor={theme.premium?.highlight ?? theme.colors.primary}
              stopOpacity={theme.premium ? 0.08 : 0.15}
            />
            <Stop offset="1" stopColor={theme.colors.surface} stopOpacity={0} />
          </RadialGradient>
        </Defs>
        <Rect width="100%" height="100%" fill={`url(#${id})`} />
      </Svg>
    </View>
  );
}
