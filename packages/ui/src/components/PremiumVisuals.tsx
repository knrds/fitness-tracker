import React, { useId, useEffect, useState } from 'react';
import { View, Text, StyleSheet, Image } from 'react-native';
import Svg, { Defs, LinearGradient, Stop, Rect, Path, Circle, Ellipse, G } from 'react-native-svg';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withSequence,
  useReducedMotion,
} from 'react-native-reanimated';
import { useTheme } from '../ThemeProvider';
import { PremiumThemeSpec } from '../premium';
import energyEmblem from '../../assets/premium/energy.png';
import onyxEmblem from '../../assets/premium/thread.png';
import coffeeEmblem from '../../assets/premium/coffee.png';
import cherryEmblem from '../../assets/premium/cherry.png';

/** Bounded, local SVG materials; never receives events or paints above content. */
export function PremiumSurface({
  colors,
  radius = 0,
  testID = 'premium-surface',
  material,
  variation = 'signature',
}: {
  colors: readonly [string, string];
  radius?: number;
  testID?: string;
  material?: PremiumThemeSpec;
  variation?: PremiumMaterialVariation;
}) {
  const id = `material${useId().replace(/[^a-zA-Z0-9]/g, '')}`;
  return (
    <View
      testID={testID}
      pointerEvents="none"
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      style={[StyleSheet.absoluteFill, { borderRadius: radius, overflow: 'hidden' }]}
    >
      <Svg width="100%" height="100%" preserveAspectRatio="none">
        <Defs>
          <LinearGradient id={id} x1="0%" y1="0%" x2="100%" y2="100%">
            <Stop offset="0" stopColor={colors[0]} />
            <Stop offset="1" stopColor={colors[1]} />
          </LinearGradient>
        </Defs>
        <Rect width="100%" height="100%" fill={`url(#${id})`} />
        <Path d="M 8 1 H 2000" stroke={colors[0]} strokeWidth={2} opacity={0.5} />
      </Svg>
      {material && <PremiumMaterial spec={material} variation={variation} />}
    </View>
  );
}

const emblems = {
  energy: energyEmblem,
  thread: onyxEmblem,
  coffee: coffeeEmblem,
  cherry: cherryEmblem,
};

/** Local Higgsfield artwork, only in reserved emblem slots. Function icons stay familiar. */
export function PremiumMotif({ spec, size = 36 }: { spec?: PremiumThemeSpec; size?: number }) {
  const theme = useTheme();
  const visual = spec ?? theme.premium;
  if (!visual) return null;
  return (
    <View
      testID={`premium-motif-${visual.motif}`}
      pointerEvents="none"
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      style={{
        width: size,
        height: size,
        flexShrink: 0,
        borderRadius: size * 0.3,
        overflow: 'hidden',
      }}
    >
      <Image
        source={emblems[visual.motif]}
        resizeMode="cover"
        style={{ width: size, height: size }}
      />
    </View>
  );
}

