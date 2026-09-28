import React from 'react';
import { act, fireEvent, render } from '@testing-library/react-native';
import { DialogProvider, ThemeProvider } from '@fitness-tracker/ui';
import {
  Equipment,
  Exercise,
  MovementPattern,
  MuscleGroup,
  SessionExercise,
  WorkoutSession,
} from '@fitness-tracker/domain';
import { SessionExerciseCard } from '../SessionExerciseCard';
import { useExerciseStore } from '../../../stores/exerciseStore';
import { useHistoryStore } from '../../../stores/historyStore';
import { useProfileStore } from '../../../stores/profileStore';
import { useWorkoutStore } from '../../../stores/workoutStore';

jest.mock('expo-router', () => ({ useRouter: () => ({ push: jest.fn() }) }));
jest.mock('@expo/vector-icons', () => ({ Ionicons: () => null }));

const date = new Date('2026-09-20T10:00:00Z');
const exercise: Exercise = {
  id: 'lateral-raise',
  name: 'Lateral Raise',
  primaryMuscles: [MuscleGroup.SideDelts],
  secondaryMuscles: [],
  equipment: Equipment.Dumbbell,
  movementPattern: MovementPattern.Isolation,
  isCustom: false,
  createdAt: date,
  updatedAt: date,
};
const occurrence = (id: string, weights: number[]): SessionExercise => ({
  id,
  exerciseId: exercise.id,
  order: 0,
  sets: weights.map((weight, index) => ({
    id: `${id}-set-${index}`,
    setNumber: index + 1,
    type: 'working',
    weight,
    reps: 12,
    completed: true,
  })),
});
const previous: WorkoutSession = {
  id: 'previous',
  userId: 'user',
  name: 'Previous workout',
  startedAt: date,
  completedAt: new Date('2026-09-20T11:00:00Z'),
  createdAt: date,
  updatedAt: date,
  exercises: [occurrence('previous-raise', [18, 18, 15])],
};

function renderStatistics(current: SessionExercise, sessionExercises = [current]) {
  useWorkoutStore.setState({
    status: 'active',
    sessionId: 'current',
    startedAt: new Date('2026-09-27T10:00:00Z'),
    exercises: sessionExercises,
  });
  const screen = render(
    <ThemeProvider>
      <DialogProvider>
        <SessionExerciseCard sessionExercise={current} />
      </DialogProvider>
    </ThemeProvider>,
  );
  fireEvent.press(screen.getByTestId('exercise-options-btn'));
  fireEvent.press(screen.getByText(/Statistik anzeigen|Show Statistics/));
  return screen;
}

describe('live exercise volume comparison', () => {
  beforeEach(() => {
    useExerciseStore.setState({ exercises: [exercise], persistentNotes: {} });
    useHistoryStore.setState({ sessions: [previous] });
    useProfileStore.setState({
      profile: { displayName: 'Athlete', preferredUnits: 'metric', language: 'de' },
    });
  });

  it('shows 630 kg and +2.94% for the reported lateral raise improvement', () => {
    const screen = renderStatistics(occurrence('current-raise', [18, 18, 16.5]));
    expect(screen.getByText('630 kg')).toBeTruthy();
    expect(screen.getByText('+2,94%')).toBeTruthy();
    expect(screen.getByText(/Letztes Mal: 612 kg/)).toBeTruthy();
  });

  it('labels unfinished work and updates to the comparison after the final set is confirmed', () => {
    const current = occurrence('current-raise', [18, 18, 16.5]);
    current.sets[2]!.completed = false;
    function LiveCard() {
      const liveExercise = useWorkoutStore((state) => state.exercises[0]!);
      return <SessionExerciseCard sessionExercise={liveExercise} />;
    }
    useWorkoutStore.setState({
      status: 'active',
      sessionId: 'current',
      startedAt: new Date('2026-09-27T10:00:00Z'),
      exercises: [current],
    });
    const screen = render(
      <ThemeProvider>
        <DialogProvider>
          <LiveCard />
        </DialogProvider>
      </ThemeProvider>,
    );
    fireEvent.press(screen.getByTestId('exercise-options-btn'));
    fireEvent.press(screen.getByText('Statistik anzeigen'));
    expect(screen.getByText('432 kg')).toBeTruthy();
    expect(screen.getByText(/2\/3 Arbeitssätze abgeschlossen/)).toBeTruthy();
    expect(screen.getByText('Bisher vs. letztes')).toBeTruthy();
    expect(screen.getByText('-29,41%')).toBeTruthy();

    act(() => {
      useWorkoutStore.getState().completeSet(current.id, current.sets[2]!.id);
    });
    expect(screen.getByText('630 kg')).toBeTruthy();
    expect(screen.getByText('+2,94%')).toBeTruthy();
    expect(screen.queryByText('Bisher vs. letztes')).toBeNull();
  });

  it('keeps percentage unit independent and localizes the English result', () => {
    useProfileStore.setState({
      profile: { displayName: 'Athlete', preferredUnits: 'imperial', language: 'en' },
    });
    const screen = renderStatistics(occurrence('current-raise', [18, 18, 16.5]));
    expect(screen.getByText('1389 lbs')).toBeTruthy();
    expect(screen.getByText('+2.94%')).toBeTruthy();
  });

  it('uses the matching ordered occurrence before the current session, excluding itself and later history', () => {
    const current = { ...occurrence('current-raise', [18, 18, 16.5]), order: 2 };
    const other = occurrence('first-raise', [100]);
    const baseline = {
      ...previous,
      exercises: [
        { ...previous.exercises[0]!, order: 2 },
        occurrence('previous-first-raise', [100]),
      ],
    };
    useHistoryStore.setState({
      sessions: [
        {
          ...baseline,
          id: 'future',
          startedAt: new Date('2026-09-28T10:00:00Z'),
          exercises: [other, { ...current, sets: occurrence('future-raise', [200]).sets }],
        },
        {
          ...baseline,
          id: 'current',
          startedAt: new Date('2026-09-26T10:00:00Z'),
          exercises: [other, { ...current, sets: occurrence('self-raise', [200]).sets }],
        },
        baseline,
      ],
    });
    const screen = renderStatistics(current, [current, other]);
    expect(screen.getByText('+2,94%')).toBeTruthy();
    expect(screen.getByText(/Letztes Mal: 612 kg/)).toBeTruthy();
  });

  it('shows no percentage for an unstarted exercise or unavailable baseline', () => {
    const current = occurrence('current-raise', [18, 18, 16.5]);
    current.sets.forEach((set) => {
      set.completed = false;
    });
    const screen = renderStatistics(current);
    expect(screen.getByText(/0\/3 Arbeitssätze abgeschlossen/)).toBeTruthy();
    expect(screen.queryByText(/^-?\d.*%$/)).toBeNull();
    screen.unmount();

    useHistoryStore.setState({ sessions: [] });
    const noHistory = renderStatistics(occurrence('current-raise', [18, 18, 16.5]));
    expect(noHistory.getByText('Kein früheres Vergleichsvolumen vorhanden.')).toBeTruthy();
    expect(noHistory.queryByText(/^[+-]?\d.*%$/)).toBeNull();
  });
});
