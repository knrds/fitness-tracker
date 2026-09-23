\set ON_ERROR_STOP on
-- Real PostgreSQL RLS tests. Every fixture/helper/write is rolled back.
-- Requires a fresh test-only database plus docs/schema.sql and reviewed migrations.
begin;
set local statement_timeout = '30s';
do $$ begin
  if current_database() !~ '^evaro_[a-z0-9_]+_rls_test$' then
    raise exception 'Refusing RLS fixtures outside an explicitly named test database';
  end if;
  if exists (select 1 from public.users) then
    raise exception 'RLS harness requires empty application tables';
  end if;
end $$;
create schema evaro_rls_test;
grant usage on schema evaro_rls_test to authenticated, anon;
create table evaro_rls_test.results (label text primary key);
grant insert, select on evaro_rls_test.results to authenticated, anon;

create function evaro_rls_test.id(actor text, entity integer, variant integer default 0)
returns uuid language sql immutable as $$
  select (actor || '0000000-0000-4000-8000-' || lpad((entity * 100 + variant)::text, 12, '0'))::uuid
$$;
create function evaro_rls_test.affected(statement text, expected bigint, label text, undo boolean default true)
returns void language plpgsql as $$
declare actual bigint;
begin
  begin
    execute statement;
    get diagnostics actual = row_count;
    if actual <> expected then
      raise exception 'RLS assertion failed: %, expected %, actual %', label, expected, actual;
    end if;
    if undo then raise exception using errcode = 'Z0001', message = 'test rollback'; end if;
  exception when sqlstate 'Z0001' then null;
  end;
  insert into evaro_rls_test.results values (label);
end $$;
create function evaro_rls_test.count_is(statement text, expected bigint, label text)
returns void language plpgsql as $$
declare actual bigint;
begin
  execute statement into actual;
  if actual is distinct from expected then
    raise exception 'RLS assertion failed: %, expected %, actual %', label, expected, actual;
  end if;
  insert into evaro_rls_test.results values (label);
end $$;
create function evaro_rls_test.denied(statement text, label text)
returns void language plpgsql as $$
begin
  begin
    execute statement;
    raise exception 'RLS assertion failed: expected authorization denial: %', label;
  exception when insufficient_privilege then null;
  end;
  insert into evaro_rls_test.results values (label);
end $$;
create function evaro_rls_test.fixture(table_name text, actor text, variant integer default 0)
returns text language plpgsql as $$
declare
  uid uuid := evaro_rls_test.id(actor, 1);
  eid uuid := evaro_rls_test.id(actor, 2);
  tid uuid := evaro_rls_test.id(actor, 3);
  pid uuid := evaro_rls_test.id(actor, 5);
  sid uuid := evaro_rls_test.id(actor, 7);
  seid uuid := evaro_rls_test.id(actor, 8);
  setid uuid := evaro_rls_test.id(actor, 9);
begin
  case table_name
    when 'users' then return format('insert into public.users(id,email,display_name) values(%L,%L,%L)', uid, actor || '@example.test', 'Fixture');
    when 'exercises' then return format('insert into public.exercises(id,name,primary_muscles,equipment,movement_pattern,is_custom,owner_id) values(%L,%L,ARRAY[''chest'']::public.muscle_group[],''barbell'',''horizontal_push'',true,%L)', evaro_rls_test.id(actor,2,variant),'Fixture',uid);
    when 'workout_templates' then return format('insert into public.workout_templates(id,user_id,name) values(%L,%L,%L)',evaro_rls_test.id(actor,3,variant),uid,'Fixture');
    when 'template_exercises' then return format('insert into public.template_exercises(id,template_id,exercise_id,target_sets) values(%L,%L,%L,3)',evaro_rls_test.id(actor,4,variant),tid,eid);
    when 'programs' then return format('insert into public.programs(id,user_id,name,duration_weeks) values(%L,%L,%L,4)',evaro_rls_test.id(actor,5,variant),uid,'Fixture');
    when 'program_workouts' then return format('insert into public.program_workouts(id,program_id,template_id,week,day_of_week) values(%L,%L,%L,1,1)',evaro_rls_test.id(actor,6,variant),pid,tid);
    when 'workout_sessions' then return format('insert into public.workout_sessions(id,user_id,template_id,program_id,name,started_at) values(%L,%L,%L,%L,%L,now())',evaro_rls_test.id(actor,7,variant),uid,tid,pid,'Fixture');
    when 'session_exercises' then return format('insert into public.session_exercises(id,session_id,exercise_id) values(%L,%L,%L)',evaro_rls_test.id(actor,8,variant),sid,eid);
    when 'exercise_sets' then return format('insert into public.exercise_sets(id,session_exercise_id,set_number) values(%L,%L,1)',evaro_rls_test.id(actor,9,variant),seid);
    when 'personal_records' then return format('insert into public.personal_records(id,user_id,exercise_id,type,value,session_id,set_id) values(%L,%L,%L,''max_weight'',50,%L,%L)',evaro_rls_test.id(actor,10,variant),uid,eid,sid,setid);
    when 'body_metrics' then return format('insert into public.body_metrics(id,user_id,weight_kg) values(%L,%L,75)',evaro_rls_test.id(actor,11,variant),uid);
    else raise exception 'Unknown fixture table';
  end case;
