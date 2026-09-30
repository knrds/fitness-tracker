#!/usr/bin/env bash
set -euo pipefail
# Disposable local PostgreSQL only. No remote option, reset/drop or user fixtures.
export PGHOST=127.0.0.1
export PGHOSTADDR=127.0.0.1
unset PGSERVICE PGSERVICEFILE
export PGPORT="${PGPORT:-55432}"
export PGUSER="${PGUSER:-evaro_test_admin}"
test_db="evaro_${RANDOM}_$(date +%s)_coach_quota_test"
log_dir="$(mktemp -d)"
createdb "$test_db"
export PGDATABASE="$test_db"
psql -X -v ON_ERROR_STOP=1 -f database/coach-quota.sql > "$log_dir/install.log"
psql -X -v ON_ERROR_STOP=1 -f database/tests/coach-quota.sql > "$log_dir/lifecycle.log"
grep 'assertions PASS' "$log_dir/lifecycle.log"
if psql -X -v ON_ERROR_STOP=1 -c "begin isolation level repeatable read; select evaro_private.coach_quota_reserve_v1('beta:tester',gen_random_uuid(),repeat('a',64),gen_random_uuid(),'text','coach-beta-v1',2,120);" > "$log_dir/isolation.log" 2>&1; then
  printf '%s\n' 'ERROR: stale-snapshot quota transaction accepted'
  exit 1
fi
grep -q 'Quota requires READ COMMITTED' "$log_dir/isolation.log"
psql -X -v ON_ERROR_STOP=1 -c "do \$\$ begin
  if exists(select 1 from evaro_private.coach_quota_policies)
     or exists(select 1 from evaro_private.coach_quota_principals)
     or exists(select 1 from evaro_private.coach_quota_reservations) then
    raise exception 'Test fixtures survived rollback';
  end if;
end \$\$;" > "$log_dir/rollback.log"

# Concurrent independent clients must share one global bound. Synthetic only.
psql -X -v ON_ERROR_STOP=1 -c "insert into evaro_private.coach_quota_policies values ('coach-beta-v1','text',true,8,8);
  insert into evaro_private.coach_quota_principals values ('beta:parallel','coach-beta-v1',true);" > "$log_dir/seed.log"
run_request() {
  psql -X -At -v ON_ERROR_STOP=1 -c "set role evaro_coach_server;
    select evaro_private.coach_quota_reserve_v1('beta:parallel',gen_random_uuid(),repeat('a',64),gen_random_uuid(),'text','coach-beta-v1',2,120);" > "$log_dir/parallel_$1.log"
}
pids=()
for i in $(seq 1 24); do run_request "$i" & pids+=("$!"); done
for pid in "${pids[@]}"; do wait "$pid"; done
psql -X -v ON_ERROR_STOP=1 -c "do \$\$ begin
  if (select count(*) from evaro_private.coach_quota_reservations) <> 4
     or (select sum(reserved_units) from evaro_private.coach_quota_reservations) <> 8 then
    raise exception 'Concurrent requests bypassed the global/user bound';
  end if;
end \$\$;" > "$log_dir/parallel-proof.log"

# Same request raced through distinct leases: exactly one new admission.
psql -X -v ON_ERROR_STOP=1 -c "update evaro_private.coach_quota_policies set user_daily_units=100,global_daily_units=100;" > "$log_dir/replay-setup.log"
run_replay() {
  psql -X -At -v ON_ERROR_STOP=1 -c "set role evaro_coach_server;
    select evaro_private.coach_quota_reserve_v1('beta:parallel','30000000-0000-4000-8000-000000000001',repeat('b',64),gen_random_uuid(),'text','coach-beta-v1',2,120);" > "$log_dir/replay_$1.log"
}
pids=()
for i in $(seq 1 16); do run_replay "$i" & pids+=("$!"); done
for pid in "${pids[@]}"; do wait "$pid"; done
test "$(grep -l '"status": "reserved"' "$log_dir"/replay_*.log | wc -l)" -eq 1
test "$(grep -l '"status": "in_progress"' "$log_dir"/replay_*.log | wc -l)" -eq 15
psql -X -v ON_ERROR_STOP=1 -c "do \$\$ begin
  if (select count(*) from evaro_private.coach_quota_reservations where request_key='30000000-0000-4000-8000-000000000001') <> 1 then
    raise exception 'Concurrent replay created duplicate reservations';
  end if;
