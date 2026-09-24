import { useReducedMotion } from 'react-native-reanimated';
import React, { useId, useEffect, useRef } from 'react';
import { View, StyleSheet, Animated, Easing, Platform } from 'react-native';
import Svg, { Defs, RadialGradient, Stop, Rect, Path } from 'react-native-svg';
import { useTheme, COACH_COLORWAYS } from '@fitness-tracker/ui';

/** Decorative light stays inside its card and never intercepts a touch. */
export function VoltBackdrop() {
  const theme = useTheme();
  const reducedMotion = useReducedMotion();
  const special = COACH_COLORWAYS.includes(theme.colorway);
  const glow = useRef(new Animated.Value(1)).current;
  useEffect(() => {
    glow.setValue(1);
    if (!special || reducedMotion) return;
    const pulse = Animated.loop(Animated.sequence([
      Animated.timing(glow, { toValue: 0.45, duration: 2600, easing: Easing.inOut(Easing.sin), useNativeDriver: Platform.OS !== 'web' }),
      Animated.timing(glow, { toValue: 1, duration: 2600, easing: Easing.inOut(Easing.sin), useNativeDriver: Platform.OS !== 'web' }),
    ]));
    pulse.start();
    return () => pulse.stop();
  }, [special, reducedMotion, glow, theme.colorway]);
  const id = `volt${useId().replace(/:/g, '')}`;
  return (
    <View
      pointerEvents="none"
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      style={[StyleSheet.absoluteFill, { overflow: 'hidden', borderRadius: theme.radius.lg }]}
    >
      <Animated.View style={[StyleSheet.absoluteFill, { opacity: glow }]}><Svg width="100%" height="100%" viewBox="0 0 600 240" preserveAspectRatio="xMidYMid slice">
        <Defs>
          <RadialGradient id={id} cx="95%" cy="0%" rx="85%" ry="110%">
            <Stop offset="0" stopColor={theme.colors.primary} stopOpacity={0.23} />
            <Stop offset="0.6" stopColor={theme.colors.secondary} stopOpacity={0.05} />
            <Stop offset="1" stopColor={theme.colors.surface} stopOpacity={0} />
          </RadialGradient>
        </Defs>
        <Rect width="600" height="240" fill={`url(#${id})`} />
        {special && <Path
          d={theme.colorway === 'prism' ? 'M0 180L180 0L420 240L600 60 M0 60L180 240L420 0L600 180' : theme.colorway === 'eclipse' ? 'M180 120C180 0 420 0 420 120C420 240 180 240 180 120 M250 100L275 125L300 85L325 125L350 100L340 150H260Z' : 'M-40 180Q160 -30 340 120T640 50 M-40 200Q160 0 340 140T640 80'}
          fill="none" stroke={theme.colors.secondary} strokeOpacity={0.22} strokeWidth={theme.colorway === 'prism' ? 1 : 2}
        />}
        <Path
          d="M480 -30 L412 103 H475 L427 242 L578 65 H506 L548 -30"
          fill="none"
          stroke={theme.colors.primary}
          strokeOpacity={0.1}
          strokeWidth="1.5"
        />
      </Svg></Animated.View>
    </View>
  );
}
