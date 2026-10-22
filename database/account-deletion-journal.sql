-- One-time portable PostgreSQL journal, not an Auth/deletion route or enrollment.
-- A trusted server verifies identity/reauth before claim; a private worker may
-- resume only persisted authorization. NOLOGIN roles get no memberships here.
-- No FK to Auth: records survive Auth removal. One immutable request per UUID
-- remains until a separately reviewed retention/recovery policy permits changes.
-- Trusted application/DB clocks can differ. Authorization/completion metadata
-- accepts at most 5 seconds ahead of DB time; the application still verifies
-- fresh reauthentication independently. Lease expiry has NO skew tolerance and
-- uses only DB time after locking. Larger skew fails closed for clock repair.
begin;
do $$ declare v_role text; begin
  foreach v_role in array array['evaro_deletion_owner','evaro_deletion_server'] loop
    if not exists(select 1 from pg_catalog.pg_roles where rolname=v_role) then
      execute pg_catalog.format('create role %I nologin noinherit nosuperuser nobypassrls nocreatedb nocreaterole noreplication',v_role);
    elsif exists(select 1 from pg_catalog.pg_roles where rolname=v_role and
      (rolcanlogin or rolsuper or rolbypassrls or rolcreatedb or rolcreaterole or rolreplication)) then
      raise exception 'Unsafe existing deletion role; review before applying';
    end if;
    if exists(select 1 from pg_catalog.pg_auth_members where
      member=(select oid from pg_catalog.pg_roles where rolname=v_role) or
      roleid=(select oid from pg_catalog.pg_roles where rolname=v_role)) then
      raise exception 'Existing deletion role has unsafe memberships; review before applying';
    end if;
  end loop;
end $$;
create schema evaro_deletion_private authorization evaro_deletion_owner;
revoke all on schema evaro_deletion_private from public;
create table evaro_deletion_private.account_deletion_operations (
  request_id uuid primary key,
  user_id uuid not null unique,
  authorized_at timestamptz not null check (pg_catalog.isfinite(authorized_at)),
  stage_count smallint not null default 0 check (stage_count between 0 and 6),
  lease_id uuid unique,
  lease_expires_at timestamptz,
  completed_at timestamptz,
  receipt jsonb,
  check ((lease_id is null) = (lease_expires_at is null)),
  check (lease_expires_at is null or pg_catalog.isfinite(lease_expires_at)),
  check ((completed_at is null and receipt is null) or
    (completed_at is not null and pg_catalog.isfinite(completed_at) and
     completed_at >= authorized_at and stage_count=6 and receipt is not null and
     receipt=pg_catalog.jsonb_build_object('version',1,'success',true,'user_id',user_id,
       'deleted_at',pg_catalog.to_char(completed_at at time zone 'UTC','YYYY-MM-DD"T"HH24:MI:SS.MS"Z"'))))
);
alter table evaro_deletion_private.account_deletion_operations owner to evaro_deletion_owner;
alter table evaro_deletion_private.account_deletion_operations enable row level security;
revoke all on evaro_deletion_private.account_deletion_operations from public,evaro_deletion_server;

create function evaro_deletion_private.account_deletion_guard_v1()
returns trigger language plpgsql set search_path='' as $$ begin
  if new.request_id is distinct from old.request_id or new.user_id is distinct from old.user_id or
     new.authorized_at is distinct from old.authorized_at or old.completed_at is not null or
     new.stage_count < old.stage_count or new.stage_count > old.stage_count+1 then
    raise exception using errcode='22023',message='Deletion journal identity/progress is immutable';
  end if;
  return new;
end $$;
create trigger account_deletion_guard before update on evaro_deletion_private.account_deletion_operations
  for each row execute function evaro_deletion_private.account_deletion_guard_v1();

create function evaro_deletion_private.account_deletion_record_v1(
  p_row evaro_deletion_private.account_deletion_operations
) returns jsonb language sql immutable set search_path='' as $$
  select pg_catalog.jsonb_build_object('version',1,'user_id',p_row.user_id,'request_id',p_row.request_id,
    'authorized_at',pg_catalog.to_char(p_row.authorized_at at time zone 'UTC','YYYY-MM-DD"T"HH24:MI:SS.MS"Z"'),
    'completed_stages',pg_catalog.to_jsonb((array['fenceWritesAndRevokeSessions','deletePrivateStorage',
      'deleteProviderData','deleteCloudData','deleteAuthIdentity','verifyCompletion']::text[])[1:p_row.stage_count]));
$$;

-- Internal common claim routine, never granted to the runtime role. Locks for
-- new rows use user then request; existing contexts use a row lock. Expiry is
-- measured AFTER locking, never against an earlier stale timestamp/snapshot.
create function evaro_deletion_private.account_deletion_acquire_v1(
  p_user_id uuid,p_request_id uuid,p_authorized_at timestamptz,p_create boolean
) returns jsonb language plpgsql security definer set search_path='' set lock_timeout='2s' as $$
declare v_row evaro_deletion_private.account_deletion_operations%rowtype;
  v_user_id uuid:=p_user_id; v_now timestamptz;
