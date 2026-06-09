import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  ActivityIndicator,
  Alert,
  Switch,
  Modal,
} from 'react-native';
import { useLocalSearchParams, router, Stack } from 'expo-router';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import { useExerciseStore } from '../../src/stores/exerciseStore';
import { useWorkoutStore } from '../../src/stores/workoutStore';
import { useProfileStore } from '../../src/stores/profileStore';
import { MuscleGroupBadge } from '../../src/components/exercises/MuscleGroupBadge';
import { useTheme } from '@fitness-tracker/ui';

export default function ExerciseDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { exercises, favoriteIds, toggleFavorite } = useExerciseStore();
  const { status, addExercise, startWorkout } = useWorkoutStore();
  const { profile, updateProfile } = useProfileStore();
  const theme = useTheme();

  const [imageLoading, setImageLoading] = useState(true);
  const [hasLoadedOnce, setHasLoadedOnce] = useState(false);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [fullscreen, setFullscreen] = useState(false);

  const exercise = exercises.find((e) => e.id === id);

  useEffect(() => {
    if (!exercise?.imageUrl || !isPlaying) {
      setCurrentImageIndex(0);
      return;
    }

    if (exercise.imageUrl.endsWith('0.jpg')) {
      const interval = setInterval(() => {
        setCurrentImageIndex((prev) => (prev === 0 ? 1 : 0));
      }, 1000);
      return () => clearInterval(interval);
    }
  }, [exercise?.imageUrl, isPlaying]);

  const getDisplayedImageUri = (): string | null => {
    if (!exercise?.imageUrl) return null;
    if (currentImageIndex === 1 && exercise.imageUrl.endsWith('0.jpg')) {
      return exercise.imageUrl.replace('/0.jpg', '/1.jpg');
    }
    return exercise.imageUrl;
  };
  const isFavorite = favoriteIds.includes(id || '');

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
        Alert.alert('Success', `${exercise.name} added to your active workout!`, [
          { text: 'Go to Workout', onPress: () => router.push('/workout/session') },
          { text: 'OK', style: 'cancel' },
        ]);
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
    ? exercise.instructions.split('\n').filter((line) => line.trim().length > 0)
    : [];

  return (
    <View style={{ flex: 1, backgroundColor: theme.colors.background }}>
      <Stack.Screen
        options={{
          title: exercise.name,
          headerShown: true,
          headerLeft: () => (
            <Pressable
              onPress={() => {
                if (router.canGoBack()) {
                  router.back();
                } else {
                  router.replace('/(tabs)/exercises');
                }
              }}
              hitSlop={15}
              style={{ paddingRight: 12 }}
            >
              <Ionicons name="arrow-back" size={24} color={theme.colors.primary} />
            </Pressable>
          ),
        }}
      />
      <ScrollView style={styles.container} contentContainerStyle={styles.content}>
        {exercise.imageUrl ? (
          <Pressable
            onPress={() => {
              setIsPlaying(true);
              setFullscreen(true);
            }}
            style={styles.imageContainer}
          >
            <Image
              source={getDisplayedImageUri()}
              style={styles.image}
              contentFit="cover"
              onLoadStart={() => setImageLoading(true)}
              onLoadEnd={() => {
                setImageLoading(false);
                setHasLoadedOnce(true);
              }}
            />
            {imageLoading && !hasLoadedOnce && (
              <View style={styles.imageLoader}>
                <ActivityIndicator size="large" color={theme.colors.primary} />
              </View>
            )}
            <View style={styles.expandBadge}>
              <Ionicons name="expand" size={18} color="#F4F5F7" />
            </View>
            <View style={styles.playOverlay}>
              <Text style={styles.playOverlayText}>▶ Tap to enlarge &amp; play</Text>
            </View>
          </Pressable>
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
                {exercise.experienceLevel ? formatName(exercise.experienceLevel) : 'Beginner'}
              </Text>
            </View>
          </View>

          {/* Muscle Badges */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Primary Muscles</Text>
            <View style={styles.badges}>
              {exercise.primaryMuscles.map((m) => (
                <MuscleGroupBadge key={m} muscleGroup={m} />
              ))}
            </View>
          </View>

          {exercise.secondaryMuscles.length > 0 && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Secondary Muscles</Text>
              <View style={styles.badges}>
                {exercise.secondaryMuscles.map((m) => (
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
              <Text style={styles.noInstructionsText}>
                No instructions available for this exercise.
              </Text>
            )}
          </View>

          {/* Removed Default Rest Timer section as requested */}

          {/* Exercise Settings (conditional on RPE/RIR modes) */}
          {(profile.rpeMode === 'selected_exercises' ||
            profile.rirMode === 'selected_exercises') && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Exercise Options</Text>
              <View style={styles.exerciseOptionsContainer}>
                {profile.rpeMode === 'selected_exercises' && (
                  <View style={styles.optionRow}>
                    <Text style={styles.optionLabel}>Enable RPE Column</Text>
                    <Switch
                      value={(profile.rpeEnabledExerciseIds || []).includes(exercise.id)}
                      onValueChange={(val) => {
                        const current = profile.rpeEnabledExerciseIds || [];
                        const updated = val
                          ? [...current, exercise.id]
                          : current.filter((id) => id !== exercise.id);
                        updateProfile({ rpeEnabledExerciseIds: updated });
                      }}
                      trackColor={{ false: '#2A2B31', true: theme.colors.primary }}
                    />
                  </View>
                )}
                {profile.rirMode === 'selected_exercises' && (
                  <View style={[styles.optionRow, { borderBottomWidth: 0 }]}>
                    <Text style={styles.optionLabel}>Enable RIR Column</Text>
                    <Switch
                      value={(profile.rirEnabledExerciseIds || []).includes(exercise.id)}
                      onValueChange={(val) => {
                        const current = profile.rirEnabledExerciseIds || [];
                        const updated = val
                          ? [...current, exercise.id]
                          : current.filter((id) => id !== exercise.id);
                        updateProfile({ rirEnabledExerciseIds: updated });
                      }}
                      trackColor={{ false: '#2A2B31', true: theme.colors.primary }}
                    />
                  </View>
                )}
              </View>
            </View>
          )}

          {/* Action Button */}
          <Pressable
            style={({ pressed }) => [
              styles.actionButton,
              status === 'active' || status === 'paused'
                ? styles.actionButtonActive
                : styles.actionButtonStart,
              pressed && styles.actionButtonPressed,
            ]}
            onPress={handleAddToWorkout}
          >
            <Text style={styles.actionButtonText}>
              {status === 'active' || status === 'paused'
                ? 'Zu aktivem Workout hinzufügen'
                : 'Neues Workout mit dieser Übung starten'}
            </Text>
          </Pressable>
        </View>

        <Modal
          visible={fullscreen}
          animationType="fade"
          onRequestClose={() => setFullscreen(false)}
        >
          <View style={styles.fullscreenContainer}>
            <Pressable
              style={styles.fullscreenClose}
              hitSlop={12}
              onPress={() => setFullscreen(false)}
            >
              <Ionicons name="close" size={30} color="#F4F5F7" />
            </Pressable>
            <Pressable style={styles.fullscreenImageWrap} onPress={() => setIsPlaying((p) => !p)}>
              <Image
                source={getDisplayedImageUri()}
                style={styles.fullscreenImage}
                contentFit="contain"
              />
            </Pressable>
            <View style={styles.fullscreenHint}>
              <Text style={styles.playOverlayText}>
                {isPlaying ? '⏸ Tap to pause' : '▶ Tap to play'}
              </Text>
            </View>
          </View>
        </Modal>
      </ScrollView>
    </View>
  );
}

const formatName = (str: string) => {
  return str
    .split('_')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0B0B0F',
  },
  content: {
    paddingBottom: 40,
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#0B0B0F',
  },
  errorText: {
    fontSize: 16,
    color: '#ef4444',
  },
  imageContainer: {
    width: '100%',
    height: 280,
    backgroundColor: '#1A1C23',
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
    backgroundColor: 'rgba(11, 11, 15, 0.8)',
  },
  imagePlaceholder: {
    width: '100%',
    height: 280,
    backgroundColor: '#1A1C23',
    justifyContent: 'center',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: '#2A2B31',
  },
  placeholderIcon: {
    fontSize: 54,
    marginBottom: 8,
  },
  placeholderText: {
    fontSize: 14,
    color: '#8A8D9F',
    fontFamily: 'SpaceGrotesk_600SemiBold',
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
    fontFamily: 'SpaceGrotesk_700Bold',
    color: '#F4F5F7',
    flex: 1,
    lineHeight: 32,
    textTransform: 'uppercase',
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
    backgroundColor: '#1A1C23',
    padding: 16,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#2A2B31',
  },
  infoLabel: {
    fontSize: 11,
    fontFamily: 'SpaceGrotesk_600SemiBold',
    color: '#8A8D9F',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginBottom: 6,
  },
  infoValue: {
    fontSize: 15,
    fontFamily: 'Manrope_500Medium',
    color: '#F4F5F7',
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 13,
    fontFamily: 'SpaceGrotesk_700Bold',
    color: '#90D5FF',
    marginBottom: 12,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
  badges: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  instructionsContainer: {
    backgroundColor: '#1A1C23',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: '#2A2B31',
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
    backgroundColor: '#90D5FF',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
    marginTop: 2,
  },
  stepNumberText: {
    fontSize: 12,
    fontFamily: 'SpaceGrotesk_700Bold',
    color: '#0B0B0F',
  },
  instructionText: {
    flex: 1,
    fontSize: 15,
    fontFamily: 'Manrope_500Medium',
    color: '#F4F5F7',
    lineHeight: 22,
  },
  noInstructionsText: {
    fontSize: 15,
    fontFamily: 'Manrope_500Medium',
    color: '#8A8D9F',
    fontStyle: 'italic',
  },
  actionButton: {
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 16,
  },
  actionButtonActive: {
    backgroundColor: '#90D5FF',
  },
  actionButtonStart: {
    backgroundColor: '#90D5FF',
  },
  actionButtonPressed: {
    opacity: 0.85,
    transform: [{ scale: 0.98 }],
  },
  actionButtonText: {
    color: '#0B0B0F',
    fontSize: 16,
    fontFamily: 'SpaceGrotesk_700Bold',
  },
  restTimerConfig: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#1A1C23',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: '#2A2B31',
    gap: 20,
  },
  adjustRestBtn: {
    backgroundColor: '#2A2B31',
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#2A2B31',
  },
  adjustRestBtnText: {
    fontSize: 14,
    fontFamily: 'SpaceGrotesk_600SemiBold',
    color: '#F4F5F7',
  },
  restDurationDisplay: {
    minWidth: 100,
    alignItems: 'center',
  },
  restDurationVal: {
    fontSize: 18,
    fontFamily: 'SpaceGrotesk_700Bold',
    color: '#F4F5F7',
  },
  expandBadge: {
    position: 'absolute',
    top: 12,
    right: 12,
    backgroundColor: 'rgba(11, 11, 15, 0.75)',
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
  },
  playOverlay: {
    position: 'absolute',
    bottom: 12,
    right: 12,
    backgroundColor: 'rgba(11, 11, 15, 0.75)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
  fullscreenContainer: {
    flex: 1,
    backgroundColor: '#0B0B0F',
    justifyContent: 'center',
  },
  fullscreenClose: {
    position: 'absolute',
    top: 48,
    right: 20,
    zIndex: 2,
    backgroundColor: 'rgba(26,28,35,0.9)',
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
  },
  fullscreenImageWrap: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  fullscreenImage: {
    width: '100%',
    height: '80%',
  },
  fullscreenHint: {
    position: 'absolute',
    bottom: 48,
    alignSelf: 'center',
    backgroundColor: 'rgba(26,28,35,0.9)',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
  },
  playOverlayText: {
    color: '#90D5FF',
    fontSize: 12,
    fontFamily: 'SpaceGrotesk_700Bold',
  },
  exerciseOptionsContainer: {
    backgroundColor: '#1A1C23',
    borderRadius: 16,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: '#2A2B31',
  },
  optionRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#2A2B31',
  },
  optionLabel: {
    fontSize: 15,
    fontFamily: 'Manrope_500Medium',
    color: '#F4F5F7',
  },
});
