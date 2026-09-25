import { useReducedMotion } from 'react-native-reanimated';
import React, { useId, useEffect, useRef } from 'react';
import { View, StyleSheet, Animated, Easing, Platform } from 'react-native';
import Svg, { Defs, RadialGradient, Stop, Rect } from 'react-native-svg';
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
      style={[styles.corner, { borderRadius: theme.radius.lg }]}
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
      </Svg></Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({ corner: { position: 'absolute', top: 0, right: 0, width: 72, height: 12, overflow: 'hidden' } });
