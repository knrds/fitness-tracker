-- Portable PostgreSQL foundation. No Supabase/Auth extension, public RPC,
-- policy seed, production activation, or claim of monetary cost accounting.
-- Apply once to a reviewed database; all policies require explicit enrollment.
begin;

do $$ declare v_role text; begin
  foreach v_role in array array['evaro_coach_owner','evaro_coach_server'] loop
  if not exists (select 1 from pg_catalog.pg_roles where rolname = v_role) then
    execute pg_catalog.format('create role %I nologin noinherit nosuperuser nobypassrls nocreatedb nocreaterole noreplication',v_role);
  elsif exists (select 1 from pg_catalog.pg_roles where rolname = v_role
               and (rolcanlogin or rolsuper or rolbypassrls or rolcreatedb or rolcreaterole or rolreplication)) then
    raise exception 'Unsafe existing coach role; review before applying';
  end if;
  -- Both inherited authority and existing recipients widen the new function
  -- grants. Provision trusted backend membership separately after install/review.
  if exists (select 1 from pg_catalog.pg_auth_members
             where member = (select oid from pg_catalog.pg_roles where rolname=v_role)
                or roleid = (select oid from pg_catalog.pg_roles where rolname=v_role)) then
    raise exception 'Existing coach role has unsafe memberships; review before applying';
  end if;
  end loop;
end $$;
-- One-time install only. Never adopt an unknown pre-existing private schema.
create schema evaro_private authorization evaro_coach_owner;
revoke all on schema evaro_private from public;

create table evaro_private.coach_quota_policies (
  policy_id text not null,
  modality text not null check (modality in ('text', 'image', 'audio')),
  enabled boolean not null default false,
  user_daily_units integer not null check (user_daily_units between 2 and 100000),
  global_daily_units integer not null check (global_daily_units between 2 and 1000000),
  primary key (policy_id, modality)
);
create table evaro_private.coach_quota_principals (
  principal text not null,
  policy_id text not null,
  enabled boolean not null default false,
  primary key (principal, policy_id)
);
create table evaro_private.coach_quota_reservations (
  id uuid primary key default pg_catalog.gen_random_uuid(),
  principal text not null,
  request_key uuid not null,
  request_hash text not null check (request_hash ~ '^[0-9a-f]{64}$'),
  lease_id uuid not null,
  policy_id text not null,
  modality text not null,
  period date not null,
  reserved_units integer not null check (reserved_units = 2),
  attempt_count integer not null default 0 check (attempt_count between 0 and 2),
  charged_units integer not null default 0 check (charged_units between 0 and 2),
  status text not null default 'reserved' check (status in ('reserved', 'finalized')),
  outcome text check (outcome in ('success', 'failed', 'expired')),
  expires_at timestamptz not null,
  created_at timestamptz not null default pg_catalog.clock_timestamp(),
  unique (principal, request_key),
  foreign key (policy_id, modality) references evaro_private.coach_quota_policies
);
create index coach_quota_period_idx on evaro_private.coach_quota_reservations (policy_id, modality, period);
create index coach_quota_user_period_idx on evaro_private.coach_quota_reservations (principal, policy_id, modality, period);
alter table evaro_private.coach_quota_policies enable row level security;
alter table evaro_private.coach_quota_principals enable row level security;
alter table evaro_private.coach_quota_reservations enable row level security;
revoke all on all tables in schema evaro_private from public, evaro_coach_server;

-- Only a trusted backend may provide a principal. Browser/native roles must
-- never receive EXECUTE or role membership. Definer ownership is reviewed on install.
create function evaro_private.coach_quota_reserve_v1(
  p_principal text, p_request_key uuid, p_request_hash text, p_lease_id uuid,
  p_modality text, p_policy_id text, p_reserved_units integer, p_lease_seconds integer
) returns jsonb language plpgsql security definer set search_path = '' set lock_timeout = '2s' as $$
declare
  v_now timestamptz := pg_catalog.clock_timestamp();
  v_period date := (v_now at time zone 'UTC')::date;
  v_policy evaro_private.coach_quota_policies%rowtype;
  v_row evaro_private.coach_quota_reservations%rowtype;
  v_global bigint;
  v_user bigint;
