import { getDeviceDatabase } from './deviceDatabase';

let suspended = 0;
let transactions = 0;
export const isStorageTransactionActive = () => transactions > 0;
export function areStorageWritesSuspended() {
  return suspended > 0;
}
export function withoutStorageWrites(work: () => void) {
  suspended++;
  try {
    work();
  } finally {
    suspended--;
  }
}
export function runStorageTransaction<T>(work: () => T, rollbackMemory: () => void): T {
  transactions++;
  try {
    const database = getDeviceDatabase();
    return database ? database.transaction(work) : work();
  } catch (error) {
    withoutStorageWrites(rollbackMemory);
    throw error;
  } finally {
    transactions--;
  }
}
