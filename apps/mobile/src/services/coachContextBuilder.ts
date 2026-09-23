import {
  calculateAge,
  summarizeSessionExercise,
  getProgramScheduleStatus,
  calculateProgramWeek,
  ACHIEVEMENTS,
  UnitSystem,
  ExperienceLevel,
  FitnessGoal,
  BiologicalSex,
  BodyMeasurements,
} from '@fitness-tracker/domain';
import { useProfileStore } from '../stores/profileStore';
import { useBodyMetricStore } from '../stores/bodyMetricStore';
import { useExerciseStore } from '../stores/exerciseStore';
import { useHistoryStore } from '../stores/historyStore';
import { useProgramStore } from '../stores/programStore';
import { useAchievementStore } from '../stores/achievementStore';
import { entitlementService } from './entitlementService';

export interface UserTrainingProfileSummary {
  displayName: string;
  preferredUnits: UnitSystem;
  age?: number | undefined;
  experienceLevel?: ExperienceLevel | undefined;
  fitnessGoal?: FitnessGoal | undefined;
  biologicalSex?: BiologicalSex | undefined;
  heightCm?: number | undefined;
  weightKg?: number | undefined;
  benchPressMaxKg?: number | undefined;
  squatMaxKg?: number | undefined;
  deadliftMaxKg?: number | undefined;
  language?: 'de' | 'en' | undefined;
}

export interface TemplateSummaryItem {
  id: string;
  name: string;
  folder?: string;
  exerciseCount: number;
  exerciseNames: string[];
  totalTargetSets: number;
}

export interface DetailedTemplateView {
  id: string;
  name: string;
  folder?: string | undefined;
  exercises: {
    id: string;
    exerciseId: string;
    name: string;
    targetSets: number;
    targetReps?: string | number | undefined;
    targetRepsMax?: number | undefined;
    targetWeight?: number | undefined;
    targetRpe?: number | undefined;
    targetRir?: number | undefined;
    targetRestSeconds?: number | undefined;
    notes?: string | undefined;
  }[];
}

export interface ProgramSummaryItem {
  id: string;
  name: string;
  description?: string;
  durationWeeks: number;
  isActive: boolean;
  workoutCount: number;
}

export interface DetailedProgramView {
  id: string;
  name: string;
  description?: string;
  durationWeeks: number;
  isActive: boolean;
  workouts: {
    id: string;
    week: number;
    dayOfWeek: number;
    order: number;
    templateId: string;
    templateName: string;
  }[];
}

export interface NextWorkoutScheduleView {
  hasActiveProgram: boolean;
  currentWeek: number;
  isRestDay: boolean;
  isTodayCompleted: boolean;
  todayWorkoutName?: string;
  nextWorkoutName?: string;
  nextWorkoutWeek?: number;
  nextWorkoutDayOfWeek?: number;
}

export interface WorkoutHistorySummaryItem {
  id: string;
  name: string;
  startedAt: string;
  durationMinutes?: number;
  totalVolume: number;
  exerciseCount: number;
  exercises: {
    name: string;
    workingSets: number;
    volume: number;
    topSet?: string;
  }[];
}

export interface ExerciseRecentHistoryItem {
  sessionDate: string;
  sessionName: string;
  workingSets: number;
  topSet?: string;
  volume: number;
}

export interface ExercisePerformanceView {
  exerciseId: string;
  exerciseName: string;
  prWeightKg?: number;
  totalTimesPerformed: number;
  lastPerformedDate?: string;
  estimated1RM?: number;
}

export interface RelevantPRView {
  exerciseId: string;
  exerciseName: string;
  bestWeightKg: number;
}

export interface RelevantMetricsView {
  latestWeightKg?: number | undefined;
  latestRecordedAt?: string | undefined;
  bodyFatPercentage?: number | undefined;
  weightTrend?: { date: string; weightKg: number }[] | undefined;
  measurements?: BodyMeasurements | Record<string, number> | undefined;
}

