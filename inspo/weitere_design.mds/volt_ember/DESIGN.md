---
name: Volt Ember
colors:
  surface: '#111317'
  surface-dim: '#111317'
  surface-bright: '#37393e'
  surface-container-lowest: '#0c0e12'
  surface-container-low: '#1a1c20'
  surface-container: '#1e2024'
  surface-container-high: '#282a2e'
  surface-container-highest: '#333539'
  on-surface: '#e2e2e8'
  on-surface-variant: '#e2bfb2'
  inverse-surface: '#e2e2e8'
  inverse-on-surface: '#2f3035'
  outline: '#a98a7e'
  outline-variant: '#5a4138'
  surface-tint: '#ffb599'
  primary: '#ffb599'
  on-primary: '#5a1c00'
  primary-container: '#f66018'
  on-primary-container: '#4f1700'
  inverse-primary: '#a73a00'
  secondary: '#ffb783'
  on-secondary: '#4f2500'
  secondary-container: '#d97722'
  on-secondary-container: '#451f00'
  tertiary: '#ffb4ab'
  on-tertiary: '#690005'
  tertiary-container: '#ff544a'
  on-tertiary-container: '#5c0004'
  error: '#ffb4ab'
  on-error: '#690005'
  error-container: '#93000a'
  on-error-container: '#ffdad6'
  primary-fixed: '#ffdbce'
  primary-fixed-dim: '#ffb599'
  on-primary-fixed: '#370e00'
  on-primary-fixed-variant: '#7f2b00'
  secondary-fixed: '#ffdcc5'
  secondary-fixed-dim: '#ffb783'
  on-secondary-fixed: '#301400'
  on-secondary-fixed-variant: '#713700'
  tertiary-fixed: '#ffdad6'
  tertiary-fixed-dim: '#ffb4ab'
  on-tertiary-fixed: '#410002'
  on-tertiary-fixed-variant: '#93000b'
  background: '#111317'
  on-background: '#e2e2e8'
  surface-variant: '#333539'
typography:
  display-lg:
    fontFamily: Sora
    fontSize: 3.5rem
    fontWeight: '700'
    lineHeight: 4rem
    letterSpacing: -0.03em
  display-lg-mobile:
    fontFamily: Sora
    fontSize: 2.25rem
    fontWeight: '700'
    lineHeight: 2.75rem
    letterSpacing: -0.02em
  headline-lg:
    fontFamily: Sora
    fontSize: 2rem
    fontWeight: '600'
    lineHeight: 2.5rem
    letterSpacing: -0.02em
  headline-lg-mobile:
    fontFamily: Sora
    fontSize: 1.5rem
    fontWeight: '600'
    lineHeight: 2rem
    letterSpacing: -0.01em
  headline-md:
    fontFamily: Sora
    fontSize: 1.25rem
    fontWeight: '600'
    lineHeight: 1.75rem
    letterSpacing: -0.01em
  body-lg:
    fontFamily: Hanken Grotesk
    fontSize: 1.125rem
    fontWeight: '400'
    lineHeight: 1.75rem
  body-md:
    fontFamily: Hanken Grotesk
    fontSize: 0.875rem
    fontWeight: '400'
    lineHeight: 1.375rem
  metric-val:
    fontFamily: Sora
    fontSize: 2.25rem
    fontWeight: '700'
    lineHeight: 2.5rem
    letterSpacing: -0.02em
  label-md:
    fontFamily: Hanken Grotesk
    fontSize: 0.75rem
    fontWeight: '600'
    lineHeight: 1rem
    letterSpacing: 0.08em
  label-sm:
    fontFamily: Hanken Grotesk
    fontSize: 0.6875rem
    fontWeight: '500'
    lineHeight: 0.875rem
    letterSpacing: 0.05em
rounded:
  sm: 0.25rem
  DEFAULT: 0.5rem
  md: 0.75rem
  lg: 1rem
  xl: 1.5rem
  full: 9999px
spacing:
  gutter: 1rem
  gutter-desktop: 1.5rem
  margin: 1rem
  margin-tablet: 2rem
  margin-desktop: 3rem
  space-xs: 0.25rem
  space-sm: 0.5rem
  space-md: 1rem
  space-lg: 1.5rem
  space-xl: 2.5rem
---

## Brand & Style

This design system establishes an elite, high-performance biometric human performance laboratory aesthetic. The brand communicates unyielding focus, kinetic energy, and rigorous mechanical precision. It speaks to elite athletes, conditioning coaches, and performance engineers who require immediate, high-fidelity physiological insights.

The visual style blends minimalist structural discipline with high-contrast, technical instrumentation. Interfaces prioritize extreme readability against deep carbon substrates, channeling the focus of telemetry monitors and aerospace training rigs. The aesthetic remains modern, utilitarian, and premium—avoiding superficial fitness tropes in favor of structural density, disciplined line work, and tactical energetic accents.

## Colors

The palette operates strictly on dark polarity, engineered for focus and low-glare endurance in intense conditions:

- **Primary (`#EA580C`)**: The core ember hue used for high-impact kinetic calls to action, peak recovery indices, and primary telemetry states.
- **Secondary (`#FB923C`)**: Burnt copper highlight applied to active toggles, sub-metric emphasis, and comparative performance curves.
- **Tertiary (`#DC2626`)**: Critical zone indicator, signaling maximum cardiovascular strain, biological thresholds, and urgent threshold warnings.
- **Neutrals**:
  - `Canvas / Deep Carbon`: `#0B0C0E` establishes absolute depth and high contrast.
  - `Surface Tier 1 (Warm Graphite)`: `#15171B` for baseline card containers.
  - `Surface Tier 2 (Elevated Graphite)`: `#1E2126` for interactive elements and floating modules.
  - `Structural Border`: `#2A2E36` provides razor-sharp separation without visual clutter.
  - `Foreground / Text`: `#F5F3EE` delivers warm, glare-free optical legibility across all data surfaces.

