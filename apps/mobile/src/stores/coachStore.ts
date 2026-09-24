import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import * as Crypto from '../utils/uuid';
import {
  ChatMessage,
  ChatMessageSchema,
  hasValidAiConsent,
  CURRENT_AI_CONSENT_VERSION,
} from '@fitness-tracker/domain';
import { z } from 'zod';

import { createHydratedStorage } from './storage';
import { useProfileStore } from './profileStore';
import { coachContextBuilder } from '../services/coachContextBuilder';
import { streamCoachResponse, checkConnectivity, CoachOptions } from '../utils/coachApi';
import { getStorageScope, isScopeCurrent } from '../data/storageScope';
import { entitlementService } from '../services/entitlementService';
import { monetizationAnalytics } from '../services/monetizationAnalytics';

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
  pendingImage: string | undefined;
  sendMessage: (content: string, retryId?: string, options?: CoachOptions) => Promise<void>;
  retryLastMessage: () => Promise<void>;
  clearChatHistory: () => void;
  updateOnlineStatus: () => Promise<void>;
  applyGeneratedPlan: (messageId: string) => Promise<boolean>;
}

const defaultPersistedState: CoachPersistState = {
  messages: [],
};



let conversationGeneration = 0;
let activeRequest: AbortController | undefined;

export const useCoachStore = create<CoachState>()(
  persist(
    (set, get) => ({
      messages: [],
      pendingImage: undefined,
      isSending: false,
      isOnline: true,
      error: null,

      sendMessage: async (content: string, retryId?: string, options: CoachOptions = {}) => {
        const scope = getStorageScope();
        const generation = conversationGeneration;
        const requestIsCurrent = () => isScopeCurrent(scope) && generation === conversationGeneration;
        if (!content.trim() || get().isSending || !requestIsCurrent()) return;

        const aiConsent = useProfileStore.getState().profile.aiConsent;
        if (!hasValidAiConsent(aiConsent, CURRENT_AI_CONSENT_VERSION)) {
          set({
            error:
              'AI_CONSENT_REQUIRED: Für die Nutzung des KI-Coaches ist deine vorherige Zustimmung erforderlich.',
            isSending: false,
          });
          return;
        }

        if (options.mode === 'plan' && !entitlementService.canUseCoachPlan()) {
          monetizationAnalytics.track('locked_feature_clicked', {
            tier: entitlementService.getTier(),
            feature_source: 'coach_plan',
          });
          set({
            error:
              'COACH_PLAN_LOCKED: Plan Mode ist exklusiv für EVARO Coach Abonnenten verfügbar.',
            isSending: false,
          });
          return;
        }

        if (!entitlementService.canUseCoachFast()) {
          monetizationAnalytics.track('ai_limit_reached', {
            tier: entitlementService.getTier(),
            paywall_source: 'coach_preview_limit',
          });
          set({
            error:
              'COACH_PREVIEW_LIMIT_REACHED: Dein Kontingent für Coach-Anfragen ist aufgebraucht.',
            isSending: false,
          });
          return;
        }

        monetizationAnalytics.track(options.mode === 'plan' ? 'ai_plan_requested' : 'ai_fast_requested', {
          tier: entitlementService.getTier(),
        });

        const lastMessage = get().messages.at(-1);
        const retryMessage =
          retryId && lastMessage?.id === retryId && lastMessage.role === 'user'
            ? lastMessage
            : undefined;
        if (retryId && !retryMessage) return;
        const request = new AbortController();
        activeRequest = request;
        if (options.signal?.aborted) request.abort();
        const abortRequest = () => request.abort();
        options.signal?.addEventListener('abort', abortRequest, { once: true });
        set({ isSending: true, pendingImage: retryId ? get().pendingImage : options.image });

        // Check connection
        const online = await checkConnectivity().catch(() => false);
        if (!requestIsCurrent()) return;
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
          // 3. Assemble structured context via CoachContextBuilder
          const context = coachContextBuilder.buildContextForQuery(content, options);

          // 4. Stream response
          // slice(0, -1) to send message history excluding the placeholder we just added
          const currentHistory = get().messages.slice(0, -1);
          const responseStream = streamCoachResponse(currentHistory, context, {
            ...options,
            signal: request.signal,
            image: get().pendingImage,
            onResult: (result) => {
              if (!requestIsCurrent()) return;
              set((state) => ({
                messages: state.messages.map((message) =>
                  message.id === assistantMsgId ? { ...message, ...result } : message,
                ),
              }));
            },
          });

          for await (const chunk of responseStream) {
            if (!requestIsCurrent()) return;
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
          set({ pendingImage: undefined });
        } catch (err: unknown) {
          if (!requestIsCurrent()) return;
          const errMsg = err instanceof Error ? err.message : 'Failed to get a coach response.';
          set({ error: errMsg });

          // Keep the user's question for retry; never persist an error as an AI answer.
          set((state) => ({
            messages: state.messages.filter(
              (msg) => msg.id !== assistantMsgId || msg.role !== 'assistant',
            ),
          }));
        } finally {
          options.signal?.removeEventListener('abort', abortRequest);
          if (activeRequest === request) activeRequest = undefined;
          if (requestIsCurrent()) set({ isSending: false });
        }
      },

      retryLastMessage: async () => {
        const last = get().messages.at(-1);
        if (get().error && last?.role === 'user') await get().sendMessage(last.content, last.id);
      },
      clearChatHistory: () => {
        conversationGeneration++;
        activeRequest?.abort();
        activeRequest = undefined;
        set({ messages: [], error: null, isSending: false, pendingImage: undefined });
      },

      updateOnlineStatus: async () => {
        const scope = getStorageScope();
        const online = await checkConnectivity();
        if (isScopeCurrent(scope)) set({ isOnline: online });
      },

      applyGeneratedPlan: async (messageId: string) => {
        const msg = get().messages.find((m) => m.id === messageId);
        if (!msg || !msg.plan) return false;

        // Structured action confirmation check (Section 28)
        if (!entitlementService.canUseAIWrite(true)) {
          throw new Error('AI_WRITE_NOT_AUTHORIZED: Persisting AI plans requires Coach subscription and user confirmation.');
        }

        const { saveCoachPlan } = await import('../utils/saveCoachPlan');
        saveCoachPlan(messageId);
        return true;
      },
    }),
    {
      name: 'volt-coach-store',
      storage: createHydratedStorage('volt-coach-store', CoachPersistSchema, defaultPersistedState),
      version: 1,
      partialize: (state) => ({ messages: state.messages }),
      migrate: (persistedState) => {
        const parsed = CoachPersistSchema.safeParse(persistedState);
        return parsed.success ? parsed.data : defaultPersistedState;
      },
    },
  ),
);