export interface CurrentTrainingStateView {
  totalWorkouts: number;
  currentStreak: number;
  lastWorkoutDate?: string;
  daysSinceLastWorkout?: number;
  activeProgram?: {
    name: string;
    currentWeek: number;
    durationWeeks: number;
    scheduledWorkouts: number;
  };
}

export interface ResourceIndex {
  templates: { id: string; name: string; exerciseCount: number; folder?: string }[];
  programs: { id: string; name: string; durationWeeks: number; isActive: boolean; workoutCount: number }[];
  activeProgram: {
    id: string;
    name: string;
    currentWeek: number;
    nextWorkoutName?: string;
    nextWorkoutDay?: number;
  } | null;
  frequentlyUsedExercises: { id: string; name: string; sessionCount: number }[];
}

export interface CoachContextPayload {
  resourceIndex: ResourceIndex;
  profile: UserTrainingProfileSummary;
  currentState: CurrentTrainingStateView;
  stats: {
    totalWorkouts: number;
    currentStreak: number;
    latestWeight?: number | undefined;
  };
  achievements?: {
    level: number;
    xp: number;
    unlockedCount: number;
    unlocked: string[];
    nextTargets: string[];
  } | undefined;
  activeProgram?: DetailedProgramView | null | undefined;
  nextProgramWorkout?: NextWorkoutScheduleView | undefined;
  recentWorkouts?: WorkoutHistorySummaryItem[] | undefined;
  matchedTemplates?: DetailedTemplateView[] | undefined;
  matchedExercises?: {
    performance: ExercisePerformanceView;
    history: ExerciseRecentHistoryItem[];
  }[] | undefined;
  personalRecords?: RelevantPRView[] | undefined;
  metrics?: RelevantMetricsView | undefined;
  exerciseCatalog: { id: string; name: string }[];
  [key: string]: unknown;
}

export interface BuildContextOptions {
  mode?: 'fast' | 'plan' | undefined;
  includeAllTemplates?: boolean | undefined;
}

export function formatTopSet(weight?: number, reps?: number, rir?: number, rpe?: number): string | undefined {
  if (!weight && !reps) return undefined;
  const load = weight ? `${Number(weight.toFixed(1))} kg` : 'bodyweight';
  const repText = reps ? ` x ${reps}` : '';
  const effortText =
    rir !== undefined
      ? ` @ ${rir} RIR`
      : rpe !== undefined
        ? ` @ RPE ${Number(rpe.toFixed(1))}`
        : '';
  return `${load}${repText}${effortText}`;
}

export function getUserTrainingProfile(): UserTrainingProfileSummary {
  const profile = useProfileStore.getState().profile;
  const computedAge = calculateAge(profile.dateOfBirth || profile.birthYear);

  return {
    displayName: profile.displayName || 'Athlete',
    preferredUnits: profile.preferredUnits,
    ...(computedAge !== null ? { age: computedAge } : {}),
    ...(profile.experienceLevel !== undefined ? { experienceLevel: profile.experienceLevel } : {}),
    ...(profile.fitnessGoal !== undefined ? { fitnessGoal: profile.fitnessGoal } : {}),
    ...(profile.biologicalSex !== undefined ? { biologicalSex: profile.biologicalSex } : {}),
    ...(profile.heightCm !== undefined ? { heightCm: profile.heightCm } : {}),
    ...(profile.weightKg !== undefined ? { weightKg: profile.weightKg } : {}),
    ...(profile.benchPressMaxKg !== undefined ? { benchPressMaxKg: profile.benchPressMaxKg } : {}),
    ...(profile.squatMaxKg !== undefined ? { squatMaxKg: profile.squatMaxKg } : {}),
    ...(profile.deadliftMaxKg !== undefined ? { deadliftMaxKg: profile.deadliftMaxKg } : {}),
    ...(profile.language !== undefined ? { language: profile.language } : {}),
  };
}

