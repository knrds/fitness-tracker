\set ON_ERROR_STOP on
-- Synthetic assertions only; all records, grants and test helpers roll back.
begin;
do $$ begin
  if current_database() !~ '^evaro_[a-z0-9_]+_account_deletion_test$' then
    raise exception 'Refusing deletion fixtures outside a disposable test database';
  end if;
  if exists(select 1 from evaro_deletion_private.account_deletion_operations) then
    raise exception 'Deletion journal must start without enrollment or records';
  end if;
end $$;
create temp table assertion_count(n integer);
insert into assertion_count values(0);
create function pg_temp.assert_true(ok boolean,label text) returns void language plpgsql as $$ begin
  if ok is distinct from true then raise exception 'Deletion assertion failed: %',label; end if;
  update pg_temp.assertion_count set n=n+1;
end $$;
create function pg_temp.expect_error(query text,label text) returns void language plpgsql as $$ begin
  begin execute query; exception when sqlstate '22023' then
    perform pg_temp.assert_true(true,label); return;
  end;
  raise exception 'Deletion expected rejection: %',label;
end $$;

select pg_temp.assert_true(not exists(select 1 from pg_namespace where nspname='auth'),'plain PG needs no Auth schema');
select pg_temp.assert_true(not has_schema_privilege('evaro_deletion_server','evaro_deletion_private','CREATE'),'server cannot create objects');
select pg_temp.assert_true(not has_table_privilege('evaro_deletion_server','evaro_deletion_private.account_deletion_operations','SELECT,INSERT,UPDATE,DELETE,TRUNCATE'),'server cannot access journal directly');
select pg_temp.assert_true(not exists(select 1 from pg_proc p join pg_namespace n on n.oid=p.pronamespace
  cross join lateral aclexplode(coalesce(p.proacl,acldefault('f',p.proowner))) a
  where n.nspname='evaro_deletion_private' and a.grantee=0),'PUBLIC has no function privileges');
select pg_temp.assert_true(not exists(select 1 from pg_proc p join pg_namespace n on n.oid=p.pronamespace
  join pg_roles r on r.oid=p.proowner where n.nspname='evaro_deletion_private' and
  (r.rolname<>'evaro_deletion_owner' or r.rolsuper or r.rolcanlogin or r.rolbypassrls)),'functions have minimal NOLOGIN owner');
select pg_temp.assert_true(not exists(select 1 from pg_proc p join pg_namespace n on n.oid=p.pronamespace
  where n.nspname='evaro_deletion_private' and not ('search_path=""'=any(p.proconfig))),'function search paths are fixed');
select pg_temp.assert_true(evaro_deletion_private.account_deletion_claim_authorized_v1('20000000-0000-4000-8000-000000000099') is null,'unknown private resume cannot authorize');

create temp table fixtures(name text primary key,value jsonb);
insert into fixtures values('first',evaro_deletion_private.account_deletion_claim_v1(
  '10000000-0000-4000-8000-000000000001','20000000-0000-4000-8000-000000000001',clock_timestamp()));
select pg_temp.assert_true((select value->>'status'='acquired' and value->'record'->>'version'='1' and
  value->'record'->'completed_stages'='[]'::jsonb from fixtures where name='first'),'first claim is strict acquired record');
select pg_temp.assert_true((select lease_expires_at between clock_timestamp()+interval '119 seconds' and clock_timestamp()+interval '121 seconds'
  from evaro_deletion_private.account_deletion_operations),'lease is bounded to 120 seconds');
select pg_temp.assert_true((evaro_deletion_private.account_deletion_claim_v1('10000000-0000-4000-8000-000000000001',
  '20000000-0000-4000-8000-000000000002',clock_timestamp())->>'status')='busy','another request for same subject is blocked');
select pg_temp.assert_true((evaro_deletion_private.account_deletion_claim_v1('10000000-0000-4000-8000-000000000002',
  '20000000-0000-4000-8000-000000000001',clock_timestamp())->>'status')='busy','request reuse cannot change owner or reveal receipt');
