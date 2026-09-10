import { Platform } from 'react-native';
import { ChatMessage, ExperienceLevel, FitnessGoal, UnitSystem } from '@fitness-tracker/domain';

import { supabase, isSupabaseConfigured } from './supabase';

const DEFAULT_WEB_COACH_CHAT_ENDPOINT = Platform.OS === 'web' ? '/api/coach-chat' : undefined;
const COACH_CHAT_ENDPOINT =
  process.env.EXPO_PUBLIC_COACH_CHAT_ENDPOINT || DEFAULT_WEB_COACH_CHAT_ENDPOINT;
const COACH_MODEL = process.env.EXPO_PUBLIC_COACH_MODEL || 'google/gemini-2.5-flash:free';

/**
 * Check if the application can reach the configured Supabase project.
 */
export async function checkConnectivity(): Promise<boolean> {
  if (COACH_CHAT_ENDPOINT) return true;
  if (!isSupabaseConfigured) return false;

  const url = process.env.EXPO_PUBLIC_SUPABASE_URL;
  if (!url) return false;

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 3000);

  try {
    await fetch(url, {
      method: 'HEAD',
      signal: controller.signal as unknown as RequestInit['signal'],
    });
    return true;
  } catch {
    return false;
  } finally {
    clearTimeout(timeoutId);
  }
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

const getStringHash = (value: string) => {
  let hash = 0;
  for (let i = 0; i < value.length; i += 1) {
    hash = (hash << 5) - hash + value.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash);
};

const extractReplyText = (data: unknown): string | null => {
  if (typeof data === 'string') return data;
  if (!isRecord(data)) return null;

  const directText = data.reply ?? data.message ?? data.content ?? data.text;
  if (typeof directText === 'string') return directText;

  const choices = data.choices;
  if (Array.isArray(choices)) {
    const firstChoice = choices[0];
    if (isRecord(firstChoice)) {
      const choiceText = firstChoice.text;
      if (typeof choiceText === 'string') return choiceText;

      const message = firstChoice.message;
      if (isRecord(message) && typeof message.content === 'string') {
        return message.content;
      }
    }
  }

  return null;
};

const requestCoachEndpoint = async (
  messages: ChatMessage[],
  context: CoachContext,
): Promise<string> => {
  if (!COACH_CHAT_ENDPOINT) throw new Error('Coach chat endpoint is not configured.');

  const response = await fetch(COACH_CHAT_ENDPOINT, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: COACH_MODEL,
      messages,
      context,
    }),
  });

  if (!response.ok) {
    throw new Error(`Coach endpoint failed with HTTP ${response.status}.`);
  }

  const text = await response.text();
  let data: unknown = text;
  try {
    data = JSON.parse(text);
  } catch {
    data = text;
  }

  const reply = extractReplyText(data);
  if (!reply) throw new Error('Invalid response structure from Coach endpoint.');
  return reply;
};

async function* yieldWordStream(
  responseText: string,
  delayMs: number,
): AsyncGenerator<string, void, unknown> {
  const words = responseText.split(' ');
  let currentText = '';

  for (let i = 0; i < words.length; i += 1) {
    currentText += (i === 0 ? '' : ' ') + words[i];
    yield currentText;
    await new Promise((resolve) => setTimeout(resolve, delayMs));
  }
}

/**
 * Generates a local fallback response when Supabase Edge Functions are not available.
 */
