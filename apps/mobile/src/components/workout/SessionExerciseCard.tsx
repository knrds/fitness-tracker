import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, Pressable, TextInput, Alert, Platform, Modal, ScrollView } from 'react-native';
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
  const { exercises, persistentNotes, setPersistentNote } = useExerciseStore();
  const { addSet, updateSet, completeSet, removeExercise, removeSet, calculateWarmupSets, toggleSuperset, updateExerciseNotes } = useWorkoutStore();
  const { profile } = useProfileStore();
  const isImperial = profile.preferredUnits === 'imperial';

  const getPreviousPerformance = useHistoryStore(state => state.getPreviousPerformance);
  const lastPerformance = React.useMemo(() => getPreviousPerformance(sessionExercise.exerciseId), [getPreviousPerformance, sessionExercise.exerciseId]);
  const [plateCalcVisible, setPlateCalcVisible] = useState(false);
  const [infoModalVisible, setInfoModalVisible] = useState(false);

  const exercise = exercises.find(e => e.id === sessionExercise.exerciseId);
  if (!exercise) return null;

  const isCardio = exercise.movementPattern === 'cardio' || exercise.equipment === 'cardio_machine';

  const rpeMode = profile.rpeMode || 'always_on';
  const rirMode = profile.rirMode || 'always_on';
  const rpeEnabledExerciseIds = profile.rpeEnabledExerciseIds || [];
  const rirEnabledExerciseIds = profile.rirEnabledExerciseIds || [];

  const showRpe = !isCardio && (rpeMode === 'always_on' || (rpeMode === 'selected_exercises' && rpeEnabledExerciseIds.includes(sessionExercise.exerciseId)));
  const showRir = !isCardio && (rirMode === 'always_on' || (rirMode === 'selected_exercises' && rirEnabledExerciseIds.includes(sessionExercise.exerciseId)));

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
    const nonWarmupSets = lastPerformance.sets.filter(s => s.type !== 'warmup');
    if (nonWarmupSets.length === 0) return null;

    const setsStrUnits = nonWarmupSets.map(s => {
      if (isCardio) {
        const mins = Math.floor((s.durationSeconds || 0) / 60);
        const secs = (s.durationSeconds || 0) % 60;
        const durStr = `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
        return `Lvl ${s.weight || 0} for ${durStr}`;
      }
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

  // Calculate statistics for the (i) modal
  const sessionVolume = sessionExercise.sets.filter(s => s.completed && s.type !== 'warmup').reduce((acc, curr) => acc + (curr.weight || 0) * (curr.reps || 0), 0);

  const stats = React.useMemo(() => {
    const historySessions = useHistoryStore.getState().sessions;
    let maxWeight = 0;
    let totalWeight = 0;
    let completedSetsCount = 0;
    let lifetimeVolume = 0;

    historySessions.forEach(s => {
      s.exercises.forEach(ex => {
        if (ex.exerciseId === sessionExercise.exerciseId) {
          ex.sets.forEach(set => {
            if (set.completed && set.type !== 'warmup') {
              if (set.weight) {
                if (set.weight > maxWeight) maxWeight = set.weight;
                totalWeight += set.weight;
                completedSetsCount++;
                lifetimeVolume += set.weight * (set.reps || 0);
              }
            }
          });
        }
      });
    });

    const avgWeight = completedSetsCount > 0 ? totalWeight / completedSetsCount : 0;
    return { maxWeight, avgWeight, lifetimeVolume };
  }, [sessionExercise.exerciseId]);

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
          <Pressable onPress={() => setInfoModalVisible(true)} style={styles.iconBtn}>
            <Ionicons name="information-circle-outline" size={24} color={theme.colors.primary} />
          </Pressable>
          {!isCardio && (
            <Pressable onPress={() => setPlateCalcVisible(true)} style={styles.iconBtn}>
              <Ionicons name="barbell-outline" size={24} color={theme.colors.muted} />
            </Pressable>
          )}
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
        <Text style={[styles.columnHeader, styles.inputCol, { color: theme.colors.muted }]}>
          {isCardio ? 'Level' : (isImperial ? 'lbs' : 'kg')}
        </Text>
        <Text style={[styles.columnHeader, styles.inputCol, { color: theme.colors.muted }]}>
          {isCardio ? 'Min:Sec' : 'Reps'}
        </Text>
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
          isCardio={isCardio}
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
        {!isCardio && (
          <Button 
            title="🔥 WARMUP" 
            variant="ghost" 
            onPress={handleWarmupCalc}
          />
        )}
      </View>

      {/* Exercise Notes Section */}
      <View style={styles.notesSection}>
        <View style={styles.noteField}>
          <Text style={[styles.noteLabel, { color: theme.colors.muted }]}>📌 Sticky Note (Always Visible)</Text>
          <TextInput
            style={[styles.noteInput, { color: theme.colors.text, borderColor: theme.colors.border }]}
            value={persistentNotes[sessionExercise.exerciseId] || ''}
            onChangeText={(text) => setPersistentNote(sessionExercise.exerciseId, text)}
            placeholder="Log general tips, seat adjustments, etc."
            placeholderTextColor={theme.colors.muted}
          />
        </View>
        <View style={styles.noteField}>
          <Text style={[styles.noteLabel, { color: theme.colors.muted }]}>📝 Workout Note (This Session Only)</Text>
          <TextInput
            style={[styles.noteInput, { color: theme.colors.text, borderColor: theme.colors.border }]}
            value={sessionExercise.notes || ''}
            onChangeText={(text) => updateExerciseNotes(sessionExercise.id, text)}
            placeholder="How did this exercise feel today?"
            placeholderTextColor={theme.colors.muted}
          />
        </View>
      </View>

      <PlateCalculatorModal
        visible={plateCalcVisible}
        initialWeightKg={sessionExercise.sets[0]?.weight || 0}
        onClose={() => setPlateCalcVisible(false)}
      />

      {/* Exercise Info Modal */}
      <Modal visible={infoModalVisible} transparent animationType="fade" onRequestClose={() => setInfoModalVisible(false)}>
        <Pressable style={styles.modalOverlay} onPress={() => setInfoModalVisible(false)}>
          <Pressable style={[styles.modalCard, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]} onPress={(e) => e.stopPropagation()}>
            <Text style={[styles.modalTitle, { color: theme.colors.text, ...theme.typography.heading }]}>
              {exercise.name} Info
            </Text>
            
            {/* Stats */}
            <View style={styles.infoStatsGrid}>
              <View style={styles.infoStatBox}>
                <Text style={[styles.infoStatLabel, { color: theme.colors.muted }]}>Session Vol</Text>
                <Text style={[styles.infoStatValue, { color: theme.colors.primary }]}>
                  {isImperial ? Math.round(sessionVolume * 2.20462) : Math.round(sessionVolume)} {isImperial ? 'lbs' : 'kg'}
                </Text>
              </View>
              <View style={styles.infoStatBox}>
                <Text style={[styles.infoStatLabel, { color: theme.colors.muted }]}>Lifetime Vol</Text>
                <Text style={[styles.infoStatValue, { color: theme.colors.primary }]}>
                  {isImperial ? Math.round(stats.lifetimeVolume * 2.20462) : Math.round(stats.lifetimeVolume)} {isImperial ? 'lbs' : 'kg'}
                </Text>
              </View>
              <View style={styles.infoStatBox}>
                <Text style={[styles.infoStatLabel, { color: theme.colors.muted }]}>Personal Record</Text>
                <Text style={[styles.infoStatValue, { color: theme.colors.primary }]}>
                  {stats.maxWeight > 0 ? `${(isImperial ? stats.maxWeight * 2.20462 : stats.maxWeight).toFixed(1).replace(/\.0$/, '')} ${isImperial ? 'lbs' : 'kg'}` : '-'}
                </Text>
              </View>
              <View style={styles.infoStatBox}>
                <Text style={[styles.infoStatLabel, { color: theme.colors.muted }]}>Avg Weight</Text>
                <Text style={[styles.infoStatValue, { color: theme.colors.primary }]}>
                  {stats.avgWeight > 0 ? `${(isImperial ? stats.avgWeight * 2.20462 : stats.avgWeight).toFixed(1).replace(/\.0$/, '')} ${isImperial ? 'lbs' : 'kg'}` : '-'}
                </Text>
              </View>
            </View>

            {/* Previous Performance */}
            <Text style={[styles.infoSubtitle, { color: theme.colors.text, marginTop: 16, marginBottom: 8 }]}>
              Previous Sets (No Warmups)
            </Text>
            <ScrollView style={{ maxHeight: 150 }} showsVerticalScrollIndicator={false}>
              {lastPerformance && lastPerformance.sets.filter(s => s.type !== 'warmup').length > 0 ? (
                lastPerformance.sets.filter(s => s.type !== 'warmup').map((s, sIdx) => {
                  if (isCardio) {
                    const mins = Math.floor((s.durationSeconds || 0) / 60);
                    const secs = (s.durationSeconds || 0) % 60;
                    const durStr = `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
                    return (
                      <Text key={s.id || sIdx} style={[styles.infoSetRow, { color: theme.colors.text }]}>
                        Set {sIdx + 1}: Level {s.weight || 0} for {durStr}
                      </Text>
                    );
                  }
                  const w = s.weight ? (isImperial ? s.weight * 2.20462 : s.weight).toFixed(1).replace(/\.0$/, '') : '-';
                  const unit = s.weight ? (isImperial ? 'lbs' : 'kg') : '';
                  return (
                    <Text key={s.id || sIdx} style={[styles.infoSetRow, { color: theme.colors.text }]}>
                      Set {sIdx + 1}: {w} {unit} x {s.reps} reps {s.rpe ? `(RPE ${s.rpe})` : ''}
                    </Text>
                  );
                })
              ) : (
                <Text style={{ color: theme.colors.muted, fontStyle: 'italic', textAlign: 'center', marginVertical: 10 }}>
                  No previous working sets.
                </Text>
              )}
            </ScrollView>

            <Pressable
              style={[styles.modalCloseBtn, { backgroundColor: theme.colors.primary, borderRadius: theme.radius.md, marginTop: 20 }]}
              onPress={() => setInfoModalVisible(false)}
            >
              <Text style={[styles.modalCloseBtnText, { color: theme.colors.background, ...theme.typography.button }]}>
                Close
              </Text>
            </Pressable>
          </Pressable>
        </Pressable>
      </Modal>
    </Card>
  );
};

