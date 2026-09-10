import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import * as Crypto from 'expo-crypto';
import { z } from 'zod';

import {
  BodyMetricSchema,
  ExerciseSchema,
  ExerciseSetSchema,
  PersonalRecordSchema,
  ProgramSchema,
  ProgramWorkoutSchema,
  SessionExerciseSchema,
  SyncOperationSchema,
  TemplateExerciseSchema,
  UserSchema,
  UUIDSchema,
  WorkoutSessionSchema,
  WorkoutTemplateSchema,
} from '@fitness-tracker/domain';
import type {
  BodyMetric,
  Exercise,
  Program,
  SyncOperation,
  User,
  WorkoutSession,
  WorkoutTemplate,
} from '@fitness-tracker/domain';

import { createHydratedStorage } from './storage';
import { useAuthStore } from './authStore';
import { isSupabaseConfigured, supabase } from '../utils/supabase';

type DbRecord = Record<string, unknown>;
type SyncTable = SyncOperation['table'];

type PreparedWorkoutSessionPayload = {
  kind: 'workout_session';
  sessionRow: DbRecord;
  sessionExercises: {
    row: DbRecord;
    setRows: DbRecord[];
  }[];
};

type PreparedWorkoutTemplatePayload = {
  kind: 'workout_template';
  templateRow: DbRecord;
  templateExerciseRows: DbRecord[];
};

type PreparedProgramPayload = {
  kind: 'program';
  programRow: DbRecord;
  programWorkoutRows: DbRecord[];
};

type PreparedFlatPayload = {
  kind: 'flat';
  table: SyncTable;
  row: DbRecord;
};

export type PreparedDbPayload =
  | PreparedWorkoutSessionPayload
  | PreparedWorkoutTemplatePayload
  | PreparedProgramPayload
  | PreparedFlatPayload;

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

const USER_COLUMNS = [
  'id',
  'email',
  'display_name',
  'avatar_url',
  'date_of_birth',
  'biological_sex',
  'height_cm',
  'preferred_units',
  'fitness_goal',
  'experience_level',
  'created_at',
  'updated_at',
];

const EXERCISE_COLUMNS = [
  'id',
  'name',
  'instructions',
  'primary_muscles',
  'secondary_muscles',
  'equipment',
  'movement_pattern',
  'is_custom',
  'owner_id',
  'is_unilateral',
  'created_at',
  'updated_at',
];

const WORKOUT_TEMPLATE_COLUMNS = [
  'id',
  'user_id',
  'name',
  'description',
  'estimated_duration_minutes',
  'is_archived',
  'created_at',
  'updated_at',
];

const TEMPLATE_EXERCISE_COLUMNS = [
  'id',
  'template_id',
  'exercise_id',
  'order',
  'target_sets',
  'target_reps',
  'target_reps_max',
  'target_weight',
  'target_rpe',
  'target_rir',
  'target_rest_seconds',
  'superset_group',
  'notes',
];

const PROGRAM_COLUMNS = [
  'id',
  'user_id',
  'name',
  'description',
  'duration_weeks',
  'goal',
  'is_active',
  'started_at',
  'created_at',
  'updated_at',
];

const PROGRAM_WORKOUT_COLUMNS = ['id', 'program_id', 'template_id', 'week', 'day_of_week', 'order'];

const WORKOUT_SESSION_COLUMNS = [
  'id',
  'user_id',
  'template_id',
  'program_id',
  'name',
  'started_at',
  'completed_at',
  'duration_seconds',
  'bodyweight_kg',
  'perceived_exertion',
  'notes',
  'created_at',
  'updated_at',
];

const SESSION_EXERCISE_COLUMNS = [
  'id',
  'session_id',
  'exercise_id',
  'order',
  'superset_group',
  'notes',
];

const EXERCISE_SET_COLUMNS = [
  'id',
  'session_exercise_id',
  'set_number',
  'type',
  'weight',
  'reps',
  'rpe',
  'rir',
  'rest_seconds',
  'duration_seconds',
  'distance_meters',
  'notes',
  'completed',
  'completed_at',
];

const PERSONAL_RECORD_COLUMNS = [
  'id',
  'user_id',
  'exercise_id',
  'type',
  'value',
  'reps',
  'session_id',
  'set_id',
  'previous_value',
  'achieved_at',
];

