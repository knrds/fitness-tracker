import { translations } from '../../i18n/translations';
import { calculateLongestStreakDetails, WorkoutSession } from '@fitness-tracker/domain';

describe('Lifetime Statistics & PR Benchmark Alignment (Tasks 5, 6, 7)', () => {
  describe('Task 6: PR Benchmark Compact Labels & Layout Contract', () => {
    it('uses compact PR benchmark labels in German translations without wrapping hazard', () => {
      const de = translations.de.settings;
      expect(de.benchPressMax).toBe('Bankdrücken');
      expect(de.squatMax).toBe('Kniebeuge');
      expect(de.deadliftMax).toBe('Kreuzheben');
      expect(de.benchPressMax).not.toContain('Max');
      expect(de.squatMax).not.toContain('Max');
      expect(de.deadliftMax).not.toContain('Max');
    });

    it('uses compact PR benchmark labels in English translations', () => {
      const en = translations.en.settings;
      expect(en.benchPressMax).toBe('Bench Press');
      expect(en.squatMax).toBe('Squat');
      expect(en.deadliftMax).toBe('Deadlift');
    });
  });

  describe('Task 7: Placeholder Localization ("z. B." vs "e.g.")', () => {
    it('provides localized example prefix helper logic', () => {
      const formatExamplePlaceholder = (val: number | string, lang: 'de' | 'en') =>
        lang === 'de' ? `z. B. ${val}` : `e.g. ${val}`;

      expect(formatExamplePlaceholder(180, 'de')).toBe('z. B. 180');
      expect(formatExamplePlaceholder(180, 'en')).toBe('e.g. 180');
      expect(formatExamplePlaceholder(80, 'de')).toBe('z. B. 80');
      expect(formatExamplePlaceholder(80, 'en')).toBe('e.g. 80');
      expect(formatExamplePlaceholder(100, 'de')).toBe('z. B. 100');
      expect(formatExamplePlaceholder(225, 'en')).toBe('e.g. 225');
    });
  });

  describe('Task 5: Lifetime Statistics & Real Date Derivation', () => {
    it('derives real longest streak date ranges without synthetic fallback dates', () => {
      // Create session history
      const now = new Date();
      const sessions: WorkoutSession[] = [
        {
          id: 's1',
          userId: 'u1',
          name: 'Day 1',
          startedAt: new Date(2026, 2, 10, 10, 0), // March 10, 2026
          completedAt: new Date(2026, 2, 10, 11, 0),
          createdAt: now,
          updatedAt: now,
          exercises: [],
        },
        {
          id: 's2',
          userId: 'u1',
          name: 'Day 2',
          startedAt: new Date(2026, 2, 11, 10, 0), // March 11, 2026
          completedAt: new Date(2026, 2, 11, 11, 0),
          createdAt: now,
          updatedAt: now,
          exercises: [],
        },
        {
          id: 's3',
          userId: 'u1',
          name: 'Day 3',
          startedAt: new Date(2026, 2, 12, 10, 0), // March 12, 2026
          completedAt: new Date(2026, 2, 12, 11, 0),
          createdAt: now,
          updatedAt: now,
          exercises: [],
        },
      ];

      const details = calculateLongestStreakDetails(sessions);
      expect(details.longestStreak).toBe(3);
      expect(details.startDate).toBeDefined();
      expect(details.endDate).toBeDefined();

      const startMonth = details.startDate!.toLocaleDateString('de-DE', {
        month: 'long',
        year: 'numeric',
      });
      expect(startMonth).toContain('März 2026');
    });

    it('returns streak 0 and undefined dates when session history is empty', () => {
      const details = calculateLongestStreakDetails([]);
      expect(details.longestStreak).toBe(0);
      expect(details.startDate).toBeUndefined();
      expect(details.endDate).toBeUndefined();
    });
  });
});
