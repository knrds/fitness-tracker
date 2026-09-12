import { DatabaseSync } from 'node:sqlite';
import { DocumentDatabase } from '../../data/documentDatabase';
import { saveCoachPlan } from '../saveCoachPlan';
import { useCoachStore } from '../../stores/coachStore';
import { useProgramStore } from '../../stores/programStore';
import { useExerciseStore } from '../../stores/exerciseStore';
import { useSyncStore } from '../../stores/syncStore';
import { useStorageHealth } from '../../stores/storageHealth';
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
  useExerciseStore.setState({ exercises: EXERCISES });
});
afterEach(() => {
  db.close();
  mockRepository = undefined;
});
it('saves templates and an editable program once, including after hydration', async () => {
  const ids = saveCoachPlan(message.id);
  expect(useProgramStore.getState().templates).toHaveLength(1);
  expect(useProgramStore.getState().templates[0]?.exercises[0]?.targetRepsMax).toBe(12);
  expect(useProgramStore.getState().programs[0]?.isActive).toBe(false);
  await Promise.all(stores.map((store) => store.persist.rehydrate()));
  expect(saveCoachPlan(message.id)).toEqual(ids);
  expect(
    useProgramStore.getState().templates.filter((template) => ids.includes(template.id)),
  ).toHaveLength(1);
  expect(useSyncStore.getState().queue).toHaveLength(2);
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
it('rejects a stale account generation before writing', () => {
  const scope = getStorageScope();
  const generation = beginScopeChange();
  selectStoragePartition('legacy', generation);
  completeScopeChange(generation);
  expect(() => saveCoachPlan(message.id, scope)).toThrow(/Profil/);
  expect(useProgramStore.getState().templates).toHaveLength(0);
});
