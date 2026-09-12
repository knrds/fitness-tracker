import { Platform } from 'react-native';
import {
  ChatMessage,
  CoachPlan,
  CoachPlanSchema,
  ExperienceLevel,
  FitnessGoal,
  UnitSystem,
} from '@fitness-tracker/domain';
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
  exerciseCatalog?: Array<{ id: string; name: string }>;
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

export interface CoachOptions {
  image?: string | undefined;
  audio?: { data: string; format: string };
  createPlan?: boolean;
  onResult?: (result: { plan?: CoachPlan | undefined; sources?: ChatMessage['sources'] }) => void;
}

export async function* streamCoachResponse(
  messages: ChatMessage[],
  context: CoachContext,
  options: CoachOptions = {},
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
  const timeout = setTimeout(() => controller.abort(), 75000);
  try {
    const response = await fetch(endpoint, {
      method: 'POST',
      headers,
      signal: controller.signal,
      body: JSON.stringify({
        messages: messages.slice(-10).map(({ role, content, plan, savedTemplateIds }) => ({
          role,
          content: plan
            ? content +
              '\nPlan data: ' +
              JSON.stringify(plan) +
              '\nSaved in app: ' +
              Boolean(savedTemplateIds?.length)
            : content,
        })),
        context,
        ...(options.image ? { image: options.image } : {}),
        ...(options.audio ? { audio: options.audio } : {}),
        ...(options.createPlan ? { createPlan: true } : {}),
      }),
    });
    if (!response.ok) {
      const data: unknown = await response.json().catch(() => null);
      const providerErrors: Record<string, string> = {
        INCOMPLETE_RESPONSE:
          'Der Anbieter konnte die Antwort nicht vollständig erzeugen. Bitte erneut senden; es wurde kein unvollständiger Plan gespeichert.',
        INVALID_PLAN:
          'Der Plan war nicht vollständig oder enthielt unbekannte Übungen. Bitte erneut erstellen lassen.',
        EMPTY_TRANSCRIPT: 'Keine Sprache erkannt. Bitte noch einmal aufnehmen.',
        PROVIDER_CREDITS:
          'Das OpenRouter-Guthaben reicht nicht aus. Bitte Guthaben oder das Limit des API-Schlüssels prüfen und danach erneut senden.',
        PROVIDER_AUTH:
          'OpenRouter lehnt den API-Schlüssel ab. Bitte die Server-Konfiguration prüfen und neu starten.',
        PROVIDER_ACCESS:
          'OpenRouter erlaubt diese Anfrage nicht. Bitte Modellzugriff und Kontoeinstellungen prüfen.',
        PROVIDER_REQUEST:
          'OpenRouter akzeptiert Modell oder Anfrage-Konfiguration nicht. Bitte das konfigurierte Modell prüfen.',
        PROVIDER_MODEL: 'Das konfigurierte OpenRouter-Modell ist derzeit nicht verfügbar.',
      };
      if (isRecord(data) && typeof data.code === 'string' && providerErrors[data.code])
        throw new Error(providerErrors[data.code]);
      const errors: Record<number, string> = {
        402: 'Das OpenRouter-Guthaben reicht nicht aus. Bitte Guthaben oder API-Schlüssel-Limit prüfen.',
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
    const plan = data.plan === undefined ? undefined : CoachPlanSchema.parse(data.plan);
    const sources = Array.isArray(data.sources)
      ? data.sources.filter(
          (source): source is { title: string; url: string; date?: string } =>
            isRecord(source) &&
            typeof source.title === 'string' &&
            typeof source.url === 'string' &&
            /^https:\/\/pubmed\.ncbi\.nlm\.nih\.gov\/\d+\/$/.test(source.url) &&
            (source.date === undefined || typeof source.date === 'string'),
        )
      : undefined;
    options.onResult?.({ plan, sources });
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
