import { openDatabaseSync } from 'expo-sqlite';
import { DocumentDatabase } from './documentDatabase';
export const usesDeviceDatabase = true;

let database: DocumentDatabase | undefined;
export function getDeviceDatabase(): DocumentDatabase {
  if (!database) {
    const connection = openDatabaseSync('training.sqlite');
    try {
      database = new DocumentDatabase(connection);
    } catch (error) {
      connection.closeSync();
      throw error;
    }
  }
  return database;
}
