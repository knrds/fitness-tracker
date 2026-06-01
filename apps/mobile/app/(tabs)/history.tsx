import React from 'react';
import { View, Text, StyleSheet, FlatList, Pressable } from 'react-native';
import { useRouter } from 'expo-router';
import { useHistoryStore } from '../../src/stores/historyStore';
import { WorkoutSession } from '@fitness-tracker/domain';

export default function HistoryScreen() {
  const router = useRouter();
  const { getSessionsByDateDesc } = useHistoryStore();
  
  const sessions = getSessionsByDateDesc();

  const formatDate = (date: Date) => {
    return new Intl.DateTimeFormat('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit'
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
      <Pressable 
        style={styles.card}
        onPress={() => router.push(`/history/${item.id}` as any)}
      >
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
    <View style={styles.container}>
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
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc' },
  list: { padding: 16 },
  card: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  title: { fontSize: 18, fontWeight: '700', color: '#0f172a' },
  date: { fontSize: 14, color: '#64748b' },
  stats: {
    flexDirection: 'row',
    gap: 16,
  },
  statText: { fontSize: 14, color: '#475569', fontWeight: '500' },
  emptyContainer: { alignItems: 'center', marginTop: 60 },
  emptyText: { fontSize: 18, fontWeight: '600', color: '#0f172a', marginBottom: 8 },
  emptySubtext: { fontSize: 14, color: '#64748b' },
});
