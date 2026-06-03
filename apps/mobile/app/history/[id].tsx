import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable, Alert, Platform } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useHistoryStore } from '../../src/stores/historyStore';
import { useExerciseStore } from '../../src/stores/exerciseStore';
import { useWorkoutStore } from '../../src/stores/workoutStore';
import { useProgramStore } from '../../src/stores/programStore';
import { useProfileStore } from '../../src/stores/profileStore';
import { SaveTemplateModal } from '../../src/components/workout/SaveTemplateModal';
import { TemplateExercise, SessionExercise } from '@fitness-tracker/domain';
import * as Crypto from 'expo-crypto';

export default function WorkoutDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { sessions } = useHistoryStore();
  const { exercises } = useExerciseStore();
  const { status: activeWorkoutStatus, startWorkoutFromSession } = useWorkoutStore();
  const { createTemplate } = useProgramStore();
  const { profile } = useProfileStore();
  const isImperial = profile.preferredUnits === 'imperial';

  const [saveModalVisible, setSaveModalVisible] = useState(false);
  
  const session = sessions.find(s => s.id === id);

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
      minute: '2-digit'
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
    return sessionExercises.map(ex => {
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

  const handleRepeatWorkout = () => {
    const start = () => {
      startWorkoutFromSession(session);
      router.push('/workout/session' as unknown as Parameters<typeof router.push>[0]);
    };

    if (activeWorkoutStatus === 'active' || activeWorkoutStatus === 'paused') {
      if (Platform.OS === 'web') {
        if (typeof globalThis !== 'undefined' && 'confirm' in globalThis) {
          const confirmFn = (globalThis as { confirm?: (msg: string) => boolean }).confirm;
          if (confirmFn?.("An active workout is already in progress. Do you want to discard it and repeat this workout instead?")) {
            start();
          }
        }
      } else {
        Alert.alert(
          "Workout In Progress",
          "An active workout is already in progress. Do you want to discard it and repeat this workout instead?",
          [
            { text: "Cancel", style: "cancel" },
            { text: "Discard & Start", style: "destructive", onPress: start }
          ]
        );
      }
    } else {
      start();
    }
  };

  const handleSaveTemplate = (templateName: string) => {
    createTemplate({
      name: templateName,
      exercises: mapToTemplateExercises(session.exercises),
    });
    setSaveModalVisible(false);
    if (Platform.OS === 'web') {
      if (typeof globalThis !== 'undefined' && 'alert' in globalThis) {
        const alertFn = (globalThis as { alert?: (msg: string) => void }).alert;
        alertFn?.('Template saved successfully!');
      }
    } else {
      Alert.alert('Success', 'Template saved successfully!');
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
      <ScrollView style={styles.container} contentContainerStyle={styles.content}>
        <View style={styles.header}>
          <Text style={styles.title}>{session.name}</Text>
          <Text style={styles.date}>{formatDate(session.startedAt)}</Text>
          <Text style={styles.duration}>Duration: {formatDuration(session.durationSeconds)}</Text>
          
          <View style={styles.actionRow}>
            <Pressable style={styles.actionBtn} onPress={handleRepeatWorkout}>
              <Text style={styles.actionBtnText}>Repeat Workout</Text>
            </Pressable>
            <Pressable style={[styles.actionBtn, styles.saveBtn]} onPress={() => setSaveModalVisible(true)}>
              <Text style={styles.saveBtnText}>Save as Template</Text>
            </Pressable>
          </View>
        </View>

        <Text style={styles.sectionTitle}>Exercises</Text>

        {session.exercises.map((ex, index) => {
          const exerciseDef = exercises.find(e => e.id === ex.exerciseId);
          const completedSets = ex.sets.filter(s => s.completed);
          const volumeKg = completedSets.reduce((sum, s) => sum + (s.weight || 0) * (s.reps || 0), 0);
          const volume = isImperial ? Math.round(volumeKg * 2.20462) : volumeKg;
          
          return (
            <View key={ex.id} style={styles.card}>
              <Text style={styles.exName}>{index + 1}. {exerciseDef?.name || 'Unknown Exercise'}</Text>
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

              {ex.sets.map(set => (
                <View key={set.id} style={[styles.tableRow, !set.completed && styles.incompleteRow]}>
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
  outerContainer: { flex: 1, backgroundColor: '#f8fafc' },
  container: { flex: 1 },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#f8fafc' },
  content: { padding: 16, paddingBottom: 40 },
  header: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  title: { fontSize: 22, fontWeight: '800', color: '#0f172a', marginBottom: 4 },
  date: { fontSize: 14, color: '#64748b', marginBottom: 8 },
  duration: { fontSize: 16, fontWeight: '500', color: '#334155' },
  actionRow: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 16,
  },
  actionBtn: {
    flex: 1,
    backgroundColor: '#3b82f6',
    paddingVertical: 10,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionBtnText: {
    color: '#ffffff',
    fontWeight: '600',
    fontSize: 14,
  },
  saveBtn: {
    backgroundColor: '#e2e8f0',
  },
  saveBtnText: {
    color: '#0f172a',
    fontWeight: '600',
    fontSize: 14,
  },
  sectionTitle: { fontSize: 18, fontWeight: '700', color: '#0f172a', marginBottom: 12 },
  card: {
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: 12,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  exName: { fontSize: 16, fontWeight: '700', color: '#1e293b', marginBottom: 4 },
  volumeText: { fontSize: 14, color: '#10b981', fontWeight: '600', marginBottom: 12 },
  tableHeader: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
    paddingBottom: 8,
    marginBottom: 8,
  },
  tableRow: {
    flexDirection: 'row',
    paddingVertical: 6,
  },
  incompleteRow: { opacity: 0.4 },
  colSet: { flex: 1, fontWeight: '600', color: '#475569' },
  colWeight: { flex: 1, textAlign: 'center', color: '#334155' },
  colReps: { flex: 1, textAlign: 'center', color: '#334155' },
  colRpe: { flex: 1, textAlign: 'center', color: '#334155' },
});
