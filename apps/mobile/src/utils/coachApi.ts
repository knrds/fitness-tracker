import { Platform } from 'react-native';
import { ChatMessage, ExperienceLevel, FitnessGoal, UnitSystem } from '@fitness-tracker/domain';
import { supabase, isSupabaseConfigured } from './supabase';

const endpoint =
  process.env.EXPO_PUBLIC_COACH_CHAT_ENDPOINT ||
  (isSupabaseConfigured && process.env.EXPO_PUBLIC_SUPABASE_URL
    ? process.env.EXPO_PUBLIC_SUPABASE_URL + '/functions/v1/coach-chat'
    : Platform.OS === 'web'
      ? '/api/coach-chat'
      : undefined);

// Configuration availability; the actual request determines reachability.
export async function checkConnectivity(): Promise<boolean> {
  return Boolean(endpoint);
}

export interface CoachContext {
  profile: {
    displayName: string;
    experienceLevel?: ExperienceLevel;
    preferredUnits: UnitSystem;
    fitnessGoal?: FitnessGoal;
  };
  stats: {
    totalWorkouts: number;
    currentStreak: number;
    latestWeight?: number;
  };
  recentWorkouts?: Array<{
    name: string;
    startedAt: string;
    durationMinutes?: number;
    totalVolume?: number;
    exercises: Array<{
      name: string;
      workingSets: number;
      volume?: number;
      topSet?: string;
    }>;
  }>;
}

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

export async function* streamCoachResponse(
  messages: ChatMessage[],
  context: CoachContext,
): AsyncGenerator<string, void, unknown> {
  if (!endpoint)
    throw new Error(
      'Der Coach ist noch nicht eingerichtet. Bitte die Coach-Backend-URL konfigurieren.',
    );
  if (
    !endpoint.startsWith('https://') &&
    !(Platform.OS === 'web' && endpoint.startsWith('/')) &&
    !/^http:\/\/(localhost|127\.0\.0\.1)(:|\/)/.test(endpoint)
  ) {
    throw new Error('Der Coach benötigt eine gültige HTTPS-Backend-URL.');
  }
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (isSupabaseConfigured) {
    const { data, error } = await supabase.auth.getSession();
    if (error)
      throw new Error('Deine Anmeldung konnte nicht geprüft werden. Bitte erneut anmelden.');
    if (data.session?.access_token) headers.Authorization = 'Bearer ' + data.session.access_token;
    if (
      process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY &&
      endpoint.startsWith(process.env.EXPO_PUBLIC_SUPABASE_URL + '/functions/v1/')
    ) {
      headers.apikey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;
    }
  }
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 30000);
  try {
    const response = await fetch(endpoint, {
      method: 'POST',
      headers,
      signal: controller.signal,
      body: JSON.stringify({
        messages: messages.slice(-10).map(({ role, content }) => ({ role, content })),
        context,
      }),
    });
    if (!response.ok) {
      const errors: Record<number, string> = {
        401: 'Bitte anmelden, um den KI-Coach zu verwenden.',
        403: 'Dein Konto hat keinen Zugriff auf den KI-Coach.',
        404: 'Das Coach-Backend wurde unter dieser URL nicht gefunden.',
        429: 'Das Anfrage-Limit ist erreicht. Bitte später erneut versuchen.',
        503: 'Der Coach-Dienst ist noch nicht vollständig eingerichtet oder vorübergehend nicht verfügbar.',
      };
      throw new Error(
        errors[response.status] ??
          'Der Coach-Dienst konnte nicht antworten (HTTP ' +
            response.status +
            '). Bitte erneut versuchen.',
      );
    }
    const text = await response.text();
    let data: unknown;
    try {
      data = JSON.parse(text);
    } catch {
      throw new Error('Das Coach-Backend hat keine gültige JSON-Antwort geliefert.');
    }
    if (!isRecord(data) || typeof data.reply !== 'string' || !data.reply.trim()) {
      throw new Error('Das Coach-Backend hat keine Antwort geliefert.');
    }
    yield data.reply.trim();
  } catch (error) {
    if (controller.signal.aborted)
      throw new Error('Der Coach antwortet nicht rechtzeitig. Bitte erneut versuchen.');
    if (error instanceof TypeError)
      throw new Error(
        'Der Coach ist nicht erreichbar. Bitte Internetverbindung und Backend-URL prüfen.',
      );
    throw error;
  } finally {
    clearTimeout(timeout);
  }
}
