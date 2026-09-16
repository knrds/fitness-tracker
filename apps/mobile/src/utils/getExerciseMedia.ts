export type ExerciseMediaMode =
  | 'DEFAULT'
  | 'LOCAL_IMAGE'
  | 'ANATOMY_FALLBACK'
  | 'NO_MEDIA';

export type ExerciseMediaType =
  | 'local_image'
  | 'anatomy_fallback'
  | 'no_media';

export interface ExerciseMediaResolution {
  type: ExerciseMediaType;
  uri: string | null;
  hasMedia: boolean;
  fallbackIcon: 'barbell-outline';
  primaryMuscles: string[];
}

export interface ExerciseMediaInput {
  id?: string;
  name?: string;
  imageUrl?: string | null;
  primaryMuscles?: string[];
}

export interface ResolveMediaOptions {
  modeOverride?: ExerciseMediaMode;
}

// Global active mode: defaults to 'DEFAULT'
let currentGlobalMode: ExerciseMediaMode = 'DEFAULT';

export function setGlobalExerciseMediaMode(mode: ExerciseMediaMode): void {
  currentGlobalMode = mode;
}

export function getGlobalExerciseMediaMode(): ExerciseMediaMode {
  return currentGlobalMode;
}

function isValidUri(val: unknown): val is string {
  if (typeof val !== 'string') return false;
  const trimmed = val.trim();
  if (trimmed.length === 0) return false;
  return (
    trimmed.startsWith('http://') ||
    trimmed.startsWith('https://') ||
    trimmed.startsWith('file://') ||
    trimmed.startsWith('/') ||
    trimmed.startsWith('asset://')
  );
}

/**
 * Exercise Media Resolver for the free exercise database.
 * Resolves exercise images and provides graceful fallbacks.
 */
export function getExerciseMedia(
  exercise: ExerciseMediaInput | null | undefined,
  options?: ResolveMediaOptions
): ExerciseMediaResolution {
  const mode = options?.modeOverride ?? currentGlobalMode;
  const primaryMuscles = exercise?.primaryMuscles ?? [];

  const makeFallback = (type: 'anatomy_fallback' | 'no_media'): ExerciseMediaResolution => ({
    type,
    uri: null,
    hasMedia: false,
    fallbackIcon: 'barbell-outline',
    primaryMuscles,
  });

  if (!exercise) {
    return makeFallback('no_media');
  }

  // 1. Explicit NO_MEDIA mode (e.g. data saver or minimalist theme)
  if (mode === 'NO_MEDIA') {
    return makeFallback('no_media');
  }

  // 2. Explicit ANATOMY_FALLBACK mode
  if (mode === 'ANATOMY_FALLBACK') {
    return makeFallback('anatomy_fallback');
  }

  // 3. Static Image (free exercise database photo)
  if (isValidUri(exercise.imageUrl)) {
    return {
      type: 'local_image',
      uri: exercise.imageUrl,
      hasMedia: true,
      fallbackIcon: 'barbell-outline',
      primaryMuscles,
    };
  }

  // 4. Default Fallback when no valid image URI is found
  return makeFallback('anatomy_fallback');
}
