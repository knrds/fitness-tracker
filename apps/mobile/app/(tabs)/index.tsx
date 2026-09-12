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
  useWindowDimensions,
} from 'react-native';
import { useRouter, Href } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import Svg, { Path, Circle, Text as SvgText } from 'react-native-svg';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { WorkoutTemplate, MuscleGroup, getMuscleActivity } from '@fitness-tracker/domain';
import { useWorkoutStore } from '../../src/stores/workoutStore';
import { useProfileStore } from '../../src/stores/profileStore';
import { useHistoryStore } from '../../src/stores/historyStore';
import { useAchievementStore } from '../../src/stores/achievementStore';
import { useProgramStore } from '../../src/stores/programStore';
import { useExerciseStore } from '../../src/stores/exerciseStore';
import { getLevelBadge } from '../../src/utils/level';
import { Button, Card, useTheme } from '@fitness-tracker/ui';
import { SyncIndicator } from '../../src/components/SyncIndicator';

export default function HomeScreen() {
  const router = useRouter();
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const { width: windowWidth } = useWindowDimensions();
  const isStacked = windowWidth < 480;
  const singleHeatmapWidth = isStacked ? 180 : 135;
  const singleHeatmapHeight = Math.round(singleHeatmapWidth * (235 / 140));

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

  const maxMuscleVolume = React.useMemo(
    () => Math.max(1, ...Object.values(muscleVolumes)),
    [muscleVolumes],
  );

  const getMuscleColor = (muscle: MuscleGroup) => {
    const vol = muscleVolumes[muscle] || 0;

    if (vol === 0) return '#151821';

    const intensity = Math.min(1, vol / maxMuscleVolume);
    if (intensity < 0.2) return 'rgba(144, 213, 255, 0.28)';
    if (intensity < 0.4) return 'rgba(144, 213, 255, 0.45)';
    if (intensity < 0.65) return 'rgba(95, 189, 255, 0.68)';
    if (intensity < 0.85) return 'rgba(95, 189, 255, 0.9)';
    return '#90D5FF';
  };

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

        <View style={styles.levelWrapper}>
          <View style={styles.levelHeaderRow}>
            <Text
              style={[styles.levelText, { color: theme.colors.text, ...theme.typography.caption }]}
              numberOfLines={1}
              ellipsizeMode="tail"
            >
              LEVEL {level} • {getLevelBadge(level).title} {getLevelBadge(level).icon}
            </Text>
            <Text
              style={[
                styles.xpTextInline,
                {
                  color: theme.colors.primary,
                  ...theme.typography.caption,
                },
              ]}
              numberOfLines={1}
            >
              {xp % 500} / 500 XP
            </Text>
          </View>
          <View style={[styles.xpBarBackground, { backgroundColor: theme.colors.border }]}>
            <View
              style={[
                styles.xpBarFill,
                { backgroundColor: theme.colors.primary, width: `${(xp % 500) / 5}%` },
              ]}
            />
          </View>
        </View>

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
                onPress={() => router.push('/programs')}
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
        <Card padding="md" style={styles.heatmapCard}>
          <Text style={[styles.heatmapSubtitle, { color: theme.colors.muted }]}>
            Completed working sets (last 7 days), including bodyweight exercises. Tap a region to
            find exercises.
          </Text>
          <View
            style={[
              styles.heatmapSvgContainer,
              isStacked ? styles.heatmapStacked : styles.heatmapRow,
            ]}
          >
            {/* FRONT silhouette SVG */}
            <Svg width={singleHeatmapWidth} height={singleHeatmapHeight} viewBox="0 0 140 235">
              {/* Label */}
              <SvgText
                x="70"
                y="222"
                fill={theme.colors.muted}
                fontSize="10"
                textAnchor="middle"
                fontFamily="SpaceGrotesk_700Bold"
              >
                FRONT
              </SvgText>

              {/* Front Silhouette outline / base body structure */}
              <Circle cx="70" cy="20" r="9" fill="#252833" stroke="#2A2B31" strokeWidth="1" />
              <Path
                d="M 67,26 L 67,31 C 67,34 62,35 56,35 C 50,35 44,38 42,42 C 40,48 34,64 32,84 C 30,94 29,102 31,106 C 32,109 35,109 36,105 C 38,100 40,84 43,68 C 45,64 49,60 51,68 C 53,74 54,84 51,94 C 49,102 48,124 48,144 C 48,160 51,180 54,200 L 65,200 C 64,185 62,160 62,140 C 62,125 64,115 67,106 L 70,106 L 73,106 C 76,115 78,125 78,140 C 78,160 76,185 75,200 L 86,200 C 89,180 92,160 92,144 C 92,124 91,102 89,94 C 86,84 87,74 89,68 C 91,60 95,64 97,68 C 100,84 102,100 104,105 C 105,109 108,109 109,106 C 111,102 110,94 108,84 C 106,64 100,48 98,42 C 96,38 90,35 84,35 C 78,35 73,34 73,31 L 73,26 Z"
                fill="#252833"
                stroke="#2A2B31"
                strokeWidth="1"
              />

              {/* Chest */}
              <Path
                d="M70,35 L54,35 Q53,51 70,51 Z"
                fill={getMuscleColor(MuscleGroup.Chest)}
                stroke="#0B0B0F"
                strokeWidth="0.8"
                onPress={() => handleMusclePress(MuscleGroup.Chest)}
              />
              <Path
                d="M70,35 L86,35 Q87,51 70,51 Z"
                fill={getMuscleColor(MuscleGroup.Chest)}
                stroke="#0B0B0F"
                strokeWidth="0.8"
                onPress={() => handleMusclePress(MuscleGroup.Chest)}
              />

              {/* Shoulders */}
              <Path
                d="M54,34 Q43,36 41,45 Q43,54 52,48 Z"
                fill={getMuscleColor(MuscleGroup.FrontDelts)}
                stroke="#0B0B0F"
                strokeWidth="0.8"
                onPress={() => handleMusclePress(MuscleGroup.FrontDelts)}
              />
              <Path
                d="M86,34 Q97,36 99,45 Q97,54 88,48 Z"
                fill={getMuscleColor(MuscleGroup.FrontDelts)}
                stroke="#0B0B0F"
                strokeWidth="0.8"
                onPress={() => handleMusclePress(MuscleGroup.FrontDelts)}
              />

              {/* Biceps */}
              <Path
                d="M41,46 Q34,55 38,68 Q44,72 48,58 Z"
                fill={getMuscleColor(MuscleGroup.Biceps)}
                stroke="#0B0B0F"
                strokeWidth="0.8"
                onPress={() => handleMusclePress(MuscleGroup.Biceps)}
              />
              <Path
                d="M99,46 Q106,55 102,68 Q96,72 92,58 Z"
                fill={getMuscleColor(MuscleGroup.Biceps)}
                stroke="#0B0B0F"
                strokeWidth="0.8"
                onPress={() => handleMusclePress(MuscleGroup.Biceps)}
              />

              {/* Forearms */}
              <Path
                d="M38,69 Q31,94 36,108 Q41,108 43,84 Z"
                fill={getMuscleColor(MuscleGroup.Forearms)}
                stroke="#0B0B0F"
                strokeWidth="0.8"
                onPress={() => handleMusclePress(MuscleGroup.Forearms)}
              />
              <Path
                d="M102,69 Q109,94 104,108 Q99,108 97,84 Z"
                fill={getMuscleColor(MuscleGroup.Forearms)}
                stroke="#0B0B0F"
                strokeWidth="0.8"
                onPress={() => handleMusclePress(MuscleGroup.Forearms)}
              />

              {/* Abs */}
              <Path
                d="M55,52 L85,52 Q83,86 70,88 Q57,86 55,52 Z"
                fill={getMuscleColor(MuscleGroup.Abs)}
                stroke="#0B0B0F"
                strokeWidth="0.8"
                onPress={() => handleMusclePress(MuscleGroup.Abs)}
              />

              {/* Obliques */}
              <Path
                d="M49,52 L54,52 Q56,86 51,86 Q48,70 49,52 Z"
                fill={getMuscleColor(MuscleGroup.Obliques)}
                stroke="#0B0B0F"
                strokeWidth="0.8"
                onPress={() => handleMusclePress(MuscleGroup.Obliques)}
              />
              <Path
                d="M91,52 L86,52 Q84,86 89,86 Q92,70 91,52 Z"
                fill={getMuscleColor(MuscleGroup.Obliques)}
                stroke="#0B0B0F"
                strokeWidth="0.8"
                onPress={() => handleMusclePress(MuscleGroup.Obliques)}
              />

              {/* Quads */}
              <Path
                d="M54,90 L69,90 Q67,136 53,136 Q48,118 54,90 Z"
                fill={getMuscleColor(MuscleGroup.Quads)}
                stroke="#0B0B0F"
                strokeWidth="0.8"
                onPress={() => handleMusclePress(MuscleGroup.Quads)}
              />
              <Path
                d="M71,90 L86,90 Q92,118 87,136 Q73,136 71,90 Z"
                fill={getMuscleColor(MuscleGroup.Quads)}
                stroke="#0B0B0F"
                strokeWidth="0.8"
                onPress={() => handleMusclePress(MuscleGroup.Quads)}
              />

              {/* Calves (Front) */}
              <Path
                d="M49,142 Q49,170 54,195 L63,195 Q62,170 62,140 Z"
                fill={getMuscleColor(MuscleGroup.Calves)}
                stroke="#0B0B0F"
                strokeWidth="0.8"
                onPress={() => handleMusclePress(MuscleGroup.Calves)}
              />
              <Path
                d="M91,142 Q91,170 86,195 L77,195 Q78,170 78,140 Z"
                fill={getMuscleColor(MuscleGroup.Calves)}
                stroke="#0B0B0F"
                strokeWidth="0.8"
                onPress={() => handleMusclePress(MuscleGroup.Calves)}
              />
            </Svg>

            {/* BACK silhouette SVG */}
            <Svg width={singleHeatmapWidth} height={singleHeatmapHeight} viewBox="150 0 140 235">
              {/* Label */}
              <SvgText
                x="220"
                y="222"
                fill={theme.colors.muted}
                fontSize="10"
                textAnchor="middle"
                fontFamily="SpaceGrotesk_700Bold"
              >
                BACK
              </SvgText>

              {/* Head */}
              <Circle cx="220" cy="20" r="9" fill="#252833" stroke="#2A2B31" strokeWidth="1" />
              {/* Base Body Silhouette */}
              <Path
                d="M 217,26 L 217,31 C 217,34 212,35 206,35 C 200,35 194,38 192,42 C 190,48 184,64 182,84 C 180,94 179,102 181,106 C 182,109 185,109 186,105 C 188,100 190,84 193,68 C 195,64 199,60 201,68 C 203,74 204,84 201,94 C 199,102 198,124 198,144 C 198,160 201,180 204,200 L 215,200 C 214,185 212,160 212,140 C 212,125 214,115 217,106 L 220,106 L 223,106 C 226,115 228,125 228,140 C 228,160 226,185 225,200 L 236,200 C 239,180 242,160 242,144 C 242,124 241,102 239,94 C 236,84 237,84 239,68 C 241,60 245,64 247,68 C 250,84 252,100 254,105 C 255,109 258,109 259,106 C 261,102 260,94 258,84 C 256,64 250,48 248,42 C 246,38 240,35 234,35 C 228,35 223,34 223,31 L 223,26 Z"
                fill="#252833"
                stroke="#2A2B31"
                strokeWidth="1"
              />

              {/* Traps */}
              <Path
                d="M220,28 L212,34 Q204,36 210,48 L230,48 Q236,36 228,34 Z"
                fill={getMuscleColor(MuscleGroup.Traps)}
                stroke="#0B0B0F"
                strokeWidth="0.8"
                onPress={() => handleMusclePress(MuscleGroup.Traps)}
              />

              {/* Upper Back / Lats */}
              <Path
                d="M220,49 L204,49 Q198,66 211,78 L220,78 Z"
                fill={getMuscleColor(MuscleGroup.Lats)}
                stroke="#0B0B0F"
                strokeWidth="0.8"
                onPress={() => handleMusclePress(MuscleGroup.Lats)}
              />
              <Path
                d="M220,49 L236,49 Q242,66 229,78 L220,78 Z"
                fill={getMuscleColor(MuscleGroup.Lats)}
                stroke="#0B0B0F"
                strokeWidth="0.8"
                onPress={() => handleMusclePress(MuscleGroup.Lats)}
              />

              {/* Lower Back */}
              <Path
                d="M211,79 L229,79 Q227,93 220,95 Q213,93 211,79 Z"
                fill={getMuscleColor(MuscleGroup.LowerBack)}
                stroke="#0B0B0F"
                strokeWidth="0.8"
                onPress={() => handleMusclePress(MuscleGroup.LowerBack)}
              />

              {/* Rear Delts */}
              <Path
                d="M204,34 Q193,36 191,45 Q193,54 202,48 Z"
                fill={getMuscleColor(MuscleGroup.RearDelts)}
                stroke="#0B0B0F"
                strokeWidth="0.8"
                onPress={() => handleMusclePress(MuscleGroup.RearDelts)}
              />
              <Path
                d="M236,34 Q247,36 249,45 Q247,54 238,48 Z"
                fill={getMuscleColor(MuscleGroup.RearDelts)}
                stroke="#0B0B0F"
                strokeWidth="0.8"
                onPress={() => handleMusclePress(MuscleGroup.RearDelts)}
              />

              {/* Triceps */}
              <Path
                d="M191,46 Q184,55 188,68 Q194,72 198,58 Z"
                fill={getMuscleColor(MuscleGroup.Triceps)}
                stroke="#0B0B0F"
                strokeWidth="0.8"
                onPress={() => handleMusclePress(MuscleGroup.Triceps)}
              />
              <Path
                d="M249,46 Q256,55 252,68 Q246,72 242,58 Z"
                fill={getMuscleColor(MuscleGroup.Triceps)}
                stroke="#0B0B0F"
                strokeWidth="0.8"
                onPress={() => handleMusclePress(MuscleGroup.Triceps)}
              />

              {/* Forearms (Back) */}
              <Path
                d="M188,69 Q181,94 186,108 Q191,108 193,84 Z"
                fill={getMuscleColor(MuscleGroup.Forearms)}
                stroke="#0B0B0F"
                strokeWidth="0.8"
                onPress={() => handleMusclePress(MuscleGroup.Forearms)}
              />
              <Path
                d="M252,69 Q259,94 254,108 Q249,108 247,84 Z"
                fill={getMuscleColor(MuscleGroup.Forearms)}
                stroke="#0B0B0F"
                strokeWidth="0.8"
                onPress={() => handleMusclePress(MuscleGroup.Forearms)}
              />

              {/* Glutes */}
              <Path
                d="M202,94 L220,94 L220,114 Q210,116 200,110 Z"
                fill={getMuscleColor(MuscleGroup.Glutes)}
                stroke="#0B0B0F"
                strokeWidth="0.8"
                onPress={() => handleMusclePress(MuscleGroup.Glutes)}
              />
              <Path
                d="M220,94 L238,94 Q240,110 230,116 L220,114 Z"
                fill={getMuscleColor(MuscleGroup.Glutes)}
                stroke="#0B0B0F"
                strokeWidth="0.8"
                onPress={() => handleMusclePress(MuscleGroup.Glutes)}
              />

              {/* Hamstrings */}
              <Path
                d="M201,113 Q217,115 218,150 Q205,150 200,132 Z"
                fill={getMuscleColor(MuscleGroup.Hamstrings)}
                stroke="#0B0B0F"
                strokeWidth="0.8"
                onPress={() => handleMusclePress(MuscleGroup.Hamstrings)}
              />
              <Path
                d="M239,113 Q223,115 222,150 Q235,150 240,132 Z"
                fill={getMuscleColor(MuscleGroup.Hamstrings)}
                stroke="#0B0B0F"
                strokeWidth="0.8"
                onPress={() => handleMusclePress(MuscleGroup.Hamstrings)}
              />

              {/* Calves */}
              <Path
                d="M201,152 Q214,152 212,185 Q206,192 203,185 Z"
                fill={getMuscleColor(MuscleGroup.Calves)}
                stroke="#0B0B0F"
                strokeWidth="0.8"
                onPress={() => handleMusclePress(MuscleGroup.Calves)}
              />
              <Path
                d="M239,152 Q226,152 228,185 Q234,192 237,185 Z"
                fill={getMuscleColor(MuscleGroup.Calves)}
                stroke="#0B0B0F"
                strokeWidth="0.8"
                onPress={() => handleMusclePress(MuscleGroup.Calves)}
              />
            </Svg>
          </View>
        </Card>
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
