import {
  useSyncStore,
  keysToSnake,
  keysToCamel,
  normalizeRemoteProgram,
  normalizeRemoteWorkoutSession,
  normalizeRemoteWorkoutTemplate,
  prepareDbPayloadForSync,
} from '../syncStore';
import {
  Equipment,
  Exercise,
  MovementPattern,
  MuscleGroup,
  Program,
  WorkoutSession,
  WorkoutTemplate,
} from '@fitness-tracker/domain';
import { migrateLocalUserData } from '../authMigration';
import { useHistoryStore } from '../historyStore';
import { useExerciseStore } from '../exerciseStore';
import { useBodyMetricStore } from '../bodyMetricStore';
import { useProgramStore } from '../programStore';
import { useAuthStore } from '../authStore';
import { LOCAL_USER_ID } from '../local-user';

// Mock Supabase Client
let mockIsSupabaseConfigured = false;
const mockUpsert = jest.fn().mockResolvedValue({ error: null });
const mockDelete = jest.fn().mockResolvedValue({ error: null });
const mockEq = jest.fn().mockReturnValue({ delete: mockDelete });
const mockSelect = jest.fn().mockReturnValue({ eq: jest.fn().mockResolvedValue({ data: [] }) });
const mockFrom = jest.fn().mockReturnValue({
  upsert: mockUpsert,
  delete: mockDelete,
  eq: mockEq,
  select: mockSelect,
});

jest.mock('../../utils/supabase', () => ({
  get isSupabaseConfigured() {
    return mockIsSupabaseConfigured;
  },
  supabase: {
    from: (table: string) => mockFrom(table),
  },
}));

