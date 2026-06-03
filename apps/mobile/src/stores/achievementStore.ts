import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { 
  WorkoutSession, 
  ACHIEVEMENTS, 
  MuscleGroup,
  calculateVolume,
  detectPRs
} from '@fitness-tracker/domain';
import { z } from 'zod';
import { useHistoryStore } from './historyStore';
import { useExerciseStore } from './exerciseStore';
import { createHydratedStorage } from './storage';

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

const achievementPersistedSchema = z.object({
  xp: z.number().int().nonnegative(),
  level: z.number().int().positive(),
  unlockedAchievements: z.record(z.string()),
  newlyUnlocked: z.array(z.string()),
  levelUpTo: z.number().int().positive().nullable(),
});

type AchievementPersistedState = z.infer<typeof achievementPersistedSchema>;

const defaultPersistedState: AchievementPersistedState = {
  xp: 0,
  level: 1,
  unlockedAchievements: {},
  newlyUnlocked: [],
  levelUpTo: null,
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

        // 1. Calculate Volume Bonus (excluding warmups)
        const sessionVolume = calculateVolume(session, { includeWarmups: false });
        const volumeXpBonus = Math.floor(sessionVolume / 100);

        // 2. Detect New PRs in this session (e1RM-based, excluding warmups)
        const newPRs = detectPRs(session, historyStore.sessions);
        const prXpBonus = newPRs.length * 100;

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
        
        let totalVolume = 0;
        historyStore.sessions.forEach(s => {
          totalVolume += calculateVolume(s, { includeWarmups: false });
        });
        
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
      storage: createHydratedStorage('achievement-storage', achievementPersistedSchema, defaultPersistedState),
      version: 1,
    }
  )
);
