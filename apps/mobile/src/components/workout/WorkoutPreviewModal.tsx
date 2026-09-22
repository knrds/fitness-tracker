import React from 'react';
import {
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme, useThemeStyles, Theme } from '@fitness-tracker/ui';
import {
  WorkoutTemplate,
  ProgramWorkout,
  Program,
  Exercise,
} from '@fitness-tracker/domain';
import { useI18n } from '../../i18n';

export interface WorkoutPreviewExercise {
  id?: string | undefined;
  exerciseId: string;
  name: string;
  targetSets: number;
  targetReps?: string | number | undefined;
  targetRepsMax?: number | undefined;
  targetWeight?: number | undefined;
  targetRpe?: number | undefined;
  targetRir?: number | undefined;
  lastPerformance?: string | undefined;
}

export interface WorkoutPreviewModel {
  id: string;
  name: string;
  subtitle?: string | undefined;
  folder?: string | undefined;
  programId?: string | undefined;
  programName?: string | undefined;
  week?: number | undefined;
  dayOfWeek?: number | undefined;
  exercises: WorkoutPreviewExercise[];
  templateRef?: WorkoutTemplate | undefined;
}

export interface WorkoutPreviewModalProps {
  visible: boolean;
  model: WorkoutPreviewModel | null;
  onClose: () => void;
  onStart: (model: WorkoutPreviewModel) => void;
}

export function templateToPreviewModel(
  template: WorkoutTemplate,
  exercises: Exercise[],
  options?: {
    programId?: string | undefined;
    programName?: string | undefined;
    week?: number | undefined;
    dayOfWeek?: number | undefined;
  },
): WorkoutPreviewModel {
  const exerciseMap = new Map<string, string>();
  for (const ex of exercises) {
    exerciseMap.set(ex.id, ex.name);
  }

  const previewExercises: WorkoutPreviewExercise[] = template.exercises.map((te) => {
    const exName = exerciseMap.get(te.exerciseId) || 'Übung';
    let repsDisplay: string | number = te.targetReps ?? '8-10';
    if (te.targetReps && te.targetRepsMax && te.targetReps !== te.targetRepsMax) {
      repsDisplay = `${te.targetReps}-${te.targetRepsMax}`;
    }

    return {
      id: te.id,
      exerciseId: te.exerciseId,
      name: exName,
      targetSets: te.targetSets,
      targetReps: repsDisplay,
      targetRepsMax: te.targetRepsMax,
      targetWeight: te.targetWeight,
      targetRpe: te.targetRpe,
      targetRir: te.targetRir,
    };
  });

  return {
    id: template.id,
    name: template.name,
    folder: template.folder,
    programId: options?.programId,
    programName: options?.programName,
    week: options?.week,
    dayOfWeek: options?.dayOfWeek,
    exercises: previewExercises,
    templateRef: template,
  };
}

export function programWorkoutToPreviewModel(
  workout: ProgramWorkout,
  template: WorkoutTemplate,
  program: Program,
  exercises: Exercise[],
): WorkoutPreviewModel {
  return templateToPreviewModel(template, exercises, {
    programId: program.id,
    programName: program.name,
    week: workout.week,
    dayOfWeek: workout.dayOfWeek,
  });
}

