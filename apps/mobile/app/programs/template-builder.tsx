import React, { useState } from 'react';
import { View, Text, StyleSheet, TextInput, ScrollView, Pressable, Modal, FlatList } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useProgramStore } from '../../src/stores/programStore';
import { useExerciseStore } from '../../src/stores/exerciseStore';
import * as Crypto from 'expo-crypto';

export default function WorkoutTemplateBuilderScreen() {
  const router = useRouter();
  const { programId, templateId, dayOfWeek } = useLocalSearchParams<{ programId: string, templateId?: string, dayOfWeek?: string }>();
  
  const { programs, templates, updateProgram, createTemplate, updateTemplate } = useProgramStore();
  const { exercises } = useExerciseStore();
  
  const program = programs.find(p => p.id === programId);
  const existingTemplate = templates.find(t => t.id === templateId);
  
  const [name, setName] = useState(existingTemplate?.name || '');
  const [description, setDescription] = useState(existingTemplate?.description || '');
  const [templateExercises, setTemplateExercises] = useState(existingTemplate?.exercises || []);
  
  const [isExerciseModalVisible, setExerciseModalVisible] = useState(false);

  if (!program) {
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
      
      const newWorkout = {
        id: Crypto.randomUUID(),
        templateId: newTemplateId,
        dayOfWeek: dayOfWeek ? parseInt(dayOfWeek, 10) : 1,
        week: 1, // MVP
        order: program.workouts.filter(w => w.dayOfWeek === parseInt(dayOfWeek || '1')).length,
      };
      
      updateProgram(program.id, {
        workouts: [...program.workouts, newWorkout]
      });
    }
    router.back();
  };

  const addExercise = (exerciseId: string) => {
    const newEx = {
      id: Crypto.randomUUID(),
      exerciseId,
      order: templateExercises.length,
      targetSets: 3,
      targetReps: 10,
    };
    setTemplateExercises([...templateExercises, newEx]);
    setExerciseModalVisible(false);
  };

  const removeExercise = (id: string) => {
    setTemplateExercises(templateExercises.filter(e => e.id !== id));
  };

  const updateTemplateExercise = (id: string, updates: any) => {
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

      {/* Exercise Selection Modal */}
      <Modal visible={isExerciseModalVisible} animationType="slide" presentationStyle="pageSheet">
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Select Exercise</Text>
            <Pressable onPress={() => setExerciseModalVisible(false)}>
              <Text style={styles.modalClose}>Cancel</Text>
            </Pressable>
          </View>
          <FlatList
            data={exercises}
            keyExtractor={item => item.id}
            renderItem={({ item }) => (
              <Pressable style={styles.exItem} onPress={() => addExercise(item.id)}>
                <Text style={styles.exItemName}>{item.name}</Text>
                <Text style={styles.exItemTarget}>{item.primaryMuscles?.[0]}</Text>
              </Pressable>
            )}
          />
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc' },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    padding: 16,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
    alignItems: 'center',
  },
  headerTitle: { fontSize: 18, fontWeight: '700', color: '#0f172a' },
  saveBtn: { backgroundColor: '#10b981', paddingHorizontal: 16, paddingVertical: 8, borderRadius: 6 },
  saveBtnText: { color: '#fff', fontWeight: '600' },
  content: { padding: 16, paddingBottom: 40 },
  label: { fontSize: 14, fontWeight: '600', color: '#475569', marginBottom: 8 },
  input: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    marginBottom: 16,
  },
  sectionTitle: { fontSize: 18, fontWeight: '700', color: '#0f172a', marginBottom: 16 },
  exerciseCard: {
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  exHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 12 },
  exName: { fontSize: 16, fontWeight: '600', color: '#0f172a' },
  removeText: { color: '#ef4444', fontWeight: '700', fontSize: 16 },
  exConfig: { flexDirection: 'row', gap: 12 },
  configItem: { flex: 1 },
  configLabel: { fontSize: 12, color: '#64748b', marginBottom: 4, textAlign: 'center' },
  configInput: {
    backgroundColor: '#f1f5f9',
    borderRadius: 6,
    padding: 8,
    textAlign: 'center',
    fontWeight: '600',
  },
  addExBtn: {
    backgroundColor: '#e0f2fe',
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#bae6fd',
    borderStyle: 'dashed',
  },
  addExText: { color: '#0284c7', fontWeight: '700', fontSize: 16 },
  
  modalContainer: { flex: 1, backgroundColor: '#fff', paddingTop: 40 },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', padding: 16, borderBottomWidth: 1, borderColor: '#e2e8f0' },
  modalTitle: { fontSize: 18, fontWeight: '700' },
  modalClose: { color: '#ef4444', fontSize: 16, fontWeight: '600' },
  exItem: { padding: 16, borderBottomWidth: 1, borderBottomColor: '#f1f5f9', flexDirection: 'row', justifyContent: 'space-between' },
  exItemName: { fontSize: 16, fontWeight: '500', color: '#0f172a' },
  exItemTarget: { fontSize: 14, color: '#64748b' },
});
