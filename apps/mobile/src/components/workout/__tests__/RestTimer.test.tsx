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

describe('RestTimer', () => {
  beforeEach(() => {
    useWorkoutStore.getState().resetWorkout();
  });

  it('renders correctly when not running but time left > 0', () => {
    useWorkoutStore.getState().resetRestTimer();
    const { getByTestId, getByText } = render(<RestTimer />);
    expect(getByText('1:30')).toBeTruthy(); // default 90s
    expect(getByTestId('start-timer-btn')).toBeTruthy();
  });

  it('starts the timer when start is pressed', () => {
    const { getByTestId } = render(<RestTimer />);
    fireEvent.press(getByTestId('start-timer-btn'));
    expect(useWorkoutStore.getState().restTimer.isRunning).toBe(true);
  });
});
