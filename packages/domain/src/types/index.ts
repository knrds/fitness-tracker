/**
 * @fitness-tracker/domain — Type definitions
 *
 * Pure TypeScript domain model for the fitness tracker. No React, no platform
 * dependencies. These interfaces are the single source of truth for the shape
 * of data flowing through the app, the API layer, and persistence.
 *
 * Companion Zod schemas live in `../schemas`. The PostgreSQL/Supabase schema
 * lives in `docs/schema.sql` and mirrors these structures.
 */

// ---------------------------------------------------------------------------
// Primitives & shared aliases
// ---------------------------------------------------------------------------

/** A UUID (v4) primary key. Branded only nominally — it's a `string` at runtime. */
export type UUID = string;

/** An ISO-8601 timestamp materialised as a JS `Date` once parsed. */
export type Timestamp = Date;

/** Unit system the user has opted into for display & input. */
export type UnitSystem = 'metric' | 'imperial';

/** Unit a weight value is expressed in. */
export type WeightUnit = 'kg' | 'lb';

/** Unit a distance value is expressed in. */
export type DistanceUnit = 'km' | 'mi' | 'm';

// ---------------------------------------------------------------------------
// Enums — Exercise taxonomy
// ---------------------------------------------------------------------------

/**
 * Primary and secondary muscles an exercise targets.
 * Used for filtering, volume tracking, and weekly muscle-group balance.
 */
export enum MuscleGroup {
  Chest = 'chest',
  UpperBack = 'upper_back',
  Lats = 'lats',
  LowerBack = 'lower_back',
  Traps = 'traps',
  FrontDelts = 'front_delts',
  SideDelts = 'side_delts',
  RearDelts = 'rear_delts',
  Biceps = 'biceps',
  Triceps = 'triceps',
  Forearms = 'forearms',
  Quads = 'quads',
  Hamstrings = 'hamstrings',
  Glutes = 'glutes',
  Calves = 'calves',
  Abs = 'abs',
  Obliques = 'obliques',
  Neck = 'neck',
  FullBody = 'full_body',
}

/** Equipment required to perform an exercise. */
export enum Equipment {
  Barbell = 'barbell',
  Dumbbell = 'dumbbell',
  Kettlebell = 'kettlebell',
  Machine = 'machine',
  Cable = 'cable',
  SmithMachine = 'smith_machine',
  EzBar = 'ez_bar',
  ResistanceBand = 'resistance_band',
  Bodyweight = 'bodyweight',
  Plate = 'plate',
  MedicineBall = 'medicine_ball',
  Trx = 'trx',
  Cardio = 'cardio_machine',
  Other = 'other',
}

/**
 * The fundamental movement pattern an exercise expresses. Useful for program
 * design (balancing push/pull, ensuring each pattern is trained).
 */
export enum MovementPattern {
  HorizontalPush = 'horizontal_push',
  VerticalPush = 'vertical_push',
  HorizontalPull = 'horizontal_pull',
  VerticalPull = 'vertical_pull',
  Squat = 'squat',
  Hinge = 'hinge',
  Lunge = 'lunge',
  Carry = 'carry',
  Rotation = 'rotation',
  Isolation = 'isolation',
  Core = 'core',
  Cardio = 'cardio',
}

// ---------------------------------------------------------------------------
// Enums — Training metadata
// ---------------------------------------------------------------------------

/** Self-reported lifting experience, used to tailor defaults & suggestions. */
export type ExperienceLevel = 'beginner' | 'intermediate' | 'advanced';

/** The user's biological sex, relevant for body-metric reference ranges. */
export type BiologicalSex = 'male' | 'female' | 'other' | 'prefer_not_to_say';

/** High-level training objective driving program recommendations. */
export type FitnessGoal =
  | 'build_muscle'
  | 'gain_strength'
  | 'lose_fat'
  | 'improve_endurance'
  | 'general_fitness'
  | 'athletic_performance';

/** Classifies a logged set so analytics can exclude warm-ups from volume, etc. */
export type SetType = 'warmup' | 'working' | 'drop' | 'failure' | 'amrap' | 'backoff';

/** What a personal record measures. */
export type PersonalRecordType =
  | 'one_rep_max'
  | 'estimated_one_rep_max'
  | 'max_weight'
  | 'max_reps'
  | 'max_volume'
  | 'best_time'
  | 'max_distance';

