-- =============================================================================
-- Fitness Tracker — Supabase / PostgreSQL schema
-- =============================================================================
-- Mirrors the domain model in packages/domain/src/types/index.ts.
--
-- Conventions:
--   * Every user-owned table carries a `user_id uuid` referencing auth.users.
--   * Row Level Security is ON for every table; policies restrict access to the
--     owning user via auth.uid(). Child rows are guarded through their parent.
--   * Timestamps are `timestamptz`, defaulting to now() on insert.
--   * Canonical units are metric (kg, cm, metres); the client converts for
--     display based on users.preferred_units.
--
-- Apply with: psql "$DATABASE_URL" -f docs/schema.sql
--          or paste into the Supabase SQL editor.
-- =============================================================================

-- Needed for gen_random_uuid()
create extension if not exists "pgcrypto";

-- -----------------------------------------------------------------------------
-- Enum types
-- -----------------------------------------------------------------------------

create type unit_system as enum ('metric', 'imperial');

create type muscle_group as enum (
  'chest', 'upper_back', 'lats', 'lower_back', 'traps',
  'front_delts', 'side_delts', 'rear_delts',
  'biceps', 'triceps', 'forearms',
  'quads', 'hamstrings', 'glutes', 'calves',
  'abs', 'obliques', 'neck', 'full_body'
);

create type equipment as enum (
  'barbell', 'dumbbell', 'kettlebell', 'machine', 'cable',
  'smith_machine', 'ez_bar', 'resistance_band', 'bodyweight',
  'plate', 'medicine_ball', 'trx', 'cardio_machine', 'other'
);

create type movement_pattern as enum (
  'horizontal_push', 'vertical_push', 'horizontal_pull', 'vertical_pull',
  'squat', 'hinge', 'lunge', 'carry', 'rotation', 'isolation', 'core', 'cardio'
);

create type experience_level as enum ('beginner', 'intermediate', 'advanced');

create type biological_sex as enum ('male', 'female', 'other', 'prefer_not_to_say');

create type fitness_goal as enum (
  'build_muscle', 'gain_strength', 'lose_fat',
  'improve_endurance', 'general_fitness', 'athletic_performance'
);

create type set_type as enum ('warmup', 'working', 'drop', 'failure', 'amrap', 'backoff');

create type personal_record_type as enum (
  'one_rep_max', 'estimated_one_rep_max', 'max_weight',
  'max_reps', 'max_volume', 'best_time', 'max_distance'
);

-- -----------------------------------------------------------------------------
-- users (public profile; 1:1 with auth.users)
-- -----------------------------------------------------------------------------

create table users (
  id               uuid primary key references auth.users (id) on delete cascade,
  email            text not null unique,
  display_name     text not null,
  avatar_url       text,
  date_of_birth    date,
  biological_sex   biological_sex,
  height_cm        numeric(5, 2) check (height_cm is null or height_cm > 0),
  preferred_units  unit_system not null default 'metric',
  fitness_goal     fitness_goal,
  experience_level experience_level,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);

-- -----------------------------------------------------------------------------
-- exercises (shared library when owner_id is null; otherwise user-custom)
-- -----------------------------------------------------------------------------

create table exercises (
  id                uuid primary key default gen_random_uuid(),
  name              text not null,
  instructions      text,
  primary_muscles   muscle_group[] not null check (array_length(primary_muscles, 1) >= 1),
  secondary_muscles muscle_group[] not null default '{}',
  equipment         equipment not null,
  movement_pattern  movement_pattern not null,
  is_custom         boolean not null default false,
  owner_id          uuid references users (id) on delete cascade,
  is_unilateral     boolean not null default false,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now(),
  -- Custom exercises must have an owner; library exercises must not.
  constraint exercises_custom_owner_chk
    check ((is_custom and owner_id is not null) or (not is_custom and owner_id is null))
);

create index exercises_owner_id_idx on exercises (owner_id);
create index exercises_equipment_idx on exercises (equipment);
create index exercises_movement_pattern_idx on exercises (movement_pattern);
create index exercises_primary_muscles_idx on exercises using gin (primary_muscles);

-- -----------------------------------------------------------------------------
-- workout_templates  +  template_exercises
-- -----------------------------------------------------------------------------

