# EVARO – Entitlement & In-App Subscription Architecture Spec

**Document Version:** 1.0.0  
**Date:** 2026-09-16  
**Status:** SPECIFICATION / ARCHITECTURAL BLUEPRINT  
**Target Infrastructure:** RevenueCat SDK (`react-native-purchases`), Apple StoreKit 2, Google Play Billing, Supabase PostgreSQL, Vercel Serverless  
**Astra Review ID:** AR-008  

---

## 1. Architectural Overview & Design Strategy

EVARO uses **RevenueCat** as the central abstraction layer over Apple StoreKit 2 (iOS) and Google Play Billing Library (Android). This decouples native receipt validation, family sharing, grace periods, and store sandbox environments from client code.

```
┌─────────────────────────────────────────────────────────────┐
│                      Mobile App Client                       │
│  [useSubscription Hook] ──► [Purchases SDK (RevenueCat)]   │
│            ▲                              │                 │
│            │                              ▼                 │
│     Zustand Cache            Native StoreKit 2 / Google     │
└────────────┼──────────────────────────────┬─────────────────┘
             │                              │
             │ (Sync JWT)                   ▼ (Receipts)
             │                     ┌──────────────────────────┐
             │                     │    RevenueCat Backend    │
             │                     └────────────┬─────────────┘
             ▼                                  │
┌──────────────────────────┐                    │ (Server Webhook)
│  Supabase Cloud Database │                    ▼
│  Table `subscriptions`   │◄─────────── [Webhook Endpoint]
│  Table `users.is_pro`    │        (HMAC Signature Verified)
└──────────────────────────┘
             ▲
             │ (Direct SQL check)
┌────────────┴─────────────┐
│  AI Coach Backend Proxy  │
│    `api/coach-chat.js`   │
└──────────────────────────┘
```

---

## 2. Customer ID & User Identity Mapping

### 2.1 Identity Hierarchy:
1. **Authenticated User:**
   - When a user is logged in via Supabase Auth, their `auth.users.id` (UUIDv4) is passed directly to RevenueCat as the App User ID:
     ```typescript
     await Purchases.logIn(supabaseUser.id);
     ```
   - This binds all historical and future transactions on Apple/Google to this exact Supabase UUID.
2. **Anonymous / Guest User:**
   - If the user uses EVARO without an account (Guest Mode), RevenueCat automatically generates an anonymous ID (`$RCAnonymousID:...`).
   - When the user later signs up or logs in:
     ```typescript
     const { customerInfo } = await Purchases.logIn(newSupabaseUserId);
     ```
     RevenueCat **aliases** the anonymous purchase to the authenticated Supabase user ID, transferring their subscription seamlessly without requiring a manual restore.
3. **Account Switch (Logout & New User):**
   - On logout (`supabase.auth.signOut()`):
     ```typescript
     await Purchases.logOut();
     ```
   - This detaches the device from the user ID and prevents the next logged-in user from inheriting the previous user's cached entitlements.

---

## 3. Server-Side Entitlement & Webhook Architecture

To guarantee financial safety and prevent client spoofing, the AI Coach proxy (`api/coach-chat.js`) validates subscriptions against the server database, never trusting client state.

### 3.1 Supabase Schema (`public.subscriptions` & `public.users`)
```sql
-- Migration: docs/migrations/20260922_subscriptions_3tier_schema.sql
CREATE TABLE IF NOT EXISTS public.subscriptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  tier text NOT NULL CHECK (tier IN ('free', 'pro', 'coach')),
  status text NOT NULL CHECK (status IN ('active', 'trialing', 'past_due', 'canceled', 'expired')),
  product_id text NOT NULL, -- 'evaro_pro_monthly', 'evaro_pro_annual', 'evaro_coach_monthly', 'evaro_coach_annual'
  store text NOT NULL CHECK (store IN ('app_store', 'play_store', 'stripe', 'promotional')),
  current_period_start timestamptz NOT NULL,
  current_period_end timestamptz NOT NULL,
  cancel_at_period_end boolean DEFAULT false,
  original_transaction_id text UNIQUE,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Index for instant lookup by user
CREATE INDEX IF NOT EXISTS idx_subscriptions_user_status 
ON public.subscriptions (user_id, status);

-- Denormalized fast-tier on public.users
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS tier text DEFAULT 'free' CHECK (tier IN ('free', 'pro', 'coach'));
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS is_pro boolean DEFAULT false;
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS is_coach boolean DEFAULT false;
```

