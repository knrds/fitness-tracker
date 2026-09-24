import React, { useRef, useEffect, useState, useMemo, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  Pressable,
  StyleSheet,
  NativeSyntheticEvent,
  NativeScrollEvent,
  Platform,
  ViewStyle,
} from 'react-native';
import { useTheme, withAlpha } from '@fitness-tracker/ui';
import { hapticFeedback } from '../utils/haptics';

export interface DateWheelPickerProps {
  value?: Date;
  onChange: (date: Date) => void;
  minYear?: number;
  maxYear?: number;
  locale?: 'de' | 'en';
  disabled?: boolean;
}

const ITEM_HEIGHT = 44;
const VISIBLE_ITEMS = 5;
const CONTAINER_HEIGHT = ITEM_HEIGHT * VISIBLE_ITEMS; // 220
const CENTER_OFFSET = Math.floor(VISIBLE_ITEMS / 2) * ITEM_HEIGHT; // 88

export const MONTH_NAMES_DE = [
  'Januar',
  'Februar',
  'März',
  'April',
  'Mai',
  'Juni',
  'Juli',
  'August',
  'September',
  'Oktober',
  'November',
  'Dezember',
];

export const MONTH_NAMES_EN = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
];

export function getDaysInMonth(year: number, monthZeroIndexed: number): number {
  return new Date(year, monthZeroIndexed + 1, 0).getDate();
}

interface WheelColumnProps {
  items: (string | number)[];
  selectedIndex: number;
  onSelect: (index: number) => void;
  width: number;
  disabled?: boolean;
  align?: 'left' | 'center' | 'right';
  accessibilityLabel: string;
}

type ExtendedViewStyle = ViewStyle & {
  outline?: string;
  scrollbarWidth?: string;
  msOverflowStyle?: string;
};

interface WebDomEventProps {
  tabIndex?: number;
  onKeyDown?: (e: React.KeyboardEvent) => void;
}

