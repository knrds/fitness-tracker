import React, { useState } from 'react';
import { View, Text, StyleSheet, TextInput, ScrollView, Pressable } from 'react-native';
import { useTheme } from '@fitness-tracker/ui';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useProgramStore } from '../../src/stores/programStore';
import { useExerciseStore } from '../../src/stores/exerciseStore';
import { ExercisePickerModal } from '../../src/components/workout/ExercisePickerModal';
import { TemplateExercise } from '@fitness-tracker/domain';
import * as Crypto from 'expo-crypto';

export default function WorkoutTemplateBuilderScreen() {
  const theme = useTheme();
  const router = useRouter();
  const { programId, templateId, dayOfWeek } = useLocalSearchParams<{ programId?: string, templateId?: string, dayOfWeek?: string }>();
  
  const { programs, templates, updateProgram, createTemplate, updateTemplate } = useProgramStore();
  const { exercises } = useExerciseStore();
  
  const program = programId ? programs.find(p => p.id === programId) : undefined;
  const existingTemplate = templates.find(t => t.id === templateId);
  
  const [name, setName] = useState(existingTemplate?.name || '');
  const [description, setDescription] = useState(existingTemplate?.description || '');
  const [templateExercises, setTemplateExercises] = useState<TemplateExercise[]>(existingTemplate?.exercises || []);
  
  const [isExerciseModalVisible, setExerciseModalVisible] = useState(false);

  if (programId && !program) {
    return (
      <View style={styles.centered}><Text>Program not found.</Text></View>
    );
  }

  const handleSave = () => {
    if (!name.trim()) return;

    if (existingTemplate) {
      updateTemplate(existingTemplate.id, { name, description, exercises: templateExercises });
    } else {
      const newTemplateId = Crypto.randomUUID();
      createTemplate({ id: newTemplateId, name, description, exercises: templateExercises });
      
      if (program && dayOfWeek) {
        const newWorkout = {
          id: Crypto.randomUUID(),
          templateId: newTemplateId,
          dayOfWeek: parseInt(dayOfWeek, 10),
          week: 1, // MVP
          order: program.workouts.filter(w => w.dayOfWeek === parseInt(dayOfWeek)).length,
        };
        
        updateProgram(program.id, {
          workouts: [...program.workouts, newWorkout]
        });
      }
    }
    router.back();
  };



  const removeExercise = (id: string) => {
    setTemplateExercises(templateExercises.filter(e => e.id !== id));
  };

  const updateTemplateExercise = (id: string, updates: Partial<TemplateExercise>) => {
    setTemplateExercises(templateExercises.map(e => e.id === id ? { ...e, ...updates } : e));
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>{existingTemplate ? 'Edit Workout' : 'New Workout'}</Text>
        <Pressable onPress={handleSave} style={styles.saveBtn}>
          <Text style={styles.saveBtnText}>Save</Text>
        </Pressable>
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.label}>Workout Name</Text>
        <TextInput 
          style={styles.input} 
          value={name} 
          onChangeText={setName} 
          placeholder="e.g. Push Day" 
        />

        <Text style={styles.label}>Description</Text>
        <TextInput 
          style={styles.input} 
          value={description} 
          onChangeText={setDescription} 
          placeholder="e.g. Focused on chest and triceps" 
        />
        
        <Text style={styles.sectionTitle}>Exercises</Text>
        {templateExercises.map((te, index) => {
          const ex = exercises.find(e => e.id === te.exerciseId);
          return (
            <View key={te.id} style={styles.exerciseCard}>
              <View style={styles.exHeader}>
                <Text style={styles.exName}>{index + 1}. {ex?.name || 'Unknown'}</Text>
                <Pressable onPress={() => removeExercise(te.id)}>
                  <Text style={styles.removeText}>X</Text>
                </Pressable>
              </View>
              
              <View style={styles.exConfig}>
                <View style={styles.configItem}>
                  <Text style={styles.configLabel}>Sets</Text>
                  <TextInput 
                    style={styles.configInput} 
                    value={te.targetSets.toString()} 
                    onChangeText={t => updateTemplateExercise(te.id, { targetSets: parseInt(t, 10) || 1 })}
                    keyboardType="numeric"
                  />
                </View>
                <View style={styles.configItem}>
                  <Text style={styles.configLabel}>Reps</Text>
                  <TextInput 
                    style={styles.configInput} 
                    value={te.targetReps?.toString() || ''} 
                    onChangeText={t => updateTemplateExercise(te.id, { targetReps: parseInt(t, 10) || 1 })}
                    keyboardType="numeric"
                    placeholder="-"
                  />
                </View>
                <View style={styles.configItem}>
                  <Text style={styles.configLabel}>Weight</Text>
                  <TextInput 
                    style={styles.configInput} 
                    value={te.targetWeight?.toString() || ''} 
                    onChangeText={t => updateTemplateExercise(te.id, { targetWeight: parseFloat(t) || 0 })}
                    keyboardType="numeric"
                    placeholder="-"
                  />
                </View>
              </View>
            </View>
          );
        })}

        <Pressable style={styles.addExBtn} onPress={() => setExerciseModalVisible(true)}>
          <Text style={styles.addExText}>+ Add Exercise</Text>
        </Pressable>
      </ScrollView>

      <ExercisePickerModal
        visible={isExerciseModalVisible}
        onClose={() => setExerciseModalVisible(false)}
        onSelect={(exerciseIds) => {
          const newExercises = exerciseIds.map((exerciseId, idx) => ({
            id: Crypto.randomUUID(),
            exerciseId,
            order: templateExercises.length + idx,
            targetSets: 3,
            targetReps: 10,
          }));
          setTemplateExercises([...templateExercises, ...newExercises]);
          setExerciseModalVisible(false);
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0B0B0F' },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#0B0B0F' },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    padding: 16,
    backgroundColor: '#1A1C23',
    borderBottomWidth: 1,
    borderBottomColor: '#2A2B31',
    alignItems: 'center',
  },
  headerTitle: { fontSize: 18, fontFamily: 'SpaceGrotesk_700Bold', color: '#F4F5F7', textTransform: 'uppercase' },
  saveBtn: { backgroundColor: '#C6FF00', paddingHorizontal: 16, paddingVertical: 8, borderRadius: 8 },
  saveBtnText: { color: '#0B0B0F', fontFamily: 'SpaceGrotesk_700Bold' },
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
  sectionTitle: { fontSize: 18, fontFamily: 'SpaceGrotesk_700Bold', color: '#C6FF00', marginBottom: 16, textTransform: 'uppercase' },
  exerciseCard: {
    backgroundColor: '#1A1C23',
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#2A2B31',
  },
  exHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 12 },
  exName: { fontSize: 16, fontFamily: 'SpaceGrotesk_700Bold', color: '#F4F5F7' },
  removeText: { color: '#ef4444', fontFamily: 'SpaceGrotesk_700Bold', fontSize: 16 },
  exConfig: { flexDirection: 'row', gap: 12 },
  configItem: { flex: 1 },
  configLabel: { fontSize: 12, fontFamily: 'SpaceGrotesk_600SemiBold', color: '#8A8D9F', marginBottom: 4, textAlign: 'center', textTransform: 'uppercase' },
  configInput: {
    backgroundColor: '#0B0B0F',
    borderWidth: 1,
    borderColor: '#2A2B31',
    borderRadius: 8,
    padding: 8,
    textAlign: 'center',
    fontFamily: 'Manrope_500Medium',
    color: '#F4F5F7',
  },
  addExBtn: {
    backgroundColor: 'transparent',
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#2A2B31',
    borderStyle: 'dashed',
  },
  addExText: { color: '#C6FF00', fontFamily: 'SpaceGrotesk_700Bold', fontSize: 16, textTransform: 'uppercase' },
  
  modalContainer: { flex: 1, backgroundColor: '#0B0B0F', paddingTop: 40 },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', padding: 16, borderBottomWidth: 1, borderColor: '#2A2B31' },
  modalTitle: { fontSize: 18, fontFamily: 'SpaceGrotesk_700Bold', color: '#F4F5F7' },
  modalClose: { color: '#ef4444', fontSize: 16, fontFamily: 'SpaceGrotesk_700Bold' },
  exItem: { padding: 16, borderBottomWidth: 1, borderBottomColor: '#2A2B31', flexDirection: 'row', justifyContent: 'space-between' },
  exItemName: { fontSize: 16, fontFamily: 'SpaceGrotesk_600SemiBold', color: '#F4F5F7' },
  exItemTarget: { fontSize: 14, fontFamily: 'Manrope_500Medium', color: '#8A8D9F' },
});
