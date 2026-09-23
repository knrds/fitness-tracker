import React, { useState, useEffect } from 'react';
import {
  Modal,
  View,
  Text,
  ScrollView,
  Pressable,
  TextInput,
  StyleSheet,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme, withAlpha } from '@fitness-tracker/ui';
import {
  WorkoutSession,
  SessionExercise,
  ExerciseSet,
} from '@fitness-tracker/domain';
import { useHistoryStore } from '../../stores/historyStore';
import { useExerciseStore } from '../../stores/exerciseStore';
import { useProfileStore } from '../../stores/profileStore';
import { useI18n } from '../../i18n';
import { DatePickerModal, toIsoDateString } from '../DatePickerModal';
import { recalculateDerivedStatsAfterHistoryMutation } from '../../utils/historyRecalculation';



export interface HistoryEditModalProps {
  visible: boolean;
  session: WorkoutSession | null;
  onClose: () => void;
  onSaved?: (updatedSession: WorkoutSession) => void;
}

export const HistoryEditModal: React.FC<HistoryEditModalProps> = ({
  visible,
  session,
  onClose,
  onSaved,
}) => {
  const theme = useTheme();
  const { language } = useI18n();
  const { exercises: catalogExercises } = useExerciseStore();
  const { profile } = useProfileStore();
  const isImperial = profile.preferredUnits === 'imperial';

  const [name, setName] = useState('');
  const [dateStr, setDateStr] = useState('');
  const [datePickerVisible, setDatePickerVisible] = useState(false);
  const [durationMinutes, setDurationMinutes] = useState('0');
  const [notes, setNotes] = useState('');
  const [sessionExercises, setSessionExercises] = useState<SessionExercise[]>([]);

  useEffect(() => {
    if (session && visible) {
      setName(session.name);
      setDateStr(toIsoDateString(new Date(session.startedAt)));
      setDurationMinutes(String(Math.round((session.durationSeconds ?? 0) / 60)));
      setNotes(session.notes ?? '');
      // Deep copy exercises and sets
      setSessionExercises(
        session.exercises.map((ex) => ({
          ...ex,
          sets: ex.sets.map((s) => ({ ...s })),
        })),
      );
    }
  }, [session, visible]);

  if (!session) return null;

  const getExerciseName = (exerciseId: string) => {
    const found = catalogExercises.find((e) => e.id === exerciseId);
    return found ? found.name : 'Exercise';
  };

  const handleUpdateSet = (
    exIdx: number,
    setIdx: number,
    field: keyof ExerciseSet,
    val: unknown,
  ) => {
    setSessionExercises((prev) => {
      const copy = [...prev];
      const target = copy[exIdx];
      if (!target) return prev;
      const setsCopy = [...target.sets];
      const currentSet = setsCopy[setIdx];
      if (!currentSet) return prev;
      setsCopy[setIdx] = { ...currentSet, [field]: val } as ExerciseSet;
      copy[exIdx] = { ...target, sets: setsCopy };
      return copy;
    });
  };

  const handleAddSet = (exIdx: number) => {
    setSessionExercises((prev) => {
      const copy = [...prev];
      const target = copy[exIdx];
      if (!target) return prev;
      const lastSet = target.sets[target.sets.length - 1];
      const newSet: ExerciseSet = {
        id: `set_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
        setNumber: target.sets.length + 1,
        type: 'working',
        weight: lastSet?.weight ?? 0,
        reps: lastSet?.reps ?? 10,
        completed: true,
      };
      copy[exIdx] = { ...target, sets: [...target.sets, newSet] };
      return copy;
    });
  };

  const handleRemoveSet = (exIdx: number, setIdx: number) => {
    setSessionExercises((prev) => {
      const copy = [...prev];
      const target = copy[exIdx];
      if (!target) return prev;
      if (target.sets.length <= 1) {
        Alert.alert(
          language === 'de' ? 'Hinweis' : 'Notice',
          language === 'de'
            ? 'Mindestens ein Satz pro Übung muss verbleiben.'
            : 'At least one set per exercise must remain.',
        );
        return prev;
      }
      const newSets = target.sets
        .filter((_, idx) => idx !== setIdx)
        .map((s, idx) => ({ ...s, setNumber: idx + 1 }));
      copy[exIdx] = { ...target, sets: newSets };
      return copy;
    });
  };

  const handleSave = () => {
    if (!name.trim()) {
      Alert.alert(
        language === 'de' ? 'Fehler' : 'Error',
        language === 'de'
          ? 'Bitte gib einen Namen für das Workout ein.'
          : 'Please enter a name for the workout.',
      );
      return;
    }

    const parsedDate = new Date(`${dateStr}T12:00:00`);
    if (isNaN(parsedDate.getTime())) {
      Alert.alert(
        language === 'de' ? 'Fehler' : 'Error',
        language === 'de' ? 'Ungültiges Datum.' : 'Invalid date.',
      );
      return;
    }

    const durMin = parseInt(durationMinutes, 10);
    const safeDuration = Number.isFinite(durMin) && durMin >= 0 ? durMin * 60 : session.durationSeconds;

    const updatedSession: WorkoutSession = {
      ...session,
      name: name.trim(),
      startedAt: parsedDate,
      exercises: sessionExercises,
      updatedAt: new Date(),
    };
    if (safeDuration !== undefined) {
      updatedSession.durationSeconds = safeDuration;
    } else {
      delete updatedSession.durationSeconds;
    }
    const cleanNotes = notes.trim();
    if (cleanNotes) {
      updatedSession.notes = cleanNotes;
    } else {
      delete updatedSession.notes;
    }

    // Update in history store (preserves id, no duplicate record, no duplicate XP)
    useHistoryStore.getState().updateSession(updatedSession);

    // Deterministically recalculate PRs and stats
    recalculateDerivedStatsAfterHistoryMutation();

    onSaved?.(updatedSession);
    onClose();
  };

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={styles.modalOverlay}>
        <View style={[styles.modalSheet, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}>
          {/* Header */}
          <View style={styles.header}>
            <Pressable
              onPress={onClose}
              hitSlop={12}
              accessibilityRole="button"
              accessibilityLabel={language === 'de' ? 'Abbrechen' : 'Cancel'}
            >
              <Text style={[styles.headerAction, { color: theme.colors.muted }]}>
                {language === 'de' ? 'Abbrechen' : 'Cancel'}
              </Text>
            </Pressable>

            <Text style={[styles.headerTitle, { color: theme.colors.text }]}>
              {language === 'de' ? 'Workout bearbeiten' : 'Edit Workout'}
            </Text>

            <Pressable
              onPress={handleSave}
              hitSlop={12}
              accessibilityRole="button"
              accessibilityLabel={language === 'de' ? 'Speichern' : 'Save'}
            >
              <Text style={[styles.headerAction, { color: theme.colors.primary, fontWeight: '700' }]}>
                {language === 'de' ? 'Speichern' : 'Save'}
              </Text>
            </Pressable>
          </View>

          <ScrollView style={styles.scrollArea} contentContainerStyle={styles.scrollContent}>
            {/* Workout Name */}
            <View style={styles.fieldGroup}>
              <Text style={[styles.fieldLabel, { color: theme.colors.muted }]}>
                {language === 'de' ? 'NAME' : 'NAME'}
              </Text>
              <TextInput
                style={[
                  styles.input,
                  {
                    color: theme.colors.text,
                    borderColor: theme.colors.border,
                    backgroundColor: theme.colors.background,
                  },
                ]}
                value={name}
                onChangeText={setName}
                placeholder="Workout Name"
                placeholderTextColor={theme.colors.muted}
              />
            </View>

            {/* Completion Date using shared DatePickerModal */}
            <View style={styles.fieldGroup}>
              <Text style={[styles.fieldLabel, { color: theme.colors.muted }]}>
                {language === 'de' ? 'DATUM' : 'DATE'}
              </Text>
              <Pressable
                onPress={() => setDatePickerVisible(true)}
                accessibilityRole="button"
                accessibilityLabel={language === 'de' ? `Datum: ${dateStr}` : `Date: ${dateStr}`}
                style={[
                  styles.dateTriggerBtn,
                  {
                    borderColor: theme.colors.border,
                    backgroundColor: theme.colors.background,
                  },
                ]}
              >
                <Ionicons
                  name="calendar-outline"
                  size={18}
                  color={theme.colors.primary}
                  style={{ marginRight: 8 }}
                />
                <Text style={[styles.dateTriggerText, { color: theme.colors.text }]}>
                  {dateStr}
                </Text>
                <Ionicons
                  name="chevron-down"
                  size={16}
                  color={theme.colors.muted}
                  style={{ marginLeft: 'auto' }}
                />
              </Pressable>
            </View>

            {/* Duration Minutes */}
            <View style={styles.fieldGroup}>
              <Text style={[styles.fieldLabel, { color: theme.colors.muted }]}>
                {language === 'de' ? 'DAUER (MINUTEN)' : 'DURATION (MINUTES)'}
              </Text>
              <TextInput
                style={[
                  styles.input,
                  {
                    color: theme.colors.text,
                    borderColor: theme.colors.border,
                    backgroundColor: theme.colors.background,
                  },
                ]}
                value={durationMinutes}
                onChangeText={setDurationMinutes}
                keyboardType="numeric"
                placeholder="45"
                placeholderTextColor={theme.colors.muted}
              />
            </View>

            {/* Notes */}
            <View style={styles.fieldGroup}>
              <Text style={[styles.fieldLabel, { color: theme.colors.muted }]}>
                {language === 'de' ? 'NOTIZEN' : 'NOTES'}
              </Text>
              <TextInput
                style={[
                  styles.input,
                  styles.multilineInput,
                  {
                    color: theme.colors.text,
                    borderColor: theme.colors.border,
                    backgroundColor: theme.colors.background,
                  },
                ]}
                value={notes}
                onChangeText={setNotes}
                multiline
                numberOfLines={3}
                placeholder={language === 'de' ? 'Notizen zum Training...' : 'Workout notes...'}
                placeholderTextColor={theme.colors.muted}
              />
            </View>

            {/* Exercises & Sets */}
            <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>
              {language === 'de' ? 'Übungen & Sätze' : 'Exercises & Sets'}
            </Text>

            {sessionExercises.map((ex, exIdx) => (
              <View
                key={ex.id || `ex_${exIdx}`}
                style={[
                  styles.exerciseCard,
                  {
                    backgroundColor: theme.colors.surfaceElevated,
                    borderColor: theme.colors.border,
                  },
                ]}
              >
                <Text style={[styles.exerciseName, { color: theme.colors.text }]}>
                  {getExerciseName(ex.exerciseId)}
                </Text>

                {/* Table Header */}
                <View style={styles.tableHeader}>
                  <Text style={[styles.colHeader, { flex: 0.8, color: theme.colors.muted }]}>
                    {language === 'de' ? 'Satz' : 'Set'}
                  </Text>
                  <Text style={[styles.colHeader, { flex: 1.2, color: theme.colors.muted }]}>
                    {language === 'de' ? 'Typ' : 'Type'}
                  </Text>
                  <Text style={[styles.colHeader, { flex: 1.5, color: theme.colors.muted }]}>
                    {isImperial ? 'lbs' : 'kg'}
                  </Text>
                  <Text style={[styles.colHeader, { flex: 1.2, color: theme.colors.muted }]}>
                    {language === 'de' ? 'Wdh' : 'Reps'}
                  </Text>
                  <Text style={[styles.colHeader, { flex: 1.2, color: theme.colors.muted }]}>
                    RPE
                  </Text>
                  <View style={{ width: 36 }} />
                </View>

                {/* Sets */}
                {ex.sets.map((set, setIdx) => (
                  <View key={set.id || `set_${setIdx}`} style={styles.setRow}>
                    <Text style={[styles.setText, { flex: 0.8, color: theme.colors.muted }]}>
                      {set.setNumber}
                    </Text>

                    {/* Set Type toggle */}
                    <Pressable
                      style={[
                        styles.typeBadge,
                        {
                          flex: 1.2,
                          backgroundColor:
                            set.type === 'warmup'
                              ? withAlpha(theme.colors.warning, 0.15)
                              : withAlpha(theme.colors.primary, 0.15),
                        },
                      ]}
                      onPress={() =>
                        handleUpdateSet(
                          exIdx,
                          setIdx,
                          'type',
                          set.type === 'warmup' ? 'working' : 'warmup',
                        )
                      }
                    >
                      <Text
                        style={[
                          styles.typeBadgeText,
                          {
                            color:
                              set.type === 'warmup'
                                ? theme.colors.warning
                                : theme.colors.primary,
                          },
                        ]}
                      >
                        {set.type === 'warmup'
                          ? language === 'de'
                            ? 'W'
                            : 'W'
                          : language === 'de'
                            ? 'A'
                            : 'Wk'}
                      </Text>
                    </Pressable>

                    {/* Weight */}
                    <TextInput
                      style={[
                        styles.cellInput,
                        {
                          flex: 1.5,
                          color: theme.colors.text,
                          borderColor: theme.colors.border,
                          backgroundColor: theme.colors.background,
                        },
                      ]}
                      value={String(set.weight ?? 0)}
                      onChangeText={(val) => {
                        const parsed = parseFloat(val.replace(',', '.'));
                        handleUpdateSet(
                          exIdx,
                          setIdx,
                          'weight',
                          isNaN(parsed) ? 0 : parsed,
                        );
                      }}
                      keyboardType="numeric"
                    />

                    {/* Reps */}
                    <TextInput
                      style={[
                        styles.cellInput,
                        {
                          flex: 1.2,
                          color: theme.colors.text,
                          borderColor: theme.colors.border,
                          backgroundColor: theme.colors.background,
                        },
                      ]}
                      value={String(set.reps ?? 0)}
                      onChangeText={(val) => {
                        const parsed = parseInt(val, 10);
                        handleUpdateSet(
                          exIdx,
                          setIdx,
                          'reps',
                          isNaN(parsed) ? 0 : parsed,
                        );
                      }}
                      keyboardType="numeric"
                    />

                    {/* RPE */}
                    <TextInput
                      style={[
                        styles.cellInput,
                        {
                          flex: 1.2,
                          color: theme.colors.text,
                          borderColor: theme.colors.border,
                          backgroundColor: theme.colors.background,
                        },
                      ]}
                      value={set.rpe !== undefined ? String(set.rpe) : ''}
                      onChangeText={(val) => {
                        const parsed = parseFloat(val.replace(',', '.'));
                        handleUpdateSet(
                          exIdx,
                          setIdx,
                          'rpe',
                          isNaN(parsed) ? undefined : parsed,
                        );
                      }}
                      keyboardType="numeric"
                      placeholder="-"
                      placeholderTextColor={theme.colors.muted}
                    />

                    {/* Delete Set */}
                    <Pressable
                      style={styles.deleteSetBtn}
                      hitSlop={8}
                      onPress={() => handleRemoveSet(exIdx, setIdx)}
                      accessibilityRole="button"
                      accessibilityLabel={language === 'de' ? 'Satz löschen' : 'Delete set'}
                    >
                      <Ionicons name="trash-outline" size={16} color={theme.colors.error} />
                    </Pressable>
                  </View>
                ))}

                {/* Add Set Button */}
                <Pressable
                  style={[
                    styles.addSetBtn,
                    {
                      borderColor: withAlpha(theme.colors.primary, 0.4),
                      backgroundColor: withAlpha(theme.colors.primary, 0.06),
                    },
                  ]}
                  onPress={() => handleAddSet(exIdx)}
                >
                  <Ionicons name="add" size={16} color={theme.colors.primary} />
                  <Text style={[styles.addSetText, { color: theme.colors.primary }]}>
                    {language === 'de' ? 'Satz hinzufügen' : 'Add Set'}
                  </Text>
                </Pressable>
              </View>
            ))}
          </ScrollView>

          {/* Date Picker Modal */}
          <DatePickerModal
            visible={datePickerVisible}
            value={dateStr}
            onConfirm={(iso) => setDateStr(iso)}
            onClose={() => setDatePickerVisible(false)}
            language={language}
            title={language === 'de' ? 'Abschlussdatum' : 'Completion Date'}
            defaultToToday={true}
          />
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'flex-end',
  },
  modalSheet: {
    maxHeight: '92%',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    borderTopWidth: 1,
    overflow: 'hidden',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.08)',
  },
  headerAction: {
    fontFamily: 'Manrope_600SemiBold',
    fontSize: 15,
  },
  headerTitle: {
    fontFamily: 'SpaceGrotesk_700Bold',
    fontSize: 16,
  },
  scrollArea: {
    flexGrow: 0,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 40,
  },
  fieldGroup: {
    marginBottom: 14,
  },
  fieldLabel: {
    fontFamily: 'SpaceGrotesk_700Bold',
    fontSize: 11,
    letterSpacing: 0.5,
    marginBottom: 6,
  },
  input: {
    borderWidth: 1,
    borderRadius: 10,
    height: 44,
    paddingHorizontal: 12,
    fontFamily: 'Manrope_600SemiBold',
    fontSize: 14,
  },
  multilineInput: {
    height: 72,
    paddingTop: 10,
    textAlignVertical: 'top',
  },
  dateTriggerBtn: {
    height: 44,
    borderRadius: 10,
    borderWidth: 1,
    paddingHorizontal: 12,
    flexDirection: 'row',
    alignItems: 'center',
  },
  dateTriggerText: {
    fontFamily: 'Manrope_600SemiBold',
    fontSize: 14,
  },
  sectionTitle: {
    fontFamily: 'SpaceGrotesk_700Bold',
    fontSize: 15,
    marginTop: 10,
    marginBottom: 12,
  },
  exerciseCard: {
    borderRadius: 12,
    borderWidth: 1,
    padding: 12,
    marginBottom: 14,
  },
  exerciseName: {
    fontFamily: 'SpaceGrotesk_700Bold',
    fontSize: 14,
    marginBottom: 10,
  },
  tableHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
    gap: 6,
  },
  colHeader: {
    fontFamily: 'SpaceGrotesk_700Bold',
    fontSize: 11,
    textAlign: 'center',
  },
  setRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
    gap: 6,
  },
  setText: {
    fontFamily: 'Manrope_600SemiBold',
    fontSize: 13,
    textAlign: 'center',
  },
  typeBadge: {
    height: 36,
    borderRadius: 6,
    alignItems: 'center',
    justifyContent: 'center',
  },
  typeBadgeText: {
    fontFamily: 'SpaceGrotesk_700Bold',
    fontSize: 12,
  },
  cellInput: {
    height: 36,
    borderWidth: 1,
    borderRadius: 6,
    paddingHorizontal: 6,
    textAlign: 'center',
    fontFamily: 'Manrope_600SemiBold',
    fontSize: 13,
  },
  deleteSetBtn: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
  addSetBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    height: 36,
    borderRadius: 8,
    borderWidth: 1,
    borderStyle: 'dashed',
    marginTop: 8,
    gap: 6,
  },
  addSetText: {
    fontFamily: 'Manrope_600SemiBold',
    fontSize: 12,
  },
});
