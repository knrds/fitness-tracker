import {
  getExerciseMedia,
  setGlobalExerciseMediaMode,
  getGlobalExerciseMediaMode,
  ExerciseMediaInput,
} from '../getExerciseMedia';

describe('Exercise Media Resolver (Free Exercise Database)', () => {
  const sampleExercise: ExerciseMediaInput = {
    id: 'bench-press',
    name: 'Barbell Bench Press',
    imageUrl: 'https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises/Barbell_Bench_Press/0.jpg',
    primaryMuscles: ['chest', 'triceps', 'front_delts'],
  };

  afterEach(() => {
    // Reset global mode to default
    setGlobalExerciseMediaMode('DEFAULT');
  });

  test('Test 1: Image URL available returns local_image by default', () => {
    const res = getExerciseMedia(sampleExercise);

    expect(res.type).toBe('local_image');
    expect(res.uri).toBe('https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises/Barbell_Bench_Press/0.jpg');
    expect(res.hasMedia).toBe(true);
    expect(res.fallbackIcon).toBe('barbell-outline');
    expect(res.primaryMuscles).toEqual(['chest', 'triceps', 'front_delts']);
  });

  test('Test 2: Image missing falls back to anatomy_fallback with muscle groups', () => {
    const exerciseBare: ExerciseMediaInput = {
      id: 'custom-pushup',
      name: 'Diamond Push-Up',
      imageUrl: null,
      primaryMuscles: ['chest', 'triceps'],
    };

    const res = getExerciseMedia(exerciseBare);

    expect(res.type).toBe('anatomy_fallback');
    expect(res.uri).toBeNull();
    expect(res.hasMedia).toBe(false);
    expect(res.fallbackIcon).toBe('barbell-outline');
    expect(res.primaryMuscles).toEqual(['chest', 'triceps']);
  });

  test('Test 3: Invalid/empty URL strings trigger anatomy fallback safely', () => {
    const exerciseCorrupted: ExerciseMediaInput = {
      id: 'broken-urls',
      imageUrl: 'javascript:alert(1)', // Not a supported scheme
      primaryMuscles: ['quads'],
    };

    const res = getExerciseMedia(exerciseCorrupted);

    expect(res.type).toBe('anatomy_fallback');
    expect(res.uri).toBeNull();
    expect(res.hasMedia).toBe(false);
  });

  test('Test 4: Explicit NO_MEDIA mode returns no_media resolution', () => {
    const res = getExerciseMedia(sampleExercise, { modeOverride: 'NO_MEDIA' });

    expect(res.type).toBe('no_media');
    expect(res.uri).toBeNull();
    expect(res.hasMedia).toBe(false);
  });

  test('Test 5: Global mode switch to ANATOMY_FALLBACK returns anatomy fallback', () => {
    setGlobalExerciseMediaMode('ANATOMY_FALLBACK');
    expect(getGlobalExerciseMediaMode()).toBe('ANATOMY_FALLBACK');

    const res = getExerciseMedia(sampleExercise);

    expect(res.type).toBe('anatomy_fallback');
    expect(res.uri).toBeNull();
    expect(res.hasMedia).toBe(false);
    expect(res.primaryMuscles).toEqual(['chest', 'triceps', 'front_delts']);
  });

  test('Test 6: Null or undefined exercise parameter returns safe no_media fallback', () => {
    const resNull = getExerciseMedia(null);
    expect(resNull.type).toBe('no_media');
    expect(resNull.hasMedia).toBe(false);

    const resUndef = getExerciseMedia(undefined);
    expect(resUndef.type).toBe('no_media');
    expect(resUndef.hasMedia).toBe(false);
  });
});
