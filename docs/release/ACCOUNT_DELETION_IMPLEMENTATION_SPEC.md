# EVARO – Account Deletion Implementation Spec

**Document Version:** 1.0.0  
**Date:** 2026-09-16  
**Status:** SPECIFICATION / PREPARED FOR ASTRA REVIEW  
**Requirement Reference:** Apple App Store Guideline 5.1.1(v), Google Play Data Safety, DSGVO Art. 17 ("Recht auf Vergessenwerden")  
**Astra Review ID:** AR-006  

---

## 1. Executive Summary & Objective

Apple Guideline 5.1.1(v) requires apps that offer account creation to allow users to initiate deletion of their account from within the app. The deletion must permanently delete all personal data and cloud records associated with the account, or de-identify them in strict accordance with local laws.

EVARO currently provides a client-side data reset (`clearAllData()`), which clears local SQLite records and resets Zustand stores to defaults. However, **cloud-side account deletion via Supabase Auth and PostgreSQL cascade is not yet connected to the client UI**.

This document specifies the exact architecture, database RPC, client flow, confirmation UX, partial failure mitigation, and edge case handling required for Astra to implement production account deletion without data leaks, orphaned records, or lock-in loops.

---

## 2. Complete Inventory of User Data Targets

All user-associated data must be purged across all five architectural storage tiers:

### Tier 1: Supabase Cloud Database (`public` schema)
When `auth.users` row is deleted, foreign keys handle downstream cascades:
- `public.users` (`id = auth.uid()`): User profile, unit preferences, max lifts.
- `public.workout_sessions` (`user_id`): Historical workout sessions.
- `public.session_exercises` (via `session_id` cascade): Session exercises.
- `public.exercise_sets` (via `session_exercise_id` cascade): Individual sets, reps, weights, RPE/RIR.
- `public.workout_templates` (`user_id`): User-created templates.
- `public.template_exercises` (via `template_id` cascade): Exercises within templates.
- `public.programs` (`user_id`): User-created training programs.
- `public.program_workouts` (via `program_id` cascade): Workouts scheduled in programs.
- `public.personal_records` (`user_id`): Tracked PRs (1RM, volume, rep maxes).
- `public.body_metrics` (`user_id`): Body weight, body fat %, circumferences.
- `public.exercises` (`owner_id = auth.uid()`, `is_custom = true`): Custom exercises created by the user.

> [!CAUTION]
> **Foreign Key Restriction Blocker in `docs/schema.sql`**:
> In `docs/schema.sql:125`, `template_exercises.exercise_id` references `exercises(id)` with `ON DELETE RESTRICT`. If a user created a custom exercise (`public.exercises`) and added it to a custom template (`template_exercises`), deleting `public.exercises` first triggers a foreign key constraint violation!
> **Required Server Order:** The RPC must delete `workout_templates` (which cascades to `template_exercises`) *before* deleting custom `exercises`.

### Tier 2: Supabase Storage Buckets
- Bucket `avatars`: User avatars stored under path `avatars/${userId}/*`.
- Cloud cascade in Postgres does **not** automatically delete storage objects in S3/Supabase Storage.
- Objects must be deleted via Storage Admin API or a Postgres storage trigger (`DELETE FROM storage.objects WHERE bucket_id = 'avatars' AND name LIKE auth.uid() || '/%';`).

### Tier 3: Supabase Authentication (`auth.users`)
- The user's record in `auth.users` (email, phone, encrypted password, metadata, identities, refresh tokens).
- Must be deleted using Supabase Admin API with service role or a `SECURITY DEFINER` Postgres function. Regular users cannot delete rows in `auth.users` via client anon/authenticated keys.

### Tier 4: Local Device SQLite Database (`training.sqlite`)
- Table `state_documents`: Key-value JSON documents partitioned by user ID (`partition = userId`). Contains cached stores (`profile-storage`, `history-storage`, `program-storage`, `body-metric-storage`, `exercise-storage`, `volt-coach-store`, `workout-storage`, etc.).
- Table `workout_sessions`, `session_exercises`, `exercise_sets`: Normalized relational cache.
- Table `sync_operations`: Outbox queue of pending changes.
- Table `normalization_backups` & `legacy_imports`: Migration backups.

