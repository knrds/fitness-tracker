# Skill: Writing a React Native Component

How a component is structured in this project. Components live either in a
route file under `apps/mobile/app/` (screens) or, when shared, in
`packages/ui/src/`. This is the canonical shape — match it.

---

## Anatomy

```tsx
// 1. React / React Native
import { memo } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

// 2. Third-party
// (none here)

// 3. Workspace packages
import type { ExerciseSet } from '@fitness-tracker/domain';

// 4. Local
import { formatWeight } from '../lib/format';

// --- Props: a named interface, never inline ---
export interface SetRowProps {
  set: ExerciseSet;
  onToggleComplete: (setId: string) => void;
}

// --- One primary component per file; named export, PascalCase ---
export const SetRow = memo(function SetRow({ set, onToggleComplete }: SetRowProps) {
  const label = set.weight != null ? formatWeight(set.weight) : '—';

  return (
    <Pressable style={styles.row} onPress={() => onToggleComplete(set.id)}>
      <Text style={styles.cell}>{set.setNumber}</Text>
      <Text style={styles.cell}>{label}</Text>
      <Text style={styles.cell}>{set.reps ?? '—'}</Text>
    </Pressable>
  );
});

// --- Styles last, via StyleSheet.create ---
const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', paddingVertical: 8 },
  cell: { flex: 1, fontSize: 16, color: '#1a1a2e' },
});
```

## Rules

- **One primary component per file.** File name = component name in
  `PascalCase.tsx`.
- **Props** are a named, exported `interface` (`<Component>Props`) — never an
  inline object type, never `any`. Reuse domain types from
  `@fitness-tracker/domain` instead of re-declaring shapes.
- **Named exports**, not default — except Expo Router route files in `app/`,
  which **must `export default`** the screen (Router requires it).
- **Styles** always via `StyleSheet.create` at the bottom. No inline style
  objects.
- Wrap pure, frequently-rendered list items in `memo`. Keep side effects out of
  render; prefer derived values (`useMemo`) over `useEffect` copies.
- Keep components presentational. Data fetching / persistence belongs in
  Zustand stores or hooks (see [conventions.md](./conventions.md)).

## Screens (Expo Router)

Route files under `apps/mobile/app/` use `export default` and follow Router
file conventions (`_layout.tsx`, route groups like `(tabs)/`). Keep the screen
thin: read from stores/hooks, compose shared components from `packages/ui`.

```tsx
export default function WorkoutsScreen() {
  const sessions = useWorkoutStore((s) => s.sessions);
  return <SessionList sessions={sessions} />;
}
```

## Exports

- Shared components go in `packages/ui/src/` and are re-exported from
  `packages/ui/src/index.ts` so consumers import from `@fitness-tracker/ui`.
- Co-locate a component's `Props` type with it and export both.

## Tests

> Test tooling (`pnpm test`) is **not configured yet** in this repo. When it is
> (React Native Testing Library + Vitest/Jest is the intended setup):
>
> - Co-locate as `ComponentName.test.tsx` next to the component.
> - Render via `@testing-library/react-native`, query by accessible role/text,
>   assert on user-visible output and that callbacks fire (`onToggleComplete`).
> - Test behaviour, not styles. Use domain factory objects built from
>   `@fitness-tracker/domain` types for fixtures.
>
> Until then, a component is "done" when it typechecks, lints, and renders
> correctly in the running app (see the Definition of Done in AGENTS.md).