begin
  if pg_catalog.current_setting('transaction_isolation') <> 'read committed' then
    raise exception using errcode='22023',message='Quota requires READ COMMITTED';
  end if;
  if p_principal is null or p_principal !~ '^(account|beta|loopback):[A-Za-z0-9_-]{1,128}$'
     or p_request_key is null or p_lease_id is null
     or p_request_hash is null or p_request_hash !~ '^[0-9a-f]{64}$'
     or p_modality is null or p_modality not in ('text','image','audio')
     or p_policy_id is distinct from 'coach-beta-v1'
     or p_reserved_units is distinct from 2 or p_lease_seconds is distinct from 120 then
    raise exception using errcode = '22023', message = 'Invalid quota request';
  end if;
  -- Request identity first, then global period: consistent lock order for all operations.
  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended('evaro-quota-request:' || p_principal || ':' || p_request_key, 0));
  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended('evaro-quota-period:' || p_policy_id || ':' || p_modality || ':' || v_period, 0));
  select * into v_policy from evaro_private.coach_quota_policies
    where policy_id = p_policy_id and modality = p_modality;
  if not found or not v_policy.enabled or not exists (
    select 1 from evaro_private.coach_quota_principals
      where principal = p_principal and policy_id = p_policy_id and enabled
  ) then
    return pg_catalog.jsonb_build_object('version',1,'status','denied','reason','access_denied','retry_after_seconds',0);
  end if;
  -- TTL may refund only a reservation with no persisted dispatch. Unknown spend
  -- after a dispatch is charged conservatively at the complete reserved envelope.
  update evaro_private.coach_quota_reservations
    set status = 'finalized', outcome = 'expired',
        charged_units = case when attempt_count = 0 then 0 else reserved_units end
    where policy_id = p_policy_id and modality = p_modality and period = v_period
      and status = 'reserved' and expires_at <= v_now;
  select * into v_row from evaro_private.coach_quota_reservations
    where principal = p_principal and request_key = p_request_key for update;
  if found then
    if v_row.request_hash <> p_request_hash or v_row.modality <> p_modality or v_row.policy_id <> p_policy_id then
      return pg_catalog.jsonb_build_object('version',1,'status','conflict');
    end if;
    if v_row.status = 'finalized' then
      return pg_catalog.jsonb_build_object('version',1,'status','completed');
    end if;
    if v_row.expires_at <= v_now then
      return pg_catalog.jsonb_build_object('version',1,'status','expired');
    end if;
    if v_row.lease_id <> p_lease_id then
      return pg_catalog.jsonb_build_object('version',1,'status','in_progress');
    end if;
  else
    select coalesce(sum(case when status = 'reserved' then reserved_units else charged_units end),0),
           coalesce(sum(case when principal = p_principal then
             case when status = 'reserved' then reserved_units else charged_units end else 0 end),0)
      into v_global,v_user from evaro_private.coach_quota_reservations
      where policy_id = p_policy_id and modality = p_modality and period = v_period;
    if v_global + p_reserved_units > v_policy.global_daily_units then
      return pg_catalog.jsonb_build_object('version',1,'status','denied','reason','global_limit','retry_after_seconds',60);
    end if;
    if v_user + p_reserved_units > v_policy.user_daily_units then
      return pg_catalog.jsonb_build_object('version',1,'status','denied','reason','user_limit','retry_after_seconds',60);
    end if;
    insert into evaro_private.coach_quota_reservations
      (principal,request_key,request_hash,lease_id,policy_id,modality,period,reserved_units,expires_at)
      values (p_principal,p_request_key,p_request_hash,p_lease_id,p_policy_id,p_modality,v_period,2,v_now + interval '120 seconds')
      returning * into v_row;
  end if;
  return pg_catalog.jsonb_build_object('version',1,'status','reserved','reservation_id',v_row.id,
    'principal',v_row.principal,'request_key',v_row.request_key,'request_hash',v_row.request_hash,
    'lease_id',v_row.lease_id,'modality',v_row.modality,'reserved_units',v_row.reserved_units,
    'expires_at',pg_catalog.to_char(v_row.expires_at at time zone 'UTC','YYYY-MM-DD"T"HH24:MI:SS.MS"Z"'));
