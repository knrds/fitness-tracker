import React from 'react';
import { View, Text, StyleSheet, FlatList, Pressable, Alert, Platform } from 'react-native';
import { useRouter } from 'expo-router';
import { useProgramStore } from '../../src/stores/programStore';
import { useWorkoutStore } from '../../src/stores/workoutStore';
import { WorkoutTemplate } from '@fitness-tracker/domain';

export default function WorkoutsScreen() {
  const router = useRouter();
  const { templates, deleteTemplate } = useProgramStore();
  const { startWorkout, startWorkoutFromTemplate, status } = useWorkoutStore();

  const handleStartEmpty = () => {
    if (status === 'idle' || status === 'finished') {
      startWorkout('Empty Workout');
    }
    router.push('/workout/session');
  };

  const handleStartTemplate = (template: WorkoutTemplate) => {
    const start = () => {
      startWorkoutFromTemplate(template);
      router.push('/workout/session');
    };

    if (status === 'active' || status === 'paused') {
      if (Platform.OS === 'web') {
        if (typeof globalThis !== 'undefined' && 'confirm' in globalThis) {
          const confirmFn = (globalThis as { confirm?: (msg: string) => boolean }).confirm;
          if (confirmFn?.("An active workout is already in progress. Do you want to discard it and start this template instead?")) {
            start();
          }
        }
      } else {
        Alert.alert(
          "Workout In Progress",
          "An active workout is already in progress. Do you want to discard it and start this template instead?",
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

  const handleDeleteTemplate = (templateId: string) => {
    if (Platform.OS === 'web') {
      if (typeof globalThis !== 'undefined' && 'confirm' in globalThis) {
        const confirmFn = (globalThis as { confirm?: (msg: string) => boolean }).confirm;
        if (confirmFn?.("Are you sure you want to delete this template?")) {
          deleteTemplate(templateId);
        }
      }
    } else {
      Alert.alert(
        "Delete Template",
        "Are you sure you want to delete this template?",
        [
          { text: "Cancel", style: "cancel" },
          { text: "Delete", style: "destructive", onPress: () => deleteTemplate(templateId) }
        ]
      );
    }
  };

  const renderTemplate = ({ item }: { item: WorkoutTemplate }) => (
    <View style={styles.card}>
      <View style={styles.cardInfo}>
        <Text style={styles.cardTitle}>{item.name}</Text>
        <Text style={styles.cardSubtitle}>{item.exercises.length} Exercises</Text>
      </View>
      <View style={styles.templateActions}>
        <Pressable style={[styles.actionBtn, styles.startBtn]} onPress={() => handleStartTemplate(item)}>
          <Text style={styles.startBtnText}>Start</Text>
        </Pressable>
        <Pressable style={styles.actionBtn} onPress={() => router.push(`/programs/template-builder?templateId=${item.id}` as unknown as Parameters<typeof router.push>[0])}>
          <Text style={styles.editBtnText}>Edit</Text>
        </Pressable>
        <Pressable style={styles.actionBtn} onPress={() => handleDeleteTemplate(item.id)}>
          <Text style={styles.deleteBtnText}>Delete</Text>
        </Pressable>
      </View>
    </View>
  );

  return (
    <View style={styles.container}>
      <View style={styles.quickStart}>
        <Text style={styles.sectionTitle}>Quick Start</Text>
        <Pressable style={styles.emptyWorkoutBtn} onPress={handleStartEmpty}>
          <Text style={styles.emptyWorkoutBtnText}>
            {status === 'active' || status === 'paused' ? 'Resume Current Workout' : '+ Start Empty Workout'}
          </Text>
        </Pressable>
      </View>

      <Text style={[styles.sectionTitle, { paddingHorizontal: 16 }]}>My Templates</Text>
      <FlatList
        data={templates}
        keyExtractor={item => item.id}
        renderItem={renderTemplate}
        contentContainerStyle={styles.list}
        ListEmptyComponent={
          <Text style={styles.emptyText}>No templates saved yet. Finish a workout and save it as a template.</Text>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0B0B0F' },
  quickStart: {
    padding: 16,
    marginBottom: 8,
  },
  sectionTitle: {
    fontSize: 20,
    fontFamily: 'SpaceGrotesk_700Bold',
    color: '#C6FF00',
    marginBottom: 12,
    textTransform: 'uppercase',
  },
  emptyWorkoutBtn: {
    backgroundColor: '#C6FF00',
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  emptyWorkoutBtnText: {
    color: '#0B0B0F',
    fontSize: 16,
    fontFamily: 'SpaceGrotesk_700Bold',
  },
  list: { padding: 16 },
  card: {
    backgroundColor: '#1A1C23',
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderColor: '#2A2B31',
  },
  cardInfo: { flex: 1 },
  cardTitle: { fontSize: 16, fontFamily: 'SpaceGrotesk_700Bold', color: '#F4F5F7' },
  cardSubtitle: { fontSize: 14, fontFamily: 'Manrope_500Medium', color: '#8A8D9F', marginTop: 4 },
  templateActions: {
    flexDirection: 'row',
    gap: 8,
    alignItems: 'center',
  },
  actionBtn: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: '#2A2B31',
    justifyContent: 'center',
    alignItems: 'center',
  },
  startBtn: {
    backgroundColor: '#C6FF00',
  },
  startBtnText: { color: '#0B0B0F', fontFamily: 'SpaceGrotesk_700Bold', fontSize: 14 },
  editBtnText: { color: '#C6FF00', fontFamily: 'SpaceGrotesk_700Bold', fontSize: 14 },
  deleteBtnText: { color: '#ef4444', fontFamily: 'SpaceGrotesk_700Bold', fontSize: 14 },
  emptyText: { color: '#8A8D9F', fontFamily: 'Manrope_500Medium', textAlign: 'center', marginTop: 24, paddingHorizontal: 20, lineHeight: 22 },
});
