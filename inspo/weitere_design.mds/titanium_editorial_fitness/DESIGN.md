---
name: Titanium Editorial Fitness
colors:
  surface: '#131315'
  surface-dim: '#131315'
  surface-bright: '#39393b'
  surface-container-lowest: '#0e0e10'
  surface-container-low: '#1c1b1d'
  surface-container: '#201f21'
  surface-container-high: '#2a2a2c'
  surface-container-highest: '#353437'
  on-surface: '#e5e1e4'
  on-surface-variant: '#d0c5b5'
  inverse-surface: '#e5e1e4'
  inverse-on-surface: '#313032'
  outline: '#998f81'
  outline-variant: '#4d463a'
  surface-tint: '#e2c384'
  primary: '#ffe3ae'
  on-primary: '#402d00'
  primary-container: '#e6c687'
  on-primary-container: '#68511e'
  inverse-primary: '#735b27'
  secondary: '#c8c5cc'
  on-secondary: '#303035'
  secondary-container: '#47464c'
  on-secondary-container: '#b6b4bb'
  tertiary: '#e6e5eb'
  on-tertiary: '#2f3034'
  tertiary-container: '#cac9ce'
  on-tertiary-container: '#545459'
  error: '#ffb4ab'
  on-error: '#690005'
  error-container: '#93000a'
  on-error-container: '#ffdad6'
  primary-fixed: '#ffdfa0'
  primary-fixed-dim: '#e2c384'
  on-primary-fixed: '#261a00'
  on-primary-fixed-variant: '#594311'
  secondary-fixed: '#e4e1e8'
  secondary-fixed-dim: '#c8c5cc'
  on-secondary-fixed: '#1b1b20'
  on-secondary-fixed-variant: '#47464c'
  tertiary-fixed: '#e3e2e7'
  tertiary-fixed-dim: '#c6c6cb'
  on-tertiary-fixed: '#1a1b1f'
  on-tertiary-fixed-variant: '#46464b'
  background: '#131315'
  on-background: '#e5e1e4'
  surface-variant: '#353437'
typography:
  display-lg:
    fontFamily: Manrope
    fontSize: 44px
    fontWeight: '600'
    lineHeight: 52px
    letterSpacing: -0.03em
  display-lg-mobile:
    fontFamily: Manrope
    fontSize: 36px
    fontWeight: '600'
    lineHeight: 44px
    letterSpacing: -0.025em
  headline-xl:
    fontFamily: Manrope
    fontSize: 32px
    fontWeight: '600'
    lineHeight: 40px
    letterSpacing: -0.02em
  headline-lg:
    fontFamily: Manrope
    fontSize: 26px
    fontWeight: '600'
    lineHeight: 34px
    letterSpacing: -0.015em
  headline-md:
    fontFamily: Manrope
    fontSize: 20px
    fontWeight: '500'
    lineHeight: 28px
    letterSpacing: -0.01em
  headline-sm:
    fontFamily: Manrope
    fontSize: 18px
    fontWeight: '500'
    lineHeight: 24px
    letterSpacing: -0.005em
  body-xl:
    fontFamily: Inter
    fontSize: 17px
    fontWeight: '400'
    lineHeight: 26px
    letterSpacing: -0.01em
  body-lg:
    fontFamily: Inter
    fontSize: 15px
    fontWeight: '400'
    lineHeight: 22px
    letterSpacing: -0.005em
  body-md:
    fontFamily: Inter
    fontSize: 14px
    fontWeight: '400'
    lineHeight: 20px
    letterSpacing: 0em
  label-lg:
    fontFamily: Inter
    fontSize: 13px
    fontWeight: '500'
    lineHeight: 18px
    letterSpacing: 0.02em
  label-md:
    fontFamily: Inter
    fontSize: 11px
    fontWeight: '600'
    lineHeight: 16px
    letterSpacing: 0.06em
  label-sm:
    fontFamily: Inter
    fontSize: 10px
    fontWeight: '600'
    lineHeight: 14px
    letterSpacing: 0.08em
rounded:
  sm: 0.5rem
  DEFAULT: 1rem
  md: 1.5rem
  lg: 2rem
  xl: 3rem
  full: 9999px
spacing:
  gutter: 1rem
  gutter-mobile: 0.75rem
  margin: 1.5rem
  margin-mobile: 1.25rem
  space-xxs: 0.25rem
  space-xs: 0.5rem
  space-sm: 0.75rem
  space-md: 1rem
  space-lg: 1.5rem
  space-xl: 2rem
  space-2xl: 3rem
  space-3xl: 4rem
