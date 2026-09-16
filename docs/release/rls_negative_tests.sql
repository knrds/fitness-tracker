-- ============================================================================
-- EVARO – RLS Local Negative Test Harness
-- Target: PostgreSQL / Supabase Local (schema from docs/schema.sql)
-- Author: Antigravity (Prepared for Astra Review AR-014)
-- ============================================================================

\set ON_ERROR_STOP off

BEGIN;

-- 1. Create simulated auth users if not present in auth.users
INSERT INTO auth.users (id, email, raw_user_meta_data)
VALUES 
  ('11111111-1111-4111-8111-111111111111', 'user_a@example.com', '{"name":"User A"}'::jsonb),
  ('22222222-2222-4222-8222-222222222222', 'user_b@example.com', '{"name":"User B"}'::jsonb)
ON CONFLICT (id) DO NOTHING;

-- 2. Populate public.users
INSERT INTO public.users (id, email, full_name, plan)
VALUES
  ('11111111-1111-4111-8111-111111111111', 'user_a@example.com', 'User A', 'pro'),
  ('22222222-2222-4222-8222-222222222222', 'user_b@example.com', 'User B', 'free')
ON CONFLICT (id) DO NOTHING;

-- 3. Seed User B Data as Postgres Admin
INSERT INTO public.workout_sessions (id, user_id, name, duration_seconds, volume_kg)
VALUES ('bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbb0001', '22222222-2222-4222-8222-222222222222', 'User B Secret Workout', 3600, 12000)
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.body_metrics (id, user_id, date, weight_kg, body_fat_percentage)
VALUES ('bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbb0002', '22222222-2222-4222-8222-222222222222', '2026-09-01', 82.5, 14.2)
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.exercises (id, name, target_muscle_group, is_custom, owner_id)
VALUES ('bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbb0003', 'User B Secret Exercise', 'Chest', true, '22222222-2222-4222-8222-222222222222')
ON CONFLICT (id) DO NOTHING;

COMMIT;

-- ============================================================================
-- TEST RUN AS: ANONYMOUS
-- ============================================================================
SET ROLE anon;
SET request.jwt.claim.sub = '';

\echo '--- TEST 1: Anonymous cannot read users table ---'
SELECT count(*) AS anon_users_visible FROM public.users;
-- EXPECTED: 0

\echo '--- TEST 2: Anonymous cannot read workout_sessions ---'
SELECT count(*) AS anon_sessions_visible FROM public.workout_sessions;
-- EXPECTED: 0

\echo '--- TEST 3: Anonymous cannot insert workout_sessions ---'
INSERT INTO public.workout_sessions (id, user_id, name) 
VALUES ('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaa9999', '11111111-1111-4111-8111-111111111111', 'Hacked Session');
-- EXPECTED: ERROR: new row violates row-level security policy

-- ============================================================================
-- TEST RUN AS: USER A (UUID 11111111-1111-4111-8111-111111111111)
-- ============================================================================
SET ROLE authenticated;
SET request.jwt.claim.sub = '11111111-1111-4111-8111-111111111111';

\echo '--- TEST 4: User A cannot read User B sessions ---'
SELECT count(*) AS user_b_sessions_seen_by_user_a 
FROM public.workout_sessions 
WHERE id = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbb0001';
-- EXPECTED: 0

\echo '--- TEST 5: User A cannot read User B body metrics ---'
SELECT count(*) AS user_b_metrics_seen_by_user_a 
FROM public.body_metrics 
WHERE user_id = '22222222-2222-4222-8222-222222222222';
-- EXPECTED: 0

\echo '--- TEST 6: User A cannot read User B custom exercises ---'
SELECT count(*) AS user_b_custom_ex_seen_by_user_a 
FROM public.exercises 
WHERE id = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbb0003';
-- EXPECTED: 0

\echo '--- TEST 7: User A cannot UPDATE User B session ---'
UPDATE public.workout_sessions 
SET name = 'User A Tampered This' 
WHERE id = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbb0001';
-- EXPECTED: UPDATE 0 (no rows modified)

\echo '--- TEST 8: User A cannot DELETE User B session ---'
DELETE FROM public.workout_sessions 
WHERE id = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbb0001';
-- EXPECTED: DELETE 0 (no rows deleted)

\echo '--- TEST 9: User A cannot SPOOF user_id during INSERT ---'
INSERT INTO public.workout_sessions (id, user_id, name)
VALUES ('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaa0001', '22222222-2222-4222-8222-222222222222', 'Spoofed Session');
-- EXPECTED: ERROR: new row violates row-level security policy for table "workout_sessions"

\echo '--- TEST 10: User A can successfully INSERT & SELECT their own session ---'
INSERT INTO public.workout_sessions (id, user_id, name)
VALUES ('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaa0002', '11111111-1111-4111-8111-111111111111', 'User A Leg Day');
SELECT name, user_id FROM public.workout_sessions WHERE id = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaa0002';
-- EXPECTED: 1 row ('User A Leg Day', '11111111-1111-4111-8111-111111111111')

RESET ROLE;
