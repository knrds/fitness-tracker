# EVARO – Exercise Asset Replacement & Licensing Plan

**Document Version:** 1.0.0  
**Date:** 2026-09-16  
**Status:** SPECIFICATION / ACTION PLAN PREPARED  
**Notice:** Commercial usage rights for external ExerciseDB / free-exercise-db assets could not be verified from repository evidence. This plan prepares full, seamless decoupling from external unverified URLs before App Store launch.  
**Astra Review ID:** AR-009  

---

## 1. Current Asset Inventory & Evidence Baseline

| Asset Category | Location in Codebase | Source / Provider | Total Items | Verified Commercial License? | Risk Classification |
|---|---|---|---:|---|---|
| **Remote GIFs** | `packages/domain/src/data/raw/exerciseGifs.json` | `https://static.exercisedb.dev/media/...` | 1,492 URLs (345 mapped) | **NO** (No invoice, API agreement, or license in repo) | **HIGH (Copyright & Hotlink Outage Risk)** |
| **Remote JPGs** | `packages/domain/src/data/mapExercises.ts:240` | `https://raw.githubusercontent.com/yuhonas/free-exercise-db/...` | Dynamic | **NO** (Hotlinking raw GitHub repository) | **HIGH (Reliability & IP Risk)** |
| **Catalog JSON** | `packages/domain/src/data/raw/exercisedb.json` | ExerciseDB / Free Exercise DB format | 873 exercises | **NO** (No license metadata header in JSON) | **MEDIUM (Catalog schema is clean domain)** |
| **Anatomy Figures** | `apps/mobile/src/components/anatomy/` | ELABBASSI Hicham | 2 figures (Front/Back SVG) | **YES** (MIT License documented in `LICENSE`) | **LOW (Clear)** |
| **Rank Icons** | `apps/mobile/assets/ranks/rank-01.png` - `10.png` | Higgsfield AI | 10 PNGs (~15 MB total) | **PENDING** (AI generator terms need Konrad confirmation) | **MEDIUM (Bundle size & Terms)** |
| **App Icons & Splash** | `apps/mobile/assets/icon.png`, `splash-icon.png` | EVARO Custom Design | 4 PNGs | **YES** (Proprietary proprietary branding) | **LOW (Clear)** |

---

## 2. Screens Consuming Exercise Media

The application displays exercise imagery in exactly four user-facing surfaces:

1. **Exercise Card in Lists (`apps/mobile/src/components/exercises/ExerciseCard.tsx:28`):**
   - Renders 64×64 thumbnail in exercise search and library lists.
   - Evaluates: `const previewUri = exercise.gifUrl || exercise.imageUrl;`
2. **Exercise Detail Screen (`apps/mobile/app/exercise/[id].tsx:144`):**
   - Main header hero area (aspect ratio 16:10).
   - Renders full animated GIF or alternates between frame 0 and frame 1 JPGs.
   - Includes fullscreen modal viewer (`fullscreen` state).
3. **Active Workout Session Card (`apps/mobile/src/components/workout/SessionExerciseCard.tsx`):**
   - Small thumbnail icon alongside exercise title.
4. **Template Builder & Program Builder (`app/programs/template-builder.tsx`):**
   - Thumbnail preview during exercise selection.

---

## 3. Current Behavior Without GIFs / Fallback UI Audit

Both primary consumers (`ExerciseCard` and `[id].tsx`) **already have graceful fallback UI implemented in the codebase**:

```tsx
// apps/mobile/src/components/exercises/ExerciseCard.tsx:48
{previewUri ? (
  <View style={styles.imageContainer}>
    <Image source={{ uri: previewUri }} style={styles.image} contentFit="contain" />
  </View>
) : (
  <View style={styles.placeholderContainer}>
    <Ionicons name="barbell-outline" size={24} color={theme.colors.muted} />
  </View>
)}
```

