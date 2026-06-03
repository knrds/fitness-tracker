import React, { useState, useEffect } from 'react';
import { Modal, View, Text, StyleSheet, FlatList, TextInput, Pressable, SafeAreaView, ScrollView } from 'react-native';
import { useExerciseStore } from '../../stores/exerciseStore';
import { useHistoryStore } from '../../stores/historyStore';
import { UUID, Exercise } from '@fitness-tracker/domain';

interface Props {
  visible: boolean;
  onClose: () => void;
  onSelect: (exerciseIds: UUID[]) => void;
}

const POPULAR_EXERCISE_NAMES = [
  'Barbell Bench Press - Medium Grip',
  'Incline Dumbbell Press',
  'Dumbbell Flyes',
  'Dips - Chest Version',
  'Barbell Deadlift',
  'Pullups',
  'Bent Over Barbell Row',
  'Wide-Grip Lat Pulldown',
  'Barbell Shoulder Press',
  'Side Lateral Raise',
  'Cable Rear Delt Fly',
  'Barbell Squat',
  'Leg Press',
  'Romanian Deadlift',
  'Leg Extensions',
  'Lying Leg Curls',
  'Barbell Curl',
  'Hammer Curls',
  'Triceps Pushdown',
  'EZ-Bar Skullcrusher',
  'Hanging Leg Raise',
  'Cable Crunch',
  'Plank'
];

export const ExercisePickerModal = ({ visible, onClose, onSelect }: Props) => {
  const { exercises } = useExerciseStore();
  const { sessions } = useHistoryStore();
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [selectedIds, setSelectedIds] = useState<Set<UUID>>(new Set());

  const categories = ['All', 'Chest', 'Back', 'Legs', 'Shoulders', 'Arms', 'Core'];

  useEffect(() => {
    if (!visible) {
      setSearch('');
      setSelectedCategory('All');
      setSelectedIds(new Set());
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

  const exerciseCounts = React.useMemo(() => {
    const counts: Record<string, number> = {};
    sessions.forEach(session => {
      session.exercises.forEach(ex => {
        counts[ex.exerciseId] = (counts[ex.exerciseId] || 0) + 1;
      });
    });
    return counts;
  }, [sessions]);

  const sortedExercises = React.useMemo(() => {
    const scored = exercises.map(ex => {
      const freq = exerciseCounts[ex.id] || 0;
      const isDefaultPopular = POPULAR_EXERCISE_NAMES.includes(ex.name);
      const score = freq * 1000 + (isDefaultPopular ? 1 : 0);
      return { ex, score };
    });

    scored.sort((a, b) => {
      if (b.score !== a.score) {
        return b.score - a.score;
      }
      return a.ex.name.localeCompare(b.ex.name);
    });

    return scored.map(item => item.ex);
  }, [exercises, exerciseCounts]);

  const popularExercises = React.useMemo(() => {
    return sortedExercises.filter(ex => POPULAR_EXERCISE_NAMES.includes(ex.name) || (exerciseCounts[ex.id] || 0) > 0);
  }, [sortedExercises, exerciseCounts]);

  const otherExercises = React.useMemo(() => {
    const popularSet = new Set(popularExercises.map(e => e.id));
    const others = sortedExercises.filter(ex => !popularSet.has(ex.id));
    return [...others].sort((a, b) => a.name.localeCompare(b.name));
  }, [sortedExercises, popularExercises]);

  const listData = React.useMemo(() => {
    const isFiltered = search !== '' || selectedCategory !== 'All';
    if (isFiltered) {
      return sortedExercises.filter(ex => 
        ex.name.toLowerCase().includes(search.toLowerCase()) &&
        matchesCategory(ex, selectedCategory)
      );
    }

    return [
      { type: 'header' as const, name: 'Popular Exercises' },
      ...popularExercises,
      { type: 'header' as const, name: 'All Exercises' },
      ...otherExercises
    ];
  }, [search, selectedCategory, sortedExercises, popularExercises, otherExercises]);

  const toggleSelection = (id: UUID) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const renderItem = ({ item }: { item: Exercise | { type: 'header'; name: string } }) => {
    if ('type' in item && item.type === 'header') {
      return (
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionHeaderText}>{item.name}</Text>
        </View>
      );
    }
    const ex = item as Exercise;
    const isSelected = selectedIds.has(ex.id);
    return (
      <Pressable 
        style={[styles.exerciseRow, isSelected && styles.exerciseRowSelected]} 
        onPress={() => toggleSelection(ex.id)}
      >
        <View style={styles.exerciseRowContent}>
          <View style={styles.exerciseTextContainer}>
            <Text style={styles.exerciseName}>{ex.name}</Text>
            <Text style={styles.exerciseMeta}>{ex.primaryMuscles.join(', ').replace(/_/g, ' ')} • {ex.equipment.replace(/_/g, ' ')}</Text>
          </View>
          <View style={[styles.checkbox, isSelected && styles.checkboxSelected]}>
            {isSelected && <Text style={styles.checkboxCheck}>✓</Text>}
          </View>
        </View>
      </Pressable>
    );
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.title}>Select Exercises</Text>
          <Pressable style={styles.closeBtn} onPress={onClose}>
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
          data={listData}
          keyExtractor={item => 'type' in item ? `header-${item.name}` : item.id}
          renderItem={renderItem}
          contentContainerStyle={styles.listContent}
          initialNumToRender={20}
        />

        {selectedIds.size > 0 && (
          <View style={styles.addBtnContainer}>
            <Pressable 
              style={styles.addSelectedBtn}
              onPress={() => {
                onSelect(Array.from(selectedIds));
                onClose();
              }}
            >
              <Text style={styles.addSelectedBtnText}>
                Add {selectedIds.size} Exercise{selectedIds.size > 1 ? 's' : ''}
              </Text>
            </Pressable>
          </View>
        )}
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
  exerciseRowSelected: {
    backgroundColor: '#f0f7ff',
  },
  exerciseRowContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  exerciseTextContainer: {
    flex: 1,
    paddingRight: 16,
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
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: '#cbd5e1',
    justifyContent: 'center',
    alignItems: 'center',
  },
  checkboxSelected: {
    backgroundColor: '#3b82f6',
    borderColor: '#3b82f6',
  },
  checkboxCheck: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '700',
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
  sectionHeader: {
    backgroundColor: '#f1f5f9',
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
  },
  sectionHeaderText: {
    fontSize: 12,
    fontWeight: '800',
    color: '#64748b',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  addBtnContainer: {
    padding: 16,
    backgroundColor: '#ffffff',
    borderTopWidth: 1,
    borderColor: '#e2e8f0',
  },
  addSelectedBtn: {
    backgroundColor: '#3b82f6',
    padding: 14,
    borderRadius: 10,
    alignItems: 'center',
  },
  addSelectedBtnText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '700',
  },
});
