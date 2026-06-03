import React, { useState } from 'react';
import { View, Text, StyleSheet, Pressable, TextInput, Alert, Platform } from 'react-native';
import { SessionExercise, ExerciseSet, SetType, estimateOneRepMax } from '@fitness-tracker/domain';
import { useWorkoutStore } from '../../stores/workoutStore';
import { useExerciseStore } from '../../stores/exerciseStore';
import { useProfileStore } from '../../stores/profileStore';
import { useHistoryStore } from '../../stores/historyStore';
import { PlateCalculatorModal } from './PlateCalculatorModal';
import { useTheme, Card, Button } from '@fitness-tracker/ui';
import { Ionicons } from '@expo/vector-icons';

interface Props {
  sessionExercise: SessionExercise;
}

export const SessionExerciseCard = ({ sessionExercise }: Props) => {
  const theme = useTheme();
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
    <Card 
      style={[
        styles.card, 
        sessionExercise.supersetGroup && { borderLeftColor: theme.colors.primary, borderLeftWidth: 4 }
      ]}
      padding="md"
    >
      {sessionExercise.supersetGroup && (
        <View style={styles.supersetHeader}>
          <Text style={[styles.supersetBadge, { color: theme.colors.primary, ...theme.typography.caption }]}>🔗 SUPERSET</Text>
        </View>
      )}
      <View style={styles.titleRow}>
        <View style={styles.titleCol}>
          <Text style={[styles.title, { color: theme.colors.text, ...theme.typography.heading, fontSize: 18 }]}>{exercise.name}</Text>
          {getPrevPerformanceText() && (
            <Text style={[styles.prevText, { color: theme.colors.muted, ...theme.typography.caption }]}>{getPrevPerformanceText()}</Text>
          )}
        </View>
        <View style={styles.headerIcons}>
          <Pressable onPress={() => setPlateCalcVisible(true)} style={styles.iconBtn}>
            <Ionicons name="barbell-outline" size={24} color={theme.colors.muted} />
          </Pressable>
          <Pressable onPress={handleToggleSuperset} style={styles.iconBtn}>
            <Ionicons name="link" size={24} color={sessionExercise.supersetGroup ? theme.colors.primary : theme.colors.muted} />
          </Pressable>
          <Pressable onPress={confirmDeleteExercise} style={styles.deleteExBtn}>
            <Ionicons name="trash-outline" size={20} color="#ef4444" />
          </Pressable>
        </View>
      </View>
      
      <View style={styles.headerRow}>
        <Text style={[styles.columnHeader, styles.setCol, { color: theme.colors.muted }]}>Set</Text>
        <Text style={[styles.columnHeader, styles.inputCol, { color: theme.colors.muted }]}>{isImperial ? 'lbs' : 'kg'}</Text>
        <Text style={[styles.columnHeader, styles.inputCol, { color: theme.colors.muted }]}>Reps</Text>
        {showRpe && <Text style={[styles.columnHeader, styles.inputCol, { color: theme.colors.muted }]}>RPE</Text>}
        {showRir && <Text style={[styles.columnHeader, styles.inputCol, { color: theme.colors.muted }]}>RIR</Text>}
        <Text style={[styles.columnHeader, styles.doneCol, { color: theme.colors.muted }]}>✓</Text>
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
        <Button 
          title="+ ADD SET" 
          variant="ghost" 
          onPress={() => addSet(sessionExercise.id)}
        />
        <Button 
          title="🔥 WARMUP" 
          variant="ghost" 
          onPress={handleWarmupCalc}
        />
      </View>

      <PlateCalculatorModal
        visible={plateCalcVisible}
        initialWeightKg={sessionExercise.sets[0]?.weight || 0}
        onClose={() => setPlateCalcVisible(false)}
      />
    </Card>
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
  const theme = useTheme();
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
        return <Text style={[styles.typeBadge, { backgroundColor: '#ffedd5', color: '#ea580c' }]}>W</Text>;
      case 'drop':
        return <Text style={[styles.typeBadge, { backgroundColor: '#f3e8ff', color: '#9333ea' }]}>D</Text>;
      case 'failure':
        return <Text style={[styles.typeBadge, { backgroundColor: '#fee2e2', color: '#dc2626' }]}>F</Text>;
      default:
        return <Text style={[styles.cell, { color: theme.colors.text }]}>{index + 1}</Text>;
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
          style={[styles.input, styles.inputCol, { color: theme.colors.text, backgroundColor: theme.colors.background }, isDone && { color: theme.colors.muted, backgroundColor: theme.colors.surface }]}
          keyboardType="numeric"
          value={getDisplayWeight()}
          onChangeText={handleWeightChange}
          placeholder="-"
          placeholderTextColor={theme.colors.muted}
        />
        <TextInput
          style={[styles.input, styles.inputCol, { color: theme.colors.text, backgroundColor: theme.colors.background }, isDone && { color: theme.colors.muted, backgroundColor: theme.colors.surface }]}
          keyboardType="numeric"
          value={set.reps ? set.reps.toString() : ''}
          onChangeText={(text) => onUpdate({ reps: parseInt(text, 10) || 0 })}
          placeholder="-"
          placeholderTextColor={theme.colors.muted}
        />
        {showRpe && (
          <TextInput
            style={[styles.input, styles.inputCol, { color: theme.colors.text, backgroundColor: theme.colors.background }, isDone && { color: theme.colors.muted, backgroundColor: theme.colors.surface }]}
            keyboardType="numeric"
            value={set.rpe ? set.rpe.toString() : ''}
            onChangeText={(text) => onUpdate({ rpe: parseFloat(text) || 0 })}
            placeholder="-"
            placeholderTextColor={theme.colors.muted}
          />
        )}
        {showRir && (
          <TextInput
            style={[styles.input, styles.inputCol, { color: theme.colors.text, backgroundColor: theme.colors.background }, isDone && { color: theme.colors.muted, backgroundColor: theme.colors.surface }]}
            keyboardType="numeric"
            value={set.rir !== undefined ? set.rir.toString() : ''}
            onChangeText={(text) => onUpdate({ rir: parseInt(text, 10) || 0 })}
            placeholder="-"
            placeholderTextColor={theme.colors.muted}
          />
        )}
        <Pressable 
          style={[styles.doneBtn, styles.doneCol, { backgroundColor: isDone ? theme.colors.primary : theme.colors.surface }]} 
          onPress={onComplete}
        >
          <Ionicons name="checkmark" size={20} color={isDone ? theme.colors.background : theme.colors.muted} />
        </Pressable>
      </View>
      {e1rm > 0 && (
        <View style={styles.e1rmRow}>
          <Text style={[styles.e1rmText, { color: theme.colors.muted }]}>e1RM: {e1rm.toFixed(1)} {isImperial ? 'lbs' : 'kg'}</Text>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    marginBottom: 16,
  },
  supersetHeader: {
    marginBottom: 6,
  },
  supersetBadge: {
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
    marginBottom: 2,
  },
  prevText: {
  },
  headerIcons: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  iconBtn: {
    padding: 4,
  },
  deleteExBtn: {
    padding: 4,
  },
  headerRow: {
    flexDirection: 'row',
    marginBottom: 8,
    paddingHorizontal: 4,
  },
  columnHeader: {
    fontSize: 12,
    fontWeight: '600',
    textAlign: 'center',
  },
  setCol: { width: 30, textAlign: 'center' },
  inputCol: { flex: 1, textAlign: 'center' },
  doneCol: { width: 44, textAlign: 'center' },
  
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
  input: {
    borderRadius: 8,
    marginHorizontal: 4,
    paddingVertical: 6,
    paddingHorizontal: 8,
    fontSize: 16,
    textAlign: 'center',
    fontWeight: '500',
    borderWidth: 1,
    borderColor: 'transparent',
  },
  doneBtn: {
    borderRadius: 8,
    height: 32,
    justifyContent: 'center',
    alignItems: 'center',
  },
  e1rmRow: {
    paddingLeft: 38,
    marginTop: 2,
    marginBottom: 4,
  },
  e1rmText: {
    fontSize: 10,
    fontStyle: 'italic',
  },
  footerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 8,
    paddingHorizontal: 4,
  },
});
