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

jest.mock('expo-crypto', () => { let id = 0; return { randomUUID: () => `set-${++id}` }; });

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
  secondaryMuscles: [MuscleGroup.FrontDelts],
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
    expect(getAllByText(/ADD SET|SATZ HINZUFÜGEN/i).length).toBe(2);
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
    expect(queryAllByText(/ADD SET|SATZ HINZUFÜGEN/i).length).toBe(0);

    // Clicking Fertig restores normal mode:
    const doneBtn = getByLabelText('Sortieren beenden');
    fireEvent.press(doneBtn);
    expect(getByText('Sortieren')).toBeTruthy();
    expect(queryAllByText(/ADD SET|SATZ HINZUFÜGEN/i).length).toBe(2);
  });

  it('renders drag handles accessible on the left of each exercise card in normal mode', () => {
    const { getAllByLabelText, getAllByLabelText: getAllHandles } = render(
      <ThemeProvider>
        <DialogProvider>
          <WorkoutTemplateBuilderScreen />
        </DialogProvider>
      </ThemeProvider>,
    );

    const handles = getAllHandles('Reihenfolge ändern');
    expect(handles.length).toBe(2);

    const collapseBtns = getAllByLabelText('Übung einklappen');
    expect(collapseBtns.length).toBe(2);
  });
});

it('edits independent set values, saves and reopens without completion controls', () => {
  useProgramStore.setState({ templates: [mockTemplate], programs: [] });
  useExerciseStore.setState({ exercises: [mockExercise1, mockExercise2] });
  const screen = render(<ThemeProvider><DialogProvider><WorkoutTemplateBuilderScreen /></DialogProvider></ThemeProvider>);
  expect(screen.queryAllByRole('checkbox')).toHaveLength(0);
  fireEvent.changeText(screen.getAllByLabelText('Satz 2 Gewicht')[0]!, '75');
  fireEvent.changeText(screen.getAllByLabelText('Satz 3 Wiederholungen')[0]!, '6');
  fireEvent.press(screen.getByLabelText('Speichern'));
  const saved = useProgramStore.getState().templates.find(t => t.id === 'tmpl-1')!;
  expect(saved.exercises[0]!.sets!.map(s => s.weight)).toEqual([80,75,80]);
  expect(saved.exercises[0]!.sets!.map(s => s.reps)).toEqual([10,10,6]);
  screen.unmount();
  const reopened = render(<ThemeProvider><DialogProvider><WorkoutTemplateBuilderScreen /></DialogProvider></ThemeProvider>);
  expect(reopened.getAllByLabelText('Satz 2 Gewicht')[0]!.props.value).toBe('75');
});

it('asks before leaving the editor and keeps the draft when cancelled', () => {
  useProgramStore.setState({ templates: [mockTemplate], programs: [] });
  const screen = render(<ThemeProvider><DialogProvider><WorkoutTemplateBuilderScreen /></DialogProvider></ThemeProvider>);
  fireEvent.press(screen.getByLabelText('Zurück'));
  expect(screen.getByText('Bearbeitung verwerfen?')).toBeTruthy();
  fireEvent.press(screen.getByText('Weiter bearbeiten'));
  expect(screen.getByLabelText('Speichern')).toBeTruthy();
});

it('propagates 200 kg after completing the first input, preserving an individually edited set', () => {
  const exercise = { ...mockTemplate.exercises[0]! };
  delete exercise.targetWeight;
  useProgramStore.setState({ templates: [{ ...mockTemplate, exercises: [exercise] }], programs: [] });
  const screen = render(<ThemeProvider><DialogProvider><WorkoutTemplateBuilderScreen /></DialogProvider></ThemeProvider>);
  const first = screen.getByLabelText('Satz 1 Gewicht');
  fireEvent.changeText(screen.getByLabelText('Satz 2 Gewicht'), '75');
  fireEvent(screen.getByLabelText('Satz 2 Gewicht'), 'blur');
  fireEvent(first, 'focus');
  for (const value of ['2', '20', '200']) fireEvent.changeText(first, value);
  fireEvent(first, 'blur');
  expect(screen.getByLabelText('Satz 3 Gewicht').props.value).toBe('200');
  expect(screen.getByLabelText('Satz 2 Gewicht').props.value).toBe('75');
  fireEvent.press(screen.getByLabelText('Speichern'));
  expect(useProgramStore.getState().templates[0]!.exercises[0]!.sets!.map(set => set.weight)).toEqual([200, 75, 200]);
});
