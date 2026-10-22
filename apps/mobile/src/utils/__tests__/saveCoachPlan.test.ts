import { DatabaseSync } from 'node:sqlite';
import { DocumentDatabase } from '../../data/documentDatabase';
import { saveCoachExercises, saveCoachPlan } from '../saveCoachPlan';
import { useCoachStore } from '../../stores/coachStore';
import { useProgramStore } from '../../stores/programStore';
import { useExerciseStore } from '../../stores/exerciseStore';
import { useSyncStore } from '../../stores/syncStore';
import { useStorageHealth } from '../../stores/storageHealth';
import { useProfileStore } from '../../stores/profileStore';
import { useHistoryStore } from '../../stores/historyStore';
import { useWorkoutStore } from '../../stores/workoutStore';
import { useBodyMetricStore } from '../../stores/bodyMetricStore';
import { useAchievementStore } from '../../stores/achievementStore';
import { useCaffeineStore } from '../../stores/caffeineStore';
import { useHydrationStore } from '../../stores/hydrationStore';
import {
  beginScopeChange,
  completeScopeChange,
  selectStoragePartition,
  getStorageScope,
} from '../../data/storageScope';
import { EXERCISES, ChatMessage } from '@fitness-tracker/domain';
let mockRepository: DocumentDatabase | undefined;
jest.mock('../../data/deviceDatabase', () => ({
  usesDeviceDatabase: true,
  getDeviceDatabase: () => mockRepository,
}));
jest.mock('expo-crypto', () => ({
  randomUUID: () => jest.requireActual<typeof import('node:crypto')>('node:crypto').randomUUID(),
}));
const stores = [useProgramStore, useCoachStore, useSyncStore, useExerciseStore];
let db: DatabaseSync;
const message: ChatMessage = {
  id: '00000000-0000-4000-8000-000000000099',
  role: 'assistant',
  content: 'Bereit',
  createdAt: new Date(),
  plan: {
    name: 'Testplan',
    days: [
      {
        name: 'Tag A',
        exercises: [
          {
            exerciseId: EXERCISES[0]!.id,
            sets: 3,
            reps: 8,
            repsMax: 12,
            rir: 2,
            restSeconds: 120,
            notes: '',
          },
        ],
      },
    ],
  },
};
beforeEach(async () => {
  const generation = beginScopeChange();
  selectStoragePartition('legacy', generation);
  completeScopeChange(generation);
  db = new DatabaseSync(':memory:');
  mockRepository = new DocumentDatabase({
    execSync: (sql) => db.exec(sql),
    runSync: (sql, ...args) => db.prepare(sql).run(...args),
    getFirstSync: (sql, ...args) => db.prepare(sql).get(...args) ?? null,
    getAllSync: (sql, ...args) => db.prepare(sql).all(...args),
  });
  useStorageHealth.setState({ blockedStores: [], writeError: false });
  await Promise.all(stores.map((store) => store.persist.rehydrate()));
  useProgramStore.setState({ templates: [], programs: [] });
  useSyncStore.setState({ queue: [], isOnline: false });
  useCoachStore.setState({ messages: [message] });
  useExerciseStore.setState({ exercises: EXERCISES, customExercises: [] });
});
afterEach(() => {
  db.close();
  mockRepository = undefined;
});
it('saves a single workout only as a template once, including after hydration', async () => {
  const ids = saveCoachPlan(message.id);
  expect(useProgramStore.getState().templates).toHaveLength(1);
  expect(useProgramStore.getState().templates[0]?.exercises[0]?.targetRepsMax).toBe(12);
  expect(useProgramStore.getState().programs).toHaveLength(0);
  await Promise.all(stores.map((store) => store.persist.rehydrate()));
  expect(saveCoachPlan(message.id)).toEqual(ids);
  expect(
    useProgramStore.getState().templates.filter((template) => ids.includes(template.id)),
  ).toHaveLength(1);
  expect(useSyncStore.getState().queue).toHaveLength(1);
});
it('rolls back the entire plan and outbox when the final coach write fails', () => {
  db.exec(
    "CREATE TRIGGER fail_coach BEFORE INSERT ON state_documents WHEN NEW.key = 'volt-coach-store' BEGIN SELECT RAISE(ABORT, 'disk full'); END;",
  );
  expect(() => saveCoachPlan(message.id)).toThrow();
  expect(useProgramStore.getState().templates).toHaveLength(0);
  expect(useProgramStore.getState().programs).toHaveLength(0);
  expect(useSyncStore.getState().queue).toHaveLength(0);
  expect(useCoachStore.getState().messages[0]?.savedTemplateIds).toBeUndefined();
});
it('saves an explicit multiweek program with unique scheduled workouts and prepends new entries', () => {
  useProgramStore.getState().createTemplate({ name: 'Existing workout' });
  useProgramStore.getState().createProgram({ name: 'Existing program', durationWeeks: 1 });
  const existingTemplate = useProgramStore.getState().templates[0]!.id;
  const existingProgram = useProgramStore.getState().programs[0]!.id;
  useCoachStore.setState({
    messages: [{ ...message, plan: { ...message.plan!, kind: 'program', durationWeeks: 4 } }],
  });
  const ids = saveCoachPlan(message.id);
  const state = useProgramStore.getState();
  expect(state.templates.map((item) => item.id)).toEqual([...ids, existingTemplate]);
  expect(state.programs[1]!.id).toBe(existingProgram);
  expect(state.programs[0]!.durationWeeks).toBe(4);
  expect(state.programs[0]!.isActive).toBe(false);
  expect(state.programs[0]!.workouts.map((item) => item.week)).toEqual([1, 2, 3, 4]);
  expect(new Set(state.programs[0]!.workouts.map((item) => item.id)).size).toBe(4);
});
it('keeps older multi-day plans saveable as programs', () => {
  useCoachStore.setState({
    messages: [
      {
        ...message,
        plan: {
          ...message.plan!,
          days: [message.plan!.days[0]!, { ...message.plan!.days[0]!, name: 'Tag B' }],
        },
      },
    ],
  });
  saveCoachPlan(message.id);
  expect(useProgramStore.getState().templates).toHaveLength(2);
  expect(useProgramStore.getState().programs[0]!.workouts).toHaveLength(2);
});
it('rejects a stale account generation before writing', () => {
  const scope = getStorageScope();
  const generation = beginScopeChange();
  selectStoragePartition('legacy', generation);
  completeScopeChange(generation);
  expect(() => saveCoachPlan(message.id, scope)).toThrow(/Profil/);
  expect(useProgramStore.getState().templates).toHaveLength(0);
});
it('rolls back a local reset when a later store write fails on native SQLite', async () => {
  await Promise.all([useProfileStore, useHistoryStore, useWorkoutStore, useBodyMetricStore, useAchievementStore, useCaffeineStore, useHydrationStore].map((store) => store.persist.rehydrate()));
  useProfileStore.getState().updateProfile({ displayName: 'Keep my profile' });
  saveCoachPlan(message.id);
  const ids = useProgramStore.getState().templates.map((item) => item.id);
  db.exec(
    "CREATE TRIGGER fail_reset BEFORE INSERT ON state_documents WHEN NEW.key = 'program-storage' BEGIN SELECT RAISE(ABORT, 'disk full'); END;",
  );
  await expect(useProfileStore.getState().clearAllData()).rejects.toThrow();
  expect(useProfileStore.getState().profile.displayName).toBe('Keep my profile');
  expect(useProgramStore.getState().templates.map((item) => item.id)).toEqual(ids);
  await useProfileStore.persist.rehydrate();
  await useProgramStore.persist.rehydrate();
  expect(useProfileStore.getState().profile.displayName).toBe('Keep my profile');
  expect(useProgramStore.getState().templates.filter((item) => ids.includes(item.id)).map((item) => item.id)).toEqual(ids);
  expect(useSyncStore.getState().isSyncing).toBe(false);
  expect(useCoachStore.getState().isSending).toBe(false);
});

