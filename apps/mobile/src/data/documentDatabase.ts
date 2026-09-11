import { normalizedKeys, normalizeState, restoreState, StoredRow } from './normalizedState';

/** Synchronous SQLite surface implemented by Expo and by real SQLite in integration tests. */
export interface SqliteConnection {
  execSync: (sql: string) => void;
  runSync: (sql: string, ...parameters: (string | number | null)[]) => unknown;
  getFirstSync: (
    sql: string,
    ...parameters: (string | number | null)[]
  ) => Record<string, unknown> | null;
  getAllSync: (sql: string, ...parameters: (string | number | null)[]) => Record<string, unknown>[];
}
type Table = 'workout_sessions' | 'session_exercises' | 'exercise_sets' | 'sync_operations';
interface Level {
  table: Table;
  parents: string[];
  child?: Level;
}
const setLevel: Level = { table: 'exercise_sets', parents: ['session_id', 'exercise_id'] };
const exerciseLevel: Level = {
  table: 'session_exercises',
  parents: ['session_id'],
  child: setLevel,
};
const sessionLevel: Level = { table: 'workout_sessions', parents: [], child: exerciseLevel };
const outboxLevel: Level = { table: 'sync_operations', parents: [] };
const collectionsFor = (key: string): string[] =>
  key === 'history-storage'
    ? ['history']
    : key === 'workout-storage'
      ? ['active', 'finished']
      : key === 'volt-sync-store'
        ? ['outbox']
        : [];
const levelFor = (collection: string) => (collection === 'outbox' ? outboxLevel : sessionLevel);
const textValue = (value: unknown): string => {
  if (typeof value !== 'string') throw new Error('Invalid stored text');
  return value;
};

