import React, { useState } from 'react';
import { View, Text, StyleSheet, FlatList, TextInput, Pressable } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useExerciseStore } from '../../src/stores/exerciseStore';
import { useHistoryStore } from '../../src/stores/historyStore';
import { ExerciseRow } from '../../src/components/exercises/ExerciseRow';
import { CustomExerciseModal } from '../../src/components/exercises/CustomExerciseModal';
import { useTheme, EmptyState } from '@fitness-tracker/ui';
import { Ionicons } from '@expo/vector-icons';
import { Equipment, MovementPattern, MuscleGroup } from '@fitness-tracker/domain';
import { HorizontalFadeScroll } from '../../src/components/HorizontalFadeScroll';

const MUSCLE_FILTERS = [
  { id: 'all', label: 'All Muscles' },
  { id: 'favorites', label: 'Favorites' },
  { id: 'powerlifting', label: 'Powerlifting' },
  { id: 'calisthenics', label: 'Calisthenics' },
  { id: 'warmup', label: 'Warmup' },
  { id: 'warmup_cardio', label: 'Warmup Cardio' },
  { id: 'strength', label: 'Strength' },
  { id: 'favorites', label: '★ Favorites' },
  { id: MuscleGroup.Chest, label: 'Chest' },
  { id: MuscleGroup.UpperBack, label: 'Back' }, // We'll map 'Back' to upper back for the filter
  { id: MuscleGroup.Quads, label: 'Legs' },
  { id: MuscleGroup.FrontDelts, label: 'Shoulders' },
  { id: MuscleGroup.Biceps, label: 'Arms' },
  { id: MuscleGroup.Abs, label: 'Core' },
  { id: MuscleGroup.Obliques, label: 'Obliques' },
  { id: MuscleGroup.FullBody, label: 'Full Body' },
];

const WARMUP_KEYWORDS = [
  'warm',
  'stretch',
  'mobility',
  'foam',
  'dynamic',
  'jump',
  'skipping',
  'walk',
  'jog',
  'bike',
  'rower',
  'treadmill',
  'elliptical',
];

const isCardioExercise = (exercise: {
  name: string;
  equipment: Equipment;
  movementPattern: MovementPattern;
}) =>
  exercise.movementPattern === MovementPattern.Cardio || exercise.equipment === Equipment.Cardio;

const isWarmupExercise = (exercise: {
  name: string;
  equipment: Equipment;
  movementPattern: MovementPattern;
}) => {
  const lowerName = exercise.name.toLowerCase();
  return (
    isCardioExercise(exercise) || WARMUP_KEYWORDS.some((keyword) => lowerName.includes(keyword))
  );
};

const isPowerliftingExercise = (exercise: { name: string; equipment: Equipment }) => {
  const lowerName = exercise.name.toLowerCase();
  const isMainLift =
    lowerName.includes('squat') ||
    lowerName.includes('bench press') ||
    lowerName.includes('deadlift');
  return isMainLift && [Equipment.Barbell, Equipment.SmithMachine].includes(exercise.equipment);
};

const isCalisthenicsExercise = (exercise: {
  name: string;
  equipment: Equipment;
  movementPattern: MovementPattern;
}) => {
  const lowerName = exercise.name.toLowerCase();
  return (
    exercise.equipment === Equipment.Bodyweight ||
    exercise.equipment === Equipment.Trx ||
    [
      'pullup',
      'pull-up',
      'chin',
      'dip',
      'push-up',
      'pushup',
      'muscle up',
      'muscle-up',
      'plank',
      'handstand',
      'sit-up',
    ].some((keyword) => lowerName.includes(keyword))
  );
};

const isObliqueLikeExercise = (exercise: {
  name: string;
  primaryMuscles: MuscleGroup[];
  secondaryMuscles: MuscleGroup[];
  movementPattern: MovementPattern;
}) => {
  const lowerName = exercise.name.toLowerCase();
  return (
    exercise.primaryMuscles.includes(MuscleGroup.Obliques) ||
    exercise.secondaryMuscles.includes(MuscleGroup.Obliques) ||
    exercise.movementPattern === MovementPattern.Rotation ||
    ['oblique', 'side bend', 'side plank', 'russian twist', 'woodchop', 'wood chop', 'twist'].some(
      (keyword) => lowerName.includes(keyword),
    )
  );
};