const frontLever = {
  key: 'n0',
  name: 'Einbeinige Front-Lever-Raises',
  primaryMuscles: ['lats', 'abs'],
  secondaryMuscles: ['rear_delts'],
  equipment: 'bodyweight',
  movementPattern: 'core',
  tracking: 'reps',
  instructions: '1. Hängen. 2. Ein Bein gestreckt anheben.',
} as NonNullable<ChatMessage['newExercises']>[number];

it('creates proposed exercises with the plan and links the template to the new library entry', () => {
  useCoachStore.setState({
    messages: [
      {
        ...message,
        newExercises: [frontLever],
        plan: {
          ...message.plan!,
          kind: 'template',
          days: [
            {
              name: 'Front Lever',
              exercises: [{ ...message.plan!.days[0]!.exercises[0]!, exerciseId: 'new:n0' }],
            },
          ],
        },
      },
    ],
  });
  const [templateId] = saveCoachPlan(message.id);
  const created = useExerciseStore.getState().customExercises.find((e) => e.name === frontLever.name)!;
  expect(created).toMatchObject({ isCustom: true, primaryMuscles: ['lats', 'abs'] });
  const template = useProgramStore.getState().templates.find((t) => t.id === templateId)!;
  expect(template.exercises[0]!.exerciseId).toBe(created.id);
  expect(useCoachStore.getState().messages[0]!.savedExerciseIds).toEqual({ n0: created.id });
  expect(useSyncStore.getState().queue.map((op) => op.table).sort()).toEqual(['exercises', 'workout_templates']);
});

