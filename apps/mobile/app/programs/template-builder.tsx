import { useProfileStore } from '../../src/stores/profileStore';
import { SetRow } from '../../src/components/workout/SessionExerciseCard';
import { materializeTemplateSets, updateIndependentSet } from '@fitness-tracker/domain';
import { Theme, useThemeStyles } from '@fitness-tracker/ui';
import { useMeasuredReorder } from '../../src/hooks/useMeasuredReorder';
import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  ScrollView,
  Pressable,
  Animated,
  Keyboard,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  useProgramStore,
  isDefaultTemplateId,
  isTemplateEditable,
} from '../../src/stores/programStore';
import { entitlementService } from '../../src/services/entitlementService';
import { usePaywallStore } from '../../src/stores/paywallStore';
import { useExerciseStore } from '../../src/stores/exerciseStore';
import { ExercisePickerModal } from '../../src/components/workout/ExercisePickerModal';
import { useI18n } from '../../src/i18n';
import { useTheme, useDialog, Card } from '@fitness-tracker/ui';
import { TemplateExercise } from '@fitness-tracker/domain';
import * as Crypto from 'expo-crypto';
import { hapticFeedback } from '../../src/utils/haptics';
import {
  KeyboardDoneAccessory,
  KEYBOARD_DONE_ID,
} from '../../src/components/workout/KeyboardDoneAccessory';

export default function WorkoutTemplateBuilderScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const theme = useTheme();
  const { showAlert, showActionSheet, showConfirm } = useDialog();
  const isImperial = useProfileStore(state => state.profile.preferredUnits === 'imperial');
  const styles = useThemeStyles(createStyles);
  const { language } = useI18n();
  const { programId, templateId, dayOfWeek, week } = useLocalSearchParams<{
    programId?: string;
    templateId?: string;
    dayOfWeek?: string;
    week?: string;
  }>();

  const { programs, templates, customFolders, updateProgram, createTemplate, updateTemplate } = useProgramStore();
  const { exercises } = useExerciseStore();

  const program = programId ? programs.find((p) => p.id === programId) : undefined;
  const existingTemplate = templates.find((t) => t.id === templateId);

  const [name, setName] = useState(existingTemplate?.name || '');
  const [description, setDescription] = useState(existingTemplate?.description || '');
  const [folder, setFolder] = useState(existingTemplate?.folder || '');
  const [creatingFolder, setCreatingFolder] = useState(false);
  const chooseFolder = async () => {
    const choices = customFolders ?? [];
    const selected = await showActionSheet({
      title: language === 'de' ? 'Ordner wählen' : 'Choose folder',
      cancelLabel: language === 'de' ? 'Abbrechen' : 'Cancel',
      actions: [
        { label: language === 'de' ? 'Kein Ordner' : 'No folder', value: 'none' },
        ...choices.map((label, index) => ({ label, value: `folder-${index}` })),
        { label: language === 'de' ? 'Neuer Ordner' : 'New folder', value: 'new' },
      ],
    });
    if (!selected) return;
    setCreatingFolder(selected === 'new');
    setFolder(selected.startsWith('folder-') ? choices[Number(selected.slice(7))] ?? '' : '');
  };
  const [templateExercises, setTemplateExercises] = useState<TemplateExercise[]>(
    (existingTemplate?.exercises || []).map(ex => ({ ...ex, sets: materializeTemplateSets(ex, Crypto.randomUUID) })),
  );

  const handleBack = async () => {
    Keyboard.dismiss();
    const confirmed = await showConfirm({
      title: language === 'de' ? 'Bearbeitung verwerfen?' : 'Discard changes?',
      message: language === 'de' ? 'Nicht gespeicherte Änderungen gehen verloren.' : 'Unsaved changes will be lost.',
      confirmLabel: language === 'de' ? 'Verwerfen' : 'Discard',
      cancelLabel: language === 'de' ? 'Weiter bearbeiten' : 'Keep editing',
      destructive: true,
    });
    if (confirmed) router.back();
  };

  const [isExerciseModalVisible, setExerciseModalVisible] = useState(false);
  const [isReorderMode, setIsReorderMode] = useState(false);
  const [collapsedExercises, setCollapsedExercises] = useState<Record<string, boolean>>({});

  const sorter = useMeasuredReorder(
    templateExercises,
    (items) => setTemplateExercises(items.map((item, order) => ({ ...item, order }))),
    {
      collapsedItemHeight: 64,
      itemGap: 12,
    },
  );
  if (programId && !program) {
    return (
      <View style={styles.centered}>
        <Text style={{ color: theme.colors.text }}>
          {language === 'de' ? 'Programm nicht gefunden.' : 'Program not found.'}
        </Text>
      </View>
    );
  }

  const handleSave = () => {
    if (!name.trim()) return;
    const trimmedFolder = folder.trim() || undefined;

    if (existingTemplate) {
      if (!isTemplateEditable(existingTemplate.id, templates)) {
        usePaywallStore.getState().openPaywall('pro', 'template_limit');
        return;
      }
      try {
        updateTemplate(existingTemplate.id, {
          name,
          description,
          folder: trimmedFolder,
          exercises: templateExercises,
        });
      } catch (error) {
        if (error instanceof Error && error.message.startsWith('TEMPLATE_LOCKED:')) {
          usePaywallStore.getState().openPaywall('pro', 'template_limit');
        } else {
          void showAlert({ title: language === 'de' ? 'Speichern fehlgeschlagen' : 'Could not save',
            message: language === 'de' ? 'Deine Eingaben bleiben erhalten. Bitte erneut versuchen.' : 'Your changes are kept. Please try again.' });
        }
        return;
      }
    } else {
      const customTemplates = templates.filter((t) => !isDefaultTemplateId(t.id));
      if (!entitlementService.canCreateTemplate(customTemplates.length)) {
        usePaywallStore.getState().openPaywall('pro', 'template_limit');
        return;
      }
      const newTemplateId = Crypto.randomUUID();
      try {
        createTemplate({
          id: newTemplateId,
          name,
          description,
          folder: trimmedFolder,
          exercises: templateExercises,
        });
      } catch (error) {
        if (error instanceof Error && error.message.startsWith('TEMPLATE_LIMIT_REACHED:')) {
          usePaywallStore.getState().openPaywall('pro', 'template_limit');
        } else {
          void showAlert({ title: language === 'de' ? 'Speichern fehlgeschlagen' : 'Could not save',
            message: language === 'de' ? 'Deine Eingaben bleiben erhalten. Bitte erneut versuchen.' : 'Your changes are kept. Please try again.' });
        }
        return;
      }

      if (program && dayOfWeek) {
        const targetWeek = week ? parseInt(week, 10) : 1;
        const newWorkout = {
          id: Crypto.randomUUID(),
          templateId: newTemplateId,
          dayOfWeek: parseInt(dayOfWeek, 10),
          week: targetWeek,
          order: program.workouts.filter(
            (w) => w.dayOfWeek === parseInt(dayOfWeek) && w.week === targetWeek,
          ).length,
        };

        updateProgram(program.id, {
          workouts: [...program.workouts, newWorkout],
        });
      }
    }
    void hapticFeedback.notification('success');
    router.back();
  };

  const removeExercise = (id: string) => {
    setTemplateExercises(templateExercises.filter((e) => e.id !== id));
  };

  const changeSets = (id: string, sets: import('@fitness-tracker/domain').ExerciseSet[]) => {
    if (!sets.length) return;
    const first = sets[0]!;
    setTemplateExercises(prev => prev.map(ex => {
      if (ex.id !== id) return ex;
      const next = { ...ex, sets, targetSets: sets.length };
      for (const [source, target] of [['weight', 'targetWeight'], ['reps', 'targetReps'], ['rpe', 'targetRpe'], ['rir', 'targetRir']] as const) {
        const value = first[source];
        if (value === undefined || (target === 'targetReps' && value === 0)) delete next[target];
        else next[target] = value;
      }
      return next;
    }));
  };

  const screenTitle = existingTemplate
    ? program
      ? language === 'de' ? 'Workout bearbeiten' : 'Edit Workout'
      : language === 'de' ? 'Vorlage bearbeiten' : 'Edit Template'
    : program
      ? language === 'de' ? 'Neues Workout' : 'New Workout'
      : language === 'de' ? 'Neue Vorlage' : 'New Template';

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <View
        style={[
          styles.header,
          {
            backgroundColor: theme.colors.surface,
            borderBottomColor: theme.colors.border,
            paddingTop: Math.max(insets.top, 12),
          },
        ]}
      >
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={language === 'de' ? 'Zurück' : 'Back'}
          onPress={() => void handleBack()}
          hitSlop={15}
          style={styles.backBtn}
        >
          <Ionicons name="arrow-back" size={24} color={theme.colors.primary} />
        </Pressable>
        <Text
          numberOfLines={1}
          style={[styles.headerTitle, { color: theme.colors.text, flex: 1, marginHorizontal: 8 }]}
        >
          {screenTitle}
        </Text>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={language === 'de' ? 'Speichern' : 'Save'}
          onPress={handleSave}
          style={[
            styles.saveBtn,
            {
              backgroundColor: theme.colors.primary,
              borderRadius: 8,
              paddingHorizontal: 16,
              minHeight: 36,
              justifyContent: 'center',
            },
          ]}
        >
          <Text style={[styles.saveBtnText, { color: theme.colors.background }]}>
            {language === 'de' ? 'Speichern' : 'Save'}
          </Text>
        </Pressable>
      </View>

      <ScrollView
        ref={sorter.scrollViewRef}
        onLayout={sorter.onLayout}
        onContentSizeChange={sorter.onContentSizeChange}
        onScroll={(e) => {
          sorter.onScroll(e);
        }}
        scrollEventThrottle={16}
        contentContainerStyle={[
          styles.content,
          {
            width: '100%',
            maxWidth: theme.layout.contentWidth,
            alignSelf: 'center',
            paddingBottom: Math.max(insets.bottom, 24),
          },
        ]}
        scrollEnabled={sorter.scrollEnabled}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
        automaticallyAdjustKeyboardInsets={true}
      >
        <Text style={styles.label}>{language === 'de' ? 'Workout-Name' : 'Workout Name'}</Text>
        <TextInput
          style={styles.input}
          value={name}
          onChangeText={setName}
          placeholder={language === 'de' ? 'z. B. Push Day' : 'e.g. Push Day'}
          placeholderTextColor={theme.colors.muted}
          inputAccessoryViewID={KEYBOARD_DONE_ID}
          onSubmitEditing={() => Keyboard.dismiss()}
        />

        <Text style={styles.label}>{language === 'de' ? 'Beschreibung' : 'Description'}</Text>
        <TextInput
          style={styles.input}
          value={description}
          onChangeText={setDescription}
          placeholder={
            language === 'de'
              ? 'z. B. Fokus auf Brust und Trizeps'
              : 'e.g. Focused on chest and triceps'
          }
          placeholderTextColor={theme.colors.muted}
          inputAccessoryViewID={KEYBOARD_DONE_ID}
          onSubmitEditing={() => Keyboard.dismiss()}
        />

        <Text style={styles.label}>
          {language === 'de' ? 'Ordner (Optional)' : 'Folder (Optional)'}
        </Text>
        <Pressable accessibilityRole="button" accessibilityLabel={language === 'de' ? 'Ordner wählen' : 'Choose folder'}
          onPress={() => void chooseFolder()} style={[styles.input, { flexDirection: 'row', alignItems: 'center', gap: 10 }]}>
          <Ionicons name="folder-outline" size={20} color={theme.colors.primary} />
          <Text style={{ color: theme.colors.text, flex: 1 }}>{folder || (language === 'de' ? 'Kein Ordner' : 'No folder')}</Text>
          <Ionicons name="chevron-down" size={18} color={theme.colors.muted} />
        </Pressable>
        {creatingFolder && <TextInput style={[styles.input, { marginTop: 8 }]} value={folder} onChangeText={setFolder}
          accessibilityLabel={language === 'de' ? 'Neuer Ordnername' : 'New folder name'}
          placeholder={language === 'de' ? 'Neuer Ordnername' : 'New folder name'} maxLength={50}
          placeholderTextColor={theme.colors.muted} inputAccessoryViewID={KEYBOARD_DONE_ID}
          onSubmitEditing={() => Keyboard.dismiss()} />}

        <View style={styles.sectionHeaderRow}>
          <Text style={styles.sectionTitle}>
            {language === 'de' ? 'Übungen' : 'Exercises'}{' '}
            {templateExercises.length > 0 ? `(${templateExercises.length})` : ''}
          </Text>
          {templateExercises.length > 1 && (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={
                isReorderMode
                  ? language === 'de'
                    ? 'Sortieren beenden'
                    : 'End reordering'
                  : language === 'de'
                  ? 'Übungen sortieren'
                  : 'Reorder exercises'
              }
              onPress={() => setIsReorderMode((prev) => !prev)}
              style={[
                styles.reorderToggleBtn,
                {
                  backgroundColor: isReorderMode ? theme.colors.primary : theme.colors.surface,
                  borderColor: isReorderMode ? theme.colors.primary : theme.colors.border,
                },
              ]}
            >
              <Ionicons
                name={isReorderMode ? 'checkmark' : 'swap-vertical'}
                size={16}
                color={isReorderMode ? theme.colors.background : theme.colors.primary}
              />
              <Text
                style={[
                  styles.reorderToggleText,
                  {
                    color: isReorderMode ? theme.colors.background : theme.colors.primary,
                    ...theme.typography.caption,
                    fontFamily: 'SpaceGrotesk_700Bold',
                  },
                ]}
              >
                {isReorderMode
                  ? language === 'de'
                    ? 'Fertig'
                    : 'Done'
                  : language === 'de'
                  ? 'Sortieren'
                  : 'Reorder'}
              </Text>
            </Pressable>
          )}
        </View>

        {isReorderMode && (
          <View
            style={[
              styles.reorderBanner,
              {
                backgroundColor: theme.colors.surface,
                borderColor: theme.colors.primary,
              },
            ]}
          >
            <Ionicons name="information-circle-outline" size={16} color={theme.colors.primary} />
            <Text style={[styles.reorderBannerText, { color: theme.colors.muted }]}>
              {language === 'de'
                ? 'Sortiermodus aktiv: Ziehe die Übungen an den Griffen in die gewünschte Reihenfolge.'
                : 'Reorder mode active: Drag exercises by the handle into the desired order.'}
            </Text>
          </View>
        )}

        {templateExercises.map((te, index) => {
          const ex = exercises.find((e) => e.id === te.exerciseId);
          const isCollapsed =
            isReorderMode || sorter.activeDragId !== null || !!collapsedExercises[te.id];

          return (
            <Animated.View
              key={te.id}
              onLayout={(e) => {
                if (!sorter.activeDragId) sorter.itemLayouts.current[te.id] = e.nativeEvent.layout;
              }}
              style={[sorter.getRowStyle(te.id)]}
            >
              <Card
                padding={isCollapsed ? 'sm' : 'md'}
                style={[styles.exerciseCard, isCollapsed && styles.exerciseCardCollapsed]}
              >
                <View style={[styles.exCardHeader, isCollapsed && styles.exCardHeaderCollapsed]}>
                  <View
                    style={[
                      styles.dragHandle,
                      sorter.handleStyle,
                      {
                        minWidth: 44,
                        minHeight: 44,
                        alignItems: 'center',
                        justifyContent: 'center',
                        marginRight: 6,
                      },
                    ]}
                    {...sorter.getHandleProps(te.id)}
                  >
                    <Ionicons name="reorder-two" size={24} color={theme.colors.primary} />
                  </View>

                  <Pressable
                    style={styles.exTitleContainer}
                    onPress={() => {
                      if (!isReorderMode && !sorter.activeDragId) {
                        setCollapsedExercises((prev) => ({ ...prev, [te.id]: !prev[te.id] }));
                      }
                    }}
                  >
                    <Text
                      style={[
                        styles.exName,
                        { color: theme.colors.text, ...theme.typography.heading, fontSize: 17 },
                      ]}
                      numberOfLines={1}
                    >
                      {index + 1}. {ex?.name || (language === 'de' ? 'Unbekannt' : 'Unknown')}
                    </Text>
                    {isCollapsed && (
                      <Text style={[styles.exSummary, { color: theme.colors.muted }]}>
                        {te.targetSets}{' '}
                        {te.targetSets === 1
                          ? language === 'de'
                            ? 'Satz'
                            : 'Set'
                          : language === 'de'
                          ? 'Sätze'
                          : 'Sets'}
                        {te.targetWeight ? ` • ${te.targetWeight} kg` : ''}
                        {te.targetReps ? ` • ${te.targetReps} Reps` : ''}
                      </Text>
                    )}
                  </Pressable>

                  <View style={styles.exHeaderRight}>
                    {isReorderMode && index > 0 && (
                      <Pressable
                        style={styles.arrowBtn}
                        accessibilityRole="button"
                        accessibilityLabel={
                          language === 'de'
                            ? `${ex?.name || 'Übung'} nach oben`
                            : `Move ${ex?.name || 'exercise'} up`
                        }
                        onPress={() => {
                          const reordered = [...templateExercises];
                          const temp = reordered[index];
                          reordered[index] = reordered[index - 1]!;
                          reordered[index - 1] = temp!;
                          const finalReordered = reordered.map((item, idx) => ({
                            ...item,
                            order: idx,
                          }));
                          setTemplateExercises(finalReordered);
                        }}
                        hitSlop={8}
                      >
                        <Ionicons name="chevron-up" size={20} color={theme.colors.primary} />
                      </Pressable>
                    )}
                    {isReorderMode && index < templateExercises.length - 1 && (
                      <Pressable
                        style={styles.arrowBtn}
                        accessibilityRole="button"
                        accessibilityLabel={
                          language === 'de'
                            ? `${ex?.name || 'Übung'} nach unten`
                            : `Move ${ex?.name || 'exercise'} down`
                        }
                        onPress={() => {
                          const reordered = [...templateExercises];
                          const temp = reordered[index];
                          reordered[index] = reordered[index + 1]!;
                          reordered[index + 1] = temp!;
                          const finalReordered = reordered.map((item, idx) => ({
                            ...item,
                            order: idx,
                          }));
                          setTemplateExercises(finalReordered);
                        }}
                        hitSlop={8}
                      >
                        <Ionicons name="chevron-down" size={20} color={theme.colors.primary} />
                      </Pressable>
                    )}
                    {!isReorderMode && (
                      <Pressable
                        accessibilityRole="button"
                        accessibilityLabel={
                          language === 'de'
                            ? `${ex?.name || 'Übung'} entfernen`
                            : `Remove ${ex?.name || 'exercise'}`
                        }
                        style={styles.actionIconBtn}
                        onPress={() => removeExercise(te.id)}
                        hitSlop={10}
                      >
                        <Ionicons name="trash-outline" size={18} color={theme.colors.error} />
                      </Pressable>
                    )}
                    {!isReorderMode && (
                      <Pressable
                        accessibilityRole="button"
                        accessibilityLabel={
                          isCollapsed
                            ? language === 'de'
                              ? 'Übung ausklappen'
                              : 'Expand exercise'
                            : language === 'de'
                            ? 'Übung einklappen'
                            : 'Collapse exercise'
                        }
                        style={styles.actionIconBtn}
                        onPress={() => {
                          setCollapsedExercises((prev) => ({ ...prev, [te.id]: !prev[te.id] }));
                        }}
                        hitSlop={10}
                      >
                        <Ionicons
                          name={isCollapsed ? 'chevron-down' : 'chevron-up'}
                          size={20}
                          color={theme.colors.muted}
                        />
                      </Pressable>
                    )}
                  </View>
                </View>

                {/* Table Column Headers and Sets only when not collapsed */}
                {!isCollapsed && (
                  <>
                    <View style={styles.tableHeaderRow}>
                      <Text
                        style={[
                          styles.tableColHeader,
                          styles.setCol,
                          { color: theme.colors.muted },
                        ]}
                      >
                        {language === 'de' ? 'Satz' : 'Set'}
                      </Text>
                      <Text
                        style={[
                          styles.tableColHeader,
                          styles.inputCol,
                          { color: theme.colors.muted },
                        ]}
                      >
                        {isImperial ? 'lbs' : 'kg'}
                      </Text>
                      <Text
                        style={[
                          styles.tableColHeader,
                          styles.inputCol,
                          { color: theme.colors.muted },
                        ]}
                      >
                        {language === 'de' ? 'Wdh.' : 'Reps'}
                      </Text>
                      <View style={styles.actionColHeader} />
                    </View>

                    {materializeTemplateSets(te, Crypto.randomUUID).map((set, setIdx) => (
                      <SetRow key={set.id} mode="template" compact set={set} isCurrent={false}
                        workingSetNumber={setIdx + 1} sessionExerciseId={te.id} isImperial={isImperial}
                        isCardio={ex?.movementPattern === 'cardio'} showRpe showRir onComplete={() => {}}
                        onUpdate={updates => changeSets(te.id,
                          Object.prototype.hasOwnProperty.call(updates, 'weight')
                            ? (te.sets ?? []).map(row => row.id === set.id ? { ...row, ...updates } : row)
                            : updateIndependentSet(te.sets ?? materializeTemplateSets(te, Crypto.randomUUID), set.id, updates))}
                        onCommit={updates => changeSets(te.id, updateIndependentSet(te.sets ?? materializeTemplateSets(te, Crypto.randomUUID), set.id, updates))}
                        onDelete={() => changeSets(te.id, (te.sets ?? []).filter(s => s.id !== set.id).map((s, i) => ({ ...s, setNumber: i + 1 })))} />
                    ))}
                    <Pressable accessibilityRole="button" style={styles.addSetRow}
                      onPress={() => {
                        const sets = materializeTemplateSets(te, Crypto.randomUUID);
                        changeSets(te.id, [...sets, { ...sets[sets.length - 1]!, id: Crypto.randomUUID(), setNumber: sets.length + 1 }]);
                      }}>
                      <Text style={[styles.addSetRowText, { color: theme.colors.primary }]}>{language === 'de' ? 'SATZ HINZUFÜGEN' : 'ADD SET'}</Text>
                    </Pressable>
                  </>
                )}
              </Card>
            </Animated.View>
          );
        })}

        <Pressable
          style={[styles.addExBtn, { borderColor: theme.colors.border }]}
          onPress={() => setExerciseModalVisible(true)}
        >
          <Text style={[styles.addExText, { color: theme.colors.primary }]}>
            {language === 'de' ? '+ Übung hinzufügen' : '+ Add Exercise'}
          </Text>
        </Pressable>
      </ScrollView>

      <ExercisePickerModal
        visible={isExerciseModalVisible}
        onClose={() => setExerciseModalVisible(false)}
        onSelect={(exerciseIds) => {
          const newExercises = exerciseIds.map((exerciseId, idx) => ({
            id: Crypto.randomUUID(),
            exerciseId,
            order: templateExercises.length + idx,
            targetSets: 3,
            targetReps: 10,
          }));
          setTemplateExercises([...templateExercises, ...newExercises.map(ex => ({ ...ex, sets: materializeTemplateSets(ex, Crypto.randomUUID) }))]);
          setExerciseModalVisible(false);
        }}
      />
      <KeyboardDoneAccessory />
    </View>
  );
}

