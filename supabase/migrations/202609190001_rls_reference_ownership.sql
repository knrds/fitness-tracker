-- Review-only until deployed schema, existing data and grants are inspected.
-- Additive restrictive guards: existing permissive policies cannot OR around them.
-- No data deletion, ownership reassignment, or auth schema modification.
begin;
set local lock_timeout = '5s';
set local statement_timeout = '60s';

-- Prevent an old-policy writer from adding a cross-account link between the
-- preflight read and policy activation. Contention aborts the entire migration.
lock table public.users, public.exercises, public.workout_templates,
  public.template_exercises, public.programs, public.program_workouts,
  public.workout_sessions, public.session_exercises, public.exercise_sets,
  public.personal_records, public.body_metrics in share row exclusive mode;

-- Fail atomically on existing cross-account references; never silently repair history.
do $$ begin
  if exists (
    select 1 from public.template_exercises te
    join public.workout_templates t on t.id = te.template_id
    join public.exercises e on e.id = te.exercise_id
    where e.owner_id is not null and e.owner_id <> t.user_id
  ) or exists (
    select 1 from public.program_workouts pw
    join public.programs p on p.id = pw.program_id
    join public.workout_templates t on t.id = pw.template_id
    where p.user_id <> t.user_id
  ) or exists (
    select 1 from public.workout_sessions s
    left join public.workout_templates t on t.id = s.template_id
    left join public.programs p on p.id = s.program_id
    where t.user_id <> s.user_id or p.user_id <> s.user_id
  ) or exists (
    select 1 from public.session_exercises se
    join public.workout_sessions s on s.id = se.session_id
    join public.exercises e on e.id = se.exercise_id
    where e.owner_id is not null and e.owner_id <> s.user_id
  ) or exists (
    select 1 from public.personal_records pr
    join public.exercises e on e.id = pr.exercise_id
    left join public.workout_sessions s on s.id = pr.session_id
    left join public.exercise_sets es on es.id = pr.set_id
    left join public.session_exercises se on se.id = es.session_exercise_id
    left join public.workout_sessions set_session on set_session.id = se.session_id
    where (e.owner_id is not null and e.owner_id <> pr.user_id)
       or s.user_id <> pr.user_id or set_session.user_id <> pr.user_id
       or se.exercise_id <> pr.exercise_id
       or (pr.session_id is not null and se.session_id <> pr.session_id)
  ) then
    raise exception 'RLS migration blocked: existing inconsistent ownership/reference data requires review';
  end if;
end $$;

-- RLS never protects TRUNCATE; clients must not hold DDL-like table privileges.
revoke truncate, references, trigger on
  public.users, public.exercises, public.workout_templates, public.template_exercises,
  public.programs, public.program_workouts, public.workout_sessions,
  public.session_exercises, public.exercise_sets, public.personal_records, public.body_metrics
from public, anon, authenticated;
revoke create on schema public from public, anon, authenticated;

alter table public.users enable row level security;
alter table public.exercises enable row level security;
alter table public.workout_templates enable row level security;
alter table public.template_exercises enable row level security;
alter table public.programs enable row level security;
alter table public.program_workouts enable row level security;
alter table public.workout_sessions enable row level security;
alter table public.session_exercises enable row level security;
alter table public.exercise_sets enable row level security;
alter table public.personal_records enable row level security;
alter table public.body_metrics enable row level security;

create policy evaro_owner_guard_v1 on public.users as restrictive for all
  using (id = (select auth.uid())) with check (id = (select auth.uid()));
create policy evaro_read_guard_v1 on public.exercises as restrictive for select
  using (owner_id is null or owner_id = (select auth.uid()));
create policy evaro_insert_guard_v1 on public.exercises as restrictive for insert
  with check (is_custom and owner_id = (select auth.uid()));
create policy evaro_update_guard_v1 on public.exercises as restrictive for update
  using (owner_id = (select auth.uid()))
  with check (is_custom and owner_id = (select auth.uid()));
create policy evaro_delete_guard_v1 on public.exercises as restrictive for delete
  using (owner_id = (select auth.uid()));
create policy evaro_owner_guard_v1 on public.workout_templates as restrictive for all
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
create policy evaro_owner_guard_v1 on public.programs as restrictive for all
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
create policy evaro_owner_guard_v1 on public.body_metrics as restrictive for all
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));

create policy evaro_owner_guard_v1 on public.template_exercises as restrictive for all
  using (exists (select 1 from public.workout_templates t
    where t.id = template_id and t.user_id = (select auth.uid())))
  with check (
    exists (select 1 from public.workout_templates t
      where t.id = template_id and t.user_id = (select auth.uid()))
    and exists (select 1 from public.exercises e
      where e.id = exercise_id and (e.owner_id is null or e.owner_id = (select auth.uid())))
  );
create policy evaro_owner_guard_v1 on public.program_workouts as restrictive for all
  using (exists (select 1 from public.programs p
    where p.id = program_id and p.user_id = (select auth.uid())))
  with check (
    exists (select 1 from public.programs p
      where p.id = program_id and p.user_id = (select auth.uid()))
    and exists (select 1 from public.workout_templates t
      where t.id = template_id and t.user_id = (select auth.uid()))
  );
create policy evaro_owner_guard_v1 on public.workout_sessions as restrictive for all
  using (user_id = (select auth.uid()))
  with check (
    user_id = (select auth.uid())
    and (template_id is null or exists (select 1 from public.workout_templates t
      where t.id = template_id and t.user_id = (select auth.uid())))
    and (program_id is null or exists (select 1 from public.programs p
      where p.id = program_id and p.user_id = (select auth.uid())))
  );
create policy evaro_owner_guard_v1 on public.session_exercises as restrictive for all
  using (exists (select 1 from public.workout_sessions s
    where s.id = session_id and s.user_id = (select auth.uid())))
  with check (
    exists (select 1 from public.workout_sessions s
      where s.id = session_id and s.user_id = (select auth.uid()))
    and exists (select 1 from public.exercises e
      where e.id = exercise_id and (e.owner_id is null or e.owner_id = (select auth.uid())))
  );
create policy evaro_owner_guard_v1 on public.exercise_sets as restrictive for all
  using (exists (select 1 from public.session_exercises se
    join public.workout_sessions s on s.id = se.session_id
    where se.id = session_exercise_id and s.user_id = (select auth.uid())))
  with check (exists (select 1 from public.session_exercises se
    join public.workout_sessions s on s.id = se.session_id
    where se.id = session_exercise_id and s.user_id = (select auth.uid())));
create policy evaro_owner_guard_v1 on public.personal_records as restrictive for all
  using (user_id = (select auth.uid()))
  with check (
    user_id = (select auth.uid())
    and exists (select 1 from public.exercises e
      where e.id = exercise_id and (e.owner_id is null or e.owner_id = (select auth.uid())))
    and (session_id is null or exists (select 1 from public.workout_sessions s
      where s.id = session_id and s.user_id = (select auth.uid())))
    and (set_id is null or exists (
      select 1 from public.exercise_sets es
      join public.session_exercises se on se.id = es.session_exercise_id
      join public.workout_sessions s on s.id = se.session_id
      where es.id = set_id and s.user_id = (select auth.uid())
        and se.exercise_id = personal_records.exercise_id
        and (personal_records.session_id is null or s.id = personal_records.session_id)
    ))
  );
commit;
