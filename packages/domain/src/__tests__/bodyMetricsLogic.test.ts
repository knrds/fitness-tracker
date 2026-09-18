import { describe, it, expect } from 'vitest';
import { calculateAge, calculateBMI, parseBirthDateInput } from '../logic/bodyMetricsLogic';

describe('bodyMetricsLogic', () => {
  describe('calculateAge', () => {
    const reference = new Date('2026-09-18T12:00:00');

    it('returns undefined for null or undefined input', () => {
      expect(calculateAge(undefined, reference)).toBeUndefined();
      expect(calculateAge(null, reference)).toBeUndefined();
      expect(calculateAge('', reference)).toBeUndefined();
    });

    it('calculates age correctly from 4-digit year number', () => {
      expect(calculateAge(2000, reference)).toBe(26);
      expect(calculateAge(1990, reference)).toBe(36);
    });

    it('calculates age correctly from 4-digit year string', () => {
      expect(calculateAge('2000', reference)).toBe(26);
    });

    it('calculates exact age when birthday has already passed this year', () => {
      // Born on Sept 10 (8 days ago in 2026)
      expect(calculateAge('2000-09-10', reference)).toBe(26);
    });

    it('calculates exact age when birthday is today', () => {
      expect(calculateAge('2000-09-18', reference)).toBe(26);
    });

    it('calculates exact age when birthday has not occurred yet this year', () => {
      // Born on Sept 25 (7 days in future in 2026)
      expect(calculateAge('2000-09-25', reference)).toBe(25);
    });

    it('supports German date format DD.MM.YYYY', () => {
      expect(calculateAge('10.09.2000', reference)).toBe(26);
      expect(calculateAge('25.09.2000', reference)).toBe(25);
    });

    it('rejects unrealistic ages or future birth years', () => {
      expect(calculateAge('2030-01-01', reference)).toBeUndefined();
      expect(calculateAge(1850, reference)).toBeUndefined();
      expect(calculateAge(2025, reference)).toBeUndefined(); // < 5 years
    });
  });

  describe('calculateBMI', () => {
    it('calculates BMI accurately without age or sex contamination', () => {
      // 80 kg, 180 cm -> 80 / (1.80^2) = 24.69 -> 24.7
      expect(calculateBMI(80, 180)).toBe(24.7);
      // 70 kg, 175 cm -> 70 / (1.75^2) = 22.857 -> 22.9
      expect(calculateBMI(70, 175)).toBe(22.9);
    });

    it('returns null for missing, zero, or negative inputs', () => {
      expect(calculateBMI(undefined, 180)).toBeNull();
      expect(calculateBMI(80, undefined)).toBeNull();
      expect(calculateBMI(0, 180)).toBeNull();
      expect(calculateBMI(80, 0)).toBeNull();
      expect(calculateBMI(-5, 180)).toBeNull();
    });
  });

  describe('parseBirthDateInput', () => {
    it('handles empty string gracefully', () => {
      expect(parseBirthDateInput('')).toEqual({ isValid: true });
      expect(parseBirthDateInput('   ')).toEqual({ isValid: true });
    });

    it('parses 4-digit year', () => {
      const res = parseBirthDateInput('1998');
      expect(res.isValid).toBe(true);
      expect(res.birthYear).toBe(1998);
      expect(res.age).toBeDefined();
    });

    it('parses German DD.MM.YYYY format', () => {
      const res = parseBirthDateInput('15.06.1995');
      expect(res.isValid).toBe(true);
      expect(res.normalizedIso).toBe('1995-06-15');
      expect(res.birthYear).toBe(1995);
      expect(res.age).toBeDefined();
    });

    it('parses ISO YYYY-MM-DD format', () => {
      const res = parseBirthDateInput('1995-06-15');
      expect(res.isValid).toBe(true);
      expect(res.normalizedIso).toBe('1995-06-15');
      expect(res.birthYear).toBe(1995);
      expect(res.age).toBeDefined();
    });

    it('flags invalid strings as invalid', () => {
      expect(parseBirthDateInput('not-a-date').isValid).toBe(false);
      expect(parseBirthDateInput('32.01.2000').isValid).toBe(false);
      expect(parseBirthDateInput('1900-13-45').isValid).toBe(false);
    });
  });
});