export function getTemplatesSummary(): TemplateSummaryItem[] {
  const templates = useProgramStore.getState().templates.filter((t) => !t.isArchived);
  const exerciseMap = new Map(useExerciseStore.getState().exercises.map((e) => [e.id, e.name]));

  return templates.map((tmpl) => {
    const sortedExercises = [...tmpl.exercises].sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
    return {
      id: tmpl.id,
      name: tmpl.name,
      ...(tmpl.folder ? { folder: tmpl.folder } : {}),
      exerciseCount: tmpl.exercises.length,
      exerciseNames: sortedExercises.map((e) => exerciseMap.get(e.exerciseId) || 'Unknown'),
      totalTargetSets: tmpl.exercises.reduce((sum, e) => sum + (e.targetSets || 0), 0),
    };
  });
}

export function getTemplateById(id: string): DetailedTemplateView | null {
  const tmpl = useProgramStore.getState().templates.find((t) => t.id === id && !t.isArchived);
  if (!tmpl) return null;
  const exerciseMap = new Map(useExerciseStore.getState().exercises.map((e) => [e.id, e.name]));

  return {
    id: tmpl.id,
    name: tmpl.name,
    ...(tmpl.folder ? { folder: tmpl.folder } : {}),
    exercises: [...tmpl.exercises]
      .sort((a, b) => (a.order ?? 0) - (b.order ?? 0))
      .map((e) => ({
        id: e.id,
        exerciseId: e.exerciseId,
        name: exerciseMap.get(e.exerciseId) || 'Unknown exercise',
        targetSets: e.targetSets || 0,
        ...(e.targetReps !== undefined ? { targetReps: e.targetReps } : {}),
        ...(e.targetRepsMax !== undefined ? { targetRepsMax: e.targetRepsMax } : {}),
        ...(e.targetWeight !== undefined ? { targetWeight: e.targetWeight } : {}),
        ...(e.targetRpe !== undefined ? { targetRpe: e.targetRpe } : {}),
        ...(e.targetRir !== undefined ? { targetRir: e.targetRir } : {}),
        ...(e.targetRestSeconds !== undefined ? { targetRestSeconds: e.targetRestSeconds } : {}),
        ...(e.notes ? { notes: e.notes.slice(0, 120) } : {}),
      })),
  };
}

export function getProgramsSummary(): ProgramSummaryItem[] {
  const programs = useProgramStore.getState().programs;
  return programs.map((p) => ({
    id: p.id,
    name: p.name,
    ...(p.description ? { description: p.description.slice(0, 120) } : {}),
    durationWeeks: p.durationWeeks,
    isActive: Boolean(p.isActive),
    workoutCount: p.workouts.length,
  }));
}

export function getProgramById(id: string): DetailedProgramView | null {
  const program = useProgramStore.getState().programs.find((p) => p.id === id);
  if (!program) return null;
  const templateMap = new Map(
    useProgramStore
      .getState()
      .templates.filter((t) => !t.isArchived)
      .map((t) => [t.id, t.name]),
  );

  return {
    id: program.id,
    name: program.name,
    ...(program.description ? { description: program.description.slice(0, 120) } : {}),
    durationWeeks: program.durationWeeks,
    isActive: Boolean(program.isActive),
    workouts: [...program.workouts]
      .sort((a, b) => a.week - b.week || a.dayOfWeek - b.dayOfWeek || a.order - b.order)
      .map((w) => ({
        id: w.id,
        week: w.week,
        dayOfWeek: w.dayOfWeek,
        order: w.order,
        templateId: w.templateId,
        templateName: templateMap.get(w.templateId) || 'Workout',
      })),
  };
}

export function getActiveProgram(): DetailedProgramView | null {
  const program = useProgramStore.getState().programs.find((p) => p.isActive);
  if (!program) return null;
  return getProgramById(program.id);
}

