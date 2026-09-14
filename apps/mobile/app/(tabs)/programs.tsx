import { Theme, useThemeStyles } from '@fitness-tracker/ui';
import { KeyboardDoneAccessory } from '../../src/components/workout/KeyboardDoneAccessory';
import { useFocusScroll } from '../../src/hooks/useFocusScroll';
import { useMeasuredReorder } from '../../src/hooks/useMeasuredReorder';
import { scopedAlert as Alert } from '../../src/utils/scopedAlert';
import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  Modal,
  TextInput,
  Platform,
  ScrollView,
  Share,
  Animated,
  NativeSyntheticEvent,
  NativeScrollEvent,
} from 'react-native';
import { useRouter } from 'expo-router';
import * as Crypto from 'expo-crypto';
import { Ionicons } from '@expo/vector-icons';
import { useTheme, Button, useDialog } from '@fitness-tracker/ui';
import { VoltBackdrop } from '../../src/components/VoltBackdrop';

import { Program, WorkoutTemplate } from '@fitness-tracker/domain';

import { useProgramStore } from '../../src/stores/programStore';
import { useWorkoutStore } from '../../src/stores/workoutStore';
import { useI18n } from '../../src/i18n';

export default function ProgramListScreen() {
  const router = useRouter();
  const theme = useTheme();
  const styles = useThemeStyles(createStyles);
  const { showConfirm } = useDialog();
  const { t, language } = useI18n();
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

  const sorter = useMeasuredReorder(programs, updateProgramsOrder);
  useFocusScroll(sorter.scrollViewRef);
  const handleScroll = (event: NativeSyntheticEvent<NativeScrollEvent>) => {
    sorter.onScroll(event);
  };

  const handleCreateProgram = () => {
    if (!name.trim()) {
      const msg =
        language === 'de'
          ? 'Der Programmname ist erforderlich.'
          : 'Program name is required.';
      if (Platform.OS === 'web') {
        if (typeof globalThis !== 'undefined' && 'alert' in globalThis) {
          const alertFn = (globalThis as { alert?: (msg: string) => void }).alert;
          alertFn?.(msg);
        }
      } else {
        Alert.alert(t('common.error'), msg);
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

  const handleStartTemplate = async (template: WorkoutTemplate | undefined, programId: string) => {
    if (!template) return;

    const start = () => {
      startWorkoutFromTemplate(template, programId);
      router.push('/workout/session');
    };

    if (activeWorkoutStatus === 'active' || activeWorkoutStatus === 'paused') {
      const shouldDiscard = await showConfirm({
        title: language === 'de' ? 'Laufendes Training' : 'Active Workout',
        message:
          language === 'de'
            ? 'Ein Training ist bereits aktiv. Möchtest du es verwerfen und stattdessen diese Vorlage starten?'
            : 'A workout is currently active. Do you want to discard it and start this template instead?',
        confirmLabel: language === 'de' ? 'Verwerfen & Starten' : 'Discard & Start',
        cancelLabel: t('common.cancel'),
        destructive: true,
      });
      if (shouldDiscard) {
        start();
      }
    } else {
      start();
    }
  };

  const renderHeader = () => {
    if (!activeProgram) return null;

    const getDayName = (d: number) => {
      const days =
        language === 'de'
          ? ['Montag', 'Dienstag', 'Mittwoch', 'Donnerstag', 'Freitag', 'Samstag', 'Sonntag']
          : ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
      return days[d - 1] ?? `Tag ${d}`;
    };

    return (
      <View style={styles.activeProgramSection}>
        <VoltBackdrop />
        <View style={styles.activeProgramHeader}>
          <View style={styles.activeInfoCol}>
            <View
              style={{
                flexDirection: 'row',
                justifyContent: 'space-between',
                alignItems: 'center',
                gap: 12,
                marginBottom: 8,
              }}
            >
              <Text style={styles.activeBadge}>
                {language === 'de' ? 'AKTIVES PROGRAMM' : 'ACTIVE PROGRAM'}
              </Text>{' '}
              <Pressable
                accessibilityRole="button"
                style={styles.deactivateBtn}
                onPress={confirmDeactivate}
              >
                <Text style={styles.deactivateBtnText}>
                  {language === 'de' ? 'Deaktivieren' : 'Deactivate'}
                </Text>
              </Pressable>
            </View>
            <Text style={styles.activeTitle}>{activeProgram.name}</Text>
            {activeProgram.description ? (
              <Text style={styles.activeDesc}>{activeProgram.description}</Text>
            ) : null}
            <Text style={styles.activeDuration}>
              {language === 'de'
                ? `Dauer: ${activeProgram.durationWeeks} Wochen`
                : `Duration: ${activeProgram.durationWeeks} Weeks`}
            </Text>
          </View>
        </View>

        {/* Week Selector Tabs */}
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 12,
          }}
        >
          <Text style={styles.calendarTitle}>
            {language === 'de' ? 'Wochenplan' : 'Weekly Schedule'}
          </Text>
          <Pressable
            accessibilityRole="button"
            style={{ minHeight: 44, justifyContent: 'center', paddingHorizontal: 12 }}
            onPress={() =>
              router.push({
                pathname: '/programs/builder',
                params: { id: activeProgram.id, week: String(selectedWeek) },
              })
            }
          >
            <Text style={{ color: theme.colors.primary }}>
              {language === 'de' ? 'Woche bearbeiten' : 'Edit week'}
            </Text>
          </Pressable>
        </View>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.weekTabsScroll}>
          {Array.from({ length: activeProgram.durationWeeks }, (_, i) => i + 1).map((w) => {
            const isSelected = w === selectedWeek;
            return (
              <Pressable
                key={w}
                accessibilityRole="tab"
                accessibilityState={{ selected: isSelected }}
                style={[
                  styles.weekTab,
                  { minHeight: 44, justifyContent: 'center' },
                  isSelected && styles.weekTabSelected,
                ]}
                onPress={() => setSelectedWeek(w)}
              >
                <Text style={[styles.weekTabText, isSelected && styles.weekTabTextSelected]}>
                  {language === 'de' ? `Woche ${w}` : `Week ${w}`}
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
                            {template?.name || (language === 'de' ? 'Unbekannte Vorlage' : 'Unknown Template')}
                          </Text>
                          <Pressable
                            style={styles.startWorkoutBtn}
                            onPress={() => handleStartTemplate(template, activeProgram.id)}
                          >
                            <Text style={styles.startWorkoutBtnText}>
                              {language === 'de' ? 'Starten' : 'Start'}
                            </Text>
                          </Pressable>
                        </View>
                      );
                    })
                  ) : (
                    <Text style={styles.restDayText}>
                      {language === 'de' ? 'Ruhetag' : 'Rest day'}
                    </Text>
                  )}
                </View>
              </View>
            );
          })}
        </View>

        <View style={styles.divider} />
        <Text style={styles.sectionHeaderTitle}>
          {language === 'de' ? 'PROGRAMMKATALOG' : 'PROGRAM CATALOG'}
        </Text>
      </View>
    );
  };

  const confirmDeactivate = async () => {
    const shouldDeactivate = await showConfirm({
      title: language === 'de' ? 'Programm deaktivieren' : 'Deactivate Program',
      message:
        language === 'de'
          ? 'Möchtest du das aktuelle Trainingsprogramm wirklich deaktivieren?'
          : 'Do you really want to deactivate the active training program?',
      confirmLabel: language === 'de' ? 'Deaktivieren' : 'Deactivate',
      cancelLabel: t('common.cancel'),
      destructive: true,
    });
    if (shouldDeactivate) {
      setActiveProgram(null);
    }
  };

  const confirmDelete = async (id: string, programName: string) => {
    const shouldDelete = await showConfirm({
      title: language === 'de' ? 'Programm löschen' : 'Delete Program',
      message:
        language === 'de'
          ? `Möchtest du "${programName}" wirklich löschen? Dies kann nicht rückgängig gemacht werden.`
          : `Do you really want to delete "${programName}"? This cannot be undone.`,
      confirmLabel: t('common.delete'),
      cancelLabel: t('common.cancel'),
      destructive: true,
    });
    if (shouldDelete) {
      deleteProgram(id);
    }
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
            const days =
              language === 'de'
                ? ['Montag', 'Dienstag', 'Mittwoch', 'Donnerstag', 'Freitag', 'Samstag', 'Sonntag']
                : ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
            const dayName = days[ww.dayOfWeek - 1] || (language === 'de' ? `Tag ${ww.dayOfWeek}` : `Day ${ww.dayOfWeek}`);
            return `  • ${dayName}: ${template?.name || (language === 'de' ? 'Training' : 'Workout')}`;
          })
          .filter(Boolean)
          .join('\n');
        return `${language === 'de' ? `Woche ${week}` : `Week ${week}`}:\n${workoutsText}`;
      })
      .filter(Boolean)
      .join('\n\n');

    const message = `📋 ${program.name}\n${program.description ? `${program.description}\n\n` : ''}${weeksText}\n\n— Shared from EVARO`;

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
        ref={sorter.scrollViewRef}
        onLayout={sorter.onLayout}
        onContentSizeChange={sorter.onContentSizeChange}
        contentContainerStyle={styles.list}
        scrollEnabled={sorter.scrollEnabled}
        onScroll={handleScroll}
        scrollEventThrottle={16}
      >
        <Button
          title={language === 'de' ? 'Programm erstellen' : 'Create program'}
          variant="secondary"
          onPress={() => setCreateModalVisible(true)}
          style={{ marginBottom: 16 }}
        />
        {renderHeader()}
        {programs.map((item) => {
          return (
            <Animated.View
              key={item.id}
              onLayout={(e) => {
                if (!sorter.activeDragId)
                  sorter.itemLayouts.current[item.id] = e.nativeEvent.layout;
              }}
              style={[
                styles.card,
                item.isActive && { borderColor: theme.colors.borderActive },
                sorter.getRowStyle(item.id),
              ]}
            >
              <View style={styles.cardTopRow}>
                <View
                  style={[
                    styles.dragHandle,
                    sorter.handleStyle,
                    { minWidth: 36, minHeight: 44, alignItems: 'center', justifyContent: 'center' },
                  ]}
                  {...sorter.getHandleProps(item.id)}
                >
                  <Ionicons name="reorder-two" size={24} color={theme.colors.muted} />
                </View>

                <Pressable
                  accessibilityRole="button"
                  style={styles.cardInfo}
                  onPress={() => router.push(`/programs/builder?id=${item.id}`)}
                >
                  <Text style={styles.cardTitle}>{item.name}</Text>
                  <Text style={styles.cardSubtitle}>
                    {item.durationWeeks} {language === 'de' ? 'Wochen' : 'Weeks'}
                  </Text>
                </Pressable>

                <View style={styles.cardRightActions}>
                  {item.isActive ? (
                    <Pressable
                      style={[
                        styles.smallActiveBtn,
                        {
                          backgroundColor: theme.colors.primarySubtle,
                          borderColor: theme.colors.primary,
                        },
                      ]}
                      onPress={(e) => {
                        e.stopPropagation();
                        confirmDeactivate();
                      }}
                    >
                      <Ionicons name="checkmark-circle" size={13} color={theme.colors.primary} />
                      <Text style={[styles.smallActiveBtnText, { color: theme.colors.primary }]}>
                        {language === 'de' ? 'AKTIV' : 'ACTIVE'}
                      </Text>
                    </Pressable>
                  ) : (
                    <Pressable
                      style={[
                        styles.smallActivateBtn,
                        { backgroundColor: theme.colors.surfaceElevated, borderColor: theme.colors.border },
                      ]}
                      onPress={(e) => {
                        e.stopPropagation();
                        setActiveProgram(item.id);
                      }}
                    >
                      <Text style={[styles.smallActivateBtnText, { color: theme.colors.text }]}>
                        {language === 'de' ? 'AKTIVIEREN' : 'ACTIVATE'}
                      </Text>
                    </Pressable>
                  )}

                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel={`Optionen für ${item.name}`}
                    style={styles.kebabBtn}
                    hitSlop={10}
                    onPress={(e) => {
                      e.stopPropagation();
                      setMenuProgramId(item.id);
                    }}
                  >
                    <Ionicons name="ellipsis-vertical" size={20} color={theme.colors.muted} />
                  </Pressable>
                </View>
              </View>
            </Animated.View>
          );
        })}
        {programs.length === 0 && (
          <Text style={styles.empty}>
            {language === 'de'
              ? 'Keine Programme gefunden. Klicke auf „Programm erstellen“, um anzufangen.'
              : 'No programs found. Click Create program to start.'}
          </Text>
        )}
      </ScrollView>

      <Modal
        visible={isCreateModalVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setCreateModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>
              {language === 'de' ? 'Programm erstellen' : 'Create Program'}
            </Text>

            <Text style={styles.label}>
              {language === 'de' ? 'Programmname' : 'Program Name'}
            </Text>
            <TextInput
              style={styles.input}
              value={name}
              onChangeText={setName}
              placeholder={language === 'de' ? 'z. B. Hypertrophie-Plan' : 'e.g. Hypertrophy Plan'}
              placeholderTextColor={theme.colors.muted}
            />

            <Text style={styles.label}>
              {language === 'de' ? 'Beschreibung (Optional)' : 'Description (Optional)'}
            </Text>
            <TextInput
              style={[styles.input, styles.textArea]}
              value={description}
              onChangeText={setDescription}
              placeholder={
                language === 'de'
                  ? 'z. B. 4-Tage-Split für Ober-/Unterkörper'
                  : 'e.g. 4-day split focusing on upper/lower body'
              }
              placeholderTextColor={theme.colors.muted}
              multiline
            />

            <Text style={styles.label}>
              {language === 'de' ? 'Dauer (Wochen)' : 'Duration (Weeks)'}
            </Text>
            <TextInput
              style={styles.input}
              value={durationWeeks}
              onChangeText={setDurationWeeks}
              keyboardType="numeric"
              inputAccessoryViewID="keyboardDoneAccessory"
              returnKeyType="done"
              placeholder="4"
              placeholderTextColor={theme.colors.muted}
            />

            <View style={styles.modalActions}>
              <Pressable
                style={[styles.modalBtn, styles.cancelBtn]}
                onPress={() => setCreateModalVisible(false)}
              >
                <Text style={styles.cancelBtnText}>{t('common.cancel')}</Text>
              </Pressable>
              <Pressable style={[styles.modalBtn, styles.createBtn]} onPress={handleCreateProgram}>
                <Text style={styles.createBtnText}>
                  {language === 'de' ? 'Erstellen' : 'Create'}
                </Text>
              </Pressable>
            </View>
          </View>
        </View>
        <KeyboardDoneAccessory />
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
              <Ionicons name="create-outline" size={20} color={theme.colors.text} />
              <Text style={styles.menuItemText}>{t('common.edit')}</Text>
            </Pressable>
            <Pressable
              style={[
                styles.menuItem,
                programs.findIndex((p) => p.id === menuProgram?.id) === 0 && { opacity: 0.4 },
              ]}
              disabled={programs.findIndex((p) => p.id === menuProgram?.id) === 0}
              onPress={() => {
                if (menuProgram) {
                  handleMoveProgram(menuProgram.id, 'up');
                  setMenuProgramId(null);
                }
              }}
            >
              <Ionicons name="arrow-up-outline" size={20} color={theme.colors.text} />
              <Text style={styles.menuItemText}>
                {language === 'de' ? 'Nach oben' : 'Move Up'}
              </Text>
            </Pressable>
            <Pressable
              style={[
                styles.menuItem,
                programs.findIndex((p) => p.id === menuProgram?.id) === programs.length - 1 && {
                  opacity: 0.4,
                },
              ]}
              disabled={programs.findIndex((p) => p.id === menuProgram?.id) === programs.length - 1}
              onPress={() => {
                if (menuProgram) {
                  handleMoveProgram(menuProgram.id, 'down');
                  setMenuProgramId(null);
                }
              }}
            >
              <Ionicons name="arrow-down-outline" size={20} color={theme.colors.text} />
              <Text style={styles.menuItemText}>
                {language === 'de' ? 'Nach unten' : 'Move Down'}
              </Text>
            </Pressable>
            <Pressable
              style={styles.menuItem}
              onPress={() => {
                const p = menuProgram;
                setMenuProgramId(null);
                if (p) handleShareProgram(p);
              }}
            >
              <Ionicons name="share-outline" size={20} color={theme.colors.text} />
              <Text style={styles.menuItemText}>{t('common.share')}</Text>
            </Pressable>
            <Pressable
              style={styles.menuItem}
              onPress={() => {
                const p = menuProgram;
                setMenuProgramId(null);
                if (p) confirmDelete(p.id, p.name);
              }}
            >
              <Ionicons name="trash-outline" size={20} color={theme.colors.error} />
              <Text style={[styles.menuItemText, { color: theme.colors.error }]}>{t('common.delete')}</Text>
            </Pressable>
          </View>
        </Pressable>
        <KeyboardDoneAccessory />
      </Modal>
    </View>
  );
}

