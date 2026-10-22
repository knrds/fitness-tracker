#!/usr/bin/env bash
set -euo pipefail
# Fresh named loopback databases only. No remote, DROP/reset or real user fixtures.
export PGHOST=127.0.0.1 PGHOSTADDR=127.0.0.1
unset PGSERVICE PGSERVICEFILE PGOPTIONS
export PGPORT="${PGPORT:-55432}" PGUSER="${PGUSER:-evaro_test_admin}"
test_db="evaro_${RANDOM}_$(date +%s)_account_deletion_test"
log_dir="$(mktemp -d)"
createdb "$test_db"
export PGDATABASE="$test_db"
psql -X -v ON_ERROR_STOP=1 -f database/account-deletion-journal.sql > "$log_dir/install.log"
psql -X -v ON_ERROR_STOP=1 -f database/tests/account-deletion-journal.sql > "$log_dir/lifecycle.log"
awk '/passed_assertions/{show=1} show{print} /assertions PASS/{show=0}' "$log_dir/lifecycle.log"
psql -X -v ON_ERROR_STOP=1 -c "do \$\$ begin
  if exists(select 1 from evaro_deletion_private.account_deletion_operations) then
    raise exception 'Deletion fixtures survived rollback';
  end if;
end \$\$;" > "$log_dir/rollback.log"
isolation_queries=(
  "account_deletion_claim_v1(gen_random_uuid(),gen_random_uuid(),clock_timestamp())"
  "account_deletion_claim_authorized_v1(gen_random_uuid())"
  "account_deletion_mark_stage_v1(gen_random_uuid(),gen_random_uuid(),gen_random_uuid(),'verifyCompletion')"
  "account_deletion_complete_v1(gen_random_uuid(),gen_random_uuid(),gen_random_uuid(),clock_timestamp())"
  "account_deletion_release_v1(gen_random_uuid(),gen_random_uuid(),gen_random_uuid())"
)
for isolation in 'repeatable read' serializable; do
  for query in "${isolation_queries[@]}"; do
    if psql -X -v ON_ERROR_STOP=1 -c "begin isolation level $isolation; select evaro_deletion_private.$query;" > "$log_dir/isolation.log" 2>&1; then
      printf '%s\n' 'ERROR: stale-snapshot deletion transaction accepted'; exit 1
    fi
    awk '/Deletion journal requires READ COMMITTED/{found=1} END{exit !found}' "$log_dir/isolation.log"
  done
done

# One user, distinct request IDs: one acquisition/authorization across instances.
run_user_claim() {
  psql -X -qAt -v ON_ERROR_STOP=1 -c "set role evaro_deletion_server;
    select evaro_deletion_private.account_deletion_claim_v1('10000000-0000-4000-8000-000000000010',gen_random_uuid(),clock_timestamp())->>'status';" > "$log_dir/user_$1.log"
}
pids=()
for i in $(seq 1 24); do run_user_claim "$i" & pids+=("$!"); done
for pid in "${pids[@]}"; do wait "$pid"; done
test "$(awk '$0=="acquired"{n++} END{print n+0}' "$log_dir"/user_*.log)" -eq 1
test "$(awk '$0=="busy"{n++} END{print n+0}' "$log_dir"/user_*.log)" -eq 23

# One global request ID raced by different subjects cannot rebind its owner.
run_request_claim() {
  psql -X -qAt -v ON_ERROR_STOP=1 -c "set role evaro_deletion_server;
    select evaro_deletion_private.account_deletion_claim_v1(gen_random_uuid(),'20000000-0000-4000-8000-000000000010',clock_timestamp())->>'status';" > "$log_dir/request_$1.log"
}
pids=()
for i in $(seq 1 16); do run_request_claim "$i" & pids+=("$!"); done
for pid in "${pids[@]}"; do wait "$pid"; done
test "$(awk '$0=="acquired"{n++} END{print n+0}' "$log_dir"/request_*.log)" -eq 1
test "$(awk '$0=="busy"{n++} END{print n+0}' "$log_dir"/request_*.log)" -eq 15
psql -X -v ON_ERROR_STOP=1 -c "do \$\$ begin
  if (select count(*) from evaro_deletion_private.account_deletion_operations)<>2 then
    raise exception 'Concurrent claims created duplicate journal records';
  end if;
