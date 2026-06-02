import React from 'react';
import { View, Text, StyleSheet, FlatList, Pressable, Alert, Platform } from 'react-native';
import { useRouter } from 'expo-router';
import { useProgramStore } from '../../src/stores/programStore';
import { useWorkoutStore } from '../../src/stores/workoutStore';
import { useExerciseStore } from '../../src/stores/exerciseStore';
import { WorkoutTemplate } from '@fitness-tracker/domain';

export default function QuickStartScreen() {
  const router = useRouter();
  const { templates } = useProgramStore();
  const { exercises: allExercises } = useExerciseStore();
  const { status: activeWorkoutStatus, startWorkout, startWorkoutFromTemplate } = useWorkoutStore();

  const handleStartEmptyWorkout = () => {
    const start = () => {
      startWorkout('Empty Workout');
      router.navigate('/workout/session');
    };

    if (activeWorkoutStatus === 'active' || activeWorkoutStatus === 'paused') {
      if (Platform.OS === 'web') {
        if (typeof globalThis !== 'undefined' && 'confirm' in globalThis) {
          const confirmFn = (globalThis as { confirm?: (msg: string) => boolean }).confirm;
          if (confirmFn?.("An active workout is already in progress. Do you want to discard it and start a new empty workout?")) {
            start();
          }
        }
      } else {
        Alert.alert(
          "Workout In Progress",
          "An active workout is already in progress. Do you want to discard it and start a new empty workout?",
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

  const handleStartTemplate = (template: WorkoutTemplate) => {
    const start = () => {
      startWorkoutFromTemplate(template);
      router.navigate('/workout/session');
    };

    if (activeWorkoutStatus === 'active' || activeWorkoutStatus === 'paused') {
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

  const renderTemplateItem = ({ item }: { item: WorkoutTemplate }) => {
    return (
      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <Text style={styles.cardTitle}>{item.name}</Text>
          <Pressable style={styles.startBtn} onPress={() => handleStartTemplate(item)}>
            <Text style={styles.startBtnText}>Start</Text>
          </Pressable>
        </View>
        
        {item.description ? (
          <Text style={styles.cardDesc}>{item.description}</Text>
        ) : null}

        <View style={styles.exercisePreview}>
          {item.exercises.map((ex, idx) => {
            const exerciseDetail = allExercises.find(e => e.id === ex.exerciseId);
            return (
              <Text key={ex.id || idx} style={styles.exerciseText}>
                • {ex.targetSets}x {exerciseDetail?.name || 'Unknown Exercise'}
              </Text>
            );
          })}
        </View>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Quick Start</Text>
        <Text style={styles.headerSub}>Start an empty workout or choose a template below.</Text>
      </View>

      <Pressable style={styles.emptyWorkoutBtn} onPress={handleStartEmptyWorkout}>
        <Text style={styles.emptyWorkoutBtnText}>+ Start Empty Workout</Text>
      </Pressable>

      <Text style={styles.sectionTitle}>Templates</Text>

      <FlatList
        data={templates}
        keyExtractor={item => item.id}
        renderItem={renderTemplateItem}
        contentContainerStyle={styles.list}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>No templates saved yet.</Text>
            <Text style={styles.emptySubtext}>Save templates at the end of workouts, or add them via Programs.</Text>
          </View>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
    padding: 16,
  },
  header: {
    marginBottom: 20,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '800',
    color: '#0f172a',
  },
  headerSub: {
    fontSize: 14,
    color: '#64748b',
    marginTop: 4,
  },
  emptyWorkoutBtn: {
    backgroundColor: '#3b82f6',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    marginBottom: 24,
    shadowColor: '#3b82f6',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  emptyWorkoutBtnText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '700',
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#0f172a',
    marginBottom: 12,
  },
  list: {
    paddingBottom: 24,
  },
  card: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#0f172a',
    flex: 1,
    marginRight: 12,
  },
  startBtn: {
    backgroundColor: '#10b981',
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  startBtnText: {
    color: '#ffffff',
    fontWeight: '700',
    fontSize: 14,
  },
  cardDesc: {
    fontSize: 14,
    color: '#64748b',
    marginBottom: 12,
  },
  exercisePreview: {
    backgroundColor: '#f1f5f9',
    borderRadius: 8,
    padding: 12,
  },
  exerciseText: {
    fontSize: 14,
    color: '#475569',
    marginBottom: 4,
  },
  emptyContainer: {
    alignItems: 'center',
    marginTop: 40,
    padding: 24,
  },
  emptyText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#334155',
    marginBottom: 8,
  },
  emptySubtext: {
    fontSize: 14,
    color: '#64748b',
    textAlign: 'center',
    lineHeight: 20,
  },
});
