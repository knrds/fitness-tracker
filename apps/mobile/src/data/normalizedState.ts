import { z } from 'zod';
import { SessionExerciseSchema, WorkoutSessionSchema } from '@fitness-tracker/domain';
import {
  historyPersistedSchema,
  syncPersistedSchema,
  workoutPersistedSchema,
} from './persistedContracts';

export interface StoredRow {
  id: string;
  data: string;
  children: StoredRow[];
}
export interface NormalizedState {
  metadata: string;
  collections: Record<string, StoredRow[]>;
}
const envelopeSchema = z.object({
  state: z.unknown(),
  version: z.number().int().min(0).max(1).optional(),
});
export const normalizedKeys = ['history-storage', 'workout-storage', 'volt-sync-store'];

function exerciseRow(exercise: z.infer<typeof SessionExerciseSchema>): StoredRow {
  const { sets, ...metadata } = exercise;
  return {
    id: exercise.id,
    data: JSON.stringify(metadata),
    children: sets.map((set) => ({ id: set.id, data: JSON.stringify(set), children: [] })),
  };
}
function sessionRow(session: z.infer<typeof WorkoutSessionSchema>): StoredRow {
  const { exercises, ...metadata } = session;
  return { id: session.id, data: JSON.stringify(metadata), children: exercises.map(exerciseRow) };
}
function unique(rows: StoredRow[]): void {
  if (new Set(rows.map((row) => row.id)).size !== rows.length)
    throw new Error('Duplicate persisted ID');
  rows.forEach((row) => unique(row.children));
}
export function normalizeState(key: string, raw: string): NormalizedState | null {
  if (!normalizedKeys.includes(key)) return null;
  const envelope = envelopeSchema.parse(JSON.parse(raw));
  let state: object;
  let collections: Record<string, StoredRow[]>;
  if (key === 'history-storage') {
    const parsed = historyPersistedSchema.parse(envelope.state);
    state = {};
    collections = { history: parsed.sessions.map(sessionRow) };
  } else if (key === 'workout-storage') {
    const { exercises, lastFinishedSession, ...metadata } = workoutPersistedSchema.parse(
      envelope.state,
    );
    state = {};
    collections = {
      active: [
        { id: 'current', data: JSON.stringify(metadata), children: exercises.map(exerciseRow) },
      ],
      finished: lastFinishedSession ? [sessionRow(lastFinishedSession)] : [],
    };
  } else {
    const { queue, ...metadata } = syncPersistedSchema.parse(envelope.state);
    state = metadata;
    collections = {
      outbox: queue.map((operation) => ({
        id: operation.id,
        data: JSON.stringify(operation),
        children: [],
      })),
    };
  }
  Object.values(collections).forEach(unique);
  return { metadata: JSON.stringify({ ...envelope, state }), collections };
}
const objectSchema = z.record(z.unknown());
function restoreSession(row: StoredRow): object {
  return {
    ...objectSchema.parse(JSON.parse(row.data)),
    exercises: row.children.map((exercise) => ({
      ...objectSchema.parse(JSON.parse(exercise.data)),
      sets: exercise.children.map((set) => objectSchema.parse(JSON.parse(set.data))),
    })),
  };
}
export function restoreState(
  key: string,
  metadata: string,
  collections: Record<string, StoredRow[]>,
): string {
  const envelope = envelopeSchema.parse(JSON.parse(metadata));
  let state: object;
  if (key === 'history-storage') {
    state = { sessions: (collections.history ?? []).map(restoreSession) };
  } else if (key === 'workout-storage') {
    const active = collections.active?.[0];
    if (!active || collections.active?.length !== 1 || (collections.finished?.length ?? 0) > 1)
      throw new Error('Invalid active workout rows');
    const finished = collections.finished?.[0];
    state = {
      ...restoreSession(active),
      ...(finished ? { lastFinishedSession: restoreSession(finished) } : {}),
    };
  } else {
    state = {
      ...objectSchema.parse(envelope.state),
      queue: (collections.outbox ?? []).map((row) => objectSchema.parse(JSON.parse(row.data))),
    };
  }
  const raw = JSON.stringify({ ...envelope, state });
  // Revalidate the reconstructed tree before exposing it to a store.
  normalizeState(key, raw);
  return raw;
}
