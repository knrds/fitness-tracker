import { useTheme, PremiumQuill } from '@fitness-tracker/ui';
import React, { useEffect, useId } from 'react';
import { View, Text } from 'react-native';
import Svg, {
  Path,
  Defs,
  LinearGradient,
  Stop,
  ClipPath,
  Line,
  Ellipse,
  Rect,
  Circle,
  G,
} from 'react-native-svg';
import Animated, {
  useSharedValue,
  useAnimatedProps,
  withTiming,
  withSequence,
  useReducedMotion,
} from 'react-native-reanimated';
import { useI18n } from '../i18n';

const AnimatedPath = Animated.createAnimatedComponent(Path);

/** One water value, four materials. Decoration never changes hydration semantics. */
export function WaterVessel({ progress }: { progress: number }) {
  const theme = useTheme();
  const { language } = useI18n();
  const reduced = useReducedMotion();
  const id = 'water' + useId().replace(/[^a-zA-Z0-9]/g, '');
  const normalized = Number.isFinite(progress) ? Math.max(0, progress) : 0;
  const variant = theme.premium?.hydrationVariant ?? 'glass';
  const cup = variant === 'cup';
  const reactor = variant === 'reactor';
  const carafe = variant === 'carafe';
  const ink = variant === 'inkwell';
  const top = cup ? 77 : ink ? 78 : 43;
  const bottom = cup ? 154 : 161;
  const fill = useSharedValue(Math.min(1, normalized));
  const ripple = useSharedValue(0);
  useEffect(() => {
    fill.value = withTiming(Math.min(1, normalized), { duration: reduced ? 0 : 700 });
    ripple.value = reduced
      ? 0
      : withSequence(withTiming(3, { duration: 200 }), withTiming(0, { duration: 500 }));
  }, [normalized, reduced, fill, ripple]);
  const liquid = useAnimatedProps(() => {
    const y = bottom - fill.value * (bottom - top);
    return { d: `M 30 ${y} Q 75 ${y - ripple.value} 100 ${y} T 171 ${y} V 170 H 30 Z` };
  });
  const outline = cup
    ? 'M 39 77 Q 90 91 141 77 L 135 126 Q 129 154 90 154 Q 51 154 45 126 Z'
    : reactor
      ? 'M 64 43 Q 100 33 136 43 V 148 Q 136 161 100 161 Q 64 161 64 148 Z'
      : carafe
        ? 'M 86 35 H 114 V 64 C 115 79 138 84 141 106 L 145 148 Q 145 160 100 161 Q 55 160 55 148 L 59 106 C 62 84 85 79 86 64 Z'
        : ink
          ? 'M 79 65 H 121 V 80 L 142 97 V 150 Q 100 167 58 150 V 97 L 79 80 Z'
          : 'M 50 37 Q 100 25 150 37 L 141 147 Q 140 161 100 162 Q 60 161 59 147 Z';
  const bright = theme.premium?.highlight ?? theme.hydration.glass;
  return (
    <View
      accessible
      testID={`hydration-${variant}`}
      accessibilityLabel={
        language === 'de'
          ? `Trinkziel zu ${Math.round(normalized * 100)} Prozent erreicht`
          : `Hydration goal ${Math.round(normalized * 100)} percent complete`
      }
      style={{ width: 200, height: 216, alignSelf: 'center', marginVertical: 6 }}
    >
      <Svg width={200} height={180} viewBox="0 0 200 180">
        <Defs>
          <LinearGradient id={id + 'shell'} x1="0%" x2="100%">
            <Stop
              offset="0"
              stopColor={cup ? '#D5B99D' : theme.hydration.glass}
              stopOpacity={cup ? 1 : 0.28}
            />
            <Stop
              offset="0.32"
              stopColor={cup ? '#FFFCF5' : theme.hydration.light}
              stopOpacity={cup ? 1 : 0.07}
            />
            <Stop
              offset="0.68"
              stopColor={cup ? '#F4E5D4' : theme.hydration.light}
              stopOpacity={cup ? 1 : 0.04}
            />
            <Stop
              offset="1"
              stopColor={cup ? '#B9987A' : theme.hydration.glass}
              stopOpacity={cup ? 1 : 0.3}
            />
          </LinearGradient>
          <LinearGradient id={id + 'water'} x1="0%" y1="0%" x2="80%" y2="100%">
            <Stop offset="0" stopColor={theme.hydration.light} />
            <Stop offset="0.35" stopColor={theme.hydration.water} />
            <Stop offset="1" stopColor={theme.hydration.deep} />
          </LinearGradient>
          <ClipPath id={id + 'clip'}>
            <Path d={outline} />
          </ClipPath>
        </Defs>
        <Ellipse cx={100} cy={170} rx={64} ry={7} fill={theme.colors.shadow} opacity={0.12} />
        {cup && (
          <>
            <Ellipse cx={92} cy={163} rx={70} ry={11} fill="#E3CBB4" stroke="#B9987A" />
            <Ellipse cx={92} cy={160} rx={63} ry={8} fill="#FFF8EF" stroke="#E6CFB8" />
            <Path
              d="M 141 87 C 184 71 183 139 137 135"
              fill="none"
              stroke="#C6A17F"
              strokeWidth={14}
            />
            <Path
              d="M 143 87 C 177 76 176 132 142 131"
              fill="none"
              stroke="#F9EEE1"
              strokeWidth={8}
            />
            <Path
              d="M 73 59 C 57 46 86 40 72 22 M 98 57 C 84 43 113 36 98 15 M 121 59 C 111 48 133 41 121 28"
              fill="none"
              stroke={theme.hydration.glass}
              strokeWidth={2}
              strokeLinecap="round"
              opacity={0.55}
            />
          </>
        )}
        {reactor && (
          <G fill="none" stroke={bright}>
            <Ellipse cx={100} cy={96} rx={70} ry={63} strokeOpacity={0.13} />
            <Path
              d="M 43 72 V 55 H 53 M 157 72 V 55 H 147 M 43 129 V 144 H 53 M 157 129 V 144 H 147"
              strokeWidth={2}
              strokeOpacity={0.6}
            />
            <Path d="M 100 10 V 22 M 24 98 H 36 M 164 98 H 176" strokeOpacity={0.45} />
          </G>
        )}
        <Path
          d={outline}
          fill={`url(#${id}shell)`}
          stroke={theme.hydration.glass}
          strokeWidth={1.5}
          strokeOpacity={0.7}
        />
        <AnimatedPath
          animatedProps={liquid}
          fill={`url(#${id}water)`}
          fillOpacity={cup ? 0.78 : 0.85}
          clipPath={`url(#${id}clip)`}
        />
        <Path
          d={outline}
          fill="none"
          stroke={theme.hydration.reflection}
          strokeWidth={0.8}
          strokeOpacity={0.45}
        />
        {cup ? (
          <>
            <Ellipse cx={90} cy={77} rx={51} ry={13} fill="#FDF5E9" stroke="#BB9672" />
            <Ellipse cx={90} cy={77} rx={44} ry={9} fill={normalized > 0 ? '#644631' : '#E4CCB1'} />
            <Path
              d="M 58 73 Q 86 63 119 73"
              stroke="#FFFFFF"
              strokeWidth={2}
              opacity={0.7}
              fill="none"
            />
            <Path
              d="M 57 97 Q 55 124 70 135"
              stroke="#FFFFFF"
              opacity={0.5}
              strokeWidth={5}
              strokeLinecap="round"
              fill="none"
            />
          </>
        ) : reactor ? (
          <>
            <Rect x={61} y={28} width={78} height={17} rx={6} fill="#252638" stroke={bright} />
            <Rect x={61} y={151} width={78} height={15} rx={5} fill="#252638" stroke={bright} />
            {[72, 87, 102, 117, 132].map((y) => (
              <Line key={y} x1={123} x2={132} y1={y} y2={y} stroke={bright} strokeOpacity={0.65} />
            ))}
            <Line x1={73} x2={73} y1={50} y2={145} stroke="#8FEAFF" strokeWidth={3} opacity={0.5} />
            <Circle cx={100} cy={36} r={3} fill="#88EEFF" />
          </>
        ) : carafe ? (
          <>
            <Path d="M 84 37 V 25 L 91 17 H 109 L 116 25 V 37 Z" fill="#291A25" stroke={bright} />
            <Line x1={86} x2={114} y1={45} y2={45} stroke={bright} strokeWidth={3} />
            <Path
              d="M 74 94 Q 65 122 68 145"
              fill="none"
              stroke="#FFF5D9"
              strokeWidth={4}
              strokeOpacity={0.45}
              strokeLinecap="round"
            />
            <Rect
              x={81}
              y={108}
              width={38}
              height={27}
              rx={5}
              fill={theme.colors.surface}
              stroke={bright}
            />
            <Path d="M 100 112 Q 86 130 100 132 Q 114 130 100 112" fill="#C23C5D" />
          </>
        ) : ink ? (
          <>
            <Ellipse
              cx={100}
              cy={68}
              rx={23}
              ry={7}
              fill="#182131"
              stroke="#F0B4C4"
              strokeWidth={2}
            />
            <G transform="translate(102 70) scale(0.72)">
              <PremiumQuill color="#AB5971" fill="#FFF4F7" />
            </G>
            <Path
              d="M 68 108 V 144"
              stroke="#FFFFFF"
              strokeWidth={5}
              strokeLinecap="round"
              opacity={0.7}
            />
            <Circle cx={94} cy={132} r={5} fill="#AD153D" />
            <Circle cx={107} cy={133} r={5} fill="#AD153D" />
            <Path d="M 95 128 L 104 119 L 108 129" stroke="#672E3D" fill="none" />
          </>
        ) : (
          <>
            <Ellipse cx={100} cy={37} rx={50} ry={9} fill="none" stroke={bright} />
            <Path
              d="M 62 49 L 68 135"
              stroke={theme.hydration.reflection}
              strokeOpacity={0.45}
              strokeWidth={4}
              strokeLinecap="round"
            />
            {[68, 90, 112, 134].map((y) => (
              <Line key={y} x1={128} x2={137} y1={y} y2={y} stroke={bright} strokeOpacity={0.6} />
            ))}
          </>
        )}
      </Svg>
      <Text
        style={{
          textAlign: 'center',
          color: theme.colors.text,
          fontFamily: 'SpaceGrotesk_700Bold',
          fontSize: 24,
          fontVariant: ['tabular-nums'],
        }}
      >
        {Math.round(normalized * 100)}%
      </Text>
    </View>
  );
}
