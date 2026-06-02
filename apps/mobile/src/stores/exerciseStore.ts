import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { MMKV } from 'react-native-mmkv';
import { Exercise, MuscleGroup, Equipment, EXERCISES } from '@fitness-tracker/domain';
import * as Crypto from 'expo-crypto';

const storage = new MMKV();
const zustandStorage = {
  setItem: (name: string, value: string) => storage.set(name, value),
  getItem: (name: string) => {
    const value = storage.getString(name);
    return value ?? null;
  },
  removeItem: (name: string) => storage.delete(name),
};

function filterExercises(
  exercises: Exercise[], 
  query: string, 
  muscleGroup: MuscleGroup | null, 
  equipment: Equipment | null
): Exercise[] {
  return exercises.filter(ex => {
    const matchesQuery = ex.name.toLowerCase().includes(query.toLowerCase());
    const matchesMuscle = muscleGroup 
      ? ex.primaryMuscles.includes(muscleGroup) || ex.secondaryMuscles.includes(muscleGroup)
      : true;
    const matchesEq = equipment ? ex.equipment === equipment : true;
    return matchesQuery && matchesMuscle && matchesEq;
  });
}

export interface ExerciseState {
  exercises: Exercise[];
  filteredExercises: Exercise[];
  selectedMuscleGroup: MuscleGroup | null;
  selectedEquipment: Equipment | null;
  searchQuery: string;
  favoriteIds: string[];
  customExercises: Exercise[];
  
  setFilter: (muscleGroup: MuscleGroup | null, equipment: Equipment | null) => void;
  setSearchQuery: (query: string) => void;
  resetFilters: () => void;
  toggleFavorite: (id: string) => void;
  addCustomExercise: (data: Omit<Exercise, 'id' | 'createdAt' | 'updatedAt' | 'isCustom' | 'ownerId'>) => void;
}

export const useExerciseStore = create<ExerciseState>()(
  persist(
    (set) => ({
      exercises: EXERCISES,
      filteredExercises: EXERCISES,
      selectedMuscleGroup: null,
      selectedEquipment: null,
      searchQuery: '',
      favoriteIds: [],
      customExercises: [],

      setFilter: (muscleGroup, equipment) => 
        set((state) => {
          const filtered = filterExercises(state.exercises, state.searchQuery, muscleGroup, equipment);
          return { 
            selectedMuscleGroup: muscleGroup, 
            selectedEquipment: equipment, 
            filteredExercises: filtered 
          };
        }),

      setSearchQuery: (query) =>
        set((state) => {
          const filtered = filterExercises(state.exercises, query, state.selectedMuscleGroup, state.selectedEquipment);
          return {
            searchQuery: query,
            filteredExercises: filtered
          };
        }),

      resetFilters: () =>
        set((state) => ({
          selectedMuscleGroup: null,
          selectedEquipment: null,
          searchQuery: '',
          filteredExercises: state.exercises,
        })),

      toggleFavorite: (id) =>
        set((state) => {
          const isFav = state.favoriteIds.includes(id);
          return {
            favoriteIds: isFav ? state.favoriteIds.filter(f => f !== id) : [...state.favoriteIds, id]
          };
        }),

      addCustomExercise: (data) =>
        set((state) => {
          const newEx: Exercise = {
            ...data,
            id: Crypto.randomUUID(),
            isCustom: true,
            ownerId: 'local-user',
            createdAt: new Date(),
            updatedAt: new Date(),
          };
          const newCustom = [...state.customExercises, newEx];
          const allExercises = [...EXERCISES, ...newCustom];
          const filtered = filterExercises(allExercises, state.searchQuery, state.selectedMuscleGroup, state.selectedEquipment);
          return {
            customExercises: newCustom,
            exercises: allExercises,
            filteredExercises: filtered,
          };
        })
    }),
    {
      name: 'exercise-storage',
      storage: createJSONStorage(() => zustandStorage),
      partialize: (state) => ({ favoriteIds: state.favoriteIds, customExercises: state.customExercises }),
      onRehydrateStorage: () => (state) => {
        if (state) {
          state.exercises = [...EXERCISES, ...(state.customExercises || [])];
          state.filteredExercises = filterExercises(state.exercises, state.searchQuery, state.selectedMuscleGroup, state.selectedEquipment);
        }
      }
    }
  )
);
