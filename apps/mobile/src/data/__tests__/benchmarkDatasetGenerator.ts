import { WorkoutSession, ExerciseSet, BodyMetric, Program, WorkoutTemplate } from '@fitness-tracker/domain';

/**
 * Development & Test utility for generating large-scale synthetic datasets.
 * STRICTLY FOR TESTING AND BENCHMARKING — NEVER SHIPPED IN PRODUCTION RUNTIME.
 */

const SAMPLE_EXERCISE_IDS = [
  'bench-press',
  'squat',
  'deadlift',
  'overhead-press',
  'barbell-row',
  'pull-up',
  'romanian-deadlift',
  'incline-dumbbell-press',
  'lateral-raise',
  'cable-fly',
];

export function generateBenchmarkWorkouts(workoutCount: number, setsPerExercise = 4): WorkoutSession[] {
  const sessions: WorkoutSession[] = [];
  const baseTime = new Date('2024-01-01T08:00:00.000Z').getTime();
  const dayMs = 24 * 60 * 60 * 1000;

  for (let i = 0; i < workoutCount; i++) {
    const workoutDate = new Date(baseTime + i * dayMs * 1.5);
    const exerciseCount = 3 + (i % 3); // 3 to 5 exercises per workout
    const exercises = [];

    for (let e = 0; e < exerciseCount; e++) {
      const exerciseId = SAMPLE_EXERCISE_IDS[(i + e) % SAMPLE_EXERCISE_IDS.length] ?? 'bench-press';
      const sets: ExerciseSet[] = [];

      for (let s = 1; s <= setsPerExercise; s++) {
        sets.push({
          id: `bm-set-${i}-${e}-${s}`,
          setNumber: s,
          type: s === 1 ? 'warmup' : 'working',
          weight: 60 + ((i + e * 5) % 80),
          reps: 8 + ((i + s) % 5),
          rpe: 7 + ((i + s) % 3),
          rir: 2,
          completed: true,
          durationSeconds: 45,
        });
      }

      exercises.push({
        id: `bm-se-${i}-${e}`,
        exerciseId,
        order: e,
        ...(e === 0 ? { notes: 'Felt strong today' } : {}),
        sets,
      });
    }

    sessions.push({
      id: `bm-session-${i}`,
      userId: 'bench-user-1',
      name: i % 2 === 0 ? 'Push Strength A' : 'Pull Hypertrophy B',
      startedAt: workoutDate,
      completedAt: new Date(workoutDate.getTime() + 4500 * 1000),
      durationSeconds: 4500,
      createdAt: workoutDate,
      updatedAt: workoutDate,
      exercises,
    });
  }

  return sessions;
}

export function generateBenchmarkMetrics(metricCount: number): BodyMetric[] {
  const metrics: BodyMetric[] = [];
  const baseTime = new Date('2024-01-01T07:00:00.000Z').getTime();
  const dayMs = 24 * 60 * 60 * 1000;

  for (let i = 0; i < metricCount; i++) {
    const recordedAt = new Date(baseTime + i * dayMs * 2);
    metrics.push({
      id: `bm-metric-${i}`,
      userId: 'bench-user-1',
      recordedAt,
      weightKg: 80 + Math.sin(i / 10) * 4,
      bodyFatPercentage: 15 - (i / metricCount) * 3,
      measurements: {
        waist: 85 - (i / metricCount) * 2,
        chest: 105 + (i / metricCount) * 2,
      },
      createdAt: recordedAt,
    });
  }

  return metrics;
}

export function generateBenchmarkTemplates(templateCount: number): WorkoutTemplate[] {
  const templates: WorkoutTemplate[] = [];
  const now = new Date();

  for (let i = 0; i < templateCount; i++) {
    templates.push({
      id: `bm-template-${i}`,
      userId: 'bench-user-1',
      name: `Template Routine ${i + 1}`,
      isArchived: false,
      createdAt: now,
      updatedAt: now,
      exercises: [
        {
          id: `bm-te-${i}-0`,
          order: 0,
          exerciseId: SAMPLE_EXERCISE_IDS[i % SAMPLE_EXERCISE_IDS.length] ?? 'bench-press',
          targetSets: 4,
          targetReps: 10,
          targetWeight: 75,
        },
      ],
    });
  }

  return templates;
}

export function generateBenchmarkPrograms(programCount: number): Program[] {
  const programs: Program[] = [];
  const now = new Date();

  for (let i = 0; i < programCount; i++) {
    programs.push({
      id: `bm-prog-${i}`,
      userId: 'bench-user-1',
      name: `Powerbuilding Cycle ${i + 1}`,
      description: 'Progressive overload periodization program',
      durationWeeks: 8,
      isActive: i === 0,
      workouts: [],
      createdAt: now,
      updatedAt: now,
    });
  }

  return programs;
}
