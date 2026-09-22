import { Theme, useThemeStyles, useTheme, withAlpha, useDialog } from '@fitness-tracker/ui';
import { KeyboardDoneAccessory } from '../../src/components/workout/KeyboardDoneAccessory';
import { templateExercisesFromSession } from '@fitness-tracker/domain';
import { useMeasuredReorder } from '../../src/hooks/useMeasuredReorder';
import { useReducedMotion } from 'react-native-reanimated';
import { hapticFeedback } from '../../src/utils/haptics';
import { reorderProgramWorkout } from '../../src/utils/programReorderGeometry';
import { scopedAlert as Alert } from '../../src/utils/scopedAlert';
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  ScrollView,
  Pressable,
  Modal,
  Animated,
} from 'react-native';
import { useLocalSearchParams, useRouter, Stack } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as Crypto from 'expo-crypto';
import { useProgramStore, isProgramEditable } from '../../src/stores/programStore';
import { useWorkoutStore } from '../../src/stores/workoutStore';
import { useHistoryStore } from '../../src/stores/historyStore';
import { usePaywallStore } from '../../src/stores/paywallStore';
import { useI18n } from '../../src/i18n';
import {
  WorkoutTemplate,
  TemplateExercise,
  SessionExercise,
  WorkoutSession,
  ProgramWorkout,
  Program,
} from '@fitness-tracker/domain';

