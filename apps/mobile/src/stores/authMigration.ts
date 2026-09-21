import { LOCAL_USER_ID } from './local-user';
import { useExerciseStore } from './exerciseStore';
import { useProgramStore } from './programStore';
import { useHistoryStore } from './historyStore';
import { useBodyMetricStore } from './bodyMetricStore';
import { useProfileStore, Profile } from './profileStore';
import { useAchievementStore } from './achievementStore';
import { useWorkoutStore } from './workoutStore';
import { useSyncStore } from './syncStore';
import { useAuthStore } from './authStore';
import { purgeLegacyPartition } from './storage';
import {
  WorkoutSession,
  Exercise,
  WorkoutTemplate,
  Program,
  BodyMetric,
  calculateLevelFromXp,
} from '@fitness-tracker/domain';
import * as Crypto from '../utils/uuid';

const DEFAULT_TEMPLATE_ID_SET = new Set([
  '10000000-0000-4000-8000-000000000001',
  '10000000-0000-4000-8000-000000000002',
  '10000000-0000-4000-8000-000000000003',
  '10000000-0000-4000-8000-000000000004',
  '10000000-0000-4000-8000-000000000005',
  '10000000-0000-4000-8000-000000000006',
  '10000000-0000-4000-8000-000000000007',
  '10000000-0000-4000-8000-000000000008',
  '10000000-0000-4000-8000-000000000009',
  '10000000-0000-4000-8000-000000000010',
  '10000000-0000-4000-8000-000000000011',
]);

const DEFAULT_PROGRAM_ID_SET = new Set([
  '20000000-0000-4000-8000-000000000001',
  '20000000-0000-4000-8000-000000000002',
  '20000000-0000-4000-8000-000000000003',
  '20000000-0000-4000-8000-000000000004',
  '20000000-0000-4000-8000-000000000005',
]);

export interface GuestSnapshotProfile {
  heightCm?: number;
  weightKg?: number;
  biologicalSex?: Profile['biologicalSex'];
  fitnessGoal?: Profile['fitnessGoal'];
  experienceLevel?: Profile['experienceLevel'];
  preferredUnits?: Profile['preferredUnits'];
  colorway?: Profile['colorway'];
  celebrationEffect?: Profile['celebrationEffect'];
}

export interface GuestSnapshot {
  sessions: WorkoutSession[];
  customExercises: Exercise[];
  persistentNotes?: Record<string, string>;
  exerciseRestDurations?: Record<string, number>;
  favoriteExerciseIds?: string[];
  templates: WorkoutTemplate[];
  programs: Program[];
  customFolders?: string[];
  metrics: BodyMetric[];
  activeSession: WorkoutSession | null;
  achievements: {
    xp: number;
    level: number;
    unlockedAchievements: Record<string, string | Date>;
    repeatCounts: Record<string, number>;
    awardedSessionIds: string[];
  };
  profile: GuestSnapshotProfile;
}

export function isDefaultTemplate(id: string): boolean {
  return DEFAULT_TEMPLATE_ID_SET.has(id);
}

export function isDefaultProgram(id: string): boolean {
  return DEFAULT_PROGRAM_ID_SET.has(id);
}

/**
 * Captures all local guest-scoped data before switching away from the legacy partition.
 */