export function getNextProgramWorkout(): NextWorkoutScheduleView {
  const activeProgram = useProgramStore.getState().programs.find((p) => p.isActive);
  const templates = useProgramStore.getState().templates;
  const sessions = useHistoryStore.getState().sessions;
  const status = getProgramScheduleStatus(activeProgram, templates, sessions);

  return {
    hasActiveProgram: status.hasActiveProgram,
    currentWeek: status.currentWeek,
    isRestDay: status.isRestDay,
    isTodayCompleted: status.isTodayCompleted,
    ...(status.todayTemplate ? { todayWorkoutName: status.todayTemplate.name } : {}),
    ...(status.nextTemplate ? { nextWorkoutName: status.nextTemplate.name } : {}),
    ...(status.nextWorkoutWeek !== undefined ? { nextWorkoutWeek: status.nextWorkoutWeek } : {}),
    ...(status.nextWorkoutDayOfWeek !== undefined
      ? { nextWorkoutDayOfWeek: status.nextWorkoutDayOfWeek }
      : {}),
  };
}

export function getWorkoutHistorySummary(limit = 5): WorkoutHistorySummaryItem[] {
  const sessions = useHistoryStore.getState().getSessionsByDateDesc().slice(0, limit);
  const exerciseMap = new Map(useExerciseStore.getState().exercises.map((e) => [e.id, e.name]));

  return sessions.map((session) => {
    const exerciseSummaries = session.exercises.slice(0, 8).map((sessionExercise) => {
      const summary = summarizeSessionExercise(sessionExercise);
      const workingSets = sessionExercise.sets.filter(
        (set) => set.completed && set.type !== 'warmup',
      );
      const topSet = workingSets
        .filter((set) => set.weight || set.reps)
        .sort((a, b) => (b.weight || 0) - (a.weight || 0) || (b.reps || 0) - (a.reps || 0))
        .at(0);
      const topSetText = topSet
        ? formatTopSet(topSet.weight, topSet.reps, topSet.rir, topSet.rpe)
        : undefined;

      return {
        name: exerciseMap.get(sessionExercise.exerciseId) || 'Unknown exercise',
        workingSets: workingSets.length,
        volume: Math.round(summary.totalVolume),
        ...(topSetText ? { topSet: topSetText } : {}),
      };
    });

    return {
      id: session.id,
      name: session.name,
      startedAt: session.startedAt.toISOString(),
      ...(session.durationSeconds !== undefined
        ? { durationMinutes: Math.round(session.durationSeconds / 60) }
        : {}),
      totalVolume: exerciseSummaries.reduce((sum, e) => sum + (e.volume || 0), 0),
      exerciseCount: session.exercises.length,
      exercises: exerciseSummaries,
    };
  });
}

export function getRecentExerciseHistory(exerciseId: string, limit = 5): ExerciseRecentHistoryItem[] {
  const sessions = useHistoryStore.getState().getSessionsByDateDesc();
  const history: ExerciseRecentHistoryItem[] = [];

  for (const session of sessions) {
    if (history.length >= limit) break;
    const sessionExercise = session.exercises.find((e) => e.exerciseId === exerciseId);
    if (!sessionExercise) continue;

    const summary = summarizeSessionExercise(sessionExercise);
    const workingSets = sessionExercise.sets.filter(
      (set) => set.completed && set.type !== 'warmup',
    );
    const topSet = workingSets
      .filter((set) => set.weight || set.reps)
      .sort((a, b) => (b.weight || 0) - (a.weight || 0) || (b.reps || 0) - (a.reps || 0))
      .at(0);
    const topSetText = topSet
      ? formatTopSet(topSet.weight, topSet.reps, topSet.rir, topSet.rpe)
      : undefined;

    history.push({
      sessionDate: session.startedAt.toISOString().split('T')[0] ?? '',
      sessionName: session.name,
      workingSets: workingSets.length,
      ...(topSetText ? { topSet: topSetText } : {}),
      volume: Math.round(summary.totalVolume),
    });
  }

  return history;
}