const createStyles = (theme: Theme) =>
  StyleSheet.create({
    container: { flex: 1, backgroundColor: theme.colors.background },
    centered: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      backgroundColor: theme.colors.background,
    },
    header: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      paddingHorizontal: 16,
      paddingVertical: 12,
      alignItems: 'center',
      borderBottomWidth: 1,
      paddingTop: 50,
    },
    backBtn: {
      width: 44,
      height: 44,
      justifyContent: 'center',
      alignItems: 'center',
    },
    headerTitle: { fontSize: 18, fontFamily: 'SpaceGrotesk_700Bold', textTransform: 'uppercase' },
    saveBtn: {
      minHeight: 44,
      paddingHorizontal: 16,
      justifyContent: 'center',
      alignItems: 'center',
      borderRadius: 8,
    },
    saveBtnText: {
      fontFamily: 'SpaceGrotesk_700Bold',
      textAlignVertical: 'center',
      includeFontPadding: false,
    },
    content: { padding: 16, paddingBottom: 40 },
    label: {
      fontSize: 14,
      fontFamily: 'SpaceGrotesk_600SemiBold',
      color: theme.colors.muted,
      marginBottom: 8,
      textTransform: 'uppercase',
    },
    input: {
      minHeight: 44,
      backgroundColor: theme.colors.surface,
      borderWidth: 1,
      borderColor: theme.colors.border,
      borderRadius: 12,
      padding: 12,
      fontSize: 16,
      fontFamily: 'Manrope_500Medium',
      color: theme.colors.text,
      marginBottom: 16,
    },
    sectionHeaderRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: 16,
    },
    sectionTitle: {
      fontSize: 18,
      fontFamily: 'SpaceGrotesk_700Bold',
      color: theme.colors.primary,
      textTransform: 'uppercase',
    },
    reorderToggleBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      paddingHorizontal: 12,
      paddingVertical: 6,
      borderRadius: 8,
      borderWidth: 1,
    },
    reorderToggleText: {
      fontSize: 13,
    },
    reorderBanner: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      padding: 10,
      borderRadius: 8,
      borderWidth: 1,
      marginBottom: 16,
    },
    reorderBannerText: {
      fontSize: 12,
      flex: 1,
      fontFamily: 'Manrope_500Medium',
    },
    exerciseCard: {
      marginBottom: 16,
    },
    exerciseCardCollapsed: {
      paddingVertical: 10,
    },
    exCardHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: 12,
    },
    exCardHeaderCollapsed: {
      marginBottom: 0,
    },
    exTitleContainer: {
      flex: 1,
      minWidth: 0,
      paddingRight: 8,
    },
    exSummary: {
      fontSize: 12,
      fontFamily: 'Manrope_500Medium',
      marginTop: 2,
    },
    exHeaderRight: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
    },
    arrowBtn: {
      minWidth: 36,
      minHeight: 36,
      alignItems: 'center',
      justifyContent: 'center',
      padding: 4,
    },
    actionIconBtn: {
      minWidth: 36,
      minHeight: 36,
      alignItems: 'center',
      justifyContent: 'center',
      padding: 4,
    },
    exName: { minWidth: 0, marginBottom: 2, fontSize: 16, fontFamily: 'SpaceGrotesk_700Bold' },

    tableHeaderRow: {
      flexDirection: 'row',
      marginBottom: 8,
      paddingHorizontal: 4,
    },
    tableColHeader: {
      fontSize: 12,
      fontWeight: '600',
      textAlign: 'center',
    },
    setCol: { width: 30, textAlign: 'center' },
    setColText: {
      width: 30,
      textAlign: 'center',
      fontFamily: 'SpaceGrotesk_700Bold',
      fontSize: 15,
    },
    inputCol: { flex: 1, flexBasis: 0, minWidth: 0, textAlign: 'center' },
    actionColHeader: { width: 44, marginLeft: 4 },
    deleteSetBtn: {
      width: 44,
      minHeight: 44,
      borderRadius: 8,
      borderWidth: 1,
      justifyContent: 'center',
      alignItems: 'center',
      marginLeft: 4,
    },
    tableRowContainer: {
      marginBottom: 10,
    },
    tableRow: {
      flexDirection: 'row',
      alignItems: 'center',
      borderWidth: 1,
      borderColor: 'transparent',
      borderRadius: 10,
      paddingVertical: 8,
      paddingHorizontal: 2,
    },
    inputField: {
      borderRadius: 8,
      marginHorizontal: 2,
      paddingVertical: 10,
      paddingHorizontal: 4,
      fontSize: 16,
      textAlign: 'center',
      fontWeight: '500',
      borderWidth: 1,
      borderColor: 'transparent',
      minHeight: 44,
      minWidth: 0,
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
      fontFamily: 'SpaceGrotesk_700Bold',
      fontSize: 14,
      fontWeight: '700',
    },
    addExBtn: {
      backgroundColor: 'transparent',
      padding: 16,
      borderRadius: 8,
      alignItems: 'center',
      borderWidth: 1,
      borderStyle: 'dashed',
    },
    addExText: { fontFamily: 'SpaceGrotesk_700Bold', fontSize: 16, textTransform: 'uppercase' },
    dragHandle: {
      paddingRight: 8,
      paddingVertical: 4,
      justifyContent: 'center',
      alignItems: 'center',
    },
  });
