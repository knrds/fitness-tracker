import { DatabaseSync } from 'node:sqlite';
import { randomUUID } from 'node:crypto';
import { DocumentDatabase } from '../documentDatabase';
import { WorkoutSessionSchema } from '@fitness-tracker/domain';

function connect(db: DatabaseSync) {
  return new DocumentDatabase({
    execSync: (sql) => db.exec(sql),
    runSync: (sql, ...parameters) => db.prepare(sql).run(...parameters),
    getFirstSync: (sql, ...parameters) => db.prepare(sql).get(...parameters) ?? null,
    getAllSync: (sql, ...parameters) => db.prepare(sql).all(...parameters),
  });
}
function session() {
  return WorkoutSessionSchema.parse({
    id: randomUUID(),
    userId: randomUUID(),
    name: 'Full parameters',
    startedAt: new Date('2026-09-10T09:00:00Z'),
    completedAt: new Date('2026-09-10T10:00:00Z'),
    durationSeconds: 3600,
    notes: '2026-09-10T09:00:00Z',
    createdAt: new Date('2026-09-10T09:00:00Z'),
    updatedAt: new Date('2026-09-10T10:00:00Z'),
    exercises: [
      {
        id: randomUUID(),
        exerciseId: randomUUID(),
        order: 0,
        notes: 'Exercise note',
        supersetGroup: 'A',
        sets: [
          {
            id: randomUUID(),
            setNumber: 1,
            type: 'working',
            weight: 60,
            reps: 8,
            rpe: 8,
            rir: 2,
            restSeconds: 120,
            durationSeconds: 40,
            distanceMeters: 12,
            notes: 'Set note',
            completed: true,
            completedAt: new Date('2026-09-10T09:05:00Z'),
          },
          { id: randomUUID(), setNumber: 2, type: 'drop', weight: 40, reps: 12, completed: false },
        ],
      },
    ],
  });
}
const history = (sessions: ReturnType<typeof session>[]) =>
  JSON.stringify({ state: { sessions }, version: 1 });
const outbox = (id: string, retryCount = 0) =>
  JSON.stringify({
    state: {
      queue: [
        {
          id,
          operation: 'DELETE',
          table: 'workout_sessions',
          payload: { id: randomUUID() },
          createdAt: new Date('2026-09-10T10:00:00Z'),
          retryCount,
        },
      ],
      lastSyncedAt: null,
      isOnline: true,
    },
    version: 0,
  });

