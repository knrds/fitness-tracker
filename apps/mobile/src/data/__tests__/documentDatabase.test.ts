import { DatabaseSync } from 'node:sqlite';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { basename, dirname, join } from 'node:path';
import { DocumentDatabase } from '../documentDatabase';

export function connect(db: DatabaseSync) {
  return new DocumentDatabase({
    execSync: (sql) => db.exec(sql),
    runSync: (sql, ...parameters) => db.prepare(sql).run(...parameters),
    getFirstSync: (sql, ...parameters) => db.prepare(sql).get(...parameters) ?? null,
  });
}

describe('real SQLite document transactions', () => {
  let directory: string;
  let db: DatabaseSync;
  let repository: DocumentDatabase;
  beforeEach(() => {
    directory = mkdtempSync(join(tmpdir(), 'training-sqlite-test-'));
    db = new DatabaseSync(join(directory, 'test.sqlite'));
    repository = connect(db);
  });
  afterEach(() => {
    db.close();
    if (dirname(directory) !== tmpdir() || !basename(directory).startsWith('training-sqlite-test-'))
      throw new Error('Unexpected temporary directory');
    rmSync(directory, { recursive: true, force: true });
  });

  it('imports once, preserves raw bytes, and reopens the same committed state', () => {
    repository.importLegacy('workout', '{original}', '{validated}');
    repository.importLegacy('workout', '{stale}', '{stale}');
    expect(repository.read('workout')).toBe('{validated}');
    expect(db.prepare('SELECT raw FROM legacy_imports WHERE key = ?').get('workout')?.raw).toBe(
      '{original}',
    );
    db.close();
    db = new DatabaseSync(join(directory, 'test.sqlite'));
    repository = connect(db);
    expect(repository.hasImported('workout')).toBe(true);
    expect(repository.read('workout')).toBe('{validated}');
  });
  it('rolls back every document when a real SQL write aborts', () => {
    repository.write('workout', 'active');
    db.exec(
      "CREATE TRIGGER fail_queue BEFORE INSERT ON state_documents WHEN NEW.key = 'queue' BEGIN SELECT RAISE(ABORT, 'injected disk failure'); END;",
    );
    expect(() =>
      repository.transaction(() => {
        repository.write('workout', 'finished');
        repository.write('history', 'session');
        repository.write('queue', 'operation');
      }),
    ).toThrow();
    expect(repository.read('workout')).toBe('active');
    expect(repository.read('history')).toBeNull();
    expect(repository.read('queue')).toBeNull();
  });
  it('does not commit an import marker if importing the document fails', () => {
    db.exec(
      "CREATE TRIGGER fail_import BEFORE INSERT ON state_documents BEGIN SELECT RAISE(ABORT, 'injected import failure'); END;",
    );
    expect(() => repository.importLegacy('workout', 'raw', 'valid')).toThrow();
    expect(repository.hasImported('workout')).toBe(false);
  });
  it('retains markers after backup deletion so old data cannot resurrect', () => {
    repository.importLegacy('history', 'raw', 'valid');
    repository.remove('history');
    repository.clearLegacyBackups();
    repository.importLegacy('history', 'old raw', 'old valid');
    expect(repository.read('history')).toBeNull();
    expect(repository.hasImported('history')).toBe(true);
    expect(
      db.prepare('SELECT raw FROM legacy_imports WHERE key = ?').get('history')?.raw,
    ).toBeNull();
  });
  it('binds user values rather than executing SQL text', () => {
    const key = "'); DROP TABLE state_documents; --";
    repository.write(key, key);
    expect(repository.read(key)).toBe(key);
  });
  it('rejects a newer database without changing its version', () => {
    db.exec('PRAGMA user_version = 99');
    expect(() => connect(db)).toThrow('newer app');
    expect(db.prepare('PRAGMA user_version').get()?.user_version).toBe(99);
  });
});
