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
    expect(getByText('TRAININGSAUSWERTUNG')).toBeTruthy();
    expect(getByText('SÄTZE')).toBeTruthy();
    expect(queryByText(/working sets|SESSION TELEMETRY|Workout completed/)).toBeNull();
  });

  it('only renders caffeine facts when caffeine tracking is enabled', () => {
    useProfileStore.setState({
      profile: { displayName: 'Test User', preferredUnits: 'metric', language: 'en' },
    });
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
    act(() => {
      useProfileStore.setState({
        profile: { displayName: 'Test User', preferredUnits: 'metric', language: 'de' },
      });
    });
    expect(queryByText(/Koffeinhinweis:/)).toBeTruthy();
    expect(queryByText(/Caffeine fact:/)).toBeNull();
  });

  it.each([0, 50, 200, 500, 1000, 2000, 4000, 8000, 15000])(
    'localizes deterministic facts and caffeine at %i kg without changing session data',
    (volume) => {
      const now = new Date('2026-06-08T12:00:00Z');
      // Vary IDs to exercise every deterministic fact slot, including volume comparisons.
      for (let seed = 0; seed < 10; seed++) {
        const session = {
          id: `22222222-2222-4222-8222-22222222222${seed}`,
          userId: '00000000-0000-4000-8000-000000000001',
          name: 'Mein Test',
          startedAt: now,
          completedAt: now,
          durationSeconds: 3000,
          createdAt: now,
          updatedAt: now,
          exercises: [
            {
              id: 'exercise-row',
              exerciseId: 'missing',
              order: 0,
              sets: [
                {
                  id: 'set-row',
                  setNumber: 1,
                  type: 'working' as const,
                  weight: volume,
                  reps: 1,
                  completed: true,
                },
              ],
            },
          ],
        };
        useWorkoutStore.setState({ lastFinishedSession: session });
        useCaffeineStore.setState({
          isEnabled: true,
          lastWorkoutMg: [50, 200, 420, 700][seed % 4] ?? 50,
        });
        useProfileStore.setState({
          profile: {
            displayName: 'Test User',
            language: 'de',
            preferredUnits: seed % 2 ? 'imperial' : 'metric',
          },
        });
        const view = render(
          <ThemeProvider>
            <WorkoutCompleteModal />
          </ThemeProvider>,
        );
        expect(view.getByText('TRAININGSAUSWERTUNG')).toBeTruthy();
        expect(view.getByText(/Koffeinhinweis:/)).toBeTruthy();
        expect(
          view.queryByText(
            /You |That is|Performance note|Session signal|Density check|Cardio |Warmup fact|Science tip|Programming tip|Technique tip|Caffeine fact/,
          ),
        ).toBeNull();
        act(() =>
          useProfileStore.setState({
            profile: { displayName: 'Test User', language: 'en', preferredUnits: 'metric' },
          }),
        );
        expect(view.getByText('SESSION TELEMETRY')).toBeTruthy();
        expect(view.getByText(/Caffeine fact:/)).toBeTruthy();
        expect(useWorkoutStore.getState().lastFinishedSession).toBe(session);
        view.unmount();
      }
    },
  );

  it('renders German locale cleanly with all labels and zero English product text', () => {
    useProfileStore.setState({
      profile: { displayName: 'Konrad', language: 'de', preferredUnits: 'metric' },
    });
    const now = new Date('2026-06-08T12:00:00.000Z');
    useWorkoutStore.setState({
      lastFinishedSession: {
        id: '22222222-2222-4222-8222-222222222229',
        userId: '00000000-0000-4000-8000-000000000001',
        name: 'Leg Day Deutsch',
        startedAt: now,
        completedAt: now,
        durationSeconds: 3600,
        createdAt: now,
        updatedAt: now,
        exercises: [
          {
            id: 'ex-1',
            exerciseId: 'unknown-id',
            order: 0,
            sets: [
              {
                id: 'set-warmup',
                setNumber: 1,
                type: 'warmup',
                weight: 60,
                reps: 10,
                completed: true,
              },
              {
                id: 'set-work',
                setNumber: 2,
                type: 'working',
                weight: 100,
                reps: 8,
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

    // German assertions
    expect(getByText(/Training abgeschlossen/)).toBeTruthy();
    expect(getByText(/1 Übungen/)).toBeTruthy();
    expect(getByText('ZEIT')).toBeTruthy();
    expect(getByText('SÄTZE')).toBeTruthy();
    expect(getByText('KG')).toBeTruthy();
    expect(getByText('SUPER')).toBeTruthy();
    expect(getByText('TRAININGSAUSWERTUNG')).toBeTruthy();
    expect(getByText(/1 Arbeitssätze · 800 kg Volumen/)).toBeTruthy();
    expect(getByText(/Aufwärmen 60 kg × 10/)).toBeTruthy();

    // Verify no English counterparts leak
    expect(queryByText(/Workout completed/)).toBeNull();
    expect(queryByText(/exercises/)).toBeNull();
    expect(queryByText(/TIME/)).toBeNull();
    expect(queryByText(/SETS/)).toBeNull();
    expect(queryByText(/working sets/)).toBeNull();
    expect(queryByText(/volume/)).toBeNull();
    expect(queryByText(/Warm-up/)).toBeNull();
    expect(queryByText(/AWESOME/)).toBeNull();
    expect(queryByText(/SESSION TELEMETRY/)).toBeNull();
  });

  it('renders English locale cleanly with all labels and zero German product text', () => {
    useProfileStore.setState({
      profile: { displayName: 'Konrad', language: 'en', preferredUnits: 'imperial' },
    });
    const now = new Date('2026-06-08T12:00:00.000Z');
    useWorkoutStore.setState({
      lastFinishedSession: {
        id: '22222222-2222-4222-8222-222222222229',
        userId: '00000000-0000-4000-8000-000000000001',
        name: 'Leg Day English',
        startedAt: now,
        completedAt: now,
        durationSeconds: 3600,
        createdAt: now,
        updatedAt: now,
        exercises: [
          {
            id: 'ex-1',
            exerciseId: 'unknown-id',
            order: 0,
            sets: [
              {
                id: 'set-warmup',
                setNumber: 1,
                type: 'warmup',
                weight: 60,
                reps: 10,
                completed: true,
              },
              {
                id: 'set-work',
                setNumber: 2,
                type: 'working',
                weight: 100,
                reps: 8,
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

    // English assertions
    expect(getByText(/Workout completed/)).toBeTruthy();
    expect(getByText(/1 exercises/)).toBeTruthy();
    expect(getByText('TIME')).toBeTruthy();
    expect(getByText('SETS')).toBeTruthy();
    expect(getByText('LBS')).toBeTruthy();
    expect(getByText('AWESOME')).toBeTruthy();
    expect(getByText('SESSION TELEMETRY')).toBeTruthy();
    expect(getByText(/1 working sets/)).toBeTruthy();
    expect(getByText(/Warm-up/)).toBeTruthy();

    // Verify no German counterparts leak
    expect(queryByText(/Training abgeschlossen/)).toBeNull();
    expect(queryByText(/Übungen/)).toBeNull();
    expect(queryByText('ZEIT')).toBeNull();
    expect(queryByText('SÄTZE')).toBeNull();
    expect(queryByText(/Arbeitssätze/)).toBeNull();
    expect(queryByText(/Aufwärmen/)).toBeNull();
    expect(queryByText('SUPER')).toBeNull();
    expect(queryByText('TRAININGSAUSWERTUNG')).toBeNull();
  });

  it('handles empty and missing optional values gracefully without crashing', () => {
    useProfileStore.setState({
      profile: { displayName: 'User', language: 'de', preferredUnits: 'metric' },
    });
    const now = new Date('2026-06-08T12:00:00.000Z');

    // Case A: 0 duration and exercise with no completed sets
    useWorkoutStore.setState({
      lastFinishedSession: {
        id: '22222222-2222-4222-8222-222222222221',
        userId: '00000000-0000-4000-8000-000000000001',
        name: 'Empty Session',
        startedAt: now,
        completedAt: now,
        durationSeconds: 0,
        createdAt: now,
        updatedAt: now,
        exercises: [
          {
            id: 'ex-empty',
            exerciseId: 'unmapped-catalog-id',
            order: 0,
            sets: [
              {
                id: 'set-uncompleted',
                setNumber: 1,
                type: 'working',
                weight: 50,
                reps: 10,
                completed: false,
              },
            ],
          },
        ],
      },
    });

    const { getByText } = render(
      <ThemeProvider>
        <WorkoutCompleteModal />
      </ThemeProvider>,
    );

    // Formatted duration fallback
    expect(getByText('--:--')).toBeTruthy();
    // Missing definition fallback to 'Übung' in German
    expect(getByText('Übung')).toBeTruthy();
    // No completed sets fallback
    expect(getByText('Keine abgeschlossenen Sätze')).toBeTruthy();
    expect(getByText('0 Arbeitssätze · 0 kg Volumen')).toBeTruthy();
  });
});