describe('normalized SQLite storage', () => {
  let db: DatabaseSync;
  beforeEach(() => {
    db = new DatabaseSync(':memory:');
  });
  afterEach(() => {
    db.close();
  });

  it('migrates v1 documents atomically, retains original bytes and reopens all set parameters', () => {
    const raw = history([session()]);
    db.exec(
      'CREATE TABLE state_documents (key TEXT PRIMARY KEY NOT NULL, value TEXT NOT NULL); CREATE TABLE legacy_imports (key TEXT PRIMARY KEY NOT NULL, raw TEXT, imported_at TEXT NOT NULL); PRAGMA user_version = 1;',
    );
    db.prepare('INSERT INTO state_documents VALUES (?, ?)').run('history-storage', raw);
    const repository = connect(db);
    expect(JSON.parse(repository.read('history-storage')!)).toEqual(JSON.parse(raw));
    expect(db.prepare('SELECT raw FROM normalization_backups').get()?.raw).toBe(raw);
    expect(db.prepare('SELECT COUNT(*) AS count FROM exercise_sets').get()?.count).toBe(2);
    expect(db.prepare('SELECT value FROM state_documents').get()?.value).not.toContain('sessions');
    expect(connect(db).read('history-storage')).toBe(repository.read('history-storage'));
    expect(db.prepare('PRAGMA user_version').get()?.user_version).toBe(2);
  });
  it('leaves the entire v1 schema and bytes intact when a later document is invalid', () => {
    const raw = history([session()]);
    db.exec(
      'CREATE TABLE state_documents (key TEXT PRIMARY KEY NOT NULL, value TEXT NOT NULL); CREATE TABLE legacy_imports (key TEXT PRIMARY KEY NOT NULL, raw TEXT, imported_at TEXT NOT NULL); PRAGMA user_version = 1;',
    );
    db.prepare('INSERT INTO state_documents VALUES (?, ?)').run('history-storage', raw);
    db.prepare('INSERT INTO state_documents VALUES (?, ?)').run('workout-storage', '{broken');
    expect(() => connect(db)).toThrow();
    expect(db.prepare('PRAGMA user_version').get()?.user_version).toBe(1);
    expect(
      db.prepare('SELECT value FROM state_documents WHERE key = ?').get('history-storage')?.value,
    ).toBe(raw);
    expect(
      db.prepare("SELECT name FROM sqlite_master WHERE name = 'workout_sessions'").get(),
    ).toBeUndefined();
  });
  it('changes only the edited set row, retaining unaffected rows and their identities', () => {
    const repository = connect(db);
    const original = session();
    repository.write('history-storage', history([original]));
    db.exec(`CREATE TABLE edits (id TEXT); CREATE TRIGGER track_set AFTER UPDATE ON exercise_sets BEGIN INSERT INTO edits VALUES (NEW.id); END;
      CREATE TRIGGER forbid_session_update BEFORE UPDATE ON workout_sessions BEGIN SELECT RAISE(ABORT, 'unchanged session rewritten'); END;
      CREATE TRIGGER forbid_exercise_update BEFORE UPDATE ON session_exercises BEGIN SELECT RAISE(ABORT, 'unchanged exercise rewritten'); END;`);
    original.exercises[0]!.sets[0]!.reps = 9;
    repository.write('history-storage', history([original]));
    expect(db.prepare('SELECT id FROM edits').all()).toEqual([
      { id: original.exercises[0]!.sets[0]!.id },
    ]);
    expect(JSON.parse(repository.read('history-storage')!)).toEqual(
      JSON.parse(history([original])),
    );
  });
  it('does not rewrite history when acknowledging one outbox entry', () => {
    const repository = connect(db);
    repository.write('history-storage', history([session()]));
    const id = randomUUID();
    repository.write('volt-sync-store', outbox(id));
    db.exec(
      "CREATE TRIGGER protect_history BEFORE UPDATE ON workout_sessions BEGIN SELECT RAISE(ABORT, 'history changed by ack'); END;",
    );
    repository.write(
      'volt-sync-store',
      JSON.stringify({ state: { queue: [], isOnline: true, lastSyncedAt: null } }),
    );
    expect(db.prepare('SELECT COUNT(*) AS count FROM sync_operations').get()?.count).toBe(0);
    expect(db.prepare('SELECT COUNT(*) AS count FROM workout_sessions').get()?.count).toBe(1);
  });
  it('isolates identical record IDs, outbox entries and deletions between partitions', () => {
    const repository = connect(db);
    const original = session();
    const id = randomUUID();
    repository.write('history-storage', history([original]), 'account:A');
    repository.write('volt-sync-store', outbox(id), 'account:A');
    repository.write('history-storage', history([{ ...original, name: 'B private' }]), 'account:B');
    repository.write('volt-sync-store', outbox(id, 2), 'account:B');
    expect(repository.read('history-storage', 'guest')).toBeNull();
    expect(repository.read('history-storage', 'account:A')).toContain('Full parameters');
    expect(repository.read('history-storage', 'account:B')).toContain('B private');
    repository.remove('history-storage', 'account:A');
    repository.remove('volt-sync-store', 'account:A');
    expect(repository.read('history-storage', 'account:B')).toContain('B private');
    expect(
      db.prepare('SELECT COUNT(*) AS count FROM exercise_sets WHERE partition = ?').get('account:A')
        ?.count,
    ).toBe(0);
    expect(
      db.prepare('SELECT COUNT(*) AS count FROM exercise_sets WHERE partition = ?').get('account:B')
        ?.count,
    ).toBe(2);
    expect(
      db
        .prepare('SELECT COUNT(*) AS count FROM sync_operations WHERE partition = ?')
        .get('account:B')?.count,
    ).toBe(1);
    expect(db.prepare('PRAGMA foreign_key_check').all()).toEqual([]);
  });
  it('rolls back preceding set updates when a following set write fails', () => {
    const repository = connect(db);
    const original = session();
    repository.write('history-storage', history([original]));
    const before = repository.read('history-storage');
    db.exec(
      "CREATE TRIGGER fail_second BEFORE UPDATE ON exercise_sets WHEN NEW.position = 1 BEGIN SELECT RAISE(ABORT, 'disk full'); END;",
    );
    original.exercises[0]!.sets.forEach((set) => {
      set.reps = 99;
    });
    expect(() => repository.write('history-storage', history([original]))).toThrow('disk full');
    expect(repository.read('history-storage')).toBe(before);
  });
  it('rejects duplicate set IDs without erasing the original workout', () => {
    const repository = connect(db);
    const original = session();
    repository.write('history-storage', history([original]));
    const before = repository.read('history-storage');
    original.exercises[0]!.sets[1]!.id = original.exercises[0]!.sets[0]!.id;
    expect(() => repository.write('history-storage', history([original]))).toThrow('Duplicate');
    expect(repository.read('history-storage')).toBe(before);
  });
  it('retains ordering after reordering and cascades removed sessions to their sets', () => {
    const repository = connect(db);
    const a = session();
    const b = session();
    repository.write('history-storage', history([a, b]));
    repository.write('history-storage', history([b, a]));
    expect(JSON.parse(repository.read('history-storage')!)).toEqual(JSON.parse(history([b, a])));
    repository.write('history-storage', history([a]));
    expect(db.prepare('SELECT COUNT(*) AS count FROM exercise_sets').get()?.count).toBe(2);
    repository.remove('history-storage');
    expect(db.prepare('SELECT COUNT(*) AS count FROM exercise_sets').get()?.count).toBe(0);
  });
  it('clears only the selected partition backup bytes and retains import markers', () => {
    const repository = connect(db);
    repository.importLegacy('test', 'A raw', 'A valid', 'A');
    repository.importLegacy('test', 'B raw', 'B valid', 'B');
    repository.clearLegacyBackups('A');
    expect(repository.hasImported('test', 'A')).toBe(true);
    expect(
      db.prepare('SELECT raw FROM legacy_imports WHERE partition = ?').get('A')?.raw,
    ).toBeNull();
    expect(db.prepare('SELECT raw FROM legacy_imports WHERE partition = ?').get('B')?.raw).toBe(
      'B raw',
    );
  });
});
