# ASTRA START HERE

**Stable Base Tag:** `v0.1.0-beta.5`  
**Target Safepoint:** `v0.1.0-beta.6` (Recommended after full hardening)  
**Quality Gates:** Typecheck: PASS | Lint: PASS | Tests: 512 PASS | Build: PASS | Coach: PASS  
**Working Tree:** Clean  

---

## P0 – Review/activate first

1. **Secure Storage (`AR-013`):**
   - *Status:* PREPARED.
   - *File:* `apps/mobile/src/utils/secureStorage.ts`
   - *Astra Action:* Test on real physical iOS Keychain and Android Keystore. Then connect adapter as custom storage in `apps/mobile/src/utils/supabase.ts`. Do not activate session migration blindly without physical device validation.

2. **RLS + Sync Integrity (`AR-004`, `AR-019`):**
   - *Status:* VERIFIED locally, pending cloud deployment.
   - *Files:* `docs/schema.sql`, `docs/release/rls_negative_tests.sql`
   - *Astra Action:* Deploy RLS policies to Supabase production and execute negative tenant-isolation tests. Maintain the offline SQLite outbox FIFO architecture.

3. **Account Deletion Backend RPC (`AR-014`):**
   - *Status:* PREPARED on client with safety gate.
   - *File:* `apps/mobile/src/services/accountDeletionService.ts`
   - *Astra Action:* Implement and deploy PostgreSQL RPC `delete_user_account(user_id UUID)` in Supabase to satisfy Apple App Store Guideline 5.1.1(v). Remove the client-side `BACKEND_NOT_CONFIGURED` safety barrier once live.

4. **AI Production Backend (`AR-007`, `AR-018`):**
   - *Status:* PREPARED with full safety layer.
   - *Files:* `api/coach-safety.cjs`, `api/coach-chat.js`, `api/coach-chat.test.cjs`, `api/coach-safety.test.cjs`
   - *Astra Action:* Deploy server endpoint (e.g. Vercel/Cloudflare Workers) with distributed Redis rate limiting (Upstash) and server-side entitlement validation.

5. **RevenueCat / Entitlements (`AR-016`):**
   - *Status:* PREPARED with provider-agnostic abstraction.
   - *File:* `apps/mobile/src/services/entitlementService.ts`
   - *Astra Action:* Configure RevenueCat dashboard, configure Apple App Store In-App Purchases and Google Play Billing products, install `react-native-purchases` and connect SDK to `entitlementService`.

---

## Already verified by Gemini

- **Exercise Dataset Consolidation & ID Stability (`AR-024`):**
  - ExerciseDB (`exerciseGifs.json` & `exercisedb-v1.json`) completely deleted from codebase. Zero commercial hotlinks remain.
  - Free exercise catalog (`free-exercise-db.json`, 873 exercises) active.
  - All 873 Exercise UUIDs remain 100% stable and identical to Beta 1-5 (`exerciseCatalogCompatibility.test.ts`).
  - Strict backward compatibility for legacy persisted objects containing `gifUrl`.
  - Image fallback and error handling hardened (`barbell-outline` fallback on Card, Row, and Detail views).
  - License status honestly documented in `EXERCISE_DATA_PROVENANCE.md` and `EXERCISE_ASSET_INVENTORY.md` (`PARTIAL`: Data Unlicense VERIFIED, Images UNVERIFIED).
- **Core Flow & Regression Suite (`AR-022`):**
  - Complete end-to-end workout, template, history, body metric, and startup recovery testing (`releaseCandidateCoreRegression.test.ts`).
- **Data Integrity & Sync Contracts (`AR-004`, `AR-019`):**
  - 10 Data integrity contracts, SQLite document and normalized databases, multi-device sync conflict resolution.
- **GDPR Art. 20 Data Portability (`AR-015`):**
  - Deterministic JSON export service (`dataExportService.ts`) covering all local stores.
- **Privacy-Safe Diagnostics (`AR-023`):**
  - Local diagnostics service (`diagnosticsService.ts`) with zero PII, zero network transmission.
- **UI & Stability Hardening (`AR-020`):**
  - React ErrorBoundary with graceful recovery.
- **Native Configuration (`AR-001`):**
  - Full EAS and Expo config verified (`npx expo config --type public` / `--type introspect` PASS).

---

## User decisions (Konrad)

1. **Exercise Images Store Strategy:**
   - *Option A (Default):* Ship with `yuhonas/free-exercise-db` 2-photo step sequence (`0.jpg`/`1.jpg`) backed by automatic fallback.
   - *Option B (Zero Risk):* Activate `modeOverride = 'ANATOMY_FALLBACK'` to use only MIT-licensed SVG figures for Store approval.
2. **Support Contact Info:**
   - Provide official support URL and support email for App Store metadata and in-app display.
3. **Store Credentials & EAS Account:**
   - Run `npx eas-cli login` on build workstation before initiating cloud preview builds.

---

## Do not change blindly

- **Domain Model:** Domain package (`@fitness-tracker/domain`) remains 100% React-free and framework-agnostic.
- **Exercise UUIDs:** Deterministic hash generation must never be altered, or existing user workout logs will lose their exercise references.
- **Kilograms / Centimeters:** Metric units remain the canonical internal storage format.
- **Offline First:** Local MMKV and SQLite stores remain authoritative offline; sync queue must never discard entries due to network failures.
- **No Blanket any / ts-ignore:** Maintain strict type safety across all packages.
