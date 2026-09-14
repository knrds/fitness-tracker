import { SegmentedControl } from '@fitness-tracker/ui';
import { Theme, useThemeStyles } from '@fitness-tracker/ui';
import { useFocusScroll } from '../../src/hooks/useFocusScroll';
import { useMeasuredReorder } from '../../src/hooks/useMeasuredReorder';
import { useFolderTemplateReorder } from '../../src/hooks/useFolderTemplateReorder';
import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  Modal,
  Share,
  ScrollView,
  Animated,
  TextInput,
  NativeSyntheticEvent,
  NativeScrollEvent,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useTheme, useDialog } from '@fitness-tracker/ui';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import { useProgramStore } from '../../src/stores/programStore';
import { useWorkoutStore } from '../../src/stores/workoutStore';
import { useExerciseStore } from '../../src/stores/exerciseStore';
import { useHistoryStore } from '../../src/stores/historyStore';
import { WorkoutTemplate } from '@fitness-tracker/domain';
import ProgramListScreen from './programs';
import { useI18n } from '../../src/i18n';

export default function WorkoutsScreen() {
  const router = useRouter();
  const { tab } = useLocalSearchParams<{ tab?: string }>();
  const theme = useTheme();
  const styles = useThemeStyles(createStyles);
  const { showConfirm } = useDialog();
  const { t, language } = useI18n();
  const insets = useSafeAreaInsets();

  const {
    templates,
    customFolders = [],
    deleteTemplate,
    updateTemplatesOrder,
    createFolder,
    renameFolder,
    deleteFolder,
    setTemplateFolder,
    updateFoldersOrder,
  } = useProgramStore();

  const { startWorkout, startWorkoutFromTemplate, status } = useWorkoutStore();
  const { exercises } = useExerciseStore();
  const { sessions } = useHistoryStore();

  const [menuTemplateId, setMenuTemplateId] = useState<string | null>(null);
  const [summaryTemplateId, setSummaryTemplateId] = useState<string | null>(null);

  // Folder UI state
  const [folderModalVisible, setFolderModalVisible] = useState(false);
  const [editingFolderOriginalName, setEditingFolderOriginalName] = useState<string | null>(null);
  const [folderInputText, setFolderInputText] = useState('');

  const [folderMenuName, setFolderMenuName] = useState<string | null>(null);
  const [assignFolderTemplateId, setAssignFolderTemplateId] = useState<string | null>(null);

  // Track expanded/collapsed folders (default to all expanded)
  const [expandedFolders, setExpandedFolders] = useState<Record<string, boolean>>({});

  const sharedScrollViewRef = useRef<ScrollView>(null);
  useFocusScroll(sharedScrollViewRef);

  // Distinct folders strictly derived from customFolders (case-insensitive deduplication)
  const allFolders = useMemo(() => {
    const list: string[] = [];
    const seen = new Set<string>();

    for (const f of customFolders) {
      const trimmed = f.trim();
      const lower = trimmed.toLowerCase();
      if (trimmed && !seen.has(lower)) {
        seen.add(lower);
        list.push(trimmed);
      }
    }
    return list;
  }, [customFolders]);

  const folderItems = useMemo(
    () => allFolders.map((name) => ({ id: name, name })),
    [allFolders],
  );

  // Sorter for reordering folders themselves
  const folderSorter = useMeasuredReorder(
    folderItems,
    (reordered) => {
      updateFoldersOrder(reordered.map((f) => f.name));
    },
    { scrollViewRef: sharedScrollViewRef },
  );

  // Helper to move a template to another folder (or unassigned)
  const handleMoveTemplateToFolder = (templateId: string, targetFolder: string | undefined) => {
    const template = templates.find((t) => t.id === templateId);
    if (!template) return;

    // Validate target folder: only allow moving into a folder that actually exists, or unassigned (undefined)
    const validTargetFolder = targetFolder
      ? allFolders.find((f) => f.toLowerCase() === targetFolder.toLowerCase())
      : undefined;

    if (targetFolder !== undefined && !validTargetFolder) {
      // Target folder does not exist - cancel cleanly
      return;
    }

    const finalFolder = validTargetFolder ?? undefined;
    setTemplateFolder(templateId, finalFolder ?? null);

    const remaining = templates.filter((t) => t.id !== templateId);
    const updatedTemplate = { ...template, folder: finalFolder };

    const targetGroupKey = finalFolder || '__unassigned__';
    const lastIndexInTarget = remaining
      .map((t) => t.folder || '__unassigned__')
      .lastIndexOf(targetGroupKey);

    const newTemplates = [...remaining];
    if (lastIndexInTarget !== -1) {
      newTemplates.splice(lastIndexInTarget + 1, 0, updatedTemplate);
    } else {
      newTemplates.push(updatedTemplate);
    }

    updateTemplatesOrder(newTemplates);

    if (finalFolder) {
      setExpandedFolders((prev) => ({ ...prev, [finalFolder]: true }));
    }

    void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  };

  // Sorter for reordering templates smoothly within folders and moving across folders
  const templateSorter = useFolderTemplateReorder({
    templates,
    allFolders,
    expandedFolders,
    onExpandFolder: (folderName) => {
      setExpandedFolders((prev) => ({ ...prev, [folderName]: true }));
    },
    onMoveTemplateToFolder: handleMoveTemplateToFolder,
    onReorderTemplates: updateTemplatesOrder,
    scrollViewRef: sharedScrollViewRef,
  });

  const handleScroll = (event: NativeSyntheticEvent<NativeScrollEvent>) => {
    folderSorter.onScroll(event);
    templateSorter.onScroll(event);
  };

  // Compute top 4 workouts based on session history (falling back to template order)
  const topTemplates = useMemo(() => {
    if (templates.length === 0) return [];
    const countMap = new Map<string, number>();

    for (const s of sessions) {
      if (s.templateId) {
        countMap.set(s.templateId, (countMap.get(s.templateId) || 0) + 1);
      } else if (s.name) {
        const match = templates.find((t) => t.name.toLowerCase() === s.name.toLowerCase());
        if (match) {
          countMap.set(match.id, (countMap.get(match.id) || 0) + 1);
        }
      }
    }

    const sorted = [...templates].sort((a, b) => {
      const countA = countMap.get(a.id) || 0;
      const countB = countMap.get(b.id) || 0;
      if (countB !== countA) return countB - countA;
      return 0;
    });

    return sorted.slice(0, 4);
  }, [templates, sessions]);

  // Group templates by folder
  const { folderMap, unassignedTemplates } = useMemo(() => {
    const map = new Map<string, WorkoutTemplate[]>();
    for (const f of allFolders) {
      map.set(f, []);
    }
    const unassigned: WorkoutTemplate[] = [];

    for (const t of templates) {
      const tFolder = t.folder?.trim();
      const matchedFolder = tFolder
        ? allFolders.find((f) => f.toLowerCase() === tFolder.toLowerCase())
        : null;
      if (matchedFolder && map.has(matchedFolder)) {
        map.get(matchedFolder)!.push(t);
      } else {
        unassigned.push(t);
      }
    }
    return { folderMap: map, unassignedTemplates: unassigned };
  }, [allFolders, templates]);

  const toggleFolder = (name: string, forceState?: boolean) => {
    setExpandedFolders((prev) => ({
      ...prev,
      [name]: forceState !== undefined ? forceState : prev[name] === false ? true : false,
    }));
  };

  const isFolderExpanded = (name: string) => {
    return expandedFolders[name] !== false; // default open
  };

  const handleStartEmpty = () => {
    if (status === 'idle' || status === 'finished') {
      startWorkout(language === 'de' ? 'Leeres Workout' : 'Empty Workout');
    }
    router.push('/workout/session');
  };

  const handleStartTemplate = async (template: WorkoutTemplate) => {
    const start = () => {
      startWorkoutFromTemplate(template);
      router.push('/workout/session');
    };

    if (status === 'active' || status === 'paused') {
      const shouldDiscard = await showConfirm({
        title: language === 'de' ? 'Laufendes Training' : 'Active Workout',
        message:
          language === 'de'
            ? 'Ein Training ist bereits aktiv. Möchtest du es verwerfen und stattdessen diese Vorlage starten?'
            : 'A workout is already active. Do you want to discard it and start this template instead?',
        confirmLabel: language === 'de' ? 'Verwerfen & Starten' : 'Discard & Start',
        cancelLabel: language === 'de' ? 'Abbrechen' : 'Cancel',
        destructive: true,
      });
      if (shouldDiscard) {
        start();
      }
    } else {
      start();
    }
  };

  const handleDeleteTemplate = async (templateId: string) => {
    const shouldDelete = await showConfirm({
      title: language === 'de' ? 'Vorlage löschen' : 'Delete Template',
      message:
        language === 'de'
          ? 'Möchtest du diese Trainingsvorlage wirklich löschen?'
          : 'Are you sure you want to delete this workout template?',
      confirmLabel: language === 'de' ? 'Löschen' : 'Delete',
      cancelLabel: language === 'de' ? 'Abbrechen' : 'Cancel',
      destructive: true,
    });
    if (shouldDelete) {
      deleteTemplate(templateId);
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

    const message = `${template.name}\n\n${exerciseLines}\n\n— Shared from Volt Performance`;

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

  const handleOpenCreateFolder = () => {
    setEditingFolderOriginalName(null);
    setFolderInputText('');
    setFolderModalVisible(true);
  };

  const handleOpenRenameFolder = (folderName: string) => {
    setFolderMenuName(null);
    setEditingFolderOriginalName(folderName);
    setFolderInputText(folderName);
    setFolderModalVisible(true);
  };

  const handleSaveFolderModal = () => {
    const trimmed = folderInputText.trim();
    if (!trimmed) return;

    if (editingFolderOriginalName) {
      renameFolder(editingFolderOriginalName, trimmed);
    } else {
      createFolder(trimmed);
    }
    setFolderModalVisible(false);
    setFolderInputText('');
    setEditingFolderOriginalName(null);
  };

  const handleDeleteFolderPrompt = async (folderName: string) => {
    setFolderMenuName(null);
    const count = folderMap.get(folderName)?.length || 0;
    const shouldDelete = await showConfirm({
      title: language === 'de' ? 'Ordner löschen' : 'Delete Folder',
      message:
        language === 'de'
          ? `Möchtest du den Ordner "${folderName}" wirklich löschen?${
              count > 0
                ? ` Die ${count} Vorlage(n) darin bleiben erhalten und werden in "Ohne Ordner" verschoben.`
                : ''
            }`
          : `Are you sure you want to delete the folder "${folderName}"?${
              count > 0
                ? ` The ${count} template(s) in it will be preserved and moved to "Unassigned".`
                : ''
            }`,
      confirmLabel: language === 'de' ? 'Löschen' : 'Delete',
      cancelLabel: language === 'de' ? 'Abbrechen' : 'Cancel',
      destructive: true,
    });
    if (shouldDelete) {
      deleteFolder(folderName);
    }
  };

  const menuTemplate = templates.find((t) => t.id === menuTemplateId) || null;
  const summaryTemplate = templates.find((t) => t.id === summaryTemplateId) || null;
  const assignTemplate = templates.find((t) => t.id === assignFolderTemplateId) || null;

  const [activeTab, setActiveTab] = useState<'workouts' | 'programs'>('workouts');
  useEffect(() => {
    if (tab === 'programs' || tab === 'workouts') setActiveTab(tab);
  }, [tab]);

  // Helper to render draggable template card row
  const renderTemplateCard = (item: WorkoutTemplate) => {
    const exerciseNames = item.exercises
      .map((te) => exercises.find((e) => e.id === te.exerciseId)?.name)
      .filter(Boolean)
      .join(', ');

    const isActiveDrag = templateSorter.activeDragId === item.id;

    return (
      <Animated.View
        key={item.id}
        onLayout={(e) => {
          if (!templateSorter.activeDragId) {
            templateSorter.itemLayouts.current[item.id] = e.nativeEvent.layout;
          }
        }}
        style={[
          styles.card,
          templateSorter.getRowStyle(item.id),
          isActiveDrag && styles.cardActiveDrag,
        ]}
      >
        <View
          style={[
            styles.dragHandle,
            templateSorter.handleStyle,
            {
              minWidth: 38,
              minHeight: 44,
              alignItems: 'center',
              justifyContent: 'center',
            },
          ]}
          {...templateSorter.getHandleProps(item.id)}
        >
          <Ionicons name="reorder-two" size={24} color={theme.colors.primary} />
        </View>

        <Pressable
          style={[styles.cardInfo, { marginLeft: 8 }]}
          onPress={() => setSummaryTemplateId(item.id)}
        >
          <Text style={styles.cardTitle}>{item.name}</Text>
          <Text style={styles.cardSubtitle} numberOfLines={2} ellipsizeMode="tail">
            {exerciseNames ||
              `${item.exercises.length} ${
                item.exercises.length === 1
                  ? language === 'de'
                    ? 'Übung'
                    : 'Exercise'
                  : language === 'de'
                  ? 'Übungen'
                  : 'Exercises'
              }`}
          </Text>
        </Pressable>

        <Pressable
          style={styles.kebabBtn}
          hitSlop={10}
          onPress={() => setMenuTemplateId(item.id)}
        >
          <Ionicons name="ellipsis-vertical" size={20} color={theme.colors.muted} />
        </Pressable>
      </Animated.View>
    );
  };

  return (
    <View
      style={[
        styles.container,
        { backgroundColor: theme.colors.background, paddingTop: Math.max(insets.top, 16) },
      ]}
    >
      <Text
        style={[
          theme.typography.heading,
          { color: theme.colors.text, marginHorizontal: 16, marginBottom: 16 },
        ]}
      >
        {t('plans.title')}
      </Text>
      <SegmentedControl
        label="Plan views"
        value={activeTab}
        onChange={(value) => {
          setActiveTab(value);
          router.setParams({ tab: value });
        }}
        options={[
          { value: 'workouts', label: t('plans.templates') },
          { value: 'programs', label: t('plans.programs') },
        ]}
      />
      {activeTab === 'workouts' ? (
        <ScrollView
          ref={sharedScrollViewRef}
          onLayout={templateSorter.onLayout}
          onContentSizeChange={templateSorter.onContentSizeChange}
          contentContainerStyle={{ paddingBottom: Math.max(insets.bottom + 20, 100) }}
          scrollEnabled={templateSorter.scrollEnabled && folderSorter.scrollEnabled}
          onScroll={handleScroll}
          scrollEventThrottle={16}
        >
          {/* Quick Start Empty Workout */}
          <View style={styles.quickStart}>
            <Text style={styles.sectionTitle}>{t('workout.quickStart')}</Text>
            <Pressable style={styles.emptyWorkoutBtn} onPress={handleStartEmpty}>
              <Text style={styles.emptyWorkoutBtnText}>
                {status === 'active' || status === 'paused'
                  ? t('workout.resumeWorkout')
                  : t('workout.startEmptyWorkout')}
              </Text>
            </Pressable>
          </View>

          {/* 2x2 Top Workouts Grid (Strong-Style) */}
          {topTemplates.length > 0 && (
            <View style={styles.topWorkoutsSection}>
              <View style={styles.sectionHeaderRow}>
                <Text style={styles.sectionTitle}>{t('workout.startWorkout')}</Text>
                <Text style={styles.sectionBadgeText}>Top {topTemplates.length}</Text>
              </View>

              <View style={styles.topGrid}>
                {topTemplates.map((item) => {
                  const exSummary = item.exercises
                    .map((te) => exercises.find((e) => e.id === te.exerciseId)?.name)
                    .filter(Boolean);
                  const previewText =
                    exSummary.length > 0
                      ? exSummary.slice(0, 3).join(', ') +
                        (exSummary.length > 3
                          ? language === 'de'
                            ? ` & ${exSummary.length - 3} weitere...`
                            : ` & ${exSummary.length - 3} more...`
                          : '')
                      : `${item.exercises.length} ${
                          item.exercises.length === 1
                            ? language === 'de'
                              ? 'Übung'
                              : 'Exercise'
                            : language === 'de'
                            ? 'Übungen'
                            : 'Exercises'
                        }`;

                  return (
                    <Pressable
                      key={`top-${item.id}`}
                      style={styles.gridCard}
                      onPress={() => setSummaryTemplateId(item.id)}
                    >
                      <View style={styles.gridCardHeader}>
                        <Text style={styles.gridCardTitle} numberOfLines={1}>
                          {item.name}
                        </Text>
                        <Pressable
                          style={styles.gridCardKebab}
                          hitSlop={10}
                          onPress={(e) => {
                            e.stopPropagation();
                            setMenuTemplateId(item.id);
                          }}
                        >
                          <Ionicons name="ellipsis-horizontal" size={18} color={theme.colors.muted} />
                        </Pressable>
                      </View>
                      <Text style={styles.gridCardSubtitle} numberOfLines={3} ellipsizeMode="tail">
                        {previewText}
                      </Text>
                      {item.folder && (
                        <View style={styles.gridFolderTag}>
                          <Ionicons name="folder-outline" size={11} color={theme.colors.primary} />
                          <Text style={styles.gridFolderTagText} numberOfLines={1}>
                            {item.folder}
                          </Text>
                        </View>
                      )}
                    </Pressable>
                  );
                })}
              </View>
            </View>
          )}

          {/* Folders Section */}
          <View
            style={styles.foldersSection}
            onLayout={(e) => {
              templateSorter.foldersSectionY.current = e.nativeEvent.layout.y;
            }}
          >
            <View style={styles.sectionHeaderRow}>
              <Text style={styles.sectionTitle}>{t('plans.folders')}</Text>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={t('plans.newFolder')}
                style={styles.addFolderBtn}
                onPress={handleOpenCreateFolder}
              >
                <Ionicons name="add-circle-outline" size={18} color={theme.colors.primary} />
                <Text style={styles.addFolderBtnText}>{t('plans.newFolder')}</Text>
              </Pressable>
            </View>

            {/* Render each folder with reorderable folder handle */}
            {allFolders.map((folderName) => {
              const folderItemsInFolder = folderMap.get(folderName) || [];
              const expanded = isFolderExpanded(folderName);
              const isHoveredTarget = templateSorter.hoveredTargetFolder === folderName;

              return (
                <Animated.View
                  key={folderName}
                  onLayout={(e) => {
                    templateSorter.folderLayouts.current[folderName] = e.nativeEvent.layout;
                    if (!folderSorter.activeDragId) {
                      folderSorter.itemLayouts.current[folderName] = e.nativeEvent.layout;
                    }
                  }}
                  style={[
                    styles.folderGroup,
                    folderSorter.getRowStyle(folderName),
                    templateSorter.getFolderStyle(folderName),
                    isHoveredTarget && styles.folderGroupHovered,
                  ]}
                >
                  <Pressable
                    style={styles.folderHeader}
                    onPress={() => toggleFolder(folderName)}
                  >
                    {/* Folder Reorder Drag Handle */}
                    <View
                      style={[
                        styles.dragHandle,
                        folderSorter.handleStyle,
                        {
                          minWidth: 32,
                          minHeight: 44,
                          alignItems: 'center',
                          justifyContent: 'center',
                        },
                      ]}
                      {...folderSorter.getHandleProps(folderName)}
                    >
                      <Ionicons name="reorder-two" size={22} color={theme.colors.muted} />
                    </View>

                    <View style={styles.folderHeaderLeft}>
                      <Ionicons
                        name={expanded ? 'folder-open' : 'folder'}
                        size={20}
                        color={theme.colors.primary}
                      />
                      <Text
                        style={[
                          styles.folderTitle,
                          isHoveredTarget && { color: theme.colors.primary },
                        ]}
                      >
                        {folderName.toUpperCase()}
                      </Text>
                      <Text style={styles.folderCount}>({folderItemsInFolder.length})</Text>
                    </View>

                    <View style={styles.folderHeaderRight}>
                      {isHoveredTarget && (
                        <View style={styles.dropTargetBadge}>
                          <Ionicons name="arrow-down-circle" size={13} color={theme.colors.primary} />
                          <Text style={styles.dropTargetBadgeText}>
                            {language === 'de' ? 'Hier ablegen' : 'Drop here'}
                          </Text>
                        </View>
                      )}
                      <Pressable
                        style={styles.folderKebabBtn}
                        hitSlop={10}
                        onPress={(e) => {
                          e.stopPropagation();
                          setFolderMenuName(folderName);
                        }}
                      >
                        <Ionicons name="ellipsis-horizontal" size={18} color={theme.colors.muted} />
                      </Pressable>
                      <Ionicons
                        name={expanded ? 'chevron-down' : 'chevron-forward'}
                        size={18}
                        color={theme.colors.muted}
                      />
                    </View>
                  </Pressable>

                  {/* Folder Items when expanded */}
                  {expanded && (
                    <View style={styles.folderContent}>
                      {folderItemsInFolder.map((item) => renderTemplateCard(item))}
                      {folderItemsInFolder.length === 0 && (
                        <View style={styles.folderEmptyBox}>
                          <Text style={styles.folderEmptyText}>
                            {t('plans.noTemplatesInFolder')}
                          </Text>
                          <Text style={styles.folderEmptySubtext}>
                            {language === 'de'
                              ? 'Ziehe Vorlagen hierher oder nutze (⋮) "In Ordner verschieben".'
                              : 'Drag templates here or use (⋮) "Move to folder".'}
                          </Text>
                        </View>
                      )}
                    </View>
                  )}
                </Animated.View>
              );
            })}

            {/* Unassigned Templates Section */}
            {allFolders.length > 0 && unassignedTemplates.length > 0 && (
              <View
                style={[
                  styles.folderGroup,
                  templateSorter.getFolderStyle('__unassigned__'),
                  templateSorter.hoveredTargetFolder === '__unassigned__' &&
                    styles.folderGroupHovered,
                ]}
                onLayout={(e) => {
                  templateSorter.folderLayouts.current['__unassigned__'] = e.nativeEvent.layout;
                }}
              >
                <Pressable
                  style={styles.folderHeader}
                  onPress={() => toggleFolder('__unassigned__')}
                >
                  <View style={styles.folderHeaderSpacer} />
                  <View style={styles.folderHeaderLeft}>
                    <Ionicons
                      name={
                        isFolderExpanded('__unassigned__')
                          ? 'folder-open-outline'
                          : 'folder-outline'
                      }
                      size={20}
                      color={
                        templateSorter.hoveredTargetFolder === '__unassigned__'
                          ? theme.colors.primary
                          : theme.colors.muted
                      }
                    />
                    <Text
                      style={[
                        styles.folderTitle,
                        {
                          color:
                            templateSorter.hoveredTargetFolder === '__unassigned__'
                              ? theme.colors.primary
                              : theme.colors.muted,
                        },
                      ]}
                    >
                      {t('plans.unassigned')}
                    </Text>
                    <Text style={styles.folderCount}>({unassignedTemplates.length})</Text>
                  </View>

                  <View style={styles.folderHeaderRight}>
                    {templateSorter.hoveredTargetFolder === '__unassigned__' && (
                      <View style={styles.dropTargetBadge}>
                        <Ionicons name="arrow-down-circle" size={13} color={theme.colors.primary} />
                        <Text style={styles.dropTargetBadgeText}>
                          {language === 'de' ? 'Hier ablegen' : 'Drop here'}
                        </Text>
                      </View>
                    )}
                    <Ionicons
                      name={
                        isFolderExpanded('__unassigned__')
                          ? 'chevron-down'
                          : 'chevron-forward'
                      }
                      size={18}
                      color={theme.colors.muted}
                    />
                  </View>
                </Pressable>

                {isFolderExpanded('__unassigned__') && (
                  <View style={styles.folderContent}>
                    {unassignedTemplates.map((item) => renderTemplateCard(item))}
                  </View>
                )}
              </View>
            )}

            {/* If no folders exist yet, render flat list with drag-and-drop */}
            {allFolders.length === 0 && (
              <View
                style={styles.list}
                onLayout={(e) => {
                  templateSorter.folderLayouts.current['__unassigned__'] = e.nativeEvent.layout;
                }}
              >
                <View style={styles.emptyFolderHintCard}>
                  <Ionicons name="folder-outline" size={24} color={theme.colors.primary} />
                  <View style={{ flex: 1 }}>
                    <Text style={styles.emptyFolderHintTitle}>
                      {t('plans.folderHintTitle')}
                    </Text>
                    <Text style={styles.emptyFolderHintText}>
                      {t('plans.folderHintText')}
                    </Text>
                  </View>
                </View>
                {templates.map((item) => renderTemplateCard(item))}
                {templates.length === 0 && (
                  <Text style={styles.emptyText}>
                    {t('plans.noTemplatesSaved')}
                  </Text>
                )}
              </View>
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
              <Ionicons name="play-circle-outline" size={20} color={theme.colors.primary} />
              <Text style={[styles.menuItemText, { color: theme.colors.primary }]}>
                {t('workout.startWorkout')}
              </Text>
            </Pressable>

            {/* Move to Folder Action */}
            <Pressable
              style={styles.menuItem}
              onPress={() => {
                const id = menuTemplate?.id;
                setMenuTemplateId(null);
                if (id) setAssignFolderTemplateId(id);
              }}
            >
              <Ionicons name="folder-outline" size={20} color={theme.colors.primary} />
              <Text style={styles.menuItemText}>
                {menuTemplate?.folder
                  ? `${language === 'de' ? 'Ordner ändern' : 'Change Folder'} (${menuTemplate.folder})`
                  : language === 'de'
                    ? 'In Ordner verschieben...'
                    : 'Move to folder...'}
              </Text>
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
              <Ionicons name="create-outline" size={20} color={theme.colors.text} />
              <Text style={styles.menuItemText}>{language === 'de' ? 'Bearbeiten' : 'Edit'}</Text>
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
              <Ionicons name="arrow-up-outline" size={20} color={theme.colors.text} />
              <Text style={styles.menuItemText}>{language === 'de' ? 'Nach oben' : 'Move Up'}</Text>
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
              <Ionicons name="arrow-down-outline" size={20} color={theme.colors.text} />
              <Text style={styles.menuItemText}>{language === 'de' ? 'Nach unten' : 'Move Down'}</Text>
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
              <Ionicons name="share-outline" size={20} color={theme.colors.text} />
              <Text style={styles.menuItemText}>{language === 'de' ? 'Teilen' : 'Share'}</Text>
            </Pressable>
            <Pressable
              style={styles.menuItem}
              onPress={() => {
                const id = menuTemplate?.id;
                setMenuTemplateId(null);
                if (id) handleDeleteTemplate(id);
              }}
            >
              <Ionicons name="trash-outline" size={20} color={theme.colors.error} />
              <Text style={[styles.menuItemText, { color: theme.colors.error }]}>
                {language === 'de' ? 'Löschen' : 'Delete'}
              </Text>
            </Pressable>
          </View>
        </Pressable>
      </Modal>

      {/* Folder Action Menu (Rename / Delete) */}
      <Modal
        visible={folderMenuName !== null}
        transparent
        animationType="fade"
        onRequestClose={() => setFolderMenuName(null)}
      >
        <Pressable style={styles.menuOverlay} onPress={() => setFolderMenuName(null)}>
          <View style={styles.menuSheet}>
            <Text style={styles.menuTitle}>
              {language === 'de' ? 'ORDNER' : 'FOLDER'}: {folderMenuName}
            </Text>
            <Pressable
              style={styles.menuItem}
              onPress={() => {
                if (folderMenuName) handleOpenRenameFolder(folderMenuName);
              }}
            >
              <Ionicons name="create-outline" size={20} color={theme.colors.text} />
              <Text style={styles.menuItemText}>{language === 'de' ? 'Umbenennen' : 'Rename'}</Text>
            </Pressable>
            <Pressable
              style={styles.menuItem}
              onPress={() => {
                if (folderMenuName) handleDeleteFolderPrompt(folderMenuName);
              }}
            >
              <Ionicons name="trash-outline" size={20} color={theme.colors.error} />
              <Text style={[styles.menuItemText, { color: theme.colors.error }]}>
                {language === 'de' ? 'Ordner löschen' : 'Delete folder'}
              </Text>
            </Pressable>
          </View>
        </Pressable>
      </Modal>

      {/* Create / Rename Folder Modal */}
      <Modal
        visible={folderModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setFolderModalVisible(false)}
      >
        <Pressable style={styles.modalOverlay} onPress={() => setFolderModalVisible(false)}>
          <Pressable
            style={[
              styles.modalCard,
              { backgroundColor: theme.colors.surface, borderColor: theme.colors.border },
            ]}
            onPress={(e) => e.stopPropagation()}
          >
            <Text style={[styles.modalTitle, { color: theme.colors.text, marginBottom: 16 }]}>
              {editingFolderOriginalName
                ? language === 'de'
                  ? 'Ordner umbenennen'
                  : 'Rename folder'
                : language === 'de'
                  ? 'Neuer Ordner'
                  : 'New folder'}
            </Text>
            <TextInput
              autoFocus
              value={folderInputText}
              onChangeText={setFolderInputText}
              placeholder={
                language === 'de'
                  ? 'z. B. PPL ARNOLD, Home Gym, Urlaubs-Workouts...'
                  : 'e.g. PPL ARNOLD, Home Gym, Vacation Workouts...'
              }
              placeholderTextColor={theme.colors.muted}
              style={[
                styles.folderInput,
                {
                  color: theme.colors.text,
                  backgroundColor: theme.colors.background,
                  borderColor: theme.colors.border,
                },
              ]}
              maxLength={50}
              returnKeyType="done"
              onSubmitEditing={handleSaveFolderModal}
            />
            <View style={styles.folderModalButtonsRow}>
              <Pressable
                style={[styles.folderModalBtn, { borderColor: theme.colors.border, borderWidth: 1 }]}
                onPress={() => setFolderModalVisible(false)}
              >
                <Text style={{ color: theme.colors.muted, fontFamily: 'SpaceGrotesk_600SemiBold' }}>
                  {t('common.cancel')}
                </Text>
              </Pressable>
              <Pressable
                style={[
                  styles.folderModalBtn,
                  {
                    backgroundColor: theme.colors.primary,
                    opacity: folderInputText.trim().length === 0 ? 0.5 : 1,
                  },
                ]}
                disabled={folderInputText.trim().length === 0}
                onPress={handleSaveFolderModal}
              >
                <Text
                  style={{
                    color: theme.colors.background,
                    fontFamily: 'SpaceGrotesk_700Bold',
                  }}
                >
                  {t('common.save')}
                </Text>
              </Pressable>
            </View>
          </Pressable>
        </Pressable>
      </Modal>

      {/* Assign Template to Folder Modal */}
      <Modal
        visible={assignFolderTemplateId !== null}
        transparent
        animationType="slide"
        onRequestClose={() => setAssignFolderTemplateId(null)}
      >
        <Pressable style={styles.modalOverlay} onPress={() => setAssignFolderTemplateId(null)}>
          <Pressable
            style={[
              styles.modalCard,
              {
                backgroundColor: theme.colors.surface,
                borderColor: theme.colors.border,
                maxHeight: '80%',
              },
            ]}
            onPress={(e) => e.stopPropagation()}
          >
            <View style={styles.modalHeaderRow}>
              <View style={{ flex: 1 }}>
                <Text style={[styles.modalTitle, { color: theme.colors.text }]}>
                  {language === 'de' ? 'Ordner zuweisen' : 'Assign folder'}
                </Text>
                <Text style={{ color: theme.colors.muted, fontSize: 12, marginTop: 2 }}>
                  {assignTemplate?.name}
                </Text>
              </View>
              <Pressable onPress={() => setAssignFolderTemplateId(null)} hitSlop={10}>
                <Ionicons name="close" size={24} color={theme.colors.muted} />
              </Pressable>
            </View>

            <ScrollView style={{ maxHeight: 300, width: '100%', marginVertical: 12 }}>
              {/* Option: None / Remove Folder */}
              <Pressable
                style={[
                  styles.assignFolderOption,
                  !assignTemplate?.folder && styles.assignFolderOptionActive,
                ]}
                onPress={() => {
                  if (assignTemplate) {
                    setTemplateFolder(assignTemplate.id, null);
                    setAssignFolderTemplateId(null);
                  }
                }}
              >
                <Ionicons
                  name="close-circle-outline"
                  size={20}
                  color={!assignTemplate?.folder ? theme.colors.primary : theme.colors.muted}
                />
                <Text
                  style={[
                    styles.assignFolderOptionText,
                    {
                      color: !assignTemplate?.folder ? theme.colors.primary : theme.colors.text,
                    },
                  ]}
                >
                  {language === 'de' ? 'Kein Ordner' : 'No folder'}
                </Text>
                {!assignTemplate?.folder && (
                  <Ionicons name="checkmark" size={18} color={theme.colors.primary} />
                )}
              </Pressable>

              {/* List of existing folders */}
              {allFolders.map((fName) => {
                const isSelected = assignTemplate?.folder === fName;
                return (
                  <Pressable
                    key={`assign-${fName}`}
                    style={[
                      styles.assignFolderOption,
                      isSelected && styles.assignFolderOptionActive,
                    ]}
                    onPress={() => {
                      if (assignTemplate) {
                        setTemplateFolder(assignTemplate.id, fName);
                        setAssignFolderTemplateId(null);
                      }
                    }}
                  >
                    <Ionicons
                      name="folder"
                      size={20}
                      color={isSelected ? theme.colors.primary : theme.colors.muted}
                    />
                    <Text
                      style={[
                        styles.assignFolderOptionText,
                        { color: isSelected ? theme.colors.primary : theme.colors.text },
                      ]}
                    >
                      {fName}
                    </Text>
                    {isSelected && (
                      <Ionicons name="checkmark" size={18} color={theme.colors.primary} />
                    )}
                  </Pressable>
                );
              })}
            </ScrollView>

            <Pressable
              style={styles.assignNewFolderBtn}
              onPress={() => {
                setAssignFolderTemplateId(null);
                handleOpenCreateFolder();
              }}
            >
              <Ionicons name="add-circle-outline" size={18} color={theme.colors.primary} />
              <Text style={[styles.assignNewFolderBtnText, { color: theme.colors.primary }]}>
                {language === 'de' ? '+ Neuen Ordner erstellen' : '+ Create new folder'}
              </Text>
            </Pressable>
          </Pressable>
        </Pressable>
      </Modal>

      {/* Template Summary Modal */}
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
                <View style={{ flex: 1 }}>
                  <Text
                    style={[
                      styles.modalTitle,
                      { color: theme.colors.text, ...theme.typography.heading },
                    ]}
                  >
                    {summaryTemplate.name}
                  </Text>
                  {summaryTemplate.folder && (
                    <Text style={{ color: theme.colors.primary, fontSize: 12, marginTop: 2 }}>
                      📁 {summaryTemplate.folder}
                    </Text>
                  )}
                </View>
                <Pressable onPress={() => setSummaryTemplateId(null)} hitSlop={10}>
                  <Ionicons name="close" size={24} color={theme.colors.muted} />
                </Pressable>
              </View>

              <View style={styles.modalSummaryStatsRow}>
                <View style={styles.modalStatItem}>
                  <Ionicons name="barbell-outline" size={16} color={theme.colors.primary} />
                  <Text style={[styles.modalStatText, { color: theme.colors.muted }]}>
                    {summaryTemplate.exercises.length}{' '}
                    {summaryTemplate.exercises.length === 1
                      ? language === 'de'
                        ? 'Übung'
                        : 'Exercise'
                      : language === 'de'
                      ? 'Übungen'
                      : 'Exercises'}
                  </Text>
                </View>
                <View style={styles.modalStatItem}>
                  <Ionicons name="repeat-outline" size={16} color={theme.colors.primary} />
                  <Text style={[styles.modalStatText, { color: theme.colors.muted }]}>
                    {summaryTemplate.exercises.reduce((acc, curr) => acc + curr.targetSets, 0)}{' '}
                    {language === 'de' ? 'Sätze gesamt' : 'Total Sets'}
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
                        {ex?.name || (language === 'de' ? 'Unbekannte Übung' : 'Unknown Exercise')}
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
                  {t('workout.startWorkout')}
                </Text>
              </Pressable>
            </Pressable>
          </Pressable>
        </Modal>
      )}
    </View>
  );
}

const createStyles = (theme: Theme) =>
  StyleSheet.create({
    container: { flex: 1, backgroundColor: theme.colors.background },
    quickStart: {
      paddingHorizontal: 16,
      marginBottom: 16,
    },
    sectionTitle: {
      fontSize: 18,
      fontFamily: 'SpaceGrotesk_700Bold',
      color: theme.colors.text,
    },
    sectionHeaderRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: 12,
    },
    sectionBadgeText: {
      fontSize: 12,
      fontFamily: 'SpaceGrotesk_600SemiBold',
      color: theme.colors.primary,
      backgroundColor: theme.colors.surface,
      paddingHorizontal: 8,
      paddingVertical: 3,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: theme.colors.border,
    },
    emptyWorkoutBtn: {
      backgroundColor: theme.colors.primary,
      paddingVertical: 14,
      borderRadius: 12,
      alignItems: 'center',
      marginTop: 8,
    },
    emptyWorkoutBtnText: {
      color: theme.colors.background,
      fontSize: 15,
      fontFamily: 'SpaceGrotesk_700Bold',
    },

    // 2x2 Top Grid (Strong Style)
    topWorkoutsSection: {
      paddingHorizontal: 16,
      marginBottom: 20,
    },
    topGrid: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 10,
    },
    gridCard: {
      width: '48.5%',
      backgroundColor: theme.colors.surface,
      borderRadius: theme.radius.md,
      borderWidth: 1,
      borderColor: theme.colors.border,
      padding: 12,
      minHeight: 110,
      justifyContent: 'space-between',
    },
    gridCardHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
    },
    gridCardTitle: {
      flex: 1,
      fontSize: 14,
      fontFamily: 'SpaceGrotesk_700Bold',
      color: theme.colors.text,
      marginRight: 4,
    },
    gridCardKebab: {
      minWidth: 28,
      minHeight: 28,
      alignItems: 'center',
      justifyContent: 'center',
    },
    gridCardSubtitle: {
      fontSize: 11,
      fontFamily: 'Manrope_500Medium',
      color: theme.colors.muted,
      lineHeight: 16,
      marginTop: 4,
      marginBottom: 6,
    },
    gridFolderTag: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
      alignSelf: 'flex-start',
      backgroundColor: theme.colors.background,
      paddingHorizontal: 6,
      paddingVertical: 2,
      borderRadius: 6,
    },
    gridFolderTagText: {
      fontSize: 10,
      fontFamily: 'SpaceGrotesk_600SemiBold',
      color: theme.colors.primary,
    },

    // Folders Section
    foldersSection: {
      paddingHorizontal: 16,
    },
    addFolderBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 5,
      paddingVertical: 6,
      paddingHorizontal: 10,
      borderRadius: 8,
      backgroundColor: theme.colors.surface,
      borderWidth: 1,
      borderColor: theme.colors.border,
    },
    addFolderBtnText: {
      fontSize: 13,
      fontFamily: 'SpaceGrotesk_600SemiBold',
      color: theme.colors.primary,
    },
    folderGroup: {
      marginBottom: 10,
      borderRadius: theme.radius.md,
      borderWidth: 1.5,
      borderColor: theme.colors.border,
      backgroundColor: theme.colors.surface,
      overflow: 'visible',
    },
    folderGroupHovered: {
      borderColor: theme.colors.primary,
      borderWidth: 2,
      backgroundColor: theme.colors.primary + '18',
    },
    folderHeaderSpacer: {
      minWidth: 32,
      minHeight: 44,
      paddingHorizontal: 6,
    },
    dropTargetBadge: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
      paddingHorizontal: 8,
      paddingVertical: 3,
      borderRadius: 6,
      backgroundColor: theme.colors.primary + '25',
      borderWidth: 1,
      borderColor: theme.colors.primary,
      marginRight: 6,
    },
    dropTargetBadgeText: {
      fontSize: 11,
      fontFamily: 'SpaceGrotesk_700Bold',
      color: theme.colors.primary,
    },
    cardActiveDrag: {
      borderColor: theme.colors.primary,
      borderWidth: 1.5,
      backgroundColor: theme.colors.surface,
    },
    folderHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingRight: 14,
      paddingVertical: 10,
      minHeight: 52,
    },
    folderHeaderLeft: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
      flex: 1,
    },
    folderTitle: {
      fontSize: 14,
      fontFamily: 'SpaceGrotesk_700Bold',
      color: theme.colors.text,
      letterSpacing: 0.5,
    },
    folderCount: {
      fontSize: 13,
      fontFamily: 'SpaceGrotesk_600SemiBold',
      color: theme.colors.muted,
    },
    folderHeaderRight: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
    },
    folderKebabBtn: {
      minWidth: 32,
      minHeight: 32,
      alignItems: 'center',
      justifyContent: 'center',
    },
    folderContent: {
      paddingHorizontal: 10,
      paddingBottom: 10,
      paddingTop: 4,
    },
    folderEmptyBox: {
      paddingVertical: 14,
      paddingHorizontal: 12,
      alignItems: 'center',
    },
    folderEmptyText: {
      color: theme.colors.muted,
      fontSize: 12,
      fontFamily: 'Manrope_500Medium',
      textAlign: 'center',
    },
    folderEmptySubtext: {
      color: theme.colors.muted,
      fontSize: 11,
      textAlign: 'center',
      marginTop: 4,
      opacity: 0.8,
    },

    list: { paddingVertical: 8 },
    card: {
      backgroundColor: theme.colors.surface,
      borderRadius: theme.radius.md,
      padding: 14,
      marginBottom: 8,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      borderWidth: 1,
      borderColor: theme.colors.border,
    },
    cardInfo: { flex: 1 },
    cardTitle: { fontSize: 15, fontFamily: 'SpaceGrotesk_700Bold', color: theme.colors.text },
    cardSubtitle: {
      fontSize: 13,
      fontFamily: 'Manrope_500Medium',
      color: theme.colors.muted,
      marginTop: 3,
    },
    kebabBtn: { minWidth: 40, minHeight: 44, alignItems: 'center', justifyContent: 'center' },
    menuOverlay: {
      flex: 1,
      backgroundColor: theme.colors.overlay,
      justifyContent: 'flex-end',
    },
    menuSheet: {
      backgroundColor: theme.colors.surface,
      borderTopLeftRadius: 20,
      borderTopRightRadius: 20,
      borderWidth: 1,
      borderColor: theme.colors.border,
      paddingTop: 16,
      paddingBottom: 40,
      paddingHorizontal: 12,
    },
    menuTitle: {
      fontFamily: 'SpaceGrotesk_700Bold',
      color: theme.colors.muted,
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
      paddingVertical: 14,
      paddingHorizontal: 12,
      borderRadius: 12,
    },
    menuItemText: {
      color: theme.colors.text,
      fontFamily: 'SpaceGrotesk_600SemiBold',
      fontSize: 15,
    },
    emptyText: {
      color: theme.colors.muted,
      fontFamily: 'Manrope_500Medium',
      textAlign: 'center',
      marginTop: 24,
      paddingHorizontal: 20,
      lineHeight: 22,
    },
    emptyFolderHintCard: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
      backgroundColor: theme.colors.surface,
      borderRadius: theme.radius.md,
      padding: 14,
      marginBottom: 16,
      borderWidth: 1,
      borderColor: theme.colors.border,
    },
    emptyFolderHintTitle: {
      fontSize: 13,
      fontFamily: 'SpaceGrotesk_700Bold',
      color: theme.colors.text,
    },
    emptyFolderHintText: {
      fontSize: 12,
      fontFamily: 'Manrope_500Medium',
      color: theme.colors.muted,
      marginTop: 2,
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
      maxWidth: 380,
      borderRadius: theme.radius.lg,
    },
    modalHeaderRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: 16,
      width: '100%',
    },
    modalTitle: {
      fontSize: 18,
      fontFamily: 'SpaceGrotesk_700Bold',
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
      height: 50,
      alignItems: 'center',
      justifyContent: 'center',
      width: '100%',
    },
    modalStartBtnText: {
      fontSize: 15,
    },
    dragHandle: {
      paddingHorizontal: 6,
      paddingVertical: 12,
      justifyContent: 'center',
      alignItems: 'center',
    },

    // Folder Modals
    folderInput: {
      height: 48,
      borderWidth: 1,
      borderRadius: 10,
      paddingHorizontal: 14,
      fontSize: 15,
      fontFamily: 'Manrope_500Medium',
      marginBottom: 18,
    },
    folderModalButtonsRow: {
      flexDirection: 'row',
      gap: 12,
      justifyContent: 'flex-end',
    },
    folderModalBtn: {
      paddingVertical: 12,
      paddingHorizontal: 20,
      borderRadius: 10,
      alignItems: 'center',
      justifyContent: 'center',
      minWidth: 100,
    },
    assignFolderOption: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
      paddingVertical: 14,
      paddingHorizontal: 12,
      borderRadius: 10,
      marginBottom: 4,
    },
    assignFolderOptionActive: {
      backgroundColor: theme.colors.background,
    },
    assignFolderOptionText: {
      flex: 1,
      fontSize: 15,
      fontFamily: 'SpaceGrotesk_600SemiBold',
    },
    assignNewFolderBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 8,
      paddingVertical: 12,
      borderTopWidth: 1,
      borderTopColor: theme.colors.border,
      marginTop: 8,
    },
    assignNewFolderBtnText: {
      fontSize: 14,
      fontFamily: 'SpaceGrotesk_700Bold',
    },
  });
