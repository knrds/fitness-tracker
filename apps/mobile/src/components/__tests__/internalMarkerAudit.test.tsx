import { translations } from '../../i18n/translations';

describe('Project-Wide User-Facing Internal Marker Audit (Task 8)', () => {
  const FORBIDDEN_TOKENS = [
    'LEGAL_REVIEW_REQUIRED',
    'ASTRA_REQUIRED',
    'USER_ACTION_REQUIRED',
    'PHYSICAL_DEVICE_REQUIRED',
    'BLOCKED',
    'PREPARED',
    'TODO',
    'FIXME',
  ];

  function collectStrings(obj: unknown): string[] {
    const results: string[] = [];
    if (typeof obj === 'string') {
      results.push(obj);
    } else if (Array.isArray(obj)) {
      obj.forEach((item) => results.push(...collectStrings(item)));
    } else if (obj !== null && typeof obj === 'object') {
      Object.values(obj).forEach((val) => results.push(...collectStrings(val)));
    }
    return results;
  }

  it('guarantees 0 internal release workflow markers in German translations', () => {
    const allGermanStrings = collectStrings(translations.de);
    expect(allGermanStrings.length).toBeGreaterThan(100);

    FORBIDDEN_TOKENS.forEach((token) => {
      const offending = allGermanStrings.filter((s) => s.includes(token));
      expect(offending).toEqual([]);
    });
  });

  it('guarantees 0 internal release workflow markers in English translations', () => {
    const allEnglishStrings = collectStrings(translations.en);
    expect(allEnglishStrings.length).toBeGreaterThan(100);

    FORBIDDEN_TOKENS.forEach((token) => {
      const offending = allEnglishStrings.filter((s) => s.includes(token));
      expect(offending).toEqual([]);
    });
  });

  it('maintains 100% key parity between German and English translations', () => {
    function getKeys(obj: Record<string, unknown>, prefix = ''): string[] {
      let keys: string[] = [];
      for (const [k, v] of Object.entries(obj)) {
        const fullKey = prefix ? `${prefix}.${k}` : k;
        if (v && typeof v === 'object' && !Array.isArray(v)) {
          keys = keys.concat(getKeys(v as Record<string, unknown>, fullKey));
        } else {
          keys.push(fullKey);
        }
      }
      return keys.sort();
    }

    const deKeys = getKeys(translations.de as unknown as Record<string, unknown>);
    const enKeys = getKeys(translations.en as unknown as Record<string, unknown>);
    expect(deKeys).toEqual(enKeys);
  });
});