end $$;

create function evaro_private.coach_quota_begin_attempt_v1(
  p_reservation_id uuid, p_lease_id uuid, p_attempt integer
) returns jsonb language plpgsql security definer set search_path = '' set lock_timeout = '2s' as $$
declare v_row evaro_private.coach_quota_reservations%rowtype;
begin
  if pg_catalog.current_setting('transaction_isolation') <> 'read committed' then
    raise exception using errcode='22023',message='Quota requires READ COMMITTED';
  end if;
  if p_reservation_id is null or p_lease_id is null or p_attempt is null or p_attempt not in (1,2) then
    raise exception using errcode = '22023', message = 'Invalid quota dispatch';
  end if;
  select * into v_row from evaro_private.coach_quota_reservations where id = p_reservation_id;
  if not found then return pg_catalog.jsonb_build_object('version',1,'status','conflict'); end if;
  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended('evaro-quota-request:' || v_row.principal || ':' || v_row.request_key,0));
  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended('evaro-quota-period:' || v_row.policy_id || ':' || v_row.modality || ':' || v_row.period,0));
  select * into v_row from evaro_private.coach_quota_reservations where id = p_reservation_id for update;
  if v_row.lease_id <> p_lease_id then return pg_catalog.jsonb_build_object('version',1,'status','conflict'); end if;
  if v_row.status <> 'reserved' then return pg_catalog.jsonb_build_object('version',1,'status','completed'); end if;
  if v_row.expires_at <= pg_catalog.clock_timestamp() then
    update evaro_private.coach_quota_reservations set status='finalized',outcome='expired',
      charged_units=case when attempt_count=0 then 0 else reserved_units end where id=v_row.id;
    return pg_catalog.jsonb_build_object('version',1,'status','expired');
  end if;
  if not exists (select 1 from evaro_private.coach_quota_policies where policy_id=v_row.policy_id and modality=v_row.modality and enabled)
     or not exists (select 1 from evaro_private.coach_quota_principals where principal=v_row.principal and policy_id=v_row.policy_id and enabled) then
    return pg_catalog.jsonb_build_object('version',1,'status','denied','reason','access_denied','retry_after_seconds',0);
  end if;
  if p_attempt <= v_row.attempt_count then
    return pg_catalog.jsonb_build_object('version',1,'status','already_started','reservation_id',v_row.id,'lease_id',v_row.lease_id,'attempt',p_attempt);
  end if;
  if p_attempt <> v_row.attempt_count+1 then return pg_catalog.jsonb_build_object('version',1,'status','conflict'); end if;
  update evaro_private.coach_quota_reservations set attempt_count=p_attempt where id=v_row.id;
  return pg_catalog.jsonb_build_object('version',1,'status','started','reservation_id',v_row.id,'lease_id',v_row.lease_id,'attempt',p_attempt);
end $$;

