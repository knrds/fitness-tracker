export type ResumeWorkoutDecision = 'ignore' | 'clear' | 'prompt';

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

export function getResumeWorkoutDecision({
  status,
  startedAt,
  exercises = [],
  now = Date.now(),
  staleAfterHours = 12,
}: ResumeWorkoutGuardInput): ResumeWorkoutDecision {
  if (status !== 'active' && status !== 'paused') {
    return 'ignore';
  }

  const startedTime = startedAt ? new Date(startedAt) : null;
  const hasValidStart = startedTime !== null && !Number.isNaN(startedTime.getTime());
  const hasWorkoutContent = exercises.length > 0;

  if (!hasValidStart || !hasWorkoutContent) {
    return 'clear';
  }

  // Only resume if at least one set in the workout has been marked completed
  const hasCompletedSet = exercises.some(
    (ex) => ex && Array.isArray(ex.sets) && ex.sets.some((s) => s && s.completed === true),
  );

  if (!hasCompletedSet) {
    return 'clear';
  }

  const hoursElapsed = (now - startedTime.getTime()) / (1000 * 60 * 60);
  return hoursElapsed > staleAfterHours ? 'clear' : 'prompt';
}
