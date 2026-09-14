---
name: Avionics Brutalism
colors:
  surface: '#131313'
  surface-dim: '#131313'
  surface-bright: '#3a3939'
  surface-container-lowest: '#0e0e0e'
  surface-container-low: '#1c1b1b'
  surface-container: '#201f1f'
  surface-container-high: '#2a2a2a'
  surface-container-highest: '#353534'
  on-surface: '#e5e2e1'
  on-surface-variant: '#c5c8b7'
  inverse-surface: '#e5e2e1'
  inverse-on-surface: '#313030'
  outline: '#8f9282'
  outline-variant: '#44483b'
  surface-tint: '#b3d17a'
  primary: '#ffffff'
  on-primary: '#243600'
  primary-container: '#ceee93'
  on-primary-container: '#536d22'
  inverse-primary: '#4d661c'
  secondary: '#c6c5cf'
  on-secondary: '#2f3038'
  secondary-container: '#4a4b53'
  on-secondary-container: '#bcbbc5'
  tertiary: '#ffffff'
  on-tertiary: '#303033'
  tertiary-container: '#e4e1e5'
  on-tertiary-container: '#656467'
  error: '#ffb4ab'
  on-error: '#690005'
  error-container: '#93000a'
  on-error-container: '#ffdad6'
  primary-fixed: '#ceee93'
  primary-fixed-dim: '#b3d17a'
  on-primary-fixed: '#131f00'
  on-primary-fixed-variant: '#364e03'
  secondary-fixed: '#e3e1ec'
  secondary-fixed-dim: '#c6c5cf'
  on-secondary-fixed: '#1a1b22'
  on-secondary-fixed-variant: '#46464e'
  tertiary-fixed: '#e4e1e5'
  tertiary-fixed-dim: '#c8c6c9'
  on-tertiary-fixed: '#1b1b1e'
  on-tertiary-fixed-variant: '#47464a'
  background: '#131313'
  on-background: '#e5e2e1'
  surface-variant: '#353534'
typography:
  headline-xl:
    fontFamily: Space Mono
    fontSize: 48px
    fontWeight: '700'
    lineHeight: 52px
    letterSpacing: -0.04em
  headline-xl-mobile:
    fontFamily: Space Mono
    fontSize: 32px
    fontWeight: '700'
    lineHeight: 36px
    letterSpacing: -0.03em
  headline-lg:
    fontFamily: Space Mono
    fontSize: 32px
    fontWeight: '700'
    lineHeight: 36px
    letterSpacing: -0.02em
  headline-lg-mobile:
    fontFamily: Space Mono
    fontSize: 24px
    fontWeight: '700'
    lineHeight: 28px
    letterSpacing: -0.02em
  headline-md:
    fontFamily: Space Mono
    fontSize: 20px
    fontWeight: '700'
    lineHeight: 24px
    letterSpacing: 0em
  headline-sm:
    fontFamily: Space Mono
    fontSize: 16px
    fontWeight: '700'
    lineHeight: 20px
    letterSpacing: 0.02em
  body-lg:
    fontFamily: JetBrains Mono
    fontSize: 16px
    fontWeight: '400'
    lineHeight: 24px
    letterSpacing: 0em
  body-md:
    fontFamily: JetBrains Mono
    fontSize: 14px
    fontWeight: '400'
    lineHeight: 20px
    letterSpacing: 0.01em
  body-sm:
    fontFamily: JetBrains Mono
    fontSize: 12px
    fontWeight: '400'
    lineHeight: 16px
    letterSpacing: 0.02em
  label-md:
    fontFamily: JetBrains Mono
    fontSize: 11px
    fontWeight: '600'
    lineHeight: 14px
    letterSpacing: 0.1em
  label-sm:
    fontFamily: JetBrains Mono
    fontSize: 10px
    fontWeight: '700'
    lineHeight: 12px
    letterSpacing: 0.15em
spacing:
  gutter: 1rem
  gutter-mobile: 0.5rem
  margin: 1.5rem
  margin-mobile: 0.75rem
  space-xs: 0.25rem
  space-sm: 0.5rem
  space-md: 1rem
  space-lg: 1.5rem
  space-xl: 2.5rem
---

## Brand & Style

This design system embodies raw avionics-grade monospaced brutalism driven by caustic high-voltage luminescence and unforgiving hard-edged instrumentation. Built for extreme-performance telemetry, real-time diagnostic consoles, and mission-critical controls, the visual presentation rejects decorative softening in favor of uncompromised structural clarity.

The aesthetic fuses industrial command-deck ergonomics with brutalist data density:
- **Tone:** Severe, hyper-precise, mechanical, relentless.
- **Visual Weight:** Ultra-flat, high-contrast dark chassis illuminated by sharp, caustic phosphors.
- **Philosophy:** Everything operates as an instrument; every boundary is structural, absolute, and zero-radiused.

## Colors

The palette is tuned to simulate high-voltage phosphors burning through a vacuum-chamber substrate.