select pg_temp.assert_true((evaro_deletion_private.account_deletion_claim_authorized_v1('20000000-0000-4000-8000-000000000001')->>'status')='busy','live worker excludes other worker');
select pg_temp.expect_error($q$select evaro_deletion_private.account_deletion_claim_v1(null,gen_random_uuid(),clock_timestamp())$q$,'null principal denied');
select pg_temp.expect_error($q$select evaro_deletion_private.account_deletion_claim_v1(gen_random_uuid(),gen_random_uuid(),'infinity')$q$,'infinite authorization denied');
select pg_temp.expect_error($q$select evaro_deletion_private.account_deletion_claim_v1(gen_random_uuid(),gen_random_uuid(),clock_timestamp()+interval '30 seconds')$q$,'authorization beyond bounded clock skew denied');
select pg_temp.expect_error($q$select evaro_deletion_private.account_deletion_claim_v1(gen_random_uuid(),gen_random_uuid(),clock_timestamp()-interval '6 minutes')$q$,'stale initial authorization denied');

do $$ declare v_lease uuid; v_record jsonb; v_stages text[]:=array['fenceWritesAndRevokeSessions','deletePrivateStorage',
  'deleteProviderData','deleteCloudData','deleteAuthIdentity','verifyCompletion']; v_expiry timestamptz; v_stage text;
