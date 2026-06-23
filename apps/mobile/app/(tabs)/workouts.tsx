import React, { useState, useRef, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  Alert,
  Platform,
  Modal,
  Share,
  ScrollView,
  PanResponder,
  Animated,
  ViewStyle,
  LayoutAnimation,
  Dimensions,
  NativeSyntheticEvent,
  NativeScrollEvent,
} from 'react-native';
import { useRouter } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@fitness-tracker/ui';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useProgramStore } from '../../src/stores/programStore';
import { useWorkoutStore } from '../../src/stores/workoutStore';
import { useExerciseStore } from '../../src/stores/exerciseStore';
import { WorkoutTemplate } from '@fitness-tracker/domain';
import ProgramListScreen from './programs';

export default function WorkoutsScreen() {
  const router = useRouter();
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const { templates, deleteTemplate, updateTemplatesOrder } = useProgramStore();
  const { startWorkout, startWorkoutFromTemplate, status } = useWorkoutStore();
  const { exercises } = useExerciseStore();
  const [menuTemplateId, setMenuTemplateId] = useState<string | null>(null);
  const [summaryTemplateId, setSummaryTemplateId] = useState<string | null>(null);

  const [activeDragId, setActiveDragId] = useState<string | null>(null);
  const activeDragIdRef = useRef<string | null>(null);
  const isDraggingActiveRef = useRef(false);
  const dragY = useRef(new Animated.Value(0)).current;
  const draggingTemplateRef = useRef<WorkoutTemplate | null>(null);
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
        const t = draggingTemplateRef.current;
        if (t) {
          activeDragIdRef.current = t.id;
          isDraggingActiveRef.current = true;
          setActiveDragId(t.id);
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
        const t = draggingTemplateRef.current;
        if (t) {
          const dragIndex = templates.findIndex((item) => item.id === t.id);
          if (dragIndex !== -1) {
            const S = 92; // Item height (80) + gap (12)
            const step = Math.round(gestureState.dy / S);
            const targetIndex = Math.max(0, Math.min(templates.length - 1, dragIndex + step));
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
        const t = draggingTemplateRef.current;
        draggingTemplateRef.current = null;
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
        if (t) {
          const dragIndex = templates.findIndex((item) => item.id === t.id);
          if (dragIndex !== -1) {
            const S = 92;
            const step = Math.round(gestureState.dy / S);
            const targetIndex = Math.max(0, Math.min(templates.length - 1, dragIndex + step));
            const insertIndex = targetIndex;

            const otherTemplates = templates.filter((item) => item.id !== t.id);
            const reordered = [...otherTemplates];
            reordered.splice(insertIndex, 0, t);
            updateTemplatesOrder(reordered);
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
        draggingTemplateRef.current = null;
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
  }, [templates, updateTemplatesOrder]);

  const handleStartEmpty = () => {
    if (status === 'idle' || status === 'finished') {
      startWorkout('Empty Workout');
    }
    router.push('/workout/session');
  };

  const handleStartTemplate = (template: WorkoutTemplate) => {
    const start = () => {
      startWorkoutFromTemplate(template);
      router.push('/workout/session');
    };

    if (status === 'active' || status === 'paused') {
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

  const handleDeleteTemplate = (templateId: string) => {
    if (Platform.OS === 'web') {
      if (typeof globalThis !== 'undefined' && 'confirm' in globalThis) {
        const confirmFn = (globalThis as { confirm?: (msg: string) => boolean }).confirm;
        if (confirmFn?.('Are you sure you want to delete this template?')) {
          deleteTemplate(templateId);
        }
      }
    } else {
      Alert.alert('Delete Template', 'Are you sure you want to delete this template?', [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Delete', style: 'destructive', onPress: () => deleteTemplate(templateId) },
      ]);
    }
  };

  const handleShareTemplate = async (template: WorkoutTemplate) => {
    const exerciseLines = template.exercises
      .map((te) => {
        const ex = exercises.find((e) => e.id === te.exerciseId);
        const name = ex?.name || 'Unknown';
        return `• ${name} — ${te.targetSets} sets × ${te.targetReps ?? '?'} reps`;
      })
      .join('\n');

    const message = `🏋️ ${template.name}\n\n${exerciseLines}\n\n— Shared from Volt Performance`;

    try {
      await Share.share({ message, title: template.name });
    } catch {
      // User cancelled
    }
  };

  const menuTemplate = templates.find((t) => t.id === menuTemplateId) || null;
  const summaryTemplate = templates.find((t) => t.id === summaryTemplateId) || null;

  const [activeTab, setActiveTab] = useState<'workouts' | 'programs'>('workouts');

  return (
    <View
      style={[
        styles.container,
        { backgroundColor: theme.colors.background, paddingTop: Math.max(insets.top, 16) },
      ]}
    >
      {/* Top Segmented Control Tab Toggle */}
      <View style={styles.tabToggleHeader}>
        <Pressable
          style={[styles.tabToggleBtn, activeTab === 'workouts' && styles.tabToggleBtnActive]}
          onPress={() => setActiveTab('workouts')}
        >
          <Text
            style={[
              styles.tabToggleBtnText,
              { color: activeTab === 'workouts' ? theme.colors.primary : theme.colors.muted },
            ]}
          >
            TEMPLATES
          </Text>
        </Pressable>
        <Pressable
          style={[styles.tabToggleBtn, activeTab === 'programs' && styles.tabToggleBtnActive]}
          onPress={() => setActiveTab('programs')}
        >
          <Text
            style={[
              styles.tabToggleBtnText,
              { color: activeTab === 'programs' ? theme.colors.primary : theme.colors.muted },
            ]}
          >
            PROGRAMS
          </Text>
        </Pressable>
      </View>

      {activeTab === 'workouts' ? (
        <ScrollView
          ref={scrollViewRef}
          contentContainerStyle={{ paddingBottom: Math.max(insets.bottom + 20, 100) }}
          scrollEnabled={scrollEnabled}
          onScroll={handleScroll}
          scrollEventThrottle={16}
        >
          <View style={styles.quickStart}>
            <Text style={styles.sectionTitle}>Quick Start</Text>
            <Pressable style={styles.emptyWorkoutBtn} onPress={handleStartEmpty}>
              <Text style={styles.emptyWorkoutBtnText}>
                {status === 'active' || status === 'paused'
                  ? 'Resume Current Workout'
                  : '+ Start Empty Workout'}
              </Text>
            </Pressable>
          </View>

          <Text style={[styles.sectionTitle, { paddingHorizontal: 16 }]}>My Templates</Text>
          <View style={styles.list}>
            {templates.map((item) => {
              const isDraggingThis = item.id === activeDragId;
              const otherTemplates = templates.filter((t) => t.id !== activeDragId);
              const isHovered =
                activeDragId !== null &&
                hoverIndex !== null &&
                otherTemplates[hoverIndex]?.id === item.id;

              let shiftY = 0;
              if (activeDragId !== null && hoverIndex !== null && !isDraggingThis) {
                const dragIndex = templates.findIndex((t) => t.id === activeDragId);
                const myIndex = templates.findIndex((t) => t.id === item.id);
                const totalShift = 92; // Item height (80) + gap (12)

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

              const exerciseNames = item.exercises
                .map((te) => exercises.find((e) => e.id === te.exerciseId)?.name)
                .filter(Boolean)
                .join(', ');

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
                      draggingTemplateRef.current = item;
                      activeDragIdRef.current = item.id;
                      setActiveDragId(item.id);
                      setScrollEnabled(false);
                    }}
                    onTouchStart={() => {
                      draggingTemplateRef.current = item;
                      activeDragIdRef.current = item.id;
                      setActiveDragId(item.id);
                      setScrollEnabled(false);
                    }}
                    onPointerUp={() => {
                      if (!isDraggingActiveRef.current) {
                        draggingTemplateRef.current = null;
                        activeDragIdRef.current = null;
                        setActiveDragId(null);
                        setScrollEnabled(true);
                      }
                    }}
                    onTouchEnd={() => {
                      if (!isDraggingActiveRef.current) {
                        draggingTemplateRef.current = null;
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
                    style={[styles.cardInfo, { marginLeft: 12 }]}
                    onPress={() => setSummaryTemplateId(item.id)}
                  >
                    <Text style={styles.cardTitle}>{item.name}</Text>
                    <Text style={styles.cardSubtitle} numberOfLines={2} ellipsizeMode="tail">
                      {exerciseNames || `${item.exercises.length} Exercises`}
                    </Text>
                  </Pressable>

                  <Pressable
                    style={styles.kebabBtn}
                    hitSlop={10}
                    onPress={() => setMenuTemplateId(item.id)}
                  >
                    <Ionicons name="ellipsis-vertical" size={20} color="#8A8D9F" />
                  </Pressable>
                </Animated.View>
              );
            })}
            {templates.length === 0 && (
              <Text style={styles.emptyText}>
                No templates saved yet. Finish a workout and save it as a template.
              </Text>
            )}
          </View>
        </ScrollView>
      ) : (
        <ProgramListScreen />
      )}

      {/* Template Action Menu */}
      <Modal
        visible={menuTemplate !== null}
        transparent
        animationType="fade"
        onRequestClose={() => setMenuTemplateId(null)}
      >
        <Pressable style={styles.menuOverlay} onPress={() => setMenuTemplateId(null)}>
          <View style={styles.menuSheet}>
            <Text style={styles.menuTitle}>{menuTemplate?.name}</Text>
            <Pressable
              style={styles.menuItem}
              onPress={() => {
                if (menuTemplate) {
                  setMenuTemplateId(null);
                  handleStartTemplate(menuTemplate);
                }
              }}
            >
              <Ionicons name="play-circle-outline" size={20} color="#90D5FF" />
              <Text style={[styles.menuItemText, { color: '#90D5FF' }]}>Start Workout</Text>
            </Pressable>
            <Pressable
              style={styles.menuItem}
              onPress={() => {
                const id = menuTemplate?.id;
                setMenuTemplateId(null);
                if (id)
                  router.push(
                    `/programs/template-builder?templateId=${id}` as unknown as Parameters<
                      typeof router.push
                    >[0],
                  );
              }}
            >
              <Ionicons name="create-outline" size={20} color="#F4F5F7" />
              <Text style={styles.menuItemText}>Edit</Text>
            </Pressable>
            <Pressable
              style={styles.menuItem}
              onPress={() => {
                if (menuTemplate) {
                  setMenuTemplateId(null);
                  handleShareTemplate(menuTemplate);
                }
              }}
            >
              <Ionicons name="share-outline" size={20} color="#F4F5F7" />
              <Text style={styles.menuItemText}>Share</Text>
            </Pressable>
            <Pressable
              style={styles.menuItem}
              onPress={() => {
                const id = menuTemplate?.id;
                setMenuTemplateId(null);
                if (id) handleDeleteTemplate(id);
              }}
            >
              <Ionicons name="trash-outline" size={20} color="#ef4444" />
              <Text style={[styles.menuItemText, { color: '#ef4444' }]}>Delete</Text>
            </Pressable>
          </View>
        </Pressable>
      </Modal>

      {summaryTemplate && (
        <Modal
          visible={summaryTemplateId !== null}
          transparent
          animationType="slide"
          onRequestClose={() => setSummaryTemplateId(null)}
        >
          <Pressable style={styles.modalOverlay} onPress={() => setSummaryTemplateId(null)}>
            <Pressable
              style={[
                styles.modalCard,
                { backgroundColor: theme.colors.surface, borderColor: theme.colors.border },
              ]}
              onPress={(e) => e.stopPropagation()}
            >
              <View style={styles.modalHeaderRow}>
                <Text
                  style={[
                    styles.modalTitle,
                    { color: theme.colors.text, ...theme.typography.heading },
                  ]}
                >
                  {summaryTemplate.name}
                </Text>
                <Pressable onPress={() => setSummaryTemplateId(null)} hitSlop={10}>
                  <Ionicons name="close" size={24} color={theme.colors.muted} />
                </Pressable>
              </View>

              <View style={styles.modalSummaryStatsRow}>
                <View style={styles.modalStatItem}>
                  <Ionicons name="barbell-outline" size={16} color={theme.colors.primary} />
                  <Text style={[styles.modalStatText, { color: theme.colors.muted }]}>
                    {summaryTemplate.exercises.length} Exercises
                  </Text>
                </View>
                <View style={styles.modalStatItem}>
                  <Ionicons name="repeat-outline" size={16} color={theme.colors.primary} />
                  <Text style={[styles.modalStatText, { color: theme.colors.muted }]}>
                    {summaryTemplate.exercises.reduce((acc, curr) => acc + curr.targetSets, 0)}{' '}
                    Total Sets
                  </Text>
                </View>
              </View>

              <ScrollView style={styles.summaryExerciseList} showsVerticalScrollIndicator={false}>
                {summaryTemplate.exercises.map((te, idx) => {
                  const ex = exercises.find((e) => e.id === te.exerciseId);
                  return (
                    <View
                      key={te.id || idx}
                      style={[styles.summaryExRow, { borderColor: theme.colors.border }]}
                    >
                      <Text style={[styles.summaryExName, { color: theme.colors.text }]}>
                        {ex?.name || 'Unknown Exercise'}
                      </Text>
                      <Text style={[styles.summaryExDetails, { color: theme.colors.primary }]}>
                        {te.targetSets}s × {te.targetReps ?? '8-10'}r
                      </Text>
                    </View>
                  );
                })}
              </ScrollView>

              <Pressable
                style={[
                  styles.modalStartBtn,
                  { backgroundColor: theme.colors.primary, borderRadius: theme.radius.md },
                ]}
                onPress={() => {
                  const tmpl = summaryTemplate;
                  setSummaryTemplateId(null);
                  handleStartTemplate(tmpl);
                }}
              >
                <Text
                  style={[
                    styles.modalStartBtnText,
                    { color: theme.colors.background, ...theme.typography.button },
                  ]}
                >
                  Start Workout
                </Text>
              </Pressable>
            </Pressable>
          </Pressable>
        </Modal>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0B0B0F' },
  tabToggleHeader: {
    flexDirection: 'row',
    backgroundColor: '#1A1C23',
    borderBottomWidth: 1,
    borderBottomColor: '#2A2B31',
  },
  tabToggleBtn: {
    flex: 1,
    paddingVertical: 14,
    alignItems: 'center',
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  tabToggleBtnActive: {
    borderBottomColor: '#90D5FF',
  },
  tabToggleBtnText: {
    fontFamily: 'SpaceGrotesk_700Bold',
    fontSize: 12,
    letterSpacing: 1,
  },
  quickStart: {
    padding: 16,
    marginBottom: 8,
  },
  sectionTitle: {
    fontSize: 20,
    fontFamily: 'SpaceGrotesk_700Bold',
    color: '#90D5FF',
    marginBottom: 12,
    textTransform: 'uppercase',
  },
  emptyWorkoutBtn: {
    backgroundColor: '#90D5FF',
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  emptyWorkoutBtnText: {
    color: '#0B0B0F',
    fontSize: 16,
    fontFamily: 'SpaceGrotesk_700Bold',
  },
  list: { padding: 16 },
  card: {
    backgroundColor: '#1A1C23',
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderColor: '#2A2B31',
  },
  cardInfo: { flex: 1 },
  cardTitle: { fontSize: 16, fontFamily: 'SpaceGrotesk_700Bold', color: '#F4F5F7' },
  cardSubtitle: { fontSize: 14, fontFamily: 'Manrope_500Medium', color: '#8A8D9F', marginTop: 4 },
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
  emptyText: {
    color: '#8A8D9F',
    fontFamily: 'Manrope_500Medium',
    textAlign: 'center',
    marginTop: 24,
    paddingHorizontal: 20,
    lineHeight: 22,
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
    maxWidth: 380,
    borderRadius: 16,
  },
  modalHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
    width: '100%',
  },
  modalTitle: {
    fontSize: 20,
    flex: 1,
    marginRight: 12,
  },
  modalSummaryStatsRow: {
    flexDirection: 'row',
    gap: 16,
    marginBottom: 20,
    width: '100%',
  },
  modalStatItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  modalStatText: {
    fontFamily: 'Manrope_500Medium',
    fontSize: 13,
  },
  summaryExerciseList: {
    maxHeight: 250,
    width: '100%',
    marginBottom: 24,
  },
  summaryExRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    width: '100%',
  },
  summaryExName: {
    fontSize: 14,
    fontFamily: 'SpaceGrotesk_600SemiBold',
    flex: 1,
    marginRight: 12,
  },
  summaryExDetails: {
    fontSize: 13,
    fontFamily: 'SpaceGrotesk_700Bold',
  },
  modalStartBtn: {
    height: 52,
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
  },
  modalStartBtnText: {
    fontSize: 15,
  },
  dragHandle: {
    paddingRight: 8,
    paddingVertical: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
});