```tsx
// apps/mobile/app/exercise/[id].tsx:176
{exercise.imageUrl ? (
  <Pressable ...><Image source={getDisplayedImageUri()} /></Pressable>
) : (
  <View style={styles.imagePlaceholder}>
    <Ionicons name="barbell-outline" size={44} color={theme.colors.muted} />
    <Text style={styles.placeholderText}>No Exercise Image Available</Text>
  </View>
)}
```

### Key Finding:
**The app does not crash or break if `gifUrl` and `imageUrl` are omitted or set to `null`**. The workout tracking, set logging, timers, rest calculators, search filters, and anatomy highlights remain 100% operational.

---

## 4. Replacement Options & Evaluation

| Option | Description | Legal Safety | Cost | User Experience | Implementation Effort |
|---|---|---|---|---|---|
| **Option A: Official ExerciseDB Commercial Subscription** | Subscribe to commercial RapidAPI / ExerciseDB plan. Host media on private AWS CloudFront / Supabase Storage bucket with legitimate CDN. | **100% Compliant** | ~$29–$99/month | High (Retains existing 3D animations) | Low (Only replace base URL in `exerciseGifs.json`) |
| **Option B: Anatomy Muscle Highlight Fallback (Zero External Media)** | Remove all external hotlinks. In place of remote images, render the existing MIT-licensed `AnatomyFigure` dynamically highlighting the primary muscles for that exercise. | **100% Compliant** | $0 (Free) | Clean, premium, minimalist aesthetic (similar to Whoop/Apple Fitness) | Low (Swap image container with `<AnatomyFigure highlightedMuscles={exercise.primaryMuscles} />`) |
| **Option C: CC0 / Public Domain Asset Migration (Wger / OpenGym)** | Integrate open-source exercise images from Wger (CC-BY-SA 4.0 or CC0) or self-hosted vector line drawings. | **100% Compliant** | $0 (Self-hosted) | Good static illustrations | Medium (Re-mapping 800+ exercise IDs) |
| **Option D: Custom 3D Asset Batch Generation** | Commission or generate 150 standard compound/isolation 3D animations in consistent EVARO dark/neon style. | **100% Compliant** | High upfront / AI compute | Maximum brand differentiation | High (Post-V1 roadmap) |

---

## 5. Recommended 2-Stage Migration Plan for Astra

### Stage 1: Pre-Launch Zero-Risk Switch (Option B Fallback)
1. In `packages/domain/src/data/mapExercises.ts`:
   - Set default `gifUrl: undefined` and `imageUrl: undefined` unless a local asset exists or commercial license flag is enabled.
2. In `apps/mobile/src/components/exercises/ExerciseCard.tsx` and `app/exercise/[id].tsx`:
   - Replace the generic `barbell-outline` placeholder with a compact SVG anatomy preview highlighting the target muscles (`exercise.primaryMuscles`).
   - This eliminates all external hotlinking risks immediately, prevents App Store copyright rejections, reduces app network traffic to 0 KB for exercise lists, and delivers a sleek, dark-mode medical aesthetic.

### Stage 2: Commercial Asset Hosting (Option A)
1. Once Konrad / management signs commercial license with ExerciseDB or asset vendor:
   - Download the 345 required animation assets.
   - Host in an owned Cloudflare R2 or Supabase Storage bucket (`https://assets.evaro.app/exercises/...`).
   - Point domain mapper to verified owned endpoints.

---

## 6. Action Items & Decisions Required

- [ ] **Astra Decision:** Approve Stage 1 (Anatomy Vector Fallback) as the default safe baseline for the first App Store submission.
- [ ] **User Action (Konrad):** Confirm whether an existing commercial agreement/invoice exists for ExerciseDB or if Option B (Anatomy Figures) should be active for launch.
- [ ] **Asset Cleanup:** Remove inactive `packages/domain/src/data/raw/exercisedb-v1.json` (1.4 MB) from repository bundle.
