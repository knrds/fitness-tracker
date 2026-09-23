import { translations } from '../../i18n/translations';

describe('Coach Consent UI Copy & Legal Marker Audit (Task 1)', () => {
  it('contains NO visible LEGAL_REVIEW_REQUIRED tokens in German coach consent', () => {
    const deConsent = translations.de.coach.consent;
    Object.values(deConsent).forEach((value) => {
      expect(value).not.toContain('LEGAL_REVIEW_REQUIRED');
      expect(value).not.toContain('[LEGAL_REVIEW_REQUIRED]');
      expect(value).not.toContain('LEGAL REVIEW REQUIRED');
    });
  });

  it('contains NO visible LEGAL_REVIEW_REQUIRED tokens in English coach consent', () => {
    const enConsent = translations.en.coach.consent;
    Object.values(enConsent).forEach((value) => {
      expect(value).not.toContain('LEGAL_REVIEW_REQUIRED');
      expect(value).not.toContain('[LEGAL_REVIEW_REQUIRED]');
      expect(value).not.toContain('LEGAL REVIEW REQUIRED');
    });
  });

  it('renders correct clean German coach consent copy', () => {
    const de = translations.de.coach.consent;
    expect(de.title).toBe('KI-Coach Zustimmung');
    expect(de.accept).toBe('Zustimmen & fortfahren');
    expect(de.revoke).toBe('KI-Zustimmung widerrufen');
    expect(de.description).toContain('Für den KI-Coach werden deine Fragen und relevante Trainingsdaten verarbeitet');
    expect(de.description).toContain('Du kannst deine Zustimmung später in den Einstellungen widerrufen.');
  });

  it('renders correct clean English coach consent copy', () => {
    const en = translations.en.coach.consent;
    expect(en.title).toBe('AI Coach Consent');
    expect(en.accept).toBe('Agree & continue');
    expect(en.revoke).toBe('Revoke AI Consent');
    expect(en.description).toContain('To provide personalized coaching, your questions and relevant training data');
    expect(en.description).toContain('You can withdraw your consent later in Settings.');
  });

  it('contains NO visible legal review markers in paywall disclaimers', () => {
    expect(translations.de.paywall.legalDisclaimer).not.toContain('LEGAL_REVIEW_REQUIRED');
    expect(translations.de.paywall.legalMonthlyDisclaimer).not.toContain('LEGAL_REVIEW_REQUIRED');
    expect(translations.en.paywall.legalDisclaimer).not.toContain('LEGAL_REVIEW_REQUIRED');
    expect(translations.en.paywall.legalMonthlyDisclaimer).not.toContain('LEGAL_REVIEW_REQUIRED');
  });
});
