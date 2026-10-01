-- Review-only workout aggregate foundation; NOT an automatically deployed migration.
-- Requires docs/schema.sql + restrictive ownership migration. Auth gateway must
-- verify the session before setting auth.uid(); this is not a JWT verifier.
-- Activating this contract replaces direct workout child/parent client writes.
-- Templates/programs/profile/catalog sync and personal-record recomputation are separate.
begin;
set local lock_timeout = '2s';
set local statement_timeout = '60s';
lock table public.users, public.exercises, public.workout_templates, public.programs,
  public.workout_sessions, public.session_exercises, public.exercise_sets in share row exclusive mode;

do $$ declare v_role text; begin
  if not exists (select 1 from pg_catalog.pg_policies where schemaname='public'
    and tablename='workout_sessions' and policyname='evaro_owner_guard_v1' and permissive='RESTRICTIVE') then
    raise exception 'Workout sync requires reviewed restrictive ownership migration';
  end if;
  if exists (select 1 from public.workout_sessions s
    left join public.workout_templates t on t.id=s.template_id
    left join public.programs p on p.id=s.program_id
    where t.user_id<>s.user_id or p.user_id<>s.user_id)
    or exists (select 1 from public.session_exercises se
      join public.workout_sessions s on s.id=se.session_id
      join public.exercises e on e.id=se.exercise_id where e.owner_id is not null and e.owner_id<>s.user_id)
    or exists (select 1 from public.session_exercises group by session_id,"order" having count(*)>1)
    or exists (select 1 from public.exercise_sets group by session_exercise_id,set_number having count(*)>1)
    or exists (select 1 from public.workout_sessions where length(name) not between 1 and 100
      or length(notes)>2000 or completed_at<started_at)
    or exists (select 1 from public.session_exercises where "order"<0 or length(notes)>1000 or length(superset_group)>100)
    or exists (select 1 from public.exercise_sets where length(notes)>500)
    or exists (select 1 from public.session_exercises group by session_id having count(*)>50)
    or exists (select 1 from public.exercise_sets group by session_exercise_id having count(*)>100)
    or exists (select 1 from public.exercise_sets es join public.session_exercises se on se.id=es.session_exercise_id
      group by se.session_id having count(*)>500) then
    raise exception 'Workout sync blocked: inconsistent existing aggregate requires review';
  end if;
  foreach v_role in array array['evaro_workout_sync_owner','evaro_workout_sync_server'] loop
    if not exists (select 1 from pg_catalog.pg_roles where rolname=v_role) then
      execute pg_catalog.format('create role %I nologin noinherit nosuperuser nobypassrls nocreatedb nocreaterole noreplication',v_role);
    elsif exists (select 1 from pg_catalog.pg_roles where rolname=v_role
      and (rolcanlogin or rolsuper or rolbypassrls or rolcreatedb or rolcreaterole or rolreplication)) then
      raise exception 'Unsafe workout sync role';
    end if;
    if exists (select 1 from pg_catalog.pg_auth_members
      where member=(select oid from pg_catalog.pg_roles where rolname=v_role)
         or roleid=(select oid from pg_catalog.pg_roles where rolname=v_role)) then
      raise exception 'Unsafe workout sync memberships';
    end if;
  end loop;
end $$;

