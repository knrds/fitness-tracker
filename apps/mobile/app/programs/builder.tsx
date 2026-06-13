import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  ScrollView,
  Pressable,
  Alert,
  Platform,
  Modal,
  PanResponder,
  Animated,
  ViewStyle,
  LayoutAnimation,
} from 'react-native';
import { useLocalSearchParams, useRouter, Stack } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as Crypto from 'expo-crypto';
import { useProgramStore } from '../../src/stores/programStore';
import { useWorkoutStore } from '../../src/stores/workoutStore';
import { useHistoryStore } from '../../src/stores/historyStore';
import {
  WorkoutTemplate,
  TemplateExercise,
  SessionExercise,
  WorkoutSession,
  ProgramWorkout,
  Program,
} from '@fitness-tracker/domain';
import { useTheme } from '@fitness-tracker/ui';

export default function ProgramBuilderScreen() {
  const router = useRouter();
  const theme = useTheme();
  const { id } = useLocalSearchParams<{ id?: string }>();
  const { programs, updateProgram, templates, createTemplate } = useProgramStore();
  const { sessions } = useHistoryStore();

  const program = programs.find((p) => p.id === id);
  const [localProgram, setLocalProgram] = useState<Program | null>(null);

  useEffect(() => {
    if (program && !localProgram) {
      setLocalProgram({
        ...program,
        workouts: program.workouts.map((w) => ({ ...w })),
      });
    }
  }, [program, localProgram]);

  const activeProgram = localProgram || program;

  const { status: activeWorkoutStatus, startWorkoutFromTemplate } = useWorkoutStore();
  const [selectedWeek, setSelectedWeek] = useState(1);
  const [activeDay, setActiveDay] = useState<number | null>(null);
  const [modalMode, setModalMode] = useState<'options' | 'templates' | null>(null);
  const [pickerTab, setPickerTab] = useState<'templates' | 'history'>('templates');

  const dayLayouts = React.useRef<Record<number, { y: number; height: number }>>({});
  const [scrollEnabled, setScrollEnabled] = useState(true);
  const [activeDragId, setActiveDragId] = useState<string | null>(null);
  const activeDragIdRef = React.useRef<string | null>(null);
  const isDraggingActiveRef = React.useRef(false);
  const dragY = React.useRef(new Animated.Value(0)).current;
  const draggingWorkoutRef = React.useRef<ProgramWorkout | null>(null);

  const panResponder = React.useMemo(() => {
    return PanResponder.create({
      onStartShouldSetPanResponder: () => false,
      onMoveShouldSetPanResponder: (e, gestureState) => {
        return Math.abs(gestureState.dy) > 2;
      },
      onPanResponderGrant: () => {
        const wk = draggingWorkoutRef.current;
        if (wk) {
          activeDragIdRef.current = wk.id;
          isDraggingActiveRef.current = true;
          setActiveDragId(wk.id);
          setScrollEnabled(false);
          dragY.setValue(0);
        }
      },
      onPanResponderMove: (e, gestureState) => {
        if (!activeDragIdRef.current) return;
        dragY.setValue(gestureState.dy);
      },
      onPanResponderRelease: (e, gestureState) => {
        isDraggingActiveRef.current = false;
        const wk = draggingWorkoutRef.current;
        draggingWorkoutRef.current = null;
        activeDragIdRef.current = null;

        if (wk && activeProgram) {
          const initialDay = wk.dayOfWeek;
          const layout = dayLayouts.current[initialDay];
          if (layout) {
            const dropY = layout.y + wk.order * 60 + gestureState.dy;

            let targetDay = initialDay;
            let minDistance = Infinity;

            Object.entries(dayLayouts.current).forEach(([dayStr, dLayout]) => {
              const dayNum = parseInt(dayStr, 10);
              const centerY = dLayout.y + dLayout.height / 2;
              const dist = Math.abs(dropY - centerY);
              if (dist < minDistance) {
                minDistance = dist;
                targetDay = dayNum;
              }
            });

            const otherWorkouts = activeProgram.workouts.filter(
              (w: ProgramWorkout) => w.id !== wk.id,
            );
            const targetDayWorkouts = otherWorkouts
              .filter((w: ProgramWorkout) => w.week === selectedWeek && w.dayOfWeek === targetDay)
              .sort((a: ProgramWorkout, b: ProgramWorkout) => a.order - b.order);

            const dayLayout = dayLayouts.current[targetDay];
            let insertIndex = targetDayWorkouts.length;
            if (dayLayout) {
              const relativeY = dropY - dayLayout.y - 45;
              insertIndex = Math.max(
                0,
                Math.min(targetDayWorkouts.length, Math.round(relativeY / 60)),
              );
            }

            const newWorkout = {
              ...wk,
              dayOfWeek: targetDay,
              order: insertIndex,
            };

            targetDayWorkouts.splice(insertIndex, 0, newWorkout);
            const reorderedTargetDayWorkouts = targetDayWorkouts.map(
              (w: ProgramWorkout, idx: number) => ({
                ...w,
                order: idx,
              }),
            );

            handleChange({
              workouts: [
                ...otherWorkouts.filter(
                  (w: ProgramWorkout) => !(w.week === selectedWeek && w.dayOfWeek === targetDay),
                ),
                ...reorderedTargetDayWorkouts,
              ],
            });
          }
        }

        LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
        setActiveDragId(null);
        setScrollEnabled(true);
        dragY.setValue(0);
      },
      onPanResponderTerminate: () => {
        draggingWorkoutRef.current = null;
        activeDragIdRef.current = null;
        isDraggingActiveRef.current = false;
        LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
        setActiveDragId(null);
        setScrollEnabled(true);
        dragY.setValue(0);
      },
    });
  }, [activeProgram, selectedWeek]);

  const mapToTemplateExercises = (sessionExercises: SessionExercise[]): TemplateExercise[] => {
    return sessionExercises.map((ex) => {
      const firstSet = ex.sets[0];
      return {
        id: Crypto.randomUUID(),
        exerciseId: ex.exerciseId,
        order: ex.order,
        targetSets: ex.sets.length > 0 ? ex.sets.length : 1,
        ...(firstSet?.reps !== undefined ? { targetReps: firstSet.reps } : {}),
        ...(firstSet?.weight !== undefined ? { targetWeight: firstSet.weight } : {}),
        ...(firstSet?.rpe !== undefined ? { targetRpe: firstSet.rpe } : {}),
        ...(ex.notes !== undefined ? { notes: ex.notes } : {}),
      };
    });
  };

  const handleStartTemplate = (template: WorkoutTemplate | undefined, programId: string) => {
    if (!template) return;

    const start = () => {
      startWorkoutFromTemplate(template, programId);
      router.navigate('/workout/session');
    };

    if (activeWorkoutStatus === 'active' || activeWorkoutStatus === 'paused') {
      if (Platform.OS === 'web') {
        if (typeof globalThis !== 'undefined' && 'confirm' in globalThis) {
          const confirmFn = (globalThis as { confirm?: (msg: string) => boolean }).confirm;
          if (
            confirmFn?.(
              'An active workout is already in progress. Do you want to discard it and start this template instead?',
            )
          ) {
            start();
          }
        }
      } else {
        Alert.alert(
          'Workout In Progress',
          'An active workout is already in progress. Do you want to discard it and start this template instead?',
          [
            { text: 'Cancel', style: 'cancel' },
            { text: 'Discard & Start', style: 'destructive', onPress: start },
          ],
        );
      }
    } else {
      start();
    }
  };

  const handleSave = () => {
    if (localProgram && program) {
      updateProgram(program.id, localProgram);
      Alert.alert('Success', 'Plan saved successfully!');
      router.back();
    }
  };

  const handleCancel = () => {
    if (localProgram && program) {
      const isChanged =
        localProgram.name !== program.name ||
        localProgram.description !== program.description ||
        localProgram.durationWeeks !== program.durationWeeks ||
        JSON.stringify(localProgram.workouts) !== JSON.stringify(program.workouts);

      if (isChanged) {
        if (Platform.OS === 'web') {
          const confirmFn = (globalThis as { confirm?: (msg: string) => boolean }).confirm;
          if (confirmFn?.('Discard unsaved changes?')) {
            router.back();
          }
        } else {
          Alert.alert('Unsaved Changes', 'Are you sure you want to discard your changes?', [
            { text: 'Keep Editing', style: 'cancel' },
            { text: 'Discard', style: 'destructive', onPress: () => router.back() },
          ]);
        }
      } else {
        router.back();
      }
    } else {
      router.back();
    }
  };

  const handleSelectTemplate = (templateId: string) => {
    if (!activeProgram || activeDay === null) return;
    const newWorkout = {
      id: Crypto.randomUUID(),
      templateId,
      week: selectedWeek,
      dayOfWeek: activeDay,
      order: activeProgram.workouts.filter(
        (w: ProgramWorkout) => w.week === selectedWeek && w.dayOfWeek === activeDay,
      ).length,
    };
    handleChange({
      workouts: [...activeProgram.workouts, newWorkout],
    });
    setActiveDay(null);
    setModalMode(null);
  };

  const handleSelectHistorySession = (session: WorkoutSession) => {
    const templateId = Crypto.randomUUID();
    createTemplate({
      id: templateId,
      name: `${session.name} (Copy)`,
      exercises: mapToTemplateExercises(session.exercises),
    });
    handleSelectTemplate(templateId);
  };

  if (!activeProgram) {
    return (
      <View style={styles.centered}>
        <Text style={{ color: '#F4F5F7' }}>Program not found.</Text>
      </View>
    );
  }

  const handleChange = (updates: Partial<Program>) => {
    if (!localProgram) return;
    setLocalProgram({
      ...localProgram,
      ...updates,
    });
  };

  const getDayName = (day: number) => {
    const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
    return days[day - 1];
  };

  const removeWorkout = (workoutId: string) => {
    handleChange({
      workouts: activeProgram.workouts.filter((w: ProgramWorkout) => w.id !== workoutId),
    });
  };

  return (
    <View style={{ flex: 1, backgroundColor: theme.colors.background }}>
      <Stack.Screen
        options={{
          title: activeProgram.name || 'Plan Editor',
          headerShown: true,
          headerLeft: () => (
            <Pressable onPress={handleCancel} hitSlop={15} style={{ paddingLeft: 8 }}>
              <Text
                style={{
                  color: theme.colors.accent,
                  fontFamily: 'SpaceGrotesk_700Bold',
                  fontSize: 15,
                }}
              >
                Cancel
              </Text>
            </Pressable>
          ),
          headerRight: () => (
            <Pressable onPress={handleSave} hitSlop={15} style={{ paddingRight: 8 }}>
              <Text
                style={{
                  color: theme.colors.primary,
                  fontFamily: 'SpaceGrotesk_700Bold',
                  fontSize: 15,
                }}
              >
                Save
              </Text>
            </Pressable>
          ),
        }}
      />
      <ScrollView contentContainerStyle={styles.content} scrollEnabled={scrollEnabled}>
        <Text style={styles.label}>Program Name</Text>
        <TextInput
          style={[
            styles.input,
            {
              backgroundColor: theme.colors.surface,
              borderColor: theme.colors.border,
              color: theme.colors.text,
            },
          ]}
          value={activeProgram.name}
          onChangeText={(text) => handleChange({ name: text })}
          placeholder="e.g. 5/3/1 Boring But Big"
          placeholderTextColor="#8A8D9F"
        />

        <Text style={styles.label}>Description</Text>
        <TextInput
          style={[
            styles.input,
            styles.textArea,
            {
              backgroundColor: theme.colors.surface,
              borderColor: theme.colors.border,
              color: theme.colors.text,
            },
          ]}
          value={activeProgram.description || ''}
          onChangeText={(text) => handleChange({ description: text })}
          placeholder="Optional description"
          placeholderTextColor="#8A8D9F"
          multiline
        />

        <Text style={styles.label}>Duration (Weeks)</Text>
        <TextInput
          style={[
            styles.input,
            {
              backgroundColor: theme.colors.surface,
              borderColor: theme.colors.border,
              color: theme.colors.text,
            },
          ]}
          value={activeProgram.durationWeeks.toString()}
          onChangeText={(text) => handleChange({ durationWeeks: parseInt(text, 10) || 1 })}
          keyboardType="numeric"
          placeholderTextColor="#8A8D9F"
        />

        <Text style={styles.sectionTitle}>Weekly Schedule</Text>

        {/* Week Selector Tabs */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.weekTabsScroll}>
          {Array.from({ length: activeProgram.durationWeeks }, (_, i) => i + 1).map((w) => {
            const isSelected = w === selectedWeek;
            return (
              <Pressable
                key={w}
                style={[
                  styles.weekTab,
                  isSelected && {
                    backgroundColor: theme.colors.primary,
                    borderColor: theme.colors.primary,
                  },
                ]}
                onPress={() => setSelectedWeek(w)}
              >
                <Text
                  style={[
                    styles.weekTabText,
                    isSelected && {
                      color: theme.colors.background,
                      fontFamily: 'SpaceGrotesk_700Bold',
                    },
                  ]}
                >
                  Week {w}
                </Text>
              </Pressable>
            );
          })}
        </ScrollView>

        {[1, 2, 3, 4, 5, 6, 7].map((day) => {
          const dayWorkouts = activeProgram.workouts.filter(
            (w: ProgramWorkout) => w.week === selectedWeek && w.dayOfWeek === day,
          );
          const draggingWorkout = activeDragId
            ? activeProgram.workouts.find((w: ProgramWorkout) => w.id === activeDragId)
            : null;
          const isDraggingDay = draggingWorkout?.dayOfWeek === day;
          return (
            <View
              key={day}
              style={[
                styles.dayContainer,
                { backgroundColor: theme.colors.surface, borderColor: theme.colors.border },
                isDraggingDay && { zIndex: 9999, elevation: 10 },
              ]}
              onLayout={(e) => {
                if (!isDraggingActiveRef.current) {
                  const { y, height } = e.nativeEvent.layout;
                  dayLayouts.current[day] = { y, height };
                }
              }}
            >
              <Text style={styles.dayName}>{getDayName(day)}</Text>

              {dayWorkouts.map((w: ProgramWorkout) => {
                const template = templates.find((t) => t.id === w.templateId);
                const isDraggingThis = w.id === activeDragId;
                return (
                  <Animated.View
                    key={w.id}
                    style={[
                      styles.workoutRow,
                      {
                        backgroundColor: theme.colors.background,
                        borderColor: theme.colors.border,
                      },
                      isDraggingThis && {
                        transform: [{ translateY: dragY }],
                        zIndex: 9999,
                        opacity: 0.85,
                        shadowColor: '#000',
                        shadowOffset: { width: 0, height: 4 },
                        shadowOpacity: 0.35,
                        shadowRadius: 6,
                        elevation: 5,
                      },
                    ]}
                  >
                    <View
                      style={[styles.dragHandle, { cursor: 'grab' } as unknown as ViewStyle]}
                      onPointerDown={() => {
                        draggingWorkoutRef.current = w;
                        activeDragIdRef.current = w.id;
                        setActiveDragId(w.id);
                      }}
                      onTouchStart={() => {
                        draggingWorkoutRef.current = w;
                        activeDragIdRef.current = w.id;
                        setActiveDragId(w.id);
                      }}
                      onPointerUp={() => {
                        if (!isDraggingActiveRef.current) {
                          draggingWorkoutRef.current = null;
                          activeDragIdRef.current = null;
                          setActiveDragId(null);
                        }
                      }}
                      onTouchEnd={() => {
                        if (!isDraggingActiveRef.current) {
                          draggingWorkoutRef.current = null;
                          activeDragIdRef.current = null;
                          setActiveDragId(null);
                        }
                      }}
                      {...panResponder.panHandlers}
                    >
                      <Ionicons name="reorder-two" size={24} color={theme.colors.primary} />
                    </View>
                    <Text
                      style={[
                        styles.workoutName,
                        { color: theme.colors.text, flex: 1, marginLeft: 8 },
                      ]}
                    >
                      {template?.name || 'Unknown Template'}
                    </Text>
                    <View style={styles.workoutActions}>
                      <Pressable
                        onPress={() => handleStartTemplate(template, activeProgram.id)}
                        hitSlop={8}
                      >
                        <Text style={[styles.startText, { color: theme.colors.primary }]}>
                          Start
                        </Text>
                      </Pressable>
                      <Pressable
                        onPress={() =>
                          router.push(
                            `/programs/template-builder?programId=${activeProgram.id}&templateId=${template?.id}&dayOfWeek=${day}&week=${selectedWeek}`,
                          )
                        }
                        hitSlop={8}
                      >
                        <Text style={[styles.editText, { color: theme.colors.text }]}>Edit</Text>
                      </Pressable>
                      <Pressable onPress={() => removeWorkout(w.id)} hitSlop={8}>
                        <Text style={[styles.removeText, { color: theme.colors.accent }]}>
                          Remove
                        </Text>
                      </Pressable>
                    </View>
                  </Animated.View>
                );
              })}

              <Pressable
                style={styles.addWorkoutBtn}
                onPress={() => {
                  setActiveDay(day);
                  setModalMode('options');
                }}
              >
                <Text style={styles.addWorkoutText}>+ Add Workout</Text>
              </Pressable>
            </View>
          );
        })}
      </ScrollView>

      <Modal
        visible={activeDay !== null}
        transparent
        animationType="slide"
        onRequestClose={() => {
          setActiveDay(null);
          setModalMode(null);
        }}
      >
        <Pressable
          style={styles.modalOverlay}
          onPress={() => {
            setActiveDay(null);
            setModalMode(null);
          }}
        >
          <Pressable
            style={[
              styles.modalCard,
              { backgroundColor: theme.colors.surface, borderColor: theme.colors.border },
            ]}
            onPress={(e) => e.stopPropagation()}
          >
            {modalMode === 'options' ? (
              <>
                <Text
                  style={[
                    styles.modalTitle,
                    { color: theme.colors.text, ...theme.typography.heading },
                  ]}
                >
                  Add Workout
                </Text>
                <Text style={[styles.modalSub, { color: theme.colors.muted }]}>
                  Select how you want to add a workout for{' '}
                  {activeDay !== null ? getDayName(activeDay) : ''}:
                </Text>

                <Pressable
                  style={[
                    styles.modalBtn,
                    { backgroundColor: theme.colors.primary, borderRadius: theme.radius.md },
                  ]}
                  onPress={() => {
                    const day = activeDay;
                    setActiveDay(null);
                    setModalMode(null);
                    router.push(
                      `/programs/template-builder?programId=${activeProgram.id}&dayOfWeek=${day}&week=${selectedWeek}`,
                    );
                  }}
                >
                  <Text
                    style={[
                      styles.modalBtnText,
                      { color: theme.colors.background, ...theme.typography.button },
                    ]}
                  >
                    Create Custom Workout
                  </Text>
                </Pressable>

                <Pressable
                  style={[
                    styles.modalBtn,
                    {
                      backgroundColor: 'transparent',
                      borderWidth: 1,
                      borderColor: theme.colors.border,
                      borderRadius: theme.radius.md,
                    },
                  ]}
                  onPress={() => {
                    setModalMode('templates');
                    setPickerTab('templates');
                  }}
                >
                  <Text
                    style={[
                      styles.modalBtnText,
                      { color: theme.colors.text, ...theme.typography.button },
                    ]}
                  >
                    Use Existing Template / History
                  </Text>
                </Pressable>
              </>
            ) : (
              <>
                <Text
                  style={[
                    styles.modalTitle,
                    { color: theme.colors.text, ...theme.typography.heading },
                  ]}
                >
                  Choose Workout
                </Text>
                <Text style={[styles.modalSub, { color: theme.colors.muted }]}>
                  Select a template or past workout to copy into this day:
                </Text>

                <View style={styles.tabContainer}>
                  <Pressable
                    style={[
                      styles.tabButton,
                      pickerTab === 'templates' && { borderBottomColor: theme.colors.primary },
                    ]}
                    onPress={() => setPickerTab('templates')}
                  >
                    <Text
                      style={[
                        styles.tabButtonText,
                        {
                          color: pickerTab === 'templates' ? theme.colors.text : theme.colors.muted,
                        },
                      ]}
                    >
                      Templates
                    </Text>
                  </Pressable>
                  <Pressable
                    style={[
                      styles.tabButton,
                      pickerTab === 'history' && { borderBottomColor: theme.colors.primary },
                    ]}
                    onPress={() => setPickerTab('history')}
                  >
                    <Text
                      style={[
                        styles.tabButtonText,
                        { color: pickerTab === 'history' ? theme.colors.text : theme.colors.muted },
                      ]}
                    >
                      History
                    </Text>
                  </Pressable>
                </View>

                {pickerTab === 'templates' ? (
                  <ScrollView style={styles.templateList} showsVerticalScrollIndicator={false}>
                    {templates.map((t) => (
                      <Pressable
                        key={t.id}
                        style={[styles.templateItem, { borderColor: theme.colors.border }]}
                        onPress={() => handleSelectTemplate(t.id)}
                      >
                        <Text style={[styles.templateItemName, { color: theme.colors.text }]}>
                          {t.name}
                        </Text>
                        <Text style={[styles.templateItemCount, { color: theme.colors.muted }]}>
                          {t.exercises.length} exercise{t.exercises.length !== 1 ? 's' : ''}
                        </Text>
                      </Pressable>
                    ))}
                    {templates.length === 0 && (
                      <Text
                        style={{
                          color: theme.colors.muted,
                          textAlign: 'center',
                          marginVertical: 20,
                        }}
                      >
                        No templates available.
                      </Text>
                    )}
                  </ScrollView>
                ) : (
                  <ScrollView style={styles.templateList} showsVerticalScrollIndicator={false}>
                    {sessions.map((s) => (
                      <Pressable
                        key={s.id}
                        style={[styles.templateItem, { borderColor: theme.colors.border }]}
                        onPress={() => handleSelectHistorySession(s)}
                      >
                        <Text style={[styles.templateItemName, { color: theme.colors.text }]}>
                          {s.name}
                        </Text>
                        <Text style={[styles.templateItemCount, { color: theme.colors.muted }]}>
                          {s.completedAt ? new Date(s.completedAt).toLocaleDateString() : ''} •{' '}
                          {s.exercises.length} exercise{s.exercises.length !== 1 ? 's' : ''}
                        </Text>
                      </Pressable>
                    ))}
                    {sessions.length === 0 && (
                      <Text
                        style={{
                          color: theme.colors.muted,
                          textAlign: 'center',
                          marginVertical: 20,
                        }}
                      >
                        No history available.
                      </Text>
                    )}
                  </ScrollView>
                )}

                <Pressable
                  style={[styles.backOptionBtn, { borderColor: theme.colors.border }]}
                  onPress={() => setModalMode('options')}
                >
                  <Ionicons name="arrow-back" size={16} color={theme.colors.primary} />
                  <Text style={[styles.backOptionText, { color: theme.colors.primary }]}>Back</Text>
                </Pressable>
              </>
            )}

            <Pressable
              style={styles.modalCloseBtn}
              onPress={() => {
                setActiveDay(null);
                setModalMode(null);
              }}
            >
              <Text style={{ color: theme.colors.accent, fontFamily: 'SpaceGrotesk_700Bold' }}>
                Cancel
              </Text>
            </Pressable>
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0B0B0F' },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#0B0B0F' },
  content: { padding: 16, paddingBottom: 40 },
  label: {
    fontSize: 14,
    fontFamily: 'SpaceGrotesk_600SemiBold',
    color: '#8A8D9F',
    marginBottom: 8,
    textTransform: 'uppercase',
  },
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
  textArea: { minHeight: 80, textAlignVertical: 'top' },
  sectionTitle: {
    fontSize: 20,
    fontFamily: 'SpaceGrotesk_700Bold',
    color: '#90D5FF',
    marginTop: 16,
    marginBottom: 8,
    textTransform: 'uppercase',
  },
  weekTabsScroll: {
    marginBottom: 16,
  },
  weekTab: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#2A2B31',
    marginRight: 8,
    borderWidth: 1,
    borderColor: '#2A2B31',
  },
  weekTabText: {
    color: '#8A8D9F',
    fontFamily: 'SpaceGrotesk_600SemiBold',
    fontSize: 14,
  },
  dayContainer: {
    backgroundColor: '#1A1C23',
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#2A2B31',
    overflow: 'visible',
  },
  dayName: {
    fontSize: 16,
    fontFamily: 'SpaceGrotesk_700Bold',
    color: '#F4F5F7',
    marginBottom: 8,
    textTransform: 'uppercase',
  },
  workoutRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#0B0B0F',
    padding: 12,
    borderRadius: 8,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#2A2B31',
  },
  workoutName: { fontSize: 16, fontFamily: 'SpaceGrotesk_600SemiBold', color: '#F4F5F7' },
  workoutActions: { flexDirection: 'row', gap: 12 },
  editText: { color: '#90D5FF', fontFamily: 'SpaceGrotesk_700Bold' },
  removeText: { color: '#ef4444', fontFamily: 'SpaceGrotesk_700Bold' },
  startText: { color: '#90D5FF', fontFamily: 'SpaceGrotesk_700Bold' },
  dragHandle: {
    paddingHorizontal: 4,
    paddingVertical: 4,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 4,
  },
  addWorkoutBtn: {
    padding: 12,
    alignItems: 'center',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#2A2B31',
    borderStyle: 'dashed',
    marginTop: 4,
  },
  addWorkoutText: { color: '#8A8D9F', fontFamily: 'SpaceGrotesk_700Bold' },

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
    maxWidth: 380,
    borderRadius: 16,
  },
  modalTitle: {
    fontSize: 20,
    marginBottom: 8,
    textAlign: 'center',
  },
  modalSub: {
    fontFamily: 'Manrope_500Medium',
    fontSize: 14,
    textAlign: 'center',
    marginBottom: 20,
    lineHeight: 20,
  },
  modalBtn: {
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
    marginBottom: 12,
  },
  modalBtnText: {
    fontSize: 15,
  },
  modalCloseBtn: {
    paddingVertical: 12,
    alignItems: 'center',
    width: '100%',
  },
  templateList: {
    maxHeight: 200,
    width: '100%',
    marginBottom: 16,
  },
  templateItem: {
    paddingVertical: 12,
    borderBottomWidth: 1,
    width: '100%',
  },
  templateItemName: {
    fontSize: 15,
    fontFamily: 'SpaceGrotesk_600SemiBold',
    marginBottom: 2,
  },
  templateItemCount: {
    fontSize: 12,
    fontFamily: 'Manrope_500Medium',
  },
  backOptionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 8,
    width: '100%',
  },
  backOptionText: {
    fontFamily: 'SpaceGrotesk_700Bold',
    fontSize: 14,
  },
  tabContainer: {
    flexDirection: 'row',
    marginBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#2A2B31',
  },
  tabButton: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  tabButtonText: {
    fontFamily: 'SpaceGrotesk_600SemiBold',
    fontSize: 14,
  },
});
