import { Program, ProgramWorkout, WorkoutTemplate, WorkoutSession } from '../types';

export interface ProgramScheduleStatus {
  hasActiveProgram: boolean;
  program: Program | null;
  currentWeek: number;
  durationWeeks: number;
  isCompleted: boolean;
  isRestDay: boolean;
  isTodayCompleted: boolean;
  todayWorkout: ProgramWorkout | null;
  todayTemplate: WorkoutTemplate | null;
  nextWorkout: ProgramWorkout | null;
  nextTemplate: WorkoutTemplate | null;
  nextWorkoutWeek?: number | undefined;
  nextWorkoutDayOfWeek?: number | undefined;
  completedWorkoutsCount: number;
  totalWorkoutsCount: number;
}

/**
 * Normalizes a Date to midnight (00:00:00.000) in local time.
 */
export function startOfDay(date: Date): Date {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
}

/**
 * Returns the ISO day of the week: 1 (Monday) to 7 (Sunday).
 */
export function getDayOfWeek(date: Date): number {
  const day = date.getDay();
  return day === 0 ? 7 : day;
}

/**
 * Calculates current program week based on start date.
 * If no start date exists, defaults to week 1.
 */
export function calculateProgramWeek(
  startedAt: Date | string | undefined,
  currentDate: Date,
  _durationWeeks: number,
): number {
  if (!startedAt) return 1;
  const start = startOfDay(new Date(startedAt));
  const current = startOfDay(currentDate);
  // Calendar days can contain 23 or 25 hours around daylight-saving changes.
  const diffDays = Math.round(
    (Date.UTC(current.getFullYear(), current.getMonth(), current.getDate()) -
      Date.UTC(start.getFullYear(), start.getMonth(), start.getDate())) /
      86400000,
  );
  if (diffDays < 0) return 1;
  const week = Math.floor(diffDays / 7) + 1;
  return week;
}

/**
 * Evaluates the schedule status of an active program against completed sessions.
 */
export function getProgramScheduleStatus(
  program: Program | null | undefined,
  templates: WorkoutTemplate[],
  sessions: WorkoutSession[] = [],
  currentDate: Date = new Date(),
): ProgramScheduleStatus {
  if (!program || !program.isActive) {
    return {
      hasActiveProgram: false,
      program: null,
      currentWeek: 1,
      durationWeeks: 1,
      isCompleted: false,
      isRestDay: true,
      isTodayCompleted: false,
      todayWorkout: null,
      todayTemplate: null,
      nextWorkout: null,
      nextTemplate: null,
      completedWorkoutsCount: 0,
      totalWorkoutsCount: 0,
    };
  }

  const durationWeeks = Math.max(1, program.durationWeeks || 1);
  const currentWeek = calculateProgramWeek(program.startedAt, currentDate, durationWeeks);
  const isCompleted = currentWeek > durationWeeks;
  const todayDayOfWeek = getDayOfWeek(currentDate);

  const templateMap = new Map<string, WorkoutTemplate>();
  for (const t of templates) {
    templateMap.set(t.id, t);
  }

  // Count total workouts in the entire program
  const totalWorkoutsCount = program.workouts.length;

  // Completed sessions belonging to this program
  const programSessions = sessions.filter(
    (s) =>
      s.programId === program.id &&
      s.completedAt &&
      Number.isFinite(new Date(s.completedAt).getTime()),
  );
  const completedWorkoutsCount = programSessions.length;

  // Workouts scheduled for today (currentWeek, todayDayOfWeek)
  const todaysWorkouts = program.workouts
    .filter((w) => w.week === currentWeek && w.dayOfWeek === todayDayOfWeek)
    .sort((a, b) => a.order - b.order);

  // Match each finished session to at most one scheduled slot on its local day.
  // Repeating a template twice in one day still requires two completed sessions.
  const todayStart = startOfDay(currentDate).getTime();
  const tomorrow = startOfDay(currentDate);
  tomorrow.setDate(tomorrow.getDate() + 1);
  const programStart = program.startedAt ? new Date(program.startedAt).getTime() : -Infinity;
  const remainingSessions = programSessions.filter((session) => {
    const sessionTime = new Date(session.startedAt).getTime();
    return (
      sessionTime >= todayStart && sessionTime < tomorrow.getTime() && sessionTime >= programStart
    );
  });
  const remainingWorkouts = todaysWorkouts.filter((workout) => {
    const template = templateMap.get(workout.templateId);
    const matchingSessionIndex = remainingSessions.findIndex((session) =>
      session.templateId
        ? session.templateId === workout.templateId
        : template !== undefined && session.name === template.name,
    );
    if (matchingSessionIndex < 0) return true;
    remainingSessions.splice(matchingSessionIndex, 1);
    return false;
  });
  const isTodayCompleted = todaysWorkouts.length > 0 && remainingWorkouts.length === 0;
  // Keep the completed day's identity available instead of replacing it with a future slot.
  const todayWorkout = remainingWorkouts[0] ?? todaysWorkouts[0] ?? null;
  const todayTemplate = todayWorkout ? (templateMap.get(todayWorkout.templateId) ?? null) : null;

  const isRestDay = !todayWorkout || isTodayCompleted || isCompleted;

  // Find next upcoming workout:
  // 1. If today has a workout that is NOT completed, today is the next workout
  // 2. Otherwise, look for the next scheduled workout chronologically (from current day+1 in current week, then future weeks)
  let nextWorkout: ProgramWorkout | null = null;
  let nextWorkoutWeek: number | undefined = undefined;
  let nextWorkoutDayOfWeek: number | undefined = undefined;

  if (todayWorkout && !isTodayCompleted && !isCompleted) {
    nextWorkout = todayWorkout;
    nextWorkoutWeek = currentWeek;
    nextWorkoutDayOfWeek = todayDayOfWeek;
  } else if (!isCompleted) {
    // Search remaining days in current week, then next weeks up to durationWeeks
    const sortedWorkouts = [...program.workouts].sort((a, b) => {
      if (a.week !== b.week) return a.week - b.week;
      if (a.dayOfWeek !== b.dayOfWeek) return a.dayOfWeek - b.dayOfWeek;
      return a.order - b.order;
    });

    const upcoming = sortedWorkouts.find((w) => {
      if (w.week === currentWeek) {
        return w.dayOfWeek > todayDayOfWeek;
      }
      return w.week > currentWeek;
    });

    if (upcoming) {
      nextWorkout = upcoming;
      nextWorkoutWeek = upcoming.week;
      nextWorkoutDayOfWeek = upcoming.dayOfWeek;
    } else if (sortedWorkouts.length > 0 && currentWeek < durationWeeks && sortedWorkouts[0]) {
      // If no further workouts scheduled in the rest of this week/future weeks,
      // but the program duration has not ended, wrap around to the first scheduled workout for the next week
      const firstWorkout = sortedWorkouts[0];
      nextWorkout = firstWorkout;
      nextWorkoutWeek = currentWeek + 1;
      nextWorkoutDayOfWeek = firstWorkout.dayOfWeek;
    } else {
      nextWorkout = null;
    }
  }

  const nextTemplate = nextWorkout ? (templateMap.get(nextWorkout.templateId) ?? null) : null;

  return {
    hasActiveProgram: true,
    program,
    currentWeek: Math.min(currentWeek, durationWeeks),
    durationWeeks,
    isCompleted,
    isRestDay,
    isTodayCompleted,
    todayWorkout,
    todayTemplate,
    nextWorkout,
    nextTemplate,
    nextWorkoutWeek,
    nextWorkoutDayOfWeek,
    completedWorkoutsCount,
    totalWorkoutsCount,
  };
}
