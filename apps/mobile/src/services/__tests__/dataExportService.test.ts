import {
  dataExportService,
  ExportDataSources,
  ExportPayload,
} from '../dataExportService';
import {
  WorkoutSession,
  MuscleGroup,
  Equipment,
  MovementPattern,
} from '@fitness-tracker/domain';

describe('Data Export Hardening & GDPR Art. 20 Verification', () => {
  const emptySources: ExportDataSources = {
    getProfile: () => null,
    getHistory: () => [],
    getBodyMetrics: () => [],
    getPrograms: () => [],
    getTemplates: () => [],
    getCustomExercises: () => [],
    getAchievements: () => ({
      xp: 0,
      level: 1,
      unlockedAchievements: {},
      repeatCounts: {},
    }),
    getHydration: () => ({
      dateKey: '2026-09-16',
      dailyGoalMl: 2500,
      todayIntakeMl: 0,
    }),
    getCaffeine: () => ({
      isEnabled: false,
      currentWorkoutMg: 0,
      lastWorkoutMg: 0,
    }),
    getCoachMessages: () => [],
  };

  test('Test 1: Empty account exports valid minimal JSON schema', () => {
    const jsonStr = dataExportService.exportToJsonString(emptySources);
    const parsed: ExportPayload = JSON.parse(jsonStr);

    expect(parsed.schemaVersion).toBe(2);
    expect(parsed.exportScope).toBe('LOCAL_EXPORT_ONLY');
    expect(parsed.profile).toBeNull();
    expect(parsed.workouts).toEqual([]);
    expect(parsed.measurements).toEqual([]);
    expect(parsed.programs).toEqual([]);
    expect(parsed.templates).toEqual([]);
    expect(parsed.customExercises).toEqual([]);
    expect(parsed.coach.messageCount).toBe(0);
    expect(typeof parsed.exportedAt).toBe('string');
  });

  test('Test 2: Large account with many sessions, metrics, and templates serializes quickly', () => {
    const largeWorkouts: WorkoutSession[] = Array.from({ length: 250 }, (_, i) => ({
      id: `session-${i}`,
      userId: 'user-1',
      name: `Oberkörper Hypertrophie #${i}`,
      startedAt: new Date(2026, 0, 1 + (i % 200)),
      completedAt: new Date(2026, 0, 1 + (i % 200), 1, 15),
      exercises: [
        {
          id: `ex-${i}-1`,
          exerciseId: 'bench-press',
          order: 0,
          sets: [
            {
              id: `set-${i}-1`,
              setNumber: 1,
              type: 'working',
              weight: 100.5,
              reps: 8,
              rpe: 8.5,
              rir: 1,
              completed: true,
            },
            {
              id: `set-${i}-2`,
              setNumber: 2,
              type: 'working',
              weight: 102.5,
              reps: 7,
              rpe: 9.0,
              rir: 0,
              completed: true,
            },
          ],
        },
      ],
      createdAt: new Date(),
      updatedAt: new Date(),
    }));

    const largeSources: ExportDataSources = {
      ...emptySources,
      getProfile: () => ({
        displayName: 'Konrad Pro Max',
        heightCm: 184.5,
        weightKg: 85.2,
      }),
      getHistory: () => largeWorkouts,
      getBodyMetrics: () =>
        Array.from({ length: 100 }, (_, i) => ({
          id: `metric-${i}`,
          userId: 'user-1',
          recordedAt: new Date(2026, 0, 1 + i),
          weightKg: 85.0 + (i % 5) * 0.2,
          bodyFatPercentage: 14.5,
          createdAt: new Date(),
        })),
    };

    const startTime = performance.now();
    const jsonStr = dataExportService.exportToJsonString(largeSources);
    const duration = performance.now() - startTime;

    expect(duration).toBeLessThan(100); // Must serialize in under 100ms
    const parsed = JSON.parse(jsonStr);
    expect(parsed.workouts).toHaveLength(250);
    expect(parsed.measurements).toHaveLength(100);
  });

  test('Test 3: Special characters (German umlauts ä, ö, ü, ß, emojis, quotes) are preserved exactly', () => {
    const specialSources: ExportDataSources = {
      ...emptySources,
      getProfile: () => ({
        displayName: 'Jürgen "Der Zerstörer" Überflieger 💪🔥',
      }),
      getHistory: () => [
        {
          id: 'session-special',
          userId: 'user-1',
          name: 'Rücken & Schulter: "Schwere Sätze" – Größter Spaß!',
          notes: 'Mehr Wiederholungen mit 82,5 kg; Äpfel & Bananen gegessen 🍎',
          startedAt: new Date('2026-09-16T12:00:00.000Z'),
          exercises: [],
          createdAt: new Date('2026-09-16T12:00:00.000Z'),
          updatedAt: new Date('2026-09-16T12:00:00.000Z'),
        },
      ],
      getCustomExercises: () => [
        {
          id: 'custom-ex-1',
          name: 'Schrägbankdrücken mit Kurzhanteln (30° Winkel)',
          primaryMuscles: [MuscleGroup.Chest, MuscleGroup.FrontDelts],
          secondaryMuscles: [MuscleGroup.Triceps],
          equipment: Equipment.Dumbbell,
          movementPattern: MovementPattern.HorizontalPush,
          isCustom: true,
          createdAt: new Date('2026-09-16T12:00:00.000Z'),
          updatedAt: new Date('2026-09-16T12:00:00.000Z'),
        },
      ],
    };

    const jsonStr = dataExportService.exportToJsonString(specialSources);
    const parsed = JSON.parse(jsonStr);

    expect(parsed.profile.displayName).toBe('Jürgen "Der Zerstörer" Überflieger 💪🔥');
    expect(parsed.workouts[0].name).toBe('Rücken & Schulter: "Schwere Sätze" – Größter Spaß!');
    expect(parsed.workouts[0].notes).toBe('Mehr Wiederholungen mit 82,5 kg; Äpfel & Bananen gegessen 🍎');
    expect(parsed.customExercises[0].name).toBe('Schrägbankdrücken mit Kurzhanteln (30° Winkel)');
  });

  test('Test 4: Numeric values serialize as canonical numbers, regardless of German display decimals', () => {
    const numericSources: ExportDataSources = {
      ...emptySources,
      getProfile: () => ({
        heightCm: 182.5,
        weightKg: 79.75,
        benchPressMaxKg: 120.0,
      }),
      getHistory: () => [
        {
          id: 'sess-num',
          userId: 'user-1',
          name: 'Leg Day',
          startedAt: new Date('2026-09-16T12:00:00.000Z'),
          exercises: [
            {
              id: 'se-1',
              exerciseId: 'squat',
              order: 0,
              sets: [
                {
                  id: 'set-1',
                  setNumber: 1,
                  type: 'working',
                  weight: 142.5,
                  reps: 5,
                  rpe: 9.5,
                  completed: true,
                },
              ],
            },
          ],
          createdAt: new Date('2026-09-16T12:00:00.000Z'),
          updatedAt: new Date('2026-09-16T12:00:00.000Z'),
        },
      ],
    };

    const jsonStr = dataExportService.exportToJsonString(numericSources);
    const parsed = JSON.parse(jsonStr);

    // Assert that serialized properties are strictly typeof 'number' and not string representations like "142,5"
    expect(typeof parsed.profile.heightCm).toBe('number');
    expect(parsed.profile.heightCm).toBe(182.5);
    expect(typeof parsed.profile.weightKg).toBe('number');
    expect(parsed.profile.weightKg).toBe(79.75);
    expect(typeof parsed.workouts[0].exercises[0].sets[0].weight).toBe('number');
    expect(parsed.workouts[0].exercises[0].sets[0].weight).toBe(142.5);
    expect(parsed.workouts[0].exercises[0].sets[0].rpe).toBe(9.5);
  });

  test('Test 5: Missing optional data handles undefined/null safely', () => {
    const minimalSources: ExportDataSources = {
      ...emptySources,
      getProfile: () => ({}),
      getHistory: () => [
        {
          id: 's-1',
          userId: 'u-1',
          name: 'Minimal Session',
          startedAt: new Date('2026-09-16T10:00:00.000Z'),
          exercises: [],
          createdAt: new Date('2026-09-16T10:00:00.000Z'),
          updatedAt: new Date('2026-09-16T10:00:00.000Z'),
        },
      ],
    };

    const jsonStr = dataExportService.exportToJsonString(minimalSources);
    const parsed = JSON.parse(jsonStr);

    expect(parsed.workouts[0].notes).toBeUndefined();
    expect(parsed.workouts[0].completedAt).toBeUndefined();
    expect(parsed.workouts[0].exercises).toEqual([]);
  });

  test('Test 6: Export twice produces valid, mutually independent output objects', () => {
    const mutableProfile = { displayName: 'Original Name' };
    const dynamicSources: ExportDataSources = {
      ...emptySources,
      getProfile: () => mutableProfile,
    };

    const run1 = dataExportService.collectExportData(dynamicSources);
    expect(run1.profile?.displayName).toBe('Original Name');

    // Mutate the original object
    mutableProfile.displayName = 'Mutated Name';

    const run2 = dataExportService.collectExportData(dynamicSources);
    expect(run2.profile?.displayName).toBe('Mutated Name');
    // Run 1 shallow copy was not mutated
    expect(run1.profile?.displayName).toBe('Original Name');
  });
});