### 3.2 RevenueCat Webhook Handler (`api/webhooks/revenuecat.js`)
RevenueCat sends server-to-server POST events for every subscription lifecycle change.
Events to handle:
- `INITIAL_PURCHASE`: User purchased subscription -> Determine tier (`coach` if product is Coach, else `pro`), set `status = 'active'`, `tier = ...`, `is_pro = true`, `is_coach = (tier === 'coach')`.
- `RENEWAL`: Auto-renew successful -> Extend `current_period_end`.
- `CANCELLATION`: User cancelled auto-renew in iOS/Android settings -> Keep active tier until `current_period_end`, set `cancel_at_period_end = true`.
- `EXPIRATION`: Billing period ended without renewal -> Set `status = 'expired'`, `tier = 'free'`, `is_pro = false`, `is_coach = false`.
- `BILLING_ISSUE`: Credit card failed -> Set `status = 'past_due'`. If store offers billing grace period (Apple allows up to 16 days), keep active tier during grace.

**Webhook Security:**
Verify the `Authorization: Bearer <REVENUECAT_WEBHOOK_AUTH_TOKEN>` header before processing any payload.

---

## 4. Client-Side Lifecycle Flows

### 4.1 Restore Purchases ("Käufe wiederherstellen")
Apple App Store Review Guidelines (Guideline 3.1.1) strictly require a visible, functioning "Restore Purchases" button on every paywall.
Flow:
```typescript
const handleRestorePurchases = async () => {
  setIsLoading(true);
  try {
    const customerInfo = await Purchases.restorePurchases();
    if (customerInfo.entitlements.active['evaro_pro']) {
      Alert.alert('Erfolg', 'Dein Abonnement wurde erfolgreich wiederhergestellt.');
      useProfileStore.getState().updateProfile({ isPro: true });
    } else {
      Alert.alert('Keine Käufe gefunden', 'Für diese Apple-ID/Google-Konto wurde kein aktives Abo gefunden.');
    }
  } catch (error) {
    Alert.alert('Fehler', 'Wiederherstellung fehlgeschlagen: ' + error.message);
  } finally {
    setIsLoading(false);
  }
};
```

### 4.2 Offline Grace Period
- The mobile client caches `CustomerInfo` in MMKV/local cache.
- During workouts in shielded gyms (no cell reception), the client verifies the cached entitlement.
- The client grants access as long as `customerInfo.latestExpirationDate` is in the future, plus a **72-hour network grace cushion**.
- No user is locked out mid-workout due to a spotty connection.

### 4.3 Free Trial Handling
- Products configured in App Store Connect with introductory free trials (e.g. 7-day free trial).
- RevenueCat reflects this as `periodType: 'TRIAL'` in `customerInfo.entitlements.active['evaro_pro']`.
- UI displays: *"7 Tage kostenlos testen, danach 9,99 € / Monat. Jederzeit kündbar."*
- Webhook handles `INITIAL_PURCHASE` with `trialing` status; transitions to `active` upon first paid renewal.

---

## 5. Security & Anti-Fraud Mitigations

1. **Receipt Forgery:** All receipts validated by RevenueCat's direct cryptographic connection to Apple StoreKit / Google Play servers. No client-side receipt decoding.
2. **Account Hopping:** If two users log into the same physical iPhone with different EVARO accounts, Apple's StoreKit receipt belongs to one Apple ID. RevenueCat's transfer policy (`TRANSFER_TO_NEW_USER` or `RESTRICT_TRANSFERS`) determines behavior. **Recommendation for EVARO:** Set transfer policy to `RESTRICT_TRANSFERS` to prevent credential sharing across multiple accounts.
3. **Serverless AI Gate:** `api/coach-chat.js` queries `SELECT is_pro FROM public.users WHERE id = auth.uid()`. If `false`, rejects the request with HTTP 403 before contacting OpenRouter.

---

## 6. Implementation Checklist for Astra

- [ ] Install `react-native-purchases` in `apps/mobile`.
- [ ] Configure `Purchases.configure({ apiKey: Platform.select({ ios: 'appl_...', android: 'goog_...' }) })` in `app/_layout.tsx`.
- [ ] Create RevenueCat project and set up Apple App Store Shared Secret and Google Service Account Key.
- [ ] Create Supabase migration `20260916_subscriptions_schema.sql`.
- [ ] Implement Vercel serverless webhook `api/webhooks/revenuecat.js` with shared secret verification.
- [ ] Connect `api/coach-chat.js` to verify `is_pro` before executing OpenRouter requests.
- [ ] Build Dark-Mode/Neon Paywall Modal with Restore Purchases button and Terms/Privacy links.
