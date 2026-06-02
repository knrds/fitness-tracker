import React, { useState } from 'react';
import { View, Text, StyleSheet, FlatList, Pressable, ScrollView, Dimensions } from 'react-native';
import { useRouter } from 'expo-router';
import { useHistoryStore } from '../../src/stores/historyStore';
import { useExerciseStore } from '../../src/stores/exerciseStore';
import { WorkoutSession } from '@fitness-tracker/domain';
import { LineChart } from 'react-native-chart-kit';

export default function HistoryScreen() {
  const [activeTab, setActiveTab] = useState<'history' | 'progress'>('history');

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
      </View>

      {activeTab === 'history' ? <HistoryView /> : <ProgressView />}
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
        { data: history.map(h => h.volume), color: (opacity = 1) => `rgba(16, 185, 129, ${opacity})`, strokeWidth: 2 }
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
          {selectedExId && (
            <View style={styles.prHighlight}>
              <Text style={styles.prHighlightLabel}>Best Weight</Text>
              <Text style={styles.prHighlightValue}>{prs[selectedExId]} kg</Text>
            </View>
          )}
          {renderChart()}
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
});