const WheelColumn: React.FC<WheelColumnProps> = ({
  items,
  selectedIndex,
  onSelect,
  width,
  disabled = false,
  align = 'center',
  accessibilityLabel,
}) => {
  const theme = useTheme();
  const scrollViewRef = useRef<ScrollView>(null);
  const isScrollingRef = useRef(false);
  const webScrollTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Sync scroll position whenever selectedIndex changes
  useEffect(() => {
    if (!isScrollingRef.current && scrollViewRef.current) {
      scrollViewRef.current.scrollTo({
        y: selectedIndex * ITEM_HEIGHT,
        animated: false,
      });
    }
  }, [selectedIndex]);

  // Clean up web scroll timer
  useEffect(() => {
    return () => {
      if (webScrollTimeoutRef.current) {
        clearTimeout(webScrollTimeoutRef.current);
      }
    };
  }, []);

  const handleScrollEnd = useCallback(
    (offsetY: number) => {
      isScrollingRef.current = false;
      const newIndex = Math.max(
        0,
        Math.min(items.length - 1, Math.round(offsetY / ITEM_HEIGHT)),
      );
      if (newIndex !== selectedIndex) {
        void hapticFeedback.selection();
        onSelect(newIndex);
      }
    },
    [items.length, selectedIndex, onSelect],
  );

  const handleScroll = useCallback(
    (e: NativeSyntheticEvent<NativeScrollEvent>) => {
      if (Platform.OS === 'web') {
        if (webScrollTimeoutRef.current) {
          clearTimeout(webScrollTimeoutRef.current);
        }
        const offsetY = e.nativeEvent.contentOffset.y;
        webScrollTimeoutRef.current = setTimeout(() => {
          handleScrollEnd(offsetY);
          const targetIndex = Math.max(
            0,
            Math.min(items.length - 1, Math.round(offsetY / ITEM_HEIGHT)),
          );
          scrollViewRef.current?.scrollTo({
            y: targetIndex * ITEM_HEIGHT,
            animated: true,
          });
        }, 120);
      }
    },
    [items.length, handleScrollEnd],
  );

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (disabled) return;
      let newIndex = selectedIndex;
      if (e.key === 'ArrowUp') {
        newIndex = Math.max(0, selectedIndex - 1);
      } else if (e.key === 'ArrowDown') {
        newIndex = Math.min(items.length - 1, selectedIndex + 1);
      } else if (e.key === 'PageUp') {
        newIndex = Math.max(0, selectedIndex - 5);
      } else if (e.key === 'PageDown') {
        newIndex = Math.min(items.length - 1, selectedIndex + 5);
      } else if (e.key === 'Home') {
        newIndex = 0;
      } else if (e.key === 'End') {
        newIndex = items.length - 1;
      } else {
        return;
      }

      if (newIndex !== selectedIndex) {
        e.preventDefault?.();
        isScrollingRef.current = true;
        void hapticFeedback.selection();
        onSelect(newIndex);
        scrollViewRef.current?.scrollTo({
          y: newIndex * ITEM_HEIGHT,
          animated: true,
        });
      }
    },
    [disabled, selectedIndex, items.length, onSelect],
  );

  const webWrapperStyle: ExtendedViewStyle | undefined =
    Platform.OS === 'web' ? { outline: 'none' } : undefined;

  const webScrollStyle: ExtendedViewStyle | undefined =
    Platform.OS === 'web'
      ? { scrollbarWidth: 'none', msOverflowStyle: 'none' }
      : undefined;

  const webEventProps: WebDomEventProps =
    Platform.OS === 'web'
      ? {
          tabIndex: disabled ? -1 : 0,
          onKeyDown: handleKeyDown,
        }
      : {};

  return (
    <View
      style={[styles.columnWrapper, { width }, webWrapperStyle]}
      accessible={true}
      accessibilityRole="adjustable"
      accessibilityLabel={accessibilityLabel}
      accessibilityValue={{ text: String(items[selectedIndex] ?? '') }}
      accessibilityActions={[
        { name: 'increment', label: 'Nächster Wert / Next Value' },
        { name: 'decrement', label: 'Vorheriger Wert / Previous Value' },
      ]}
      onAccessibilityAction={(event) => {
        if (disabled) return;
        if (event.nativeEvent.actionName === 'increment') {
          const next = Math.min(items.length - 1, selectedIndex + 1);
          if (next !== selectedIndex) {
            void hapticFeedback.selection();
            onSelect(next);
            scrollViewRef.current?.scrollTo({
              y: next * ITEM_HEIGHT,
              animated: true,
            });
          }
        } else if (event.nativeEvent.actionName === 'decrement') {
          const prev = Math.max(0, selectedIndex - 1);
          if (prev !== selectedIndex) {
            void hapticFeedback.selection();
            onSelect(prev);
            scrollViewRef.current?.scrollTo({
              y: prev * ITEM_HEIGHT,
              animated: true,
            });
          }
        }
      }}
      {...(webEventProps as unknown as Record<string, unknown>)}
    >
      <ScrollView
        ref={scrollViewRef}
        showsVerticalScrollIndicator={false}
        contentOffset={{ x: 0, y: selectedIndex * ITEM_HEIGHT }}
        snapToInterval={ITEM_HEIGHT}
        snapToAlignment="center"
        decelerationRate="fast"
        bounces={true}
        overScrollMode="never"
        nestedScrollEnabled={true}
        scrollEventThrottle={16}
        contentContainerStyle={{
          paddingTop: CENTER_OFFSET,
          paddingBottom: CENTER_OFFSET,
        }}
        onScrollBeginDrag={() => {
          isScrollingRef.current = true;
        }}
        onScroll={handleScroll}
        onMomentumScrollEnd={(e) =>
          handleScrollEnd(e.nativeEvent.contentOffset.y)
        }
        onScrollEndDrag={(e) => {
          // Commit once momentum settles; updating during deceleration snaps the wheel.
          if (Math.abs(e.nativeEvent.velocity?.y ?? 0) < 0.02)
            handleScrollEnd(e.nativeEvent.contentOffset.y);
        }}
        scrollEnabled={!disabled}
        style={webScrollStyle}
      >
        {items.map((item, index) => {
          const isSelected = index === selectedIndex;
          const distance = Math.abs(index - selectedIndex);
          const opacity = isSelected ? 1 : distance === 1 ? 0.85 : 0.55;

          return (
            <Pressable
              key={`${item}-${index}`}
              onPress={() => {
                if (disabled || isSelected) return;
                isScrollingRef.current = true;
                void hapticFeedback.selection();
                onSelect(index);
                scrollViewRef.current?.scrollTo({
                  y: index * ITEM_HEIGHT,
                  animated: true,
                });
              }}
              style={[
                styles.itemRow,
                {
                  height: ITEM_HEIGHT,
                  justifyContent:
                    align === 'left'
                      ? 'flex-start'
                      : align === 'right'
                        ? 'flex-end'
                        : 'center',
                },
              ]}
              hitSlop={4}
            >
              <Text
                style={[
                  styles.itemText,
                  {
                    color: isSelected ? theme.colors.text : theme.colors.muted,
                    fontWeight: isSelected ? '700' : '500',
                    fontSize: isSelected ? 19 : 17,
                    fontVariant: ['tabular-nums'],
                    opacity,
                  },
                ]}
                numberOfLines={1}
              >
                {item}
              </Text>
            </Pressable>
          );
        })}
      </ScrollView>
    </View>
  );
};

