\set ON_ERROR_STOP on
-- Synthetic fixtures only. auth.uid shim models verified gateway claims; real
-- token verification/PostgREST/cloud behavior is deliberately NOT claimed.
begin;
do $$ begin
  if current_database() !~ '^evaro_[a-z0-9_]+_workout_sync_rls_test$' then
    raise exception 'Refusing workout tests outside disposable local database';
  end if;
end $$;
create schema evaro_workout_test;
create table evaro_workout_test.assertions(label text primary key);
create function evaro_workout_test.check(p_label text,p_condition boolean) returns void language plpgsql as $$
begin
  if p_condition is distinct from true then raise exception 'Workout assertion failed: %',p_label; end if;
  insert into evaro_workout_test.assertions values(p_label);
end $$;
create function evaro_workout_test.reject(p_label text,p_statement text,p_state text) returns void language plpgsql as $$
declare v_failed boolean:=false;
begin
  begin execute p_statement;
  exception when others then
    if sqlstate<>p_state then raise exception 'Unexpected SQLSTATE for %: %',p_label,sqlstate; end if;
    v_failed:=true;
  end;
  perform evaro_workout_test.check(p_label,v_failed);
end $$;
create function evaro_workout_test.payload(p_note text default 'initial',
  p_exercise uuid default '10000000-0000-4000-8000-000000000100',
  p_child uuid default '10000000-0000-4000-8000-000000000201',
  p_set uuid default '10000000-0000-4000-8000-000000000301') returns jsonb language sql as $$
  select jsonb_build_object('name','Synthetic workout','started_at','2026-09-30T10:00:00Z',
    'completed_at','2026-09-30T11:00:00Z','template_id',null,'program_id',null,'notes',p_note,
    'duration_seconds',3600,'bodyweight_kg',80.5,'perceived_exertion',8,
    'exercises',jsonb_build_array(jsonb_build_object('id',p_child,'exercise_id',p_exercise,'order',0,
      'notes',null,'superset_group',null,'sets',jsonb_build_array(jsonb_build_object('id',p_set,
        'set_number',1,'type','working','weight',200,'reps',12,'completed',true,'completed_at',null,
        'rpe',null,'rir',null,'rest_seconds',null,'duration_seconds',null,'distance_meters',null,'notes',null)))));
$$;
select evaro_workout_test.check('legacy revision initialized',
  (select revision=1 and cursor=1 and not deleted from evaro_sync.workout_heads where workout_id='10000000-0000-4000-8000-000000000400'));
select evaro_workout_test.check('original legacy row preserved',
  (select notes='original bytes' and created_at='2025-01-01T12:00:00Z' from public.workout_sessions where id='10000000-0000-4000-8000-000000000400'));
select evaro_workout_test.check('original legacy normalized children preserved',
  (select notes='legacy child bytes' and "order"=0 from public.session_exercises where id='10000000-0000-4000-8000-000000000204')
  and (select notes='legacy set bytes' and weight=18 and reps=12 and completed from public.exercise_sets where id='10000000-0000-4000-8000-000000000304'));
select evaro_workout_test.check('no public function access',not exists(
  select 1 from pg_proc p cross join lateral aclexplode(coalesce(p.proacl,acldefault('f',p.proowner))) a
  where p.pronamespace='evaro_sync'::regnamespace and a.grantee=0));
select evaro_workout_test.check('no raw metadata access',
  not has_table_privilege('evaro_workout_sync_server','evaro_sync.workout_operations','SELECT')
  and not has_table_privilege('authenticated','evaro_sync.workout_heads','SELECT'));
select evaro_workout_test.check('definers have dedicated nonprivileged owner with RLS',
  not exists(select 1 from pg_roles where rolname='evaro_workout_sync_owner'
    and (rolcanlogin or rolsuper or rolbypassrls or rolcreatedb or rolcreaterole or rolreplication))
  and not exists(select 1 from pg_proc p where p.pronamespace='evaro_sync'::regnamespace
    and p.proowner<>(select oid from pg_roles where rolname='evaro_workout_sync_owner'))
  and not has_table_privilege('evaro_workout_sync_owner','public.users','DELETE')
  and not has_table_privilege('evaro_workout_sync_owner','public.body_metrics','SELECT'));
