import React from 'react';
import { Animated } from 'react-native';
import { act, render } from '@testing-library/react-native';

import { ThemeProvider } from '@fitness-tracker/ui';

import { WorkoutCompleteModal } from '../WorkoutCompleteModal';
import { useCaffeineStore } from '../../../stores/caffeineStore';
import { useProfileStore } from '../../../stores/profileStore';
import { useWorkoutStore } from '../../../stores/workoutStore';

jest.mock('react-native-mmkv', () => ({
  MMKV: jest.fn().mockImplementation(() => ({
    set: jest.fn(),
    getString: jest.fn(),
    delete: jest.fn(),
  })),
}));

jest.mock('expo-crypto', () => ({
  randomUUID: () => '11111111-1111-4111-8111-111111111111',
}));

jest.mock('@expo/vector-icons', () => ({
  Ionicons: () => null,
}));

const createMockAnimation = (): Animated.CompositeAnimation => ({
  start: jest.fn(),
  stop: jest.fn(),
  reset: jest.fn(),
});

describe('WorkoutCompleteModal', () => {
  beforeEach(() => {
    jest.spyOn(Animated, 'delay').mockImplementation(() => createMockAnimation());
    jest.spyOn(Animated, 'parallel').mockImplementation(() => createMockAnimation());
    jest.spyOn(Animated, 'sequence').mockImplementation(() => createMockAnimation());
    jest.spyOn(Animated, 'timing').mockImplementation(() => createMockAnimation());

    useProfileStore.setState({
      profile: {
        displayName: 'User',
        preferredUnits: 'metric',
      },
    });
    useWorkoutStore.getState().resetWorkout();
    useCaffeineStore.setState({ isEnabled: true, currentWorkoutMg: 0, lastWorkoutMg: 0 });
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('excludes warmup sets from displayed workout volume', () => {
    const now = new Date('2026-06-08T12:00:00.000Z');
    useWorkoutStore.setState({
      lastFinishedSession: {
        id: '22222222-2222-4222-8222-222222222222',
        userId: '00000000-0000-4000-8000-000000000001',
        name: 'Push Day',
        startedAt: now,
        completedAt: now,
        durationSeconds: 1200,
        createdAt: now,
        updatedAt: now,
        exercises: [
          {
            id: '33333333-3333-4333-8333-333333333333',
            exerciseId: '44444444-4444-4444-8444-444444444444',
            order: 0,
            sets: [
              {
                id: '55555555-5555-4555-8555-555555555555',
                setNumber: 1,
                type: 'warmup',
                weight: 80,
                reps: 10,
                completed: true,
              },
              {
                id: '66666666-6666-4666-8666-666666666666',
                setNumber: 2,
                type: 'working',
                weight: 100,
                reps: 5,
                completed: true,
              },
            ],
          },
        ],
      },
    });

    const { getByText, queryByText } = render(
      <ThemeProvider>
        <WorkoutCompleteModal />
      </ThemeProvider>,
    );

    expect(getByText('500')).toBeTruthy();
    expect(queryByText('1300')).toBeNull();
  });

  it('only renders caffeine facts when caffeine tracking is enabled', () => {
    const now = new Date('2026-06-08T12:00:00.000Z');
    useWorkoutStore.setState({
      lastFinishedSession: {
        id: '22222222-2222-4222-8222-222222222222',
        userId: '00000000-0000-4000-8000-000000000001',
        name: 'Push Day',
        startedAt: now,
        completedAt: now,
        durationSeconds: 1200,
        createdAt: now,
        updatedAt: now,
        exercises: [
          {
            id: '33333333-3333-4333-8333-333333333333',
            exerciseId: '44444444-4444-4444-8444-444444444444',
            order: 0,
            sets: [
              {
                id: '66666666-6666-4666-8666-666666666666',
                setNumber: 1,
                type: 'working',
                weight: 100,
                reps: 5,
                completed: true,
              },
            ],
          },
        ],
      },
    });
    useCaffeineStore.setState({ isEnabled: false, currentWorkoutMg: 0, lastWorkoutMg: 420 });

    const { queryByText, rerender } = render(
      <ThemeProvider>
        <WorkoutCompleteModal />
      </ThemeProvider>,
    );

    expect(queryByText(/Caffeine fact:/)).toBeNull();

    act(() => {
      useCaffeineStore.setState({ isEnabled: true, currentWorkoutMg: 0, lastWorkoutMg: 420 });
    });
    rerender(
      <ThemeProvider>
        <WorkoutCompleteModal />
      </ThemeProvider>,
    );

    expect(queryByText(/Caffeine fact:/)).toBeTruthy();
  });
});
