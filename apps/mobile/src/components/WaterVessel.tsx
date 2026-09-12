import React, { useEffect, useId } from 'react';
import { View, Text } from 'react-native';
import Svg, { Path, Defs, LinearGradient, Stop, ClipPath, Line, Ellipse } from 'react-native-svg';
import Animated, {
  useSharedValue,
  useAnimatedProps,
  withTiming,
  withSequence,
  useReducedMotion,
} from 'react-native-reanimated';
const AnimatedPath = Animated.createAnimatedComponent(Path);
export function WaterVessel({ progress }: { progress: number }) {
  const reduced = useReducedMotion();
  const id = 'water' + useId().replace(/[^a-zA-Z0-9]/g, '');
  const normalized = Number.isFinite(progress) ? Math.max(0, progress) : 0;
  const fill = useSharedValue(Math.min(1, normalized));
  const ripple = useSharedValue(0);
  useEffect(() => {
    fill.value = withTiming(Math.min(1, normalized), { duration: reduced ? 0 : 650 });
    ripple.value = reduced
      ? 0
      : withSequence(
          withTiming(4, { duration: 220 }),
          withTiming(-2, { duration: 250 }),
          withTiming(0, { duration: 350 }),
        );
  }, [normalized, reduced, fill, ripple]);
  const front = useAnimatedProps(() => {
    const y = 146 - fill.value * 124;
    return {
      d:
        'M 12 ' +
        y +
        ' Q 40 ' +
        (y - 5 - ripple.value) +
        ' 67 ' +
        y +
        ' T 122 ' +
        y +
        ' L 122 156 L 12 156 Z',
    };
  });
  const back = useAnimatedProps(() => {
    const y = 144 - fill.value * 124;
    return {
      d:
        'M 12 ' +
        y +
        ' Q 42 ' +
        (y + 6 + ripple.value) +
        ' 72 ' +
        y +
        ' T 122 ' +
        y +
        ' L 122 156 L 12 156 Z',
    };
  });
  const outline = 'M 15 16 Q 67 6 119 16 L 112 131 Q 111 151 67 153 Q 23 151 22 131 Z';
  return (
    <View
      accessible
      accessibilityLabel={'Trinkziel zu ' + Math.round(normalized * 100) + ' Prozent erreicht'}
      style={{ width: 134, height: 166, alignSelf: 'center', marginVertical: 12 }}
    >
      <Svg width={134} height={166} viewBox="0 0 134 166">
        <Defs>
          <LinearGradient id={id + 'glass'} x1="0%" x2="100%">
            <Stop offset="0" stopColor="#BDEAFF" stopOpacity="0.13" />
            <Stop offset="0.5" stopColor="#BDEAFF" stopOpacity="0.02" />
            <Stop offset="1" stopColor="#BDEAFF" stopOpacity="0.15" />
          </LinearGradient>
          <LinearGradient id={id + 'fill'} x1="0%" y1="0%" x2="0%" y2="100%">
            <Stop offset="0" stopColor="#67C5EC" />
            <Stop offset="1" stopColor="#246487" />
          </LinearGradient>
          <ClipPath id={id + 'clip'}>
            <Path d={outline} />
          </ClipPath>
        </Defs>
        <Ellipse cx={67} cy={156} rx={42} ry={5} fill="#000" opacity={0.15} />
        <Path
          d={outline}
          fill={'url(#' + id + 'glass)'}
          stroke="#B8DEEE"
          strokeOpacity={0.45}
          strokeWidth={1.5}
        />
        <AnimatedPath
          animatedProps={back}
          fill="#A8E6FF"
          fillOpacity={0.5}
          clipPath={'url(#' + id + 'clip)'}
        />
        <AnimatedPath
          animatedProps={front}
          fill={'url(#' + id + 'fill)'}
          clipPath={'url(#' + id + 'clip)'}
        />
        <Path
          d="M 24 25 L 30 119"
          stroke="#EAF8FF"
          strokeOpacity={0.28}
          strokeWidth={3}
          strokeLinecap="round"
        />
        {[42, 66, 90, 114].map((y) => (
          <Line key={y} x1={100} x2={107} y1={y} y2={y} stroke="#D6F1FC" strokeOpacity={0.4} />
        ))}
        <Ellipse cx={67} cy={16} rx={52} ry={7} fill="none" stroke="#B8DEEE" strokeOpacity={0.5} />
      </Svg>
      <View
        style={{ position: 'absolute', inset: 0, alignItems: 'center', justifyContent: 'center' }}
      >
        <View
          style={{
            backgroundColor: '#0D202DDD',
            borderRadius: 14,
            paddingHorizontal: 12,
            paddingVertical: 7,
          }}
        >
          <Text
            style={{
              color: '#EDF9FF',
              fontFamily: 'SpaceGrotesk_700Bold',
              fontSize: 23,
              fontVariant: ['tabular-nums'],
            }}
          >
            {Math.round(normalized * 100)}%
          </Text>
        </View>
      </View>
    </View>
  );
}