select evaro_workout_test.check('legacy aggregate DML revoked',
  not has_table_privilege('authenticated','public.workout_sessions','INSERT,UPDATE,DELETE')
  and not has_table_privilege('authenticated','public.session_exercises','INSERT,UPDATE,DELETE')
  and not has_table_privilege('authenticated','public.exercise_sets','INSERT,UPDATE,DELETE'));
select evaro_workout_test.reject('anonymous denied',
  $$select evaro_sync.read_workout_changes_v1(0,20)$$,'42501');
select set_config('request.jwt.claim.sub','90000000-0000-4000-8000-000000000001',true);
select evaro_workout_test.reject('unknown account denied',
  $$select evaro_sync.read_workout_changes_v1(0,20)$$,'42501');
select set_config('request.jwt.claim.sub','10000000-0000-4000-8000-000000000001',true);

select evaro_workout_test.check('legacy cannot be treated as new',
  evaro_sync.mutate_workout_v1('10000000-0000-4000-8000-000000000501','10000000-0000-4000-8000-000000000400',0,'delete',null)->>'status'='conflict');
select evaro_workout_test.reject('conflict receipt binds operation payload',
  $$select evaro_sync.mutate_workout_v1('10000000-0000-4000-8000-000000000501','10000000-0000-4000-8000-000000000400',1,'delete',null)$$,'22023');
select evaro_workout_test.check('create entire aggregate atomically',
  evaro_sync.mutate_workout_v1('10000000-0000-4000-8000-000000000502','10000000-0000-4000-8000-000000000401',0,'upsert',evaro_workout_test.payload())->>'revision'='1');
select evaro_workout_test.check('children + null + exact weight persisted',
  (select count(*)=1 and max(weight)=200 and bool_and(rpe is null) from public.exercise_sets where id='10000000-0000-4000-8000-000000000301')
  and (select user_id='10000000-0000-4000-8000-000000000001' from public.workout_sessions where id='10000000-0000-4000-8000-000000000401'));
select evaro_workout_test.check('same operation replay same receipt',
  evaro_sync.mutate_workout_v1('10000000-0000-4000-8000-000000000502','10000000-0000-4000-8000-000000000401',0,'upsert',evaro_workout_test.payload())->>'cursor'='2'
  and (select cursor=2 from evaro_sync.workout_clocks where owner_id='10000000-0000-4000-8000-000000000001'));
select evaro_workout_test.reject('changed operation payload denied',
  $$select evaro_sync.mutate_workout_v1('10000000-0000-4000-8000-000000000502','10000000-0000-4000-8000-000000000401',0,'upsert',evaro_workout_test.payload('changed'))$$,'22023');
select evaro_workout_test.reject('caller owner unknown field denied',
  $$select evaro_sync.mutate_workout_v1(gen_random_uuid(),gen_random_uuid(),0,'upsert',evaro_workout_test.payload()||' {"user_id":"20000000-0000-4000-8000-000000000001"}'::jsonb)$$,'22023');
select evaro_workout_test.reject('numeric strings denied',
  $$select evaro_sync.mutate_workout_v1(gen_random_uuid(),'10000000-0000-4000-8000-000000000401',1,'upsert',jsonb_set(evaro_workout_test.payload(),'{exercises,0,sets,0,weight}','"200"'))$$,'22023');
select evaro_workout_test.reject('fractional integer denied',
  $$select evaro_sync.mutate_workout_v1(gen_random_uuid(),'10000000-0000-4000-8000-000000000401',1,'upsert',jsonb_set(evaro_workout_test.payload(),'{exercises,0,sets,0,reps}','1.5'))$$,'22023');
