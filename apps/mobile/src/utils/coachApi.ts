import { Platform } from 'react-native';
import {
  ChatMessage,
  CoachPlan,
  CoachPlanSchema,
  ExperienceLevel,
  FitnessGoal,
  UnitSystem,
  BiologicalSex,
} from '@fitness-tracker/domain';
import { supabase, isSupabaseConfigured } from './supabase';
import { defaultCoachCircuitBreaker } from './coachCircuitBreaker';
import { isBetaFullAccess } from './betaAccessConfig';

export { defaultCoachCircuitBreaker };

export function getCoachEndpoint(): string | undefined {
  return (
    process.env.EXPO_PUBLIC_COACH_CHAT_ENDPOINT ||
    (isSupabaseConfigured && process.env.EXPO_PUBLIC_SUPABASE_URL
      ? process.env.EXPO_PUBLIC_SUPABASE_URL + '/functions/v1/coach-chat'
      : Platform.OS === 'web'
        ? '/api/coach-chat'
        : undefined)
  );
}

let cachedBetaToken: { token: string; expiresAt: number } | null = null;
let cachedInstallationId: string | null = null;

export function resetBetaTokenCache(): void {
  cachedBetaToken = null;
}

function getOrCreateInstallationId(): string {
  if (cachedInstallationId) return cachedInstallationId;
  try {
    const key = 'evaro_beta_install_id';
    const storage = typeof globalThis !== 'undefined'
      ? (globalThis as unknown as { localStorage?: { getItem: (k: string) => string | null; setItem: (k: string, v: string) => void } }).localStorage
      : undefined;
    if (storage) {
      const stored = storage.getItem(key);
      if (stored) {
        cachedInstallationId = stored;
        return stored;
      }
      const fresh = 'inst_' + Math.random().toString(36).substring(2, 15) + Date.now().toString(36);
      storage.setItem(key, fresh);
      cachedInstallationId = fresh;
      return fresh;
    }
  } catch {
    // Fall back to memory
  }
  cachedInstallationId = 'inst_' + Math.random().toString(36).substring(2, 15) + Date.now().toString(36);
  return cachedInstallationId;
}

export async function fetchBetaSessionToken(): Promise<string | null> {
  if (cachedBetaToken && cachedBetaToken.expiresAt > Date.now()) {
    return cachedBetaToken.token;
  }

  const endpoint = getCoachEndpoint();
  const betaEndpoint =
    process.env.EXPO_PUBLIC_BETA_SESSION_ENDPOINT ||
    (endpoint && endpoint.includes('/api/coach-chat')
      ? endpoint.replace('/api/coach-chat', '/api/beta-session')
      : Platform.OS === 'web'
        ? '/api/beta-session'
        : undefined);

  if (!betaEndpoint) return null;

  try {
    const resp = await fetch(betaEndpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ installationId: getOrCreateInstallationId() }),
    });
    if (resp.ok) {
      const body = (await resp.json().catch(() => null)) as { token?: string; expiresIn?: number } | null;
      if (body && typeof body.token === 'string') {
        const expiresInSec = typeof body.expiresIn === 'number' ? body.expiresIn : 86400;
        cachedBetaToken = {
          token: body.token,
          expiresAt: Date.now() + Math.max(60, expiresInSec - 300) * 1000,
        };
        return body.token;
      }
    }
  } catch {
    // Fail silently; request proceeds without token
  }
  return null;
}

// Configuration availability; the actual request determines reachability.
export async function checkConnectivity(): Promise<boolean> {
  return Boolean(getCoachEndpoint());
}

