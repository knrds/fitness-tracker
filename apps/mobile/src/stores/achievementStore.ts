import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import {
  WorkoutSession,
  ACHIEVEMENTS,
  MuscleGroup,
  calculateVolume,
  detectPRs,
} from '@fitness-tracker/domain';
import { z } from 'zod';
import { useHistoryStore } from './historyStore';
import { useExerciseStore } from './exerciseStore';
import { createHydratedStorage } from './storage';

export interface AchievementState {
  xp: number;
  level: number;
  unlockedAchievements: Record<string, string | Date>; // one-time achievementId -> unlock date
  repeatCounts: Record<string, number>; // repeatable achievementId -> times earned
  newlyUnlocked: string[]; // one-time achievementIds unlocked in the last finishWorkout
  levelUpTo: number | null; // level reached if leveled up in the last finishWorkout
  awardXpAndCheckAchievements: (session: WorkoutSession) => void;
  clearCelebrations: () => void;
  resetAchievements: () => void;
}

const achievementPersistedSchema = z.object({
  xp: z.number().int().nonnegative(),
  level: z.number().int().positive(),
  unlockedAchievements: z.record(z.union([z.string(), z.instanceof(Date)])),
  repeatCounts: z.record(z.number().int().nonnegative()),
  newlyUnlocked: z.array(z.string()),
  levelUpTo: z.number().int().positive().nullable(),
});

type AchievementPersistedState = z.infer<typeof achievementPersistedSchema>;

const defaultPersistedState: AchievementPersistedState = {
  xp: 0,
  level: 1,
  unlockedAchievements: {},
  repeatCounts: {},
  newlyUnlocked: [],
  levelUpTo: null,
};

