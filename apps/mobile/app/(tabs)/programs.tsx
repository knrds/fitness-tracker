import React, { useState, useRef, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  Modal,
  TextInput,
  Alert,
  Platform,
  ScrollView,
  Share,
  PanResponder,
  Animated,
  ViewStyle,
  LayoutAnimation,
  Dimensions,
  NativeSyntheticEvent,
  NativeScrollEvent,
} from 'react-native';
import { useRouter } from 'expo-router';
import * as Crypto from 'expo-crypto';
import * as Haptics from 'expo-haptics';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@fitness-tracker/ui';

import { Program, WorkoutTemplate } from '@fitness-tracker/domain';

import { useProgramStore } from '../../src/stores/programStore';
import { useWorkoutStore } from '../../src/stores/workoutStore';

export default function ProgramListScreen() {
  const router = useRouter();
  const theme = useTheme();
  const {
    programs,
    templates,
    setActiveProgram,
    deleteProgram,
    createProgram,
    updateProgramsOrder,
  } = useProgramStore();

  const [isCreateModalVisible, setCreateModalVisible] = useState(false);
  const [menuProgramId, setMenuProgramId] = useState<string | null>(null);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [durationWeeks, setDurationWeeks] = useState('4');

  const [activeDragId, setActiveDragId] = useState<string | null>(null);
  const activeDragIdRef = useRef<string | null>(null);
  const isDraggingActiveRef = useRef(false);
  const dragY = useRef(new Animated.Value(0)).current;
  const draggingProgramRef = useRef<Program | null>(null);
  const [scrollEnabled, setScrollEnabled] = useState(true);
  const itemLayouts = useRef<Record<string, { y: number; height: number }>>({});
  const dragScale = useRef(new Animated.Value(1)).current;
  const dragTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [hoverIndex, setHoverIndex] = useState<number | null>(null);
  const hoverIndexRef = useRef<number | null>(null);
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

  const handleScroll = (event: NativeSyntheticEvent<NativeScrollEvent>) => {
    scrollYRef.current = event.nativeEvent.contentOffset.y;
  };

  const panResponder = useMemo(() => {
    return PanResponder.create({
      onStartShouldSetPanResponder: () => false,
      onMoveShouldSetPanResponder: (e, gestureState) => {
        return Math.abs(gestureState.dy) > 2;
      },
      onPanResponderGrant: () => {
        const p = draggingProgramRef.current;
        if (p) {
          activeDragIdRef.current = p.id;
          isDraggingActiveRef.current = true;
          setActiveDragId(p.id);
          setScrollEnabled(false);
          dragY.setValue(0);
          dragScale.setValue(1);
          Animated.spring(dragScale, {
            toValue: 1.03,
            useNativeDriver: true,
            tension: 100,
            friction: 6,
          }).start();
          if (Platform.OS !== 'web') {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
          }
        }
      },
      onPanResponderMove: (e, gestureState) => {
        if (!activeDragIdRef.current) return;
        dragY.setValue(gestureState.dy);
        const p = draggingProgramRef.current;
        if (p) {
          const dragIndex = programs.findIndex((item) => item.id === p.id);
          if (dragIndex !== -1) {
            const S = 100; // Item height (88) + gap (12)
            const step = Math.round(gestureState.dy / S);
            const targetIndex = Math.max(0, Math.min(programs.length - 1, dragIndex + step));
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
        if (dragTimeoutRef.current) {
          clearTimeout(dragTimeoutRef.current);
        }
        isDraggingActiveRef.current = false;
        const p = draggingProgramRef.current;
        draggingProgramRef.current = null;
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
        if (p) {
          const dragIndex = programs.findIndex((item) => item.id === p.id);
          if (dragIndex !== -1) {
            const S = 100;
            const step = Math.round(gestureState.dy / S);
            const targetIndex = Math.max(0, Math.min(programs.length - 1, dragIndex + step));
            const insertIndex = targetIndex;

            const otherPrograms = programs.filter((item) => item.id !== p.id);
            const reordered = [...otherPrograms];
            reordered.splice(insertIndex, 0, p);
            updateProgramsOrder(reordered);
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
        if (dragTimeoutRef.current) {
          clearTimeout(dragTimeoutRef.current);
        }
        draggingProgramRef.current = null;
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
  }, [programs]);

  const handleCreateProgram = () => {
    if (!name.trim()) {
      if (Platform.OS === 'web') {
        if (typeof globalThis !== 'undefined' && 'alert' in globalThis) {
          const alertFn = (globalThis as { alert?: (msg: string) => void }).alert;
          alertFn?.('Program name is required.');
        }
      } else {
        Alert.alert('Error', 'Program name is required.');
      }
      return;
    }

    const newId = Crypto.randomUUID();
    createProgram({
      id: newId,
      name: name.trim(),
      ...(description.trim() ? { description: description.trim() } : {}),
      durationWeeks: parseInt(durationWeeks, 10) || 4,
    });

    setCreateModalVisible(false);
    setName('');
    setDescription('');
    setDurationWeeks('4');

    router.push(`/programs/builder?id=${newId}` as unknown as Parameters<typeof router.push>[0]);
  };

  const activeProgram = programs.find((p) => p.isActive);
  const { status: activeWorkoutStatus, startWorkoutFromTemplate } = useWorkoutStore();
  const [selectedWeek, setSelectedWeek] = useState(1);

  const handleStartTemplate = (template: WorkoutTemplate | undefined, programId: string) => {
    if (!template) return;

    const start = () => {
      startWorkoutFromTemplate(template, programId);
      router.push('/workout/session');
    };

    if (activeWorkoutStatus === 'active' || activeWorkoutStatus === 'paused') {
      if (Platform.OS === 'web') {
        const confirmFn = (globalThis as { confirm?: (msg: string) => boolean }).confirm;
        if (
          confirmFn?.(
            'An active workout is already in progress. Do you want to discard it and start this template instead?',
          )
        ) {
          start();
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

  const renderHeader = () => {
    if (!activeProgram) return null;

    const getDayName = (d: number) => {
      const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
      return days[d - 1];
    };

    return (
      <View style={styles.activeProgramSection}>
        <View style={styles.activeProgramHeader}>
          <View style={styles.activeInfoCol}>
            <Text style={styles.activeBadge}>⭐ ACTIVE PLAN</Text>
            <Text style={styles.activeTitle}>{activeProgram.name}</Text>
            {activeProgram.description ? (
              <Text style={styles.activeDesc}>{activeProgram.description}</Text>
            ) : null}
            <Text style={styles.activeDuration}>Duration: {activeProgram.durationWeeks} Weeks</Text>
          </View>
          <Pressable
            style={styles.deactivateBtn}
            onPress={() => {
              if (Platform.OS === 'web') {
                const confirmFn = (globalThis as { confirm?: (msg: string) => boolean }).confirm;
                if (confirmFn?.('Are you sure you want to deactivate this program?')) {
                  setActiveProgram(null);
                }
                return;
              }
              Alert.alert(
                'Deactivate Program',
                'Are you sure you want to deactivate this program?',
                [
                  { text: 'Cancel', style: 'cancel' },
                  {
                    text: 'Deactivate',
                    style: 'destructive',
                    onPress: () => setActiveProgram(null),
                  },
                ],
              );
            }}
          >
            <Text style={styles.deactivateBtnText}>Deactivate</Text>
          </Pressable>
        </View>

        {/* Week Selector Tabs */}
        <Text style={styles.calendarTitle}>Weekly Schedule</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.weekTabsScroll}>
          {Array.from({ length: activeProgram.durationWeeks }, (_, i) => i + 1).map((w) => {
            const isSelected = w === selectedWeek;
            return (
              <Pressable
                key={w}
                style={[styles.weekTab, isSelected && styles.weekTabSelected]}
                onPress={() => setSelectedWeek(w)}
              >
                <Text style={[styles.weekTabText, isSelected && styles.weekTabTextSelected]}>
                  Week {w}
                </Text>
              </Pressable>
            );
          })}
        </ScrollView>

        {/* Days List */}
        <View style={styles.daysList}>
          {[1, 2, 3, 4, 5, 6, 7].map((day) => {
            const dayWorkouts = activeProgram.workouts.filter(
              (w) => w.week === selectedWeek && w.dayOfWeek === day,
            );

            return (
              <View key={day} style={styles.dayRow}>
                <View style={styles.dayInfo}>
                  <Text style={styles.dayLabel}>{getDayName(day)}</Text>
                  {dayWorkouts.length > 0 ? (
                    dayWorkouts.map((w) => {
                      const template = templates.find((t) => t.id === w.templateId);
                      return (
                        <View key={w.id} style={styles.scheduledWorkout}>
                          <Text style={styles.workoutTemplateName}>
                            🏋️ {template?.name || 'Unknown Template'}
                          </Text>
                          <Pressable
                            style={styles.startWorkoutBtn}
                            onPress={() => handleStartTemplate(template, activeProgram.id)}
                          >
                            <Text style={styles.startWorkoutBtnText}>Start</Text>
                          </Pressable>
                        </View>
                      );
                    })
                  ) : (
                    <Text style={styles.restDayText}>💤 Rest Day</Text>
                  )}
                </View>
              </View>
            );
          })}
        </View>

        <View style={styles.divider} />
        <Text style={styles.sectionHeaderTitle}>All Programs</Text>
      </View>
    );
  };

  const confirmDeactivate = () => {
    if (Platform.OS === 'web') {
      const confirmFn = (globalThis as { confirm?: (msg: string) => boolean }).confirm;
      if (confirmFn?.('Are you sure you want to deactivate this program?')) {
        setActiveProgram(null);
      }
      return;
    }
    Alert.alert('Deactivate Program', 'Are you sure you want to deactivate this program?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Deactivate', style: 'destructive', onPress: () => setActiveProgram(null) },
    ]);
  };

  const confirmDelete = (id: string, programName: string) => {
    if (Platform.OS === 'web') {
      const confirmFn = (globalThis as { confirm?: (msg: string) => boolean }).confirm;
      if (confirmFn?.(`Delete "${programName}"? This cannot be undone.`)) {
        deleteProgram(id);
      }
      return;
    }
    Alert.alert('Delete Program', `Delete "${programName}"? This cannot be undone.`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: () => deleteProgram(id) },
    ]);
  };

  const handleShareProgram = async (program: Program) => {
    const weeksText = Array.from({ length: program.durationWeeks })
      .map((_, wIdx) => {
        const week = wIdx + 1;
        const weekWorkouts = program.workouts.filter((ww) => ww.week === week);
        if (weekWorkouts.length === 0) return null;
        const workoutsText = weekWorkouts
          .map((ww) => {
            const template = templates.find((t) => t.id === ww.templateId);
            const days = [
              'Monday',
              'Tuesday',
              'Wednesday',
              'Thursday',
              'Friday',
              'Saturday',
              'Sunday',
            ];
            const dayName = days[ww.dayOfWeek - 1] || `Day ${ww.dayOfWeek}`;
            return `  • ${dayName}: ${template?.name || 'Workout'}`;
          })
          .filter(Boolean)
          .join('\n');
        return `Week ${week}:\n${workoutsText}`;
      })
      .filter(Boolean)
      .join('\n\n');

    const message = `📋 ${program.name}\n${program.description ? `${program.description}\n\n` : ''}${weeksText}\n\n— Shared from Volt Performance`;

    try {
      await Share.share({ message, title: program.name });
    } catch {
      // User cancelled
    }
  };

  const handleMoveProgram = (programId: string, direction: 'up' | 'down') => {
    const idx = programs.findIndex((p) => p.id === programId);
    if (idx === -1) return;
    const targetIdx = direction === 'up' ? idx - 1 : idx + 1;
    if (targetIdx < 0 || targetIdx >= programs.length) return;

    const reordered = [...programs];
    const [moved] = reordered.splice(idx, 1);
    if (!moved) return;
    reordered.splice(targetIdx, 0, moved);
    updateProgramsOrder(reordered);
  };

  const menuProgram = programs.find((p) => p.id === menuProgramId) || null;

  return (
    <View style={styles.container}>
      <ScrollView
        ref={scrollViewRef}
        contentContainerStyle={styles.list}
        scrollEnabled={scrollEnabled}
        onScroll={handleScroll}
        scrollEventThrottle={16}
      >
        {renderHeader()}
        {programs.map((item) => {
          const isDraggingThis = item.id === activeDragId;
          const otherPrograms = programs.filter((p) => p.id !== activeDragId);
          const isHovered =
            activeDragId !== null &&
            hoverIndex !== null &&
            otherPrograms[hoverIndex]?.id === item.id;

          let shiftY = 0;
          if (activeDragId !== null && hoverIndex !== null && !isDraggingThis) {
            const dragIndex = programs.findIndex((p) => p.id === activeDragId);
            const myIndex = programs.findIndex((p) => p.id === item.id);
            const totalShift = 100; // Item height (88) + gap (12)

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
              key={item.id}
              onLayout={(e) => {
                if (!isDraggingActiveRef.current && activeDragId !== item.id) {
                  itemLayouts.current[item.id] = {
                    y: e.nativeEvent.layout.y,
                    height: e.nativeEvent.layout.height,
                  };
                }
              }}
              style={[
                styles.card,
                isHovered && {
                  borderColor: '#90D5FF',
                  borderWidth: 1.5,
                  borderStyle: 'dashed',
                  backgroundColor: 'rgba(144, 213, 255, 0.05)',
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
              <View style={styles.cardTopRow}>
                <View
                  style={[
                    styles.dragHandle,
                    {
                      cursor: 'grab',
                      touchAction: 'none',
                      userSelect: 'none',
                      WebkitUserSelect: 'none',
                    } as unknown as ViewStyle,
                  ]}
                  onPointerDown={() => {
                    draggingProgramRef.current = item;
                    activeDragIdRef.current = item.id;
                    setActiveDragId(item.id);
                    setScrollEnabled(false);
                  }}
                  onTouchStart={() => {
                    draggingProgramRef.current = item;
                    activeDragIdRef.current = item.id;
                    setActiveDragId(item.id);
                    setScrollEnabled(false);
                  }}
                  onPointerUp={() => {
                    if (!isDraggingActiveRef.current) {
                      draggingProgramRef.current = null;
                      activeDragIdRef.current = null;
                      setActiveDragId(null);
                      setScrollEnabled(true);
                    }
                  }}
                  onTouchEnd={() => {
                    if (!isDraggingActiveRef.current) {
                      draggingProgramRef.current = null;
                      activeDragIdRef.current = null;
                      setActiveDragId(null);
                      setScrollEnabled(true);
                    }
                  }}
                  {...panResponder.panHandlers}
                >
                  <Ionicons name="reorder-two" size={24} color={theme.colors.primary} />
                </View>

                <Pressable
                  style={styles.cardInfo}
                  onPress={() => router.push(`/programs/builder?id=${item.id}`)}
                >
                  <Text style={styles.cardTitle}>{item.name}</Text>
                  <Text style={styles.cardSubtitle}>{item.durationWeeks} Weeks</Text>
                </Pressable>

                <View style={styles.cardActionsContainer}>
                  {item.isActive ? (
                    <Pressable
                      style={[
                        styles.smallActiveBtn,
                        { backgroundColor: 'rgba(144, 213, 255, 0.15)', borderColor: '#90D5FF' },
                      ]}
                      onPress={(e) => {
                        e.stopPropagation();
                        confirmDeactivate();
                      }}
                    >
                      <Ionicons name="checkmark-circle" size={12} color="#90D5FF" />
                      <Text style={[styles.smallActiveBtnText, { color: '#90D5FF' }]}>ACTIVE</Text>
                    </Pressable>
                  ) : (
                    <Pressable
                      style={[
                        styles.smallActivateBtn,
                        { backgroundColor: '#1A1C23', borderColor: '#2A2B31' },
                      ]}
                      onPress={(e) => {
                        e.stopPropagation();
                        setActiveProgram(item.id);
                      }}
                    >
                      <Text style={[styles.smallActivateBtnText, { color: '#F4F5F7' }]}>
                        ACTIVATE
                      </Text>
                    </Pressable>
                  )}
                  <Pressable
                    style={styles.kebabBtn}
                    hitSlop={10}
                    onPress={(e) => {
                      e.stopPropagation();
                      setMenuProgramId(item.id);
                    }}
                  >
                    <Ionicons name="ellipsis-vertical" size={20} color="#8A8D9F" />
                  </Pressable>
                </View>
              </View>
            </Animated.View>
          );
        })}
        {programs.length === 0 && (
          <Text style={styles.empty}>No programs found. Click + to create one.</Text>
        )}
      </ScrollView>
      <Pressable style={styles.fab} onPress={() => setCreateModalVisible(true)}>
        <Text style={styles.fabText}>+</Text>
      </Pressable>

      <Modal
        visible={isCreateModalVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setCreateModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Create Program</Text>

            <Text style={styles.label}>Program Name</Text>
            <TextInput
              style={styles.input}
              value={name}
              onChangeText={setName}
              placeholder="e.g. Hypertrophy Plan"
              placeholderTextColor="#94a3b8"
            />

            <Text style={styles.label}>Description (Optional)</Text>
            <TextInput
              style={[styles.input, styles.textArea]}
              value={description}
              onChangeText={setDescription}
              placeholder="e.g. 4-day split focusing on upper/lower body"
              placeholderTextColor="#94a3b8"
              multiline
            />

            <Text style={styles.label}>Duration (Weeks)</Text>
            <TextInput
              style={styles.input}
              value={durationWeeks}
              onChangeText={setDurationWeeks}
              keyboardType="numeric"
              placeholder="4"
              placeholderTextColor="#94a3b8"
            />

            <View style={styles.modalActions}>
              <Pressable
                style={[styles.modalBtn, styles.cancelBtn]}
                onPress={() => setCreateModalVisible(false)}
              >
                <Text style={styles.cancelBtnText}>Cancel</Text>
              </Pressable>
              <Pressable style={[styles.modalBtn, styles.createBtn]} onPress={handleCreateProgram}>
                <Text style={styles.createBtnText}>Create</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>

      {/* Program action menu */}
      <Modal
        visible={menuProgram !== null}
        transparent
        animationType="fade"
        onRequestClose={() => setMenuProgramId(null)}
      >
        <Pressable style={styles.menuOverlay} onPress={() => setMenuProgramId(null)}>
          <View style={styles.menuSheet}>
            <Text style={styles.menuTitle}>{menuProgram?.name}</Text>
            <Pressable
              style={styles.menuItem}
              onPress={() => {
                const id = menuProgram?.id;
                setMenuProgramId(null);
                if (id) router.push(`/programs/builder?id=${id}`);
              }}
            >
              <Ionicons name="create-outline" size={20} color="#F4F5F7" />
              <Text style={styles.menuItemText}>Edit</Text>
            </Pressable>
            <Pressable
              style={[
                styles.menuItem,
                programs.findIndex((p) => p.id === menuProgram?.id) === 0 && { opacity: 0.4 }
              ]}
              disabled={programs.findIndex((p) => p.id === menuProgram?.id) === 0}
              onPress={() => {
                if (menuProgram) {
                  handleMoveProgram(menuProgram.id, 'up');
                  setMenuProgramId(null);
                }
              }}
            >
              <Ionicons name="arrow-up-outline" size={20} color="#F4F5F7" />
              <Text style={styles.menuItemText}>Move Up</Text>
            </Pressable>
            <Pressable
              style={[
                styles.menuItem,
                programs.findIndex((p) => p.id === menuProgram?.id) === programs.length - 1 && { opacity: 0.4 }
              ]}
              disabled={programs.findIndex((p) => p.id === menuProgram?.id) === programs.length - 1}
              onPress={() => {
                if (menuProgram) {
                  handleMoveProgram(menuProgram.id, 'down');
                  setMenuProgramId(null);
                }
              }}
            >
              <Ionicons name="arrow-down-outline" size={20} color="#F4F5F7" />
              <Text style={styles.menuItemText}>Move Down</Text>
            </Pressable>
            <Pressable
              style={styles.menuItem}
              onPress={() => {
                const p = menuProgram;
                setMenuProgramId(null);
                if (p) handleShareProgram(p);
              }}
            >
              <Ionicons name="share-outline" size={20} color="#F4F5F7" />
              <Text style={styles.menuItemText}>Share</Text>
            </Pressable>
            <Pressable
              style={styles.menuItem}
              onPress={() => {
                const p = menuProgram;
                setMenuProgramId(null);
                if (p) confirmDelete(p.id, p.name);
              }}
            >
              <Ionicons name="trash-outline" size={20} color="#ef4444" />
              <Text style={[styles.menuItemText, { color: '#ef4444' }]}>Delete</Text>
            </Pressable>
          </View>
        </Pressable>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0B0B0F' },
  list: { padding: 16 },
  card: {
    backgroundColor: '#1A1C23',
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#2A2B31',
  },
  cardTitle: { fontSize: 18, fontFamily: 'SpaceGrotesk_700Bold', color: '#F4F5F7' },
  cardSubtitle: { fontSize: 14, fontFamily: 'Manrope_500Medium', color: '#8A8D9F', marginTop: 4 },
  cardInfo: { flex: 1 },
  cardTopRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  activePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#90D5FF',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 9999,
  },
  activePillText: {
    color: '#0B0B0F',
    fontFamily: 'SpaceGrotesk_700Bold',
    fontSize: 11,
    letterSpacing: 0.5,
  },
  kebabBtn: { padding: 4 },
  menuOverlay: {
    flex: 1,
    backgroundColor: 'rgba(11, 11, 15, 0.7)',
    justifyContent: 'flex-end',
  },
  menuSheet: {
    backgroundColor: '#1A1C23',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    borderWidth: 1,
    borderColor: '#2A2B31',
    paddingTop: 16,
    paddingBottom: 40,
    paddingHorizontal: 12,
  },
  menuTitle: {
    fontFamily: 'SpaceGrotesk_700Bold',
    color: '#8A8D9F',
    fontSize: 12,
    textTransform: 'uppercase',
    letterSpacing: 1,
    paddingHorizontal: 12,
    marginBottom: 8,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    paddingVertical: 16,
    paddingHorizontal: 12,
    borderRadius: 12,
  },
  menuItemText: { color: '#F4F5F7', fontFamily: 'SpaceGrotesk_600SemiBold', fontSize: 16 },
  cardActions: { flexDirection: 'row', gap: 8, alignItems: 'center' },
  btn: { backgroundColor: '#90D5FF', paddingHorizontal: 12, paddingVertical: 8, borderRadius: 8 },
  editBtn: {
    backgroundColor: '#2A2B31',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
  },
  deleteBtn: {
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#ef4444',
  },
  btnText: { color: '#0B0B0F', fontFamily: 'SpaceGrotesk_700Bold' },
  editBtnText: { color: '#F4F5F7', fontFamily: 'SpaceGrotesk_700Bold' },
  deleteBtnText: { color: '#ef4444', fontFamily: 'SpaceGrotesk_700Bold' },
  activeLabel: {
    color: '#90D5FF',
    fontFamily: 'SpaceGrotesk_700Bold',
    paddingVertical: 8,
    paddingHorizontal: 4,
  },
  empty: {
    textAlign: 'center',
    marginTop: 40,
    color: '#8A8D9F',
    fontFamily: 'Manrope_500Medium',
    fontSize: 16,
  },
  fab: {
    position: 'absolute',
    bottom: 24,
    right: 24,
    backgroundColor: '#90D5FF',
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 4,
  },
  fabText: { color: '#0B0B0F', fontSize: 32, fontFamily: 'SpaceGrotesk_700Bold', lineHeight: 36 },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(11, 11, 15, 0.8)',
    justifyContent: 'center',
    padding: 24,
  },
  modalCard: {
    backgroundColor: '#1A1C23',
    borderRadius: 16,
    padding: 24,
    borderWidth: 1,
    borderColor: '#2A2B31',
  },
  modalTitle: {
    fontSize: 20,
    fontFamily: 'SpaceGrotesk_700Bold',
    color: '#F4F5F7',
    marginBottom: 20,
  },
  label: {
    fontSize: 14,
    fontFamily: 'SpaceGrotesk_600SemiBold',
    color: '#8A8D9F',
    marginBottom: 8,
  },
  input: {
    backgroundColor: '#0B0B0F',
    borderWidth: 1,
    borderColor: '#2A2B31',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 16,
    fontFamily: 'Manrope_500Medium',
    color: '#F4F5F7',
    marginBottom: 16,
  },
  textArea: {
    minHeight: 60,
    textAlignVertical: 'top',
  },
  modalActions: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 8,
  },
  modalBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelBtn: {
    backgroundColor: '#2A2B31',
  },
  createBtn: {
    backgroundColor: '#90D5FF',
  },
  cancelBtnText: {
    color: '#8A8D9F',
    fontFamily: 'SpaceGrotesk_700Bold',
    fontSize: 16,
  },
  createBtnText: {
    color: '#0B0B0F',
    fontFamily: 'SpaceGrotesk_700Bold',
    fontSize: 16,
  },
  deactivateBtnInline: {
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
    borderWidth: 1,
    borderColor: '#ef4444',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  deactivateBtnTextInline: {
    color: '#ef4444',
    fontSize: 12,
    fontFamily: 'SpaceGrotesk_700Bold',
  },
  activeProgramSection: {
    backgroundColor: '#1A1C23',
    borderRadius: 16,
    padding: 16,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#2A2B31',
  },
  activeProgramHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  activeInfoCol: {
    flex: 1,
    marginRight: 12,
  },
  activeBadge: {
    fontSize: 11,
    fontFamily: 'SpaceGrotesk_700Bold',
    color: '#90D5FF',
    backgroundColor: '#2A2B31',
    alignSelf: 'flex-start',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    marginBottom: 6,
  },
  activeTitle: {
    fontSize: 20,
    fontFamily: 'SpaceGrotesk_700Bold',
    color: '#F4F5F7',
    marginBottom: 4,
  },
  activeDesc: {
    fontSize: 14,
    fontFamily: 'Manrope_500Medium',
    color: '#8A8D9F',
    marginBottom: 8,
    lineHeight: 18,
  },
  activeDuration: {
    fontSize: 13,
    fontFamily: 'SpaceGrotesk_600SemiBold',
    color: '#8A8D9F',
  },
  deactivateBtn: {
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
    borderWidth: 1,
    borderColor: '#ef4444',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  deactivateBtnText: {
    color: '#ef4444',
    fontFamily: 'SpaceGrotesk_700Bold',
    fontSize: 13,
  },
  calendarTitle: {
    fontSize: 16,
    fontFamily: 'SpaceGrotesk_700Bold',
    color: '#90D5FF',
    marginBottom: 10,
    marginTop: 8,
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
  weekTabSelected: {
    backgroundColor: '#90D5FF',
    borderColor: '#90D5FF',
  },
  weekTabText: {
    color: '#8A8D9F',
    fontFamily: 'SpaceGrotesk_600SemiBold',
    fontSize: 14,
  },
  weekTabTextSelected: {
    color: '#0B0B0F',
    fontFamily: 'SpaceGrotesk_700Bold',
  },
  daysList: {
    gap: 8,
  },
  dayRow: {
    backgroundColor: '#0B0B0F',
    borderRadius: 10,
    padding: 12,
    borderWidth: 1,
    borderColor: '#2A2B31',
  },
  dayInfo: {
    width: '100%',
  },
  dayLabel: {
    fontSize: 14,
    fontFamily: 'SpaceGrotesk_700Bold',
    color: '#F4F5F7',
    marginBottom: 6,
    textTransform: 'uppercase',
  },
  scheduledWorkout: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#1A1C23',
    borderRadius: 8,
    padding: 10,
    borderWidth: 1,
    borderColor: '#2A2B31',
    marginTop: 4,
  },
  workoutTemplateName: {
    fontSize: 14,
    fontFamily: 'SpaceGrotesk_600SemiBold',
    color: '#F4F5F7',
    flex: 1,
  },
  startWorkoutBtn: {
    backgroundColor: '#90D5FF',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
  },
  startWorkoutBtnText: {
    color: '#0B0B0F',
    fontFamily: 'SpaceGrotesk_700Bold',
    fontSize: 12,
  },
  restDayText: {
    fontSize: 13,
    fontFamily: 'Manrope_500Medium',
    color: '#8A8D9F',
    fontStyle: 'italic',
    marginTop: 2,
  },
  divider: {
    height: 1,
    backgroundColor: '#2A2B31',
    marginVertical: 20,
  },
  sectionHeaderTitle: {
    fontSize: 18,
    fontFamily: 'SpaceGrotesk_700Bold',
    color: '#90D5FF',
    marginBottom: 12,
    textTransform: 'uppercase',
  },
  cardActionsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  smallActiveBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 16,
    borderWidth: 1,
  },
  smallActiveBtnText: {
    fontFamily: 'SpaceGrotesk_700Bold',
    fontSize: 11,
    letterSpacing: 0.5,
  },
  smallActivateBtn: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    borderWidth: 1,
  },
  smallActivateBtnText: {
    fontFamily: 'SpaceGrotesk_600SemiBold',
    fontSize: 11,
    letterSpacing: 0.5,
  },
  dragHandle: {
    paddingHorizontal: 4,
    paddingVertical: 4,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 4,
  },
});