/** Lifecycle of the live workout currently being performed. */
export type ActiveWorkoutStatus = 'idle' | 'active' | 'paused' | 'resting' | 'finished';

// ---------------------------------------------------------------------------
// User
// ---------------------------------------------------------------------------

/**
 * An authenticated account holder. Maps 1:1 to a Supabase `auth.users` row via
 * `id`; the columns here live in a public `users` profile table.
 */
export interface User {
  /** Matches `auth.users.id` in Supabase. */
  id: UUID;
  /** Unique login email. */
  email: string;
  /** Public-facing name shown in the UI. */
  displayName: string;
  /** Optional avatar image URL. */
  avatarUrl?: string;
  /** Used to compute age for reference ranges; not displayed publicly. */
  dateOfBirth?: Timestamp;
  /** Biological sex for body-metric reference ranges. */
  biologicalSex?: BiologicalSex;
  /** Standing height in centimetres (stored canonically in metric). */
  heightCm?: number;
  /** Preferred display unit system. Defaults to metric. */
  preferredUnits: UnitSystem;
  /** Primary training objective. */
  fitnessGoal?: FitnessGoal;
  /** Self-reported experience level. */
  experienceLevel?: ExperienceLevel;
  /** Account creation timestamp. */
  createdAt: Timestamp;
  /** Last profile-update timestamp. */
  updatedAt: Timestamp;
}

// ---------------------------------------------------------------------------
// Exercise
// ---------------------------------------------------------------------------

/**
 * A movement that can be logged. Either a built-in library exercise
 * (`ownerId` null) or a user-authored custom one (`ownerId` set).
 */
