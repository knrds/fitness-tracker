import React, { useState } from 'react';
import { View, Text, StyleSheet, FlatList, Pressable, ScrollView, Dimensions } from 'react-native';

import { useRouter } from 'expo-router';
import { LineChart } from 'react-native-chart-kit';
import { Ionicons } from '@expo/vector-icons';

import { WorkoutSession, ACHIEVEMENTS } from '@fitness-tracker/domain';

import { useHistoryStore } from '../../src/stores/historyStore';
import { useExerciseStore } from '../../src/stores/exerciseStore';
import { useAchievementStore } from '../../src/stores/achievementStore';
import { useAchievementCheck } from '../../src/hooks/useAchievementCheck';
import { useProfileStore } from '../../src/stores/profileStore';
import { useTheme, Card, EmptyState } from '@fitness-tracker/ui';

export default function HistoryScreen() {
  const [activeTab, setActiveTab] = useState<'history' | 'progress' | 'achievements'>('history');
  const theme = useTheme();

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <View style={styles.header}>
        <Text style={[styles.headerTitle, { color: theme.colors.text, ...theme.typography.heading }]}>
          ACTIVITY
        </Text>
      </View>
      <View style={styles.toggleContainer}>
        {(['history', 'progress', 'achievements'] as const).map(tab => (
          <Pressable 
            key={tab}
            style={[styles.toggleBtn, activeTab === tab && { borderBottomColor: theme.colors.primary, borderBottomWidth: 2 }]}
            onPress={() => setActiveTab(tab)}
          >
            <Text style={[
              styles.toggleText, 
              { color: activeTab === tab ? theme.colors.primary : theme.colors.muted, ...theme.typography.caption }
            ]}>
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
  useHistoryStore((state) => state.sessions);
  const { getSessionsByDateDesc } = useHistoryStore();
  const sessions = getSessionsByDateDesc();

  const formatDate = (date: Date) => {
    return new Intl.DateTimeFormat('en-US', {
      weekday: 'short', month: 'short', day: 'numeric',
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
    const totalSets = item.exercises.reduce((sum, ex) => sum + ex.sets.filter(s => s.completed).length, 0);
    const totalVolume = item.exercises.reduce((sum, ex) => sum + ex.sets.filter(s => s.completed && s.weight).reduce((sSum, s) => sSum + s.weight! * (s.reps || 0), 0), 0);
    
    return (
      <Card 
        style={styles.card} 
        onPress={() => router.push(`/history/${item.id}` as unknown as Parameters<typeof router.push>[0])}
        padding="lg"
      >
        <View style={styles.cardHeader}>
          <Text style={[styles.title, { color: theme.colors.text, ...theme.typography.heading, fontSize: 18 }]}>{item.name}</Text>
          <Text style={[styles.date, { color: theme.colors.muted, ...theme.typography.caption }]}>{formatDate(item.startedAt)}</Text>
        </View>
        <View style={styles.stats}>
          <View style={styles.statItem}>
            <Text style={[styles.statValue, { color: theme.colors.text, ...theme.typography.body, fontWeight: 'bold' }]}>{formatDuration(item.durationSeconds)}</Text>
            <Text style={[styles.statLabel, { color: theme.colors.muted, ...theme.typography.caption }]}>Time</Text>
          </View>
          <View style={styles.statItem}>
            <Text style={[styles.statValue, { color: theme.colors.text, ...theme.typography.body, fontWeight: 'bold' }]}>{Math.round(totalVolume)}</Text>
            <Text style={[styles.statLabel, { color: theme.colors.muted, ...theme.typography.caption }]}>Volume</Text>
          </View>
          <View style={styles.statItem}>
            <Text style={[styles.statValue, { color: theme.colors.text, ...theme.typography.body, fontWeight: 'bold' }]}>{totalSets}</Text>
            <Text style={[styles.statLabel, { color: theme.colors.muted, ...theme.typography.caption }]}>Sets</Text>
          </View>
        </View>
      </Card>
    );
  };

  return (
    <FlatList
      data={sessions}
      keyExtractor={item => item.id}
      renderItem={renderItem}
      contentContainerStyle={styles.list}
      ListEmptyComponent={
        <EmptyState 
          title="NO WORKOUTS YET"
          description="Your completed workouts will appear here."
        />
      }
    />
  );
}

function ProgressView() {
  const theme = useTheme();
  useHistoryStore((state) => state.sessions);
  const { getPRs, getExerciseVolumeHistory } = useHistoryStore();
  const { exercises } = useExerciseStore();
  const { profile } = useProfileStore();
  const isImperial = profile.preferredUnits === 'imperial';
  const prs = getPRs();
  const activeExerciseIds = Object.keys(prs);
  
  const [selectedExId, setSelectedExId] = useState<string | null>(
    activeExerciseIds.length > 0 ? (activeExerciseIds[0] || null) : null
  );

  const screenWidth = Dimensions.get('window').width;

  const renderChart = () => {
    if (!selectedExId) return null;
    const history = getExerciseVolumeHistory(selectedExId);
    if (history.length < 2) {
      return (
        <Card padding="lg" style={{ alignItems: 'center' }}>
          <Text style={[{ color: theme.colors.text, fontSize: 16, marginBottom: 4 }, theme.typography.heading]}>Not enough data</Text>
          <Text style={[{ color: theme.colors.muted }, theme.typography.body]}>Complete at least 2 sessions.</Text>
        </Card>
      );
    }
    const data = {
      labels: history.map(h => new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric' }).format(new Date(h.date))),
      datasets: [
        { data: history.map(h => isImperial ? Math.round(h.volume * 2.20462) : h.volume), color: () => theme.colors.primary, strokeWidth: 2 }
      ],
    };
    return (
      <View style={[styles.chartContainer, { backgroundColor: theme.colors.surface, borderColor: theme.colors.muted }]}>
        <Text style={[styles.chartTitle, { color: theme.colors.text, ...theme.typography.heading }]}>Volume History</Text>
        <LineChart
          data={data} width={screenWidth - 64} height={220}
          withInnerLines={false}
          withOuterLines={false}
          chartConfig={{
            backgroundColor: theme.colors.surface, backgroundGradientFrom: theme.colors.surface, backgroundGradientTo: theme.colors.surface,
            decimalPlaces: 0, color: () => theme.colors.primary,
            labelColor: () => theme.colors.muted,
            propsForDots: { r: '4', strokeWidth: '2', stroke: theme.colors.surface }
          }}
          bezier style={{ marginVertical: 8, borderRadius: 16 }}
        />
      </View>
    );
  };

  return (
    <ScrollView contentContainerStyle={styles.content}>
      <Text style={[styles.sectionTitle, { color: theme.colors.text, ...theme.typography.heading, fontSize: 20 }]}>PERSONAL RECORDS</Text>
      {activeExerciseIds.length === 0 ? (
        <Text style={[{ color: theme.colors.muted, ...theme.typography.body }]}>Complete a workout to see your PRs.</Text>
      ) : (
        <>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chipScroll}>
            {activeExerciseIds.map(id => {
              const ex = exercises.find(e => e.id === id);
              const isSelected = id === selectedExId;
              return (
                <Pressable key={id} style={[styles.chip, { backgroundColor: isSelected ? theme.colors.primary : theme.colors.surface }]} onPress={() => setSelectedExId(id)}>
                  <Text style={[styles.chipText, { color: isSelected ? theme.colors.background : theme.colors.muted, ...theme.typography.caption }]}>{ex?.name || 'Unknown'}</Text>
                </Pressable>
              );
            })}
          </ScrollView>
          {selectedExId && prs[selectedExId] !== undefined && (
            <Card style={styles.prHighlight} padding="md">
              <Text style={[styles.prHighlightLabel, { color: theme.colors.muted, ...theme.typography.caption }]}>BEST WEIGHT</Text>
              <Text style={[styles.prHighlightValue, { color: theme.colors.primary, ...theme.typography.display, fontSize: 32 }]}>
                {(() => {
                  const rawVal = prs[selectedExId]!;
                  const converted = isImperial ? rawVal * 2.20462 : rawVal;
                  const roundedDown = Math.floor(converted * 100) / 100;
                  return roundedDown.toFixed(2);
                })()} {isImperial ? 'lbs' : 'kg'}
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
      <Text style={[styles.kindBadgeText, { color }]}>{kind === 'repeatable' ? 'REPEATABLE' : 'ONE-TIME'}</Text>
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
          <Text style={[styles.levelTitle, { color: theme.colors.text, ...theme.typography.heading, fontSize: 24 }]}>LEVEL {level}</Text>
          <Text style={[styles.xpText, { color: theme.colors.primary, ...theme.typography.heading }]}>{currentLevelXp} / 500 XP</Text>
        </View>
        <View style={[styles.progressBarBg, { backgroundColor: theme.colors.surface }]}>
          <View style={[styles.progressBarFill, { backgroundColor: theme.colors.primary, width: `${xpProgressPercent}%` }]} />
        </View>
        <Text style={[styles.xpSub, { color: theme.colors.muted, ...theme.typography.caption }]}>{500 - currentLevelXp} XP TO LEVEL {level + 1}</Text>
      </Card>

      {/* Repeatable */}
      <Text style={[styles.sectionTitle, { color: theme.colors.text, ...theme.typography.heading, fontSize: 20 }]}>REPEATABLE</Text>
      {repeatables.map((ach) => {
        const count = repeatCounts[ach.id] || 0;
        const earned = count > 0;
        return (
          <Card key={ach.id} style={[styles.achCard, earned ? { borderColor: GOLD, borderWidth: 1 } : { opacity: 0.6 }]} padding="md">
            <View style={styles.achRow}>
              <View style={[styles.achIconContainer, { backgroundColor: theme.colors.surface }]}>
                <Ionicons name={ach.icon as React.ComponentProps<typeof Ionicons>['name']} size={24} color={earned ? GOLD : theme.colors.muted} />
              </View>
              <View style={styles.achInfo}>
                <View style={styles.achNameRow}>
                  <Text style={[styles.achName, { color: theme.colors.text, ...theme.typography.body, fontWeight: 'bold' }]}>{ach.name}</Text>
                  <AchievementBadge kind="repeatable" />
                </View>
                <Text style={[styles.achDesc, { color: theme.colors.muted, ...theme.typography.caption }]}>{ach.description}</Text>
              </View>
              {earned && (
                <Text style={[styles.achCount, { color: GOLD }]}>×{count}</Text>
              )}
            </View>
          </Card>
        );
      })}

      {unlockedList.length > 0 && (
        <>
          <Text style={[styles.sectionTitle, { color: theme.colors.text, ...theme.typography.heading, fontSize: 20, marginTop: 24 }]}>UNLOCKED ({unlockedList.length})</Text>
          {unlockedList.map(ach => (
            <Card key={ach.id} style={[styles.achCard, { borderColor: theme.colors.primary, borderWidth: 1 }]} padding="md">
              <View style={styles.achRow}>
                <View style={[styles.achIconContainer, { backgroundColor: theme.colors.surface }]}>
                  <Ionicons name={ach.icon as React.ComponentProps<typeof Ionicons>['name']} size={24} color={theme.colors.primary} />
                </View>
                <View style={styles.achInfo}>
                  <View style={styles.achNameRow}>
                    <Text style={[styles.achName, { color: theme.colors.text, ...theme.typography.body, fontWeight: 'bold' }]}>{ach.name}</Text>
                    <AchievementBadge kind="one_time" />
                  </View>
                  <Text style={[styles.achDesc, { color: theme.colors.muted, ...theme.typography.caption }]}>{ach.description}</Text>
                </View>
              </View>
            </Card>
          ))}
        </>
      )}

      {lockedList.length > 0 && (
        <>
          <Text style={[styles.sectionTitle, { color: theme.colors.text, ...theme.typography.heading, fontSize: 20, marginTop: 24 }]}>LOCKED ({lockedList.length})</Text>
          {lockedList.map(ach => {
            const prog = getProgress(ach.id);
            return (
              <Card key={ach.id} style={[styles.achCard, { opacity: 0.6 }]} padding="md">
                <View style={styles.achRow}>
                  <View style={[styles.achIconContainer, { backgroundColor: theme.colors.surface }]}>
                    <Ionicons name={ach.icon as React.ComponentProps<typeof Ionicons>['name']} size={24} color={theme.colors.muted} />
                  </View>
                  <View style={styles.achInfo}>
                    <View style={styles.achNameRow}>
                      <Text style={[styles.achName, { color: theme.colors.text, ...theme.typography.body, fontWeight: 'bold' }]}>{ach.name}</Text>
                      <AchievementBadge kind="one_time" />
                    </View>
                    <Text style={[styles.achDesc, { color: theme.colors.muted, ...theme.typography.caption }]}>{ach.description}</Text>
                    <View style={styles.achProgressRow}>
                      <View style={[styles.achProgressBarBg, { backgroundColor: theme.colors.surface }]}>
                        <View style={[styles.achProgressBarFill, { backgroundColor: theme.colors.muted, width: `${prog.percent}%` }]} />
                      </View>
                      <Text style={[styles.achProgressText, { color: theme.colors.muted, ...theme.typography.caption, marginLeft: 8 }]}>
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
  headerTitle: {
  },
  toggleContainer: {
    flexDirection: 'row',
    paddingHorizontal: 24,
    marginBottom: 16,
  },
  toggleBtn: {
    marginRight: 24,
    paddingVertical: 8,
  },
  toggleText: { 
  },
  list: { paddingHorizontal: 24, paddingBottom: 40 },
  card: {
    marginBottom: 16,
  },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 },
  title: { flex: 1, marginRight: 8 },
  date: { },
  stats: { flexDirection: 'row', gap: 24 },
  statItem: { alignItems: 'flex-start' },
  statValue: { marginBottom: 2 },
  statLabel: { },
  content: { paddingHorizontal: 24, paddingBottom: 40 },
  sectionTitle: { marginBottom: 16 },
  chipScroll: { marginBottom: 24 },
  chip: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20, marginRight: 8 },
  chipText: { },
  prHighlight: {
    alignItems: 'flex-start',
    marginBottom: 24,
  },
  prHighlightLabel: { marginBottom: 8 },
  prHighlightValue: { },
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
  levelTitle: {
  },
  xpText: {
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
  xpSub: {
  },
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
  achProgressText: {
  },
});
