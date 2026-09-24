import { WorkoutSession, summarizeWorkout } from '@fitness-tracker/domain';
import { dashboardSummary } from '../dashboardSummary';

const session = (date: Date): WorkoutSession => ({
  id: date.toISOString(),
  userId: 'local',
  name: 'Test',
  startedAt: date,
  createdAt: date,
  updatedAt: date,
  exercises: [
    {
      id: 'squat',
      exerciseId: 'squat',
      order: 0,
      sets: [
        { id: 'a', type: 'working', weight: 60, reps: 10, rpe: 8, completed: true, setNumber: 1 },
        { id: 'b', type: 'warmup', weight: 20, reps: 10, rpe: 3, completed: true, setNumber: 2 },
        {
          id: 'c',
          type: 'working',
          weight: 100,
          reps: 10,
          rpe: 10,
          completed: false,
          setNumber: 3,
        },
      ],
    },
  ],
});
it('uses local Monday boundaries and excludes the next week', () => {
  const result = dashboardSummary(
    [
      session(new Date(2026, 8, 6, 23, 59)),
      session(new Date(2026, 8, 7)),
      session(new Date(2026, 8, 13, 23, 59)),
      session(new Date(2026, 8, 14)),
    ],
    new Date(2026, 8, 13, 12),
  );
  expect(result.weekly).toHaveLength(2);
  expect(result.volume).toBe(1200);
  expect(result.setCount).toBe(2);
  expect(result.averageRpe).toBe(8);
});
it('does not invent effort or volume for an empty history', () => {
  expect(dashboardSummary([], new Date(2026, 8, 13))).toMatchObject({
    volume: 0,
    setCount: 0,
    averageRpe: null,
  });
});

it('counts drops but excludes warmups and failure sets consistently with workout summaries', () => {
  const workout = session(new Date(2026, 8, 13));
  workout.exercises[0]!.sets.push(
    { id: 'drop', type: 'drop', weight: 40, reps: 8, completed: true, setNumber: 4 },
    { id: 'fail', type: 'failure', weight: 80, reps: 0, completed: true, setNumber: 5 },
  );
  expect(dashboardSummary([workout], new Date(2026, 8, 13)).setCount).toBe(2);
  expect(summarizeWorkout(workout).setCount).toBe(2);
});
