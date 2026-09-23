import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { getTranslation } from '../../i18n';
import {
  DateWheelPicker,
  getDaysInMonth,
  MONTH_NAMES_DE,
  MONTH_NAMES_EN,
} from '../DateWheelPicker';
import {
  DatePickerModal,
  toIsoDateString,
  parseDateOrDefault,
} from '../DatePickerModal';

jest.mock('../../utils/haptics', () => ({
  hapticFeedback: {
    selection: jest.fn().mockResolvedValue(undefined),
    impact: jest.fn().mockResolvedValue(undefined),
    notification: jest.fn().mockResolvedValue(undefined),
  },
}));

describe('Profile Header Translation & DateWheelPicker', () => {
  describe('1. settings.profile translation resolution', () => {
    test('resolves settings.profile to "Profil" in German', () => {
      expect(getTranslation('de', 'settings.profile')).toBe('Profil');
    });

    test('resolves settings.profile to "Profile" in English', () => {
      expect(getTranslation('en', 'settings.profile')).toBe('Profile');
    });

    test('resolves helper date picker keys in German and English', () => {
      expect(getTranslation('de', 'settings.selectDate')).toBe('Datum auswählen');
      expect(getTranslation('en', 'settings.selectDate')).toBe('Select Date');
      expect(getTranslation('de', 'settings.clearDate')).toBe('Datum entfernen');
      expect(getTranslation('en', 'settings.clearDate')).toBe('Remove Date');
      expect(getTranslation('de', 'settings.dateOfBirthModalTitle')).toBe('Geburtsdatum auswählen');
      expect(getTranslation('en', 'settings.dateOfBirthModalTitle')).toBe('Select Date of Birth');
    });
  });

  describe('2. DateWheelPicker logic & daysInMonth', () => {
    test('handles leap years correctly for February', () => {
      expect(getDaysInMonth(2024, 1)).toBe(29); // Leap year 2024
      expect(getDaysInMonth(2020, 1)).toBe(29); // Leap year 2020
      expect(getDaysInMonth(2000, 1)).toBe(29); // 400-year leap rule
      expect(getDaysInMonth(2023, 1)).toBe(28); // Non-leap year
      expect(getDaysInMonth(1900, 1)).toBe(28); // Century non-leap rule
    });

    test('handles 30-day and 31-day months correctly', () => {
      // 30 days: April (3), June (5), September (8), November (10)
      expect(getDaysInMonth(2024, 3)).toBe(30);
      expect(getDaysInMonth(2024, 5)).toBe(30);
      expect(getDaysInMonth(2024, 8)).toBe(30);
      expect(getDaysInMonth(2024, 10)).toBe(30);

      // 31 days: January (0), March (2), May (4), July (6), August (7), October (9), December (11)
      expect(getDaysInMonth(2024, 0)).toBe(31);
      expect(getDaysInMonth(2024, 2)).toBe(31);
      expect(getDaysInMonth(2024, 4)).toBe(31);
      expect(getDaysInMonth(2024, 6)).toBe(31);
      expect(getDaysInMonth(2024, 7)).toBe(31);
      expect(getDaysInMonth(2024, 9)).toBe(31);
      expect(getDaysInMonth(2024, 11)).toBe(31);
    });

    test('contains 12 localized months for DE and EN', () => {
      expect(MONTH_NAMES_DE).toHaveLength(12);
      expect(MONTH_NAMES_DE[0]).toBe('Januar');
      expect(MONTH_NAMES_DE[8]).toBe('September');
      expect(MONTH_NAMES_DE[11]).toBe('Dezember');

      expect(MONTH_NAMES_EN).toHaveLength(12);
      expect(MONTH_NAMES_EN[0]).toBe('January');
      expect(MONTH_NAMES_EN[8]).toBe('September');
      expect(MONTH_NAMES_EN[11]).toBe('December');
    });

    test('renders DateWheelPicker component without errors', () => {
      const onChange = jest.fn();
      const { getByLabelText } = render(
        <DateWheelPicker
          value={new Date(1995, 8, 15)}
          onChange={onChange}
          locale="de"
        />,
      );

      expect(getByLabelText('Tag auswählen')).toBeTruthy();
      expect(getByLabelText('Monat auswählen')).toBeTruthy();
      expect(getByLabelText('Jahr auswählen')).toBeTruthy();
    });
  });

  describe('3. DatePickerModal & formatting utilities', () => {
    test('toIsoDateString formats date to YYYY-MM-DD with zero-padding', () => {
      expect(toIsoDateString(new Date(1995, 8, 15))).toBe('1995-09-15');
      expect(toIsoDateString(new Date(2003, 0, 5))).toBe('2003-01-05');
      expect(toIsoDateString(new Date(1980, 11, 31))).toBe('1980-12-31');
    });

    test('parseDateOrDefault parses valid ISO and year inputs with safe fallback', () => {
      const d1 = parseDateOrDefault('1995-09-15');
      expect(d1.getFullYear()).toBe(1995);
      expect(d1.getMonth()).toBe(8);
      expect(d1.getDate()).toBe(15);

      const d2 = parseDateOrDefault('1990');
      expect(d2.getFullYear()).toBe(1990);
      expect(d2.getMonth()).toBe(0);
      expect(d2.getDate()).toBe(1);

      const currentYear = new Date().getFullYear();
      const fallback = parseDateOrDefault('');
      expect(fallback.getFullYear()).toBe(currentYear - 25);
    });

    test('renders DatePickerModal with localized preview and triggers confirm', () => {
      const onConfirm = jest.fn();
      const onClose = jest.fn();
      const onClear = jest.fn();

      const { getByText } = render(
        <DatePickerModal
          visible={true}
          value="1995-09-15"
          onConfirm={onConfirm}
          onClose={onClose}
          onClear={onClear}
          language="de"
        />,
      );

      // Verify header and preview
      expect(getByText('Geburtsdatum')).toBeTruthy();
      expect(getByText('15. September 1995')).toBeTruthy();
      expect(getByText('Fertig')).toBeTruthy();
      expect(getByText('Abbrechen')).toBeTruthy();
      expect(getByText('Geburtsdatum entfernen')).toBeTruthy();

      // Trigger Confirm (Fertig)
      fireEvent.press(getByText('Fertig'));
      expect(onConfirm).toHaveBeenCalledWith('1995-09-15');
      expect(onClose).toHaveBeenCalled();
    });

    test('triggers onClear and onClose when remove date is pressed', () => {
      const onConfirm = jest.fn();
      const onClose = jest.fn();
      const onClear = jest.fn();

      const { getByText } = render(
        <DatePickerModal
          visible={true}
          value="1995-09-15"
          onConfirm={onConfirm}
          onClose={onClose}
          onClear={onClear}
          language="de"
        />,
      );

      fireEvent.press(getByText('Geburtsdatum entfernen'));
      expect(onClear).toHaveBeenCalled();
      expect(onClose).toHaveBeenCalled();
    });

    test('renders English preview and actions when language is "en"', () => {
      const onConfirm = jest.fn();
      const onClose = jest.fn();

      const { getByText } = render(
        <DatePickerModal
          visible={true}
          value="1995-09-15"
          onConfirm={onConfirm}
          onClose={onClose}
          language="en"
        />,
      );

      expect(getByText('Date of Birth')).toBeTruthy();
      expect(getByText('September 15, 1995')).toBeTruthy();
      expect(getByText('Done')).toBeTruthy();
      expect(getByText('Cancel')).toBeTruthy();
    });
  });
});
