import React, { useState, useRef, useEffect } from 'react';
import { View, Text, Pressable, StyleSheet, Animated, Platform } from 'react-native';
import { useReducedMotion } from 'react-native-reanimated';
import Svg, { Path, Circle, G, Defs, RadialGradient, Stop, Ellipse } from 'react-native-svg';
import { MuscleGroup } from '@fitness-tracker/domain';
import { useTheme } from '@fitness-tracker/ui';
import { Ionicons } from '@expo/vector-icons';

type Region = { muscle: MuscleGroup; label: string; path: string; mirror?: boolean };
const front: Region[] = [
  {
    muscle: MuscleGroup.Chest,
    label: 'Brust',
    path: 'M98 72 Q84 65 70 76 L72 95 Q87 103 98 94 Z',
    mirror: true,
  },
  {
    muscle: MuscleGroup.FrontDelts,
    label: 'Schultern',
    path: 'M68 71 Q53 69 48 86 L47 101 Q57 99 66 92 Z',
    mirror: true,
  },
  {
    muscle: MuscleGroup.Biceps,
    label: 'Bizeps',
    path: 'M47 103 Q56 99 63 101 L58 126 Q52 140 43 132 Z',
    mirror: true,
  },
  {
    muscle: MuscleGroup.Forearms,
    label: 'Unterarme',
    path: 'M43 136 L55 137 Q51 156 41 177 L34 174 Z',
    mirror: true,
  },
  {
    muscle: MuscleGroup.Abs,
    label: 'Bauch',
    path: 'M87 103 L98 101 L98 154 L88 151 Q82 133 87 103 Z',
    mirror: true,
  },
  {
    muscle: MuscleGroup.Obliques,
    label: 'Seitlicher Bauch',
    path: 'M70 100 L83 104 L82 153 L74 161 Q71 135 70 100 Z',
    mirror: true,
  },
  {
    muscle: MuscleGroup.Quads,
    label: 'Oberschenkel',
    path: 'M73 168 Q85 161 97 167 L94 216 Q91 232 85 237 L76 232 Q69 201 73 168 Z',
    mirror: true,
  },
  {
    muscle: MuscleGroup.Calves,
    label: 'Waden',
    path: 'M76 246 L88 245 Q95 267 85 294 L80 311 L72 311 Q73 279 76 246 Z',
    mirror: true,
  },
];
const back: Region[] = [
  {
    muscle: MuscleGroup.Traps,
    label: 'Nacken',
    path: 'M97 56 L91 61 L71 74 L83 88 L98 107 Z',
    mirror: true,
  },
  {
    muscle: MuscleGroup.RearDelts,
    label: 'Schultern',
    path: 'M67 73 Q52 70 48 86 L47 100 L62 95 Z',
    mirror: true,
  },
  {
    muscle: MuscleGroup.Lats,
    label: 'Breiter Rücken',
    path: 'M70 95 L80 92 L98 111 L98 142 L83 132 Q75 118 70 95 Z',
    mirror: true,
  },
  {
    muscle: MuscleGroup.LowerBack,
    label: 'Unterer Rücken',
    path: 'M83 138 L98 149 L98 165 L77 160 Z',
    mirror: true,
  },
  {
    muscle: MuscleGroup.Triceps,
    label: 'Trizeps',
    path: 'M47 104 L62 101 L57 131 L44 134 Z',
    mirror: true,
  },
  {
    muscle: MuscleGroup.Forearms,
    label: 'Unterarme',
    path: 'M43 138 L55 138 Q50 159 40 178 L34 174 Z',
    mirror: true,
  },
  {
    muscle: MuscleGroup.Glutes,
    label: 'Gesäß',
    path: 'M77 165 Q88 170 98 168 L98 194 Q84 201 72 193 Z',
    mirror: true,
  },
  {
    muscle: MuscleGroup.Hamstrings,
    label: 'Beinrückseite',
    path: 'M72 199 Q86 204 96 197 L91 230 L78 238 Q73 222 72 199 Z',
    mirror: true,
  },
  {
    muscle: MuscleGroup.Calves,
    label: 'Waden',
    path: 'M76 246 L89 246 Q98 264 85 291 L81 311 L73 311 Q77 287 74 271 Z',
    mirror: true,
  },
];
const outline =
  'M91 53 L91 61 Q79 65 65 68 Q49 68 44 85 L38 117 L33 146 L25 180 Q24 189 29 193 L34 190 L42 176 L54 151 L63 128 L66 111 Q68 138 70 154 L66 180 Q64 204 69 232 L71 243 L67 280 L67 312 L61 325 Q65 331 79 328 L84 319 L88 294 L96 259 L100 219 L104 259 L112 294 L116 319 L121 328 Q135 331 139 325 L133 312 L133 280 L129 243 L131 232 Q136 204 134 180 L130 154 Q132 138 134 111 L137 128 L146 151 L158 176 L166 190 L171 193 Q176 189 175 180 L167 146 L162 117 L156 85 Q151 68 135 68 Q121 65 109 61 L109 53 Z';

