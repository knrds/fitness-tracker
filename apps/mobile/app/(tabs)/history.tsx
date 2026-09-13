import { SegmentedControl } from '@fitness-tracker/ui';
import { Theme, useThemeStyles, withAlpha } from '@fitness-tracker/ui';
import { useReducedMotion } from 'react-native-reanimated';
import { useFocusScroll } from '../../src/hooks/useFocusScroll';
import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  Pressable,
  ScrollView,
  useWindowDimensions,
  Modal,
  Animated,
  Platform,
  TextInput,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useRouter } from 'expo-router';
import { LineChart } from 'react-native-chart-kit';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';

import {
  ExerciseSet,
  SessionExercise,
  WorkoutSession,
  ACHIEVEMENTS,
  formatDateLocal,
  getExerciseProgressHistory,
  summarizeSessionExercise,
  summarizeWorkout,
} from '@fitness-tracker/domain';

import { useHistoryStore } from '../../src/stores/historyStore';
import { useExerciseStore } from '../../src/stores/exerciseStore';
import { matchesExerciseSearch } from '../../src/utils/exerciseSearch';
import { useAchievementStore } from '../../src/stores/achievementStore';
import { useAchievementCheck } from '../../src/hooks/useAchievementCheck';
import { useProfileStore } from '../../src/stores/profileStore';
import { useTheme, Card, EmptyState } from '@fitness-tracker/ui';
import { LevelProgress } from '../../src/components/LevelProgress';
import { HorizontalFadeScroll } from '../../src/components/HorizontalFadeScroll';
import { VerticalFadeScroll } from '../../src/components/VerticalFadeScroll';

export default function HistoryScreen() {
  const [activeTab, setActiveTab] = useState<'history' | 'progress' | 'achievements'>('history');
  const theme = useTheme();
  const styles = useThemeStyles(createStyles);
  const insets = useSafeAreaInsets();

  return (
    <View
      style={[
        styles.container,
        { backgroundColor: theme.colors.background, paddingTop: Math.max(insets.top, 16) },
      ]}
    >
      <View style={styles.header}>
        <Text
          style={[styles.headerTitle, { color: theme.colors.text, ...theme.typography.heading }]}
        >
          Activity
        </Text>
      </View>
      <SegmentedControl
        label="Activity views"
        value={activeTab}
        onChange={setActiveTab}
        options={[
          { value: 'history', label: 'History' },
          { value: 'progress', label: 'Progress' },
          { value: 'achievements', label: 'Achievements' },
        ]}
      />
      {activeTab === 'history' ? (
        <HistoryView />
      ) : activeTab === 'progress' ? (
        <ProgressView />
      ) : (
        <AchievementsView />
      )}
    </View>
  );
}

