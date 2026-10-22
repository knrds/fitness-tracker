import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { ThemeProvider, DialogProvider } from '@fitness-tracker/ui';
import { EXERCISES } from '@fitness-tracker/domain';
import { ExercisePickerModal } from '../ExercisePickerModal';
import { useExerciseStore } from '../../../stores/exerciseStore';

jest.mock('expo-router', () => ({
  useLocalSearchParams: () => ({}),
  useRouter: () => ({ push: jest.fn() }),
  router: { back: jest.fn(), canGoBack: () => false, replace: jest.fn() },
  Stack: { Screen: () => null },
}));
jest.mock('expo-crypto', () => ({ randomUUID: () => '22222222-2222-4222-8222-222222222222' }));

it('creates an unknown exercise from the search, prefilled and already selected', () => {
  useExerciseStore.setState({ exercises: EXERCISES.slice(0, 5), customExercises: [], favoriteIds: [] });
  const onSelect = jest.fn();
  const screen = render(<ThemeProvider><DialogProvider>
    <ExercisePickerModal visible onSelect={onSelect} onClose={jest.fn()} />
  </DialogProvider></ThemeProvider>);

  fireEvent.changeText(screen.getByPlaceholderText(/Übungen suchen|Search exercises/), 'Front Lever Raise');
  expect(screen.getByTestId('exercise-picker-empty')).toBeTruthy();
  fireEvent.press(screen.getByTestId('exercise-picker-create-from-search'));

  // The custom exercise form opens with the search text as its name.
  expect(screen.getAllByDisplayValue('Front Lever Raise')).toHaveLength(2);
  fireEvent.press(screen.getByText(/^(Latissimus|Lats)$/i));
  fireEvent.press(screen.getByText(/^(Eigengewicht|Bodyweight)$/i));
  fireEvent.press(screen.getByText(/^(Create Exercise|Übung erstellen)$/i));

  const created = useExerciseStore.getState().customExercises[0]!;
  expect(created.name).toBe('Front Lever Raise');
  // An exact match no longer offers to create a duplicate.
  expect(screen.queryByTestId('exercise-picker-create-from-search')).toBeNull();
  fireEvent.press(screen.getByText(/1 Übung hinzufügen|Add 1 Exercise/));
  expect(onSelect).toHaveBeenCalledWith([created.id]);
});
