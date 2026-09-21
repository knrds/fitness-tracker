import { getTranslation } from '../index';
import { translations } from '../translations';

describe('Plans Create Modal i18n parity', () => {
  const modalKeys = [
    'plans.createChoiceTitle',
    'plans.createTemplate',
    'plans.createTemplateDesc',
    'plans.createPlan',
    'plans.createPlanDesc',
    'plans.close',
  ] as const;

  it('resolves all modal keys in German without returning raw key names', () => {
    modalKeys.forEach((key) => {
      const translated = getTranslation('de', key);
      expect(translated).toBeTruthy();
      expect(translated).not.toBe(key);
      expect(translated).not.toContain('plans.');
    });

    expect(getTranslation('de', 'plans.createChoiceTitle')).toBe('Was möchtest du erstellen?');
    expect(getTranslation('de', 'plans.createTemplate')).toBe('Template erstellen');
    expect(getTranslation('de', 'plans.createTemplateDesc')).toBe(
      'Erstelle eine wiederverwendbare Trainingsvorlage.',
    );
    expect(getTranslation('de', 'plans.createPlan')).toBe('Trainingsplan erstellen');
    expect(getTranslation('de', 'plans.createPlanDesc')).toBe(
      'Erstelle einen Trainingsplan für deine Woche.',
    );
  });

  it('resolves all modal keys in English without returning raw key names', () => {
    modalKeys.forEach((key) => {
      const translated = getTranslation('en', key);
      expect(translated).toBeTruthy();
      expect(translated).not.toBe(key);
      expect(translated).not.toContain('plans.');
    });

    expect(getTranslation('en', 'plans.createChoiceTitle')).toBe('What would you like to create?');
    expect(getTranslation('en', 'plans.createTemplate')).toBe('Create Template');
    expect(getTranslation('en', 'plans.createTemplateDesc')).toBe(
      'Create a reusable workout template.',
    );
    expect(getTranslation('en', 'plans.createPlan')).toBe('Create Training Plan');
    expect(getTranslation('en', 'plans.createPlanDesc')).toBe('Create a weekly training plan.');
  });

  it('ensures de and en translations match structure', () => {
    expect(translations.de.plans.createChoiceTitle).toBeDefined();
    expect(translations.en.plans.createChoiceTitle).toBeDefined();
    expect(translations.de.plans.createTemplate).toBeDefined();
    expect(translations.en.plans.createTemplate).toBeDefined();
    expect(translations.de.plans.createPlan).toBeDefined();
    expect(translations.en.plans.createPlan).toBeDefined();
  });
});