begin
  if pg_catalog.current_setting('transaction_isolation') <> 'read committed' then
    raise exception using errcode='22023',message='Deletion journal requires READ COMMITTED';
  end if;
  if p_request_id is null or p_create is null or (p_create and p_user_id is null) then
    raise exception using errcode='22023',message='Invalid deletion claim';
  end if;
  if not p_create then
    select user_id into v_user_id from evaro_deletion_private.account_deletion_operations where request_id=p_request_id;
    if not found then return null; end if;
  end if;
  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended('evaro-delete-user:'||v_user_id,0));
  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended('evaro-delete-request:'||p_request_id,0));
  select * into v_row from evaro_deletion_private.account_deletion_operations where request_id=p_request_id for update;
  v_now:=pg_catalog.clock_timestamp();
  if found then
    if v_row.user_id<>v_user_id then return pg_catalog.jsonb_build_object('status','busy'); end if;
    if v_row.completed_at is not null then
      return pg_catalog.jsonb_build_object('status','complete','record',evaro_deletion_private.account_deletion_record_v1(v_row),'receipt',v_row.receipt);
    end if;
    if v_row.lease_expires_at>v_now then return pg_catalog.jsonb_build_object('status','busy'); end if;
  else
    if not p_create then return null; end if;
    if exists(select 1 from evaro_deletion_private.account_deletion_operations where user_id=v_user_id) then
      return pg_catalog.jsonb_build_object('status','busy');
    end if;
    if p_authorized_at is null or not pg_catalog.isfinite(p_authorized_at) or
       p_authorized_at>v_now+interval '5 seconds' or p_authorized_at<v_now-interval '5 minutes' then
      raise exception using errcode='22023',message='Invalid deletion authorization timestamp';
    end if;
    insert into evaro_deletion_private.account_deletion_operations(request_id,user_id,authorized_at)
      values(p_request_id,v_user_id,pg_catalog.date_trunc('milliseconds',p_authorized_at)) returning * into v_row;
  end if;
  update evaro_deletion_private.account_deletion_operations
    set lease_id=pg_catalog.gen_random_uuid(),lease_expires_at=v_now+interval '120 seconds'
    where request_id=p_request_id returning * into v_row;
  return pg_catalog.jsonb_build_object('status','acquired','leaseId',v_row.lease_id,
    'record',evaro_deletion_private.account_deletion_record_v1(v_row));
end $$;

create function evaro_deletion_private.account_deletion_claim_v1(
  p_user_id uuid,p_request_id uuid,p_authorized_at timestamptz
) returns jsonb language sql security definer set search_path='' as $$
  select evaro_deletion_private.account_deletion_acquire_v1(p_user_id,p_request_id,p_authorized_at,true);
$$;
create function evaro_deletion_private.account_deletion_claim_authorized_v1(p_request_id uuid)
returns jsonb language sql security definer set search_path='' as $$
  select evaro_deletion_private.account_deletion_acquire_v1(null,p_request_id,null,false);
$$;

create function evaro_deletion_private.account_deletion_mark_stage_v1(
  p_user_id uuid,p_request_id uuid,p_lease_id uuid,p_stage text
) returns jsonb language plpgsql security definer set search_path='' set lock_timeout='2s' as $$
declare v_row evaro_deletion_private.account_deletion_operations%rowtype; v_index integer;
begin
  if pg_catalog.current_setting('transaction_isolation') <> 'read committed' then
    raise exception using errcode='22023',message='Deletion journal requires READ COMMITTED';
  end if;
  v_index:=pg_catalog.array_position(array['fenceWritesAndRevokeSessions','deletePrivateStorage',
    'deleteProviderData','deleteCloudData','deleteAuthIdentity','verifyCompletion']::text[],p_stage);
  select * into v_row from evaro_deletion_private.account_deletion_operations
    where request_id=p_request_id and user_id=p_user_id for update;
  if not found or p_lease_id is null or v_row.lease_id is distinct from p_lease_id or
     v_row.completed_at is not null or v_row.lease_expires_at is null or
     v_row.lease_expires_at<=pg_catalog.clock_timestamp() or v_index is null or v_index>v_row.stage_count+1 then
    raise exception using errcode='22023',message='Invalid deletion stage or lease';
  end if;
  if v_index=v_row.stage_count+1 then
    update evaro_deletion_private.account_deletion_operations
      set stage_count=v_index,lease_expires_at=pg_catalog.clock_timestamp()+interval '120 seconds'
      where request_id=p_request_id returning * into v_row;
  end if;
  return evaro_deletion_private.account_deletion_record_v1(v_row);
end $$;