export interface CoachContext {
  exerciseCatalog?: Array<{ id: string; name: string }> | undefined;
  profile: {
    displayName: string;
    experienceLevel?: ExperienceLevel | undefined;
    preferredUnits: UnitSystem;
    fitnessGoal?: FitnessGoal | undefined;
    biologicalSex?: BiologicalSex | undefined;
    heightCm?: number | undefined;
    weightKg?: number | undefined;
    benchPressMaxKg?: number | undefined;
    squatMaxKg?: number | undefined;
    deadliftMaxKg?: number | undefined;
    age?: number | undefined;
    language?: 'de' | 'en' | undefined;
  };
  stats?: {
    totalWorkouts: number;
    currentStreak: number;
    latestWeight?: number | undefined;
  } | undefined;
  recentWorkouts?: Array<{
    name: string;
    startedAt: string;
    durationMinutes?: number | undefined;
    totalVolume?: number | undefined;
    exercises: Array<{
      name: string;
      workingSets: number;
      volume?: number | undefined;
      topSet?: string | undefined;
    }>;
  }> | undefined;
  [key: string]: unknown;
}

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

export interface CoachOptions {
  image?: string | undefined;
  audio?: { data: string; format: string };
  mode?: 'fast' | 'plan' | undefined;
  createPlan?: boolean;
  onResult?: (result: { plan?: CoachPlan | undefined; sources?: ChatMessage['sources'] }) => void;
  signal?: AbortSignal;
  timeoutMs?: number;
}

export async function* streamCoachResponse(
  messages: ChatMessage[],
  context: CoachContext,
  options: CoachOptions = {},
): AsyncGenerator<string, void, unknown> {
  const endpoint = getCoachEndpoint();
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
  let hasUserAuth = false;
  if (isSupabaseConfigured) {
    const { data, error } = await supabase.auth.getSession();
    if (error)
      throw new Error('Deine Anmeldung konnte nicht geprüft werden. Bitte erneut anmelden.');
    if (data.session?.access_token) {
      headers.Authorization = 'Bearer ' + data.session.access_token;
      hasUserAuth = true;
    }
    if (
      process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY &&
      endpoint.startsWith(process.env.EXPO_PUBLIC_SUPABASE_URL + '/functions/v1/')
    ) {
      headers.apikey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;
    }
  }

  // If unauthenticated guest and Beta Full Access is active, attach scoped beta token
  if (!hasUserAuth && isBetaFullAccess()) {
    const betaToken = await fetchBetaSessionToken();
    if (betaToken) {
      headers.Authorization = 'Bearer ' + betaToken;
    }
  }
  const controller = new AbortController();
  const timeoutMs = options.timeoutMs ?? 75000;
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  if (options.signal) {
    if (options.signal.aborted) {
      controller.abort();
    } else {
      options.signal.addEventListener('abort', () => controller.abort(), { once: true });
    }
  }
  const circuitCheck = defaultCoachCircuitBreaker.canExecute();
  if (!circuitCheck.allowed) {
    throw new Error(
      circuitCheck.reason ??
        'Der KI-Coach ist vorübergehend nicht erreichbar. Bitte versuche es in wenigen Momenten erneut.',
    );
  }

  let responseReceived = false;
  try {
    const response = await fetch(endpoint, {
      method: 'POST',
      headers,
      // Expo web adds DOM globals alongside RN's fetch declarations; both accept this same runtime signal.
      signal: controller.signal as NonNullable<RequestInit['signal']>,
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
        ...(options.mode ? { mode: options.mode } : {}),
        ...(options.createPlan || options.mode === 'plan' ? { createPlan: true } : {}),
      }),
    });
    responseReceived = true;
    if (!response.ok) {
      defaultCoachCircuitBreaker.recordFailure(response.status);
      const data: unknown = await response.json().catch(() => null);
      const providerErrors: Record<string, string> = {
        DAILY_LIMIT_REACHED:
          'Tägliches Limit erreicht: Als Prototyp sind maximal 6 Anfragen pro Tag möglich. Morgen stehen dir wieder neue Anfragen zur Verfügung.',
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
      if (isRecord(data) && typeof data.error === 'string' && data.error.trim())
        throw new Error(data.error.trim());
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
    defaultCoachCircuitBreaker.recordSuccess();
    options.onResult?.({ plan, sources });
    yield data.reply.trim();
  } catch (error) {
    if (options.signal?.aborted)
      throw new Error('Anfrage durch Nutzer abgebrochen.');
    if (!responseReceived) {
      defaultCoachCircuitBreaker.recordFailure(error instanceof Error ? error : undefined);
    }
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