---

## Brand & Style

This design system embodies the intersection of disciplined physical performance and quiet, architectural luxury. Designed specifically for an iOS-first environment, it replaces the aggressive, neon-saturated tropes of traditional fitness trackers with an editorial, gallery-grade atmosphere. The aesthetic evokes the sensory weight of brushed titanium, matte obsidian obsidian stones, and soft champagne luminescence.

The target audience consists of discerning athletes, executives, and high-performance practitioners who view physical conditioning as an art form rather than a frantic game of gamified metrics. The experience intentionally cultivates poise, clarity, and composed focus. Visual noise is eliminated to make every metric, workout log, and recovery insight feel substantial and deliberate.

### Design Movement & Influence
- **Architectural Minimalism:** Expansive, intentional negative space creates breathing room around high-density telemetry data.
- **Native iOS Human Interface Guidelines (HIG):** Uncompromising structural precision, fluid interactive depth, subtle tactile feedback, and continuous progressive disclosure.
- **Material Restraint:** Matte charcoal foundations with warm metallic accents that behave like physically brushed hardware materials rather than flat digital colors.

## Colors

The chromatic architecture relies strictly on tonal depth, avoiding stark synthetic contrasts in favor of low-stress, warm undertones. 

### Color Hierarchy
- **Canvas Base (`#0A0A0C`):** Deep warm charcoal that serves as the infinite ambient backdrop, eliminating true harsh blacks to ease eye strain during early-morning or late-evening sessions.
- **Titanium Surface Tiers:**
  - `Surface 01 / Raised` (`#151518`): The primary structural canvas for cards, inset containers, and modal sheets.
  - `Surface 02 / Elevated` (`#1E1E22`): Elevated interaction modules, active chips, and highlighted table cells.
  - `Surface 03 / Subtle Border` (`#26262B`): Low-contrast hairline dividers and structural bounds.
- **Warm Champagne Gold (`#E6C687`):** The primary focal accent. Reserved strictly for key milestones, primary interactive triggers, active timeline heads, and critical performance indicators. Never deployed as large background washes; used like precious metal inlay.
- **Warm Typographic Spectrum:**
  - `Primary Text` (`#F4F4F6`): Pure warm off-white delivering pristine legibility without chromatic glare.
  - `Secondary Text` (`#A1A1A8`): Muted cool charcoal for context, units, and secondary labels.
  - `Tertiary Text` (`#636369`): Deep titanium for disabled states, structural timestamps, and subtle hints.
- **Functional Semantics:**
  - `Success / Recovery` (`#98C379`): Desaturated sage green.
  - `Warning / Strain` (`#E5C07B`): Burnished amber.
  - `Critical / Max Effort` (`#E06C75`): Muted crimson.

## Typography

The typographic hierarchy harmonizes the structural geometry of `Manrope` with the utilitarian readability of `Inter`. 

### Editorial Rules
- **Numerical Telemetry:** Whenever metrics, weights, reps, or heart rate data are displayed, use `Manrope` with tabular figures enabled (`font-variant-numeric: tabular-nums`). This prevents baseline jittering during dynamic updates.
- **Optical Kerning & Tracking:** Display sizes use tight negative tracking (`-0.02em` to `-0.03em`) to mimic custom editorial mastheads. Small uppercase labels (`label-md`, `label-sm`) require generous positive tracking (`0.06em` to `0.08em`) to guarantee legible parsing at a brief glance mid-workout.
- **Hierarchy Stacking:** Pair large numeric readouts directly above understated uppercase secondary labels (e.g., a `36px` Manrope volume total paired with an `11px` Inter uppercase category caption).

## Layout & Spacing

The layout model is constructed around an iOS-first fluid architecture that honors safe margins and creates calm, rhythmic pacing.

### Layout Philosophy
- **Breathing Room:** Standard views must leave generous vertical margin above card groups (`space-2xl`), letting typography announce content before cards present data.
- **Safe Area Insets:** The canvas automatically conforms to native iOS safe areas, expanding content edge-to-edge behind translucent navigation elements while preserving a strict `1.25rem` (`20px`) lateral content margin on mobile.
- **Content Blocks:** Single-column stacked cards dominate mobile screen real estate. On larger viewports (iPad/Desktop), content forms an asymmetric 2-column or 3-column dashboard using a fluid grid with a `1rem` gutter, reserving the wider column for workout telemetry and the narrower column for recovery logs.

