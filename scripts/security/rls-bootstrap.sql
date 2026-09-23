\set ON_ERROR_STOP on
-- Isolated PostgreSQL SQL/RLS harness only. Not a GoTrue/PostgREST emulator.
do $$ begin
  if current_database() !~ '^evaro_[a-z0-9_]+_rls_test$' then
    raise exception 'Refusing bootstrap outside an explicitly named EVARO RLS test database';
  end if;
  if exists (select 1 from pg_namespace where nspname = 'auth') then
    raise exception 'Bootstrap requires a fresh test database, not an existing auth schema';
  end if;
end $$;
create schema auth;
create table auth.users (id uuid primary key);
-- Same claim-to-UUID boundary used by policies. JWT verification is NOT tested here.
create function auth.uid() returns uuid language sql stable as $$
  select coalesce(
    nullif(current_setting('request.jwt.claim.sub', true), ''),
    nullif(current_setting('request.jwt.claims', true), '')::jsonb ->> 'sub'
  )::uuid
$$;
do $$ begin
  if not exists (select 1 from pg_roles where rolname = 'authenticated') then
    create role authenticated nologin nosuperuser nobypassrls;
  end if;
  if not exists (select 1 from pg_roles where rolname = 'anon') then
    create role anon nologin nosuperuser nobypassrls;
  end if;
end $$;
grant usage on schema auth, public to authenticated, anon;
grant execute on function auth.uid() to authenticated, anon;
-- Deliberately broad table privileges exercise RLS, not a permission-denied shortcut.
alter default privileges in schema public grant select, insert, update, delete on tables to authenticated, anon;