export default function ProgramBuilderScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const theme = useTheme();
  const styles = useThemeStyles(createStyles);
  const { showConfirm } = useDialog();
  const { language } = useI18n();
  const { id, week } = useLocalSearchParams<{ id?: string; week?: string }>();
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
  const [selectedWeek, setSelectedWeek] = useState(() => {
    const requested = Number(week);
    return Number.isInteger(requested) &&
      requested > 0 &&
      requested <= (program?.durationWeeks ?? 1)
      ? requested
      : 1;
  });
  const weekTabsRef = React.useRef<ScrollView>(null);
  const [activeDay, setActiveDay] = useState<number | null>(null);
  const [modalMode, setModalMode] = useState<'options' | 'templates' | null>(null);
  const [pickerTab, setPickerTab] = useState<'templates' | 'history'>('templates');
  const [rescheduleWorkout, setRescheduleWorkout] = useState<ProgramWorkout | null>(null);
  const [hoveredDay, setHoveredDay] = useState<number | null>(null);
  const reducedMotion = useReducedMotion();

  const dayLayouts = React.useRef<Record<number, { y: number; height: number }>>({});
  const rowLayouts = React.useRef<Record<string, { y: number; height: number }>>({});

  const sorter = useMeasuredReorder(
    (activeProgram?.workouts ?? [])
      .filter((w) => w.week === selectedWeek)
      .sort((a, b) => a.dayOfWeek - b.dayOfWeek || a.order - b.order),
    () => {},
    {
      onHoverY: (dropY) => {
        const days = Object.entries(dayLayouts.current);
        const target =
          days.find(([, layout]) => dropY >= layout.y && dropY <= layout.y + layout.height) ??
          days.sort(
            ([, a], [, b]) =>
              Math.abs(dropY - a.y - a.height / 2) - Math.abs(dropY - b.y - b.height / 2),
          )[0];
        if (target) {
          const targetDay = Number(target[0]);
          setHoveredDay((prev) => (prev !== targetDay ? targetDay : prev));
        }
      },
      onDrop: (workout, dropY) => {
        setHoveredDay(null);
        if (!activeProgram) return;
        const days = Object.entries(dayLayouts.current);
        const target =
          days.find(([, layout]) => dropY >= layout.y && dropY <= layout.y + layout.height) ??
          days.sort(
            ([, a], [, b]) =>
              Math.abs(dropY - a.y - a.height / 2) - Math.abs(dropY - b.y - b.height / 2),
          )[0];
        if (!target) return;
        const targetDay = Number(target[0]);
        const other = activeProgram.workouts.filter((w) => w.id !== workout.id);
        const destination = other
          .filter((w) => w.week === selectedWeek && w.dayOfWeek === targetDay)
          .sort((a, b) => a.order - b.order);
        const insertIndex = destination.filter((w) => {
          const layout = sorter.itemLayouts.current[w.id];
          return layout && dropY > layout.y + layout.height / 2;
        }).length;

        const updatedWorkouts = reorderProgramWorkout({
          workouts: activeProgram.workouts,
          workoutId: workout.id,
          targetWeek: selectedWeek,
          targetDay,
          targetIndex: insertIndex,
        });

        if (localProgram) {
          setLocalProgram({ ...localProgram, workouts: updatedWorkouts });
        } else if (program) {
          setLocalProgram({ ...program, workouts: updatedWorkouts });
        }
        void hapticFeedback.notification('success');
      },
    },
  );

  useEffect(() => {
    if (!sorter.activeDragId && hoveredDay !== null) {
      setHoveredDay(null);
    }
  }, [sorter.activeDragId, hoveredDay]);

  const mapToTemplateExercises = (exercises: SessionExercise[]): TemplateExercise[] =>
    templateExercisesFromSession(exercises, Crypto.randomUUID);

  const handleStartTemplate = async (template: WorkoutTemplate | undefined, programId: string) => {
    if (!template) return;
    const start = () => {
      startWorkoutFromTemplate(template, programId);
      router.navigate('/workout/session');
    };

    if (activeWorkoutStatus === 'active' || activeWorkoutStatus === 'paused') {
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

  const handleSave = () => {
    if (localProgram && program) {
      if (
        !Number.isInteger(localProgram.durationWeeks) ||
        localProgram.durationWeeks < 1 ||
        localProgram.durationWeeks > 104
      ) {
        Alert.alert(
          language === 'de' ? 'Programmdauer prüfen' : 'Check Program Duration',
          language === 'de' ? 'Bitte 1 bis 104 Wochen eintragen.' : 'Please enter 1 to 104 weeks.',
        );
        return;
      }
      if (localProgram.workouts.some((workout) => workout.week > localProgram.durationWeeks)) {
        Alert.alert(
          language === 'de' ? 'Wochen noch belegt' : 'Weeks Still Occupied',
          language === 'de'
            ? 'In späteren Wochen sind noch Trainings geplant. Verschiebe oder entferne diese zuerst, bevor du das Programm verkürzt.'
            : 'There are still workouts scheduled in later weeks. Move or remove them first before shortening the program.',
        );
        return;
      }
      if (!isProgramEditable()) {
        usePaywallStore.getState().openPaywall('pro', 'program');
        return;
      }
      updateProgram(program.id, localProgram);
      Alert.alert(
        language === 'de' ? 'Erfolg' : 'Success',
        language === 'de' ? 'Plan erfolgreich gespeichert!' : 'Plan saved successfully!',
      );
      router.back();
    }
  };

  const handleCancel = async () => {
    if (localProgram && program) {
      const isChanged =
        localProgram.name !== program.name ||
        localProgram.description !== program.description ||
        localProgram.durationWeeks !== program.durationWeeks ||
        JSON.stringify(localProgram.workouts) !== JSON.stringify(program.workouts);

      if (isChanged) {
        const shouldDiscard = await showConfirm({
          title: language === 'de' ? 'Ungespeicherte Änderungen' : 'Unsaved Changes',
          message:
            language === 'de'
              ? 'Möchtest du deine ungespeicherten Änderungen wirklich verwerfen?'
              : 'Do you really want to discard your unsaved changes?',
          confirmLabel: language === 'de' ? 'Verwerfen' : 'Discard',
          cancelLabel: language === 'de' ? 'Weiter bearbeiten' : 'Keep Editing',
          destructive: true,
        });
        if (shouldDiscard) {
          router.back();
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
    try {
      createTemplate({
        id: templateId,
        name: `${session.name} (Copy)`,
        exercises: mapToTemplateExercises(session.exercises),
      });
      handleSelectTemplate(templateId);
    } catch (e) {
      if (e instanceof Error && e.message === 'TEMPLATE_LIMIT_REACHED') {
        usePaywallStore.getState().openPaywall('pro', 'template_limit');
      }
    }
  };

  if (!activeProgram) {
    return (
      <View style={styles.centered}>
        <Text style={{ color: theme.colors.text }}>
          {language === 'de' ? 'Programm nicht gefunden.' : 'Program not found.'}
        </Text>
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

  const handleDeleteWeek = async (weekToDelete: number) => {
    if (!activeProgram || activeProgram.durationWeeks <= 1) {
      Alert.alert(
        language === 'de' ? 'Hinweis' : 'Notice',
        language === 'de'
          ? 'Ein Programm muss mindestens eine Woche enthalten.'
          : 'A program must contain at least one week.',
      );
      return;
    }

    const workoutsInWeek = activeProgram.workouts.filter((w) => w.week === weekToDelete);
    const executeDelete = () => {
      const remainingWorkouts = activeProgram.workouts
        .filter((w) => w.week !== weekToDelete)
        .map((w) => (w.week > weekToDelete ? { ...w, week: w.week - 1 } : w));

      const nextDuration = activeProgram.durationWeeks - 1;
      const nextSelected =
        selectedWeek === weekToDelete
          ? Math.max(1, Math.min(weekToDelete, nextDuration))
          : selectedWeek > weekToDelete
          ? selectedWeek - 1
          : selectedWeek;

      setLocalProgram({
        ...activeProgram,
        durationWeeks: nextDuration,
        workouts: remainingWorkouts,
      });
      setSelectedWeek(nextSelected);
    };

    if (workoutsInWeek.length > 0) {
      const shouldDelete = await showConfirm({
        title: language === 'de' ? `Woche ${weekToDelete} löschen` : `Delete Week ${weekToDelete}`,
        message:
          language === 'de'
            ? `Möchtest du Woche ${weekToDelete} und alle darin enthaltenen ${workoutsInWeek.length} Einheiten wirklich entfernen?`
            : `Do you really want to remove Week ${weekToDelete} and all ${workoutsInWeek.length} workouts in it?`,
        confirmLabel: language === 'de' ? 'Löschen' : 'Delete',
        cancelLabel: language === 'de' ? 'Abbrechen' : 'Cancel',
        destructive: true,
      });
      if (shouldDelete) {
        executeDelete();
      }
    } else {
      executeDelete();
    }
  };

  const handleMoveWorkoutToDay = (workout: ProgramWorkout, targetDay: number) => {
    if (!activeProgram) return;

    const otherWorkouts = activeProgram.workouts.filter((w: ProgramWorkout) => w.id !== workout.id);

    const targetDayWorkouts = otherWorkouts
      .filter((w: ProgramWorkout) => w.week === selectedWeek && w.dayOfWeek === targetDay)
      .sort((a: ProgramWorkout, b: ProgramWorkout) => a.order - b.order);

    const newWorkout = {
      ...workout,
      dayOfWeek: targetDay,
      order: targetDayWorkouts.length,
    };

    targetDayWorkouts.push(newWorkout);

    handleChange({
      workouts: [
        ...otherWorkouts.filter(
          (w: ProgramWorkout) => !(w.week === selectedWeek && w.dayOfWeek === targetDay),
        ),
        ...targetDayWorkouts.map((w, idx) => ({ ...w, order: idx })),
      ],
    });
  };

  const getDayName = (day: number) => {
    const daysDe = ['Montag', 'Dienstag', 'Mittwoch', 'Donnerstag', 'Freitag', 'Samstag', 'Sonntag'];
    const daysEn = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
    const list = language === 'de' ? daysDe : daysEn;
    return list[day - 1] ?? (language === 'de' ? `Tag ${day}` : `Day ${day}`);
  };

  const removeWorkout = (workoutId: string) => {
    handleChange({
      workouts: activeProgram.workouts.filter((w: ProgramWorkout) => w.id !== workoutId),
    });
  };

  return (
    <View style={{ flex: 1, backgroundColor: theme.colors.background }}>
      <Stack.Screen options={{ headerShown: false }} />
      <View
        style={[
          styles.topHeader,
          {
            paddingTop: Math.max(insets.top, 12),
            backgroundColor: theme.colors.background,
            borderBottomColor: theme.colors.border,
          },
        ]}
      >
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={language === 'de' ? 'Abbrechen' : 'Cancel'}
          onPress={handleCancel}
          hitSlop={8}
          style={[
            styles.headerCancelBtn,
            {
              backgroundColor: theme.colors.surfaceElevated,
              borderColor: theme.colors.border,
            },
          ]}
        >
          <Text
            style={[
              styles.headerCancelText,
              {
                color: theme.colors.text,
              },
            ]}
          >
            {language === 'de' ? 'Abbrechen' : 'Cancel'}
          </Text>
        </Pressable>

        <Text
          numberOfLines={1}
          style={[
            styles.headerTitleText,
            {
              color: theme.colors.text,
            },
          ]}
        >
          {language === 'de' ? 'Programm bearbeiten' : 'Edit Program'}
        </Text>

        <Pressable
          accessibilityRole="button"
          accessibilityLabel={language === 'de' ? 'Speichern' : 'Save'}
          onPress={handleSave}
          hitSlop={8}
          style={[
            styles.headerSaveBtn,
            {
              backgroundColor: theme.colors.primary,
            },
          ]}
        >
          <Text
            style={[
              styles.headerSaveText,
              {
                color: theme.colors.background,
              },
            ]}
          >
            {language === 'de' ? 'Speichern' : 'Save'}
          </Text>
        </Pressable>
      </View>
      <ScrollView
        contentContainerStyle={styles.content}
        scrollEnabled={sorter.scrollEnabled}
        ref={sorter.scrollViewRef}
        onLayout={sorter.onLayout}
        onContentSizeChange={sorter.onContentSizeChange}
        onScroll={sorter.onScroll}
        scrollEventThrottle={16}
      >
        <Text style={styles.label}>{language === 'de' ? 'Programm-Name' : 'Program Name'}</Text>
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
          placeholder={language === 'de' ? 'z. B. 5/3/1 Boring But Big' : 'e.g. 5/3/1 Boring But Big'}
          placeholderTextColor={theme.colors.muted}
        />

        <Text style={styles.label}>{language === 'de' ? 'Beschreibung' : 'Description'}</Text>
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
          placeholder={language === 'de' ? 'Optionale Beschreibung' : 'Optional description'}
          placeholderTextColor={theme.colors.muted}
          multiline
        />

        <Text style={styles.label}>{language === 'de' ? 'Dauer (Wochen)' : 'Duration (Weeks)'}</Text>
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
          inputAccessoryViewID="keyboardDoneAccessory"
          returnKeyType="done"
          placeholderTextColor={theme.colors.muted}
        />

        <Text style={styles.sectionTitle}>{language === 'de' ? 'Wochenplan' : 'Weekly Schedule'}</Text>

        {/* Week Selector Tabs */}
        <View style={{ flexDirection: 'row', gap: 10, marginVertical: 12, flexWrap: 'wrap' }}>
          <Pressable
            accessibilityRole="button"
            disabled={activeProgram.durationWeeks >= 104}
            onPress={() => {
              const next = activeProgram.durationWeeks + 1;
              if (next > 104) return;
              setLocalProgram({ ...activeProgram, durationWeeks: next });
              setSelectedWeek(next);
            }}
            style={{
              minHeight: 38,
              paddingHorizontal: 14,
              paddingVertical: 8,
              borderRadius: 10,
              backgroundColor: theme.colors.surfaceElevated,
              borderWidth: 1,
              borderColor: theme.colors.border,
              flexDirection: 'row',
              alignItems: 'center',
              gap: 6,
            }}
          >
            <Ionicons name="add" size={16} color={theme.colors.primary} />
            <Text
              style={{
                color: theme.colors.text,
                fontFamily: 'SpaceGrotesk_600SemiBold',
                fontSize: 13,
              }}
            >
              {language === 'de' ? 'Leere Woche' : 'Empty Week'}
            </Text>
          </Pressable>
          <Pressable
            accessibilityRole="button"
            disabled={activeProgram.durationWeeks >= 104}
            onPress={() => {
              const next = activeProgram.durationWeeks + 1;
              if (next > 104) return;
              const copies = activeProgram.workouts
                .filter((workout) => workout.week === selectedWeek)
                .map((workout) => ({ ...workout, id: Crypto.randomUUID(), week: next }));
              setLocalProgram({
                ...activeProgram,
                durationWeeks: next,
                workouts: [...activeProgram.workouts, ...copies],
              });
              setSelectedWeek(next);
            }}
            style={{
              minHeight: 38,
              paddingHorizontal: 14,
              paddingVertical: 8,
              borderRadius: 10,
              backgroundColor: theme.colors.surfaceElevated,
              borderWidth: 1,
              borderColor: theme.colors.border,
              flexDirection: 'row',
              alignItems: 'center',
              gap: 6,
            }}
          >
            <Ionicons name="copy-outline" size={14} color={theme.colors.primary} />
            <Text
              style={{
                color: theme.colors.text,
                fontFamily: 'SpaceGrotesk_600SemiBold',
                fontSize: 13,
              }}
            >
              {language === 'de' ? `Woche ${selectedWeek} duplizieren` : `Duplicate Week ${selectedWeek}`}
            </Text>
          </Pressable>
          {activeProgram.durationWeeks > 1 && (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={language === 'de' ? `Woche ${selectedWeek} löschen` : `Delete Week ${selectedWeek}`}
              onPress={() => handleDeleteWeek(selectedWeek)}
              style={{
                minHeight: 38,
                paddingHorizontal: 14,
                paddingVertical: 8,
                borderRadius: 10,
                backgroundColor: withAlpha(theme.colors.error, 0.1),
                borderWidth: 1,
                borderColor: withAlpha(theme.colors.error, 0.35),
                flexDirection: 'row',
                alignItems: 'center',
                gap: 6,
              }}
            >
              <Ionicons name="trash-outline" size={14} color={theme.colors.error} />
              <Text
                style={{
                  color: theme.colors.error,
                  fontFamily: 'SpaceGrotesk_600SemiBold',
                  fontSize: 13,
                }}
              >
                {language === 'de' ? `Woche ${selectedWeek} löschen` : `Delete Week ${selectedWeek}`}
              </Text>
            </Pressable>
          )}
        </View>
        <Text style={{ color: theme.colors.muted, fontSize: 11, marginBottom: 8 }}>
          {language === 'de'
            ? 'Neue Wochen werden angehängt. Änderungen werden mit Speichern gesichert.'
            : 'New weeks are appended. Save changes before leaving.'}
        </Text>
        <ScrollView
          ref={weekTabsRef}
          onContentSizeChange={() => {
            if (selectedWeek === activeProgram.durationWeeks)
              weekTabsRef.current?.scrollToEnd({ animated: true });
          }}
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.weekTabsScroll}
        >
          {Array.from({ length: activeProgram.durationWeeks }, (_, i) => i + 1).map((w) => {
            const isSelected = w === selectedWeek;
            return (
              <Pressable
                key={w}
                accessibilityRole="tab"
                accessibilityState={{ selected: isSelected }}
                style={[
                  styles.weekTab,
                  {
                    backgroundColor: isSelected ? theme.colors.primary : theme.colors.surface,
                    borderColor: isSelected ? theme.colors.primary : theme.colors.border,
                    flexDirection: 'row',
                    alignItems: 'center',
                    gap: 6,
                  },
                ]}
                onPress={() => setSelectedWeek(w)}
              >
                <Text
                  style={[
                    styles.weekTabText,
                    {
                      color: isSelected ? theme.colors.background : theme.colors.muted,
                      fontFamily: isSelected ? 'SpaceGrotesk_700Bold' : 'SpaceGrotesk_600SemiBold',
                    },
                  ]}
                >
                  {language === 'de' ? `Woche ${w}` : `Week ${w}`}
                </Text>
                {isSelected && activeProgram.durationWeeks > 1 && (
                  <Pressable
                    hitSlop={8}
                    accessibilityLabel={language === 'de' ? `Woche ${w} löschen` : `Delete Week ${w}`}
                    onPress={(e) => {
                      e.stopPropagation();
                      handleDeleteWeek(w);
                    }}
                    style={{
                      padding: 2,
                      borderRadius: 4,
                      backgroundColor: withAlpha(theme.colors.background, 0.25),
                    }}
                  >
                    <Ionicons name="close" size={12} color={theme.colors.background} />
                  </Pressable>
                )}
              </Pressable>
            );
          })}
        </ScrollView>

        {[1, 2, 3, 4, 5, 6, 7].map((day) => {
          const dayWorkouts = activeProgram.workouts.filter(
            (w: ProgramWorkout) => w.week === selectedWeek && w.dayOfWeek === day,
          );
          const draggingWorkout = sorter.activeDragId
            ? activeProgram.workouts.find((w: ProgramWorkout) => w.id === sorter.activeDragId)
            : null;
          const isDraggingDay = draggingWorkout?.dayOfWeek === day;
          const isHoveredDay = sorter.activeDragId !== null && hoveredDay === day;
          return (
            <View
              key={day}
              style={[
                styles.dayContainer,
                { backgroundColor: theme.colors.surface, borderColor: theme.colors.border },
                isDraggingDay && { zIndex: 9999, elevation: 10 },
                isHoveredDay && styles.dayContainerHovered,
              ]}
              onLayout={(e) => {
                if (!sorter.activeDragId) {
                  const { y, height } = e.nativeEvent.layout;
                  dayLayouts.current[day] = { y, height };
                  dayWorkouts.forEach((w) => {
                    const row = rowLayouts.current[w.id];
                    if (row)
                      sorter.itemLayouts.current[w.id] = { y: y + row.y, height: row.height };
                  });
                }
              }}
            >
              <View style={styles.dayHeaderRow}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                  <Text style={styles.dayName}>{getDayName(day)}</Text>
                  {isHoveredDay && (
                    <View style={styles.dropTargetBadge}>
                      <Ionicons name="arrow-down-circle" size={13} color={theme.colors.primary} />
                      <Text style={styles.dropTargetBadgeText}>
                        {language === 'de' ? 'Hier ablegen' : 'Drop here'}
                      </Text>
                    </View>
                  )}
                </View>
                <View
                  style={[
                    styles.dayStatusBadge,
                    {
                      backgroundColor:
                        dayWorkouts.length > 0
                          ? withAlpha(theme.colors.primary, 0.12)
                          : theme.colors.surfaceElevated,
                    },
                  ]}
                >
                  <Text
                    style={[
                      styles.dayStatusText,
                      {
                        color: dayWorkouts.length > 0 ? theme.colors.primary : theme.colors.muted,
                      },
                    ]}
                  >
                    {dayWorkouts.length > 0
                      ? `${dayWorkouts.length} ${dayWorkouts.length === 1 ? 'Workout' : 'Workouts'}`
                      : language === 'de'
                      ? 'Ruhetag'
                      : 'Rest Day'}
                  </Text>
                </View>
              </View>

              {dayWorkouts.map((w: ProgramWorkout) => {
                const template = templates.find((t) => t.id === w.templateId);
                const exerciseCount = template?.exercises.length ?? 0;
                const isCardDragging = sorter.activeDragId === w.id;

                return (
                  <Animated.View
                    key={w.id}
                    onLayout={(e) => {
                      if (!sorter.activeDragId) {
                        rowLayouts.current[w.id] = e.nativeEvent.layout;
                        sorter.itemLayouts.current[w.id] = {
                          y: (dayLayouts.current[day]?.y ?? 0) + e.nativeEvent.layout.y,
                          height: e.nativeEvent.layout.height,
                        };
                      }
                    }}
                    style={[
                      styles.workoutRow,
                      {
                        backgroundColor: theme.colors.background,
                        borderColor: theme.colors.border,
                      },
                      sorter.getRowStyle(w.id),
                      isCardDragging && styles.cardActiveDrag,
                      isCardDragging && !reducedMotion && {
                        transform: [
                          ...sorter.getRowStyle(w.id).transform,
                          { scale: 1.03 },
                        ],
                      },
                    ]}
                  >
                    <View style={styles.workoutTopRow}>
                      <View
                        style={[
                          styles.dragHandle,
                          sorter.handleStyle,
                          {
                            minWidth: 32,
                            minHeight: 36,
                            alignItems: 'center',
                            justifyContent: 'center',
                          },
                        ]}
                        {...sorter.getHandleProps(w.id)}
                      >
                        <Ionicons name="reorder-two" size={22} color={theme.colors.muted} />
                      </View>
                      <View style={{ flex: 1, minWidth: 0 }}>
                        <Text
                          numberOfLines={1}
                          style={[styles.workoutName, { color: theme.colors.text }]}
                        >
                          {template?.name ||
                            (language === 'de' ? 'Unbekanntes Workout' : 'Unknown Workout')}
                        </Text>
                        <Text style={{ fontSize: 11, color: theme.colors.muted, marginTop: 1 }}>
                          {language === 'de'
                            ? `${exerciseCount} ${exerciseCount === 1 ? 'Übung' : 'Übungen'}`
                            : `${exerciseCount} ${exerciseCount === 1 ? 'Exercise' : 'Exercises'}`}
                        </Text>
                      </View>
                    </View>

                    <View style={styles.workoutActionsRow}>
                      <Pressable
                        style={[
                          styles.actionPill,
                          {
                            backgroundColor: theme.colors.primarySubtle,
                            borderColor: theme.colors.primary,
                          },
                        ]}
                        onPress={() => handleStartTemplate(template, activeProgram.id)}
                        hitSlop={6}
                      >
                        <Ionicons name="play" size={12} color={theme.colors.primary} />
                        <Text
                          style={[
                            styles.actionPillText,
                            {
                              color: theme.colors.primary,
                              fontFamily: 'SpaceGrotesk_700Bold',
                            },
                          ]}
                        >
                          Start
                        </Text>
                      </Pressable>

                      <Pressable
                        style={[
                          styles.actionPill,
                          {
                            backgroundColor: theme.colors.surfaceElevated,
                            borderColor: theme.colors.border,
                          },
                        ]}
                        onPress={() =>
                          router.push(
                            `/programs/template-builder?programId=${activeProgram.id}&templateId=${template?.id}&dayOfWeek=${day}&week=${selectedWeek}`,
                          )
                        }
                        hitSlop={6}
                      >
                        <Ionicons name="create-outline" size={13} color={theme.colors.text} />
                        <Text style={[styles.actionPillText, { color: theme.colors.text }]}>
                          {language === 'de' ? 'Bearbeiten' : 'Edit'}
                        </Text>
                      </Pressable>

                      <Pressable
                        style={[
                          styles.actionPill,
                          {
                            backgroundColor: theme.colors.surfaceElevated,
                            borderColor: theme.colors.border,
                          },
                        ]}
                        onPress={() => setRescheduleWorkout(w)}
                        hitSlop={6}
                      >
                        <Ionicons
                          name="swap-horizontal-outline"
                          size={13}
                          color={theme.colors.muted}
                        />
                        <Text style={[styles.actionPillText, { color: theme.colors.muted }]}>
                          {language === 'de' ? 'Verschieben' : 'Move'}
                        </Text>
                      </Pressable>

                      <Pressable
                        style={styles.deletePill}
                        onPress={() => removeWorkout(w.id)}
                        hitSlop={6}
                        accessibilityLabel={
                          language === 'de' ? 'Workout entfernen' : 'Remove Workout'
                        }
                      >
                        <Ionicons name="trash-outline" size={14} color={theme.colors.error} />
                      </Pressable>
                    </View>
                  </Animated.View>
                );
              })}

              <Pressable
                style={[
                  styles.addWorkoutBtn,
                  {
                    backgroundColor:
                      dayWorkouts.length === 0 ? theme.colors.surfaceElevated : 'transparent',
                    borderColor: theme.colors.border,
                    flexDirection: 'row',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: 6,
                  },
                ]}
                onPress={() => {
                  setActiveDay(day);
                  setModalMode('options');
                }}
              >
                <Ionicons name="add" size={16} color={theme.colors.primary} />
                <Text style={[styles.addWorkoutText, { color: theme.colors.text }]}>
                  {dayWorkouts.length === 0
                    ? language === 'de'
                      ? 'Workout hinzufügen'
                      : 'Add Workout'
                    : language === 'de'
                    ? 'Weiteres Workout hinzufügen'
                    : 'Add Another Workout'}
                </Text>
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
                  {language === 'de' ? 'Workout hinzufügen' : 'Add Workout'}
                </Text>
                <Text style={[styles.modalSub, { color: theme.colors.muted }]}>
                  {language === 'de'
                    ? `Wähle, wie du ein Workout für ${activeDay !== null ? getDayName(activeDay) : ''} hinzufügen möchtest:`
                    : `Select how you want to add a workout for ${activeDay !== null ? getDayName(activeDay) : ''}:`}
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
                    {language === 'de' ? 'Eigenes Workout erstellen' : 'Create Custom Workout'}
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
                    {language === 'de'
                      ? 'Vorlage / Verlauf verwenden'
                      : 'Use Existing Template / History'}
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
                  {language === 'de' ? 'Workout auswählen' : 'Choose Workout'}
                </Text>
                <Text style={[styles.modalSub, { color: theme.colors.muted }]}>
                  {language === 'de'
                    ? 'Wähle eine Vorlage oder ein vergangenes Workout:'
                    : 'Select a template or past workout to copy into this day:'}
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
                      {language === 'de' ? 'Vorlagen' : 'Templates'}
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
                      {language === 'de' ? 'Verlauf' : 'History'}
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
                          {language === 'de'
                            ? `${t.exercises.length} ${t.exercises.length === 1 ? 'Übung' : 'Übungen'}`
                            : `${t.exercises.length} exercise${t.exercises.length !== 1 ? 's' : ''}`}
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
                        {language === 'de' ? 'Keine Vorlagen verfügbar.' : 'No templates available.'}
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
                          {s.completedAt
                            ? new Date(s.completedAt).toLocaleDateString(
                                language === 'de' ? 'de-DE' : 'en-US',
                              )
                            : ''}{' '}
                          •{' '}
                          {language === 'de'
                            ? `${s.exercises.length} ${s.exercises.length === 1 ? 'Übung' : 'Übungen'}`
                            : `${s.exercises.length} exercise${s.exercises.length !== 1 ? 's' : ''}`}
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
                        {language === 'de' ? 'Kein Verlauf verfügbar.' : 'No history available.'}
                      </Text>
                    )}
                  </ScrollView>
                )}

                <Pressable
                  style={[styles.backOptionBtn, { borderColor: theme.colors.border }]}
                  onPress={() => setModalMode('options')}
                >
                  <Ionicons name="arrow-back" size={16} color={theme.colors.primary} />
                  <Text style={[styles.backOptionText, { color: theme.colors.primary }]}>
                    {language === 'de' ? 'Zurück' : 'Back'}
                  </Text>
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
                {language === 'de' ? 'Abbrechen' : 'Cancel'}
              </Text>
            </Pressable>
          </Pressable>
        </Pressable>
        <KeyboardDoneAccessory />
      </Modal>

      {/* Reschedule Workout Day Modal */}
      <Modal
        visible={rescheduleWorkout !== null}
        transparent
        animationType="fade"
        onRequestClose={() => setRescheduleWorkout(null)}
      >
        <Pressable style={styles.modalOverlay} onPress={() => setRescheduleWorkout(null)}>
          <Pressable
            style={[
              styles.modalCard,
              { backgroundColor: theme.colors.surface, borderColor: theme.colors.border },
            ]}
            onPress={(e: { stopPropagation: () => void }) => e.stopPropagation()}
          >
            <Text
              style={[styles.modalTitle, { color: theme.colors.text, ...theme.typography.heading }]}
            >
              {language === 'de' ? 'Workout verschieben' : 'Move Workout'}
            </Text>
            <Text style={[styles.modalSub, { color: theme.colors.muted }]}>
              {language === 'de'
                ? `Ziel-Tag für „${templates.find((t) => t.id === rescheduleWorkout?.templateId)?.name || 'Workout'}“ wählen:`
                : `Select target day for "${templates.find((t) => t.id === rescheduleWorkout?.templateId)?.name || 'Workout'}":`}
            </Text>
            <ScrollView style={{ maxHeight: 240 }}>
              {[1, 2, 3, 4, 5, 6, 7].map((dayNum) => (
                <Pressable
                  key={dayNum}
                  style={[
                    styles.menuItem,
                    { borderBottomWidth: 1, borderBottomColor: theme.colors.border },
                    rescheduleWorkout?.dayOfWeek === dayNum && {
                      backgroundColor: theme.colors.primarySubtle,
                    },
                  ]}
                  onPress={() => {
                    if (rescheduleWorkout) {
                      handleMoveWorkoutToDay(rescheduleWorkout, dayNum);
                      setRescheduleWorkout(null);
                    }
                  }}
                >
                  <Ionicons name="calendar-outline" size={18} color={theme.colors.primary} />
                  <Text style={[styles.menuItemText, { color: theme.colors.text }]}>
                    {getDayName(dayNum)}{' '}
                    {rescheduleWorkout?.dayOfWeek === dayNum
                      ? language === 'de'
                        ? '(Aktuell)'
                        : '(Current)'
                      : ''}
                  </Text>
                </Pressable>
              ))}
            </ScrollView>
            <Pressable
              style={[
                styles.modalCloseBtn,
                {
                  backgroundColor: theme.colors.border,
                  borderRadius: theme.radius.md,
                  marginTop: 12,
                  height: 44,
                  justifyContent: 'center',
                  alignItems: 'center',
                },
              ]}
              onPress={() => setRescheduleWorkout(null)}
            >
              <Text style={{ color: theme.colors.text, fontFamily: 'SpaceGrotesk_700Bold' }}>
                {language === 'de' ? 'Abbrechen' : 'Cancel'}
              </Text>
            </Pressable>
          </Pressable>
        </Pressable>
        <KeyboardDoneAccessory />
      </Modal>
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
    textArea: { minHeight: 80, textAlignVertical: 'top' },
    sectionTitle: {
      fontSize: 20,
      fontFamily: 'SpaceGrotesk_700Bold',
      color: theme.colors.primary,
      marginTop: 16,
      marginBottom: 8,
      textTransform: 'uppercase',
    },
    weekTabsScroll: {
      marginBottom: 16,
    },
    weekTab: {
      minHeight: 44,
      justifyContent: 'center',
      paddingHorizontal: 16,
      paddingVertical: 8,
      borderRadius: 20,
      backgroundColor: theme.colors.border,
      marginRight: 8,
      borderWidth: 1,
      borderColor: theme.colors.border,
    },
    weekTabText: {
      color: theme.colors.muted,
      fontFamily: 'SpaceGrotesk_600SemiBold',
      fontSize: 14,
    },
    dayContainer: {
      backgroundColor: theme.colors.background,
      borderRadius: theme.radius.lg,
      padding: 16,
      marginBottom: 12,
      borderWidth: 0,
      borderColor: theme.colors.border,
      overflow: 'visible',
    },
    dayContainerHovered: {
      borderColor: theme.colors.primary,
      borderWidth: 2,
      backgroundColor: withAlpha(theme.colors.primary, 0.08),
    },
    dropTargetBadge: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
      paddingHorizontal: 8,
      paddingVertical: 3,
      borderRadius: 6,
      backgroundColor: withAlpha(theme.colors.primary, 0.18),
      borderWidth: 1,
      borderColor: theme.colors.primary,
    },
    dropTargetBadgeText: {
      fontSize: 11,
      fontFamily: 'SpaceGrotesk_700Bold',
      color: theme.colors.primary,
    },
    cardActiveDrag: {
      borderColor: theme.colors.primary,
      borderWidth: 1.5,
      zIndex: 10000,
      elevation: 25,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 8 },
      shadowOpacity: 0.35,
      shadowRadius: 10,
    },
    dayHeaderRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: 10,
    },
    dayName: {
      fontSize: 16,
      fontFamily: 'SpaceGrotesk_700Bold',
      color: theme.colors.text,
    },
    dayStatusBadge: {
      paddingHorizontal: 8,
      paddingVertical: 3,
      borderRadius: 6,
    },
    dayStatusText: {
      fontFamily: 'SpaceGrotesk_600SemiBold',
      fontSize: 11,
      letterSpacing: 0.3,
    },
    workoutRow: {
      backgroundColor: theme.colors.background,
      padding: 12,
      borderRadius: 10,
      marginBottom: 8,
      borderWidth: 1,
      borderColor: theme.colors.border,
      gap: 10,
    },
    workoutTopRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
    },
    workoutName: {
      fontSize: 15,
      fontFamily: 'SpaceGrotesk_600SemiBold',
      color: theme.colors.text,
    },
    workoutActionsRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      flexWrap: 'wrap',
    },
    actionPill: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 5,
      paddingHorizontal: 10,
      paddingVertical: 6,
      borderRadius: 8,
      borderWidth: 1,
      minHeight: 32,
    },
    actionPillText: {
      fontFamily: 'SpaceGrotesk_600SemiBold',
      fontSize: 12,
    },
    deletePill: {
      width: 32,
      height: 32,
      borderRadius: 8,
      backgroundColor: withAlpha(theme.colors.error, 0.1),
      borderWidth: 1,
      borderColor: withAlpha(theme.colors.error, 0.25),
      alignItems: 'center',
      justifyContent: 'center',
      marginLeft: 'auto',
    },
    dragHandle: {
      paddingHorizontal: 4,
      paddingVertical: 4,
      justifyContent: 'center',
      alignItems: 'center',
      marginRight: 4,
    },
    addWorkoutBtn: {
      minHeight: 40,
      padding: 10,
      alignItems: 'center',
      borderRadius: 8,
      borderWidth: 1,
      borderColor: theme.colors.border,
      marginTop: 4,
    },
    addWorkoutText: {
      fontFamily: 'SpaceGrotesk_600SemiBold',
      fontSize: 13,
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
      borderBottomColor: theme.colors.border,
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
    menuItem: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
      paddingVertical: 12,
      paddingHorizontal: 8,
    },
    menuItemText: {
      color: theme.colors.text,
      fontFamily: 'SpaceGrotesk_600SemiBold',
      fontSize: 15,
    },
    topHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: 16,
      paddingBottom: 12,
      borderBottomWidth: 1,
      minHeight: 56,
      zIndex: 10,
    },
    headerCancelBtn: {
      paddingHorizontal: 12,
      paddingVertical: 6,
      borderRadius: 8,
      borderWidth: 1,
      minHeight: 36,
      justifyContent: 'center',
      alignItems: 'center',
    },
    headerCancelText: {
      fontFamily: 'SpaceGrotesk_600SemiBold',
      fontSize: 13,
    },
    headerTitleText: {
      flex: 1,
      textAlign: 'center',
      fontFamily: 'SpaceGrotesk_700Bold',
      fontSize: 16,
      paddingHorizontal: 8,
    },
    headerSaveBtn: {
      paddingHorizontal: 14,
      paddingVertical: 6,
      borderRadius: 8,
      minHeight: 36,
      justifyContent: 'center',
      alignItems: 'center',
    },
    headerSaveText: {
      fontFamily: 'SpaceGrotesk_700Bold',
      fontSize: 13,
    },
  });
