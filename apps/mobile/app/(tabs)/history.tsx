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


export default function HistoryScreen() {
  const [activeTab, setActiveTab] = useState<'history' | 'progress' | 'achievements'>('history');

  return (
    <View style={styles.container}>
      <View style={styles.toggleContainer}>
        <Pressable 
          style={[styles.toggleBtn, activeTab === 'history' && styles.toggleBtnActive]}
          onPress={() => setActiveTab('history')}
        >
          <Text style={[styles.toggleText, activeTab === 'history' && styles.toggleTextActive]}>History</Text>
        </Pressable>
        <Pressable 
          style={[styles.toggleBtn, activeTab === 'progress' && styles.toggleBtnActive]}
          onPress={() => setActiveTab('progress')}
        >
          <Text style={[styles.toggleText, activeTab === 'progress' && styles.toggleTextActive]}>Progress</Text>
        </Pressable>
        <Pressable 
          style={[styles.toggleBtn, activeTab === 'achievements' && styles.toggleBtnActive]}
          onPress={() => setActiveTab('achievements')}
        >
          <Text style={[styles.toggleText, activeTab === 'achievements' && styles.toggleTextActive]}>Achievements</Text>
        </Pressable>
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
  useHistoryStore((state) => state.sessions);
  const { getSessionsByDateDesc } = useHistoryStore();
  const sessions = getSessionsByDateDesc();

  const formatDate = (date: Date) => {
    return new Intl.DateTimeFormat('en-US', {
      weekday: 'short', month: 'short', day: 'numeric',
      hour: 'numeric', minute: '2-digit'
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
    return (
      <Pressable style={styles.card} onPress={() => router.push(`/history/${item.id}` as unknown as Parameters<typeof router.push>[0])}>
        <View style={styles.header}>
          <Text style={styles.title}>{item.name}</Text>
          <Text style={styles.date}>{formatDate(item.startedAt)}</Text>
        </View>
        <View style={styles.stats}>
          <Text style={styles.statText}>⏱ {formatDuration(item.durationSeconds)}</Text>
          <Text style={styles.statText}>🏋️ {item.exercises.length} Exercises</Text>
          <Text style={styles.statText}>🔢 {totalSets} Sets</Text>
        </View>
      </Pressable>
    );
  };

  return (
    <FlatList
      data={sessions}
      keyExtractor={item => item.id}
      renderItem={renderItem}
      contentContainerStyle={styles.list}
      ListEmptyComponent={
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyText}>No workouts recorded yet.</Text>
          <Text style={styles.emptySubtext}>Your finished workouts will appear here.</Text>
        </View>
      }
    />
  );
}

function ProgressView() {
  useHistoryStore((state) => state.sessions);
  const { getStreak, getPRs, getExerciseVolumeHistory } = useHistoryStore();
  const { exercises } = useExerciseStore();
  const { profile } = useProfileStore();
  const isImperial = profile.preferredUnits === 'imperial';
  const streak = getStreak();
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
        <View style={styles.noDataContainer}>
          <Text style={styles.noDataText}>Not enough data to chart volume.</Text>
          <Text style={styles.noDataSub}>Complete at least 2 sessions.</Text>
        </View>
      );
    }
    const data = {
      labels: history.map(h => new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric' }).format(new Date(h.date))),
      datasets: [
        { data: history.map(h => isImperial ? Math.round(h.volume * 2.20462) : h.volume), color: (opacity = 1) => `rgba(16, 185, 129, ${opacity})`, strokeWidth: 2 }
      ],
    };
    return (
      <View style={styles.chartContainer}>
        <Text style={styles.chartTitle}>Volume History</Text>
        <LineChart
          data={data} width={screenWidth - 64} height={220}
          chartConfig={{
            backgroundColor: '#ffffff', backgroundGradientFrom: '#ffffff', backgroundGradientTo: '#ffffff',
            decimalPlaces: 0, color: (opacity = 1) => `rgba(16, 185, 129, ${opacity})`,
            labelColor: (opacity = 1) => `rgba(100, 116, 139, ${opacity})`,
            style: { borderRadius: 16 }, propsForDots: { r: '4', strokeWidth: '2', stroke: '#059669' }
          }}
          bezier style={{ marginVertical: 8, borderRadius: 16 }}
        />
      </View>
    );
  };

  return (
    <ScrollView contentContainerStyle={styles.content}>
      <View style={styles.streakCard}>
        <Text style={styles.streakTitle}>🔥 Current Streak</Text>
        <Text style={styles.streakValue}>{streak} {streak === 1 ? 'Day' : 'Days'}</Text>
        <Text style={styles.streakSub}>Keep it up!</Text>
      </View>
      <Text style={styles.sectionTitle}>Personal Records</Text>
      {activeExerciseIds.length === 0 ? (
        <Text style={styles.emptyTextProg}>Complete a workout to see your PRs.</Text>
      ) : (
        <>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chipScroll}>
            {activeExerciseIds.map(id => {
              const ex = exercises.find(e => e.id === id);
              const isSelected = id === selectedExId;
              return (
                <Pressable key={id} style={[styles.chip, isSelected && styles.chipSelected]} onPress={() => setSelectedExId(id)}>
                  <Text style={[styles.chipText, isSelected && styles.chipTextSelected]}>{ex?.name || 'Unknown'}</Text>
                </Pressable>
              );
            })}
          </ScrollView>
          {selectedExId && prs[selectedExId] !== undefined && (
            <View style={styles.prHighlight}>
              <Text style={styles.prHighlightLabel}>Best Weight</Text>
              <Text style={styles.prHighlightValue}>
                {(() => {
                  const rawVal = prs[selectedExId]!;
                  const converted = isImperial ? rawVal * 2.20462 : rawVal;
                  const roundedDown = Math.floor(converted * 100) / 100;
                  return roundedDown.toFixed(2);
                })()} {isImperial ? 'lbs' : 'kg'}
              </Text>
            </View>
          )}
          {renderChart()}
        </>
      )}
    </ScrollView>
  );
}

