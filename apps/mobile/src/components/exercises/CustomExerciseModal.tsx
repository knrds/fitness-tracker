import React, { useState } from 'react';
import { Modal, View, Text, StyleSheet, TextInput, Pressable, SafeAreaView, ScrollView, Alert } from 'react-native';
import { useExerciseStore } from '../../stores/exerciseStore';
import { MuscleGroup, Equipment, MovementPattern } from '@fitness-tracker/domain';

interface Props {
  visible: boolean;
  onClose: () => void;
}

export const CustomExerciseModal = ({ visible, onClose }: Props) => {
  const { addCustomExercise } = useExerciseStore();
  const [name, setName] = useState('');
  const [instructions, setInstructions] = useState('');
  const [muscle, setMuscle] = useState<MuscleGroup | ''>('');
  const [equipment, setEq] = useState<Equipment | ''>('');

  const handleSave = () => {
    if (!name.trim()) return Alert.alert('Error', 'Name is required');
    if (!muscle) return Alert.alert('Error', 'Muscle group is required');
    if (!equipment) return Alert.alert('Error', 'Equipment is required');

    try {
      addCustomExercise({
        name: name.trim(),
        instructions: instructions.trim(),
        primaryMuscles: [muscle as MuscleGroup],
        secondaryMuscles: [],
        equipment: equipment as Equipment,
        movementPattern: MovementPattern.Isolation,
      });
      setName('');
      setInstructions('');
      setMuscle('');
      setEq('');
      onClose();
    } catch {
      Alert.alert('Error', 'Could not create exercise.');
    }
  };

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.title}>New Exercise</Text>
          <Pressable onPress={onClose} style={styles.closeBtn}>
            <Text style={styles.closeBtnText}>Cancel</Text>
          </Pressable>
        </View>
        
        <ScrollView style={styles.form} contentContainerStyle={styles.formContent}>
          <Text style={styles.label}>Name</Text>
          <TextInput 
            style={styles.input} 
            value={name} 
            onChangeText={setName} 
            placeholder="e.g. My Custom Lift" 
            placeholderTextColor="#94a3b8"
          />

          <Text style={styles.label}>Muscle Group</Text>
          <View style={styles.chipContainer}>
            {Object.values(MuscleGroup).map(m => (
              <Pressable key={m} style={[styles.chip, muscle === m && styles.chipActive]} onPress={() => setMuscle(m)}>
                <Text style={[styles.chipText, muscle === m && styles.chipTextActive]}>{m.replace(/_/g, ' ')}</Text>
              </Pressable>
            ))}
          </View>

          <Text style={styles.label}>Equipment</Text>
          <View style={styles.chipContainer}>
            {Object.values(Equipment).map(e => (
              <Pressable key={e} style={[styles.chip, equipment === e && styles.chipActive]} onPress={() => setEq(e)}>
                <Text style={[styles.chipText, equipment === e && styles.chipTextActive]}>{e.replace(/_/g, ' ')}</Text>
              </Pressable>
            ))}
          </View>

          <Text style={styles.label}>Instructions (Optional)</Text>
          <TextInput 
            style={[styles.input, styles.textArea]} 
            value={instructions} 
            onChangeText={setInstructions} 
            placeholder="Add notes..." 
            placeholderTextColor="#94a3b8"
            multiline 
          />

          <Pressable style={styles.saveBtn} onPress={handleSave}>
            <Text style={styles.saveBtnText}>Create Exercise</Text>
          </Pressable>
        </ScrollView>
      </SafeAreaView>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
    backgroundColor: '#ffffff',
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
    color: '#0f172a',
  },
  closeBtnText: {
    color: '#64748b',
    fontWeight: '600',
    fontSize: 16,
  },
  closeBtn: {
    padding: 4,
  },
  form: {
    flex: 1,
  },
  formContent: {
    padding: 16,
    paddingBottom: 40,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#334155',
    marginBottom: 8,
    marginTop: 16,
  },
  input: {
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 16,
    color: '#0f172a',
  },
  textArea: {
    height: 100,
    textAlignVertical: 'top',
  },
  chipContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  chip: {
    backgroundColor: '#e2e8f0',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 16,
  },
  chipActive: {
    backgroundColor: '#3b82f6',
  },
  chipText: {
    color: '#475569',
    fontSize: 14,
    fontWeight: '500',
    textTransform: 'capitalize',
  },
  chipTextActive: {
    color: '#ffffff',
  },
  saveBtn: {
    backgroundColor: '#10b981',
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 32,
  },
  saveBtnText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '700',
  },
});
