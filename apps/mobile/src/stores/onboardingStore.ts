import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import {
  CURRENT_ONBOARDING_VERSION,
  ONBOARDING_STEPS,
  OnboardingStep,
  OnboardingGoal,
  OnboardingExperience,
  OnboardingEquipment,
  OnboardingState,
  OnboardingStateSchema,
  needsOnboarding,
} from '@fitness-tracker/domain';

import { createHydratedStorage } from './storage';
import { useProfileStore } from './profileStore';
import { monetizationAnalytics } from '../services/monetizationAnalytics';

export interface OnboardingStoreState extends OnboardingState {
  setGoal: (goal: OnboardingGoal) => void;
  setExperience: (level: OnboardingExperience) => void;
  setFrequency: (days: number) => void;
  setEquipment: (equipment: OnboardingEquipment) => void;
  nextStep: () => void;
  previousStep: () => void;
  skipStep: () => void;
  skipOnboarding: () => void;
  startOnboarding: () => void;
  completeOnboarding: () => void;
  resetOnboarding: () => void;
  getCurrentStep: () => OnboardingStep;
}

const defaultInitialState: OnboardingState = {
  version: CURRENT_ONBOARDING_VERSION,
  currentStepIndex: 0,
  completed: false,
  completedVersion: undefined,
  skipped: false,
  draftData: {},
  updatedAt: new Date().toISOString(),
};

export const useOnboardingStore = create<OnboardingStoreState>()(
  persist(
    (set, get) => ({
      ...defaultInitialState,

      setGoal: (goal: OnboardingGoal) =>
        set((state) => ({
          draftData: { ...state.draftData, fitnessGoal: goal },
          updatedAt: new Date().toISOString(),
        })),

      setExperience: (level: OnboardingExperience) =>
        set((state) => ({
          draftData: { ...state.draftData, experienceLevel: level },
          updatedAt: new Date().toISOString(),
        })),

      setFrequency: (days: number) =>
        set((state) => ({
          draftData: { ...state.draftData, trainingFrequency: days },
          updatedAt: new Date().toISOString(),
        })),

      setEquipment: (equipment: OnboardingEquipment) =>
        set((state) => ({
          draftData: { ...state.draftData, equipment },
          updatedAt: new Date().toISOString(),
        })),

      nextStep: () =>
        set((state) => {
          const nextIndex = Math.min(state.currentStepIndex + 1, ONBOARDING_STEPS.length - 1);
          return {
            currentStepIndex: nextIndex,
            updatedAt: new Date().toISOString(),
          };
        }),

      previousStep: () =>
        set((state) => {
          const prevIndex = Math.max(state.currentStepIndex - 1, 0);
          return {
            currentStepIndex: prevIndex,
            updatedAt: new Date().toISOString(),
          };
        }),

      skipStep: () => {
        get().nextStep();
      },

      skipOnboarding: () =>
        set(() => ({
          skipped: true,
          completed: false,
          updatedAt: new Date().toISOString(),
        })),

      startOnboarding: () => {
        monetizationAnalytics.track('onboarding_started', { step: 0 });
      },

      completeOnboarding: () => {
        const draft = get().draftData;
        // Sync collected profile attributes into profileStore without overwriting other fields
        const profileUpdates: Record<string, unknown> = {};
        if (draft.fitnessGoal) profileUpdates.fitnessGoal = draft.fitnessGoal;
        if (draft.experienceLevel) profileUpdates.experienceLevel = draft.experienceLevel;

        if (Object.keys(profileUpdates).length > 0) {
          useProfileStore.getState().updateProfile(profileUpdates);
        }

        monetizationAnalytics.track('onboarding_completed', {
          step: ONBOARDING_STEPS.length,
        });

        set(() => ({
          completed: true,
          completedVersion: CURRENT_ONBOARDING_VERSION,
          skipped: false,
          currentStepIndex: ONBOARDING_STEPS.length - 1,
          updatedAt: new Date().toISOString(),
        }));
      },

      resetOnboarding: () =>
        set(() => ({
          ...defaultInitialState,
          updatedAt: new Date().toISOString(),
        })),

      getCurrentStep: () => {
        const index = get().currentStepIndex;
        return ONBOARDING_STEPS[Math.min(index, ONBOARDING_STEPS.length - 1)] ?? 'welcome';
      },
    }),
    {
      name: 'onboarding-storage',
      storage: createHydratedStorage<OnboardingState>(
        'onboarding-storage',
        OnboardingStateSchema,
        defaultInitialState,
        CURRENT_ONBOARDING_VERSION,
      ),
      partialize: (state) => ({
        version: state.version,
        currentStepIndex: state.currentStepIndex,
        completed: state.completed,
        completedVersion: state.completedVersion,
        skipped: state.skipped,
        draftData: state.draftData,
        updatedAt: state.updatedAt,
      }),
      version: CURRENT_ONBOARDING_VERSION,
    },
  ),
);

export { needsOnboarding };
