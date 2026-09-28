import { EXERCISES, MuscleGroup } from '@fitness-tracker/domain';
import { matchesExerciseSearch, normalizeExerciseSearch } from '../exerciseSearch';
import { translations } from '../../i18n/translations';

const dip = {
  ...EXERCISES[0]!,
  name: 'Chest Dip',
  primaryMuscles: [MuscleGroup.Chest],
  secondaryMuscles: [],
};
describe('exercise search', () => {
  it('ignores repeated, leading and trailing whitespace and case', () => {
    expect(normalizeExerciseSearch('  CHEST   Dip  ')).toBe('chest dip');
    expect(matchesExerciseSearch(dip, '  CHEST   Dip  ')).toBe(true);
  });
  it('retains the exact base exercise when a modifier is appended', () => {
    expect(matchesExerciseSearch(dip, 'Chest Dip Weighted')).toBe(true);
    expect(matchesExerciseSearch(dip, 'Chest Squat')).toBe(false);
  });
  it('maps Apps to abs muscle exercises rather than returning an empty list', () => {
    const exercise = { ...dip, name: 'Crunch', primaryMuscles: [MuscleGroup.Abs] };
    expect(matchesExerciseSearch(exercise, 'Apps ')).toBe(true);
    expect(matchesExerciseSearch(dip, 'Apps')).toBe(false);
  });
  it('keeps all exercises for an empty search', () =>
    expect(matchesExerciseSearch(dip, '   ')).toBe(true));
  it.each(Object.values(MuscleGroup))('finds %s by its German and English name in either muscle role', (muscle) => {
    for (const language of ['de', 'en'] as const) {
      const query = translations[language].muscles[muscle];
      const exercise = { ...dip, isCustom: true, name: 'Test movement', primaryMuscles: [muscle], secondaryMuscles: [] };
      expect(matchesExerciseSearch(exercise, query)).toBe(true);
      expect(matchesExerciseSearch({ ...exercise, primaryMuscles: [MuscleGroup.FullBody], secondaryMuscles: [muscle] }, query)).toBe(true);
    }
  });
  it('searches adductors separately from quadriceps using catalog assignments', () => {
    const adduction = EXERCISES.find((exercise) => exercise.name === 'Cable Hip Adduction')!;
    const extension = EXERCISES.find((exercise) => exercise.name === 'Leg Extensions')!;
    expect(matchesExerciseSearch(adduction, 'Adduktoren')).toBe(true);
    expect(matchesExerciseSearch(adduction, 'adductors')).toBe(true);
    expect(matchesExerciseSearch(adduction, 'Quadrizeps')).toBe(false);
    expect(matchesExerciseSearch(extension, 'Adduktoren')).toBe(false);
  });
});
