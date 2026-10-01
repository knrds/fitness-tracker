\set ON_ERROR_STOP on
-- Synthetic PostgreSQL tests. Everything below rolls back; no user data.
begin;
do $$ begin
  if current_database() !~ '^evaro_[a-z0-9_]+_coach_quota_test$' then
    raise exception 'Refusing quota fixtures outside a disposable test database';
  end if;
  if exists (select 1 from evaro_private.coach_quota_policies)
     or exists (select 1 from evaro_private.coach_quota_principals)
     or exists (select 1 from evaro_private.coach_quota_reservations) then
    raise exception 'Foundation must start disabled and without records';
  end if;
end $$;
create function pg_temp.assert_true(ok boolean, label text) returns void language plpgsql as $$
begin if ok is distinct from true then raise exception 'Quota assertion failed: %',label; end if; end $$;
select pg_temp.assert_true(not has_table_privilege('evaro_coach_server','evaro_private.coach_quota_reservations','SELECT'), 'server cannot read ledger directly');
select pg_temp.assert_true(not has_table_privilege('evaro_coach_server','evaro_private.coach_quota_reservations','UPDATE'), 'server cannot refund ledger directly');
select pg_temp.assert_true(not exists(select 1 from pg_proc p join pg_namespace n on n.oid=p.pronamespace cross join lateral aclexplode(coalesce(p.proacl,acldefault('f',p.proowner))) acl where n.nspname='evaro_private' and p.proname like 'coach_quota_%' and acl.grantee=0 and acl.privilege_type='EXECUTE'), 'PUBLIC cannot reserve');
select pg_temp.assert_true(not exists(select 1 from pg_namespace where nspname='auth'), 'plain PostgreSQL needs no auth schema');
select pg_temp.assert_true(not exists(select 1 from pg_roles where rolname='evaro_coach_owner'
  and (rolcanlogin or rolsuper or rolbypassrls or rolcreatedb or rolcreaterole or rolreplication))
  and not exists(select 1 from pg_proc p where p.pronamespace='evaro_private'::regnamespace
    and p.proowner<>(select oid from pg_roles where rolname='evaro_coach_owner')),
  'quota definers use a dedicated nonprivileged owner');
select pg_temp.assert_true((evaro_private.coach_quota_reserve_v1('beta:tester','10000000-0000-4000-8000-000000000001',repeat('a',64),'20000000-0000-4000-8000-000000000001','text','coach-beta-v1',2,120)->>'reason')='access_denied','no policy means denied');

insert into evaro_private.coach_quota_policies values ('coach-beta-v1','text',true,4,6), ('coach-beta-v1','image',true,2,2);
insert into evaro_private.coach_quota_principals values ('beta:tester','coach-beta-v1',true),('beta:other','coach-beta-v1',true);
create temp table receipts as select evaro_private.coach_quota_reserve_v1('beta:tester','10000000-0000-4000-8000-000000000001',repeat('a',64),'20000000-0000-4000-8000-000000000001','text','coach-beta-v1',2,120) as value;
select pg_temp.assert_true((select value->>'status'='reserved' from receipts),'valid reservation');
select pg_temp.assert_true((evaro_private.coach_quota_reserve_v1('beta:tester','10000000-0000-4000-8000-000000000001',repeat('a',64),'20000000-0000-4000-8000-000000000002','text','coach-beta-v1',2,120)->>'status')='in_progress','another lease cannot dispatch replay');
select pg_temp.assert_true((evaro_private.coach_quota_reserve_v1('beta:tester','10000000-0000-4000-8000-000000000001',repeat('b',64),'20000000-0000-4000-8000-000000000001','text','coach-beta-v1',2,120)->>'status')='conflict','changed payload cannot reuse request key');
select pg_temp.assert_true((evaro_private.coach_quota_reserve_v1('beta:tester','10000000-0000-4000-8000-000000000001',repeat('a',64),'20000000-0000-4000-8000-000000000001','image','coach-beta-v1',2,120)->>'status')='conflict','different modality cannot reuse key');
select pg_temp.assert_true((select evaro_private.coach_quota_begin_attempt_v1((value->>'reservation_id')::uuid,'20000000-0000-4000-8000-000000000002',1)->>'status'='conflict' from receipts),'foreign lease denied');
select pg_temp.assert_true((select evaro_private.coach_quota_begin_attempt_v1((value->>'reservation_id')::uuid,'20000000-0000-4000-8000-000000000001',2)->>'status'='conflict' from receipts),'retry cannot precede first dispatch');
select pg_temp.assert_true((select evaro_private.coach_quota_begin_attempt_v1((value->>'reservation_id')::uuid,'20000000-0000-4000-8000-000000000001',1)->>'status'='started' from receipts),'first dispatch');
select pg_temp.assert_true((select evaro_private.coach_quota_begin_attempt_v1((value->>'reservation_id')::uuid,'20000000-0000-4000-8000-000000000001',1)->>'status'='already_started' from receipts),'first dispatch single use');
select pg_temp.assert_true((select evaro_private.coach_quota_finalize_v1((value->>'reservation_id')::uuid,'20000000-0000-4000-8000-000000000002','success')->>'status'='conflict' from receipts),'foreign completion denied');
select pg_temp.assert_true((select (evaro_private.coach_quota_finalize_v1((value->>'reservation_id')::uuid,'20000000-0000-4000-8000-000000000001','success')->>'charged_units')::int=1 from receipts),'one dispatch charged');
select pg_temp.assert_true((select (evaro_private.coach_quota_finalize_v1((value->>'reservation_id')::uuid,'20000000-0000-4000-8000-000000000001','failed')->>'charged_units')::int=1 from receipts),'conflicting completion cannot refund');
select pg_temp.assert_true((evaro_private.coach_quota_reserve_v1('beta:tester','10000000-0000-4000-8000-000000000001',repeat('a',64),'20000000-0000-4000-8000-000000000002','text','coach-beta-v1',2,120)->>'status')='completed','completed replay never dispatches');

