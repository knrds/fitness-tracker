import React from 'react';
import { View, Text, StyleSheet, Pressable, TextInput } from 'react-native';
import { SessionExercise, ExerciseSet } from '@fitness-tracker/domain';
import { useWorkoutStore } from '../../stores/workoutStore';
import { useExerciseStore } from '../../stores/exerciseStore';

interface Props {
  sessionExercise: SessionExercise;
}

export const SessionExerciseCard = ({ sessionExercise }: Props) => {
  const { exercises } = useExerciseStore();
  const { addSet, updateSet, completeSet } = useWorkoutStore();
  
  const exercise = exercises.find(e => e.id === sessionExercise.exerciseId);
  if (!exercise) return null;

  return (
    <View style={styles.card}>
      <Text style={styles.title}>{exercise.name}</Text>
      
      <View style={styles.headerRow}>
        <Text style={[styles.columnHeader, styles.setCol]}>Set</Text>
        <Text style={[styles.columnHeader, styles.inputCol]}>kg</Text>
        <Text style={[styles.columnHeader, styles.inputCol]}>Reps</Text>
        <Text style={[styles.columnHeader, styles.inputCol]}>RPE</Text>
        <Text style={[styles.columnHeader, styles.doneCol]}>✓</Text>
      </View>

      {sessionExercise.sets.map((set, idx) => (
        <SetRow 
          key={set.id} 
          set={set} 
          index={idx}
          sessionExerciseId={sessionExercise.id}
          onUpdate={(updates) => updateSet(sessionExercise.id, set.id, updates)}
          onComplete={() => completeSet(sessionExercise.id, set.id)}
        />
      ))}

      <Pressable 
        style={styles.addSetBtn} 
        onPress={() => addSet(sessionExercise.id, { weight: 0, reps: 0 })}
      >
        <Text style={styles.addSetText}>+ Add Set</Text>
      </Pressable>
    </View>
  );
};

interface SetRowProps {
  set: ExerciseSet;
  index: number;
  sessionExerciseId: string;
  onUpdate: (updates: Partial<ExerciseSet>) => void;
  onComplete: () => void;
}

const SetRow = ({ set, index, onUpdate, onComplete }: SetRowProps) => {
  const isDone = set.completed;
  
  return (
    <View style={[styles.row, isDone && styles.rowDone]}>
      <Text style={[styles.cell, styles.setCol]}>{index + 1}</Text>
      <TextInput
        style={[styles.input, styles.inputCol, isDone && styles.inputDone]}
        keyboardType="numeric"
        value={set.weight ? set.weight.toString() : ''}
        onChangeText={(text) => onUpdate({ weight: parseFloat(text) || 0 })}
        editable={!isDone}
        placeholder="-"
      />
      <TextInput
        style={[styles.input, styles.inputCol, isDone && styles.inputDone]}
        keyboardType="numeric"
        value={set.reps ? set.reps.toString() : ''}
        onChangeText={(text) => onUpdate({ reps: parseInt(text, 10) || 0 })}
        editable={!isDone}
        placeholder="-"
      />
      <TextInput
        style={[styles.input, styles.inputCol, isDone && styles.inputDone]}
        keyboardType="numeric"
        value={set.rpe ? set.rpe.toString() : ''}
        onChangeText={(text) => onUpdate({ rpe: parseFloat(text) || 0 })}
        editable={!isDone}
        placeholder="-"
      />
      <Pressable 
        style={[styles.doneBtn, styles.doneCol, isDone && styles.doneBtnActive]} 
        onPress={onComplete}
      >
        <Text style={[styles.doneBtnText, isDone && styles.doneBtnTextActive]}>✓</Text>
      </Pressable>
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
    color: '#0f172a',
    marginBottom: 16,
  },
  headerRow: {
    flexDirection: 'row',
    marginBottom: 8,
    paddingHorizontal: 4,
  },
  columnHeader: {
    fontSize: 12,
    fontWeight: '600',
    color: '#64748b',
    textAlign: 'center',
  },
  setCol: { width: 40, textAlign: 'center' },
  inputCol: { flex: 1, textAlign: 'center' },
  doneCol: { width: 48, textAlign: 'center' },
  
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  rowDone: {
    opacity: 0.7,
  },
  cell: {
    fontSize: 16,
    fontWeight: '600',
    color: '#334155',
  },
  input: {
    backgroundColor: '#f1f5f9',
    borderRadius: 8,
    marginHorizontal: 4,
    paddingVertical: 6,
    paddingHorizontal: 8,
    fontSize: 16,
    textAlign: 'center',
    color: '#0f172a',
    fontWeight: '500',
  },
  inputDone: {
    backgroundColor: '#e2e8f0',
    color: '#64748b',
  },
  doneBtn: {
    backgroundColor: '#e2e8f0',
    borderRadius: 8,
    height: 32,
    justifyContent: 'center',
    alignItems: 'center',
  },
  doneBtnActive: {
    backgroundColor: '#22c55e',
  },
  doneBtnText: {
    color: '#64748b',
    fontWeight: '700',
  },
  doneBtnTextActive: {
    color: '#ffffff',
  },
  addSetBtn: {
    marginTop: 8,
    paddingVertical: 8,
    alignItems: 'center',
  },
  addSetText: {
    color: '#3b82f6',
    fontWeight: '600',
    fontSize: 14,
  },
});
