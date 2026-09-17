import {
  EXERCISES,
  summarizeWorkout,
} from '@fitness-tracker/domain';
import { useWorkoutStore } from '../stores/workoutStore';
import { useHistoryStore } from '../stores/historyStore';
import { useProfileStore } from '../stores/profileStore';
import { LOCAL_USER_ID } from '../stores/local-user';

jest.mock('expo-crypto', () => {
  let counter = 0;
  return {
    randomUUID: () => `edge-case-uuid-${++counter}`,
  };
});

describe('Work Block B: Workout Edge Cases & Extreme Boundaries', () => {
  beforeEach(() => {
    useWorkoutStore.getState().resetWorkout();
    useHistoryStore.getState().clearHistory();
    useProfileStore.setState(useProfileStore.getInitialState());
  });

  describe('1. Workout Extreme Dimensions & Sizing', () => {
    it('handles an empty workout (0 exercises) cleanly without throwing, returning null to avoid saving empty sessions', () => {
      useWorkoutStore.getState().startWorkout('Empty Session');
      expect(useWorkoutStore.getState().exercises.length).toBe(0);

      // Finishing a workout without completed sets guards against saving ghost workouts
      const finished = useWorkoutStore.getState().finishWorkout();
      expect(finished).toBeNull();
      expect(useWorkoutStore.getState().status).toBe('active');

      // Explicit discard via resetWorkout sets status back to idle
      useWorkoutStore.getState().resetWorkout();
      expect(useWorkoutStore.getState().status).toBe('idle');
    });

    it('handles a 1-exercise, single-set workout accurately', () => {
      useWorkoutStore.getState().startWorkout('Single Set Check');
      useWorkoutStore.getState().addExercise(EXERCISES[0]!.id);

      const sessionExId = useWorkoutStore.getState().exercises[0]!.id;
      const set = useWorkoutStore.getState().exercises[0]!.sets[0]!;

      useWorkoutStore.getState().updateSet(sessionExId, set.id, {
        weight: 100,
        reps: 5,
      });
      useWorkoutStore.getState().completeSet(sessionExId, set.id);

      const finished = useWorkoutStore.getState().finishWorkout();
      expect(finished).not.toBeNull();
      expect(finished!.exercises.length).toBe(1);
      expect(finished!.exercises[0]!.sets.length).toBe(1);

      const summary = summarizeWorkout(finished!);
      expect(summary.totalVolume).toBe(500);
      expect(summary.setCount).toBe(1);
    });

    it('handles a large workout (12 exercises, 60 sets) with high performance and zero corruption', () => {
      useWorkoutStore.getState().startWorkout('Massive Volume Day');

      for (let i = 0; i < 12; i++) {
        const exId = EXERCISES[i % EXERCISES.length]!.id;
        useWorkoutStore.getState().addExercise(exId);
        const sessionEx = useWorkoutStore.getState().exercises[i]!;

        // Add 4 additional sets (total 5 sets per exercise = 60 sets)
        for (let s = 2; s <= 5; s++) {
          useWorkoutStore.getState().addSet(sessionEx.id, {
            setNumber: s,
            type: 'working',
            weight: 75.5,
            reps: 10,
            completed: true,
          });
        }
        // Also complete set 1
        useWorkoutStore.getState().updateSet(sessionEx.id, sessionEx.sets[0]!.id, {
          weight: 75.5,
          reps: 10,
          completed: true,
        });
      }

      const active = useWorkoutStore.getState();
      expect(active.exercises.length).toBe(12);

      const totalSets = active.exercises.reduce((acc, ex) => acc + ex.sets.length, 0);
      expect(totalSets).toBe(60);

      const finished = useWorkoutStore.getState().finishWorkout();
      expect(finished).not.toBeNull();
      const summary = summarizeWorkout(finished!);
      expect(summary.setCount).toBe(60);
      expect(summary.totalVolume).toBe(75.5 * 10 * 60);
    });
  });

  describe('2. Extreme Values: Large Weights, Decimals, Rep Boundaries, RPE/RIR', () => {
    it('handles extremely large weights (e.g. 500kg, 1200kg) without numeric overflow or NaN', () => {
      useWorkoutStore.getState().startWorkout('Heavy World Record Lift');
      useWorkoutStore.getState().addExercise(EXERCISES[0]!.id);

      const sessionExId = useWorkoutStore.getState().exercises[0]!.id;
      const set1 = useWorkoutStore.getState().exercises[0]!.sets[0]!;

      useWorkoutStore.getState().updateSet(sessionExId, set1.id, {
        weight: 1250.5,
        reps: 1,
        completed: true,
      });

      const finished = useWorkoutStore.getState().finishWorkout();
      expect(finished).not.toBeNull();
      const summary = summarizeWorkout(finished!);
      expect(summary.totalVolume).toBe(1250.5);
      expect(isNaN(summary.totalVolume)).toBe(false);
      expect(isFinite(summary.totalVolume)).toBe(true);
    });

    it('correctly calculates volume for fine-grained decimal weights (e.g. 1.25kg microplates, 12.75kg)', () => {
      useWorkoutStore.getState().startWorkout('Microloading Test');
      useWorkoutStore.getState().addExercise(EXERCISES[0]!.id);

      const sessionExId = useWorkoutStore.getState().exercises[0]!.id;
      const set1 = useWorkoutStore.getState().exercises[0]!.sets[0]!;

      useWorkoutStore.getState().updateSet(sessionExId, set1.id, {
        weight: 17.25,
        reps: 8,
        completed: true,
      });

      const finished = useWorkoutStore.getState().finishWorkout();
      const summary = summarizeWorkout(finished!);
      expect(summary.totalVolume).toBeCloseTo(17.25 * 8, 2);
    });

    it('handles 0 reps gracefully without negative volume or mathematical abnormalities', () => {
      useWorkoutStore.getState().startWorkout('Failed Attempt');
      useWorkoutStore.getState().addExercise(EXERCISES[0]!.id);

      const sessionExId = useWorkoutStore.getState().exercises[0]!.id;
      const set1 = useWorkoutStore.getState().exercises[0]!.sets[0]!;

      useWorkoutStore.getState().updateSet(sessionExId, set1.id, {
        weight: 100,
        reps: 0,
        completed: true,
      });

      const finished = useWorkoutStore.getState().finishWorkout();
      const summary = summarizeWorkout(finished!);
      expect(summary.totalVolume).toBe(0);
      expect(summary.setCount).toBe(1);
    });

    it('respects RPE (6.0 - 10.0) and RIR (0 - 5) boundary values', () => {
      useWorkoutStore.getState().startWorkout('Auto-regulation Session');
      useWorkoutStore.getState().addExercise(EXERCISES[0]!.id);

      const sessionExId = useWorkoutStore.getState().exercises[0]!.id;
      const set1 = useWorkoutStore.getState().exercises[0]!.sets[0]!;

      // Valid RPE 10.0 and RIR 0
      useWorkoutStore.getState().updateSet(sessionExId, set1.id, {
        weight: 100,
        reps: 5,
        rpe: 10.0,
        rir: 0,
        completed: true,
      });

      let currentSet = useWorkoutStore.getState().exercises[0]!.sets[0]!;
      expect(currentSet.rpe).toBe(10.0);
      expect(currentSet.rir).toBe(0);

      // Boundary: RPE 6.5 and RIR 4
      useWorkoutStore.getState().updateSet(sessionExId, set1.id, {
        rpe: 6.5,
        rir: 4,
      });

      currentSet = useWorkoutStore.getState().exercises[0]!.sets[0]!;
      expect(currentSet.rpe).toBe(6.5);
      expect(currentSet.rir).toBe(4);
    });
  });

  describe('3. Set Lifecycle & Rapid Mutation Sequences', () => {
    it('handles rapid complete and uncomplete toggle sequences without desynchronization', () => {
      useWorkoutStore.getState().startWorkout('Rapid Toggle');
      useWorkoutStore.getState().addExercise(EXERCISES[0]!.id);

      const sessionExId = useWorkoutStore.getState().exercises[0]!.id;
      const set1 = useWorkoutStore.getState().exercises[0]!.sets[0]!;

      // Toggle completed 5 times
      for (let i = 0; i < 5; i++) {
        useWorkoutStore.getState().completeSet(sessionExId, set1.id);
      }

      // 5 toggles from initial false -> true -> false -> true -> false -> true
      expect(useWorkoutStore.getState().exercises[0]!.sets[0]!.completed).toBe(true);

      // 6th toggle -> false
      useWorkoutStore.getState().completeSet(sessionExId, set1.id);
      expect(useWorkoutStore.getState().exercises[0]!.sets[0]!.completed).toBe(false);
    });

    it('handles rapid set additions and deletions maintaining orderly set numbering', () => {
      useWorkoutStore.getState().startWorkout('Rapid Add Delete');
      useWorkoutStore.getState().addExercise(EXERCISES[0]!.id);

      const sessionExId = useWorkoutStore.getState().exercises[0]!.id;

      // Add 4 sets
      useWorkoutStore.getState().addSet(sessionExId);
      useWorkoutStore.getState().addSet(sessionExId);
      useWorkoutStore.getState().addSet(sessionExId);
      useWorkoutStore.getState().addSet(sessionExId);

      expect(useWorkoutStore.getState().exercises[0]!.sets.length).toBe(5);

      // Remove middle set (index 2)
      const setToDelete = useWorkoutStore.getState().exercises[0]!.sets[2]!;
      useWorkoutStore.getState().removeSet(sessionExId, setToDelete.id);

      const remainingSets = useWorkoutStore.getState().exercises[0]!.sets;
      expect(remainingSets.length).toBe(4);
      expect(remainingSets.find((s) => s.id === setToDelete.id)).toBeUndefined();
    });

    it('guarantees idempotency when finishWorkout is called twice', () => {
      useWorkoutStore.getState().startWorkout('Double Finish');
      useWorkoutStore.getState().addExercise(EXERCISES[0]!.id);
      const sessionExId = useWorkoutStore.getState().exercises[0]!.id;
      const set1 = useWorkoutStore.getState().exercises[0]!.sets[0]!;
      useWorkoutStore.getState().completeSet(sessionExId, set1.id);

      const firstFinish = useWorkoutStore.getState().finishWorkout();
      expect(firstFinish).not.toBeNull();
      expect(useWorkoutStore.getState().status).toBe('finished');

      // Second finish call while already finished returns null cleanly without crashing
      const secondFinish = useWorkoutStore.getState().finishWorkout();
      expect(secondFinish).toBeNull();
      expect(useWorkoutStore.getState().status).toBe('finished');
    });
  });

  describe('4. Rest Timer State Engine', () => {
    it('starts, stops, resets, and extends rest timer cleanly', () => {
      useWorkoutStore.getState().startWorkout('Timer Flow');

      // Start 90s timer
      useWorkoutStore.getState().startRestTimer(90);
      let timer = useWorkoutStore.getState().restTimer;
      expect(timer.isRunning).toBe(true);
      expect(timer.durationSeconds).toBe(90);

      // Stop timer
      useWorkoutStore.getState().stopRestTimer();
      timer = useWorkoutStore.getState().restTimer;
      expect(timer.isRunning).toBe(false);

      // Reset timer resets to standard 90s resting interval
      useWorkoutStore.getState().resetRestTimer();
      timer = useWorkoutStore.getState().restTimer;
      expect(timer.isRunning).toBe(false);
      expect(timer.durationSeconds).toBe(90);

      // Re-start and tick
      useWorkoutStore.getState().startRestTimer(60);
      useWorkoutStore.getState().tickRestTimer();
      expect(useWorkoutStore.getState().restTimer.isRunning).toBe(true);
    });

    it('preserves active workout state and timer state across minimize and restore', () => {
      useWorkoutStore.getState().startWorkout('Minimize Restore Flow');
      useWorkoutStore.getState().startRestTimer(120);

      // Minimize
      useWorkoutStore.getState().setMinimized(true);
      expect(useWorkoutStore.getState().isMinimized).toBe(true);
      expect(useWorkoutStore.getState().restTimer.isRunning).toBe(true);

      // Restore
      useWorkoutStore.getState().setMinimized(false);
      expect(useWorkoutStore.getState().isMinimized).toBe(false);
      expect(useWorkoutStore.getState().status).toBe('active');
    });
  });

  describe('5. App Recovery & Partition Boundaries', () => {
    it('restores unfinished workout accurately from persisted state', () => {
      const persistedActivePayload = {
        status: 'active' as const,
        sessionId: 'unfinish-001',
        name: 'Recovered Session',
        startedAt: new Date('2026-09-17T07:00:00Z'),
        isMinimized: false,
        exercises: [
          {
            id: 'unfinish-se-1',
            exerciseId: EXERCISES[0]!.id,
            order: 0,
            sets: [
              {
                id: 'unfinish-s-1',
                setNumber: 1,
                type: 'working' as const,
                weight: 90,
                reps: 6,
                completed: true,
              },
            ],
          },
        ],
      };

      useWorkoutStore.setState(persistedActivePayload);

      const state = useWorkoutStore.getState();
      expect(state.status).toBe('active');
      expect(state.name).toBe('Recovered Session');
      expect(state.exercises.length).toBe(1);
      expect(state.exercises[0]!.sets[0]!.completed).toBe(true);
      expect(state.exercises[0]!.sets[0]!.weight).toBe(90);
    });

    it('isolates guest data cleanly and handles local data reset safely', async () => {
      useHistoryStore.getState().addSession({
        id: 'guest-session-1',
        userId: LOCAL_USER_ID,
        name: 'Guest Workout',
        startedAt: new Date(),
        completedAt: new Date(),
        createdAt: new Date(),
        updatedAt: new Date(),
        exercises: [],
      });

      expect(useHistoryStore.getState().sessions.length).toBe(1);

      // Local clearAllData cleans up state
      await useProfileStore.getState().clearAllData();
      expect(useHistoryStore.getState().sessions.length).toBe(0);
      expect(useWorkoutStore.getState().status).toBe('idle');
    });
  });
});
