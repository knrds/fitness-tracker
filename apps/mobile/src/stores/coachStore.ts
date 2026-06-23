import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import * as Crypto from 'expo-crypto';
import { ChatMessage, ChatMessageSchema } from '@fitness-tracker/domain';
import { z } from 'zod';

import { createHydratedStorage } from './storage';
import { useProfileStore } from './profileStore';
import { useBodyMetricStore } from './bodyMetricStore';
import { streamCoachResponse, checkConnectivity } from '../utils/coachApi';

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
  sendMessage: (content: string) => Promise<void>;
  clearChatHistory: () => void;
  updateOnlineStatus: () => Promise<void>;
}

const defaultPersistedState: CoachPersistState = {
  messages: [],
};

export const useCoachStore = create<CoachState>()(
  persist(
    (set, get) => ({
      messages: [],
      isSending: false,
      isOnline: true,
      error: null,

      sendMessage: async (content: string) => {
        if (!content.trim()) return;

        // Check connection
        const online = await checkConnectivity();
        set({ isOnline: online, error: null });

        // 1. Construct and append user message
        const userMsg: ChatMessage = {
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
          messages: [...state.messages, userMsg, assistantMsg],
          isSending: true,
        }));

        try {
          // 3. Assemble context from other stores
          const profileState = useProfileStore.getState();
          const profile = profileState.profile;
          const stats = profileState.getStatistics();
          const latestWeight = useBodyMetricStore.getState().getLatestMetric()?.weightKg;

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
          };

          // 4. Stream response
          // slice(0, -1) to send message history excluding the placeholder we just added
          const currentHistory = get().messages.slice(0, -1);
          const responseStream = streamCoachResponse(currentHistory, context);

          for await (const chunk of responseStream) {
            set((state) => {
              const updatedMessages = state.messages.map((msg) => {
                if (msg.id === assistantMsgId) {
                  return { ...msg, content: chunk };
                }
                return msg;
              });
              return { messages: updatedMessages };
            });
          }
        } catch (err: unknown) {
          const errMsg = err instanceof Error ? err.message : 'Failed to get a coach response.';
          set({ error: errMsg });

          // Revert the placeholder back to an error prompt
          set((state) => {
            const updatedMessages = state.messages.map((msg) => {
              if (msg.id === assistantMsgId) {
                return {
                  ...msg,
                  content: 'Sorry, I had trouble generating that response. Please try again.',
                };
              }
              return msg;
            });
            return { messages: updatedMessages };
          });
        } finally {
          set({ isSending: false });
        }
      },

      clearChatHistory: () => {
        set({ messages: [], error: null });
      },

      updateOnlineStatus: async () => {
        const online = await checkConnectivity();
        set({ isOnline: online });
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
