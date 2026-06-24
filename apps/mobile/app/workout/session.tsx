import React, { useEffect, useState, useRef, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  TextInput,
  Platform,
  Alert,
  PanResponder,
  Animated,
  NativeSyntheticEvent,
  NativeScrollEvent,
  LayoutAnimation,
  ViewStyle,
  Dimensions,
  useWindowDimensions,
} from 'react-native';
import * as Haptics from 'expo-haptics';
import { useProfileStore } from '../../src/stores/profileStore';
import * as Crypto from 'expo-crypto';
import { useRouter, Stack } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { isIOS } from '../../src/utils/platform';

import {
  TemplateExercise,
  SessionExercise,
  summarizeSessionExercise,
} from '@fitness-tracker/domain';

import { useWorkoutStore } from '../../src/stores/workoutStore';
import { SessionExerciseCard } from '../../src/components/workout/SessionExerciseCard';
import { RestTimer } from '../../src/components/workout/RestTimer';
import { ExercisePickerModal } from '../../src/components/workout/ExercisePickerModal';
import { SaveTemplateModal } from '../../src/components/workout/SaveTemplateModal';
import { useProgramStore } from '../../src/stores/programStore';
import {
  CAFFEINE_PRESETS,
  getCaffeineWarningLevel,
  useCaffeineStore,
} from '../../src/stores/caffeineStore';
import { useTheme, Button, Card } from '@fitness-tracker/ui';