end $$;
create table evaro_rls_test.entities (entity integer primary key, table_name text, owner_field text, parent_entity integer);
insert into evaro_rls_test.entities values
  (1,'users','id',1),(2,'exercises','owner_id',1),(3,'workout_templates','user_id',1),
  (4,'template_exercises','template_id',3),(5,'programs','user_id',1),
  (6,'program_workouts','program_id',5),(7,'workout_sessions','user_id',1),
  (8,'session_exercises','session_id',7),(9,'exercise_sets','session_exercise_id',8),
  (10,'personal_records','user_id',1),(11,'body_metrics','user_id',1);
grant select on evaro_rls_test.entities to authenticated, anon;
-- Optional adversarial policy proves restrictive guards cannot be OR-bypassed.
\if :{?adversarial_policies}
do $$ declare item record; begin
  for item in select * from evaro_rls_test.entities loop
    execute format('create policy evaro_test_allow_all on public.%I for all using(true) with check(true)',item.table_name);
  end loop;
end $$;
\endif
insert into auth.users(id) values (evaro_rls_test.id('a',1)),(evaro_rls_test.id('b',1));

-- Positive profile INSERT/DELETE before dependent data exists; DELETE is rolled back.
do $$ declare actor text; begin
  foreach actor in array ARRAY['a','b'] loop
    execute 'set local role authenticated';
    perform set_config('request.jwt.claim.sub',evaro_rls_test.id(actor,1)::text,true);
    if current_user <> 'authenticated' then raise exception 'Role switch failed'; end if;
    perform evaro_rls_test.affected(evaro_rls_test.fixture('users',actor),1,actor || ':users:own-insert',false);
    perform evaro_rls_test.affected(format('delete from public.users where id=%L',evaro_rls_test.id(actor,1)),1,actor || ':users:own-delete');
    execute 'reset role';
  end loop;
end $$;
-- Remaining fixtures as database owner; only assertions below run as client roles.
do $$ declare actor text; item record; begin
  foreach actor in array ARRAY['a','b'] loop
    for item in select * from evaro_rls_test.entities where entity > 1 order by entity loop
      execute evaro_rls_test.fixture(item.table_name,actor);
    end loop;
    execute evaro_rls_test.fixture('exercises',actor,3);
    execute evaro_rls_test.fixture('workout_sessions',actor,3);
    execute evaro_rls_test.fixture('session_exercises',actor,3);
    update public.session_exercises set session_id=evaro_rls_test.id(actor,7,3)
      where id=evaro_rls_test.id(actor,8,3);
    execute evaro_rls_test.fixture('exercise_sets',actor,3);
    update public.exercise_sets set session_exercise_id=evaro_rls_test.id(actor,8,3)
      where id=evaro_rls_test.id(actor,9,3);
    execute evaro_rls_test.fixture('session_exercises',actor,4);
    update public.session_exercises set exercise_id=evaro_rls_test.id(actor,2,3)
      where id=evaro_rls_test.id(actor,8,4);
    execute evaro_rls_test.fixture('exercise_sets',actor,4);
    update public.exercise_sets set session_exercise_id=evaro_rls_test.id(actor,8,4)
      where id=evaro_rls_test.id(actor,9,4);
  end loop;
end $$;
insert into public.exercises(id,name,primary_muscles,equipment,movement_pattern)
values(evaro_rls_test.id('c',2),'Shared fixture',ARRAY['chest']::public.muscle_group[],'barbell','horizontal_push');

