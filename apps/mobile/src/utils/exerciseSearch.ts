import { type Exercise, getExerciseMuscleRegions } from '@fitness-tracker/domain';
import { translations } from '../i18n/translations';

const aliases: Record<string, string> = {
  apps: 'abs',
  ab: 'abs',
  abdominal: 'abs',
  abdominals: 'abs',
  bauch: 'abs',
  brust: 'chest',
  schulter: 'delts',
  shoulders: 'delts',
  shoulder: 'delts',
};
export const normalizeExerciseSearch = (value: string) =>
  value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/ß/g, 'ss')
    .replace(/[-_]/g, ' ')
    .trim()
    .replace(/\s+/g, ' ');

/** Match names and muscle aliases; an exact multi-word name remains a useful result
 * when a user appends a modifier such as "weighted". Single generic words do not. */
export function matchesExerciseSearch(exercise: Exercise, query: string): boolean {
  const normalized = normalizeExerciseSearch(query);
  if (!normalized) return true;
  const name = normalizeExerciseSearch(exercise.name);
  const tokens = normalized.split(' ').map((token) => aliases[token] ?? token);
  const regions = getExerciseMuscleRegions(exercise);
  const muscleNames = [...regions.primaryMuscles, ...regions.secondaryMuscles].flatMap((muscle) => [
    muscle,
    translations.de.muscles[muscle],
    translations.en.muscles[muscle],
  ]);
  const searchable = [name, ...muscleNames, ...(exercise.equipmentOptions ?? [exercise.equipment])]
    .map(normalizeExerciseSearch)
    .join(' ');
  return (
    tokens.every((token) => searchable.includes(token)) ||
    (name.split(' ').length > 1 && ` ${normalized} `.includes(` ${name} `))
  );
}