describe('syncStore & authMigration', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockIsSupabaseConfigured = false;

    // Reset stores
    useSyncStore.setState({
      queue: [],
      isSyncing: false,
      lastSyncedAt: null,
      syncError: null,
      isOnline: true,
    });

    useHistoryStore.setState({ sessions: [] });
    useExerciseStore.setState({ customExercises: [] });
    useBodyMetricStore.setState({ metrics: [] });
    useProgramStore.setState({ programs: [], templates: [] });
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    useAuthStore.setState({ user: { id: 'test-user-id', email: 'test@example.com' } as any });
  });

  describe('Key mapping helpers', () => {
    it('maps camelCase keys to snake_case', () => {
      const camel = {
        userId: '123',
        createdAt: new Date('2026-06-01T00:00:00.000Z'),
        nestedObj: {
          someField: 'val',
        },
      };

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const snake = keysToSnake(camel) as any;
      expect(snake.user_id).toBe('123');
      expect(snake.created_at).toBeInstanceOf(Date);
      expect(snake.nested_obj.some_field).toBe('val');
    });

    it('maps snake_case keys to camelCase', () => {
      const snake = {
        user_id: '123',
        created_at: new Date('2026-06-01T00:00:00.000Z'),
        nested_obj: {
          some_field: 'val',
        },
      };

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const camel = keysToCamel(snake) as any;
      expect(camel.userId).toBe('123');
      expect(camel.createdAt).toBeInstanceOf(Date);
      expect(camel.nestedObj.someField).toBe('val');
    });
  });

  describe('Supabase payload mapping', () => {
    const userId = '00000000-0000-4000-8000-000000000201';
    const exerciseId = '33333333-3333-4333-8333-333333333333';
    const sessionId = '00000000-0000-4000-8000-000000000101';
    const sessionExerciseId = '00000000-0000-4000-8000-000000000301';
    const setId = '00000000-0000-4000-8000-000000000401';
    const templateId = '00000000-0000-4000-8000-000000000501';
    const templateExerciseId = '00000000-0000-4000-8000-000000000601';
    const programId = '00000000-0000-4000-8000-000000000701';
    const programWorkoutId = '00000000-0000-4000-8000-000000000801';

    it('decomposes workout sessions into parent, session exercise, and set rows', () => {
      const session: WorkoutSession = {
        id: sessionId,
        userId,
        name: 'Push Day',
        startedAt: new Date('2026-06-01T10:00:00.000Z'),
        completedAt: new Date('2026-06-01T11:00:00.000Z'),
        durationSeconds: 3600,
        exercises: [
          {
            id: sessionExerciseId,
            exerciseId,
            order: 0,
            sets: [
              {
                id: setId,
                setNumber: 1,
                type: 'working',
                weight: 100,
                reps: 5,
                completed: true,
                completedAt: new Date('2026-06-01T10:15:00.000Z'),
              },
            ],
          },
        ],
        createdAt: new Date('2026-06-01T10:00:00.000Z'),
        updatedAt: new Date('2026-06-01T11:00:00.000Z'),
      };

      const prepared = prepareDbPayloadForSync('workout_sessions', session);
      if (prepared.kind !== 'workout_session') {
        throw new Error('Expected workout session payload.');
      }

      expect(prepared.sessionRow).toMatchObject({
        id: sessionId,
        user_id: userId,
        name: 'Push Day',
      });
      expect(prepared.sessionRow).not.toHaveProperty('exercises');
      expect(prepared.sessionExercises[0]?.row).toMatchObject({
        id: sessionExerciseId,
        session_id: sessionId,
        exercise_id: exerciseId,
      });
      expect(prepared.sessionExercises[0]?.row).not.toHaveProperty('sets');
      expect(prepared.sessionExercises[0]?.setRows[0]).toMatchObject({
        id: setId,
        session_exercise_id: sessionExerciseId,
        set_number: 1,
        completed: true,
      });
    });

    it('decomposes templates and programs into their SQL child tables', () => {
      const template: WorkoutTemplate = {
        id: templateId,
        userId,
        name: 'Template',
        exercises: [
          {
            id: templateExerciseId,
            exerciseId,
            order: 0,
            targetSets: 3,
            targetReps: 8,
          },
        ],
        isArchived: false,
        createdAt: new Date('2026-06-01T10:00:00.000Z'),
        updatedAt: new Date('2026-06-01T10:00:00.000Z'),
      };

      const templatePayload = prepareDbPayloadForSync('workout_templates', template);
      if (templatePayload.kind !== 'workout_template') {
        throw new Error('Expected workout template payload.');
      }

      expect(templatePayload.templateRow).toMatchObject({
        id: templateId,
        user_id: userId,
      });
      expect(templatePayload.templateRow).not.toHaveProperty('exercises');
      expect(templatePayload.templateExerciseRows[0]).toMatchObject({
        id: templateExerciseId,
        template_id: templateId,
        exercise_id: exerciseId,
      });

      const program: Program = {
        id: programId,
        userId,
        name: 'Program',
        durationWeeks: 4,
        workouts: [
          {
            id: programWorkoutId,
            templateId,
            week: 1,
            dayOfWeek: 1,
            order: 0,
          },
        ],
        isActive: false,
        createdAt: new Date('2026-06-01T10:00:00.000Z'),
        updatedAt: new Date('2026-06-01T10:00:00.000Z'),
      };

      const programPayload = prepareDbPayloadForSync('programs', program);
      if (programPayload.kind !== 'program') {
        throw new Error('Expected program payload.');
      }

      expect(programPayload.programRow).toMatchObject({
        id: programId,
        user_id: userId,
      });
      expect(programPayload.programRow).not.toHaveProperty('workouts');
      expect(programPayload.programWorkoutRows[0]).toMatchObject({
        id: programWorkoutId,
        program_id: programId,
        template_id: templateId,
      });
    });

    it('whitelists exercise columns that exist in schema.sql', () => {
      const customExercise: Exercise = {
        id: exerciseId,
        ownerId: userId,
        name: 'Custom Lift',
        instructions: 'Lift with control.',
        primaryMuscles: [MuscleGroup.Chest],
        secondaryMuscles: [],
        equipment: Equipment.Other,
        movementPattern: MovementPattern.Isolation,
        isCustom: true,
        imageUrl: 'https://example.com/exercise.png',
        experienceLevel: 'beginner',
        createdAt: new Date('2026-06-01T10:00:00.000Z'),
        updatedAt: new Date('2026-06-01T10:00:00.000Z'),
      };

      const prepared = prepareDbPayloadForSync('exercises', customExercise);
      if (prepared.kind !== 'flat') {
        throw new Error('Expected flat exercise payload.');
      }

      expect(prepared.row).toMatchObject({
        id: exerciseId,
        owner_id: userId,
        is_custom: true,
      });
      expect(prepared.row).not.toHaveProperty('image_url');
      expect(prepared.row).not.toHaveProperty('experience_level');
    });
  });

  describe('Supabase pull normalization', () => {
    it('maps relation names back into domain fields and revives dates', () => {
      const normalized = normalizeRemoteWorkoutSession({
        id: '00000000-0000-4000-8000-000000000101',
        user_id: '00000000-0000-4000-8000-000000000201',
        name: 'Synced Workout',
        started_at: '2026-06-01T10:00:00.000Z',
        completed_at: '2026-06-01T11:00:00.000Z',
        duration_seconds: 3600,
        created_at: '2026-06-01T10:00:00.000Z',
        updated_at: '2026-06-01T11:00:00.000Z',
        session_exercises: [
          {
            id: '00000000-0000-4000-8000-000000000301',
            session_id: '00000000-0000-4000-8000-000000000101',
            exercise_id: '33333333-3333-4333-8333-333333333333',
            order: 0,
            exercise_sets: [
              {
                id: '00000000-0000-4000-8000-000000000401',
                session_exercise_id: '00000000-0000-4000-8000-000000000301',
                set_number: 1,
                type: 'working',
                weight: 100,
                reps: 5,
                completed: true,
                completed_at: '2026-06-01T10:15:00.000Z',
              },
            ],
          },
        ],
      });

      expect(normalized?.startedAt).toBeInstanceOf(Date);
      expect(normalized?.exercises[0]?.sets[0]?.completedAt).toBeInstanceOf(Date);
      expect(normalized?.exercises[0]?.sets[0]?.setNumber).toBe(1);
      expect(normalized).not.toHaveProperty('sessionExercises');
    });

    it('maps template and program relation names back into domain arrays', () => {
      const template = normalizeRemoteWorkoutTemplate({
        id: '00000000-0000-4000-8000-000000000501',
        user_id: '00000000-0000-4000-8000-000000000201',
        name: 'Synced Template',
        is_archived: false,
        created_at: '2026-06-01T10:00:00.000Z',
        updated_at: '2026-06-01T10:00:00.000Z',
        template_exercises: [
          {
            id: '00000000-0000-4000-8000-000000000601',
            template_id: '00000000-0000-4000-8000-000000000501',
            exercise_id: '33333333-3333-4333-8333-333333333333',
            order: 0,
            target_sets: 3,
          },
        ],
      });

      const program = normalizeRemoteProgram({
        id: '00000000-0000-4000-8000-000000000701',
        user_id: '00000000-0000-4000-8000-000000000201',
        name: 'Synced Program',
        duration_weeks: 4,
        is_active: false,
        created_at: '2026-06-01T10:00:00.000Z',
        updated_at: '2026-06-01T10:00:00.000Z',
        program_workouts: [
          {
            id: '00000000-0000-4000-8000-000000000801',
            program_id: '00000000-0000-4000-8000-000000000701',
            template_id: '00000000-0000-4000-8000-000000000501',
            week: 1,
            day_of_week: 1,
            order: 0,
          },
        ],
      });

      expect(template?.exercises[0]?.targetSets).toBe(3);
      expect(template?.updatedAt).toBeInstanceOf(Date);
      expect(program?.workouts[0]?.dayOfWeek).toBe(1);
      expect(program?.updatedAt).toBeInstanceOf(Date);
    });
  });

  describe('Queueing Operations', () => {
    it('adds operations to the queue', () => {
      const store = useSyncStore.getState();
      store.addToQueue('body_metrics', 'INSERT', { weightKg: 80 });

      const state = useSyncStore.getState();
      expect(state.queue.length).toBe(1);
      expect(state.queue[0]?.table).toBe('body_metrics');
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      expect((state.queue[0]?.payload as any).weightKg).toBe(80);
    });

    it('clears queue', () => {
      const store = useSyncStore.getState();
      store.addToQueue('body_metrics', 'INSERT', { weightKg: 80 });
      store.clearQueue();

      const state = useSyncStore.getState();
      expect(state.queue.length).toBe(0);
    });
  });

  describe('Auth user ID migration', () => {
    it('rewrites local items carrying LOCAL_USER_ID to the new authenticated user ID', () => {
      const localCustomExercise: Exercise = {
        id: '00000000-0000-4000-8000-000000000901',
        ownerId: LOCAL_USER_ID,
        name: 'Custom Push',
        primaryMuscles: [MuscleGroup.Chest],
        secondaryMuscles: [],
        equipment: Equipment.Other,
        movementPattern: MovementPattern.Isolation,
        isCustom: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      // Setup some local unauthenticated data
      useHistoryStore.setState({
        sessions: [
          {
            id: 'session-1',
            userId: LOCAL_USER_ID,
            name: 'Chest Day',
            exercises: [],
            startedAt: new Date(),
            createdAt: new Date(),
            updatedAt: new Date(),
          },
        ],
      });

      useExerciseStore.setState({
        customExercises: [localCustomExercise],
      });

      useBodyMetricStore.setState({
        metrics: [
          {
            id: 'met-1',
            userId: LOCAL_USER_ID,
            weightKg: 75,
            recordedAt: new Date(),
            createdAt: new Date(),
          },
        ],
      });

      // Migrate
      migrateLocalUserData('new-real-uuid');

      // Verify IDs updated
      expect(useHistoryStore.getState().sessions[0]?.userId).toBe('new-real-uuid');
      expect(useExerciseStore.getState().customExercises[0]?.ownerId).toBe('new-real-uuid');
      expect(useBodyMetricStore.getState().metrics[0]?.userId).toBe('new-real-uuid');

      // Verify sync queue enqueued those operations
      const syncQueue = useSyncStore.getState().queue;
      expect(syncQueue.length).toBe(4); // custom exercise + session + body metric + profile update
    });
  });
});