select evaro_workout_test.reject('unknown set enum denied',
  $$select evaro_sync.mutate_workout_v1(gen_random_uuid(),'10000000-0000-4000-8000-000000000401',1,'upsert',jsonb_set(evaro_workout_test.payload(),'{exercises,0,sets,0,type}','"arbitrary"'))$$,'22023');
select evaro_workout_test.reject('invalid calendar date denied',
  $$select evaro_sync.mutate_workout_v1(gen_random_uuid(),'10000000-0000-4000-8000-000000000401',1,'upsert',jsonb_set(evaro_workout_test.payload(),'{started_at}','"2026-02-31T10:00:00Z"'))$$,'22023');
select evaro_workout_test.reject('timezone-free date denied',
  $$select evaro_sync.mutate_workout_v1(gen_random_uuid(),'10000000-0000-4000-8000-000000000401',1,'upsert',jsonb_set(evaro_workout_test.payload(),'{started_at}','"2026-09-30T10:00:00"'))$$,'22023');
select evaro_workout_test.reject('oversized notes denied',
  $$select evaro_sync.mutate_workout_v1(gen_random_uuid(),'10000000-0000-4000-8000-000000000401',1,'upsert',jsonb_set(evaro_workout_test.payload(),'{notes}',to_jsonb(repeat('a',2001))))$$,'22023');
select evaro_workout_test.reject('oversized body denied',
  $$select evaro_sync.mutate_workout_v1(gen_random_uuid(),'10000000-0000-4000-8000-000000000401',1,'upsert',jsonb_set(evaro_workout_test.payload(),'{notes}',to_jsonb(repeat('a',131073))))$$,'22023');
select evaro_workout_test.reject('too many exercises denied',
  $$select evaro_sync.mutate_workout_v1(gen_random_uuid(),'10000000-0000-4000-8000-000000000401',1,'upsert',jsonb_set(evaro_workout_test.payload(),'{exercises}',(select jsonb_agg(evaro_workout_test.payload()->'exercises'->0) from generate_series(1,51))))$$,'22023');
select evaro_workout_test.reject('duplicate exercise ID denied',
  $$select evaro_sync.mutate_workout_v1(gen_random_uuid(),'10000000-0000-4000-8000-000000000401',1,'upsert',jsonb_set(evaro_workout_test.payload(),'{exercises}',(evaro_workout_test.payload()->'exercises')||(evaro_workout_test.payload()->'exercises')))$$,'22023');
select evaro_workout_test.reject('duplicate set number denied',
  $$select evaro_sync.mutate_workout_v1(gen_random_uuid(),'10000000-0000-4000-8000-000000000401',1,'upsert',jsonb_set(evaro_workout_test.payload(),'{exercises,0,sets}',
    (evaro_workout_test.payload()->'exercises'->0->'sets')||jsonb_build_array(jsonb_set(evaro_workout_test.payload()->'exercises'->0->'sets'->0,'{id}','"10000000-0000-4000-8000-000000000302"'))))$$,'22023');
select evaro_workout_test.reject('too many sets in one exercise denied',
  $$select evaro_sync.mutate_workout_v1(gen_random_uuid(),'10000000-0000-4000-8000-000000000401',1,'upsert',jsonb_set(evaro_workout_test.payload(),'{exercises,0,sets}',
    (select jsonb_agg(evaro_workout_test.payload()->'exercises'->0->'sets'->0) from generate_series(1,101))))$$,'22023');
select evaro_workout_test.reject('total set count bounded across exercises',
  $$select evaro_sync.mutate_workout_v1(gen_random_uuid(),gen_random_uuid(),0,'upsert',jsonb_set(evaro_workout_test.payload(),'{exercises}',
    (select jsonb_agg(jsonb_build_object('id',md5('child'||n)::uuid,'exercise_id','10000000-0000-4000-8000-000000000100','order',n,
      'sets',(select jsonb_agg(jsonb_build_object('id',md5('set'||n||':'||k)::uuid,'set_number',k,'type','working','completed',true))
        from generate_series(1,100) k))) from generate_series(1,6) n)))$$,'22023');
