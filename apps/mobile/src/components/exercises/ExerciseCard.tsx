import { Theme, useTheme, useThemeStyles } from '@fitness-tracker/ui';
import { Ionicons } from '@expo/vector-icons';
import React, { useState } from 'react';
import { View, Text, StyleSheet, Pressable, ActivityIndicator } from 'react-native';
import { Image } from 'expo-image';
import { Exercise } from '@fitness-tracker/domain';
import { MuscleGroupBadge } from './MuscleGroupBadge';
import { Link, Href } from 'expo-router';
import { useI18n } from '../../i18n';
import { getExerciseMedia } from '../../utils/getExerciseMedia';

interface Props {
  exercise: Exercise;
  isFavorite?: boolean;
  onToggleFavorite?: (id: string) => void;
}

export const ExerciseCard = ({ exercise, isFavorite, onToggleFavorite }: Props) => {
  const theme = useTheme();
  const styles = useThemeStyles(createStyles);
  const { formatEquipment } = useI18n();
  const [loading, setLoading] = useState(true);

  const media = getExerciseMedia(exercise);

  return (
    <Link href={`/exercise/${exercise.id}` as Href} asChild>
      <Pressable style={styles.card} testID="exercise-card">
        {media.hasMedia && media.uri ? (
          <View style={styles.imageContainer}>
            <Image
              source={{ uri: media.uri }}
              style={styles.image}
              contentFit="contain"
              onLoadStart={() => setLoading(true)}
              onLoadEnd={() => setLoading(false)}
            />
            {loading && (
              <View style={styles.loaderContainer}>
                <ActivityIndicator size="small" color={theme.colors.primary} />
              </View>
            )}
            {media.badge === 'GIF' ? (
              <View style={styles.gifBadge}>
                <Text style={styles.gifBadgeText}>GIF</Text>
              </View>
            ) : null}
          </View>
        ) : (
          <View style={styles.placeholderContainer}>
            <Ionicons name={media.fallbackIcon} size={24} color={theme.colors.muted} />
          </View>
        )}

        <View style={styles.header}>
          <Text style={styles.title} testID="exercise-title">
            {exercise.name}
          </Text>
          {onToggleFavorite && (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={isFavorite ? 'Remove favorite' : 'Add favorite'}
              onPress={(event) => {
                event?.stopPropagation();
                onToggleFavorite(exercise.id);
              }}
              style={{
                minWidth: 44,
                minHeight: 44,
                alignItems: 'center',
                justifyContent: 'center',
              }}
              hitSlop={10}
              testID="favorite-btn"
            >
              <Text style={styles.favoriteIcon}>{isFavorite ? '★' : '☆'}</Text>
            </Pressable>
          )}
        </View>

        <View style={styles.badges}>
          {exercise.primaryMuscles.map((m) => (
            <MuscleGroupBadge key={m} muscleGroup={m} />
          ))}
          <View style={styles.equipmentBadge}>
            <Text style={styles.equipmentBadgeText}>{formatEquipment(exercise.equipment)}</Text>
          </View>
        </View>
      </Pressable>
    </Link>
  );
};

const createStyles = (theme: Theme) =>
  StyleSheet.create({
    card: {
      backgroundColor: theme.colors.surface,
      borderRadius: 16,
      padding: 16,
      marginBottom: 12,
      shadowColor: theme.colors.shadow,
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.05,
      shadowRadius: 8,
      elevation: 2,
    },
    imageContainer: {
      width: '100%',
      height: 64,
      borderRadius: 12,
      overflow: 'hidden',
      marginBottom: 12,
      backgroundColor: theme.colors.surfaceElevated,
    },
    image: {
      width: '100%',
      height: '100%',
    },
    loaderContainer: {
      ...StyleSheet.absoluteFillObject,
      justifyContent: 'center',
      alignItems: 'center',
      backgroundColor: theme.colors.surfaceElevated,
    },
    gifBadge: {
      position: 'absolute',
      top: 8,
      right: 8,
      backgroundColor: theme.colors.overlay,
      paddingHorizontal: 6,
      paddingVertical: 2,
      borderRadius: 6,
    },
    gifBadgeText: {
      color: theme.colors.text,
      fontSize: 10,
      fontWeight: '800',
      letterSpacing: 0.5,
    },
    placeholderContainer: {
      width: '100%',
      height: 64,
      borderRadius: 12,
      marginBottom: 12,
      backgroundColor: theme.colors.surfaceElevated,
      justifyContent: 'center',
      alignItems: 'center',
      borderWidth: 1,
      borderColor: theme.colors.border,
      borderStyle: 'dashed',
    },
    placeholderIcon: {
      fontSize: 32,
      marginBottom: 4,
    },
    placeholderText: {
      fontSize: 12,
      color: theme.colors.muted,
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
      color: theme.colors.text,
      flex: 1,
    },
    favoriteIcon: {
      fontSize: 24,
      color: theme.colors.warning,
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
      backgroundColor: theme.colors.background,
      borderWidth: 1,
      borderColor: theme.colors.border,
      marginRight: 6,
      marginBottom: 6,
      alignSelf: 'flex-start',
    },
    equipmentBadgeText: {
      fontSize: 12,
      fontWeight: '600',
      color: theme.colors.muted,
    },
  });