async function* getMockCoachResponseStream(
  prompt: string,
  context: CoachContext,
): AsyncGenerator<string, void, unknown> {
  const name = context.profile.displayName || 'athlete';
  const goal = context.profile.fitnessGoal?.replace(/_/g, ' ') || 'general fitness';
  const streak = context.stats.currentStreak;
  const total = context.stats.totalWorkouts;
  const latestWeight = context.stats.latestWeight
    ? ` Your latest logged bodyweight is ${context.stats.latestWeight} kg.`
    : '';

  const lowerPrompt = prompt.toLowerCase();
  const promptHash = getStringHash(`${prompt}:${total}:${streak}:${goal}`);
  let responseText = '';

  if (
    lowerPrompt.includes('pr') ||
    lowerPrompt.includes('record') ||
    lowerPrompt.includes('strength')
  ) {
    responseText = `Hey ${name}. You have ${total} logged workouts, so the best next step is to compare recent working sets against your prior e1RM trend. Keep warmups out of the decision, look for one main lift that is moving well, and aim for small load or rep progress while leaving 1-2 reps in reserve.`;
  } else if (
    lowerPrompt.includes('plan') ||
    lowerPrompt.includes('template') ||
    lowerPrompt.includes('next session')
  ) {
    responseText = `For your ${goal} goal, review your current Plans tab before creating anything new. Pick the session that best matches your recovery today, keep the main movement first, and adjust volume by one set at a time instead of rewriting the whole week.`;
  } else if (
    lowerPrompt.includes('recovery') ||
    lowerPrompt.includes('sore') ||
    lowerPrompt.includes('fatigue')
  ) {
    responseText = `Recovery check for ${name}: use your last few sessions, sleep, soreness, and motivation as the signal. If performance is flat and soreness is high, reduce today's working sets by 20-30% and keep technique crisp. If you feel fresh, keep the planned volume and push one top set.`;
  } else if (
    lowerPrompt.includes('cardio') ||
    lowerPrompt.includes('running') ||
    lowerPrompt.includes('conditioning')
  ) {
    responseText = `Cardio can support your lifting when it stays recoverable. Start with 1-2 easy conditioning sessions per week, keep the pace conversational, and avoid placing hard intervals right before heavy lower-body sessions.`;
  } else if (
    streak > 0 &&
    (lowerPrompt.includes('streak') ||
      lowerPrompt.includes('consistency') ||
      lowerPrompt.includes('motivation'))
  ) {
    responseText = `Nice consistency, ${name}. Your current streak is ${streak} days. On low-energy days, protect the habit with a shorter session: warm up, hit one priority movement, and leave before the work turns sloppy.`;
  } else {
    const genericResponses = [
      `Hey ${name}. Give me the specific lift, date range, or session you want to inspect and I will help you turn the log into a next action.

Current context:
- Logged workouts: ${total}
- Current streak: ${streak} days
- Fitness goal: ${goal}${latestWeight}

Useful prompts: review recent progress, check recovery, estimate PR readiness, or adjust the next workout you already have planned.`,
      `I can work from your current training context, ${name}. The strongest signal right now is to compare recent working sets, fatigue, and the goal you set: ${goal}.

Current context:
- Logged workouts: ${total}
- Current streak: ${streak} days${latestWeight}

Ask for a concrete decision, for example: "Should I push bench today?" or "Which exercise should I reduce volume on?".`,
      `Let's make this practical, ${name}. I can reason over the training log you have locally, then suggest a small next step instead of a whole new plan.

Current context:
- Logged workouts: ${total}
- Current streak: ${streak} days
- Fitness goal: ${goal}${latestWeight}

Try asking about one movement, one session, or one recovery decision.`,
    ];
    responseText = genericResponses[promptHash % genericResponses.length]!;
  }

  yield* yieldWordStream(responseText, 35);
}

/**
 * Returns an async generator yielding text updates from the AI Coach.
 * Automatically switches between Supabase Edge Functions and local fallback streaming.
 */
export async function* streamCoachResponse(
  messages: ChatMessage[],
  context: CoachContext,
): AsyncGenerator<string, void, unknown> {
  const online = await checkConnectivity();

  if (COACH_CHAT_ENDPOINT && online) {
    try {
      const reply = await requestCoachEndpoint(messages, context);
      yield* yieldWordStream(reply, 25);
      return;
    } catch (err) {
      console.warn('[Coach API] Configured endpoint failed, falling back:', err);
    }
  }

  if (!isSupabaseConfigured || !online) {
    const lastUserMessage = messages[messages.length - 1]?.content || '';
    yield* getMockCoachResponseStream(lastUserMessage, context);
    return;
  }

  try {
    const { data, error } = await supabase.functions.invoke('coach-chat', {
      body: { messages, context, model: COACH_MODEL },
    });

    if (error) throw error;

    const reply = extractReplyText(data);
    if (reply) {
      yield* yieldWordStream(reply, 25);
      return;
    }

    throw new Error('Invalid response structure from Edge Function');
  } catch (err) {
    console.warn('[Coach API] Edge function invoke failed, falling back to local stream:', err);
    const lastUserMessage = messages[messages.length - 1]?.content || '';
    yield* getMockCoachResponseStream(lastUserMessage, context);
  }
}