const createStyles = (theme: Theme) =>
  StyleSheet.create({
    container: { flex: 1, backgroundColor: theme.colors.background },
    list: { padding: 16, paddingBottom: 140, width: '100%', maxWidth: 1040, alignSelf: 'center' },
    card: {
      backgroundColor: theme.colors.surface,
      borderRadius: theme.radius.lg,
      padding: 16,
      marginBottom: 12,
      borderWidth: 1,
      borderColor: theme.colors.border,
    },
    cardTitle: { fontSize: 18, fontFamily: 'SpaceGrotesk_700Bold', color: theme.colors.text },
    cardSubtitle: {
      fontSize: 14,
      fontFamily: 'Manrope_500Medium',
      color: theme.colors.muted,
      marginTop: 4,
    },
    cardInfo: { flex: 1 },
    cardTopRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
    activePill: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
      backgroundColor: theme.colors.primary,
      paddingHorizontal: 10,
      paddingVertical: 4,
      borderRadius: 9999,
    },
    activePillText: {
      color: theme.colors.background,
      fontFamily: 'SpaceGrotesk_700Bold',
      fontSize: 11,
      letterSpacing: 0.5,
    },
    kebabBtn: { minHeight: 44, padding: 4 },
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
      paddingVertical: 16,
      paddingHorizontal: 12,
      borderRadius: 12,
    },
    menuItemText: {
      color: theme.colors.text,
      fontFamily: 'SpaceGrotesk_600SemiBold',
      fontSize: 16,
    },
    cardActions: { flexDirection: 'row', gap: 8, alignItems: 'center' },
    btn: {
      backgroundColor: theme.colors.primary,
      paddingHorizontal: 12,
      paddingVertical: 8,
      borderRadius: 8,
    },
    editBtn: {
      backgroundColor: theme.colors.border,
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
      borderColor: theme.colors.error,
    },
    btnText: { color: theme.colors.background, fontFamily: 'SpaceGrotesk_700Bold' },
    editBtnText: { color: theme.colors.text, fontFamily: 'SpaceGrotesk_700Bold' },
    deleteBtnText: { color: theme.colors.error, fontFamily: 'SpaceGrotesk_700Bold' },
    activeLabel: {
      color: theme.colors.primary,
      fontFamily: 'SpaceGrotesk_700Bold',
      paddingVertical: 8,
      paddingHorizontal: 4,
    },
    empty: {
      textAlign: 'center',
      marginTop: 40,
      color: theme.colors.muted,
      fontFamily: 'Manrope_500Medium',
      fontSize: 16,
    },
    fab: {
      position: 'absolute',
      bottom: 24,
      right: 24,
      backgroundColor: theme.colors.primary,
      width: 56,
      height: 56,
      borderRadius: 28,
      justifyContent: 'center',
      alignItems: 'center',
      elevation: 4,
    },
    fabText: {
      color: theme.colors.background,
      fontSize: 32,
      fontFamily: 'SpaceGrotesk_700Bold',
      lineHeight: 36,
    },
    modalOverlay: {
      flex: 1,
      backgroundColor: theme.colors.overlay,
      justifyContent: 'center',
      padding: 24,
    },
    modalCard: {
      backgroundColor: theme.colors.surface,
      borderRadius: theme.radius.lg,
      padding: 24,
      borderWidth: 1,
      borderColor: theme.colors.border,
    },
    modalTitle: {
      fontSize: 20,
      fontFamily: 'SpaceGrotesk_700Bold',
      color: theme.colors.text,
      marginBottom: 20,
    },
    label: {
      fontSize: 14,
      fontFamily: 'SpaceGrotesk_600SemiBold',
      color: theme.colors.muted,
      marginBottom: 8,
    },
    input: {
      minHeight: 44,
      backgroundColor: theme.colors.background,
      borderWidth: 1,
      borderColor: theme.colors.border,
      borderRadius: 12,
      paddingHorizontal: 12,
      paddingVertical: 10,
      fontSize: 16,
      fontFamily: 'Manrope_500Medium',
      color: theme.colors.text,
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
      backgroundColor: theme.colors.border,
    },
    createBtn: {
      backgroundColor: theme.colors.primary,
    },
    cancelBtnText: {
      color: theme.colors.muted,
      fontFamily: 'SpaceGrotesk_700Bold',
      fontSize: 16,
    },
    createBtnText: {
      color: theme.colors.background,
      fontFamily: 'SpaceGrotesk_700Bold',
      fontSize: 16,
    },
    deactivateBtnInline: {
      backgroundColor: 'rgba(239, 68, 68, 0.1)',
      borderWidth: 1,
      borderColor: theme.colors.error,
      paddingHorizontal: 8,
      paddingVertical: 4,
      borderRadius: 6,
    },
    deactivateBtnTextInline: {
      color: theme.colors.error,
      fontSize: 12,
      fontFamily: 'SpaceGrotesk_700Bold',
    },
    activeProgramSection: {
      backgroundColor: theme.colors.surface,
      borderRadius: 16,
      padding: 16,
      marginBottom: 20,
      borderWidth: 1,
      borderColor: theme.colors.border,
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
      color: theme.colors.primary,
      backgroundColor: theme.colors.border,
      alignSelf: 'flex-start',
      paddingHorizontal: 8,
      paddingVertical: 3,
      borderRadius: 6,
      marginBottom: 6,
    },
    activeTitle: {
      fontSize: 20,
      fontFamily: 'SpaceGrotesk_700Bold',
      color: theme.colors.text,
      marginBottom: 4,
    },
    activeDesc: {
      fontSize: 14,
      fontFamily: 'Manrope_500Medium',
      color: theme.colors.muted,
      marginBottom: 8,
      lineHeight: 18,
    },
    activeDuration: {
      fontSize: 13,
      fontFamily: 'SpaceGrotesk_600SemiBold',
      color: theme.colors.muted,
    },
    deactivateBtn: {
      minHeight: 44,
      justifyContent: 'center',
      backgroundColor: 'rgba(239, 68, 68, 0.1)',
      borderWidth: 1,
      borderColor: theme.colors.error,
      paddingHorizontal: 12,
      paddingVertical: 6,
      borderRadius: 8,
    },
    deactivateBtnText: {
      color: theme.colors.error,
      fontFamily: 'SpaceGrotesk_700Bold',
      fontSize: 13,
    },
    calendarTitle: {
      flex: 1,
      fontSize: 16,
      fontFamily: 'SpaceGrotesk_700Bold',
      color: theme.colors.primary,
      marginBottom: 10,
      marginTop: 8,
      textTransform: 'uppercase',
    },
    weekTabsScroll: {
      marginBottom: 16,
    },
    weekTab: {
      minHeight: 44,
      paddingHorizontal: 16,
      paddingVertical: 8,
      borderRadius: 20,
      backgroundColor: theme.colors.border,
      marginRight: 8,
      borderWidth: 1,
      borderColor: theme.colors.border,
    },
    weekTabSelected: {
      backgroundColor: theme.colors.primary,
      borderColor: theme.colors.primary,
    },
    weekTabText: {
      color: theme.colors.muted,
      fontFamily: 'SpaceGrotesk_600SemiBold',
      fontSize: 14,
    },
    weekTabTextSelected: {
      color: theme.colors.background,
      fontFamily: 'SpaceGrotesk_700Bold',
    },
    daysList: {
      gap: 8,
    },
    dayRow: { paddingVertical: 12, borderBottomWidth: 1, borderColor: theme.colors.border },
    dayInfo: {
      width: '100%',
    },
    dayLabel: {
      fontSize: 14,
      fontFamily: 'SpaceGrotesk_700Bold',
      color: theme.colors.text,
      marginBottom: 6,
      textTransform: 'uppercase',
    },
    scheduledWorkout: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      backgroundColor: theme.colors.surface,
      borderRadius: 8,
      padding: 10,
      borderWidth: 1,
      borderColor: theme.colors.border,
      marginTop: 4,
    },
    workoutTemplateName: {
      fontSize: 14,
      fontFamily: 'SpaceGrotesk_600SemiBold',
      color: theme.colors.text,
      flex: 1,
    },
    startWorkoutBtn: {
      minHeight: 44,
      justifyContent: 'center',
      backgroundColor: theme.colors.primary,
      paddingHorizontal: 12,
      paddingVertical: 6,
      borderRadius: 6,
    },
    startWorkoutBtnText: {
      color: theme.colors.background,
      fontFamily: 'SpaceGrotesk_700Bold',
      fontSize: 12,
    },
    restDayText: {
      fontSize: 13,
      fontFamily: 'Manrope_500Medium',
      color: theme.colors.muted,
      fontStyle: 'italic',
      marginTop: 2,
    },
    divider: {
      height: 1,
      backgroundColor: theme.colors.border,
      marginVertical: 20,
    },
    sectionHeaderTitle: {
      fontSize: 18,
      fontFamily: 'SpaceGrotesk_700Bold',
      color: theme.colors.primary,
      marginBottom: 12,
      textTransform: 'uppercase',
    },
    cardRightActions: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
    },
    cardActionsContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
    },
    smallActiveBtn: {
      minHeight: 36,
      flexDirection: 'row',
      alignItems: 'center',
      gap: 5,
      paddingHorizontal: 10,
      paddingVertical: 6,
      borderRadius: 10,
      borderWidth: 1,
    },
    smallActiveBtnText: {
      fontFamily: 'SpaceGrotesk_700Bold',
      fontSize: 11,
      letterSpacing: 0.5,
    },
    smallActivateBtn: {
      minHeight: 36,
      paddingHorizontal: 12,
      paddingVertical: 6,
      borderRadius: 10,
      borderWidth: 1,
      justifyContent: 'center',
      alignItems: 'center',
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
