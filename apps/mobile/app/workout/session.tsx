import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable, TextInput, Share } from 'react-native';
import * as Crypto from 'expo-crypto';
import { useRouter } from 'expo-router';

import { TemplateExercise, SessionExercise, summarizeWorkout } from '@fitness-tracker/domain';

import { useWorkoutStore } from '../../src/stores/workoutStore';
import { SessionExerciseCard } from '../../src/components/workout/SessionExerciseCard';
import { RestTimer } from '../../src/components/workout/RestTimer';
import { ExercisePickerModal } from '../../src/components/workout/ExercisePickerModal';
import { SaveTemplateModal } from '../../src/components/workout/SaveTemplateModal';
import { useProgramStore } from '../../src/stores/programStore';
import { useProfileStore } from '../../src/stores/profileStore';

export default function WorkoutSessionScreen() {
  const router = useRouter();
  const {
    status,
    name,
    exercises,
    notes,
    pauseWorkout,
    resumeWorkout,
    finishWorkout,
    addExercise,
    updateWorkoutNotes,
    startedAt,
    pausedAt,
    accumulatedPauseMs,
  } = useWorkoutStore();
  const { createTemplate } = useProgramStore();

  const [pickerVisible, setPickerVisible] = useState(false);
  const [saveModalVisible, setSaveModalVisible] = useState(false);
  const [isFinishing, setIsFinishing] = useState(false);
  const [elapsed, setElapsed] = useState(0);

  useEffect(() => {
    const calculateElapsed = () => {
      if (!startedAt) return 0;
      const startedTime = startedAt instanceof Date ? startedAt : new Date(startedAt);
      const pausedTime = pausedAt ? (pausedAt instanceof Date ? pausedAt : new Date(pausedAt)) : null;
      const endTime = pausedTime || new Date();
      return Math.floor((endTime.getTime() - startedTime.getTime() - accumulatedPauseMs) / 1000);
    };

    setElapsed(calculateElapsed());

    let interval: NodeJS.Timeout;
    if (status === 'active') {
      interval = setInterval(() => {
        setElapsed(calculateElapsed());
      }, 1000);
    }
    return () => {
      if (interval) {
        clearInterval(interval);
      }
    };
  }, [status, startedAt, pausedAt, accumulatedPauseMs]);

  if (status === 'idle' || status === 'finished') {
    return (
      <View style={styles.centered}>
        <Text style={styles.emptyText}>No active workout.</Text>
        <Pressable style={styles.button} onPress={() => router.back()}>
          <Text style={styles.buttonText}>Go Back</Text>
        </Pressable>
      </View>
    );
  }

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

  const finalizeWorkout = async () => {
    if (isFinishing) return;
    setIsFinishing(true);

    const finishedSession = finishWorkout();
    if (!finishedSession) {
      setSaveModalVisible(false);
      router.replace('/');
      return;
    }

    router.replace('/');
  };

  const handleFinish = () => {
    if (isFinishing) return;
    const hasCompletedSet = exercises.some(ex => ex.sets.some(set => set.completed));
    if (!hasCompletedSet) {
      finalizeWorkout();
      return;
    }
    setSaveModalVisible(true);
  };

  const handleSaveTemplate = (templateName: string) => {
    if (isFinishing) return;
    createTemplate({
      name: templateName,
      exercises: mapToTemplateExercises(exercises),
    });
    setSaveModalVisible(false);
    finalizeWorkout();
  };

  const handleSkipTemplate = () => {
    if (isFinishing) return;
    setSaveModalVisible(false);
    finalizeWorkout();
  };

  const handleAddExercise = () => {
    setPickerVisible(true);
  };

  const formatElapsed = (secs: number) => {
    const h = Math.floor(secs / 3600);
    const m = Math.floor((secs % 3600) / 60);
    const s = secs % 60;
    if (h > 0) {
      return `${h}:${m < 10 ? '0' : ''}${m}:${s < 10 ? '0' : ''}${s}`;
    }
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View>
          <Text style={styles.title}>{name}</Text>
          <Text style={styles.timer}>{formatElapsed(elapsed)}</Text>
        </View>

        <View style={styles.headerActions}>
          <Pressable
            style={[styles.actionBtn, styles.pauseBtn]}
            onPress={status === 'active' ? pauseWorkout : resumeWorkout}
          >
            <Text style={styles.actionBtnText}>
              {status === 'active' ? 'Pause' : 'Resume'}
            </Text>
          </Pressable>
          <Pressable style={[styles.actionBtn, styles.finishBtn]} onPress={handleFinish}>
            <Text style={styles.actionBtnText}>Finish</Text>
          </Pressable>
        </View>
      </View>

      <ScrollView style={styles.content} contentContainerStyle={styles.contentContainer}>
        {exercises.map(ex => (
          <SessionExerciseCard key={ex.id} sessionExercise={ex} />
        ))}

        <Pressable style={styles.addBtn} onPress={handleAddExercise}>
          <Text style={styles.addBtnText}>+ Add Exercise</Text>
        </Pressable>

        <View style={styles.notesContainer}>
          <Text style={styles.notesLabel}>Workout Notes</Text>
          <TextInput
            style={styles.notesInput}
            value={notes}
            onChangeText={updateWorkoutNotes}
            placeholder="Write a general note about your workout..."
            placeholderTextColor="#94a3b8"
            multiline
            numberOfLines={3}
          />
        </View>
      </ScrollView>

      <RestTimer />

      <ExercisePickerModal
        visible={pickerVisible}
        onClose={() => setPickerVisible(false)}
        onSelect={(ids) => ids.forEach(id => addExercise(id))}
      />

      <SaveTemplateModal
        visible={saveModalVisible}
        defaultName={name}
        onClose={() => setSaveModalVisible(false)}
        onSave={handleSaveTemplate}
        onSkip={handleSkipTemplate}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 16,
    color: '#64748b',
    marginBottom: 16,
  },
  button: {
    backgroundColor: '#3b82f6',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
  },
  buttonText: {
    color: '#ffffff',
    fontWeight: '600',
    fontSize: 16,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    color: '#0f172a',
  },
  timer: {
    fontSize: 14,
    color: '#3b82f6',
    fontWeight: '600',
    marginTop: 4,
    fontVariant: ['tabular-nums'],
  },
  headerActions: {
    flexDirection: 'row',
    gap: 8,
  },
  actionBtn: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
    justifyContent: 'center',
  },
  pauseBtn: {
    backgroundColor: '#e2e8f0',
  },
  finishBtn: {
    backgroundColor: '#10b981',
  },
  actionBtnText: {
    fontWeight: '600',
    fontSize: 14,
    color: '#0f172a',
  },
  content: {
    flex: 1,
  },
  contentContainer: {
    padding: 16,
    paddingBottom: 40,
  },
  addBtn: {
    backgroundColor: '#e0f2fe',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 8,
    borderWidth: 1,
    borderColor: '#bae6fd',
    borderStyle: 'dashed',
  },
  addBtnText: {
    color: '#0284c7',
    fontWeight: '700',
    fontSize: 16,
  },
  notesContainer: {
    marginTop: 24,
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  notesLabel: {
    fontSize: 14,
    fontWeight: '700',
    color: '#334155',
    marginBottom: 8,
  },
  notesInput: {
    minHeight: 60,
    fontSize: 14,
    color: '#0f172a',
    textAlignVertical: 'top',
  },
});
