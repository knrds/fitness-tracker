import React, { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@fitness-tracker/ui';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ChatMessage, hasValidAiConsent, CURRENT_AI_CONSENT_VERSION } from '@fitness-tracker/domain';

import { HorizontalFadeScroll } from '../../src/components/HorizontalFadeScroll';
import { useCoachStore } from '../../src/stores/coachStore';
import { useWorkoutStore } from '../../src/stores/workoutStore';
import * as ImagePicker from 'expo-image-picker';
import { CoachComposer } from '../../src/components/CoachComposer';
import { CoachTrainingContext } from '../../src/components/CoachTrainingContext';
import { CoachPlanCard } from '../../src/components/CoachPlanCard';
import { CoachSources } from '../../src/components/CoachSources';
import { useCoachRecorder } from '../../src/hooks/useCoachRecorder';
import { getStorageScope, isScopeCurrent } from '../../src/data/storageScope';
import { useFocusEffect } from 'expo-router';
import { useProfileStore } from '../../src/stores/profileStore';
import { useI18n } from '../../src/i18n';
import { entitlementService } from '../../src/services/entitlementService';
import { usePaywallStore } from '../../src/stores/paywallStore';

const SUGGESTIONS_EN = [
  'Review recent progress',
  'Check PR readiness',
  'Adjust next session',
  'Recovery tips',
  'Cardio balance',
];

const SUGGESTIONS_DE = [
  'Fortschritt prüfen',
  'PR-Bereitschaft testen',
  'Nächste Session anpassen',
  'Erholungs-Tipps',
  'Cardio-Balance',
];

export default function CoachScreen() {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const { language, t } = useI18n();
  const { profile, setAiConsent } = useProfileStore();
  const isConsentValid = hasValidAiConsent(profile.aiConsent, CURRENT_AI_CONSENT_VERSION);

  const suggestions = React.useMemo(() => {
    const list: string[] = [];
    if (profile.benchPressMaxKg) {
      list.push(
        language === 'de'
          ? `Bankdrücken (${profile.benchPressMaxKg} kg) steigern`
          : `Improve Bench Press (${profile.benchPressMaxKg} kg)`,
      );
    } else if (profile.squatMaxKg) {
      list.push(
        language === 'de'
          ? `Kniebeuge (${profile.squatMaxKg} kg) optimieren`
          : `Optimize Squat (${profile.squatMaxKg} kg)`,
      );
    }

    if (profile.fitnessGoal === 'gain_strength') {
      list.push(language === 'de' ? 'Kraft-Trainingsplan' : 'Strength training plan');
    } else if (profile.fitnessGoal === 'build_muscle') {
      list.push(language === 'de' ? 'Hypertrophie-Trainingsplan' : 'Hypertrophy workout plan');
    }

    if (profile.weightKg) {
      list.push(
        language === 'de'
          ? `Makro-Bedarf für ${profile.weightKg.toFixed(0)} kg`
          : `Macro targets for ${profile.weightKg.toFixed(0)} kg`,
      );
    }

    const base = language === 'de' ? SUGGESTIONS_DE : SUGGESTIONS_EN;
    return [...list, ...base].slice(0, 6);
  }, [profile, language]);
  const hasWorkoutBar = useWorkoutStore((state) => state.status !== 'idle' && state.isMinimized);
  const { messages, isSending, error, sendMessage, retryLastMessage, clearChatHistory } =
    useCoachStore();
  const [inputText, setInputText] = useState('');
  const [image, setImage] = useState<string>();
  const [attachmentError, setAttachmentError] = useState('');
  const recorder = useCoachRecorder((text) =>
    setInputText((previous) => [previous, text].filter(Boolean).join(' ').slice(0, 4000)),
  );
  const pickImage = async () => {
    const scope = getStorageScope();
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        base64: true,
        quality: 0.6,
      });
      if (!isScopeCurrent(scope) || result.canceled) return;
      const asset = result.assets[0];
      if (!asset?.base64 || asset.base64.length > 5500000)
        throw Error(t('coach.imageTooLarge'));
      const mime = Platform.OS === 'web' ? asset.mimeType || 'image/jpeg' : 'image/jpeg';
      if (!['image/jpeg', 'image/png', 'image/webp'].includes(mime))
        throw Error(t('coach.unsupportedImageFormat'));
      setImage('data:' + mime + ';base64,' + asset.base64);
      setAttachmentError('');
    } catch (e) {
      if (isScopeCurrent(scope))
        setAttachmentError(e instanceof Error ? e.message : t('coach.imageOpenFailed'));
    }
  };
  const flatListRef = useRef<FlatList<ChatMessage>>(null);

  useFocusEffect(
    React.useCallback(() => {
      if (messages.length === 0) return undefined;
      const frame = requestAnimationFrame(() => {
        flatListRef.current?.scrollToEnd({ animated: false });
      });
      return () => cancelAnimationFrame(frame);
    }, [messages.length]),
  );

  useEffect(() => {
    if (messages.length === 0) return undefined;

    const scrollTimer = setTimeout(() => {
      flatListRef.current?.scrollToEnd({ animated: true });
    }, 100);

    return () => {
      clearTimeout(scrollTimer);
    };
  }, [messages.length, isSending]);

  const handleSend = async (text: string, mode: 'fast' | 'plan' = 'plan') => {
    if (isSending || recorder.busy || recorder.recording || (!text.trim() && !image)) return;

    if (mode === 'plan' && !entitlementService.canUseCoachPlan()) {
      usePaywallStore.getState().openPaywall('coach', 'coach_plan');
      return;
    }

    if (!entitlementService.canUseCoachFast()) {
      usePaywallStore.getState().openPaywall('coach', 'coach_preview_limit');
      return;
    }

    setInputText('');
    const attachment = image;
    setImage(undefined);
    await sendMessage(text.trim() || 'Analysiere diesen Trainingsplan.', undefined, {
      image: attachment,
      mode,
    });
  };

  const handleSuggestionPress = (suggestion: string) => {
    void handleSend(suggestion, 'plan');
  };

  return (
    <View style={{ flex: 1, backgroundColor: theme.colors.background }}>
      <View
        style={[
          styles.container,
          {
            backgroundColor: theme.colors.background,
            paddingTop: Math.max(insets.top, 16),
            paddingBottom: hasWorkoutBar ? 80 : 12,
            maxWidth: 800,
            width: '100%',
            alignSelf: 'center',
          },
        ]}
      >
        <View style={styles.header}>
          <View style={styles.titleContainer}>
            <Text
              style={[
                styles.headerTitle,
                { color: theme.colors.text, ...theme.typography.heading },
              ]}
            >
              Coach
            </Text>
            <Text
              style={[styles.subtitle, { color: theme.colors.muted, ...theme.typography.caption }]}
            >
              {language === 'de'
                ? 'Training, Progression & Erholung'
                : 'Training, progression & recovery'}
            </Text>
          </View>
          <Pressable
            style={[
              styles.iconButton,
              { backgroundColor: theme.colors.surface, borderColor: theme.colors.border },
            ]}
            onPress={clearChatHistory}
            accessibilityRole="button"
            accessibilityLabel={language === 'de' ? 'Chat-Verlauf leeren' : 'Clear coach chat'}
            testID="reset-chat-btn"
          >
            <Ionicons name="trash-outline" size={20} color={theme.colors.muted} />
          </Pressable>
        </View>

        {error ? (
          <View
            style={[
              styles.errorBanner,
              { backgroundColor: theme.colors.surface, borderColor: theme.colors.accent },
            ]}
          >
            <Ionicons name="warning-outline" size={16} color={theme.colors.accent} />
            <View style={{ flex: 1 }}>
              <Text style={[styles.errorText, { color: theme.colors.text }]}>{error}</Text>
              <Pressable
                accessibilityRole="button"
                disabled={isSending}
                onPress={() => {
                  void retryLastMessage();
                }}
                style={{ minHeight: 44, justifyContent: 'center', alignSelf: 'flex-start' }}
              >
                <Text style={{ color: theme.colors.primary, fontWeight: '600' }}>
                  {t('coach.retry')}
                </Text>
              </Pressable>
            </View>
          </View>
        ) : null}

        <CoachTrainingContext onAsk={(question) => void handleSend(question, 'plan')} />
        <FlatList
          ref={flatListRef}
          data={messages}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.chatList}
          keyboardShouldPersistTaps="handled"
          renderItem={({ item }) => {
            const isUser = item.role === 'user';
            return (
              <View style={[styles.messageRow, isUser ? styles.userRow : styles.assistantRow]}>
                <View
                  style={[
                    styles.bubble,
                    isUser
                      ? { backgroundColor: theme.colors.primarySubtle }
                      : {
                          backgroundColor: theme.colors.background,
                          borderColor: theme.colors.border,
                          borderWidth: 0,
                        },
                  ]}
                >
                  {item.content === '...' ? (
                    <View style={styles.loaderContainer}>
                      <ActivityIndicator size="small" color={theme.colors.primary} />
                    </View>
                  ) : (
                    <Text
                      style={[
                        styles.messageText,
                        isUser
                          ? { color: theme.colors.text, fontFamily: 'Manrope_600SemiBold' }
                          : { color: theme.colors.text, fontFamily: 'Manrope_500Medium' },
                      ]}
                    >
                      {isUser
                        ? item.content
                        : item.content.split(/(\*\*[^*\n]+\*\*)/g).map((part, index) =>
                            part.startsWith('**') && part.endsWith('**') ? (
                              <Text key={index} style={{ fontFamily: 'Manrope_600SemiBold' }}>
                                {part.slice(2, -2)}
                              </Text>
                            ) : (
                              part
                            ),
                          )}
                    </Text>
                  )}
                  <CoachPlanCard message={item} />
                  <CoachSources message={item} />
                </View>
              </View>
            );
          }}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <View
                style={[styles.welcomeIconContainer, { backgroundColor: theme.colors.surface }]}
              >
                <Ionicons name="chatbubble-ellipses" size={32} color={theme.colors.primary} />
              </View>
              <Text style={[styles.welcomeTitle, { color: theme.colors.text }]}>
                {language === 'de' ? 'Bereit, wenn du es bist' : 'Ready when you are'}
              </Text>
              {language === 'de' ? (
                <Text style={[styles.welcomeText, { color: theme.colors.muted }]}>
                  Deine Frage, die letzten Nachrichten und eine Zusammenfassung deiner Trainingsdaten
                  werden an den KI-Dienst gesendet.{'\n\n'}
                  <Text style={{ color: theme.colors.primary, fontFamily: 'Manrope_700Bold' }}>
                    Tipp:
                  </Text>{' '}
                  Nutze den standardmäßig aktiven{' '}
                  <Text style={{ color: theme.colors.text, fontFamily: 'Manrope_700Bold' }}>
                    Plan Mode
                  </Text>{' '}
                  für konkrete, speicherbare Trainingspläne & Workouts. Den{' '}
                  <Text style={{ color: theme.colors.text, fontFamily: 'Manrope_700Bold' }}>
                    Fast Mode
                  </Text>{' '}
                  kannst du jederzeit für schnelle Fragen und allgemeine Trainingstipps einstellen.
                </Text>
              ) : (
                <Text style={[styles.welcomeText, { color: theme.colors.muted }]}>
                  Your question, recent messages, and a summary of your workout data will be sent to the AI service.{'\n\n'}
                  <Text style={{ color: theme.colors.primary, fontFamily: 'Manrope_700Bold' }}>
                    Tip:
                  </Text>{' '}
                  Use the default active{' '}
                  <Text style={{ color: theme.colors.text, fontFamily: 'Manrope_700Bold' }}>
                    Plan Mode
                  </Text>{' '}
                  for concrete, saveable workout plans & workouts. You can switch to{' '}
                  <Text style={{ color: theme.colors.text, fontFamily: 'Manrope_700Bold' }}>
                    Fast Mode
                  </Text>{' '}
                  anytime for quick questions and general training advice.
                </Text>
              )}
            </View>
          }
        />

        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
        >
          {!isConsentValid ? (
            <View
              style={[
                styles.consentCard,
                { backgroundColor: theme.colors.surface, borderColor: theme.colors.border },
              ]}
            >
              <View style={styles.consentHeader}>
                <Ionicons name="shield-checkmark-outline" size={20} color={theme.colors.primary} />
                <Text
                  style={[
                    styles.consentTitle,
                    { color: theme.colors.text, ...theme.typography.subheading },
                  ]}
                >
                  {t('coach.consent.title')}
                </Text>
              </View>
              <Text
                style={[
                  styles.consentDescription,
                  { color: theme.colors.muted, ...theme.typography.bodySmall },
                ]}
              >
                {t('coach.consent.description')}
              </Text>
              <Pressable
                style={[styles.consentButton, { backgroundColor: theme.colors.primary }]}
                onPress={() => setAiConsent()}
                accessibilityRole="button"
                accessibilityLabel={t('coach.consent.accept')}
                testID="accept-ai-consent-btn"
              >
                <Text
                  style={[
                    styles.consentButtonText,
                    { color: theme.colors.background, ...theme.typography.button },
                  ]}
                >
                  {t('coach.consent.accept')}
                </Text>
              </Pressable>
            </View>
          ) : (
            <>
              {messages.length === 0 && (
                <View style={styles.suggestionsContainer}>
                  <HorizontalFadeScroll contentContainerStyle={styles.suggestionsList}>
                    {suggestions.map((suggestion) => (
                      <Pressable
                        key={suggestion}
                        style={[
                          styles.suggestionPill,
                          {
                            backgroundColor: theme.colors.surface,
                            borderColor: theme.colors.border,
                          },
                        ]}
                        onPress={() => handleSuggestionPress(suggestion)}
                      >
                        <Text
                          style={[
                            styles.suggestionText,
                            {
                              color: theme.colors.primary,
                              ...theme.typography.caption,
                            },
                          ]}
                        >
                          {suggestion}
                        </Text>
                      </Pressable>
                    ))}
                  </HorizontalFadeScroll>
                </View>
              )}

              <CoachComposer
                value={inputText}
                onChangeText={setInputText}
                image={image}
                onRemoveImage={() => setImage(undefined)}
                onPickImage={() => void pickImage()}
                onSend={(text, mode) => void handleSend(text, mode)}
                sending={isSending}
                recording={recorder.recording}
                transcribing={recorder.busy}
                onToggleRecording={recorder.toggle}
                onCancelRecording={recorder.cancel}
                error={recorder.error || attachmentError}
              />
            </>
          )}
        </KeyboardAvoidingView>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 24,
    marginBottom: 16,
  },
  titleContainer: {
    flex: 1,
  },
  headerTitle: {
    fontSize: 22,
    letterSpacing: 0,
  },
  subtitle: {
    fontSize: 12,
    marginTop: 2,
  },
  iconButton: {
    width: 44,
    height: 44,
    borderRadius: 20,
    borderWidth: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  errorBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderWidth: 1,
    borderRadius: 8,
    marginHorizontal: 24,
    marginBottom: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  errorText: {
    flex: 1,
    fontSize: 12,
    fontFamily: 'Manrope_600SemiBold',
  },
  chatList: {
    flexGrow: 1,
    paddingHorizontal: 24,
    paddingVertical: 16,
    gap: 12,
  },
  messageRow: {
    flexDirection: 'row',
    width: '100%',
  },
  userRow: {
    justifyContent: 'flex-end',
  },
  assistantRow: {
    justifyContent: 'flex-start',
  },
  bubble: {
    maxWidth: '94%',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  messageText: {
    fontSize: 15,
    lineHeight: 23,
  },
  loaderContainer: {
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
  },
  welcomeIconContainer: {
    width: 64,
    height: 64,
    borderRadius: 32,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
  },
  welcomeTitle: {
    fontSize: 20,
    fontFamily: 'SpaceGrotesk_700Bold',
    marginBottom: 10,
    textAlign: 'center',
  },
  welcomeText: {
    fontSize: 14,
    fontFamily: 'Manrope_500Medium',
    lineHeight: 22,
    textAlign: 'center',
  },
  suggestionsContainer: {
    marginBottom: 8,
  },
  suggestionsList: {
    paddingHorizontal: 24,
    gap: 8,
  },
  suggestionPill: {
    minHeight: 44,
    borderRadius: 18,
    borderWidth: 1,
    paddingHorizontal: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  suggestionText: {
    fontFamily: 'Manrope_600SemiBold',
  },
  consentCard: {
    marginHorizontal: 16,
    marginBottom: 12,
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
    gap: 10,
  },
  consentHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  consentTitle: {
    fontSize: 15,
    fontFamily: 'SpaceGrotesk_700Bold',
  },
  consentDescription: {
    fontSize: 13,
    lineHeight: 18,
    fontFamily: 'Manrope_500Medium',
  },
  consentButton: {
    minHeight: 44,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 4,
    paddingHorizontal: 16,
  },
  consentButtonText: {
    fontFamily: 'SpaceGrotesk_700Bold',
    fontSize: 14,
  },
});
