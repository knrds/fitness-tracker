import React, { useState } from 'react';
import { View, Text, StyleSheet, Pressable, TextInput, Alert, Platform } from 'react-native';
import { SessionExercise, ExerciseSet, SetType, estimateOneRepMax } from '@fitness-tracker/domain';
import { useWorkoutStore } from '../../stores/workoutStore';
import { useExerciseStore } from '../../stores/exerciseStore';
import { useProfileStore } from '../../stores/profileStore';
import { useHistoryStore } from '../../stores/historyStore';
import { PlateCalculatorModal } from './PlateCalculatorModal';

interface Props {
  sessionExercise: SessionExercise;
}

export const SessionExerciseCard = ({ sessionExercise }: Props) => {
  const { exercises } = useExerciseStore();
  const { addSet, updateSet, completeSet, removeExercise, removeSet, calculateWarmupSets, toggleSuperset } = useWorkoutStore();
  const { profile } = useProfileStore();
  const isImperial = profile.preferredUnits === 'imperial';

  const getPreviousPerformance = useHistoryStore(state => state.getPreviousPerformance);
  const lastPerformance = React.useMemo(() => getPreviousPerformance(sessionExercise.exerciseId), [getPreviousPerformance, sessionExercise.exerciseId]);
  const [plateCalcVisible, setPlateCalcVisible] = useState(false);

  const exercise = exercises.find(e => e.id === sessionExercise.exerciseId);
  if (!exercise) return null;

  const rpeMode = profile.rpeMode || 'always_on';
  const rirMode = profile.rirMode || 'always_on';
  const rpeEnabledExerciseIds = profile.rpeEnabledExerciseIds || [];
  const rirEnabledExerciseIds = profile.rirEnabledExerciseIds || [];

  const showRpe = rpeMode === 'always_on' || (rpeMode === 'selected_exercises' && rpeEnabledExerciseIds.includes(sessionExercise.exerciseId));
  const showRir = rirMode === 'always_on' || (rirMode === 'selected_exercises' && rirEnabledExerciseIds.includes(sessionExercise.exerciseId));

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

  const handleWarmupCalc = () => {
    const firstSetWithWeight = sessionExercise.sets.find(s => s.weight && s.weight > 0);
    if (!firstSetWithWeight) {
      const alertFn = Platform.OS === 'web' 
        ? (typeof globalThis !== 'undefined' && 'alert' in globalThis ? (globalThis as { alert?: (msg: string) => void }).alert : undefined)
        : Alert.alert;

      if (Platform.OS === 'web' && alertFn) {
        alertFn('Please enter weight in at least one set first.');
      } else {
        Alert.alert('Warmup Calculator', 'Please enter weight in at least one set first to use as target working weight.');
      }
      return;
    }

    const targetWeightKg = firstSetWithWeight.weight!;
    const targetWeightDisplay = isImperial ? targetWeightKg * 2.20462 : targetWeightKg;
    calculateWarmupSets(sessionExercise.id, targetWeightDisplay);
  };

  const getPrevPerformanceText = () => {
    if (!lastPerformance) return null;
    const dateStr = new Date(lastPerformance.date).toLocaleDateString(undefined, { day: '2-digit', month: '2-digit', year: '2-digit' });
    const setsStrUnits = lastPerformance.sets.map(s => {
      if (!s.weight) return `${s.reps} reps`;
      const weightDisplay = isImperial ? s.weight * 2.20462 : s.weight;
      const formattedWeight = weightDisplay.toFixed(1).replace(/\.0$/, '');
      const unit = isImperial ? 'lbs' : 'kg';
      return `${formattedWeight} ${unit} x ${s.reps}`;
    }).join(', ');

    return `Last: ${setsStrUnits} on ${dateStr}`;
  };

  const handleToggleSuperset = () => {
    const currentIdx = useWorkoutStore.getState().exercises.findIndex(ex => ex.id === sessionExercise.id);
    const totalEx = useWorkoutStore.getState().exercises.length;
    
    if (sessionExercise.supersetGroup) {
      toggleSuperset(sessionExercise.id);
      Alert.alert("Superset", "Exercise unlinked from superset.");
    } else {
      if (currentIdx === totalEx - 1) {
        Alert.alert(
          "Superset",
          "Supersets link this exercise with the next one. Please add another exercise first to create a superset."
        );
      } else {
        toggleSuperset(sessionExercise.id);
        const nextExId = useWorkoutStore.getState().exercises[currentIdx + 1]?.exerciseId;
        const nextEx = exercises.find(e => e.id === nextExId);
        Alert.alert(
          "Superset Created",
          `Linked this exercise with "${nextEx?.name || 'the next exercise'}" as a superset.`
        );
      }
    }
  };

  return (
    <View style={[styles.card, sessionExercise.supersetGroup ? styles.cardSuperset : null]}>
      {sessionExercise.supersetGroup && (
        <View style={styles.supersetHeader}>
          <Text style={styles.supersetBadge}>🔗 SUPERSET</Text>
        </View>
      )}
      <View style={styles.titleRow}>
        <View style={styles.titleCol}>
          <Text style={styles.title}>{exercise.name}</Text>
          {getPrevPerformanceText() && (
            <Text style={styles.prevText}>{getPrevPerformanceText()}</Text>
          )}
        </View>
        <View style={styles.headerIcons}>
          <Pressable onPress={() => setPlateCalcVisible(true)} style={styles.iconBtn}>
            <Text style={styles.iconText}>🏋️</Text>
          </Pressable>
          <Pressable onPress={handleToggleSuperset} style={styles.iconBtn}>
            <Text style={[styles.iconText, sessionExercise.supersetGroup && styles.iconTextLinked]}>
              {sessionExercise.supersetGroup ? '🔗' : '⛓️'}
            </Text>
          </Pressable>
          <Pressable onPress={confirmDeleteExercise} style={styles.deleteExBtn}>
            <Text style={styles.deleteExBtnText}>✕</Text>
          </Pressable>
        </View>
      </View>
      
      <View style={styles.headerRow}>
        <Text style={[styles.columnHeader, styles.setCol]}>Set</Text>
        <Text style={[styles.columnHeader, styles.inputCol]}>{isImperial ? 'lbs' : 'kg'}</Text>
        <Text style={[styles.columnHeader, styles.inputCol]}>Reps</Text>
        {showRpe && <Text style={[styles.columnHeader, styles.inputCol]}>RPE</Text>}
        {showRir && <Text style={[styles.columnHeader, styles.inputCol]}>RIR</Text>}
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
          showRpe={showRpe}
          showRir={showRir}
          exerciseName={exercise.name}
          onUpdate={(updates) => updateSet(sessionExercise.id, set.id, updates)}
          onComplete={() => completeSet(sessionExercise.id, set.id)}
          onDelete={() => removeSet(sessionExercise.id, set.id)}
        />
      ))}

      <View style={styles.footerRow}>
        <Pressable 
          style={styles.addSetBtn} 
          onPress={() => addSet(sessionExercise.id)}
        >
          <Text style={styles.addSetText}>+ Add Set</Text>
        </Pressable>
        <Pressable 
          style={styles.warmupBtn} 
          onPress={handleWarmupCalc}
        >
          <Text style={styles.warmupText}>🔥 Warmup Calculator</Text>
        </Pressable>
      </View>

      <PlateCalculatorModal
        visible={plateCalcVisible}
        initialWeightKg={sessionExercise.sets[0]?.weight || 0}
        onClose={() => setPlateCalcVisible(false)}
      />
    </View>
  );
};