export const WorkoutPreviewModal: React.FC<WorkoutPreviewModalProps> = ({
  visible,
  model,
  onClose,
  onStart,
}) => {
  const theme = useTheme();
  const styles = useThemeStyles(createStyles);
  const { language } = useI18n();

  if (!model) return null;

  const totalSets = model.exercises.reduce((acc, curr) => acc + curr.targetSets, 0);

  const getDayName = (day?: number) => {
    if (!day) return '';
    const daysDe = ['Montag', 'Dienstag', 'Mittwoch', 'Donnerstag', 'Freitag', 'Samstag', 'Sonntag'];
    const daysEn = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
    const list = language === 'de' ? daysDe : daysEn;
    return list[day - 1] ?? `Tag ${day}`;
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <Pressable style={styles.modalOverlay} onPress={onClose}>
        <Pressable
          style={[
            styles.modalCard,
            { backgroundColor: theme.colors.surface, borderColor: theme.colors.border },
          ]}
          onPress={(e) => e.stopPropagation()}
          accessibilityViewIsModal={true}
          accessibilityLabel={model.name}
        >
          {/* Header Row */}
          <View style={styles.modalHeaderRow}>
            <View style={{ flex: 1, minWidth: 0 }}>
              <Text
                maxFontSizeMultiplier={1.4}
                style={[
                  styles.modalTitle,
                  { color: theme.colors.text, ...theme.typography.heading },
                ]}
                numberOfLines={2}
              >
                {model.name}
              </Text>
              {model.programName && (
                <Text style={[styles.programTag, { color: theme.colors.primary }]}>
                  {model.programName}
                  {model.week !== undefined && model.dayOfWeek !== undefined
                    ? ` · ${language === 'de' ? 'Woche' : 'Week'} ${model.week} (${getDayName(model.dayOfWeek)})`
                    : ''}
                </Text>
              )}
              {model.folder && !model.programName && (
                <Text style={[styles.programTag, { color: theme.colors.primary }]}>
                  📁 {model.folder}
                </Text>
              )}
            </View>
            <Pressable
              onPress={onClose}
              hitSlop={12}
              style={styles.closeBtn}
              accessibilityRole="button"
              accessibilityLabel={language === 'de' ? 'Schließen' : 'Close'}
            >
              <Ionicons name="close" size={24} color={theme.colors.muted} />
            </Pressable>
          </View>

          {/* Stats Bar */}
          <View style={styles.modalSummaryStatsRow}>
            <View style={styles.modalStatItem}>
              <Ionicons name="barbell-outline" size={16} color={theme.colors.primary} />
              <Text
                maxFontSizeMultiplier={1.5}
                style={[styles.modalStatText, { color: theme.colors.muted }]}
              >
                {model.exercises.length}{' '}
                {model.exercises.length === 1
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
              <Text
                maxFontSizeMultiplier={1.5}
                style={[styles.modalStatText, { color: theme.colors.muted }]}
              >
                {totalSets} {language === 'de' ? 'Sätze gesamt' : 'Total Sets'}
              </Text>
            </View>
          </View>

          {/* Exercise List */}
          <ScrollView
            style={styles.summaryExerciseList}
            contentContainerStyle={{ paddingVertical: 4 }}
            showsVerticalScrollIndicator={false}
          >
            {model.exercises.map((ex, idx) => {
              const detailsParts = [`${ex.targetSets}s × ${ex.targetReps}r`];
              if (ex.targetWeight) {
                detailsParts.push(`${ex.targetWeight} kg`);
              }
              if (ex.targetRpe !== undefined) {
                detailsParts.push(`RPE ${ex.targetRpe}`);
              } else if (ex.targetRir !== undefined) {
                detailsParts.push(`${ex.targetRir} RIR`);
              }

              return (
                <View
                  key={ex.id || `${ex.exerciseId}-${idx}`}
                  style={[styles.summaryExRow, { borderColor: theme.colors.border }]}
                >
                  <View style={{ flex: 1, minWidth: 0 }}>
                    <Text
                      maxFontSizeMultiplier={1.4}
                      style={[styles.summaryExName, { color: theme.colors.text }]}
                      numberOfLines={1}
                    >
                      {ex.name}
                    </Text>
                    {ex.lastPerformance && (
                      <Text
                        maxFontSizeMultiplier={1.3}
                        style={{ color: theme.colors.muted, fontSize: 11, marginTop: 2 }}
                      >
                        {language === 'de' ? 'Zuletzt:' : 'Last:'} {ex.lastPerformance}
                      </Text>
                    )}
                  </View>
                  <Text
                    maxFontSizeMultiplier={1.4}
                    style={[styles.summaryExDetails, { color: theme.colors.primary }]}
                  >
                    {detailsParts.join(' · ')}
                  </Text>
                </View>
              );
            })}
          </ScrollView>

          {/* Start CTA */}
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={language === 'de' ? 'Workout starten' : 'Start Workout'}
            style={[
              styles.modalStartBtn,
              { backgroundColor: theme.colors.primary, borderRadius: theme.radius.md },
            ]}
            onPress={() => onStart(model)}
          >
            <Ionicons name="play" size={18} color={theme.colors.background} />
            <Text
              maxFontSizeMultiplier={1.5}
              style={[styles.modalStartBtnText, { color: theme.colors.background }]}
            >
              {language === 'de' ? 'Workout starten' : 'Start Workout'}
            </Text>
          </Pressable>
        </Pressable>
      </Pressable>
    </Modal>
  );
};

const createStyles = (theme: Theme) =>
  StyleSheet.create({
    modalOverlay: {
      flex: 1,
      backgroundColor: 'rgba(0,0,0,0.65)',
      justifyContent: 'center',
      alignItems: 'center',
      padding: 20,
    },
    modalCard: {
      width: '100%',
      maxWidth: 440,
      borderRadius: 16,
      borderWidth: 1,
      padding: 20,
      maxHeight: '80%',
    },
    modalHeaderRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'flex-start',
      marginBottom: 12,
    },
    modalTitle: {
      fontSize: 20,
      fontFamily: 'SpaceGrotesk_700Bold',
    },
    programTag: {
      fontSize: 12,
      fontFamily: 'SpaceGrotesk_600SemiBold',
      marginTop: 3,
    },
    closeBtn: {
      padding: 6,
      marginLeft: 8,
      minWidth: 44,
      minHeight: 44,
      alignItems: 'center',
      justifyContent: 'center',
    },
    modalSummaryStatsRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 16,
      paddingVertical: 8,
      borderTopWidth: StyleSheet.hairlineWidth,
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderColor: theme.colors.border,
      marginBottom: 12,
    },
    modalStatItem: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
    },
    modalStatText: {
      fontSize: 12,
      fontFamily: 'SpaceGrotesk_600SemiBold',
    },
    summaryExerciseList: {
      maxHeight: 280,
      marginBottom: 16,
    },
    summaryExRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      paddingVertical: 10,
      borderBottomWidth: StyleSheet.hairlineWidth,
    },
    summaryExName: {
      fontSize: 14,
      fontFamily: 'SpaceGrotesk_600SemiBold',
    },
    summaryExDetails: {
      fontSize: 13,
      fontFamily: 'SpaceGrotesk_700Bold',
      marginLeft: 12,
    },
    modalStartBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      paddingVertical: 14,
      gap: 8,
      minHeight: 48,
    },
    modalStartBtnText: {
      fontFamily: 'SpaceGrotesk_700Bold',
      fontSize: 15,
    },
  });
