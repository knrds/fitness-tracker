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

import { useRouter } from 'expo-router';
import { LineChart } from 'react-native-chart-kit';
import { Ionicons } from '@expo/vector-icons';

import { WorkoutSession, ACHIEVEMENTS, estimateOneRepMax } from '@fitness-tracker/domain';

import { useHistoryStore } from '../../src/stores/historyStore';
import { useExerciseStore } from '../../src/stores/exerciseStore';
import { useAchievementStore } from '../../src/stores/achievementStore';
import { useAchievementCheck } from '../../src/hooks/useAchievementCheck';
import { useProfileStore } from '../../src/stores/profileStore';
import { useTheme, Card, EmptyState } from '@fitness-tracker/ui';
import { getLevelBadge } from '../../src/utils/level';

export default function HistoryScreen() {
  const [activeTab, setActiveTab] = useState<'history' | 'progress' | 'achievements'>('history');
  const theme = useTheme();

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
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
  const { exercises: allExercises } = useExerciseStore();
  useHistoryStore((state) => state.sessions);
  const { getSessionsByDateDesc } = useHistoryStore();
  const sessions = getSessionsByDateDesc();
  const [selectedSession, setSelectedSession] = useState<WorkoutSession | null>(null);

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

  const renderItem = ({ item }: { item: WorkoutSession }) => {
    const totalSets = item.exercises.reduce(
      (sum, ex) => sum + ex.sets.filter((s) => s.completed).length,
      0,
    );
    const totalVolume = item.exercises.reduce(
      (sum, ex) =>
        sum +
        ex.sets
          .filter((s) => s.completed && s.weight)
          .reduce((sSum, s) => sSum + s.weight! * (s.reps || 0), 0),
      0,
    );

    const exerciseNames = item.exercises
      .map((se) => allExercises.find((e) => e.id === se.exerciseId)?.name)
      .filter(Boolean)
      .join(', ');

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
              {formatDuration(item.durationSeconds)}
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
              {Math.round(totalVolume)}
            </Text>
            <Text
              style={[styles.statLabel, { color: theme.colors.muted, ...theme.typography.caption }]}
            >
              Volume
            </Text>
          </View>
          <View style={styles.statItem}>
            <Text
              style={[
                styles.statValue,
                { color: theme.colors.text, ...theme.typography.body, fontWeight: 'bold' },
              ]}
            >
              {totalSets}
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

  const summaryTotalSets =
    selectedSession?.exercises.reduce(
      (sum, ex) => sum + ex.sets.filter((s) => s.completed).length,
      0,
    ) ?? 0;
  const summaryTotalVolume =
    selectedSession?.exercises.reduce(
      (sum, ex) =>
        sum +
        ex.sets
          .filter((s) => s.completed && s.weight)
          .reduce((sSum, s) => sSum + s.weight! * (s.reps || 0), 0),
      0,
    ) ?? 0;

  return (
    <>
      <FlatList
        data={sessions}
        keyExtractor={(item) => item.id}
        renderItem={renderItem}
        contentContainerStyle={styles.list}
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
        <Pressable style={styles.summaryOverlay} onPress={() => setSelectedSession(null)}>
          <View style={styles.summarySheet} onStartShouldSetResponder={() => true}>
            {selectedSession && (
              <>
                <View style={styles.summaryGripArea}>
                  <View style={[styles.summaryGrip, { backgroundColor: theme.colors.border }]} />
                </View>
                <Text
                  style={[
                    styles.summaryTitle,
                    { color: theme.colors.text, ...theme.typography.heading },
                  ]}
                >
                  {selectedSession.name}
                </Text>
                <Text
                  style={[
                    styles.summaryDate,
                    { color: theme.colors.muted, ...theme.typography.caption },
                  ]}
                >
                  {formatDate(selectedSession.startedAt)}
                </Text>
                <View style={styles.summaryStatsRow}>
                  <View style={styles.summaryStat}>
                    <Text
                      style={[
                        styles.summaryStatValue,
                        { color: theme.colors.primary, ...theme.typography.display },
                      ]}
                    >
                      {formatDuration(selectedSession.durationSeconds)}
                    </Text>
                    <Text
                      style={[
                        styles.summaryStatLabel,
                        { color: theme.colors.muted, ...theme.typography.caption },
                      ]}
                    >
                      DURATION
                    </Text>
                  </View>
                  <View style={styles.summaryStat}>
                    <Text
                      style={[
                        styles.summaryStatValue,
                        { color: theme.colors.primary, ...theme.typography.display },
                      ]}
                    >
                      {Math.round(summaryTotalVolume)}
                    </Text>
                    <Text
                      style={[
                        styles.summaryStatLabel,
                        { color: theme.colors.muted, ...theme.typography.caption },
                      ]}
                    >
                      VOLUME
                    </Text>
                  </View>
                  <View style={styles.summaryStat}>
                    <Text
                      style={[
                        styles.summaryStatValue,
                        { color: theme.colors.primary, ...theme.typography.display },
                      ]}
                    >
                      {summaryTotalSets}
                    </Text>
                    <Text
                      style={[
                        styles.summaryStatLabel,
                        { color: theme.colors.muted, ...theme.typography.caption },
                      ]}
                    >
                      SETS
                    </Text>
                  </View>
                </View>
                <View style={styles.summaryExercises}>
                  {selectedSession.exercises.map((ex) => {
                    const exInfo = allExercises.find((e) => e.id === ex.exerciseId);
                    const completedSets = ex.sets.filter((s) => s.completed);
                    return (
                      <View key={ex.id} style={styles.summaryExRow}>
                        <Text
                          style={[
                            styles.summaryExName,
                            { color: theme.colors.text, ...theme.typography.body },
                          ]}
                        >
                          {exInfo?.name || 'Unknown'}
                        </Text>
                        <Text
                          style={[
                            styles.summaryExDetail,
                            { color: theme.colors.muted, ...theme.typography.caption },
                          ]}
                        >
                          {completedSets.length} sets
                          {completedSets[0]?.weight
                            ? ` · ${completedSets[0].weight}kg × ${completedSets[0].reps ?? '?'}`
                            : ''}
                        </Text>
                      </View>
                    );
                  })}
                </View>
                <Pressable
                  style={[styles.summaryDetailBtn, { backgroundColor: theme.colors.primary }]}
                  onPress={() => {
                    const id = selectedSession.id;
                    setSelectedSession(null);
                    router.push(`/history/${id}` as unknown as Parameters<typeof router.push>[0]);
                  }}
                >
                  <Text
                    style={[
                      styles.summaryDetailBtnText,
                      { color: theme.colors.background, ...theme.typography.button },
                    ]}
                  >
                    VIEW FULL DETAILS
                  </Text>
                </Pressable>
              </>
            )}
          </View>
        </Pressable>
      </Modal>
    </>
  );
}

function ProgressView() {
  const theme = useTheme();
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
  } | null>(null);

  const chartFadeAnim = React.useRef(new Animated.Value(0)).current;
  const chartSlideAnim = React.useRef(new Animated.Value(20)).current;

  React.useEffect(() => {
    setSelectedPoint(null);
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
    const exerciseName = exercise?.name;

    const points: { date: Date; volume: number; maxE1RM: number; isPR: boolean }[] = [];
    const sortedSessions = [...historyStore.sessions].sort(
      (a, b) => a.startedAt.getTime() - b.startedAt.getTime(),
    );

    let historicalMax = 0;

    sortedSessions.forEach((session) => {
      let volume = 0;
      let sessionMaxE1RM = 0;

      const ex = session.exercises.find((e) => e.exerciseId === exerciseId);
      if (ex) {
        ex.sets.forEach((set) => {
          if (set.completed && set.weight && set.reps && set.type !== 'warmup') {
            volume += set.weight * set.reps;
            const e1rm = estimateOneRepMax(set.weight, set.reps, set.rpe, set.rir, exerciseName);
            if (e1rm > sessionMaxE1RM) {
              sessionMaxE1RM = e1rm;
            }
          }
        });
      }

      if (volume > 0) {
        const isPR = sessionMaxE1RM > historicalMax;
        if (isPR) {
          historicalMax = sessionMaxE1RM;
        }
        points.push({
          date: session.startedAt,
          volume,
          maxE1RM: sessionMaxE1RM,
          isPR,
        });
      }
    });

    return points;
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
            <Text style={[styles.tooltipText, { color: theme.colors.text }]}>
              <Text style={{ fontFamily: 'SpaceGrotesk_700Bold' }}>{selectedPoint.date}</Text>:{' '}
              <Text
                style={{
                  color: selectedPoint.isPR ? '#FFB020' : theme.colors.primary,
                  fontFamily: 'SpaceGrotesk_700Bold',
                }}
              >
                {selectedPoint.volume} {isImperial ? 'lbs' : 'kg'}
              </Text>
              {selectedPoint.isPR && (
                <Text style={{ color: '#FFB020', fontFamily: 'SpaceGrotesk_700Bold' }}>
                  {' '}
                  (★ NEW PR!)
                </Text>
              )}
            </Text>
            <Pressable onPress={() => setSelectedPoint(null)} hitSlop={10}>
              <Ionicons name="close-circle" size={18} color={theme.colors.muted} />
            </Pressable>
          </View>
        ) : (
          <Text style={[styles.chartTipText, { color: theme.colors.muted }]}>
            💡 Tap any point on the chart to see details
          </Text>
        )}

        <LineChart
          data={data}
          width={screenWidth - 64}
          height={220}
          withInnerLines={false}
          withOuterLines={false}
          onDataPointClick={({ index }) => {
            const item = history[index];
            if (item) {
              const vol = isImperial ? Math.round(item.volume * 2.20462) : Math.round(item.volume);
              setSelectedPoint({
                date: new Date(item.date).toLocaleDateString(),
                volume: vol,
                isPR: item.isPR,
              });
            }
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
            color: () => theme.colors.primary,
            labelColor: () => theme.colors.muted,
            propsForDots: { r: '6', strokeWidth: '2.5', stroke: theme.colors.surface },
          }}
          bezier
          style={{ marginVertical: 8, borderRadius: 16 }}
        />
      </Animated.View>
    );
  };

  return (
    <ScrollView contentContainerStyle={styles.content}>
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
  const { xp, level, unlockedAchievements, repeatCounts } = useAchievementStore();
  const { getProgress } = useAchievementCheck();

  const currentLevelXp = xp % 500;
  const xpProgressPercent = Math.min(100, Math.floor((currentLevelXp / 500) * 100));

  const oneTime = ACHIEVEMENTS.filter((a) => !a.repeatable);
  const repeatables = ACHIEVEMENTS.filter((a) => a.repeatable);
  const unlockedList = oneTime.filter((a) => unlockedAchievements[a.id] !== undefined);
  const lockedList = oneTime.filter((a) => unlockedAchievements[a.id] === undefined);

  return (
    <ScrollView contentContainerStyle={styles.content}>
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
    paddingTop: 48,
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
  summaryOverlay: {
    flex: 1,
    backgroundColor: 'rgba(11, 11, 15, 0.7)',
    justifyContent: 'flex-end',
  },
  summarySheet: {
    backgroundColor: '#1A1C23',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    borderWidth: 1,
    borderColor: '#2A2B31',
    paddingHorizontal: 24,
    paddingBottom: 40,
    maxHeight: '70%',
  },
  summaryGripArea: {
    width: '100%',
    alignItems: 'center',
    paddingVertical: 12,
  },
  summaryGrip: {
    width: 40,
    height: 4,
    borderRadius: 2,
  },
  summaryTitle: {
    fontSize: 22,
    marginBottom: 4,
  },
  summaryDate: {
    marginBottom: 20,
  },
  summaryStatsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 24,
    gap: 12,
  },
  summaryStat: {
    flex: 1,
    alignItems: 'center',
    backgroundColor: '#0B0B0F',
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#2A2B31',
  },
  summaryStatValue: {
    fontSize: 20,
    marginBottom: 4,
  },
  summaryStatLabel: {
    fontSize: 10,
  },
  summaryExercises: {
    marginBottom: 24,
    gap: 12,
  },
  summaryExRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#2A2B31',
  },
  summaryExName: {
    flex: 1,
    marginRight: 8,
  },
  summaryExDetail: {},
  summaryDetailBtn: {
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  summaryDetailBtnText: {
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
});
