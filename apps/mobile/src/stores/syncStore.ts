import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import * as Crypto from 'expo-crypto';
import { z } from 'zod';
import { SyncOperation, SyncOperationSchema } from '@fitness-tracker/domain';

import { createHydratedStorage } from './storage';
import { isSupabaseConfigured, supabase } from '../utils/supabase';
import { useAuthStore } from './authStore';

// ---------------------------------------------------------------------------
// Persisted Sync State Schema
// ---------------------------------------------------------------------------
const SyncPersistSchema = z.object({
  queue: z.array(SyncOperationSchema),
  lastSyncedAt: z.coerce.date().nullable(),
  isOnline: z.boolean(),
});

type SyncPersistState = z.infer<typeof SyncPersistSchema>;

interface SyncState extends SyncPersistState {
  isSyncing: boolean;
  syncError: string | null;
  addToQueue: (
    table: SyncOperation['table'],
    operation: SyncOperation['operation'],
    payload: unknown,
  ) => void;
  processQueue: () => Promise<void>;
  pullFromCloud: () => Promise<void>;
  clearQueue: () => void;
  setOnline: (online: boolean) => void;
}

// ---------------------------------------------------------------------------
// Case Conversion Helpers
// ---------------------------------------------------------------------------
function camelToSnake(str: string): string {
  return str.replace(/[A-Z]/g, (letter) => `_${letter.toLowerCase()}`);
}

function snakeToCamel(str: string): string {
  return str.replace(/([-_][a-z])/g, (group) =>
    group.toUpperCase().replace('-', '').replace('_', ''),
  );
}

export function keysToSnake(obj: unknown): unknown {
  if (Array.isArray(obj)) {
    return obj.map((v) => keysToSnake(v));
  } else if (obj !== null && typeof obj === 'object' && !(obj instanceof Date)) {
    const rawObj = obj as Record<string, unknown>;
    return Object.keys(rawObj).reduce((result, key) => {
      result[camelToSnake(key)] = keysToSnake(rawObj[key]);
      return result;
    }, {} as Record<string, unknown>);
  }
  return obj;
}

export function keysToCamel(obj: unknown): unknown {
  if (Array.isArray(obj)) {
    return obj.map((v) => keysToCamel(v));
  } else if (obj !== null && typeof obj === 'object' && !(obj instanceof Date)) {
    const rawObj = obj as Record<string, unknown>;
    return Object.keys(rawObj).reduce((result, key) => {
      result[snakeToCamel(key)] = keysToCamel(rawObj[key]);
      return result;
    }, {} as Record<string, unknown>);
  }
  return obj;
}

// Lightweight ping utility with no native connectivity dependencies
async function checkConnectivity(): Promise<boolean> {
  if (!isSupabaseConfigured) return false;
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 4000);
    // Extract base domain from Supabase URL to ping
    const url = process.env.EXPO_PUBLIC_SUPABASE_URL;
    if (!url) return false;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await fetch(url, { method: 'HEAD', signal: controller.signal as any });
    clearTimeout(timeoutId);
    return true;
  } catch {
    return false;
  }
}