interface SetRowProps {
  set: ExerciseSet;
  index: number;
  sessionExerciseId: string;
  isImperial: boolean;
  showRpe: boolean;
  showRir: boolean;
  exerciseName?: string;
  onUpdate: (updates: Partial<ExerciseSet>) => void;
  onComplete: () => void;
  onDelete: () => void;
}

const SetRow = ({ set, index, isImperial, showRpe, showRir, exerciseName, onUpdate, onComplete, onDelete }: SetRowProps) => {
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

  const cycleSetType = () => {
    if (isDone) return;
    const types: SetType[] = ['working', 'warmup', 'drop', 'failure'];
    const currentIdx = types.indexOf(set.type);
    const nextIdx = (currentIdx + 1) % types.length;
    const nextType = types[nextIdx]!;
    onUpdate({ type: nextType });
  };

  const getSetTypeBadge = () => {
    switch (set.type) {
      case 'warmup':
        return <Text style={[styles.typeBadge, styles.warmupBadge]}>W</Text>;
      case 'drop':
        return <Text style={[styles.typeBadge, styles.dropBadge]}>D</Text>;
      case 'failure':
        return <Text style={[styles.typeBadge, styles.failureBadge]}>F</Text>;
      default:
        return <Text style={styles.cell}>{index + 1}</Text>;
    }
  };

  // Real-time e1RM calculation
  const weightVal = set.weight || 0;
  const repsVal = set.reps || 0;
  const displayWeight = isImperial ? weightVal * 2.20462 : weightVal;
  const e1rm = estimateOneRepMax(displayWeight, repsVal, set.rpe, set.rir, exerciseName);

  return (
    <View style={styles.rowContainer}>
      <View style={[styles.row, isDone && styles.rowDone]}>
        <Pressable onPress={cycleSetType} disabled={isDone} style={[styles.setCol, styles.centerAlign]}>
          {getSetTypeBadge()}
        </Pressable>
        <TextInput
          style={[styles.input, styles.inputCol, isDone && styles.inputDone]}
          keyboardType="numeric"
          value={getDisplayWeight()}
          onChangeText={handleWeightChange}
          placeholder="-"
        />
        <TextInput
          style={[styles.input, styles.inputCol, isDone && styles.inputDone]}
          keyboardType="numeric"
          value={set.reps ? set.reps.toString() : ''}
          onChangeText={(text) => onUpdate({ reps: parseInt(text, 10) || 0 })}
          placeholder="-"
        />
        {showRpe && (
          <TextInput
            style={[styles.input, styles.inputCol, isDone && styles.inputDone]}
            keyboardType="numeric"
            value={set.rpe ? set.rpe.toString() : ''}
            onChangeText={(text) => onUpdate({ rpe: parseFloat(text) || 0 })}
            placeholder="-"
          />
        )}
        {showRir && (
          <TextInput
            style={[styles.input, styles.inputCol, isDone && styles.inputDone]}
            keyboardType="numeric"
            value={set.rir !== undefined ? set.rir.toString() : ''}
            onChangeText={(text) => onUpdate({ rir: parseInt(text, 10) || 0 })}
            placeholder="-"
          />
        )}
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
      {e1rm > 0 && (
        <View style={styles.e1rmRow}>
          <Text style={styles.e1rmText}>e1RM: {e1rm.toFixed(1)} {isImperial ? 'lbs' : 'kg'}</Text>
        </View>
      )}
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
    borderLeftWidth: 4,
    borderLeftColor: 'transparent',
  },
  cardSuperset: {
    borderLeftColor: '#3b82f6',
  },
  supersetHeader: {
    marginBottom: 6,
  },
  supersetBadge: {
    fontSize: 10,
    fontWeight: '800',
    color: '#3b82f6',
    letterSpacing: 0.5,
  },
  titleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  titleCol: {
    flex: 1,
    paddingRight: 8,
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
    color: '#0f172a',
  },
  prevText: {
    fontSize: 11,
    color: '#64748b',
    marginTop: 4,
    fontWeight: '500',
  },
  headerIcons: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  iconBtn: {
    padding: 4,
  },
  iconText: {
    fontSize: 16,
    opacity: 0.6,
  },
  iconTextLinked: {
    opacity: 1,
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
  
  rowContainer: {
    marginBottom: 8,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  rowDone: {
    opacity: 0.7,
  },
  cell: {
    fontSize: 16,
    fontWeight: '600',
    color: '#334155',
  },
  centerAlign: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  typeBadge: {
    fontSize: 12,
    fontWeight: '800',
    borderRadius: 6,
    width: 24,
    height: 24,
    textAlign: 'center',
    lineHeight: 24,
    overflow: 'hidden',
  },
  warmupBadge: {
    backgroundColor: '#ffedd5',
    color: '#ea580c',
  },
  dropBadge: {
    backgroundColor: '#f3e8ff',
    color: '#9333ea',
  },
  failureBadge: {
    backgroundColor: '#fee2e2',
    color: '#dc2626',
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
  e1rmRow: {
    paddingLeft: 38,
    marginTop: 2,
    marginBottom: 4,
  },
  e1rmText: {
    fontSize: 10,
    color: '#64748b',
    fontStyle: 'italic',
  },
  footerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 8,
    paddingHorizontal: 4,
  },
  addSetBtn: {
    paddingVertical: 8,
  },
  addSetText: {
    color: '#3b82f6',
    fontWeight: '600',
    fontSize: 14,
  },
  warmupBtn: {
    paddingVertical: 8,
  },
  warmupText: {
    color: '#ea580c',
    fontWeight: '600',
    fontSize: 14,
  },
});
