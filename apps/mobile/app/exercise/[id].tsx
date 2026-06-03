import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable, ActivityIndicator, Alert } from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';
import { Image } from 'expo-image';
import { useExerciseStore } from '../../src/stores/exerciseStore';
import { useWorkoutStore } from '../../src/stores/workoutStore';
import { MuscleGroupBadge } from '../../src/components/exercises/MuscleGroupBadge';

export default function ExerciseDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { exercises, favoriteIds, toggleFavorite, exerciseRestDurations, setExerciseRestDuration } = useExerciseStore();
  const { status, addExercise, startWorkout } = useWorkoutStore();
  
  const [imageLoading, setImageLoading] = useState(true);

  const exercise = exercises.find(e => e.id === id);
  const isFavorite = favoriteIds.includes(id || '');
  const customRestDuration = exerciseRestDurations[id || ''] || 90;

  const handleAdjustRest = (amount: number) => {
    const newDuration = Math.max(0, customRestDuration + amount);
    if (id) {
      setExerciseRestDuration(id, newDuration);
    }
  };

  const formatRestTime = (seconds: number) => {
    if (seconds === 0) return 'Disabled';
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    if (m > 0) {
      return `${m}m ${s > 0 ? `${s}s` : ''}`;
    }
    return `${s}s`;
  };

  if (!exercise) {
    return (
      <View style={styles.centered}>
        <Text style={styles.errorText}>Exercise not found</Text>
      </View>
    );
  }

  const handleAddToWorkout = () => {
    try {
      if (status === 'active' || status === 'paused') {
        addExercise(exercise.id);
        Alert.alert(
          'Success', 
          `${exercise.name} added to your active workout!`,
          [
            { text: 'Go to Workout', onPress: () => router.push('/workout/session') },
            { text: 'OK', style: 'cancel' }
          ]
        );
      } else {
        startWorkout('Quick Start');
        // Retrieve the store state again to ensure it was created, then add exercise
        useWorkoutStore.getState().addExercise(exercise.id);
        router.push('/workout/session');
      }
    } catch {
      Alert.alert('Error', 'Could not add exercise to workout.');
    }
  };

  const instructionLines = exercise.instructions
    ? exercise.instructions.split('\n').filter(line => line.trim().length > 0)
    : [];

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {exercise.imageUrl ? (
        <View style={styles.imageContainer}>
          <Image
            source={{ uri: exercise.imageUrl }}
            style={styles.image}
            contentFit="cover"
            onLoadStart={() => setImageLoading(true)}
            onLoadEnd={() => setImageLoading(false)}
          />
          {imageLoading && (
            <View style={styles.imageLoader}>
              <ActivityIndicator size="large" color="#3b82f6" />
            </View>
          )}
        </View>
      ) : (
        <View style={styles.imagePlaceholder}>
          <Text style={styles.placeholderIcon}>💪</Text>
          <Text style={styles.placeholderText}>No Exercise Image Available</Text>
        </View>
      )}

      <View style={styles.detailsContainer}>
        <View style={styles.header}>
          <View style={styles.titleRow}>
            <Text style={styles.title}>{exercise.name}</Text>
            {id && (
              <Pressable 
                onPress={() => toggleFavorite(id)} 
                hitSlop={15} 
                style={styles.favoriteButton}
                testID="detail-favorite-btn"
              >
                <Text style={styles.favoriteIcon}>{isFavorite ? '★' : '☆'}</Text>
              </Pressable>
            )}
          </View>
        </View>

        {/* Info Rows: Side by Side Cards */}
        <View style={styles.infoRow}>
          <View style={styles.infoCard}>
            <Text style={styles.infoLabel}>Equipment</Text>
            <Text style={styles.infoValue}>{formatName(exercise.equipment)}</Text>
          </View>
          <View style={styles.infoCard}>
            <Text style={styles.infoLabel}>Difficulty</Text>
            <Text style={styles.infoValue}>
              {exercise.experienceLevel 
                ? formatName(exercise.experienceLevel) 
                : 'Beginner'}
            </Text>
          </View>
        </View>

        {/* Muscle Badges */}
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

        {/* Instructions list */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Instructions</Text>
          {instructionLines.length > 0 ? (
            <View style={styles.instructionsContainer}>
              {instructionLines.map((line, idx) => (
                <View key={idx} style={styles.instructionStep}>
                  <View style={styles.stepNumberContainer}>
                    <Text style={styles.stepNumberText}>{idx + 1}</Text>
                  </View>
                  <Text style={styles.instructionText}>{line.trim()}</Text>
                </View>
              ))}
            </View>
          ) : (
            <Text style={styles.noInstructionsText}>No instructions available for this exercise.</Text>
          )}
        </View>

        {/* Rest Timer Configuration */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Default Rest Timer</Text>
          <View style={styles.restTimerConfig}>
            <Pressable 
              onPress={() => handleAdjustRest(-15)} 
              style={styles.adjustRestBtn}
              testID="adjust-rest-minus"
            >
              <Text style={styles.adjustRestBtnText}>-15s</Text>
            </Pressable>
            <View style={styles.restDurationDisplay}>
              <Text style={styles.restDurationVal}>{formatRestTime(customRestDuration)}</Text>
            </View>
            <Pressable 
              onPress={() => handleAdjustRest(15)} 
              style={styles.adjustRestBtn}
              testID="adjust-rest-plus"
            >
              <Text style={styles.adjustRestBtnText}>+15s</Text>
            </Pressable>
          </View>
        </View>

        {/* Action Button */}
        <Pressable 
          style={({ pressed }) => [
            styles.actionButton,
            (status === 'active' || status === 'paused') ? styles.actionButtonActive : styles.actionButtonStart,
            pressed && styles.actionButtonPressed
          ]}
          onPress={handleAddToWorkout}
        >
          <Text style={styles.actionButtonText}>
            {(status === 'active' || status === 'paused')
              ? 'Zu aktivem Workout hinzufügen'
              : 'Neues Workout mit dieser Übung starten'}
          </Text>
        </Pressable>
      </View>
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
    paddingBottom: 40,
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
  imageContainer: {
    width: '100%',
    height: 280,
    backgroundColor: '#cbd5e1',
    position: 'relative',
  },
  image: {
    width: '100%',
    height: '100%',
  },
  imageLoader: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(241, 245, 249, 0.8)',
  },
  imagePlaceholder: {
    width: '100%',
    height: 280,
    backgroundColor: '#e2e8f0',
    justifyContent: 'center',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: '#cbd5e1',
  },
  placeholderIcon: {
    fontSize: 54,
    marginBottom: 8,
  },
  placeholderText: {
    fontSize: 14,
    color: '#64748b',
    fontWeight: '600',
  },
  detailsContainer: {
    padding: 20,
  },
  header: {
    marginBottom: 20,
  },
  titleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  title: {
    fontSize: 26,
    fontWeight: '800',
    color: '#0f172a',
    flex: 1,
    lineHeight: 32,
  },
  favoriteButton: {
    marginLeft: 16,
    padding: 4,
  },
  favoriteIcon: {
    fontSize: 30,
    color: '#eab308',
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
    marginBottom: 24,
  },
  infoCard: {
    flex: 1,
    backgroundColor: '#ffffff',
    padding: 16,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.03,
    shadowRadius: 6,
    elevation: 1,
  },
  infoLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: '#94a3b8',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginBottom: 6,
  },
  infoValue: {
    fontSize: 15,
    fontWeight: '700',
    color: '#334155',
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: '#64748b',
    marginBottom: 12,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
  badges: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  instructionsContainer: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  instructionStep: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  stepNumberContainer: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#3498DB',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
    marginTop: 2,
  },
  stepNumberText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#ffffff',
  },
  instructionText: {
    flex: 1,
    fontSize: 15,
    color: '#334155',
    lineHeight: 22,
  },
  noInstructionsText: {
    fontSize: 15,
    color: '#94a3b8',
    fontStyle: 'italic',
  },
  actionButton: {
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  actionButtonActive: {
    backgroundColor: '#3b82f6',
  },
  actionButtonStart: {
    backgroundColor: '#10b981',
  },
  actionButtonPressed: {
    opacity: 0.85,
    transform: [{ scale: 0.98 }],
  },
  actionButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '700',
  },
  restTimerConfig: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    gap: 20,
  },
  adjustRestBtn: {
    backgroundColor: '#f1f5f9',
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  adjustRestBtnText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#0f172a',
  },
  restDurationDisplay: {
    minWidth: 100,
    alignItems: 'center',
  },
  restDurationVal: {
    fontSize: 18,
    fontWeight: '700',
    color: '#0f172a',
  },
});
