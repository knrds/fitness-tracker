#!/usr/bin/env bash
set -euo pipefail

# No remote host/URL option, existing-db reuse, data reset, or drop command.
export PGHOST=127.0.0.1
export PGHOSTADDR=127.0.0.1
unset PGSERVICE PGSERVICEFILE PGOPTIONS
export PGPORT="${PGPORT:-55432}"
export PGUSER="${PGUSER:-evaro_test_admin}"
test_db="evaro_${RANDOM}_$(date +%s)_workout_sync_rls_test"
log_dir="$(mktemp -d)"
createdb "$test_db"
export PGDATABASE="$test_db"
psql -X -v ON_ERROR_STOP=1 -f scripts/security/rls-bootstrap.sql -f docs/schema.sql > "$log_dir/schema.log"
psql -X -v ON_ERROR_STOP=1 > "$log_dir/fixtures.log" <<'SQL'
insert into auth.users values('10000000-0000-4000-8000-000000000001'),('20000000-0000-4000-8000-000000000001');
insert into public.users(id,email,display_name) values
 ('10000000-0000-4000-8000-000000000001','synthetic-a@example.invalid','Synthetic A'),
 ('20000000-0000-4000-8000-000000000001','synthetic-b@example.invalid','Synthetic B');
insert into public.exercises(id,name,primary_muscles,equipment,movement_pattern,is_custom,owner_id) values
 ('10000000-0000-4000-8000-000000000100','Shared synthetic','{chest}','barbell','horizontal_push',false,null),
 ('10000000-0000-4000-8000-000000000101','Second shared synthetic','{chest}','barbell','horizontal_push',false,null),
 ('20000000-0000-4000-8000-000000000100','Private synthetic','{chest}','barbell','horizontal_push',true,'20000000-0000-4000-8000-000000000001');
insert into public.workout_templates(id,user_id,name) values
 ('10000000-0000-4000-8000-000000000110','10000000-0000-4000-8000-000000000001','Owned template'),
 ('20000000-0000-4000-8000-000000000110','20000000-0000-4000-8000-000000000001','Private template');
insert into public.programs(id,user_id,name,duration_weeks) values
 ('20000000-0000-4000-8000-000000000120','20000000-0000-4000-8000-000000000001','Private program',1);
insert into public.workout_sessions(id,user_id,template_id,name,started_at,notes,created_at) values
 ('10000000-0000-4000-8000-000000000400','10000000-0000-4000-8000-000000000001','10000000-0000-4000-8000-000000000110','Legacy synthetic','2025-01-01T12:00:00Z','original bytes','2025-01-01T12:00:00Z');
insert into public.session_exercises(id,session_id,exercise_id,"order",notes) values
 ('10000000-0000-4000-8000-000000000204','10000000-0000-4000-8000-000000000400','10000000-0000-4000-8000-000000000100',0,'legacy child bytes');
insert into public.exercise_sets(id,session_exercise_id,set_number,type,weight,reps,completed,notes) values
 ('10000000-0000-4000-8000-000000000304','10000000-0000-4000-8000-000000000204',1,'working',18,12,true,'legacy set bytes');