select evaro_workout_test.reject('required completion flag null denied',
  $$select evaro_sync.mutate_workout_v1(gen_random_uuid(),'10000000-0000-4000-8000-000000000401',1,'upsert',jsonb_set(evaro_workout_test.payload(),'{exercises,0,sets,0,completed}','null'))$$,'22023');
select evaro_workout_test.reject('foreign template denied',
  $$select evaro_sync.mutate_workout_v1(gen_random_uuid(),'10000000-0000-4000-8000-000000000401',1,'upsert',jsonb_set(evaro_workout_test.payload(),'{template_id}','"20000000-0000-4000-8000-000000000110"'))$$,'42501');
select evaro_workout_test.reject('foreign program denied',
  $$select evaro_sync.mutate_workout_v1(gen_random_uuid(),'10000000-0000-4000-8000-000000000401',1,'upsert',jsonb_set(evaro_workout_test.payload(),'{program_id}','"20000000-0000-4000-8000-000000000120"'))$$,'42501');
select evaro_workout_test.reject('foreign custom exercise denied',
  $$select evaro_sync.mutate_workout_v1(gen_random_uuid(),gen_random_uuid(),0,'upsert',evaro_workout_test.payload('x','20000000-0000-4000-8000-000000000100'))$$,'42501');
select evaro_workout_test.reject('missing exercise FK denied',
  $$select evaro_sync.mutate_workout_v1(gen_random_uuid(),gen_random_uuid(),0,'upsert',evaro_workout_test.payload('x','90000000-0000-4000-8000-000000000100'))$$,'42501');
select evaro_workout_test.reject('child reuse different aggregate denied',
  $$select evaro_sync.mutate_workout_v1(gen_random_uuid(),gen_random_uuid(),0,'upsert',evaro_workout_test.payload())$$,'42501');
select evaro_workout_test.reject('set cannot be reparented to a new child',
  $$select evaro_sync.mutate_workout_v1(gen_random_uuid(),'10000000-0000-4000-8000-000000000401',1,'upsert',
    evaro_workout_test.payload('reparent','10000000-0000-4000-8000-000000000100','10000000-0000-4000-8000-000000000202'))$$,'42501');
insert into public.personal_records(id,user_id,exercise_id,type,value,session_id,set_id) values
  ('10000000-0000-4000-8000-000000000350','10000000-0000-4000-8000-000000000001','10000000-0000-4000-8000-000000000100',
    'max_weight',200,'10000000-0000-4000-8000-000000000401','10000000-0000-4000-8000-000000000301');
select evaro_workout_test.reject('personal record FK cannot switch exercise identity',
  $$select evaro_sync.mutate_workout_v1(gen_random_uuid(),'10000000-0000-4000-8000-000000000401',1,'upsert',
    evaro_workout_test.payload('wrong PR','10000000-0000-4000-8000-000000000101'))$$,'42501');

-- A late invalid set would formerly leave a partial parent/exercise update.
select evaro_workout_test.reject('constraint failure rolls back entire update',
  $$select evaro_sync.mutate_workout_v1(gen_random_uuid(),'10000000-0000-4000-8000-000000000401',1,'upsert',jsonb_set(evaro_workout_test.payload('must not survive'),'{exercises,0,sets,0,rpe}','11'))$$,'22023');
select evaro_workout_test.check('failed update preserves parent children cursor',
  (select notes='initial' from public.workout_sessions where id='10000000-0000-4000-8000-000000000401')
  and (select revision=1 and cursor=2 from evaro_sync.workout_heads where workout_id='10000000-0000-4000-8000-000000000401')
  and (select rpe is null and weight=200 from public.exercise_sets where id='10000000-0000-4000-8000-000000000301'));
select evaro_workout_test.check('CAS update increments revision cursor',
  evaro_sync.mutate_workout_v1('10000000-0000-4000-8000-000000000503','10000000-0000-4000-8000-000000000401',1,'upsert',evaro_workout_test.payload('edited'))->>'revision'='2');