create table workout_templates (
  id                         uuid primary key default gen_random_uuid(),
  user_id                    uuid not null references users (id) on delete cascade,
  name                       text not null,
  description                text,
  estimated_duration_minutes integer check (estimated_duration_minutes is null or estimated_duration_minutes > 0),
  is_archived                boolean not null default false,
  created_at                 timestamptz not null default now(),
  updated_at                 timestamptz not null default now()
);

create index workout_templates_user_id_idx on workout_templates (user_id);

create table template_exercises (
  id                  uuid primary key default gen_random_uuid(),
  template_id         uuid not null references workout_templates (id) on delete cascade,
  exercise_id         uuid not null references exercises (id) on delete restrict,
  "order"             integer not null default 0,
  target_sets         integer not null check (target_sets > 0),
  target_reps         integer check (target_reps is null or target_reps > 0),
  target_reps_max     integer check (target_reps_max is null or target_reps_max > 0),
  target_weight       numeric(7, 2) check (target_weight is null or target_weight >= 0),
  target_rpe          numeric(3, 1) check (target_rpe is null or (target_rpe >= 1 and target_rpe <= 10)),
  target_rir          integer check (target_rir is null or (target_rir >= 0 and target_rir <= 5)),
  target_rest_seconds integer check (target_rest_seconds is null or target_rest_seconds >= 0),
  superset_group      text,
  notes               text
);

create index template_exercises_template_id_idx on template_exercises (template_id);
create index template_exercises_exercise_id_idx on template_exercises (exercise_id);

-- -----------------------------------------------------------------------------
-- programs  +  program_workouts
-- -----------------------------------------------------------------------------

create table programs (
  id             uuid primary key default gen_random_uuid(),
  user_id        uuid not null references users (id) on delete cascade,
  name           text not null,
  description    text,
  duration_weeks integer not null check (duration_weeks > 0 and duration_weeks <= 104),
  goal           fitness_goal,
  is_active      boolean not null default false,
  started_at     timestamptz,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now()
);

create index programs_user_id_idx on programs (user_id);
-- At most one active program per user.
create unique index programs_one_active_per_user_idx on programs (user_id) where is_active;

create table program_workouts (
  id          uuid primary key default gen_random_uuid(),
  program_id  uuid not null references programs (id) on delete cascade,
  template_id uuid not null references workout_templates (id) on delete restrict,
  week        integer not null check (week > 0),
  day_of_week integer not null check (day_of_week between 1 and 7),
  "order"     integer not null default 0
);

create index program_workouts_program_id_idx on program_workouts (program_id);
create index program_workouts_template_id_idx on program_workouts (template_id);

-- -----------------------------------------------------------------------------
-- workout_sessions  +  session_exercises  +  exercise_sets
-- -----------------------------------------------------------------------------

create table workout_sessions (
  id                 uuid primary key default gen_random_uuid(),
  user_id            uuid not null references users (id) on delete cascade,
  template_id        uuid references workout_templates (id) on delete set null,
  program_id         uuid references programs (id) on delete set null,
  name               text not null,
  started_at         timestamptz not null,
  completed_at       timestamptz,
  duration_seconds   integer check (duration_seconds is null or duration_seconds >= 0),
  bodyweight_kg      numeric(6, 2) check (bodyweight_kg is null or bodyweight_kg > 0),
  perceived_exertion numeric(3, 1) check (perceived_exertion is null or (perceived_exertion >= 1 and perceived_exertion <= 10)),
  notes              text,
  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now()
);

create index workout_sessions_user_id_idx on workout_sessions (user_id);
create index workout_sessions_started_at_idx on workout_sessions (user_id, started_at desc);
create index workout_sessions_template_id_idx on workout_sessions (template_id);
create index workout_sessions_program_id_idx on workout_sessions (program_id);

create table session_exercises (
  id             uuid primary key default gen_random_uuid(),
  session_id     uuid not null references workout_sessions (id) on delete cascade,
  exercise_id    uuid not null references exercises (id) on delete restrict,
  "order"        integer not null default 0,
  superset_group text,
  notes          text
);

create index session_exercises_session_id_idx on session_exercises (session_id);
create index session_exercises_exercise_id_idx on session_exercises (exercise_id);

