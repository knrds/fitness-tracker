import { useWorkoutStore } from './workoutStore';
import { useHistoryStore } from './historyStore';
import { useExerciseStore } from './exerciseStore';
import { useProgramStore } from './programStore';
import { useProfileStore } from './profileStore';
import { useBodyMetricStore } from './bodyMetricStore';
import { useAchievementStore } from './achievementStore';
import { useHydrationStore } from './hydrationStore';
import { useCaffeineStore } from './caffeineStore';
import { useCoachStore } from './coachStore';
import { useSyncStore } from './syncStore';

const stores = [
  useWorkoutStore,
  useHistoryStore,
  useExerciseStore,
  useProgramStore,
  useProfileStore,
  useBodyMetricStore,
  useAchievementStore,
  useHydrationStore,
  useCaffeineStore,
  useCoachStore,
  useSyncStore,
];

export const isPersistenceReady = () => stores.every((store) => store.persist.hasHydrated());
export function subscribeToHydration(listener: () => void) {
  const unsubscribes = stores.map((store) => store.persist.onFinishHydration(listener));
  return () => unsubscribes.forEach((unsubscribe) => unsubscribe());
}
export async function retryHydration() {
  // Failed stores never finish hydrating. Successful stores must not reload over live edits.
  await Promise.all(
    stores
      .filter((store) => !store.persist.hasHydrated())
      .map((store) => store.persist.rehydrate()),
  );
}
