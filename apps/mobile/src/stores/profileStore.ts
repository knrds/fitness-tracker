import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import {
  FitnessGoal,
  ExperienceLevel,
  UnitSystem,
  EXERCISES,
  BiologicalSex,
  FitnessGoalSchema,
  ExperienceLevelSchema,
  UnitSystemSchema,
  BiologicalSexSchema,
  calculateVolume,
  calculateLongestStreak,
  formatDateLocal,
} from '@fitness-tracker/domain';
import { z } from 'zod';
import { useHistoryStore } from './historyStore';
import { useExerciseStore } from './exerciseStore';
import { useBodyMetricStore } from './bodyMetricStore';
import { useProgramStore, getDefaultTemplates, getDefaultPrograms } from './programStore';
import { useAchievementStore } from './achievementStore';
import { useWorkoutStore } from './workoutStore';
import { useCaffeineStore } from './caffeineStore';
import { useHydrationStore } from './hydrationStore';
import { createHydratedStorage } from './storage';

export interface Profile {
  displayName: string;
  fitnessGoal?: FitnessGoal;
  experienceLevel?: ExperienceLevel;
  preferredUnits: UnitSystem;
  biologicalSex?: BiologicalSex;
  heightCm?: number;
  weightKg?: number;
  benchPressMaxKg?: number;
  squatMaxKg?: number;
  deadliftMaxKg?: number;
  showRpe?: boolean;
  showRir?: boolean;
  rpeMode?: 'always_on' | 'always_off' | 'selected_exercises';
  rirMode?: 'always_on' | 'always_off' | 'selected_exercises';
  rpeEnabledExerciseIds?: string[];
  rirEnabledExerciseIds?: string[];
  profileImageUri?: string;
}

export interface ProfileState {
  profile: Profile;
  updateProfile: (updates: Partial<Profile>) => void;
  getStatistics: () => {
    totalWorkouts: number;
    totalVolume: number; // expressed in preferred units
    longestStreak: number;
    currentStreak: number;
  };
  clearAllData: () => void;
  exportData: () => string;
}

const defaultProfile: Profile = {
  displayName: 'User',
  preferredUnits: 'metric',
  showRpe: true,
  showRir: true,
  rpeMode: 'always_on',
  rirMode: 'always_on',
  rpeEnabledExerciseIds: [],
  rirEnabledExerciseIds: [],
};

const profileStateSchema = z.object({
  displayName: z.string(),
  fitnessGoal: FitnessGoalSchema.optional(),
  experienceLevel: ExperienceLevelSchema.optional(),
  preferredUnits: UnitSystemSchema,
  biologicalSex: BiologicalSexSchema.optional(),
  heightCm: z.number().optional(),
  weightKg: z.number().optional(),
  benchPressMaxKg: z.number().optional(),
  squatMaxKg: z.number().optional(),
  deadliftMaxKg: z.number().optional(),
  showRpe: z.boolean().optional(),
  showRir: z.boolean().optional(),
  rpeMode: z.enum(['always_on', 'always_off', 'selected_exercises']).optional(),
  rirMode: z.enum(['always_on', 'always_off', 'selected_exercises']).optional(),
  rpeEnabledExerciseIds: z.array(z.string()).optional(),
  rirEnabledExerciseIds: z.array(z.string()).optional(),
  profileImageUri: z.string().optional(),
});

const profilePersistedSchema = z.object({
  profile: profileStateSchema,
});

type ProfilePersistedState = z.infer<typeof profilePersistedSchema>;

const defaultPersistedState: ProfilePersistedState = {
  profile: defaultProfile,
};

export const useProfileStore = create<ProfileState>()(
  persist(
    (set, get) => ({
      profile: defaultProfile,

      updateProfile: (updates) =>
        set((state) => ({
          profile: { ...state.profile, ...updates },
        })),

      getStatistics: () => {
        const sessions = useHistoryStore.getState().sessions;
        const totalWorkouts = sessions.length;

        // Calculate total volume (canonical kg) excluding warmups
        let totalVolumeKg = 0;
        sessions.forEach((session) => {
          totalVolumeKg += calculateVolume(session, { includeWarmups: false });
        });

        // Convert volume based on user's preferred units
        const preferredUnits = get().profile.preferredUnits;
        const totalVolume =
          preferredUnits === 'imperial'
            ? Math.round(totalVolumeKg * 2.20462)
            : Math.round(totalVolumeKg);

        // Longest Streak (derived from unique local dates)
        // Longest Streak (derived from unique local dates)
        const longestStreak = calculateLongestStreak(sessions);

        // Current Streak (uses timezone-fixed helper via historyStore)
        const currentStreak = useHistoryStore.getState().getStreak();

        return {
          totalWorkouts,
          totalVolume,
          longestStreak,
          currentStreak,
        };
      },

      clearAllData: () => {
        // Reset all MMKV persisted stores by setting their Zustand state directly

        // 1. Profile Store
        set({ profile: defaultProfile });

        // 2. History Store
        useHistoryStore.setState({ sessions: [] });

        // 3. Workout Store
        useWorkoutStore.getState().resetWorkout();

        // 4. Exercise Store
        useExerciseStore.setState({
          exercises: EXERCISES,
          filteredExercises: EXERCISES,
          selectedMuscleGroup: null,
          selectedEquipment: null,
          searchQuery: '',
          favoriteIds: [],
          customExercises: [],
          exerciseRestDurations: {},
          persistentNotes: {},
        });

        // 5. Body Metric Store
        useBodyMetricStore.setState({ metrics: [] });

        // 6. Achievement Store
        useAchievementStore.getState().resetAchievements();

        // 7. Program Store
        useProgramStore.setState({
          programs: getDefaultPrograms(),
          templates: getDefaultTemplates(),
        });

        // 8. Caffeine Store
        useCaffeineStore.setState({
          isEnabled: true,
          currentWorkoutMg: 0,
          lastWorkoutMg: 0,
        });

        // 9. Hydration Store
        useHydrationStore.setState({
          dateKey: formatDateLocal(new Date()),
          dailyGoalMl: 2500,
          todayIntakeMl: 0,
        });
      },

      exportData: () => {
        const data = {
          profile: get().profile,
          history: useHistoryStore.getState().sessions,
          customExercises: useExerciseStore.getState().customExercises,
          favorites: useExerciseStore.getState().favoriteIds,
          bodyMetrics: useBodyMetricStore.getState().metrics,
        };

        return JSON.stringify(data, null, 2);
      },
    }),
    {
      name: 'profile-storage',
      storage: createHydratedStorage(
        'profile-storage',
        profilePersistedSchema,
        defaultPersistedState,
      ),
      version: 1,
      migrate: (persistedState) => {
        const parsed = profilePersistedSchema.safeParse(persistedState);
        return parsed.success ? parsed.data : defaultPersistedState;
      },
    },
  ),
);
