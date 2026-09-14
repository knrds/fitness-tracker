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
  onSend: (text: string, mode: 'fast' | 'plan') => void;
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
  const [mode, setMode] = useState<'fast' | 'plan'>('plan');
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
          <View style={styles.recordingPillRow}>
            <View style={styles.recordingLiveIndicator}>
              <View style={[styles.redDot, { backgroundColor: theme.colors.error }]} />
              <Text style={[styles.recordingTimer, { color: theme.colors.text }]}>
                {String(Math.floor(recordingSeconds / 60)).padStart(2, '0')}:
                {String(recordingSeconds % 60).padStart(2, '0')}
              </Text>
            </View>

            <View style={styles.compactWaveContainer}>
              <SiriWaveform
                active={props.recording}
                width={Platform.OS === 'web' ? 180 : 130}
                height={28}
              />
            </View>

            <View style={styles.recordingActionButtons}>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Aufnahme abbrechen"
                onPress={props.onCancelRecording}
                hitSlop={6}
                style={[
                  styles.circleIconBtn,
                  {
                    backgroundColor: theme.colors.surfaceElevated,
                    borderColor: theme.colors.border,
                    borderWidth: 1,
                  },
                ]}
              >
                <Ionicons name="close" size={16} color={theme.colors.muted} />
              </Pressable>

              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Aufnahme beenden und transkribieren"
                onPress={props.onToggleRecording}
                hitSlop={6}
                style={[
                  styles.circleActionBtn,
                  {
                    backgroundColor: theme.colors.primary,
                  },
                ]}
              >
                <Ionicons
                  name="checkmark"
                  size={18}
                  color={theme.colors.onPrimary || theme.colors.background}
                />
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
                accessibilityLabel="Modus umschalten"
                disabled={locked}
                onPress={(e) => {
                  e.stopPropagation();
                  toggleMode();
                }}
                hitSlop={6}
                style={[
                  styles.collapsedModeChip,
                  {
                    backgroundColor:
                      mode === 'plan'
                        ? withAlpha(theme.colors.primary, 0.12)
                        : theme.colors.surfaceElevated,
                    borderColor:
                      mode === 'plan'
                        ? withAlpha(theme.colors.primary, 0.4)
                        : theme.colors.border,
                  },
                ]}
              >
                <Ionicons
                  name={mode === 'plan' ? 'calendar' : 'flash-outline'}
                  size={12}
                  color={mode === 'plan' ? theme.colors.primary : theme.colors.secondary}
                />
                <Text
                  style={[
                    styles.collapsedModeText,
                    { color: mode === 'plan' ? theme.colors.primary : theme.colors.muted },
                  ]}
                >
                  {mode === 'plan' ? 'Plan' : 'Fast'}
                </Text>
              </Pressable>

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
            {mode === 'fast' ? (
              <Pressable
                onPress={() => setMode('plan')}
                accessibilityRole="button"
                accessibilityLabel="Zu Plan Mode wechseln"
                style={[
                  styles.fastModeBanner,
                  {
                    backgroundColor: withAlpha(theme.colors.accent, 0.08),
                    borderColor: withAlpha(theme.colors.accent, 0.3),
                  },
                ]}
              >
                <Ionicons name="information-circle-outline" size={15} color={theme.colors.accent} />
                <Text style={[styles.fastModeText, { color: theme.colors.text }]}>
                  <Text style={{ fontFamily: 'Manrope_700Bold', color: theme.colors.accent }}>
                    Fast Mode:
                  </Text>{' '}
                  Gibt nur allgemeine Tipps. Für konkrete Trainingspläne & Workouts nutze den{' '}
                  <Text style={{ color: theme.colors.primary, fontFamily: 'Manrope_700Bold', textDecorationLine: 'underline' }}>
                    Plan Mode
                  </Text>
                  .
                </Text>
              </Pressable>
            ) : null}

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
              placeholder={
                mode === 'plan'
                  ? 'Erstelle einen Trainingsplan, splitte Workouts, passe Übungen an …'
                  : 'Frag deinen Coach nach schnellen Tipps …'
              }
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
                if (canSend) props.onSend(props.value, mode);
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
                        if (canSend) props.onSend(props.value, mode);
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
                  accessibilityLabel={
                    mode === 'plan'
                      ? 'Plan Mode aktiv. Tippen für Fast Mode.'
                      : 'Fast Mode aktiv. Tippen für Plan Mode.'
                  }
                  onPress={toggleMode}
                  hitSlop={4}
                  style={[
                    styles.metaChip,
                    {
                      backgroundColor:
                        mode === 'plan'
                          ? withAlpha(theme.colors.primary, 0.14)
                          : withAlpha(theme.colors.accent, 0.08),
                      borderColor:
                        mode === 'plan'
                          ? withAlpha(theme.colors.primary, 0.5)
                          : withAlpha(theme.colors.accent, 0.35),
                    },
                  ]}
                >
                  <Ionicons
                    name={mode === 'plan' ? 'calendar' : 'flash-outline'}
                    size={12}
                    color={mode === 'plan' ? theme.colors.primary : theme.colors.accent}
                  />
                  <Text
                    style={[
                      styles.metaChipText,
                      {
                        color: mode === 'plan' ? theme.colors.primary : theme.colors.accent,
                        fontFamily: mode === 'plan' ? 'SpaceGrotesk_700Bold' : 'SpaceGrotesk_600SemiBold',
                      },
                    ]}
                  >
                    {mode === 'plan' ? 'Plan Mode' : 'Fast (Nur Tipps)'}
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
                    onPress={() => props.onSend(props.value, mode)}
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
            ? 'Prototyp: Max. 6 Anfragen pro Tag. Text, Trainingskontext, Bilder und Sprachmemos werden verarbeitet. Transkripte vor dem Senden prüfen. KI kann Fehler machen.'
            : 'Prototyp (max. 6 Anfragen/Tag) · KI kann Fehler machen · Info'}
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
  recordingPillRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    height: 52,
    paddingHorizontal: 14,
    gap: 8,
  },
  recordingLiveIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  redDot: {
    width: 7,
    height: 7,
    borderRadius: 3.5,
  },
  recordingTimer: {
    fontFamily: 'SpaceGrotesk_700Bold',
    fontSize: 13,
    fontVariant: ['tabular-nums'],
  },
  compactWaveContainer: {
    flex: 1,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  recordingActionButtons: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  collapsedModeChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 9,
    paddingVertical: 5,
    borderRadius: 14,
    borderWidth: 1,
  },
  collapsedModeText: {
    fontFamily: 'SpaceGrotesk_600SemiBold',
    fontSize: 11,
  },
  fastModeBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
    borderWidth: 1,
    marginBottom: 4,
  },
  fastModeText: {
    flex: 1,
    fontFamily: 'Manrope_500Medium',
    fontSize: 12,
    lineHeight: 16,
  },
});
