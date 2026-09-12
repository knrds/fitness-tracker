import { scopedAlert as Alert } from '../../utils/scopedAlert';
import React, { useState, useEffect } from 'react';
import { useRouter } from 'expo-router';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  TextInput,
  Platform,
  Modal,
  ScrollView,
  ViewProps,
  LayoutChangeEvent,
  ViewStyle,
  Dimensions,
  Animated,
  PanResponder,
} from 'react-native';
import * as Haptics from 'expo-haptics';
import {
  SessionExercise,
  ExerciseSet,
  SetType,
  estimateOneRepMax,
  summarizeSessionExercise,
} from '@fitness-tracker/domain';
import { useWorkoutStore } from '../../stores/workoutStore';
import { useExerciseStore } from '../../stores/exerciseStore';
import { useProfileStore } from '../../stores/profileStore';
import { useHistoryStore } from '../../stores/historyStore';
import { PlateCalculatorModal } from './PlateCalculatorModal';
import { useTheme, Card, useDialog } from '@fitness-tracker/ui';
import { Ionicons } from '@expo/vector-icons';

const secondsToDigitString = (totalSecs?: number) => {
  if (!totalSecs) return '';
  const h = Math.floor(totalSecs / 3600);
  const m = Math.floor((totalSecs % 3600) / 60);
  const s = totalSecs % 60;
  if (h > 0) {
    return `${h}${m.toString().padStart(2, '0')}${s.toString().padStart(2, '0')}`;
  }
  if (m > 0) {
    return `${m}${s.toString().padStart(2, '0')}`;
  }
  return `${s}`;
};

const parseDigitsToSeconds = (digits: string) => {
  const num = digits.replace(/\D/g, '');
  if (!num) return 0;
  if (num.length <= 2) {
    return parseInt(num, 10);
  }
  if (num.length <= 4) {
    const secs = parseInt(num.slice(-2), 10);
    const mins = parseInt(num.slice(0, -2), 10);
    return mins * 60 + secs;
  }
  const secs = parseInt(num.slice(-2), 10);
  const mins = parseInt(num.slice(-4, -2), 10);
  const hrs = parseInt(num.slice(0, -4), 10);
  return hrs * 3600 + mins * 60 + secs;
};

const formatSecondsToDisplay = (totalSecs?: number) => {
  if (!totalSecs) return '';
  const h = Math.floor(totalSecs / 3600);
  const m = Math.floor((totalSecs % 3600) / 60);
  const s = totalSecs % 60;
  if (h > 0) {
    return `${h}h ${m}m ${s > 0 ? `${s}s` : ''}`.trim();
  }
  if (m > 0) {
    return `${m}:${s.toString().padStart(2, '0')}`;
  }
  return `${s}s`;
};

interface Props {
  sessionExercise: SessionExercise;
  collapsed?: boolean;
  dragHandlers?: ViewProps;
  onDragStart?: () => void;
  onDragEnd?: () => void;
  isDragging?: boolean;
  onSwipeStart?: () => void;
  onSwipeEnd?: () => void;
}

