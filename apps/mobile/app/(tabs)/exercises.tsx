import React, { useState } from 'react';
import { View, Text, StyleSheet, FlatList, TextInput, Pressable } from 'react-native';
import { useExerciseStore } from '../../src/stores/exerciseStore';
import { ExerciseRow } from '../../src/components/exercises/ExerciseRow';
import { CustomExerciseModal } from '../../src/components/exercises/CustomExerciseModal';
import { useTheme, EmptyState } from '@fitness-tracker/ui';
import { Ionicons } from '@expo/vector-icons';
import { MuscleGroup } from '@fitness-tracker/domain';

const MUSCLE_FILTERS = [
  { id: 'all', label: 'All Muscles' },
  { id: 'favorites', label: '★ Favorites' },
  { id: MuscleGroup.Chest, label: 'Chest' },
  { id: MuscleGroup.UpperBack, label: 'Back' }, // We'll map 'Back' to upper back for the filter
  { id: MuscleGroup.Quads, label: 'Legs' },
  { id: MuscleGroup.FrontDelts, label: 'Shoulders' },
  { id: MuscleGroup.Biceps, label: 'Arms' },
  { id: MuscleGroup.Abs, label: 'Core' },
  { id: MuscleGroup.FullBody, label: 'Full Body' }
];

export default function ExercisesScreen() {
  const theme = useTheme();
  const { filteredExercises, favoriteIds, toggleFavorite, searchQuery, setSearchQuery } = useExerciseStore();
  const [showCustomModal, setShowCustomModal] = useState(false);
  const [selectedMuscle, setSelectedMuscle] = useState<string | null>(null);

  const displayExercises = filteredExercises.filter(ex => {
    if (selectedMuscle === 'favorites') {
      return favoriteIds.includes(ex.id);
    }
    return selectedMuscle ? ex.primaryMuscles.includes(selectedMuscle as MuscleGroup) : true;
  });

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <View style={styles.header}>
        <Text style={[styles.headerTitle, { color: theme.colors.text, ...theme.typography.heading }]}>
          EXERCISE LIBRARY
        </Text>
        <Pressable style={styles.createBtn} onPress={() => setShowCustomModal(true)}>
          <Ionicons name="add" size={24} color={theme.colors.primary} />
        </Pressable>
      </View>

      <View style={styles.searchContainer}>
        <View style={[styles.searchBar, { backgroundColor: theme.colors.surface, borderColor: theme.colors.muted }]}>
          <Ionicons name="search" size={20} color={theme.colors.muted} style={styles.searchIcon} />
          <TextInput
            style={[styles.searchInput, { color: theme.colors.text, ...theme.typography.body }]}
            placeholder="Search exercises..."
            value={searchQuery}
            onChangeText={setSearchQuery}
            placeholderTextColor={theme.colors.muted}
          />
        </View>
      </View>

      <View style={styles.filterContainer}>
        <FlatList
          horizontal
          showsHorizontalScrollIndicator={false}
          data={MUSCLE_FILTERS}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.filterList}
          renderItem={({ item }) => {
            const isSelected = (selectedMuscle === null && item.id === 'all') || selectedMuscle === item.id;
            return (
              <Pressable
                style={[
                  styles.filterPill,
                  {
                    backgroundColor: isSelected ? theme.colors.surface : 'transparent',
                    borderColor: isSelected ? theme.colors.primary : theme.colors.muted,
                  }
                ]}
                onPress={() => setSelectedMuscle(item.id === 'all' ? null : item.id)}
              >
                <Text
                  style={[
                    styles.filterPillText,
                    {
                      color: isSelected ? theme.colors.primary : theme.colors.muted,
                      ...theme.typography.caption,
                    }
                  ]}
                >
                  {item.label}
                </Text>
              </Pressable>
            );
          }}
        />
      </View>

      <FlatList
        data={displayExercises}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
        renderItem={({ item }) => (
          <ExerciseRow 
            exercise={item} 
            isFavorite={favoriteIds.includes(item.id)}
            onToggleFavorite={toggleFavorite}
          />
        )}
        ListEmptyComponent={
          <EmptyState 
            title="0 EXERCISES FOUND" 
            description="Adjust your search or filters to find what you're looking for."
          />
        }
      />

      <CustomExerciseModal 
        visible={showCustomModal} 
        onClose={() => setShowCustomModal(false)} 
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingTop: 48,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 24,
    marginBottom: 16,
  },
  headerTitle: {
  },
  createBtn: {
    padding: 8,
  },
  searchContainer: {
    paddingHorizontal: 24,
    marginBottom: 16,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 48,
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 12,
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    height: '100%',
  },
  filterContainer: {
    marginBottom: 16,
  },
  filterList: {
    paddingHorizontal: 24,
    gap: 8,
  },
  filterPill: {
    height: 32,
    borderRadius: 16,
    borderWidth: 1,
    paddingHorizontal: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  filterPillText: {
  },
  listContent: {
    paddingHorizontal: 24,
    paddingBottom: 40,
  },
});