-- Bidirectional owner/other-user CRUD, ownership reparenting, and positive mutations.
do $$ declare actor text; other_actor text; item record; own_id uuid; other_id uuid; begin
  foreach actor in array ARRAY['a','b'] loop
    other_actor := case actor when 'a' then 'b' else 'a' end;
    execute 'set local role authenticated';
    perform set_config('request.jwt.claim.sub',evaro_rls_test.id(actor,1)::text,true);
    if exists(select 1 from pg_roles where rolname=current_user and (rolsuper or rolbypassrls)) then
      raise exception 'Tests must not run with RLS bypass';
    end if;
    for item in select * from evaro_rls_test.entities order by entity loop
      own_id := evaro_rls_test.id(actor,item.entity);
      other_id := evaro_rls_test.id(other_actor,item.entity);
      perform evaro_rls_test.count_is(format('select count(*) from public.%I where id=%L',item.table_name,own_id),1,actor || ':' || item.table_name || ':own-select');
      perform evaro_rls_test.count_is(format('select count(*) from public.%I where id=%L',item.table_name,other_id),0,actor || ':' || item.table_name || ':foreign-select');
      perform evaro_rls_test.affected(format('update public.%I set id=id where id=%L',item.table_name,own_id),1,actor || ':' || item.table_name || ':own-update');
      perform evaro_rls_test.affected(format('update public.%I set id=id where id=%L',item.table_name,other_id),0,actor || ':' || item.table_name || ':foreign-update');
      perform evaro_rls_test.affected(format('delete from public.%I where id=%L',item.table_name,other_id),0,actor || ':' || item.table_name || ':foreign-delete');
      perform evaro_rls_test.denied(evaro_rls_test.fixture(item.table_name,other_actor,1),actor || ':' || item.table_name || ':foreign-insert');
      perform evaro_rls_test.denied(format('update public.%I set %I=%L where id=%L',item.table_name,item.owner_field,evaro_rls_test.id(other_actor,item.parent_entity),own_id),actor || ':' || item.table_name || ':owner-spoof');
      if item.entity > 1 then
        perform evaro_rls_test.affected(evaro_rls_test.fixture(item.table_name,actor,1),1,actor || ':' || item.table_name || ':own-insert',false);
        perform evaro_rls_test.affected(format('delete from public.%I where id=%L',item.table_name,evaro_rls_test.id(actor,item.entity,1)),1,actor || ':' || item.table_name || ':own-delete');
      end if;
    end loop;
    execute 'reset role';
  end loop;
end $$;

-- Anonymous cannot see or mutate private fixtures, even with table-level CRUD grants.
set local role anon;
select set_config('request.jwt.claim.sub','',true);
select set_config('request.jwt.claims','{}',true);
do $$ declare item record; begin
  for item in select * from evaro_rls_test.entities order by entity loop
    perform evaro_rls_test.count_is(format('select count(*) from public.%I where id=%L',item.table_name,evaro_rls_test.id('a',item.entity)),0,'anon:' || item.table_name || ':select');
    perform evaro_rls_test.affected(format('update public.%I set id=id',item.table_name),0,'anon:' || item.table_name || ':update');
    perform evaro_rls_test.affected(format('delete from public.%I',item.table_name),0,'anon:' || item.table_name || ':delete');
    perform evaro_rls_test.denied(evaro_rls_test.fixture(item.table_name,'a',2),'anon:' || item.table_name || ':insert');
  end loop;
end $$;
reset role;

-- Shared catalogue read remains available; clients cannot publish, modify or delete it.
do $$ declare actor text; begin
  foreach actor in array ARRAY['a','b','c'] loop
    if actor='c' then
      execute 'set local role anon';
      perform set_config('request.jwt.claim.sub','',true);
    else
      execute 'set local role authenticated';
      perform set_config('request.jwt.claim.sub',evaro_rls_test.id(actor,1)::text,true);
    end if;
    perform evaro_rls_test.count_is(format('select count(*) from public.exercises where id=%L',evaro_rls_test.id('c',2)),1,actor || ':catalog:select');
    perform evaro_rls_test.affected(format('update public.exercises set name=''changed'' where id=%L',evaro_rls_test.id('c',2)),0,actor || ':catalog:update');
    perform evaro_rls_test.affected(format('delete from public.exercises where id=%L',evaro_rls_test.id('c',2)),0,actor || ':catalog:delete');
    perform evaro_rls_test.denied('insert into public.exercises(name,primary_muscles,equipment,movement_pattern) values(''spoof'',ARRAY[''chest'']::public.muscle_group[],''barbell'',''horizontal_push'')',actor || ':catalog:insert');
    execute 'reset role';
  end loop;
