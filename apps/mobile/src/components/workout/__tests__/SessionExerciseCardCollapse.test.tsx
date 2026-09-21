import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { ThemeProvider, DialogProvider } from '@fitness-tracker/ui';
import {
  Equipment,
  Exercise,
  MovementPattern,
  MuscleGroup,
  SessionExercise,
} from '@fitness-tracker/domain';
import { SessionExerciseCard } from '../SessionExerciseCard';
import { useExerciseStore } from '../../../stores/exerciseStore';
import { useWorkoutStore } from '../../../stores/workoutStore';
import { useProfileStore } from '../../../stores/profileStore';

jest.mock('expo-router', () => ({
  useRouter: () => ({
    push: jest.fn(),
    back: jest.fn(),
  }),
}));

jest.mock('@expo/vector-icons', () => ({
  Ionicons: ({ name: _name }: { name: string }) => null,
}));

const mockExercise: Exercise = {
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

const mockSessionExercise: SessionExercise = {
  id: 'se-1',
  exerciseId: 'ex-1',
  order: 0,
  sets: [
    { id: 'set-1', setNumber: 1, type: 'working', weight: 80, reps: 10, completed: false },
    { id: 'set-2', setNumber: 2, type: 'working', weight: 80, reps: 8, completed: false },
    { id: 'set-3', setNumber: 3, type: 'working', weight: 80, reps: 6, completed: false },
  ],
};

const renderWithProviders = (ui: React.ReactElement) =>
  render(
    <ThemeProvider>
      <DialogProvider>{ui}</DialogProvider>
    </ThemeProvider>,
  );

describe('SessionExerciseCard - Collapsed State & Reorder', () => {
  beforeEach(() => {
    useExerciseStore.setState({
      exercises: [mockExercise],
      persistentNotes: {},
    });
    useWorkoutStore.setState({
      exercises: [mockSessionExercise],
      status: 'active',
    });
    useProfileStore.setState({
      profile: { displayName: 'Athlete', preferredUnits: 'metric' },
    });
  });

  it('renders uncollapsed with full set headers and options by default', () => {
    const { getByText, getByTestId } = renderWithProviders(
      <SessionExerciseCard sessionExercise={mockSessionExercise} />,
    );

    expect(getByText('Barbell Bench Press')).toBeTruthy();
    expect(getByTestId('exercise-options-btn')).toBeTruthy();
    expect(getByText(/ADD SET|SATZ HINZUFÜGEN/i)).toBeTruthy();
  });

  it('renders compact collapsed view with set summary badge and without set table', () => {
    const { getByText, queryByText, queryByTestId } = renderWithProviders(
      <SessionExerciseCard sessionExercise={mockSessionExercise} collapsed={true} />,
    );

    expect(getByText('Barbell Bench Press')).toBeTruthy();
    expect(getByText('3 Sätze')).toBeTruthy();
    expect(queryByText(/ADD SET|SATZ HINZUFÜGEN/i)).toBeNull();
    expect(queryByTestId('exercise-options-btn')).toBeNull();
  });

  it('calls onToggleCollapse when collapse button is pressed', () => {
    const onToggleCollapse = jest.fn();
    const { getByTestId } = renderWithProviders(
      <SessionExerciseCard
        sessionExercise={mockSessionExercise}
        collapsed={true}
        onToggleCollapse={onToggleCollapse}
      />,
    );

    const collapseBtn = getByTestId('exercise-collapse-btn');
    fireEvent.press(collapseBtn);
    expect(onToggleCollapse).toHaveBeenCalledTimes(1);
  });

  it('displays completed sets summary when sets are completed', () => {
    const exerciseWithCompleted: SessionExercise = {
      ...mockSessionExercise,
      sets: [
        { id: 'set-1', setNumber: 1, type: 'working', weight: 80, reps: 10, completed: true },
        { id: 'set-2', setNumber: 2, type: 'working', weight: 80, reps: 8, completed: false },
      ],
    };

    const { getByText } = renderWithProviders(
      <SessionExerciseCard sessionExercise={exerciseWithCompleted} collapsed={true} />,
    );

    expect(getByText('1/2 Sätze abgeschlossen')).toBeTruthy();
  });
});

