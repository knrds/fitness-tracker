import { EXERCISES, MuscleGroup } from '@fitness-tracker/domain';
import { matchesExerciseSearch, normalizeExerciseSearch } from '../exerciseSearch';

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
});
