import {
  EXERCISES,
  ExerciseSchema,
  mapExercises,
  RawExercise,
  Exercise,
  MuscleGroup,
  Equipment,
  MovementPattern,
} from '@fitness-tracker/domain';
import rawData from '@fitness-tracker/domain/src/data/raw/free-exercise-db.json';
import { getDefaultTemplates, getDefaultPrograms } from '../stores/programStore';
import { getExerciseMedia } from '../utils/getExerciseMedia';
import { dataExportService } from '../services/dataExportService';

const UUID_V4_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

describe('Exercise Catalog Compatibility & Migration Integrity', () => {
  describe('Catalog Size and Determinism', () => {
    it('loads minimum expected catalog size of at least 800 entries', () => {
      expect(EXERCISES.length).toBeGreaterThanOrEqual(800);
      expect(EXERCISES.length).toBe(873);
    });

    it('guarantees all catalog IDs are unique with zero duplicates', () => {
      const ids = EXERCISES.map((e) => e.id);
      const uniqueIds = new Set(ids);
      expect(uniqueIds.size).toBe(EXERCISES.length);
    });

    it('guarantees all catalog IDs conform to strict UUID v4 structure', () => {
      EXERCISES.forEach((exercise) => {
        expect(exercise.id).toMatch(UUID_V4_REGEX);
      });
    });

    it('produces 100% deterministic UUIDs across repeated mapping runs', () => {
      const firstRun = mapExercises(rawData as unknown as RawExercise[]);
      const secondRun = mapExercises(rawData as unknown as RawExercise[]);

      expect(firstRun.length).toBe(secondRun.length);
      for (let i = 0; i < firstRun.length; i++) {
        expect(firstRun[i]!.id).toBe(secondRun[i]!.id);
        expect(firstRun[i]!.name).toBe(secondRun[i]!.name);
        expect(firstRun[i]!.imageUrl).toBe(secondRun[i]!.imageUrl);
      }
    });
  });

  describe('Canonical Exercises Loading', () => {
    const CANONICAL_NAMES = [
      'Barbell Squat',
      'Barbell Bench Press - Medium Grip',
      'Pullups',
      'Romanian Deadlift',
      'Barbell Deadlift',
      'Standing Calf Raises',
      'Side Lateral Raise',
      'Barbell Curl',
      'Triceps Pushdown',
      'Incline Dumbbell Press',
      'Bent Over Barbell Row',
    ];

    it.each(CANONICAL_NAMES)('loads canonical exercise "%s" with valid data', (name) => {
      const exercise = EXERCISES.find(
        (e) => e.name.toLowerCase() === name.toLowerCase(),
      );
      expect(exercise).toBeDefined();
      expect(exercise!.id).toMatch(UUID_V4_REGEX);
      expect(exercise!.primaryMuscles.length).toBeGreaterThanOrEqual(1);
      expect(Object.values(Equipment)).toContain(exercise!.equipment);
      expect(Object.values(MovementPattern)).toContain(exercise!.movementPattern);
    });
  });

  describe('Domain Schema Validation & Clean Data Contract', () => {
    it('validates every single catalog exercise against ExerciseSchema', () => {
      EXERCISES.forEach((exercise) => {
        const result = ExerciseSchema.safeParse(exercise);
        if (!result.success) {
          throw new Error(
            `Exercise ${exercise.name} (${exercise.id}) failed validation: ${JSON.stringify(result.error.format())}`,
          );
        }
        expect(result.success).toBe(true);
      });
    });

    it('ensures ZERO static.exercisedb.dev URLs exist in any catalog entity', () => {
      EXERCISES.forEach((exercise) => {
        if (exercise.imageUrl) {
          expect(exercise.imageUrl).not.toContain('exercisedb.dev');
          expect(exercise.imageUrl).not.toContain('static.exercisedb.dev');
          expect(exercise.imageUrl).toMatch(/^https:\/\/raw\.githubusercontent\.com\/yuhonas\/free-exercise-db\//);
        }
      });
    });

    it('ensures no gifUrl property is mapped into any active Exercise object', () => {
      EXERCISES.forEach((exercise) => {
        expect((exercise as unknown as Record<string, unknown>).gifUrl).toBeUndefined();
      });
    });

    it('ensures secondary image URLs (1.jpg) are structurally valid where 0.jpg is present', () => {
      EXERCISES.forEach((exercise) => {
        if (exercise.imageUrl && exercise.imageUrl.endsWith('0.jpg')) {
          const secondaryUrl = exercise.imageUrl.replace('/0.jpg', '/1.jpg');
          expect(secondaryUrl).toContain('/1.jpg');
          expect(secondaryUrl).toMatch(/^https:\/\//);
        }
      });
    });
  });

  describe('Default Templates and Programs Exercise ID Resolution', () => {
    it('resolves all exercise IDs in default templates against canonical EXERCISES', () => {
      const templates = getDefaultTemplates();
      expect(templates.length).toBeGreaterThan(0);

      const catalogIdSet = new Set(EXERCISES.map((e) => e.id));

      templates.forEach((template) => {
        expect(template.exercises.length).toBeGreaterThan(0);
        template.exercises.forEach((te) => {
          expect(te.exerciseId).toBeDefined();
          expect(te.exerciseId.length).toBeGreaterThan(0);
          expect(te.exerciseId).toMatch(UUID_V4_REGEX);
          expect(catalogIdSet.has(te.exerciseId)).toBe(true);
        });
      });
    });

    it('resolves all default program workouts to valid templates with valid exercises', () => {
      const programs = getDefaultPrograms();
      const templates = getDefaultTemplates();
      const templateMap = new Map(templates.map((t) => [t.id, t]));

      expect(programs.length).toBeGreaterThan(0);

      programs.forEach((program) => {
        expect(program.workouts.length).toBeGreaterThan(0);
        program.workouts.forEach((workout) => {
          const template = templateMap.get(workout.templateId);
          expect(template).toBeDefined();
          expect(template!.exercises.length).toBeGreaterThan(0);
        });
      });
    });
  });

  describe('Custom Exercise Isolation', () => {
    it('keeps custom exercise IDs isolated from canonical catalog IDs', () => {
      const catalogIdSet = new Set(EXERCISES.map((e) => e.id));

      const customEx: Exercise = {
        id: '99999999-9999-4999-8999-999999999999',
        name: 'My Special Custom Movement',
        primaryMuscles: [MuscleGroup.Chest],
        secondaryMuscles: [MuscleGroup.Triceps],
        equipment: Equipment.Dumbbell,
        movementPattern: MovementPattern.HorizontalPush,
        isCustom: true,
        ownerId: '11111111-1111-4111-8111-111111111111',
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const parseResult = ExerciseSchema.safeParse(customEx);
      expect(parseResult.success).toBe(true);
      expect(catalogIdSet.has(customEx.id)).toBe(false);
      expect(customEx.isCustom).toBe(true);
    });
  });

  describe('Legacy gifUrl Backward Compatibility', () => {
    it('successfully parses legacy exercise object containing extraneous gifUrl without error', () => {
      const legacyExerciseWithGif = {
        id: '10000000-0000-4000-8000-000000000001',
        name: 'Legacy Bench Press',
        primaryMuscles: [MuscleGroup.Chest],
        secondaryMuscles: [MuscleGroup.Triceps],
        equipment: Equipment.Barbell,
        movementPattern: MovementPattern.HorizontalPush,
        isCustom: false,
        imageUrl: 'https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises/Barbell_Bench_Press/0.jpg',
        gifUrl: 'https://static.exercisedb.dev/media/legacy-bench.gif',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      // Zod strips unrecognized properties like gifUrl rather than failing
      const result = ExerciseSchema.safeParse(legacyExerciseWithGif);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.id).toBe(legacyExerciseWithGif.id);
        expect((result.data as Record<string, unknown>).gifUrl).toBeUndefined();
      }
    });

    it('resolves media safely when fed a legacy exercise object with gifUrl', () => {
      const legacyExercise = {
        id: 'legacy-ex-1',
        name: 'Legacy Squat',
        imageUrl: 'https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises/Squat/0.jpg',
        gifUrl: 'https://static.exercisedb.dev/media/squat.gif',
        primaryMuscles: ['quads'],
      };

      const media = getExerciseMedia(legacyExercise);
      expect(media.type).toBe('local_image');
      expect(media.uri).toBe(legacyExercise.imageUrl);
      expect(media.hasMedia).toBe(true);
      expect(media.fallbackIcon).toBe('barbell-outline');
    });

    it('falls back to anatomy_fallback when legacy exercise has null imageUrl despite having gifUrl', () => {
      const legacyExerciseNoImg = {
        id: 'legacy-ex-2',
        name: 'Legacy Pure Gif Exercise',
        imageUrl: null,
        gifUrl: 'https://static.exercisedb.dev/media/old.gif',
        primaryMuscles: ['biceps'],
      };

      const media = getExerciseMedia(legacyExerciseNoImg);
      expect(media.type).toBe('anatomy_fallback');
      expect(media.uri).toBeNull();
      expect(media.hasMedia).toBe(false);
      expect(media.fallbackIcon).toBe('barbell-outline');
    });

    it('handles mixed legacy and modern custom exercises in data export without throwing', () => {
      const modernExercise: Exercise = {
        id: '20000000-0000-4000-8000-000000000001',
        name: 'Modern Custom Pull',
        primaryMuscles: [MuscleGroup.Lats],
        secondaryMuscles: [],
        equipment: Equipment.Cable,
        movementPattern: MovementPattern.HorizontalPull,
        isCustom: true,
        ownerId: '11111111-1111-4111-8111-111111111111',
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const legacyCustomWithGif = {
        ...modernExercise,
        id: '20000000-0000-4000-8000-000000000002',
        name: 'Legacy Custom with Gif',
        gifUrl: 'https://static.exercisedb.dev/media/old-custom.gif',
      } as unknown as Exercise;

      const mockSources = {
        getProfile: () => null,
        getHistory: () => [],
        getBodyMetrics: () => [],
        getPrograms: () => [],
        getTemplates: () => [],
        getCustomExercises: () => [modernExercise, legacyCustomWithGif],
        getAchievements: () => ({
          xp: 100,
          level: 2,
          unlockedAchievements: {},
          repeatCounts: {},
        }),
        getHydration: () => ({
          dateKey: '2026-06-01',
          dailyGoalMl: 2500,
          todayIntakeMl: 1000,
        }),
        getCaffeine: () => ({
          isEnabled: false,
          currentWorkoutMg: 0,
          lastWorkoutMg: 0,
        }),
        getCoachMessages: () => [],
      };

      const jsonStr = dataExportService.exportToJsonString(mockSources);
      expect(jsonStr).toBeDefined();
      const parsed = JSON.parse(jsonStr);
      expect(parsed.customExercises.length).toBe(2);
      expect(parsed.customExercises[0].name).toBe('Modern Custom Pull');
      expect(parsed.customExercises[1].name).toBe('Legacy Custom with Gif');
    });
  });
});
