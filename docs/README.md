# Fitness Tracker — Documentation

A React Native fitness tracking app built as a pnpm monorepo.

## Architecture

```
fitness-tracker/
├── apps/
│   └── mobile/          # Expo 52 + React Native + TypeScript + Expo Router v4
├── packages/
│   ├── domain/          # Business logic, TypeScript types, Zod schemas (no React)
│   └── ui/              # Shared UI components (planned)
└── docs/
    ├── README.md        # This file
    └── agents/          # Agent briefings and templates
```

## Getting Started

```bash
# Install dependencies
pnpm install

# Start web dev server
pnpm dev

# Start on specific platform
pnpm --filter @fitness-tracker/mobile android
pnpm --filter @fitness-tracker/mobile ios
```

## Packages

### `@fitness-tracker/domain`
Pure TypeScript business logic — no React, no platform dependencies.
- **Types**: `WorkoutSession`, `Exercise`, `WorkoutSet`, `UserProfile`, …
- **Schemas**: Zod validators for all domain types

### `@fitness-tracker/ui`
Shared React Native component library. Currently a placeholder.

### `@fitness-tracker/mobile`
The main Expo app with Expo Router for file-based navigation.
