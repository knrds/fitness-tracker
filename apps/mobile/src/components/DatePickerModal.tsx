import React, { useState, useEffect } from 'react';
import {
  Modal,
  View,
  Text,
  Pressable,
  StyleSheet,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme, withAlpha } from '@fitness-tracker/ui';
import { calculateAge } from '@fitness-tracker/domain';
import {
  DateWheelPicker,
  MONTH_NAMES_DE,
  MONTH_NAMES_EN,
} from './DateWheelPicker';

export interface DatePickerModalProps {
  visible: boolean;
  value?: string; // ISO string 'YYYY-MM-DD' or birth year 'YYYY'
  onConfirm: (isoDate: string) => void;
  onClear?: () => void;
  onClose: () => void;
  language?: 'de' | 'en';
  title?: string;
  showAge?: boolean;
  minYear?: number;
  maxYear?: number;
  maxDate?: Date;
  minDate?: Date;
  defaultToToday?: boolean;
  clearLabel?: string;
  allowClear?: boolean;
}

export function toIsoDateString(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export function parseDateOrDefault(value?: string, defaultToToday = false): Date {
  if (value && /^\d{4}-\d{2}-\d{2}$/.test(value.trim())) {
    const [yStr, mStr, dStr] = value.trim().split('-');
    const parsed = new Date(Number(yStr), Number(mStr) - 1, Number(dStr));
    if (!isNaN(parsed.getTime())) return parsed;
  }
  if (value && /^\d{4}$/.test(value.trim())) {
    const year = Number(value.trim());
    if (year >= 1900 && year <= new Date().getFullYear()) {
      return new Date(year, 0, 1);
    }
  }
  if (defaultToToday) {
    return new Date();
  }
  // Default fallback: 25 years ago
  const fallbackYear = new Date().getFullYear() - 25;
  return new Date(fallbackYear, 0, 1);
}

export const DatePickerModal: React.FC<DatePickerModalProps> = ({
  visible,
  value,
  onConfirm,
  onClear,
  onClose,
  language = 'de',
  title,
  showAge,
  minYear = 1920,
  maxYear,
  maxDate,
  minDate,
  defaultToToday = false,
  clearLabel,
  allowClear,
}) => {
  const theme = useTheme();
  const [selectedDate, setSelectedDate] = useState<Date>(() =>
    parseDateOrDefault(value, defaultToToday),
  );

  // Reset selected date whenever modal becomes visible
  useEffect(() => {
    if (visible) {
      setSelectedDate(parseDateOrDefault(value, defaultToToday));
    }
  }, [visible, value, defaultToToday]);

  const isoString = toIsoDateString(selectedDate);
  const effectiveShowAge = showAge ?? (title === undefined);
  const age = effectiveShowAge ? calculateAge(isoString) : undefined;

  const formattedDate = React.useMemo(() => {
    const day = selectedDate.getDate();
    const month = selectedDate.getMonth();
    const year = selectedDate.getFullYear();
    const monthName =
      language === 'de' ? MONTH_NAMES_DE[month] : MONTH_NAMES_EN[month];

    if (language === 'de') {
      return `${day}. ${monthName} ${year}`;
    }
    return `${monthName} ${day}, ${year}`;
  }, [selectedDate, language]);

  const handleDone = () => {
    let finalDate = selectedDate;
    if (maxDate && finalDate.getTime() > maxDate.getTime()) {
      finalDate = maxDate;
    }
    if (minDate && finalDate.getTime() < minDate.getTime()) {
      finalDate = minDate;
    }
    onConfirm(toIsoDateString(finalDate));
    onClose();
  };

  const handleClear = () => {
    if (onClear) {
      onClear();
    }
    onClose();
  };

  const defaultTitle = effectiveShowAge
    ? language === 'de'
      ? 'Geburtsdatum'
      : 'Date of Birth'
    : language === 'de'
      ? 'Datum auswählen'
      : 'Select Date';
  const modalTitle = title ?? defaultTitle;

  const effectiveMaxYear =
    maxYear ?? (maxDate ? maxDate.getFullYear() : new Date().getFullYear());

  const canClear = allowClear ?? Boolean(onClear);
  const effectiveClearLabel =
    clearLabel ??
    (effectiveShowAge
      ? language === 'de'
        ? 'Geburtsdatum entfernen'
        : 'Remove Date of Birth'
      : language === 'de'
        ? 'Datum entfernen'
        : 'Remove Date');

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <View style={styles.backdrop}>
        <Pressable
          style={styles.backdropDismiss}
          onPress={onClose}
          accessibilityLabel={language === 'de' ? 'Schließen' : 'Close'}
        />

        <View
          style={[
            styles.sheetContainer,
            {
              backgroundColor: theme.colors.surface,
              borderColor: theme.colors.border,
            },
          ]}
        >
          {/* iOS Handle Bar */}
          <View style={styles.handleContainer}>
            <View
              style={[
                styles.handleBar,
                { backgroundColor: withAlpha(theme.colors.text, 0.25) },
              ]}
            />
          </View>

          {/* Modal Header */}
          <View style={styles.header}>
            <Pressable
              onPress={onClose}
              hitSlop={12}
              accessibilityRole="button"
              accessibilityLabel={language === 'de' ? 'Abbrechen' : 'Cancel'}
            >
              <Text style={[styles.headerAction, { color: theme.colors.muted }]}>
                {language === 'de' ? 'Abbrechen' : 'Cancel'}
              </Text>
            </Pressable>

            <Text style={[styles.headerTitle, { color: theme.colors.text }]}>
              {modalTitle}
            </Text>

            <Pressable
              onPress={handleDone}
              hitSlop={12}
              accessibilityRole="button"
              accessibilityLabel={language === 'de' ? 'Fertig' : 'Done'}
            >
              <Text
                style={[
                  styles.headerAction,
                  styles.doneAction,
                  { color: theme.colors.primary },
                ]}
              >
                {language === 'de' ? 'Fertig' : 'Done'}
              </Text>
            </Pressable>
          </View>

          {/* Live Date & Optional Age Preview Chip */}
          <View
            style={[
              styles.previewBadge,
              {
                backgroundColor: withAlpha(theme.colors.primary, 0.08),
                borderColor: withAlpha(theme.colors.primary, 0.25),
              },
            ]}
          >
            <Ionicons
              name="calendar-outline"
              size={18}
              color={theme.colors.primary}
              style={{ marginRight: 8 }}
            />
            <Text
              style={[styles.previewDateText, { color: theme.colors.text }]}
            >
              {formattedDate}
            </Text>
            {effectiveShowAge && age !== undefined && (
              <Text
                style={[styles.previewAgeText, { color: theme.colors.primary }]}
              >
                {' '}
                • {age} {language === 'de' ? 'Jahre' : 'years'}
              </Text>
            )}
          </View>

          {/* Native Wheel Picker */}
          <View style={styles.pickerWrapper}>
            <DateWheelPicker
              value={selectedDate}
              onChange={setSelectedDate}
              locale={language}
              minYear={minYear}
              maxYear={effectiveMaxYear}
            />
          </View>

          {/* Optional Clear/Remove Date Button */}
          {canClear && Boolean(value && value.trim()) && (
            <Pressable
              onPress={handleClear}
              style={styles.clearBtn}
              accessibilityRole="button"
              accessibilityLabel={effectiveClearLabel}
            >
              <Ionicons
                name="trash-outline"
                size={16}
                color={theme.colors.error}
                style={{ marginRight: 6 }}
              />
              <Text
                style={[styles.clearBtnText, { color: theme.colors.error }]}
              >
                {effectiveClearLabel}
              </Text>
            </Pressable>
          )}
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.65)',
    justifyContent: 'flex-end',
  },
  backdropDismiss: {
    flex: 1,
  },
  sheetContainer: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    borderTopWidth: 1,
    borderLeftWidth: 1,
    borderRightWidth: 1,
    paddingHorizontal: 20,
    paddingTop: 10,
    paddingBottom: Platform.OS === 'ios' ? 36 : 24,
  },
  handleContainer: {
    alignItems: 'center',
    paddingVertical: 6,
  },
  handleBar: {
    width: 36,
    height: 4,
    borderRadius: 2,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    marginBottom: 8,
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: '700',
  },
  headerAction: {
    fontSize: 16,
    fontWeight: '500',
  },
  doneAction: {
    fontWeight: '700',
  },
  previewBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 16,
  },
  previewDateText: {
    fontSize: 15,
    fontWeight: '600',
  },
  previewAgeText: {
    fontSize: 15,
    fontWeight: '700',
  },
  pickerWrapper: {
    marginBottom: 12,
  },
  clearBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    marginTop: 4,
  },
  clearBtnText: {
    fontSize: 14,
    fontWeight: '600',
  },
});