const BODY_METRIC_COLUMNS = [
  'id',
  'user_id',
  'recorded_at',
  'weight_kg',
  'body_fat_percentage',
  'resting_heart_rate',
  'measurements',
  'notes',
  'created_at',
];

const DbTemplateExercisePayloadSchema = TemplateExerciseSchema.extend({
  templateId: UUIDSchema,
});

const DbProgramWorkoutPayloadSchema = ProgramWorkoutSchema.extend({
  programId: UUIDSchema,
});

const DbSessionExercisePayloadSchema = SessionExerciseSchema.extend({
  sessionId: UUIDSchema,
});

const DbExerciseSetPayloadSchema = ExerciseSetSchema.extend({
  sessionExerciseId: UUIDSchema,
});

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
    return Object.keys(rawObj).reduce(
      (result, key) => {
        result[camelToSnake(key)] = keysToSnake(rawObj[key]);
        return result;
      },
      {} as Record<string, unknown>,
    );
  }
  return obj;
}

export function keysToCamel(obj: unknown): unknown {
  if (Array.isArray(obj)) {
    return obj.map((v) => keysToCamel(v));
  } else if (obj !== null && typeof obj === 'object' && !(obj instanceof Date)) {
    const rawObj = obj as Record<string, unknown>;
    return Object.keys(rawObj).reduce(
      (result, key) => {
        result[snakeToCamel(key)] = keysToCamel(rawObj[key]);
        return result;
      },
      {} as Record<string, unknown>,
    );
  }
  return obj;
}

function isRecord(value: unknown): value is DbRecord {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function pickDbColumns(record: DbRecord, columns: string[]): DbRecord {
  return columns.reduce<DbRecord>((result, column) => {
    const value = record[column];
    if (value !== undefined) {
      result[column] = value;
    }
    return result;
  }, {});
}

function asDbRecord(value: unknown): DbRecord {
  const converted = keysToSnake(value);
  if (!isRecord(converted)) {
    throw new Error('Sync payload must be an object.');
  }
  return converted;
}

function asDbRecordFromDomain(value: unknown, columns: string[]): DbRecord {
  return pickDbColumns(asDbRecord(value), columns);
}

function readRelationArray(record: DbRecord, key: string): unknown[] {
  const value = record[key];
  return Array.isArray(value) ? value : [];
}

function stripUndefinedProperties(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value.map(stripUndefinedProperties);
  }

  if (isRecord(value) && !(value instanceof Date)) {
    return Object.entries(value).reduce<DbRecord>((result, [key, entry]) => {
      if (entry !== undefined) {
        result[key] = stripUndefinedProperties(entry);
      }
      return result;
    }, {});
  }

  return value;
}

function parseRemoteRecord<T>(schema: z.ZodType<unknown>, raw: unknown, label: string): T | null {
  const parsed = schema.safeParse(raw);
  if (!parsed.success) {
    console.warn(`[Sync Store] Ignoring invalid ${label} row`, parsed.error.flatten());
    return null;
  }
  return stripUndefinedProperties(parsed.data) as T;
}

function parseRemoteRows<T>(rows: unknown, normalize: (row: unknown) => T | null): T[] {
  if (!Array.isArray(rows)) return [];

  return rows.reduce<T[]>((result, row) => {
    const parsed = normalize(row);
    if (parsed) {
      result.push(parsed);
    }
    return result;
  }, []);
}

function getErrorMessage(error: unknown): string {
  if (error instanceof Error) return error.message;
  if (isRecord(error) && typeof error.message === 'string') return error.message;
  return 'Unknown sync error';
}

function getErrorStatus(error: unknown): unknown {
  return isRecord(error) ? error.status : undefined;
}

function getErrorCode(error: unknown): unknown {
  return isRecord(error) ? error.code : undefined;
}