select evaro_workout_test.check('stale CAS conflict does not overwrite',
  evaro_sync.mutate_workout_v1('10000000-0000-4000-8000-000000000504','10000000-0000-4000-8000-000000000401',1,'upsert',evaro_workout_test.payload('stale'))->>'status'='conflict'
  and (select notes='edited' from public.workout_sessions where id='10000000-0000-4000-8000-000000000401'));
select evaro_workout_test.check('pagination ordered initial page',
  evaro_sync.read_workout_changes_v1(0,1)->'changes'->0->>'workout_id'='10000000-0000-4000-8000-000000000400'
  and evaro_sync.read_workout_changes_v1(0,1)->>'cursor'='1');
select evaro_workout_test.check('pagination next page latest aggregate exact values',
  evaro_sync.read_workout_changes_v1(1,20)->>'cursor'='3'
  and (evaro_sync.read_workout_changes_v1(1,20)->'changes'->0->'payload'->'exercises'->0->'sets'->0->>'weight')::numeric=200
  and not (evaro_sync.read_workout_changes_v1(1,20)->'changes'->0->'payload' ? 'user_id'));
select evaro_workout_test.reject('oversized page denied',$$select evaro_sync.read_workout_changes_v1(0,21)$$,'22023');
select evaro_workout_test.reject('future cursor denied',$$select evaro_sync.read_workout_changes_v1(999,1)$$,'22023');
select evaro_workout_test.check('delete produces tombstone',
  evaro_sync.mutate_workout_v1('10000000-0000-4000-8000-000000000505','10000000-0000-4000-8000-000000000401',2,'delete',null)->>'deleted'='true');
select evaro_workout_test.check('deleted aggregate children removed atomically',
  not exists(select 1 from public.workout_sessions where id='10000000-0000-4000-8000-000000000401')
  and not exists(select 1 from public.exercise_sets where id='10000000-0000-4000-8000-000000000301'));
select evaro_workout_test.check('dual personal record FK cleanup preserves record value',
  (select set_id is null and session_id is null and value=200 from public.personal_records where id='10000000-0000-4000-8000-000000000350'));
select evaro_workout_test.check('tombstone returned in cursor feed',
  evaro_sync.read_workout_changes_v1(3,20)->'changes'->0->>'deleted'='true'
  and evaro_sync.read_workout_changes_v1(3,20)->'changes'->0->'payload'='null'::jsonb);
select evaro_workout_test.check('delete replay does not increment cursor',
  evaro_sync.mutate_workout_v1('10000000-0000-4000-8000-000000000505','10000000-0000-4000-8000-000000000401',2,'delete',null)->>'cursor'='4'
  and (select cursor=4 from evaro_sync.workout_clocks where owner_id='10000000-0000-4000-8000-000000000001'));
select evaro_workout_test.check('old create replay cannot resurrect deleted aggregate',
  evaro_sync.mutate_workout_v1('10000000-0000-4000-8000-000000000502','10000000-0000-4000-8000-000000000401',0,'upsert',evaro_workout_test.payload())->>'revision'='1'
  and not exists(select 1 from public.workout_sessions where id='10000000-0000-4000-8000-000000000401'));
select evaro_workout_test.check('new upsert cannot resurrect tombstone',
  evaro_sync.mutate_workout_v1('10000000-0000-4000-8000-000000000506','10000000-0000-4000-8000-000000000401',3,'upsert',evaro_workout_test.payload())->>'status'='conflict');
select evaro_workout_test.check('duplicate delete with new operation no new cursor',
  evaro_sync.mutate_workout_v1('10000000-0000-4000-8000-000000000507','10000000-0000-4000-8000-000000000401',3,'delete',null)->>'cursor'='4');
select evaro_workout_test.check('delete absent creates permanent tombstone',
  evaro_sync.mutate_workout_v1('10000000-0000-4000-8000-000000000508','10000000-0000-4000-8000-000000000402',0,'delete',null)->>'revision'='1');
