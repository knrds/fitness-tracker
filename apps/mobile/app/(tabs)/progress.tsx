import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Dimensions, Pressable } from 'react-native';
import { useHistoryStore } from '../../src/stores/historyStore';
import { useExerciseStore } from '../../src/stores/exerciseStore';
import { LineChart } from 'react-native-chart-kit';

export default function ProgressScreen() {
  const { getStreak, getPRs, getExerciseVolumeHistory } = useHistoryStore();
  const { exercises } = useExerciseStore();
  
  const streak = getStreak();
  const prs = getPRs();
  
  // Only show exercises that have PRs (meaning they have been performed)
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
        {
          data: history.map(h => h.volume),
          color: (opacity = 1) => `rgba(16, 185, 129, ${opacity})`,
          strokeWidth: 2
        }
      ],
    };

    return (
      <View style={styles.chartContainer}>
        <Text style={styles.chartTitle}>Volume History</Text>
        <LineChart
          data={data}
          width={screenWidth - 64}
          height={220}
          chartConfig={{
            backgroundColor: '#ffffff',
            backgroundGradientFrom: '#ffffff',
            backgroundGradientTo: '#ffffff',
            decimalPlaces: 0,
            color: (opacity = 1) => `rgba(16, 185, 129, ${opacity})`,
            labelColor: (opacity = 1) => `rgba(100, 116, 139, ${opacity})`,
            style: { borderRadius: 16 },
            propsForDots: { r: '4', strokeWidth: '2', stroke: '#059669' }
          }}
          bezier
          style={{ marginVertical: 8, borderRadius: 16 }}
        />
      </View>
    );
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.streakCard}>
        <Text style={styles.streakTitle}>🔥 Current Streak</Text>
        <Text style={styles.streakValue}>{streak} {streak === 1 ? 'Day' : 'Days'}</Text>
        <Text style={styles.streakSub}>Keep it up!</Text>
      </View>

      <Text style={styles.sectionTitle}>Personal Records</Text>
      
      {activeExerciseIds.length === 0 ? (
        <Text style={styles.emptyText}>Complete a workout to see your PRs.</Text>
      ) : (
        <>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chipScroll}>
            {activeExerciseIds.map(id => {
              const ex = exercises.find(e => e.id === id);
              const isSelected = id === selectedExId;
              return (
                <Pressable 
                  key={id} 
                  style={[styles.chip, isSelected && styles.chipSelected]}
                  onPress={() => setSelectedExId(id)}
                >
                  <Text style={[styles.chipText, isSelected && styles.chipTextSelected]}>
                    {ex?.name || 'Unknown'}
                  </Text>
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
  content: { padding: 16, paddingBottom: 40 },
  streakCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 24,
    alignItems: 'center',
    marginBottom: 24,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  streakTitle: { fontSize: 18, fontWeight: '600', color: '#64748b', marginBottom: 8 },
  streakValue: { fontSize: 48, fontWeight: '800', color: '#f97316', marginBottom: 4 },
  streakSub: { fontSize: 14, color: '#94a3b8', fontWeight: '500' },
  
  sectionTitle: { fontSize: 20, fontWeight: '700', color: '#0f172a', marginBottom: 16 },
  
  chipScroll: { marginBottom: 20 },
  chip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: '#e2e8f0',
    borderRadius: 20,
    marginRight: 8,
  },
  chipSelected: { backgroundColor: '#0f172a' },
  chipText: { fontSize: 14, fontWeight: '600', color: '#475569' },
  chipTextSelected: { color: '#fff' },
  
  prHighlight: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#f1f5f9',
    padding: 16,
    borderRadius: 12,
    marginBottom: 24,
  },
  prHighlightLabel: { fontSize: 16, fontWeight: '600', color: '#475569' },
  prHighlightValue: { fontSize: 24, fontWeight: '800', color: '#10b981' },
  
  chartContainer: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    alignItems: 'center',
  },
  chartTitle: { fontSize: 16, fontWeight: '600', color: '#0f172a', alignSelf: 'flex-start', marginBottom: 12 },
  
  noDataContainer: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 32,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  noDataText: { fontSize: 16, fontWeight: '600', color: '#475569', marginBottom: 4 },
  noDataSub: { fontSize: 14, color: '#94a3b8' },
  emptyText: { fontSize: 16, color: '#64748b', fontStyle: 'italic' },
});
