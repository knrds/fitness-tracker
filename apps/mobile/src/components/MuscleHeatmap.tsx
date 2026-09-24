import React, { useState, useRef, useEffect } from 'react';
import { View, Text, Pressable, StyleSheet, Animated, Platform } from 'react-native';
import { useReducedMotion } from 'react-native-reanimated';
import { AnatomyFigure } from './anatomy/AnatomyFigure';
import { MuscleGroup } from '@fitness-tracker/domain';
import { useTheme } from '@fitness-tracker/ui';
import { Ionicons } from '@expo/vector-icons';
import { useI18n, formatMuscle } from '../i18n';

const frontMuscles: MuscleGroup[] = [
  MuscleGroup.Chest,
  MuscleGroup.FrontDelts,
  MuscleGroup.Biceps,
  MuscleGroup.Forearms,
  MuscleGroup.Abs,
  MuscleGroup.Obliques,
  MuscleGroup.Quads,
  MuscleGroup.Calves,
];

const backMuscles: MuscleGroup[] = [
  MuscleGroup.Traps,
  MuscleGroup.RearDelts,
  MuscleGroup.Lats,
  MuscleGroup.LowerBack,
  MuscleGroup.Triceps,
  MuscleGroup.Forearms,
  MuscleGroup.Glutes,
  MuscleGroup.Hamstrings,
  MuscleGroup.Calves,
];

export function MuscleHeatmap({
  activity,
  onSelect,
}: {
  activity: Partial<Record<MuscleGroup, number>>;
  onSelect: (muscle: MuscleGroup) => void;
}) {
  const theme = useTheme();
  const { t, language } = useI18n();
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
  const currentMuscles = side === 'front' ? frontMuscles : backMuscles;
  const maximum = Math.max(1, ...Object.values(activity));
  const color = (muscle: MuscleGroup) => {
    const count = activity[muscle] || 0;
    return count === 0
      ? theme.anatomy.base
      : count / maximum < 0.35
        ? theme.anatomy.heat[1]!
        : count / maximum < 0.7
          ? theme.anatomy.heat[2]!
          : theme.anatomy.heat[3]!;
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
          <Text style={[styles.title, { color: theme.colors.text }]}>{t('muscles.muscleFocus')}</Text>
          <Text style={[styles.subtitle, { color: theme.colors.muted }]}>
            {t('muscles.workingSets7Days')}
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
              {value === 'front' ? t('muscles.front') : t('muscles.back')}
            </Text>
          </Pressable>
        ))}
      </View>
      <View style={{ flexDirection: wide ? 'row' : 'column', alignItems: 'center', gap: 16 }}>
        <Animated.View style={[styles.figure, { width: wide ? '45%' : '100%', opacity: fade }]}>
          <AnatomyFigure side={side} height={wide ? 440 : 420} color={color} onSelect={onSelect} />
        </Animated.View>
        <View style={[styles.regions, { width: wide ? '50%' : '100%' }]}>
          {currentMuscles.map((muscle) => {
            const label = formatMuscle(muscle, language);
            const count = activity[muscle] || 0;
            return (
              <Pressable
                key={muscle}
                accessibilityRole="button"
                accessibilityLabel={t('muscles.exercisesForMuscle')
                  .replace('{label}', label)
                  .replace('{count}', String(count))}
                onPress={() => onSelect(muscle)}
                style={[styles.region, { borderColor: theme.colors.border }]}
              >
                <View style={[styles.dot, { backgroundColor: color(muscle) }]} />
                <Text numberOfLines={1} style={{ color: theme.colors.text, flex: 1, fontSize: 12 }}>
                  {label}
                </Text>
                <Text
                  style={{ color: theme.colors.muted, fontVariant: ['tabular-nums'], fontSize: 12 }}
                >
                  {count}
                </Text>
              </Pressable>
            );
          })}
        </View>
      </View>
      <View style={styles.legend}>
        <Text style={{ color: theme.colors.muted, fontSize: 11 }}>{t('muscles.less')}</Text>
        {[
          theme.anatomy.base,
          theme.anatomy.heat[1]!,
          theme.anatomy.heat[2]!,
          theme.anatomy.heat[3]!,
        ].map((fill) => (
          <View
            key={fill}
            style={{ backgroundColor: fill, width: 22, height: 5, borderRadius: 3 }}
          />
        ))}
        <Text style={{ color: theme.colors.muted, fontSize: 11 }}>{t('muscles.moreSets')}</Text>
      </View>
      <Text style={[styles.subtitle, { color: theme.colors.muted, textAlign: 'center' }]}>
        {t('muscles.tapHint')}
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
