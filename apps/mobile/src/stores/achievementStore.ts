import { create } from 'zustand';
import { persist, PersistStorage } from 'zustand/middleware';
import { MMKV } from 'react-native-mmkv';
import { WorkoutSession, ACHIEVEMENTS, MuscleGroup } from '@fitness-tracker/domain';
import { useHistoryStore } from './historyStore';
import { useExerciseStore } from './exerciseStore';

const storage = new MMKV({ id: 'achievement-storage' });

const reviveDates = (key: string, value: unknown) => {
  if (typeof value === 'string' && /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/.test(value)) {
    return new Date(value);
  }
  return value;
};

const customStorage: PersistStorage<AchievementState> = {
  getItem: (name: string) => {
    const str = storage.getString(name);
    if (!str) return null;
    return JSON.parse(str, reviveDates);
  },
  setItem: (name: string, value: unknown) => {
    storage.set(name, JSON.stringify(value));
  },
  removeItem: (name: string) => storage.delete(name),
};

export interface AchievementState {
  xp: number;
  level: number;
  unlockedAchievements: Record<string, string>; // achievementId -> ISO date string
  newlyUnlocked: string[]; // achievementIds unlocked in the last finishWorkout
  levelUpTo: number | null; // level reached if leveled up in the last finishWorkout
  awardXpAndCheckAchievements: (session: WorkoutSession) => void;
  clearCelebrations: () => void;
  resetAchievements: () => void;
}

// Helpers for calculations
const calculatePRs = (sessionsList: WorkoutSession[]): Record<string, number> => {
  const prs: Record<string, number> = {};
  sessionsList.forEach(s => {
    s.exercises.forEach(ex => {
      ex.sets.forEach(set => {
        if (set.completed && set.weight) {
          if (!prs[ex.exerciseId] || set.weight > prs[ex.exerciseId]!) {
            prs[ex.exerciseId] = set.weight;
          }
        }
      });
    });
  });
  return prs;
};

const calculateTotalVolume = (sessionsList: WorkoutSession[]): number => {
  let total = 0;
  sessionsList.forEach(s => {
    s.exercises.forEach(ex => {
      ex.sets.forEach(set => {
        if (set.completed && set.weight && set.reps) {
          total += set.weight * set.reps;
        }
      });
    });
  });
  return total;
};

export const useAchievementStore = create<AchievementState>()(
  persist(
    (set, get) => ({
      xp: 0,
      level: 1,
      unlockedAchievements: {},
      newlyUnlocked: [],
      levelUpTo: null,

      awardXpAndCheckAchievements: (session) => {
        const historyStore = useHistoryStore.getState();
        const exerciseStore = useExerciseStore.getState();

        // 1. Calculate Volume Bonus
        let sessionVolume = 0;
        session.exercises.forEach(ex => {
          ex.sets.forEach(set => {
            if (set.completed && set.weight && set.reps) {
              sessionVolume += set.weight * set.reps;
            }
          });
        });
        const volumeXpBonus = Math.floor(sessionVolume / 100);

        // 2. Detect New PRs in this session
        const otherSessions = historyStore.sessions.filter(s => s.id !== session.id);
        const oldPRs = calculatePRs(otherSessions);
        
        let newPrCount = 0;
        session.exercises.forEach(ex => {
          let maxWeightInSession = 0;
          ex.sets.forEach(set => {
            if (set.completed && set.weight && set.weight > maxWeightInSession) {
              maxWeightInSession = set.weight;
            }
          });
          if (maxWeightInSession > 0) {
            const prevPR = oldPRs[ex.exerciseId];
            if (prevPR === undefined || maxWeightInSession > prevPR) {
              newPrCount++;
            }
          }
        });
        const prXpBonus = newPrCount * 100;

        // 3. Compute Session XP
        const baseSessionXp = 50;
        const totalSessionXp = baseSessionXp + volumeXpBonus + prXpBonus;

        const currentXp = get().xp;
        const currentLevel = get().level;
        const unlocked = { ...get().unlockedAchievements };
        const newlyUnlocked: string[] = [];

        // Temporary new XP total to evaluate achievements
        let tempXp = currentXp + totalSessionXp;

        // 4. Evaluate Achievements
        const totalWorkouts = historyStore.sessions.length;
        const streak = historyStore.getStreak();
        const totalPrs = Object.keys(historyStore.getPRs()).length;
        const totalVolume = calculateTotalVolume(historyStore.sessions);
        
        // Unique exercises trained
        const uniqueExercises = new Set(historyStore.sessions.flatMap(s => s.exercises.map(ex => ex.exerciseId)));
        const uniqueExercisesCount = uniqueExercises.size;

        // Muscle groups trained
        const trainedMuscles = new Set<MuscleGroup>();
        historyStore.sessions.forEach(s => {
          s.exercises.forEach(ex => {
            const def = exerciseStore.exercises.find(e => e.id === ex.exerciseId);
            if (def) {
              def.primaryMuscles.forEach(m => trainedMuscles.add(m));
            }
          });
        });
        // Check each locked achievement
        ACHIEVEMENTS.forEach(ach => {
          if (unlocked[ach.id]) return; // Already unlocked

          let isSatisfied = false;
          switch (ach.id) {
            case 'first_workout':
              isSatisfied = totalWorkouts >= ach.targetValue;
              break;
            case 'workouts_10':
            case 'workouts_50':
            case 'workouts_100':
              isSatisfied = totalWorkouts >= ach.targetValue;
              break;
            case 'streak_7':
            case 'streak_30':
              isSatisfied = streak >= ach.targetValue;
              break;
            case 'first_pr':
            case 'prs_10':
              isSatisfied = totalPrs >= ach.targetValue;
              break;
            case 'volume_10k':
            case 'volume_50k':
              isSatisfied = totalVolume >= ach.targetValue;
              break;
            case 'muscles_all':
              isSatisfied = trainedMuscles.size >= ach.targetValue;
              break;
            case 'unique_exercises_30':
              isSatisfied = uniqueExercisesCount >= ach.targetValue;
              break;
          }

          if (isSatisfied) {
            unlocked[ach.id] = new Date().toISOString();
            newlyUnlocked.push(ach.id);
            tempXp += ach.xpReward;
          }
        });

        // 5. Finalize XP & Level
        const newLevel = Math.floor(tempXp / 500) + 1;
        const levelUpTo = newLevel > currentLevel ? newLevel : null;

        set({
          xp: tempXp,
          level: newLevel,
          unlockedAchievements: unlocked,
          newlyUnlocked,
          levelUpTo,
        });
      },

      clearCelebrations: () => set({ newlyUnlocked: [], levelUpTo: null }),
      
      resetAchievements: () => set({ xp: 0, level: 1, unlockedAchievements: {}, newlyUnlocked: [], levelUpTo: null }),
    }),
    {
      name: 'achievement-storage',
      storage: customStorage,
    }
  )
);