SQL
for migration in supabase/migrations/*.sql; do
  psql -X -v ON_ERROR_STOP=1 -f "$migration" > "$log_dir/ownership.log"
done
psql -X -v ON_ERROR_STOP=1 -f database/workout-sync.sql > "$log_dir/install.log"
psql -X -v ON_ERROR_STOP=1 -f database/tests/workout-sync.sql > "$log_dir/lifecycle.log"
grep -A 4 'passed_assertions' "$log_dir/lifecycle.log"
grep 'assertions PASS' "$log_dir/lifecycle.log"
psql -X -v ON_ERROR_STOP=1 <<'SQL' > "$log_dir/rollback.log"
do $$ begin
 if (select count(*) from public.workout_sessions)<>1
   or (select count(*) from public.session_exercises)<>1
   or (select count(*) from public.exercise_sets)<>1
   or (select count(*) from evaro_sync.workout_heads)<>1
   or exists(select 1 from evaro_sync.workout_operations)
   or exists(select 1 from pg_namespace where nspname='evaro_workout_test') then
   raise exception 'Workout test fixtures survived transaction rollback';
 end if;
end $$;
SQL

# Twenty-four independent SQL clients race one CAS revision. Exactly one commit
# is accepted; conflict responses do not overwrite data, revision, or cursor.
for attempt in $(seq 1 24); do
  (
    psql -X -At -v ON_ERROR_STOP=1 <<SQL > "$log_dir/cas-$attempt.log" 2>&1
begin;
set local role evaro_workout_sync_server;
select set_config('request.jwt.claim.sub','10000000-0000-4000-8000-000000000001',true);
select evaro_sync.mutate_workout_v1('30000000-0000-4000-8000-$(printf '%012d' "$attempt")',
 '10000000-0000-4000-8000-000000000400',1,'upsert',
 '{"name":"Concurrent synthetic","started_at":"2025-01-01T12:00:00Z","notes":"CAS $attempt","exercises":[]}')->>'status';
commit;
SQL
  ) &
done
wait
applied_count="$(grep -l '^applied$' "$log_dir"/cas-*.log | wc -l)"
conflict_count="$(grep -l '^conflict$' "$log_dir"/cas-*.log | wc -l)"
test "$applied_count" -eq 1
test "$conflict_count" -eq 23
psql -X -v ON_ERROR_STOP=1 > "$log_dir/concurrency-proof.log" <<'SQL'
do $$ begin
 if (select revision from evaro_sync.workout_heads where workout_id='10000000-0000-4000-8000-000000000400')<>2
   or (select cursor from evaro_sync.workout_clocks where owner_id='10000000-0000-4000-8000-000000000001')<>2
   or (select count(*) from evaro_sync.workout_operations)<>24 then
   raise exception 'CAS race lost revision/cursor/receipt isolation';
 end if;
end $$;
SQL
printf '%s\n' '24 concurrent same-revision clients: exactly 1 applied + 23 conflict PASS'

# Sixteen retries of one UUID operation share one receipt and one cursor advance.
for attempt in $(seq 1 16); do
  (
    psql -X -At -v ON_ERROR_STOP=1 <<'SQL' > "$log_dir/replay-$attempt.log" 2>&1
begin;
set local role evaro_workout_sync_server;
select set_config('request.jwt.claim.sub','10000000-0000-4000-8000-000000000001',true);
select evaro_sync.mutate_workout_v1('40000000-0000-4000-8000-000000000001',
 '10000000-0000-4000-8000-000000000400',2,'delete',null)->>'cursor';
commit;
SQL
  ) &
done
wait
test "$(grep -l '^3$' "$log_dir"/replay-*.log | wc -l)" -eq 16
psql -X -v ON_ERROR_STOP=1 > "$log_dir/replay-proof.log" <<'SQL'
do $$ begin
 if exists(select 1 from public.workout_sessions)
   or (select revision from evaro_sync.workout_heads where workout_id='10000000-0000-4000-8000-000000000400')<>3
   or (select cursor from evaro_sync.workout_clocks where owner_id='10000000-0000-4000-8000-000000000001')<>3
   or (select count(*) from evaro_sync.workout_operations)<>25 then
   raise exception 'Replay race duplicated aggregate deletion/cursor/receipt';
 end if;
end $$;
SQL
printf '%s\n' '16 concurrent delete retries: one durable receipt + tombstone PASS'

# Across different authenticated owners, a colliding child UUID may be inserted
# once only. ON CONFLICT must never reparent/overwrite a foreign aggregate.
for owner in 1 2; do
  (
    if psql -X -At -v ON_ERROR_STOP=1 <<SQL > "$log_dir/child-race-$owner.log" 2>&1
begin;
set local role evaro_workout_sync_server;
select set_config('request.jwt.claim.sub','${owner}0000000-0000-4000-8000-000000000001',true);
select evaro_sync.mutate_workout_v1('50000000-0000-4000-8000-000000000001',
 '60000000-0000-4000-8000-$(printf '%012d' "$owner")',0,'upsert',
 '{"name":"Owner $owner","started_at":"2026-09-30T10:00:00Z","exercises":[{"id":"70000000-0000-4000-8000-000000000001",
 "exercise_id":"10000000-0000-4000-8000-000000000100","order":0,"sets":[{"id":"80000000-0000-4000-8000-000000000001",
 "set_number":1,"type":"working","completed":true,"weight":$owner}]}]}')->>'status';
commit;
SQL
    then :; else grep -q 'Invalid workout reference' "$log_dir/child-race-$owner.log"; fi
  ) &
done
wait
test "$(grep -l '^applied$' "$log_dir"/child-race-*.log | wc -l)" -eq 1
test "$(grep -l 'Invalid workout reference' "$log_dir"/child-race-*.log | wc -l)" -eq 1
psql -X -v ON_ERROR_STOP=1 > "$log_dir/child-race-proof.log" <<'SQL'
do $$ begin
 if (select count(*) from public.session_exercises where id='70000000-0000-4000-8000-000000000001')<>1
   or (select count(*) from public.workout_sessions where id in('60000000-0000-4000-8000-000000000001','60000000-0000-4000-8000-000000000002'))<>1
   or not exists(select 1 from public.workout_sessions s join public.session_exercises se on se.session_id=s.id
     join public.exercise_sets es on es.session_exercise_id=se.id where se.id='70000000-0000-4000-8000-000000000001'
     and s.name='Owner '||es.weight::integer
     and s.user_id=(es.weight::integer||'0000000-0000-4000-8000-000000000001')::uuid) then
   raise exception 'Cross-owner child collision reparented/overwrote aggregate';
 end if;
end $$;
SQL
printf '%s\n' 'Cross-owner child UUID race: one owner preserved, foreign overwrite denied PASS'

# Transaction-level stale snapshots are deliberately unsupported, never a CAS bypass.
if psql -X -v ON_ERROR_STOP=1 > "$log_dir/isolation.log" 2>&1 <<'SQL'
begin isolation level repeatable read;
select set_config('request.jwt.claim.sub','10000000-0000-4000-8000-000000000001',true);
select evaro_sync.read_workout_changes_v1(0,20);
rollback;
SQL
then printf '%s\n' 'ERROR: repeatable-read sync accepted'; exit 1; fi
grep -q 'Workout sync requires READ COMMITTED' "$log_dir/isolation.log"

# Corrupt legacy order must abort before any schema/grant/trigger/data changes.
unsafe_db="${test_db%_workout_sync_rls_test}_unsafe_workout_sync_rls_test"
createdb "$unsafe_db"
export PGDATABASE="$unsafe_db"
psql -X -v ON_ERROR_STOP=1 -f scripts/security/rls-bootstrap.sql -f docs/schema.sql > "$log_dir/unsafe-schema.log"
psql -X -v ON_ERROR_STOP=1 > "$log_dir/unsafe-fixture.log" <<'SQL'
insert into auth.users values('10000000-0000-4000-8000-000000000001');
insert into public.users(id,email,display_name) values('10000000-0000-4000-8000-000000000001','legacy@example.invalid','Legacy');
insert into public.exercises(id,name,primary_muscles,equipment,movement_pattern) values('10000000-0000-4000-8000-000000000100','Legacy exercise','{chest}','barbell','horizontal_push');
insert into public.workout_sessions(id,user_id,name,started_at,notes) values('10000000-0000-4000-8000-000000000400','10000000-0000-4000-8000-000000000001','Untouched legacy',now(),'original bytes');
insert into public.session_exercises(id,session_id,exercise_id,"order") values
 ('10000000-0000-4000-8000-000000000201','10000000-0000-4000-8000-000000000400','10000000-0000-4000-8000-000000000100',0),
 ('10000000-0000-4000-8000-000000000202','10000000-0000-4000-8000-000000000400','10000000-0000-4000-8000-000000000100',0);
SQL
for migration in supabase/migrations/*.sql; do psql -X -v ON_ERROR_STOP=1 -f "$migration" > "$log_dir/unsafe-ownership.log"; done
if psql -X -v ON_ERROR_STOP=1 -f database/workout-sync.sql > "$log_dir/unsafe-install.log" 2>&1; then
  printf '%s\n' 'ERROR: inconsistent legacy aggregate accepted'; exit 1
fi
grep -q 'Workout sync blocked: inconsistent existing aggregate requires review' "$log_dir/unsafe-install.log"
psql -X -v ON_ERROR_STOP=1 > "$log_dir/unsafe-preservation.log" <<'SQL'
do $$ begin
 if exists(select 1 from pg_namespace where nspname='evaro_sync')
  or exists(select 1 from pg_trigger where tgname='evaro_workout_write_guard_v1')
  or (select count(*) from public.session_exercises)<>2
  or (select notes from public.workout_sessions)<>'original bytes'
  or not has_table_privilege('authenticated','public.workout_sessions','INSERT,UPDATE,DELETE') then
  raise exception 'Rejected sync install changed legacy data or privileges';
 end if;
end $$;
SQL
printf '%s\n' 'Inconsistent legacy install rejected with data/grants/triggers unchanged PASS'

# Independent unsafe function defaults must roll back the whole activation,
# including direct client DML revocation. No permission-denied shortcut to green.
grant_db="${test_db%_workout_sync_rls_test}_grants_workout_sync_rls_test"
createdb "$grant_db"
export PGDATABASE="$grant_db"
psql -X -v ON_ERROR_STOP=1 -f scripts/security/rls-bootstrap.sql -f docs/schema.sql > "$log_dir/grant-schema.log"
for migration in supabase/migrations/*.sql; do psql -X -v ON_ERROR_STOP=1 -f "$migration" > "$log_dir/grant-ownership.log"; done
psql -X -v ON_ERROR_STOP=1 -c 'alter default privileges grant execute on functions to authenticated' > "$log_dir/grant-default.log"
if psql -X -v ON_ERROR_STOP=1 -f database/workout-sync.sql > "$log_dir/grant-install.log" 2>&1; then
  printf '%s\n' 'ERROR: unsafe default client function grant accepted'; exit 1
fi
grep -q 'Unsafe workout sync default grants' "$log_dir/grant-install.log"
psql -X -v ON_ERROR_STOP=1 > "$log_dir/grant-preservation.log" <<'SQL'
do $$ begin
 if exists(select 1 from pg_namespace where nspname='evaro_sync')
   or exists(select 1 from pg_trigger where tgname='evaro_workout_write_guard_v1')
   or not has_table_privilege('authenticated','public.workout_sessions','INSERT,UPDATE,DELETE') then
   raise exception 'Rejected default-grant install left a partial activation';
 end if;
end $$;
SQL
printf '%s\n' 'Unsafe function defaults rejected with schema/grants rollback PASS'
for role_name in evaro_workout_sync_owner evaro_workout_sync_server; do
  for direction in inherits recipient; do
    if [[ "$direction" == inherits ]]; then
      fixture_grant="grant authenticated to $role_name"
    else
      fixture_grant="grant $role_name to authenticated"
    fi
    if psql -X -v ON_ERROR_STOP=1 -c "begin; $fixture_grant;" -f database/workout-sync.sql > "$log_dir/role-$role_name-$direction.log" 2>&1; then
      printf '%s\n' 'ERROR: inherited workout sync authority accepted'; exit 1
    fi
    grep -q 'Unsafe workout sync memberships' "$log_dir/role-$role_name-$direction.log"
    psql -X -v ON_ERROR_STOP=1 > "$log_dir/role-rollback.log" <<'SQL'
do $$ begin
  if exists(select 1 from pg_auth_members where
      member in(select oid from pg_roles where rolname in('evaro_workout_sync_owner','evaro_workout_sync_server')) or
      roleid in(select oid from pg_roles where rolname in('evaro_workout_sync_owner','evaro_workout_sync_server')))
    or exists(select 1 from pg_namespace where nspname='evaro_sync')
    or not has_table_privilege('authenticated','public.workout_sessions','INSERT,UPDATE,DELETE') then
    raise exception 'Rejected role preflight left partial activation';
  end if;
end $$;
SQL
  done
done
printf '%s\n' 'Both sync-role memberships rejected in both directions; rollback PASS'
printf 'Workout aggregate SQL suite passed on disposable local database %s; logs: %s\n' "$test_db" "$log_dir"