export function prepareDbPayloadForSync(
  table: SyncOperation['table'],
  payload: unknown,
): PreparedDbPayload {
  if (table === 'workout_sessions') {
    const session = WorkoutSessionSchema.parse(payload);
    return {
      kind: 'workout_session',
      sessionRow: asDbRecordFromDomain(session, WORKOUT_SESSION_COLUMNS),
      sessionExercises: session.exercises.map((exercise) => ({
        row: asDbRecordFromDomain(
          {
            ...exercise,
            sessionId: session.id,
          },
          SESSION_EXERCISE_COLUMNS,
        ),
        setRows: exercise.sets.map((set) =>
          asDbRecordFromDomain(
            {
              ...set,
              sessionExerciseId: exercise.id,
            },
            EXERCISE_SET_COLUMNS,
          ),
        ),
      })),
    };
  }

  if (table === 'workout_templates') {
    const template = WorkoutTemplateSchema.parse(payload);
    return {
      kind: 'workout_template',
      templateRow: asDbRecordFromDomain(template, WORKOUT_TEMPLATE_COLUMNS),
      templateExerciseRows: template.exercises.map((exercise) =>
        asDbRecordFromDomain(
          {
            ...exercise,
            templateId: template.id,
          },
          TEMPLATE_EXERCISE_COLUMNS,
        ),
      ),
    };
  }

  if (table === 'programs') {
    const program = ProgramSchema.parse(payload);
    return {
      kind: 'program',
      programRow: asDbRecordFromDomain(program, PROGRAM_COLUMNS),
      programWorkoutRows: program.workouts.map((workout) =>
        asDbRecordFromDomain(
          {
            ...workout,
            programId: program.id,
          },
          PROGRAM_WORKOUT_COLUMNS,
        ),
      ),
    };
  }

  return {
    kind: 'flat',
    table,
    row: prepareFlatDbRow(table, payload),
  };
}

function prepareFlatDbRow(table: SyncTable, payload: unknown): DbRecord {
  switch (table) {
    case 'users':
      return asDbRecordFromDomain(UserSchema.parse(payload), USER_COLUMNS);
    case 'exercises':
      return asDbRecordFromDomain(ExerciseSchema.parse(payload), EXERCISE_COLUMNS);
    case 'template_exercises':
      return asDbRecordFromDomain(
        DbTemplateExercisePayloadSchema.parse(payload),
        TEMPLATE_EXERCISE_COLUMNS,
      );
    case 'program_workouts':
      return asDbRecordFromDomain(
        DbProgramWorkoutPayloadSchema.parse(payload),
        PROGRAM_WORKOUT_COLUMNS,
      );
    case 'session_exercises':
      return asDbRecordFromDomain(
        DbSessionExercisePayloadSchema.parse(payload),
        SESSION_EXERCISE_COLUMNS,
      );
    case 'exercise_sets':
      return asDbRecordFromDomain(DbExerciseSetPayloadSchema.parse(payload), EXERCISE_SET_COLUMNS);
    case 'personal_records':
      return asDbRecordFromDomain(PersonalRecordSchema.parse(payload), PERSONAL_RECORD_COLUMNS);
    case 'body_metrics':
      return asDbRecordFromDomain(BodyMetricSchema.parse(payload), BODY_METRIC_COLUMNS);
    case 'workout_sessions':
    case 'workout_templates':
    case 'programs':
      throw new Error(`${table} requires nested sync preparation.`);
  }
}

function normalizeRemoteUser(raw: unknown): User | null {
  const record = keysToCamel(raw);
  return parseRemoteRecord<User>(UserSchema, record, 'users');
}

function normalizeRemoteExercise(raw: unknown): Exercise | null {
  const record = keysToCamel(raw);
  return parseRemoteRecord<Exercise>(ExerciseSchema, record, 'exercises');
}

export function normalizeRemoteWorkoutTemplate(raw: unknown): WorkoutTemplate | null {
  const record = keysToCamel(raw);
  if (!isRecord(record)) return null;

  const templateExercises = readRelationArray(record, 'templateExercises');
  const candidate: DbRecord = {
    ...record,
    exercises: templateExercises,
  };
  delete candidate.templateExercises;

  return parseRemoteRecord<WorkoutTemplate>(WorkoutTemplateSchema, candidate, 'workout_templates');
}

export function normalizeRemoteProgram(raw: unknown): Program | null {
  const record = keysToCamel(raw);
  if (!isRecord(record)) return null;

  const programWorkouts = readRelationArray(record, 'programWorkouts');
  const candidate: DbRecord = {
    ...record,
    workouts: programWorkouts,
  };
  delete candidate.programWorkouts;

  return parseRemoteRecord<Program>(ProgramSchema, candidate, 'programs');
}

export function normalizeRemoteWorkoutSession(raw: unknown): WorkoutSession | null {
  const record = keysToCamel(raw);
  if (!isRecord(record)) return null;

  const sessionExercises = readRelationArray(record, 'sessionExercises').map((exercise) => {
    if (!isRecord(exercise)) {
      return {
        sets: [],
      };
    }

    const exerciseSets = readRelationArray(exercise, 'exerciseSets');
    const candidate: DbRecord = {
      ...exercise,
      sets: exerciseSets,
    };
    delete candidate.exerciseSets;
    return candidate;
  });

  const candidate: DbRecord = {
    ...record,
    exercises: sessionExercises,
  };
  delete candidate.sessionExercises;

  return parseRemoteRecord<WorkoutSession>(WorkoutSessionSchema, candidate, 'workout_sessions');
}

