export type ResumeWorkoutDecision = 'ignore' | 'prompt';

interface GuardSet {
  completed?: boolean;
}

interface GuardExercise {
  sets?: GuardSet[];
}

interface ResumeWorkoutGuardInput {
  status: string;
  startedAt?: Date | string | null | undefined;
  exercises?: readonly GuardExercise[];
  name?: string;
  notes?: string | null;
  now?: number;
  staleAfterHours?: number;
}

/** Age and completion never authorize discarding user input. */
export function getResumeWorkoutDecision({
  status,
}: ResumeWorkoutGuardInput): ResumeWorkoutDecision {
  return status === 'active' || status === 'paused' ? 'prompt' : 'ignore';
}
