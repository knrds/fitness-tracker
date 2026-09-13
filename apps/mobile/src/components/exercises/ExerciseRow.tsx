import React from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { Image } from 'expo-image';
import { Exercise } from '@fitness-tracker/domain';
import { useRouter, Href } from 'expo-router';
import { useTheme, Badge } from '@fitness-tracker/ui';
import { Ionicons } from '@expo/vector-icons';

interface Props {
  exercise: Exercise;
  isFavorite?: boolean;
  onToggleFavorite?: (id: string) => void;
}

export const ExerciseRow = ({ exercise, isFavorite, onToggleFavorite }: Props) => {
  const theme = useTheme();
  const router = useRouter();

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={exercise.name}
      style={styles.container}
      onPress={() => router.push(`/exercise/${exercise.id}` as Href)}
    >
      <View style={[styles.thumbnail, { backgroundColor: theme.colors.surface }]}>
        {exercise.imageUrl ? (
          <Image source={{ uri: exercise.imageUrl }} style={styles.image} contentFit="cover" />
        ) : (
          <Ionicons name="barbell-outline" size={24} color={theme.colors.muted} />
        )}
      </View>

      <View style={styles.infoContainer}>
        <Text
          style={[styles.title, { color: theme.colors.text, ...theme.typography.body }]}
          numberOfLines={2}
        >
          {exercise.name}
        </Text>
        <View style={styles.badges}>
          {exercise.primaryMuscles.slice(0, 2).map((m) => (
            <Badge key={m} label={m.replace('_', ' ')} style={{ marginRight: 4 }} />
          ))}
        </View>
      </View>

      {onToggleFavorite && (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`${exercise.name} ${isFavorite ? 'aus Favoriten entfernen' : 'zu Favoriten hinzufügen'}`}
          onPress={(event) => {
            event.stopPropagation();
            onToggleFavorite(exercise.id);
          }}
          hitSlop={10}
          style={styles.favoriteBtn}
        >
          <Ionicons
            name={isFavorite ? 'star' : 'star-outline'}
            size={24}
            color={isFavorite ? theme.colors.primary : theme.colors.muted}
          />
        </Pressable>
      )}
    </Pressable>
  );
};

const styles = StyleSheet.create({
  container: {
    minHeight: 72,
    paddingVertical: 8,
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  thumbnail: {
    width: 48,
    height: 48,
    borderRadius: 8,
    marginRight: 16,
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
  },
  image: {
    width: '100%',
    height: '100%',
  },
  infoContainer: {
    flex: 1,
    minWidth: 0,
    justifyContent: 'center',
  },
  title: {
    marginBottom: 4,
  },
  badges: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 4,
  },
  favoriteBtn: {
    minHeight: 44,
    minWidth: 44,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 8,
  },
});
