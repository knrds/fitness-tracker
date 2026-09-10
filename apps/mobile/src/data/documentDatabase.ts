/** Minimal synchronous SQLite surface, implemented by Expo on device and real SQLite in tests. */
export interface SqliteConnection {
  execSync: (sql: string) => void;
  runSync: (sql: string, ...parameters: (string | number | null)[]) => unknown;
  getFirstSync: (
    sql: string,
    ...parameters: (string | number | null)[]
  ) => Record<string, unknown> | null;
}

/** Transitional document repository: one native transaction spans existing store contracts. */
export class DocumentDatabase {
  private connection: SqliteConnection;
  private inTransaction = false;

  constructor(connection: SqliteConnection) {
    this.connection = connection;
    const version = connection.getFirstSync('PRAGMA user_version')?.user_version;
    if (typeof version !== 'number' || !Number.isInteger(version) || version < 0)
      throw new Error('Invalid database version');
    if (version > 1) throw new Error('Database requires a newer app version');
    connection.execSync(
      'PRAGMA journal_mode = WAL; PRAGMA synchronous = FULL; PRAGMA busy_timeout = 3000;',
    );
    if (version === 0)
      this.transaction(() => {
        connection.execSync(`
        CREATE TABLE state_documents (key TEXT PRIMARY KEY NOT NULL, value TEXT NOT NULL);
        CREATE TABLE legacy_imports (key TEXT PRIMARY KEY NOT NULL, raw TEXT, imported_at TEXT NOT NULL);
        PRAGMA user_version = 1;
      `);
      });
  }

  read(key: string): string | null {
    const row = this.connection.getFirstSync(
      'SELECT value FROM state_documents WHERE key = ?',
      key,
    );
    if (row === null) return null;
    if (typeof row.value !== 'string') throw new Error('Invalid stored document');
    return row.value;
  }
  write(key: string, value: string): void {
    this.connection.runSync(
      'INSERT INTO state_documents (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value',
      key,
      value,
    );
  }
  remove(key: string): void {
    this.connection.runSync('DELETE FROM state_documents WHERE key = ?', key);
  }
  hasImported(key: string): boolean {
    return (
      this.connection.getFirstSync('SELECT key FROM legacy_imports WHERE key = ?', key) !== null
    );
  }
  importLegacy(key: string, raw: string | null, validated: string | null): void {
    this.transaction(() => {
      if (this.hasImported(key)) return;
      // Do not overwrite a value written since the async legacy read started.
      if (this.read(key) === null && validated !== null) this.write(key, validated);
      this.connection.runSync(
        'INSERT INTO legacy_imports (key, raw, imported_at) VALUES (?, ?, ?)',
        key,
        raw,
        new Date().toISOString(),
      );
    });
  }
  clearLegacyBackups(): void {
    // Keep migration markers so deleted data cannot reappear from old MMKV/AsyncStorage.
    this.connection.runSync('UPDATE legacy_imports SET raw = NULL');
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
