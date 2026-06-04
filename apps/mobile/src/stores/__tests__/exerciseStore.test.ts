import { useExerciseStore } from '../exerciseStore';
import { MuscleGroup } from '@fitness-tracker/domain';

jest.mock('react-native-mmkv', () => ({
  MMKV: jest.fn().mockImplementation(() => ({
    set: jest.fn(),
    getString: jest.fn(),
    delete: jest.fn(),
  })),
}));

describe('exerciseStore', () => {
  beforeEach(() => {
    useExerciseStore.setState({
      selectedMuscleGroup: null,
      selectedEquipment: null,
      searchQuery: '',
      favoriteIds: [],
    });
  });

  it('should initially have no filters', () => {
    const state = useExerciseStore.getState();
    expect(state.selectedMuscleGroup).toBeNull();
    expect(state.selectedEquipment).toBeNull();
    expect(state.searchQuery).toBe('');
  });

  it('should set search query and filter exercises', () => {
    useExerciseStore.getState().setSearchQuery('Bench Press');
    const state = useExerciseStore.getState();
    expect(state.searchQuery).toBe('Bench Press');
    expect(state.filteredExercises.length).toBeGreaterThan(0);
    expect(
      state.filteredExercises.every((ex) => ex.name.toLowerCase().includes('bench press')),
    ).toBe(true);
  });

  it('should set muscle group filter', () => {
    useExerciseStore.getState().setFilter(MuscleGroup.Chest, null);
    const state = useExerciseStore.getState();
    expect(state.selectedMuscleGroup).toBe(MuscleGroup.Chest);
    expect(
      state.filteredExercises.every(
        (ex) =>
          ex.primaryMuscles.includes(MuscleGroup.Chest) ||
          ex.secondaryMuscles.includes(MuscleGroup.Chest),
      ),
    ).toBe(true);
  });

  it('should toggle favorites', () => {
    const id = '123-abc';
    useExerciseStore.getState().toggleFavorite(id);
    expect(useExerciseStore.getState().favoriteIds).toContain(id);
    useExerciseStore.getState().toggleFavorite(id);
    expect(useExerciseStore.getState().favoriteIds).not.toContain(id);
  });

  it('should set exercise rest duration', () => {
    const exerciseId = 'ex-123';
    useExerciseStore.getState().setExerciseRestDuration(exerciseId, 120);
    expect(useExerciseStore.getState().exerciseRestDurations[exerciseId]).toBe(120);
  });
});
