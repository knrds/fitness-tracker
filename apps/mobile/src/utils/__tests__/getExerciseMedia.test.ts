import {
  getExerciseMedia,
  setGlobalExerciseMediaMode,
  getGlobalExerciseMediaMode,
  ExerciseMediaInput,
} from '../getExerciseMedia';

describe('Exercise Media Decoupling & Fallback Resolver', () => {
  const sampleExercise: ExerciseMediaInput = {
    id: 'bench-press',
    name: 'Barbell Bench Press',
    gifUrl: 'https://assets.evaro.app/exercises/bench.gif',
    imageUrl: 'https://assets.evaro.app/exercises/bench.jpg',
    primaryMuscles: ['chest', 'triceps', 'front_delts'],
  };

  afterEach(() => {
    // Reset global mode to default
    setGlobalExerciseMediaMode('DEFAULT');
  });

  test('Test 1: Remote media available returns remote_gif by default', () => {
    const res = getExerciseMedia(sampleExercise);

    expect(res.type).toBe('remote_gif');
    expect(res.uri).toBe('https://assets.evaro.app/exercises/bench.gif');
    expect(res.hasMedia).toBe(true);
    expect(res.badge).toBe('GIF');
    expect(res.primaryMuscles).toEqual(['chest', 'triceps', 'front_delts']);
  });

  test('Test 2: Remote media missing (no gif, has image) returns local_image', () => {
    const exerciseNoGif: ExerciseMediaInput = {
      ...sampleExercise,
      gifUrl: null,
    };

    const res = getExerciseMedia(exerciseNoGif);

    expect(res.type).toBe('local_image');
    expect(res.uri).toBe('https://assets.evaro.app/exercises/bench.jpg');
    expect(res.hasMedia).toBe(true);
    expect(res.badge).toBeNull();
  });

  test('Test 3: Both media missing falls back to anatomy_fallback with muscle groups', () => {
    const exerciseBare: ExerciseMediaInput = {
      id: 'custom-pushup',
      name: 'Diamond Push-Up',
      gifUrl: null,
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

  test('Test 4: Invalid/empty URL strings trigger anatomy fallback safely', () => {
    const exerciseCorrupted: ExerciseMediaInput = {
      id: 'broken-urls',
      gifUrl: '   ',
      imageUrl: 'javascript:alert(1)', // Not a supported scheme
      primaryMuscles: ['quads'],
    };

    const res = getExerciseMedia(exerciseCorrupted);

    expect(res.type).toBe('anatomy_fallback');
    expect(res.uri).toBeNull();
    expect(res.hasMedia).toBe(false);
  });

  test('Test 5: Explicit NO_MEDIA mode returns no_media resolution', () => {
    const res = getExerciseMedia(sampleExercise, { modeOverride: 'NO_MEDIA' });

    expect(res.type).toBe('no_media');
    expect(res.uri).toBeNull();
    expect(res.hasMedia).toBe(false);
  });

  test('Test 6: Global mode switch to ANATOMY_FALLBACK shuts down all remote assets', () => {
    setGlobalExerciseMediaMode('ANATOMY_FALLBACK');
    expect(getGlobalExerciseMediaMode()).toBe('ANATOMY_FALLBACK');

    const res = getExerciseMedia(sampleExercise);

    expect(res.type).toBe('anatomy_fallback');
    expect(res.uri).toBeNull();
    expect(res.hasMedia).toBe(false);
    expect(res.primaryMuscles).toEqual(['chest', 'triceps', 'front_delts']);
  });

  test('Test 7: Detail view with allowGif = false returns static image', () => {
    const res = getExerciseMedia(sampleExercise, { allowGif: false });

    expect(res.type).toBe('local_image');
    expect(res.uri).toBe('https://assets.evaro.app/exercises/bench.jpg');
    expect(res.hasMedia).toBe(true);
    expect(res.badge).toBeNull();
  });

  test('Test 8: Null or undefined exercise parameter returns safe no_media fallback', () => {
    const resNull = getExerciseMedia(null);
    expect(resNull.type).toBe('no_media');
    expect(resNull.hasMedia).toBe(false);

    const resUndef = getExerciseMedia(undefined);
    expect(resUndef.type).toBe('no_media');
    expect(resUndef.hasMedia).toBe(false);
  });
});
