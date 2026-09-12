import { useFocusScroll } from '../../src/hooks/useFocusScroll';
import { scopedAlert as Alert } from '../../src/utils/scopedAlert';
import React from 'react';
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  Pressable,
  Image,
  Animated,
  Platform,
  Modal,
} from 'react-native';
import { useRouter, Href } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { MuscleHeatmap } from '../../src/components/MuscleHeatmap';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { WorkoutTemplate, getMuscleActivity } from '@fitness-tracker/domain';
import { useWorkoutStore } from '../../src/stores/workoutStore';
import { useProfileStore } from '../../src/stores/profileStore';
import { useHistoryStore } from '../../src/stores/historyStore';
import { useAchievementStore } from '../../src/stores/achievementStore';
import { useProgramStore } from '../../src/stores/programStore';
import { useExerciseStore } from '../../src/stores/exerciseStore';
import { LevelProgress } from '../../src/components/LevelProgress';
import { Button, Card, useTheme } from '@fitness-tracker/ui';
import { SyncIndicator } from '../../src/components/SyncIndicator';

export default function HomeScreen() {
  const scrollRef = useFocusScroll();
  const router = useRouter();
  const theme = useTheme();
  const insets = useSafeAreaInsets();

  const { startWorkout, startWorkoutFromTemplate, status } = useWorkoutStore();
  const { profile } = useProfileStore();
  const { getStreak, getSessionsByDateDesc } = useHistoryStore();
  const { level, xp } = useAchievementStore();
  const { programs, templates } = useProgramStore();
  const { exercises } = useExerciseStore();

  const shouldAnimateEntrance = Platform.OS !== 'web';
  const fadeAnim = React.useRef(new Animated.Value(shouldAnimateEntrance ? 0 : 1)).current;
  const slideAnim = React.useRef(new Animated.Value(shouldAnimateEntrance ? 20 : 0)).current;
  const [selectedTemplate, setSelectedTemplate] = React.useState<WorkoutTemplate | null>(null);

  const sessions = getSessionsByDateDesc();

  const sortedTemplates = React.useMemo(() => {
    return [...templates].sort((a, b) => {
      const lastSessionA = sessions.find((s) => s.templateId === a.id);
      const lastSessionB = sessions.find((s) => s.templateId === b.id);
      const timeA = lastSessionA ? new Date(lastSessionA.startedAt).getTime() : 0;
      const timeB = lastSessionB ? new Date(lastSessionB.startedAt).getTime() : 0;
      if (timeA === 0 && timeB === 0) {
        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      }
      return timeB - timeA;
    });
  }, [templates, sessions]);

  const muscleVolumes = React.useMemo(() => {
    const since = new Date();
    since.setDate(since.getDate() - 6);
    since.setHours(0, 0, 0, 0);
    return getMuscleActivity(sessions, exercises, since);
  }, [sessions, exercises]);

  const handleMusclePress = (muscle: string) => {
    router.push({
      pathname: '/body',
      params: { tab: 'exercises', muscle },
    });
  };

  const handleStartTemplate = (template: WorkoutTemplate, programId?: string) => {
    const start = () => {
      startWorkoutFromTemplate(template, programId);
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

  React.useEffect(() => {
    if (!shouldAnimateEntrance) return;

    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 500,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 500,
        useNativeDriver: true,
      }),
    ]).start();
  }, [fadeAnim, shouldAnimateEntrance, slideAnim]);

  const streak = getStreak();
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
  const featuredExerciseNames =
    featuredProgramTemplate?.exercises
      .map(
        (templateExercise) =>
          exercises.find((exercise) => exercise.id === templateExercise.exerciseId)?.name,
      )
      .filter((name): name is string => Boolean(name))
      .slice(0, 5) ?? [];
  const additionalExerciseCount =
    (featuredProgramTemplate?.exercises.length ?? 0) - featuredExerciseNames.length;

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

  // Profile avatar initials
  const initials = (profile.displayName || 'U')
    .split(' ')
    .map((w) => w.charAt(0))
    .join('')
    .toUpperCase()
    .slice(0, 2);

  // Logic for Weekly Consistency Chart
  const last7Days = Array.from({ length: 7 }).map((_, i) => {
    const d = new Date(today);
    d.setDate(today.getDate() - 3 + i);
    d.setHours(0, 0, 0, 0);
    return d;
  });

  const getIsDayTrained = (date: Date) => {
    return sessions.some((s) => {
      const sessionDate = new Date(s.startedAt);
      return (
        sessionDate.getDate() === date.getDate() &&
        sessionDate.getMonth() === date.getMonth() &&
        sessionDate.getFullYear() === date.getFullYear()
      );
    });
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
      <Animated.View style={{ opacity: fadeAnim, transform: [{ translateY: slideAnim }], gap: 16 }}>
        {/* Top Header */}
        <View style={styles.headerRow}>
          {/* Profile Avatar & Name */}
          <Pressable
            style={styles.headerLeft}
            onPress={() => router.push('/profile' as Href)}
            accessibilityLabel="View profile"
          >
            {profile.profileImageUri ? (
              <Image
                source={{ uri: profile.profileImageUri }}
                style={[styles.avatar, { borderColor: theme.colors.primary }]}
              />
            ) : (
              <View
                style={[
                  styles.avatar,
                  styles.avatarFallback,
                  { borderColor: theme.colors.primary, backgroundColor: theme.colors.surface },
                ]}
              >
                <Text style={[styles.avatarInitials, { color: theme.colors.primary }]}>
                  {initials}
                </Text>
              </View>
            )}
            <View>
              <Text
                style={[{ color: theme.colors.muted, marginBottom: 2 }, theme.typography.caption]}
              >
                READY TO GRIND,
              </Text>
              <Text style={[{ color: theme.colors.text }, theme.typography.heading]}>
                {profile.displayName || 'ATHLETE'}
              </Text>
            </View>
          </Pressable>
          <View style={styles.headerRight}>
            <SyncIndicator />
            <View style={styles.readinessContainer}>
              <Text
                style={[
                  { color: theme.colors.primary, fontSize: 32, lineHeight: 36 },
                  theme.typography.display,
                ]}
              >
                {streak}
              </Text>
              <Text style={[{ color: theme.colors.muted }, theme.typography.caption]}>
                STREAK 🔥
              </Text>
            </View>
          </View>
        </View>

        <LevelProgress level={level} xp={xp} />

        {/* "Today" Card */}
        <Text
          style={[
            { color: theme.colors.text, fontSize: 20, marginTop: 16, marginBottom: 16 },
            theme.typography.heading,
          ]}
        >
          TODAY
        </Text>
        <Card style={[styles.todayCard, { marginBottom: 20 }]} padding="md">
          {activeProgram ? (
            <View style={styles.todayDetails}>
              <Text
                style={[
                  { color: theme.colors.text, fontSize: 18, marginBottom: 4 },
                  theme.typography.heading,
                ]}
                numberOfLines={2}
              >
                {featuredProgramTemplate?.name || 'Program Rest Day'}
              </Text>
              <Text style={[styles.todayMetaText, { color: theme.colors.muted }]}>
                Week {currentProgramWeek} - {activeProgram.name}
              </Text>
              {featuredProgramTemplate ? (
                <View style={styles.todayExerciseList}>
                  {featuredExerciseNames.map((name) => (
                    <View
                      key={name}
                      style={[
                        styles.todayExerciseChip,
                        { borderColor: theme.colors.border, backgroundColor: theme.colors.surface },
                      ]}
                    >
                      <Text
                        style={[styles.todayExerciseChipText, { color: theme.colors.text }]}
                        numberOfLines={1}
                        ellipsizeMode="tail"
                      >
                        {name}
                      </Text>
                    </View>
                  ))}
                  {additionalExerciseCount > 0 && (
                    <Text style={[styles.todayMoreText, { color: theme.colors.muted }]}>
                      +{additionalExerciseCount} more
                    </Text>
                  )}
                </View>
              ) : (
                <Text style={[styles.todayBodyText, { color: theme.colors.muted }]}>
                  No scheduled workout today. Start a free session or review your program.
                </Text>
              )}
            </View>
          ) : (
            <View style={styles.todayDetails}>
              <Text
                style={[
                  { color: theme.colors.text, fontSize: 18, marginBottom: 4 },
                  theme.typography.heading,
                ]}
              >
                FREE TRAINING
              </Text>
              <Text style={[{ color: theme.colors.muted, ...theme.typography.body }]}>
                No program active. Time to build the baseline.
              </Text>
            </View>
          )}
          <View style={{ flexDirection: 'row', gap: 10 }}>
            <Button
              title={
                status === 'active' || status === 'paused'
                  ? 'RESUME'
                  : featuredProgramTemplate
                    ? 'START TODAY'
                    : 'START'
              }
              variant="primary"
              onPress={handleStartToday}
              style={{ flex: 1, height: 46 }}
            />
            {!activeProgram && (
              <Button
                title="PROGRAMS"
                variant="ghost"
                onPress={() =>
                  router.navigate({ pathname: '/workouts', params: { tab: 'programs' } })
                }
                style={{ flex: 1, height: 46, borderWidth: 1, borderColor: theme.colors.border }}
              />
            )}
          </View>
        </Card>

        {/* Saved Workouts (Templates) */}
        {templates.length > 0 && (
          <>
            <Text
              style={[
                { color: theme.colors.text, fontSize: 20, marginTop: 16, marginBottom: 16 },
                theme.typography.heading,
              ]}
            >
              SAVED WORKOUTS
            </Text>
            <View style={{ gap: 12, marginBottom: 16 }}>
              {sortedTemplates.slice(0, 4).map((template) => {
                const exerciseNames = template.exercises
                  .map((te) => exercises.find((e) => e.id === te.exerciseId)?.name)
                  .filter(Boolean)
                  .join(', ');

                const totalSets = template.exercises.reduce((sum, ex) => sum + ex.targetSets, 0);

                return (
                  <Card
                    key={template.id}
                    padding="md"
                    onPress={() => setSelectedTemplate(template)}
                    style={styles.recentActivityCard}
                  >
                    <View style={styles.recentActivityHeader}>
                      <Text
                        style={[
                          {
                            color: theme.colors.text,
                            ...theme.typography.body,
                            fontWeight: 'bold',
                          },
                        ]}
                      >
                        {template.name}
                      </Text>
                    </View>
                    <Text
                      style={[
                        {
                          color: theme.colors.muted,
                          fontSize: 14,
                          fontFamily: 'Manrope_500Medium',
                          marginVertical: 6,
                        },
                      ]}
                      numberOfLines={2}
                      ellipsizeMode="tail"
                    >
                      {exerciseNames || `${template.exercises.length} Exercises`}
                    </Text>
                    <View style={{ flexDirection: 'row', gap: 16, marginTop: 4 }}>
                      <Text style={[{ color: theme.colors.muted }, theme.typography.caption]}>
                        Exercises:{' '}
                        <Text style={{ color: theme.colors.text }}>
                          {template.exercises.length}
                        </Text>
                      </Text>
                      <Text style={[{ color: theme.colors.muted }, theme.typography.caption]}>
                        Sets: <Text style={{ color: theme.colors.text }}>{totalSets}</Text>
                      </Text>
                    </View>
                  </Card>
                );
              })}
            </View>
          </>
        )}

        {/* Weekly Consistency */}
        <Text
          style={[
            { color: theme.colors.text, fontSize: 20, marginTop: 16, marginBottom: 16 },
            theme.typography.heading,
          ]}
        >
          CONSISTENCY
        </Text>
        <Card padding="md" style={styles.consistencyCard}>
          <View style={styles.weekContainer}>
            {last7Days.map((date, idx) => {
              const isToday = date.toDateString() === today.toDateString();
              const isTrained = getIsDayTrained(date);
              return (
                <View key={idx} style={styles.dayColumn}>
                  <View
                    style={[
                      styles.dayCircle,
                      isTrained
                        ? { backgroundColor: theme.colors.primary }
                        : {
                            backgroundColor: 'transparent',
                            borderColor: theme.colors.border,
                            borderWidth: 2,
                          },
                      isToday && {
                        borderColor: '#ffffff',
                        borderWidth: 2,
                        shadowColor: theme.colors.primary,
                        shadowOffset: { width: 0, height: 0 },
                        shadowOpacity: 0.8,
                        shadowRadius: 6,
                        elevation: 5,
                        ...(!isTrained && { backgroundColor: 'rgba(144, 213, 255, 0.15)' }),
                      },
                    ]}
                  >
                    {isTrained && (
                      <Ionicons name="checkmark" size={14} color={theme.colors.background} />
                    )}
                  </View>
                  <Text
                    style={[
                      { ...theme.typography.caption, fontSize: 10, marginTop: 8 },
                      { color: isToday ? theme.colors.primary : theme.colors.muted },
                      isToday && { fontFamily: 'SpaceGrotesk_700Bold', fontWeight: 'bold' },
                    ]}
                    numberOfLines={1}
                  >
                    {['S', 'M', 'T', 'W', 'T', 'F', 'S'][date.getDay()]}
                  </Text>
                </View>
              );
            })}
          </View>
        </Card>

        {/* Muscle Heatmap */}
        <Text
          style={[
            { color: theme.colors.text, fontSize: 20, marginTop: 16, marginBottom: 16 },
            theme.typography.heading,
          ]}
        >
          MUSCLE HEATMAP
        </Text>
        <MuscleHeatmap activity={muscleVolumes} onSelect={handleMusclePress} />
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
                          {exInfo?.name || 'Unknown'}
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

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    padding: 24,
    width: '100%',
    maxWidth: 1040,
    alignSelf: 'center',
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    flex: 1,
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    borderWidth: 2,
  },
  avatarFallback: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarInitials: {
    fontFamily: 'SpaceGrotesk_700Bold',
    fontSize: 18,
  },
  readinessContainer: {
    alignItems: 'flex-end',
  },
  levelWrapper: {
    marginBottom: 24,
  },
  levelHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 12,
    marginBottom: 8,
  },
  levelText: {
    flex: 1,
    minWidth: 0,
  },
  xpTextInline: {
    fontFamily: 'SpaceGrotesk_700Bold',
    flexShrink: 0,
    minWidth: 86,
    textAlign: 'right',
  },
  xpBarBackground: {
    height: 8,
    borderRadius: 4,
    overflow: 'hidden',
  },
  xpBarFill: {
    height: '100%',
  },
  todayCard: {
    marginBottom: 32,
  },
  todayDetails: {
    marginBottom: 14,
  },
  todayMetaText: {
    fontFamily: 'Manrope_500Medium',
    fontSize: 13,
    lineHeight: 18,
    marginBottom: 12,
  },
  todayBodyText: {
    fontFamily: 'Manrope_500Medium',
    fontSize: 14,
    lineHeight: 20,
  },
  todayExerciseList: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  todayExerciseChip: {
    maxWidth: '100%',
    minHeight: 30,
    borderRadius: 8,
    borderWidth: 1,
    justifyContent: 'center',
    paddingHorizontal: 10,
  },
  todayExerciseChipText: {
    fontFamily: 'Manrope_600SemiBold',
    fontSize: 12,
    lineHeight: 16,
  },
  todayMoreText: {
    alignSelf: 'center',
    fontFamily: 'SpaceGrotesk_700Bold',
    fontSize: 12,
    lineHeight: 16,
  },
  consistencyCard: {
    marginBottom: 32,
  },
  weekContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 6,
  },
  dayColumn: {
    alignItems: 'center',
    flex: 1,
    minWidth: 0,
  },
  dayCircle: {
    width: 26,
    height: 26,
    borderRadius: 13,
    justifyContent: 'center',
    alignItems: 'center',
  },
  recentActivityCard: {
    marginBottom: 16,
  },
  recentActivityHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
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
  heatmapCard: {
    marginBottom: 32,
    borderWidth: 1,
    borderColor: '#2A2B31',
  },
  heatmapSubtitle: {
    fontSize: 12,
    fontFamily: 'Manrope_500Medium',
    lineHeight: 16,
    marginBottom: 16,
  },
  heatmapSvgContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
  },
  heatmapRow: {
    flexDirection: 'row',
    gap: 16,
  },
  heatmapStacked: {
    flexDirection: 'column',
    gap: 24,
  },
});