/** Restrained edge materials. The center stays quiet for real values and text. */
export type PremiumMaterialVariation = 'quiet' | 'signature' | 'detail' | 'scattered';
export function PremiumMaterial({
  spec,
  variation = 'signature',
}: {
  spec: PremiumThemeSpec;
  variation?: PremiumMaterialVariation;
}) {
  const id = `edge${useId().replace(/[^a-zA-Z0-9]/g, '')}`;
  if (variation === 'quiet' && spec.motif !== 'energy') return null;
  return (
    <View
      pointerEvents="none"
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      testID={`premium-material-${spec.motif}-${variation}`}
      style={StyleSheet.absoluteFill}
    >
      <Svg
        width={spec.motif === 'energy' ? '100%' : 180}
        height={spec.motif === 'energy' ? '100%' : 190}
        style={
          spec.motif === 'energy'
            ? undefined
            : { position: 'absolute', right: 0, bottom: 0, maxWidth: '45%' }
        }
        preserveAspectRatio={spec.motif === 'energy' ? 'xMaxYMid slice' : 'xMaxYMax meet'}
        viewBox={spec.motif === 'energy' ? '0 0 600 240' : '420 0 200 240'}
      >
        <Defs>
          <LinearGradient id={id} x1="0%" x2="100%">
            <Stop offset="0.45" stopColor={spec.highlight} stopOpacity={0} />
            <Stop offset="1" stopColor={spec.highlight} stopOpacity={0.13} />
          </LinearGradient>
        </Defs>
        {spec.motif === 'thread' ? (
          <G fill="none" stroke={spec.highlight} strokeWidth={0.8} opacity={0.065}>
            {variation === 'signature' ? (
              <>
                {/* Gothic tracery cut into charcoal. No photographic texture across content. */}
                <Path d="M 480 240 V 99 Q 480 30 546 0 Q 612 30 612 99 V 240 M 492 240 V 100 Q 492 44 546 15 Q 600 44 600 100 V 240" />
                <Path d="M 546 26 V 240 M 480 115 Q 514 91 546 63 Q 578 91 612 115 M 480 190 Q 510 155 546 137 Q 582 155 612 190" />
                <Circle cx={546} cy={101} r={18} />
                <Path d="M 534 101 L 546 84 L 558 101 L 546 118 Z" />
              </>
            ) : variation === 'detail' ? (
              <>
                <Circle cx={563} cy={58} r={32} />
                <Circle cx={575} cy={49} r={26} strokeWidth={0.5} />
                <Path d="M 515 118 L 518 124 L 525 127 L 518 130 L 515 137 L 512 130 L 505 127 L 512 124 Z" />
              </>
            ) : (
              <>
                <Path d="M 586 30 L 599 54 L 586 77 L 573 54 Z M 539 169 L 548 183 L 539 197 L 530 183 Z" />
                <Path d="M 582 124 H 591 M 586 119 V 129 M 565 211 H 571 M 568 208 V 214" />
              </>
            )}
          </G>
        ) : spec.motif === 'energy' ? (
          <G fill="none" stroke={`url(#${id})`} strokeWidth={1}>
            {[0, 40, 80, 120, 160, 200, 240].map((y) => (
              <Path key={y} d={`M 340 ${y} H 600`} />
            ))}
            {[360, 400, 440, 480, 520, 560, 600].map((x) => (
              <Path key={x} d={`M ${x} 0 V 240`} />
            ))}
            <Path
              d="M 430 0 V 42 L 462 74 H 570 V 130 H 600 M 550 240 V 186 L 515 151 V 115"
              stroke={spec.highlight}
              strokeOpacity={0.11}
            />
          </G>
        ) : spec.motif === 'coffee' ? (
          <G fill="none" stroke={spec.highlight} opacity={0.08} strokeWidth={1.2}>
            {variation === 'detail' ? (
              <>
                <Path d="M 527 136 H 583 V 169 Q 555 196 531 169 Z M 583 143 Q 610 137 606 157 Q 602 171 583 165 M 523 190 Q 558 202 596 190 M 546 116 Q 534 107 546 95 M 565 116 Q 553 105 565 93" />
              </>
            ) : (
              <>
                <Ellipse cx={572} cy={153} rx={29} ry={41} transform="rotate(28 572 153)" />
                <Path d="M 584 119 C 557 142 584 166 561 188" />
                {variation === 'scattered' && (
                  <>
                    <Ellipse cx={527} cy={59} rx={14} ry={20} transform="rotate(-28 527 59)" />
                    <Path d="M 518 42 Q 537 58 527 78" />
                    <Ellipse cx={599} cy={224} rx={12} ry={17} transform="rotate(68 599 224)" />
                  </>
                )}
              </>
            )}
          </G>
        ) : (
          <G stroke={spec.highlight} strokeWidth={1.2} opacity={0.075}>
            {variation === 'signature' ? (
              <>
                <Path
                  d="M 564 162 Q 558 107 591 102 M 590 178 Q 599 124 591 102 Q 614 105 609 122 Q 596 120 591 102"
                  fill="none"
                />
                <Path
                  d="M 562 150 C 525 143 530 199 555 198 C 583 204 587 154 562 150 M 592 166 C 563 152 565 210 591 212 C 618 215 626 167 592 166"
                  fill={spec.highlight}
                  stroke="none"
                />
              </>
            ) : variation === 'detail' ? (
              <>
                <G transform="translate(558 181)">
                  <PremiumQuill color={spec.highlight} />
                </G>
                <Path
                  d="M 546 185 H 570 V 197 L 581 206 V 231 Q 558 240 535 231 V 206 L 546 197 Z"
                  fill="none"
                />
                <Ellipse cx={558} cy={185} rx={12} ry={3} fill="none" />
              </>
            ) : (
              <>
                <Path d="M 612 227 Q 551 169 578 104 Q 598 52 554 0" fill="none" />
                {[
                  { x: 570, y: 57, r: 13 },
                  { x: 571, y: 154, r: 17 },
                  { x: 599, y: 202, r: 9 },
                ].map(({ x, y, r }) => (
                  <G key={y} transform={`translate(${x} ${y})`} fill={spec.highlight} stroke="none">
                    {[0, 72, 144, 216, 288].map((angle) => (
                      <Ellipse
                        key={angle}
                        cx={0}
                        cy={-r * 0.65}
                        rx={r * 0.5}
                        ry={r * 0.8}
                        transform={`rotate(${angle})`}
                      />
                    ))}
                  </G>
                ))}
              </>
            )}
          </G>
        )}
      </Svg>
    </View>
  );
}

