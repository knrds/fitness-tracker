import { describe, it, expect } from 'vitest';
import {
  needsOnboarding,
  getPersonalizedPlanRecommendation,
  OnboardingState,
  CURRENT_ONBOARDING_VERSION,
} from '../schemas/onboardingState';

describe('Onboarding State Machine & Recommendation Logic (WP-06 Tasks 06.01, 06.03)', () => {
  describe('needsOnboarding Gate', () => {
    it('requires onboarding for fresh install (null or undefined state)', () => {
      expect(needsOnboarding(null)).toBe(true);
      expect(needsOnboarding(undefined)).toBe(true);
    });

    it('requires onboarding when in progress and not completed', () => {
      const inProgress: OnboardingState = {
        version: CURRENT_ONBOARDING_VERSION,
        currentStepIndex: 2,
        completed: false,
        skipped: false,
        draftData: { fitnessGoal: 'gain_strength' },
        updatedAt: new Date().toISOString(),
      };
      expect(needsOnboarding(inProgress)).toBe(true);
    });

    it('does not require onboarding when completed', () => {
      const completed: OnboardingState = {
        version: CURRENT_ONBOARDING_VERSION,
        currentStepIndex: 6,
        completed: true,
        completedVersion: CURRENT_ONBOARDING_VERSION,
        skipped: false,
        draftData: { fitnessGoal: 'build_muscle' },
        updatedAt: new Date().toISOString(),
      };
      expect(needsOnboarding(completed)).toBe(false);
    });

    it('does not require onboarding when explicitly skipped', () => {
      const skipped: OnboardingState = {
        version: CURRENT_ONBOARDING_VERSION,
        currentStepIndex: 1,
        completed: false,
        skipped: true,
        draftData: {},
        updatedAt: new Date().toISOString(),
      };
      expect(needsOnboarding(skipped)).toBe(false);
    });

    it('preserves completed status across version updates without forcing re-onboarding', () => {
      const existingUser: OnboardingState = {
        version: 1,
        currentStepIndex: 5,
        completed: true,
        completedVersion: 1,
        skipped: false,
        draftData: { experienceLevel: 'intermediate' },
        updatedAt: new Date(2025, 0, 1).toISOString(),
      };
      expect(needsOnboarding(existingUser, 2)).toBe(false);
    });
  });

  describe('getPersonalizedPlanRecommendation (Value Reveal)', () => {
    it('recommends Full Body Split for beginners or 2 days/week', () => {
      const rec = getPersonalizedPlanRecommendation({
        experienceLevel: 'beginner',
        trainingFrequency: 2,
        fitnessGoal: 'general_fitness',
      });
      expect(rec.splitName).toContain('Ganzkörper');
      expect(rec.recommendedDays).toBe(2);
      expect(rec.focusMuscles).toContain('Brust');
      expect(rec.focusMuscles).toContain('Core');
    });

    it('recommends Upper / Lower Split for intermediate or 3-4 days/week', () => {
      const rec = getPersonalizedPlanRecommendation({
        experienceLevel: 'intermediate',
        trainingFrequency: 4,
        fitnessGoal: 'build_muscle',
      });
      expect(rec.splitName).toContain('Oberkörper / Unterkörper');
      expect(rec.recommendedDays).toBe(4);
      expect(rec.focusMuscles).toContain('Schultern');
    });

    it('recommends PPL Split for advanced or 5+ days/week', () => {
      const rec = getPersonalizedPlanRecommendation({
        experienceLevel: 'advanced',
        trainingFrequency: 5,
        fitnessGoal: 'gain_strength',
      });
      expect(rec.splitName).toContain('Push / Pull / Beine');
      expect(rec.recommendedDays).toBe(5);
      expect(rec.focusMuscles).toContain('Trizeps');
      expect(rec.focusMuscles).toContain('Bizeps');
    });
  });
});