export interface Exercise {
  id: UUID;
  /** Display name, e.g. "Barbell Bench Press". */
  name: string;
  /** Optional coaching cues / how-to instructions. */
  instructions?: string;
  /** Muscles the exercise primarily loads. At least one. */
  primaryMuscles: MuscleGroup[];
  /** Muscles recruited as synergists/stabilisers. */
  secondaryMuscles: MuscleGroup[];
  /** Equipment needed to perform it. */
  equipment: Equipment;
  /** Fundamental movement pattern. */
  movementPattern: MovementPattern;
  /**
   * Whether this is a custom exercise authored by a user. When `true`,
   * `ownerId` identifies the author; when `false` it is part of the shared
   * library and `ownerId` is undefined.
   */
  isCustom: boolean;
  /** Owner for custom exercises; undefined for the shared library. */
  ownerId?: UUID;
  /** Whether the exercise is single-limb (logged per side). */
  isUnilateral?: boolean;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

// ---------------------------------------------------------------------------
// ExerciseSet
// ---------------------------------------------------------------------------

/**
 * A single logged set within a {@link SessionExercise}. The atomic unit of
 * training volume. All performance fields are optional because a set may be
 * planned-but-not-yet-performed, or measured differently (time/distance for
 * cardio vs. weight/reps for lifting).
 */
export interface ExerciseSet {
  id: UUID;
  /** 1-based ordering of this set within its parent exercise entry. */
  setNumber: number;
  /** Classification used by analytics (warm-ups excluded from working volume). */
  type: SetType;
  /** Load lifted, in the user's `preferredUnits` weight unit. */
  weight?: number;
  /** Repetitions completed. */
  reps?: number;
  /**
   * Rate of Perceived Exertion on the 1–10 RPE scale (10 = no reps in reserve).
   * Mutually informative with {@link rir}.
   */
  rpe?: number;
  /** Reps In Reserve, 0–5 (0 = to failure). */
  rir?: number;
  /** Rest taken after this set, in seconds. */
  restSeconds?: number;
  /** Duration for timed work (planks, cardio intervals), in seconds. */
  durationSeconds?: number;
  /** Distance for cardio work, in metres. */
  distanceMeters?: number;
  /** Free-text note for this set. */
  notes?: string;
  /** Whether the set has been performed (vs. merely prescribed). */
  completed: boolean;
  /** When the set was marked complete. */
  completedAt?: Timestamp;
}

// ---------------------------------------------------------------------------
// Workout session (a performed workout)
// ---------------------------------------------------------------------------

/**
 * One exercise as it appears inside a performed {@link WorkoutSession}:
 * a reference to the exercise plus the sets actually logged against it.
 */
export interface SessionExercise {
  id: UUID;
  /** The exercise being performed. */
  exerciseId: UUID;
  /** Position of this exercise within the session. */
  order: number;
  /** Sets logged for this exercise, in order. */
  sets: ExerciseSet[];
  /** Superset grouping key; entries sharing a value are supersetted. */
  supersetGroup?: string;
  /** Exercise-level notes for this session. */
  notes?: string;
}

/**
 * A completed or in-progress training session — the historical record of what
 * was actually done, when, and how it felt. Optionally derived from a template
 * and/or scheduled by a program.
 */
export interface WorkoutSession {
  id: UUID;
  /** Owning user. */
  userId: UUID;
  /** Template this session was started from, if any. */
  templateId?: UUID;
  /** Program this session belongs to, if any. */
  programId?: UUID;
  /** Session title, e.g. "Push Day A". */
  name: string;
  /** When the session began. */
  startedAt: Timestamp;
  /** When the session ended; undefined while in progress. */
  completedAt?: Timestamp;
  /** Convenience duration in seconds (completedAt − startedAt). */
  durationSeconds?: number;
  /** Exercises performed, in order. */
  exercises: SessionExercise[];
  /** Whole-session bodyweight at time of training (kg). */
  bodyweightKg?: number;
  /** Session-level perceived difficulty (1–10). */
  perceivedExertion?: number;
  /** Free-text journal note. */
  notes?: string;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

// ---------------------------------------------------------------------------
// Workout template (a reusable plan)
// ---------------------------------------------------------------------------

/**
 * A prescribed exercise inside a {@link WorkoutTemplate}: targets rather than
 * logged results. Drives the initial set list when a session is started.
 */
export interface TemplateExercise {
  id: UUID;
  exerciseId: UUID;
  /** Position within the template. */
  order: number;
  /** Number of working sets to perform. */
  targetSets: number;
  /** Target rep count (or lower bound of a range). */
  targetReps?: number;
  /** Upper bound when prescribing a rep range. */
  targetRepsMax?: number;
  /** Prescribed load in the user's weight unit. */
  targetWeight?: number;
  /** Prescribed RPE (1–10). */
  targetRpe?: number;
  /** Prescribed RIR (0–5). */
  targetRir?: number;
  /** Prescribed rest between sets, in seconds. */
  targetRestSeconds?: number;
  /** Superset grouping key. */
  supersetGroup?: string;
  /** Coaching note for this slot. */
  notes?: string;
}

/**
 * A reusable workout blueprint the user can start sessions from. May stand
 * alone or be referenced by a {@link Program}.
 */
export interface WorkoutTemplate {
  id: UUID;
  /** Owning user. */
  userId: UUID;
  name: string;
  description?: string;
  /** Prescribed exercises, in order. */
  exercises: TemplateExercise[];
  /** Estimated session length in minutes. */
  estimatedDurationMinutes?: number;
  /** Whether the template is archived (hidden from the active list). */
  isArchived: boolean;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

// ---------------------------------------------------------------------------
// Program (a multi-week structured plan)
// ---------------------------------------------------------------------------

/**
 * Placement of a {@link WorkoutTemplate} within a {@link Program}'s schedule:
 * which week and which day of that week it should be performed.
 */
export interface ProgramWorkout {
  id: UUID;
  /** Template to perform on this slot. */
  templateId: UUID;
  /** 1-based program week this slot falls in. */
  week: number;
  /** Day of the week, 1 (Mon) – 7 (Sun). */
  dayOfWeek: number;
  /** Position within the day for multi-session days. */
  order: number;
}

/**
 * A structured, multi-week training plan that schedules templates across a
 * calendar. The top-level organising unit of periodised training.
 */
export interface Program {
  id: UUID;
  /** Owning user. */
  userId: UUID;
  name: string;
  description?: string;
  /** Total length of the program in weeks. */
  durationWeeks: number;
  /** Primary goal the program is built around. */
  goal?: FitnessGoal;
  /** Scheduled workouts across the program. */
  workouts: ProgramWorkout[];
  /** Whether this is the user's currently-running program. */
  isActive: boolean;
  /** Date the user started the program, if running. */
  startedAt?: Timestamp;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

// ---------------------------------------------------------------------------
// Personal record
// ---------------------------------------------------------------------------

/**
 * A best-ever performance for a given exercise and metric. Recomputed when new
 * sessions are logged; the previous value is retained for progress deltas.
 */
export interface PersonalRecord {
  id: UUID;
  /** Owning user. */
  userId: UUID;
  /** Exercise the record is for. */
  exerciseId: UUID;
  /** What the record measures. */
  type: PersonalRecordType;
  /**
   * The record value. Interpretation depends on `type`:
   * weight (kg/lb) for max_weight/one_rep_max, reps for max_reps,
   * total volume for max_volume, seconds for best_time, metres for max_distance.
   */
  value: number;
  /** Rep count associated with a weight-based PR (e.g. 5RM has reps = 5). */
  reps?: number;
  /** Session in which the record was set. */
  sessionId?: UUID;
  /** The specific set that achieved it. */
  setId?: UUID;
  /** Prior record value, for showing the improvement delta. */
  previousValue?: number;
  /** When the record was achieved. */
  achievedAt: Timestamp;
}

// ---------------------------------------------------------------------------
// Body metric
// ---------------------------------------------------------------------------

/** Optional circumference measurements captured with a body metric (cm). */
export interface BodyMeasurements {
  neck?: number;
  shoulders?: number;
  chest?: number;
  waist?: number;
  hips?: number;
  leftArm?: number;
  rightArm?: number;
  leftThigh?: number;
  rightThigh?: number;
  leftCalf?: number;
  rightCalf?: number;
}

/**
 * A point-in-time snapshot of the user's body composition / vitals. One row per
 * logging event; charts are built by ordering on `recordedAt`.
 */
export interface BodyMetric {
  id: UUID;
  /** Owning user. */
  userId: UUID;
  /** When the measurement was taken. */
  recordedAt: Timestamp;
  /** Bodyweight in kilograms (canonical metric storage). */
  weightKg?: number;
  /** Body-fat percentage (0–100). */
  bodyFatPercentage?: number;
  /** Resting heart rate in bpm. */
  restingHeartRate?: number;
  /** Optional circumference measurements (cm). */
  measurements?: BodyMeasurements;
  /** Free-text note. */
  notes?: string;
  createdAt: Timestamp;
}

// ---------------------------------------------------------------------------
// Active workout state (client-side / ephemeral)
// ---------------------------------------------------------------------------

/** The countdown timer that runs between sets during a live workout. */
export interface RestTimerState {
  /** Whether the timer is currently counting down. */
  isRunning: boolean;
  /** Configured duration, in seconds. */
  durationSeconds: number;
  /** Wall-clock time the timer will fire; undefined when not running. */
  endsAt?: Timestamp;
}

/**
 * The live, in-memory state of a workout in progress. Owned by the client
 * (e.g. a Zustand store backed by MMKV), not the database — though on finish it
 * is persisted as a {@link WorkoutSession}. Held separately so the running
 * workout survives app restarts without polluting historical records.
 */
export interface ActiveWorkoutState {
  /** Where in its lifecycle the active workout is. */
  status: ActiveWorkoutStatus;
  /** Id of the session being built; assigned when the workout starts. */
  sessionId?: UUID;
  /** Template the workout was started from, if any. */
  templateId?: UUID;
  /** Program the workout belongs to, if any. */
  programId?: UUID;
  /** Display name of the in-progress session. */
  name: string;
  /** When the workout started. */
  startedAt?: Timestamp;
  /** Accumulated elapsed time in seconds (excludes paused spans). */
  elapsedSeconds: number;
  /** Index into `exercises` of the exercise currently focused. */
  currentExerciseIndex: number;
  /** Index into the current exercise's sets of the set being entered. */
  currentSetIndex: number;
  /** The working exercise/set data accumulated so far. */
  exercises: SessionExercise[];
  /** Between-sets rest timer. */
  restTimer: RestTimerState;
  /** Timestamp of the last mutation, used for persistence/hydration. */
  lastUpdatedAt: Timestamp;
}

// ---------------------------------------------------------------------------
// Achievements & Gamification
// ---------------------------------------------------------------------------

export type AchievementCategory = 'workouts' | 'streaks' | 'pr' | 'volume' | 'exercises';

export interface Achievement {
  id: string;
  name: string;
  description: string;
  category: AchievementCategory;
  targetValue: number;
  xpReward: number;
  icon: string;
}

