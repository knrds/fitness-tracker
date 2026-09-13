import React, { useId } from 'react';
import { View, StyleSheet } from 'react-native';
import Svg, { Defs, RadialGradient, Stop, Rect, Path } from 'react-native-svg';
import { useTheme } from '@fitness-tracker/ui';

/** Decorative light stays inside its card and never intercepts a touch. */
export function VoltBackdrop() {
  const theme = useTheme();
  const id = `volt${useId().replace(/:/g, '')}`;
  return (
    <View
      pointerEvents="none"
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      style={[StyleSheet.absoluteFill, { overflow: 'hidden', borderRadius: theme.radius.lg }]}
    >
      <Svg width="100%" height="100%" viewBox="0 0 600 240" preserveAspectRatio="xMidYMid slice">
        <Defs>
          <RadialGradient id={id} cx="95%" cy="0%" rx="85%" ry="110%">
            <Stop offset="0" stopColor={theme.colors.primary} stopOpacity={0.23} />
            <Stop offset="0.6" stopColor={theme.colors.secondary} stopOpacity={0.05} />
            <Stop offset="1" stopColor={theme.colors.surface} stopOpacity={0} />
          </RadialGradient>
        </Defs>
        <Rect width="600" height="240" fill={`url(#${id})`} />
        <Path
          d="M480 -30 L412 103 H475 L427 242 L578 65 H506 L548 -30"
          fill="none"
          stroke={theme.colors.primary}
          strokeOpacity={0.1}
          strokeWidth="1.5"
        />
      </Svg>
    </View>
  );
}