create schema evaro_sync;
revoke all on schema evaro_sync from public;
create table evaro_sync.workout_clocks (
  owner_id uuid primary key references public.users(id) on delete cascade,
  cursor bigint not null check(cursor>=0)
);
create table evaro_sync.workout_heads (
  workout_id uuid primary key,
  owner_id uuid not null references public.users(id) on delete cascade,
  revision bigint not null check(revision>0),
  cursor bigint not null check(cursor>0),
  deleted boolean not null default false,
  deleted_at timestamptz,
  check(deleted = (deleted_at is not null)),
  unique(owner_id,cursor)
);
create table evaro_sync.workout_operations (
  owner_id uuid not null references public.users(id) on delete cascade,
  operation_id uuid not null,
  request_hash bytea not null check(octet_length(request_hash)=32),
  receipt jsonb not null,
  created_at timestamptz not null default pg_catalog.clock_timestamp(),
  primary key(owner_id,operation_id)
);
-- Transaction-local authority is held in a private row, never in a client-
-- writable GUC. Successful functions remove it; rollback removes failed writes.
create table evaro_sync.workout_write_contexts (
  backend_pid integer not null,
  transaction_id xid8 not null,
  primary key(backend_pid,transaction_id)
);
alter table evaro_sync.workout_clocks enable row level security;
alter table evaro_sync.workout_heads enable row level security;
alter table evaro_sync.workout_operations enable row level security;
alter table evaro_sync.workout_write_contexts enable row level security;
revoke all on all tables in schema evaro_sync from public,evaro_workout_sync_server;

-- Existing records have revision 1, never become "new" revision 0. Preserve all
-- original normalized rows; deterministic UUID ordering supplies initial cursors.
insert into evaro_sync.workout_heads(workout_id,owner_id,revision,cursor)
  select id,user_id,1,row_number() over(partition by user_id order by id) from public.workout_sessions;
insert into evaro_sync.workout_clocks(owner_id,cursor)
  select owner_id,max(cursor) from evaro_sync.workout_heads group by owner_id;

-- A trusted gateway receives EXECUTE only, never table/DDL authority. Direct
-- legacy writers would bypass revision/tombstone bookkeeping and are disallowed.
revoke insert,update,delete,truncate,references,trigger on public.workout_sessions,
  public.session_exercises,public.exercise_sets from public,anon,authenticated,evaro_workout_sync_server;

-- Definer write context cannot be forged by a client role: both effective owner
-- and private per-transaction row are checked. Referenced-parent SET NULL changes
-- outside the canonical transaction fail rather than silently evade revisions.
create function evaro_sync.guard_workout_write_v1() returns trigger
language plpgsql set search_path='' as $$
declare v_owner name;
begin
  if tg_table_name='workout_sessions' and tg_op='UPDATE' then
    if old.user_id=new.user_id and not exists(select 1 from public.users where id=old.user_id) then return new; end if;
  end if;
  -- Account removal must retain existing FK cascade semantics. Only already
  -- absent owning parents qualify; a direct legacy delete of a live owner fails.
  if tg_op='DELETE' then
    if tg_table_name='workout_sessions' then
      if not exists(select 1 from public.users where id=old.user_id) then return old; end if;
    elsif tg_table_name='session_exercises' then
      if not exists(select 1 from public.workout_sessions where id=old.session_id) then return old; end if;
    elsif tg_table_name='exercise_sets' then
      if not exists(select 1 from public.session_exercises where id=old.session_exercise_id) then return old; end if;
    end if;
  end if;
  select pg_catalog.pg_get_userbyid(relowner) into v_owner from pg_catalog.pg_class
    where oid='evaro_sync.workout_heads'::pg_catalog.regclass;
  if current_user<>v_owner then
    raise exception using errcode='42501',message='Canonical workout transaction required';
  end if;
  if not exists(select 1 from evaro_sync.workout_write_contexts
    where backend_pid=pg_catalog.pg_backend_pid() and transaction_id=pg_catalog.pg_current_xact_id()) then
    raise exception using errcode='42501',message='Canonical workout transaction required';
  end if;
  if tg_op='DELETE' then return old; end if;
  return new;
end $$;

create function evaro_sync.snapshot_workout_v1(p_workout_id uuid) returns jsonb
language sql stable set search_path='' as $$
  select pg_catalog.to_jsonb(s)-'user_id'||pg_catalog.jsonb_build_object('exercises',coalesce((
    select pg_catalog.jsonb_agg(pg_catalog.to_jsonb(se)-'session_id'||pg_catalog.jsonb_build_object('sets',coalesce((
      select pg_catalog.jsonb_agg(pg_catalog.to_jsonb(es)-'session_exercise_id' order by es.set_number,es.id)
        from public.exercise_sets es where es.session_exercise_id=se.id),'[]'::jsonb)) order by se."order",se.id)
      from public.session_exercises se where se.session_id=s.id),'[]'::jsonb))
  from public.workout_sessions s where s.id=p_workout_id;
