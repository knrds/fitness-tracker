import { useReducedMotion } from 'react-native-reanimated';
import {
  SET_DELETE_WIDTH,
  shouldCaptureSetSwipe,
  shouldDeleteSetSwipe,
  setSwipeOffset,
  shouldOpenSetSwipe,
} from '../../utils/setSwipe';
import { Theme, useThemeStyles } from '@fitness-tracker/ui';
import { scopedAlert as Alert } from '../../utils/scopedAlert';
import React, { useState, useEffect } from 'react';
import { useRouter } from 'expo-router';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  TextInput,
  Keyboard,
  Platform,
  Modal,
  ScrollView,
  ViewProps,
  LayoutChangeEvent,
  ViewStyle,
  useWindowDimensions,
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
import { useTheme, Card, useDialog, Modal as DetailModal } from '@fitness-tracker/ui';
import { Ionicons } from '@expo/vector-icons';
import { useI18n } from '../../i18n';
import { getBigThreeCategory } from '../../utils/bigThree';

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
  onToggleCollapse?: () => void;
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
  onToggleCollapse,
  dragHandlers,
  onDragStart,
  onDragEnd,
  isDragging: _isDragging = false,
  onSwipeStart,
  onSwipeEnd,
}: Props) => {
  const theme = useTheme();
  const styles = useThemeStyles(createStyles);
  const { height: windowHeight } = useWindowDimensions();
  const compact = true;
  const router = useRouter();
  const { language } = useI18n();
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

  const bigThreeCategory = getBigThreeCategory(exercise.name);
  const profileOneRepMaxKg = React.useMemo(() => {
    if (bigThreeCategory === 'bench') return profile.benchPressMaxKg || 0;
    if (bigThreeCategory === 'squat') return profile.squatMaxKg || 0;
    if (bigThreeCategory === 'deadlift') return profile.deadliftMaxKg || 0;
    return 0;
  }, [bigThreeCategory, profile.benchPressMaxKg, profile.squatMaxKg, profile.deadliftMaxKg]);

  const getHeaderE1rmText = () => {
    if (isCardio) return null;
    const parts: string[] = [];
    if (profileOneRepMaxKg > 0) {
      const disp = isImperial ? profileOneRepMaxKg * 2.20462 : profileOneRepMaxKg;
      parts.push(`1RM: ${disp.toFixed(0)} ${isImperial ? 'lbs' : 'kg'}`);
    }
    if (peakE1RM > 0) {
      parts.push(`Best Est.: ${peakE1RM.toFixed(1)} ${isImperial ? 'lbs' : 'kg'}`);
    } else if (lastPerformance) {
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
        parts.push(`Last Est.: ${lastMaxE1rm.toFixed(1)} ${isImperial ? 'lbs' : 'kg'}`);
      }
    }
    return parts.length > 0 ? parts.join(' · ') : null;
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
      title: language === 'de' ? 'Übung entfernen' : 'Remove Exercise',
      message:
        language === 'de'
          ? 'Möchtest du diese Übung und alle zugehörigen Sätze wirklich entfernen?'
          : 'Are you sure you want to remove this exercise and all its sets?',
      confirmLabel: language === 'de' ? 'Entfernen' : 'Remove',
      cancelLabel: language === 'de' ? 'Abbrechen' : 'Cancel',
      destructive: true,
      showCheckbox: true,
      checkboxLabel: language === 'de' ? 'Nicht mehr anzeigen' : "Don't show again",
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
        alertFn(
          language === 'de'
            ? 'Bitte trage zuerst bei mindestens einem Satz ein Gewicht ein.'
            : 'Please enter weight in at least one set first.',
        );
      } else {
        Alert.alert(
          language === 'de' ? 'Aufwärmrechner' : 'Warmup Calculator',
          language === 'de'
            ? 'Bitte trage zuerst bei mindestens einem Satz ein Gewicht ein, um es als Zielgewicht zu nutzen.'
            : 'Please enter weight in at least one set first to use as target working weight.',
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
      Alert.alert(
        language === 'de' ? 'Supersatz' : 'Superset',
        language === 'de'
          ? 'Übung wurde vom Supersatz getrennt.'
          : 'Exercise unlinked from superset.',
      );
    } else {
      if (currentIdx === totalEx - 1) {
        Alert.alert(
          language === 'de' ? 'Supersatz' : 'Superset',
          language === 'de'
            ? 'Ein Supersatz verbindet diese Übung mit der nächsten. Bitte füge zuerst eine weitere Übung hinzu.'
            : 'Supersets link this exercise with the next one. Please add another exercise first to create a superset.',
        );
      } else {
        toggleSuperset(sessionExercise.id);
        const nextExId = useWorkoutStore.getState().exercises[currentIdx + 1]?.exerciseId;
        const nextEx = exercises.find((e) => e.id === nextExId);
        Alert.alert(
          language === 'de' ? 'Supersatz erstellt' : 'Superset Created',
          language === 'de'
            ? `Diese Übung wurde mit "${nextEx?.name || 'der nächsten Übung'}" als Supersatz verbunden.`
            : `Linked this exercise with "${nextEx?.name || 'the next exercise'}" as a superset.`,
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
        ? theme.colors.success
        : volumeDeltaPercent < 0
          ? theme.colors.error
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

  const historicalBest = React.useMemo(() => {
    let bestWeight = 0;
    let bestE1RM = 0;

    historySessions.forEach((s) => {
      s.exercises.forEach((ex) => {
        if (ex.exerciseId === sessionExercise.exerciseId) {
          ex.sets.forEach((set) => {
            if (set.completed && set.type !== 'warmup' && set.weight && set.reps) {
              if (set.weight > bestWeight) bestWeight = set.weight;
              const e1rm = estimateOneRepMax(set.weight, set.reps, set.rpe, set.rir, exercise.name);
              if (e1rm > bestE1RM) bestE1RM = e1rm;
            }
          });
        }
      });
    });

    return { bestWeight, bestE1RM };
  }, [historySessions, sessionExercise.exerciseId, exercise.name]);

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
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
            <Ionicons name="link-outline" size={12} color={theme.colors.primary} />
            <Text
              style={[
                styles.supersetBadge,
                { color: theme.colors.primary, ...theme.typography.caption },
              ]}
            >
              SUPERSET
            </Text>
          </View>
        </View>
      )}
      <View style={[styles.titleRow, collapsed && { marginBottom: 0, alignItems: 'center' }]}>
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
              {
                color: theme.colors.text,
                fontFamily: 'SpaceGrotesk_700Bold',
                fontSize: 17,
                lineHeight: 23,
              },
            ]}
          >
            {exercise.name}
          </Text>
          {collapsed && (
            <Text
              style={[
                styles.prevText,
                {
                  color: theme.colors.muted,
                  ...theme.typography.caption,
                  fontFamily: 'SpaceGrotesk_700Bold',
                },
              ]}
            >
              {sessionExercise.sets.filter((s) => s.completed).length > 0
                ? language === 'de'
                  ? `${sessionExercise.sets.filter((s) => s.completed).length}/${sessionExercise.sets.length} Sätze abgeschlossen`
                  : `${sessionExercise.sets.filter((s) => s.completed).length}/${sessionExercise.sets.length} sets completed`
                : language === 'de'
                  ? `${sessionExercise.sets.length} ${sessionExercise.sets.length === 1 ? 'Satz' : 'Sätze'}`
                  : `${sessionExercise.sets.length} ${sessionExercise.sets.length === 1 ? 'set' : 'sets'}`}
            </Text>
          )}
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
        <View style={styles.headerIcons}>
          {!collapsed && (
            <Pressable
              onPress={() => setOptionsVisible(true)}
              style={styles.iconBtn}
              accessibilityRole="button"
              accessibilityLabel="Übungsoptionen"
              testID="exercise-options-btn"
            >
              <Ionicons name="ellipsis-horizontal" size={24} color={theme.colors.muted} />
            </Pressable>
          )}
          {onToggleCollapse && (
            <Pressable
              onPress={onToggleCollapse}
              style={styles.iconBtn}
              accessibilityRole="button"
              accessibilityLabel={collapsed ? 'Übung ausklappen' : 'Übung einklappen'}
              testID="exercise-collapse-btn"
            >
              <Ionicons
                name={collapsed ? 'chevron-down' : 'chevron-up'}
                size={20}
                color={theme.colors.muted}
              />
            </Pressable>
          )}
        </View>
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
              {language === 'de' ? 'Satz' : 'Set'}
            </Text>
            <Text style={[styles.columnHeader, styles.weightCol, { color: theme.colors.muted }]}>
              {isCardio ? (language === 'de' ? 'Stufe' : 'Level') : isImperial ? 'lbs' : 'kg'}
            </Text>
            <Text style={[styles.columnHeader, styles.repsCol, { color: theme.colors.muted }]}>
              {isCardio ? 'Min:Sec' : language === 'de' ? 'Wdh.' : 'Reps'}
            </Text>
            {showRpe && !compact && (
              <Text style={[styles.columnHeader, styles.rpeCol, { color: theme.colors.muted }]}>
                RPE
              </Text>
            )}
            {showRir && !compact && (
              <Text style={[styles.columnHeader, styles.rirCol, { color: theme.colors.muted }]}>
                RIR
              </Text>
            )}
            <Text style={[styles.columnHeader, styles.doneCol, { color: theme.colors.muted }]}>
              ✓
            </Text>
            <Text style={[styles.columnHeader, styles.deleteCol, { color: theme.colors.muted }]} />
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

              const setWeightKg = set.weight || 0;
              const setReps = set.reps || 0;
              const setE1RM = estimateOneRepMax(
                setWeightKg,
                setReps,
                set.rpe,
                set.rir,
                exercise.name,
              );
              const isSetPR =
                set.completed &&
                set.type !== 'warmup' &&
                historicalBest.bestE1RM > 0 &&
                (setE1RM > historicalBest.bestE1RM || setWeightKg > historicalBest.bestWeight);

              return (
                <SetRow
                  key={set.id}
                  set={set}
                  isCurrent={
                    set.id ===
                    sessionExercises.flatMap((item) => item.sets).find((item) => !item.completed)
                      ?.id
                  }
                  workingSetNumber={displayIndex}
                  sessionExerciseId={sessionExercise.id}
                  isImperial={isImperial}
                  isCardio={isCardio}
                  compact={compact}
                  showRpe={showRpe}
                  showRir={showRir}
                  isPR={isSetPR}
                  onUpdate={(updates) => updateSet(sessionExercise.id, set.id, updates)}
                  onComplete={() => {
                    const willComplete = !set.completed;
                    completeSet(sessionExercise.id, set.id);
                    if (willComplete) {
                      const willBePR =
                        set.type !== 'warmup' &&
                        historicalBest.bestE1RM > 0 &&
                        (setE1RM > historicalBest.bestE1RM ||
                          setWeightKg > historicalBest.bestWeight);
                      if (willBePR) {
                        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(
                          () => {},
                        );
                      } else {
                        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
                      }
                    }
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
              {language === 'de' ? 'Übungs-Optionen' : 'Exercise Options'}
            </Text>
            <ScrollView style={{ maxHeight: Math.max(120, windowHeight - 240) }}>
              <Pressable
                style={styles.optionRow}
                onPress={() => {
                  setOptionsVisible(false);
                  setInfoModalVisible(true);
                }}
              >
                <Ionicons
                  name="information-circle-outline"
                  size={20}
                  color={theme.colors.primary}
                />
                <Text style={[styles.optionText, { color: theme.colors.text }]}>
                  {language === 'de' ? 'Statistik anzeigen' : 'Show Statistics'}
                </Text>
              </Pressable>
              {!isCardio && (
                <Pressable
                  style={styles.optionRow}
                  onPress={() => {
                    setOptionsVisible(false);
                    handleWarmupCalc();
                  }}
                >
                  <Ionicons name="flame-outline" size={20} color={theme.colors.primary} />
                  <Text style={[styles.optionText, { color: theme.colors.text }]}>
                    {language === 'de' ? 'Aufwärmsätze berechnen' : 'Calculate Warmup Sets'}
                  </Text>
                </Pressable>
              )}
              {!isCardio && (
                <Pressable
                  style={styles.optionRow}
                  onPress={() => {
                    setOptionsVisible(false);
                    setPlateCalcVisible(true);
                  }}
                >
                  <Ionicons name="barbell-outline" size={20} color={theme.colors.primary} />
                  <Text style={[styles.optionText, { color: theme.colors.text }]}>
                    {language === 'de' ? 'Scheibenrechner' : 'Plate Calculator'}
                  </Text>
                </Pressable>
              )}

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
                  {showNotes
                    ? (language === 'de' ? 'Notizen ausblenden' : 'Hide Notes')
                    : (language === 'de' ? 'Notizen einblenden' : 'Show Notes')}
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
                  {language === 'de' ? 'Anleitung anzeigen' : 'Show Instructions'}
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
                  {sessionExercise.supersetGroup
                    ? (language === 'de' ? 'Supersatz trennen' : 'Unlink Superset')
                    : (language === 'de' ? 'Als Supersatz koppeln' : 'Link as Superset')}
                </Text>
              </Pressable>

              <Pressable
                style={styles.optionRow}
                onPress={() => {
                  const rpeDisabled = rpeDisabledExerciseIds.includes(sessionExercise.exerciseId);
                  const nextDisabled = rpeDisabled
                    ? rpeDisabledExerciseIds.filter((id) => id !== sessionExercise.exerciseId)
                    : [...rpeDisabledExerciseIds, sessionExercise.exerciseId];
                  useProfileStore
                    .getState()
                    .updateProfile({ rpeDisabledExerciseIds: nextDisabled });
                  setOptionsVisible(false);
                }}
              >
                <Ionicons
                  name={showRpe ? 'eye-off-outline' : 'eye-outline'}
                  size={20}
                  color={theme.colors.primary}
                />
                <Text style={[styles.optionText, { color: theme.colors.text }]}>
                  {showRpe
                    ? (language === 'de' ? 'RPE verbergen' : 'Hide RPE')
                    : (language === 'de' ? 'RPE anzeigen' : 'Show RPE')}
                </Text>
              </Pressable>

              <Pressable
                style={styles.optionRow}
                onPress={() => {
                  const rirDisabled = rirDisabledExerciseIds.includes(sessionExercise.exerciseId);
                  const nextDisabled = rirDisabled
                    ? rirDisabledExerciseIds.filter((id) => id !== sessionExercise.exerciseId)
                    : [...rirDisabledExerciseIds, sessionExercise.exerciseId];
                  useProfileStore
                    .getState()
                    .updateProfile({ rirDisabledExerciseIds: nextDisabled });
                  setOptionsVisible(false);
                }}
              >
                <Ionicons
                  name={showRir ? 'eye-off-outline' : 'eye-outline'}
                  size={20}
                  color={theme.colors.primary}
                />
                <Text style={[styles.optionText, { color: theme.colors.text }]}>
                  {showRir
                    ? (language === 'de' ? 'RIR verbergen' : 'Hide RIR')
                    : (language === 'de' ? 'RIR anzeigen' : 'Show RIR')}
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
                    {language === 'de' ? 'Nach oben verschieben' : 'Move Up'}
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
                    {language === 'de' ? 'Nach unten verschieben' : 'Move Down'}
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
                <Ionicons name="trash-outline" size={20} color={theme.colors.error} />
                <Text style={[styles.optionText, { color: theme.colors.error }]}>
                  {language === 'de' ? 'Übung löschen' : 'Delete Exercise'}
                </Text>
              </Pressable>
            </ScrollView>
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
                {language === 'de' ? 'Abbrechen' : 'Cancel'}
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
              {exercise.name} {language === 'de' ? 'Info' : 'Info'}
            </Text>

            {/* Stats */}
            <View style={styles.infoStatsGrid}>
              <View style={styles.infoStatBox}>
                <Text style={[styles.infoStatLabel, { color: theme.colors.muted }]}>
                  {language === 'de' ? 'Übungsvolumen' : 'Exercise Vol'}
                </Text>
                <Text style={[styles.infoStatValue, { color: theme.colors.primary }]}>
                  {isImperial ? Math.round(sessionVolume * 2.20462) : Math.round(sessionVolume)}{' '}
                  {isImperial ? 'lbs' : 'kg'}
                </Text>
              </View>
              <View style={styles.infoStatBox}>
                <Text style={[styles.infoStatLabel, { color: theme.colors.muted }]}>
                  {language === 'de' ? 'Vgl. Letztes' : 'Vs Last'}
                </Text>
                <Text style={[styles.infoStatValue, { color: volumeDeltaColor }]}>
                  {volumeDeltaLabel}
                </Text>
              </View>
              <View style={styles.infoStatBox}>
                <Text style={[styles.infoStatLabel, { color: theme.colors.muted }]}>
                  {language === 'de' ? 'Gesamtvolumen' : 'Lifetime Vol'}
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
                  {language === 'de' ? 'Persönlicher Rekord' : 'Personal Record'}
                </Text>
                <Text style={[styles.infoStatValue, { color: theme.colors.primary }]}>
                  {stats.maxWeight > 0
                    ? `${(isImperial ? stats.maxWeight * 2.20462 : stats.maxWeight).toFixed(1).replace(/\.0$/, '')} ${isImperial ? 'lbs' : 'kg'}`
                    : '-'}
                </Text>
              </View>
              {profileOneRepMaxKg > 0 && (
                <View style={styles.infoStatBox}>
                  <Text style={[styles.infoStatLabel, { color: theme.colors.muted }]}>
                    {language === 'de' ? 'Profil 1RM' : 'Profile 1RM'}
                  </Text>
                  <Text style={[styles.infoStatValue, { color: theme.colors.primary }]}>
                    {(isImperial ? profileOneRepMaxKg * 2.20462 : profileOneRepMaxKg)
                      .toFixed(1)
                      .replace(/\.0$/, '')}{' '}
                    {isImperial ? 'lbs' : 'kg'}
                  </Text>
                </View>
              )}
              <View style={styles.infoStatBox}>
                <Text style={[styles.infoStatLabel, { color: theme.colors.muted }]}>
                  {language === 'de' ? 'Durchschn. Gewicht' : 'Avg Weight'}
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
              {language === 'de' ? 'Vorherige Sätze (ohne Warmup)' : 'Previous Sets (No Warmups)'}
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
                          {language === 'de' ? 'Satz' : 'Set'} {sIdx + 1}: {language === 'de' ? 'Stufe' : 'Level'} {s.weight || 0} {language === 'de' ? 'für' : 'for'} {durStr}
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
                        {language === 'de' ? 'Satz' : 'Set'} {sIdx + 1}: {w} {unit} × {s.reps} {language === 'de' ? 'Wdh.' : 'reps'} {s.rpe ? `(RPE ${s.rpe})` : ''}
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
                  {language === 'de' ? 'Keine vorherigen Arbeitssätze.' : 'No previous working sets.'}
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
                {language === 'de' ? 'Anleitung anzeigen' : 'Show Instructions'}
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
                {language === 'de' ? 'Schließen' : 'Close'}
              </Text>
            </Pressable>
          </Pressable>
        </Pressable>
      </Modal>
    </Card>
  );
};

interface SetRowProps {
  compact: boolean;
  set: ExerciseSet;
  isCurrent: boolean;
  workingSetNumber: number;
  sessionExerciseId: string;
  isImperial: boolean;
  isCardio: boolean;
  showRpe: boolean;
  showRir: boolean;
  isPR?: boolean;
  onUpdate: (updates: Partial<ExerciseSet>) => void;
  onComplete: () => void;
  onDelete: () => void;
  prevSet?: ExerciseSet | undefined;
  lastPerformanceSet?: ExerciseSet | undefined;
  onSwipeStart?: (() => void) | undefined;
  onSwipeEnd?: (() => void) | undefined;
}

const SetRow = ({
  compact,
  set,
  isCurrent,
  workingSetNumber,
  isImperial,
  isCardio,
  showRpe,
  showRir,
  isPR = false,
  onUpdate,
  onComplete,
  onDelete,
  lastPerformanceSet,
  onSwipeStart,
  onSwipeEnd,
}: SetRowProps) => {
  const theme = useTheme();
  const styles = useThemeStyles(createStyles);
  const { language } = useI18n();
  const isDone = set.completed;
  const reducedMotion = useReducedMotion();
  const [detailsVisible, setDetailsVisible] = useState(false);
  const closeDetails = () => {
    Keyboard.dismiss();
    setDetailsVisible(false);
  };
  const swipeX = React.useRef(new Animated.Value(0)).current;
  const [measuredHeight, setMeasuredHeight] = useState<number | null>(null);
  const [measuredWidth, setMeasuredWidth] = useState(0);
  const [isDeleting, setIsDeleting] = useState(false);
  const rowHeight = React.useRef(new Animated.Value(0)).current;
  const rowOpacity = React.useRef(new Animated.Value(1)).current;

  const handleLayout = (e: LayoutChangeEvent) => {
    if (!isDeleting) {
      setMeasuredHeight(e.nativeEvent.layout.height);
      setMeasuredWidth(e.nativeEvent.layout.width);
    }
  };

  const handleDeleteSet = React.useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
    setIsDeleting(true);
    rowHeight.setValue(measuredHeight || 52);
    Animated.parallel([
      Animated.timing(swipeX, {
        toValue: -measuredWidth,
        duration: reducedMotion ? 0 : 180,
        useNativeDriver: false,
      }),
      Animated.timing(rowHeight, {
        toValue: 0,
        duration: reducedMotion ? 0 : 200,
        useNativeDriver: false,
      }),
      Animated.timing(rowOpacity, {
        toValue: 0,
        duration: reducedMotion ? 0 : 200,
        useNativeDriver: false,
      }),
    ]).start(() => {
      onDelete();
      setIsDeleting(false);
      rowHeight.setValue(0);
      rowOpacity.setValue(1);
      swipeX.setValue(0);
    });
  }, [onDelete, measuredHeight, measuredWidth, rowHeight, rowOpacity, swipeX, reducedMotion]);

  const [swipeOpen, setSwipeOpen] = useState(false);
  const swipeOrigin = React.useRef(false);
  const snapSwipe = React.useCallback(
    (open: boolean) => {
      setSwipeOpen(open);
      swipeX.stopAnimation();
      Animated.timing(swipeX, {
        toValue: open ? -SET_DELETE_WIDTH : 0,
        duration: reducedMotion ? 0 : 180,
        useNativeDriver: false,
      }).start();
    },
    [swipeX, reducedMotion],
  );
  const closeSwipe = React.useCallback(() => snapSwipe(false), [snapSwipe]);
  const swipeResponder = React.useMemo(
    () =>
      PanResponder.create({
        onMoveShouldSetPanResponder: (_, gesture) =>
          !isDeleting && shouldCaptureSetSwipe(gesture.dx, gesture.dy, swipeOpen),
        onPanResponderGrant: () => {
          swipeX.stopAnimation();
          swipeOrigin.current = swipeOpen;
          onSwipeStart?.();
        },
        onPanResponderMove: (_, gesture) =>
          swipeX.setValue(
            setSwipeOffset(gesture.dx, swipeOrigin.current, measuredWidth || SET_DELETE_WIDTH),
          ),
        onPanResponderTerminationRequest: () => true,
        onPanResponderRelease: (_, gesture) => {
          if (shouldDeleteSetSwipe(gesture.dx, swipeOrigin.current, measuredWidth)) {
            setSwipeOpen(false);
            handleDeleteSet();
          } else {
            snapSwipe(shouldOpenSetSwipe(gesture.dx, gesture.vx, swipeOrigin.current));
          }
          onSwipeEnd?.();
        },
        onPanResponderTerminate: () => {
          closeSwipe();
          onSwipeEnd?.();
        },
      }),
    [
      swipeX,
      swipeOpen,
      isDeleting,
      measuredWidth,
      handleDeleteSet,
      snapSwipe,
      closeSwipe,
      onSwipeStart,
      onSwipeEnd,
    ],
  );

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

  const ghostWeight =
    lastPerformanceSet?.weight != null && lastPerformanceSet.weight > 0
      ? (isImperial ? lastPerformanceSet.weight * 2.20462 : lastPerformanceSet.weight)
          .toFixed(1)
          .replace(/\.0$/, '')
      : undefined;
  const ghostReps =
    lastPerformanceSet?.reps != null && lastPerformanceSet.reps > 0
      ? String(lastPerformanceSet.reps)
      : undefined;

  const handleWeightChange = (text: string) => {
    const normalized = text.replace(',', '.');
    if (!/^\d*(\.\d*)?$/.test(normalized)) return;
    setWeightText(text);
    let val = parseFloat(normalized) || 0;
    if (val > 9999) val = 9999;
    if (isCardio) {
      onUpdate({ weight: val });
    } else {
      onUpdate({ weight: isImperial ? val / 2.20462 : val });
    }
  };

  const [weightText, setWeightText] = useState(getDisplayWeight);
  const [editingWeight, setEditingWeight] = useState(false);
  useEffect(() => {
    if (!editingWeight) {
      const weight = set.weight || 0;
      setWeightText(
        weight === 0
          ? ''
          : isImperial && !isCardio
            ? (weight * 2.20462).toFixed(1).replace(/\.0$/, '')
            : String(weight),
      );
    }
  }, [set.weight, isImperial, isCardio, editingWeight]);

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
          <Text
            style={[
              styles.typeBadge,
              { backgroundColor: theme.colors.surfaceElevated, color: theme.setType.warmup },
            ]}
          >
            W
          </Text>
        );
      case 'drop':
        return (
          <Text
            style={[
              styles.typeBadge,
              { backgroundColor: theme.colors.surfaceElevated, color: theme.setType.dropset },
            ]}
          >
            D
          </Text>
        );
      case 'failure':
        return (
          <Text
            style={[
              styles.typeBadge,
              { backgroundColor: theme.colors.surfaceElevated, color: theme.setType.failure },
            ]}
          >
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

  const effortInputs = (
    <>
      {showRpe && (
        <React.Fragment>
          {compact && <Text style={{ color: theme.colors.muted }}>RPE</Text>}
          <TextInput
            accessibilityLabel={`Satz ${workingSetNumber} RPE`}
            style={[
              styles.input,
              styles.rpeCol,
              { flexGrow: 0, flexShrink: 0, flexBasis: 48, width: '100%', minWidth: 0 },
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
              let rpe = parseFloat(text.replace(',', '.')) || 0;
              if (rpe > 10) rpe = 10;
              onUpdate({ rpe });
            }}
            placeholder="-"
            placeholderTextColor={theme.colors.muted}
            selectTextOnFocus={true}
            inputAccessoryViewID="keyboardDoneAccessory"
          />
        </React.Fragment>
      )}
      {showRir && (
        <React.Fragment>
          {compact && <Text style={{ color: theme.colors.muted }}>RIR</Text>}
          <TextInput
            accessibilityLabel={`Satz ${workingSetNumber} RIR`}
            style={[
              styles.input,
              styles.rirCol,
              { flexGrow: 0, flexShrink: 0, flexBasis: 48, width: '100%', minWidth: 0 },
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
        </React.Fragment>
      )}
    </>
  );

  return (
    <Animated.View
      onLayout={handleLayout}
      style={[styles.rowContainer, animatedStyle]}
      testID={`set-row-${set.id}`}
    >
      <View
        style={[
          styles.swipeFrame,
          Platform.OS === 'web' ? ({ touchAction: 'pan-y' } as ViewStyle) : null,
        ]}
      >
        <Animated.View
          pointerEvents={swipeOpen ? 'auto' : 'none'}
          accessibilityElementsHidden={!swipeOpen}
          aria-hidden={!swipeOpen}
          importantForAccessibility={swipeOpen ? 'auto' : 'no-hide-descendants'}
          style={[
            styles.swipeDeleteBackground,
            {
              backgroundColor: theme.colors.error,
              opacity: swipeX.interpolate({
                inputRange: [-1, 0],
                outputRange: [1, 0],
                extrapolate: 'clamp',
              }),
            },
          ]}
        >
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={`Satz ${workingSetNumber} löschen`}
            accessibilityState={{ disabled: !swipeOpen || isDeleting }}
            disabled={!swipeOpen || isDeleting}
            onPress={() => {
              closeSwipe();
              handleDeleteSet();
            }}
            style={{
              width: SET_DELETE_WIDTH,
              height: '100%',
              position: 'absolute',
              right: 0,
              alignItems: 'center',
              justifyContent: 'center',
              gap: 4,
            }}
          >
            <Ionicons name="trash-outline" size={18} color={theme.colors.onError} />
            <Text style={{ color: theme.colors.onError, fontSize: 11, fontWeight: '600' }}>
              Löschen
            </Text>
          </Pressable>
        </Animated.View>
        <Animated.View
          {...swipeResponder.panHandlers}
          style={[
            {
              transform: [{ translateX: swipeX }],
              backgroundColor: theme.colors.surface,
              borderRadius: 10,
            },
            Platform.OS === 'web' ? ({ touchAction: 'pan-y' } as ViewStyle) : null,
          ]}
        >
          <View
            style={[
              styles.row,
              { backgroundColor: theme.colors.surface },
              isCurrent && {
                borderColor: theme.colors.borderActive,
                backgroundColor: theme.colors.primarySubtle,
              },
              isDone && {
                borderColor: theme.colors.border,
                backgroundColor: theme.colors.surface,
              },
            ]}
          >
            <Pressable
              onPress={cycleSetType}
              style={[styles.setCol, styles.centerAlign, { position: 'relative' }]}
            >
              {isPR && isDone && (
                <View style={styles.prBadge}>
                  <Text style={styles.prBadgeText}>PR</Text>
                </View>
              )}
              {getSetTypeBadge()}
            </Pressable>
            <TextInput
              style={[
                styles.input,
                styles.weightCol,
                { color: theme.colors.text, backgroundColor: theme.colors.background },
                isDone && { color: theme.colors.muted, backgroundColor: theme.colors.surface },
              ]}
              keyboardType="decimal-pad"
              inputMode="decimal"
              accessibilityLabel={`Satz ${workingSetNumber} Gewicht`}
              value={weightText}
              onFocus={() => setEditingWeight(true)}
              onBlur={() => setEditingWeight(false)}
              onChangeText={handleWeightChange}
              placeholder={ghostWeight ?? '-'}
              placeholderTextColor={theme.colors.muted}
              selectTextOnFocus={true}
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
                accessibilityLabel={`Satz ${workingSetNumber} Dauer`}
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
                accessibilityLabel={`Satz ${workingSetNumber} Wiederholungen`}
                value={set.reps ? set.reps.toString() : ''}
                onChangeText={(text) => {
                  let reps = parseInt(text, 10) || 0;
                  if (reps > 999) reps = 999;
                  onUpdate({ reps });
                }}
                placeholder={ghostReps ?? '-'}
                placeholderTextColor={theme.colors.muted}
                selectTextOnFocus={true}
                inputAccessoryViewID="keyboardDoneAccessory"
              />
            )}
            {!compact && effortInputs}
            <Pressable
              style={[
                styles.doneBtn,
                styles.doneCol,
                {
                  backgroundColor: isDone
                    ? isPR
                      ? theme.colors.warning
                      : theme.colors.primary
                    : theme.colors.background,
                  borderWidth: 1,
                  borderColor: isDone
                    ? isPR
                      ? theme.colors.warning
                      : theme.colors.primary
                    : theme.colors.border,
                },
              ]}
              onPress={onComplete}
              accessibilityRole="checkbox"
              accessibilityLabel={`Satz ${workingSetNumber} abschließen`}
              accessibilityState={{ checked: isDone }}
              aria-checked={isDone}
            >
              <Ionicons
                name={isPR && isDone ? 'trophy' : 'checkmark'}
                size={isPR && isDone ? 18 : 20}
                color={
                  isDone
                    ? isPR
                      ? theme.colors.onWarning
                      : theme.colors.onPrimary
                    : theme.colors.muted
                }
              />
            </Pressable>
            <Pressable
              style={[styles.deleteCol, styles.centerAlign, { minHeight: 44 }]}
              accessibilityRole="button"
              accessibilityLabel={`Satz ${workingSetNumber} Details`}
              accessibilityActions={[{ name: 'delete', label: 'Satz entfernen' }]}
              onAccessibilityAction={(event) => {
                if (event.nativeEvent.actionName === 'delete') handleDeleteSet();
              }}
              onPress={() => {
                closeSwipe();
                setDetailsVisible(true);
              }}
            >
              <Ionicons
                name="ellipsis-horizontal"
                size={18}
                color={set.rpe || set.rir !== undefined ? theme.colors.primary : theme.colors.muted}
              />
            </Pressable>
          </View>
        </Animated.View>
      </View>
      <DetailModal
        visible={detailsVisible}
        title={`Satz ${workingSetNumber} · Details`}
        onClose={closeDetails}
        primaryActionTitle="Fertig"
        onPrimaryAction={closeDetails}
      >
        <Text style={{ color: theme.colors.muted, marginBottom: 16, lineHeight: 21 }}>
          RPE beschreibt die Anstrengung. RIR zählt die noch möglichen Wiederholungen.
        </Text>
        <View style={{ gap: 12 }}>{effortInputs}</View>
        <Pressable
          accessibilityRole="button"
          onPress={() => {
            setDetailsVisible(false);
            handleDeleteSet();
          }}
          style={{ minHeight: 48, justifyContent: 'center', marginTop: 16 }}
        >
          <Text style={{ color: theme.colors.error }}>Satz entfernen</Text>
        </Pressable>
      </DetailModal>
      {lastPerformanceSet && (
        <View style={styles.e1rmRow}>
          <Text style={[styles.e1rmText, { color: theme.colors.muted }]}>
            {(() => {
              const s = lastPerformanceSet;
              if (isCardio) {
                const mins = Math.floor((s.durationSeconds || 0) / 60);
                const secs = (s.durationSeconds || 0) % 60;
                const durStr = `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
                return language === 'de'
                  ? `Zuletzt: Stufe ${s.weight || 0} für ${durStr}`
                  : `Last: Lvl ${s.weight || 0} for ${durStr}`;
              }
              if (!s.weight) {
                return language === 'de' ? `Zuletzt: ${s.reps} Wdh.` : `Last: ${s.reps} reps`;
              }
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
              return language === 'de'
                ? `Zuletzt: ${formattedWeight} ${unit} × ${s.reps}${rpeRirStr}`
                : `Last: ${formattedWeight} ${unit} x ${s.reps}${rpeRirStr}`;
            })()}
          </Text>
        </View>
      )}
    </Animated.View>
  );
};

const createStyles = (theme: Theme) =>
  StyleSheet.create({
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
      minWidth: 44,
      minHeight: 44,
      alignItems: 'center',
      justifyContent: 'center',
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
      fontSize: 11,
      fontWeight: '600',
      textAlign: 'center',
    },
    setCol: { width: 28, textAlign: 'center' },
    weightCol: { flex: 1.25, minWidth: 0, textAlign: 'center' },
    repsCol: { flex: 1.0, minWidth: 0, textAlign: 'center' },
    rpeCol: { flex: 0.9, textAlign: 'center' },
    rirCol: { flex: 0.9, textAlign: 'center' },
    doneCol: { width: 44, textAlign: 'center' },
    deleteCol: { width: 44, textAlign: 'center' },

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
      width: '100%',
      justifyContent: 'center',
      alignItems: 'flex-end',
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
      fontSize: 15,
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
    prBadge: {
      position: 'absolute',
      top: -6,
      left: -2,
      backgroundColor: theme.colors.warning,
      paddingHorizontal: 4,
      paddingVertical: 1,
      borderRadius: 4,
      zIndex: 10,
    },
    prBadgeText: {
      color: theme.colors.onWarning,
      fontSize: 8,
      fontWeight: '900',
      letterSpacing: 0.5,
    },
    input: {
      borderRadius: 8,
      marginHorizontal: 2,
      paddingVertical: 6,
      paddingHorizontal: 2,
      fontSize: 16,
      textAlign: 'center',
      fontWeight: '500',
      borderWidth: 1,
      borderColor: 'transparent',
      minHeight: 44,
      minWidth: 0,
    },
    doneBtn: {
      borderRadius: 8,
      minHeight: 44,
      justifyContent: 'center',
      alignItems: 'center',
    },
    deleteSetBtn: {
      borderWidth: 1,
      borderRadius: 8,
      minHeight: 44,
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
      backgroundColor: theme.colors.overlay,
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
      backgroundColor: theme.colors.primarySubtle,
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
      borderTopColor: theme.colors.border,
      paddingTop: 12,
      gap: 10,
    },
    optionRow: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingVertical: 14,
      borderBottomWidth: 1,
      borderBottomColor: theme.colors.border,
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
      backgroundColor: theme.colors.background,
      borderRadius: 8,
      padding: 3,
      borderWidth: 1,
      borderColor: theme.colors.border,
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
      backgroundColor: theme.colors.background,
    },
  });
