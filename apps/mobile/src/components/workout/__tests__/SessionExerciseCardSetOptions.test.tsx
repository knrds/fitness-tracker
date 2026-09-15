import React from 'react';
import { render } from '@testing-library/react-native';
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

const mockCardioExercise: Exercise = {
  id: 'ex-cardio',
  name: 'Treadmill Running',
  primaryMuscles: [MuscleGroup.Quads],
  secondaryMuscles: [MuscleGroup.Calves],
  equipment: Equipment.Cardio,
  movementPattern: MovementPattern.Cardio,
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
  ],
};

const mockCardioSessionExercise: SessionExercise = {
  id: 'se-cardio',
  exerciseId: 'ex-cardio',
  order: 0,
  sets: [
    { id: 'set-c1', setNumber: 1, type: 'working', weight: 5, reps: 1, durationSeconds: 300, completed: false },
  ],
};

const renderWithProviders = (ui: React.ReactElement) =>
  render(
    <ThemeProvider>
      <DialogProvider>{ui}</DialogProvider>
    </ThemeProvider>,
  );

describe('SessionExerciseCard - Set Options Three-Dot Menu Visibility', () => {
  beforeEach(() => {
    useExerciseStore.setState({
      exercises: [mockExercise, mockCardioExercise],
      persistentNotes: {},
    });
    useWorkoutStore.setState({
      exercises: [mockSessionExercise],
      status: 'active',
    });
  });

  // Test A: RPE ON / RIR OFF -> Set options button visible
  it('renders three-dot menu when RPE is ON and RIR is OFF (Test A)', () => {
    useProfileStore.setState({
      profile: {
        displayName: 'Athlete',
        preferredUnits: 'metric',
        rpeMode: 'always_on',
        rirMode: 'always_off',
        rpeDisabledExerciseIds: [],
        rirDisabledExerciseIds: [],
      },
    });

    const { getByTestId, getByLabelText } = renderWithProviders(
      <SessionExerciseCard sessionExercise={mockSessionExercise} />,
    );

    expect(getByTestId('set-options-btn-set-1')).toBeTruthy();
    expect(getByLabelText('Satz 1 Details')).toBeTruthy();
  });

  // Test B: RPE OFF / RIR ON -> Set options button visible
  it('renders three-dot menu when RPE is OFF and RIR is ON (Test B)', () => {
    useProfileStore.setState({
      profile: {
        displayName: 'Athlete',
        preferredUnits: 'metric',
        rpeMode: 'always_off',
        rirMode: 'always_on',
        rpeDisabledExerciseIds: [],
        rirDisabledExerciseIds: [],
      },
    });

    const { getByTestId, getByLabelText } = renderWithProviders(
      <SessionExerciseCard sessionExercise={mockSessionExercise} />,
    );

    expect(getByTestId('set-options-btn-set-1')).toBeTruthy();
    expect(getByLabelText('Satz 1 Details')).toBeTruthy();
  });

  // Test C: RPE ON / RIR ON -> Set options button visible
  it('renders three-dot menu when RPE is ON and RIR is ON (Test C)', () => {
    useProfileStore.setState({
      profile: {
        displayName: 'Athlete',
        preferredUnits: 'metric',
        rpeMode: 'always_on',
        rirMode: 'always_on',
        rpeDisabledExerciseIds: [],
        rirDisabledExerciseIds: [],
      },
    });

    const { getByTestId, getByLabelText } = renderWithProviders(
      <SessionExerciseCard sessionExercise={mockSessionExercise} />,
    );

    expect(getByTestId('set-options-btn-set-1')).toBeTruthy();
    expect(getByLabelText('Satz 1 Details')).toBeTruthy();
  });

  // Test D: RPE OFF / RIR OFF -> Set options button NOT visible, Reps/Weight/Done visible
  it('hides three-dot menu when both RPE and RIR are OFF while keeping core set controls (Test D)', () => {
    useProfileStore.setState({
      profile: {
        displayName: 'Athlete',
        preferredUnits: 'metric',
        rpeMode: 'always_off',
        rirMode: 'always_off',
        rpeDisabledExerciseIds: [],
        rirDisabledExerciseIds: [],
      },
    });

    const { queryByTestId, queryByLabelText, getByLabelText } = renderWithProviders(
      <SessionExerciseCard sessionExercise={mockSessionExercise} />,
    );

    // Three-dot button and its a11y label must NOT be present
    expect(queryByTestId('set-options-btn-set-1')).toBeNull();
    expect(queryByTestId('set-options-btn-set-2')).toBeNull();
    expect(queryByLabelText('Satz 1 Details')).toBeNull();
    expect(queryByLabelText('Satz 2 Details')).toBeNull();

    // Core controls must remain present and accessible
    expect(getByLabelText('Satz 1 Gewicht')).toBeTruthy();
    expect(getByLabelText('Satz 1 Wiederholungen')).toBeTruthy();
    expect(getByLabelText('Satz 1 abschließen')).toBeTruthy();
  });

  // Test E: RPE OFF / RIR OFF -> Swipe-to-delete remains functional
  it('allows swipe-to-delete when set options menu is hidden (Test E)', () => {
    useProfileStore.setState({
      profile: {
        displayName: 'Athlete',
        preferredUnits: 'metric',
        rpeMode: 'always_off',
        rirMode: 'always_off',
      },
    });

    const { getByLabelText } = renderWithProviders(
      <SessionExerciseCard sessionExercise={mockSessionExercise} />,
    );

    const deleteBtn = getByLabelText('Satz 1 löschen', { includeHiddenElements: true });
    expect(deleteBtn).toBeTruthy();
    expect(deleteBtn.props.accessibilityRole).toBe('button');
  });

  // Test F: Exercise-specific overrides determine visibility
  it('respects exercise-specific disable override when global RPE is on (Test F1)', () => {
    useProfileStore.setState({
      profile: {
        displayName: 'Athlete',
        preferredUnits: 'metric',
        rpeMode: 'always_on',
        rirMode: 'always_off',
        rpeDisabledExerciseIds: ['ex-1'], // disabled for this exercise
        rirDisabledExerciseIds: [],
      },
    });

    const { queryByTestId, queryByLabelText } = renderWithProviders(
      <SessionExerciseCard sessionExercise={mockSessionExercise} />,
    );

    expect(queryByTestId('set-options-btn-set-1')).toBeNull();
    expect(queryByLabelText('Satz 1 Details')).toBeNull();
  });

  it('respects exercise-specific enable override when global RIR is selected_exercises (Test F2)', () => {
    useProfileStore.setState({
      profile: {
        displayName: 'Athlete',
        preferredUnits: 'metric',
        rpeMode: 'always_off',
        rirMode: 'selected_exercises',
        rpeEnabledExerciseIds: [],
        rirEnabledExerciseIds: ['ex-1'], // enabled for this exercise
        rpeDisabledExerciseIds: [],
        rirDisabledExerciseIds: [],
      },
    });

    const { getByTestId, getByLabelText } = renderWithProviders(
      <SessionExerciseCard sessionExercise={mockSessionExercise} />,
    );

    expect(getByTestId('set-options-btn-set-1')).toBeTruthy();
    expect(getByLabelText('Satz 1 Details')).toBeTruthy();
  });

  // Test G: Cardio exercises have RPE/RIR disabled by definition
  it('hides three-dot menu on cardio exercises even if global RPE/RIR are always_on (Test G)', () => {
    useWorkoutStore.setState({
      exercises: [mockCardioSessionExercise],
      status: 'active',
    });
    useProfileStore.setState({
      profile: {
        displayName: 'Athlete',
        preferredUnits: 'metric',
        rpeMode: 'always_on',
        rirMode: 'always_on',
      },
    });

    const { queryByTestId, queryByLabelText } = renderWithProviders(
      <SessionExerciseCard sessionExercise={mockCardioSessionExercise} />,
    );

    expect(queryByTestId('set-options-btn-set-c1')).toBeNull();
    expect(queryByLabelText('Satz 1 Details')).toBeNull();
  });
});
