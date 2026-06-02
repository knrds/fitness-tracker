import { create } from 'zustand';
import { persist, PersistStorage } from 'zustand/middleware';
import { MMKV } from 'react-native-mmkv';
import { FitnessGoal, ExperienceLevel, UnitSystem, EXERCISES } from '@fitness-tracker/domain';
import { useHistoryStore } from './historyStore';
import { useWorkoutStore } from './workoutStore';
import { useExerciseStore } from './exerciseStore';
import { useBodyMetricStore } from './bodyMetricStore';

const storage = new MMKV({ id: 'profile-storage' });

const customStorage: PersistStorage<ProfileState> = {
  getItem: (name: string) => {
    const str = storage.getString(name);
    if (!str) return null;
    return JSON.parse(str);
  },
  setItem: (name: string, value: unknown) => {
    storage.set(name, JSON.stringify(value));
  },
  removeItem: (name: string) => storage.delete(name),
};

export interface Profile {
  displayName: string;
  fitnessGoal?: FitnessGoal;
  experienceLevel?: ExperienceLevel;
  preferredUnits: UnitSystem;
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
};

export const useProfileStore = create<ProfileState>()(
  persist(
    (set, get) => ({
      profile: defaultProfile,

      updateProfile: (updates) => set((state) => ({
        profile: { ...state.profile, ...updates }
      })),

      getStatistics: () => {
        const sessions = useHistoryStore.getState().sessions;
        const totalWorkouts = sessions.length;

        // Calculate total volume (canonical kg)
        let totalVolumeKg = 0;
        sessions.forEach((session) => {
          session.exercises.forEach((ex) => {
            ex.sets.forEach((set) => {
              if (set.completed && set.weight && set.reps) {
                totalVolumeKg += set.weight * set.reps;
              }
            });
          });
        });

        // Convert volume based on user's preferred units
        const preferredUnits = get().profile.preferredUnits;
        const totalVolume = preferredUnits === 'imperial'
          ? Math.round(totalVolumeKg * 2.20462)
          : Math.round(totalVolumeKg);

        // Longest Streak
        let longestStreak = 0;
        if (sessions.length > 0) {
          const uniqueDates = Array.from(new Set(sessions.map((s) => {
            const d = new Date(s.startedAt);
            d.setHours(0, 0, 0, 0);
            return d.getTime();
          }))).sort((a, b) => a - b);

          let currentStreak = 0;
          let prevTime: number | null = null;
          const oneDayMs = 24 * 60 * 60 * 1000;

          for (const time of uniqueDates) {
            if (prevTime === null) {
              currentStreak = 1;
            } else {
              const diff = time - prevTime;
              if (diff <= oneDayMs) {
                if (diff > 0) {
                  currentStreak++;
                }
              } else {
                longestStreak = Math.max(longestStreak, currentStreak);
                currentStreak = 1;
              }
            }
            prevTime = time;
          }
          longestStreak = Math.max(longestStreak, currentStreak);
        }

        // Current Streak
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
        useWorkoutStore.setState({
          status: 'idle',
          name: '',
          elapsedSeconds: 0,
          currentExerciseIndex: 0,
          currentSetIndex: 0,
          exercises: [],
          restTimer: {
            isRunning: false,
            durationSeconds: 90,
          },
        });

        // 4. Exercise Store
        useExerciseStore.setState({
          exercises: EXERCISES,
          filteredExercises: EXERCISES,
          selectedMuscleGroup: null,
          selectedEquipment: null,
          searchQuery: '',
          favoriteIds: [],
          customExercises: [],
        });

        // 5. Body Metric Store
        useBodyMetricStore.setState({ metrics: [] });
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
      storage: customStorage,
      version: 1,
    }
  )
);