export function getExercisePerformance(exerciseId: string): ExercisePerformanceView {
  const exercises = useExerciseStore.getState().exercises;
  const exercise = exercises.find((e) => e.id === exerciseId);
  const exerciseName = exercise?.name || 'Exercise';

  const prs = useHistoryStore.getState().getPRs();
  const prWeightKg = prs[exerciseId];

  const sessions = useHistoryStore.getState().sessions;
  let totalTimes = 0;
  let lastDate: Date | null = null;
  let estimated1RM: number | undefined;

  for (const session of sessions) {
    const se = session.exercises.find((e) => e.exerciseId === exerciseId);
    if (se) {
      totalTimes++;
      if (!lastDate || session.startedAt > lastDate) {
        lastDate = session.startedAt;
      }
      for (const set of se.sets) {
        if (set.completed && set.weight && set.reps && set.reps > 0) {
          const current1RM = set.weight * (1 + set.reps / 30);
          if (current1RM > (estimated1RM || 0)) {
            estimated1RM = Math.round(current1RM * 10) / 10;
          }
        }
      }
    }
  }

  return {
    exerciseId,
    exerciseName,
    ...(prWeightKg !== undefined ? { prWeightKg } : {}),
    totalTimesPerformed: totalTimes,
    ...(lastDate ? { lastPerformedDate: lastDate.toISOString().split('T')[0] } : {}),
    ...(estimated1RM !== undefined ? { estimated1RM } : {}),
  };
}

export function getRelevantPRs(exerciseIds?: string[]): RelevantPRView[] {
  const personalRecords = useHistoryStore.getState().getPRs();
  const exerciseMap = new Map(useExerciseStore.getState().exercises.map((e) => [e.id, e.name]));

  const entries = Object.entries(personalRecords);
  const filtered = exerciseIds
    ? entries.filter(([id]) => exerciseIds.includes(id))
    : entries.slice(0, 10);

  return filtered.map(([exerciseId, bestWeightKg]) => ({
    exerciseId,
    exerciseName: exerciseMap.get(exerciseId) || 'Exercise',
    bestWeightKg,
  }));
}

export function getRelevantMetrics(): RelevantMetricsView {
  const metricStore = useBodyMetricStore.getState();
  const latest = metricStore.getLatestMetric();
  const weightHistory = metricStore.getMetricHistory('weight').slice(-5);

  return {
    ...(latest?.weightKg !== undefined ? { latestWeightKg: latest.weightKg } : {}),
    ...(latest?.recordedAt
      ? { latestRecordedAt: new Date(latest.recordedAt).toISOString().split('T')[0] }
      : {}),
    ...(latest?.bodyFatPercentage !== undefined ? { bodyFatPercentage: latest.bodyFatPercentage } : {}),
    ...(weightHistory.length > 0
      ? {
          weightTrend: weightHistory.map((m) => ({
            date: new Date(m.recordedAt).toISOString().split('T')[0] ?? '',
            weightKg: m.weightKg ?? 0,
          })),
        }
      : {}),
    ...(latest?.measurements ? { measurements: latest.measurements } : {}),
  };
}

export function getCurrentTrainingState(): CurrentTrainingStateView {
  const stats = useProfileStore.getState().getStatistics();
  const sessions = useHistoryStore.getState().getSessionsByDateDesc();
  const lastSession = sessions[0];
  const activeProgram = useProgramStore.getState().programs.find((p) => p.isActive);

  let daysSince: number | undefined;
  if (lastSession) {
    const now = new Date();
    const diffMs = now.getTime() - new Date(lastSession.startedAt).getTime();
    daysSince = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  }

  return {
    totalWorkouts: stats.totalWorkouts || 0,
    currentStreak: stats.currentStreak || 0,
    ...(lastSession ? { lastWorkoutDate: lastSession.startedAt.toISOString().split('T')[0] } : {}),
    ...(daysSince !== undefined ? { daysSinceLastWorkout: daysSince } : {}),
    ...(activeProgram
      ? {
          activeProgram: {
            name: activeProgram.name,
            currentWeek: calculateProgramWeek(
              activeProgram.startedAt,
              new Date(),
              activeProgram.durationWeeks,
            ),
            durationWeeks: activeProgram.durationWeeks,
            scheduledWorkouts: activeProgram.workouts.length,
          },
        }
      : {}),
  };
}

