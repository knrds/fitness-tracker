import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { RestTimer } from '../RestTimer';
import { useWorkoutStore } from '../../../stores/workoutStore';

jest.mock('expo-av', () => ({
  Audio: {
    Sound: {
      createAsync: jest.fn().mockResolvedValue({
        sound: { playAsync: jest.fn(), unloadAsync: jest.fn() },
      }),
    },
  },
}));

jest.mock('@expo/vector-icons', () => ({
  Ionicons: () => null,
}));

describe('RestTimer', () => {
  beforeEach(() => {
    useWorkoutStore.getState().resetWorkout();
    useWorkoutStore.getState().resetRestTimer();
  });

  it('renders correctly when not running but time left > 0', () => {
    const { getByTestId, getByText } = render(<RestTimer />);
    expect(getByText('1:30')).toBeTruthy(); // default 90s
    expect(getByTestId('start-timer-btn')).toBeTruthy();
  });

  it('starts the timer when start is pressed', () => {
    const { getByTestId } = render(<RestTimer />);
    fireEvent.press(getByTestId('start-timer-btn'));
    expect(useWorkoutStore.getState().restTimer.isRunning).toBe(true);
  });

  it('allows custom time entry via TextInput when clicked', () => {
    const { getByText, getByDisplayValue } = render(<RestTimer />);

    // First tap expands the collapsed timer, second tap enters edit mode.
    fireEvent.press(getByText('1:30'));
    fireEvent.press(getByText('1:30'));

    // The input should be visible with current value
    const input = getByDisplayValue('1:30');
    expect(input).toBeTruthy();

    // Change value and submit
    fireEvent.changeText(input, '2:15');
    fireEvent(input, 'submitEditing');

    // Check if the timer started with 135 seconds (2 mins 15 secs)
    expect(useWorkoutStore.getState().restTimer.durationSeconds).toBe(135);
    expect(useWorkoutStore.getState().restTimer.isRunning).toBe(true);
  });

  it('handles raw number input for custom time', () => {
    const { getByText, getByDisplayValue } = render(<RestTimer />);

    fireEvent.press(getByText('1:30'));
    fireEvent.press(getByText('1:30'));
    const input = getByDisplayValue('1:30');

    fireEvent.changeText(input, '45');
    fireEvent(input, 'submitEditing');

    expect(useWorkoutStore.getState().restTimer.durationSeconds).toBe(45);
    expect(useWorkoutStore.getState().restTimer.isRunning).toBe(true);
  });

  it('guards against invalid time input', () => {
    const { getByText, getByDisplayValue } = render(<RestTimer />);

    fireEvent.press(getByText('1:30'));
    fireEvent.press(getByText('1:30'));
    const input = getByDisplayValue('1:30');

    fireEvent.changeText(input, 'abc');
    fireEvent(input, 'submitEditing');

    // Should fallback to 0 or not start/change duration since input is invalid
    expect(useWorkoutStore.getState().restTimer.isRunning).toBe(false);
  });
});