export default function ExercisesScreen() {
  const theme = useTheme();
  const params = useLocalSearchParams<{ muscle?: string }>();
  const insets = useSafeAreaInsets();
  const { filteredExercises, favoriteIds, toggleFavorite, searchQuery, setSearchQuery } =
    useExerciseStore();
  const historyStore = useHistoryStore();
  const [showCustomModal, setShowCustomModal] = useState(false);
  const [selectedMuscle, setSelectedMuscle] = useState<string | null>(null);

  React.useEffect(() => {
    if (params.muscle) {
      setSelectedMuscle(params.muscle);
    }
  }, [params.muscle]);

  const [sortBy, setSortBy] = useState<'name_asc' | 'name_desc' | 'most_used' | 'recently_used'>(
    'name_asc',
  );
  const [showSortDropdown, setShowSortDropdown] = useState(false);
  const visibleFilters = React.useMemo(
    () =>
      MUSCLE_FILTERS.filter(
        (item, index, allItems) =>
          allItems.findIndex((candidate) => candidate.id === item.id) === index,
      ),
    [],
  );

  // Compute frequencies and recency
  const { exerciseUsageCount, exerciseLastUsed } = React.useMemo(() => {
    const counts: Record<string, number> = {};
    const lastUsed: Record<string, number> = {};

    // Chronological processing so latest date overrides older ones
    const sortedHistory = [...historyStore.sessions].sort(
      (a, b) => a.startedAt.getTime() - b.startedAt.getTime(),
    );

    sortedHistory.forEach((session) => {
      const time = session.startedAt.getTime();
      session.exercises.forEach((ex) => {
        counts[ex.exerciseId] = (counts[ex.exerciseId] || 0) + 1;
        lastUsed[ex.exerciseId] = time;
      });
    });

    return { exerciseUsageCount: counts, exerciseLastUsed: lastUsed };
  }, [historyStore.sessions]);

  const displayExercises = filteredExercises
    .filter((ex) => {
      if (selectedMuscle === 'favorites') {
        return favoriteIds.includes(ex.id);
      }
      if (selectedMuscle === 'powerlifting') {
        return isPowerliftingExercise(ex);
      }
      if (selectedMuscle === 'calisthenics') {
        return isCalisthenicsExercise(ex);
      }
      if (selectedMuscle === 'warmup') {
        return isWarmupExercise(ex);
      }
      if (selectedMuscle === 'warmup_cardio') {
        return isCardioExercise(ex);
      }
      if (selectedMuscle === 'strength') {
        return !isCardioExercise(ex);
      }
      if (selectedMuscle === MuscleGroup.Obliques) {
        return isObliqueLikeExercise(ex);
      }
      return selectedMuscle
        ? ex.primaryMuscles.includes(selectedMuscle as MuscleGroup) ||
            ex.secondaryMuscles.includes(selectedMuscle as MuscleGroup)
        : true;
    })
    .sort((a, b) => {
      switch (sortBy) {
        case 'name_asc':
          return a.name.localeCompare(b.name);
        case 'name_desc':
          return b.name.localeCompare(a.name);
        case 'most_used': {
          const countA = exerciseUsageCount[a.id] || 0;
          const countB = exerciseUsageCount[b.id] || 0;
          if (countA !== countB) return countB - countA;
          return a.name.localeCompare(b.name);
        }
        case 'recently_used': {
          const timeA = exerciseLastUsed[a.id] || 0;
          const timeB = exerciseLastUsed[b.id] || 0;
          if (timeA !== timeB) return timeB - timeA;
          return a.name.localeCompare(b.name);
        }
        default:
          return 0;
      }
    });

  return (
    <View
      style={[
        styles.container,
        { backgroundColor: theme.colors.background, paddingTop: Math.max(insets.top, 16) },
      ]}
    >
      <View style={styles.header}>
        <Text
          style={[styles.headerTitle, { color: theme.colors.text, ...theme.typography.heading }]}
        >
          EXERCISE LIBRARY
        </Text>
        <Pressable style={styles.createBtn} onPress={() => setShowCustomModal(true)}>
          <Ionicons name="add" size={24} color={theme.colors.primary} />
        </Pressable>
      </View>

      <View style={[styles.searchContainer, { zIndex: 100 }]}>
        <View style={styles.searchRow}>
          <View
            style={[
              styles.searchBar,
              { backgroundColor: theme.colors.surface, borderColor: theme.colors.border, flex: 1 },
            ]}
          >
            <Ionicons
              name="search"
              size={20}
              color={theme.colors.muted}
              style={styles.searchIcon}
            />
            <TextInput
              style={[styles.searchInput, { color: theme.colors.text, ...theme.typography.body }]}
              placeholder="Search exercises..."
              value={searchQuery}
              onChangeText={setSearchQuery}
              placeholderTextColor={theme.colors.muted}
            />
          </View>
          <Pressable
            style={[
              styles.sortBtn,
              { backgroundColor: theme.colors.surface, borderColor: theme.colors.border },
            ]}
            onPress={() => setShowSortDropdown((prev) => !prev)}
            testID="sort-exercises-btn"
          >
            <Ionicons name="swap-vertical" size={20} color={theme.colors.primary} />
          </Pressable>
        </View>

        {showSortDropdown && (
          <View
            style={[
              styles.sortDropdown,
              { backgroundColor: theme.colors.surface, borderColor: theme.colors.border },
            ]}
          >
            {(
              [
                { id: 'name_asc', label: 'Name (A-Z)', icon: 'text' },
                { id: 'name_desc', label: 'Name (Z-A)', icon: 'text' },
                { id: 'most_used', label: 'Most Used', icon: 'barbell' },
                { id: 'recently_used', label: 'Recently Used', icon: 'time' },
              ] as const as ReadonlyArray<{
                id: typeof sortBy;
                label: string;
                icon: React.ComponentProps<typeof Ionicons>['name'];
              }>
            ).map((opt) => (
              <Pressable
                key={opt.id}
                style={[
                  styles.sortOption,
                  sortBy === opt.id && { backgroundColor: 'rgba(144, 213, 255, 0.1)' },
                ]}
                onPress={() => {
                  setSortBy(opt.id);
                  setShowSortDropdown(false);
                }}
              >
                <Ionicons
                  name={opt.icon}
                  size={18}
                  color={sortBy === opt.id ? theme.colors.primary : theme.colors.muted}
                />
                <Text
                  style={[
                    styles.sortOptionText,
                    {
                      color: sortBy === opt.id ? theme.colors.primary : theme.colors.text,
                      fontFamily: sortBy === opt.id ? 'SpaceGrotesk_700Bold' : 'Manrope_500Medium',
                    },
                  ]}
                >
                  {opt.label}
                </Text>
                {sortBy === opt.id && (
                  <Ionicons
                    name="checkmark"
                    size={16}
                    color={theme.colors.primary}
                    style={{ marginLeft: 'auto' }}
                  />
                )}
              </Pressable>
            ))}
          </View>
        )}
      </View>

      <View style={styles.filterContainer}>
        <HorizontalFadeScroll contentContainerStyle={styles.filterList}>
          {visibleFilters.map((item) => {
            const isSelected =
              (selectedMuscle === null && item.id === 'all') || selectedMuscle === item.id;
            return (
              <Pressable
                key={item.id}
                style={[
                  styles.filterPill,
                  {
                    backgroundColor: isSelected ? theme.colors.surface : 'transparent',
                    borderColor: isSelected ? theme.colors.primary : theme.colors.muted,
                  },
                ]}
                onPress={() => setSelectedMuscle(item.id === 'all' ? null : item.id)}
              >
                <Text
                  style={[
                    styles.filterPillText,
                    {
                      color: isSelected ? theme.colors.primary : theme.colors.muted,
                      ...theme.typography.caption,
                    },
                  ]}
                >
                  {item.label}
                </Text>
              </Pressable>
            );
          })}
        </HorizontalFadeScroll>
      </View>

      <FlatList
        data={displayExercises}
        keyExtractor={(item) => item.id}
        contentContainerStyle={[
          styles.listContent,
          { paddingBottom: Math.max(insets.bottom + 20, 100) },
        ]}
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

      <CustomExerciseModal visible={showCustomModal} onClose={() => setShowCustomModal(false)} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 24,
    marginBottom: 16,
  },
  headerTitle: {},
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
  filterPillText: {},
  listContent: {
    paddingHorizontal: 24,
    paddingBottom: 40,
  },
  searchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    zIndex: 10,
  },
  sortBtn: {
    width: 48,
    height: 48,
    borderRadius: 8,
    borderWidth: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  sortDropdown: {
    position: 'absolute',
    top: 54,
    right: 24,
    width: 200,
    borderRadius: 12,
    borderWidth: 1,
    padding: 6,
    zIndex: 9999,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  sortOption: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 8,
    gap: 10,
  },
  sortOptionText: {
    fontSize: 14,
  },
});