end \$\$;" > "$log_dir/concurrency-proof.log"
printf '%s\n' 'Account deletion 24-client subject and 16-client request binding concurrency PASS'

# Wait behind a real row lock while the lease expires. Validation must occur
# after acquiring the lock, not against a pre-wait clock/snapshot.
request_id="$(psql -X -qAt -v ON_ERROR_STOP=1 -c "select request_id from evaro_deletion_private.account_deletion_operations where user_id='10000000-0000-4000-8000-000000000010';")"
old_lease="$(psql -X -qAt -v ON_ERROR_STOP=1 -c "select lease_id from evaro_deletion_private.account_deletion_operations where request_id='$request_id';")"
[[ "$request_id" =~ ^[a-f0-9-]{36}$ && "$old_lease" =~ ^[a-f0-9-]{36}$ ]]
psql -X -v ON_ERROR_STOP=1 -c "update evaro_deletion_private.account_deletion_operations set lease_expires_at=clock_timestamp()+interval '1 second' where request_id='$request_id';" > "$log_dir/expiry-setup.log"
hold_app="evaro_deletion_hold_${RANDOM}"
PGAPPNAME="$hold_app" psql -X -qAt -v ON_ERROR_STOP=1 -c "begin;
  select request_id from evaro_deletion_private.account_deletion_operations where request_id='$request_id' for update;
  select pg_sleep(1.4); commit;" > "$log_dir/row-holder.log" &
holder_pid=$!
wait_for_activity() {
  local app="$1" event="$2" found=false
  for _ in $(seq 1 100); do
    if test "$(psql -X -qAt -v ON_ERROR_STOP=1 -c "select count(*) from pg_stat_activity where application_name='$app' and wait_event_type='$event';")" -eq 1; then
      found=true; break
    fi
    sleep 0.01
  done
  test "$found" = true
}
wait_for_activity "$hold_app" Timeout
worker_app="evaro_deletion_expiry_${RANDOM}"
PGAPPNAME="$worker_app" psql -X -qAt -v ON_ERROR_STOP=1 -c "set role evaro_deletion_server;
  select evaro_deletion_private.account_deletion_mark_stage_v1('10000000-0000-4000-8000-000000000010','$request_id','$old_lease','fenceWritesAndRevokeSessions');" > "$log_dir/expired-worker.log" 2>&1 &
worker_pid=$!
wait_for_activity "$worker_app" Lock
wait "$holder_pid"
if wait "$worker_pid"; then printf '%s\n' 'ERROR: lease expired behind lock still accepted'; exit 1; fi
awk '/Invalid deletion stage or lease/{found=1} END{exit !found}' "$log_dir/expired-worker.log"

lease_id="$(psql -X -qAt -v ON_ERROR_STOP=1 -c "set role evaro_deletion_server; select evaro_deletion_private.account_deletion_claim_authorized_v1('$request_id')->>'leaseId';")"
[[ "$lease_id" =~ ^[a-f0-9-]{36}$ && "$lease_id" != "$old_lease" ]]
first_ack="$(psql -X -qAt -v ON_ERROR_STOP=1 -c "set role evaro_deletion_server;
  select evaro_deletion_private.account_deletion_mark_stage_v1('10000000-0000-4000-8000-000000000010','$request_id','$lease_id','fenceWritesAndRevokeSessions');")"
replayed_ack="$(psql -X -qAt -v ON_ERROR_STOP=1 -c "set role evaro_deletion_server;
  select evaro_deletion_private.account_deletion_mark_stage_v1('10000000-0000-4000-8000-000000000010','$request_id','$lease_id','fenceWritesAndRevokeSessions');")"