$$;
create trigger evaro_workout_write_guard_v1 before insert or update or delete on public.workout_sessions
  for each row execute function evaro_sync.guard_workout_write_v1();
create trigger evaro_workout_exercise_write_guard_v1 before insert or update or delete on public.session_exercises
  for each row execute function evaro_sync.guard_workout_write_v1();
create trigger evaro_workout_set_write_guard_v1 before insert or update or delete on public.exercise_sets
  for each row execute function evaro_sync.guard_workout_write_v1();

-- Field allowlists + JSON scalar types precede SQL conversion/constraint checks.
create function evaro_sync.validate_workout_fields_v1(p_row jsonb,p_kind text) returns void
language plpgsql set search_path='' as $$
declare v_key text; v_value jsonb; v_allowed text[]; v_numbers text[]; v_ints text[];
begin
  if pg_catalog.jsonb_typeof(p_row) is distinct from 'object' then
    raise exception using errcode='22023',message='Invalid workout aggregate';
  end if;
  if p_kind='session' then
    v_allowed:=array['name','template_id','program_id','started_at','completed_at','duration_seconds','bodyweight_kg','perceived_exertion','notes','exercises'];
    v_numbers:=array['duration_seconds','bodyweight_kg','perceived_exertion']; v_ints:=array['duration_seconds'];
    if pg_catalog.jsonb_typeof(p_row->'name') is distinct from 'string' or length(p_row->>'name') not between 1 and 100
      or pg_catalog.jsonb_typeof(p_row->'started_at') is distinct from 'string'
      or pg_catalog.jsonb_typeof(p_row->'exercises') is distinct from 'array'
      or pg_catalog.jsonb_array_length(p_row->'exercises')>50 then
      raise exception using errcode='22023',message='Invalid workout aggregate';
    end if;
  elsif p_kind='exercise' then
    v_allowed:=array['id','exercise_id','order','superset_group','notes','sets'];
    v_numbers:=array['order']; v_ints:=array['order'];
    if not (p_row ?& array['id','exercise_id','order','sets'])
      or pg_catalog.jsonb_typeof(p_row->'sets') is distinct from 'array'
      or pg_catalog.jsonb_array_length(p_row->'sets')>100 then
      raise exception using errcode='22023',message='Invalid workout aggregate';
    end if;
  else
    v_allowed:=array['id','set_number','type','weight','reps','rpe','rir','rest_seconds','duration_seconds','distance_meters','notes','completed','completed_at'];
    v_numbers:=array['set_number','weight','reps','rpe','rir','rest_seconds','duration_seconds','distance_meters'];
    v_ints:=array['set_number','reps','rir','rest_seconds'];
    if not(p_row ?& array['id','set_number','type','completed'])
      or pg_catalog.jsonb_typeof(p_row->'type') is distinct from 'string'
      or pg_catalog.jsonb_typeof(p_row->'completed') is distinct from 'boolean' then
      raise exception using errcode='22023',message='Invalid workout aggregate';
    end if;
  end if;
  for v_key,v_value in select key,value from pg_catalog.jsonb_each(p_row) loop
    if not(v_key=any(v_allowed)) then raise exception using errcode='22023',message='Invalid workout aggregate'; end if;
    if v_value='null'::jsonb then
      if v_key=any(array['name','started_at','exercises','id','exercise_id','order','sets','set_number','type','completed']) then
        raise exception using errcode='22023',message='Invalid workout aggregate';
      end if;
      continue;
    end if;
    if v_key=any(v_numbers) then
      if pg_catalog.jsonb_typeof(v_value)<>'number' or (v_value::text)::numeric<0
        or (v_key=any(v_ints) and ((v_value::text)::numeric<>trunc((v_value::text)::numeric) or (v_value::text)::numeric>2147483647)) then
        raise exception using errcode='22023',message='Invalid workout aggregate';
      end if;
    elsif v_key=any(array['id','exercise_id','template_id','program_id']) then
      if pg_catalog.jsonb_typeof(v_value)<>'string' or p_row->>v_key !~ '^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$' then
        raise exception using errcode='22023',message='Invalid workout aggregate';
      end if;
    elsif v_key=any(array['started_at','completed_at']) then
      if pg_catalog.jsonb_typeof(v_value)<>'string' or length(p_row->>v_key)>40
        or p_row->>v_key !~ '^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d{1,6})?(Z|[+-]\d{2}:\d{2})$' then
        raise exception using errcode='22023',message='Invalid workout aggregate';
      end if;
      perform (p_row->>v_key)::timestamptz;
    elsif v_key=any(array['name','notes','superset_group','type']) then
      if pg_catalog.jsonb_typeof(v_value)<>'string' or length(p_row->>v_key)>
        (case when v_key='notes' then case p_kind when 'session' then 2000 when 'exercise' then 1000 else 500 end else 100 end) then
        raise exception using errcode='22023',message='Invalid workout aggregate';
      end if;
    end if;
  end loop;