begin
  select (value->>'leaseId')::uuid into v_lease from fixtures where name='first';
  perform pg_temp.expect_error(format('select evaro_deletion_private.account_deletion_mark_stage_v1(%L,%L,%L,%L)',
    '10000000-0000-4000-8000-000000000001','20000000-0000-4000-8000-000000000001',v_lease,'deletePrivateStorage'),'out-of-order stage denied');
  perform pg_temp.expect_error(format('select evaro_deletion_private.account_deletion_complete_v1(%L,%L,%L,clock_timestamp())',
    '10000000-0000-4000-8000-000000000001','20000000-0000-4000-8000-000000000001',v_lease),'incomplete stages cannot mint receipt');
  perform pg_temp.expect_error(format('select evaro_deletion_private.account_deletion_mark_stage_v1(%L,%L,%L,%L)',
    '10000000-0000-4000-8000-000000000002','20000000-0000-4000-8000-000000000001',v_lease,v_stages[1]),'foreign user cannot mark progress');
  perform pg_temp.expect_error(format('select evaro_deletion_private.account_deletion_mark_stage_v1(%L,%L,%L,%L)',
    '10000000-0000-4000-8000-000000000001','20000000-0000-4000-8000-000000000001',gen_random_uuid(),v_stages[1]),'foreign lease cannot mark progress');
  perform pg_temp.expect_error(format('select evaro_deletion_private.account_deletion_mark_stage_v1(%L,%L,%L,%L)',
    '10000000-0000-4000-8000-000000000001','20000000-0000-4000-8000-000000000001',v_lease,'unknownStage'),'unknown stage denied');
  perform pg_temp.assert_true(not evaro_deletion_private.account_deletion_release_v1(
    '10000000-0000-4000-8000-000000000001','20000000-0000-4000-8000-000000000001',gen_random_uuid()),'foreign lease release is conditional');
  v_record:=evaro_deletion_private.account_deletion_mark_stage_v1('10000000-0000-4000-8000-000000000001',
    '20000000-0000-4000-8000-000000000001',v_lease,v_stages[1]);
  select lease_expires_at into v_expiry from evaro_deletion_private.account_deletion_operations;
  perform pg_temp.assert_true(evaro_deletion_private.account_deletion_mark_stage_v1('10000000-0000-4000-8000-000000000001',
    '20000000-0000-4000-8000-000000000001',v_lease,v_stages[1])=v_record,'lost stage ACK replays exact committed prefix');
  perform pg_temp.assert_true((select lease_expires_at=v_expiry from evaro_deletion_private.account_deletion_operations),'replayed stage does not extend lease');
  update evaro_deletion_private.account_deletion_operations set lease_expires_at=clock_timestamp()-interval '1 second';
  perform pg_temp.expect_error(format('select evaro_deletion_private.account_deletion_mark_stage_v1(%L,%L,%L,%L)',
    '10000000-0000-4000-8000-000000000001','20000000-0000-4000-8000-000000000001',v_lease,v_stages[2]),'expired stage write denied');
  insert into fixtures values('resumed',evaro_deletion_private.account_deletion_claim_authorized_v1('20000000-0000-4000-8000-000000000001'));
  perform pg_temp.assert_true((select value->>'status'='acquired' and (value->>'leaseId')::uuid<>v_lease and
    value->'record'=v_record from fixtures where name='resumed'),'expiry yields unique lease with unchanged authorization/progress');
  perform pg_temp.assert_true(not evaro_deletion_private.account_deletion_release_v1(
    '10000000-0000-4000-8000-000000000001','20000000-0000-4000-8000-000000000001',v_lease),'old worker cannot release new lease');
  perform pg_temp.expect_error(format('select evaro_deletion_private.account_deletion_mark_stage_v1(%L,%L,%L,%L)',
    '10000000-0000-4000-8000-000000000001','20000000-0000-4000-8000-000000000001',v_lease,v_stages[2]),'old worker cannot write under new lease');
  select (value->>'leaseId')::uuid into v_lease from fixtures where name='resumed';
  perform pg_temp.assert_true(evaro_deletion_private.account_deletion_release_v1(
    '10000000-0000-4000-8000-000000000001','20000000-0000-4000-8000-000000000001',v_lease),'current worker releases lease');
  insert into fixtures values('reauthorized',evaro_deletion_private.account_deletion_claim_v1('10000000-0000-4000-8000-000000000001',
    '20000000-0000-4000-8000-000000000001',clock_timestamp()));
  perform pg_temp.assert_true((select value->'record'=v_record from fixtures where name='reauthorized'),'repeated fresh claim cannot rewrite authorization');
  select (value->>'leaseId')::uuid into v_lease from fixtures where name='reauthorized';
  foreach v_stage in array v_stages[2:6] loop
    v_record:=evaro_deletion_private.account_deletion_mark_stage_v1('10000000-0000-4000-8000-000000000001',
      '20000000-0000-4000-8000-000000000001',v_lease,v_stage);
    perform pg_temp.assert_true(v_record->'completed_stages'=to_jsonb(v_stages[1:array_position(v_stages,v_stage)]),'each committed stage is exactly the ordered prefix');
  end loop;
  perform pg_temp.expect_error(format('select evaro_deletion_private.account_deletion_complete_v1(%L,%L,%L,%L)',
    '10000000-0000-4000-8000-000000000001','20000000-0000-4000-8000-000000000001',v_lease,'2000-01-01T00:00:00Z'),'receipt cannot predate authorization');
  perform pg_temp.expect_error(format('select evaro_deletion_private.account_deletion_complete_v1(%L,%L,%L,clock_timestamp()+interval ''30 seconds'')',
    '10000000-0000-4000-8000-000000000001','20000000-0000-4000-8000-000000000001',v_lease),'receipt beyond bounded clock skew denied');
  update evaro_deletion_private.account_deletion_operations set lease_expires_at=clock_timestamp()-interval '1 second';
  perform pg_temp.expect_error(format('select evaro_deletion_private.account_deletion_complete_v1(%L,%L,%L,clock_timestamp())',
    '10000000-0000-4000-8000-000000000001','20000000-0000-4000-8000-000000000001',v_lease),'expired worker cannot mint receipt');
  insert into fixtures values('after_auth_removal',evaro_deletion_private.account_deletion_claim_authorized_v1('20000000-0000-4000-8000-000000000001'));
  perform pg_temp.assert_true((select value->'record'=v_record from fixtures where name='after_auth_removal'),'all progress survives private recovery after Auth stage');
  select (value->>'leaseId')::uuid into v_lease from fixtures where name='after_auth_removal';
  insert into fixtures values('receipt',evaro_deletion_private.account_deletion_complete_v1('10000000-0000-4000-8000-000000000001',
    '20000000-0000-4000-8000-000000000001',v_lease,clock_timestamp()));
  perform pg_temp.assert_true((select value ?& array['version','success','user_id','deleted_at'] and
    value->>'version'='1' and value->>'success'='true' and value->>'user_id'='10000000-0000-4000-8000-000000000001' and
    (select count(*) from jsonb_object_keys(value))=4 from fixtures where name='receipt'),'completion persists only strict client receipt');
  perform pg_temp.assert_true((select evaro_deletion_private.account_deletion_complete_v1('10000000-0000-4000-8000-000000000001',
    '20000000-0000-4000-8000-000000000001',v_lease,clock_timestamp())=value from fixtures where name='receipt'),'lost completion ACK returns original timestamp');
  perform pg_temp.assert_true((select evaro_deletion_private.account_deletion_claim_authorized_v1('20000000-0000-4000-8000-000000000001')->'receipt'=value
    from fixtures where name='receipt'),'private replay survives unavailable Auth');
  perform pg_temp.assert_true(not evaro_deletion_private.account_deletion_release_v1(
    '10000000-0000-4000-8000-000000000001','20000000-0000-4000-8000-000000000001',v_lease),'completion cannot be released or reopened');
