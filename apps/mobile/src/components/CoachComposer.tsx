import React, { useState, useEffect, useRef } from 'react';
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
import { useTheme, withAlpha } from '@fitness-tracker/ui';
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

export function CoachComposer(props: Props) {
  const theme = useTheme();
  const [focused, setFocused] = useState(false);
  const [showInfo, setShowInfo] = useState(false);
  const [recordingSeconds, setRecordingSeconds] = useState(0);
  const [mode, setMode] = useState<'fast' | 'plan'>('fast');
  const inputRef = useRef<TextInput>(null);

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

  const hasValue = Boolean(props.value.trim() || props.image);
  const isExpanded = focused || hasValue || props.recording;
  const locked = props.sending || props.transcribing;
  const canSend = !locked && !props.recording && hasValue;

  const handleContainerPress = () => {
    if (!isExpanded && !props.recording) {
      setFocused(true);
      inputRef.current?.focus();
    }
  };

  const toggleMode = () => {
    setMode((prev) => (prev === 'fast' ? 'plan' : 'fast'));
  };

  return (
    <View style={styles.container}>
      {props.error ? (
        <Text accessibilityRole="alert" style={[styles.errorText, { color: theme.colors.accent }]}>
          {props.error}
        </Text>
      ) : null}

      <View
        style={[
          styles.surfaceCard,
          {
            backgroundColor: theme.colors.surface,
            borderColor: props.recording
              ? theme.colors.primary
              : isExpanded
              ? withAlpha(theme.colors.primary, 0.4)
              : theme.colors.border,
            borderRadius: isExpanded ? 22 : 26,
            shadowColor: isExpanded ? theme.colors.primary : '#000000',
            shadowOpacity: isExpanded ? 0.15 : 0.08,
            shadowRadius: isExpanded ? 16 : 8,
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
              <SiriWaveform
                active={props.recording}
                width={Platform.OS === 'web' ? 340 : 270}
                height={64}
              />
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
                <Ionicons name="close" size={16} color={theme.colors.muted} />
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
                style={[styles.recordFinishBtn, { backgroundColor: theme.colors.primary }]}
              >
                <Ionicons name="checkmark" size={16} color={theme.colors.background} />
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
        ) : !isExpanded ? (
          /* Collapsed Pill State: Sleek 52px floating capsule */
          <Pressable
            onPress={handleContainerPress}
            style={styles.collapsedPill}
            accessibilityRole="button"
            accessibilityLabel="Coach input öffnen"
          >
            <View style={styles.collapsedLeft}>
              <Ionicons
                name="chatbubble-ellipses-outline"
                size={18}
                color={theme.colors.muted}
                style={{ opacity: 0.7 }}
              />
              <Text style={[styles.collapsedPlaceholder, { color: theme.colors.muted }]}>
                Frag deinen Coach …
              </Text>
            </View>

            <View style={styles.collapsedActions}>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Trainingsplan als Bild anhängen"
                disabled={locked}
                onPress={(e) => {
                  e.stopPropagation();
                  props.onPickImage();
                }}
                hitSlop={6}
                style={styles.circleIconBtn}
              >
                <Ionicons name="add" size={20} color={theme.colors.muted} />
              </Pressable>

              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Sprachmemo aufnehmen"
                disabled={locked}
                onPress={(e) => {
                  e.stopPropagation();
                  props.onToggleRecording();
                }}
                hitSlop={6}
                style={[
                  styles.circleActionBtn,
                  { backgroundColor: withAlpha(theme.colors.primary, 0.15) },
                ]}
              >
                <Ionicons name="mic" size={16} color={theme.colors.primary} />
              </Pressable>
            </View>
          </Pressable>
        ) : (
          /* Expanded Card State: High-polish card with model chip, mode toggle and send button */
          <View style={styles.expandedContent}>
            {props.image ? (
              <View
                style={[
                  styles.attachmentChip,
                  {
                    backgroundColor: theme.colors.surfaceElevated,
                    borderColor: theme.colors.border,
                  },
                ]}
              >
                <Image
                  source={{ uri: props.image }}
                  accessibilityLabel="Angehängter Trainingsplan"
                  style={styles.attachmentImg}
                />
                <View style={{ flex: 1, minWidth: 0 }}>
                  <Text
                    numberOfLines={1}
                    style={[styles.attachmentTitle, { color: theme.colors.text }]}>
                    Trainingsplan angehängt
                  </Text>
                  <Text style={{ fontSize: 11, color: theme.colors.muted }}>
                    Bereit zur Analyse
                  </Text>
                </View>
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel="Bild entfernen"
                  onPress={props.onRemoveImage}
                  hitSlop={8}
                  style={styles.attachmentRemoveBtn}
                >
                  <Ionicons name="close" size={16} color={theme.colors.muted} />
                </Pressable>
              </View>
            ) : null}

            <TextInput
              ref={inputRef}
              accessibilityLabel="Coach message"
              style={[styles.inputExpanded, { color: theme.colors.text }]}
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

            {/* Bottom Actions Row matching ai-chat-input */}
            <View style={styles.bottomToolbar}>
              <View style={styles.chipsRow}>
                {/* Model Pill Chip */}
                <View
                  style={[
                    styles.metaChip,
                    {
                      backgroundColor: theme.colors.surfaceElevated,
                      borderColor: withAlpha(theme.colors.primary, 0.25),
                    },
                  ]}
                >
                  <Ionicons name="hardware-chip-outline" size={12} color={theme.colors.primary} />
                  <Text style={[styles.metaChipText, { color: theme.colors.text }]}>
                    Volt Coach
                  </Text>
                </View>

                {/* Mode Toggle Chip */}
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel="Modus umschalten"
                  onPress={toggleMode}
                  hitSlop={4}
                  style={[
                    styles.metaChip,
                    {
                      backgroundColor: theme.colors.surfaceElevated,
                      borderColor:
                        mode === 'plan'
                          ? withAlpha(theme.colors.primary, 0.4)
                          : theme.colors.border,
                    },
                  ]}
                >
                  <Ionicons
                    name={mode === 'plan' ? 'calendar-outline' : 'flash-outline'}
                    size={12}
                    color={mode === 'plan' ? theme.colors.primary : theme.colors.secondary}
                  />
                  <Text
                    style={[
                      styles.metaChipText,
                      { color: mode === 'plan' ? theme.colors.primary : theme.colors.muted },
                    ]}
                  >
                    {mode === 'plan' ? 'Plan Mode' : 'Fast'}
                  </Text>
                </Pressable>

                {/* Attach Image Button */}
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel="Trainingsplan als Bild anhängen"
                  disabled={locked || props.recording}
                  onPress={props.onPickImage}
                  hitSlop={6}
                  style={[
                    styles.metaCircleBtn,
                    {
                      backgroundColor: theme.colors.surfaceElevated,
                      borderColor: theme.colors.border,
                      opacity: locked || props.recording ? 0.4 : 1,
                    },
                  ]}
                >
                  <Ionicons name="add" size={16} color={theme.colors.muted} />
                </Pressable>
              </View>

              {/* Action Buttons Right: Mic / Send */}
              <View style={styles.actionRightContainer}>
                {props.transcribing ? (
                  <View style={styles.transcribingBadge}>
                    <ActivityIndicator size="small" color={theme.colors.primary} />
                    <Text
                      style={{
                        color: theme.colors.muted,
                        fontSize: 11,
                        fontFamily: 'SpaceGrotesk_600SemiBold',
                      }}
                    >
                      Transkribiere…
                    </Text>
                  </View>
                ) : null}

                {!hasValue ? (
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel="Sprachmemo aufnehmen"
                    disabled={locked}
                    onPress={props.onToggleRecording}
                    hitSlop={6}
                    style={[
                      styles.circleActionBtn,
                      { backgroundColor: withAlpha(theme.colors.primary, 0.15) },
                    ]}
                  >
                    <Ionicons name="mic" size={17} color={theme.colors.primary} />
                  </Pressable>
                ) : (
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel="Send coach message"
                    accessibilityState={{ disabled: !canSend }}
                    disabled={!canSend}
                    onPress={props.onSend}
                    hitSlop={6}
                    style={[
                      styles.circleActionBtn,
                      {
                        backgroundColor: canSend
                          ? theme.colors.primary
                          : theme.colors.surfaceElevated,
                        shadowColor: theme.colors.primary,
                        shadowOpacity: canSend ? 0.4 : 0,
                        shadowRadius: 8,
                        elevation: canSend ? 4 : 0,
                      },
                    ]}
                  >
                    {props.sending ? (
                      <ActivityIndicator size="small" color={theme.colors.background} />
                    ) : (
                      <Ionicons
                        name="arrow-up"
                        size={18}
                        color={canSend ? theme.colors.background : theme.colors.muted}
                      />
                    )}
                  </Pressable>
                )}
              </View>
            </View>
          </View>
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
            ? 'Text, Trainingskontext, Bilder und Sprachmemos werden verarbeitet. Transkripte vor dem Senden prüfen. KI kann Fehler machen.'
            : 'KI kann Fehler machen · Hinweise zu Anhängen'}
        </Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 16,
    paddingTop: 8,
    gap: 4,
    paddingBottom: 4,
  },
  errorText: {
    fontSize: 12,
    paddingHorizontal: 4,
    marginBottom: 2,
    fontFamily: 'Manrope_600SemiBold',
  },
  surfaceCard: {
    borderWidth: 1,
    minWidth: 0,
    overflow: 'hidden',
  },
  collapsedPill: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    height: 52,
    paddingHorizontal: 16,
  },
  collapsedLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flex: 1,
  },
  collapsedPlaceholder: {
    fontSize: 14,
    fontFamily: 'Manrope_500Medium',
  },
  collapsedActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  circleIconBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
  },
  circleActionBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  expandedContent: {
    padding: 12,
    gap: 10,
  },
  inputExpanded: {
    fontFamily: 'Manrope_500Medium',
    fontSize: 15,
    lineHeight: 22,
    minHeight: 52,
    maxHeight: 140,
    paddingHorizontal: 4,
    paddingTop: 4,
    paddingBottom: 4,
    textAlignVertical: 'top',
  },
  bottomToolbar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 4,
  },
  chipsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    flexWrap: 'wrap',
  },
  metaChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 9,
    paddingVertical: 4.5,
    borderRadius: 14,
    borderWidth: 1,
  },
  metaChipText: {
    fontFamily: 'SpaceGrotesk_600SemiBold',
    fontSize: 11,
    letterSpacing: 0.2,
  },
  metaCircleBtn: {
    width: 26,
    height: 26,
    borderRadius: 13,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },
  actionRightContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  transcribingBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 6,
  },
  attachmentChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    padding: 6,
    borderRadius: 12,
    borderWidth: 1,
  },
  attachmentImg: {
    width: 40,
    height: 40,
    borderRadius: 8,
  },
  attachmentTitle: {
    fontSize: 13,
    fontFamily: 'SpaceGrotesk_600SemiBold',
  },
  attachmentRemoveBtn: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  info: {
    minHeight: 36,
    justifyContent: 'center',
    paddingHorizontal: 12,
  },
  recordingOverlay: {
    padding: 12,
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
    paddingVertical: 2,
  },
  recordingActions: {
    flexDirection: 'row',
    width: '100%',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 12,
    marginTop: 2,
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