end $$;

create function evaro_sync.mutate_workout_v1(p_operation_id uuid,p_workout_id uuid,
  p_expected_revision bigint,p_action text,p_payload jsonb) returns jsonb
language plpgsql security definer set search_path='' set lock_timeout='2s' as $$
declare
  v_owner uuid:=auth.uid(); v_head evaro_sync.workout_heads%rowtype;
  v_hash bytea; v_previous evaro_sync.workout_operations%rowtype;
  v_receipt jsonb; v_cursor bigint; v_revision bigint; v_ex jsonb; v_set jsonb;
  v_ex_ids uuid[]:='{}'; v_set_ids uuid[]:='{}'; v_orders integer[]:='{}'; v_numbers integer[];
  v_id uuid; v_exercise_id uuid; v_affected integer; v_now timestamptz:=pg_catalog.clock_timestamp();
begin
  if pg_catalog.current_setting('transaction_isolation')<>'read committed' then
    raise exception using errcode='22023',message='Workout sync requires READ COMMITTED';
  end if;
  if v_owner is null or not exists(select 1 from public.users where id=v_owner) then
    raise exception using errcode='42501',message='Verified account required';
  end if;
  if p_operation_id is null or p_workout_id is null or p_expected_revision is null or p_expected_revision<0
    or p_action is null or p_action not in('upsert','delete')
    or (p_action='delete' and p_payload is not null)
    or (p_action='upsert' and (p_payload is null or pg_catalog.octet_length(p_payload::text)>131072)) then
    raise exception using errcode='22023',message='Invalid workout aggregate';
  end if;
  -- Owner serialization orders cursor increments and their commits. Fixed lock
  -- order + READ COMMITTED avoid stale snapshots after concurrent CAS waits.
  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended('evaro-workout-owner:'||v_owner,0));
  v_hash:=pg_catalog.sha256(pg_catalog.convert_to(pg_catalog.jsonb_build_object('workout_id',p_workout_id,
    'expected_revision',p_expected_revision,'action',p_action,'payload',p_payload)::text,'UTF8'));
  select * into v_previous from evaro_sync.workout_operations where owner_id=v_owner and operation_id=p_operation_id;
  if found then
    if v_previous.request_hash<>v_hash then raise exception using errcode='22023',message='Operation payload conflict'; end if;
    return v_previous.receipt;
  end if;
  -- A UUID collision from another account must never become an ON CONFLICT
  -- update of that account's aggregate after our preflight snapshot.
  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended('evaro-workout-id:'||p_workout_id,0));
  select * into v_head from evaro_sync.workout_heads where workout_id=p_workout_id;
  if found and v_head.owner_id<>v_owner then raise exception using errcode='42501',message='Invalid workout reference'; end if;
  v_revision:=coalesce(v_head.revision,0);
  if v_revision<>p_expected_revision then
    v_receipt:=pg_catalog.jsonb_build_object('version',1,'status','conflict','workout_id',p_workout_id,'revision',v_revision::text,
      'deleted',coalesce(v_head.deleted,false));
    insert into evaro_sync.workout_operations(owner_id,operation_id,request_hash,receipt) values(v_owner,p_operation_id,v_hash,v_receipt);
    return v_receipt;
  end if;
  if coalesce(v_head.deleted,false) and p_action='upsert' then
    v_receipt:=pg_catalog.jsonb_build_object('version',1,'status','conflict','workout_id',p_workout_id,'revision',v_revision::text,'deleted',true);
    insert into evaro_sync.workout_operations(owner_id,operation_id,request_hash,receipt) values(v_owner,p_operation_id,v_hash,v_receipt);
    return v_receipt;
  end if;
  if p_action='upsert' then
    perform evaro_sync.validate_workout_fields_v1(p_payload,'session');
    if (p_payload->>'completed_at')::timestamptz < (p_payload->>'started_at')::timestamptz
      or (p_payload->>'bodyweight_kg')::numeric<=0
      or (p_payload->>'perceived_exertion')::numeric not between 1 and 10 then
      raise exception using errcode='22023',message='Invalid workout aggregate';
    end if;
    if (p_payload->>'template_id' is not null and not exists(select 1 from public.workout_templates
      where id=(p_payload->>'template_id')::uuid and user_id=v_owner))
      or (p_payload->>'program_id' is not null and not exists(select 1 from public.programs
      where id=(p_payload->>'program_id')::uuid and user_id=v_owner)) then
      raise exception using errcode='42501',message='Invalid workout reference';
    end if;
    for v_ex in select value from pg_catalog.jsonb_array_elements(p_payload->'exercises') loop
      perform evaro_sync.validate_workout_fields_v1(v_ex,'exercise');
      v_id:=(v_ex->>'id')::uuid; v_exercise_id:=(v_ex->>'exercise_id')::uuid;
      if v_id=any(v_ex_ids) or (v_ex->>'order')::integer=any(v_orders) then
        raise exception using errcode='22023',message='Duplicate workout child';
      end if;
      v_ex_ids:=array_append(v_ex_ids,v_id); v_orders:=array_append(v_orders,(v_ex->>'order')::integer);
      if not exists(select 1 from public.exercises where id=v_exercise_id and (owner_id is null or owner_id=v_owner))
        or exists(select 1 from public.session_exercises where id=v_id and session_id<>p_workout_id)
        or exists(select 1 from public.personal_records pr join public.exercise_sets es on es.id=pr.set_id
          where es.session_exercise_id=v_id and pr.exercise_id<>v_exercise_id) then
        raise exception using errcode='42501',message='Invalid workout reference';
      end if;
      v_numbers:='{}';
      for v_set in select value from pg_catalog.jsonb_array_elements(v_ex->'sets') loop
        perform evaro_sync.validate_workout_fields_v1(v_set,'set');
        if (v_set->>'id')::uuid=any(v_set_ids) or (v_set->>'set_number')::integer=any(v_numbers)
          or (v_set->>'set_number')::integer<1 then raise exception using errcode='22023',message='Duplicate workout child'; end if;
        v_set_ids:=array_append(v_set_ids,(v_set->>'id')::uuid);
        v_numbers:=array_append(v_numbers,(v_set->>'set_number')::integer);
        if array_length(v_set_ids,1)>500 then raise exception using errcode='22023',message='Invalid workout aggregate'; end if;
        if exists(select 1 from public.exercise_sets where id=(v_set->>'id')::uuid and session_exercise_id<>v_id) then
          raise exception using errcode='42501',message='Invalid workout reference';
        end if;
        perform (v_set->>'type')::public.set_type;
      end loop;
    end loop;
  end if;
  if coalesce(v_head.deleted,false) then
    v_cursor:=v_head.cursor; -- New delete operation on a tombstone is an idempotent no-op.
  else
    insert into evaro_sync.workout_clocks(owner_id,cursor) values(v_owner,1)
      on conflict(owner_id) do update set cursor=evaro_sync.workout_clocks.cursor+1 returning cursor into v_cursor;
    v_revision:=v_revision+1;
    insert into evaro_sync.workout_write_contexts values(pg_catalog.pg_backend_pid(),pg_catalog.pg_current_xact_id());
    if p_action='delete' then
      -- The baseline has two SET NULL routes (session and descendant set) into
      -- personal_records. Clear those links atomically before the parent delete;
      -- cascading both paths can otherwise transiently violate the other FK.
      -- Values remain untouched; this does not recompute historical records.
      update public.personal_records pr set
        session_id=case when pr.session_id=p_workout_id then null else pr.session_id end,
        set_id=case when exists(select 1 from public.exercise_sets es join public.session_exercises se on se.id=es.session_exercise_id
          where es.id=pr.set_id and se.session_id=p_workout_id) then null else pr.set_id end
      where pr.user_id=v_owner and (pr.session_id=p_workout_id or exists(select 1 from public.exercise_sets es
        join public.session_exercises se on se.id=es.session_exercise_id where es.id=pr.set_id and se.session_id=p_workout_id));
      delete from public.workout_sessions where id=p_workout_id and user_id=v_owner;
    else
      insert into public.workout_sessions(id,user_id,template_id,program_id,name,started_at,completed_at,duration_seconds,
        bodyweight_kg,perceived_exertion,notes,created_at,updated_at)
      values(p_workout_id,v_owner,(p_payload->>'template_id')::uuid,(p_payload->>'program_id')::uuid,p_payload->>'name',
        (p_payload->>'started_at')::timestamptz,(p_payload->>'completed_at')::timestamptz,(p_payload->>'duration_seconds')::integer,
        (p_payload->>'bodyweight_kg')::numeric,(p_payload->>'perceived_exertion')::numeric,p_payload->>'notes',v_now,v_now)
      on conflict(id) do update set template_id=excluded.template_id,program_id=excluded.program_id,name=excluded.name,
        started_at=excluded.started_at,completed_at=excluded.completed_at,duration_seconds=excluded.duration_seconds,
        bodyweight_kg=excluded.bodyweight_kg,perceived_exertion=excluded.perceived_exertion,notes=excluded.notes,updated_at=v_now
        where public.workout_sessions.user_id=excluded.user_id;
      get diagnostics v_affected=row_count;
      if v_affected<>1 then raise exception using errcode='42501',message='Invalid workout reference'; end if;
      for v_ex in select value from pg_catalog.jsonb_array_elements(p_payload->'exercises') loop
        v_id:=(v_ex->>'id')::uuid;
        insert into public.session_exercises(id,session_id,exercise_id,"order",superset_group,notes)
          values(v_id,p_workout_id,(v_ex->>'exercise_id')::uuid,(v_ex->>'order')::integer,v_ex->>'superset_group',v_ex->>'notes')
          on conflict(id) do update set exercise_id=excluded.exercise_id,"order"=excluded."order",superset_group=excluded.superset_group,notes=excluded.notes
            where public.session_exercises.session_id=excluded.session_id;
        get diagnostics v_affected=row_count;
        if v_affected<>1 then raise exception using errcode='42501',message='Invalid workout reference'; end if;
        for v_set in select value from pg_catalog.jsonb_array_elements(v_ex->'sets') loop
          insert into public.exercise_sets(id,session_exercise_id,set_number,type,weight,reps,rpe,rir,rest_seconds,duration_seconds,distance_meters,notes,completed,completed_at)
          values((v_set->>'id')::uuid,v_id,(v_set->>'set_number')::integer,(v_set->>'type')::public.set_type,
            (v_set->>'weight')::numeric,(v_set->>'reps')::integer,(v_set->>'rpe')::numeric,(v_set->>'rir')::integer,
            (v_set->>'rest_seconds')::integer,(v_set->>'duration_seconds')::numeric,(v_set->>'distance_meters')::numeric,
            v_set->>'notes',(v_set->>'completed')::boolean,(v_set->>'completed_at')::timestamptz)
          on conflict(id) do update set set_number=excluded.set_number,type=excluded.type,weight=excluded.weight,reps=excluded.reps,
            rpe=excluded.rpe,rir=excluded.rir,rest_seconds=excluded.rest_seconds,duration_seconds=excluded.duration_seconds,
            distance_meters=excluded.distance_meters,notes=excluded.notes,completed=excluded.completed,completed_at=excluded.completed_at
            where public.exercise_sets.session_exercise_id=excluded.session_exercise_id;
          get diagnostics v_affected=row_count;
          if v_affected<>1 then raise exception using errcode='42501',message='Invalid workout reference'; end if;
        end loop;
      end loop;
      delete from public.exercise_sets es using public.session_exercises se
        where es.session_exercise_id=se.id and se.session_id=p_workout_id and not(es.id=any(v_set_ids));
      delete from public.session_exercises where session_id=p_workout_id and not(id=any(v_ex_ids));
      if pg_catalog.octet_length(evaro_sync.snapshot_workout_v1(p_workout_id)::text)>131072 then
        raise exception using errcode='22023',message='Invalid workout aggregate';
      end if;
    end if;
    delete from evaro_sync.workout_write_contexts where backend_pid=pg_catalog.pg_backend_pid()
      and transaction_id=pg_catalog.pg_current_xact_id();
    insert into evaro_sync.workout_heads(workout_id,owner_id,revision,cursor,deleted,deleted_at)
      values(p_workout_id,v_owner,v_revision,v_cursor,p_action='delete',case when p_action='delete' then v_now end)
      on conflict(workout_id) do update set revision=excluded.revision,cursor=excluded.cursor,deleted=excluded.deleted,deleted_at=excluded.deleted_at
        where evaro_sync.workout_heads.owner_id=excluded.owner_id;
    get diagnostics v_affected=row_count;
    if v_affected<>1 then raise exception using errcode='42501',message='Invalid workout reference'; end if;
  end if;
  v_receipt:=pg_catalog.jsonb_build_object('version',1,'status','applied','operation_id',p_operation_id,'workout_id',p_workout_id,
    'revision',v_revision::text,'cursor',v_cursor::text,'deleted',p_action='delete');
  insert into evaro_sync.workout_operations(owner_id,operation_id,request_hash,receipt) values(v_owner,p_operation_id,v_hash,v_receipt);
  return v_receipt;
