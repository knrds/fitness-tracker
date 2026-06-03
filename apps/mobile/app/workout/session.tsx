import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable, TextInput, Platform, Alert } from 'react-native';
import * as Crypto from 'expo-crypto';
import { useRouter, Stack } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

import { TemplateExercise, SessionExercise } from '@fitness-tracker/domain';

import { useWorkoutStore } from '../../src/stores/workoutStore';
import { SessionExerciseCard } from '../../src/components/workout/SessionExerciseCard';
import { RestTimer } from '../../src/components/workout/RestTimer';
import { ExercisePickerModal } from '../../src/components/workout/ExercisePickerModal';
import { SaveTemplateModal } from '../../src/components/workout/SaveTemplateModal';
import { useProgramStore } from '../../src/stores/programStore';
import { useTheme, Button, Card } from '@fitness-tracker/ui';

export default function WorkoutSessionScreen() {
  const router = useRouter();
  const theme = useTheme();
  const {
    status,
    name,
    exercises,
    notes,
    finishWorkout,
    addExercise,
    updateWorkoutNotes,
    startedAt,
    pausedAt,
    accumulatedPauseMs,
    resetWorkout,
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
      <View style={[styles.centered, { backgroundColor: theme.colors.background }]}>
        <Text style={{ color: theme.colors.muted, ...theme.typography.body, marginBottom: 16 }}>
          No active workout.
        </Text>
        <Button title="GO BACK" onPress={() => router.back()} />
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

  const handleBackAction = () => {
    if (Platform.OS === 'web') {
      const confirmFn = (globalThis as { confirm?: (msg: string) => boolean }).confirm;
      if (confirmFn?.("Möchtest du das aktuelle Training abbrechen (löschen) oder weiter trainieren?\n\n[OK] = Abbrechen, [Abbrechen] = Weiter trainieren")) {
        resetWorkout();
        router.replace('/');
      }
      return;
    }

    Alert.alert(
      "Training verlassen",
      "Möchtest du das aktuelle Training abbrechen (löschen) oder weiter trainieren?",
      [
        {
          text: "Weiter trainieren",
          style: "cancel",
          onPress: () => {}
        },
        {
          text: "Abbrechen",
          style: "destructive",
          onPress: () => {
            resetWorkout();
            router.replace('/');
          }
        }
      ]
    );
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <Stack.Screen
        options={{
          headerShown: false,
        }}
      />
      {/* Sticky Header */}
      <View style={[styles.header, { backgroundColor: theme.colors.surface, borderBottomColor: theme.colors.muted }]}>
        <View style={styles.headerLeft}>
          <Pressable onPress={handleBackAction} style={{ paddingRight: 16 }}>
            <Ionicons name="close" size={24} color={theme.colors.muted} />
          </Pressable>
          <View>
            <Text style={[{ color: theme.colors.text, fontSize: 18 }, theme.typography.heading]}>
              {name}
            </Text>
            <Text style={[{ color: theme.colors.primary, fontSize: 20 }, theme.typography.display]}>
              {formatElapsed(elapsed)}
            </Text>
          </View>
        </View>
        <Button 
          title="FINISH" 
          variant="primary" 
          onPress={handleFinish} 
          style={{ height: 40, paddingHorizontal: 16 }}
        />
      </View>

      <ScrollView style={styles.content} contentContainerStyle={styles.contentContainer}>
        {exercises.map(ex => (
          <SessionExerciseCard key={ex.id} sessionExercise={ex} />
        ))}

        <Button 
          title="+ ADD EXERCISE" 
          variant="secondary" 
          onPress={handleAddExercise} 
          style={{ marginBottom: 24 }}
        />

        <Card padding="md" style={styles.notesContainer}>
          <Text style={[{ color: theme.colors.text, ...theme.typography.heading, fontSize: 16, marginBottom: 8 }]}>WORKOUT NOTES</Text>
          <TextInput
            style={[styles.notesInput, { color: theme.colors.text, ...theme.typography.body }]}
            value={notes}
            onChangeText={updateWorkoutNotes}
            placeholder="Write a general note about your workout..."
            placeholderTextColor={theme.colors.muted}
            multiline
            numberOfLines={3}
          />
        </Card>
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
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingTop: 48,
    paddingBottom: 16,
    borderBottomWidth: 1,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  title: {
    marginBottom: 2,
  },
  timer: {
    marginTop: 2,
  },
  content: {
    flex: 1,
  },
  contentContainer: {
    padding: 24,
    paddingBottom: 100,
  },
  notesContainer: {
    marginBottom: 24,
  },
  notesInput: {
    minHeight: 60,
    textAlignVertical: 'top',
  },
});
