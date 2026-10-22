import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useTheme, withAlpha } from '@fitness-tracker/ui';
import { hapticFeedback } from '../../utils/haptics';

export type ChartRange = '1m' | '3m' | '6m' | '1y' | 'all';

const RANGE_DAYS: Record<Exclude<ChartRange, 'all'>, number> = { '1m': 31, '3m': 92, '6m': 183, '1y': 366 };

/** Keeps entries inside the trailing range, measured from `now`. */
export function filterByRange<T>(
  items: readonly T[],
  range: ChartRange,
  timeOf: (item: T) => number,
  now = Date.now(),
): T[] {
  if (range === 'all') return [...items];
  const since = now - RANGE_DAYS[range] * 86_400_000;
  return items.filter((item) => timeOf(item) >= since);
}

export function ChartRangePicker({
  value,
  onChange,
  language,
}: {
  value: ChartRange;
  onChange: (range: ChartRange) => void;
  language: 'de' | 'en';
}) {
  const theme = useTheme();
  const c = theme.colors;
  const options: { value: ChartRange; label: string }[] = [
    { value: '1m', label: language === 'de' ? '1 M' : '1M' },
    { value: '3m', label: language === 'de' ? '3 M' : '3M' },
    { value: '6m', label: language === 'de' ? '6 M' : '6M' },
    { value: '1y', label: language === 'de' ? '1 J' : '1Y' },
    { value: 'all', label: language === 'de' ? 'Alle' : 'All' },
  ];
  return (
    <View style={styles.row} accessibilityRole="tablist">
      {options.map((option) => {
        const active = option.value === value;
        return (
          <Pressable
            key={option.value}
            accessibilityRole="tab"
            accessibilityState={{ selected: active }}
            hitSlop={6}
            onPress={() => {
              if (active) return;
              void hapticFeedback.selection();
              onChange(option.value);
            }}
            style={[
              styles.pill,
              { backgroundColor: active ? withAlpha(c.primary, 0.16) : 'transparent' },
            ]}
          >
            <Text style={[styles.text, { color: active ? c.primary : c.muted }]}>{option.label}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', justifyContent: 'space-between', alignSelf: 'stretch', marginTop: 8 },
  pill: { minWidth: 44, minHeight: 30, paddingHorizontal: 10, borderRadius: 999, alignItems: 'center', justifyContent: 'center' },
  text: { fontFamily: 'SpaceGrotesk_600SemiBold', fontSize: 12, letterSpacing: 0.3 },
});
