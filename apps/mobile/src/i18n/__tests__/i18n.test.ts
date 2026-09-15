import { getTranslation, formatMuscle, formatEquipment, formatGoal } from '../index';
import { MuscleGroup, Equipment } from '@fitness-tracker/domain';

describe('i18n system', () => {
  it('translates nested paths correctly in German and English', () => {
    expect(getTranslation('de', 'time.week')).toBe('Woche');
    expect(getTranslation('en', 'time.week')).toBe('Week');
    expect(getTranslation('de', 'time.month')).toBe('Monat');
    expect(getTranslation('en', 'time.month')).toBe('Month');

    expect(getTranslation('de', 'muscles.muscleDistribution')).toBe('MUSKELVERTEILUNG');
    expect(getTranslation('en', 'muscles.muscleDistribution')).toBe('MUSCLE DISTRIBUTION');

    // Multilingual terms remain as intended
    expect(getTranslation('de', 'workout.workout')).toBe('Workout');
    expect(getTranslation('en', 'workout.workout')).toBe('Workout');
    expect(getTranslation('de', 'workout.quickWorkout')).toBe('Quick Workout');
    expect(getTranslation('en', 'workout.quickWorkout')).toBe('Quick Workout');
    expect(getTranslation('de', 'nav.home')).toBe('Home');
    expect(getTranslation('en', 'nav.home')).toBe('Home');
    expect(getTranslation('de', 'nav.coach')).toBe('Coach');
    expect(getTranslation('en', 'nav.coach')).toBe('Coach');

    // Body metric empty state translations
    expect(getTranslation('de', 'body.notEnoughData')).toBe('Noch nicht genügend Daten');
    expect(getTranslation('en', 'body.notEnoughData')).toBe('Not enough data');
    expect(getTranslation('de', 'body.logAtLeastTwo')).toBe(
      'Trage mindestens zwei Werte ein, um die Entwicklung anzuzeigen.',
    );
    expect(getTranslation('en', 'body.logAtLeastTwo')).toBe('Log at least 2 data points.');
    expect(getTranslation('de', 'body.chartTip')).toBe(
      'Tippe auf einen Punkt im Diagramm für Details',
    );
    expect(getTranslation('en', 'body.chartTip')).toBe('Tap any point on the chart to inspect details');
  });

  it('formats muscle groups in German and English', () => {
    expect(formatMuscle(MuscleGroup.Quads, 'de')).toBe('Quadrizeps');
    expect(formatMuscle(MuscleGroup.Quads, 'en')).toBe('Quads');

    expect(formatMuscle(MuscleGroup.Chest, 'de')).toBe('Brust');
    expect(formatMuscle(MuscleGroup.Chest, 'en')).toBe('Chest');

    expect(formatMuscle(MuscleGroup.UpperBack, 'de')).toBe('Oberer Rücken');
    expect(formatMuscle(MuscleGroup.UpperBack, 'en')).toBe('Upper Back');

    expect(formatMuscle(MuscleGroup.Lats, 'de')).toBe('Latissimus');
    expect(formatMuscle(MuscleGroup.Lats, 'en')).toBe('Lats');

    expect(formatMuscle(MuscleGroup.Glutes, 'de')).toBe('Gesäß');
    expect(formatMuscle(MuscleGroup.Glutes, 'en')).toBe('Glutes');
  });

  it('formats equipment in German and English', () => {
    expect(formatEquipment(Equipment.Barbell, 'de')).toBe('Langhantel');
    expect(formatEquipment(Equipment.Barbell, 'en')).toBe('Barbell');

    expect(formatEquipment(Equipment.Dumbbell, 'de')).toBe('Kurzhantel');
    expect(formatEquipment(Equipment.Dumbbell, 'en')).toBe('Dumbbell');

    expect(formatEquipment(Equipment.Cable, 'de')).toBe('Kabelzug');
    expect(formatEquipment(Equipment.Cable, 'en')).toBe('Cable');
  });

  it('formats fitness goals in German and English', () => {
    expect(formatGoal('build_muscle', 'de')).toBe('Muskelaufbau');
    expect(formatGoal('build_muscle', 'en')).toBe('Build Muscle');
  });

  it('falls back gracefully on unknown keys', () => {
    expect(getTranslation('de', 'unknown.key', 'Fallback')).toBe('Fallback');
    expect(getTranslation('en', 'unknown.key')).toBe('unknown.key');
  });
});
