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

it('returns from exercise details to the existing selection without navigating away', () => {
  const exercise = EXERCISES[0]!;
  useExerciseStore.setState({ exercises: [exercise], favoriteIds: [] });
  const onSelect = jest.fn();
  const onClose = jest.fn();
  const screen = render(<ThemeProvider><DialogProvider>
    <ExercisePickerModal visible onSelect={onSelect} onClose={onClose} />
  </DialogProvider></ThemeProvider>);
  fireEvent.press(screen.getByText(exercise.name));
  fireEvent.press(screen.getByLabelText(`${exercise.name}: Details`));
  fireEvent.press(screen.getByLabelText(/Zurück zur Übungsauswahl|Back to exercise selection/));
  fireEvent.press(screen.getByText(/1 Übung hinzufügen|Add 1 Exercise/));
  expect(onSelect).toHaveBeenCalledWith([exercise.id]);
  expect(onClose).toHaveBeenCalledTimes(1);
});