## Elevation & Depth

Visual hierarchy relies on physical material stratification rather than heavy artificial drop shadows. Surfaces build upward from the canvas using tonal separation, hairline rim lighting, and backdrop blurs.

### Surface Stratification
- **Level 0 (Canvas):** `#0A0A0C` — The infinite depth foundation.
- **Level 1 (Panels & Squircles):** `#151518` — Resting cards and group containers. Outlined by a soft, semi-transparent hairline stroke (`1px solid rgba(255, 255, 255, 0.06)`).
- **Level 2 (Active Elements & Modals):** `#1E1E22` — Floating sheets, expanded drawers, and active metric cards. Features an ambient glow: `box-shadow: 0 12px 32px -8px rgba(0, 0, 0, 0.6), 0 0 0 1px rgba(230, 198, 135, 0.12)`.
- **Level 3 (Overlays & Navigation Chrome):** Native iOS frosted glass effect. Surfaces utilize `rgba(15, 15, 18, 0.75)` with a `24px` backdrop blur (`backdrop-filter: blur(24px) saturate(180%)`) paired with a bottom or top hairline border of `rgba(255, 255, 255, 0.08)`.

### Rim Highlights
To evoke machined titanium, elevated containers receive a micro-highlight along their top edge: a delicate linear gradient border running from `rgba(255, 255, 255, 0.14)` at the top center, fading to `rgba(255, 255, 255, 0.02)` at the lower edges.

## Shapes

The geometric signature is grounded in continuous curvature squircles (`border-corner-shape: squircle` or high-value pill radii), matching Apple hardware standards. 

### Corner Geometry
- **Primary Containers & Large Cards:** Sized with a soft `20px` to `24px` radius (`rounded-lg` / `rounded-xl`), creating organic, pebble-like surfaces that feel smooth to touch.
- **Interactive Controls (Buttons, Inputs, Chips):** Fully pill-shaped (`9999px` / `rounded-full`) or strict `16px` curvature depending on layout density.
- **Nested Proportionality:** When nesting elements within cards, internal items use radii that subtract outer padding (`R_inner = R_outer - Padding`) to maintain concentric harmony.

## Components

### Buttons
- **Primary (Champagne Pill):** Solid `#E6C687` background with `#0A0A0C` text at `label-lg` weight. Inactive states transition with smooth haptic feedback; hover/pressed states slightly compress (`transform: scale(0.98)`) and deepen to `#D4B473`.
- **Secondary (Titanium Shell):** Surface `#151518` with a `1px` border of `rgba(255, 255, 255, 0.08)` and `#F4F4F6` text. Pressing introduces an inner highlight.
- **Ghost:** Transparent background, `#A1A1A8` text, transitioning to `#E6C687` text on interaction with zero layout shift.

### Chips & Filter Pills
- Rendered at `32px` total height with full rounded pill profiles.
- Unselected: Dark surface `#151518` with `#A1A1A8` typography.
- Selected: `#26262B` surface accented with a `1px` champagne border (`rgba(230, 198, 135, 0.4)`) and warm white text with a preceding gold micro-dot indicator (`4px`).

### Cards & Telemetry Containers
- Enclosed within `24px` soft rounded containers.
- Padded with `space-lg` (`1.5rem`) internal breathing space.
- Header consists of an understated `label-md` category indicator in tertiary gray, followed by dominant numeric telemetry in Manrope.
- Progressive disclosure: Detailed exercise sets or biometrics remain collapsed behind smooth height tweens with disclosure chevrons tinting gold upon expansion.

### Lists & Form Controls
- **List Rows:** Separated not by full-width dividing lines, but by `1px` recessed hairline rules inset by `space-lg` from the leading edge, preserving the visual container boundary.
- **Input Fields:** Recessed `#111113` background, `16px` corner radius, `48px` minimum touch target height. Caret and active border transition cleanly to `#E6C687`.
- **Checkboxes & Radios:** Circular indicators; selected state displays a filled champagne ring with a centered obsidian dot.

### Specialized Telemetry Displays
- **Recovery Rings:** Clean geometric strokes with background tracks in `#1E1E22` and active segments rendered in `#E6C687` with rounded caps.
- **Set & Rep Trackers:** Clean row architecture with monospace-like numeric clarity, providing immediate completion acknowledgment via subtle border lighting rather than loud full-screen modals.