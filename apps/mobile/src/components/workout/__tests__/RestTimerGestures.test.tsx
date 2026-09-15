import React from 'react';
import { PanResponder, GestureResponderEvent, PanResponderGestureState } from 'react-native';
import { render, fireEvent, act } from '@testing-library/react-native';
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

const mockEvent = {} as GestureResponderEvent;

const makeGesture = (
  dx: number,
  dy: number,
  vy: number = 0,
): PanResponderGestureState => ({
  stateID: 1,
  moveX: 0,
  moveY: 0,
  x0: 0,
  y0: 0,
  dx,
  dy,
  vx: 0,
  vy,
  numberActiveTouches: 1,
  _accountsForMovesUpTo: 0,
});

describe('RestTimer Gestures & Interactions', () => {
  let capturedConfig: Parameters<typeof PanResponder.create>[0];

  beforeEach(() => {
    useWorkoutStore.getState().resetWorkout();
    useWorkoutStore.getState().resetRestTimer();

    jest.spyOn(PanResponder, 'create').mockImplementation((config) => {
      capturedConfig = config;
      // Return normal PanResponder structure so component can mount
      return {
        panHandlers: {
          onStartShouldSetResponder: () => false,
          onMoveShouldSetResponder: (e: GestureResponderEvent) =>
            config.onMoveShouldSetPanResponder?.(e, makeGesture(0, 0)) ?? false,
          onResponderGrant: (e: GestureResponderEvent) =>
            config.onPanResponderGrant?.(e, makeGesture(0, 0)),
          onResponderMove: (e: GestureResponderEvent) =>
            config.onPanResponderMove?.(e, makeGesture(0, 0)),
          onResponderRelease: (e: GestureResponderEvent) =>
            config.onPanResponderRelease?.(e, makeGesture(0, 0)),
          onResponderTerminate: (e: GestureResponderEvent) =>
            config.onPanResponderTerminate?.(e, makeGesture(0, 0)),
          onResponderTerminationRequest: (e: GestureResponderEvent) =>
            config.onPanResponderTerminationRequest?.(e, makeGesture(0, 0)) ?? true,
        },
      };
    });
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  // Test A – Tap to expand when collapsed
  it('expands when collapsed on toggle tap (Test A)', () => {
    const { getByLabelText, getByTestId } = render(<RestTimer />);
    const toggleBtn = getByLabelText('Pausentimer öffnen');
    expect(toggleBtn).toBeTruthy();

    fireEvent.press(toggleBtn);

    expect(getByLabelText('Pausentimer einklappen')).toBeTruthy();
    expect(getByTestId('reset-timer-btn')).toBeTruthy();
  });

  // Test B – Tap to collapse when expanded
  it('collapses when expanded on toggle tap (Test B)', () => {
    const { getByLabelText } = render(<RestTimer />);
    const openBtn = getByLabelText('Pausentimer öffnen');
    fireEvent.press(openBtn);

    const closeBtn = getByLabelText('Pausentimer einklappen');
    fireEvent.press(closeBtn);

    expect(getByLabelText('Pausentimer öffnen')).toBeTruthy();
  });

  // Test C – Swipe up to expand when collapsed
  it('expands on vertical swipe up gesture when collapsed (Test C)', () => {
    const { getByLabelText } = render(<RestTimer />);
    expect(getByLabelText('Pausentimer öffnen')).toBeTruthy();

    // Check shouldSetPanResponder captures upward motion
    const shouldCapture = capturedConfig.onMoveShouldSetPanResponder?.(
      mockEvent,
      makeGesture(0, -25),
    );
    expect(shouldCapture).toBe(true);

    // Simulate release of swipe up
    act(() => {
      capturedConfig.onPanResponderRelease?.(mockEvent, makeGesture(0, -35, -0.3));
    });

    expect(getByLabelText('Pausentimer einklappen')).toBeTruthy();
  });

  // Test D – Swipe down to collapse when expanded
  it('collapses on vertical swipe down gesture when expanded (Test D)', () => {
    const { getByLabelText } = render(<RestTimer />);
    // Expand first via tap
    fireEvent.press(getByLabelText('Pausentimer öffnen'));
    expect(getByLabelText('Pausentimer einklappen')).toBeTruthy();

    // Check shouldSetPanResponder captures downward motion when expanded
    const shouldCapture = capturedConfig.onMoveShouldSetPanResponder?.(
      mockEvent,
      makeGesture(0, 25),
    );
    expect(shouldCapture).toBe(true);

    // Simulate release of swipe down
    act(() => {
      capturedConfig.onPanResponderRelease?.(mockEvent, makeGesture(0, 35, 0.3));
    });

    expect(getByLabelText('Pausentimer öffnen')).toBeTruthy();
  });

  // Test E – Minor finger move during tap does not trigger swipe action
  it('ignores minor finger jitter and does not capture swipe (Test E)', () => {
    const { getByLabelText } = render(<RestTimer />);

    const shouldCapture = capturedConfig.onMoveShouldSetPanResponder?.(
      mockEvent,
      makeGesture(0, -8),
    );
    expect(shouldCapture).toBe(false);

    // If released with small distance, does not trigger action
    act(() => {
      capturedConfig.onPanResponderRelease?.(mockEvent, makeGesture(0, -8));
    });

    expect(getByLabelText('Pausentimer öffnen')).toBeTruthy();
  });

  // Test F – Horizontal movement is ignored
  it('ignores primarily horizontal gestures (Test F)', () => {
    const { getByLabelText } = render(<RestTimer />);

    const shouldCapture = capturedConfig.onMoveShouldSetPanResponder?.(
      mockEvent,
      makeGesture(35, -15),
    );
    expect(shouldCapture).toBe(false);

    act(() => {
      capturedConfig.onPanResponderRelease?.(mockEvent, makeGesture(35, -15));
    });

    expect(getByLabelText('Pausentimer öffnen')).toBeTruthy();
  });

  // Test G – Timer adjustment buttons remain interactive when expanded
  it('allows adjustment button interactions when expanded (Test G)', () => {
    const { getByLabelText } = render(<RestTimer />);
    fireEvent.press(getByLabelText('Pausentimer öffnen'));

    const plus30Btn = getByLabelText('Plus 30 Sekunden');
    expect(plus30Btn).toBeTruthy();

    fireEvent.press(plus30Btn);
    expect(useWorkoutStore.getState().restTimer.durationSeconds).toBe(120); // 90 + 30
    expect(useWorkoutStore.getState().restTimer.isRunning).toBe(true);
  });

  // Test I – Timer keeps running through swipe gestures without resetting
  it('preserves running timer state during swipe gesture (Test I)', () => {
    const { getByTestId, getByLabelText } = render(<RestTimer />);

    // Start timer
    fireEvent.press(getByTestId('start-timer-btn'));
    expect(useWorkoutStore.getState().restTimer.isRunning).toBe(true);
    const initialDuration = useWorkoutStore.getState().restTimer.durationSeconds;

    // Swipe up to expand
    act(() => {
      capturedConfig.onPanResponderRelease?.(mockEvent, makeGesture(0, -35, -0.4));
    });
    expect(getByLabelText('Pausentimer einklappen')).toBeTruthy();

    // Timer must still be running with same duration
    expect(useWorkoutStore.getState().restTimer.isRunning).toBe(true);
    expect(useWorkoutStore.getState().restTimer.durationSeconds).toBe(initialDuration);

    // Swipe down to collapse
    act(() => {
      capturedConfig.onPanResponderRelease?.(mockEvent, makeGesture(0, 35, 0.4));
    });
    expect(getByLabelText('Pausentimer öffnen')).toBeTruthy();

    // Still running uninterrupted
    expect(useWorkoutStore.getState().restTimer.isRunning).toBe(true);
    expect(useWorkoutStore.getState().restTimer.durationSeconds).toBe(initialDuration);
  });
});
