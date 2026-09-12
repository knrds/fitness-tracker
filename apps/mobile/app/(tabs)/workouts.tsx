import { useFocusScroll } from '../../src/hooks/useFocusScroll';
import { useMeasuredReorder } from '../../src/hooks/useMeasuredReorder';
import { scopedAlert as Alert } from '../../src/utils/scopedAlert';
import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  Platform,
  Modal,
  Share,
  ScrollView,
  Animated,
  NativeSyntheticEvent,
  NativeScrollEvent,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
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
  const { tab } = useLocalSearchParams<{ tab?: string }>();
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const { templates, deleteTemplate, updateTemplatesOrder } = useProgramStore();
  const { startWorkout, startWorkoutFromTemplate, status } = useWorkoutStore();
  const { exercises } = useExerciseStore();
  const [menuTemplateId, setMenuTemplateId] = useState<string | null>(null);
  const [summaryTemplateId, setSummaryTemplateId] = useState<string | null>(null);

  const sorter = useMeasuredReorder(templates, updateTemplatesOrder);
  useFocusScroll(sorter.scrollViewRef);
  const handleScroll = (event: NativeSyntheticEvent<NativeScrollEvent>) => {
    sorter.onScroll(event);
  };

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

  const handleMoveTemplate = (templateId: string, direction: 'up' | 'down') => {
    const idx = templates.findIndex((t) => t.id === templateId);
    if (idx === -1) return;
    const targetIdx = direction === 'up' ? idx - 1 : idx + 1;
    if (targetIdx < 0 || targetIdx >= templates.length) return;

    const reordered = [...templates];
    const [moved] = reordered.splice(idx, 1);
    if (!moved) return;
    reordered.splice(targetIdx, 0, moved);
    updateTemplatesOrder(reordered);
  };

  const menuTemplate = templates.find((t) => t.id === menuTemplateId) || null;
  const summaryTemplate = templates.find((t) => t.id === summaryTemplateId) || null;

  const [activeTab, setActiveTab] = useState<'workouts' | 'programs'>('workouts');
  useEffect(() => {
    if (tab === 'programs' || tab === 'workouts') setActiveTab(tab);
  }, [tab]);

  return (
    <View
      style={[
        styles.container,
        { backgroundColor: theme.colors.background, paddingTop: Math.max(insets.top, 16) },
      ]}
    >
      {/* Top Segmented Control Tab Toggle */}
      <View
        style={[
          styles.tabToggleHeader,
          { backgroundColor: theme.colors.surface, borderColor: theme.colors.border },
        ]}
      >
        {(
          [
            { id: 'workouts', label: 'Templates', icon: 'document-text-outline' },
            { id: 'programs', label: 'Programs', icon: 'calendar-outline' },
          ] as const
        ).map((tab) => {
          const isActive = activeTab === tab.id;
          return (
            <Pressable
              key={tab.id}
              style={[
                styles.tabToggleBtn,
                isActive && { backgroundColor: theme.colors.background },
              ]}
              onPress={() => {
                setActiveTab(tab.id);
                router.setParams({ tab: tab.id });
              }}
            >
              <Ionicons
                name={tab.icon}
                size={16}
                color={isActive ? theme.colors.primary : theme.colors.muted}
              />
              <Text
                style={[
                  styles.tabToggleBtnText,
                  { color: isActive ? theme.colors.primary : theme.colors.muted },
                ]}
              >
                {tab.label}
              </Text>
            </Pressable>
          );
        })}
      </View>

      {activeTab === 'workouts' ? (
        <ScrollView
          ref={sorter.scrollViewRef}
          onLayout={sorter.onLayout}
          onContentSizeChange={sorter.onContentSizeChange}
          contentContainerStyle={{ paddingBottom: Math.max(insets.bottom + 20, 100) }}
          scrollEnabled={sorter.scrollEnabled}
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
              const exerciseNames = item.exercises
                .map((te) => exercises.find((e) => e.id === te.exerciseId)?.name)
                .filter(Boolean)
                .join(', ');

              return (
                <Animated.View
                  key={item.id}
                  onLayout={(e) => {
                    if (!sorter.activeDragId)
                      sorter.itemLayouts.current[item.id] = e.nativeEvent.layout;
                  }}
                  style={[styles.card, sorter.getRowStyle(item.id)]}
                >
                  <View
                    style={[
                      styles.dragHandle,
                      sorter.handleStyle,
                      {
                        minWidth: 44,
                        minHeight: 44,
                        alignItems: 'center',
                        justifyContent: 'center',
                      },
                    ]}
                    {...sorter.getHandleProps(item.id)}
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
              style={[
                styles.menuItem,
                templates.findIndex((t) => t.id === menuTemplate?.id) === 0 && { opacity: 0.4 },
              ]}
              disabled={templates.findIndex((t) => t.id === menuTemplate?.id) === 0}
              onPress={() => {
                if (menuTemplate) {
                  handleMoveTemplate(menuTemplate.id, 'up');
                  setMenuTemplateId(null);
                }
              }}
            >
              <Ionicons name="arrow-up-outline" size={20} color="#F4F5F7" />
              <Text style={styles.menuItemText}>Move Up</Text>
            </Pressable>
            <Pressable
              style={[
                styles.menuItem,
                templates.findIndex((t) => t.id === menuTemplate?.id) === templates.length - 1 && {
                  opacity: 0.4,
                },
              ]}
              disabled={
                templates.findIndex((t) => t.id === menuTemplate?.id) === templates.length - 1
              }
              onPress={() => {
                if (menuTemplate) {
                  handleMoveTemplate(menuTemplate.id, 'down');
                  setMenuTemplateId(null);
                }
              }}
            >
              <Ionicons name="arrow-down-outline" size={20} color="#F4F5F7" />
              <Text style={styles.menuItemText}>Move Down</Text>
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
    borderWidth: 1,
    borderRadius: 10,
    marginHorizontal: 24,
    marginVertical: 16,
    padding: 3,
    gap: 3,
  },
  tabToggleBtn: {
    flex: 1,
    minHeight: 36,
    borderRadius: 7,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  tabToggleBtnText: {
    fontFamily: 'SpaceGrotesk_700Bold',
    fontSize: 12,
    textTransform: 'uppercase',
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