exception
  when unique_violation then raise exception using errcode='42501',message='Invalid workout reference';
  when invalid_text_representation or datetime_field_overflow or numeric_value_out_of_range or check_violation or not_null_violation then
    raise exception using errcode='22023',message='Invalid workout aggregate';
  when foreign_key_violation then raise exception using errcode='42501',message='Invalid workout reference';
end $$;

create function evaro_sync.read_workout_changes_v1(p_after_cursor bigint,p_limit integer default 20) returns jsonb
language plpgsql security definer set search_path='' set lock_timeout='2s' as $$
declare v_owner uuid:=auth.uid(); v_upper bigint; v_next bigint; v_rows jsonb;
begin
  if pg_catalog.current_setting('transaction_isolation')<>'read committed' then
    raise exception using errcode='22023',message='Workout sync requires READ COMMITTED';
  end if;
  if v_owner is null or not exists(select 1 from public.users where id=v_owner) then
    raise exception using errcode='42501',message='Verified account required';
  end if;
  if p_after_cursor is null or p_after_cursor<0 or p_limit is null or p_limit not between 1 and 20 then
    raise exception using errcode='22023',message='Invalid workout cursor';
  end if;
  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended('evaro-workout-owner:'||v_owner,0));
  select coalesce((select cursor from evaro_sync.workout_clocks where owner_id=v_owner),0) into v_upper;
  if p_after_cursor>v_upper then raise exception using errcode='22023',message='Invalid workout cursor'; end if;
  with page as (
    select * from evaro_sync.workout_heads where owner_id=v_owner and cursor>p_after_cursor order by cursor limit p_limit
  ), aggregates as (
    select h.cursor,pg_catalog.jsonb_build_object('workout_id',h.workout_id,'revision',h.revision::text,'cursor',h.cursor::text,
      'deleted',h.deleted,'deleted_at',h.deleted_at,'payload',case when h.deleted then null
        else evaro_sync.snapshot_workout_v1(h.workout_id) end) as item from page h
  ) select coalesce(pg_catalog.jsonb_agg(item order by cursor),'[]'::jsonb),max(cursor) into v_rows,v_next from aggregates;
  if pg_catalog.jsonb_array_length(v_rows)<p_limit then v_next:=v_upper; end if;
  return pg_catalog.jsonb_build_object('version',1,'cursor',coalesce(v_next,p_after_cursor)::text,'upper_cursor',v_upper::text,'changes',v_rows);