truncate receipts;
insert into receipts select evaro_private.coach_quota_reserve_v1('beta:tester','10000000-0000-4000-8000-000000000002',repeat('a',64),'20000000-0000-4000-8000-000000000002','text','coach-beta-v1',2,120);
select pg_temp.assert_true((evaro_private.coach_quota_reserve_v1('beta:tester','10000000-0000-4000-8000-000000000003',repeat('a',64),'20000000-0000-4000-8000-000000000003','text','coach-beta-v1',2,120)->>'reason')='user_limit','user limit includes held reservations');
update evaro_private.coach_quota_reservations set expires_at=clock_timestamp()-interval '1 second' where request_key='10000000-0000-4000-8000-000000000002';
select pg_temp.assert_true((select (evaro_private.coach_quota_finalize_v1((value->>'reservation_id')::uuid,'20000000-0000-4000-8000-000000000002','failed')->>'charged_units')::int=0 from receipts),'untouched expiry refunded');
truncate receipts;
insert into receipts select evaro_private.coach_quota_reserve_v1('beta:tester','10000000-0000-4000-8000-000000000003',repeat('a',64),'20000000-0000-4000-8000-000000000003','text','coach-beta-v1',2,120);
select pg_temp.assert_true((select evaro_private.coach_quota_begin_attempt_v1((value->>'reservation_id')::uuid,'20000000-0000-4000-8000-000000000003',1)->>'status'='started' from receipts),'third reservation dispatch');
update evaro_private.coach_quota_reservations set expires_at=clock_timestamp()-interval '1 second' where request_key='10000000-0000-4000-8000-000000000003';
select pg_temp.assert_true((select evaro_private.coach_quota_begin_attempt_v1((value->>'reservation_id')::uuid,'20000000-0000-4000-8000-000000000003',2)->>'status'='expired' from receipts),'expired dispatch refused');
select pg_temp.assert_true((select charged_units=2 from evaro_private.coach_quota_reservations where request_key='10000000-0000-4000-8000-000000000003'),'expired uncertain provider spend held conservatively');
select pg_temp.assert_true((evaro_private.coach_quota_reserve_v1('beta:other','10000000-0000-4000-8000-000000000004',repeat('a',64),'20000000-0000-4000-8000-000000000004','text','coach-beta-v1',2,120)->>'status')='reserved','other user has independent allowance');
select pg_temp.assert_true((evaro_private.coach_quota_reserve_v1('beta:other','10000000-0000-4000-8000-000000000005',repeat('a',64),'20000000-0000-4000-8000-000000000005','text','coach-beta-v1',2,120)->>'reason')='global_limit','global limit spans principals');
select pg_temp.assert_true((evaro_private.coach_quota_reserve_v1('beta:unknown','10000000-0000-4000-8000-000000000006',repeat('a',64),'20000000-0000-4000-8000-000000000006','text','coach-beta-v1',2,120)->>'reason')='access_denied','mint rotation not enrolled');
select pg_temp.assert_true((evaro_private.coach_quota_reserve_v1('beta:tester','10000000-0000-4000-8000-000000000006',repeat('a',64),'20000000-0000-4000-8000-000000000006','image','coach-beta-v1',2,120)->>'status')='reserved','image budget separate');
update evaro_private.coach_quota_principals set enabled=false where principal='beta:other';
select pg_temp.assert_true((evaro_private.coach_quota_begin_attempt_v1((select id from evaro_private.coach_quota_reservations where request_key='10000000-0000-4000-8000-000000000004'),'20000000-0000-4000-8000-000000000004',1)->>'reason')='access_denied','revoked membership stops provider dispatch');
set local role evaro_coach_server;
select evaro_private.coach_quota_reserve_v1('beta:unknown','10000000-0000-4000-8000-000000000006',repeat('a',64),'20000000-0000-4000-8000-000000000006','text','coach-beta-v1',2,120);
reset role;
select pg_temp.assert_true(not exists(select 1 from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname='public' and p.proname like 'coach_quota_%'),'no exposed PUBLIC RPC');
rollback;
\echo 'Coach quota SQL lifecycle/permissions/rollback assertions PASS'
