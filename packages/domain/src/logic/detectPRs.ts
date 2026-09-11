import { WorkoutSession, UUID } from '../types';
import { getBestE1RMs } from './getBestE1RMs';

export interface PRDelta {
  exerciseId: string;
  previousE1RM?: number;
  newE1RM: number;
  reps: number;
  weight: number;
}

export function detectPRs(
  session: WorkoutSession,
  history: WorkoutSession[],
  exerciseNames?: Record<UUID, string>,
): PRDelta[] {
  const previous = getBestE1RMs(
    history.filter((s) => s.id !== session.id),
    exerciseNames,
  );
  const current = getBestE1RMs([session], exerciseNames);
  const deltas: PRDelta[] = [];
  for (const [exerciseId, best] of Object.entries(current)) {
    const previousE1RM = previous[exerciseId]?.e1RM;
    if (previousE1RM !== undefined && best.e1RM <= previousE1RM) continue;
    const delta: PRDelta = {
      exerciseId,
      newE1RM: best.e1RM,
      weight: best.weight,
      reps: best.reps,
    };
    if (previousE1RM !== undefined) delta.previousE1RM = previousE1RM;
    deltas.push(delta);
  }
  return deltas;
}