test "$first_ack" = "$replayed_ack"
psql -X -v ON_ERROR_STOP=1 -c "set role evaro_deletion_server; do \$\$ declare v_stage text; begin
  foreach v_stage in array array['deletePrivateStorage','deleteProviderData','deleteCloudData','deleteAuthIdentity','verifyCompletion'] loop
    perform evaro_deletion_private.account_deletion_mark_stage_v1('10000000-0000-4000-8000-000000000010','$request_id','$lease_id',v_stage);
  end loop;
end \$\$;" > "$log_dir/remaining-stages.log"
first_receipt="$(psql -X -qAt -v ON_ERROR_STOP=1 -c "set role evaro_deletion_server;
  select evaro_deletion_private.account_deletion_complete_v1('10000000-0000-4000-8000-000000000010','$request_id','$lease_id',clock_timestamp());")"
replayed_receipt="$(psql -X -qAt -v ON_ERROR_STOP=1 -c "set role evaro_deletion_server;
  select evaro_deletion_private.account_deletion_claim_authorized_v1('$request_id')->'receipt';")"
test "$first_receipt" = "$replayed_receipt"
printf '%s\n' 'Account deletion real lease expiry after row lock and cross-connection lost-ACK replay PASS'

# Default grants and preexisting membership cannot silently expose a definer.
unsafe_db="evaro_${RANDOM}_$(date +%s)_unsafe_account_deletion_test"
createdb "$unsafe_db"
export PGDATABASE="$unsafe_db"
psql -X -v ON_ERROR_STOP=1 -c "do \$\$ begin
  if not exists(select 1 from pg_roles where rolname='evaro_deletion_test_client') then
    create role evaro_deletion_test_client nologin nosuperuser nobypassrls;
  end if;
end \$\$; alter default privileges grant execute on functions to evaro_deletion_test_client;" > "$log_dir/default-grants.log"
if psql -X -v ON_ERROR_STOP=1 -f database/account-deletion-journal.sql > "$log_dir/unsafe-install.log" 2>&1; then
  printf '%s\n' 'ERROR: unsafe inherited default grants accepted'; exit 1
fi
awk '/pre-existing\/default client privileges require review/{found=1} END{exit !found}' "$log_dir/unsafe-install.log"
psql -X -v ON_ERROR_STOP=1 -c "alter default privileges revoke execute on functions from evaro_deletion_test_client;
  alter default privileges grant select on tables to evaro_deletion_test_client;" > "$log_dir/default-table-grants.log"
if psql -X -v ON_ERROR_STOP=1 -f database/account-deletion-journal.sql > "$log_dir/unsafe-table-install.log" 2>&1; then
  printf '%s\n' 'ERROR: unsafe inherited table grants accepted'; exit 1
fi
awk '/pre-existing\/default client privileges require review/{found=1} END{exit !found}' "$log_dir/unsafe-table-install.log"
for owner in evaro_deletion_server evaro_deletion_owner; do
  for direction in inherited recipient; do
    if test "$direction" = inherited; then grant_sql="grant evaro_deletion_test_client to $owner;"
    else grant_sql="grant $owner to evaro_deletion_test_client;"; fi
    if psql -X -v ON_ERROR_STOP=1 -c "begin; $grant_sql" -f database/account-deletion-journal.sql > "$log_dir/${owner}_${direction}.log" 2>&1; then
      printf '%s\n' 'ERROR: unsafe role membership accepted'; exit 1
    fi
    awk '/Existing deletion role has unsafe memberships/{found=1} END{exit !found}' "$log_dir/${owner}_${direction}.log"
  done
done
psql -X -v ON_ERROR_STOP=1 -c "do \$\$ begin
  if exists(select 1 from pg_namespace where nspname='evaro_deletion_private') or
    exists(select 1 from pg_auth_members where
      member in(select oid from pg_roles where rolname in('evaro_deletion_server','evaro_deletion_owner')) or
      roleid in(select oid from pg_roles where rolname in('evaro_deletion_server','evaro_deletion_owner'))) then
    raise exception 'Rejected installation/membership fixture survived rollback';
  end if;
end \$\$;" > "$log_dir/preflight-rollback.log"
printf 'Account deletion READ COMMITTED/default-grant/membership preflight rollback PASS; database: %s; logs: %s\n' "$test_db" "$log_dir"