end $$;

-- These secondary FKs were not protected by the previous parent-owner policies.
create table evaro_rls_test.references_to_check (entity integer, column_name text, target_entity integer);
insert into evaro_rls_test.references_to_check values
 (4,'exercise_id',2),(6,'template_id',3),(7,'template_id',3),(7,'program_id',5),
 (8,'exercise_id',2),(10,'exercise_id',2),(10,'session_id',7),(10,'set_id',9);
grant select on evaro_rls_test.references_to_check to authenticated;
do $$ declare actor text; other_actor text; item record; own_id uuid; label text; begin
  foreach actor in array ARRAY['a','b'] loop
    other_actor := case actor when 'a' then 'b' else 'a' end;
    execute 'set local role authenticated';
    perform set_config('request.jwt.claim.sub',evaro_rls_test.id(actor,1)::text,true);
    for item in select r.*,e.table_name from evaro_rls_test.references_to_check r join evaro_rls_test.entities e using(entity) loop
      own_id := evaro_rls_test.id(actor,item.entity);
      label := actor || ':' || item.table_name || ':' || item.column_name;
      perform evaro_rls_test.denied(format('update public.%I set %I=%L where id=%L',item.table_name,item.column_name,evaro_rls_test.id(other_actor,item.target_entity),own_id),label || ':foreign-reference-update');
      perform evaro_rls_test.denied(format('insert into public.%I select r.* from jsonb_populate_record(null::public.%I,(select to_jsonb(t) from public.%I t where id=%L) || jsonb_build_object(''id'',%L::text,%L,%L::text)) r',item.table_name,item.table_name,item.table_name,own_id,evaro_rls_test.id(actor,item.entity,2),item.column_name,evaro_rls_test.id(other_actor,item.target_entity)),label || ':foreign-reference-insert');
    end loop;
    -- TRUNCATE does not go through RLS and must fail at the privilege layer.
    perform evaro_rls_test.denied(format('update public.personal_records set set_id=%L where id=%L',evaro_rls_test.id(actor,9,3),evaro_rls_test.id(actor,10)),actor || ':pr:wrong-own-session');
    perform evaro_rls_test.denied(format('update public.personal_records set set_id=%L where id=%L',evaro_rls_test.id(actor,9,4),evaro_rls_test.id(actor,10)),actor || ':pr:wrong-own-exercise');
    perform evaro_rls_test.affected(format('update public.personal_records set set_id=null,session_id=null where id=%L',evaro_rls_test.id(actor,10)),1,actor || ':pr:optional-references');
    perform evaro_rls_test.affected(format('update public.template_exercises set exercise_id=%L where id=%L',evaro_rls_test.id('c',2),evaro_rls_test.id(actor,4)),1,actor || ':template:shared-exercise');
    perform evaro_rls_test.affected(format('update public.session_exercises set exercise_id=%L where id=%L',evaro_rls_test.id('c',2),evaro_rls_test.id(actor,8)),1,actor || ':session:shared-exercise');
    perform evaro_rls_test.count_is('select count(*) from evaro_rls_test.entities where has_table_privilege(current_user,''public.'' || table_name,''TRUNCATE'')',0,actor || ':ddl:no-truncate-grants');
    perform evaro_rls_test.count_is('select count(*) from pg_class c join pg_namespace n on n.oid=c.relnamespace join evaro_rls_test.entities e on e.table_name=c.relname where n.nspname=''public'' and c.relrowsecurity',11,actor || ':rls:all-enabled');
    perform evaro_rls_test.denied('truncate public.body_metrics',actor || ':ddl:truncate');
    perform evaro_rls_test.denied('create table public.attacker_table(id integer)',actor || ':ddl:create');
    execute 'reset role';
  end loop;
end $$;

select count(*) as passed_assertions from evaro_rls_test.results;
select split_part(label,':',1) as actor, count(*) as passed from evaro_rls_test.results group by 1 order by 1;
rollback;
\echo 'RLS assertions PASS; fixtures and helpers rolled back'
