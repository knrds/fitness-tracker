import React from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { useExerciseStore } from '../../src/stores/exerciseStore';
import { MuscleGroupBadge } from '../../src/components/exercises/MuscleGroupBadge';

export default function ExerciseDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { exercises, favoriteIds } = useExerciseStore();
  
  const exercise = exercises.find(e => e.id === id);
  const isFavorite = favoriteIds.includes(id || '');

  if (!exercise) {
    return (
      <View style={styles.centered}>
        <Text style={styles.errorText}>Exercise not found</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.header}>
        <Text style={styles.title}>{exercise.name}</Text>
        {isFavorite && <Text style={styles.favoriteBadge}>★ Favorite</Text>}
      </View>
      
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Equipment</Text>
        <Text style={styles.text}>{formatName(exercise.equipment)}</Text>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Movement Pattern</Text>
        <Text style={styles.text}>{formatName(exercise.movementPattern)}</Text>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Primary Muscles</Text>
        <View style={styles.badges}>
          {exercise.primaryMuscles.map(m => (
            <MuscleGroupBadge key={m} muscleGroup={m} />
          ))}
        </View>
      </View>

      {exercise.secondaryMuscles.length > 0 && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Secondary Muscles</Text>
          <View style={styles.badges}>
            {exercise.secondaryMuscles.map(m => (
              <MuscleGroupBadge key={m} muscleGroup={m} />
            ))}
          </View>
        </View>
      )}

      {exercise.instructions && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Instructions</Text>
          <Text style={styles.text}>{exercise.instructions}</Text>
        </View>
      )}
    </ScrollView>
  );
}

const formatName = (str: string) => {
  return str.split('_').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ');
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  content: {
    padding: 20,
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  errorText: {
    fontSize: 16,
    color: '#ef4444',
  },
  header: {
    marginBottom: 24,
  },
  title: {
    fontSize: 28,
    fontWeight: '800',
    color: '#0f172a',
    marginBottom: 8,
  },
  favoriteBadge: {
    fontSize: 14,
    color: '#eab308',
    fontWeight: '700',
  },
  section: {
    marginBottom: 24,
    backgroundColor: '#ffffff',
    padding: 16,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#64748b',
    marginBottom: 12,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  text: {
    fontSize: 16,
    color: '#334155',
    lineHeight: 24,
  },
  badges: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
});
