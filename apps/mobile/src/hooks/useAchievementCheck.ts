import { useHistoryStore } from '../stores/historyStore';
import { useExerciseStore } from '../stores/exerciseStore';
import { ACHIEVEMENTS, MuscleGroup, calculateVolume } from '@fitness-tracker/domain';

export const useAchievementCheck = () => {
  const { sessions, getStreak, getPRs } = useHistoryStore();
  const { exercises } = useExerciseStore();

  const getProgress = (
    achievementId: string,
  ): { current: number; target: number; percent: number } => {
    const ach = ACHIEVEMENTS.find((a) => a.id === achievementId);
    if (!ach) return { current: 0, target: 1, percent: 0 };

    const target = ach.targetValue;
    let current = 0;

    // Progress is shown for one-time milestones, evaluated against cumulative
    // metrics by category. Repeatable / per-session achievements have no
    // cumulative progress bar.
    switch (ach.category) {
      case 'workouts':
        current = sessions.length;
        break;
      case 'streaks':
        current = getStreak();
        break;
      case 'pr':
        current = Object.keys(getPRs()).length;
        break;
      case 'volume':
        current = sessions.reduce(
          (total, session) => total + calculateVolume(session, { includeWarmups: false }),
          0,
        );
        break;
      case 'exercises': {
        const uniqueEx = new Set(
          sessions.flatMap((s) =>
            s.exercises
              .filter((ex) => ex.sets.some((set) => set.completed))
              .map((ex) => ex.exerciseId),
          ),
        );
        current = uniqueEx.size;
        break;
      }
      case 'muscles': {
        const trainedMuscles = new Set<MuscleGroup>();
        sessions.forEach((s) => {
          s.exercises.forEach((ex) => {
            if (!ex.sets.some((set) => set.completed)) return;
            const def = exercises.find((e) => e.id === ex.exerciseId);
            if (def) {
              def.primaryMuscles.forEach((m) => trainedMuscles.add(m));
            }
          });
        });
        current = trainedMuscles.size;
        break;
      }
      default:
        current = 0;
    }

    const percent = Math.min(100, Math.floor((current / target) * 100));
    return { current, target, percent };
  };

  return { getProgress };
};