function AchievementsView() {
  const { xp, level, unlockedAchievements } = useAchievementStore();
  const { getProgress } = useAchievementCheck();

  const currentLevelXp = xp % 500;
  const xpProgressPercent = Math.min(100, Math.floor((currentLevelXp / 500) * 100));

  const formatDate = (isoStr: string) => {
    return new Intl.DateTimeFormat('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    }).format(new Date(isoStr));
  };

  const unlockedList = ACHIEVEMENTS.filter(a => unlockedAchievements[a.id] !== undefined);
  const lockedList = ACHIEVEMENTS.filter(a => unlockedAchievements[a.id] === undefined);

  return (
    <ScrollView contentContainerStyle={styles.content}>
      {/* Level Card */}
      <View style={styles.levelCard}>
        <View style={styles.levelHeader}>
          <Text style={styles.levelTitle}>Level {level}</Text>
          <Text style={styles.xpText}>{currentLevelXp} / 500 XP</Text>
        </View>
        <View style={styles.progressBarBg}>
          <View style={[styles.progressBarFill, { width: `${xpProgressPercent}%` }]} />
        </View>
        <Text style={styles.xpSub}>{500 - currentLevelXp} XP to Level {level + 1}</Text>
        <Text style={styles.totalXp}>Total XP: {xp}</Text>
      </View>

      {unlockedList.length > 0 && (
        <>
          <Text style={styles.sectionTitle}>🏆 Unlocked ({unlockedList.length})</Text>
          {unlockedList.map(ach => (
            <View key={ach.id} style={[styles.achCard, styles.achCardUnlocked]}>
              <View style={styles.achIconContainer}>
                <Ionicons name={ach.icon as React.ComponentProps<typeof Ionicons>['name']} size={32} color="#eab308" />
              </View>
              <View style={styles.achInfo}>
                <Text style={styles.achName}>{ach.name}</Text>
                <Text style={styles.achDesc}>{ach.description}</Text>
                <Text style={styles.achUnlockDate}>
                  Unlocked on {formatDate(unlockedAchievements[ach.id]!)}
                </Text>
              </View>
              <View style={styles.xpBadge}>
                <Text style={styles.xpBadgeText}>+{ach.xpReward} XP</Text>
              </View>
            </View>
          ))}
        </>
      )}

      {lockedList.length > 0 && (
        <>
          <Text style={styles.sectionTitle}>🔒 In Progress ({lockedList.length})</Text>
          {lockedList.map(ach => {
            const prog = getProgress(ach.id);
            return (
              <View key={ach.id} style={styles.achCard}>
                <View style={[styles.achIconContainer, styles.achIconLocked]}>
                  <Ionicons name={ach.icon as React.ComponentProps<typeof Ionicons>['name']} size={32} color="#94a3b8" />
                </View>
                <View style={styles.achInfo}>
                  <Text style={styles.achName}>{ach.name}</Text>
                  <Text style={styles.achDesc}>{ach.description}</Text>
                  <View style={styles.achProgressRow}>
                    <View style={styles.achProgressBarBg}>
                      <View style={[styles.achProgressBarFill, { width: `${prog.percent}%` }]} />
                    </View>
                    <Text style={styles.achProgressText}>
                      {prog.current} / {prog.target}
                    </Text>
                  </View>
                </View>
                <View style={[styles.xpBadge, styles.xpBadgeLocked]}>
                  <Text style={styles.xpBadgeTextLocked}>+{ach.xpReward} XP</Text>
                </View>
              </View>
            );
          })}
        </>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc' },
  toggleContainer: {
    flexDirection: 'row',
    backgroundColor: '#e2e8f0',
    margin: 16,
    borderRadius: 8,
    padding: 4,
  },
  toggleBtn: {
    flex: 1,
    paddingVertical: 8,
    alignItems: 'center',
    borderRadius: 6,
  },
  toggleBtnActive: {
    backgroundColor: '#ffffff',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  toggleText: { fontSize: 14, fontWeight: '600', color: '#64748b' },
  toggleTextActive: { color: '#0f172a' },
  list: { padding: 16, paddingTop: 0 },
  card: {
    backgroundColor: '#fff', borderRadius: 12, padding: 16, marginBottom: 12,
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 8, elevation: 2,
  },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  title: { fontSize: 18, fontWeight: '700', color: '#0f172a' },
  date: { fontSize: 14, color: '#64748b' },
  stats: { flexDirection: 'row', gap: 16 },
  statText: { fontSize: 14, color: '#475569', fontWeight: '500' },
  emptyContainer: { alignItems: 'center', marginTop: 60 },
  emptyText: { fontSize: 18, fontWeight: '600', color: '#0f172a', marginBottom: 8 },
  emptySubtext: { fontSize: 14, color: '#64748b' },
  content: { padding: 16, paddingBottom: 40, paddingTop: 0 },
  streakCard: {
    backgroundColor: '#fff', borderRadius: 16, padding: 24, alignItems: 'center', marginBottom: 24,
    borderWidth: 1, borderColor: '#e2e8f0',
  },
  streakTitle: { fontSize: 18, fontWeight: '600', color: '#64748b', marginBottom: 8 },
  streakValue: { fontSize: 48, fontWeight: '800', color: '#f97316', marginBottom: 4 },
  streakSub: { fontSize: 14, color: '#94a3b8', fontWeight: '500' },
  sectionTitle: { fontSize: 20, fontWeight: '700', color: '#0f172a', marginBottom: 16 },
  chipScroll: { marginBottom: 20 },
  chip: { paddingHorizontal: 16, paddingVertical: 8, backgroundColor: '#e2e8f0', borderRadius: 20, marginRight: 8 },
  chipSelected: { backgroundColor: '#0f172a' },
  chipText: { fontSize: 14, fontWeight: '600', color: '#475569' },
  chipTextSelected: { color: '#fff' },
  prHighlight: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    backgroundColor: '#f1f5f9', padding: 16, borderRadius: 12, marginBottom: 24,
  },
  prHighlightLabel: { fontSize: 16, fontWeight: '600', color: '#475569' },
  prHighlightValue: { fontSize: 24, fontWeight: '800', color: '#10b981' },
  chartContainer: { backgroundColor: '#fff', borderRadius: 16, padding: 16, borderWidth: 1, borderColor: '#e2e8f0', alignItems: 'center' },
  chartTitle: { fontSize: 16, fontWeight: '600', color: '#0f172a', alignSelf: 'flex-start', marginBottom: 12 },
  noDataContainer: { backgroundColor: '#fff', borderRadius: 16, padding: 32, alignItems: 'center', borderWidth: 1, borderColor: '#e2e8f0' },
  noDataText: { fontSize: 16, fontWeight: '600', color: '#475569', marginBottom: 4 },
  noDataSub: { fontSize: 14, color: '#94a3b8' },
  emptyTextProg: { fontSize: 16, color: '#64748b', fontStyle: 'italic' },
  levelCard: {
    backgroundColor: '#3b82f6',
    borderRadius: 16,
    padding: 20,
    marginBottom: 24,
  },
  levelHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'baseline',
    marginBottom: 12,
  },
  levelTitle: {
    fontSize: 24,
    fontWeight: '800',
    color: '#ffffff',
  },
  xpText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#dbeafe',
  },
  progressBarBg: {
    height: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
    borderRadius: 4,
    overflow: 'hidden',
    marginBottom: 8,
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: '#ffffff',
  },
  xpSub: {
    fontSize: 14,
    color: '#dbeafe',
    fontWeight: '500',
  },
  totalXp: {
    fontSize: 12,
    color: '#93c5fd',
    fontWeight: '500',
    marginTop: 8,
    textAlign: 'right',
  },
  achCard: {
    flexDirection: 'row',
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  achCardUnlocked: {
    borderColor: '#fef08a',
    backgroundColor: '#fefce8',
  },
  achIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#fef9c3',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  achIconLocked: {
    backgroundColor: '#f1f5f9',
  },
  achInfo: {
    flex: 1,
  },
  achName: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1e293b',
    marginBottom: 4,
  },
  achDesc: {
    fontSize: 14,
    color: '#64748b',
    marginBottom: 6,
  },
  achUnlockDate: {
    fontSize: 12,
    color: '#a1a1aa',
    fontWeight: '500',
  },
  achProgressRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  achProgressBarBg: {
    flex: 1,
    height: 6,
    backgroundColor: '#e2e8f0',
    borderRadius: 3,
    overflow: 'hidden',
  },
  achProgressBarFill: {
    height: '100%',
    backgroundColor: '#94a3b8',
    borderRadius: 3,
  },
  achProgressText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#64748b',
  },
  xpBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    backgroundColor: '#fef08a',
    marginLeft: 12,
  },
  xpBadgeLocked: {
    backgroundColor: '#f1f5f9',
  },
  xpBadgeText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#a16207',
  },
  xpBadgeTextLocked: {
    fontSize: 12,
    fontWeight: '700',
    color: '#64748b',
  },
});