function normalizeRemoteBodyMetric(raw: unknown): BodyMetric | null {
  const record = keysToCamel(raw);
  return parseRemoteRecord<BodyMetric>(BodyMetricSchema, record, 'body_metrics');
}

// Lightweight ping utility with no native connectivity dependencies
async function checkConnectivity(): Promise<boolean> {
  if (!isSupabaseConfigured) return false;

  const url = process.env.EXPO_PUBLIC_SUPABASE_URL;
  if (!url) return false;

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 4000);

  try {
    await fetch(url, {
      method: 'HEAD',
      signal: controller.signal as unknown as RequestInit['signal'],
    });
    return true;
  } catch {
    return false;
  } finally {
    clearTimeout(timeoutId);
  }
}

async function deleteSessionChildren(sessionId: unknown): Promise<void> {
  if (typeof sessionId !== 'string') return;

  const { data: oldExercises } = await supabase
    .from('session_exercises')
    .select('id')
    .eq('session_id', sessionId);

  const oldExerciseIds = Array.isArray(oldExercises)
    ? oldExercises
        .map((exercise) =>
          isRecord(exercise) && typeof exercise.id === 'string' ? exercise.id : null,
        )
        .filter((id): id is string => id !== null)
    : [];

  if (oldExerciseIds.length > 0) {
    await supabase.from('exercise_sets').delete().in('session_exercise_id', oldExerciseIds);
  }

  await supabase.from('session_exercises').delete().eq('session_id', sessionId);
}

