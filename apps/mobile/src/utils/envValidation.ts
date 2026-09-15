/**
 * Lightweight environment validation for EVARO.
 * Validates presence of client-side configuration without exposing secret values.
 * EVARO is offline-first: missing cloud variables are completely valid for local usage.
 */

export interface EnvValidationResult {
  supabaseConfigured: boolean;
  coachChatConfigured: boolean;
  missingRecommended: string[];
}

let hasWarnedInDev = false;

export function validateEnvironment(
  isDev: boolean = typeof __DEV__ !== 'undefined' ? __DEV__ : false,
  env: Record<string, string | undefined> = process.env,
): EnvValidationResult {
  const supabaseUrl = env.EXPO_PUBLIC_SUPABASE_URL?.trim() || '';
  const supabaseAnonKey = env.EXPO_PUBLIC_SUPABASE_ANON_KEY?.trim() || '';
  const coachEndpoint = env.EXPO_PUBLIC_COACH_CHAT_ENDPOINT?.trim() || '';

  const isSupabasePlaceholder =
    supabaseUrl === '' ||
    supabaseUrl === 'https://placeholder.supabase.co' ||
    supabaseAnonKey === '' ||
    supabaseAnonKey === 'placeholder';

  const supabaseConfigured = !isSupabasePlaceholder;
  const coachChatConfigured = coachEndpoint.length > 0 || supabaseConfigured;

  const missingRecommended: string[] = [];
  if (!supabaseConfigured) {
    missingRecommended.push('EXPO_PUBLIC_SUPABASE_URL', 'EXPO_PUBLIC_SUPABASE_ANON_KEY');
  }

  if (isDev && !hasWarnedInDev && missingRecommended.length > 0) {
    hasWarnedInDev = true;
    console.info(
      `[EVARO Config] Running in offline-first / local mode. Cloud sync & auth disabled (missing: ${missingRecommended.join(', ')}).`,
    );
  }

  return {
    supabaseConfigured,
    coachChatConfigured,
    missingRecommended,
  };
}
