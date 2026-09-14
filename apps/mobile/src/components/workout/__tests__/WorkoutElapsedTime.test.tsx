import React from 'react';
import { render, act } from '@testing-library/react-native';
import { WorkoutElapsedTime } from '../WorkoutElapsedTime';
import { useWorkoutStore } from '../../../stores/workoutStore';

it('ticks locally without rerendering its parent and freezes while paused', () => {
  jest.useFakeTimers();
  useWorkoutStore.setState({
    status: 'active',
    startedAt: new Date(),
    pausedAt: undefined,
    accumulatedPauseMs: 0,
  });
  let parentRenders = 0;
  function Parent() {
    parentRenders++;
    return <WorkoutElapsedTime style={{}} />;
  }
  const screen = render(<Parent />);
  act(() => {
    jest.advanceTimersByTime(3000);
  });
  expect(screen.getByText('0:03')).toBeTruthy();
  expect(parentRenders).toBe(1);
  act(() => {
    useWorkoutStore.setState({ status: 'paused', pausedAt: new Date() });
  });
  act(() => {
    jest.advanceTimersByTime(5000);
  });
  expect(screen.getByText('0:03')).toBeTruthy();
  screen.unmount();
  useWorkoutStore.getState().resetWorkout();
  jest.useRealTimers();
});
