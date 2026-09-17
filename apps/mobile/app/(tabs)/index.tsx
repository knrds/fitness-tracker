import { VoltDashboard } from '../../src/components/VoltDashboard';
import { Theme, useThemeStyles, useTheme, useDialog } from '@fitness-tracker/ui';
import { useFocusScroll } from '../../src/hooks/useFocusScroll';
import React from 'react';
import { useReducedMotion } from 'react-native-reanimated';
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  Pressable,
  Animated,
  Platform,
  Modal,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { WorkoutTemplate, getMuscleActivity } from '@fitness-tracker/domain';
import { useWorkoutStore } from '../../src/stores/workoutStore';
import { useHistoryStore } from '../../src/stores/historyStore';
import { useProgramStore } from '../../src/stores/programStore';
import { useExerciseStore } from '../../src/stores/exerciseStore';
import { useI18n } from '../../src/i18n';

export default function HomeScreen() {
  const scrollRef = useFocusScroll();
  const router = useRouter();
  const theme = useTheme();
  const styles = useThemeStyles(createStyles);
  const { showConfirm } = useDialog();
  const insets = useSafeAreaInsets();
  const { language } = useI18n();

  const { startWorkout, startWorkoutFromTemplate, status } = useWorkoutStore();
  const { getSessionsByDateDesc } = useHistoryStore();
  const { programs, templates } = useProgramStore();
  const { exercises } = useExerciseStore();

  const reducedMotion = useReducedMotion();
  const shouldAnimateEntrance = !reducedMotion;
  const fadeAnim = React.useRef(new Animated.Value(shouldAnimateEntrance ? 0 : 1)).current;
  const slideAnim = React.useRef(new Animated.Value(shouldAnimateEntrance ? 15 : 0)).current;
  const [selectedTemplate, setSelectedTemplate] = React.useState<WorkoutTemplate | null>(null);

  const sessions = React.useMemo(() => getSessionsByDateDesc(), [getSessionsByDateDesc]);

  const sortedTemplates = React.useMemo(
    () =>
      [...templates].sort(
        (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
      ),
    [templates],
  );

  const muscleVolumes = React.useMemo(() => {
    const since = new Date();
    since.setDate(since.getDate() - 6);
    since.setHours(0, 0, 0, 0);
    return getMuscleActivity(sessions, exercises, since);
  }, [sessions, exercises]);

  const handleStartTemplate = async (template: WorkoutTemplate, programId?: string) => {
    const start = () => {
      startWorkoutFromTemplate(template, programId);
      router.push('/workout/session');
    };

    if (status === 'active' || status === 'paused') {
      const shouldDiscard = await showConfirm({
        title: 'Laufendes Training',
        message: 'Ein Training ist bereits aktiv. Möchtest du es verwerfen und stattdessen diese Vorlage starten?',
        confirmLabel: 'Verwerfen & Starten',
        cancelLabel: 'Abbrechen',
        destructive: true,
      });
      if (shouldDiscard) {
        start();
      }
    } else {
      start();
    }
  };

  React.useEffect(() => {
    if (!shouldAnimateEntrance) return;

    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 500,
        useNativeDriver: Platform.OS !== 'web',
      }),
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 500,
        useNativeDriver: Platform.OS !== 'web',
      }),
    ]).start();
  }, [fadeAnim, shouldAnimateEntrance, slideAnim]);

  const activeProgram = programs.find((p) => p.isActive);
  const today = new Date();
  const programDayOfWeek = today.getDay() === 0 ? 7 : today.getDay();
  const currentProgramWeek = activeProgram
    ? (() => {
        const start = activeProgram.startedAt ? new Date(activeProgram.startedAt) : today;
        const startOfToday = new Date(today);
        const startOfProgram = new Date(start);
        startOfToday.setHours(0, 0, 0, 0);
        startOfProgram.setHours(0, 0, 0, 0);

        const daysSinceStart = Math.floor(
          (startOfToday.getTime() - startOfProgram.getTime()) / 86400000,
        );
        const rawWeek = Math.floor(Math.max(0, daysSinceStart) / 7) + 1;
        return Math.min(Math.max(1, activeProgram.durationWeeks), rawWeek);
      })()
    : 1;
  const todaysProgramWorkouts = activeProgram
    ? activeProgram.workouts
        .filter(
          (workout) =>
            workout.week === currentProgramWeek && workout.dayOfWeek === programDayOfWeek,
        )
        .sort((a, b) => a.order - b.order)
    : [];
  const todaysProgramTemplates = todaysProgramWorkouts
    .map((workout) => templates.find((template) => template.id === workout.templateId))
    .filter((template): template is WorkoutTemplate => Boolean(template));
  const featuredProgramTemplate = todaysProgramTemplates[0] ?? null;
  const handleStartWorkout = () => {
    if (status === 'idle' || status === 'finished') {
      startWorkout('Quick Workout');
    }
    router.push('/workout/session');
  };

  const handleStartToday = () => {
    if (status === 'active' || status === 'paused') {
      router.push('/workout/session');
      return;
    }

    if (featuredProgramTemplate && activeProgram) {
      handleStartTemplate(featuredProgramTemplate, activeProgram.id);
      return;
    }

    handleStartWorkout();
  };

  return (
    <ScrollView
      ref={scrollRef}
      style={[styles.container, { backgroundColor: theme.colors.background }]}
      contentContainerStyle={[
        styles.content,
        {
          paddingTop: Math.max(insets.top, 24),
          paddingBottom: Math.max(insets.bottom + 20, 100),
        },
      ]}
    >
      <Animated.View style={{ opacity: fadeAnim, transform: [{ translateY: slideAnim }], gap: 12 }}>
        <VoltDashboard
          template={featuredProgramTemplate}
          programName={activeProgram?.name}
          week={currentProgramWeek}
          durationWeeks={activeProgram?.durationWeeks}
          templates={sortedTemplates}
          activity={muscleVolumes}
          onStart={handleStartToday}
          onTemplate={setSelectedTemplate}
          resume={status === 'active' || status === 'paused'}
        />
      </Animated.View>

      {/* Workout Template Summary Popup */}
      <Modal
        visible={selectedTemplate !== null}
        transparent
        animationType="slide"
        onRequestClose={() => setSelectedTemplate(null)}
      >
        <Pressable style={styles.modalOverlay} onPress={() => setSelectedTemplate(null)}>
          <Pressable
            style={[
              styles.modalCard,
              { backgroundColor: theme.colors.surface, borderColor: theme.colors.border },
            ]}
            onPress={(e) => e.stopPropagation()}
          >
            {selectedTemplate && (
              <>
                <View style={styles.modalHeaderRow}>
                  <Text
                    style={[
                      styles.modalTitle,
                      { color: theme.colors.text, ...theme.typography.heading },
                    ]}
                  >
                    {selectedTemplate.name}
                  </Text>
                  <Pressable onPress={() => setSelectedTemplate(null)} hitSlop={10}>
                    <Ionicons name="close" size={24} color={theme.colors.muted} />
                  </Pressable>
                </View>

                <View style={styles.modalSummaryStatsRow}>
                  <View style={styles.modalStatItem}>
                    <Ionicons name="barbell-outline" size={16} color={theme.colors.primary} />
                    <Text
                      style={[styles.modalStatText, { color: theme.colors.muted, marginLeft: 6 }]}
                    >
                      {selectedTemplate.exercises.length} Exercises
                    </Text>
                  </View>
                  <View style={styles.modalStatItem}>
                    <Ionicons name="repeat-outline" size={16} color={theme.colors.primary} />
                    <Text
                      style={[styles.modalStatText, { color: theme.colors.muted, marginLeft: 6 }]}
                    >
                      {selectedTemplate.exercises.reduce((sum, curr) => sum + curr.targetSets, 0)}{' '}
                      Total Sets
                    </Text>
                  </View>
                </View>

                <ScrollView style={styles.summaryExerciseList} showsVerticalScrollIndicator={false}>
                  {selectedTemplate.exercises.map((te, idx) => {
                    const exInfo = exercises.find((e) => e.id === te.exerciseId);
                    return (
                      <View
                        key={te.id || idx}
                        style={[styles.summaryExRow, { borderColor: theme.colors.border }]}
                      >
                        <Text style={[styles.summaryExName, { color: theme.colors.text }]}>
                          {exInfo?.name || (language === 'de' ? 'Unbekannte Übung' : 'Unknown Exercise')}
                        </Text>
                        <Text style={[styles.summaryExDetails, { color: theme.colors.primary }]}>
                          {te.targetSets}s × {te.targetReps ?? '8-10'}r
                        </Text>
                      </View>
                    );
                  })}
                </ScrollView>

                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel="Start workout"
                  style={[
                    styles.modalStartBtn,
                    { backgroundColor: theme.colors.primary, borderRadius: theme.radius.md },
                  ]}
                  onPress={() => {
                    const tmpl = selectedTemplate;
                    setSelectedTemplate(null);
                    handleStartTemplate(tmpl);
                  }}
                >
                  <Text
                    style={[
                      styles.modalStartBtnText,
                      { color: theme.colors.background, ...theme.typography.button },
                    ]}
                  >
                    START WORKOUT
                  </Text>
                </Pressable>
              </>
            )}
          </Pressable>
        </Pressable>
      </Modal>
    </ScrollView>
  );
}

const createStyles = (theme: Theme) =>
  StyleSheet.create({
    container: {
      flex: 1,
    },
    content: {
      padding: 16,
      width: '100%',
      maxWidth: 1040,
      alignSelf: 'center',
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
  });