async function upsertPreparedPayload(prepared: PreparedDbPayload): Promise<void> {
  if (prepared.kind === 'workout_session') {
    const { error: sessionErr } = await supabase
      .from('workout_sessions')
      .upsert(prepared.sessionRow);
    if (sessionErr) throw sessionErr;

    await deleteSessionChildren(prepared.sessionRow.id);

    for (const sessionExercise of prepared.sessionExercises) {
      const { error: exerciseErr } = await supabase
        .from('session_exercises')
        .insert(sessionExercise.row);
      if (exerciseErr) throw exerciseErr;

      if (sessionExercise.setRows.length > 0) {
        const { error: setsErr } = await supabase
          .from('exercise_sets')
          .insert(sessionExercise.setRows);
        if (setsErr) throw setsErr;
      }
    }
    return;
  }

  if (prepared.kind === 'workout_template') {
    const { error: templateErr } = await supabase
      .from('workout_templates')
      .upsert(prepared.templateRow);
    if (templateErr) throw templateErr;

    await supabase
      .from('template_exercises')
      .delete()
      .eq('template_id', prepared.templateRow.id as string);

    if (prepared.templateExerciseRows.length > 0) {
      const { error: exercisesErr } = await supabase
        .from('template_exercises')
        .insert(prepared.templateExerciseRows);
      if (exercisesErr) throw exercisesErr;
    }
    return;
  }

  if (prepared.kind === 'program') {
    const { error: programErr } = await supabase.from('programs').upsert(prepared.programRow);
    if (programErr) throw programErr;

    await supabase
      .from('program_workouts')
      .delete()
      .eq('program_id', prepared.programRow.id as string);

    if (prepared.programWorkoutRows.length > 0) {
      const { error: workoutsErr } = await supabase
        .from('program_workouts')
        .insert(prepared.programWorkoutRows);
      if (workoutsErr) throw workoutsErr;
    }
    return;
  }

  const { error } = await supabase.from(prepared.table).upsert(prepared.row);
  if (error) throw error;
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

        get().processQueue();
      },

      setOnline: (online) => {
        set({ isOnline: online });
      },

      clearQueue: () => {
        set({ queue: [] });
      },

      processQueue: async () => {
        const userId = useAuthStore.getState().user?.id;
        if (!isSupabaseConfigured || !userId || get().isSyncing || get().queue.length === 0) return;
        // Lock before the first await; otherwise concurrent connectivity checks start two workers.
        set({ isSyncing: true, syncError: null });
        try {
          const online = await checkConnectivity();
          set({ isOnline: online });
          if (!online) return;
          while (get().queue.length > 0) {
            if (useAuthStore.getState().user?.id !== userId) return;
            const op = get().queue[0];
            if (!op) break;
            try {
              if (op.operation === 'INSERT' || op.operation === 'UPDATE') {
                await upsertPreparedPayload(prepareDbPayloadForSync(op.table, op.payload));
              } else {
                const payloadObj = asDbRecord(op.payload);
                const { error } = await supabase
                  .from(op.table)
                  .delete()
                  .eq('id', payloadObj.id as string);
                if (error) throw error;
              }
              if (useAuthStore.getState().user?.id !== userId) return;
              // Acknowledge only this operation, preserving entries appended during the request.
              set((state) => ({ queue: state.queue.filter((entry) => entry.id !== op.id) }));
            } catch (error: unknown) {
              if (useAuthStore.getState().user?.id !== userId) return;
              const message = getErrorMessage(error);
              set((state) => ({
                queue: state.queue.map((entry) =>
                  entry.id === op.id ? { ...entry, retryCount: entry.retryCount + 1 } : entry,
                ),
                syncError: message,
              }));
              // Stop at the first error. Retain FIFO dependencies and allow explicit retry.
              if (
                message.includes('Network request failed') ||
                getErrorStatus(error) === 0 ||
                getErrorCode(error) === 'PGRST'
              )
                set({ isOnline: false });
              return;
            }
          }
          set({ lastSyncedAt: new Date() });
        } catch (error: unknown) {
          set({ syncError: getErrorMessage(error) });
        } finally {
          set({ isSyncing: false });
        }
      },

      pullFromCloud: async () => {
        if (!isSupabaseConfigured || get().isSyncing) return;
        const user = useAuthStore.getState().user;
        if (!user) return;

        set({ isSyncing: true, syncError: null });
        try {
          const online = await checkConnectivity();
          set({ isOnline: online });
          if (!online) return;
          // Dynamic store imports prevent circular dependency warnings at runtime.
          const exerciseStore = (await import('./exerciseStore')).useExerciseStore;
          const programStore = (await import('./programStore')).useProgramStore;
          const historyStore = (await import('./historyStore')).useHistoryStore;
          const bodyMetricStore = (await import('./bodyMetricStore')).useBodyMetricStore;
          const profileStore = (await import('./profileStore')).useProfileStore;

          const { data: userProfile } = await supabase
            .from('users')
            .select('*')
            .eq('id', user.id)
            .single();
          const remoteProfile = normalizeRemoteUser(userProfile);
          if (remoteProfile) {
            profileStore.setState({
              profile: {
                ...profileStore.getState().profile,
                displayName: remoteProfile.displayName,
                preferredUnits: remoteProfile.preferredUnits,
                ...(remoteProfile.biologicalSex !== undefined
                  ? { biologicalSex: remoteProfile.biologicalSex }
                  : {}),
                ...(remoteProfile.heightCm !== undefined
                  ? { heightCm: remoteProfile.heightCm }
                  : {}),
                ...(remoteProfile.fitnessGoal !== undefined
                  ? { fitnessGoal: remoteProfile.fitnessGoal }
                  : {}),
                ...(remoteProfile.experienceLevel !== undefined
                  ? { experienceLevel: remoteProfile.experienceLevel }
                  : {}),
              },
            });
          }

          const { data: remoteExercises } = await supabase
            .from('exercises')
            .select('*')
            .eq('is_custom', true)
            .eq('owner_id', user.id);

          const parsedExercises = parseRemoteRows(remoteExercises, normalizeRemoteExercise);
          if (parsedExercises.length > 0) {
            const localStore = exerciseStore.getState();
            const mergedCustom = [...localStore.customExercises];

            for (const remoteExercise of parsedExercises) {
              const localIndex = mergedCustom.findIndex(
                (exercise) => exercise.id === remoteExercise.id,
              );
              if (localIndex === -1) {
                mergedCustom.push(remoteExercise);
              } else {
                const localExercise = mergedCustom[localIndex];
                if (
                  localExercise &&
                  remoteExercise.updatedAt.getTime() > localExercise.updatedAt.getTime()
                ) {
                  mergedCustom[localIndex] = remoteExercise;
                }
              }
            }
            exerciseStore.setState({
              customExercises: mergedCustom,
            });
          }

          const { data: remoteTemplates } = await supabase
            .from('workout_templates')
            .select('*, template_exercises(*)');

          const parsedTemplates = parseRemoteRows(remoteTemplates, normalizeRemoteWorkoutTemplate);
          if (parsedTemplates.length > 0) {
            const localStore = programStore.getState();
            const mergedTemplates = [...localStore.templates];

            for (const remoteTemplate of parsedTemplates) {
              const localIndex = mergedTemplates.findIndex(
                (template) => template.id === remoteTemplate.id,
              );
              if (localIndex === -1) {
                mergedTemplates.push(remoteTemplate);
              } else {
                const localTemplate = mergedTemplates[localIndex];
                if (
                  localTemplate &&
                  remoteTemplate.updatedAt.getTime() > localTemplate.updatedAt.getTime()
                ) {
                  mergedTemplates[localIndex] = remoteTemplate;
                }
              }
            }
            programStore.setState({ templates: mergedTemplates });
          }

          const { data: remotePrograms } = await supabase
            .from('programs')
            .select('*, program_workouts(*)');

          const parsedPrograms = parseRemoteRows(remotePrograms, normalizeRemoteProgram);
          if (parsedPrograms.length > 0) {
            const localStore = programStore.getState();
            const mergedPrograms = [...localStore.programs];

            for (const remoteProgram of parsedPrograms) {
              const localIndex = mergedPrograms.findIndex(
                (program) => program.id === remoteProgram.id,
              );
              if (localIndex === -1) {
                mergedPrograms.push(remoteProgram);
              } else {
                const localProgram = mergedPrograms[localIndex];
                if (
                  localProgram &&
                  remoteProgram.updatedAt.getTime() > localProgram.updatedAt.getTime()
                ) {
                  mergedPrograms[localIndex] = remoteProgram;
                }
              }
            }
            programStore.setState({ programs: mergedPrograms });
          }

          const { data: remoteSessions } = await supabase
            .from('workout_sessions')
            .select('*, session_exercises(*, exercise_sets(*))');

          const parsedSessions = parseRemoteRows(remoteSessions, normalizeRemoteWorkoutSession);
          if (parsedSessions.length > 0) {
            const localStore = historyStore.getState();
            const mergedSessions = [...localStore.sessions];

            for (const remoteSession of parsedSessions) {
              const localIndex = mergedSessions.findIndex(
                (session) => session.id === remoteSession.id,
              );
              if (localIndex === -1) {
                mergedSessions.push(remoteSession);
              } else {
                const localSession = mergedSessions[localIndex];
                if (
                  localSession &&
                  remoteSession.updatedAt.getTime() > localSession.updatedAt.getTime()
                ) {
                  mergedSessions[localIndex] = remoteSession;
                }
              }
            }
            mergedSessions.sort((a, b) => b.startedAt.getTime() - a.startedAt.getTime());
            historyStore.setState({ sessions: mergedSessions });
          }

          const { data: remoteMetrics } = await supabase.from('body_metrics').select('*');

          const parsedMetrics = parseRemoteRows(remoteMetrics, normalizeRemoteBodyMetric);
          if (parsedMetrics.length > 0) {
            const localStore = bodyMetricStore.getState();
            const mergedMetrics = [...localStore.metrics];

            for (const remoteMetric of parsedMetrics) {
              const localIndex = mergedMetrics.findIndex((metric) => metric.id === remoteMetric.id);
              if (localIndex === -1) {
                mergedMetrics.push(remoteMetric);
              } else {
                const localMetric = mergedMetrics[localIndex];
                if (
                  localMetric &&
                  remoteMetric.createdAt.getTime() > localMetric.createdAt.getTime()
                ) {
                  mergedMetrics[localIndex] = remoteMetric;
                }
              }
            }
            mergedMetrics.sort((a, b) => b.recordedAt.getTime() - a.recordedAt.getTime());
            bodyMetricStore.setState({ metrics: mergedMetrics });
          }

          set({ lastSyncedAt: new Date() });
        } catch (error: unknown) {
          const message = getErrorMessage(error);
          console.error('[Sync Store] Pull from cloud failed:', error);
          set({ syncError: message || 'Pull failed' });
        } finally {
          set({ isSyncing: false });
        }
      },
    }),
    {
      name: 'volt-sync-store',
      storage: createHydratedStorage('volt-sync-store', SyncPersistSchema, {
        queue: [],
        lastSyncedAt: null,
        isOnline: true,
      }),
    },
  ),
);
