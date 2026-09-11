import { getStorageScope, isScopeCurrent } from '../../src/data/storageScope';
import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable, Share } from 'react-native';
import { useLocalSearchParams, useRouter, Stack } from 'expo-router';
import { useHistoryStore } from '../../src/stores/historyStore';
import { useExerciseStore } from '../../src/stores/exerciseStore';
import { useWorkoutStore } from '../../src/stores/workoutStore';
import { useProgramStore } from '../../src/stores/programStore';
import { useProfileStore } from '../../src/stores/profileStore';
import { SaveTemplateModal } from '../../src/components/workout/SaveTemplateModal';
import {
  TemplateExercise,
  SessionExercise,
  summarizeWorkout,
  summarizeSessionExercise,
} from '@fitness-tracker/domain';
import * as Crypto from 'expo-crypto';
import { useDialog } from '@fitness-tracker/ui';

export default function WorkoutDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { sessions } = useHistoryStore();
  const { exercises } = useExerciseStore();
  const { status: activeWorkoutStatus, startWorkoutFromSession } = useWorkoutStore();
  const { createTemplate } = useProgramStore();
  const { profile } = useProfileStore();
  const { showAlert, showConfirm } = useDialog();
  const isImperial = profile.preferredUnits === 'imperial';

  const [saveModalVisible, setSaveModalVisible] = useState(false);

  const session = sessions.find((s) => s.id === id);

  if (!session) {
    return (
      <View style={styles.centered}>
        <Text>Workout not found.</Text>
      </View>
    );
  }

  const formatDate = (date: Date) => {
    return new Intl.DateTimeFormat('en-US', {
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
        title: 'Workout In Progress',
        message:
          'An active workout is already in progress. Do you want to discard it and repeat this workout instead?',
        confirmLabel: 'Discard & Start',
        cancelLabel: 'Keep Current',
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

    let shareMessage = `Workout completed: ${session.name}\n`;
    shareMessage += `Duration: ${durationMin} min\n`;
    shareMessage += `Total Volume: ${displayVolume} ${volumeUnit}\n`;
    shareMessage += `Total Sets: ${summary.setCount}\n`;
    if (session.notes) {
      shareMessage += `Note: ${session.notes}\n`;
    }
    shareMessage += `\nTracked with Fitness Tracker App!`;

    try {
      await Share.share({ message: shareMessage });
    } catch (e) {
      console.log('Sharing failed', e);
    }
  };

  const handleSaveTemplate = async (templateName: string) => {
    createTemplate({
      name: templateName,
      exercises: mapToTemplateExercises(session.exercises),
    });
    setSaveModalVisible(false);
    await showAlert({
      title: 'Success',
      message: 'Template saved successfully!',
      tone: 'success',
    });
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
      <Stack.Screen options={{ title: session.name || 'Workout Details' }} />
      <ScrollView style={styles.container} contentContainerStyle={styles.content}>
        <View style={styles.header}>
          <Text style={styles.title}>{session.name}</Text>
          <Text style={styles.date}>{formatDate(session.startedAt)}</Text>
          <Text style={styles.duration}>Duration: {formatDuration(session.durationSeconds)}</Text>

          <View style={styles.actionRow}>
            <Pressable style={styles.actionBtn} onPress={handleRepeatWorkout}>
              <Text style={styles.actionBtnText}>Repeat</Text>
            </Pressable>
            <Pressable
              style={[styles.actionBtn, styles.saveBtn]}
              onPress={() => setSaveModalVisible(true)}
            >
              <Text style={styles.saveBtnText}>Template</Text>
            </Pressable>
            <Pressable style={[styles.actionBtn, styles.shareBtn]} onPress={handleShareWorkout}>
              <Text style={styles.shareBtnText}>Share</Text>
            </Pressable>
          </View>
        </View>

        <Text style={styles.sectionTitle}>Exercises</Text>

        {session.exercises.map((ex, index) => {
          const exerciseDef = exercises.find((e) => e.id === ex.exerciseId);
          const volumeKg = summarizeSessionExercise(ex).totalVolume;
          const volume = isImperial ? Math.round(volumeKg * 2.20462) : volumeKg;

          return (
            <View key={ex.id} style={styles.card}>
              <Text style={styles.exName}>
                {index + 1}. {exerciseDef?.name || 'Unknown Exercise'}
              </Text>
              {volume > 0 && (
                <Text style={styles.volumeText}>
                  Volume: {volume.toLocaleString()} {isImperial ? 'lbs' : 'kg'}
                </Text>
              )}

              <View style={styles.tableHeader}>
                <Text style={styles.colSet}>Set</Text>
                <Text style={styles.colWeight}>{isImperial ? 'lbs' : 'kg'}</Text>
                <Text style={styles.colReps}>Reps</Text>
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
    </View>
  );
}

const styles = StyleSheet.create({
  outerContainer: { flex: 1, backgroundColor: '#0B0B0F' },
  container: { flex: 1 },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#0B0B0F' },
  content: { padding: 16, paddingBottom: 40 },
  header: {
    backgroundColor: '#1A1C23',
    borderRadius: 16,
    padding: 16,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#2A2B31',
  },
  title: {
    fontSize: 22,
    fontFamily: 'SpaceGrotesk_700Bold',
    color: '#F4F5F7',
    marginBottom: 4,
    textTransform: 'uppercase',
  },
  date: { fontSize: 14, fontFamily: 'Manrope_500Medium', color: '#8A8D9F', marginBottom: 8 },
  duration: { fontSize: 16, fontFamily: 'SpaceGrotesk_600SemiBold', color: '#F4F5F7' },
  actionRow: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 16,
  },
  actionBtn: {
    flex: 1,
    backgroundColor: '#90D5FF',
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionBtnText: {
    color: '#0B0B0F',
    fontFamily: 'SpaceGrotesk_700Bold',
    fontSize: 14,
  },
  saveBtn: {
    backgroundColor: '#2A2B31',
  },
  saveBtnText: {
    color: '#F4F5F7',
    fontFamily: 'SpaceGrotesk_700Bold',
    fontSize: 14,
  },
  shareBtn: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: '#2A2B31',
  },
  shareBtnText: {
    color: '#F4F5F7',
    fontFamily: 'SpaceGrotesk_700Bold',
    fontSize: 14,
  },
  sectionTitle: {
    fontSize: 18,
    fontFamily: 'SpaceGrotesk_700Bold',
    color: '#90D5FF',
    marginBottom: 12,
    textTransform: 'uppercase',
  },
  card: {
    backgroundColor: '#1A1C23',
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#2A2B31',
  },
  exName: {
    fontSize: 16,
    fontFamily: 'SpaceGrotesk_600SemiBold',
    color: '#F4F5F7',
    marginBottom: 4,
  },
  volumeText: {
    fontSize: 14,
    color: '#90D5FF',
    fontFamily: 'SpaceGrotesk_700Bold',
    marginBottom: 12,
  },
  tableHeader: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: '#2A2B31',
    paddingBottom: 8,
    marginBottom: 8,
  },
  tableRow: {
    flexDirection: 'row',
    paddingVertical: 6,
  },
  incompleteRow: { opacity: 0.4 },
  colSet: { flex: 1, fontFamily: 'SpaceGrotesk_600SemiBold', color: '#8A8D9F' },
  colWeight: { flex: 1, textAlign: 'center', fontFamily: 'Manrope_500Medium', color: '#F4F5F7' },
  colReps: { flex: 1, textAlign: 'center', fontFamily: 'Manrope_500Medium', color: '#F4F5F7' },
  colRpe: { flex: 1, textAlign: 'center', fontFamily: 'Manrope_500Medium', color: '#F4F5F7' },
});