/** A reserved header row gives the theme room without overlaying functional content. */
export function PremiumSignature({ compact = false }: { compact?: boolean }) {
  const theme = useTheme();
  if (!theme.premium) return null;
  return (
    <View
      testID="premium-signature"
      pointerEvents="none"
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
        paddingVertical: compact ? 4 : 10,
      }}
    >
      <PremiumMotif size={compact ? 26 : 42} />
      <Text
        style={{
          color: theme.colors.text,
          flex: 1,
          fontSize: compact ? 10 : 11,
          letterSpacing: 1.5,
          fontWeight: '600',
        }}
      >
        {theme.premium.signature}
      </Text>
    </View>
  );
}

/** Mounted by the existing viewport celebration host, never by a scrolled card. */
export function PremiumSuccessAccent() {
  const theme = useTheme();
  const reduced = useReducedMotion();
  const opacity = useSharedValue(1);
  useEffect(() => {
    opacity.value = 1;
    if (!reduced) opacity.value = withTiming(0, { duration: 1100 });
  }, [theme.colorway, reduced, opacity]);
  const style = useAnimatedStyle(() => ({ opacity: opacity.value }));
  if (!theme.premium) return null;
  return (
    <Animated.View
      testID="premium-success-accent"
      pointerEvents="none"
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      style={[
        {
          position: 'absolute',
          top: 36,
          alignSelf: 'center',
          padding: 12,
          borderRadius: 36,
          borderWidth: 1,
          borderColor: theme.premium.highlight,
          backgroundColor: theme.colors.surface,
        },
        style,
      ]}
    >
      <PremiumMotif size={40} />
    </Animated.View>
  );
}

/** A single traveling specular reflection per press; disabled by Reduced Motion. */
export function PremiumEffect({ trigger = 0 }: { trigger?: number }) {
  const theme = useTheme();
  const reduced = useReducedMotion();
  const [width, setWidth] = useState(0);
  const travel = useSharedValue(0);
  const opacity = useSharedValue(0);
  useEffect(() => {
    travel.value = 0;
    opacity.value = 0;
    if (!theme.premium || reduced || !trigger) return;
    opacity.value = withSequence(
      withTiming(0.3, { duration: 100 }),
      withTiming(0, { duration: theme.premium.motion.achievement }),
    );
    travel.value = withTiming(1, { duration: theme.premium.motion.achievement });
  }, [trigger, reduced, theme.premium, travel, opacity]);
  const style = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [{ translateX: -70 + travel.value * (width + 140) }, { rotate: '18deg' }],
  }));
  if (!theme.premium) return null;
  return (
    <View
      testID="premium-effect"
      pointerEvents="none"
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      onLayout={(event) => setWidth(event.nativeEvent.layout.width)}
      style={[
        StyleSheet.absoluteFill,
        { overflow: 'hidden', borderRadius: theme.premium.buttonRadius },
      ]}
    >
      <Animated.View
        style={[
          {
            position: 'absolute',
            width: 40,
            top: -16,
            bottom: -16,
            backgroundColor: theme.premium.highlight,
          },
          style,
        ]}
      />
    </View>
  );
}

/** A single continuous feather and attached nib, reused at every illustration size. */
export function PremiumQuill({ color, fill = 'none' }: { color: string; fill?: string }) {
  return (
    <G fill={fill} stroke={color} strokeWidth={1.3} strokeLinecap="round" strokeLinejoin="round">
      <Path d="M 1 -4 C -2 -22 1 -38 16 -54 C 27 -68 36 -69 39 -85 C 47 -60 35 -30 14 -18 Z" />
      <Path
        d="M 0 8 C 5 -22 24 -51 38 -79 M 12 -29 L 5 -34 M 17 -40 L 12 -47 M 23 -50 L 20 -58 M 11 -27 L 22 -31 M 18 -42 L 31 -47 M 26 -56 L 37 -61"
        fill="none"
      />
    </G>
  );
}
