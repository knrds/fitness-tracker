import React, { useState, useEffect } from 'react';
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
import { SiriWaveform } from './SiriWaveform';

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
  const [recordingSeconds, setRecordingSeconds] = useState(0);

  useEffect(() => {
    if (!props.recording) {
      setRecordingSeconds(0);
      return undefined;
    }
    const interval = setInterval(() => {
      setRecordingSeconds((prev) => prev + 1);
    }, 1000);
    return () => clearInterval(interval);
  }, [props.recording]);

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
            borderColor: props.recording
              ? theme.colors.primary
              : focused
              ? theme.colors.primary
              : theme.colors.border,
          },
        ]}
      >
        {props.recording ? (
          <View style={styles.recordingOverlay}>
            <View style={styles.recordingHeader}>
              <View style={styles.recordingLiveIndicator}>
                <View style={[styles.redDot, { backgroundColor: theme.colors.error }]} />
                <Text style={[styles.recordingTimer, { color: theme.colors.text }]}>
                  {String(Math.floor(recordingSeconds / 60)).padStart(2, '0')}:
                  {String(recordingSeconds % 60).padStart(2, '0')}
                </Text>
              </View>
              <Text style={[styles.recordingStatusText, { color: theme.colors.primary }]}>
                Zuhören…
              </Text>
            </View>

            <View style={styles.waveContainer}>
              <SiriWaveform active={props.recording} width={Platform.OS === 'web' ? 360 : 280} height={72} />
            </View>

            <View style={styles.recordingActions}>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Aufnahme abbrechen"
                onPress={props.onCancelRecording}
                style={[
                  styles.recordCancelBtn,
                  {
                    backgroundColor: theme.colors.surfaceElevated,
                    borderColor: theme.colors.border,
                  },
                ]}
              >
                <Ionicons name="close" size={18} color={theme.colors.muted} />
                <Text
                  style={{
                    color: theme.colors.muted,
                    fontFamily: 'SpaceGrotesk_600SemiBold',
                    fontSize: 13,
                  }}
                >
                  Abbrechen
                </Text>
              </Pressable>

              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Aufnahme beenden und transkribieren"
                onPress={props.onToggleRecording}
                style={[
                  styles.recordFinishBtn,
                  { backgroundColor: theme.colors.primary },
                ]}
              >
                <Ionicons name="checkmark" size={18} color={theme.colors.background} />
                <Text
                  style={{
                    color: theme.colors.background,
                    fontFamily: 'SpaceGrotesk_700Bold',
                    fontSize: 13,
                  }}
                >
                  Fertig
                </Text>
              </Pressable>
            </View>
          </View>
        ) : (
          <>
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
              returnKeyType="send"
              blurOnSubmit={false}
              onSubmitEditing={() => {
                if (canSend) props.onSend();
              }}
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
                accessibilityLabel="Sprachmemo aufnehmen"
                disabled={locked}
                onPress={props.onToggleRecording}
                style={[styles.control, { opacity: locked ? 0.4 : 1 }]}
              >
                <Ionicons name="mic-outline" size={21} color={theme.colors.muted} />
              </Pressable>
              <View style={{ flex: 1, minWidth: 0 }}>
                {props.transcribing ? (
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                    <ActivityIndicator
                      size="small"
                      color={theme.colors.primary}
                      accessibilityLabel="Wird transkribiert"
                    />
                    <Text
                      style={{
                        color: theme.colors.muted,
                        fontSize: 12,
                        fontFamily: 'Manrope_600SemiBold',
                      }}
                    >
                      Wird transkribiert…
                    </Text>
                  </View>
                ) : null}
              </View>
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
            </View>
          </>
        )}
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
  toolbar: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 6 },
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
  recordingOverlay: {
    padding: 10,
    gap: 10,
    alignItems: 'center',
  },
  recordingHeader: {
    flexDirection: 'row',
    width: '100%',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  recordingLiveIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  redDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  recordingTimer: {
    fontFamily: 'SpaceGrotesk_700Bold',
    fontSize: 14,
    fontVariant: ['tabular-nums'],
  },
  recordingStatusText: {
    fontFamily: 'SpaceGrotesk_600SemiBold',
    fontSize: 12,
    letterSpacing: 0.5,
  },
  waveContainer: {
    width: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 4,
  },
  recordingActions: {
    flexDirection: 'row',
    width: '100%',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 12,
    marginTop: 4,
  },
  recordCancelBtn: {
    flex: 1,
    height: 38,
    borderRadius: 10,
    borderWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  recordFinishBtn: {
    flex: 1,
    height: 38,
    borderRadius: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
});