interface SetRowProps {
  set: ExerciseSet;
  index: number;
  sessionExerciseId: string;
  isImperial: boolean;
  isCardio: boolean;
  showRpe: boolean;
  showRir: boolean;
  exerciseName?: string;
  onUpdate: (updates: Partial<ExerciseSet>) => void;
  onComplete: () => void;
  onDelete: () => void;
}

const SetRow = ({ set, index, isImperial, isCardio, showRpe, showRir, exerciseName, onUpdate, onComplete }: SetRowProps) => {
  const theme = useTheme();
  const isDone = set.completed;

  // Format Level (unconverted weight for cardio) or normal weight
  const getDisplayWeight = () => {
    if (!set.weight) return '';
    if (isCardio) return set.weight.toString();
    if (isImperial) {
      const lbs = set.weight * 2.20462;
      return lbs.toFixed(1).replace(/\.0$/, '');
    }
    return set.weight.toString();
  };

  const handleWeightChange = (text: string) => {
    const val = parseFloat(text) || 0;
    if (isCardio) {
      onUpdate({ weight: val });
    } else {
      onUpdate({ weight: isImperial ? val / 2.20462 : val });
    }
  };

  // Format Duration for cardio
  const formatSecondsToMMSS = (totalSecs?: number) => {
    if (!totalSecs) return '';
    const mins = Math.floor(totalSecs / 60);
    const secs = totalSecs % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const parseMMSSToSeconds = (text: string) => {
    if (!text.trim()) return 0;
    const parts = text.split(':');
    if (parts.length === 2) {
      const mins = parseInt(parts[0]!, 10) || 0;
      const secs = parseInt(parts[1]!, 10) || 0;
      return mins * 60 + secs;
    }
    const val = parseInt(text, 10) || 0;
    return val * 60;
  };

  const [durationStr, setDurationStr] = useState(formatSecondsToMMSS(set.durationSeconds));

  useEffect(() => {
    setDurationStr(formatSecondsToMMSS(set.durationSeconds));
  }, [set.durationSeconds]);

  const handleDurationChange = (text: string) => {
    setDurationStr(text);
    const secs = parseMMSSToSeconds(text);
    onUpdate({ durationSeconds: secs });
  };

  const cycleSetType = () => {
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

  // Real-time e1RM calculation (only for non-cardio)
  const weightVal = set.weight || 0;
  const repsVal = set.reps || 0;
  const displayWeight = isImperial ? weightVal * 2.20462 : weightVal;
  const e1rm = isCardio ? 0 : estimateOneRepMax(displayWeight, repsVal, set.rpe, set.rir, exerciseName);

  return (
    <View style={styles.rowContainer}>
      <View style={[styles.row, isDone && { borderColor: theme.colors.primary, backgroundColor: 'rgba(144, 213, 255, 0.07)' }]}>
        <Pressable onPress={cycleSetType} style={[styles.setCol, styles.centerAlign]}>
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
        {isCardio ? (
          <TextInput
            style={[styles.input, styles.inputCol, { color: theme.colors.text, backgroundColor: theme.colors.background }, isDone && { color: theme.colors.muted, backgroundColor: theme.colors.surface }]}
            value={durationStr}
            onChangeText={handleDurationChange}
            placeholder="00:00"
            placeholderTextColor={theme.colors.muted}
          />
        ) : (
          <TextInput
            style={[styles.input, styles.inputCol, { color: theme.colors.text, backgroundColor: theme.colors.background }, isDone && { color: theme.colors.muted, backgroundColor: theme.colors.surface }]}
            keyboardType="numeric"
            value={set.reps ? set.reps.toString() : ''}
            onChangeText={(text) => onUpdate({ reps: parseInt(text, 10) || 0 })}
            placeholder="-"
            placeholderTextColor={theme.colors.muted}
          />
        )}
        {showRpe && (
          <TextInput
            style={[styles.input, styles.inputCol, { color: theme.colors.text, backgroundColor: theme.colors.background, borderColor: theme.colors.border }, isDone && { color: theme.colors.muted, backgroundColor: theme.colors.surface }]}
            keyboardType="numeric"
            value={set.rpe ? set.rpe.toString() : ''}
            onChangeText={(text) => onUpdate({ rpe: parseFloat(text) || 0 })}
            placeholder="-"
            placeholderTextColor={theme.colors.muted}
          />
        )}
        {showRir && (
          <TextInput
            style={[styles.input, styles.inputCol, { color: theme.colors.text, backgroundColor: theme.colors.background, borderColor: theme.colors.border }, isDone && { color: theme.colors.muted, backgroundColor: theme.colors.surface }]}
            keyboardType="numeric"
            value={set.rir !== undefined ? set.rir.toString() : ''}
            onChangeText={(text) => onUpdate({ rir: parseInt(text, 10) || 0 })}
            placeholder="-"
            placeholderTextColor={theme.colors.muted}
          />
        )}
        <Pressable 
          style={[styles.doneBtn, styles.doneCol, { backgroundColor: isDone ? theme.colors.primary : theme.colors.background, borderWidth: 1, borderColor: isDone ? theme.colors.primary : theme.colors.border }]}
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
    borderWidth: 1,
    borderColor: 'transparent',
    borderRadius: 10,
    paddingVertical: 4,
    paddingHorizontal: 2,
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
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(11, 11, 15, 0.85)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  modalCard: {
    borderWidth: 1,
    padding: 24,
    width: '100%',
    maxWidth: 400,
    borderRadius: 16,
  },
  modalTitle: {
    fontSize: 20,
    marginBottom: 16,
    textAlign: 'center',
  },
  infoStatsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: 16,
  },
  infoStatBox: {
    flex: 1,
    minWidth: '45%',
    backgroundColor: 'rgba(144, 213, 255, 0.05)',
    borderRadius: 8,
    padding: 10,
    alignItems: 'center',
  },
  infoStatLabel: {
    fontSize: 10,
    fontFamily: 'SpaceGrotesk_600SemiBold',
    textTransform: 'uppercase',
    marginBottom: 4,
  },
  infoStatValue: {
    fontSize: 14,
    fontFamily: 'SpaceGrotesk_700Bold',
  },
  infoSubtitle: {
    fontSize: 14,
    fontFamily: 'SpaceGrotesk_700Bold',
    textTransform: 'uppercase',
  },
  infoSetRow: {
    fontFamily: 'Manrope_500Medium',
    fontSize: 13,
    paddingVertical: 4,
  },
  modalCloseBtn: {
    height: 48,
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
  },
  modalCloseBtnText: {
    fontSize: 14,
  },
  notesSection: {
    marginTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#2A2B31',
    paddingTop: 12,
    gap: 10,
  },
  noteField: {
    flexDirection: 'column',
  },
  noteLabel: {
    fontSize: 10,
    fontFamily: 'SpaceGrotesk_600SemiBold',
    textTransform: 'uppercase',
    marginBottom: 4,
  },
  noteInput: {
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 8,
    fontSize: 13,
    fontFamily: 'Manrope_500Medium',
    backgroundColor: '#0B0B0F',
  },
});