### Tier 5: Local Key-Value Storage (MMKV) & Filesystem
- `supabase-auth-storage`: Supabase JWT session and refresh tokens.
- File system: Locally saved avatar image (`profileImageUri` pointing to `FileSystem.documentDirectory`).
- Temporary coach voice recordings in cache directory (`FileSystem.cacheDirectory`).

---

## 3. Server-Side Deletion Architecture

### 3.1 Recommended Approach: PostgreSQL RPC (`SECURITY DEFINER`)
Instead of deploying a separate serverless function with Service Role credentials, Supabase allows executing a secure stored procedure callable by authenticated users:

```sql
-- Migration: docs/migrations/20260916_account_deletion_rpc.sql
CREATE OR REPLACE FUNCTION public.delete_user_account()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth, storage
AS $$
DECLARE
  v_user_id uuid := auth.uid();
BEGIN
  -- 1. Verify caller is authenticated
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  -- 2. Delete storage objects (avatars)
  DELETE FROM storage.objects
  WHERE bucket_id = 'avatars'
    AND (name = v_user_id::text OR name LIKE v_user_id::text || '/%');

  -- 3. Delete dependent templates before custom exercises to avoid ON DELETE RESTRICT conflicts
  DELETE FROM public.workout_templates WHERE user_id = v_user_id;
  DELETE FROM public.programs WHERE user_id = v_user_id;

  -- 4. Delete custom exercises owned by user
  DELETE FROM public.exercises WHERE owner_id = v_user_id AND is_custom = true;

  -- 5. Delete public.users record (cascades to workout_sessions, personal_records, body_metrics)
  DELETE FROM public.users WHERE id = v_user_id;

  -- 6. Delete from auth.users (permanently invalidates JWTs and refresh tokens)
  DELETE FROM auth.users WHERE id = v_user_id;
END;
$$;

-- Grant execution only to authenticated users
REVOKE ALL ON FUNCTION public.delete_user_account() FROM public;
GRANT EXECUTE ON FUNCTION public.delete_user_account() TO authenticated;
```

### 3.2 Security Properties of the RPC
1. **Self-Execution Only:** Uses `auth.uid()`, preventing any user from deleting another user's account.
2. **Atomicity:** Wrapped in a single Postgres transaction. If any step fails, all deletions roll back cleanly.
3. **No Service Key Exposure:** The mobile client does not need the Supabase service role key.

---

## 4. Client-Side Orchestration Flow

```
[User taps "Account löschen" in Settings]
               │
               ▼
[Step 1: Check Active Subscription]
   ├─ Active StoreKit/Play subscription found?
   │     └─ Show Alert: "Dein Apple/Google-Abo wird durch die Account-Löschung
   │                     NICHT automatisch gekündigt. Bitte zuerst im Store kündigen."
   │                     [Link to Store Subscriptions] [Trotzdem fortfahren]
   │
   ▼
[Step 2: Check Network Connectivity]
   ├─ Offline?
   │     └─ Block deletion: "Account-Löschung erfordert eine Internetverbindung."
   │
   ▼
[Step 3: Two-Stage Confirmation Modal]
   ├─ Stage 1: Explains irreversible loss of all workouts, metrics, coach history.
   ├─ Stage 2: Requires typing "LÖSCHEN" (DE) or "DELETE" (EN) into an input field.
   │
   ▼
[Step 4: Cancel Sync Queue]
   └─ Immediately clear and freeze `syncStore` to prevent in-flight updates during delete.
   │
   ▼
[Step 5: Call Server RPC]
   └─ `await supabase.rpc('delete_user_account')`
   │
   ├─ SUCCESS:
   │     ├─ 5a. Call `profileStore.getState().clearAllData()` (wipes SQLite & Zustand)
   │     ├─ 5b. Purge local avatar file from FileSystem
   │     ├─ 5c. Call `supabase.auth.signOut()`
   │     ├─ 5d. Clear MMKV `supabase-auth-storage`
   │     └─ 5e. Reset navigation stack to Welcome / Auth Screen
   │
   └─ FAILURE:
         ├─ Handle 401/Invalid Token: Session expired -> prompt re-login.
         ├─ Handle 500/Network Error:
         │     └─ Display: "Konnte Cloud-Daten nicht löschen. Lokale Daten wurden erhalten.
         │                  Bitte prüfe deine Verbindung oder kontaktiere support@evaro.app."
         └─ Do NOT wipe local data if server delete fails!
```