export const SessionExerciseCard = ({
  sessionExercise,
  collapsed = false,
  dragHandlers,
  onDragStart,
  onDragEnd,
  isDragging: _isDragging = false,
  onSwipeStart,
  onSwipeEnd,
}: Props) => {
  const theme = useTheme();
  const router = useRouter();
  const navigateToInstructions = () => {
    router.push(`/exercise/${sessionExercise.exerciseId}`);
  };
  const { showConfirm } = useDialog();
  const { exercises, persistentNotes, setPersistentNote } = useExerciseStore();
  const {
    addSet,
    updateSet,
    completeSet,
    removeExercise,
    removeSet,
    calculateWarmupSets,
    toggleSuperset,
    updateExerciseNotes,
    reorderExercises,
  } = useWorkoutStore();
  const { profile } = useProfileStore();
  const sessionExercises = useWorkoutStore((state) => state.exercises);
  const isImperial = profile.preferredUnits === 'imperial';

  const getPreviousPerformance = useHistoryStore((state) => state.getPreviousPerformance);
  const historySessions = useHistoryStore((state) => state.sessions);
  const occurrenceIndex = sessionExercises
    .filter((ex) => ex.exerciseId === sessionExercise.exerciseId)
    .findIndex((ex) => ex.id === sessionExercise.id);
  const lastPerformance = React.useMemo(
    () => getPreviousPerformance(sessionExercise.exerciseId, occurrenceIndex),
    [getPreviousPerformance, sessionExercise.exerciseId, occurrenceIndex, historySessions],
  );
  const [plateCalcVisible, setPlateCalcVisible] = useState(false);
  const [infoModalVisible, setInfoModalVisible] = useState(false);
  const [optionsVisible, setOptionsVisible] = useState(false);
  const [showNotes, setShowNotes] = useState(
    () => !!sessionExercise.notes || !!persistentNotes[sessionExercise.exerciseId],
  );

  const exercise = exercises.find((e) => e.id === sessionExercise.exerciseId);
  if (!exercise) return null;

  const isCardio = exercise.movementPattern === 'cardio' || exercise.equipment === 'cardio_machine';

  const peakE1RM = React.useMemo(() => {
    if (isCardio) return 0;
    let maxE1rm = 0;
    sessionExercise.sets.forEach((set) => {
      if (!set.completed || set.type === 'warmup') return;
      const wVal = set.weight || 0;
      const rVal = set.reps || 0;
      const dispWeight = isImperial ? wVal * 2.20462 : wVal;
      const val = estimateOneRepMax(dispWeight, rVal, set.rpe, set.rir, exercise.name);
      if (val > maxE1rm) {
        maxE1rm = val;
      }
    });
    return maxE1rm;
  }, [sessionExercise.sets, isImperial, isCardio, exercise.name]);

  const getHeaderE1rmText = () => {
    if (isCardio) return null;
    if (peakE1RM > 0) {
      return `Best Est. 1RM: ${peakE1RM.toFixed(1)} ${isImperial ? 'lbs' : 'kg'}`;
    }
    if (lastPerformance) {
      let lastMaxE1rm = 0;
      lastPerformance.sets.forEach((set) => {
        if (!set.completed || set.type === 'warmup') return;
        const wVal = set.weight || 0;
        const rVal = set.reps || 0;
        const dispWeight = isImperial ? wVal * 2.20462 : wVal;
        const val = estimateOneRepMax(dispWeight, rVal, set.rpe, set.rir, exercise.name);
        if (val > lastMaxE1rm) {
          lastMaxE1rm = val;
        }
      });
      if (lastMaxE1rm > 0) {
        return `Last Est. 1RM: ${lastMaxE1rm.toFixed(1)} ${isImperial ? 'lbs' : 'kg'}`;
      }
    }
    return null;
  };

  const [noteType, setNoteType] = useState<'one_time' | 'permanent'>(() => {
    if (!sessionExercise.notes && persistentNotes[sessionExercise.exerciseId]) {
      return 'permanent';
    }
    return 'one_time';
  });

  const rpeMode = profile.rpeMode || 'always_on';
  const rirMode = profile.rirMode || 'always_on';
  const rpeEnabledExerciseIds = profile.rpeEnabledExerciseIds || [];
  const rirEnabledExerciseIds = profile.rirEnabledExerciseIds || [];

  const rpeDisabledExerciseIds = profile.rpeDisabledExerciseIds || [];
  const rirDisabledExerciseIds = profile.rirDisabledExerciseIds || [];

  const showRpe =
    !isCardio &&
    (rpeMode === 'always_on' ||
      (rpeMode === 'selected_exercises' &&
        rpeEnabledExerciseIds.includes(sessionExercise.exerciseId))) &&
    !rpeDisabledExerciseIds.includes(sessionExercise.exerciseId);
  const showRir =
    !isCardio &&
    (rirMode === 'always_on' ||
      (rirMode === 'selected_exercises' &&
        rirEnabledExerciseIds.includes(sessionExercise.exerciseId))) &&
    !rirDisabledExerciseIds.includes(sessionExercise.exerciseId);

  const confirmDeleteExercise = async () => {
    if (profile.showExerciseDeleteConfirmation === false) {
      removeExercise(sessionExercise.id);
      return;
    }

    let donotShowAgain = false;
    const confirmed = await showConfirm({
      title: 'Remove Exercise',
      message: 'Are you sure you want to remove this exercise and all its sets?',
      confirmLabel: 'Remove',
      cancelLabel: 'Cancel',
      destructive: true,
      showCheckbox: true,
      checkboxLabel: "Don't show again",
      onCheckboxToggle: (checked) => {
        donotShowAgain = checked;
      },
    });

    if (confirmed) {
      if (donotShowAgain) {
        useProfileStore.getState().updateProfile({ showExerciseDeleteConfirmation: false });
      }
      removeExercise(sessionExercise.id);
    }
  };

  const handleWarmupCalc = () => {
    const firstSetWithWeight = sessionExercise.sets.find((s) => s.weight && s.weight > 0);
    if (!firstSetWithWeight) {
      const alertFn =
        Platform.OS === 'web'
          ? typeof globalThis !== 'undefined' && 'alert' in globalThis
            ? (globalThis as { alert?: (msg: string) => void }).alert
            : undefined
          : Alert.alert;

      if (Platform.OS === 'web' && alertFn) {
        alertFn('Please enter weight in at least one set first.');
      } else {
        Alert.alert(
          'Warmup Calculator',
          'Please enter weight in at least one set first to use as target working weight.',
        );
      }
      return;
    }

    const targetWeightKg = firstSetWithWeight.weight!;
    const targetWeightDisplay = isImperial ? targetWeightKg * 2.20462 : targetWeightKg;
    calculateWarmupSets(sessionExercise.id, targetWeightDisplay, profile.preferredUnits);
  };

  const handleToggleSuperset = () => {
    const currentIdx = useWorkoutStore
      .getState()
      .exercises.findIndex((ex) => ex.id === sessionExercise.id);
    const totalEx = useWorkoutStore.getState().exercises.length;

    if (sessionExercise.supersetGroup) {
      toggleSuperset(sessionExercise.id);
      Alert.alert('Superset', 'Exercise unlinked from superset.');
    } else {
      if (currentIdx === totalEx - 1) {
        Alert.alert(
          'Superset',
          'Supersets link this exercise with the next one. Please add another exercise first to create a superset.',
        );
      } else {
        toggleSuperset(sessionExercise.id);
        const nextExId = useWorkoutStore.getState().exercises[currentIdx + 1]?.exerciseId;
        const nextEx = exercises.find((e) => e.id === nextExId);
        Alert.alert(
          'Superset Created',
          `Linked this exercise with "${nextEx?.name || 'the next exercise'}" as a superset.`,
        );
      }
    }
  };

  // Calculate statistics for the (i) modal
  const sessionVolume = summarizeSessionExercise(sessionExercise).totalVolume;
  const previousVolume = React.useMemo(() => {
    if (!lastPerformance) return 0;
    return summarizeSessionExercise({
      id: sessionExercise.id,
      exerciseId: sessionExercise.exerciseId,
      order: sessionExercise.order,
      sets: lastPerformance.sets,
    }).totalVolume;
  }, [lastPerformance, sessionExercise.exerciseId, sessionExercise.id, sessionExercise.order]);
  const volumeDeltaPercent =
    previousVolume > 0 ? ((sessionVolume - previousVolume) / previousVolume) * 100 : null;
  const volumeDeltaLabel =
    volumeDeltaPercent === null
      ? 'NEW'
      : `${volumeDeltaPercent >= 0 ? '+' : ''}${volumeDeltaPercent.toFixed(0)}%`;
  const volumeDeltaColor =
    volumeDeltaPercent === null
      ? theme.colors.muted
      : volumeDeltaPercent > 0
        ? '#22c55e'
        : volumeDeltaPercent < 0
          ? '#ef4444'
          : theme.colors.primary;

  const stats = React.useMemo(() => {
    let maxWeight = 0;
    let totalWeight = 0;
    let completedSetsCount = 0;
    let lifetimeVolume = 0;

    historySessions.forEach((s) => {
      s.exercises.forEach((ex) => {
        if (ex.exerciseId === sessionExercise.exerciseId) {
          const summary = summarizeSessionExercise(ex);
          maxWeight = Math.max(maxWeight, summary.maxWeight);
          totalWeight += summary.averageWeight * summary.workingSetCount;
          completedSetsCount += summary.workingSetCount;
          lifetimeVolume += summary.totalVolume;
        }
      });
    });

    const avgWeight = completedSetsCount > 0 ? totalWeight / completedSetsCount : 0;
    return { maxWeight, avgWeight, lifetimeVolume };
  }, [historySessions, sessionExercise.exerciseId]);

  return (
    <Card
      style={[
        styles.card,
        sessionExercise.supersetGroup && {
          borderLeftColor: theme.colors.primary,
          borderLeftWidth: 4,
        },
      ]}
      padding="md"
    >
      {sessionExercise.supersetGroup && (
        <View style={styles.supersetHeader}>
          <Text
            style={[
              styles.supersetBadge,
              { color: theme.colors.primary, ...theme.typography.caption },
            ]}
          >
            🔗 SUPERSET
          </Text>
        </View>
      )}
      <View style={styles.titleRow}>
        {dragHandlers && (
          <View
            {...dragHandlers}
            onPointerDown={onDragStart}
            onTouchStart={onDragStart}
            onPointerUp={onDragEnd}
            onTouchEnd={onDragEnd}
            style={
              {
                minWidth: 44,
                minHeight: 44,
                justifyContent: 'center',
                alignItems: 'center',
                cursor: 'grab',
                touchAction: 'none',
                userSelect: 'none',
                WebkitUserSelect: 'none',
              } as unknown as ViewStyle
            }
          >
            <Ionicons name="reorder-two" size={24} color={theme.colors.primary} />
          </View>
        )}
        <Pressable onPress={navigateToInstructions} style={styles.titleCol}>
          <Text
            style={[
              styles.title,
              { color: theme.colors.text, ...theme.typography.heading, fontSize: 18 },
            ]}
          >
            {exercise.name}
          </Text>
          {getHeaderE1rmText() && !collapsed && (
            <Text
              style={[
                styles.prevText,
                {
                  color: theme.colors.primary,
                  ...theme.typography.caption,
                  fontFamily: 'SpaceGrotesk_700Bold',
                },
              ]}
            >
              {getHeaderE1rmText()}
            </Text>
          )}
        </Pressable>
        {!collapsed && (
          <View style={styles.headerIcons}>
            <Pressable onPress={() => setInfoModalVisible(true)} style={styles.iconBtn}>
              <Ionicons name="information-circle-outline" size={24} color={theme.colors.primary} />
            </Pressable>
            {!isCardio && (
              <Pressable onPress={handleWarmupCalc} style={styles.iconBtn}>
                <Text
                  style={{
                    color: theme.colors.muted,
                    fontFamily: 'SpaceGrotesk_700Bold',
                    fontSize: 18,
                    lineHeight: 24,
                    textAlign: 'center',
                  }}
                >
                  W
                </Text>
              </Pressable>
            )}
            {!isCardio && (
              <Pressable onPress={() => setPlateCalcVisible(true)} style={styles.iconBtn}>
                <Ionicons name="barbell-outline" size={24} color={theme.colors.muted} />
              </Pressable>
            )}
            <Pressable
              onPress={() => setOptionsVisible(true)}
              style={styles.iconBtn}
              testID="exercise-options-btn"
            >
              <Ionicons name="ellipsis-horizontal" size={24} color={theme.colors.muted} />
            </Pressable>
          </View>
        )}
      </View>

      {!collapsed && (
        <>
          {showNotes && (
            <View style={styles.notesContainer}>
              <View style={styles.tabContainer}>
                <Pressable
                  style={[
                    styles.tabButton,
                    noteType === 'one_time' && {
                      backgroundColor: theme.colors.primary,
                    },
                  ]}
                  onPress={() => setNoteType('one_time')}
                >
                  <Ionicons
                    name="document-text-outline"
                    size={14}
                    color={noteType === 'one_time' ? theme.colors.background : theme.colors.text}
                  />
                  <Text
                    style={[
                      styles.tabText,
                      {
                        color:
                          noteType === 'one_time' ? theme.colors.background : theme.colors.text,
                      },
                    ]}
                  >
                    Einmalige Notiz
                  </Text>
                </Pressable>
                <Pressable
                  style={[
                    styles.tabButton,
                    noteType === 'permanent' && {
                      backgroundColor: theme.colors.primary,
                    },
                  ]}
                  onPress={() => setNoteType('permanent')}
                >
                  <Ionicons
                    name="pin-outline"
                    size={14}
                    color={noteType === 'permanent' ? theme.colors.background : theme.colors.text}
                  />
                  <Text
                    style={[
                      styles.tabText,
                      {
                        color:
                          noteType === 'permanent' ? theme.colors.background : theme.colors.text,
                      },
                    ]}
                  >
                    Dauerhafte Notiz
                  </Text>
                </Pressable>
              </View>
              <View style={styles.noteInputWrapper}>
                {noteType === 'one_time' ? (
                  <TextInput
                    style={[
                      styles.noteInput,
                      { color: theme.colors.text, borderColor: theme.colors.border },
                    ]}
                    value={sessionExercise.notes || ''}
                    onChangeText={(text) => updateExerciseNotes(sessionExercise.id, text)}
                    placeholder="Einmalige Notiz für dieses Training..."
                    placeholderTextColor={theme.colors.muted}
                    multiline
                    inputAccessoryViewID="keyboardDoneAccessory"
                  />
                ) : (
                  <TextInput
                    style={[
                      styles.noteInput,
                      { color: theme.colors.text, borderColor: theme.colors.border },
                    ]}
                    value={persistentNotes[sessionExercise.exerciseId] || ''}
                    onChangeText={(text) => setPersistentNote(sessionExercise.exerciseId, text)}
                    placeholder="Dauerhafte Notiz (z.B. Sitzhöhe, Einstellungen)..."
                    placeholderTextColor={theme.colors.muted}
                    multiline
                    inputAccessoryViewID="keyboardDoneAccessory"
                  />
                )}
              </View>
            </View>
          )}

          <View style={styles.headerRow}>
            <Text style={[styles.columnHeader, styles.setCol, { color: theme.colors.muted }]}>
              Set
            </Text>
            <Text style={[styles.columnHeader, styles.weightCol, { color: theme.colors.muted }]}>
              {isCardio ? 'Level' : isImperial ? 'lbs' : 'kg'}
            </Text>
            <Text style={[styles.columnHeader, styles.repsCol, { color: theme.colors.muted }]}>
              {isCardio ? 'Min:Sec' : 'Reps'}
            </Text>
            {showRpe && (
              <Text style={[styles.columnHeader, styles.rpeCol, { color: theme.colors.muted }]}>
                RPE
              </Text>
            )}
            {showRir && (
              <Text style={[styles.columnHeader, styles.rirCol, { color: theme.colors.muted }]}>
                RIR
              </Text>
            )}
            <Text style={[styles.columnHeader, styles.doneCol, { color: theme.colors.muted }]}>
              ✓
            </Text>
            {Platform.OS === 'web' && (
              <Text
                style={[styles.columnHeader, styles.deleteCol, { color: theme.colors.muted }]}
              />
            )}
          </View>

          {(() => {
            let workingSetCount = 0;
            return sessionExercise.sets.map((set, idx) => {
              const prevSet =
                idx > 0 ? sessionExercise.sets[idx - 1] : lastPerformance?.sets[0] || undefined;
              const lastPerformanceSet = lastPerformance?.sets[idx] || undefined;

              let displayIndex = 0;
              if (set.type !== 'warmup') {
                workingSetCount++;
                displayIndex = workingSetCount;
              }

              return (
                <SetRow
                  key={set.id}
                  set={set}
                  workingSetNumber={displayIndex}
                  sessionExerciseId={sessionExercise.id}
                  isImperial={isImperial}
                  isCardio={isCardio}
                  showRpe={showRpe}
                  showRir={showRir}
                  onUpdate={(updates) => updateSet(sessionExercise.id, set.id, updates)}
                  onComplete={() => {
                    completeSet(sessionExercise.id, set.id);
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
                  }}
                  onDelete={() => removeSet(sessionExercise.id, set.id)}
                  prevSet={prevSet}
                  lastPerformanceSet={lastPerformanceSet}
                  onSwipeStart={onSwipeStart}
                  onSwipeEnd={onSwipeEnd}
                />
              );
            });
          })()}

          <Pressable
            style={({ pressed }) => [
              styles.addSetRow,
              {
                backgroundColor: pressed ? theme.colors.border : 'transparent',
                borderTopColor: theme.colors.border,
                borderBottomLeftRadius: theme.radius.lg,
                borderBottomRightRadius: theme.radius.lg,
              },
            ]}
            onPress={() => addSet(sessionExercise.id)}
          >
            <Ionicons name="add" size={20} color={theme.colors.primary} />
            <Text style={[styles.addSetRowText, { color: theme.colors.primary }]}>ADD SET</Text>
          </Pressable>
        </>
      )}

      <PlateCalculatorModal
        visible={plateCalcVisible}
        initialWeightKg={sessionExercise.sets[0]?.weight || 0}
        onClose={() => setPlateCalcVisible(false)}
      />

      {/* Exercise Options Modal */}
      <Modal
        visible={optionsVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setOptionsVisible(false)}
      >
        <Pressable style={styles.modalOverlay} onPress={() => setOptionsVisible(false)}>
          <Pressable
            style={[
              styles.modalCard,
              { backgroundColor: theme.colors.surface, borderColor: theme.colors.border },
            ]}
            onPress={(e) => e.stopPropagation()}
          >
            <Text
              style={[styles.modalTitle, { color: theme.colors.text, ...theme.typography.heading }]}
            >
              Übungs-Optionen
            </Text>

            <Pressable
              style={styles.optionRow}
              onPress={() => {
                setShowNotes(!showNotes);
                setOptionsVisible(false);
              }}
            >
              <Ionicons
                name={showNotes ? 'eye-off-outline' : 'document-text-outline'}
                size={20}
                color={theme.colors.primary}
              />
              <Text style={[styles.optionText, { color: theme.colors.text }]}>
                {showNotes ? 'Notizen ausblenden' : 'Notizen einblenden'}
              </Text>
            </Pressable>

            <Pressable
              style={styles.optionRow}
              onPress={() => {
                setOptionsVisible(false);
                navigateToInstructions();
              }}
            >
              <Ionicons name="book-outline" size={20} color={theme.colors.primary} />
              <Text style={[styles.optionText, { color: theme.colors.text }]}>
                Anleitung anzeigen
              </Text>
            </Pressable>

            <Pressable
              style={styles.optionRow}
              onPress={() => {
                setOptionsVisible(false);
                handleToggleSuperset();
              }}
            >
              <Ionicons
                name="link-outline"
                size={20}
                color={sessionExercise.supersetGroup ? theme.colors.primary : theme.colors.muted}
              />
              <Text style={[styles.optionText, { color: theme.colors.text }]}>
                {sessionExercise.supersetGroup ? 'Supersatz trennen' : 'Als Supersatz koppeln'}
              </Text>
            </Pressable>

            <Pressable
              style={styles.optionRow}
              onPress={() => {
                const rpeDisabled = rpeDisabledExerciseIds.includes(sessionExercise.exerciseId);
                const nextDisabled = rpeDisabled
                  ? rpeDisabledExerciseIds.filter((id) => id !== sessionExercise.exerciseId)
                  : [...rpeDisabledExerciseIds, sessionExercise.exerciseId];
                useProfileStore.getState().updateProfile({ rpeDisabledExerciseIds: nextDisabled });
                setOptionsVisible(false);
              }}
            >
              <Ionicons
                name={showRpe ? 'eye-off-outline' : 'eye-outline'}
                size={20}
                color={theme.colors.primary}
              />
              <Text style={[styles.optionText, { color: theme.colors.text }]}>
                {showRpe ? 'RPE verbergen' : 'RPE anzeigen'}
              </Text>
            </Pressable>

            <Pressable
              style={styles.optionRow}
              onPress={() => {
                const rirDisabled = rirDisabledExerciseIds.includes(sessionExercise.exerciseId);
                const nextDisabled = rirDisabled
                  ? rirDisabledExerciseIds.filter((id) => id !== sessionExercise.exerciseId)
                  : [...rirDisabledExerciseIds, sessionExercise.exerciseId];
                useProfileStore.getState().updateProfile({ rirDisabledExerciseIds: nextDisabled });
                setOptionsVisible(false);
              }}
            >
              <Ionicons
                name={showRir ? 'eye-off-outline' : 'eye-outline'}
                size={20}
                color={theme.colors.primary}
              />
              <Text style={[styles.optionText, { color: theme.colors.text }]}>
                {showRir ? 'RIR verbergen' : 'RIR anzeigen'}
              </Text>
            </Pressable>

            {sessionExercises.indexOf(sessionExercise) > 0 && (
              <Pressable
                style={styles.optionRow}
                onPress={() => {
                  const idx = sessionExercises.indexOf(sessionExercise);
                  const reordered = [...sessionExercises];
                  const temp = reordered[idx];
                  reordered[idx] = reordered[idx - 1]!;
                  reordered[idx - 1] = temp!;
                  reorderExercises(reordered);
                  setOptionsVisible(false);
                }}
              >
                <Ionicons name="arrow-up-outline" size={20} color={theme.colors.primary} />
                <Text style={[styles.optionText, { color: theme.colors.text }]}>
                  Nach oben verschieben
                </Text>
              </Pressable>
            )}

            {sessionExercises.indexOf(sessionExercise) < sessionExercises.length - 1 && (
              <Pressable
                style={styles.optionRow}
                onPress={() => {
                  const idx = sessionExercises.indexOf(sessionExercise);
                  const reordered = [...sessionExercises];
                  const temp = reordered[idx];
                  reordered[idx] = reordered[idx + 1]!;
                  reordered[idx + 1] = temp!;
                  reorderExercises(reordered);
                  setOptionsVisible(false);
                }}
              >
                <Ionicons name="arrow-down-outline" size={20} color={theme.colors.primary} />
                <Text style={[styles.optionText, { color: theme.colors.text }]}>
                  Nach unten verschieben
                </Text>
              </Pressable>
            )}

            <Pressable
              style={styles.optionRow}
              onPress={() => {
                setOptionsVisible(false);
                confirmDeleteExercise();
              }}
            >
              <Ionicons name="trash-outline" size={20} color="#ef4444" />
              <Text style={[styles.optionText, { color: '#ef4444' }]}>Übung löschen</Text>
            </Pressable>

            <Pressable
              style={[
                styles.modalCloseBtn,
                {
                  backgroundColor: theme.colors.border,
                  borderRadius: theme.radius.md,
                  marginTop: 16,
                },
              ]}
              onPress={() => setOptionsVisible(false)}
            >
              <Text
                style={[
                  styles.modalCloseBtnText,
                  { color: theme.colors.text, ...theme.typography.button },
                ]}
              >
                Abbrechen
              </Text>
            </Pressable>
          </Pressable>
        </Pressable>
      </Modal>

      {/* Exercise Info Modal */}
      <Modal
        visible={infoModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setInfoModalVisible(false)}
      >
        <Pressable style={styles.modalOverlay} onPress={() => setInfoModalVisible(false)}>
          <Pressable
            style={[
              styles.modalCard,
              { backgroundColor: theme.colors.surface, borderColor: theme.colors.border },
            ]}
            onPress={(e) => e.stopPropagation()}
          >
            <Text
              style={[styles.modalTitle, { color: theme.colors.text, ...theme.typography.heading }]}
            >
              {exercise.name} Info
            </Text>

            {/* Stats */}
            <View style={styles.infoStatsGrid}>
              <View style={styles.infoStatBox}>
                <Text style={[styles.infoStatLabel, { color: theme.colors.muted }]}>
                  Exercise Vol
                </Text>
                <Text style={[styles.infoStatValue, { color: theme.colors.primary }]}>
                  {isImperial ? Math.round(sessionVolume * 2.20462) : Math.round(sessionVolume)}{' '}
                  {isImperial ? 'lbs' : 'kg'}
                </Text>
              </View>
              <View style={styles.infoStatBox}>
                <Text style={[styles.infoStatLabel, { color: theme.colors.muted }]}>Vs Last</Text>
                <Text style={[styles.infoStatValue, { color: volumeDeltaColor }]}>
                  {volumeDeltaLabel}
                </Text>
              </View>
              <View style={styles.infoStatBox}>
                <Text style={[styles.infoStatLabel, { color: theme.colors.muted }]}>
                  Lifetime Vol
                </Text>
                <Text style={[styles.infoStatValue, { color: theme.colors.primary }]}>
                  {isImperial
                    ? Math.round(stats.lifetimeVolume * 2.20462)
                    : Math.round(stats.lifetimeVolume)}{' '}
                  {isImperial ? 'lbs' : 'kg'}
                </Text>
              </View>
              <View style={styles.infoStatBox}>
                <Text style={[styles.infoStatLabel, { color: theme.colors.muted }]}>
                  Personal Record
                </Text>
                <Text style={[styles.infoStatValue, { color: theme.colors.primary }]}>
                  {stats.maxWeight > 0
                    ? `${(isImperial ? stats.maxWeight * 2.20462 : stats.maxWeight).toFixed(1).replace(/\.0$/, '')} ${isImperial ? 'lbs' : 'kg'}`
                    : '-'}
                </Text>
              </View>
              <View style={styles.infoStatBox}>
                <Text style={[styles.infoStatLabel, { color: theme.colors.muted }]}>
                  Avg Weight
                </Text>
                <Text style={[styles.infoStatValue, { color: theme.colors.primary }]}>
                  {stats.avgWeight > 0
                    ? `${(isImperial ? stats.avgWeight * 2.20462 : stats.avgWeight).toFixed(1).replace(/\.0$/, '')} ${isImperial ? 'lbs' : 'kg'}`
                    : '-'}
                </Text>
              </View>
            </View>

            {/* Previous Performance */}
            <Text
              style={[
                styles.infoSubtitle,
                { color: theme.colors.text, marginTop: 16, marginBottom: 8 },
              ]}
            >
              Previous Sets (No Warmups)
            </Text>
            <ScrollView style={{ maxHeight: 150 }} showsVerticalScrollIndicator={false}>
              {lastPerformance &&
              lastPerformance.sets.filter((s) => s.type !== 'warmup').length > 0 ? (
                lastPerformance.sets
                  .filter((s) => s.type !== 'warmup')
                  .map((s, sIdx) => {
                    if (isCardio) {
                      const mins = Math.floor((s.durationSeconds || 0) / 60);
                      const secs = (s.durationSeconds || 0) % 60;
                      const durStr = `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
                      return (
                        <Text
                          key={s.id || sIdx}
                          style={[styles.infoSetRow, { color: theme.colors.text }]}
                        >
                          Set {sIdx + 1}: Level {s.weight || 0} for {durStr}
                        </Text>
                      );
                    }
                    const w = s.weight
                      ? (isImperial ? s.weight * 2.20462 : s.weight).toFixed(1).replace(/\.0$/, '')
                      : '-';
                    const unit = s.weight ? (isImperial ? 'lbs' : 'kg') : '';
                    return (
                      <Text
                        key={s.id || sIdx}
                        style={[styles.infoSetRow, { color: theme.colors.text }]}
                      >
                        Set {sIdx + 1}: {w} {unit} x {s.reps} reps {s.rpe ? `(RPE ${s.rpe})` : ''}
                      </Text>
                    );
                  })
              ) : (
                <Text
                  style={{
                    color: theme.colors.muted,
                    fontStyle: 'italic',
                    textAlign: 'center',
                    marginVertical: 10,
                  }}
                >
                  No previous working sets.
                </Text>
              )}
            </ScrollView>

            <Pressable
              style={[
                styles.modalCloseBtn,
                {
                  backgroundColor: 'transparent',
                  borderColor: theme.colors.primary,
                  borderWidth: 1,
                  borderRadius: theme.radius.md,
                  marginTop: 20,
                },
              ]}
              onPress={() => {
                setInfoModalVisible(false);
                navigateToInstructions();
              }}
            >
              <Text
                style={[
                  styles.modalCloseBtnText,
                  { color: theme.colors.primary, ...theme.typography.button },
                ]}
              >
                Anleitung anzeigen
              </Text>
            </Pressable>

            <Pressable
              style={[
                styles.modalCloseBtn,
                {
                  backgroundColor: theme.colors.primary,
                  borderRadius: theme.radius.md,
                  marginTop: 10,
                },
              ]}
              onPress={() => setInfoModalVisible(false)}
            >
              <Text
                style={[
                  styles.modalCloseBtnText,
                  { color: theme.colors.background, ...theme.typography.button },
                ]}
              >
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
  workingSetNumber: number;
  sessionExerciseId: string;
  isImperial: boolean;
  isCardio: boolean;
  showRpe: boolean;
  showRir: boolean;
  onUpdate: (updates: Partial<ExerciseSet>) => void;
  onComplete: () => void;
  onDelete: () => void;
  prevSet?: ExerciseSet | undefined;
  lastPerformanceSet?: ExerciseSet | undefined;
  onSwipeStart?: (() => void) | undefined;
  onSwipeEnd?: (() => void) | undefined;
}

const SetRow = ({
  set,
  workingSetNumber,
  isImperial,
  isCardio,
  showRpe,
  showRir,
  onUpdate,
  onComplete,
  onDelete,
  prevSet,
  lastPerformanceSet,
  onSwipeStart,
  onSwipeEnd,
}: SetRowProps) => {
  const theme = useTheme();
  const isDone = set.completed;
  const [isWeightFocused, setIsWeightFocused] = useState(false);
  const weightInputRef = React.useRef<TextInput | null>(null);
  const weightBlurTimeoutRef = React.useRef<ReturnType<typeof setTimeout> | null>(null);
  const focusGuardTimeoutRef = React.useRef<ReturnType<typeof setTimeout> | null>(null);
  const isAccessoryInteractionRef = React.useRef(false);
  const swipeX = React.useRef(new Animated.Value(0)).current;
  const [measuredHeight, setMeasuredHeight] = useState<number | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const rowHeight = React.useRef(new Animated.Value(0)).current;
  const rowOpacity = React.useRef(new Animated.Value(1)).current;

  const clearWeightBlurTimeout = React.useCallback(() => {
    if (weightBlurTimeoutRef.current) {
      clearTimeout(weightBlurTimeoutRef.current);
      weightBlurTimeoutRef.current = null;
    }
  }, []);

  const focusWeightInput = React.useCallback(() => {
    if (isCardio) return;

    const focus = () => weightInputRef.current?.focus();
    if (typeof requestAnimationFrame === 'function') {
      requestAnimationFrame(focus);
    } else {
      setTimeout(focus, 0);
    }
  }, [isCardio]);

  const preserveWeightInputFocus = React.useCallback(() => {
    if (isCardio) return;

    isAccessoryInteractionRef.current = true;
    clearWeightBlurTimeout();
    if (focusGuardTimeoutRef.current) {
      clearTimeout(focusGuardTimeoutRef.current);
    }
    setIsWeightFocused(true);
    focusWeightInput();
    focusGuardTimeoutRef.current = setTimeout(() => {
      weightInputRef.current?.focus();
      isAccessoryInteractionRef.current = false;
      focusGuardTimeoutRef.current = null;
    }, 350);
  }, [clearWeightBlurTimeout, focusWeightInput, isCardio]);

  useEffect(() => {
    return () => {
      clearWeightBlurTimeout();
      if (focusGuardTimeoutRef.current) {
        clearTimeout(focusGuardTimeoutRef.current);
      }
    };
  }, [clearWeightBlurTimeout]);

  const handleWeightFocus = () => {
    clearWeightBlurTimeout();
    setIsWeightFocused(true);
  };

  const handleWeightBlur = () => {
    if (isAccessoryInteractionRef.current) {
      preserveWeightInputFocus();
      return;
    }

    clearWeightBlurTimeout();
    weightBlurTimeoutRef.current = setTimeout(() => {
      setIsWeightFocused(false);
      weightBlurTimeoutRef.current = null;
    }, 300);
  };

  const handleAccessoryPointerDown = (event: unknown) => {
    if (Platform.OS === 'web') {
      (event as { preventDefault?: () => void }).preventDefault?.();
    }
    preserveWeightInputFocus();
  };

  const handleLayout = (e: LayoutChangeEvent) => {
    if (!isDeleting) {
      setMeasuredHeight(e.nativeEvent.layout.height);
    }
  };

  const resetSwipe = React.useCallback(() => {
    Animated.spring(swipeX, {
      toValue: 0,
      useNativeDriver: true,
      tension: 90,
      friction: 9,
    }).start();
  }, [swipeX]);

  const handleDeleteSet = React.useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
    setIsDeleting(true);
    rowHeight.setValue(measuredHeight || 52);
    Animated.parallel([
      Animated.timing(rowHeight, {
        toValue: 0,
        duration: 200,
        useNativeDriver: false,
      }),
      Animated.timing(rowOpacity, {
        toValue: 0,
        duration: 200,
        useNativeDriver: false,
      }),
    ]).start(() => {
      onDelete();
      setIsDeleting(false);
      rowHeight.setValue(0);
      rowOpacity.setValue(1);
      swipeX.setValue(0);
    });
  }, [onDelete, measuredHeight, rowHeight, rowOpacity, swipeX]);

  const swipeResponder = React.useMemo(
    () =>
      PanResponder.create({
        onMoveShouldSetPanResponder: (_, gestureState) =>
          Platform.OS !== 'web' &&
          Math.abs(gestureState.dx) > 10 &&
          Math.abs(gestureState.dx) > Math.abs(gestureState.dy) * 1.5,
        onPanResponderGrant: () => {
          if (onSwipeStart) onSwipeStart();
        },
        onPanResponderMove: (_, gestureState) => {
          const dx = gestureState.dx;
          if (dx < -96) {
            const overflow = dx + 96;
            const resisted = -96 + overflow * 0.3;
            swipeX.setValue(resisted);
          } else {
            swipeX.setValue(Math.min(0, dx));
          }
        },
        onPanResponderTerminationRequest: () => false,
        onPanResponderRelease: (_, gestureState) => {
          if (gestureState.dx < -72 || gestureState.vx < -0.5) {
            Animated.timing(swipeX, {
              toValue: -500, // Slide completely off screen left
              duration: 150,
              useNativeDriver: true,
            }).start(handleDeleteSet);
            if (onSwipeEnd) onSwipeEnd();
            return;
          }
          resetSwipe();
          if (onSwipeEnd) onSwipeEnd();
        },
        onPanResponderTerminate: () => {
          resetSwipe();
          if (onSwipeEnd) onSwipeEnd();
        },
      }),
    [handleDeleteSet, resetSwipe, swipeX, onSwipeStart, onSwipeEnd],
  );

  const handleWeightModifier = (amount: number) => {
    preserveWeightInputFocus();
    const currentVal = set.weight || 0;
    const modifierKg = isImperial ? amount / 2.20462 : amount;
    let newVal = Math.max(0, currentVal + modifierKg);
    const maxValKg = isImperial ? 9999 / 2.20462 : 9999;
    if (newVal > maxValKg) newVal = maxValKg;
    onUpdate({ weight: newVal });
  };

  const handleCopyLastSet = () => {
    preserveWeightInputFocus();
    if (prevSet) {
      onUpdate({
        ...(prevSet.weight !== undefined ? { weight: prevSet.weight } : {}),
        ...(prevSet.reps !== undefined ? { reps: prevSet.reps } : {}),
        ...(prevSet.rpe !== undefined ? { rpe: prevSet.rpe } : {}),
        ...(prevSet.rir !== undefined ? { rir: prevSet.rir } : {}),
      });
    }
  };

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
    let val = parseFloat(text) || 0;
    if (val > 9999) val = 9999;
    if (isCardio) {
      onUpdate({ weight: val });
    } else {
      onUpdate({ weight: isImperial ? val / 2.20462 : val });
    }
  };

  const [durationStr, setDurationStr] = useState(() => formatSecondsToDisplay(set.durationSeconds));
  const [isEditingDuration, setIsEditingDuration] = useState(false);

  useEffect(() => {
    if (!isEditingDuration) {
      setDurationStr(formatSecondsToDisplay(set.durationSeconds));
    }
  }, [set.durationSeconds, isEditingDuration]);

  const handleDurationChange = (text: string) => {
    setDurationStr(text.replace(/\D/g, ''));
  };

  const handleDurationBlur = () => {
    setIsEditingDuration(false);
    let secs = parseDigitsToSeconds(durationStr);
    if (secs > 86400) secs = 86400; // clamp to 24h
    onUpdate({ durationSeconds: secs });
    setDurationStr(formatSecondsToDisplay(secs));
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
        return (
          <Text style={[styles.typeBadge, { backgroundColor: '#ffedd5', color: '#ea580c' }]}>
            W
          </Text>
        );
      case 'drop':
        return (
          <Text style={[styles.typeBadge, { backgroundColor: '#f3e8ff', color: '#9333ea' }]}>
            D
          </Text>
        );
      case 'failure':
        return (
          <Text style={[styles.typeBadge, { backgroundColor: '#fee2e2', color: '#dc2626' }]}>
            F
          </Text>
        );
      default:
        return <Text style={[styles.cell, { color: theme.colors.text }]}>{workingSetNumber}</Text>;
    }
  };

  const animatedStyle = isDeleting
    ? {
        height: rowHeight,
        opacity: rowOpacity,
        overflow: 'hidden' as const,
      }
    : {};

  return (
    <Animated.View onLayout={handleLayout} style={[styles.rowContainer, animatedStyle]}>
      <View style={styles.swipeFrame}>
        {Platform.OS !== 'web' && (
          <View style={[styles.swipeDeleteBackground, { backgroundColor: '#ef4444' }]}>
            <Ionicons name="trash-outline" size={18} color="#ffffff" />
          </View>
        )}
        <Animated.View
          {...(Platform.OS !== 'web' ? swipeResponder.panHandlers : {})}
          style={{ transform: [{ translateX: swipeX }] }}
        >
          <View
            style={[
              styles.row,
              { backgroundColor: theme.colors.surface },
              isDone && {
                borderColor: theme.colors.primary,
                backgroundColor: '#1f2836',
              },
            ]}
          >
            <Pressable onPress={cycleSetType} style={[styles.setCol, styles.centerAlign]}>
              {getSetTypeBadge()}
            </Pressable>
            <TextInput
              ref={weightInputRef}
              style={[
                styles.input,
                styles.weightCol,
                { color: theme.colors.text, backgroundColor: theme.colors.background },
                isDone && { color: theme.colors.muted, backgroundColor: theme.colors.surface },
              ]}
              keyboardType="decimal-pad"
              inputMode="decimal"
              value={getDisplayWeight()}
              onChangeText={handleWeightChange}
              placeholder="-"
              placeholderTextColor={theme.colors.muted}
              selectTextOnFocus={true}
              onFocus={handleWeightFocus}
              onBlur={handleWeightBlur}
              inputAccessoryViewID="keyboardDoneAccessory"
            />
            {isCardio ? (
              <TextInput
                style={[
                  styles.input,
                  styles.repsCol,
                  { color: theme.colors.text, backgroundColor: theme.colors.background },
                  isDone && { color: theme.colors.muted, backgroundColor: theme.colors.surface },
                ]}
                keyboardType="number-pad"
                inputMode="numeric"
                value={durationStr}
                onChangeText={handleDurationChange}
                placeholder="0s"
                placeholderTextColor={theme.colors.muted}
                selectTextOnFocus={true}
                onFocus={() => {
                  setIsEditingDuration(true);
                  setDurationStr(secondsToDigitString(set.durationSeconds));
                }}
                onBlur={handleDurationBlur}
                onSubmitEditing={handleDurationBlur}
                inputAccessoryViewID="keyboardDoneAccessory"
              />
            ) : (
              <TextInput
                style={[
                  styles.input,
                  styles.repsCol,
                  { color: theme.colors.text, backgroundColor: theme.colors.background },
                  isDone && { color: theme.colors.muted, backgroundColor: theme.colors.surface },
                ]}
                keyboardType="number-pad"
                inputMode="numeric"
                value={set.reps ? set.reps.toString() : ''}
                onChangeText={(text) => {
                  let reps = parseInt(text, 10) || 0;
                  if (reps > 999) reps = 999;
                  onUpdate({ reps });
                }}
                placeholder="-"
                placeholderTextColor={theme.colors.muted}
                selectTextOnFocus={true}
                inputAccessoryViewID="keyboardDoneAccessory"
              />
            )}
            {showRpe && (
              <TextInput
                style={[
                  styles.input,
                  styles.rpeCol,
                  {
                    color: theme.colors.text,
                    backgroundColor: theme.colors.background,
                    borderColor: theme.colors.border,
                  },
                  isDone && { color: theme.colors.muted, backgroundColor: theme.colors.surface },
                ]}
                keyboardType="decimal-pad"
                inputMode="decimal"
                value={set.rpe ? set.rpe.toString() : ''}
                onChangeText={(text) => {
                  let rpe = parseFloat(text) || 0;
                  if (rpe > 10) rpe = 10;
                  onUpdate({ rpe });
                }}
                placeholder="-"
                placeholderTextColor={theme.colors.muted}
                selectTextOnFocus={true}
                inputAccessoryViewID="keyboardDoneAccessory"
              />
            )}
            {showRir && (
              <TextInput
                style={[
                  styles.input,
                  styles.rirCol,
                  {
                    color: theme.colors.text,
                    backgroundColor: theme.colors.background,
                    borderColor: theme.colors.border,
                  },
                  isDone && { color: theme.colors.muted, backgroundColor: theme.colors.surface },
                ]}
                keyboardType="number-pad"
                inputMode="numeric"
                value={set.rir !== undefined ? set.rir.toString() : ''}
                onChangeText={(text) => {
                  let rir = parseInt(text, 10) || 0;
                  if (rir > 10) rir = 10;
                  onUpdate({ rir });
                }}
                placeholder="-"
                placeholderTextColor={theme.colors.muted}
                selectTextOnFocus={true}
                inputAccessoryViewID="keyboardDoneAccessory"
              />
            )}
            <Pressable
              style={[
                styles.doneBtn,
                styles.doneCol,
                {
                  backgroundColor: isDone ? theme.colors.primary : theme.colors.background,
                  borderWidth: 1,
                  borderColor: isDone ? theme.colors.primary : theme.colors.border,
                },
              ]}
              onPress={onComplete}
            >
              <Ionicons
                name="checkmark"
                size={isSmallScreen ? 16 : 20}
                color={isDone ? theme.colors.background : theme.colors.muted}
              />
            </Pressable>
            {Platform.OS === 'web' && (
              <Pressable
                style={[
                  styles.deleteSetBtn,
                  styles.deleteCol,
                  { borderColor: theme.colors.border, backgroundColor: theme.colors.background },
                ]}
                onPress={handleDeleteSet}
                hitSlop={6}
              >
                <Ionicons name="close" size={16} color="#ef4444" />
              </Pressable>
            )}
          </View>
        </Animated.View>
      </View>
      {isWeightFocused && !isCardio && (
        <View style={styles.accessoryRow}>
          <Pressable
            style={styles.accessoryBtn}
            onPointerDown={handleAccessoryPointerDown}
            onPressIn={() => handleWeightModifier(-5)}
          >
            <Text style={styles.accessoryBtnText}>-5</Text>
          </Pressable>
          <Pressable
            style={styles.accessoryBtn}
            onPointerDown={handleAccessoryPointerDown}
            onPressIn={() => handleWeightModifier(-2.5)}
          >
            <Text style={styles.accessoryBtnText}>-2.5</Text>
          </Pressable>
          <Pressable
            style={styles.accessoryBtn}
            onPointerDown={handleAccessoryPointerDown}
            onPressIn={() => handleWeightModifier(-1.25)}
          >
            <Text style={styles.accessoryBtnText}>-1.25</Text>
          </Pressable>
          <Pressable
            style={styles.accessoryBtn}
            onPointerDown={handleAccessoryPointerDown}
            onPressIn={() => handleWeightModifier(1.25)}
          >
            <Text style={styles.accessoryBtnText}>+1.25</Text>
          </Pressable>
          <Pressable
            style={styles.accessoryBtn}
            onPointerDown={handleAccessoryPointerDown}
            onPressIn={() => handleWeightModifier(2.5)}
          >
            <Text style={styles.accessoryBtnText}>+2.5</Text>
          </Pressable>
          <Pressable
            style={styles.accessoryBtn}
            onPointerDown={handleAccessoryPointerDown}
            onPressIn={() => handleWeightModifier(5)}
          >
            <Text style={styles.accessoryBtnText}>+5</Text>
          </Pressable>
          {prevSet && (
            <Pressable
              style={styles.accessoryBtnCopy}
              onPointerDown={handleAccessoryPointerDown}
              onPressIn={handleCopyLastSet}
            >
              <Text style={styles.accessoryBtnTextCopy}>Copy Prev</Text>
            </Pressable>
          )}
        </View>
      )}
      {lastPerformanceSet && (
        <View style={styles.e1rmRow}>
          <Text style={[styles.e1rmText, { color: theme.colors.muted }]}>
            {(() => {
              const s = lastPerformanceSet;
              if (isCardio) {
                const mins = Math.floor((s.durationSeconds || 0) / 60);
                const secs = (s.durationSeconds || 0) % 60;
                const durStr = `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
                return `Last: Lvl ${s.weight || 0} for ${durStr}`;
              }
              if (!s.weight) return `Last: ${s.reps} reps`;
              const weightDisplay = isImperial ? s.weight * 2.20462 : s.weight;
              const formattedWeight = weightDisplay.toFixed(1).replace(/\.0$/, '');
              const unit = isImperial ? 'lbs' : 'kg';
              let rpeRirStr = '';
              if (s.rpe) {
                rpeRirStr += ` @RPE ${s.rpe}`;
              }
              if (s.rir !== undefined) {
                rpeRirStr += ` (RIR ${s.rir})`;
              }
              return `Last: ${formattedWeight} ${unit} x ${s.reps}${rpeRirStr}`;
            })()}
          </Text>
        </View>
      )}
    </Animated.View>
  );
};