export function buildResourceIndex(): ResourceIndex {
  const templates = useProgramStore.getState().templates;
  const programs = useProgramStore.getState().programs;
  const activeProgram = programs.find((p) => p.isActive) || null;
  const sessions = useHistoryStore.getState().sessions;
  const exerciseMap = new Map(useExerciseStore.getState().exercises.map((e) => [e.id, e.name]));

  const exerciseCounts: Record<string, number> = {};
  for (const session of sessions) {
    for (const ex of session.exercises) {
      exerciseCounts[ex.exerciseId] = (exerciseCounts[ex.exerciseId] || 0) + 1;
    }
  }

  const topExercises = Object.entries(exerciseCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 8)
    .map(([id, sessionCount]) => ({
      id,
      name: exerciseMap.get(id) || 'Exercise',
      sessionCount,
    }));

  let activeProgramSummary: ResourceIndex['activeProgram'] = null;
  if (activeProgram) {
    const schedule = getProgramScheduleStatus(activeProgram, templates, sessions);
    activeProgramSummary = {
      id: activeProgram.id,
      name: activeProgram.name,
      currentWeek: schedule.currentWeek,
      ...(schedule.nextTemplate ? { nextWorkoutName: schedule.nextTemplate.name } : {}),
      ...(schedule.nextWorkoutDayOfWeek !== undefined
        ? { nextWorkoutDay: schedule.nextWorkoutDayOfWeek }
        : {}),
    };
  }

  return {
    templates: templates
      .filter((t) => !t.isArchived)
      .map((t) => ({
        id: t.id,
        name: t.name,
        exerciseCount: t.exercises.length,
        ...(t.folder ? { folder: t.folder } : {}),
      })),
    programs: programs.map((p) => ({
      id: p.id,
      name: p.name,
      durationWeeks: p.durationWeeks,
      isActive: Boolean(p.isActive),
      workoutCount: p.workouts.length,
    })),
    activeProgram: activeProgramSummary,
    frequentlyUsedExercises: topExercises,
  };
}

