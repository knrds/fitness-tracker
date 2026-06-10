import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  Pressable,
  ScrollView,
  Dimensions,
  Modal,
  Animated,
  Platform,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useRouter } from 'expo-router';
import { LineChart } from 'react-native-chart-kit';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';

import {
  WorkoutSession,
  ACHIEVEMENTS,
  formatDateLocal,
  getExerciseProgressHistory,
  summarizeSessionExercise,
  summarizeWorkout,
} from '@fitness-tracker/domain';

import { useHistoryStore } from '../../src/stores/historyStore';
import { useExerciseStore } from '../../src/stores/exerciseStore';
import { useAchievementStore } from '../../src/stores/achievementStore';
import { useAchievementCheck } from '../../src/hooks/useAchievementCheck';
import { useProfileStore } from '../../src/stores/profileStore';
import { useTheme, Card, EmptyState } from '@fitness-tracker/ui';
import { getLevelBadge } from '../../src/utils/level';

type HistorySet = WorkoutSession['exercises'][number]['sets'][number];

const CHART_PADDING_RIGHT = 64;
const KG_TO_LBS = 2.20462;

export default function HistoryScreen() {
  const [activeTab, setActiveTab] = useState<'history' | 'progress' | 'achievements'>('history');
  const theme = useTheme();
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
          ACTIVITY
        </Text>
      </View>
      <View style={styles.toggleContainer}>
        {(['history', 'progress', 'achievements'] as const).map((tab) => (
          <Pressable
            key={tab}
            style={[
              styles.toggleBtn,
              activeTab === tab && {
                borderBottomColor: theme.colors.primary,
                borderBottomWidth: 2,
              },
            ]}
            onPress={() => setActiveTab(tab)}
          >
            <Text
              style={[
                styles.toggleText,
                {
                  color: activeTab === tab ? theme.colors.primary : theme.colors.muted,
                  ...theme.typography.caption,
                },
              ]}
            >
              {tab.toUpperCase()}
            </Text>
          </Pressable>
        ))}
      </View>

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
  const router = useRouter();
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const { exercises: allExercises } = useExerciseStore();
  const profile = useProfileStore((state) => state.profile);
  const isImperial = profile?.preferredUnits === 'imperial';
  const volumeUnit = isImperial ? 'lbs' : 'kg';
  useHistoryStore((state) => state.sessions);
  const { getSessionsByDateDesc } = useHistoryStore();
  const sessions = getSessionsByDateDesc();
  const [selectedSession, setSelectedSession] = useState<WorkoutSession | null>(null);
  const [selectedDayKey, setSelectedDayKey] = useState<string | null>(null);

  const visibleSessions = selectedDayKey
    ? sessions.filter((session) => formatDateLocal(new Date(session.startedAt)) === selectedDayKey)
    : sessions;

  const formatDateKey = (dateKey: string) => {
    const [year = 0, month = 1, day = 1] = dateKey.split('-').map(Number);
    return new Intl.DateTimeFormat('en-US', {
      weekday: 'long',
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    }).format(new Date(year, month - 1, day));
  };

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

  const displayWeight = (weight?: number) => {
    if (weight === undefined) return '-';
    const value = isImperial ? weight * KG_TO_LBS : weight;
    return value.toFixed(1).replace(/\.0$/, '');
  };

  const displayVolume = (volumeKg: number) => {
    const value = isImperial ? volumeKg * KG_TO_LBS : volumeKg;
    return Math.round(value).toLocaleString();
  };

  const getSetTypeMeta = (type: HistorySet['type']) => {
    switch (type) {
      case 'warmup':
        return { label: 'W', name: 'Warmup' };
      case 'drop':
        return { label: 'D', name: 'Drop' };
      case 'failure':
        return { label: 'F', name: 'Failure' };
      case 'amrap':
        return { label: 'A', name: 'AMRAP' };
      case 'backoff':
        return { label: 'B', name: 'Backoff' };
      default:
        return null;
    }
  };

  const formatSetLine = (set: HistorySet) => {
    const load = set.weight !== undefined ? `${displayWeight(set.weight)} ${volumeUnit}` : null;
    const reps = set.reps !== undefined ? `${set.reps} rep${set.reps === 1 ? '' : 's'}` : null;
    const duration =
      set.durationSeconds !== undefined && set.durationSeconds > 0
        ? formatDuration(set.durationSeconds)
        : null;
    const distance =
      set.distanceMeters !== undefined && set.distanceMeters > 0
        ? `${(set.distanceMeters / 1000).toFixed(2).replace(/\.00$/, '')} km`
        : null;

    if (load && reps) return `${load} x ${set.reps}`;
    if (reps) return reps;
    if (duration && distance) return `${duration} - ${distance}`;
    if (duration) return duration;
    if (distance) return distance;
    if (load) return load;
    return 'Logged';
  };

  const renderItem = ({ item }: { item: WorkoutSession }) => {
    const summary = summarizeWorkout(item);

    const exerciseNames = item.exercises
      .map((se) => allExercises.find((e) => e.id === se.exerciseId)?.name)
      .filter(Boolean)
      .join(', ');

    const displayTotalVolume = displayVolume(summary.totalVolume);

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
              {displayTotalVolume}
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

  const summaryDisplayVolume = displayVolume(summaryTotalVolume);

  const ConsistencyGrid = () => {
    const [viewMode, setViewMode] = useState<'week' | 'month'>('week');
    const today = new Date();
    const sessionsByDate = sessions.reduce<Record<string, number>>((acc, session) => {
      const key = formatDateLocal(new Date(session.startedAt));
      acc[key] = (acc[key] || 0) + 1;
      return acc;
    }, {});

    const days = React.useMemo(() => {
      if (viewMode === 'week') {
        return Array.from({ length: 7 }).map((_, index) => {
          const date = new Date(today);
          date.setDate(today.getDate() - 6 + index);
          date.setHours(0, 0, 0, 0);
          return date;
        });
      }

      const first = new Date(today.getFullYear(), today.getMonth(), 1);
      const last = new Date(today.getFullYear(), today.getMonth() + 1, 0);
      return Array.from({ length: last.getDate() }).map((_, index) => {
        const date = new Date(first);
        date.setDate(index + 1);
        date.setHours(0, 0, 0, 0);
        return date;
      });
    }, [viewMode]);

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
        <View
          style={[
            styles.consistencyDays,
            viewMode === 'month' ? styles.consistencyDaysMonth : styles.consistencyDaysWeek,
          ]}
        >
          {days.map((day) => {
            const key = formatDateLocal(day);
            const count = sessionsByDate[key] || 0;
            const isToday = key === formatDateLocal(today);
            const isSelected = selectedDayKey === key;
            return (
              <Pressable
                key={key}
                onPress={() => setSelectedDayKey((current) => (current === key ? null : key))}
                style={[
                  styles.consistencyDay,
                  {
                    backgroundColor: isSelected ? 'rgba(144, 213, 255, 0.13)' : 'transparent',
                    borderColor: isSelected || isToday ? theme.colors.primary : theme.colors.border,
                  },
                  viewMode === 'month' && styles.consistencyDayMonth,
                ]}
                accessibilityRole="button"
                accessibilityLabel={`${formatDateKey(key)}, ${count} workout${count === 1 ? '' : 's'}`}
              >
                <Text
                  style={[
                    styles.consistencyDayLabel,
                    { color: isSelected || isToday ? theme.colors.primary : theme.colors.muted },
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
                          backgroundColor:
                            blockIndex < 3 ? theme.colors.primary : 'rgba(144, 213, 255, 0.55)',
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
          })}
        </View>
        <Text style={[styles.consistencyHint, { color: theme.colors.muted }]}>
          Each stacked block is one workout on that day.
        </Text>
      </Card>
    );
  };

  return (
    <>
      <FlatList
        data={visibleSessions}
        keyExtractor={(item) => item.id}
        renderItem={renderItem}
        contentContainerStyle={[styles.list, { paddingBottom: Math.max(insets.bottom + 20, 100) }]}
        ListHeaderComponent={
          <>
            <ConsistencyGrid />
            {selectedDayKey && (
              <View
                style={[
                  styles.dayFilterBar,
                  { backgroundColor: theme.colors.surface, borderColor: theme.colors.border },
                ]}
              >
                <View style={styles.dayFilterTextWrap}>
                  <Text style={[styles.dayFilterLabel, { color: theme.colors.muted }]}>
                    SHOWING DAY
                  </Text>
                  <Text style={[styles.dayFilterDate, { color: theme.colors.text }]}>
                    {formatDateKey(selectedDayKey)}
                  </Text>
                </View>
                <Pressable
                  style={[styles.dayFilterClear, { borderColor: theme.colors.border }]}
                  onPress={() => setSelectedDayKey(null)}
                  accessibilityRole="button"
                  accessibilityLabel="Show all workout history"
                >
                  <Ionicons name="close" size={16} color={theme.colors.muted} />
                </Pressable>
              </View>
            )}
          </>
        }
        ListEmptyComponent={
          <EmptyState
            title={selectedDayKey ? 'NO WORKOUTS THAT DAY' : 'NO WORKOUTS YET'}
            description={
              selectedDayKey
                ? 'Tap another block or clear the filter to view the full history.'
                : 'Your completed workouts will appear here.'
            }
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
        <Pressable style={styles.modalOverlay} onPress={() => setSelectedSession(null)}>
          <Pressable
            style={[
              styles.modalCard,
              {
                backgroundColor: theme.colors.surface,
                borderColor: theme.colors.border,
                borderRadius: theme.radius.lg,
                maxWidth: 400,
                maxHeight: '90%',
                alignItems: 'center',
              },
            ]}
            onPress={(e) => e.stopPropagation()}
          >
            {selectedSession && (
              <>
                <Pressable
                  style={styles.modalCloseBtn}
                  onPress={() => setSelectedSession(null)}
                  hitSlop={10}
                >
                  <Ionicons name="close" size={24} color={theme.colors.muted} />
                </Pressable>

                <View style={styles.modalIconContainer}>
                  <Ionicons name="barbell" size={48} color={theme.colors.primary} />
                </View>

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
                  {selectedSession.name.toUpperCase()}
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

                <View style={styles.summaryExerciseList}>
                  <Text style={[styles.summarySectionTitle, { color: theme.colors.muted }]}>
                    EXERCISES & SETS
                  </Text>
                  <ScrollView
                    style={styles.summaryExerciseScroller}
                    showsVerticalScrollIndicator={false}
                  >
                    {selectedSession.exercises.map((exercise, index) => {
                      const exerciseDef = allExercises.find(
                        (item) => item.id === exercise.exerciseId,
                      );
                      const exerciseSummary = summarizeSessionExercise(exercise);
                      const completedSets = exercise.sets.filter((set) => set.completed);
                      return (
                        <View
                          key={exercise.id}
                          style={[
                            styles.summaryExBlock,
                            {
                              backgroundColor: theme.colors.background,
                              borderColor: theme.colors.border,
                            },
                          ]}
                        >
                          <View style={styles.summaryExHeader}>
                            <Text
                              style={[styles.summaryExName, { color: theme.colors.text }]}
                              numberOfLines={2}
                            >
                              {index + 1}. {exerciseDef?.name ?? 'Unknown Exercise'}
                            </Text>
                            <Text
                              style={[styles.summaryExDetails, { color: theme.colors.primary }]}
                            >
                              {exerciseSummary.workingSetCount} sets -{' '}
                              {displayVolume(exerciseSummary.totalVolume)} {volumeUnit}
                            </Text>
                          </View>
                          <View style={styles.summarySetList}>
                            {(completedSets.length > 0 ? completedSets : exercise.sets).map(
                              (set) => {
                                const typeMeta = getSetTypeMeta(set.type);
                                return (
                                  <View
                                    key={set.id}
                                    style={[
                                      styles.summarySetPill,
                                      { borderColor: theme.colors.border },
                                      !set.completed && { opacity: 0.55 },
                                    ]}
                                  >
                                    <Text
                                      style={[
                                        styles.summarySetNumber,
                                        { color: theme.colors.muted },
                                      ]}
                                    >
                                      #{set.setNumber}
                                    </Text>
                                    <Text
                                      style={[styles.summarySetText, { color: theme.colors.text }]}
                                      numberOfLines={1}
                                    >
                                      {formatSetLine(set)}
                                    </Text>
                                    {typeMeta && (
                                      <View
                                        style={[
                                          styles.summarySetTypeBadge,
                                          { backgroundColor: 'rgba(144, 213, 255, 0.14)' },
                                        ]}
                                      >
                                        <Text
                                          style={[
                                            styles.summarySetTypeText,
                                            { color: theme.colors.primary },
                                          ]}
                                        >
                                          {typeMeta.label}
                                        </Text>
                                      </View>
                                    )}
                                  </View>
                                );
                              },
                            )}
                          </View>
                        </View>
                      );
                    })}
                  </ScrollView>
                </View>

                <View
                  style={[
                    styles.modalFactContainer,
                    { backgroundColor: theme.colors.background, borderColor: theme.colors.border },
                  ]}
                >
                  <Text style={[styles.modalFactTitle, { color: theme.colors.primary }]}>
                    💡 FUN FACT
                  </Text>
                  <Text style={[styles.modalFactText, { color: theme.colors.text }]}>
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
          </Pressable>
        </Pressable>
      </Modal>
    </>
  );
}

function ProgressView() {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const historyStore = useHistoryStore();
  const { exercises } = useExerciseStore();
  const { profile } = useProfileStore();
  const isImperial = profile.preferredUnits === 'imperial';
  const prs = historyStore.getPRs();
  const activeExerciseIds = Object.keys(prs);

  const [selectedExId, setSelectedExId] = useState<string | null>(
    activeExerciseIds.length > 0 ? activeExerciseIds[0] || null : null,
  );

  const [selectedPoint, setSelectedPoint] = useState<{
    date: string;
    volume: number;
    isPR: boolean;
    e1rm?: number;
  } | null>(null);

  const [crosshairIdx, setCrosshairIdx] = useState<number | null>(null);
  const [crosshairX, setCrosshairX] = useState<number | null>(null);

  const chartFadeAnim = React.useRef(new Animated.Value(0)).current;
  const chartSlideAnim = React.useRef(new Animated.Value(20)).current;

  React.useEffect(() => {
    setSelectedPoint(null);
    setCrosshairIdx(null);
    setCrosshairX(null);
    chartFadeAnim.setValue(0);
    chartSlideAnim.setValue(20);
    Animated.parallel([
      Animated.timing(chartFadeAnim, {
        toValue: 1,
        duration: 500,
        useNativeDriver: Platform.OS !== 'web',
      }),
      Animated.timing(chartSlideAnim, {
        toValue: 0,
        duration: 500,
        useNativeDriver: Platform.OS !== 'web',
      }),
    ]).start();
  }, [selectedExId]);

  const screenWidth = Dimensions.get('window').width;

  const getProgressHistory = (exerciseId: string) => {
    const exercise = exercises.find((e) => e.id === exerciseId);
    return getExerciseProgressHistory(exerciseId, historyStore.sessions, exercise?.name);
  };

  const renderChart = () => {
    if (!selectedExId) return null;
    const history = getProgressHistory(selectedExId);
    if (history.length < 2) {
      return (
        <Card padding="lg" style={{ alignItems: 'center' }}>
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

    const chartWidth = screenWidth - 64;

    const getPointX = (index: number) => {
      if (history.length <= 1) return chartWidth / 2;
      return CHART_PADDING_RIGHT + (index * (chartWidth - CHART_PADDING_RIGHT)) / history.length;
    };

    const selectHistoryPoint = (index: number, pointX = getPointX(index)) => {
      if (index < 0 || index >= history.length) return;
      const item = history[index];
      if (!item) return;
      const vol = isImperial ? Math.round(item.volume * 2.20462) : Math.round(item.volume);
      const clampedPointX = Math.max(0, Math.min(chartWidth, pointX));
      setCrosshairIdx(index);
      setCrosshairX(clampedPointX);
      setSelectedPoint({
        date: new Date(item.date).toLocaleDateString(),
        volume: vol,
        isPR: item.isPR,
        e1rm: isImperial ? Math.round(item.maxE1RM * 2.20462) : Math.round(item.maxE1RM),
      });
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    };

    const handleChartTouch = (touchX: number) => {
      if (history.length < 2) return;
      const firstPointX = getPointX(0);
      const lastPointX = getPointX(history.length - 1);
      const clampedX = Math.max(firstPointX, Math.min(lastPointX, touchX));
      const ratio =
        lastPointX === firstPointX ? 0 : (clampedX - firstPointX) / (lastPointX - firstPointX);
      const index = Math.round(ratio * (history.length - 1));

      if (index !== crosshairIdx && index >= 0 && index < history.length) {
        selectHistoryPoint(index, getPointX(index));
      }
    };

    const data = {
      labels: history.map((h) =>
        new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric' }).format(h.date),
      ),
      datasets: [
        {
          data: history.map((h) => (isImperial ? Math.round(h.volume * 2.20462) : h.volume)),
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
          Volume History
        </Text>

        {/* Selected Data Point Details */}
        {selectedPoint ? (
          <View
            style={[
              styles.tooltipContainer,
              {
                backgroundColor: theme.colors.background,
                borderColor: selectedPoint.isPR ? '#FFB020' : theme.colors.primary,
              },
            ]}
          >
            <Ionicons
              name={selectedPoint.isPR ? 'star' : 'stats-chart'}
              size={16}
              color={selectedPoint.isPR ? '#FFB020' : theme.colors.primary}
            />
            <Text style={[styles.tooltipText, { color: theme.colors.text, fontSize: 11 }]}>
              <Text style={{ fontFamily: 'SpaceGrotesk_700Bold' }}>{selectedPoint.date}</Text>: Vol:{' '}
              <Text
                style={{
                  color: selectedPoint.isPR ? '#FFB020' : theme.colors.primary,
                  fontFamily: 'SpaceGrotesk_700Bold',
                }}
              >
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
                <Text style={{ color: '#FFB020', fontFamily: 'SpaceGrotesk_700Bold' }}>
                  {' '}
                  (★ PR!)
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
            💡 Slide your finger across the chart to view e1RM & Volume
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
              return point?.isPR ? '#FFB020' : theme.colors.primary;
            }}
            chartConfig={{
              backgroundColor: theme.colors.surface,
              backgroundGradientFrom: theme.colors.surface,
              backgroundGradientTo: theme.colors.surface,
              decimalPlaces: 0,
              color: (opacity = 1) => `rgba(144, 213, 255, ${opacity})`,
              labelColor: () => theme.colors.muted,
              propsForDots: { r: '6', strokeWidth: '2.5', stroke: theme.colors.surface },
            }}
            bezier
            style={{ marginVertical: 8, borderRadius: 16 }}
          />

          {crosshairX !== null && (
            <View
              style={{
                position: 'absolute',
                top: 16,
                bottom: 24,
                left: crosshairX,
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
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chipScroll}>
            {activeExerciseIds.map((id) => {
              const ex = exercises.find((e) => e.id === id);
              const isSelected = id === selectedExId;
              return (
                <Pressable
                  key={id}
                  style={[
                    styles.chip,
                    { backgroundColor: isSelected ? theme.colors.primary : theme.colors.surface },
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
          </ScrollView>
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
        </>
      )}
    </ScrollView>
  );
}

const GOLD = '#FFB020';

function AchievementBadge({ kind }: { kind: 'one_time' | 'repeatable' }) {
  const theme = useTheme();
  const color = kind === 'repeatable' ? GOLD : theme.colors.muted;
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
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const { xp, level, unlockedAchievements, repeatCounts } = useAchievementStore();
  const { getProgress } = useAchievementCheck();

  const currentLevelXp = xp % 500;
  const xpProgressPercent = Math.min(100, Math.floor((currentLevelXp / 500) * 100));

  const oneTime = ACHIEVEMENTS.filter((a) => !a.repeatable);
  const repeatables = ACHIEVEMENTS.filter((a) => a.repeatable);
  const unlockedList = oneTime.filter((a) => unlockedAchievements[a.id] !== undefined);
  const lockedList = oneTime.filter((a) => unlockedAchievements[a.id] === undefined);

  return (
    <ScrollView
      contentContainerStyle={[styles.content, { paddingBottom: Math.max(insets.bottom + 20, 100) }]}
    >
      {/* Level Card */}
      <Card style={styles.levelCard} padding="lg">
        <View style={styles.levelHeader}>
          <Text
            style={[
              styles.levelTitle,
              { color: theme.colors.text, ...theme.typography.heading, fontSize: 22 },
            ]}
          >
            LEVEL {level} • {getLevelBadge(level).title} {getLevelBadge(level).icon}
          </Text>
          <Text
            style={[styles.xpText, { color: theme.colors.primary, ...theme.typography.heading }]}
          >
            {currentLevelXp} / 500 XP
          </Text>
        </View>
        <View style={[styles.progressBarBg, { backgroundColor: theme.colors.surface }]}>
          <View
            style={[
              styles.progressBarFill,
              { backgroundColor: theme.colors.primary, width: `${xpProgressPercent}%` },
            ]}
          />
        </View>
        <Text style={[styles.xpSub, { color: theme.colors.muted, ...theme.typography.caption }]}>
          {500 - currentLevelXp} XP TO LEVEL {level + 1}
        </Text>
      </Card>

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
              earned ? { borderColor: GOLD, borderWidth: 1 } : { opacity: 0.6 },
            ]}
            padding="md"
          >
            <View style={styles.achRow}>
              <View style={[styles.achIconContainer, { backgroundColor: theme.colors.surface }]}>
                <Ionicons
                  name={ach.icon as React.ComponentProps<typeof Ionicons>['name']}
                  size={24}
                  color={earned ? GOLD : theme.colors.muted}
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
              {earned && <Text style={[styles.achCount, { color: GOLD }]}>×{count}</Text>}
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
              <Card key={ach.id} style={[styles.achCard, { opacity: 0.6 }]} padding="md">
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

const styles = StyleSheet.create({
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
  chartContainer: { borderRadius: 16, padding: 16, borderWidth: 1, alignItems: 'center' },
  chartTitle: { alignSelf: 'flex-start', marginBottom: 16 },
  levelCard: {
    marginBottom: 32,
  },
  levelHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'baseline',
    marginBottom: 16,
  },
  levelTitle: {},
  xpText: {},
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
    width: '100%',
    marginBottom: 18,
  },
  summarySectionTitle: {
    fontFamily: 'SpaceGrotesk_700Bold',
    fontSize: 11,
    letterSpacing: 1,
    marginBottom: 10,
  },
  summaryExerciseScroller: {
    maxHeight: 210,
    width: '100%',
  },
  summaryExBlock: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 12,
    marginBottom: 10,
  },
  summaryExHeader: {
    marginBottom: 10,
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
  summarySetList: {
    gap: 8,
  },
  summarySetPill: {
    minHeight: 36,
    borderWidth: 1,
    borderRadius: 9,
    paddingHorizontal: 10,
    paddingVertical: 7,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  summarySetNumber: {
    width: 28,
    fontSize: 11,
    fontFamily: 'SpaceGrotesk_700Bold',
  },
  summarySetText: {
    flex: 1,
    fontSize: 13,
    fontFamily: 'Manrope_700Bold',
  },
  summarySetTypeBadge: {
    minWidth: 22,
    height: 22,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 6,
  },
  summarySetTypeText: {
    fontSize: 10,
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
    borderColor: '#2A2B31',
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
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  consistencyToggleText: {
    fontFamily: 'SpaceGrotesk_700Bold',
    fontSize: 10,
    letterSpacing: 0.5,
  },
  consistencyDays: {
    flexDirection: 'row',
    gap: 8,
  },
  consistencyDaysWeek: {
    justifyContent: 'space-between',
  },
  consistencyDaysMonth: {
    flexWrap: 'wrap',
  },
  consistencyDay: {
    flex: 1,
    minWidth: 40,
    minHeight: 82,
    borderWidth: 1,
    borderRadius: 10,
    padding: 6,
    alignItems: 'center',
  },
  consistencyDayMonth: {
    flexBasis: '12.8%',
    flexGrow: 0,
    minWidth: 0,
    minHeight: 68,
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
  dayFilterBar: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 12,
    marginBottom: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  dayFilterTextWrap: {
    flex: 1,
  },
  dayFilterLabel: {
    fontFamily: 'SpaceGrotesk_700Bold',
    fontSize: 10,
    letterSpacing: 1,
    marginBottom: 4,
  },
  dayFilterDate: {
    fontFamily: 'Manrope_700Bold',
    fontSize: 14,
  },
  dayFilterClear: {
    width: 34,
    height: 34,
    borderRadius: 17,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalIconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(144, 213, 255, 0.15)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
    alignSelf: 'center',
  },
  modalSubtitle: {
    fontFamily: 'Manrope_500Medium',
    fontSize: 14,
    textAlign: 'center',
    marginBottom: 24,
  },
  modalStatsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
    marginBottom: 24,
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
    padding: 16,
    marginBottom: 24,
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
});
