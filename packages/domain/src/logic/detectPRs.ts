import { WorkoutSession } from '../types';
import { estimateOneRepMax } from './estimateOneRepMax';

export interface PRDelta {
  exerciseId: string;
  previousE1RM?: number;
  newE1RM: number;
  reps: number;
  weight: number;
}

export function detectPRs(session: WorkoutSession, history: WorkoutSession[]): PRDelta[] {
  const deltas: PRDelta[] = [];

  // Filter out the current session if it exists in the history list (to compare strictly against past sessions)
  const pastSessions = history.filter((s) => s.id !== session.id);

  // Group past sessions by exercise to find historical max e1RMs
  const historicalMaxE1RM: Record<string, number> = {};
  pastSessions.forEach((s) => {
    s.exercises.forEach((ex) => {
      ex.sets.forEach((set) => {
        if (set.completed && set.weight && set.reps && set.type !== 'warmup') {
          const e1rm = estimateOneRepMax(set.weight, set.reps);
          if (!historicalMaxE1RM[ex.exerciseId] || e1rm > historicalMaxE1RM[ex.exerciseId]!) {
            historicalMaxE1RM[ex.exerciseId] = e1rm;
          }
        }
      });
    });
  });

  // Check the current session's exercises
  for (const ex of session.exercises) {
    let maxSessionSet: { weight: number; reps: number; e1rm: number } | null = null;

    for (const set of ex.sets) {
      if (set.completed && set.weight && set.reps && set.type !== 'warmup') {
        const e1rm = estimateOneRepMax(set.weight, set.reps);
        if (!maxSessionSet || e1rm > maxSessionSet.e1rm) {
          maxSessionSet = { weight: set.weight, reps: set.reps, e1rm };
        }
      }
    }

    if (maxSessionSet) {
      const prevMax = historicalMaxE1RM[ex.exerciseId];
      if (prevMax === undefined || maxSessionSet.e1rm > prevMax) {
        const delta: PRDelta = {
          exerciseId: ex.exerciseId,
          newE1RM: maxSessionSet.e1rm,
          reps: maxSessionSet.reps,
          weight: maxSessionSet.weight,
        };
        if (prevMax !== undefined) {
          delta.previousE1RM = prevMax;
        }
        deltas.push(delta);
      }
    }
  }

  return deltas;
}