function HistoryView() {
  const scrollRef = useFocusScroll<FlatList<WorkoutSession>>();
  const router = useRouter();
  const theme = useTheme();
  const styles = useThemeStyles(createStyles);
  const insets = useSafeAreaInsets();
  const { exercises: allExercises } = useExerciseStore();
  const profile = useProfileStore((state) => state.profile);
  const isImperial = profile?.preferredUnits === 'imperial';
  useHistoryStore((state) => state.sessions);
  const { getSessionsByDateDesc } = useHistoryStore();
  const sessions = getSessionsByDateDesc();
  const [selectedSession, setSelectedSession] = useState<WorkoutSession | null>(null);
  const [selectedDateKey, setSelectedDateKey] = useState<string | null>(null);

  const sessionsByDate = React.useMemo(() => {
    return sessions.reduce<Record<string, WorkoutSession[]>>((acc, session) => {
      const key = formatDateLocal(new Date(session.startedAt));
      if (!acc[key]) acc[key] = [];
      acc[key]!.push(session);
      return acc;
    }, {});
  }, [sessions]);

  const selectedDateSessions = selectedDateKey ? (sessionsByDate[selectedDateKey] ?? []) : [];

  const getVolumeFunFact = (volumeKg: number): string => {
    const displayVol = isImperial ? Math.round(volumeKg * 2.20462) : Math.round(volumeKg);
    const unit = isImperial ? 'lbs' : 'kg';

    if (volumeKg <= 0) return `You completed a session!`;

    if (volumeKg < 100) {
      const p = (displayVol / (isImperial ? 22 : 10)).toFixed(1).replace(/\.0$/, '');
      return `You lifted ${displayVol} ${unit}! That's equivalent to the weight of ${p} adult house cats. 🐱`;
    }
    if (volumeKg < 300) {
      const p = (displayVol / (isImperial ? 110 : 50)).toFixed(1).replace(/\.0$/, '');
      return `You lifted ${displayVol} ${unit}! That's about the weight of ${p} heavy punching bags. 🥊`;
    }
    if (volumeKg < 800) {
      const pStr = (displayVol / (isImperial ? 330 : 150)).toFixed(1).replace(/\.0$/, '');
      return `You lifted ${displayVol} ${unit}! That's equivalent to the weight of ${pStr} classic Vespa scooters. 🛵`;
    }
    if (volumeKg < 1500) {
      const pStr = (displayVol / (isImperial ? 1100 : 500)).toFixed(1).replace(/\.0$/, '');
      return `You lifted ${displayVol} ${unit}! That's about the weight of ${pStr} grand pianos. 🎹`;
    }
    if (volumeKg < 3000) {
      const pStr = (displayVol / (isImperial ? 2200 : 1000)).toFixed(1).replace(/\.0$/, '');
      return `You lifted ${displayVol} ${unit}! That's equivalent to the weight of ${pStr} saltwater crocodiles. 🐊`;
    }
    if (volumeKg < 6000) {
      const pStr = (displayVol / (isImperial ? 4400 : 2000)).toFixed(1).replace(/\.0$/, '');
      return `You lifted ${displayVol} ${unit}! That's about the weight of ${pStr} hippopotamuses. 🦛`;
    }
    if (volumeKg < 12000) {
      const pStr = (displayVol / (isImperial ? 11000 : 5000)).toFixed(1).replace(/\.0$/, '');
      return `You lifted ${displayVol} ${unit}! That's equivalent to the weight of ${pStr} fully grown African elephants. 🐘`;
    }
    const pStr = (displayVol / (isImperial ? 26400 : 12000)).toFixed(1).replace(/\.0$/, '');
    return `You lifted ${displayVol} ${unit}! That's about the weight of ${pStr} double-decker buses! 🚌 Absolutely massive!`;
  };

  const formatDate = (date: Date) => {
    return new Intl.DateTimeFormat('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
    }).format(new Date(date));
  };

  const formatDuration = (seconds?: number) => {
    if (!seconds) return '--:--';
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    if (h > 0) return `${h}h ${m}m`;
    return `${m}m`;
  };

  const formatSetDuration = (seconds?: number) => {
    if (!seconds) return null;
    const minutes = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${minutes}:${secs.toString().padStart(2, '0')}`;
  };

  const formatDistance = (meters?: number) => {
    if (!meters) return null;
    if (isImperial) {
      const miles = meters / 1609.344;
      return `${miles.toFixed(miles >= 10 ? 1 : 2)} mi`;
    }
    if (meters >= 1000) return `${(meters / 1000).toFixed(2)} km`;
    return `${Math.round(meters)} m`;
  };

  const formatWeight = (weight?: number) => {
    if (weight === undefined || weight === 0) return 'BW';
    const converted = isImperial ? weight * 2.20462 : weight;
    return `${converted.toFixed(1).replace(/\.0$/, '')} ${isImperial ? 'lbs' : 'kg'}`;
  };

  const getSetBadge = (set: ExerciseSet) => {
    if (set.type === 'warmup') return `W${set.setNumber}`;
    if (set.type === 'drop') return `D${set.setNumber}`;
    if (set.type === 'failure') return `F${set.setNumber}`;
    if (set.type === 'amrap') return `A${set.setNumber}`;
    if (set.type === 'backoff') return `B${set.setNumber}`;
    return `${set.setNumber}`;
  };

  const formatSetPerformance = (set: ExerciseSet, sessionExercise: SessionExercise) => {
    const exerciseDef = allExercises.find((exercise) => exercise.id === sessionExercise.exerciseId);
    const isCardio =
      exerciseDef?.movementPattern === 'cardio' || exerciseDef?.equipment === 'cardio_machine';
    const details: string[] = [];

    if (isCardio) {
      if (set.weight !== undefined) details.push(`Level ${set.weight}`);
      const duration = formatSetDuration(set.durationSeconds);
      const distance = formatDistance(set.distanceMeters);
      if (duration) details.push(duration);
      if (distance) details.push(distance);
      if (set.reps !== undefined && set.reps > 0) details.push(`${set.reps} reps`);
    } else {
      details.push(`${formatWeight(set.weight)} x ${set.reps ?? '-'}`);
    }

    if (set.rpe !== undefined) details.push(`RPE ${set.rpe}`);
    if (set.rir !== undefined) details.push(`RIR ${set.rir}`);

    return details.length > 0 ? details.join(' | ') : 'No values logged';
  };

  const getExerciseVolumeLabel = (sessionExercise: SessionExercise) => {
    const summary = summarizeSessionExercise(sessionExercise);
    const displayVolume = isImperial
      ? Math.round(summary.totalVolume * 2.20462)
      : Math.round(summary.totalVolume);
    const volumeUnit = isImperial ? 'lbs' : 'kg';

    return `${summary.workingSetCount} working set${
      summary.workingSetCount === 1 ? '' : 's'
    } | ${displayVolume.toLocaleString()} ${volumeUnit}`;
  };

  const renderSessionExerciseBreakdown = (session: WorkoutSession) => (
    <VerticalFadeScroll
      style={styles.summaryExerciseList}
      contentContainerStyle={styles.summaryExerciseListContent}
      nestedScrollEnabled
    >
      {session.exercises.map((sessionExercise) => {
        const exerciseDef = allExercises.find(
          (exercise) => exercise.id === sessionExercise.exerciseId,
        );
        const completedSets = sessionExercise.sets.filter((set) => set.completed);

        return (
          <View
            key={sessionExercise.id}
            style={[styles.summaryExerciseCard, { borderColor: theme.colors.border }]}
          >
            <View style={styles.summaryExerciseHeader}>
              <Text
                style={[styles.summaryExName, { color: theme.colors.text }]}
                numberOfLines={1}
                ellipsizeMode="tail"
              >
                {exerciseDef?.name ?? 'Unknown Exercise'}
              </Text>
              <Text style={[styles.summaryExDetails, { color: theme.colors.primary }]}>
                {getExerciseVolumeLabel(sessionExercise)}
              </Text>
            </View>

            {completedSets.length > 0 ? (
              completedSets.map((set) => (
                <View
                  key={set.id}
                  style={[
                    styles.summarySetRow,
                    {
                      backgroundColor:
                        set.type === 'warmup' ? theme.colors.primarySubtle : 'transparent',
                    },
                  ]}
                >
                  <Text
                    style={[
                      styles.summarySetBadge,
                      { color: set.type === 'warmup' ? theme.colors.primary : theme.colors.muted },
                    ]}
                  >
                    {getSetBadge(set)}
                  </Text>
                  <Text style={[styles.summarySetText, { color: theme.colors.text }]}>
                    {formatSetPerformance(set, sessionExercise)}
                  </Text>
                </View>
              ))
            ) : (
              <Text style={[styles.summaryEmptySets, { color: theme.colors.muted }]}>
                No completed sets logged.
              </Text>
            )}
          </View>
        );
      })}
    </VerticalFadeScroll>
  );

  const renderItem = ({ item }: { item: WorkoutSession }) => {
    const summary = summarizeWorkout(item);

    const exerciseNames = item.exercises
      .map((se) => allExercises.find((e) => e.id === se.exerciseId)?.name)
      .filter(Boolean)
      .join(', ');

    const displayVolume = isImperial
      ? Math.round(summary.totalVolume * 2.20462)
      : Math.round(summary.totalVolume);
    const volumeUnit = isImperial ? 'lbs' : 'kg';

    return (
      <Card style={styles.card} onPress={() => setSelectedSession(item)} padding="lg">
        <View style={styles.cardHeader}>
          <Text
            style={[
              styles.title,
              { color: theme.colors.text, ...theme.typography.heading, fontSize: 18 },
            ]}
          >
            {item.name}
          </Text>
          <Text style={[styles.date, { color: theme.colors.muted, ...theme.typography.caption }]}>
            {formatDate(item.startedAt)}
          </Text>
        </View>
        <Text
          style={{
            color: theme.colors.muted,
            marginBottom: 12,
            fontSize: 14,
            fontFamily: 'Manrope_500Medium',
          }}
          numberOfLines={2}
          ellipsizeMode="tail"
        >
          {exerciseNames || `${item.exercises.length} Exercises`}
        </Text>
        <View style={styles.stats}>
          <View style={styles.statItem}>
            <Text
              style={[
                styles.statValue,
                { color: theme.colors.text, ...theme.typography.body, fontWeight: 'bold' },
              ]}
            >
              {formatDuration(summary.durationSeconds)}
            </Text>
            <Text
              style={[styles.statLabel, { color: theme.colors.muted, ...theme.typography.caption }]}
            >
              Time
            </Text>
          </View>
          <View style={styles.statItem}>
            <Text
              style={[
                styles.statValue,
                { color: theme.colors.text, ...theme.typography.body, fontWeight: 'bold' },
              ]}
            >
              {displayVolume}
            </Text>
            <Text
              style={[styles.statLabel, { color: theme.colors.muted, ...theme.typography.caption }]}
            >
              Volume ({volumeUnit})
            </Text>
          </View>
          <View style={styles.statItem}>
            <Text
              style={[
                styles.statValue,
                { color: theme.colors.text, ...theme.typography.body, fontWeight: 'bold' },
              ]}
            >
              {summary.setCount}
            </Text>
            <Text
              style={[styles.statLabel, { color: theme.colors.muted, ...theme.typography.caption }]}
            >
              Sets
            </Text>
          </View>
        </View>
      </Card>
    );
  };

  const selectedSummary = selectedSession ? summarizeWorkout(selectedSession) : null;
  const summaryTotalSets = selectedSummary?.setCount ?? 0;
  const summaryTotalVolume = selectedSummary?.totalVolume ?? 0;

  const summaryDisplayVolume = isImperial
    ? Math.round(summaryTotalVolume * 2.20462)
    : Math.round(summaryTotalVolume);
  const volumeUnit = isImperial ? 'lbs' : 'kg';

  const ConsistencyGrid = () => {
    const [viewMode, setViewMode] = useState<'week' | 'month'>('week');
    const today = new Date();

    const daysOfWeekHeaders = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];

    const weekDays = React.useMemo(() => {
      return Array.from({ length: 7 }).map((_, index) => {
        const date = new Date(today);
        date.setDate(today.getDate() - 6 + index);
        date.setHours(0, 0, 0, 0);
        return date;
      });
    }, [today]);

    const monthRows = React.useMemo(() => {
      const firstDay = new Date(today.getFullYear(), today.getMonth(), 1);
      const firstDayOfWeek = (firstDay.getDay() + 6) % 7; // Monday = 0, Sunday = 6
      const lastDay = new Date(today.getFullYear(), today.getMonth() + 1, 0);
      const daysInMonth = lastDay.getDate();

      const monthCells: (Date | null)[] = [];
      for (let i = 0; i < firstDayOfWeek; i++) {
        monthCells.push(null);
      }
      for (let i = 1; i <= daysInMonth; i++) {
        const d = new Date(today.getFullYear(), today.getMonth(), i);
        d.setHours(0, 0, 0, 0);
        monthCells.push(d);
      }

      const rows: (Date | null)[][] = [];
      for (let i = 0; i < monthCells.length; i += 7) {
        const row = monthCells.slice(i, i + 7);
        while (row.length < 7) {
          row.push(null);
        }
        rows.push(row);
      }
      return rows;
    }, [today]);

    const renderDayCell = (day: Date | null, isPlaceholder: boolean) => {
      if (isPlaceholder || !day) {
        return (
          <View key={`placeholder-${Math.random()}`} style={styles.consistencyDayPlaceholder} />
        );
      }

      const key = formatDateLocal(day);
      const count = sessionsByDate[key]?.length ?? 0;
      const isToday = key === formatDateLocal(today);

      return (
        <Pressable
          key={key}
          style={[
            styles.consistencyDay,
            { borderColor: isToday ? theme.colors.primary : theme.colors.border },
            count > 0 && {
              backgroundColor:
                count > 1 ? theme.colors.primarySubtle : theme.colors.surfaceElevated,
              borderColor: theme.colors.borderActive,
            },
          ]}
          disabled={count === 0}
          accessibilityRole="button"
          accessibilityLabel={`${key}: ${count} Trainings${isToday ? ', heute' : ''}`}
          onPress={() => setSelectedDateKey(key)}
        >
          <Text
            style={[
              styles.consistencyDayLabel,
              { color: isToday ? theme.colors.primary : theme.colors.muted },
            ]}
          >
            {viewMode === 'week'
              ? new Intl.DateTimeFormat('en-US', { weekday: 'short' }).format(day)
              : day.getDate()}
          </Text>
          <View style={styles.consistencyBlocks}>
            {Array.from({ length: Math.min(count, 5) }).map((_, blockIndex) => (
              <View
                key={blockIndex}
                style={[
                  styles.consistencyBlock,
                  {
                    backgroundColor: blockIndex < 3 ? theme.colors.primary : theme.colors.secondary,
                  },
                ]}
              />
            ))}
          </View>
          <Text style={[styles.consistencyCount, { color: theme.colors.text }]}>
            {count > 0 ? count : ''}
          </Text>
        </Pressable>
      );
    };

    return (
      <Card padding="md" style={styles.consistencyCard}>
        <View style={styles.consistencyHeader}>
          <Text style={[styles.consistencyTitle, { color: theme.colors.text }]}>CONSISTENCY</Text>
          <View style={[styles.consistencyToggle, { borderColor: theme.colors.border }]}>
            {(['week', 'month'] as const).map((mode) => {
              const selected = mode === viewMode;
              return (
                <Pressable
                  key={mode}
                  style={[
                    styles.consistencyToggleBtn,
                    selected && { backgroundColor: theme.colors.primary },
                  ]}
                  onPress={() => setViewMode(mode)}
                >
                  <Text
                    style={[
                      styles.consistencyToggleText,
                      { color: selected ? theme.colors.background : theme.colors.muted },
                    ]}
                  >
                    {mode.toUpperCase()}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </View>

        {viewMode === 'week' ? (
          <View style={styles.calendarRow}>{weekDays.map((day) => renderDayCell(day, false))}</View>
        ) : (
          <View>
            {/* Weekday Headers */}
            <View style={[styles.calendarRow, { marginBottom: 12 }]}>
              {daysOfWeekHeaders.map((header, idx) => (
                <Text key={idx} style={[styles.weekdayHeader, { color: theme.colors.muted }]}>
                  {header}
                </Text>
              ))}
            </View>
            {/* Calendar Weeks */}
            {monthRows.map((row, idx) => (
              <View key={idx} style={styles.calendarRow}>
                {row.map((day) => renderDayCell(day, day === null))}
              </View>
            ))}
          </View>
        )}

        <Text style={[styles.consistencyHint, { color: theme.colors.muted }]}>
          Tap a filled day to open its workout history.
        </Text>
      </Card>
    );
  };

  return (
    <>
      <FlatList
        ref={scrollRef}
        data={sessions}
        keyExtractor={(item) => item.id}
        renderItem={renderItem}
        contentContainerStyle={[styles.list, { paddingBottom: Math.max(insets.bottom + 20, 100) }]}
        ListHeaderComponent={ConsistencyGrid}
        ListEmptyComponent={
          <EmptyState
            title="NO WORKOUTS YET"
            description="Your completed workouts will appear here."
          />
        }
      />

      {/* Workout Summary Popup */}
      <Modal
        visible={selectedSession !== null}
        transparent
        animationType="slide"
        onRequestClose={() => setSelectedSession(null)}
      >
        <View style={styles.modalOverlay}>
          <Pressable style={StyleSheet.absoluteFill} onPress={() => setSelectedSession(null)} />
          <View
            style={[
              styles.modalCard,
              {
                backgroundColor: theme.colors.surface,
                borderColor: theme.colors.border,
                borderRadius: theme.radius.lg,
                maxWidth: 600,
                alignItems: 'center',
              },
            ]}
          >
            {selectedSession && (
              <>
                <Pressable
                  style={styles.modalCloseBtn}
                  accessibilityRole="button"
                  accessibilityLabel="Trainingsübersicht schließen"
                  onPress={() => setSelectedSession(null)}
                  hitSlop={10}
                >
                  <Ionicons name="close" size={24} color={theme.colors.muted} />
                </Pressable>

                <Text
                  style={[
                    styles.modalTitle,
                    {
                      color: theme.colors.text,
                      ...theme.typography.heading,
                      textAlign: 'center',
                      marginBottom: 8,
                      fontSize: 22,
                    },
                  ]}
                  numberOfLines={1}
                  ellipsizeMode="tail"
                >
                  {selectedSession.name}
                </Text>

                <Text style={[styles.modalSubtitle, { color: theme.colors.muted }]}>
                  Completed on {formatDate(selectedSession.startedAt)}
                </Text>

                <View style={styles.modalStatsRow}>
                  <View style={styles.modalStatBox}>
                    <Text
                      style={[
                        styles.modalStatVal,
                        { color: theme.colors.primary, ...theme.typography.display },
                      ]}
                    >
                      {formatDuration(selectedSession.durationSeconds)}
                    </Text>
                    <Text style={[styles.modalStatLabel, { color: theme.colors.muted }]}>TIME</Text>
                  </View>
                  <View style={styles.modalStatBox}>
                    <Text
                      style={[
                        styles.modalStatVal,
                        { color: theme.colors.primary, ...theme.typography.display },
                      ]}
                    >
                      {summaryTotalSets}
                    </Text>
                    <Text style={[styles.modalStatLabel, { color: theme.colors.muted }]}>SETS</Text>
                  </View>
                  <View style={styles.modalStatBox}>
                    <Text
                      style={[
                        styles.modalStatVal,
                        { color: theme.colors.primary, ...theme.typography.display },
                      ]}
                    >
                      {summaryDisplayVolume}
                    </Text>
                    <Text style={[styles.modalStatLabel, { color: theme.colors.muted }]}>
                      {volumeUnit.toUpperCase()}
                    </Text>
                  </View>
                </View>

                {renderSessionExerciseBreakdown(selectedSession)}

                <View
                  style={[
                    styles.modalFactContainer,
                    { backgroundColor: theme.colors.background, borderColor: theme.colors.border },
                  ]}
                >
                  <Text style={[styles.modalFactTitle, { color: theme.colors.primary }]}>
                    💡 FUN FACT
                  </Text>
                  <Text
                    numberOfLines={2}
                    style={[styles.modalFactText, { color: theme.colors.text }]}
                  >
                    {getVolumeFunFact(summaryTotalVolume)}
                  </Text>
                </View>

                <Pressable
                  style={[
                    styles.modalStartBtn,
                    { backgroundColor: theme.colors.primary, borderRadius: theme.radius.md },
                  ]}
                  onPress={() => {
                    const id = selectedSession.id;
                    setSelectedSession(null);
                    router.push(`/history/${id}` as unknown as Parameters<typeof router.push>[0]);
                  }}
                >
                  <Text
                    style={[
                      styles.modalStartBtnText,
                      { color: theme.colors.background, ...theme.typography.button },
                    ]}
                  >
                    VIEW FULL DETAILS
                  </Text>
                </Pressable>
              </>
            )}
          </View>
        </View>
      </Modal>

      <Modal
        visible={selectedDateKey !== null}
        transparent
        animationType="fade"
        onRequestClose={() => setSelectedDateKey(null)}
      >
        <View style={styles.modalOverlay}>
          <Pressable style={StyleSheet.absoluteFill} onPress={() => setSelectedDateKey(null)} />
          <View
            style={[
              styles.modalCard,
              {
                backgroundColor: theme.colors.surface,
                borderColor: theme.colors.border,
                borderRadius: theme.radius.lg,
                maxWidth: 420,
              },
            ]}
          >
            <View style={styles.modalHeaderRow}>
              <View style={styles.modalTitleBlock}>
                <Text
                  style={[
                    styles.modalTitle,
                    { color: theme.colors.text, ...theme.typography.heading },
                  ]}
                >
                  DAY HISTORY
                </Text>
                <Text style={[styles.modalSubtitleSmall, { color: theme.colors.muted }]}>
                  {selectedDateSessions[0]
                    ? new Intl.DateTimeFormat('en-US', {
                        weekday: 'long',
                        month: 'long',
                        day: 'numeric',
                      }).format(selectedDateSessions[0].startedAt)
                    : selectedDateKey}
                </Text>
              </View>
              <Pressable onPress={() => setSelectedDateKey(null)} hitSlop={10}>
                <Ionicons name="close" size={24} color={theme.colors.muted} />
              </Pressable>
            </View>

            <VerticalFadeScroll
              style={styles.daySessionList}
              contentContainerStyle={styles.daySessionListContent}
            >
              {selectedDateSessions.map((session) => {
                const summary = summarizeWorkout(session);
                const displayVolume = isImperial
                  ? Math.round(summary.totalVolume * 2.20462)
                  : Math.round(summary.totalVolume);
                const exerciseNames =
                  session.exercises
                    .map(
                      (entry) =>
                        allExercises.find((exercise) => exercise.id === entry.exerciseId)?.name,
                    )
                    .filter(Boolean)
                    .slice(0, 3)
                    .join(', ') || `${session.exercises.length} exercises`;

                return (
                  <Pressable
                    key={session.id}
                    style={[
                      styles.daySessionRow,
                      {
                        borderColor: theme.colors.border,
                        backgroundColor: theme.colors.background,
                      },
                    ]}
                    onPress={() => {
                      setSelectedDateKey(null);
                      setSelectedSession(session);
                    }}
                  >
                    <View style={styles.daySessionHeader}>
                      <Text
                        style={[styles.daySessionTitle, { color: theme.colors.text }]}
                        numberOfLines={1}
                        ellipsizeMode="tail"
                      >
                        {session.name}
                      </Text>
                      <Ionicons name="chevron-forward" size={18} color={theme.colors.muted} />
                    </View>
                    <Text
                      style={[styles.daySessionExercises, { color: theme.colors.muted }]}
                      numberOfLines={2}
                      ellipsizeMode="tail"
                    >
                      {exerciseNames}
                    </Text>
                    <Text style={[styles.daySessionMeta, { color: theme.colors.primary }]}>
                      {formatDuration(summary.durationSeconds)} | {summary.setCount} sets |{' '}
                      {displayVolume.toLocaleString()} {volumeUnit}
                    </Text>
                  </Pressable>
                );
              })}
            </VerticalFadeScroll>
          </View>
        </View>
      </Modal>
    </>
  );
}

function ProgressView() {
  const reducedMotion = useReducedMotion();
  const scrollRef = useFocusScroll();
  const theme = useTheme();
  const styles = useThemeStyles(createStyles);
  const insets = useSafeAreaInsets();
  const historyStore = useHistoryStore();
  const { exercises } = useExerciseStore();
  const { profile } = useProfileStore();
  const isImperial = profile.preferredUnits === 'imperial';
  const prs = historyStore.getPRs();
  const activeExerciseIds = Object.keys(prs);

  const [searchQuery, setSearchQuery] = useState('');
  const [showOnlyFavorites, setShowOnlyFavorites] = useState(false);
  const favoriteIds = useExerciseStore((state) => state.favoriteIds);

  const filteredExerciseIds = React.useMemo(() => {
    return activeExerciseIds.filter((id) => {
      const ex = exercises.find((e) => e.id === id);
      if (!ex) return false;
      const matchesSearch = matchesExerciseSearch(ex, searchQuery);
      const matchesFavorite = showOnlyFavorites ? favoriteIds.includes(id) : true;
      return matchesSearch && matchesFavorite;
    });
  }, [activeExerciseIds, exercises, searchQuery, showOnlyFavorites, favoriteIds]);

  const [selectedExId, setSelectedExId] = useState<string | null>(null);

  // Auto-adjust selected exercise if filtered list changes
  React.useEffect(() => {
    if (filteredExerciseIds.length > 0) {
      if (!selectedExId || !filteredExerciseIds.includes(selectedExId)) {
        setSelectedExId(filteredExerciseIds[0] || null);
      }
    } else {
      setSelectedExId(null);
    }
  }, [filteredExerciseIds]);

  const [selectedPoint, setSelectedPoint] = useState<{
    date: string;
    volume: number;
    isPR: boolean;
    maxWeight: number;
    e1rm?: number;
  } | null>(null);

  const [crosshairIdx, setCrosshairIdx] = useState<number | null>(null);
  const [crosshairX, setCrosshairX] = useState<number | null>(null);

  const progressDetails = React.useMemo(() => {
    if (!selectedExId) return null;

    let totalSets = 0;
    let totalReps = 0;
    let totalRpe = 0;
    let rpeCount = 0;
    let maxWeight = 0;
    let initialWeight = 0;
    let latestWeight = 0;
    let weightLoggedCount = 0;

    // Sort sessions chronologically to find starting vs latest performance
    const sortedSessions = [...historyStore.sessions].sort(
      (a, b) => new Date(a.startedAt).getTime() - new Date(b.startedAt).getTime(),
    );

    sortedSessions.forEach((session) => {
      const sets = session.exercises
        .filter((ex) => ex.exerciseId === selectedExId)
        .flatMap((ex) => ex.sets);
      sets.forEach((set) => {
        if (set.completed && set.type !== 'warmup') {
          totalSets++;
          if (set.reps !== undefined && set.reps > 0) {
            totalReps += set.reps;
          }
          if (set.rpe !== undefined && set.rpe > 0) {
            totalRpe += set.rpe;
            rpeCount++;
          }
          if (set.weight !== undefined && set.weight > 0) {
            weightLoggedCount++;
            if (weightLoggedCount === 1) {
              initialWeight = set.weight;
            }
            latestWeight = set.weight;
            if (set.weight > maxWeight) {
              maxWeight = set.weight;
            }
          }
        }
      });
    });

    const avgReps = totalSets > 0 ? (totalReps / totalSets).toFixed(1) : '0';
    const avgRpe = rpeCount > 0 ? (totalRpe / rpeCount).toFixed(1) : '--';

    const history = getExerciseProgressHistory(
      selectedExId,
      historyStore.sessions,
      exercises.find((e) => e.id === selectedExId)?.name,
    );

    const initialE1RM = history[0]?.maxE1RM || 0;
    const latestE1RM = history[history.length - 1]?.maxE1RM || 0;
    const peakE1RM = Math.max(...history.map((h) => h.maxE1RM), 0);

    return {
      totalSets,
      totalWorkouts: history.length,
      avgReps,
      avgRpe,
      maxWeight,
      initialWeight,
      latestWeight,
      initialE1RM,
      latestE1RM,
      peakE1RM,
    };
  }, [selectedExId, historyStore.sessions, exercises]);

  const chartFadeAnim = React.useRef(new Animated.Value(0)).current;
  const chartSlideAnim = React.useRef(new Animated.Value(20)).current;

  React.useEffect(() => {
    setSelectedPoint(null);
    setCrosshairIdx(null);
    setCrosshairX(null);
    chartFadeAnim.setValue(0);
    chartSlideAnim.setValue(8);
    Animated.parallel([
      Animated.timing(chartFadeAnim, {
        toValue: 1,
        duration: reducedMotion ? 0 : 220,
        useNativeDriver: Platform.OS !== 'web',
      }),
      Animated.timing(chartSlideAnim, {
        toValue: 0,
        duration: reducedMotion ? 0 : 220,
        useNativeDriver: Platform.OS !== 'web',
      }),
    ]).start();
  }, [selectedExId, reducedMotion]);

  const { width: screenWidth } = useWindowDimensions();

  const getProgressHistory = (exerciseId: string) => {
    const exercise = exercises.find((e) => e.id === exerciseId);
    return getExerciseProgressHistory(exerciseId, historyStore.sessions, exercise?.name);
  };

  const renderChart = () => {
    if (!selectedExId) return null;
    const history = getProgressHistory(selectedExId).slice(-24);
    if (history.length < 2) {
      return (
        <Card padding="lg" style={{ alignItems: 'center', marginBottom: 24 }}>
          <Text
            style={[
              { color: theme.colors.text, fontSize: 16, marginBottom: 4 },
              theme.typography.heading,
            ]}
          >
            Not enough data
          </Text>
          <Text style={[{ color: theme.colors.muted }, theme.typography.body]}>
            Complete at least 2 sessions.
          </Text>
        </Card>
      );
    }

    const chartWidth = Math.max(180, Math.min(screenWidth - 112, 600));
    const chartPaddingRight = 64;
    const chartStep = (chartWidth - chartPaddingRight) / history.length;

    const getPointX = (index: number) => {
      if (history.length <= 1) return chartPaddingRight;
      return Math.floor(chartPaddingRight + index * chartStep);
    };

    const selectHistoryPoint = (index: number, pointX = getPointX(index)) => {
      if (index < 0 || index >= history.length) return;
      const item = history[index];
      if (!item) return;
      const vol = isImperial ? Math.round(item.volume * 2.20462) : Math.round(item.volume);
      setCrosshairIdx(index);
      setCrosshairX(pointX);
      setSelectedPoint({
        date: new Date(item.date).toLocaleDateString(),
        volume: vol,
        isPR: item.isWeightPR,
        maxWeight: isImperial ? Math.round(item.maxWeight * 2.20462) : Math.round(item.maxWeight),
        e1rm: isImperial ? Math.round(item.maxE1RM * 2.20462) : Math.round(item.maxE1RM),
      });
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    };

    const handleChartTouch = (touchX: number) => {
      if (history.length < 2) return;
      const firstX = getPointX(0);
      const lastX = getPointX(history.length - 1);
      const clampedX = Math.max(firstX, Math.min(lastX, touchX));
      const index = Math.round((clampedX - chartPaddingRight) / chartStep);

      if (index !== crosshairIdx && index >= 0 && index < history.length) {
        selectHistoryPoint(index, getPointX(index));
      }
    };

    const data = {
      labels: history.map((h, index) =>
        index === 0 || index === history.length - 1 || index % Math.ceil(history.length / 4) === 0
          ? new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric' }).format(h.date)
          : '',
      ),
      datasets: [
        {
          data: history.map((h) => (isImperial ? Math.round(h.maxWeight * 2.20462) : h.maxWeight)),
          color: () => theme.colors.primary,
          strokeWidth: 2,
        },
      ],
    };

    return (
      <Animated.View
        style={[
          styles.chartContainer,
          {
            backgroundColor: theme.colors.surface,
            borderColor: theme.colors.muted,
            opacity: chartFadeAnim,
            transform: [{ translateY: chartSlideAnim }],
          },
        ]}
      >
        <Text
          style={[styles.chartTitle, { color: theme.colors.text, ...theme.typography.heading }]}
        >
          Max Weight History · letzte 24 Trainings
        </Text>

        {/* Selected Data Point Details */}
        {selectedPoint ? (
          <View
            style={[
              styles.tooltipContainer,
              {
                backgroundColor: theme.colors.background,
                borderColor: selectedPoint.isPR ? theme.colors.warning : theme.colors.primary,
              },
            ]}
          >
            <Ionicons
              name={selectedPoint.isPR ? 'star' : 'stats-chart'}
              size={16}
              color={selectedPoint.isPR ? theme.colors.warning : theme.colors.primary}
            />
            <Text style={[styles.tooltipText, { color: theme.colors.text, fontSize: 11 }]}>
              <Text style={{ fontFamily: 'SpaceGrotesk_700Bold' }}>{selectedPoint.date}</Text>: Max:{' '}
              <Text
                style={{
                  color: selectedPoint.isPR ? theme.colors.warning : theme.colors.primary,
                  fontFamily: 'SpaceGrotesk_700Bold',
                }}
              >
                {selectedPoint.maxWeight} {isImperial ? 'lbs' : 'kg'}
              </Text>{' '}
              | Vol:{' '}
              <Text style={{ color: theme.colors.primary, fontFamily: 'SpaceGrotesk_700Bold' }}>
                {selectedPoint.volume} {isImperial ? 'lbs' : 'kg'}
              </Text>
              {selectedPoint.e1rm !== undefined && (
                <>
                  {' '}
                  | e1RM:{' '}
                  <Text style={{ color: theme.colors.primary, fontFamily: 'SpaceGrotesk_700Bold' }}>
                    {selectedPoint.e1rm} {isImperial ? 'lbs' : 'kg'}
                  </Text>
                </>
              )}
              {selectedPoint.isPR && (
                <Text style={{ color: theme.colors.warning, fontFamily: 'SpaceGrotesk_700Bold' }}>
                  {' '}
                  (★ Weight PR)
                </Text>
              )}
            </Text>
            <Pressable
              onPress={() => {
                setSelectedPoint(null);
                setCrosshairIdx(null);
                setCrosshairX(null);
              }}
              hitSlop={10}
            >
              <Ionicons name="close-circle" size={18} color={theme.colors.muted} />
            </Pressable>
          </View>
        ) : (
          <Text style={[styles.chartTipText, { color: theme.colors.muted }]}>
            💡 Slide your finger across the chart to view Max Weight, Vol & e1RM
          </Text>
        )}

        <View
          onStartShouldSetResponder={() => true}
          onResponderGrant={(e) => handleChartTouch(e.nativeEvent.locationX)}
          onResponderMove={(e) => handleChartTouch(e.nativeEvent.locationX)}
          style={{ position: 'relative', overflow: 'visible' }}
        >
          <LineChart
            data={data}
            width={chartWidth}
            height={220}
            withInnerLines={false}
            withOuterLines={false}
            onDataPointClick={({ index, x }) => {
              selectHistoryPoint(index, typeof x === 'number' ? x : getPointX(index));
            }}
            getDotColor={(dataPoint, dataPointIndex) => {
              const point = history[dataPointIndex];
              return point?.isWeightPR ? theme.colors.warning : theme.colors.primary;
            }}
            chartConfig={{
              backgroundColor: theme.colors.surface,
              backgroundGradientFrom: theme.colors.surface,
              backgroundGradientTo: theme.colors.surface,
              decimalPlaces: 0,
              color: (opacity = 1) => withAlpha(theme.chart.line, opacity),
              labelColor: () => theme.colors.muted,
              propsForDots: { r: '6', strokeWidth: '2.5', stroke: theme.colors.surface },
            }}
            style={{ marginVertical: 8, borderRadius: 16 }}
          />
          {crosshairX !== null && (
            <View
              style={{
                position: 'absolute',
                top: 16,
                bottom: 24,
                left: Math.max(0, crosshairX - 0.75),
                width: 1.5,
                backgroundColor: theme.colors.primary,
                zIndex: 10,
                shadowColor: theme.colors.primary,
                shadowOffset: { width: 0, height: 0 },
                shadowOpacity: 0.6,
                shadowRadius: 2,
                pointerEvents: 'none',
              }}
            />
          )}
        </View>
      </Animated.View>
    );
  };

  return (
    <ScrollView
      ref={scrollRef}
      contentContainerStyle={[styles.content, { paddingBottom: Math.max(insets.bottom + 20, 100) }]}
    >
      <Text
        style={[
          styles.sectionTitle,
          { color: theme.colors.text, ...theme.typography.heading, fontSize: 20 },
        ]}
      >
        PERSONAL RECORDS
      </Text>
      {activeExerciseIds.length === 0 ? (
        <Text style={[{ color: theme.colors.muted, ...theme.typography.body }]}>
          Complete a workout to see your PRs.
        </Text>
      ) : (
        <>
          {/* Search and Favorites Bar */}
          <View style={styles.searchBarContainer}>
            <TextInput
              style={[
                styles.searchBar,
                {
                  color: theme.colors.text,
                  backgroundColor: theme.colors.surface,
                  borderColor: theme.colors.border,
                },
              ]}
              value={searchQuery}
              onChangeText={setSearchQuery}
              placeholder="Search exercises..."
              placeholderTextColor={theme.colors.muted}
            />
            <Pressable
              style={[
                styles.favoriteToggleBtn,
                {
                  backgroundColor: showOnlyFavorites ? theme.colors.warning : theme.colors.surface,
                  borderColor: theme.colors.border,
                },
              ]}
              onPress={() => setShowOnlyFavorites(!showOnlyFavorites)}
            >
              <Ionicons
                name={showOnlyFavorites ? 'star' : 'star-outline'}
                size={20}
                color={showOnlyFavorites ? theme.colors.background : theme.colors.muted}
              />
            </Pressable>
          </View>

          {filteredExerciseIds.length === 0 ? (
            <Text
              style={[
                {
                  color: theme.colors.muted,
                  ...theme.typography.body,
                  marginTop: 12,
                  marginBottom: 20,
                },
              ]}
            >
              No matching exercises found.
            </Text>
          ) : (
            <>
              <HorizontalFadeScroll style={styles.chipScroll}>
                {filteredExerciseIds.map((id) => {
                  const ex = exercises.find((e) => e.id === id);
                  const isSelected = id === selectedExId;
                  return (
                    <Pressable
                      key={id}
                      style={[
                        styles.chip,
                        {
                          backgroundColor: isSelected ? theme.colors.primary : theme.colors.surface,
                        },
                      ]}
                      onPress={() => setSelectedExId(id)}
                    >
                      <Text
                        style={[
                          styles.chipText,
                          {
                            color: isSelected ? theme.colors.background : theme.colors.muted,
                            ...theme.typography.caption,
                          },
                        ]}
                      >
                        {ex?.name || 'Unknown'}
                      </Text>
                    </Pressable>
                  );
                })}
              </HorizontalFadeScroll>
              {selectedExId && prs[selectedExId] !== undefined && (
                <Card style={styles.prHighlight} padding="md">
                  <Text
                    style={[
                      styles.prHighlightLabel,
                      { color: theme.colors.muted, ...theme.typography.caption },
                    ]}
                  >
                    BEST WEIGHT
                  </Text>
                  <Text
                    style={[
                      styles.prHighlightValue,
                      { color: theme.colors.primary, ...theme.typography.display, fontSize: 32 },
                    ]}
                  >
                    {(() => {
                      const rawVal = prs[selectedExId]!;
                      const converted = isImperial ? rawVal * 2.20462 : rawVal;
                      const roundedDown = Math.floor(converted * 100) / 100;
                      return roundedDown.toFixed(2);
                    })()}{' '}
                    {isImperial ? 'lbs' : 'kg'}
                  </Text>
                </Card>
              )}
              {renderChart()}

              {selectedExId && progressDetails && (
                <Card style={styles.progressionDetailsCard} padding="md">
                  <Text style={[styles.detailsSectionTitle, { color: theme.colors.text }]}>
                    PROGRESSION DETAILS
                  </Text>

                  <View style={styles.detailsGrid}>
                    {/* Weight Row */}
                    <View style={[styles.detailsRow, { borderBottomColor: theme.colors.border }]}>
                      <Text style={[styles.detailLabel, { color: theme.colors.muted }]}>
                        Weight Progression
                      </Text>
                      <Text style={[styles.detailVal, { color: theme.colors.text }]}>
                        {(() => {
                          const init = progressDetails.initialWeight;
                          const lat = progressDetails.latestWeight;
                          const initDisp = isImperial ? init * 2.20462 : init;
                          const latDisp = isImperial ? lat * 2.20462 : lat;
                          const diff = lat - init;
                          const diffDisp = isImperial ? diff * 2.20462 : diff;
                          const percent = init > 0 ? (diff / init) * 100 : 0;

                          return `${initDisp.toFixed(1)} → ${latDisp.toFixed(1)} ${isImperial ? 'lbs' : 'kg'} (${diff >= 0 ? '+' : ''}${diffDisp.toFixed(1)} / ${diff >= 0 ? '+' : ''}${percent.toFixed(0)}%)`;
                        })()}
                      </Text>
                    </View>

                    {/* e1RM Row */}
                    <View style={[styles.detailsRow, { borderBottomColor: theme.colors.border }]}>
                      <Text style={[styles.detailLabel, { color: theme.colors.muted }]}>
                        Estimated 1RM
                      </Text>
                      <Text style={[styles.detailVal, { color: theme.colors.text }]}>
                        {(() => {
                          const init = progressDetails.initialE1RM;
                          const lat = progressDetails.latestE1RM;
                          const peak = progressDetails.peakE1RM;

                          const unit = isImperial ? 'lbs' : 'kg';
                          const initVal = isImperial ? init * 2.20462 : init;
                          const latVal = isImperial ? lat * 2.20462 : lat;
                          const peakVal = isImperial ? peak * 2.20462 : peak;

                          return `Init: ${initVal.toFixed(1)} | Peak: ${peakVal.toFixed(1)} | Latest: ${latVal.toFixed(1)} ${unit}`;
                        })()}
                      </Text>
                    </View>

                    {/* Avg Reps / RPE */}
                    <View
                      style={[
                        styles.detailsRowSideBySide,
                        { borderBottomColor: theme.colors.border },
                      ]}
                    >
                      <View style={styles.detailHalf}>
                        <Text style={[styles.detailLabel, { color: theme.colors.muted }]}>
                          Avg Reps/Set
                        </Text>
                        <Text style={[styles.detailVal, { color: theme.colors.text }]}>
                          {progressDetails.avgReps} reps
                        </Text>
                      </View>
                      <View style={styles.detailHalf}>
                        <Text style={[styles.detailLabel, { color: theme.colors.muted }]}>
                          Avg Intensity (RPE)
                        </Text>
                        <Text style={[styles.detailVal, { color: theme.colors.text }]}>
                          {progressDetails.avgRpe}
                        </Text>
                      </View>
                    </View>

                    {/* Total Sets & Workouts */}
                    <View style={[styles.detailsRow, { borderBottomWidth: 0 }]}>
                      <Text style={[styles.detailLabel, { color: theme.colors.muted }]}>
                        Training Volume
                      </Text>
                      <Text style={[styles.detailVal, { color: theme.colors.text }]}>
                        {progressDetails.totalSets} sets across {progressDetails.totalWorkouts}{' '}
                        sessions
                      </Text>
                    </View>
                  </View>
                </Card>
              )}
            </>
          )}
        </>
      )}
    </ScrollView>
  );
}

function AchievementBadge({ kind }: { kind: 'one_time' | 'repeatable' }) {
  const theme = useTheme();
  const styles = useThemeStyles(createStyles);
  const color = kind === 'repeatable' ? theme.colors.warning : theme.colors.muted;
  return (
    <View style={[styles.kindBadge, { borderColor: color }]}>
      <Ionicons name={kind === 'repeatable' ? 'repeat' : 'flag-outline'} size={10} color={color} />
      <Text style={[styles.kindBadgeText, { color }]}>
        {kind === 'repeatable' ? 'REPEATABLE' : 'ONE-TIME'}
      </Text>
    </View>
  );
}

function AchievementsView() {
  const scrollRef = useFocusScroll();
  const theme = useTheme();
  const styles = useThemeStyles(createStyles);
  const insets = useSafeAreaInsets();
  const { xp, level, unlockedAchievements, repeatCounts } = useAchievementStore();
  const { getProgress } = useAchievementCheck();

  const oneTime = ACHIEVEMENTS.filter((a) => !a.repeatable);
  const repeatables = ACHIEVEMENTS.filter((a) => a.repeatable);
  const unlockedList = oneTime.filter((a) => unlockedAchievements[a.id] !== undefined);
  const lockedList = oneTime.filter((a) => unlockedAchievements[a.id] === undefined);

  return (
    <ScrollView
      ref={scrollRef}
      contentContainerStyle={[styles.content, { paddingBottom: Math.max(insets.bottom + 20, 100) }]}
    >
      <LevelProgress level={level} xp={xp} />

      {/* Repeatable */}
      <Text
        style={[
          styles.sectionTitle,
          { color: theme.colors.text, ...theme.typography.heading, fontSize: 20 },
        ]}
      >
        REPEATABLE
      </Text>
      {repeatables.map((ach) => {
        const count = repeatCounts[ach.id] || 0;
        const earned = count > 0;
        return (
          <Card
            key={ach.id}
            style={[
              styles.achCard,
              earned ? { borderColor: theme.colors.warning, borderWidth: 1 } : { opacity: 0.6 },
            ]}
            padding="md"
          >
            <View style={styles.achRow}>
              <View style={[styles.achIconContainer, { backgroundColor: theme.colors.surface }]}>
                <Ionicons
                  name={ach.icon as React.ComponentProps<typeof Ionicons>['name']}
                  size={24}
                  color={earned ? theme.colors.warning : theme.colors.muted}
                />
              </View>
              <View style={styles.achInfo}>
                <View style={styles.achNameRow}>
                  <Text
                    style={[
                      styles.achName,
                      { color: theme.colors.text, ...theme.typography.body, fontWeight: 'bold' },
                    ]}
                  >
                    {ach.name}
                  </Text>
                  <AchievementBadge kind="repeatable" />
                </View>
                <Text
                  style={[
                    styles.achDesc,
                    { color: theme.colors.muted, ...theme.typography.caption },
                  ]}
                >
                  {ach.description}
                </Text>
              </View>
              <Text
                accessibilityLabel={`${count} Mal absolviert`}
                style={[
                  styles.achCount,
                  { color: earned ? theme.colors.warning : theme.colors.muted, fontSize: 12 },
                ]}
              >
                {count}× absolviert
              </Text>
            </View>
          </Card>
        );
      })}

      {unlockedList.length > 0 && (
        <>
          <Text
            style={[
              styles.sectionTitle,
              {
                color: theme.colors.text,
                ...theme.typography.heading,
                fontSize: 20,
                marginTop: 24,
              },
            ]}
          >
            UNLOCKED ({unlockedList.length})
          </Text>
          {unlockedList.map((ach) => (
            <Card
              key={ach.id}
              style={[styles.achCard, { borderColor: theme.colors.primary, borderWidth: 1 }]}
              padding="md"
            >
              <View style={styles.achRow}>
                <View style={[styles.achIconContainer, { backgroundColor: theme.colors.surface }]}>
                  <Ionicons
                    name={ach.icon as React.ComponentProps<typeof Ionicons>['name']}
                    size={24}
                    color={theme.colors.primary}
                  />
                </View>
                <View style={styles.achInfo}>
                  <View style={styles.achNameRow}>
                    <Text
                      style={[
                        styles.achName,
                        { color: theme.colors.text, ...theme.typography.body, fontWeight: 'bold' },
                      ]}
                    >
                      {ach.name}
                    </Text>
                    <Text style={{ color: theme.colors.primary, fontSize: 12 }}>✓ Absolviert</Text>
                  </View>
                  <Text
                    style={[
                      styles.achDesc,
                      { color: theme.colors.muted, ...theme.typography.caption },
                    ]}
                  >
                    {ach.description}
                  </Text>
                </View>
              </View>
            </Card>
          ))}
        </>
      )}

      {lockedList.length > 0 && (
        <>
          <Text
            style={[
              styles.sectionTitle,
              {
                color: theme.colors.text,
                ...theme.typography.heading,
                fontSize: 20,
                marginTop: 24,
              },
            ]}
          >
            LOCKED ({lockedList.length})
          </Text>
          {lockedList.map((ach) => {
            const prog = getProgress(ach.id);
            return (
              <Card key={ach.id} style={styles.achCard} padding="md">
                <View style={styles.achRow}>
                  <View
                    style={[styles.achIconContainer, { backgroundColor: theme.colors.surface }]}
                  >
                    <Ionicons
                      name={ach.icon as React.ComponentProps<typeof Ionicons>['name']}
                      size={24}
                      color={theme.colors.muted}
                    />
                  </View>
                  <View style={styles.achInfo}>
                    <View style={styles.achNameRow}>
                      <Text
                        style={[
                          styles.achName,
                          {
                            color: theme.colors.text,
                            ...theme.typography.body,
                            fontWeight: 'bold',
                          },
                        ]}
                      >
                        {ach.name}
                      </Text>
                      <AchievementBadge kind="one_time" />
                    </View>
                    <Text
                      style={[
                        styles.achDesc,
                        { color: theme.colors.muted, ...theme.typography.caption },
                      ]}
                    >
                      {ach.description}
                    </Text>
                    <View style={styles.achProgressRow}>
                      <View
                        style={[styles.achProgressBarBg, { backgroundColor: theme.colors.surface }]}
                      >
                        <View
                          style={[
                            styles.achProgressBarFill,
                            { backgroundColor: theme.colors.muted, width: `${prog.percent}%` },
                          ]}
                        />
                      </View>
                      <Text
                        style={[
                          styles.achProgressText,
                          { color: theme.colors.muted, ...theme.typography.caption, marginLeft: 8 },
                        ]}
                      >
                        {prog.current} / {prog.target}
                      </Text>
                    </View>
                  </View>
                </View>
              </Card>
            );
          })}
        </>
      )}
    </ScrollView>
  );
}

const createStyles = (theme: Theme) =>
  StyleSheet.create({
    container: { flex: 1 },
    header: {
      paddingHorizontal: 24,
      paddingBottom: 16,
    },
    headerTitle: {},
    toggleContainer: {
      flexDirection: 'row',
      paddingHorizontal: 24,
      marginBottom: 16,
    },
    toggleBtn: {
      marginRight: 24,
      paddingVertical: 8,
    },
    toggleText: {},
    list: { paddingHorizontal: 24, paddingBottom: 40 },
    card: {
      marginBottom: 16,
    },
    cardHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'flex-start',
      marginBottom: 16,
    },
    title: { flex: 1, marginRight: 8 },
    date: {},
    stats: { flexDirection: 'row', gap: 24 },
    statItem: { alignItems: 'flex-start' },
    statValue: { marginBottom: 2 },
    statLabel: {},
    content: { paddingHorizontal: 24, paddingBottom: 40 },
    sectionTitle: { marginBottom: 16 },
    chipScroll: { marginBottom: 24 },
    chip: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20, marginRight: 8 },
    chipText: {},
    prHighlight: {
      alignItems: 'flex-start',
      marginBottom: 24,
    },
    prHighlightLabel: { marginBottom: 8 },
    prHighlightValue: {},
    chartContainer: {
      borderRadius: 16,
      padding: 16,
      borderWidth: 1,
      alignItems: 'center',
      overflow: 'hidden',
    },
    chartTitle: { alignSelf: 'flex-start', marginBottom: 16 },
    levelCard: {
      marginBottom: 32,
    },
    levelHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: 16,
      gap: 8,
    },
    levelTitle: {
      flexShrink: 1,
    },
    xpText: {
      flexShrink: 0,
    },
    progressBarBg: {
      height: 8,
      borderRadius: 4,
      overflow: 'hidden',
      marginBottom: 12,
    },
    progressBarFill: {
      height: '100%',
    },
    xpSub: {},
    achCard: {
      marginBottom: 12,
    },
    achRow: {
      flexDirection: 'row',
      alignItems: 'center',
    },
    achIconContainer: {
      width: 48,
      height: 48,
      borderRadius: 24,
      justifyContent: 'center',
      alignItems: 'center',
      marginRight: 16,
    },
    achInfo: {
      flex: 1,
    },
    achNameRow: {
      flexDirection: 'row',
      alignItems: 'center',
      flexWrap: 'wrap',
      gap: 8,
      marginBottom: 4,
    },
    achName: {
      marginBottom: 4,
    },
    achCount: {
      fontFamily: 'SpaceGrotesk_700Bold',
      fontSize: 18,
      marginLeft: 8,
      fontVariant: ['tabular-nums'],
    },
    kindBadge: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 3,
      borderWidth: 1,
      borderRadius: 9999,
      paddingHorizontal: 6,
      paddingVertical: 2,
    },
    kindBadgeText: {
      fontFamily: 'SpaceGrotesk_600SemiBold',
      fontSize: 9,
      letterSpacing: 0.5,
    },
    achDesc: {
      marginBottom: 6,
    },
    achProgressRow: {
      flexDirection: 'row',
      alignItems: 'center',
    },
    achProgressBarBg: {
      flex: 1,
      height: 4,
      borderRadius: 2,
      overflow: 'hidden',
    },
    achProgressBarFill: {
      height: '100%',
      borderRadius: 2,
    },
    achProgressText: {},
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
      maxHeight: '88%',
      borderRadius: 16,
    },
    modalTitleBlock: {
      flex: 1,
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
      flexShrink: 1,
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
      maxHeight: 380,
      flexShrink: 1,
      width: '100%',
      marginBottom: 12,
    },
    summaryExerciseListContent: {
      gap: 10,
      paddingBottom: 2,
    },
    summaryExerciseCard: {
      borderWidth: 1,
      borderRadius: 12,
      padding: 10,
      width: '100%',
    },
    summaryExerciseHeader: {
      marginBottom: 8,
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
      fontSize: 11,
      fontFamily: 'SpaceGrotesk_700Bold',
      marginTop: 3,
    },
    summarySetRow: {
      flexDirection: 'row',
      alignItems: 'center',
      borderRadius: 8,
      paddingHorizontal: 8,
      paddingVertical: 6,
      gap: 10,
    },
    summarySetBadge: {
      width: 34,
      fontFamily: 'SpaceGrotesk_700Bold',
      fontSize: 11,
      fontVariant: ['tabular-nums'],
    },
    summarySetText: {
      flex: 1,
      fontFamily: 'Manrope_500Medium',
      fontSize: 12,
      lineHeight: 16,
    },
    summaryEmptySets: {
      fontFamily: 'Manrope_500Medium',
      fontSize: 12,
      lineHeight: 16,
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
    tooltipContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingVertical: 8,
      paddingHorizontal: 12,
      borderRadius: 8,
      borderWidth: 1,
      gap: 8,
      marginTop: 8,
      marginBottom: 4,
      width: '90%',
    },
    tooltipText: {
      fontFamily: 'Manrope_500Medium',
      fontSize: 13,
      flex: 1,
    },
    chartTipText: {
      fontFamily: 'Manrope_500Medium',
      fontSize: 11,
      marginTop: 6,
      marginBottom: 4,
      fontStyle: 'italic',
      textAlign: 'center',
    },
    consistencyCard: {
      marginTop: 12,
      marginBottom: 20,
      borderWidth: 1,
      borderColor: theme.colors.border,
    },
    consistencyHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      gap: 12,
      marginBottom: 12,
    },
    consistencyTitle: {
      fontFamily: 'SpaceGrotesk_700Bold',
      fontSize: 11,
      textTransform: 'uppercase',
      letterSpacing: 1,
    },
    consistencyToggle: {
      flexDirection: 'row',
      borderWidth: 1,
      borderRadius: 999,
      overflow: 'hidden',
    },
    consistencyToggleBtn: {
      minHeight: 44,
      justifyContent: 'center',
      paddingHorizontal: 10,
      paddingVertical: 6,
    },
    consistencyToggleText: {
      fontFamily: 'SpaceGrotesk_700Bold',
      fontSize: 10,
      letterSpacing: 0.5,
    },
    calendarRow: {
      flexDirection: 'row',
      gap: 8,
      marginBottom: 8,
    },
    weekdayHeader: {
      flex: 1,
      textAlign: 'center',
      fontFamily: 'SpaceGrotesk_700Bold',
      fontSize: 10,
    },
    consistencyDayPlaceholder: {
      flex: 1,
      minHeight: 68,
      borderWidth: 1,
      borderColor: 'transparent',
      backgroundColor: 'transparent',
    },
    consistencyDay: {
      flex: 1,
      minHeight: 68,
      borderWidth: 1,
      borderRadius: 10,
      padding: 6,
      alignItems: 'center',
    },
    consistencyDayLabel: {
      fontFamily: 'SpaceGrotesk_700Bold',
      fontSize: 10,
      marginBottom: 6,
    },
    consistencyBlocks: {
      flex: 1,
      justifyContent: 'flex-end',
      gap: 3,
      minHeight: 28,
    },
    consistencyBlock: {
      width: 18,
      height: 5,
      borderRadius: 3,
    },
    consistencyCount: {
      fontFamily: 'SpaceGrotesk_700Bold',
      fontSize: 11,
      minHeight: 14,
      marginTop: 4,
    },
    consistencyHint: {
      fontFamily: 'Manrope_500Medium',
      fontSize: 11,
      lineHeight: 15,
      marginTop: 10,
    },
    modalIconContainer: {
      width: 48,
      height: 48,
      borderRadius: 24,
      backgroundColor: theme.colors.primarySubtle,
      justifyContent: 'center',
      alignItems: 'center',
      marginBottom: 16,
      alignSelf: 'center',
    },
    modalSubtitle: {
      fontFamily: 'Manrope_500Medium',
      fontSize: 14,
      textAlign: 'center',
      marginBottom: 12,
    },
    modalSubtitleSmall: {
      fontFamily: 'Manrope_500Medium',
      fontSize: 13,
      marginTop: 4,
    },
    modalStatsRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      width: '100%',
      marginBottom: 16,
    },
    modalStatBox: {
      flex: 1,
      alignItems: 'center',
    },
    modalStatVal: {
      fontSize: 18,
      fontFamily: 'SpaceGrotesk_700Bold',
      marginBottom: 4,
    },
    modalStatLabel: {
      fontFamily: 'SpaceGrotesk_600SemiBold',
      fontSize: 11,
      letterSpacing: 0.5,
    },
    modalFactContainer: {
      width: '100%',
      borderWidth: 1,
      borderRadius: 12,
      padding: 10,
      marginBottom: 12,
    },
    modalFactTitle: {
      fontFamily: 'SpaceGrotesk_700Bold',
      fontSize: 11,
      letterSpacing: 1,
      marginBottom: 8,
    },
    modalFactText: {
      fontFamily: 'Manrope_500Medium',
      fontSize: 13,
      lineHeight: 18,
    },
    modalCloseBtn: {
      position: 'absolute',
      top: 16,
      right: 16,
      zIndex: 10,
    },
    daySessionList: {
      width: '100%',
      maxHeight: 360,
    },
    daySessionListContent: {
      gap: 10,
    },
    daySessionRow: {
      borderWidth: 1,
      borderRadius: 12,
      padding: 12,
    },
    daySessionHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      marginBottom: 6,
    },
    daySessionTitle: {
      flex: 1,
      fontFamily: 'SpaceGrotesk_700Bold',
      fontSize: 15,
    },
    daySessionExercises: {
      fontFamily: 'Manrope_500Medium',
      fontSize: 12,
      lineHeight: 17,
      marginBottom: 8,
    },
    daySessionMeta: {
      fontFamily: 'SpaceGrotesk_700Bold',
      fontSize: 12,
    },
    searchBarContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
      marginBottom: 16,
      width: '100%',
    },
    searchBar: {
      flex: 1,
      height: 44,
      borderRadius: 12,
      borderWidth: 1,
      paddingHorizontal: 16,
      fontFamily: 'Manrope_500Medium',
      fontSize: 14,
    },
    favoriteToggleBtn: {
      width: 44,
      height: 44,
      borderRadius: 12,
      borderWidth: 1,
      justifyContent: 'center',
      alignItems: 'center',
    },
    progressionDetailsCard: {
      marginTop: 24,
      marginBottom: 16,
      width: '100%',
    },
    detailsSectionTitle: {
      fontFamily: 'SpaceGrotesk_700Bold',
      fontSize: 14,
      letterSpacing: 0.5,
      marginBottom: 16,
      textTransform: 'uppercase',
    },
    detailsGrid: {
      flexDirection: 'column',
      width: '100%',
    },
    detailsRow: {
      flexDirection: 'column',
      paddingVertical: 10,
      borderBottomWidth: 1,
      width: '100%',
    },
    detailsRowSideBySide: {
      flexDirection: 'row',
      paddingVertical: 10,
      borderBottomWidth: 1,
      width: '100%',
    },
    detailHalf: {
      flex: 1,
    },
    detailLabel: {
      fontFamily: 'SpaceGrotesk_600SemiBold',
      fontSize: 11,
      textTransform: 'uppercase',
      marginBottom: 4,
    },
    detailVal: {
      fontFamily: 'Manrope_600SemiBold',
      fontSize: 14,
    },
  });
