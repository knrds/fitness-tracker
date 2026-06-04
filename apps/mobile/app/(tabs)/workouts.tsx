import React, { useState } from 'react';
import { View, Text, StyleSheet, FlatList, Pressable, Alert, Platform, Modal, Share } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useProgramStore } from '../../src/stores/programStore';
import { useWorkoutStore } from '../../src/stores/workoutStore';
import { useExerciseStore } from '../../src/stores/exerciseStore';
import { WorkoutTemplate } from '@fitness-tracker/domain';

export default function WorkoutsScreen() {
  const router = useRouter();
  const { templates, deleteTemplate } = useProgramStore();
  const { startWorkout, startWorkoutFromTemplate, status } = useWorkoutStore();
  const { exercises } = useExerciseStore();
  const [menuTemplateId, setMenuTemplateId] = useState<string | null>(null);

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

  const handleShareTemplate = async (template: WorkoutTemplate) => {
    const exerciseLines = template.exercises
      .map(te => {
        const ex = exercises.find(e => e.id === te.exerciseId);
        const name = ex?.name || 'Unknown';
        return `• ${name} — ${te.targetSets} sets × ${te.targetReps ?? '?'} reps`;
      })
      .join('\n');

    const message = `🏋️ ${template.name}\n\n${exerciseLines}\n\n— Shared from Volt Performance`;

    try {
      await Share.share({ message, title: template.name });
    } catch {
      // User cancelled
    }
  };

  const menuTemplate = templates.find(t => t.id === menuTemplateId) || null;

  const renderTemplate = ({ item }: { item: WorkoutTemplate }) => (
    <Pressable style={styles.card} onPress={() => handleStartTemplate(item)}>
      <View style={styles.cardInfo}>
        <Text style={styles.cardTitle}>{item.name}</Text>
        <Text style={styles.cardSubtitle}>{item.exercises.length} Exercises</Text>
      </View>
      <Pressable style={styles.kebabBtn} hitSlop={10} onPress={() => setMenuTemplateId(item.id)}>
        <Ionicons name="ellipsis-vertical" size={20} color="#8A8D9F" />
      </Pressable>
    </Pressable>
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

      {/* Template Action Menu */}
      <Modal visible={menuTemplate !== null} transparent animationType="fade" onRequestClose={() => setMenuTemplateId(null)}>
        <Pressable style={styles.menuOverlay} onPress={() => setMenuTemplateId(null)}>
          <View style={styles.menuSheet}>
            <Text style={styles.menuTitle}>{menuTemplate?.name}</Text>
            <Pressable style={styles.menuItem} onPress={() => { if (menuTemplate) { setMenuTemplateId(null); handleStartTemplate(menuTemplate); } }}>
              <Ionicons name="play-circle-outline" size={20} color="#90D5FF" />
              <Text style={[styles.menuItemText, { color: '#90D5FF' }]}>Start Workout</Text>
            </Pressable>
            <Pressable style={styles.menuItem} onPress={() => { const id = menuTemplate?.id; setMenuTemplateId(null); if (id) router.push(`/programs/template-builder?templateId=${id}` as unknown as Parameters<typeof router.push>[0]); }}>
              <Ionicons name="create-outline" size={20} color="#F4F5F7" />
              <Text style={styles.menuItemText}>Edit</Text>
            </Pressable>
            <Pressable style={styles.menuItem} onPress={() => { if (menuTemplate) { setMenuTemplateId(null); handleShareTemplate(menuTemplate); } }}>
              <Ionicons name="share-outline" size={20} color="#F4F5F7" />
              <Text style={styles.menuItemText}>Share</Text>
            </Pressable>
            <Pressable style={styles.menuItem} onPress={() => { const id = menuTemplate?.id; setMenuTemplateId(null); if (id) handleDeleteTemplate(id); }}>
              <Ionicons name="trash-outline" size={20} color="#ef4444" />
              <Text style={[styles.menuItemText, { color: '#ef4444' }]}>Delete</Text>
            </Pressable>
          </View>
        </Pressable>
      </Modal>
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
    color: '#90D5FF',
    marginBottom: 12,
    textTransform: 'uppercase',
  },
  emptyWorkoutBtn: {
    backgroundColor: '#90D5FF',
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
  kebabBtn: { padding: 4 },
  menuOverlay: {
    flex: 1,
    backgroundColor: 'rgba(11, 11, 15, 0.7)',
    justifyContent: 'flex-end',
  },
  menuSheet: {
    backgroundColor: '#1A1C23',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    borderWidth: 1,
    borderColor: '#2A2B31',
    paddingTop: 16,
    paddingBottom: 40,
    paddingHorizontal: 12,
  },
  menuTitle: {
    fontFamily: 'SpaceGrotesk_700Bold',
    color: '#8A8D9F',
    fontSize: 12,
    textTransform: 'uppercase',
    letterSpacing: 1,
    paddingHorizontal: 12,
    marginBottom: 8,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    paddingVertical: 16,
    paddingHorizontal: 12,
    borderRadius: 12,
  },
  menuItemText: { color: '#F4F5F7', fontFamily: 'SpaceGrotesk_600SemiBold', fontSize: 16 },
  emptyText: { color: '#8A8D9F', fontFamily: 'Manrope_500Medium', textAlign: 'center', marginTop: 24, paddingHorizontal: 20, lineHeight: 22 },
});
