import { useHistoryStore } from '../stores/historyStore';
import { useExerciseStore } from '../stores/exerciseStore';
import { ACHIEVEMENTS, MuscleGroup } from '@fitness-tracker/domain';

export const useAchievementCheck = () => {
  const { sessions, getStreak, getPRs } = useHistoryStore();
  const { exercises } = useExerciseStore();

  const getProgress = (achievementId: string): { current: number; target: number; percent: number } => {
    const ach = ACHIEVEMENTS.find(a => a.id === achievementId);
    if (!ach) return { current: 0, target: 1, percent: 0 };

    const target = ach.targetValue;
    let current = 0;

    switch (achievementId) {
      case 'first_workout':
      case 'workouts_10':
      case 'workouts_50':
      case 'workouts_100':
        current = sessions.length;
        break;
      case 'streak_7':
      case 'streak_30':
        current = getStreak();
        break;
      case 'first_pr':
      case 'prs_10':
        current = Object.keys(getPRs()).length;
        break;
      case 'volume_10k':
      case 'volume_50k':
        // Calculate total volume
        current = sessions.reduce((total, s) => {
          return total + s.exercises.reduce((exTotal, ex) => {
            return exTotal + ex.sets.reduce((setTotal, set) => {
              if (set.completed && set.weight && set.reps) {
                return setTotal + set.weight * set.reps;
              }
              return setTotal;
            }, 0);
          }, 0);
        }, 0);
        break;
      case 'muscles_all': {
        // Unique muscle groups trained
        const trainedMuscles = new Set<MuscleGroup>();
        sessions.forEach(s => {
          s.exercises.forEach(ex => {
            const def = exercises.find(e => e.id === ex.exerciseId);
            if (def) {
              def.primaryMuscles.forEach(m => trainedMuscles.add(m));
            }
          });
        });
        current = trainedMuscles.size;
        break;
      }
      case 'unique_exercises_30': {
        const uniqueEx = new Set(sessions.flatMap(s => s.exercises.map(ex => ex.exerciseId)));
        current = uniqueEx.size;
        break;
      }
    }

    const percent = Math.min(100, Math.floor((current / target) * 100));
    return { current, target, percent };
  };

  return { getProgress };
};
