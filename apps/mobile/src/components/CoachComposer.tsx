import React, { useState } from 'react';
import {
  ActivityIndicator,
  Image,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@fitness-tracker/ui';

interface Props {
  value: string;
  onChangeText: (value: string) => void;
  image?: string | undefined;
  onRemoveImage: () => void;
  onPickImage: () => void;
  onSend: () => void;
  sending: boolean;
  recording: boolean;
  transcribing: boolean;
  onToggleRecording: () => void;
  onCancelRecording: () => void;
  error: string;
}

/** One input surface keeps attachment, dictation and send anchored at every width. */
export function CoachComposer(props: Props) {
  const theme = useTheme();
  const [focused, setFocused] = useState(false);
  const [showInfo, setShowInfo] = useState(false);
  const locked = props.sending || props.transcribing;
  const canSend = !locked && !props.recording && Boolean(props.value.trim() || props.image);
  return (
    <View style={styles.container}>
      {props.error ? (
        <Text accessibilityRole="alert" style={{ color: theme.colors.accent }}>
          {props.error}
        </Text>
      ) : null}
      <View
        style={[
          styles.surface,
          {
            backgroundColor: theme.colors.surface,
            borderColor: focused ? theme.colors.primary : theme.colors.border,
          },
        ]}
      >
        {props.image ? (
          <View style={styles.attachment}>
            <Image
              source={{ uri: props.image }}
              accessibilityLabel="Angehängter Trainingsplan"
              style={styles.preview}
            />
            <Text style={{ flex: 1, color: theme.colors.muted }}>Trainingsplan angehängt</Text>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Bild entfernen"
              onPress={props.onRemoveImage}
              style={styles.control}
            >
              <Ionicons name="close" size={20} color={theme.colors.muted} />
            </Pressable>
          </View>
        ) : null}
        <TextInput
          accessibilityLabel="Coach message"
          style={[styles.input, { color: theme.colors.text }]}
          placeholder="Frag deinen Coach …"
          placeholderTextColor={theme.colors.muted}
          value={props.value}
          onChangeText={props.onChangeText}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          multiline
          maxLength={4000}
          editable={!props.sending}
          returnKeyType="default"
          submitBehavior="newline"
          {...(Platform.OS === 'web'
            ? {
                onKeyDown: (event: {
                  key: string;
                  shiftKey: boolean;
                  isComposing?: boolean;
                  preventDefault: () => void;
                }) => {
                  if (event.key === 'Enter' && !event.shiftKey && !event.isComposing) {
                    event.preventDefault();
                    if (canSend) props.onSend();
                  }
                },
              }
            : {})}
        />
        <View style={styles.toolbar}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Trainingsplan als Bild anhängen"
            disabled={locked || props.recording}
            onPress={props.onPickImage}
            style={[styles.control, { opacity: locked || props.recording ? 0.4 : 1 }]}
          >
            <Ionicons name="add" size={24} color={theme.colors.muted} />
          </Pressable>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={
              props.recording ? 'Aufnahme beenden und transkribieren' : 'Sprachmemo aufnehmen'
            }
            disabled={locked}
            onPress={props.onToggleRecording}
            style={[
              styles.control,
              {
                backgroundColor: props.recording ? theme.colors.primary : 'transparent',
                opacity: locked ? 0.4 : 1,
              },
            ]}
          >
            <Ionicons
              name={props.recording ? 'stop' : 'mic-outline'}
              size={21}
              color={props.recording ? theme.colors.background : theme.colors.muted}
            />
          </Pressable>
          <View style={{ flex: 1, minWidth: 0 }}>
            {props.transcribing ? (
              <ActivityIndicator
                size="small"
                color={theme.colors.primary}
                accessibilityLabel="Wird transkribiert"
              />
            ) : props.recording ? (
              <Text style={{ color: theme.colors.muted, fontSize: 12 }}>Aufnahme läuft</Text>
            ) : null}
          </View>
          {props.recording ? (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Aufnahme verwerfen"
              onPress={props.onCancelRecording}
              style={styles.control}
            >
              <Ionicons name="close" size={20} color={theme.colors.muted} />
            </Pressable>
          ) : (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Send coach message"
              accessibilityState={{ disabled: !canSend }}
              disabled={!canSend}
              onPress={props.onSend}
              style={[
                styles.control,
                { backgroundColor: canSend ? theme.colors.primary : theme.colors.background },
              ]}
            >
              {props.sending ? (
                <ActivityIndicator size="small" color={theme.colors.muted} />
              ) : (
                <Ionicons
                  name="arrow-up"
                  size={22}
                  color={canSend ? theme.colors.background : theme.colors.muted}
                />
              )}
            </Pressable>
          )}
        </View>
      </View>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Hinweise zu KI und Anhängen"
        accessibilityState={{ expanded: showInfo }}
        onPress={() => setShowInfo(!showInfo)}
        style={styles.info}
      >
        <Text style={{ color: theme.colors.muted, fontSize: 11, textAlign: 'center' }}>
          {showInfo
            ? 'Text, Trainingskontext, Bilder und Sprachmemos werden über OpenRouter verarbeitet. Transkripte vor dem Senden prüfen. KI kann Fehler machen.'
            : 'KI kann Fehler machen · Hinweise zu Anhängen'}
        </Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { paddingHorizontal: 16, paddingTop: 8, gap: 6, paddingBottom: 4 },
  surface: { borderWidth: 1, borderRadius: 16, padding: 8, minWidth: 0 },
  input: {
    fontFamily: 'Manrope_500Medium',
    fontSize: 16,
    lineHeight: 24,
    minHeight: 48,
    maxHeight: 144,
    paddingHorizontal: 8,
    paddingTop: 8,
    paddingBottom: 8,
    textAlignVertical: 'top',
  },
  toolbar: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  control: {
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  attachment: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 8 },
  preview: { width: 48, height: 48, borderRadius: 8 },
  info: { minHeight: 44, justifyContent: 'center', paddingHorizontal: 12 },
});
