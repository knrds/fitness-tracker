import React, { useState, useRef, useEffect } from 'react';
import { View, Text, Pressable, StyleSheet, Animated, Platform } from 'react-native';
import { useReducedMotion } from 'react-native-reanimated';
import { AnatomyFigure } from './anatomy/AnatomyFigure';
import { MuscleGroup } from '@fitness-tracker/domain';
import { useTheme } from '@fitness-tracker/ui';
import { Ionicons } from '@expo/vector-icons';

type Region = { muscle: MuscleGroup; label: string };
const front: Region[] = [
  {
    muscle: MuscleGroup.Chest,
    label: 'Brust',
  },
  {
    muscle: MuscleGroup.FrontDelts,
    label: 'Schultern',
  },
  {
    muscle: MuscleGroup.Biceps,
    label: 'Bizeps',
  },
  {
    muscle: MuscleGroup.Forearms,
    label: 'Unterarme',
  },
  {
    muscle: MuscleGroup.Abs,
    label: 'Bauch',
  },
  {
    muscle: MuscleGroup.Obliques,
    label: 'Seitlicher Bauch',
  },
  {
    muscle: MuscleGroup.Quads,
    label: 'Oberschenkel',
  },
  {
    muscle: MuscleGroup.Calves,
    label: 'Waden',
  },
];
const back: Region[] = [
  {
    muscle: MuscleGroup.Traps,
    label: 'Nacken',
  },
  {
    muscle: MuscleGroup.RearDelts,
    label: 'Schultern',
  },
  {
    muscle: MuscleGroup.Lats,
    label: 'Breiter Rücken',
  },
  {
    muscle: MuscleGroup.LowerBack,
    label: 'Unterer Rücken',
  },
  {
    muscle: MuscleGroup.Triceps,
    label: 'Trizeps',
  },
  {
    muscle: MuscleGroup.Forearms,
    label: 'Unterarme',
  },
  {
    muscle: MuscleGroup.Glutes,
    label: 'Gesäß',
  },
  {
    muscle: MuscleGroup.Hamstrings,
    label: 'Beinrückseite',
  },
  {
    muscle: MuscleGroup.Calves,
    label: 'Waden',
  },
];
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
      ? theme.anatomy.base
      : count / maximum < 0.35
        ? theme.anatomy.heat[1]!
        : count / maximum < 0.7
          ? theme.colors.secondary
          : theme.colors.tertiary;
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
            aria-selected={side === value}
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
          <AnatomyFigure side={side} height={wide ? 440 : 420} color={color} onSelect={onSelect} />
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
        {[
          theme.anatomy.base,
          theme.anatomy.heat[1]!,
          theme.colors.secondary,
          theme.colors.tertiary,
        ].map((fill) => (
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
