import React from 'react';
import { fireEvent, render } from '@testing-library/react-native';

import { Equipment, EXERCISES, MovementPattern, MuscleGroup } from '@fitness-tracker/domain';
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

    fireEvent.changeText(getByPlaceholderText('e.g. My Custom Lift'), 'Sled Push');
    fireEvent.press(getByText('DURATION & LEVEL'));
    fireEvent.press(getByText(MuscleGroup.FullBody.replace(/_/g, ' ').toUpperCase()));
    fireEvent.press(getByText(Equipment.Cardio.replace(/_/g, ' ').toUpperCase()));
    fireEvent.press(getByText('Create Exercise'));

    const customExercise = useExerciseStore.getState().customExercises[0];
    expect(customExercise?.name).toBe('Sled Push');
    expect(customExercise?.movementPattern).toBe(MovementPattern.Cardio);
    expect(onClose).toHaveBeenCalledTimes(1);
  });
});
