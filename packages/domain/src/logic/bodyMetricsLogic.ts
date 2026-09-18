/**
 * Pure domain logic for personal body metrics, age calculation, and BMI.
 * Strictly decoupled from platform dependencies, external storage, and stereotyping.
 */

/**
 * Calculates current age from a birth date or birth year.
 * Correctly accounts for month/day boundaries without UTC off-by-one errors.
 *
 * @param dob Birth date as Date, ISO string (YYYY-MM-DD), German date (DD.MM.YYYY), or year number
 * @param referenceDate Optional comparison date (defaults to current local date)
 * @returns Age in years, or undefined if invalid/out-of-range
 */
export function calculateAge(
  dob: string | Date | number | undefined | null,
  referenceDate: Date = new Date(),
): number | undefined {
  if (dob === undefined || dob === null) return undefined;

  let birthYear: number;
  let birthMonth: number | undefined;
  let birthDay: number | undefined;

  if (typeof dob === 'number') {
    if (dob < 1900 || dob > referenceDate.getFullYear()) return undefined;
    birthYear = dob;
  } else if (dob instanceof Date) {
    if (isNaN(dob.getTime())) return undefined;
    birthYear = dob.getFullYear();
    birthMonth = dob.getMonth();
    birthDay = dob.getDate();
  } else if (typeof dob === 'string') {
    const trimmed = dob.trim();
    if (!trimmed) return undefined;

    // Check if it's purely a 4-digit year (e.g. "1995")
    if (/^\d{4}$/.test(trimmed)) {
      const year = parseInt(trimmed, 10);
      if (year < 1900 || year > referenceDate.getFullYear()) return undefined;
      birthYear = year;
    } else if (/^\d{1,2}\.\d{1,2}\.\d{4}$/.test(trimmed)) {
      // German format DD.MM.YYYY
      const parts = trimmed.split('.');
      const d = parseInt(parts[0]!, 10);
      const m = parseInt(parts[1]!, 10) - 1;
      const y = parseInt(parts[2]!, 10);
      const parsed = new Date(y, m, d);
      if (
        isNaN(parsed.getTime()) ||
        parsed.getFullYear() !== y ||
        parsed.getMonth() !== m ||
        parsed.getDate() !== d
      ) {
        return undefined;
      }
      birthYear = y;
      birthMonth = m;
      birthDay = d;
    } else {
      // Try standard ISO or general date parsing
      const parsed = new Date(trimmed);
      if (isNaN(parsed.getTime())) return undefined;
      birthYear = parsed.getFullYear();
      birthMonth = parsed.getMonth();
      birthDay = parsed.getDate();
    }
  } else {
    return undefined;
  }

  const refYear = referenceDate.getFullYear();
  let age = refYear - birthYear;

  if (birthMonth !== undefined && birthDay !== undefined) {
    const refMonth = referenceDate.getMonth();
    const refDay = referenceDate.getDate();
    if (refMonth < birthMonth || (refMonth === birthMonth && refDay < birthDay)) {
      age--;
    }
  }

  // Realistic bounds validation (e.g. 5 to 120 years)
  if (age < 5 || age > 120) {
    return undefined;
  }

  return age;
}

/**
 * Standard adult Body Mass Index (BMI) in kg/m^2.
 * Strictly calculated as: weight / height^2.
 * Age and sex are intentionally NOT part of the BMI formula.
 *
 * @param weightKg Body weight in kilograms (must be positive)
 * @param heightCm Standing height in centimetres (must be positive)
 * @returns BMI rounded to 1 decimal place, or null if inputs are missing/invalid
 */
export function calculateBMI(weightKg: number | undefined | null, heightCm: number | undefined | null): number | null {
  if (weightKg === undefined || weightKg === null || heightCm === undefined || heightCm === null) {
    return null;
  }
  if (weightKg <= 0 || heightCm <= 0 || isNaN(weightKg) || isNaN(heightCm)) {
    return null;
  }

  const heightM = heightCm / 100;
  const bmi = weightKg / (heightM * heightM);
  if (!isFinite(bmi) || bmi < 5 || bmi > 150) {
    return null;
  }

  return Math.round(bmi * 10) / 10;
}

/**
 * Validates and normalizes user date of birth or birth year input string.
 */
export function parseBirthDateInput(input: string): {
  normalizedIso?: string;
  birthYear?: number;
  age?: number;
  isValid: boolean;
} {
  const trimmed = input.trim();
  if (!trimmed) {
    return { isValid: true };
  }

  // Pure year (e.g. "1995")
  if (/^\d{4}$/.test(trimmed)) {
    const year = parseInt(trimmed, 10);
    const age = calculateAge(year);
    if (age !== undefined) {
      return {
        birthYear: year,
        age,
        isValid: true,
      };
    }
    return { isValid: false };
  }

  // German format (DD.MM.YYYY)
  if (/^(\d{1,2})\.(\d{1,2})\.(\d{4})$/.test(trimmed)) {
    const match = trimmed.match(/^(\d{1,2})\.(\d{1,2})\.(\d{4})$/);
    if (!match) return { isValid: false };
    const day = parseInt(match[1]!, 10);
    const month = parseInt(match[2]!, 10);
    const year = parseInt(match[3]!, 10);

    const d = new Date(year, month - 1, day);
    if (
      isNaN(d.getTime()) ||
      d.getFullYear() !== year ||
      d.getMonth() !== month - 1 ||
      d.getDate() !== day
    ) {
      return { isValid: false };
    }

    const iso = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    const age = calculateAge(iso);
    if (age !== undefined) {
      return {
        normalizedIso: iso,
        birthYear: year,
        age,
        isValid: true,
      };
    }
    return { isValid: false };
  }

  // ISO format (YYYY-MM-DD)
  if (/^(\d{4})-(\d{1,2})-(\d{1,2})$/.test(trimmed)) {
    const match = trimmed.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/);
    if (!match) return { isValid: false };
    const year = parseInt(match[1]!, 10);
    const month = parseInt(match[2]!, 10);
    const day = parseInt(match[3]!, 10);

    const d = new Date(year, month - 1, day);
    if (
      isNaN(d.getTime()) ||
      d.getFullYear() !== year ||
      d.getMonth() !== month - 1 ||
      d.getDate() !== day
    ) {
      return { isValid: false };
    }

    const iso = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    const age = calculateAge(iso);
    if (age !== undefined) {
      return {
        normalizedIso: iso,
        birthYear: year,
        age,
        isValid: true,
      };
    }
    return { isValid: false };
  }

  return { isValid: false };
}
