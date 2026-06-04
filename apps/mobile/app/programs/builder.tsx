import React from 'react';
import { View, Text, StyleSheet, TextInput, ScrollView, Pressable, Alert, Platform } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useProgramStore } from '../../src/stores/programStore';
import { useWorkoutStore } from '../../src/stores/workoutStore';
import { WorkoutTemplate } from '@fitness-tracker/domain';

export default function ProgramBuilderScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id?: string }>();
  const { programs, updateProgram, templates } = useProgramStore();
  
  const program = programs.find(p => p.id === id);
  const { status: activeWorkoutStatus, startWorkoutFromTemplate } = useWorkoutStore();

  const handleStartTemplate = (template: WorkoutTemplate | undefined, programId: string) => {
    if (!template) return;
    
    const start = () => {
      startWorkoutFromTemplate(template, programId);
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
  
  if (!program) {
    return (
      <View style={styles.centered}>
        <Text>Program not found.</Text>
      </View>
    );
  }

  // To keep it reactive without local state sync issues, we update the store directly
  const handleChange = (updates: Partial<typeof program>) => {
    updateProgram(program.id, updates);
  };

  const getDayName = (day: number) => {
    const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
    return days[day - 1];
  };

  const removeWorkout = (workoutId: string) => {
    handleChange({
      workouts: program.workouts.filter(w => w.id !== workoutId)
    });
  };

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.label}>Program Name</Text>
        <TextInput 
          style={styles.input} 
          value={program.name} 
          onChangeText={(text) => handleChange({ name: text })} 
          placeholder="e.g. 5/3/1 Boring But Big" 
        />
        
        <Text style={styles.label}>Description</Text>
        <TextInput 
          style={[styles.input, styles.textArea]} 
          value={program.description || ''} 
          onChangeText={(text) => handleChange({ description: text })} 
          placeholder="Optional description" 
          multiline 
        />
        
        <Text style={styles.label}>Duration (Weeks)</Text>
        <TextInput 
          style={styles.input} 
          value={program.durationWeeks.toString()} 
          onChangeText={(text) => handleChange({ durationWeeks: parseInt(text, 10) || 1 })} 
          keyboardType="numeric" 
        />

        <Text style={styles.sectionTitle}>Weekly Schedule</Text>
        {[1, 2, 3, 4, 5, 6, 7].map((day) => {
          const dayWorkouts = program.workouts.filter(w => w.dayOfWeek === day);
          return (
            <View key={day} style={styles.dayContainer}>
              <Text style={styles.dayName}>{getDayName(day)}</Text>
              
              {dayWorkouts.map(w => {
                const template = templates.find(t => t.id === w.templateId);
                return (
                  <View key={w.id} style={styles.workoutRow}>
                    <Text style={styles.workoutName}>{template?.name || 'Unknown Template'}</Text>
                    <View style={styles.workoutActions}>
                      <Pressable onPress={() => handleStartTemplate(template, program.id)}>
                        <Text style={styles.startText}>Start</Text>
                      </Pressable>
                      <Pressable onPress={() => router.push(`/programs/template-builder?programId=${program.id}&templateId=${template?.id}&dayOfWeek=${day}`)}>
                        <Text style={styles.editText}>Edit</Text>
                      </Pressable>
                      <Pressable onPress={() => removeWorkout(w.id)}>
                        <Text style={styles.removeText}>Remove</Text>
                      </Pressable>
                    </View>
                  </View>
                );
              })}
              
              <Pressable 
                style={styles.addWorkoutBtn} 
                onPress={() => router.push(`/programs/template-builder?programId=${program.id}&dayOfWeek=${day}`)}
              >
                <Text style={styles.addWorkoutText}>+ Add Workout</Text>
              </Pressable>
            </View>
          );
        })}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0B0B0F' },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#0B0B0F' },
  content: { padding: 16, paddingBottom: 40 },
  label: { fontSize: 14, fontFamily: 'SpaceGrotesk_600SemiBold', color: '#8A8D9F', marginBottom: 8, textTransform: 'uppercase' },
  input: {
    backgroundColor: '#0B0B0F',
    borderWidth: 1,
    borderColor: '#2A2B31',
    borderRadius: 12,
    padding: 12,
    fontSize: 16,
    fontFamily: 'Manrope_500Medium',
    color: '#F4F5F7',
    marginBottom: 16,
  },
  textArea: { minHeight: 80, textAlignVertical: 'top' },
  sectionTitle: { fontSize: 20, fontFamily: 'SpaceGrotesk_700Bold', color: '#90D5FF', marginTop: 16, marginBottom: 16, textTransform: 'uppercase' },
  dayContainer: {
    backgroundColor: '#1A1C23',
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#2A2B31',
  },
  dayName: { fontSize: 16, fontFamily: 'SpaceGrotesk_700Bold', color: '#F4F5F7', marginBottom: 8, textTransform: 'uppercase' },
  workoutRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#0B0B0F',
    padding: 12,
    borderRadius: 8,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#2A2B31',
  },
  workoutName: { fontSize: 16, fontFamily: 'SpaceGrotesk_600SemiBold', color: '#F4F5F7' },
  workoutActions: { flexDirection: 'row', gap: 12 },
  editText: { color: '#90D5FF', fontFamily: 'SpaceGrotesk_700Bold' },
  removeText: { color: '#ef4444', fontFamily: 'SpaceGrotesk_700Bold' },
  startText: { color: '#90D5FF', fontFamily: 'SpaceGrotesk_700Bold' },
  addWorkoutBtn: {
    padding: 12,
    alignItems: 'center',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#2A2B31',
    borderStyle: 'dashed',
    marginTop: 4,
  },
  addWorkoutText: { color: '#8A8D9F', fontFamily: 'SpaceGrotesk_700Bold' },
});
