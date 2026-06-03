import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable, TextInput, Share } from 'react-native';
import { useWorkoutStore } from '../../src/stores/workoutStore';
import { SessionExerciseCard } from '../../src/components/workout/SessionExerciseCard';
import { RestTimer } from '../../src/components/workout/RestTimer';
import { ExercisePickerModal } from '../../src/components/workout/ExercisePickerModal';
import { SaveTemplateModal } from '../../src/components/workout/SaveTemplateModal';
import { useProgramStore } from '../../src/stores/programStore';
import { useProfileStore } from '../../src/stores/profileStore';
import { TemplateExercise, SessionExercise } from '@fitness-tracker/domain';
import * as Crypto from 'expo-crypto';
import { useRouter } from 'expo-router';

export default function WorkoutSessionScreen() {
  const router = useRouter();
  const { 
    status, 
    name, 
    elapsedSeconds, 
    exercises, 
    notes,
    tickWorkoutTimer,
    pauseWorkout,
    resumeWorkout,
    finishWorkout,
    addExercise,
    updateWorkoutNotes
  } = useWorkoutStore();
  const { createTemplate } = useProgramStore();
  
  const [pickerVisible, setPickerVisible] = useState(false);
  const [saveModalVisible, setSaveModalVisible] = useState(false);

  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (status === 'active') {
      interval = setInterval(() => {
        tickWorkoutTimer(1);
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [status, tickWorkoutTimer]);

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

  const handleFinish = () => {
    setSaveModalVisible(true);
  };

  const finalizeWorkout = async () => {
    // Collect session details for sharing
    const state = useWorkoutStore.getState();
    const durationMin = Math.round(state.elapsedSeconds / 60);

    let volumeKg = 0;
    let totalSets = 0;
    state.exercises.forEach(ex => {
      ex.sets.forEach(set => {
        if (set.completed && set.weight && set.reps) {
          volumeKg += set.weight * set.reps;
          totalSets++;
        }
      });
    });

    const preferredUnits = useProfileStore.getState().profile?.preferredUnits || 'metric';
    const isImperial = preferredUnits === 'imperial';
    const displayVolume = isImperial ? Math.round(volumeKg * 2.20462) : Math.round(volumeKg);
    const volumeUnit = isImperial ? 'lbs' : 'kg';

    let shareMessage = `🏋️ Workout completed: ${state.name}\n`;
    shareMessage += `⏱️ Duration: ${durationMin} min\n`;
    shareMessage += `💪 Total Volume: ${displayVolume} ${volumeUnit}\n`;
    shareMessage += `📊 Total Sets: ${totalSets}\n`;
    if (state.notes) {
      shareMessage += `📝 Note: ${state.notes}\n`;
    }
    shareMessage += `\nTracked with Fitness Tracker App!`;

    // Finish workout in store
    finishWorkout();

    // Trigger system share dialog
    try {
      await Share.share({ message: shareMessage });
    } catch (e) {
      console.log('Sharing failed', e);
    }

    router.navigate('/');
  };

  const handleSaveTemplate = (templateName: string) => {
    createTemplate({
      name: templateName,
      exercises: mapToTemplateExercises(exercises),
    });
    setSaveModalVisible(false);
    finalizeWorkout();
  };

  const handleSkipTemplate = () => {
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
          <Text style={styles.timer}>{formatElapsed(elapsedSeconds)}</Text>
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
        onSelect={(id) => addExercise(id)}
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