- **Primary (`#D9F99D`):** Caustic electric lime-voltage. Reserved for active execution states, high-priority readouts, terminal focus indicators, and mission-critical toggles.
- **Secondary (`#71717A`):** Cold technical zinc. Used for structural indices, passive data labels, and inactive hardware bus indicators.
- **Tertiary (`#27272A`):** Precision machine border gray. Defines rigid container perimeters, structural divisions, and cell dividers.
- **Neutral / Canvas (`#0A0A0A`):** Matte industrial void black base canvas.
- **Surface Matrix (`#141414`):** Monolithic graphite surface for instrument housings and chassis modules.
- **Text Standard (`#F4F4F5`):** High-emission terminal white for raw values and primary alphanumeric telemetry.

## Typography

Typography is exclusively dual-monospaced to enforce strict grid alignment and tabular scanability.

- **Headlines (`Space Mono`):** Geometric, harsh, and industrial. Sets section titles, major numerical telemetry readouts, and module identifiers. All headlines default to uppercase with tightened tracking.
- **Body & Instrumentation (`JetBrains Mono`):** High-legibility technical monospace with unambiguous character glyphs (e.g., slashed zero, distinct 1-l-I).
- **Labels & Micro-data:** Rendered in small-caps or full uppercase with expanded letter-spacing (`0.1em` to `0.15em`) to simulate stamped metal serial plates and digital avionic readouts.

## Layout & Spacing

The layout is built on a dense, modular engineering grid:
- **Structure:** 12-column rigid fluid grid for desktop (`>= 1024px`), 8-column for tablet (`768px - 1023px`), and 4-column compact for mobile (`< 768px`).
- **Alignment:** Zero dead-space layout philosophy. Containers sit flush against one another sharing single-pixel borders (`#27272A`) rather than floating with ambient negative space.
- **Rhythm:** Multiples of `4px` (`0.25rem`). Component heights are locked strictly to fixed industrial steps: `24px`, `32px`, `40px`, and `48px`.

## Elevation & Depth

This system avoids realistic shadows, soft drop-shadows, and blur-based depth. Depth is achieved exclusively through hard mechanical layering and luminance contrasts:

1. **Layer 0 (Void Canvas):** `#0A0A0A` matte backing.
2. **Layer 1 (Modular Chassis):** `#141414` flat surface with a continuous 1px `#27272A` outline.
3. **Layer 2 (Recessed Readouts & Wells):** Inset `#0A0A0A` panels framed with 1px `#27272A` borders.
4. **Active Elevation (Luminescent Overdrive):** Hover and active states do not lift along the Z-axis. Instead, they trigger 1px solid caustic highlights (`#D9F99D`) and hard high-voltage inner edge glows (`box-shadow: inset 0 0 0 1px #D9F99D`).

## Shapes

The roundedness across the entire system is strictly `0` (Zero). 

There are no rounded corners, pill shapes, or organic curves. Every element—buttons, text fields, cards, badges, and modals—terminates in razor-sharp 90-degree corners. Angular cutaways (45-degree chamfers measuring `4px` or `8px` via CSS clip-path) are permitted solely on primary control triggers and active module header tabs to reinforce hardware instrumentation aesthetics.

## Components

### Buttons & Actuators
- **Primary:** Background `#D9F99D`, text `#0A0A0A`, font `Space Mono`, weight 700, uppercase, 0px border-radius. Active state renders inverse: background `#0A0A0A`, text `#D9F99D`, 1px outline `#D9F99D`.
- **Secondary / Tactical:** Background `#141414`, border 1px solid `#27272A`, text `#F4F4F5`. Hover replaces border with `#71717A`.
- **Destructive:** Background transparent, border 1px solid `#EF4444`, text `#EF4444`. Hover fills with `#EF4444`, text `#0A0A0A`.

### Inputs & Terminal Fields
- **Container:** Rectangular, background `#0A0A0A`, border 1px solid `#27272A`, height 40px, padding `0 12px`.
- **Focus:** 1px solid `#D9F99D` border with high-visibility rectangular blinking cursor block.
- **Prefix Labels:** Integrated static brackets (e.g., `SYS://`, `IN_>`) rendered in `#71717A` `JetBrains Mono`.

### Cards & Chassis Panels
- **Container:** Background `#141414`, border 1px solid `#27272A`, zero border-radius.
- **Header Plate:** Separated by a 1px solid `#27272A` horizontal line, styled with small-caps `Space Mono` labeling, serial codes, and hardware status indicator pips (`4x4px` square).

### Selection (Checkboxes & Radios)
- **Checkbox:** `14x14px` square, border 1px solid `#71717A`, background `#0A0A0A`. Checked state displays a solid `#D9F99D` centered `8x8px` square.
- **Radio / Channel Select:** `14x14px` square with diagonal crosshair ticks when selected. No circular forms are permitted.

### Chips & Telemetry Badges
- **Style:** Compact rectangular tags, padding `2px 6px`, border 1px solid `#27272A`, background `#0A0A0A`.
- **Active State:** Border `#D9F99D`, text `#D9F99D`.

### Data Grids & Instrumentation Tables
- Dense monospaced tabular rows separated by 1px solid `#1A1A1A` horizontal rules. Hover states highlight the entire row with `#141414` background and a `#D9F99D` 2px left border strip.