export const useAchievementStore = create<AchievementState>()(
  persist(
    (set, get) => ({
      xp: 0,
      level: 1,
      unlockedAchievements: {},
      repeatCounts: {},
      newlyUnlocked: [],
      levelUpTo: null,

      awardXpAndCheckAchievements: (session) => {
        const historyStore = useHistoryStore.getState();
        const exerciseStore = useExerciseStore.getState();

        // --- Session-level metrics (for repeatable achievements) ---
        const sessionVolume = calculateVolume(session, { includeWarmups: false });
        const newPRs = detectPRs(session, historyStore.sessions);
        const sessionPrCount = newPRs.length;
        const sessionSetCount = session.exercises.reduce(
          (sum, ex) => sum + ex.sets.filter((s) => s.completed && s.type !== 'warmup').length,
          0
        );

        // --- Base session XP ---
        const volumeXpBonus = Math.floor(sessionVolume / 100);
        const prXpBonus = sessionPrCount * 100;
        const baseSessionXp = 50;
        const totalSessionXp = baseSessionXp + volumeXpBonus + prXpBonus;

        const currentXp = get().xp;
        const currentLevel = get().level;
        const unlocked = { ...get().unlockedAchievements };
        const repeatCounts = { ...get().repeatCounts };
        const newlyUnlocked: string[] = [];

        let tempXp = currentXp + totalSessionXp;

        // --- Cumulative metrics (for one-time achievements) ---
        const totalWorkouts = historyStore.sessions.length;
        const streak = historyStore.getStreak();
        const totalPrs = Object.keys(historyStore.getPRs()).length;

        let totalVolume = 0;
        historyStore.sessions.forEach((s) => {
          totalVolume += calculateVolume(s, { includeWarmups: false });
        });

        const uniqueExercisesCount = new Set(
          historyStore.sessions.flatMap((s) => s.exercises.map((ex) => ex.exerciseId))
        ).size;

        const trainedMuscles = new Set<MuscleGroup>();
        historyStore.sessions.forEach((s) => {
          s.exercises.forEach((ex) => {
            const def = exerciseStore.exercises.find((e) => e.id === ex.exerciseId);
            if (def) {
              def.primaryMuscles.forEach((m) => trainedMuscles.add(m));
            }
          });
        });

        const cumulativeMetric = (category: string, achId: string): number => {
          switch (category) {
            case 'workouts':
              return totalWorkouts;
            case 'streaks':
              return streak;
            case 'pr':
              return totalPrs;
            case 'volume':
              return totalVolume;
            case 'exercises':
              return uniqueExercisesCount;
            case 'muscles':
              return trainedMuscles.size;
            case 'time': {
              if (achId === 'early_bird') {
                return historyStore.sessions.some((s) => {
                  if (!s.completedAt) return false;
                  const date = new Date(s.completedAt);
                  return date.getHours() < 8;
                }) ? 1 : 0;
              }
              if (achId === 'night_owl') {
                return historyStore.sessions.some((s) => {
                  if (!s.completedAt) return false;
                  const date = new Date(s.completedAt);
                  return date.getHours() >= 21;
                }) ? 1 : 0;
              }
              if (achId === 'weekend_warrior') {
                return historyStore.sessions.some((s) => {
                  if (!s.completedAt) return false;
                  const date = new Date(s.completedAt);
                  const day = date.getDay(); // 0 = Sunday, 6 = Saturday
                  return day === 0 || day === 6;
                }) ? 1 : 0;
              }
              return 0;
            }
            case 'niche': {
              if (achId === 'mind_over_matter') {
                return historyStore.sessions.filter((s) => {
                  const hasSessionNote = typeof s.notes === 'string' && s.notes.trim().length > 0;
                  const hasExNote = s.exercises.some((ex) => typeof ex.notes === 'string' && ex.notes.trim().length > 0);
                  return hasSessionNote || hasExNote;
                }).length;
              }
              if (achId === 'superset_enthusiast') {
                return historyStore.sessions.filter((s) =>
                  s.exercises.some((ex) => typeof ex.supersetGroup === 'string' && ex.supersetGroup.trim().length > 0)
                ).length;
              }
              if (achId === 'warmup_champion') {
                return historyStore.sessions.filter((s) =>
                  s.exercises.some((ex) => ex.sets.some((set) => set.completed && set.type === 'warmup'))
                ).length;
              }
              if (achId === 'cardio_lover') {
                return historyStore.sessions.filter((s) =>
                  s.exercises.some((ex) => {
                    const def = exerciseStore.exercises.find((e) => e.id === ex.exerciseId);
                    const isCardio = def && (def.movementPattern === 'cardio' || def.equipment === 'cardio_machine');
                    return isCardio && ex.sets.some((set) => set.completed);
                  })
                ).length;
              }
              return 0;
            }
            case 'meta': {
              const unlockedList = Object.keys(unlocked);
              const nonMetaUnlocked = unlockedList.filter((id) => {
                const ach = ACHIEVEMENTS.find((a) => a.id === id);
                return ach && ach.category !== 'meta';
              });
              return nonMetaUnlocked.length;
            }
            default:
              return 0;
          }
        };

        const sessionMetric = (category: string): number => {
          switch (category) {
            case 'workouts':
              return 1;
            case 'volume':
              return sessionVolume;
            case 'pr':
              return sessionPrCount;
            case 'session':
              return sessionSetCount;
            default:
              return 0;
          }
        };

        // --- Evaluate achievements (Two-pass to check meta achievements in the same workout) ---
        ACHIEVEMENTS.filter((ach) => ach.category !== 'meta').forEach((ach) => {
          if (ach.repeatable) {
            if (sessionMetric(ach.category) >= ach.targetValue) {
              repeatCounts[ach.id] = (repeatCounts[ach.id] || 0) + 1;
              tempXp += ach.xpReward;
            }
          } else {
            if (unlocked[ach.id]) return;
            if (cumulativeMetric(ach.category, ach.id) >= ach.targetValue) {
              unlocked[ach.id] = new Date().toISOString();
              newlyUnlocked.push(ach.id);
              tempXp += ach.xpReward;
            }
          }
        });

        ACHIEVEMENTS.filter((ach) => ach.category === 'meta').forEach((ach) => {
          if (unlocked[ach.id]) return;
          if (cumulativeMetric(ach.category, ach.id) >= ach.targetValue) {
            unlocked[ach.id] = new Date().toISOString();
            newlyUnlocked.push(ach.id);
            tempXp += ach.xpReward;
          }
        });

        const newLevel = Math.floor(tempXp / 500) + 1;
        const levelUpTo = newLevel > currentLevel ? newLevel : null;

        set({
          xp: tempXp,
          level: newLevel,
          unlockedAchievements: unlocked,
          repeatCounts,
          newlyUnlocked,
          levelUpTo,
        });
      },

      clearCelebrations: () => set({ newlyUnlocked: [], levelUpTo: null }),

      resetAchievements: () =>
        set({ xp: 0, level: 1, unlockedAchievements: {}, repeatCounts: {}, newlyUnlocked: [], levelUpTo: null }),
    }),
    {
      name: 'achievement-storage',
      storage: createHydratedStorage('achievement-storage', achievementPersistedSchema, defaultPersistedState),
      version: 2,
      migrate: (persistedState) => {
        const parsed = achievementPersistedSchema.safeParse(persistedState);
        if (parsed.success) return parsed.data;
        // v1 -> v2: add repeatCounts if missing, keep prior progress where valid.
        const legacy = (persistedState ?? {}) as Partial<AchievementPersistedState>;
        return {
          ...defaultPersistedState,
          ...legacy,
          repeatCounts: legacy.repeatCounts ?? {},
        };
      },
    }
  )
);
