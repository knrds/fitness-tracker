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

import type { StoreApi } from 'zustand';
import { withoutStorageWrites } from '../data/storageTransaction';
import { selectStoragePartition } from '../data/storageScope';
import { useStorageHealth } from './storageHealth';

function trackStore<T>(
  store: StoreApi<T> & {
    persist: {
      hasHydrated: () => boolean;
      rehydrate: () => Promise<void> | void;
      onFinishHydration: (listener: () => void) => () => void;
    };
  },
) {
  return { persist: store.persist, reset: () => store.setState(store.getInitialState(), true) };
}

const stores = [
  trackStore(useWorkoutStore),
  trackStore(useHistoryStore),
  trackStore(useExerciseStore),
  trackStore(useProgramStore),
  trackStore(useProfileStore),
  trackStore(useBodyMetricStore),
  trackStore(useAchievementStore),
  trackStore(useHydrationStore),
  trackStore(useCaffeineStore),
  trackStore(useCoachStore),
  trackStore(useSyncStore),
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

export async function switchPersistencePartition(partition: string, generation: number) {
  if (!selectStoragePartition(partition, generation)) return;
  withoutStorageWrites(() => stores.forEach((store) => store.reset()));
  useStorageHealth.setState({ blockedStores: [], writeError: false });
  await Promise.all(stores.map((store) => store.persist.rehydrate()));
  if (!isPersistenceReady() || useStorageHealth.getState().blockedStores.length)
    throw new Error('Account storage could not be loaded');
}