export const DateWheelPicker: React.FC<DateWheelPickerProps> = ({
  value,
  onChange,
  minYear = 1920,
  maxYear = new Date().getFullYear(),
  locale = 'de',
  disabled = false,
}) => {
  const theme = useTheme();

  // Selected date components
  const [dateState, setDateState] = useState(() => {
    const current = value || new Date(2000, 0, 1);
    return {
      day: current.getDate(),
      month: current.getMonth(),
      year: current.getFullYear(),
    };
  });

  // Sync when value changes externally
  useEffect(() => {
    if (value) {
      setDateState({
        day: value.getDate(),
        month: value.getMonth(),
        year: value.getFullYear(),
      });
    }
  }, [value]);

  const months = useMemo(
    () => (locale === 'de' ? MONTH_NAMES_DE : MONTH_NAMES_EN),
    [locale],
  );

  // Descending years (e.g. 2026 down to 1920) for easy birthdate selection
  const years = useMemo(() => {
    const list: number[] = [];
    for (let y = maxYear; y >= minYear; y--) {
      list.push(y);
    }
    return list;
  }, [maxYear, minYear]);

  // Dynamic days count in current month and year
  const daysInMonth = useMemo(
    () => getDaysInMonth(dateState.year, dateState.month),
    [dateState.year, dateState.month],
  );

  const days = useMemo(() => {
    const list: number[] = [];
    for (let d = 1; d <= daysInMonth; d++) {
      list.push(d);
    }
    return list;
  }, [daysInMonth]);

  const handleDaySelect = useCallback(
    (index: number) => {
      const selectedDay = days[index] ?? 1;
      const nextDate = new Date(dateState.year, dateState.month, selectedDay);
      setDateState((prev) => ({ ...prev, day: selectedDay }));
      onChange(nextDate);
    },
    [days, dateState.year, dateState.month, onChange],
  );

  const handleMonthSelect = useCallback(
    (monthIndex: number) => {
      const nextDaysInMonth = getDaysInMonth(dateState.year, monthIndex);
      const clampedDay = Math.min(dateState.day, nextDaysInMonth);
      const nextDate = new Date(dateState.year, monthIndex, clampedDay);
      setDateState((prev) => ({
        ...prev,
        month: monthIndex,
        day: clampedDay,
      }));
      onChange(nextDate);
    },
    [dateState.year, dateState.day, onChange],
  );

  const handleYearSelect = useCallback(
    (yearIndex: number) => {
      const selectedYear = years[yearIndex] ?? maxYear;
      const nextDaysInMonth = getDaysInMonth(selectedYear, dateState.month);
      const clampedDay = Math.min(dateState.day, nextDaysInMonth);
      const nextDate = new Date(selectedYear, dateState.month, clampedDay);
      setDateState((prev) => ({
        ...prev,
        year: selectedYear,
        day: clampedDay,
      }));
      onChange(nextDate);
    },
    [years, maxYear, dateState.month, dateState.day, onChange],
  );

  const dayIndex = Math.max(0, Math.min(days.length - 1, dateState.day - 1));
  const monthIndex = Math.max(0, Math.min(11, dateState.month));
  const yearIndex = Math.max(0, years.indexOf(dateState.year));

  return (
    <View
      style={[
        styles.container,
        {
          height: CONTAINER_HEIGHT,
          backgroundColor: theme.colors.surfaceElevated,
          borderColor: theme.colors.border,
        },
      ]}
    >
      {/* Centered Selection Lens */}
      <View
        pointerEvents="none"
        style={[
          styles.selectionLens,
          {
            top: CENTER_OFFSET,
            height: ITEM_HEIGHT,
            backgroundColor: withAlpha(theme.colors.primary, 0.12),
            borderColor: withAlpha(theme.colors.primary, 0.4),
          },
        ]}
      />

      {/* Top and Bottom Gradient/Fade Bars */}
      <View
        pointerEvents="none"
        style={[
          styles.fadeTop,
          {
            height: CENTER_OFFSET,
            backgroundColor: theme.colors.surfaceElevated,
            opacity: 0.22,
          },
        ]}
      />
      <View
        pointerEvents="none"
        style={[
          styles.fadeBottom,
          {
            height: CENTER_OFFSET,
            backgroundColor: theme.colors.surfaceElevated,
            opacity: 0.22,
          },
        ]}
      />

      {/* 3 Wheel Columns: Day, Month, Year */}
      <View style={styles.columnsContainer}>
        <WheelColumn
          items={days}
          selectedIndex={dayIndex}
          onSelect={handleDaySelect}
          width={65}
          disabled={disabled}
          align="center"
          accessibilityLabel={locale === 'de' ? 'Tag auswählen' : 'Select Day'}
        />

        <WheelColumn
          items={months}
          selectedIndex={monthIndex}
          onSelect={handleMonthSelect}
          width={135}
          disabled={disabled}
          align="center"
          accessibilityLabel={
            locale === 'de' ? 'Monat auswählen' : 'Select Month'
          }
        />

        <WheelColumn
          items={years}
          selectedIndex={yearIndex >= 0 ? yearIndex : 0}
          onSelect={handleYearSelect}
          width={80}
          disabled={disabled}
          align="center"
          accessibilityLabel={locale === 'de' ? 'Jahr auswählen' : 'Select Year'}
        />
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'relative',
    borderRadius: 16,
    borderWidth: 1,
    overflow: 'hidden',
    justifyContent: 'center',
    alignItems: 'center',
  },
  columnsContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    width: '100%',
    paddingHorizontal: 8,
  },
  columnWrapper: {
    height: CONTAINER_HEIGHT,
    flexShrink: 1,
    minWidth: 0,
  },
  itemRow: {
    alignItems: 'center',
    paddingHorizontal: 6,
  },
  itemText: {
    textAlign: 'center',
  },
  selectionLens: {
    position: 'absolute',
    left: 12,
    right: 12,
    borderTopWidth: 1.5,
    borderBottomWidth: 1.5,
    borderRadius: 10,
    zIndex: 1,
  },
  fadeTop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 2,
  },
  fadeBottom: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    zIndex: 2,
  },
});
