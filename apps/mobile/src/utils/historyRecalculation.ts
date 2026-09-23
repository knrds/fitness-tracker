import { useHistoryStore } from '../stores/historyStore';
import { useExerciseStore } from '../stores/exerciseStore';
import { useProfileStore } from '../stores/profileStore';
import { extractBigThreePRsFromHistory } from './bigThree';

/**
 * Deterministically recalculates Big Three PRs, lifetime volume, workout count,
 * current streak, and longest streak from the current history store sessions.
 * Never awards XP (guarantees no double award).
 */
export function recalculateDerivedStatsAfterHistoryMutation(): void {
  const sessions = useHistoryStore.getState().sessions;
  const exercises = useExerciseStore.getState().exercises;

  // 1. Recalculate Big Three Personal Records
  const bigThree = extractBigThreePRsFromHistory(sessions, exercises);
  useProfileStore.getState().updateProfile({
    benchPressMaxKg: bigThree.benchPressMaxKg,
    squatMaxKg: bigThree.squatMaxKg,
    deadliftMaxKg: bigThree.deadliftMaxKg,
  });

  // 2. Profile statistics (totalWorkouts, totalVolume, streaks) are derived dynamically
  // via useProfileStore.getState().getStatistics(), which reads directly from historyStore.
}
