import React from 'react';
import { View, Text, StyleSheet, Pressable, TextInput, Alert, Platform } from 'react-native';
import { SessionExercise, ExerciseSet } from '@fitness-tracker/domain';
import { useWorkoutStore } from '../../stores/workoutStore';
import { useExerciseStore } from '../../stores/exerciseStore';
import { useProfileStore } from '../../stores/profileStore';

interface Props {
  sessionExercise: SessionExercise;
}

export const SessionExerciseCard = ({ sessionExercise }: Props) => {
  const { exercises } = useExerciseStore();
  const { addSet, updateSet, completeSet, removeExercise, removeSet } = useWorkoutStore();
  const { profile } = useProfileStore();
  const isImperial = profile.preferredUnits === 'imperial';
  
  const exercise = exercises.find(e => e.id === sessionExercise.exerciseId);
  if (!exercise) return null;

  const confirmDeleteExercise = () => {
    if (Platform.OS === 'web') {
      if (typeof globalThis !== 'undefined' && 'confirm' in globalThis) {
        const confirmFn = (globalThis as { confirm?: (msg: string) => boolean }).confirm;
        if (confirmFn?.("Are you sure you want to remove this exercise and all its sets?")) {
          removeExercise(sessionExercise.id);
        }
      }
      return;
    }

    Alert.alert(
      "Remove Exercise",
      "Are you sure you want to remove this exercise and all its sets?",
      [
        { text: "Cancel", style: "cancel" },
        { text: "Remove", style: "destructive", onPress: () => removeExercise(sessionExercise.id) }
      ]
    );
  };

  return (
    <View style={styles.card}>
      <View style={styles.titleRow}>
        <Text style={styles.title}>{exercise.name}</Text>
        <Pressable onPress={confirmDeleteExercise} style={styles.deleteExBtn}>
          <Text style={styles.deleteExBtnText}>✕</Text>
        </Pressable>
      </View>
      
      <View style={styles.headerRow}>
        <Text style={[styles.columnHeader, styles.setCol]}>Set</Text>
        <Text style={[styles.columnHeader, styles.inputCol]}>{isImperial ? 'lbs' : 'kg'}</Text>
        <Text style={[styles.columnHeader, styles.inputCol]}>Reps</Text>
        <Text style={[styles.columnHeader, styles.inputCol]}>RPE</Text>
        <Text style={[styles.columnHeader, styles.doneCol]}>✓</Text>
        <Text style={[styles.columnHeader, styles.delCol]}></Text>
      </View>

      {sessionExercise.sets.map((set, idx) => (
        <SetRow 
          key={set.id} 
          set={set} 
          index={idx}
          sessionExerciseId={sessionExercise.id}
          isImperial={isImperial}
          onUpdate={(updates) => updateSet(sessionExercise.id, set.id, updates)}
          onComplete={() => completeSet(sessionExercise.id, set.id)}
          onDelete={() => removeSet(sessionExercise.id, set.id)}
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
  isImperial: boolean;
  onUpdate: (updates: Partial<ExerciseSet>) => void;
  onComplete: () => void;
  onDelete: () => void;
}

const SetRow = ({ set, index, isImperial, onUpdate, onComplete, onDelete }: SetRowProps) => {
  const isDone = set.completed;
  
  // Format the display weight for imperial, round/clean it up
  const getDisplayWeight = () => {
    if (!set.weight) return '';
    if (isImperial) {
      const lbs = set.weight * 2.20462;
      return lbs.toFixed(1).replace(/\.0$/, '');
    }
    return set.weight.toString();
  };

  const handleWeightChange = (text: string) => {
    const val = parseFloat(text) || 0;
    onUpdate({ weight: isImperial ? val / 2.20462 : val });
  };
  
  return (
    <View style={[styles.row, isDone && styles.rowDone]}>
      <Text style={[styles.cell, styles.setCol]}>{index + 1}</Text>
      <TextInput
        style={[styles.input, styles.inputCol, isDone && styles.inputDone]}
        keyboardType="numeric"
        value={getDisplayWeight()}
        onChangeText={handleWeightChange}
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
      <Pressable style={[styles.deleteSetBtn, styles.delCol]} onPress={onDelete}>
        <Text style={styles.deleteSetBtnText}>✕</Text>
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
  titleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
    color: '#0f172a',
    flex: 1,
  },
  deleteExBtn: {
    padding: 4,
  },
  deleteExBtnText: {
    fontSize: 18,
    color: '#ef4444',
    fontWeight: '700',
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
  setCol: { width: 30, textAlign: 'center' },
  inputCol: { flex: 1, textAlign: 'center' },
  doneCol: { width: 44, textAlign: 'center' },
  delCol: { width: 32, textAlign: 'center' },
  
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
  deleteSetBtn: {
    height: 32,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 4,
  },
  deleteSetBtnText: {
    color: '#ef4444',
    fontSize: 16,
    fontWeight: '700',
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
