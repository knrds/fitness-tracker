import { describe, expect, it } from 'vitest';
import { SyncOperationSchema } from '../schemas';

describe('SyncOperationSchema', () => {
  it('validates a correct sync operation', () => {
    const validOp = {
      id: '00000000-0000-4000-8000-000000000002',
      table: 'workout_sessions',
      operation: 'INSERT',
      payload: { name: 'My Workout', durationSeconds: 3600 },
      createdAt: new Date(),
      retryCount: 0,
    };

    const parsed = SyncOperationSchema.safeParse(validOp);
    expect(parsed.success).toBe(true);
  });

  it('rejects invalid UUIDs', () => {
    const invalidOp = {
      id: 'invalid-uuid',
      table: 'exercises',
      operation: 'UPDATE',
      payload: { name: 'New Name' },
      createdAt: new Date(),
      retryCount: 1,
    };

    const parsed = SyncOperationSchema.safeParse(invalidOp);
    expect(parsed.success).toBe(false);
  });

  it('rejects invalid tables', () => {
    const invalidOp = {
      id: '00000000-0000-4000-8000-000000000002',
      table: 'non_existent_table',
      operation: 'INSERT',
      payload: {},
      createdAt: new Date(),
      retryCount: 0,
    };

    const parsed = SyncOperationSchema.safeParse(invalidOp);
    expect(parsed.success).toBe(false);
  });

  it('rejects invalid operation types', () => {
    const invalidOp = {
      id: '00000000-0000-4000-8000-000000000002',
      table: 'body_metrics',
      operation: 'MERGE',
      payload: {},
      createdAt: new Date(),
      retryCount: 0,
    };

    const parsed = SyncOperationSchema.safeParse(invalidOp);
    expect(parsed.success).toBe(false);
  });
});