create function evaro_deletion_private.account_deletion_complete_v1(
  p_user_id uuid,p_request_id uuid,p_lease_id uuid,p_deleted_at timestamptz
) returns jsonb language plpgsql security definer set search_path='' set lock_timeout='2s' as $$
declare v_row evaro_deletion_private.account_deletion_operations%rowtype; v_now timestamptz;
begin
  if pg_catalog.current_setting('transaction_isolation') <> 'read committed' then
    raise exception using errcode='22023',message='Deletion journal requires READ COMMITTED';
  end if;
  select * into v_row from evaro_deletion_private.account_deletion_operations
    where request_id=p_request_id and user_id=p_user_id for update;
  v_now:=pg_catalog.clock_timestamp();
  if not found or p_lease_id is null or v_row.lease_id is distinct from p_lease_id then
    raise exception using errcode='22023',message='Invalid deletion completion or lease';
  end if;
  if v_row.completed_at is not null then return v_row.receipt; end if;
  if v_row.stage_count<>6 or v_row.lease_expires_at is null or v_row.lease_expires_at<=v_now or
     p_deleted_at is null or not pg_catalog.isfinite(p_deleted_at) or
     p_deleted_at<v_row.authorized_at or p_deleted_at>v_now+interval '5 seconds' then
    raise exception using errcode='22023',message='Invalid deletion completion or lease';
  end if;
  update evaro_deletion_private.account_deletion_operations
    set completed_at=pg_catalog.date_trunc('milliseconds',p_deleted_at),
      receipt=pg_catalog.jsonb_build_object('version',1,'success',true,'user_id',user_id,
        'deleted_at',pg_catalog.to_char(p_deleted_at at time zone 'UTC','YYYY-MM-DD"T"HH24:MI:SS.MS"Z"'))
    where request_id=p_request_id returning * into v_row;
  return v_row.receipt;
end $$;

create function evaro_deletion_private.account_deletion_release_v1(
  p_user_id uuid,p_request_id uuid,p_lease_id uuid
) returns boolean language plpgsql security definer set search_path='' set lock_timeout='2s' as $$
declare v_changed integer;
begin
  if pg_catalog.current_setting('transaction_isolation') <> 'read committed' then
    raise exception using errcode='22023',message='Deletion journal requires READ COMMITTED';
  end if;
  update evaro_deletion_private.account_deletion_operations set lease_id=null,lease_expires_at=null
    where user_id=p_user_id and request_id=p_request_id and lease_id=p_lease_id and completed_at is null;
  get diagnostics v_changed=row_count;
  return v_changed=1;
end $$;

-- Functions execute as a dedicated least-privilege table owner, never as the
-- installing superuser. No schema/table/helper authority reaches the server.
do $$ declare v_function record; begin
  for v_function in select p.oid::pg_catalog.regprocedure as signature from pg_catalog.pg_proc p
    join pg_catalog.pg_namespace n on n.oid=p.pronamespace where n.nspname='evaro_deletion_private' loop
    execute pg_catalog.format('alter function %s owner to evaro_deletion_owner',v_function.signature);
  end loop;
end $$;
revoke all on all functions in schema evaro_deletion_private from public,evaro_deletion_server;
grant usage on schema evaro_deletion_private to evaro_deletion_server;
grant execute on function evaro_deletion_private.account_deletion_claim_v1(uuid,uuid,timestamptz),
  evaro_deletion_private.account_deletion_claim_authorized_v1(uuid),
  evaro_deletion_private.account_deletion_mark_stage_v1(uuid,uuid,uuid,text),
  evaro_deletion_private.account_deletion_complete_v1(uuid,uuid,uuid,timestamptz),
  evaro_deletion_private.account_deletion_release_v1(uuid,uuid,uuid) to evaro_deletion_server;
do $$ declare v_owner oid; v_server oid; begin
  select oid into v_owner from pg_catalog.pg_roles where rolname='evaro_deletion_owner';
  select oid into v_server from pg_catalog.pg_roles where rolname='evaro_deletion_server';
  if exists(select 1 from pg_catalog.pg_namespace n cross join lateral
    pg_catalog.aclexplode(coalesce(n.nspacl,pg_catalog.acldefault('n',n.nspowner))) a
    where n.nspname='evaro_deletion_private' and (a.grantee not in(v_owner,v_server) or
      (a.grantee=v_server and a.privilege_type<>'USAGE')))
    or exists(select 1 from pg_catalog.pg_class c join pg_catalog.pg_namespace n on n.oid=c.relnamespace
      cross join lateral pg_catalog.aclexplode(coalesce(c.relacl,pg_catalog.acldefault('r',c.relowner))) a
      where n.nspname='evaro_deletion_private' and a.grantee<>v_owner)
    or exists(select 1 from pg_catalog.pg_proc p join pg_catalog.pg_namespace n on n.oid=p.pronamespace
      cross join lateral pg_catalog.aclexplode(coalesce(p.proacl,pg_catalog.acldefault('f',p.proowner))) a
      where n.nspname='evaro_deletion_private' and (a.grantee not in(v_owner,v_server) or
        (a.grantee=v_server and p.proname not in('account_deletion_claim_v1','account_deletion_claim_authorized_v1',
          'account_deletion_mark_stage_v1','account_deletion_complete_v1','account_deletion_release_v1')))) then
    raise exception 'Deletion installation blocked: pre-existing/default client privileges require review';
  end if;
end $$;
commit;