create table exercise_sets (
  id               uuid primary key default gen_random_uuid(),
  session_exercise_id uuid not null references session_exercises (id) on delete cascade,
  set_number       integer not null check (set_number > 0),
  type             set_type not null default 'working',
  weight           numeric(7, 2) check (weight is null or weight >= 0),
  reps             integer check (reps is null or reps >= 0),
  rpe              numeric(3, 1) check (rpe is null or (rpe >= 1 and rpe <= 10)),
  rir              integer check (rir is null or (rir >= 0 and rir <= 5)),
  rest_seconds     integer check (rest_seconds is null or rest_seconds >= 0),
  duration_seconds numeric(8, 2) check (duration_seconds is null or duration_seconds >= 0),
  distance_meters  numeric(9, 2) check (distance_meters is null or distance_meters >= 0),
  notes            text,
  completed        boolean not null default false,
  completed_at     timestamptz
);

create index exercise_sets_session_exercise_id_idx on exercise_sets (session_exercise_id);

-- -----------------------------------------------------------------------------
-- personal_records
-- -----------------------------------------------------------------------------

create table personal_records (
  id             uuid primary key default gen_random_uuid(),
  user_id        uuid not null references users (id) on delete cascade,
  exercise_id    uuid not null references exercises (id) on delete cascade,
  type           personal_record_type not null,
  value          numeric(10, 3) not null,
  reps           integer check (reps is null or reps > 0),
  session_id     uuid references workout_sessions (id) on delete set null,
  set_id         uuid references exercise_sets (id) on delete set null,
  previous_value numeric(10, 3),
  achieved_at    timestamptz not null default now()
);

create index personal_records_user_id_idx on personal_records (user_id);
create index personal_records_exercise_idx on personal_records (user_id, exercise_id, type);

-- -----------------------------------------------------------------------------
-- body_metrics  (measurements stored inline as jsonb)
-- -----------------------------------------------------------------------------

create table body_metrics (
  id                  uuid primary key default gen_random_uuid(),
  user_id             uuid not null references users (id) on delete cascade,
  recorded_at         timestamptz not null default now(),
  weight_kg           numeric(6, 2) check (weight_kg is null or weight_kg > 0),
  body_fat_percentage numeric(4, 1) check (body_fat_percentage is null or (body_fat_percentage >= 0 and body_fat_percentage <= 100)),
  resting_heart_rate  integer check (resting_heart_rate is null or resting_heart_rate > 0),
  measurements        jsonb,
  notes               text,
  created_at          timestamptz not null default now()
);

create index body_metrics_user_id_idx on body_metrics (user_id);
create index body_metrics_recorded_at_idx on body_metrics (user_id, recorded_at desc);

-- NOTE: ActiveWorkoutState (see domain types) is intentionally NOT persisted
-- server-side. It is ephemeral client state (Zustand + MMKV) that materialises
-- into a workout_sessions row only when the workout is finished.

-- =============================================================================
-- updated_at maintenance
-- =============================================================================

create or replace function set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger users_set_updated_at            before update on users            for each row execute function set_updated_at();
create trigger exercises_set_updated_at        before update on exercises        for each row execute function set_updated_at();
create trigger workout_templates_set_updated_at before update on workout_templates for each row execute function set_updated_at();
create trigger programs_set_updated_at         before update on programs         for each row execute function set_updated_at();
create trigger workout_sessions_set_updated_at before update on workout_sessions for each row execute function set_updated_at();

-- =============================================================================
-- Row Level Security
-- =============================================================================
-- Every table has RLS enabled. Top-level tables check user_id = auth.uid().
-- Child tables (no direct user_id) authorize via EXISTS against their owning
-- parent, ultimately resolving to the same auth.uid() check. The FK indexes
-- created above keep these EXISTS lookups fast.

alter table users               enable row level security;
alter table exercises           enable row level security;
alter table workout_templates   enable row level security;
alter table template_exercises  enable row level security;
alter table programs            enable row level security;
alter table program_workouts    enable row level security;
alter table workout_sessions    enable row level security;
alter table session_exercises   enable row level security;
alter table exercise_sets       enable row level security;
alter table personal_records    enable row level security;
alter table body_metrics        enable row level security;

