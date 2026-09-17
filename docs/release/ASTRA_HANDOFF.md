# ASTRA START HERE

**Stable Commit:** `8f5c4ab` (Base) | Current HEAD  
**Stable Tag:** `v0.1.0-beta.6`  
**Quality Gates:** Typecheck: PASS (0 errors) | Lint: PASS (0 errors) | Tests: 534 PASS | Build: PASS | Coach: PASS  
**Working Tree:** Clean  

---

## Critical path (Astra P0 Architecture)

1. **Secure Storage activation (`AR-013`):**
   - *Status:* PREPARED & TESTED (`secureStorage.ts`).
   - *Astra Action:* Validate hardware Keychain/Keystore on physical iOS & Android devices. Connect adapter as custom storage in `apps/mobile/src/utils/supabase.ts`. Execute zero-logout session migration.
2. **Supabase RLS verification + deployment (`AR-004`, `AR-019`):**
   - *Status:* AUDITED & TEST-HARNESS READY (`docs/schema.sql`, `docs/release/rls_negative_tests.sql`).
   - *Astra Action:* Deploy production policies to Supabase. Execute negative isolation tests against multi-tenant schemas.
3. **Sync integrity architecture (`AR-004`, `AR-019`):**
   - *Status:* LOCAL OUTBOX VERIFIED (`syncStore.ts`, `syncWorker.test.ts`).
   - *Astra Action:* Implement conflict resolution, vector/version clocks, revisions, and server tombstones without destructive data loss.
4. **Account deletion backend RPC (`AR-014`):**
   - *Status:* SPECIFIED & CLIENT-GUARDED (`accountDeletionService.ts`).
   - *Astra Action:* Deploy PostgreSQL `delete_user_account(user_id UUID)` RPC with `SECURITY DEFINER` on Supabase. Remove client safety barrier once live.
5. **Production AI backend (`AR-007`, `AR-018`):**
   - *Status:* HARDENED PROXY & SAFETY MATRIX PASS (`api/coach-safety.cjs`, `api/coach-chat.js`).
   - *Astra Action:* Deploy distributed Redis rate limiting (Upstash), server-side token accounting, and subscription enforcement.
6. **RevenueCat + entitlements (`AR-016`):**
   - *Status:* ABSTRACTION & FALLBACKS READY (`entitlementService.ts`).
   - *Astra Action:* Configure RevenueCat projects, App Store / Play Billing product IDs, install `react-native-purchases`, and bind to client service.

---

## Gemini verified

- **Exercise Dataset Consolidation & ID Stability (`AR-024`):**
  - ExerciseDB (`exerciseGifs.json` & `exercisedb-v1.json`) completely deleted from codebase. Zero commercial hotlinks remain.
  - Free exercise catalog (`free-exercise-db.json`, 873 exercises) active with 100% deterministic UUID v4 keys.
  - Image fallback and error handling hardened (`barbell-outline` fallback on Card, Row, and Detail views).
  - License status documented in `EXERCISE_DATA_PROVENANCE.md` and `EXERCISE_ASSET_INVENTORY.md`.
- **Legacy & Update Regression Suite (`legacyUpdateRegression.test.ts`):**
  - Canonical exercise resolution from past workouts, templates, and programs.
  - Unknown/removed exercise fallback ("Unbekannte Übung" / "Unknown Exercise") without crashes or history corruption.
  - Custom user exercises isolated and intact.
  - Persisted state backward compatibility (missing/removed fields tolerated across Profile, History, Workouts, Settings).
  - Beta 5 -> Beta 6 state reload preserves colorway, RPE/RIR modes, timer intervals, haptics, and audio settings.
- **Workout Edge-Case & Extreme Boundaries Suite (`workoutEdgeCaseRegression.test.ts`):**
  - 0-exercise empty workout guard (returns null, prevents ghost records, cleanly resets to idle).
  - 1-exercise single-set flow.
  - 12 exercises / 60 sets volume stress test with zero corruption.
  - Extreme weights (1250.5 kg) and fine-grained microloading decimal weights (1.25 kg, 17.25 kg).
  - 0 reps handling, boundary RPE (6.0 - 10.0), boundary RIR (0 - 5).
  - Rapid set completion toggle and set deletion sequences.
  - Double finish / save idempotency.
  - Rest timer engine: start, pause, stop, reset (to default 90s), and minimize/restore persistence.
  - App recovery: unfinished workout restored from storage, guest partition isolation.
- **Local Privacy-Safe Diagnostics (`diagnosticsService.ts`, `diagnosticsService.test.ts`):**
  - Ring buffer (max 50 events) with zero PII and zero 3rd-party network calls.
  - Automated regex sanitization strips Bearer tokens, JWTs, Supabase URLs/keys, and user emails.
  - Meta filter blocks sensitive keys: `coachMessage`, `prompt`, `workoutName`, `weightKg`, `bodyFat`, `measurement`.
- **Data Integrity & Export (`dataExportService.ts`):**
  - 10 Data integrity contracts verified.
  - Complete JSON data export covering all stores with zero schema errors.
- **Performance Benchmarks (`largeDatasetPerformance.test.ts`):**
  - 1,000 workouts and 10,000 sets processed in 39 ms.
  - 500 body metrics processed in 2 ms.
  - Fuzzy search across 873 catalog exercises in 5 ms.
- **Store & Native Readiness:**
  - `docs/release/STORE_METADATA_DRAFT.md`: Drafts for Apple App Store and Google Play (zero medical claims, marked as draft).
  - `docs/release/STORE_SCREENSHOT_PLAN.md`: Shot list for 9 core screens.
  - `docs/release/STORE_REVIEW_NOTES_TEMPLATE.md`: Guide for store review teams.
  - `docs/release/PHYSICAL_DEVICE_SMOKE_TEST.md`: 15–25 min manual test package.
  - Native configuration verified (`npx expo config --type public` / `--type introspect` PASS).

---

## Requires physical device

- **Physical Device Smoke Test (`PHYSICAL_DEVICE_SMOKE_TEST.md`):** Complete the 19-step manual checklist on a real iOS and Android device.
- **Hardware Secure Storage:** Validate iOS Keychain and Android Keystore encryption with real biometric / device lock states.
- **Audio & Haptics:** Verify Taptic Engine set completion pulse, silent switch bypass / behavior, and timer completion audio alert.
- **Gesture Performance:** Verify 60/120fps gesture fluidity for Rest Timer swipe-to-dismiss and set row deletion swipe.
- **Keyboard Handling:** Test Gboard, Samsung Keyboard, and iOS Keyboard avoidance with decimal inputs.

---

## Requires Konrad decision/action

1. **Exercise Images Strategy:**
   - *Option A (Default):* Ship with `yuhonas/free-exercise-db` 2-photo step sequence (`0.jpg`/`1.jpg`) backed by automatic fallback.
   - *Option B (Zero Risk):* Activate `modeOverride = 'ANATOMY_FALLBACK'` to use only MIT-licensed SVG figures for Store approval.
2. **EAS Account & Cloud Build Credentials:**
   - Run `npx eas-cli login` on build workstation before initiating cloud preview builds.
   - Link Apple Developer Team ID and Google Play Console credentials.
3. **AI Backend Production Credits:**
   - Deposit production budget on OpenRouter / Groq and set monthly hard limit.
4. **Support & Legal Contact Data:**
   - Provide official support URL and support email to replace `[USER_ACTION_REQUIRED]` in `STORE_REVIEW_NOTES_TEMPLATE.md` and `STORE_METADATA_DRAFT.md`.
