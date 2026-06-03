import React, { useState } from 'react';
import { View, Text, StyleSheet, Pressable, ActivityIndicator } from 'react-native';
import { Image } from 'expo-image';
import { Exercise } from '@fitness-tracker/domain';
import { MuscleGroupBadge } from './MuscleGroupBadge';
import { Link, Href } from 'expo-router';

interface Props {
  exercise: Exercise;
  isFavorite?: boolean;
  onToggleFavorite?: (id: string) => void;
}

export const ExerciseCard = ({ exercise, isFavorite, onToggleFavorite }: Props) => {
  const [loading, setLoading] = useState(true);

  return (
    <Link href={`/exercise/${exercise.id}` as Href} asChild>
      <Pressable style={styles.card} testID="exercise-card">
        {exercise.imageUrl ? (
          <View style={styles.imageContainer}>
            <Image
              source={{ uri: exercise.imageUrl }}
              style={styles.image}
              contentFit="cover"
              onLoadStart={() => setLoading(true)}
              onLoadEnd={() => setLoading(false)}
            />
            {loading && (
              <View style={styles.loaderContainer}>
                <ActivityIndicator size="small" color="#3b82f6" />
              </View>
            )}
          </View>
        ) : (
          <View style={styles.placeholderContainer}>
            <Text style={styles.placeholderIcon}>💪</Text>
            <Text style={styles.placeholderText}>No Image Available</Text>
          </View>
        )}

        <View style={styles.header}>
          <Text style={styles.title} testID="exercise-title">{exercise.name}</Text>
          {onToggleFavorite && (
            <Pressable onPress={() => onToggleFavorite(exercise.id)} hitSlop={10} testID="favorite-btn">
              <Text style={styles.favoriteIcon}>{isFavorite ? '★' : '☆'}</Text>
            </Pressable>
          )}
        </View>
        
        <View style={styles.badges}>
          {exercise.primaryMuscles.map(m => (
            <MuscleGroupBadge key={m} muscleGroup={m} />
          ))}
          <View style={styles.equipmentBadge}>
            <Text style={styles.equipmentBadgeText}>{formatEquipmentName(exercise.equipment)}</Text>
          </View>
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
  imageContainer: {
    width: '100%',
    height: 160,
    borderRadius: 12,
    overflow: 'hidden',
    marginBottom: 12,
    backgroundColor: '#f1f5f9',
  },
  image: {
    width: '100%',
    height: '100%',
  },
  loaderContainer: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f1f5f9',
  },
  placeholderContainer: {
    width: '100%',
    height: 160,
    borderRadius: 12,
    marginBottom: 12,
    backgroundColor: '#f1f5f9',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderStyle: 'dashed',
  },
  placeholderIcon: {
    fontSize: 32,
    marginBottom: 4,
  },
  placeholderText: {
    fontSize: 12,
    color: '#94a3b8',
    fontWeight: '600',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
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
  badges: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  equipmentBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    marginRight: 6,
    marginBottom: 6,
    alignSelf: 'flex-start',
  },
  equipmentBadgeText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#64748b',
  },
});
