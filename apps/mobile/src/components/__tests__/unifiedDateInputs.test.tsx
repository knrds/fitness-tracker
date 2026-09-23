import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import {
  DatePickerModal,
  parseDateOrDefault,
  toIsoDateString,
} from '../DatePickerModal';
import { DateWheelPicker, getDaysInMonth } from '../DateWheelPicker';

describe('Unified Date Inputs & DateWheelPicker Suite', () => {
  describe('1. Date Normalization & Calendar Bounds', () => {
    test('leap year handles Feb 29 correctly', () => {
      expect(getDaysInMonth(2024, 1)).toBe(29); // 2024 is a leap year
      expect(getDaysInMonth(2023, 1)).toBe(28); // 2023 is not
      expect(getDaysInMonth(2000, 1)).toBe(29); // 2000 is a leap year
      expect(getDaysInMonth(1900, 1)).toBe(28); // 1900 is not
    });

    test('30-day and 31-day months return correct days', () => {
      expect(getDaysInMonth(2026, 0)).toBe(31); // Jan
      expect(getDaysInMonth(2026, 3)).toBe(30); // Apr
      expect(getDaysInMonth(2026, 4)).toBe(31); // May
      expect(getDaysInMonth(2026, 5)).toBe(30); // Jun
      expect(getDaysInMonth(2026, 6)).toBe(31); // Jul
      expect(getDaysInMonth(2026, 7)).toBe(31); // Aug
    });

    test('parseDateOrDefault parses valid ISO dates and falls back properly', () => {
      const parsed = parseDateOrDefault('2024-02-29');
      expect(parsed.getFullYear()).toBe(2024);
      expect(parsed.getMonth()).toBe(1);
      expect(parsed.getDate()).toBe(29);

      const todayFallback = parseDateOrDefault(undefined, true);
      const now = new Date();
      expect(todayFallback.getFullYear()).toBe(now.getFullYear());
      expect(todayFallback.getMonth()).toBe(now.getMonth());
      expect(todayFallback.getDate()).toBe(now.getDate());

      const birthFallback = parseDateOrDefault(undefined, false);
      expect(birthFallback.getFullYear()).toBe(now.getFullYear() - 25);
    });

    test('toIsoDateString produces YYYY-MM-DD format', () => {
      const date = new Date(2026, 5, 2); // June 2, 2026
      expect(toIsoDateString(date)).toBe('2026-06-02');
    });
  });

  describe('2. DatePickerModal Shared Configuration', () => {
    test('renders with custom title for Body Metrics (German)', () => {
      const { getByText } = render(
        <DatePickerModal
          visible={true}
          value="2026-05-15"
          onConfirm={jest.fn()}
          onClose={jest.fn()}
          language="de"
          title="Messdatum"
        />,
      );

      expect(getByText('Messdatum')).toBeTruthy();
      expect(getByText('15. Mai 2026')).toBeTruthy();
      expect(getByText('Fertig')).toBeTruthy();
      expect(getByText('Abbrechen')).toBeTruthy();
    });

    test('renders with custom title for Body Metrics (English)', () => {
      const { getByText } = render(
        <DatePickerModal
          visible={true}
          value="2026-05-15"
          onConfirm={jest.fn()}
          onClose={jest.fn()}
          language="en"
          title="Measurement Date"
        />,
      );

      expect(getByText('Measurement Date')).toBeTruthy();
      expect(getByText('May 15, 2026')).toBeTruthy();
      expect(getByText('Done')).toBeTruthy();
      expect(getByText('Cancel')).toBeTruthy();
    });

    test('hides age preview when showAge is false', () => {
      const { queryByText } = render(
        <DatePickerModal
          visible={true}
          value="2000-01-01"
          onConfirm={jest.fn()}
          onClose={jest.fn()}
          language="de"
          showAge={false}
        />,
      );

      expect(queryByText(/Jahre/i)).toBeNull();
    });

    test('shows age preview when showAge is true', () => {
      const { getByText } = render(
        <DatePickerModal
          visible={true}
          value="2000-01-01"
          onConfirm={jest.fn()}
          onClose={jest.fn()}
          language="de"
          showAge={true}
        />,
      );

      expect(getByText(/Jahre/i)).toBeTruthy();
    });

    test('clamps future date when maxDate is set', () => {
      const onConfirm = jest.fn();
      const maxDate = new Date(2026, 8, 23); // 2026-09-23

      const { getByText } = render(
        <DatePickerModal
          visible={true}
          value="2026-09-23"
          onConfirm={onConfirm}
          onClose={jest.fn()}
          maxDate={maxDate}
        />,
      );

      fireEvent.press(getByText('Fertig'));
      expect(onConfirm).toHaveBeenCalledWith('2026-09-23');
    });
  });

  describe('3. Native Wheel Picker Interactions', () => {
    test('renders days, months and years in wheel columns', () => {
      const onChange = jest.fn();
      const { getByLabelText } = render(
        <DateWheelPicker
          value={new Date(2026, 4, 15)}
          onChange={onChange}
          locale="de"
        />,
      );

      expect(getByLabelText('Tag auswählen')).toBeTruthy();
      expect(getByLabelText('Monat auswählen')).toBeTruthy();
      expect(getByLabelText('Jahr auswählen')).toBeTruthy();
    });
  });
});