end $$;
-- Explicit trusted host clock ahead of DB: preserving original milliseconds
-- prevents the application from receiving an earlier receipt/authorization.
do $$ declare v_user uuid:=gen_random_uuid(); v_request uuid:=gen_random_uuid(); v_lease uuid;
  v_time timestamptz:=date_trunc('milliseconds',clock_timestamp()+interval '4 seconds'); v_claim jsonb; v_receipt jsonb; v_stage text;
begin
  v_claim:=evaro_deletion_private.account_deletion_claim_v1(v_user,v_request,v_time);
  perform pg_temp.assert_true(v_claim->>'status'='acquired','bounded ahead-of-DB clock authorizes verified server request');
  perform pg_temp.assert_true((v_claim->'record'->>'authorized_at')::timestamptz=v_time,'accepted authorization timestamp stays exact');
  v_lease:=(v_claim->>'leaseId')::uuid;
  foreach v_stage in array array['fenceWritesAndRevokeSessions','deletePrivateStorage','deleteProviderData',
    'deleteCloudData','deleteAuthIdentity','verifyCompletion'] loop
    perform evaro_deletion_private.account_deletion_mark_stage_v1(v_user,v_request,v_lease,v_stage);
  end loop;
  v_receipt:=evaro_deletion_private.account_deletion_complete_v1(v_user,v_request,v_lease,v_time);
  perform pg_temp.assert_true((v_receipt->>'deleted_at')::timestamptz=v_time,'bounded ahead-of-DB completion keeps exact server timestamp');
  perform pg_temp.assert_true(evaro_deletion_private.account_deletion_claim_authorized_v1(v_request)->'receipt'=v_receipt,'bounded-skew receipt replays unchanged');
end $$;
select pg_temp.expect_error($q$update evaro_deletion_private.account_deletion_operations set authorized_at=clock_timestamp()$q$,'authorization is immutable even through direct UPDATE');
select pg_temp.expect_error($q$update evaro_deletion_private.account_deletion_operations set user_id=gen_random_uuid()$q$,'journal owner cannot reassign identity');
select pg_temp.expect_error($q$update evaro_deletion_private.account_deletion_operations set receipt=null$q$,'persisted receipt is immutable');
select pg_temp.assert_true((evaro_deletion_private.account_deletion_claim_v1('10000000-0000-4000-8000-000000000001',
  '20000000-0000-4000-8000-000000000002',clock_timestamp())->>'status')='busy','completed subject remains bound to original request');

set local role evaro_deletion_server;
do $$ begin
  begin perform 1 from evaro_deletion_private.account_deletion_operations; raise exception 'Server table read accepted';
    exception when insufficient_privilege then null; end;
  begin perform evaro_deletion_private.account_deletion_acquire_v1(null,gen_random_uuid(),null,false); raise exception 'Server helper execute accepted';
    exception when insufficient_privilege then null; end;
  begin execute 'delete from evaro_deletion_private.account_deletion_operations'; raise exception 'Server journal deletion accepted';
    exception when insufficient_privilege then null; end;
  begin execute 'create table evaro_deletion_private.client_created(id integer)'; raise exception 'Server schema create accepted';
    exception when insufficient_privilege then null; end;
  perform evaro_deletion_private.account_deletion_claim_authorized_v1('20000000-0000-4000-8000-000000000001');
end $$;
reset role;
do $$ begin
  if not exists(select 1 from pg_roles where rolname='evaro_deletion_test_client') then
    create role evaro_deletion_test_client nologin nosuperuser nobypassrls;
  end if;
end $$;
set local role evaro_deletion_test_client;
do $$ begin
  begin perform evaro_deletion_private.account_deletion_claim_authorized_v1(gen_random_uuid()); raise exception 'Client resume accepted';
    exception when insufficient_privilege then null; end;
end $$;
reset role;
select pg_temp.assert_true(not exists(select 1 from pg_proc p join pg_namespace n on n.oid=p.pronamespace
  where n.nspname='public' and p.proname like 'account_deletion_%'),'no public deletion RPC');
select n as passed_assertions from assertion_count;
rollback;
\echo 'Account deletion journal SQL lifecycle/permissions/rollback assertions PASS'