-- ---- users -----------------------------------------------------------------
create policy users_select_own on users for select using (id = auth.uid());
create policy users_insert_own on users for insert with check (id = auth.uid());
create policy users_update_own on users for update using (id = auth.uid()) with check (id = auth.uid());
create policy users_delete_own on users for delete using (id = auth.uid());

-- ---- exercises -------------------------------------------------------------
-- Readable: shared library (owner_id null) OR your own custom exercises.
-- Writable: only your own custom exercises.
create policy exercises_select on exercises for select
  using (owner_id is null or owner_id = auth.uid());
create policy exercises_insert_own on exercises for insert
  with check (is_custom and owner_id = auth.uid());
create policy exercises_update_own on exercises for update
  using (owner_id = auth.uid()) with check (owner_id = auth.uid());
create policy exercises_delete_own on exercises for delete
  using (owner_id = auth.uid());

-- ---- workout_templates -----------------------------------------------------
create policy templates_select_own on workout_templates for select using (user_id = auth.uid());
create policy templates_insert_own on workout_templates for insert with check (user_id = auth.uid());
create policy templates_update_own on workout_templates for update using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy templates_delete_own on workout_templates for delete using (user_id = auth.uid());

-- ---- template_exercises (via parent template) ------------------------------
create policy template_exercises_all_own on template_exercises for all
  using (exists (
    select 1 from workout_templates t
    where t.id = template_exercises.template_id and t.user_id = auth.uid()
  ))
  with check (exists (
    select 1 from workout_templates t
    where t.id = template_exercises.template_id and t.user_id = auth.uid()
  ));

-- ---- programs --------------------------------------------------------------
create policy programs_select_own on programs for select using (user_id = auth.uid());
create policy programs_insert_own on programs for insert with check (user_id = auth.uid());
create policy programs_update_own on programs for update using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy programs_delete_own on programs for delete using (user_id = auth.uid());

-- ---- program_workouts (via parent program) ---------------------------------
create policy program_workouts_all_own on program_workouts for all
  using (exists (
    select 1 from programs p
    where p.id = program_workouts.program_id and p.user_id = auth.uid()
  ))
  with check (exists (
    select 1 from programs p
    where p.id = program_workouts.program_id and p.user_id = auth.uid()
  ));

-- ---- workout_sessions ------------------------------------------------------
create policy sessions_select_own on workout_sessions for select using (user_id = auth.uid());
create policy sessions_insert_own on workout_sessions for insert with check (user_id = auth.uid());
create policy sessions_update_own on workout_sessions for update using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy sessions_delete_own on workout_sessions for delete using (user_id = auth.uid());

-- ---- session_exercises (via parent session) --------------------------------
create policy session_exercises_all_own on session_exercises for all
  using (exists (
    select 1 from workout_sessions s
    where s.id = session_exercises.session_id and s.user_id = auth.uid()
  ))
  with check (exists (
    select 1 from workout_sessions s
    where s.id = session_exercises.session_id and s.user_id = auth.uid()
  ));

-- ---- exercise_sets (via session_exercises -> workout_sessions) -------------
create policy exercise_sets_all_own on exercise_sets for all
  using (exists (
    select 1
    from session_exercises se
    join workout_sessions s on s.id = se.session_id
    where se.id = exercise_sets.session_exercise_id and s.user_id = auth.uid()
  ))
  with check (exists (
    select 1
    from session_exercises se
    join workout_sessions s on s.id = se.session_id
    where se.id = exercise_sets.session_exercise_id and s.user_id = auth.uid()
  ));

-- ---- personal_records ------------------------------------------------------
create policy prs_select_own on personal_records for select using (user_id = auth.uid());
create policy prs_insert_own on personal_records for insert with check (user_id = auth.uid());
create policy prs_update_own on personal_records for update using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy prs_delete_own on personal_records for delete using (user_id = auth.uid());

-- ---- body_metrics ----------------------------------------------------------
create policy body_metrics_select_own on body_metrics for select using (user_id = auth.uid());
create policy body_metrics_insert_own on body_metrics for insert with check (user_id = auth.uid());
create policy body_metrics_update_own on body_metrics for update using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy body_metrics_delete_own on body_metrics for delete using (user_id = auth.uid());
