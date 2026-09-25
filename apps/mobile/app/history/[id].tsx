import { Theme, useThemeStyles, useTheme } from '@fitness-tracker/ui';
import { getStorageScope, isScopeCurrent } from '../../src/data/storageScope';
import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable, Share, Modal } from 'react-native';
import { useLocalSearchParams, useRouter, Stack } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useHistoryStore } from '../../src/stores/historyStore';
import { useExerciseStore } from '../../src/stores/exerciseStore';
import { useWorkoutStore } from '../../src/stores/workoutStore';
import { useProgramStore } from '../../src/stores/programStore';
import { useProfileStore } from '../../src/stores/profileStore';
import { usePaywallStore } from '../../src/stores/paywallStore';
import { SaveTemplateModal } from '../../src/components/workout/SaveTemplateModal';
import { recalculateDerivedStatsAfterHistoryMutation } from '../../src/utils/historyRecalculation';
import { useI18n } from '../../src/i18n';
import {
  TemplateExercise,
  SessionExercise,
  summarizeWorkout,
  summarizeSessionExercise,
} from '@fitness-tracker/domain';
import * as Crypto from 'expo-crypto';
import { useDialog } from '@fitness-tracker/ui';
import { logger } from '../../src/utils/logger';

export default function WorkoutDetailScreen() {
  const styles = useThemeStyles(createStyles);
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { sessions } = useHistoryStore();
  const { exercises } = useExerciseStore();
  const { status: activeWorkoutStatus, startWorkoutFromSession } = useWorkoutStore();
  const { createTemplate } = useProgramStore();
  const { profile } = useProfileStore();
  const { showAlert, showConfirm } = useDialog();
  const { language } = useI18n();
  const isImperial = profile.preferredUnits === 'imperial';

  const theme = useTheme();
  const [saveModalVisible, setSaveModalVisible] = useState(false);
  const [actionSheetVisible, setActionSheetVisible] = useState(false);

  const session = sessions.find((s) => s.id === id);

  if (!session) {
    return (
      <View style={styles.centered}>
        <Text>{language === 'de' ? 'Training nicht gefunden.' : 'Workout not found.'}</Text>
      </View>
    );
  }

  const handleDeleteWorkout = async () => {
    setActionSheetVisible(false);
    const confirmed = await showConfirm({
      title: language === 'de' ? 'Workout löschen?' : 'Delete Workout?',
      message:
        language === 'de'
          ? 'Dieses abgeschlossene Workout wird aus deinem Verlauf entfernt. Dadurch können sich Statistiken, PRs und Streaks ändern.'
          : 'This completed workout will be removed from your history. This may alter your statistics, PRs, and streaks.',
      confirmLabel: language === 'de' ? 'Workout löschen' : 'Delete Workout',
      cancelLabel: language === 'de' ? 'Abbrechen' : 'Cancel',
      destructive: true,
    });

    if (confirmed) {
      useHistoryStore.getState().deleteSession(session.id);
      recalculateDerivedStatsAfterHistoryMutation();
      router.back();
    }
  };

  const formatDate = (date: Date) => {
    return new Intl.DateTimeFormat(language === 'de' ? 'de-DE' : 'en-US', {
      weekday: 'long',
      month: 'long',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    }).format(new Date(date));
  };

  const formatDuration = (seconds?: number) => {
    if (!seconds) return '--:--';
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    if (h > 0) return `${h}h ${m}m`;
    return `${m}m`;
  };

  const mapToTemplateExercises = (sessionExercises: SessionExercise[]): TemplateExercise[] => {
    return sessionExercises.map((ex) => {
      const firstSet = ex.sets[0];
      return {
        id: Crypto.randomUUID(),
        exerciseId: ex.exerciseId,
        order: ex.order,
        targetSets: ex.sets.length > 0 ? ex.sets.length : 1,
        ...(firstSet?.reps !== undefined ? { targetReps: firstSet.reps } : {}),
        ...(firstSet?.weight !== undefined ? { targetWeight: firstSet.weight } : {}),
        ...(firstSet?.rpe !== undefined ? { targetRpe: firstSet.rpe } : {}),
        ...(ex.notes !== undefined ? { notes: ex.notes } : {}),
      };
    });
  };

  const handleRepeatWorkout = async () => {
    const scope = getStorageScope();
    const start = () => {
      if (!isScopeCurrent(scope)) return;
      startWorkoutFromSession(session);
      router.push('/workout/session' as unknown as Parameters<typeof router.push>[0]);
    };

    if (activeWorkoutStatus === 'active' || activeWorkoutStatus === 'paused') {
      const shouldStart = await showConfirm({
        title: language === 'de' ? 'Laufendes Training' : 'Workout In Progress',
        message:
          language === 'de'
            ? 'Ein Training läuft bereits. Möchtest du es verwerfen und stattdessen dieses Training wiederholen?'
            : 'An active workout is already in progress. Do you want to discard it and repeat this workout instead?',
        confirmLabel: language === 'de' ? 'Verwerfen & Starten' : 'Discard & Start',
        cancelLabel: language === 'de' ? 'Behalten' : 'Keep Current',
        destructive: true,
      });
      if (shouldStart) {
        start();
      }
    } else {
      start();
    }
  };

  const handleShareWorkout = async () => {
    const summary = summarizeWorkout(session);
    const durationMin = Math.round(summary.durationSeconds / 60);
    const displayVolume = isImperial
      ? Math.round(summary.totalVolume * 2.20462)
      : Math.round(summary.totalVolume);
    const volumeUnit = isImperial ? 'lbs' : 'kg';

    const isDe = language === 'de';
    let shareMessage = isDe
      ? `Training abgeschlossen: ${session.name}\n`
      : `Workout completed: ${session.name}\n`;
    shareMessage += `${isDe ? 'Dauer' : 'Duration'}: ${durationMin} min\n`;
    shareMessage += `${isDe ? 'Gesamtvolumen' : 'Total Volume'}: ${displayVolume} ${volumeUnit}\n`;
    shareMessage += `${isDe ? 'Gesamtsätze' : 'Total Sets'}: ${summary.setCount}\n`;
    if (session.notes) {
      shareMessage += `${isDe ? 'Notiz' : 'Note'}: ${session.notes}\n`;
    }
    shareMessage += `\n${isDe ? 'Getrackt mit EVARO!' : 'Tracked with EVARO!'}`;

    try {
      await Share.share({ message: shareMessage });
    } catch (e) {
      logger.warn('Sharing failed', e);
    }
  };

  const handleSaveTemplate = async (templateName: string) => {
    try {
      createTemplate({
        name: templateName,
        exercises: mapToTemplateExercises(session.exercises),
      });
      setSaveModalVisible(false);
      await showAlert({
        title: language === 'de' ? 'Erfolg' : 'Success',
        message: language === 'de' ? 'Vorlage erfolgreich gespeichert!' : 'Template saved successfully!',
        tone: 'success',
      });
    } catch (err) {
      if (err instanceof Error && err.message === 'TEMPLATE_LIMIT_REACHED') {
        setSaveModalVisible(false);
        usePaywallStore.getState().openPaywall('pro', 'template_limit');
      }
    }
  };

  const displayWeight = (w?: number) => {
    if (!w) return '-';
    if (isImperial) {
      return (w * 2.20462).toFixed(1).replace(/\.0$/, '');
    }
    return w.toString();
  };

  return (
    <View style={styles.outerContainer}>
      <Stack.Screen
        options={{
          title: session.name || (language === 'de' ? 'Trainingsdetails' : 'Workout Details'),
          headerRight: () => (
            <Pressable
              onPress={() => setActionSheetVisible(true)}
              hitSlop={12}
              style={{ width: 44, height: 44, alignItems: 'center', justifyContent: 'center' }}
              accessibilityRole="button"
              accessibilityLabel={language === 'de' ? 'Optionen' : 'Options'}
            >
              <Ionicons name="ellipsis-horizontal" size={22} color={theme.colors.text} />
            </Pressable>
          ),
        }}
      />
      <ScrollView style={styles.container} contentContainerStyle={styles.content}>
        <View style={styles.header}>
          <Text style={styles.title}>{session.name}</Text>
          <Text style={styles.date}>{formatDate(session.startedAt)}</Text>
          <Text style={styles.duration}>
            {language === 'de' ? 'Dauer' : 'Duration'}: {formatDuration(session.durationSeconds)}
          </Text>

          <View style={styles.actionRow}>
            <Pressable style={styles.actionBtn} onPress={handleRepeatWorkout}>
              <Text style={styles.actionBtnText}>{language === 'de' ? 'Wiederholen' : 'Repeat'}</Text>
            </Pressable>
            <Pressable
              style={[styles.actionBtn, styles.saveBtn]}
              onPress={() => setSaveModalVisible(true)}
            >
              <Text style={styles.saveBtnText}>Template</Text>
            </Pressable>
            <Pressable style={[styles.actionBtn, styles.shareBtn]} onPress={handleShareWorkout}>
              <Text style={styles.shareBtnText}>{language === 'de' ? 'Teilen' : 'Share'}</Text>
            </Pressable>
          </View>
        </View>

        <Text style={styles.sectionTitle}>{language === 'de' ? 'Übungen' : 'Exercises'}</Text>

        {session.exercises.map((ex, index) => {
          const exerciseDef = exercises.find((e) => e.id === ex.exerciseId);
          const volumeKg = summarizeSessionExercise(ex).totalVolume;
          const volume = isImperial ? Math.round(volumeKg * 2.20462) : volumeKg;

          return (
            <View key={ex.id} style={styles.card}>
              <Text style={styles.exName}>
                {index + 1}. {exerciseDef?.name || (language === 'de' ? 'Unbekannte Übung' : 'Unknown Exercise')}
              </Text>
              {volume > 0 && (
                <Text style={styles.volumeText}>
                  {language === 'de' ? 'Volumen' : 'Volume'}: {volume.toLocaleString()} {isImperial ? 'lbs' : 'kg'}
                </Text>
              )}

              <View style={styles.tableHeader}>
                <Text style={styles.colSet}>{language === 'de' ? 'Satz' : 'Set'}</Text>
                <Text style={styles.colWeight}>{isImperial ? 'lbs' : 'kg'}</Text>
                <Text style={styles.colReps}>{language === 'de' ? 'Wdh.' : 'Reps'}</Text>
                <Text style={styles.colRpe}>RPE</Text>
              </View>

              {ex.sets.map((set) => (
                <View
                  key={set.id}
                  style={[styles.tableRow, !set.completed && styles.incompleteRow]}
                >
                  <Text style={styles.colSet}>{set.setNumber}</Text>
                  <Text style={styles.colWeight}>{displayWeight(set.weight)}</Text>
                  <Text style={styles.colReps}>{set.reps || '-'}</Text>
                  <Text style={styles.colRpe}>{set.rpe || '-'}</Text>
                </View>
              ))}
            </View>
          );
        })}
      </ScrollView>

      <SaveTemplateModal
        visible={saveModalVisible}
        defaultName={session.name}
        onClose={() => setSaveModalVisible(false)}
        onSave={handleSaveTemplate}
        onSkip={() => setSaveModalVisible(false)}
      />

      {/* Overflow Action Sheet */}
      <Modal
        visible={actionSheetVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setActionSheetVisible(false)}
      >
        <Pressable
          style={styles.sheetOverlay}
          onPress={() => setActionSheetVisible(false)}
        >
          <View
            style={[
              styles.sheetContent,
              { backgroundColor: theme.colors.surface, borderColor: theme.colors.border },
            ]}
          >
            <Pressable
              style={styles.sheetItem}
              onPress={() => {
                setActionSheetVisible(false);
                router.push(`/programs/template-builder?historyId=${session.id}`);
              }}
              accessibilityRole="button"
              accessibilityLabel={language === 'de' ? 'Workout bearbeiten' : 'Edit workout'}
            >
              <Ionicons name="pencil-outline" size={20} color={theme.colors.text} style={{ marginRight: 12 }} />
              <Text style={[styles.sheetItemText, { color: theme.colors.text }]}>
                {language === 'de' ? 'Bearbeiten' : 'Edit'}
              </Text>
            </Pressable>

            <View style={[styles.sheetDivider, { backgroundColor: theme.colors.border }]} />

            <Pressable
              style={styles.sheetItem}
              onPress={handleDeleteWorkout}
              accessibilityRole="button"
              accessibilityLabel={language === 'de' ? 'Workout löschen' : 'Delete workout'}
            >
              <Ionicons name="trash-outline" size={20} color={theme.colors.error} style={{ marginRight: 12 }} />
              <Text style={[styles.sheetItemText, { color: theme.colors.error }]}>
                {language === 'de' ? 'Löschen' : 'Delete'}
              </Text>
            </Pressable>

            <View style={[styles.sheetDivider, { backgroundColor: theme.colors.border }]} />

            <Pressable
              style={[styles.sheetItem, { justifyContent: 'center' }]}
              onPress={() => setActionSheetVisible(false)}
              accessibilityRole="button"
              accessibilityLabel={language === 'de' ? 'Abbrechen' : 'Cancel'}
            >
              <Text style={[styles.sheetItemText, { color: theme.colors.muted, textAlign: 'center' }]}>
                {language === 'de' ? 'Abbrechen' : 'Cancel'}
              </Text>
            </Pressable>
          </View>
        </Pressable>
      </Modal>


    </View>
  );
}