/** Store projections share transactions; workout trees and outbox entries have individual rows. */
export class DocumentDatabase {
  private inTransaction = false;
  constructor(private connection: SqliteConnection) {
    const version = connection.getFirstSync('PRAGMA user_version')?.user_version;
    if (typeof version !== 'number' || !Number.isInteger(version) || version < 0)
      throw new Error('Invalid database version');
    if (version > 2) throw new Error('Database requires a newer app version');
    connection.execSync(
      'PRAGMA journal_mode = WAL; PRAGMA synchronous = FULL; PRAGMA busy_timeout = 3000; PRAGMA foreign_keys = ON;',
    );
    if (version < 2)
      this.transaction(() => {
        if (version === 0)
          connection.execSync(`
        CREATE TABLE state_documents (key TEXT PRIMARY KEY NOT NULL, value TEXT NOT NULL);
        CREATE TABLE legacy_imports (key TEXT PRIMARY KEY NOT NULL, raw TEXT, imported_at TEXT NOT NULL);
      `);
        connection.execSync(`
        ALTER TABLE state_documents RENAME TO state_documents_v1;
        CREATE TABLE state_documents (partition TEXT NOT NULL, key TEXT NOT NULL, value TEXT NOT NULL, PRIMARY KEY (partition, key));
        INSERT INTO state_documents SELECT 'legacy', key, value FROM state_documents_v1;
        DROP TABLE state_documents_v1;
        ALTER TABLE legacy_imports RENAME TO legacy_imports_v1;
        CREATE TABLE legacy_imports (partition TEXT NOT NULL, key TEXT NOT NULL, raw TEXT, imported_at TEXT NOT NULL, PRIMARY KEY (partition, key));
        INSERT INTO legacy_imports SELECT 'legacy', key, raw, imported_at FROM legacy_imports_v1;
        DROP TABLE legacy_imports_v1;
        CREATE TABLE normalization_backups (partition TEXT NOT NULL, key TEXT NOT NULL, raw TEXT, PRIMARY KEY (partition, key));
        CREATE TABLE workout_sessions (partition TEXT NOT NULL, collection TEXT NOT NULL CHECK(collection IN ('active','finished','history')), id TEXT NOT NULL, position INTEGER NOT NULL, data TEXT NOT NULL, PRIMARY KEY (partition, collection, id));
        CREATE TABLE session_exercises (partition TEXT NOT NULL, collection TEXT NOT NULL, session_id TEXT NOT NULL, id TEXT NOT NULL, position INTEGER NOT NULL, data TEXT NOT NULL, PRIMARY KEY (partition, collection, session_id, id), FOREIGN KEY (partition, collection, session_id) REFERENCES workout_sessions(partition, collection, id) ON DELETE CASCADE);
        CREATE TABLE exercise_sets (partition TEXT NOT NULL, collection TEXT NOT NULL, session_id TEXT NOT NULL, exercise_id TEXT NOT NULL, id TEXT NOT NULL, position INTEGER NOT NULL, data TEXT NOT NULL, PRIMARY KEY (partition, collection, session_id, exercise_id, id), FOREIGN KEY (partition, collection, session_id, exercise_id) REFERENCES session_exercises(partition, collection, session_id, id) ON DELETE CASCADE);
        CREATE TABLE sync_operations (partition TEXT NOT NULL, collection TEXT NOT NULL CHECK(collection = 'outbox'), id TEXT NOT NULL, position INTEGER NOT NULL, data TEXT NOT NULL, PRIMARY KEY (partition, collection, id));
      `);
        for (const key of normalizedKeys) {
          const raw = this.readDocument(key, 'legacy');
          if (raw === null) continue;
          connection.runSync(
            'INSERT INTO normalization_backups (partition, key, raw) VALUES (?, ?, ?)',
            'legacy',
            key,
            raw,
          );
          this.write(key, raw);
        }
        connection.execSync('PRAGMA user_version = 2');
      });
  }
  private readDocument(key: string, partition: string): string | null {
    const row = this.connection.getFirstSync(
      'SELECT value FROM state_documents WHERE partition = ? AND key = ?',
      partition,
      key,
    );
    return row === null ? null : textValue(row.value);
  }
  read(key: string, partition = 'legacy'): string | null {
    const metadata = this.readDocument(key, partition);
    if (metadata === null || !normalizedKeys.includes(key)) return metadata;
    const collections: Record<string, StoredRow[]> = {};
    for (const collection of collectionsFor(key))
      collections[collection] = this.readRows(levelFor(collection), [partition, collection]);
    return restoreState(key, metadata, collections);
  }
  write(key: string, value: string, partition = 'legacy'): void {
    this.atomic(() => {
      const normalized = normalizeState(key, value);
      if (normalized)
        for (const [collection, rows] of Object.entries(normalized.collections))
          this.writeRows(levelFor(collection), [partition, collection], rows);
      this.connection.runSync(
        'INSERT INTO state_documents (partition, key, value) VALUES (?, ?, ?) ON CONFLICT(partition, key) DO UPDATE SET value = excluded.value WHERE value != excluded.value',
        partition,
        key,
        normalized?.metadata ?? value,
      );
    });
  }
  remove(key: string, partition = 'legacy'): void {
    this.atomic(() => {
      for (const collection of collectionsFor(key))
        this.connection.runSync(
          `DELETE FROM ${levelFor(collection).table} WHERE partition = ? AND collection = ?`,
          partition,
          collection,
        );
      this.connection.runSync(
        'DELETE FROM state_documents WHERE partition = ? AND key = ?',
        partition,
        key,
      );
    });
  }
  hasImported(key: string, partition = 'legacy'): boolean {
    return (
      this.connection.getFirstSync(
        'SELECT key FROM legacy_imports WHERE partition = ? AND key = ?',
        partition,
        key,
      ) !== null
    );
  }
  importLegacy(
    key: string,
    raw: string | null,
    validated: string | null,
    partition = 'legacy',
  ): void {
    this.atomic(() => {
      if (this.hasImported(key, partition)) return;
      if (this.read(key, partition) === null && validated !== null)
        this.write(key, validated, partition);
      this.connection.runSync(
        'INSERT INTO legacy_imports (partition, key, raw, imported_at) VALUES (?, ?, ?, ?)',
        partition,
        key,
        raw,
        new Date().toISOString(),
      );
    });
  }
  clearLegacyBackups(partition = 'legacy'): void {
    this.atomic(() => {
      this.connection.runSync(
        'UPDATE legacy_imports SET raw = NULL WHERE partition = ?',
        partition,
      );
      this.connection.runSync(
        'UPDATE normalization_backups SET raw = NULL WHERE partition = ?',
        partition,
      );
    });
  }
  private readRows(level: Level, parameters: string[]): StoredRow[] {
    const where = ['partition', 'collection', ...level.parents]
      .map((key) => `${key} = ?`)
      .join(' AND ');
    return this.connection
      .getAllSync(
        `SELECT id, data FROM ${level.table} WHERE ${where} ORDER BY position`,
        ...parameters,
      )
      .map((row) => {
        const id = textValue(row.id);
        return {
          id,
          data: textValue(row.data),
          children: level.child ? this.readRows(level.child, [...parameters, id]) : [],
        };
      });
  }
  private writeRows(level: Level, parameters: string[], rows: StoredRow[]): void {
    const columns = ['partition', 'collection', ...level.parents];
    const where = columns.map((key) => `${key} = ?`).join(' AND ');
    const existing = new Map(
      this.connection
        .getAllSync(`SELECT id, data, position FROM ${level.table} WHERE ${where}`, ...parameters)
        .map((row) => [textValue(row.id), row]),
    );
    rows.forEach((row, position) => {
      const previous = existing.get(row.id);
      existing.delete(row.id);
      if (!previous || previous.data !== row.data || previous.position !== position) {
        const names = [...columns, 'id', 'position', 'data'];
        this.connection.runSync(
          `INSERT INTO ${level.table} (${names.join(', ')}) VALUES (${names.map(() => '?').join(', ')}) ON CONFLICT (${[...columns, 'id'].join(', ')}) DO UPDATE SET data = excluded.data, position = excluded.position`,
          ...parameters,
          row.id,
          position,
          row.data,
        );
      }
      if (level.child) this.writeRows(level.child, [...parameters, row.id], row.children);
    });
    for (const id of existing.keys())
      this.connection.runSync(
        `DELETE FROM ${level.table} WHERE ${where} AND id = ?`,
        ...parameters,
        id,
      );
  }
  private atomic<T>(work: () => T): T {
    return this.inTransaction ? work() : this.transaction(work);
  }
  transaction<T>(work: () => T): T {
    if (this.inTransaction) throw new Error('Nested document transaction');
    this.connection.execSync('BEGIN IMMEDIATE');
    this.inTransaction = true;
    try {
      const result = work();
      if (result instanceof Promise) throw new Error('Database transactions must be synchronous');
      this.connection.execSync('COMMIT');
      return result;
    } catch (error) {
      this.connection.execSync('ROLLBACK');
      throw error;
    } finally {
      this.inTransaction = false;
    }
  }
}