export default function WorkoutSessionScreen() {
  const router = useRouter();
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const { width: viewportWidth } = useWindowDimensions();
  const {
    status,
    name,
    exercises,
    notes,
    finishWorkout,
    addExercise,
    updateWorkoutNotes,
    startedAt,
    pausedAt,
    accumulatedPauseMs,
    resetWorkout,
    reorderExercises,
    templateId,
    setMinimized,
  } = useWorkoutStore();
  const { createTemplate, updateTemplate } = useProgramStore();

  const [pickerVisible, setPickerVisible] = useState(false);
  const [saveModalVisible, setSaveModalVisible] = useState(false);
  const [isFinishing, setIsFinishing] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const [customCaffeineMg, setCustomCaffeineMg] = useState('');

  const [activeDragId, setActiveDragId] = useState<string | null>(null);
  const activeDragIdRef = useRef<string | null>(null);
  const isDraggingActiveRef = useRef(false);
  const dragY = useRef(new Animated.Value(0)).current;
  const dragScale = useRef(new Animated.Value(1)).current;
  const [hoverIndex, setHoverIndex] = useState<number | null>(null);
  const hoverIndexRef = useRef<number | null>(null);
  const draggingExerciseRef = useRef<SessionExercise | null>(null);
  const [scrollEnabled, setScrollEnabled] = useState(true);
  const itemLayouts = useRef<Record<string, { y: number; height: number }>>({});
  const scrollViewRef = useRef<ScrollView>(null);
  const scrollYRef = useRef(0);
  const autoScrollInterval = useRef<ReturnType<typeof setInterval> | null>(null);

  const startAutoScroll = (direction: 'up' | 'down') => {
    if (autoScrollInterval.current) return;
    autoScrollInterval.current = setInterval(() => {
      const currentScrollY = scrollYRef.current;
      const step = 10;
      const newScrollY =
        direction === 'up' ? Math.max(0, currentScrollY - step) : currentScrollY + step;
      scrollViewRef.current?.scrollTo({ y: newScrollY, animated: false });
    }, 16);
  };

  const stopAutoScroll = () => {
    if (autoScrollInterval.current) {
      clearInterval(autoScrollInterval.current);
      autoScrollInterval.current = null;
    }
  };

  const [showHUD, setShowHUD] = useState(false);
  const { restTimer } = useWorkoutStore();
  const {
    isEnabled: caffeineEnabled,
    currentWorkoutMg,
    addPreset,
    addCustomAmount,
    setCurrentWorkoutMg,
  } = useCaffeineStore();
  const [restRemaining, setRestRemaining] = useState(0);


  useEffect(() => {
    let timer: ReturnType<typeof setInterval> | undefined;
    const endsAt = restTimer.endsAt;
    if (restTimer.isRunning && endsAt) {
      const update = () => {
        const endsAtTime = endsAt instanceof Date ? endsAt.getTime() : new Date(endsAt).getTime();
        const rem = Math.max(0, Math.ceil((endsAtTime - Date.now()) / 1000));
        setRestRemaining(rem);
      };
      update();
      timer = setInterval(update, 500);
    }
    return () => {
      if (timer) clearInterval(timer);
    };
  }, [restTimer.isRunning, restTimer.endsAt]);

  const handleScroll = (event: NativeSyntheticEvent<NativeScrollEvent>) => {
    const yOffset = event.nativeEvent.contentOffset.y;
    scrollYRef.current = yOffset;
    setShowHUD(yOffset > 100);
  };

  const panResponder = useMemo(() => {
    return PanResponder.create({
      onStartShouldSetPanResponder: () => false,
      onMoveShouldSetPanResponder: (e, gestureState) => {
        return Math.abs(gestureState.dy) > 2;
      },
      onPanResponderGrant: () => {
        const ex = draggingExerciseRef.current;
        if (ex) {
          activeDragIdRef.current = ex.id;
          isDraggingActiveRef.current = true;
          setActiveDragId(ex.id);
          setScrollEnabled(false);
          dragY.setValue(0);
          dragScale.setValue(1);
          Animated.spring(dragScale, {
            toValue: 1.03,
            useNativeDriver: true,
            tension: 100,
            friction: 6,
          }).start();
        }
      },
      onPanResponderMove: (e, gestureState) => {
        if (!activeDragIdRef.current) return;
        dragY.setValue(gestureState.dy);
        const ex = draggingExerciseRef.current;
        if (ex) {
          const dragIndex = exercises.findIndex((item) => item.id === ex.id);
          if (dragIndex !== -1) {
            const S = 80; // Collapsed height (68) + gap (12)
            const step = Math.round(gestureState.dy / S);
            const targetIndex = Math.max(0, Math.min(exercises.length - 1, dragIndex + step));
            const insertIndex = targetIndex;

            if (insertIndex !== hoverIndexRef.current) {
              hoverIndexRef.current = insertIndex;
              LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
              setHoverIndex(insertIndex);
            }
          }
        }

        // Auto scroll when dragging near screen edges
        const { height: screenHeight } = Dimensions.get('window');
        const touchY = gestureState.moveY;
        if (touchY > 0 && touchY < 180) {
          startAutoScroll('up');
        } else if (touchY > screenHeight - 140) {
          startAutoScroll('down');
        } else {
          stopAutoScroll();
        }
      },
      onPanResponderRelease: (e, gestureState) => {
        stopAutoScroll();
        isDraggingActiveRef.current = false;
        const ex = draggingExerciseRef.current;
        draggingExerciseRef.current = null;
        if (!activeDragIdRef.current) {
          activeDragIdRef.current = null;
          setActiveDragId(null);
          hoverIndexRef.current = null;
          setHoverIndex(null);
          setScrollEnabled(true);
          dragY.setValue(0);
          return;
        }
        activeDragIdRef.current = null;
        if (ex) {
          const dragIndex = exercises.findIndex((item) => item.id === ex.id);
          if (dragIndex !== -1) {
            const S = 80;
            const step = Math.round(gestureState.dy / S);
            const targetIndex = Math.max(0, Math.min(exercises.length - 1, dragIndex + step));
            const insertIndex = targetIndex;

            const otherExercises = exercises.filter((item) => item.id !== ex.id);
            const reordered = [...otherExercises];
            reordered.splice(insertIndex, 0, ex);
            reorderExercises(reordered);
          }
        }
        Animated.parallel([
          Animated.spring(dragY, {
            toValue: 0,
            useNativeDriver: true,
            tension: 80,
            friction: 8,
          }),
          Animated.spring(dragScale, {
            toValue: 1,
            useNativeDriver: true,
            tension: 80,
            friction: 8,
          }),
        ]).start(() => {
          LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
          setActiveDragId(null);
          hoverIndexRef.current = null;
          setHoverIndex(null);
          setScrollEnabled(true);
        });
      },
      onPanResponderTerminate: () => {
        stopAutoScroll();
        draggingExerciseRef.current = null;
        activeDragIdRef.current = null;
        isDraggingActiveRef.current = false;
        Animated.parallel([
          Animated.spring(dragY, {
            toValue: 0,
            useNativeDriver: true,
            tension: 80,
            friction: 8,
          }),
          Animated.spring(dragScale, {
            toValue: 1,
            useNativeDriver: true,
            tension: 80,
            friction: 8,
          }),
        ]).start(() => {
          LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
          setActiveDragId(null);
          hoverIndexRef.current = null;
          setHoverIndex(null);
          setScrollEnabled(true);
        });
      },
    });
  }, [exercises, reorderExercises]);

  useEffect(() => {
    const calculateElapsed = () => {
      if (!startedAt) return 0;
      const startedTime = startedAt instanceof Date ? startedAt : new Date(startedAt);
      const pausedTime = pausedAt
        ? pausedAt instanceof Date
          ? pausedAt
          : new Date(pausedAt)
        : null;
      const endTime = pausedTime || new Date();
      return Math.floor((endTime.getTime() - startedTime.getTime() - accumulatedPauseMs) / 1000);
    };

    setElapsed(calculateElapsed());

    let interval: ReturnType<typeof setInterval> | undefined;
    if (status === 'active') {
      interval = setInterval(() => {
        setElapsed(calculateElapsed());
      }, 1000);
    }
    return () => {
      if (interval) {
        clearInterval(interval);
      }
    };
  }, [status, startedAt, pausedAt, accumulatedPauseMs]);

  if (status === 'idle' || status === 'finished') {
    return (
      <View style={[styles.centered, { backgroundColor: theme.colors.background }]}>
        <Text style={{ color: theme.colors.muted, ...theme.typography.body, marginBottom: 16 }}>
          No active workout.
        </Text>
        <Button title="GO BACK" onPress={() => router.back()} />
      </View>
    );
  }

  const mapToTemplateExercises = (sessionExercises: SessionExercise[]): TemplateExercise[] => {
    return sessionExercises.map((ex) => {
      const workingSets = ex.sets.filter((s) => s.type !== 'warmup');
      const firstSet = workingSets[0] || ex.sets[0];
      return {
        id: Crypto.randomUUID(),
        exerciseId: ex.exerciseId,
        order: ex.order,
        targetSets: workingSets.length > 0 ? workingSets.length : 1,
        ...(firstSet?.reps !== undefined ? { targetReps: firstSet.reps } : {}),
        ...(firstSet?.weight !== undefined ? { targetWeight: firstSet.weight } : {}),
        ...(firstSet?.rpe !== undefined ? { targetRpe: firstSet.rpe } : {}),
        ...(ex.notes !== undefined ? { notes: ex.notes } : {}),
      };
    });
  };

  const checkIfTemplateChanged = () => {
    if (!templateId) return false;
    const { templates } = useProgramStore.getState();
    const originalTemplate = templates.find((t) => t.id === templateId);
    if (!originalTemplate) return false;

    // 1. Check if number of exercises changed
    if (originalTemplate.exercises.length !== exercises.length) return true;

    for (let i = 0; i < exercises.length; i++) {
      const liveEx = exercises[i];
      if (!liveEx) continue;
      const tmplEx = originalTemplate.exercises.find((te) => te.exerciseId === liveEx.exerciseId);

      // 2. Check if exercise is added, removed or replaced
      if (!tmplEx) return true;
      // 3. Check if exercise order changed
      if (liveEx.order !== tmplEx.order) return true;

      // 4. Check if number of sets (excluding warmups) changed
      const workingSets = liveEx.sets.filter((s) => s.type !== 'warmup');
      if (workingSets.length !== tmplEx.targetSets) return true;

      // 5. Check if exercise notes changed
      if ((liveEx.notes || '') !== (tmplEx.notes || '')) return true;
    }

    return false;
  };

  const finalizeWorkout = async () => {
    if (isFinishing) return;
    setIsFinishing(true);

    const finishedSession = finishWorkout();
    if (!finishedSession) {
      setSaveModalVisible(false);
      router.replace('/');
      return;
    }

    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
    router.replace('/');
  };

  const handleFinish = () => {
    if (isFinishing) return;
    const hasCompletedSet = exercises.some((ex) => ex.sets.some((set) => set.completed));
    if (!hasCompletedSet) {
      finalizeWorkout();
      return;
    }

    if (templateId) {
      const hasChanged = checkIfTemplateChanged();
      if (!hasChanged) {
        // No changes to template, just save the workout session history and exit!
        finalizeWorkout();
        return;
      }
    }

    setSaveModalVisible(true);
  };

  const handleUpdateTemplate = () => {
    if (isFinishing || !templateId) return;
    updateTemplate(templateId, {
      exercises: mapToTemplateExercises(exercises),
    });
    setSaveModalVisible(false);
    finalizeWorkout();
  };

  const handleSaveTemplate = (templateName: string) => {
    if (isFinishing) return;
    createTemplate({
      name: templateName,
      exercises: mapToTemplateExercises(exercises),
    });
    setSaveModalVisible(false);
    finalizeWorkout();
  };

  const handleSkipTemplate = () => {
    if (isFinishing) return;
    setSaveModalVisible(false);
    finalizeWorkout();
  };

  const handleAddExercise = () => {
    setPickerVisible(true);
  };

  const formatElapsed = (secs: number) => {
    const h = Math.floor(secs / 3600);
    const m = Math.floor((secs % 3600) / 60);
    const s = secs % 60;
    if (h > 0) {
      return `${h}:${m < 10 ? '0' : ''}${m}:${s < 10 ? '0' : ''}${s}`;
    }
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

  const handleBackAction = () => {
    if (Platform.OS === 'web') {
      const confirmFn = (globalThis as { confirm?: (msg: string) => boolean }).confirm;
      if (
        confirmFn?.(
          'Möchtest du das aktuelle Training abbrechen (löschen) oder weiter trainieren?\n\n[OK] = Abbrechen, [Abbrechen] = Weiter trainieren',
        )
      ) {
        resetWorkout();
        router.replace('/');
      }
      return;
    }

    Alert.alert(
      'Training verlassen',
      'Möchtest du das aktuelle Training abbrechen (löschen) oder weiter trainieren?',
      [
        {
          text: 'Weiter trainieren',
          style: 'cancel',
          onPress: () => {},
        },
        {
          text: 'Abbrechen',
          style: 'destructive',
          onPress: () => {
            resetWorkout();
            router.replace('/');
          },
        },
      ],
    );
  };

  const completedSetsCount = exercises.reduce(
    (acc, ex) => acc + ex.sets.filter((s) => s.completed).length,
    0,
  );
  const totalSetsCount = exercises.reduce((acc, ex) => acc + ex.sets.length, 0);
  const progressPercent = totalSetsCount > 0 ? (completedSetsCount / totalSetsCount) * 100 : 0;

  const totalVolume = exercises.reduce(
    (sum, exercise) => sum + summarizeSessionExercise(exercise).totalVolume,
    0,
  );
  const preferredUnits = useProfileStore.getState().profile?.preferredUnits || 'metric';
  const isImperial = preferredUnits === 'imperial';
  const volumeDisplay = isImperial ? Math.round(totalVolume * 2.20462) : Math.round(totalVolume);
  const caffeineWarningLevel = getCaffeineWarningLevel(currentWorkoutMg);
  const caffeineTrollText = currentWorkoutMg > 1500 ? 'Come on jetzt trollst du aber...' : null;
  const caffeineWarningText =
    caffeineTrollText ??
    (caffeineWarningLevel === 'extreme'
      ? 'Extreme intake. Consider slowing down and hydrate.'
      : caffeineWarningLevel === 'high'
        ? 'High caffeine day. Keep an eye on jitters and sleep.'
        : null);

  const handleAddCustomCaffeine = () => {
    const amount = parseInt(customCaffeineMg, 10);
    if (!Number.isFinite(amount) || amount <= 0) return;
    addCustomAmount(amount);
    setCustomCaffeineMg('');
  };

  const isMobileWeb = Platform.OS === 'web' && viewportWidth <= 480;
  const needsGenerousTopInset = isIOS || isMobileWeb;
  const topSafeArea = needsGenerousTopInset ? Math.max(insets.top, 48) : Math.max(insets.top, 12);
  const headerBodyHeight = 68;
  const headerHeight = topSafeArea + headerBodyHeight;


  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <Stack.Screen
        options={{
          headerShown: false,
        }}
      />

      {/* Mock Dynamic Island Removed */}

      {/* Unified Header */}
      <View
        style={[
          styles.headerContainer,
          {
            backgroundColor: theme.colors.surface,
            borderBottomColor: showHUD ? theme.colors.border : theme.colors.muted,
            height: headerHeight,
            minHeight: headerHeight,
            paddingTop: topSafeArea,
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            zIndex: 99999,
          },
        ]}
      >
        {showHUD ? (
          <View key="hud-header" style={styles.hudRow}>
            <View style={styles.hudStatsGroup}>
              <View style={styles.hudCol}>
                <Ionicons
                  name="barbell-outline"
                  size={16}
                  color={theme.colors.muted}
                  style={{ marginRight: 4 }}
                />
                <Text style={[styles.hudText, { color: theme.colors.text }]} numberOfLines={1}>
                  {volumeDisplay} {isImperial ? 'lbs' : 'kg'}
                </Text>
              </View>
              <View style={styles.hudCol}>
                <Ionicons
                  name={restTimer.isRunning ? 'timer-outline' : 'time-outline'}
                  size={16}
                  color={restTimer.isRunning ? '#4ade80' : theme.colors.muted}
                  style={{ marginRight: 4 }}
                />
                <Text
                  style={[
                    styles.hudText,
                    {
                      color: restTimer.isRunning ? '#4ade80' : theme.colors.text,
                      fontFamily: 'SpaceGrotesk_700Bold',
                    },
                  ]}
                  numberOfLines={1}
                >
                  {restTimer.isRunning ? `Rest: ${formatElapsed(restRemaining)}` : formatElapsed(elapsed)}
                </Text>
              </View>
            </View>
            <Button
              title="FINISH"
              variant="primary"
              onPress={handleFinish}
              style={styles.hudFinishButton}
            />
          </View>
        ) : (
          <View key="standard-header" style={styles.standardHeaderContent}>
            <View style={styles.headerLeft}>
              <Pressable onPress={handleBackAction} style={{ paddingRight: 12 }} accessibilityLabel="Training beenden">
                <Ionicons name="close" size={24} color={theme.colors.muted} />
              </Pressable>
              <Pressable
                onPress={() => {
                  setMinimized(true);
                  router.navigate('/(tabs)/workouts');
                }}
                style={{ paddingRight: 12 }}
                accessibilityLabel="Training minimieren"
              >
                <Ionicons name="chevron-down" size={24} color={theme.colors.primary} />
              </Pressable>
              <View style={styles.headerTitleGroup}>
                <Text
                  numberOfLines={1}
                  style={[
                    styles.standardTitle,
                    theme.typography.heading,
                    { color: theme.colors.text },
                  ]}
                >
                  {name}
                </Text>
                <View style={{ flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap' }}>
                  <Text
                    numberOfLines={1}
                    style={[
                      styles.standardElapsed,
                      theme.typography.display,
                      { color: theme.colors.primary },
                    ]}
                  >
                    {formatElapsed(elapsed)}
                  </Text>
                  {restTimer.isRunning && (
                    <View
                      style={{
                        flexDirection: 'row',
                        alignItems: 'center',
                        backgroundColor: 'rgba(74, 222, 128, 0.15)',
                        borderColor: '#4ade80',
                        borderWidth: 1,
                        borderRadius: 6,
                        paddingHorizontal: 6,
                        paddingVertical: 2,
                        marginLeft: 8,
                      }}
                    >
                      <Ionicons name="timer-outline" size={14} color="#4ade80" style={{ marginRight: 3 }} />
                      <Text
                        style={{
                          color: '#4ade80',
                          fontFamily: 'SpaceGrotesk_700Bold',
                          fontSize: 12,
                        }}
                      >
                        Rest: {formatElapsed(restRemaining)}
                      </Text>
                    </View>
                  )}
                </View>
              </View>
            </View>
            <Button
              title="FINISH"
              variant="primary"
              onPress={handleFinish}
              style={{ height: 40, paddingHorizontal: 16 }}
            />
          </View>
        )}

        {/* Progress Bar */}
        {totalSetsCount > 0 && (
          <View
            style={{
              height: 2,
              position: 'absolute',
              bottom: 0,
              left: 0,
              right: 0,
              backgroundColor: theme.colors.border,
            }}
          >
            <View
              style={{
                height: '100%',
                width: `${progressPercent}%`,
                backgroundColor: theme.colors.primary,
              }}
            />
          </View>
        )}
      </View>

      <ScrollView
        ref={scrollViewRef}
        style={styles.content}
        contentContainerStyle={[styles.contentContainer, { paddingTop: headerHeight + 16 }]}
        keyboardDismissMode="none"
        keyboardShouldPersistTaps="always"
        scrollEnabled={scrollEnabled}
        onScroll={handleScroll}
        scrollEventThrottle={16}
      >
        {caffeineEnabled && (
          <Card padding="md" style={styles.caffeineCard}>
            <View style={styles.caffeineHeader}>
              <View style={styles.caffeineTitleRow}>
                <Ionicons name="flash-outline" size={16} color={theme.colors.primary} />
                <Text style={[styles.caffeineTitle, { color: theme.colors.text }]}>Caffeine</Text>
              </View>
              <Text
                style={[
                  styles.caffeineAmount,
                  {
                    color:
                      caffeineWarningLevel === 'normal'
                        ? theme.colors.primary
                        : caffeineWarningLevel === 'high'
                          ? '#FFB020'
                          : theme.colors.accent,
                  },
                ]}
              >
                {currentWorkoutMg} mg
              </Text>
            </View>
            {caffeineWarningText && (
              <Text
                style={[
                  caffeineTrollText ? styles.caffeineTrollWarning : styles.caffeineWarning,
                  {
                    color: caffeineTrollText ? '#FFE8E8' : theme.colors.accent,
                    backgroundColor: caffeineTrollText ? '#B00020' : 'transparent',
                  },
                ]}
              >
                {caffeineWarningText}
              </Text>
            )}
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.caffeinePresetRow}
            >
              {CAFFEINE_PRESETS.map((preset) => (
                <Pressable
                  key={preset.id}
                  style={[styles.caffeineChip, { borderColor: theme.colors.border }]}
                  onPress={() => addPreset(preset.id)}
                >
                  <Text style={[styles.caffeineChipName, { color: theme.colors.text }]}>
                    {preset.name}
                  </Text>
                  <Text style={[styles.caffeineChipMeta, { color: theme.colors.muted }]}>
                    +{preset.caffeineMg} mg
                  </Text>
                </Pressable>
              ))}
            </ScrollView>
            <View style={styles.caffeineCustomRow}>
              <TextInput
                style={[
                  styles.caffeineInput,
                  {
                    color: theme.colors.text,
                    borderColor: theme.colors.border,
                    backgroundColor: theme.colors.background,
                  },
                ]}
                value={customCaffeineMg}
                onChangeText={setCustomCaffeineMg}
                placeholder="mg"
                placeholderTextColor={theme.colors.muted}
                keyboardType="numeric"
                onSubmitEditing={handleAddCustomCaffeine}
              />
              <Pressable
                style={[styles.caffeineSmallButton, { borderColor: theme.colors.border }]}
                onPress={handleAddCustomCaffeine}
              >
                <Text style={[styles.caffeineSmallButtonText, { color: theme.colors.primary }]}>
                  Add
                </Text>
              </Pressable>
              <Pressable
                style={[styles.caffeineSmallButton, { borderColor: theme.colors.border }]}
                onPress={() => setCurrentWorkoutMg(0)}
              >
                <Text style={[styles.caffeineSmallButtonText, { color: theme.colors.muted }]}>
                  Clear
                </Text>
              </Pressable>
            </View>
          </Card>
        )}

        {exercises.map((ex) => {
          const isDraggingThis = ex.id === activeDragId;
          const otherExercises = exercises.filter((item) => item.id !== activeDragId);
          const isHovered =
            activeDragId !== null &&
            hoverIndex !== null &&
            otherExercises[hoverIndex]?.id === ex.id;

          let shiftY = 0;
          if (activeDragId !== null && activeDragId !== ex.id && hoverIndex !== null) {
            const dragIndex = exercises.findIndex((item) => item.id === activeDragId);
            const myIndex = exercises.findIndex((item) => item.id === ex.id);
            const totalShift = 80; // Collapsed card height (68) + gap (12)

            if (myIndex < dragIndex) {
              if (myIndex >= hoverIndex) {
                shiftY = totalShift;
              }
            } else if (myIndex > dragIndex) {
              if (myIndex < hoverIndex) {
                shiftY = -totalShift;
              }
            }
          }

          return (
            <Animated.View
              key={ex.id}
              onLayout={(e) => {
                if (!isDraggingActiveRef.current && activeDragId !== ex.id) {
                  itemLayouts.current[ex.id] = {
                    y: e.nativeEvent.layout.y,
                    height: e.nativeEvent.layout.height,
                  };
                }
              }}
              style={[
                isHovered && {
                  borderColor: '#90D5FF',
                  borderWidth: 1.5,
                  borderStyle: 'dashed',
                  backgroundColor: 'rgba(144, 213, 255, 0.05)',
                  borderRadius: theme.radius.md || 12,
                },
                isDraggingThis && {
                  transform: [{ translateY: dragY }, { scale: dragScale }],
                  zIndex: 9999,
                  opacity: 0.85,
                  shadowColor: '#000',
                  shadowOffset: { width: 0, height: 4 },
                  shadowOpacity: 0.35,
                  shadowRadius: 6,
                  elevation: 5,
                },
                !isDraggingThis &&
                  activeDragId !== null && {
                    transform: [{ translateY: shiftY }],
                  },
                Platform.OS === 'web' &&
                  activeDragId !== null &&
                  ({
                    transition: 'transform 0.2s ease',
                  } as unknown as ViewStyle),
              ]}
            >
              <SessionExerciseCard
                sessionExercise={ex}
                dragHandlers={panResponder.panHandlers}
                onDragStart={() => {
                  draggingExerciseRef.current = ex;
                  activeDragIdRef.current = ex.id;
                  setActiveDragId(ex.id);
                  setScrollEnabled(false);
                }}
                onDragEnd={() => {
                  if (!isDraggingActiveRef.current) {
                    draggingExerciseRef.current = null;
                    activeDragIdRef.current = null;
                    setActiveDragId(null);
                    setScrollEnabled(true);
                  }
                }}
                isDragging={isDraggingThis}
                collapsed={activeDragId !== null}
              />
            </Animated.View>
          );
        })}

        <Button
          title="+ ADD EXERCISE"
          variant="secondary"
          onPress={handleAddExercise}
          style={{ marginBottom: 24 }}
        />

        <Card padding="md" style={styles.notesContainer}>
          <Text
            style={[
              {
                color: theme.colors.text,
                ...theme.typography.heading,
                fontSize: 16,
                marginBottom: 8,
              },
            ]}
          >
            WORKOUT NOTES
          </Text>
          <TextInput
            style={[styles.notesInput, { color: theme.colors.text, ...theme.typography.body }]}
            value={notes}
            onChangeText={updateWorkoutNotes}
            placeholder="Write a general note about your workout..."
            placeholderTextColor={theme.colors.muted}
            multiline
            numberOfLines={3}
          />
        </Card>
      </ScrollView>

      <RestTimer />

      <ExercisePickerModal
        visible={pickerVisible}
        onClose={() => setPickerVisible(false)}
        onSelect={(ids) => ids.forEach((id) => addExercise(id))}
      />

      <SaveTemplateModal
        visible={saveModalVisible}
        defaultName={name}
        onClose={() => setSaveModalVisible(false)}
        onSave={handleSaveTemplate}
        onSkip={handleSkipTemplate}
        templateId={templateId}
        onUpdate={handleUpdateTemplate}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerContainer: {
    borderBottomWidth: 1,
    paddingHorizontal: 24,
    paddingBottom: 8,
    justifyContent: 'center',
    overflow: 'visible',
  },
  hudRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    alignSelf: 'stretch',
    flex: 1,
    gap: 10,
    minHeight: 52,
  },
  hudStatsGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    minWidth: 0,
    gap: 14,
  },
  hudFinishButton: {
    height: 34,
    paddingHorizontal: 12,
    flexShrink: 0,
  },
  standardHeaderContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    alignSelf: 'stretch',
    flex: 1,
    minHeight: 52,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    minWidth: 0,
    paddingRight: 12,
  },
  headerTitleGroup: {
    flex: 1,
    minWidth: 0,
  },
  standardTitle: {
    fontSize: 18,
    lineHeight: 22,
  },
  standardElapsed: {
    fontSize: 20,
    lineHeight: 24,
  },
  title: {
    marginBottom: 2,
  },
  timer: {
    marginTop: 2,
  },
  content: {
    flex: 1,
  },
  contentContainer: {
    padding: 24,
    paddingBottom: 100,
  },
  caffeineCard: {
    marginBottom: 16,
  },
  caffeineHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  caffeineTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    minWidth: 0,
    flex: 1,
  },
  caffeineTitle: {
    fontFamily: 'SpaceGrotesk_700Bold',
    fontSize: 14,
    textTransform: 'uppercase',
  },
  caffeineAmount: {
    fontFamily: 'SpaceGrotesk_700Bold',
    fontSize: 18,
    fontVariant: ['tabular-nums'],
  },
  caffeineWarning: {
    fontFamily: 'Manrope_500Medium',
    fontSize: 12,
    lineHeight: 16,
    marginTop: 8,
  },
  caffeineTrollWarning: {
    alignSelf: 'flex-start',
    borderRadius: 10,
    fontFamily: 'SpaceGrotesk_700Bold',
    fontSize: 16,
    lineHeight: 22,
    marginTop: 10,
    overflow: 'hidden',
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  caffeinePresetRow: {
    gap: 8,
    paddingVertical: 12,
  },
  caffeineChip: {
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 8,
    minWidth: 104,
  },
  caffeineChipName: {
    fontFamily: 'SpaceGrotesk_700Bold',
    fontSize: 12,
  },
  caffeineChipMeta: {
    fontFamily: 'Manrope_500Medium',
    fontSize: 11,
    marginTop: 2,
  },
  caffeineCustomRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  caffeineInput: {
    borderWidth: 1,
    borderRadius: 10,
    height: 40,
    minWidth: 72,
    paddingHorizontal: 12,
    fontFamily: 'SpaceGrotesk_700Bold',
    fontSize: 16,
    fontVariant: ['tabular-nums'],
  },
  caffeineSmallButton: {
    borderWidth: 1,
    borderRadius: 10,
    height: 40,
    paddingHorizontal: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  caffeineSmallButtonText: {
    fontFamily: 'SpaceGrotesk_700Bold',
    fontSize: 12,
    textTransform: 'uppercase',
  },
  notesContainer: {
    marginBottom: 24,
  },
  notesInput: {
    minHeight: 60,
    textAlignVertical: 'top',
    fontSize: 16,
  },
  hudCol: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  hudText: {
    fontSize: 12,
    lineHeight: 16,
    fontFamily: 'SpaceGrotesk_700Bold',
  },
  hudDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  islandContainer: {
    position: 'absolute',
    top: isIOS ? 48 : 12,
    alignSelf: 'center',
    height: 38,
    zIndex: 999999,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
    elevation: 10,
    overflow: 'hidden',
  },
  islandContent: {
    flex: 1,
    paddingHorizontal: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  islandCollapsedRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  islandExpandedRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    width: '100%',
  },
  islandLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  islandText: {
    fontSize: 12,
    lineHeight: 16,
    fontFamily: 'SpaceGrotesk_700Bold',
  },
  islandControls: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  islandBtn: {
    backgroundColor: '#1C1E26',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 99,
  },
  islandBtnText: {
    color: '#90D5FF',
    fontSize: 10,
    fontFamily: 'SpaceGrotesk_700Bold',
  },
});
