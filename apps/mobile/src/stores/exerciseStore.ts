import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import {
  Exercise,
  MuscleGroup,
  Equipment,
  EXERCISES,
  ExerciseSchema,
} from '@fitness-tracker/domain';
import * as Crypto from 'expo-crypto';
import { z } from 'zod';

import { LOCAL_USER_ID } from './local-user';
import { createHydratedStorage } from './storage';

function filterExercises(
  exercises: Exercise[],
  query: string,
  muscleGroup: MuscleGroup | null,
  equipment: Equipment | null,
): Exercise[] {
  return exercises.filter((ex) => {
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
  addCustomExercise: (
    data: Omit<Exercise, 'id' | 'createdAt' | 'updatedAt' | 'isCustom' | 'ownerId'>,
  ) => void;
  exerciseRestDurations: Record<string, number>;
  setExerciseRestDuration: (exerciseId: string, durationSeconds: number) => void;
  persistentNotes: Record<string, string>;
  setPersistentNote: (exerciseId: string, note: string) => void;
}

const exercisePersistedSchema = z.object({
  favoriteIds: z.array(z.string()),
  customExercises: z.array(ExerciseSchema),
  exerciseRestDurations: z.record(z.number().int().nonnegative()),
  persistentNotes: z.record(z.string()).optional(),
});

type ExercisePersistedState = z.infer<typeof exercisePersistedSchema>;

const defaultPersistedState: ExercisePersistedState = {
  favoriteIds: [],
  customExercises: [],
  exerciseRestDurations: {},
  persistentNotes: {},
};

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
      exerciseRestDurations: {},
      persistentNotes: {},

      setFilter: (muscleGroup, equipment) =>
        set((state) => {
          const filtered = filterExercises(
            state.exercises,
            state.searchQuery,
            muscleGroup,
            equipment,
          );
          return {
            selectedMuscleGroup: muscleGroup,
            selectedEquipment: equipment,
            filteredExercises: filtered,
          };
        }),

      setSearchQuery: (query) =>
        set((state) => {
          const filtered = filterExercises(
            state.exercises,
            query,
            state.selectedMuscleGroup,
            state.selectedEquipment,
          );
          return {
            searchQuery: query,
            filteredExercises: filtered,
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
            favoriteIds: isFav
              ? state.favoriteIds.filter((f) => f !== id)
              : [...state.favoriteIds, id],
          };
        }),

      addCustomExercise: (data) =>
        set((state) => {
          const newEx: Exercise = {
            ...data,
            id: Crypto.randomUUID(),
            isCustom: true,
            ownerId: LOCAL_USER_ID,
            createdAt: new Date(),
            updatedAt: new Date(),
          };
          const newCustom = [...state.customExercises, newEx];
          const allExercises = [...EXERCISES, ...newCustom];
          const filtered = filterExercises(
            allExercises,
            state.searchQuery,
            state.selectedMuscleGroup,
            state.selectedEquipment,
          );
          return {
            customExercises: newCustom,
            exercises: allExercises,
            filteredExercises: filtered,
          };
        }),

      setExerciseRestDuration: (exerciseId, durationSeconds) =>
        set((state) => ({
          exerciseRestDurations: {
            ...state.exerciseRestDurations,
            [exerciseId]: durationSeconds,
          },
        })),

      setPersistentNote: (exerciseId, note) =>
        set((state) => ({
          persistentNotes: {
            ...state.persistentNotes,
            [exerciseId]: note,
          },
        })),
    }),
    {
      name: 'exercise-storage',
      storage: createHydratedStorage(
        'exercise-storage',
        exercisePersistedSchema,
        defaultPersistedState,
      ),
      partialize: (state) => ({
        favoriteIds: state.favoriteIds,
        customExercises: state.customExercises,
        exerciseRestDurations: state.exerciseRestDurations,
        persistentNotes: state.persistentNotes,
      }),
      version: 1,
      migrate: (persistedState) => {
        const parsed = exercisePersistedSchema.safeParse(persistedState);
        return parsed.success ? parsed.data : defaultPersistedState;
      },
      onRehydrateStorage: () => (state) => {
        if (state) {
          state.exercises = [...EXERCISES, ...(state.customExercises || [])];
          state.persistentNotes = state.persistentNotes || {};
          state.filteredExercises = filterExercises(
            state.exercises,
            state.searchQuery,
            state.selectedMuscleGroup,
            state.selectedEquipment,
          );
        }
      },
    },
  ),
);
