import React, { useState } from 'react';
import { View, Text, StyleSheet, TextInput, ScrollView, Pressable } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useProgramStore } from '../../src/stores/programStore';
import { useExerciseStore } from '../../src/stores/exerciseStore';
import { ExercisePickerModal } from '../../src/components/workout/ExercisePickerModal';
import { useTheme } from '@fitness-tracker/ui';
import { TemplateExercise } from '@fitness-tracker/domain';
import * as Crypto from 'expo-crypto';

export default function WorkoutTemplateBuilderScreen() {
  const router = useRouter();
  const theme = useTheme();
  const { programId, templateId, dayOfWeek, week } = useLocalSearchParams<{ programId?: string, templateId?: string, dayOfWeek?: string, week?: string }>();
  
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
      <View style={styles.centered}><Text style={{ color: '#F4F5F7' }}>Program not found.</Text></View>
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
        const targetWeek = week ? parseInt(week, 10) : 1;
        const newWorkout = {
          id: Crypto.randomUUID(),
          templateId: newTemplateId,
          dayOfWeek: parseInt(dayOfWeek, 10),
          week: targetWeek,
          order: program.workouts.filter(w => w.dayOfWeek === parseInt(dayOfWeek) && w.week === targetWeek).length,
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

  const adjustSets = (id: string, currentSets: number, amount: number) => {
    const nextSets = Math.max(1, currentSets + amount);
    updateTemplateExercise(id, { targetSets: nextSets });
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <View style={[styles.header, { backgroundColor: theme.colors.surface, borderBottomColor: theme.colors.border }]}>
        <Pressable onPress={() => router.back()} hitSlop={15} style={styles.backBtn}>
          <Ionicons name="chevron-back" size={24} color={theme.colors.primary} />
        </Pressable>
        <Text style={[styles.headerTitle, { color: theme.colors.text }]}>
          {existingTemplate ? 'Edit Workout' : 'New Workout'}
        </Text>
        <Pressable onPress={handleSave} style={[styles.saveBtn, { backgroundColor: theme.colors.primary }]}>
          <Text style={[styles.saveBtnText, { color: theme.colors.background }]}>Save</Text>
        </Pressable>
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.label}>Workout Name</Text>
        <TextInput 
          style={styles.input} 
          value={name} 
          onChangeText={setName} 
          placeholder="e.g. Push Day" 
          placeholderTextColor="#8A8D9F"
        />

        <Text style={styles.label}>Description</Text>
        <TextInput 
          style={styles.input} 
          value={description} 
          onChangeText={setDescription} 
          placeholder="e.g. Focused on chest and triceps" 
          placeholderTextColor="#8A8D9F"
        />
        
        <Text style={styles.sectionTitle}>Exercises</Text>
        {templateExercises.map((te, index) => {
          const ex = exercises.find(e => e.id === te.exerciseId);
          return (
            <View key={te.id} style={[styles.exerciseCard, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}>
              <View style={styles.exHeader}>
                <Text style={[styles.exName, { color: theme.colors.text }]}>
                  {index + 1}. {ex?.name || 'Unknown'}
                </Text>
                <Pressable onPress={() => removeExercise(te.id)} hitSlop={10}>
                  <Ionicons name="trash-outline" size={20} color="#ef4444" />
                </Pressable>
              </View>

              {/* Table Column Headers */}
              <View style={styles.tableHeaderRow}>
                <Text style={[styles.tableColHeader, styles.setCol, { color: theme.colors.muted }]}>Sets</Text>
                <Text style={[styles.tableColHeader, styles.inputCol, { color: theme.colors.muted }]}>kg</Text>
                <Text style={[styles.tableColHeader, styles.inputCol, { color: theme.colors.muted }]}>Reps</Text>
                <Text style={[styles.tableColHeader, styles.inputCol, { color: theme.colors.muted }]}>RPE</Text>
              </View>

              {/* Redesigned Template Set Row (Visual Match to Active Workout SetRow) */}
              <View style={styles.tableRow}>
                {/* Sets adjust control */}
                <View style={[styles.setCol, styles.setsAdjustContainer]}>
                  <Pressable onPress={() => adjustSets(te.id, te.targetSets, -1)} style={styles.adjustBtn} hitSlop={5}>
                    <Text style={styles.adjustBtnText}>-</Text>
                  </Pressable>
                  <Text style={[styles.setsCountText, { color: theme.colors.text }]}>{te.targetSets}</Text>
                  <Pressable onPress={() => adjustSets(te.id, te.targetSets, 1)} style={styles.adjustBtn} hitSlop={5}>
                    <Text style={styles.adjustBtnText}>+</Text>
                  </Pressable>
                </View>

                {/* Target Weight input */}
                <TextInput 
                  style={[styles.inputField, styles.inputCol, { color: theme.colors.text, backgroundColor: theme.colors.background, borderColor: theme.colors.border }]} 
                  value={te.targetWeight ? te.targetWeight.toString() : ''} 
                  onChangeText={t => updateTemplateExercise(te.id, { targetWeight: parseFloat(t) || 0 })}
                  keyboardType="numeric"
                  placeholder="-"
                  placeholderTextColor={theme.colors.muted}
                />

                {/* Target Reps input */}
                <TextInput 
                  style={[styles.inputField, styles.inputCol, { color: theme.colors.text, backgroundColor: theme.colors.background, borderColor: theme.colors.border }]} 
                  value={te.targetReps ? te.targetReps.toString() : ''} 
                  onChangeText={t => updateTemplateExercise(te.id, { targetReps: parseInt(t, 10) || 1 })}
                  keyboardType="numeric"
                  placeholder="-"
                  placeholderTextColor={theme.colors.muted}
                />

                {/* Target RPE input */}
                <TextInput 
                  style={[styles.inputField, styles.inputCol, { color: theme.colors.text, backgroundColor: theme.colors.background, borderColor: theme.colors.border }]} 
                  value={te.targetRpe ? te.targetRpe.toString() : ''} 
                  onChangeText={t => updateTemplateExercise(te.id, { targetRpe: parseFloat(t) || 0 })}
                  keyboardType="numeric"
                  placeholder="-"
                  placeholderTextColor={theme.colors.muted}
                />
              </View>
            </View>
          );
        })}

        <Pressable style={[styles.addExBtn, { borderColor: theme.colors.border }]} onPress={() => setExerciseModalVisible(true)}>
          <Text style={[styles.addExText, { color: theme.colors.primary }]}>+ Add Exercise</Text>
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
    paddingHorizontal: 16,
    paddingVertical: 12,
    alignItems: 'center',
    borderBottomWidth: 1,
    paddingTop: 50,
  },
  backBtn: {
    padding: 4,
  },
  headerTitle: { fontSize: 18, fontFamily: 'SpaceGrotesk_700Bold', textTransform: 'uppercase' },
  saveBtn: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 8 },
  saveBtnText: { fontFamily: 'SpaceGrotesk_700Bold' },
  content: { padding: 16, paddingBottom: 40 },
  label: { fontSize: 14, fontFamily: 'SpaceGrotesk_600SemiBold', color: '#8A8D9F', marginBottom: 8, textTransform: 'uppercase' },
  input: {
    backgroundColor: '#1A1C23',
    borderWidth: 1,
    borderColor: '#2A2B31',
    borderRadius: 12,
    padding: 12,
    fontSize: 16,
    fontFamily: 'Manrope_500Medium',
    color: '#F4F5F7',
    marginBottom: 16,
  },
  sectionTitle: { fontSize: 18, fontFamily: 'SpaceGrotesk_700Bold', color: '#90D5FF', marginBottom: 16, textTransform: 'uppercase' },
  exerciseCard: {
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
  },
  exHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 16, alignItems: 'center' },
  exName: { fontSize: 16, fontFamily: 'SpaceGrotesk_700Bold' },
  
  tableHeaderRow: {
    flexDirection: 'row',
    marginBottom: 8,
    paddingHorizontal: 2,
  },
  tableColHeader: {
    fontSize: 12,
    fontWeight: '600',
    textAlign: 'center',
  },
  setCol: { width: 90, textAlign: 'center' },
  inputCol: { flex: 1, textAlign: 'center' },
  
  tableRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  setsAdjustContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  adjustBtn: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#2A2B31',
    justifyContent: 'center',
    alignItems: 'center',
  },
  adjustBtnText: {
    color: '#F4F5F7',
    fontSize: 14,
    fontWeight: 'bold',
    lineHeight: 18,
  },
  setsCountText: {
    fontFamily: 'SpaceGrotesk_700Bold',
    fontSize: 16,
    width: 20,
    textAlign: 'center',
  },
  inputField: {
    borderRadius: 8,
    marginHorizontal: 4,
    paddingVertical: 6,
    paddingHorizontal: 8,
    fontSize: 16,
    textAlign: 'center',
    fontWeight: '500',
    borderWidth: 1,
  },
  addExBtn: {
    backgroundColor: 'transparent',
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
    borderWidth: 1,
    borderStyle: 'dashed',
  },
  addExText: { fontFamily: 'SpaceGrotesk_700Bold', fontSize: 16, textTransform: 'uppercase' },
});
