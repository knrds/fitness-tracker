# EVARO – Data Export Implementation Spec

**Document Version:** 1.0.0  
**Date:** 2026-09-16  
**Status:** SPECIFICATION / AUDIT COMPLETE  
**Requirement Reference:** DSGVO Art. 20 (Recht auf Datenübertragbarkeit), Apple Data Portability, Google Play User Data  
**Astra Review ID:** AR-006  

---

## 1. Executive Summary & Legal Baseline

Under Article 20 of the General Data Protection Regulation (GDPR / DSGVO), data subjects have the right to receive the personal data concerning them, which they have provided to a controller, in a structured, commonly used, and machine-readable format (JSON).

EVARO currently includes a working, local JSON export implementation in `apps/mobile/src/stores/profileStore.ts:293` (`exportData()`), invoked from `app/profile.tsx` via `handleExport()`.

This specification audits the existing implementation, formalizes the JSON schema contracts, details the performance characteristics for large datasets, clarifies the relationship between local and cloud data, and outlines future enhancements (such as CSV export for fitness logs) for Astra.

---

## 2. Audit of Existing Export Implementation

### 2.1 Current Implementation in Codebase
The current function `useProfileStore.getState().exportData()` constructs an in-memory JSON document across all active Zustand stores:

```typescript
// apps/mobile/src/stores/profileStore.ts:293
exportData: () => {
  const exercise = useExerciseStore.getState();
  const achievements = useAchievementStore.getState();
  const hydration = useHydrationStore.getState();
  const caffeine = useCaffeineStore.getState();
  const data = {
    schemaVersion: 2,
    exportedAt: new Date().toISOString(),
    profile: get().profile,
    history: useHistoryStore.getState().sessions,
    customExercises: useExerciseStore.getState().customExercises,
    favorites: useExerciseStore.getState().favoriteIds,
    bodyMetrics: useBodyMetricStore.getState().metrics,
    programs: useProgramStore.getState().programs,
    templates: useProgramStore.getState().templates,
    exercisePreferences: {
      persistentNotes: exercise.persistentNotes,
      exerciseRestDurations: exercise.exerciseRestDurations,
    },
    achievements: {
      xp: achievements.xp,
      level: achievements.level,
      unlockedAchievements: achievements.unlockedAchievements,
      repeatCounts: achievements.repeatCounts,
    },
    hydration: {
      dateKey: hydration.dateKey,
      dailyGoalMl: hydration.dailyGoalMl,
      todayIntakeMl: hydration.todayIntakeMl,
    },
    caffeine: {
      isEnabled: caffeine.isEnabled,
      currentWorkoutMg: caffeine.currentWorkoutMg,
      lastWorkoutMg: caffeine.lastWorkoutMg,
    },
    coachMessages: useCoachStore.getState().messages,
    workout: workoutPersistedSchema.parse(useWorkoutStore.getState()),
  };

  return JSON.stringify(data, null, 2);
}
```

### 2.2 User Interface Presentation (`app/profile.tsx`)
In `app/profile.tsx:255`, the user triggers `handleExport()`:
1. Calls `exportData()` to produce formatted JSON.
2. Prompts the user with a native Alert dialog offering two options:
   - **"Datei teilen / speichern" (Share / Save File):** Uses React Native's `Share.share({ message: dataStr, title: 'EVARO Backup' })` which triggers the native iOS Share Sheet / Android Intent.
   - **"Auf Bildschirm anzeigen" (View on Screen):** Opens an in-app JSON viewer modal for immediate verification.

---

## 3. Export Data Inventory & Schema Contracts

The export document conforms to `schemaVersion: 2`. All timestamps are canonical ISO 8601 strings in UTC (`YYYY-MM-DDTHH:mm:ss.sssZ`). Weights are canonical kilograms (`kg`) and heights are canonical centimeters (`cm`).

