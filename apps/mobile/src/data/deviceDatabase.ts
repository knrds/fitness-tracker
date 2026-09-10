import type { DocumentDatabase } from './documentDatabase';
export const usesDeviceDatabase = false;

// Web remains an audit preview using the existing browser storage. No native guarantees claimed.
export function getDeviceDatabase(): DocumentDatabase | null {
  return null;
}
