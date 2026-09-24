import React from 'react';
import { fireEvent, render } from '@testing-library/react-native';

import { EXERCISES, MovementPattern, MuscleGroup, Equipment } from '@fitness-tracker/domain';
import { DialogProvider, ThemeProvider } from '@fitness-tracker/ui';

import { useExerciseStore } from '../../../stores/exerciseStore';
import { CustomExerciseModal } from '../CustomExerciseModal';

jest.mock('react-native-mmkv', () => ({
  MMKV: jest.fn().mockImplementation(() => ({
    set: jest.fn(),
    getString: jest.fn(),
    delete: jest.fn(),
  })),
}));

jest.mock('expo-crypto', () => ({
  randomUUID: () => '11111111-1111-4111-8111-111111111111',
}));

describe('CustomExerciseModal', () => {
  beforeEach(() => {
    useExerciseStore.setState({
      exercises: EXERCISES,
      filteredExercises: EXERCISES,
      selectedMuscleGroup: null,
      selectedEquipment: null,
      searchQuery: '',
      favoriteIds: [],
      customExercises: [],
      exerciseRestDurations: {},
      persistentNotes: {},
    });
  });

  it('creates a custom cardio exercise when duration tracking is selected', () => {
    const onClose = jest.fn();
    const { getByPlaceholderText, getByText } = render(
      <ThemeProvider>
        <DialogProvider>
          <CustomExerciseModal visible onClose={onClose} />
        </DialogProvider>
      </ThemeProvider>,
    );

    fireEvent.changeText(
      getByPlaceholderText(/e\.g\. My Custom Lift|z\. B\. Meine eigene Übung/i),
      'Sled Push',
    );
    fireEvent.press(getByText(/DURATION & LEVEL|DAUER & STUFE/i));
    fireEvent.press(getByText(/Full Body|Ganzkörper/i));
    fireEvent.press(getByText(/Cardio|Cardio-Gerät/i));
    fireEvent.press(getByText(/Create Exercise|Übung erstellen/i));

    const customExercise = useExerciseStore.getState().customExercises[0];
    expect(customExercise?.name).toBe('Sled Push');
    expect(customExercise?.movementPattern).toBe(MovementPattern.Cardio);
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('persists multiple muscle groups and equipment and filters by either equipment', () => {
    const screen = render(<ThemeProvider><DialogProvider>
      <CustomExerciseModal visible onClose={jest.fn()} />
    </DialogProvider></ThemeProvider>);
    fireEvent.changeText(screen.getByPlaceholderText(/e\.g\. My Custom Lift|z\. B\. Meine eigene Übung/i), 'Multi press');
    fireEvent.press(screen.getByText(/^(Chest|Brust)$/i));
    fireEvent.press(screen.getByText(/^(Triceps|Trizeps)$/i));
    fireEvent.press(screen.getByText(/^(Barbell|Langhantel)$/i));
    fireEvent.press(screen.getByText(/^(Dumbbell|Kurzhantel)$/i));
    fireEvent.press(screen.getByText(/Create Exercise|Übung erstellen/i));
    const exercise = useExerciseStore.getState().customExercises[0]!;
    expect(exercise.primaryMuscles).toEqual([MuscleGroup.Chest, MuscleGroup.Triceps]);
    expect(exercise.equipmentOptions).toEqual([Equipment.Barbell, Equipment.Dumbbell]);
    useExerciseStore.getState().setFilter(null, Equipment.Dumbbell);
    expect(useExerciseStore.getState().filteredExercises.some(item => item.id === exercise.id)).toBe(true);
  });
});
