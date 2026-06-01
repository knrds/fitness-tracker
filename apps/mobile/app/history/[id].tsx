import React from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { useHistoryStore } from '../../src/stores/historyStore';
import { useExerciseStore } from '../../src/stores/exerciseStore';

export default function WorkoutDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { sessions } = useHistoryStore();
  const { exercises } = useExerciseStore();
  
  const session = sessions.find(s => s.id === id);

  if (!session) {
    return (
      <View style={styles.centered}>
        <Text>Workout not found.</Text>
      </View>
    );
  }

  const formatDate = (date: Date) => {
    return new Intl.DateTimeFormat('en-US', {
      weekday: 'long',
      month: 'long',
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

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.header}>
        <Text style={styles.title}>{session.name}</Text>
        <Text style={styles.date}>{formatDate(session.startedAt)}</Text>
        <Text style={styles.duration}>Duration: {formatDuration(session.durationSeconds)}</Text>
      </View>

      <Text style={styles.sectionTitle}>Exercises</Text>

      {session.exercises.map((ex, index) => {
        const exerciseDef = exercises.find(e => e.id === ex.exerciseId);
        const completedSets = ex.sets.filter(s => s.completed);
        const volume = completedSets.reduce((sum, s) => sum + (s.weight || 0) * (s.reps || 0), 0);
        
        return (
          <View key={ex.id} style={styles.card}>
            <Text style={styles.exName}>{index + 1}. {exerciseDef?.name || 'Unknown Exercise'}</Text>
            {volume > 0 && <Text style={styles.volumeText}>Volume: {volume} kg</Text>}
            
            <View style={styles.tableHeader}>
              <Text style={styles.colSet}>Set</Text>
              <Text style={styles.colWeight}>kg</Text>
              <Text style={styles.colReps}>Reps</Text>
              <Text style={styles.colRpe}>RPE</Text>
            </View>

            {ex.sets.map(set => (
              <View key={set.id} style={[styles.tableRow, !set.completed && styles.incompleteRow]}>
                <Text style={styles.colSet}>{set.setNumber}</Text>
                <Text style={styles.colWeight}>{set.weight || '-'}</Text>
                <Text style={styles.colReps}>{set.reps || '-'}</Text>
                <Text style={styles.colRpe}>{set.rpe || '-'}</Text>
              </View>
            ))}
          </View>
        );
      })}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc' },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  content: { padding: 16, paddingBottom: 40 },
  header: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  title: { fontSize: 22, fontWeight: '800', color: '#0f172a', marginBottom: 4 },
  date: { fontSize: 14, color: '#64748b', marginBottom: 8 },
  duration: { fontSize: 16, fontWeight: '500', color: '#334155' },
  sectionTitle: { fontSize: 18, fontWeight: '700', color: '#0f172a', marginBottom: 12 },
  card: {
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: 12,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  exName: { fontSize: 16, fontWeight: '700', color: '#1e293b', marginBottom: 4 },
  volumeText: { fontSize: 14, color: '#10b981', fontWeight: '600', marginBottom: 12 },
  tableHeader: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
    paddingBottom: 8,
    marginBottom: 8,
  },
  tableRow: {
    flexDirection: 'row',
    paddingVertical: 6,
  },
  incompleteRow: { opacity: 0.4 },
  colSet: { flex: 1, fontWeight: '600', color: '#475569' },
  colWeight: { flex: 1, textAlign: 'center', color: '#334155' },
  colReps: { flex: 1, textAlign: 'center', color: '#334155' },
  colRpe: { flex: 1, textAlign: 'center', color: '#334155' },
});