end $$;

-- Enforce outgoing page bounds on historical aggregates too; never truncate or
-- rewrite old notes/children to fit a new contract.
do $$ begin
  if exists(select 1 from public.workout_sessions where
    pg_catalog.octet_length(evaro_sync.snapshot_workout_v1(id)::text)>131072) then
    raise exception 'Workout sync blocked: oversized existing aggregate requires review';
  end if;
end $$;

-- Definers use a dedicated role with ordinary RLS, never the installing
-- superuser. Its private tables are owned; public aggregates remain under RLS.
grant usage on schema public,auth to evaro_workout_sync_owner;
grant execute on function auth.uid() to evaro_workout_sync_owner;
grant select on public.users,public.exercises,public.workout_templates,public.programs
  to evaro_workout_sync_owner;
grant select,insert,update,delete on public.workout_sessions,public.session_exercises,
  public.exercise_sets to evaro_workout_sync_owner;
grant select,update on public.personal_records to evaro_workout_sync_owner;
alter schema evaro_sync owner to evaro_workout_sync_owner;
do $$ declare v_object record; begin
  for v_object in select c.oid::pg_catalog.regclass as identity from pg_catalog.pg_class c
    where c.relnamespace='evaro_sync'::pg_catalog.regnamespace and c.relkind='r' loop
    execute pg_catalog.format('alter table %s owner to evaro_workout_sync_owner',v_object.identity);
  end loop;
  for v_object in select p.oid::pg_catalog.regprocedure as identity from pg_catalog.pg_proc p
    where p.pronamespace='evaro_sync'::pg_catalog.regnamespace loop
    execute pg_catalog.format('alter function %s owner to evaro_workout_sync_owner',v_object.identity);
  end loop;