end \$\$;" > "$log_dir/replay-proof.log"
printf 'Coach quota 24-client budget and 16-client replay concurrency PASS; database: %s; logs: %s\n' "$test_db" "$log_dir"

# Existing default grants must not turn a definer function into a client API.
unsafe_db="evaro_${RANDOM}_$(date +%s)_unsafe_coach_quota_test"
createdb "$unsafe_db"
export PGDATABASE="$unsafe_db"
psql -X -v ON_ERROR_STOP=1 -c "do \$\$ begin
  if not exists(select 1 from pg_roles where rolname='evaro_quota_test_client') then
    create role evaro_quota_test_client nologin nosuperuser nobypassrls;
  end if;
end \$\$; alter default privileges grant execute on functions to evaro_quota_test_client;" > "$log_dir/default-grants.log"
if psql -X -v ON_ERROR_STOP=1 -f database/coach-quota.sql > "$log_dir/unsafe-install.log" 2>&1; then
  printf '%s\n' 'ERROR: unsafe inherited default grants accepted'
  exit 1
fi
grep -q 'pre-existing/default client privileges require review' "$log_dir/unsafe-install.log"
psql -X -v ON_ERROR_STOP=1 -c "do \$\$ begin
  if exists(select 1 from pg_namespace where nspname='evaro_private') then
    raise exception 'Rejected quota installation left partial schema';
  end if;
end \$\$;" > "$log_dir/preflight-rollback.log"
printf '%s\n' 'Coach quota READ COMMITTED enforcement, default-grant rejection and installation rollback PASS'
if psql -X -v ON_ERROR_STOP=1 -c "begin; grant evaro_quota_test_client to evaro_coach_server;" -f database/coach-quota.sql > "$log_dir/unsafe-role.log" 2>&1; then
  printf '%s\n' 'ERROR: inherited server authority accepted'
  exit 1
fi
grep -q 'Existing coach role has unsafe memberships' "$log_dir/unsafe-role.log"
psql -X -v ON_ERROR_STOP=1 -c "do \$\$ begin
  if exists(select 1 from pg_auth_members
            where member=(select oid from pg_roles where rolname='evaro_coach_server')
               or roleid=(select oid from pg_roles where rolname='evaro_coach_server'))
     or exists(select 1 from pg_namespace where nspname='evaro_private') then
    raise exception 'Rejected role preflight failed to roll back';
  end if;
end \$\$;" > "$log_dir/role-rollback.log"
printf '%s\n' 'Coach quota unsafe role inheritance rejected; fixture grant rolled back PASS'
if psql -X -v ON_ERROR_STOP=1 -c "begin; grant evaro_coach_server to evaro_quota_test_client;" -f database/coach-quota.sql > "$log_dir/unsafe-recipient.log" 2>&1; then
  printf '%s\n' 'ERROR: existing client recipient of server authority accepted'
  exit 1
fi
grep -q 'Existing coach role has unsafe memberships' "$log_dir/unsafe-recipient.log"
psql -X -v ON_ERROR_STOP=1 -c "do \$\$ begin
  if exists(select 1 from pg_auth_members
            where member=(select oid from pg_roles where rolname='evaro_coach_server')
               or roleid=(select oid from pg_roles where rolname='evaro_coach_server'))
     or exists(select 1 from pg_namespace where nspname='evaro_private') then
    raise exception 'Rejected recipient preflight failed to roll back';
  end if;
end \$\$;" > "$log_dir/recipient-rollback.log"
printf '%s\n' 'Coach quota existing client recipient rejected; fixture grant rolled back PASS'