it('adds exercise-only proposals once and never duplicates an existing name', () => {
  useCoachStore.setState({ messages: [{ ...message, plan: undefined, newExercises: [frontLever] }] });
  const first = saveCoachExercises(message.id);
  const second = saveCoachExercises(message.id);
  expect(second).toEqual(first);
  expect(useExerciseStore.getState().customExercises.filter((e) => e.name === frontLever.name)).toHaveLength(1);
});

it('rewrites an existing template in place when the coach was asked to edit it', () => {
  useProgramStore.getState().createTemplate({ name: 'Push A' });
  const existing = useProgramStore.getState().templates[0]!;
  useCoachStore.setState({
    messages: [
      {
        ...message,
        plan: {
          ...message.plan!,
          kind: 'template',
          updatesTemplateId: existing.id,
          days: [{ ...message.plan!.days[0]!, name: 'Push A' }],
        },
      },
    ],
  });
  expect(saveCoachPlan(message.id)).toEqual([existing.id]);
  const state = useProgramStore.getState();
  expect(state.templates).toHaveLength(1);
  expect(state.templates[0]!.createdAt).toEqual(existing.createdAt);
  expect(state.templates[0]!.exercises[0]!.targetRepsMax).toBe(12);
  expect(state.programs).toHaveLength(0);
});

it('rolls back created exercises when the plan cannot be committed', () => {
  useCoachStore.setState({
    messages: [
      {
        ...message,
        newExercises: [frontLever],
        plan: {
          ...message.plan!,
          days: [{ name: 'Tag A', exercises: [{ ...message.plan!.days[0]!.exercises[0]!, exerciseId: 'new:n0' }] }],
        },
      },
    ],
  });
  db.exec(
    "CREATE TRIGGER fail_coach BEFORE INSERT ON state_documents WHEN NEW.key = 'volt-coach-store' BEGIN SELECT RAISE(ABORT, 'disk full'); END;",
  );
  expect(() => saveCoachPlan(message.id)).toThrow();
  expect(useExerciseStore.getState().customExercises).toHaveLength(0);
  expect(useSyncStore.getState().queue).toHaveLength(0);
});
