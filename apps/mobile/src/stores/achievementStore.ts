import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import {
  WorkoutSession,
  ACHIEVEMENTS,
  Equipment,
  MuscleGroup,
  MovementPattern,
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
  repeatCounts: z.record(z.number().int().nonnegative()).default({}),
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
        const exerciseNames = Object.fromEntries(
          exerciseStore.exercises.map((ex) => [ex.id, ex.name]),
        );
        const newPRs = detectPRs(session, historyStore.sessions, exerciseNames);
        const sessionPrCount = newPRs.length;
        const sessionSetCount = session.exercises.reduce(
          (sum, ex) => sum + ex.sets.filter((s) => s.completed && s.type !== 'warmup').length,
          0,
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
          historyStore.sessions.flatMap((s) =>
            s.exercises
              .filter((ex) => ex.sets.some((set) => set.completed))
              .map((ex) => ex.exerciseId),
          ),
        ).size;

        const trainedMuscles = new Set<MuscleGroup>();
        historyStore.sessions.forEach((s) => {
          s.exercises.forEach((ex) => {
            if (!ex.sets.some((set) => set.completed)) return;
            const def = exerciseStore.exercises.find((e) => e.id === ex.exerciseId);
            if (def) {
              def.primaryMuscles.forEach((m) => trainedMuscles.add(m));
            }
          });
        });

        const earlyWorkoutCount = historyStore.sessions.filter((s) => {
          if (!s.completedAt) return false;
          return new Date(s.completedAt).getHours() < 8;
        }).length;
        const lateWorkoutCount = historyStore.sessions.filter((s) => {
          if (!s.completedAt) return false;
          return new Date(s.completedAt).getHours() >= 21;
        }).length;
        const weekendWorkoutCount = historyStore.sessions.filter((s) => {
          if (!s.completedAt) return false;
          const day = new Date(s.completedAt).getDay();
          return day === 0 || day === 6;
        }).length;
        const notedWorkoutCount = historyStore.sessions.filter((s) => {
          const hasSessionNote = typeof s.notes === 'string' && s.notes.trim().length > 0;
          const hasExerciseNote = s.exercises.some(
            (ex) => typeof ex.notes === 'string' && ex.notes.trim().length > 0,
          );
          return hasSessionNote || hasExerciseNote;
        }).length;
        const supersetWorkoutCount = historyStore.sessions.filter((s) =>
          s.exercises.some(
            (ex) => typeof ex.supersetGroup === 'string' && ex.supersetGroup.trim().length > 0,
          ),
        ).length;
        const warmupWorkoutCount = historyStore.sessions.filter((s) =>
          s.exercises.some((ex) => ex.sets.some((set) => set.completed && set.type === 'warmup')),
        ).length;
        const cardioWorkoutCount = historyStore.sessions.filter((s) =>
          s.exercises.some((ex) => {
            const def = exerciseStore.exercises.find((e) => e.id === ex.exerciseId);
            const isCardio =
              def && (def.movementPattern === 'cardio' || def.equipment === 'cardio_machine');
            return isCardio && ex.sets.some((set) => set.completed);
          }),
        ).length;
        const exerciseWorkoutCount = (predicate: (name: string) => boolean) =>
          historyStore.sessions.filter((s) =>
            s.exercises.some((ex) => {
              const def = exerciseStore.exercises.find((e) => e.id === ex.exerciseId);
              return Boolean(
                def && predicate(def.name.toLowerCase()) && ex.sets.some((set) => set.completed),
              );
            }),
          ).length;
        const muscleWorkoutCount = (muscles: MuscleGroup[]) =>
          historyStore.sessions.filter((s) =>
            s.exercises.some((ex) => {
              const def = exerciseStore.exercises.find((e) => e.id === ex.exerciseId);
              if (!def) return false;
              const trained = [...def.primaryMuscles, ...def.secondaryMuscles].some((muscle) =>
                muscles.includes(muscle),
              );
              return trained && ex.sets.some((set) => set.completed);
            }),
          ).length;
        const equipmentWorkoutCount = (equipment: Equipment[]) =>
          historyStore.sessions.filter((s) =>
            s.exercises.some((ex) => {
              const def = exerciseStore.exercises.find((e) => e.id === ex.exerciseId);
              return Boolean(
                def && equipment.includes(def.equipment) && ex.sets.some((set) => set.completed),
              );
            }),
          ).length;
        const movementWorkoutCount = (patterns: MovementPattern[]) =>
          historyStore.sessions.filter((s) =>
            s.exercises.some((ex) => {
              const def = exerciseStore.exercises.find((e) => e.id === ex.exerciseId);
              return Boolean(
                def &&
                patterns.includes(def.movementPattern) &&
                ex.sets.some((set) => set.completed),
              );
            }),
          ).length;
        const benchWorkoutCount = exerciseWorkoutCount((name) => name.includes('bench press'));
        const squatWorkoutCount = exerciseWorkoutCount((name) => name.includes('squat'));
        const deadliftWorkoutCount = exerciseWorkoutCount((name) => name.includes('deadlift'));
        const pullupWorkoutCount = exerciseWorkoutCount(
          (name) => name.includes('pullup') || name.includes('pull-up') || name.includes('chin'),
        );
        const dipWorkoutCount = exerciseWorkoutCount((name) => name.includes('dip'));
        const rowWorkoutCount = exerciseWorkoutCount((name) => name.includes('row'));
        const curlWorkoutCount = exerciseWorkoutCount((name) => name.includes('curl'));
        const overheadPressWorkoutCount = exerciseWorkoutCount(
          (name) => name.includes('shoulder press') || name.includes('overhead press'),
        );
        const coreWorkoutCount = muscleWorkoutCount([MuscleGroup.Abs, MuscleGroup.Obliques]);
        const shoulderWorkoutCount = muscleWorkoutCount([
          MuscleGroup.FrontDelts,
          MuscleGroup.SideDelts,
          MuscleGroup.RearDelts,
        ]);
        const backWorkoutCount = muscleWorkoutCount([
          MuscleGroup.UpperBack,
          MuscleGroup.Lats,
          MuscleGroup.LowerBack,
          MuscleGroup.Traps,
        ]);
        const armWorkoutCount = muscleWorkoutCount([
          MuscleGroup.Biceps,
          MuscleGroup.Triceps,
          MuscleGroup.Forearms,
        ]);
        const legWorkoutCount = muscleWorkoutCount([
          MuscleGroup.Quads,
          MuscleGroup.Hamstrings,
          MuscleGroup.Glutes,
          MuscleGroup.Calves,
        ]);
        const posteriorChainWorkoutCount = muscleWorkoutCount([
          MuscleGroup.Hamstrings,
          MuscleGroup.Glutes,
          MuscleGroup.LowerBack,
        ]);
        const calfWorkoutCount = muscleWorkoutCount([MuscleGroup.Calves]);
        const horizontalPushWorkoutCount = movementWorkoutCount([MovementPattern.HorizontalPush]);
        const rotationWorkoutCount = movementWorkoutCount([MovementPattern.Rotation]);
        const dumbbellWorkoutCount = equipmentWorkoutCount([Equipment.Dumbbell]);
        const cableWorkoutCount = equipmentWorkoutCount([Equipment.Cable]);
        const machineWorkoutCount = equipmentWorkoutCount([
          Equipment.Machine,
          Equipment.SmithMachine,
        ]);
        const calisthenicsWorkoutCount = equipmentWorkoutCount([
          Equipment.Bodyweight,
          Equipment.Trx,
        ]);
        const powerliftingWorkoutCount = historyStore.sessions.filter((s) =>
          s.exercises.some((ex) => {
            const def = exerciseStore.exercises.find((e) => e.id === ex.exerciseId);
            if (!def || !ex.sets.some((set) => set.completed)) return false;
            const name = def.name.toLowerCase();
            return (
              [Equipment.Barbell, Equipment.SmithMachine].includes(def.equipment) &&
              (name.includes('squat') || name.includes('bench press') || name.includes('deadlift'))
            );
          }),
        ).length;

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
              if (achId === 'early_bird' || achId === 'early_bird_5') {
                return earlyWorkoutCount;
              }
              if (achId === 'night_owl' || achId === 'night_owl_5') {
                return lateWorkoutCount;
              }
              if (achId === 'weekend_warrior' || achId === 'weekend_warrior_5') {
                return weekendWorkoutCount;
              }
              return 0;
            }
            case 'niche': {
              if (achId === 'mind_over_matter' || achId === 'note_archivist') {
                return notedWorkoutCount;
              }
              if (achId === 'superset_enthusiast' || achId === 'superset_scientist') {
                return supersetWorkoutCount;
              }
              if (achId === 'warmup_champion' || achId === 'warmup_ritualist') {
                return warmupWorkoutCount;
              }
              if (achId === 'cardio_lover' || achId === 'zone_two_scout') {
                return cardioWorkoutCount;
              }
              if (['bench_specialist', 'bench_technician'].includes(achId)) {
                return benchWorkoutCount;
              }
              if (['squat_specialist', 'squat_cartographer'].includes(achId)) {
                return squatWorkoutCount;
              }
              if (['deadlift_specialist', 'hinge_archivist'].includes(achId)) {
                return deadliftWorkoutCount;
              }
              if (['pullup_pioneer', 'vertical_pull_veteran'].includes(achId)) {
                return pullupWorkoutCount;
              }
              if (achId === 'dip_diplomat') {
                return dipWorkoutCount;
              }
              if (achId === 'row_scholar') {
                return rowWorkoutCount;
              }
              if (achId === 'curl_accountant') {
                return curlWorkoutCount;
              }
              if (achId === 'press_overhead_club') {
                return overheadPressWorkoutCount;
              }
              if (achId === 'shoulder_cartographer') {
                return shoulderWorkoutCount;
              }
              if (achId === 'back_day_cartographer') {
                return backWorkoutCount;
              }
              if (achId === 'arm_day_accountant') {
                return armWorkoutCount;
              }
              if (achId === 'calf_raises_club') {
                return calfWorkoutCount;
              }
              if (['core_cartographer', 'oblique_operator'].includes(achId)) {
                return coreWorkoutCount;
              }
              if (achId === 'leg_day_loyalist') {
                return legWorkoutCount;
              }
              if (achId === 'posterior_chain_club') {
                return posteriorChainWorkoutCount;
              }
              if (achId === 'horizontal_push_historian') {
                return horizontalPushWorkoutCount;
              }
              if (achId === 'rotation_scholar') {
                return rotationWorkoutCount;
              }
              if (achId === 'dumbbell_native') {
                return dumbbellWorkoutCount;
              }
              if (achId === 'cable_cartographer') {
                return cableWorkoutCount;
              }
              if (achId === 'machine_room_regular') {
                return machineWorkoutCount;
              }
              if (['calisthenics_cadet', 'bodyweight_bard'].includes(achId)) {
                return calisthenicsWorkoutCount;
              }
              if (['powerlifting_apprentice', 'big_three_regular'].includes(achId)) {
                return powerliftingWorkoutCount;
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

        const sessionMetric = (category: string, achId: string): number => {
          switch (category) {
            case 'workouts':
              return 1;
            case 'volume':
              return sessionVolume;
            case 'pr':
              return sessionPrCount;
            case 'session':
              if (achId === 'rep_session_sets_50') {
                return sessionSetCount;
              }
              return sessionSetCount;
            default:
              return 0;
          }
        };

        // --- Evaluate achievements (Two-pass to check meta achievements in the same workout) ---
        ACHIEVEMENTS.filter((ach) => ach.category !== 'meta').forEach((ach) => {
          if (ach.repeatable) {
            if (sessionMetric(ach.category, ach.id) >= ach.targetValue) {
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
        set({
          xp: 0,
          level: 1,
          unlockedAchievements: {},
          repeatCounts: {},
          newlyUnlocked: [],
          levelUpTo: null,
        }),
    }),
    {
      name: 'achievement-storage',
      storage: createHydratedStorage(
        'achievement-storage',
        achievementPersistedSchema,
        defaultPersistedState,
        2,
      ),
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
    },
  ),
);
