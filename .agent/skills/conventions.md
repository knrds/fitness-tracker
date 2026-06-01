# Skill: Core Coding Patterns

The non-negotiable patterns for async code, validation, state, and persistence.
Follow these exactly so the codebase stays consistent.

---

## Async / Await

- **Always `async/await`** — never raw `.then()` chains.
- Every `await` that can fail (I/O, network, storage) is wrapped so the failure
  is handled, not swallowed. No empty `catch`.
- Type the error as `unknown` and narrow; never assume it's an `Error`.

```ts
async function loadSessions(userId: string): Promise<WorkoutSession[]> {
  try {
    const raw = await api.fetchSessions(userId);
    return raw.map((r) => WorkoutSessionSchema.parse(r)); // validate at the boundary
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    console.error('Failed to load sessions:', message);
    throw new Error(`loadSessions failed: ${message}`);
  }
}
```

- Run independent awaits concurrently with `Promise.all`, not sequentially.

## Zod Validation

- **Validate at every trust boundary**: API responses, MMKV reads, form
  submissions, deep links. Inside the app, trust the static types.
- Import schemas from `@fitness-tracker/domain` — never redefine them.
- Use `.parse()` when a failure is a bug worth throwing; use `.safeParse()` when
  you must branch on validity (e.g. corrupt persisted state → fall back).

```ts
import { ActiveWorkoutStateSchema } from '@fitness-tracker/domain';

const result = ActiveWorkoutStateSchema.safeParse(rawFromStorage);
if (!result.success) {
  // corrupt/old data — reset rather than crash
  return initialActiveWorkout;
}
return result.data;
```

- For forms, wire react-hook-form via `@hookform/resolvers/zod` using the same
  domain schema — one schema, reused for both runtime and form validation.

## Zustand Store Pattern

- One store per concern, in `apps/mobile/stores/<name>-store.ts`.
- State and actions live **together** in the store; components select the
  minimal slice they need (avoids needless re-renders).
- Keep stores serialisable (so they can persist). Derive computed values in
  selectors, not as duplicated state.

```ts
import { create } from 'zustand';
import type { WorkoutSession } from '@fitness-tracker/domain';

interface WorkoutStore {
  sessions: WorkoutSession[];
  addSession: (session: WorkoutSession) => void;
  clear: () => void;
}

export const useWorkoutStore = create<WorkoutStore>((set) => ({
  sessions: [],
  addSession: (session) => set((state) => ({ sessions: [...state.sessions, session] })),
  clear: () => set({ sessions: [] }),
}));

// In a component — select a narrow slice:
const sessions = useWorkoutStore((s) => s.sessions);
const addSession = useWorkoutStore((s) => s.addSession);
```

- Never mutate state in place; always return a new object/array from `set`.

## MMKV Persistence

- A single shared MMKV instance lives in `apps/mobile/lib/storage.ts`. Import
  it; don't instantiate `new MMKV()` ad hoc.
- Store JSON strings; **validate on read** with the matching Zod schema before
  trusting persisted data (formats drift across app versions).
- For Zustand persistence, use a thin MMKV-backed `StateStorage` adapter with
  `zustand/middleware`'s `persist`.

```ts
import { MMKV } from 'react-native-mmkv';

export const storage = new MMKV();

export const mmkvStorage = {
  getItem: (key: string): string | null => storage.getString(key) ?? null,
  setItem: (key: string, value: string): void => storage.set(key, value),
  removeItem: (key: string): void => storage.delete(key),
};
```

- Reading persisted domain objects: parse through the schema and fall back to a
  safe default on `safeParse` failure (see the Zod example above). Never feed
  unvalidated MMKV data straight into the app's typed state.
