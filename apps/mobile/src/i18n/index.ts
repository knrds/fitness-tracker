import { useProfileStore } from '../stores/profileStore';
import { translations, Language } from './translations';
import {
  MuscleGroup,
  Equipment,
  MovementPattern,
  FitnessGoal,
  ExperienceLevel,
  BiologicalSex,
} from '@fitness-tracker/domain';

import { getLocalizedAchievement } from './achievementTranslations';

export type { Language } from './translations';
export { translations } from './translations';
export { getLocalizedAchievement, GERMAN_ACHIEVEMENTS } from './achievementTranslations';
export type { LocalizedAchievement } from './achievementTranslations';

/** Resolves a dotted path like 'workout.startWorkout' against the translations object */
export function getTranslation(lang: Language, path: string, fallback?: string): string {
  const parts = path.split('.');
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let current: any = translations[lang] || translations.de;
  for (const part of parts) {
    if (current && typeof current === 'object' && part in current) {
      current = current[part];
    } else {
      // Fallback to German, then English, then provided fallback, then path
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      let deCurrent: any = translations.de;
      for (const p of parts) {
        if (deCurrent && typeof deCurrent === 'object' && p in deCurrent) {
          deCurrent = deCurrent[p];
        } else {
          return fallback ?? path;
        }
      }
      return typeof deCurrent === 'string' ? deCurrent : fallback ?? path;
    }
  }
  return typeof current === 'string' ? current : fallback ?? path;
}

export function formatMuscle(muscle: MuscleGroup | string | undefined | null, lang: Language = 'de'): string {
  if (!muscle) return '';
  const key = muscle.toLowerCase().trim() as keyof typeof translations.de.muscles;
  const dict = translations[lang]?.muscles || translations.de.muscles;
  if (key in dict) {
    return dict[key];
  }
  return muscle
    .split('_')
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ');
}

export function formatEquipment(
  equipment: Equipment | string | undefined | null,
  lang: Language = 'de',
): string {
  if (!equipment) return '';
  const key = equipment.toLowerCase().trim() as keyof typeof translations.de.equipment;
  const dict = translations[lang]?.equipment || translations.de.equipment;
  if (key in dict) {
    return dict[key];
  }
  return equipment
    .split('_')
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ');
}

export function formatMovementPattern(
  pattern: MovementPattern | string | undefined | null,
  lang: Language = 'de',
): string {
  if (!pattern) return '';
  const key = pattern.toLowerCase().trim() as keyof typeof translations.de.movementPatterns;
  const dict = translations[lang]?.movementPatterns || translations.de.movementPatterns;
  if (key in dict) {
    return dict[key];
  }
  return pattern
    .split('_')
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ');
}

export function formatGoal(goal: FitnessGoal | string | undefined | null, lang: Language = 'de'): string {
  if (!goal) return '';
  const key = goal.toLowerCase().trim() as keyof typeof translations.de.goals;
  const dict = translations[lang]?.goals || translations.de.goals;
  if (key in dict) {
    return dict[key];
  }
  return goal
    .split('_')
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ');
}

export function formatLevel(
  level: ExperienceLevel | string | undefined | null,
  lang: Language = 'de',
): string {
  if (!level) return '';
  const key = level.toLowerCase().trim() as keyof typeof translations.de.levels;
  const dict = translations[lang]?.levels || translations.de.levels;
  if (key in dict) {
    return dict[key];
  }
  return level
    .split('_')
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ');
}

export function formatSex(sex: BiologicalSex | string | undefined | null, lang: Language = 'de'): string {
  if (!sex) return '';
  const key = sex.toLowerCase().trim() as keyof typeof translations.de.sex;
  const dict = translations[lang]?.sex || translations.de.sex;
  if (key in dict) {
    return dict[key];
  }
  return sex
    .split('_')
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ');
}

export function useI18n() {
  const language: Language = useProfileStore((state) => state.profile.language ?? 'de');
  const updateProfile = useProfileStore((state) => state.updateProfile);

  const t = (path: string, fallback?: string): string => {
    return getTranslation(language, path, fallback);
  };

  const setLanguage = (lang: Language) => {
    updateProfile({ language: lang });
  };

  return {
    language,
    setLanguage,
    t,
    formatMuscle: (muscle: MuscleGroup | string | undefined | null) =>
      formatMuscle(muscle, language),
    formatEquipment: (equipment: Equipment | string | undefined | null) =>
      formatEquipment(equipment, language),
    formatMovementPattern: (pattern: MovementPattern | string | undefined | null) =>
      formatMovementPattern(pattern, language),
    formatGoal: (goal: FitnessGoal | string | undefined | null) => formatGoal(goal, language),
    formatLevel: (level: ExperienceLevel | string | undefined | null) => formatLevel(level, language),
    formatSex: (sex: BiologicalSex | string | undefined | null) => formatSex(sex, language),
    formatAchievement: (ach: { id: string; name: string; description: string }) =>
      getLocalizedAchievement(ach, language),
  };
}
