import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import * as Crypto from 'expo-crypto';
import { ChatMessage, ChatMessageSchema, summarizeSessionExercise } from '@fitness-tracker/domain';
import { z } from 'zod';

import { createHydratedStorage } from './storage';
import { useProfileStore } from './profileStore';
import { useBodyMetricStore } from './bodyMetricStore';
import { useExerciseStore } from './exerciseStore';
import { useHistoryStore } from './historyStore';
import { streamCoachResponse, checkConnectivity } from '../utils/coachApi';
import { getStorageScope, isScopeCurrent } from '../data/storageScope';

// ---------------------------------------------------------------------------
// Persisted Coach State Schema
// ---------------------------------------------------------------------------
const CoachPersistSchema = z.object({
  messages: z.array(ChatMessageSchema),
});

type CoachPersistState = z.infer<typeof CoachPersistSchema>;

interface CoachState extends CoachPersistState {
  isSending: boolean;
  isOnline: boolean;
  error: string | null;
  sendMessage: (content: string, retryId?: string) => Promise<void>;
  retryLastMessage: () => Promise<void>;
  clearChatHistory: () => void;
  updateOnlineStatus: () => Promise<void>;
}

const defaultPersistedState: CoachPersistState = {
  messages: [],
};

const formatTopSet = (weight?: number, reps?: number, rir?: number, rpe?: number) => {
  if (!weight && !reps) return undefined;

  const load = weight ? `${Number(weight.toFixed(1))} kg` : 'bodyweight';
  const repText = reps ? ` x ${reps}` : '';
  const effortText =
    rir !== undefined
      ? ` @ ${rir} RIR`
      : rpe !== undefined
        ? ` @ RPE ${Number(rpe.toFixed(1))}`
        : '';
  return `${load}${repText}${effortText}`;
};

export const useCoachStore = create<CoachState>()(
  persist(
    (set, get) => ({
      messages: [],
      isSending: false,
      isOnline: true,
      error: null,

      sendMessage: async (content: string, retryId?: string) => {
        const scope = getStorageScope();
        if (!content.trim() || get().isSending || !isScopeCurrent(scope)) return;
        const lastMessage = get().messages.at(-1);
        const retryMessage =
          retryId && lastMessage?.id === retryId && lastMessage.role === 'user'
            ? lastMessage
            : undefined;
        if (retryId && !retryMessage) return;
        set({ isSending: true });

        // Check connection
        const online = await checkConnectivity().catch(() => false);
        if (!isScopeCurrent(scope)) return;
        set({ isOnline: online, error: null });

        // 1. Construct and append user message
        const userMsg: ChatMessage = retryMessage ?? {
          id: Crypto.randomUUID(),
          role: 'user',
          content: content.trim(),
          createdAt: new Date(),
        };

        // 2. Construct placeholder assistant message
        const assistantMsgId = Crypto.randomUUID();
        const assistantMsg: ChatMessage = {
          id: assistantMsgId,
          role: 'assistant',
          content: '...',
          createdAt: new Date(),
        };

        set((state) => ({
          messages: [...state.messages, ...(retryMessage ? [] : [userMsg]), assistantMsg],
          isSending: true,
        }));

        try {
          // 3. Assemble context from other stores
          const profileState = useProfileStore.getState();
          const profile = profileState.profile;
          const stats = profileState.getStatistics();
          const latestWeight = useBodyMetricStore.getState().getLatestMetric()?.weightKg;
          const exercisesById = new Map(
            useExerciseStore.getState().exercises.map((exercise) => [exercise.id, exercise.name]),
          );
          const recentWorkouts = useHistoryStore
            .getState()
            .getSessionsByDateDesc()
            .slice(0, 5)
            .map((session) => {
              const exerciseSummaries = session.exercises.slice(0, 8).map((sessionExercise) => {
                const summary = summarizeSessionExercise(sessionExercise);
                const workingSets = sessionExercise.sets.filter(
                  (set) => set.completed && set.type !== 'warmup',
                );
                const topSet = workingSets
                  .filter((set) => set.weight || set.reps)
                  .sort((a, b) => (b.weight || 0) * (b.reps || 1) - (a.weight || 0) * (a.reps || 1))
                  .at(0);
                const topSetText = topSet
                  ? formatTopSet(topSet.weight, topSet.reps, topSet.rir, topSet.rpe)
                  : undefined;

                return {
                  name: exercisesById.get(sessionExercise.exerciseId) || 'Unknown exercise',
                  workingSets: workingSets.length,
                  volume: Math.round(summary.totalVolume),
                  ...(topSetText ? { topSet: topSetText } : {}),
                };
              });

              return {
                name: session.name,
                startedAt: session.startedAt.toISOString(),
                ...(session.durationSeconds !== undefined
                  ? { durationMinutes: Math.round(session.durationSeconds / 60) }
                  : {}),
                totalVolume: exerciseSummaries.reduce(
                  (sum, exercise) => sum + (exercise.volume || 0),
                  0,
                ),
                exercises: exerciseSummaries,
              };
            });

          const context = {
            profile: {
              displayName: profile.displayName || 'Athlete',
              preferredUnits: profile.preferredUnits,
              ...(profile.experienceLevel !== undefined
                ? { experienceLevel: profile.experienceLevel }
                : {}),
              ...(profile.fitnessGoal !== undefined ? { fitnessGoal: profile.fitnessGoal } : {}),
            },
            stats: {
              totalWorkouts: stats.totalWorkouts || 0,
              currentStreak: stats.currentStreak || 0,
              ...(latestWeight !== undefined ? { latestWeight } : {}),
            },
            recentWorkouts,
          };

          // 4. Stream response
          // slice(0, -1) to send message history excluding the placeholder we just added
          const currentHistory = get().messages.slice(0, -1);
          const responseStream = streamCoachResponse(currentHistory, context);

          for await (const chunk of responseStream) {
            if (!isScopeCurrent(scope)) return;
            set((state) => {
              const updatedMessages = state.messages.map((msg) => {
                if (msg.id === assistantMsgId && msg.role === 'assistant') {
                  return { ...msg, content: chunk };
                }
                return msg;
              });
              return { messages: updatedMessages };
            });
          }
        } catch (err: unknown) {
          if (!isScopeCurrent(scope)) return;
          const errMsg = err instanceof Error ? err.message : 'Failed to get a coach response.';
          set({ error: errMsg });

          // Keep the user's question for retry; never persist an error as an AI answer.
          set((state) => ({
            messages: state.messages.filter(
              (msg) => msg.id !== assistantMsgId || msg.role !== 'assistant',
            ),
          }));
        } finally {
          if (isScopeCurrent(scope)) set({ isSending: false });
        }
      },

      retryLastMessage: async () => {
        const last = get().messages.at(-1);
        if (get().error && last?.role === 'user') await get().sendMessage(last.content, last.id);
      },
      clearChatHistory: () => {
        if (get().isSending) return;
        set({ messages: [], error: null });
      },

      updateOnlineStatus: async () => {
        const scope = getStorageScope();
        const online = await checkConnectivity();
        if (isScopeCurrent(scope)) set({ isOnline: online });
      },
    }),
    {
      name: 'volt-coach-store',
      storage: createHydratedStorage('volt-coach-store', CoachPersistSchema, defaultPersistedState),
      version: 1,
      migrate: (persistedState) => {
        const parsed = CoachPersistSchema.safeParse(persistedState);
        return parsed.success ? parsed.data : defaultPersistedState;
      },
    },
  ),
);
