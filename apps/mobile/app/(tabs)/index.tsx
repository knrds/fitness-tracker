import { useLocalToday } from '../../src/hooks/useLocalToday';
import { VoltDashboard } from '../../src/components/VoltDashboard';
import { Theme, useThemeStyles, useTheme, useDialog } from '@fitness-tracker/ui';
import { useFocusScroll } from '../../src/hooks/useFocusScroll';
import React from 'react';
import { useReducedMotion } from 'react-native-reanimated';
import {
  StyleSheet,
  ScrollView,
  Animated,
  Platform,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  WorkoutTemplate,
  getMuscleActivity,
  getProgramScheduleStatus,
} from '@fitness-tracker/domain';
import {
  WorkoutPreviewModal,
  WorkoutPreviewModel,
  templateToPreviewModel,
} from '../../src/components/workout/WorkoutPreviewModal';
import { useWorkoutStore } from '../../src/stores/workoutStore';
import { useSortedHistory } from '../../src/hooks/useSortedHistory';
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
  const { programs, templates } = useProgramStore();
  const { exercises } = useExerciseStore();

  const reducedMotion = useReducedMotion();
  const shouldAnimateEntrance = !reducedMotion;
  const fadeAnim = React.useRef(new Animated.Value(shouldAnimateEntrance ? 0 : 1)).current;
  const slideAnim = React.useRef(new Animated.Value(shouldAnimateEntrance ? 15 : 0)).current;
  const [previewModel, setPreviewModel] = React.useState<WorkoutPreviewModel | null>(null);

  const sessions = useSortedHistory();

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
        title: language === 'de' ? 'Laufendes Training' : 'Workout in Progress',
        message:
          language === 'de'
            ? 'Ein Training ist bereits aktiv. Möchtest du es verwerfen und stattdessen diese Vorlage starten?'
            : 'A workout is already active. Discard it and start this template instead?',
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
  const today = useLocalToday();

  // Robust Program Schedule Status
  const scheduleStatus = React.useMemo(
    () => getProgramScheduleStatus(activeProgram, templates, sessions, today),
    [activeProgram, templates, sessions, today],
  );

  // Determine featured template to show on Home dashboard
  const featuredProgramTemplate = React.useMemo(() => {
    if (!scheduleStatus.hasActiveProgram) return null;
    if (scheduleStatus.todayTemplate && !scheduleStatus.isTodayCompleted) {
      return scheduleStatus.todayTemplate;
    }
    // If today is completed or rest day, present next template if available
    return scheduleStatus.nextTemplate;
  }, [scheduleStatus]);

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
      // Open preview modal first instead of blindly starting the session
      const model = templateToPreviewModel(featuredProgramTemplate, exercises, {
        programId: activeProgram.id,
        programName: activeProgram.name,
        week: scheduleStatus.nextWorkoutWeek ?? scheduleStatus.currentWeek,
        dayOfWeek: scheduleStatus.nextWorkoutDayOfWeek,
      });
      setPreviewModel(model);
      return;
    }

    handleStartWorkout();
  };

  const handleSelectTemplate = (template: WorkoutTemplate) => {
    const model = templateToPreviewModel(template, exercises);
    setPreviewModel(model);
  };

  const handleConfirmStartFromModal = (model: WorkoutPreviewModel) => {
    const template =
      model.templateRef ||
      templates.find((t) => t.id === model.id) ||
      featuredProgramTemplate;
    setPreviewModel(null);
    if (template) {
      handleStartTemplate(template, model.programId);
    } else {
      handleStartWorkout();
    }
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
          week={scheduleStatus.currentWeek}
          durationWeeks={activeProgram?.durationWeeks}
          templates={sortedTemplates}
          activity={muscleVolumes}
          onStart={handleStartToday}
          onTemplate={handleSelectTemplate}
          resume={status === 'active' || status === 'paused'}
        />
      </Animated.View>

      {/* Shared Workout Template & Program Workout Preview Modal */}
      <WorkoutPreviewModal
        visible={previewModel !== null}
        model={previewModel}
        onClose={() => setPreviewModel(null)}
        onStart={handleConfirmStartFromModal}
      />
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
