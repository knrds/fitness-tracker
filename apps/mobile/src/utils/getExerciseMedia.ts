export type ExerciseMediaMode =
  | 'DEFAULT'
  | 'REMOTE_GIF'
  | 'LOCAL_IMAGE'
  | 'ANATOMY_FALLBACK'
  | 'NO_MEDIA';

export type ExerciseMediaType =
  | 'remote_gif'
  | 'local_image'
  | 'anatomy_fallback'
  | 'no_media';

export interface ExerciseMediaResolution {
  type: ExerciseMediaType;
  uri: string | null;
  hasMedia: boolean;
  badge: 'GIF' | null;
  fallbackIcon: 'barbell-outline';
  primaryMuscles: string[];
}

export interface ExerciseMediaInput {
  id?: string;
  name?: string;
  gifUrl?: string | null;
  imageUrl?: string | null;
  primaryMuscles?: string[];
}

export interface ResolveMediaOptions {
  allowGif?: boolean;
  modeOverride?: ExerciseMediaMode;
}

// Global active mode: defaults to 'DEFAULT' so existing beta behavior is 100% preserved.
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
  // Check for scheme or valid relative/asset path
  return (
    trimmed.startsWith('http://') ||
    trimmed.startsWith('https://') ||
    trimmed.startsWith('file://') ||
    trimmed.startsWith('/') ||
    trimmed.startsWith('asset://')
  );
}

/**
 * Central Exercise Media Resolver.
 * Decouples the UI from commercial exercise assets (ExerciseDB licensing gate).
 *
 * Current default:
 * Returns existing remote GIF or Image if present.
 * If media is absent, corrupted, or deactivated via mode switch, returns a graceful
 * anatomy/neutral fallback rather than a broken image or blank layout.
 */
export function getExerciseMedia(
  exercise: ExerciseMediaInput | null | undefined,
  options?: ResolveMediaOptions
): ExerciseMediaResolution {
  const mode = options?.modeOverride ?? currentGlobalMode;
  const allowGif = options?.allowGif !== false;
  const primaryMuscles = exercise?.primaryMuscles ?? [];

  const makeFallback = (type: 'anatomy_fallback' | 'no_media'): ExerciseMediaResolution => ({
    type,
    uri: null,
    hasMedia: false,
    badge: null,
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

  // 2. Explicit ANATOMY_FALLBACK mode (e.g. licensing replacement tier)
  if (mode === 'ANATOMY_FALLBACK') {
    return makeFallback('anatomy_fallback');
  }

  // 3. GIF preference
  if (allowGif && mode !== 'LOCAL_IMAGE') {
    if (isValidUri(exercise.gifUrl)) {
      return {
        type: 'remote_gif',
        uri: exercise.gifUrl,
        hasMedia: true,
        badge: 'GIF',
        fallbackIcon: 'barbell-outline',
        primaryMuscles,
      };
    }
  }

  // 4. Static Image preference
  if (isValidUri(exercise.imageUrl)) {
    return {
      type: 'local_image',
      uri: exercise.imageUrl,
      hasMedia: true,
      badge: null,
      fallbackIcon: 'barbell-outline',
      primaryMuscles,
    };
  }

  // 5. Default Fallback when no valid media URI is found
  return makeFallback('anatomy_fallback');
}