select evaro_workout_test.check('nonexistent delete blocks late create',
  evaro_sync.mutate_workout_v1('10000000-0000-4000-8000-000000000509','10000000-0000-4000-8000-000000000402',0,'upsert',evaro_workout_test.payload())->>'status'='conflict');

select set_config('request.jwt.claim.sub','20000000-0000-4000-8000-000000000001',true);
select evaro_workout_test.reject('foreign workout UUID collision denied',
  $$select evaro_sync.mutate_workout_v1(gen_random_uuid(),'10000000-0000-4000-8000-000000000400',1,'delete',null)$$,'42501');
select evaro_workout_test.reject('foreign tombstone UUID collision denied',
  $$select evaro_sync.mutate_workout_v1(gen_random_uuid(),'10000000-0000-4000-8000-000000000401',3,'delete',null)$$,'42501');
select evaro_workout_test.check('owner scoped feed exposes no other records',
  evaro_sync.read_workout_changes_v1(0,20)->'changes'='[]'::jsonb and evaro_sync.read_workout_changes_v1(0,20)->>'cursor'='0');
-- Account/auth deletion retains the existing cascade semantics; no R01 adapter
-- activation is implied. This transaction rolls the synthetic deletion back.
savepoint account_cascade;
select set_config('request.jwt.claim.sub','10000000-0000-4000-8000-000000000001',true);
select evaro_sync.mutate_workout_v1(gen_random_uuid(),'10000000-0000-4000-8000-000000000410',0,'upsert',evaro_workout_test.payload())->>'status';
delete from auth.users where id='10000000-0000-4000-8000-000000000001';
do $$ begin
  if exists(select 1 from public.workout_sessions where user_id='10000000-0000-4000-8000-000000000001')
    or exists(select 1 from evaro_sync.workout_heads where owner_id='10000000-0000-4000-8000-000000000001')
    or exists(select 1 from evaro_sync.workout_operations where owner_id='10000000-0000-4000-8000-000000000001') then
    raise exception 'Workout metadata/aggregate survived account cascade';
  end if;
end $$;
rollback to savepoint account_cascade;
select evaro_workout_test.check('synthetic account cascade does not break deletion',
  exists(select 1 from public.users where id='10000000-0000-4000-8000-000000000001'));
select set_config('request.jwt.claim.sub','10000000-0000-4000-8000-000000000001',true);
select evaro_workout_test.reject('direct privileged legacy write guarded',
  $$update public.workout_sessions set notes='bypass' where id='10000000-0000-4000-8000-000000000400'$$,'42501');
select set_config('evaro.workout_sync_write','v1',true);
select evaro_workout_test.reject('forged GUC cannot authorize privileged legacy update',
  $$update public.workout_sessions set notes='forged context' where id='10000000-0000-4000-8000-000000000400'$$,'42501');
set local role authenticated;
do $$ begin
  begin update public.workout_sessions set notes='forged context'; raise exception 'Legacy write unexpectedly allowed';
  exception when insufficient_privilege then null; end;
  begin delete from public.workout_templates where id='10000000-0000-4000-8000-000000000110';
    raise exception 'Parent delete unexpectedly bypassed workout revision';
  exception when insufficient_privilege then null; end;
end $$;
reset role;
select set_config('evaro.workout_sync_write','',true);
select evaro_workout_test.check('parent SET NULL cannot bypass revision with forged GUC',
  (select template_id='10000000-0000-4000-8000-000000000110' from public.workout_sessions where id='10000000-0000-4000-8000-000000000400'));
select evaro_workout_test.check('client forged write context ineffective',
  (select notes='original bytes' from public.workout_sessions where id='10000000-0000-4000-8000-000000000400'));
set local role evaro_workout_sync_server;
select evaro_sync.read_workout_changes_v1(0,20)->>'version' as actual_server_role_version;
reset role;
select count(*) as passed_assertions from evaro_workout_test.assertions;
select 'Workout aggregate lifecycle/ownership/rollback assertions PASS' as result;
rollback;