export function captureGuestSnapshot(): GuestSnapshot {
  const history = useHistoryStore.getState();
  const exercise = useExerciseStore.getState();
  const program = useProgramStore.getState();
  const metric = useBodyMetricStore.getState();
  const achievement = useAchievementStore.getState();
  const profile = useProfileStore.getState().profile;
  const workout = useWorkoutStore.getState();

  const sessions = history.sessions.filter(
    (s) => s.userId === LOCAL_USER_ID || !s.userId,
  );
  const customExercises = exercise.customExercises.filter(
    (e) => e.ownerId === LOCAL_USER_ID || !e.ownerId,
  );
  const templates = program.templates.filter(
    (t) => (t.userId === LOCAL_USER_ID || !t.userId) && !isDefaultTemplate(t.id),
  );
  const programs = program.programs.filter(
    (p) => (p.userId === LOCAL_USER_ID || !p.userId) && !isDefaultProgram(p.id),
  );
  const metrics = metric.metrics.filter(
    (m) => m.userId === LOCAL_USER_ID || !m.userId,
  );

  let activeSession: WorkoutSession | null = null;
  if (workout.status !== 'idle' && workout.sessionId) {
    activeSession = {
      id: workout.sessionId,
      userId: LOCAL_USER_ID,
      name: workout.name || 'Workout',
      startedAt: workout.startedAt || new Date(),
      createdAt: workout.startedAt || new Date(),
      updatedAt: new Date(),
      exercises: workout.exercises,
      notes: workout.notes,
    };
  }

  return {
    sessions,
    customExercises,
    persistentNotes: exercise.persistentNotes,
    exerciseRestDurations: exercise.exerciseRestDurations,
    favoriteExerciseIds: exercise.favoriteIds,
    templates,
    programs,
    customFolders: program.customFolders,
    metrics,
    activeSession,
    achievements: {
      xp: achievement.xp,
      level: achievement.level,
      unlockedAchievements: { ...achievement.unlockedAchievements },
      repeatCounts: { ...achievement.repeatCounts },
      awardedSessionIds: [...achievement.awardedSessionIds],
    },
    profile: {
      ...(profile.heightCm !== undefined ? { heightCm: profile.heightCm } : {}),
      ...(profile.weightKg !== undefined ? { weightKg: profile.weightKg } : {}),
      ...(profile.biologicalSex !== undefined ? { biologicalSex: profile.biologicalSex } : {}),
      ...(profile.fitnessGoal !== undefined ? { fitnessGoal: profile.fitnessGoal } : {}),
      ...(profile.experienceLevel !== undefined ? { experienceLevel: profile.experienceLevel } : {}),
      ...(profile.preferredUnits !== undefined ? { preferredUnits: profile.preferredUnits } : {}),
      ...(profile.colorway !== undefined ? { colorway: profile.colorway } : {}),
      ...(profile.celebrationEffect !== undefined ? { celebrationEffect: profile.celebrationEffect } : {}),
    },
  };
}

/**
 * Checks whether the guest snapshot contains user-generated data that warrants migration.
 */
export function hasGuestData(snapshot: GuestSnapshot): boolean {
  return (
    snapshot.sessions.length > 0 ||
    snapshot.customExercises.length > 0 ||
    snapshot.templates.length > 0 ||
    snapshot.programs.length > 0 ||
    snapshot.metrics.length > 0 ||
    snapshot.achievements.xp > 0 ||
    Object.keys(snapshot.achievements.unlockedAchievements).length > 0 ||
    snapshot.activeSession !== null ||
    Boolean(snapshot.customFolders && snapshot.customFolders.length > 0)
  );
}

function areSessionsEquivalent(a: WorkoutSession, b: WorkoutSession): boolean {
  return (
    a.name === b.name &&
    Math.abs(new Date(a.startedAt).getTime() - new Date(b.startedAt).getTime()) < 1000 &&
    a.exercises.length === b.exercises.length
  );
}

/**
 * Idempotently merges guest data into the authenticated account partition,
 * resolves collisions safely, enqueues sync items, and purges the legacy partition.
 */