---

## 5. Failure Recovery & Edge Cases

| Scenario | Risk | Mitigation Strategy |
|---|---|---|
| **Network dropped during RPC** | Server deleted data, but client received timeout | On subsequent reconnect or app launch, `supabase.auth.getSession()` fails with user not found. Client catches this and triggers local `clearAllData()`. |
| **Server RPC fails (HTTP 500)** | Cloud data intact, but client might wipe local data | **Strict ordering rule:** Never execute local wipe (`clearAllData()`) until the server RPC returns HTTP 200/Success. |
| **Guest / Offline user (Never logged in)** | No `auth.uid()` exists | If `user.isGuest` or unauthenticated, bypass cloud RPC and execute local `clearAllData()` only. Prompt clearly indicates "Lokale Gast-Daten zurücksetzen". |
| **Active Subscriptions** | User deletes account but continues to be billed by Apple/Google | Apple Guideline requirement: UI must provide deep link to `https://apps.apple.com/account/subscriptions` before final confirmation. |
| **Pending Outbox Queue** | Pending sync requests overwrite deleted account if fired concurrently | `useSyncStore.getState().clearQueue()` and set an `isDecommissioning = true` barrier before sending RPC. |
| **Re-login with same email** | New account created with clean slate | Supabase treats subsequent signup with same email as completely new user ID (`uuid`). No legacy data resurrection. |

---

## 6. Confirmation UX Specification

1. **Entry Point:** Settings Screen (`app/profile.tsx` or `app/settings.tsx`), under Danger Zone section.
2. **Button Label:** "Account & Daten dauerhaft löschen" (Red text / Destructive style).
3. **Confirmation Dialog 1:**
   - Title: "Account endgültig löschen?"
   - Body: "Alle deine Trainings, Messwerte, Pläne und Chatverläufe werden unwiderruflich von deinem Gerät und unseren Servern gelöscht. Diese Aktion kann nicht rückgängig gemacht werden."
   - Buttons: `[Abbrechen]` (Cancel) / `[Weiter]` (Destructive).
4. **Confirmation Dialog 2 (Security Phrase):**
   - Modal with text input: "Tippe zur Bestätigung LÖSCHEN ein:"
   - Confirm button disabled until text strictly matches "LÖSCHEN" (case-sensitive or uppercase-normalized).
5. **Progress State:**
   - Spinner overlay: "Account wird gelöscht..." (Touch disabled).

---

## 7. Testing Strategy for Astra

1. **Unit Tests (RPC Mock):**
   - Client catches and handles server RPC errors gracefully without wiping local data.
   - Client freezes sync queue during decommissioning.
   - Local stores, SQLite partitions, and MMKV tokens are wiped post-success.
2. **Staging Integration Test:**
   - Create test user `test-delete-user@evaro.internal`.
   - Seed workouts, custom exercises, custom templates, avatar image, and coach messages.
   - Execute `delete_user_account()`.
   - Verify `SELECT count(*) FROM auth.users WHERE email = 'test-delete-user@evaro.internal'` returns 0.
   - Verify `SELECT count(*) FROM public.workout_sessions WHERE user_id = ...` returns 0.
   - Verify avatar file in `storage.objects` is deleted.
   - Attempt login with deleted credentials -> Expect `Invalid login credentials`.
3. **App Store Review Checklist:**
   - Verify deletion button is easily discoverable without navigating through complex submenus.
   - Verify subscription guidance notice is visible to subscribers.