end $$;
revoke all on all functions in schema evaro_sync from public;
grant usage on schema evaro_sync to evaro_workout_sync_server;
grant execute on function evaro_sync.mutate_workout_v1(uuid,uuid,bigint,text,jsonb),
  evaro_sync.read_workout_changes_v1(bigint,integer) to evaro_workout_sync_server;
-- Reject inherited default grants, including accidentally exposed helpers.
do $$ begin
  if exists(select 1 from pg_catalog.pg_proc p
    cross join lateral pg_catalog.aclexplode(coalesce(p.proacl,pg_catalog.acldefault('f',p.proowner))) a
    where p.pronamespace='evaro_sync'::pg_catalog.regnamespace and a.grantee<>p.proowner
      and not(a.grantee=(select oid from pg_catalog.pg_roles where rolname='evaro_workout_sync_server')
        and p.proname in('mutate_workout_v1','read_workout_changes_v1') and a.privilege_type='EXECUTE'))
    or exists(select 1 from pg_catalog.pg_class c cross join lateral pg_catalog.aclexplode(coalesce(c.relacl,pg_catalog.acldefault('r',c.relowner))) a
      where c.relnamespace='evaro_sync'::pg_catalog.regnamespace and a.grantee<>c.relowner) then
    raise exception 'Unsafe workout sync default grants';
  end if;
end $$;
commit;
