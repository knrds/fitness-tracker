import React, { useState } from 'react';
import { View, Text, StyleSheet, FlatList, TextInput, Pressable } from 'react-native';
import { useExerciseStore } from '../../src/stores/exerciseStore';
import { ExerciseCard } from '../../src/components/exercises/ExerciseCard';
import { ExerciseFilter } from '../../src/components/exercises/ExerciseFilter';
import { CustomExerciseModal } from '../../src/components/exercises/CustomExerciseModal';

export default function ExercisesScreen() {
  const { filteredExercises, favoriteIds, toggleFavorite, searchQuery, setSearchQuery } = useExerciseStore();
  const [showFilters, setShowFilters] = useState(false);
  const [showCustomModal, setShowCustomModal] = useState(false);

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Exercise Library</Text>
        <Pressable style={styles.createBtn} onPress={() => setShowCustomModal(true)}>
          <Text style={styles.createBtnText}>+ Custom</Text>
        </Pressable>
      </View>

      <View style={styles.searchContainer}>
        <TextInput
          style={styles.searchInput}
          placeholder="Search exercises..."
          value={searchQuery}
          onChangeText={setSearchQuery}
          placeholderTextColor="#94a3b8"
        />
        <Pressable style={styles.filterToggle} onPress={() => setShowFilters(!showFilters)}>
          <Text style={styles.filterText}>{showFilters ? 'Hide Filters' : 'Filters'}</Text>
        </Pressable>
      </View>

      {showFilters && <ExerciseFilter />}

      <FlatList
        data={filteredExercises}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
        renderItem={({ item }) => (
          <ExerciseCard 
            exercise={item} 
            isFavorite={favoriteIds.includes(item.id)}
            onToggleFavorite={toggleFavorite}
          />
        )}
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
    backgroundColor: '#f1f5f9',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#ffffff',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#0f172a',
  },
  createBtn: {
    backgroundColor: '#e0f2fe',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
  },
  createBtnText: {
    color: '#0284c7',
    fontWeight: '600',
    fontSize: 14,
  },
  searchContainer: {
    flexDirection: 'row',
    padding: 16,
    backgroundColor: '#ffffff',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
  },
  searchInput: {
    flex: 1,
    height: 40,
    backgroundColor: '#f1f5f9',
    borderRadius: 8,
    paddingHorizontal: 12,
    fontSize: 16,
    color: '#0f172a',
  },
  filterToggle: {
    marginLeft: 12,
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: '#e2e8f0',
    borderRadius: 8,
  },
  filterText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#334155',
  },
  listContent: {
    padding: 16,
  },
});