const { width: screenWidth } = Dimensions.get('window');
const isSmallScreen = screenWidth < 375;
const isMediumScreen = screenWidth < 415;

const styles = StyleSheet.create({
  card: {
    marginBottom: 16,
  },
  supersetHeader: {
    marginBottom: 6,
  },
  supersetBadge: {},
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
  prevText: {},
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
    fontSize: isSmallScreen ? 10 : 12,
    fontWeight: '600',
    textAlign: 'center',
  },
  setCol: { width: 28, textAlign: 'center' },
  weightCol: { flex: 1.25, textAlign: 'center' },
  repsCol: { flex: 1.0, textAlign: 'center' },
  rpeCol: { flex: 0.9, textAlign: 'center' },
  rirCol: { flex: 0.9, textAlign: 'center' },
  doneCol: { width: 34, textAlign: 'center' },
  deleteCol: { width: 28, textAlign: 'center' },

  rowContainer: {
    marginBottom: 6,
  },
  swipeFrame: {
    borderRadius: 10,
    overflow: 'hidden',
    position: 'relative',
  },
  swipeDeleteBackground: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    width: 96,
    justifyContent: 'center',
    alignItems: 'center',
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
    fontSize: isSmallScreen ? 13 : 16,
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
    width: 22,
    height: 22,
    textAlign: 'center',
    lineHeight: 22,
    overflow: 'hidden',
  },
  input: {
    borderRadius: 8,
    marginHorizontal: isSmallScreen ? 1.5 : isMediumScreen ? 2 : 4,
    paddingVertical: 6,
    paddingHorizontal: isSmallScreen ? 2 : isMediumScreen ? 4 : 8,
    fontSize: 16,
    textAlign: 'center',
    fontWeight: '500',
    borderWidth: 1,
    borderColor: 'transparent',
    height: 36,
    minWidth: 0,
  },
  doneBtn: {
    borderRadius: 8,
    height: 36,
    justifyContent: 'center',
    alignItems: 'center',
  },
  deleteSetBtn: {
    borderWidth: 1,
    borderRadius: 8,
    height: 36,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 4,
  },
  addSetRow: {
    flexDirection: 'row',
    height: 48,
    alignItems: 'center',
    justifyContent: 'center',
    borderTopWidth: 1,
    marginHorizontal: -16,
    marginBottom: -16,
    marginTop: 16,
    gap: 6,
  },
  addSetRowText: {
    fontSize: 14,
    fontWeight: '700',
  },
  warmupIconCircle: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 1.5,
    justifyContent: 'center',
    alignItems: 'center',
  },
  warmupIconText: {
    fontSize: 12,
    fontWeight: '800',
    lineHeight: 14,
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
  optionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#2A2B31',
    gap: 12,
  },
  optionText: {
    fontSize: 15,
    fontFamily: 'Manrope_500Medium',
  },
  notesContainer: {
    marginBottom: 16,
    gap: 8,
  },
  tabContainer: {
    flexDirection: 'row',
    backgroundColor: '#0B0B0F',
    borderRadius: 8,
    padding: 3,
    borderWidth: 1,
    borderColor: '#2A2B31',
  },
  tabButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 6,
    borderRadius: 6,
  },
  tabText: {
    fontSize: 12,
    fontFamily: 'SpaceGrotesk_600SemiBold',
  },
  noteInputWrapper: {
    width: '100%',
  },
  noteInput: {
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 8,
    fontSize: 16,
    fontFamily: 'Manrope_500Medium',
    backgroundColor: '#0B0B0F',
  },
  accessoryRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 6,
    paddingHorizontal: 8,
    backgroundColor: '#1E222B',
    borderRadius: 8,
    marginTop: 4,
    borderWidth: 1,
    borderColor: '#2A2B31',
  },
  accessoryBtn: {
    paddingVertical: 4,
    paddingHorizontal: 8,
    backgroundColor: '#2A2B31',
    borderRadius: 6,
    minWidth: 40,
    alignItems: 'center',
  },
  accessoryBtnText: {
    color: '#90D5FF',
    fontFamily: 'SpaceGrotesk_600SemiBold',
    fontSize: 12,
  },
  accessoryBtnCopy: {
    paddingVertical: 4,
    paddingHorizontal: 8,
    backgroundColor: '#90D5FF',
    borderRadius: 6,
    marginLeft: 6,
  },
  accessoryBtnTextCopy: {
    color: '#0B0B0F',
    fontFamily: 'SpaceGrotesk_600SemiBold',
    fontSize: 12,
  },
});