export async function migrateGuestSnapshotToAccount(
  snapshot: GuestSnapshot,
  newUserId: string,
): Promise<void> {
  const syncStore = useSyncStore.getState();
  const exerciseIdMap = new Map<string, string>();

  // 1. Custom Exercises
  const exerciseStore = useExerciseStore.getState();
  const existingCustom = exerciseStore.customExercises;
  const existingExercises = exerciseStore.exercises;
  const customExercisesToAdd: Exercise[] = [];

  for (const guestEx of snapshot.customExercises) {
    // Exact ID match in account
    const existingById = existingCustom.find((e) => e.id === guestEx.id);
    if (existingById) {
      exerciseIdMap.set(guestEx.id, existingById.id);
      continue;
    }

    // Name match in account exercises
    const existingByName = existingExercises.find(
      (e) => e.name.trim().toLowerCase() === guestEx.name.trim().toLowerCase(),
    );
    if (existingByName) {
      exerciseIdMap.set(guestEx.id, existingByName.id);
      continue;
    }

    // Collision with a standard exercise ID or different item
    const isStandardCollision = existingExercises.some((e) => e.id === guestEx.id);
    const newId = isStandardCollision ? Crypto.randomUUID() : guestEx.id;
    exerciseIdMap.set(guestEx.id, newId);

    const migratedEx: Exercise = {
      ...guestEx,
      id: newId,
      ownerId: newUserId,
      updatedAt: new Date(),
    };
    customExercisesToAdd.push(migratedEx);
    syncStore.addToQueue('exercises', 'INSERT', migratedEx);
  }

  if (customExercisesToAdd.length > 0) {
    const updatedCustom = [...existingCustom, ...customExercisesToAdd];
    useExerciseStore.setState({
      customExercises: updatedCustom,
      exercises: [
        ...exerciseStore.exercises.filter((e) => !e.isCustom),
        ...updatedCustom,
      ],
      persistentNotes: {
        ...(snapshot.persistentNotes ?? {}),
        ...exerciseStore.persistentNotes,
      },
      exerciseRestDurations: {
        ...(snapshot.exerciseRestDurations ?? {}),
        ...exerciseStore.exerciseRestDurations,
      },
    });
  }

  // 2. Workout Sessions
  const historyStore = useHistoryStore.getState();
  const existingSessions = historyStore.sessions;
  const existingSessionIds = new Set(existingSessions.map((s) => s.id));
  const sessionsToAdd: WorkoutSession[] = [];

  for (const guestSession of snapshot.sessions) {
    let sessionId = guestSession.id;

    if (existingSessionIds.has(sessionId)) {
      const existing = existingSessions.find((s) => s.id === sessionId);
      if (existing && areSessionsEquivalent(existing, guestSession)) {
        // Idempotent duplicate: already migrated
        continue;
      }
      // Collision with a different session: allocate new UUID to preserve both
      sessionId = Crypto.randomUUID();
    }

    const exercises = guestSession.exercises.map((ex) => {
      const remappedExId = exerciseIdMap.get(ex.exerciseId) ?? ex.exerciseId;
      return {
        ...ex,
        exerciseId: remappedExId,
        sessionId,
      };
    });

    const migratedSession: WorkoutSession = {
      ...guestSession,
      id: sessionId,
      userId: newUserId,
      exercises,
      updatedAt: new Date(),
    };

    sessionsToAdd.push(migratedSession);
    existingSessionIds.add(sessionId);
    syncStore.addToQueue('workout_sessions', 'INSERT', migratedSession);
  }

  if (sessionsToAdd.length > 0) {
    useHistoryStore.setState({
      sessions: [...existingSessions, ...sessionsToAdd],
    });
  }

  // 3. Templates and Programs
  const programStore = useProgramStore.getState();
  const existingTemplates = programStore.templates;
  const existingPrograms = programStore.programs;
  const templateIdMap = new Map<string, string>();
  const templatesToAdd: WorkoutTemplate[] = [];

  for (const guestTemplate of snapshot.templates) {
    const existingById = existingTemplates.find((t) => t.id === guestTemplate.id);
    if (existingById) {
      if (existingById.name.trim().toLowerCase() === guestTemplate.name.trim().toLowerCase()) {
        templateIdMap.set(guestTemplate.id, existingById.id);
        continue;
      }
    }
    const newId = existingById ? Crypto.randomUUID() : guestTemplate.id;
    templateIdMap.set(guestTemplate.id, newId);

    const exercises = guestTemplate.exercises.map((ex) => ({
      ...ex,
      exerciseId: exerciseIdMap.get(ex.exerciseId) ?? ex.exerciseId,
    }));

    const migratedTemplate: WorkoutTemplate = {
      ...guestTemplate,
      id: newId,
      userId: newUserId,
      exercises,
      updatedAt: new Date(),
    };
    templatesToAdd.push(migratedTemplate);
    syncStore.addToQueue('workout_templates', 'INSERT', migratedTemplate);
  }

  const programsToAdd: Program[] = [];
  for (const guestProg of snapshot.programs) {
    const existingById = existingPrograms.find((p) => p.id === guestProg.id);
    if (existingById) {
      if (existingById.name.trim().toLowerCase() === guestProg.name.trim().toLowerCase()) {
        continue;
      }
    }
    const newId = existingById ? Crypto.randomUUID() : guestProg.id;
    const workouts = guestProg.workouts.map((w) => ({
      ...w,
      templateId: templateIdMap.get(w.templateId) ?? w.templateId,
    }));

    const migratedProg: Program = {
      ...guestProg,
      id: newId,
      userId: newUserId,
      workouts,
      updatedAt: new Date(),
    };
    programsToAdd.push(migratedProg);
    syncStore.addToQueue('programs', 'INSERT', migratedProg);
  }

  if (templatesToAdd.length > 0 || programsToAdd.length > 0) {
    useProgramStore.setState({
      templates: [...existingTemplates, ...templatesToAdd],
      programs: [...existingPrograms, ...programsToAdd],
      customFolders: Array.from(
        new Set([...(programStore.customFolders ?? []), ...(snapshot.customFolders ?? [])]),
      ),
    });
  }

  // 4. Body Metrics
  const metricStore = useBodyMetricStore.getState();
  const existingMetrics = metricStore.metrics;
  const existingMetricIds = new Set(existingMetrics.map((m) => m.id));
  const metricsToAdd: BodyMetric[] = [];

  for (const guestMetric of snapshot.metrics) {
    let metricId = guestMetric.id;
    if (existingMetricIds.has(metricId)) {
      const existing = existingMetrics.find((m) => m.id === metricId);
      if (existing && Math.abs(new Date(existing.recordedAt).getTime() - new Date(guestMetric.recordedAt).getTime()) < 1000) {
        continue;
      }
      metricId = Crypto.randomUUID();
    }

    const duplicateTimestamp = existingMetrics.find(
      (m) =>
        m.weightKg === guestMetric.weightKg &&
        Math.abs(new Date(m.recordedAt).getTime() - new Date(guestMetric.recordedAt).getTime()) < 1000,
    );
    if (duplicateTimestamp) continue;

    const migratedMetric: BodyMetric = {
      ...guestMetric,
      id: metricId,
      userId: newUserId,
    };
    metricsToAdd.push(migratedMetric);
    existingMetricIds.add(metricId);
    syncStore.addToQueue('body_metrics', 'INSERT', migratedMetric);
  }

  if (metricsToAdd.length > 0) {
    const updated = [...existingMetrics, ...metricsToAdd].sort(
      (a, b) => new Date(b.recordedAt).getTime() - new Date(a.recordedAt).getTime(),
    );
    useBodyMetricStore.setState({ metrics: updated });
  }

  // 5. Gamification / Achievements
  const achStore = useAchievementStore.getState();
  if (
    snapshot.achievements.xp > 0 ||
    Object.keys(snapshot.achievements.unlockedAchievements).length > 0
  ) {
    const combinedXp = achStore.xp + snapshot.achievements.xp;
    const combinedLevel = Math.max(achStore.level, calculateLevelFromXp(combinedXp));
    const combinedUnlocked = {
      ...snapshot.achievements.unlockedAchievements,
      ...achStore.unlockedAchievements,
    };
    const combinedAwarded = Array.from(
      new Set([...achStore.awardedSessionIds, ...snapshot.achievements.awardedSessionIds]),
    );
    const combinedRepeats = { ...achStore.repeatCounts };
    for (const [k, v] of Object.entries(snapshot.achievements.repeatCounts)) {
      combinedRepeats[k] = (combinedRepeats[k] || 0) + v;
    }
    useAchievementStore.setState({
      xp: combinedXp,
      level: combinedLevel,
      unlockedAchievements: combinedUnlocked,
      awardedSessionIds: combinedAwarded,
      repeatCounts: combinedRepeats,
    });
  }

  // 6. User Profile Attributes
  const profileStore = useProfileStore.getState();
  const profileUpdates: Partial<Profile> = {};
  if (snapshot.profile.heightCm && !profileStore.profile.heightCm) {
    profileUpdates.heightCm = snapshot.profile.heightCm;
  }
  if (snapshot.profile.weightKg && !profileStore.profile.weightKg) {
    profileUpdates.weightKg = snapshot.profile.weightKg;
  }
  if (snapshot.profile.biologicalSex && !profileStore.profile.biologicalSex) {
    profileUpdates.biologicalSex = snapshot.profile.biologicalSex;
  }
  if (snapshot.profile.fitnessGoal && !profileStore.profile.fitnessGoal) {
    profileUpdates.fitnessGoal = snapshot.profile.fitnessGoal;
  }
  if (snapshot.profile.experienceLevel && !profileStore.profile.experienceLevel) {
    profileUpdates.experienceLevel = snapshot.profile.experienceLevel;
  }
  if (Object.keys(profileUpdates).length > 0) {
    useProfileStore.setState({
      profile: { ...profileStore.profile, ...profileUpdates },
    });
  }

  // 7. Purge Legacy Partition after confirmed write
  await purgeLegacyPartition();
}

/**
 * Backwards-compatible legacy helper for in-memory rewrite tests.
 */
export function migrateLocalUserData(newUserId: string) {
  const syncStore = useSyncStore.getState();

  // 1. Custom Exercises
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

  // 2. Workout Templates
  const programStoreState = useProgramStore.getState();
  const migratedTemplates = programStoreState.templates.map((temp) => {
    if (temp.userId === LOCAL_USER_ID) {
      const updated = { ...temp, userId: newUserId, updatedAt: new Date() };
      syncStore.addToQueue('workout_templates', 'INSERT', updated);
      return updated;
    }
    return temp;
  });

  // 3. Programs
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

  // 4. Workout Sessions
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

  // 5. Body Metrics
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

  // 6. User profile row
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
