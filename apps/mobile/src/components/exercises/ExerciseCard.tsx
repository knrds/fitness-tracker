import React from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { Exercise } from '@fitness-tracker/domain';
import { MuscleGroupBadge } from './MuscleGroupBadge';
import { Link } from 'expo-router';

interface Props {
  exercise: Exercise;
  isFavorite?: boolean;
  onToggleFavorite?: (id: string) => void;
}

export const ExerciseCard = ({ exercise, isFavorite, onToggleFavorite }: Props) => {
  return (
    <Link href={`/exercise/${exercise.id}` as any} asChild>
      <Pressable style={styles.card} testID="exercise-card">
        <View style={styles.header}>
          <Text style={styles.title} testID="exercise-title">{exercise.name}</Text>
          {onToggleFavorite && (
            <Pressable onPress={() => onToggleFavorite(exercise.id)} hitSlop={10} testID="favorite-btn">
              <Text style={styles.favoriteIcon}>{isFavorite ? '★' : '☆'}</Text>
            </Pressable>
          )}
        </View>
        
        <Text style={styles.equipment}>{formatEquipmentName(exercise.equipment)}</Text>
        
        <View style={styles.badges}>
          {exercise.primaryMuscles.map(m => (
            <MuscleGroupBadge key={m} muscleGroup={m} />
          ))}
        </View>
      </Pressable>
    </Link>
  );
};

const formatEquipmentName = (eq: string) => {
  return eq.split('_').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ');
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
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
    marginBottom: 8,
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1e293b',
    flex: 1,
  },
  favoriteIcon: {
    fontSize: 24,
    color: '#eab308',
    marginLeft: 12,
  },
  equipment: {
    fontSize: 14,
    color: '#64748b',
    marginBottom: 12,
  },
  badges: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
});
