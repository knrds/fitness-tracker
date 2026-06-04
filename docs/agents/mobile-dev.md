# Agent Briefing — Mobile Development

## Context

You are working on `apps/mobile`, an Expo 52 React Native app using:

- **Expo Router v4** — file-based routing under `app/`
- **Zustand** — global state management
- **react-hook-form + zod** — form validation (use `@hookform/resolvers/zod`)
- **react-native-mmkv** — persistent storage (fast, replaces AsyncStorage)
- **TypeScript strict mode**

All domain types and Zod schemas live in `packages/domain` (`@fitness-tracker/domain`).
Import from there — do NOT redefine types in the mobile package.

## Routing Conventions

```
app/
  _layout.tsx          ← Root Stack navigator
  (tabs)/
    _layout.tsx        ← Tab navigator
    index.tsx          ← Home tab
    workouts.tsx       ← Workout list
```

Add new screens as files in `app/`. Use route groups `(name)/` for nested layouts.

## State Management

Use Zustand stores in `apps/mobile/stores/`. Keep stores small and single-concern.
Persist to MMKV via a custom storage adapter.

## Constraints

- No `any` — use `unknown` and narrow types
- No `useEffect` for derived state — use `useMemo` or computed Zustand selectors
- Always use `StyleSheet.create` for styles — no inline objects