export const useSyncStore = create<SyncState>()(
  persist(
    (set, get) => ({
      queue: [],
      isSyncing: false,
      lastSyncedAt: null,
      syncError: null,
      isOnline: true,

      addToQueue: (table, operation, payload) => {
        // Deep copy payload to ensure state integrity in MMKV
        const cleanPayload = JSON.parse(JSON.stringify(payload));
        const newOp: SyncOperation = {
          id: Crypto.randomUUID(),
          table,
          operation,
          payload: cleanPayload,
          createdAt: new Date(),
          retryCount: 0,
        };

        set((state) => ({
          queue: [...state.queue, newOp],
        }));

        // Trigger queue processing asynchronously
        get().processQueue();
      },

      setOnline: (online) => {
        set({ isOnline: online });
      },

      clearQueue: () => {
        set({ queue: [] });
      },

      processQueue: async () => {
        if (!isSupabaseConfigured) return;
        if (get().isSyncing) return;

        const online = await checkConnectivity();
        set({ isOnline: online });
        if (!online) return;

        const { queue } = get();
        if (queue.length === 0) return;

        set({ isSyncing: true, syncError: null });

        // Process queue sequentially (FIFO) to preserve foreign key constraints
        const remainingQueue = [...queue];

        while (remainingQueue.length > 0) {
          const op = remainingQueue[0];
          if (!op) break;
          try {
            // Map payload keys to snake_case for Supabase
            const dbPayload = keysToSnake(op.payload);
            const { table, operation } = op;

            if (operation === 'INSERT' || operation === 'UPDATE') {
              const payloadObj = dbPayload as Record<string, unknown>;
              if (table === 'workout_sessions') {
                // Decompose nested structure: session_exercises and exercise_sets
                const { session_exercises, ...sessionRow } = payloadObj;
                
                // 1. Upsert parent session
                const { error: sessionErr } = await supabase
                  .from('workout_sessions')
                  .upsert(sessionRow);
                if (sessionErr) throw sessionErr;

                if (session_exercises && Array.isArray(session_exercises)) {
                  // Get all session exercise IDs to delete old sets first
                  const { data: oldExercises } = await supabase
                    .from('session_exercises')
                    .select('id')
                    .eq('session_id', sessionRow.id as string);

                  if (oldExercises && oldExercises.length > 0) {
                    const oldExIds = oldExercises.map((e) => e.id);
                    await supabase
                      .from('exercise_sets')
                      .delete()
                      .in('session_exercise_id', oldExIds);
                  }

                  // Delete old session exercises to prevent orphans
                  await supabase
                    .from('session_exercises')
                    .delete()
                    .eq('session_id', sessionRow.id as string);

                  // 2. Insert session exercises & sets sequentially
                  for (const se of session_exercises) {
                    const seObj = se as Record<string, unknown>;
                    const { exercise_sets, ...seRow } = seObj;
                    const { error: seErr } = await supabase
                      .from('session_exercises')
                      .insert(seRow);
                    if (seErr) throw seErr;

                    if (exercise_sets && Array.isArray(exercise_sets)) {
                      const { error: setsErr } = await supabase
                        .from('exercise_sets')
                        .insert(exercise_sets);
                      if (setsErr) throw setsErr;
                    }
                  }
                }
              } else if (table === 'workout_templates') {
                // Decompose nested templates
                const { template_exercises, ...templateRow } = payloadObj;
                const { error: tempErr } = await supabase
                  .from('workout_templates')
                  .upsert(templateRow);
                if (tempErr) throw tempErr;

                if (template_exercises && Array.isArray(template_exercises)) {
                  await supabase
                    .from('template_exercises')
                    .delete()
                    .eq('template_id', templateRow.id as string);

                  const { error: exercisesErr } = await supabase
                    .from('template_exercises')
                    .insert(template_exercises);
                  if (exercisesErr) throw exercisesErr;
                }
              } else if (table === 'programs') {
                // Decompose nested programs
                const { program_workouts, ...programRow } = payloadObj;
                const { error: progErr } = await supabase
                  .from('programs')
                  .upsert(programRow);
                if (progErr) throw progErr;

                if (program_workouts && Array.isArray(program_workouts)) {
                  await supabase
                    .from('program_workouts')
                    .delete()
                    .eq('program_id', programRow.id as string);

                  const { error: workoutsErr } = await supabase
                    .from('program_workouts')
                    .insert(program_workouts);
                  if (workoutsErr) throw workoutsErr;
                }
              } else {
                // Simple flat upsert for other tables like body_metrics, custom exercises
                const { error } = await supabase.from(table).upsert(payloadObj);
                if (error) throw error;
              }
            } else if (operation === 'DELETE') {
              const payloadObj = dbPayload as Record<string, unknown>;
              const { error } = await supabase
                .from(table)
                .delete()
                .eq('id', payloadObj.id as string);
              if (error) throw error;
            }

            // Success, remove from queue
            remainingQueue.shift();
            set({ queue: [...remainingQueue] });
          } catch (error: unknown) {
            const err = error as Error;
            console.error(`[Sync Store] Sync operation ${op.id} failed:`, err);
            
            // Check if network error
            const isNetworkError =
              err?.message?.includes('Network request failed') ||
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              (error as any)?.status === 0 ||
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              (error as any)?.code === 'PGRST' || // Supabase network issues
              !(await checkConnectivity());

            if (isNetworkError) {
              set({ isOnline: false, isSyncing: false });
              return; // Stop queue processing, retry on next reconnect
            }

            // Permanent error (e.g. constraints violation), increment retry or discard
            op.retryCount += 1;
            if (op.retryCount >= 3) {
              // Discard operation to prevent lockups after 3 failed retries
              remainingQueue.shift();
              set({ queue: [...remainingQueue], syncError: err?.message || 'Operation discarded' });
            } else {
              // Push to back of the queue to try other ops first
              const failedOp = remainingQueue.shift()!;
              remainingQueue.push(failedOp);
              set({ queue: [...remainingQueue] });
            }
          }
        }

        set({ isSyncing: false, lastSyncedAt: new Date() });
      },

      pullFromCloud: async () => {
        if (!isSupabaseConfigured) return;
        const user = useAuthStore.getState().user;
        if (!user) return;

        const online = await checkConnectivity();
        set({ isOnline: online });
        if (!online) return;

        set({ isSyncing: true, syncError: null });

        try {
          // Dynamic store imports to prevent circular dependency warnings at runtime
          const exerciseStore = (await import('./exerciseStore')).useExerciseStore;
          const programStore = (await import('./programStore')).useProgramStore;
          const historyStore = (await import('./historyStore')).useHistoryStore;
          const bodyMetricStore = (await import('./bodyMetricStore')).useBodyMetricStore;
          const profileStore = (await import('./profileStore')).useProfileStore;

          // 1. Pull Users profile
          const { data: userProfile } = await supabase
            .from('users')
            .select('*')
            .eq('id', user.id)
            .single();
          if (userProfile) {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const camelProfile = keysToCamel(userProfile) as any;
            profileStore.setState({
              profile: {
                ...profileStore.getState().profile,
                displayName: camelProfile.displayName,
                biologicalSex: camelProfile.biologicalSex || undefined,
                heightCm: camelProfile.heightCm || undefined,
                preferredUnits: camelProfile.preferredUnits,
                fitnessGoal: camelProfile.fitnessGoal || undefined,
                experienceLevel: camelProfile.experienceLevel || undefined,
              },
            });
          }

          // 2. Pull Custom Exercises
          const { data: remoteExercises } = await supabase
            .from('exercises')
            .select('*')
            .eq('is_custom', true)
            .eq('owner_id', user.id);

          if (remoteExercises) {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const camelExs = keysToCamel(remoteExercises) as any[];
            const localStore = exerciseStore.getState();
            const mergedCustom = [...localStore.customExercises];

            for (const rEx of camelExs) {
              const localIndex = mergedCustom.findIndex((e) => e.id === rEx.id);
              if (localIndex === -1) {
                mergedCustom.push(rEx);
              } else {
                const localEx = mergedCustom[localIndex];
                if (localEx && new Date(rEx.updatedAt) > new Date(localEx.updatedAt)) {
                  mergedCustom[localIndex] = rEx;
                }
              }
            }
            exerciseStore.setState({ customExercises: mergedCustom });
          }

          // 3. Pull Workout Templates
          const { data: remoteTemplates } = await supabase
            .from('workout_templates')
            .select('*, template_exercises(*)');

          if (remoteTemplates) {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const camelTemps = keysToCamel(remoteTemplates) as any[];
            const localStore = programStore.getState();
            const mergedTemplates = [...localStore.templates];

            for (const rTemp of camelTemps) {
              const localIndex = mergedTemplates.findIndex((t) => t.id === rTemp.id);
              if (localIndex === -1) {
                mergedTemplates.push(rTemp);
              } else {
                const localTemp = mergedTemplates[localIndex];
                if (localTemp && new Date(rTemp.updatedAt) > new Date(localTemp.updatedAt)) {
                  mergedTemplates[localIndex] = rTemp;
                }
              }
            }
            programStore.setState({ templates: mergedTemplates });
          }

          // 4. Pull Programs
          const { data: remotePrograms } = await supabase
            .from('programs')
            .select('*, program_workouts(*)');

          if (remotePrograms) {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const camelProgs = keysToCamel(remotePrograms) as any[];
            const localStore = programStore.getState();
            const mergedProgs = [...localStore.programs];

            for (const rProg of camelProgs) {
              const localIndex = mergedProgs.findIndex((p) => p.id === rProg.id);
              if (localIndex === -1) {
                mergedProgs.push(rProg);
              } else {
                const localProg = mergedProgs[localIndex];
                if (localProg && new Date(rProg.updatedAt) > new Date(localProg.updatedAt)) {
                  mergedProgs[localIndex] = rProg;
                }
              }
            }
            programStore.setState({ programs: mergedProgs });
          }

          // 5. Pull Workout Sessions
          const { data: remoteSessions } = await supabase
            .from('workout_sessions')
            .select('*, session_exercises(*, exercise_sets(*))');

          if (remoteSessions) {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const camelSessions = keysToCamel(remoteSessions) as any[];
            const localStore = historyStore.getState();
            const mergedSessions = [...localStore.sessions];

            for (const rSession of camelSessions) {
              // Convert dates for sets
              if (rSession.exercises) {
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                rSession.exercises.forEach((ex: any) => {
                  if (ex.sets) {
                    // eslint-disable-next-line @typescript-eslint/no-explicit-any
                    ex.sets.forEach((s: any) => {
                      if (s.completedAt) s.completedAt = new Date(s.completedAt);
                    });
                  }
                });
              }

              const localIndex = mergedSessions.findIndex((s) => s.id === rSession.id);
              if (localIndex === -1) {
                mergedSessions.push(rSession);
              } else {
                const localSession = mergedSessions[localIndex];
                if (localSession && new Date(rSession.updatedAt) > new Date(localSession.updatedAt)) {
                  mergedSessions[localIndex] = rSession;
                }
              }
            }
            // Sort history in reverse chronological order
            mergedSessions.sort((a, b) => new Date(b.startedAt).getTime() - new Date(a.startedAt).getTime());
            historyStore.setState({ sessions: mergedSessions });
          }

          // 6. Pull Body Metrics
          const { data: remoteMetrics } = await supabase
            .from('body_metrics')
            .select('*');

          if (remoteMetrics) {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const camelMetrics = keysToCamel(remoteMetrics) as any[];
            const localStore = bodyMetricStore.getState();
            const mergedMetrics = [...localStore.metrics];

            for (const rMet of camelMetrics) {
              const localIndex = mergedMetrics.findIndex((m) => m.id === rMet.id);
              if (localIndex === -1) {
                mergedMetrics.push(rMet);
              } else {
                const localMet = mergedMetrics[localIndex];
                if (localMet && new Date(rMet.createdAt) > new Date(localMet.createdAt)) {
                  mergedMetrics[localIndex] = rMet;
                }
              }
            }
            bodyMetricStore.setState({ metrics: mergedMetrics });
          }

          set({ lastSyncedAt: new Date() });
        } catch (error: unknown) {
          const err = error as Error;
          console.error('[Sync Store] Pull from cloud failed:', err);
          set({ syncError: err?.message || 'Pull failed' });
        } finally {
          set({ isSyncing: false });
        }
      },
    }),
    {
      name: 'volt-sync-store',
      storage: createHydratedStorage(
        'volt-sync-store',
        SyncPersistSchema,
        { queue: [], lastSyncedAt: null, isOnline: true },
      ),
    },
  ),
);
