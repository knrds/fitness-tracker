import React, { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Image,
  KeyboardAvoidingView,
  NativeSyntheticEvent,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  TextInputKeyPressEventData,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@fitness-tracker/ui';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ChatMessage } from '@fitness-tracker/domain';

import { HorizontalFadeScroll } from '../../src/components/HorizontalFadeScroll';
import { useCoachStore } from '../../src/stores/coachStore';
import { useWorkoutStore } from '../../src/stores/workoutStore';
import * as ImagePicker from 'expo-image-picker';
import { CoachPlanCard } from '../../src/components/CoachPlanCard';
import { CoachSources } from '../../src/components/CoachSources';
import { useCoachRecorder } from '../../src/hooks/useCoachRecorder';
import { getStorageScope, isScopeCurrent } from '../../src/data/storageScope';
import { useFocusScroll } from '../../src/hooks/useFocusScroll';

const SUGGESTIONS = [
  'Review recent progress',
  'Check PR readiness',
  'Adjust next session',
  'Recovery tips',
  'Cardio balance',
];

export default function CoachScreen() {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
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
        throw Error('Bitte ein kleineres Bild auswählen (max. 4 MB).');
      const mime = Platform.OS === 'web' ? asset.mimeType || 'image/jpeg' : 'image/jpeg';
      if (!['image/jpeg', 'image/png', 'image/webp'].includes(mime))
        throw Error('Bitte ein JPEG-, PNG- oder WebP-Bild auswählen.');
      setImage('data:' + mime + ';base64,' + asset.base64);
      setAttachmentError('');
    } catch (e) {
      if (isScopeCurrent(scope))
        setAttachmentError(e instanceof Error ? e.message : 'Bild konnte nicht geöffnet werden.');
    }
  };
  const flatListRef = useRef<FlatList<ChatMessage>>(null);
  useFocusScroll(flatListRef);

  useEffect(() => {
    if (messages.length === 0) return undefined;

    const scrollTimer = setTimeout(() => {
      flatListRef.current?.scrollToEnd({ animated: true });
    }, 100);

    return () => {
      clearTimeout(scrollTimer);
    };
  }, [messages.length, isSending]);

  const handleSend = async (text: string) => {
    if (isSending || recorder.busy || recorder.recording || (!text.trim() && !image)) return;
    setInputText('');
    const attachment = image;
    setImage(undefined);
    await sendMessage(text.trim() || 'Analysiere diesen Trainingsplan.', undefined, {
      image: attachment,
    });
  };

  const handleSuggestionPress = (suggestion: string) => {
    void handleSend(suggestion);
  };

  const handleInputKeyPress = (event: NativeSyntheticEvent<TextInputKeyPressEventData>) => {
    const nativeEvent = event.nativeEvent as TextInputKeyPressEventData & { shiftKey?: boolean };
    if (Platform.OS !== 'web' || nativeEvent.key !== 'Enter' || nativeEvent.shiftKey) return;

    (event as unknown as { preventDefault?: () => void }).preventDefault?.();
    void handleSend(inputText);
  };

  return (
    <View style={{ flex: 1, backgroundColor: theme.colors.background }}>
      <View
        style={[
          styles.container,
          {
            backgroundColor: theme.colors.background,
            paddingTop: Math.max(insets.top, 16),
            paddingBottom: hasWorkoutBar ? 80 : 0,
            maxWidth: 1040,
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
              COACH
            </Text>
            <Text
              style={[styles.subtitle, { color: theme.colors.muted, ...theme.typography.caption }]}
            >
              Training log companion
            </Text>
          </View>
          <Pressable
            style={[
              styles.iconButton,
              { backgroundColor: theme.colors.surface, borderColor: theme.colors.border },
            ]}
            onPress={clearChatHistory}
            disabled={isSending}
            accessibilityRole="button"
            accessibilityLabel="Clear coach chat"
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
                  Erneut senden
                </Text>
              </Pressable>
            </View>
          </View>
        ) : null}

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
                      ? { backgroundColor: theme.colors.primary }
                      : {
                          backgroundColor: theme.colors.surface,
                          borderColor: theme.colors.border,
                          borderWidth: 1,
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
                          ? { color: theme.colors.background, fontFamily: 'Manrope_600SemiBold' }
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
                Ready when you are
              </Text>
              <Text style={[styles.welcomeText, { color: theme.colors.muted }]}>
                Deine Frage, die letzten Nachrichten und eine Zusammenfassung deiner Trainingsdaten
                werden an den KI-Dienst gesendet.
              </Text>
            </View>
          }
        />

        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
        >
          {messages.length === 0 && (
            <View style={styles.suggestionsContainer}>
              <HorizontalFadeScroll contentContainerStyle={styles.suggestionsList}>
                {SUGGESTIONS.map((suggestion) => (
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

          <View style={{ paddingHorizontal: 24, gap: 8 }}>
            {image ? (
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                <Image
                  source={{ uri: image }}
                  style={{ width: 64, height: 64, borderRadius: 10 }}
                />
                <Pressable
                  accessibilityRole="button"
                  onPress={() => setImage(undefined)}
                  style={{ minHeight: 44, justifyContent: 'center' }}
                >
                  <Text style={{ color: theme.colors.muted }}>Bild entfernen</Text>
                </Pressable>
              </View>
            ) : null}
            {recorder.error || attachmentError ? (
              <Text accessibilityRole="alert" style={{ color: theme.colors.accent }}>
                {recorder.error || attachmentError}
              </Text>
            ) : null}
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Trainingsplan als Bild anhängen"
                disabled={isSending || recorder.busy || recorder.recording}
                onPress={() => void pickImage()}
                style={{ width: 44, height: 44, alignItems: 'center', justifyContent: 'center' }}
              >
                <Ionicons name="image-outline" size={22} color={theme.colors.primary} />
              </Pressable>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={
                  recorder.recording
                    ? 'Aufnahme beenden und transkribieren'
                    : 'Sprachmemo aufnehmen'
                }
                disabled={isSending || recorder.busy}
                onPress={recorder.toggle}
                style={{
                  width: 44,
                  height: 44,
                  alignItems: 'center',
                  justifyContent: 'center',
                  borderRadius: 22,
                  backgroundColor: recorder.recording ? theme.colors.primary : theme.colors.surface,
                }}
              >
                <Ionicons
                  name={recorder.recording ? 'stop' : 'mic-outline'}
                  size={22}
                  color={recorder.recording ? theme.colors.background : theme.colors.primary}
                />
              </Pressable>
              <Text style={{ flex: 1, minWidth: 0, color: theme.colors.muted, fontSize: 11 }}>
                {recorder.busy
                  ? 'Wird transkribiert …'
                  : recorder.recording
                    ? 'Aufnahme läuft · max. 60 s'
                    : 'Bild und Sprachmemo werden über OpenRouter verarbeitet. Transkript vor dem Senden bearbeiten.'}
              </Text>
              {recorder.recording ? (
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel="Aufnahme verwerfen"
                  onPress={recorder.cancel}
                  style={{ width: 44, height: 44, alignItems: 'center', justifyContent: 'center' }}
                >
                  <Ionicons name="close" size={22} color={theme.colors.muted} />
                </Pressable>
              ) : null}
            </View>
          </View>
          <View
            style={[
              styles.inputRow,
              {
                borderTopColor: theme.colors.border,
                backgroundColor: theme.colors.background,
                paddingBottom: Math.max(insets.bottom + 8, 16),
              },
            ]}
          >
            <View
              style={[
                styles.inputWrapper,
                {
                  backgroundColor: theme.colors.surface,
                  borderColor: theme.colors.border,
                },
              ]}
            >
              <TextInput
                style={[styles.input, { color: theme.colors.text }]}
                placeholder="Ask your coach..."
                placeholderTextColor={theme.colors.muted}
                value={inputText}
                onChangeText={setInputText}
                multiline
                blurOnSubmit={false}
                maxLength={4000}
                editable={!isSending}
                returnKeyType="send"
                enterKeyHint="send"
                submitBehavior="submit"
                onKeyPress={handleInputKeyPress}
                {...(Platform.OS === 'web'
                  ? {
                      onKeyDown: (e: {
                        key: string;
                        shiftKey: boolean;
                        preventDefault: () => void;
                      }) => {
                        if (e.key === 'Enter' && !e.shiftKey) {
                          e.preventDefault();
                          void handleSend(inputText);
                        }
                      },
                    }
                  : {})}
                onSubmitEditing={() => {
                  void handleSend(inputText);
                }}
                accessibilityLabel="Coach message"
              />
            </View>
            <Pressable
              style={[
                styles.sendButton,
                {
                  backgroundColor:
                    isSending ||
                    recorder.busy ||
                    recorder.recording ||
                    (!inputText.trim() && !image)
                      ? theme.colors.surface
                      : theme.colors.primary,
                },
              ]}
              onPress={() => {
                void handleSend(inputText);
              }}
              disabled={
                isSending || recorder.busy || recorder.recording || (!inputText.trim() && !image)
              }
              accessibilityRole="button"
              accessibilityLabel="Send coach message"
            >
              <Ionicons
                name="send"
                size={18}
                color={
                  isSending || recorder.busy || recorder.recording || (!inputText.trim() && !image)
                    ? theme.colors.muted
                    : theme.colors.background
                }
              />
            </Pressable>
          </View>
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
    width: 40,
    height: 40,
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
    maxWidth: '85%',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  messageText: {
    fontSize: 15,
    lineHeight: 20,
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
    height: 36,
    borderRadius: 18,
    borderWidth: 1,
    paddingHorizontal: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  suggestionText: {
    fontFamily: 'Manrope_600SemiBold',
  },
  inputRow: {
    flexDirection: 'row',
    paddingHorizontal: 24,
    paddingTop: 12,
    borderTopWidth: 1,
    gap: 12,
    alignItems: 'flex-end',
  },
  inputWrapper: {
    flex: 1,
    minWidth: 0,
    borderRadius: 20,
    borderWidth: 1,
    paddingHorizontal: 16,
    paddingVertical: 10,
    maxHeight: 100,
  },
  input: {
    fontSize: 16,
    fontFamily: 'Manrope_500Medium',
    paddingTop: 0,
    paddingBottom: 0,
  },
  sendButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
  },
});