export function MuscleHeatmap({
  activity,
  onSelect,
}: {
  activity: Partial<Record<MuscleGroup, number>>;
  onSelect: (muscle: MuscleGroup) => void;
}) {
  const theme = useTheme();
  const [side, setSide] = useState<'front' | 'back'>('front');
  const reducedMotion = useReducedMotion();
  const fade = useRef(new Animated.Value(1)).current;
  useEffect(() => () => fade.stopAnimation(), [fade]);
  const changeSide = (value: 'front' | 'back') => {
    fade.stopAnimation();
    Animated.timing(fade, {
      toValue: 0,
      duration: reducedMotion ? 0 : 80,
      useNativeDriver: Platform.OS !== 'web',
    }).start(({ finished }) => {
      if (!finished) return;
      setSide(value);
      Animated.timing(fade, {
        toValue: 1,
        duration: reducedMotion ? 0 : 160,
        useNativeDriver: Platform.OS !== 'web',
      }).start();
    });
  };
  const [width, setWidth] = useState(300);
  const regions = side === 'front' ? front : back;
  const maximum = Math.max(1, ...Object.values(activity));
  const color = (muscle: MuscleGroup) => {
    const count = activity[muscle] || 0;
    return count === 0
      ? '#344352'
      : count / maximum < 0.35
        ? '#386D89'
        : count / maximum < 0.7
          ? '#56A9CA'
          : '#A2E6FF';
  };
  const wide = width > 560;
  return (
    <View
      onLayout={(event) => setWidth(event.nativeEvent.layout.width)}
      style={[
        styles.card,
        { backgroundColor: theme.colors.surface, borderColor: theme.colors.border },
      ]}
    >
      <View style={styles.heading}>
        <View>
          <Text style={[styles.title, { color: theme.colors.text }]}>Dein Muskel-Fokus</Text>
          <Text style={[styles.subtitle, { color: theme.colors.muted }]}>
            Arbeitssätze · letzte 7 Tage
          </Text>
        </View>
        <Ionicons name="body-outline" size={24} color={theme.colors.primary} />
      </View>
      <View style={[styles.switch, { backgroundColor: theme.colors.background }]}>
        {(['front', 'back'] as const).map((value) => (
          <Pressable
            key={value}
            accessibilityRole="tab"
            accessibilityState={{ selected: side === value }}
            onPress={() => changeSide(value)}
            style={[styles.tab, side === value && { backgroundColor: theme.colors.surface }]}
          >
            <Text
              style={{
                color: side === value ? theme.colors.text : theme.colors.muted,
                fontWeight: '600',
              }}
            >
              {value === 'front' ? 'Vorderseite' : 'Rückseite'}
            </Text>
          </Pressable>
        ))}
      </View>
      <View style={{ flexDirection: wide ? 'row' : 'column', alignItems: 'center', gap: 16 }}>
        <Animated.View style={[styles.figure, { width: wide ? '45%' : '100%', opacity: fade }]}>
          <Svg
            width="100%"
            height={wide ? 400 : 360}
            viewBox="0 0 200 340"
            accessibilityLabel={
              side === 'front' ? 'Muskelkarte Vorderseite' : 'Muskelkarte Rückseite'
            }
          >
            <Defs>
              <RadialGradient id="muscleHalo">
                <Stop offset="0" stopColor="#77CAEF" stopOpacity=".10" />
                <Stop offset="1" stopColor="#77CAEF" stopOpacity="0" />
              </RadialGradient>
            </Defs>
            <Ellipse cx="100" cy="165" rx="94" ry="168" fill="url(#muscleHalo)" />
            <Circle cx="100" cy="33" r="19" fill="#26323D" stroke="#536575" strokeWidth=".7" />
            <Path d={outline} fill="#202B35" stroke="#536575" strokeWidth=".7" />
            {regions.map((region) => (
              <G key={region.muscle}>
                <Path
                  d={region.path}
                  fill={color(region.muscle)}
                  stroke="#17222C"
                  strokeWidth="1.2"
                  onPress={() => onSelect(region.muscle)}
                />
                {region.mirror && (
                  <G transform="translate(200 0) scale(-1 1)">
                    <Path
                      d={region.path}
                      fill={color(region.muscle)}
                      stroke="#17222C"
                      strokeWidth="1.2"
                      onPress={() => onSelect(region.muscle)}
                    />
                  </G>
                )}
              </G>
            ))}
          </Svg>
        </Animated.View>
        <View style={[styles.regions, { width: wide ? '50%' : '100%' }]}>
          {regions.map((region) => (
            <Pressable
              key={region.muscle}
              accessibilityRole="button"
              accessibilityLabel={`${region.label}: ${activity[region.muscle] || 0} Arbeitssätze. Übungen anzeigen`}
              onPress={() => onSelect(region.muscle)}
              style={[styles.region, { borderColor: theme.colors.border }]}
            >
              <View style={[styles.dot, { backgroundColor: color(region.muscle) }]} />
              <Text numberOfLines={1} style={{ color: theme.colors.text, flex: 1, fontSize: 12 }}>
                {region.label}
              </Text>
              <Text
                style={{ color: theme.colors.muted, fontVariant: ['tabular-nums'], fontSize: 12 }}
              >
                {activity[region.muscle] || 0}
              </Text>
            </Pressable>
          ))}
        </View>
      </View>
      <View style={styles.legend}>
        <Text style={{ color: theme.colors.muted, fontSize: 11 }}>Weniger</Text>
        {['#344352', '#386D89', '#56A9CA', '#A2E6FF'].map((fill) => (
          <View
            key={fill}
            style={{ backgroundColor: fill, width: 22, height: 5, borderRadius: 3 }}
          />
        ))}
        <Text style={{ color: theme.colors.muted, fontSize: 11 }}>Mehr Sätze</Text>
      </View>
      <Text style={[styles.subtitle, { color: theme.colors.muted, textAlign: 'center' }]}>
        Muskel oder Beschriftung antippen, um Übungen zu finden.
      </Text>
    </View>
  );
}
const styles = StyleSheet.create({
  card: {
    borderWidth: 1,
    borderRadius: 24,
    padding: 16,
    gap: 16,
    width: '100%',
    maxWidth: 900,
    alignSelf: 'center',
  },
  heading: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  title: { fontSize: 20, fontFamily: 'SpaceGrotesk_700Bold' },
  subtitle: { fontSize: 12, lineHeight: 18 },
  switch: { flexDirection: 'row', borderRadius: 14, padding: 4 },
  tab: { flex: 1, minHeight: 44, alignItems: 'center', justifyContent: 'center', borderRadius: 10 },
  figure: { alignItems: 'center' },
  regions: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  region: {
    width: '48%',
    flexGrow: 1,
    minHeight: 44,
    borderWidth: 1,
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    gap: 7,
  },
  dot: { width: 7, height: 7, borderRadius: 4 },
  legend: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6 },
});
