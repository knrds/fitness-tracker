import React, { useState, useEffect } from 'react';
import { Modal, View, Text, StyleSheet, FlatList, TextInput, Pressable, SafeAreaView, ScrollView } from 'react-native';
import { useExerciseStore } from '../../stores/exerciseStore';
import { UUID, Exercise } from '@fitness-tracker/domain';

interface Props {
  visible: boolean;
  onClose: () => void;
  onSelect: (exerciseId: UUID) => void;
}

export const ExercisePickerModal = ({ visible, onClose, onSelect }: Props) => {
  const { exercises } = useExerciseStore();
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('All');

  const categories = ['All', 'Chest', 'Back', 'Legs', 'Shoulders', 'Arms', 'Core'];

  useEffect(() => {
    if (!visible) {
      setSearch('');
      setSelectedCategory('All');
    }
  }, [visible]);

  const matchesCategory = (ex: Exercise, category: string): boolean => {
    if (category === 'All') return true;
    
    const muscles = ex.primaryMuscles.map(m => m.toLowerCase());
    
    switch (category) {
      case 'Chest':
        return muscles.includes('chest');
      case 'Back':
        return muscles.some(m => ['upper_back', 'lats', 'lower_back', 'traps'].includes(m));
      case 'Legs':
        return muscles.some(m => ['quads', 'hamstrings', 'glutes', 'calves'].includes(m));
      case 'Shoulders':
        return muscles.some(m => ['front_delts', 'side_delts', 'rear_delts', 'neck'].includes(m));
      case 'Arms':
        return muscles.some(m => ['biceps', 'triceps', 'forearms'].includes(m));
      case 'Core':
        return muscles.some(m => ['abs', 'obliques'].includes(m));
      default:
        return false;
    }
  };

  const filtered = exercises.filter(ex => 
    ex.name.toLowerCase().includes(search.toLowerCase()) &&
    matchesCategory(ex, selectedCategory)
  );

  const renderItem = ({ item }: { item: Exercise }) => (
    <Pressable 
      style={styles.exerciseRow} 
      onPress={() => {
        onSelect(item.id);
        onClose();
      }}
    >
      <Text style={styles.exerciseName}>{item.name}</Text>
      <Text style={styles.exerciseMeta}>{item.primaryMuscles.join(', ').replace(/_/g, ' ')} • {item.equipment.replace(/_/g, ' ')}</Text>
    </Pressable>
  );

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.title}>Select Exercise</Text>
          <Pressable onPress={onClose} style={styles.closeBtn}>
            <Text style={styles.closeBtnText}>Close</Text>
          </Pressable>
        </View>
        
        <View style={styles.searchContainer}>
          <TextInput
            style={styles.searchInput}
            placeholder="Search exercises..."
            value={search}
            onChangeText={setSearch}
            placeholderTextColor="#94a3b8"
            autoFocus
          />
        </View>

        <View style={styles.filterContainer}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipScroll}>
            {categories.map(cat => {
              const isSelected = selectedCategory === cat;
              return (
                <Pressable
                  key={cat}
                  style={[styles.chip, isSelected && styles.chipSelected]}
                  onPress={() => setSelectedCategory(cat)}
                >
                  <Text style={[styles.chipText, isSelected && styles.chipTextSelected]}>
                    {cat}
                  </Text>
                </Pressable>
              );
            })}
          </ScrollView>
        </View>

        <FlatList
          data={filtered}
          keyExtractor={item => item.id}
          renderItem={renderItem}
          contentContainerStyle={styles.listContent}
          initialNumToRender={20}
        />
      </SafeAreaView>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
    backgroundColor: '#ffffff',
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
    color: '#0f172a',
  },
  closeBtnText: {
    color: '#3b82f6',
    fontWeight: '600',
    fontSize: 16,
  },
  closeBtn: {
    padding: 4,
  },
  searchContainer: {
    padding: 16,
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
  },
  searchInput: {
    backgroundColor: '#f1f5f9',
    height: 40,
    borderRadius: 8,
    paddingHorizontal: 12,
    fontSize: 16,
    color: '#0f172a',
  },
  listContent: {
    paddingBottom: 40,
  },
  exerciseRow: {
    padding: 16,
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  exerciseName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1e293b',
    marginBottom: 4,
  },
  exerciseMeta: {
    fontSize: 13,
    color: '#64748b',
    textTransform: 'capitalize',
  },
  filterContainer: {
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
    paddingVertical: 12,
  },
  chipScroll: {
    paddingHorizontal: 16,
    gap: 8,
  },
  chip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#f1f5f9',
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  chipSelected: {
    backgroundColor: '#3b82f6',
    borderColor: '#3b82f6',
  },
  chipText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#64748b',
  },
  chipTextSelected: {
    color: '#ffffff',
  },
});