## Typography

Typography balances the geometric authority of `Sora` with the clinical, uncompromised legibility of `Hanken Grotesk`. 

- **Display & Headlines (`Sora`)**: Bold, structural, and direct. Large numeric displays and performance indicators utilize tabular figures (`font-variant-numeric: tabular-nums`) to prevent jitter during live biometric stream refreshes.
- **Body & Instrumentation (`Hanken Grotesk`)**: Rendered with optimal tracking and balanced kerning. High x-height ensures immediate identification under motion and stress.
- **Labels & Microdata**: Rendered primarily in uppercase with intentional letter spacing (`0.05em` to `0.08em`) to mimic instrumentation readouts.

## Layout & Spacing

The layout model is anchored on a rigid 8px baseline spatial grid within an adaptable fluid grid:

- **Desktop (12 Columns)**: 24px (`1.5rem`) gutters with outer margins scaling up to 48px (`3rem`). Standard modules span 3, 4, 6, or 12 columns.
- **Tablet (8 Columns)**: 16px (`1rem`) gutters with 32px (`2rem`) outer margins.
- **Mobile (4 Columns)**: 16px (`1rem`) gutters with 16px (`1rem`) canvas padding.

Information architecture prioritizes scannability. Telemetry dashboards avoid unbounded fluid expansion; maximum content containers are capped at 1440px to retain critical ocular scan efficiency. Spacing between independent cards follows `space-lg`, while internal component padding maintains dense, athletic grouping via `space-sm` and `space-md`.

## Elevation & Depth

Elevation is established via calibrated surface values, precise micro-borders, and targeted kinetic illumination rather than deep, murky shadows:

- **Level 0 (Canvas)**: `#0B0C0E` serves as the structural floor.
- **Level 1 (Structural Containers)**: `#15171B` container backed by a crisp 1px border of `#2A2E36`. No ambient drop shadows are applied; containment is pure and structural.
- **Level 2 (Interactive Modules & Flyouts)**: `#1E2126` backed by a 1px border of `#2A2E36` combined with a tight, ambient dark anchor: `0 8px 24px -4px rgba(0, 0, 0, 0.6)`.
- **Ember Bloom (Active States)**: Interactive active states and focused telemetry inputs project a localized burnt copper optical bleed: `0 0 16px -2px rgba(234, 88, 12, 0.35)`.

## Shapes

The geometric identity is defined by unified 14px athletic cards. Using level `2` roundedness, corner treatments remain disciplined, mechanical, and modern:

- **Base Cards & Modules**: Outer edge radii sit strictly at 14px (`0.875rem` / `rounded-lg` equivalent scale mapped to the 14px archetype).
- **Controls & Buttons**: Standardized at 8px (`0.5rem`) for a compact, durable profile.
- **Tags, Indicators & Numeric Badges**: Maintained at 4px (`0.25rem`) to retain a sharp, technical instrumentation feel.
- **Circular Elements**: Reserved solely for biometric radial gauges, avatars, and hardware sensor connection status dots.

## Components

### Buttons
- **Primary**: Solid ember `#EA580C` background, `#0B0C0E` typography at weight 600 (`Sora`), 8px border radius. Hover introduces subtle brightness shift to `#FB923C` with an ember bloom shadow.
- **Secondary / Outline**: Transparent background, 1px `#2A2E36` border, `#F5F3EE` typography. Hover transitions the border to `#EA580C` and text to `#FB923C`.
- **Tertiary / Effort**: `#DC2626` background for maximum strain, zone termination, or critical resets.

### Cards & Metric Panels
- **Structure**: Surface `#15171B`, 14px corner radius, 1px `#2A2E36` outer edge. Internal padding sits at `1.25rem` (`20px`).
- **Telemetry Display**: Header contains micro-labels in uppercase `Hanken Grotesk` (`#9CA3AF`), primary metrics rendered in large tabular `Sora` (`#F5F3EE`), and delta/trend indicators tagged with directional arrows in burnt copper or effort red.

### Form Inputs & Controls
- **Input Fields**: Background `#0B0C0E`, 1px border `#2A2E36`, 8px corner radius. Placeholder text in `#6B7280`. Focused state triggers a 1px `#EA580C` border with matching ember ambient focus ring.
- **Checkboxes & Radios**: 18px square or circle with 1px `#2A2E36` perimeter. Checked state fills with `#EA580C` displaying a high-contrast `#0B0C0E` checkmark.

### Chips & Badges
- **Zone Chips**: Compact 4px corner radius, `#1E2126` surface, 1px border `#2A2E36`. Label styled in uppercase with letter spacing `0.08em`.
- **Active State**: Inset pill with `#EA580C` indicator dot and high-contrast text.

### Telemetry Bars & Scanners
- **Progress Track**: `#1E2126` flat bar with a 4px radius.
- **Fill Vector**: High-contrast gradient shifting from `#EA580C` to `#FB923C`, switching instantly to `#DC2626` when exceeding maximum physiological thresholds (e.g., anaerobic peak capacity).