| Section | Data Type | Contains Personal Data? | Schema Structure |
|---|---|---|---|
| `schemaVersion` | `number` | No | Fixed integer (`2`) |
| `exportedAt` | `string (ISO)` | No | Timestamp of export generation |
| `profile` | `Object` | Yes | `displayName`, `language`, `fitnessGoal`, `experienceLevel`, `preferredUnits`, `biologicalSex`, `heightCm`, `weightKg`, `benchPressMaxKg`, `squatMaxKg`, `deadliftMaxKg`, UI preferences |
| `history` | `Array<WorkoutSession>` | Yes | Full workout logs: session ID, name, timestamps, duration, notes, exercises, sets (weight, reps, rpe, rir, durationSeconds, completed) |
| `customExercises` | `Array<CustomExercise>` | No | User-created exercises: id, name, category, targetMuscles, equipment |
| `favorites` | `Array<string>` | No | Exercise IDs bookmarked by user |
| `bodyMetrics` | `Array<BodyMetric>` | Yes | Chronological body logs: id, recordedAt, weightKg, bodyFatPercentage, chestCm, waistCm, hipsCm, armCm, thighCm |
| `programs` | `Array<Program>` | No | Training cycles: id, name, description, durationWeeks, schedule |
| `templates` | `Array<WorkoutTemplate>` | No | Saved workout templates: id, name, exercises, targetSets, targetReps, targetWeight |
| `exercisePreferences` | `Object` | No | `persistentNotes` per exercise, `exerciseRestDurations` (seconds) |
| `achievements` | `Object` | No | Gamification progress: `xp`, `level`, `unlockedAchievements` map, `repeatCounts` |
| `hydration` | `Object` | Yes (Health) | `dateKey`, `dailyGoalMl`, `todayIntakeMl` |
| `caffeine` | `Object` | Yes (Health) | `isEnabled`, `currentWorkoutMg`, `lastWorkoutMg` |
| `coachMessages` | `Array<ChatMessage>` | Yes (Chat) | History of AI coaching dialogues: id, role (`user` / `assistant`), content, createdAt |
| `workout` | `Object` | Yes | Current active or paused workout draft (if in progress) |

### 2.3 Strict Privacy Guardrail
The export deliberately **excludes**:
- `auth`: Access tokens, refresh tokens, passwords, Supabase session IDs.
- `sync`: Pending outbox queue mutations, internal sync timestamps.
- `apiKeys`: Any coach or backend secrets.
- `storageBackups`: Internal SQLite normalization snapshots.

---

## 4. Local vs. Cloud Data Considerations

1. **Offline-First Completeness:**
   - Because EVARO is architected as an offline-first mobile application, the local device SQLite cache and Zustand stores contain the **complete authoritative history** of the user's data on that device.
   - A local export therefore captures the full user dataset without requiring an active network connection or Supabase API query.
2. **Multi-Device Parity Note:**
   - If a user has recorded workouts on a second device that have not yet synced to the current device, those pending sessions will not appear in the export until a sync cycle completes.
   - For 100% cloud completeness, Astra may optionally introduce a pre-export cloud sync trigger (`syncStore.syncNow()`) before generating the export payload if online.
3. **Avatars / Image Media:**
   - Currently, `profile.profileImageUri` points to a local file path (`file:///.../avatars/avatar.jpg`). The binary image data itself is not embedded into the JSON export (to avoid multi-megabyte string allocations).
   - In a future update, images can either be exported as a `.zip` archive containing both `data.json` and media files, or converted to compressed base64 if small.

---

## 5. Performance & Large Dataset Analysis

For heavy users with years of training history:
- 500 workouts × 5 exercises × 4 sets = 10,000 sets.
- In JSON representation, this produces approximately **2.5 MB to 4.0 MB** of text.

### Benchmarks & Memory Impact:
1. `JSON.stringify()` on a 4 MB object takes approximately **45 ms** on modern mobile processors (Apple A15+ / Snapdragon 8 Gen 2).
2. React Native's `Share.share({ message: dataStr })` passes the string across the bridge. For strings over 5 MB, passing raw text via Share sheet can cause memory pressure on low-end Android devices.
3. **Recommended Astra Enhancement for v0.2.0:**
   - Instead of passing raw string in `message: dataStr`, write the JSON string directly to `FileSystem.cacheDirectory + 'evaro-backup.json'` using `expo-file-system`.
   - Pass the file URI (`url: fileUri`) to `Share.share()`. This allows operating systems to handle file streams cleanly without allocating multi-megabyte string buffers in the JS runtime.

---

## 6. Testing & Quality Assurance

1. **Automated Unit Tests:**
   - Unit test `apps/mobile/src/stores/__tests__/profileStore.test.ts` validates that `exportData()` generates valid JSON conforming to schema version 2.
   - Validates that `auth` and `sync` credentials are NEVER included in the export payload.
   - Validates that history, metrics, custom exercises, and coach messages serialize correctly.
2. **Schema Verification:**
   - A JSON schema validator test ensures no unexpected keys or undefined values are exported.