export function buildContextForQuery(
  query: string,
  options: BuildContextOptions = {},
): CoachContextPayload {
  const tier = entitlementService.getTier();

  if (tier === 'free') {
    throw new Error('COACH_LOCKED: AI Coach requires EVARO Coach subscription.');
  }

  const profile = getUserTrainingProfile();
  const currentState = getCurrentTrainingState();
  const resourceIndex = buildResourceIndex();
  const exerciseCatalog = useExerciseStore
    .getState()
    .exercises.map(({ id, name }) => ({ id, name }));

  const latestWeight = useBodyMetricStore.getState().getLatestMetric()?.weightKg;
  const stats = {
    totalWorkouts: currentState.totalWorkouts,
    currentStreak: currentState.currentStreak,
    ...(latestWeight !== undefined ? { latestWeight } : {}),
  };

  // PRO preview tier: reduced context
  if (tier === 'pro') {
    return {
      resourceIndex,
      profile,
      currentState,
      stats,
      recentWorkouts: getWorkoutHistorySummary(2),
      exerciseCatalog,
    };
  }

  // COACH tier: full selective retrieval
  const q = query.toLowerCase();
  const allExercises = useExerciseStore.getState().exercises;
  const allTemplates = useProgramStore.getState().templates.filter((t) => !t.isArchived);

  // 1. Keyword extraction: Exercises
  const matchedExerciseIds: string[] = [];
  const matchedExercises: CoachContextPayload['matchedExercises'] = [];

  for (const ex of allExercises) {
    if (matchedExercises.length >= 5) break;
    const nameLower = ex.name.toLowerCase();
    if (nameLower.length > 3 && q.includes(nameLower)) {
      matchedExerciseIds.push(ex.id);
      matchedExercises.push({
        performance: getExercisePerformance(ex.id),
        history: getRecentExerciseHistory(ex.id, 5),
      });
    }
  }

  // 2. Keyword extraction: Templates
  const matchedTemplates: DetailedTemplateView[] = [];
  for (const tmpl of allTemplates) {
    if (matchedTemplates.length >= 3) break;
    const nameLower = tmpl.name.toLowerCase();
    if (options.includeAllTemplates || (nameLower.length > 3 && q.includes(nameLower))) {
      const detailed = getTemplateById(tmpl.id);
      if (detailed) matchedTemplates.push(detailed);
    }
  }

  // 3. Keyword extraction: Programs / Schedules
  const programKeywords = [
    'programm',
    'program',
    'plan',
    'split',
    'woche',
    'week',
    'heute',
    'today',
    'morgen',
    'tomorrow',
    'nächste',
    'next',
  ];
  const wantsProgram =
    options.mode === 'plan' || programKeywords.some((kw) => q.includes(kw));
  const activeProgram = wantsProgram ? getActiveProgram() : null;
  const nextProgramWorkout = wantsProgram ? getNextProgramWorkout() : undefined;

  // 4. Keyword extraction: Metrics
  const metricKeywords = [
    'gewicht',
    'weight',
    'körper',
    'body',
    'metrik',
    'metric',
    'waage',
    'kfa',
    'fat',
    'abnehmen',
    'zunehmen',
    'kalorien',
  ];
  const wantsMetrics = metricKeywords.some((kw) => q.includes(kw));
  const metrics = wantsMetrics ? getRelevantMetrics() : undefined;

  // 5. Keyword extraction: PRs / Performance
  const prKeywords = ['pr', 'rekord', 'record', 'max', 'kraft', 'stärker'];
  const wantsPRs =
    prKeywords.some((kw) => q.includes(kw)) || matchedExerciseIds.length > 0;
  const personalRecords = wantsPRs
    ? getRelevantPRs(matchedExerciseIds.length > 0 ? matchedExerciseIds : undefined)
    : undefined;

  // 6. Workout History
  const historyLimit = options.mode === 'plan' ? 5 : 3;
  const recentWorkouts = getWorkoutHistorySummary(historyLimit);

  // 7. Gamification
  const achievementState = useAchievementStore.getState();
  const unlockedIds = new Set(Object.keys(achievementState.unlockedAchievements));
  const unlocked = ACHIEVEMENTS.filter((a) => unlockedIds.has(a.id)).map((a) => a.name);
  const nextTargets = ACHIEVEMENTS.filter((a) => !unlockedIds.has(a.id))
    .slice(0, 6)
    .map((a) => `${a.name}: ${a.description}`);

  return {
    resourceIndex,
    profile,
    currentState,
    stats,
    achievements: {
      level: achievementState.level,
      xp: achievementState.xp,
      unlockedCount: unlocked.length,
      unlocked,
      nextTargets,
    },
    ...(activeProgram ? { activeProgram } : {}),
    ...(nextProgramWorkout ? { nextProgramWorkout } : {}),
    recentWorkouts,
    ...(matchedTemplates.length > 0 ? { matchedTemplates } : {}),
    ...(matchedExercises.length > 0 ? { matchedExercises } : {}),
    ...(personalRecords && personalRecords.length > 0 ? { personalRecords } : {}),
    ...(metrics ? { metrics } : {}),
    exerciseCatalog,
  };
}

export const coachContextBuilder = {
  getUserTrainingProfile,
  getTemplatesSummary,
  getTemplateById,
  getProgramsSummary,
  getProgramById,
  getActiveProgram,
  getNextProgramWorkout,
  getWorkoutHistorySummary,
  getRecentExerciseHistory,
  getExercisePerformance,
  getRelevantPRs,
  getRelevantMetrics,
  getCurrentTrainingState,
  buildResourceIndex,
  buildContextForQuery,
};
