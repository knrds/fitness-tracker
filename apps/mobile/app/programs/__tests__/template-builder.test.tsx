import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { ThemeProvider, DialogProvider } from '@fitness-tracker/ui';
import {
  Equipment,
  Exercise,
  MovementPattern,
  MuscleGroup,
  WorkoutTemplate,
} from '@fitness-tracker/domain';
import WorkoutTemplateBuilderScreen from '../template-builder';
import { useProgramStore } from '../../../src/stores/programStore';
import { useExerciseStore } from '../../../src/stores/exerciseStore';

jest.mock('expo-router', () => ({
  useRouter: () => ({
    push: jest.fn(),
    back: jest.fn(),
  }),
  useLocalSearchParams: () => ({
    templateId: 'tmpl-1',
  }),
}));

jest.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }),
}));

jest.mock('@expo/vector-icons', () => ({
  Ionicons: () => null,
}));

const mockExercise1: Exercise = {
  id: 'ex-1',
  name: 'Barbell Bench Press',
  primaryMuscles: [MuscleGroup.Chest],
  secondaryMuscles: [MuscleGroup.Triceps],
  equipment: Equipment.Barbell,
  movementPattern: MovementPattern.HorizontalPush,
  isCustom: false,
  createdAt: new Date(),
  updatedAt: new Date(),
};

const mockExercise2: Exercise = {
  id: 'ex-2',
  name: 'Incline Dumbbell Press',
  primaryMuscles: [MuscleGroup.Chest],
  secondaryMuscles: [MuscleGroup.Shoulders],
  equipment: Equipment.Dumbbell,
  movementPattern: MovementPattern.HorizontalPush,
  isCustom: false,
  createdAt: new Date(),
  updatedAt: new Date(),
};

const mockTemplate: WorkoutTemplate = {
  id: 'tmpl-1',
  userId: 'user-1',
  name: 'Chest Day',
  description: 'Chest workout',
  isArchived: false,
  exercises: [
    { id: 'te-1', exerciseId: 'ex-1', order: 0, targetSets: 3, targetReps: 10, targetWeight: 80 },
    { id: 'te-2', exerciseId: 'ex-2', order: 1, targetSets: 4, targetReps: 12, targetWeight: 30 },
  ],
  createdAt: new Date(),
  updatedAt: new Date(),
};

describe('WorkoutTemplateBuilderScreen - Reorder Mode & Collapsible Cards', () => {
  beforeEach(() => {
    useExerciseStore.setState({
      exercises: [mockExercise1, mockExercise2],
      persistentNotes: {},
    });
    useProgramStore.setState({
      templates: [mockTemplate],
      programs: [],
    });
  });

  it('renders template exercises with set tables in normal mode', () => {
    const { getByText, getAllByText } = render(
      <ThemeProvider>
        <DialogProvider>
          <WorkoutTemplateBuilderScreen />
        </DialogProvider>
      </ThemeProvider>,
    );

    expect(getByText('1. Barbell Bench Press')).toBeTruthy();
    expect(getByText('2. Incline Dumbbell Press')).toBeTruthy();
    expect(getByText('Sortieren')).toBeTruthy();
    expect(getAllByText('ADD SET').length).toBe(2);
  });

  it('collapses all exercise cards and hides set rows when entering Reorder Mode', () => {
    const { getByText, queryAllByText, getByLabelText } = render(
      <ThemeProvider>
        <DialogProvider>
          <WorkoutTemplateBuilderScreen />
        </DialogProvider>
      </ThemeProvider>,
    );

    const reorderBtn = getByLabelText('Übungen sortieren');
    fireEvent.press(reorderBtn);

    // Now in reorder mode:
    expect(getByLabelText('Sortieren beenden')).toBeTruthy();
    expect(
      getByText('Sortiermodus aktiv: Ziehe die Übungen an den Griffen in die gewünschte Reihenfolge.'),
    ).toBeTruthy();

    // Sets are collapsed:
    expect(getByText('3 Sätze • 80 kg • 10 Reps')).toBeTruthy();
    expect(getByText('4 Sätze • 30 kg • 12 Reps')).toBeTruthy();
    expect(queryAllByText('ADD SET').length).toBe(0);

    // Clicking Fertig restores normal mode:
    const doneBtn = getByLabelText('Sortieren beenden');
    fireEvent.press(doneBtn);
    expect(getByText('Sortieren')).toBeTruthy();
    expect(queryAllByText('ADD SET').length).toBe(2);
  });
});
