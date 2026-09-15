import React from 'react';
import { render, fireEvent, act } from '@testing-library/react-native';
import { ThemeProvider } from '@fitness-tracker/ui';
import { MinimizedWorkoutBar } from '../MinimizedWorkoutBar';
import { useWorkoutStore } from '../../../stores/workoutStore';

const mockPush = jest.fn();
const mockNavigate = jest.fn();
const mockBack = jest.fn();

jest.mock('expo-router', () => ({
  useRouter: () => ({
    push: mockPush,
    navigate: mockNavigate,
    back: mockBack,
  }),
}));

describe('MinimizedWorkoutBar', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    useWorkoutStore.getState().resetWorkout();
  });

  it('renders nothing when status is idle', () => {
    useWorkoutStore.setState({
      status: 'idle',
      isMinimized: false,
    });

    const screen = render(
      <ThemeProvider>
        <MinimizedWorkoutBar />
      </ThemeProvider>,
    );

    expect(screen.toJSON()).toBeNull();
  });

  it('renders nothing when status is active but workout is not minimized', () => {
    useWorkoutStore.setState({
      status: 'active',
      isMinimized: false,
      name: 'Chest & Arms',
      startedAt: new Date(),
    });

    const screen = render(
      <ThemeProvider>
        <MinimizedWorkoutBar />
      </ThemeProvider>,
    );

    expect(screen.toJSON()).toBeNull();
  });

  it('renders correctly when workout is active and minimized', () => {
    useWorkoutStore.setState({
      status: 'active',
      isMinimized: true,
      name: 'Hypertrophy Upper',
      startedAt: new Date(Date.now() - 65000), // 1m 5s ago
    });

    const screen = render(
      <ThemeProvider>
        <MinimizedWorkoutBar />
      </ThemeProvider>,
    );

    expect(screen.getByText('Hypertrophy Upper')).toBeTruthy();
    expect(screen.getByText('1:05')).toBeTruthy();
  });

  it('taps the bar to expand workout and navigates to /workout/session', () => {
    useWorkoutStore.setState({
      status: 'active',
      isMinimized: true,
      name: 'Leg Day',
      startedAt: new Date(),
    });

    const screen = render(
      <ThemeProvider>
        <MinimizedWorkoutBar />
      </ThemeProvider>,
    );

    const barPressable = screen.getByLabelText('Training ausklappen');
    act(() => {
      fireEvent.press(barPressable);
    });

    expect(useWorkoutStore.getState().isMinimized).toBe(false);
    expect(mockPush).toHaveBeenCalledWith('/workout/session');
  });

  it('guards against rapid multiple taps to restore', () => {
    useWorkoutStore.setState({
      status: 'active',
      isMinimized: true,
      name: 'Leg Day',
      startedAt: new Date(),
    });

    const screen = render(
      <ThemeProvider>
        <MinimizedWorkoutBar />
      </ThemeProvider>,
    );

    const barPressable = screen.getByLabelText('Training ausklappen');
    act(() => {
      fireEvent.press(barPressable);
      fireEvent.press(barPressable);
      fireEvent.press(barPressable);
    });

    expect(mockPush).toHaveBeenCalledTimes(1);
  });

  it('toggles play/pause without triggering restore navigation', () => {
    useWorkoutStore.setState({
      status: 'active',
      isMinimized: true,
      name: 'Chest Day',
      startedAt: new Date(),
    });

    const screen = render(
      <ThemeProvider>
        <MinimizedWorkoutBar />
      </ThemeProvider>,
    );

    const pauseButton = screen.getByLabelText('Pause');
    act(() => {
      fireEvent.press(pauseButton);
    });

    expect(useWorkoutStore.getState().status).toBe('paused');
    expect(mockPush).not.toHaveBeenCalled();

    const playButton = screen.getByLabelText('Play');
    act(() => {
      fireEvent.press(playButton);
    });

    expect(useWorkoutStore.getState().status).toBe('active');
    expect(mockPush).not.toHaveBeenCalled();
  });
});
