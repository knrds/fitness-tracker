import React, { useEffect } from 'react';
import { Circle } from 'react-native-svg';
import Animated, {
  useSharedValue,
  useAnimatedProps,
  withTiming,
  useReducedMotion,
  Easing,
} from 'react-native-reanimated';

const AnimatedCircle = Animated.createAnimatedComponent(Circle);

/** Bounded SVG progress; updates interrupt the current motion and respect Reduce Motion. */
export function ActivityRing({
  radius,
  ratio,
  color,
  animate = true,
  delay = 0,
}: {
  radius: number;
  ratio: number;
  color: string;
  animate?: boolean;
  delay?: number;
}) {
  const reduced = useReducedMotion();
  const progress = useSharedValue(reduced ? ratio : 0);
  useEffect(() => {
    if (!animate) {
      progress.value = 0;
      return undefined;
    }
    progress.value = 0;
    const timer = setTimeout(() => {
      progress.value = withTiming(Math.min(1, Math.max(0, ratio)), {
        duration: reduced ? 0 : 650,
        easing: Easing.out(Easing.cubic),
      });
    }, delay);
    return () => clearTimeout(timer);
  }, [ratio, reduced, progress, animate, delay]);
  const circumference = 2 * Math.PI * radius;
  const props = useAnimatedProps(() => ({
    strokeDashoffset: circumference * (1 - progress.value),
    opacity: progress.value > 0 ? 1 : 0,
  }));
  return (
    <AnimatedCircle
      animatedProps={props}
      cx={62}
      cy={62}
      r={radius}
      stroke={color}
      strokeWidth={7}
      fill="none"
      strokeDasharray={`${circumference} ${circumference}`}
      strokeLinecap="round"
      rotation={-90}
      origin="62,62"
    />
  );
}
