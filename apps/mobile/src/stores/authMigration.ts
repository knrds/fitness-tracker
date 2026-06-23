import { LOCAL_USER_ID } from './local-user';
import { useExerciseStore } from './exerciseStore';
import { useProgramStore } from './programStore';
import { useHistoryStore } from './historyStore';
import { useBodyMetricStore } from './bodyMetricStore';
import { useProfileStore } from './profileStore';
import { useSyncStore } from './syncStore';
import { useAuthStore } from './authStore';

/**
 * Iterates through all local MMKV stores, rewriting records carrying LOCAL_USER_ID
 * to use the new authenticated Supabase user's UUID, and enqueues them for sync.
 */
export function migrateLocalUserData(newUserId: string) {
  const syncStore = useSyncStore.getState();

  // 1. Migrate Custom Exercises
  const exerciseStoreState = useExerciseStore.getState();
  const migratedCustomExercises = exerciseStoreState.customExercises.map((ex) => {
    if (ex.ownerId === LOCAL_USER_ID) {
      const updated = { ...ex, ownerId: newUserId, updatedAt: new Date() };
      syncStore.addToQueue('exercises', 'INSERT', updated);
      return updated;
    }
    return ex;
  });
  useExerciseStore.setState({
    customExercises: migratedCustomExercises,
    exercises: [
      ...useExerciseStore.getState().exercises.filter((e) => !e.isCustom),
      ...migratedCustomExercises,
    ],
  });

  // 2. Migrate Workout Templates
  const programStoreState = useProgramStore.getState();
  const migratedTemplates = programStoreState.templates.map((temp) => {
    if (temp.userId === LOCAL_USER_ID) {
      const updated = { ...temp, userId: newUserId, updatedAt: new Date() };
      syncStore.addToQueue('workout_templates', 'INSERT', updated);
      return updated;
    }
    return temp;
  });

  // 3. Migrate Programs
  const migratedPrograms = programStoreState.programs.map((prog) => {
    if (prog.userId === LOCAL_USER_ID) {
      const updated = { ...prog, userId: newUserId, updatedAt: new Date() };
      syncStore.addToQueue('programs', 'INSERT', updated);
      return updated;
    }
    return prog;
  });

  useProgramStore.setState({
    templates: migratedTemplates,
    programs: migratedPrograms,
  });

  // 4. Migrate Workout Sessions
  const historyStoreState = useHistoryStore.getState();
  const migratedSessions = historyStoreState.sessions.map((sess) => {
    if (sess.userId === LOCAL_USER_ID) {
      const updated = { ...sess, userId: newUserId, updatedAt: new Date() };
      syncStore.addToQueue('workout_sessions', 'INSERT', updated);
      return updated;
    }
    return sess;
  });
  useHistoryStore.setState({ sessions: migratedSessions });

  // 5. Migrate Body Metrics
  const bodyMetricStoreState = useBodyMetricStore.getState();
  const migratedMetrics = bodyMetricStoreState.metrics.map((met) => {
    if (met.userId === LOCAL_USER_ID) {
      const updated = { ...met, userId: newUserId };
      syncStore.addToQueue('body_metrics', 'INSERT', updated);
      return updated;
    }
    return met;
  });
  useBodyMetricStore.setState({ metrics: migratedMetrics });

  // 6. Create or update user profile row
  const profile = useProfileStore.getState().profile;
  const userPayload = {
    id: newUserId,
    email: useAuthStore.getState().user?.email || '',
    displayName: profile.displayName,
    biologicalSex: profile.biologicalSex || null,
    heightCm: profile.heightCm || null,
    preferredUnits: profile.preferredUnits,
    fitnessGoal: profile.fitnessGoal || null,
    experienceLevel: profile.experienceLevel || null,
    createdAt: new Date(),
    updatedAt: new Date(),
  };
  syncStore.addToQueue('users', 'INSERT', userPayload);
}
