#!/usr/bin/env bash
set -euo pipefail

# Intentionally no remote host/URL option or destructive reset/drop command.
# Caller supplies a disposable local PostgreSQL server and PGPASSWORD/PGUSER.
export PGHOST=127.0.0.1
export PGPORT="${PGPORT:-55432}"
export PGUSER="${PGUSER:-evaro_test_admin}"
test_db="evaro_${RANDOM}_$(date +%s)_rls_test"
log_dir="$(mktemp -d)"
createdb "$test_db"
export PGDATABASE="$test_db"
psql -X -v ON_ERROR_STOP=1 -f scripts/security/rls-bootstrap.sql -f docs/schema.sql > "$log_dir/schema.log"

# Red control: the old schema must fail specifically on a foreign reference.
if psql -X -v ON_ERROR_STOP=1 -f docs/release/rls_negative_tests.sql > "$log_dir/before.log" 2>&1; then
  printf '%s\n' 'ERROR: baseline unexpectedly accepted all security assertions'
  exit 1
fi
if ! grep -q 'expected authorization denial: a:template_exercises:exercise_id:foreign-reference-update' "$log_dir/before.log"; then
  cat "$log_dir/before.log"
  exit 1
fi
printf '%s\n' 'Baseline vulnerability reproduced; test transaction rolled back'
for migration in supabase/migrations/*.sql; do
  psql -X -v ON_ERROR_STOP=1 -f "$migration" > "$log_dir/migration.log"
done
psql -X -v ON_ERROR_STOP=1 -f docs/release/rls_negative_tests.sql > "$log_dir/after.log"
psql -X -v ON_ERROR_STOP=1 -v adversarial_policies=1 -f docs/release/rls_negative_tests.sql > "$log_dir/adversarial.log"
for result in after adversarial; do
  grep -A 4 'passed_assertions' "$log_dir/$result.log"
  grep 'RLS assertions PASS' "$log_dir/$result.log"
done
psql -X -v ON_ERROR_STOP=1 -c "do \$\$ begin
  if exists (select 1 from public.users) or exists(select 1 from auth.users)
     or exists(select 1 from pg_namespace where nspname='evaro_rls_test')
     or exists(select 1 from pg_policies where policyname='evaro_test_allow_all') then
    raise exception 'Test fixtures/helpers/policies survived rollback';
  end if;
end \$\$;"
printf 'RLS suite passed on disposable local database %s; logs: %s\n' "$test_db" "$log_dir"

# Independently prove the migration refuses pre-existing inconsistent ownership
# without deleting that evidence or applying a partial policy set.
unsafe_db="${test_db%_rls_test}_unsafe_rls_test"
createdb "$unsafe_db"
export PGDATABASE="$unsafe_db"
psql -X -v ON_ERROR_STOP=1 -f scripts/security/rls-bootstrap.sql -f docs/schema.sql -f scripts/security/rls-preflight-fixture.sql > "$log_dir/preflight-setup.log"
if psql -X -v ON_ERROR_STOP=1 -f supabase/migrations/202609190001_rls_reference_ownership.sql > "$log_dir/preflight.log" 2>&1; then
  printf '%s\n' 'ERROR: migration accepted inconsistent existing ownership'
  exit 1
fi
grep -q 'RLS migration blocked: existing inconsistent ownership/reference data requires review' "$log_dir/preflight.log"
psql -X -v ON_ERROR_STOP=1 -c "do \$\$ begin
  if (select count(*) from public.users) <> 2
     or (select count(*) from public.template_exercises where exercise_id='b0000000-0000-4000-8000-000000000200') <> 1
     or exists(select 1 from pg_policies where schemaname='public' and policyname like 'evaro_%') then
    raise exception 'Rejected migration altered existing data or left partial policies';
  end if;
end \$\$;"
printf '%s\n' 'Migration preflight rejection and preservation proof PASS (isolated synthetic data only)'
