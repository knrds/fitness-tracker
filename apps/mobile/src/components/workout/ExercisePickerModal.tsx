import React, { useState, useEffect } from 'react';
import {
  Modal,
  View,
  Text,
  StyleSheet,
  FlatList,
  TextInput,
  Pressable,
  ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { UUID, Exercise } from '@fitness-tracker/domain';
import { useTheme } from '@fitness-tracker/ui';
import { useRouter } from 'expo-router';
import { Image } from 'expo-image';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useExerciseStore } from '../../stores/exerciseStore';
import { useHistoryStore } from '../../stores/historyStore';
import { CustomExerciseModal } from '../exercises/CustomExerciseModal';

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
  'Plank',
];

export const ExercisePickerModal = ({ visible, onClose, onSelect }: Props) => {
  const theme = useTheme();
  const router = useRouter();
  const { exercises } = useExerciseStore();
  const { sessions } = useHistoryStore();
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [selectedIds, setSelectedIds] = useState<Set<UUID>>(new Set());
  const [customExVisible, setCustomExVisible] = useState(false);

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

    const muscles = ex.primaryMuscles.map((m) => m.toLowerCase());

    switch (category) {
      case 'Chest':
        return muscles.includes('chest');
      case 'Back':
        return muscles.some((m) => ['upper_back', 'lats', 'lower_back', 'traps'].includes(m));
      case 'Legs':
        return muscles.some((m) => ['quads', 'hamstrings', 'glutes', 'calves'].includes(m));
      case 'Shoulders':
        return muscles.some((m) => ['front_delts', 'side_delts', 'rear_delts', 'neck'].includes(m));
      case 'Arms':
        return muscles.some((m) => ['biceps', 'triceps', 'forearms'].includes(m));
      case 'Core':
        return muscles.some((m) => ['abs', 'obliques'].includes(m));
      default:
        return false;
    }
  };

  const exerciseCounts = React.useMemo(() => {
    const counts: Record<string, number> = {};
    sessions.forEach((session) => {
      session.exercises.forEach((ex) => {
        counts[ex.exerciseId] = (counts[ex.exerciseId] || 0) + 1;
      });
    });
    return counts;
  }, [sessions]);

  const sortedExercises = React.useMemo(() => {
    const scored = exercises.map((ex) => {
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

    return scored.map((item) => item.ex);
  }, [exercises, exerciseCounts]);

  const popularExercises = React.useMemo(() => {
    return sortedExercises.filter(
      (ex) => POPULAR_EXERCISE_NAMES.includes(ex.name) || (exerciseCounts[ex.id] || 0) > 0,
    );
  }, [sortedExercises, exerciseCounts]);

  const otherExercises = React.useMemo(() => {
    const popularSet = new Set(popularExercises.map((e) => e.id));
    const others = sortedExercises.filter((ex) => !popularSet.has(ex.id));
    return [...others].sort((a, b) => a.name.localeCompare(b.name));
  }, [sortedExercises, popularExercises]);

  const listData = React.useMemo(() => {
    const isFiltered = search !== '' || selectedCategory !== 'All';
    if (isFiltered) {
      return sortedExercises.filter(
        (ex) =>
          ex.name.toLowerCase().includes(search.toLowerCase()) &&
          matchesCategory(ex, selectedCategory),
      );
    }

    return [
      { type: 'header' as const, name: 'Popular Exercises' },
      ...popularExercises,
      { type: 'header' as const, name: 'All Exercises' },
      ...otherExercises,
    ];
  }, [search, selectedCategory, sortedExercises, popularExercises, otherExercises]);

  const toggleSelection = (id: UUID) => {
    setSelectedIds((prev) => {
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
        <Text style={[styles.sectionHeaderText, { color: theme.colors.muted }]}>{item.name}</Text>
      );
    }
    const ex = item as Exercise;
    const isSelected = selectedIds.has(ex.id);
    return (
      <Pressable
        style={[
          styles.exerciseRow,
          { borderColor: theme.colors.border },
          isSelected && { backgroundColor: 'rgba(144, 213, 255, 0.08)' },
        ]}
        onPress={() => toggleSelection(ex.id)}
      >
        <View style={[styles.thumbnail, { backgroundColor: theme.colors.surface }]}>
          {ex.imageUrl ? (
            <Image source={{ uri: ex.imageUrl }} style={styles.image} contentFit="cover" />
          ) : (
            <Ionicons name="barbell-outline" size={20} color={theme.colors.muted} />
          )}
        </View>

        <View style={styles.exerciseTextContainer}>
          <Text style={[styles.exerciseName, { color: theme.colors.text }]} numberOfLines={1}>
            {ex.name}
          </Text>
          <Text style={[styles.exerciseMeta, { color: theme.colors.muted }]} numberOfLines={1}>
            {ex.primaryMuscles.join(', ').replace(/_/g, ' ')} • {ex.equipment.replace(/_/g, ' ')}
          </Text>
        </View>

        <View style={styles.actionContainer}>
          <Pressable
            style={styles.infoBtn}
            hitSlop={8}
            onPress={() => {
              onClose();
              router.push(`/exercise/${ex.id}`);
            }}
          >
            <Ionicons name="information-circle-outline" size={22} color={theme.colors.primary} />
          </Pressable>

          <View
            style={[
              styles.checkbox,
              { borderColor: isSelected ? theme.colors.primary : theme.colors.border },
              isSelected && { backgroundColor: theme.colors.primary },
            ]}
          >
            {isSelected && <Ionicons name="checkmark" size={16} color={theme.colors.background} />}
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
      <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]}>
        <View style={[styles.header, { borderBottomColor: theme.colors.border }]}>
          <Text style={[styles.title, { color: theme.colors.text, ...theme.typography.heading }]}>
            Add Exercises
          </Text>
          <View style={styles.headerRight}>
            <Pressable
              hitSlop={8}
              onPress={() => setCustomExVisible(true)}
              style={{ marginRight: 16 }}
            >
              <Ionicons name="add" size={28} color={theme.colors.primary} />
            </Pressable>
            <Pressable hitSlop={8} onPress={onClose}>
              <Ionicons name="close" size={26} color={theme.colors.muted} />
            </Pressable>
          </View>
        </View>

        <View style={styles.searchContainer}>
          <View
            style={[
              styles.searchField,
              { backgroundColor: theme.colors.surface, borderColor: theme.colors.border },
            ]}
          >
            <Ionicons name="search" size={18} color={theme.colors.muted} />
            <TextInput
              style={[styles.searchInput, { color: theme.colors.text }]}
              placeholder="Search exercises..."
              value={search}
              onChangeText={setSearch}
              placeholderTextColor={theme.colors.muted}
              autoFocus
            />
          </View>
        </View>

        <View style={styles.filterContainer}>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.chipScroll}
          >
            {categories.map((cat) => {
              const isSelected = selectedCategory === cat;
              return (
                <Pressable
                  key={cat}
                  style={[
                    styles.chip,
                    { borderColor: isSelected ? theme.colors.primary : theme.colors.border },
                  ]}
                  onPress={() => setSelectedCategory(cat)}
                >
                  <Text
                    style={[
                      styles.chipText,
                      { color: isSelected ? theme.colors.primary : theme.colors.muted },
                    ]}
                  >
                    {cat.toUpperCase()}
                  </Text>
                </Pressable>
              );
            })}
          </ScrollView>
        </View>

        <FlatList
          data={listData}
          keyExtractor={(item) => ('type' in item ? `header-${item.name}` : item.id)}
          renderItem={renderItem}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          initialNumToRender={20}
        />

        {selectedIds.size > 0 && (
          <View
            style={[
              styles.addBtnContainer,
              { borderTopColor: theme.colors.border, backgroundColor: theme.colors.background },
            ]}
          >
            <Pressable
              style={[
                styles.addSelectedBtn,
                { backgroundColor: theme.colors.primary, borderRadius: theme.radius.md },
              ]}
              onPress={() => {
                onSelect(Array.from(selectedIds));
                onClose();
              }}
            >
              <Text
                style={[
                  styles.addSelectedBtnText,
                  { color: theme.colors.background, ...theme.typography.button },
                ]}
              >
                Add {selectedIds.size} Exercise{selectedIds.size > 1 ? 's' : ''}
              </Text>
            </Pressable>
          </View>
        )}
      </SafeAreaView>

      <CustomExerciseModal visible={customExVisible} onClose={() => setCustomExVisible(false)} />
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  title: {
    fontSize: 20,
  },
  searchContainer: {
    paddingHorizontal: 20,
    paddingTop: 16,
  },
  searchField: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    height: 48,
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 14,
  },
  searchInput: {
    flex: 1,
    fontFamily: 'Manrope_500Medium',
    fontSize: 16,
  },
  listContent: {
    paddingBottom: 40,
  },
  exerciseRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  thumbnail: {
    width: 40,
    height: 40,
    borderRadius: 6,
    marginRight: 12,
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
  },
  image: {
    width: '100%',
    height: '100%',
  },
  actionContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  infoBtn: {
    padding: 4,
  },
  exerciseTextContainer: {
    flex: 1,
    paddingRight: 8,
  },
  exerciseName: {
    fontFamily: 'Manrope_500Medium',
    fontSize: 16,
    marginBottom: 4,
  },
  exerciseMeta: {
    fontFamily: 'SpaceGrotesk_400Regular',
    fontSize: 11,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  checkbox: {
    width: 28,
    height: 28,
    borderRadius: 8,
    borderWidth: 2,
    justifyContent: 'center',
    alignItems: 'center',
  },
  filterContainer: {
    paddingVertical: 16,
  },
  chipScroll: {
    paddingHorizontal: 20,
    gap: 8,
  },
  chip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 9999,
    borderWidth: 1,
  },
  chipText: {
    fontFamily: 'SpaceGrotesk_600SemiBold',
    fontSize: 12,
    letterSpacing: 0.5,
  },
  sectionHeaderText: {
    fontFamily: 'SpaceGrotesk_400Regular',
    fontSize: 12,
    textTransform: 'uppercase',
    letterSpacing: 1,
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 8,
  },
  addBtnContainer: {
    padding: 20,
    borderTopWidth: 1,
  },
  addSelectedBtn: {
    height: 56,
    alignItems: 'center',
    justifyContent: 'center',
  },
  addSelectedBtnText: {
    fontSize: 16,
  },
});