create function evaro_private.coach_quota_finalize_v1(
  p_reservation_id uuid, p_lease_id uuid, p_outcome text
) returns jsonb language plpgsql security definer set search_path = '' set lock_timeout = '2s' as $$
declare v_row evaro_private.coach_quota_reservations%rowtype;
begin
  if pg_catalog.current_setting('transaction_isolation') <> 'read committed' then
    raise exception using errcode='22023',message='Quota requires READ COMMITTED';
  end if;
  if p_reservation_id is null or p_lease_id is null or p_outcome is null or p_outcome not in ('success','failed') then
    raise exception using errcode = '22023', message = 'Invalid quota completion';
  end if;
  select * into v_row from evaro_private.coach_quota_reservations where id = p_reservation_id;
  if not found then return pg_catalog.jsonb_build_object('version',1,'status','conflict'); end if;
  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended('evaro-quota-request:' || v_row.principal || ':' || v_row.request_key,0));
  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended('evaro-quota-period:' || v_row.policy_id || ':' || v_row.modality || ':' || v_row.period,0));
  select * into v_row from evaro_private.coach_quota_reservations where id = p_reservation_id for update;
  if v_row.lease_id <> p_lease_id then return pg_catalog.jsonb_build_object('version',1,'status','conflict'); end if;
  if v_row.status = 'reserved' then
    update evaro_private.coach_quota_reservations set status='finalized',
      outcome=case when expires_at<=pg_catalog.clock_timestamp() then 'expired' else p_outcome end,
      charged_units=case when expires_at<=pg_catalog.clock_timestamp() and attempt_count>0 then reserved_units else attempt_count end
      where id=v_row.id returning * into v_row;
  end if;
  return pg_catalog.jsonb_build_object('version',1,'status','finalized','reservation_id',v_row.id,
    'lease_id',v_row.lease_id,'charged_units',v_row.charged_units);
end $$;

-- Definers run as the dedicated private owner, never an installing superuser.
do $$ declare v_object record; begin
  for v_object in select c.oid::pg_catalog.regclass as identity from pg_catalog.pg_class c
    where c.relnamespace='evaro_private'::pg_catalog.regnamespace and c.relkind='r' loop
    execute pg_catalog.format('alter table %s owner to evaro_coach_owner',v_object.identity);
  end loop;
  for v_object in select p.oid::pg_catalog.regprocedure as identity from pg_catalog.pg_proc p
    where p.pronamespace='evaro_private'::pg_catalog.regnamespace loop
    execute pg_catalog.format('alter function %s owner to evaro_coach_owner',v_object.identity);
  end loop;
end $$;
revoke all on function evaro_private.coach_quota_reserve_v1(text,uuid,text,uuid,text,text,integer,integer) from public;
revoke all on function evaro_private.coach_quota_begin_attempt_v1(uuid,uuid,integer) from public;
revoke all on function evaro_private.coach_quota_finalize_v1(uuid,uuid,text) from public;
grant usage on schema evaro_private to evaro_coach_server;
grant execute on function evaro_private.coach_quota_reserve_v1(text,uuid,text,uuid,text,text,integer,integer) to evaro_coach_server;
grant execute on function evaro_private.coach_quota_begin_attempt_v1(uuid,uuid,integer) to evaro_coach_server;
grant execute on function evaro_private.coach_quota_finalize_v1(uuid,uuid,text) to evaro_coach_server;
-- Refuse inherited/default client grants rather than silently widening a
-- pre-existing database's trust boundary. Failure rolls this installation back.
do $$ declare v_server oid; begin
  select oid into v_server from pg_catalog.pg_roles where rolname='evaro_coach_server';
  if exists(select 1 from pg_catalog.pg_namespace n cross join lateral pg_catalog.aclexplode(coalesce(n.nspacl,pg_catalog.acldefault('n',n.nspowner))) a
    where n.nspname='evaro_private' and (a.grantee not in (n.nspowner,v_server) or (a.grantee=v_server and a.privilege_type<>'USAGE')))
    or exists(select 1 from pg_catalog.pg_proc p join pg_catalog.pg_namespace n on n.oid=p.pronamespace cross join lateral pg_catalog.aclexplode(coalesce(p.proacl,pg_catalog.acldefault('f',p.proowner))) a
    where n.nspname='evaro_private' and p.proname like 'coach_quota_%' and a.grantee not in (p.proowner,v_server))
    or exists(select 1 from pg_catalog.pg_class c join pg_catalog.pg_namespace n on n.oid=c.relnamespace cross join lateral pg_catalog.aclexplode(coalesce(c.relacl,pg_catalog.acldefault('r',c.relowner))) a
    where n.nspname='evaro_private' and c.relname like 'coach_quota_%' and a.grantee<>c.relowner) then
    raise exception 'Quota installation blocked: pre-existing/default client privileges require review';
  end if;
end $$;
commit;