const createStyles = (theme: Theme) =>
  StyleSheet.create({
    outerContainer: { flex: 1, backgroundColor: theme.colors.background },
    container: { flex: 1 },
    centered: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      backgroundColor: theme.colors.background,
    },
    content: { padding: 16, paddingBottom: 40 },
    header: {
      backgroundColor: theme.colors.surface,
      borderRadius: 16,
      padding: 16,
      marginBottom: 20,
      borderWidth: 1,
      borderColor: theme.colors.border,
    },
    title: {
      fontSize: 22,
      fontFamily: 'SpaceGrotesk_700Bold',
      color: theme.colors.text,
      marginBottom: 4,
      textTransform: 'uppercase',
    },
    date: {
      fontSize: 14,
      fontFamily: 'Manrope_500Medium',
      color: theme.colors.muted,
      marginBottom: 8,
    },
    duration: { fontSize: 16, fontFamily: 'SpaceGrotesk_600SemiBold', color: theme.colors.text },
    actionRow: {
      flexDirection: 'row',
      gap: 12,
      marginTop: 16,
    },
    actionBtn: {
      flex: 1,
      backgroundColor: theme.colors.primary,
      paddingVertical: 12,
      borderRadius: 12,
      alignItems: 'center',
      justifyContent: 'center',
    },
    actionBtnText: {
      color: theme.colors.background,
      fontFamily: 'SpaceGrotesk_700Bold',
      fontSize: 14,
    },
    saveBtn: {
      backgroundColor: theme.colors.border,
    },
    saveBtnText: {
      color: theme.colors.text,
      fontFamily: 'SpaceGrotesk_700Bold',
      fontSize: 14,
    },
    shareBtn: {
      backgroundColor: 'transparent',
      borderWidth: 1,
      borderColor: theme.colors.border,
    },
    shareBtnText: {
      color: theme.colors.text,
      fontFamily: 'SpaceGrotesk_700Bold',
      fontSize: 14,
    },
    sectionTitle: {
      fontSize: 18,
      fontFamily: 'SpaceGrotesk_700Bold',
      color: theme.colors.primary,
      marginBottom: 12,
      textTransform: 'uppercase',
    },
    card: {
      backgroundColor: theme.colors.surface,
      borderRadius: theme.radius.lg,
      padding: 16,
      marginBottom: 16,
      borderWidth: 1,
      borderColor: theme.colors.border,
    },
    exName: {
      fontSize: 16,
      fontFamily: 'SpaceGrotesk_600SemiBold',
      color: theme.colors.text,
      marginBottom: 4,
    },
    volumeText: {
      fontSize: 14,
      color: theme.colors.primary,
      fontFamily: 'SpaceGrotesk_700Bold',
      marginBottom: 12,
    },
    tableHeader: {
      flexDirection: 'row',
      borderBottomWidth: 1,
      borderBottomColor: theme.colors.border,
      paddingBottom: 8,
      marginBottom: 8,
    },
    tableRow: {
      flexDirection: 'row',
      paddingVertical: 6,
    },
    incompleteRow: { opacity: 0.4 },
    colSet: { flex: 1, fontFamily: 'SpaceGrotesk_600SemiBold', color: theme.colors.muted },
    colWeight: {
      flex: 1,
      textAlign: 'center',
      fontFamily: 'Manrope_500Medium',
      color: theme.colors.text,
    },
    colReps: {
      flex: 1,
      textAlign: 'center',
      fontFamily: 'Manrope_500Medium',
      color: theme.colors.text,
    },
    colRpe: {
      flex: 1,
      textAlign: 'center',
      fontFamily: 'Manrope_500Medium',
      color: theme.colors.text,
    },
    sheetOverlay: {
      flex: 1,
      backgroundColor: 'rgba(0,0,0,0.5)',
      justifyContent: 'flex-end',
      padding: 16,
      paddingBottom: 32,
    },
    sheetContent: {
      borderRadius: 16,
      borderWidth: 1,
      overflow: 'hidden',
    },
    sheetItem: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: 20,
      height: 52,
    },
    sheetItemText: {
      fontSize: 16,
      fontFamily: 'Manrope_600SemiBold',
    },
    sheetDivider: {
      height: 1,
    },
  });
