---
name: Arctic Performance Lab
colors:
  surface: '#faf8ff'
  surface-dim: '#d2d9f4'
  surface-bright: '#faf8ff'
  surface-container-lowest: '#ffffff'
  surface-container-low: '#f2f3ff'
  surface-container: '#eaedff'
  surface-container-high: '#e2e7ff'
  surface-container-highest: '#dae2fd'
  on-surface: '#131b2e'
  on-surface-variant: '#3f4850'
  inverse-surface: '#283044'
  inverse-on-surface: '#eef0ff'
  outline: '#707881'
  outline-variant: '#bfc7d2'
  surface-tint: '#006398'
  primary: '#006194'
  on-primary: '#ffffff'
  primary-container: '#007bb9'
  on-primary-container: '#fdfcff'
  inverse-primary: '#93ccff'
  secondary: '#1d4ed8'
  on-secondary: '#ffffff'
  secondary-container: '#4069f2'
  on-secondary-container: '#fffbff'
  tertiary: '#894d00'
  on-tertiary: '#ffffff'
  tertiary-container: '#ac6200'
  on-tertiary-container: '#fffbff'
  error: '#ba1a1a'
  on-error: '#ffffff'
  error-container: '#ffdad6'
  on-error-container: '#93000a'
  primary-fixed: '#cce5ff'
  primary-fixed-dim: '#93ccff'
  on-primary-fixed: '#001d31'
  on-primary-fixed-variant: '#004b73'
  secondary-fixed: '#dce1ff'
  secondary-fixed-dim: '#b7c4ff'
  on-secondary-fixed: '#001551'
  on-secondary-fixed-variant: '#0039b5'
  tertiary-fixed: '#ffdcc0'
  tertiary-fixed-dim: '#ffb875'
  on-tertiary-fixed: '#2d1600'
  on-tertiary-fixed-variant: '#6b3b00'
  background: '#faf8ff'
  on-background: '#131b2e'
  surface-variant: '#dae2fd'
typography:
  display-hero:
    fontFamily: Manrope
    fontSize: 56px
    fontWeight: '700'
    lineHeight: 64px
    letterSpacing: -0.03em
  display-hero-mobile:
    fontFamily: Manrope
    fontSize: 38px
    fontWeight: '700'
    lineHeight: 44px
    letterSpacing: -0.02em
  headline-xl:
    fontFamily: Manrope
    fontSize: 36px
    fontWeight: '700'
    lineHeight: 44px
    letterSpacing: -0.02em
  headline-xl-mobile:
    fontFamily: Manrope
    fontSize: 28px
    fontWeight: '700'
    lineHeight: 36px
    letterSpacing: -0.02em
  headline-lg:
    fontFamily: Manrope
    fontSize: 28px
    fontWeight: '600'
    lineHeight: 36px
    letterSpacing: -0.015em
  headline-md:
    fontFamily: Manrope
    fontSize: 22px
    fontWeight: '600'
    lineHeight: 30px
    letterSpacing: -0.01em
  headline-sm:
    fontFamily: Manrope
    fontSize: 18px
    fontWeight: '600'
    lineHeight: 26px
    letterSpacing: -0.005em
  body-lg:
    fontFamily: Plus Jakarta Sans
    fontSize: 17px
    fontWeight: '400'
    lineHeight: 26px
    letterSpacing: -0.01em
  body-md:
    fontFamily: Plus Jakarta Sans
    fontSize: 15px
    fontWeight: '400'
    lineHeight: 22px
    letterSpacing: 0em
  body-sm:
    fontFamily: Plus Jakarta Sans
    fontSize: 13px
    fontWeight: '400'
    lineHeight: 18px
    letterSpacing: 0.005em
  label-lg:
    fontFamily: Plus Jakarta Sans
    fontSize: 14px
    fontWeight: '600'
    lineHeight: 20px
    letterSpacing: 0.01em
  label-md:
    fontFamily: Plus Jakarta Sans
    fontSize: 12px
    fontWeight: '600'
    lineHeight: 16px
    letterSpacing: 0.02em
  label-technical:
    fontFamily: Manrope
    fontSize: 11px
    fontWeight: '700'
    lineHeight: 14px
    letterSpacing: 0.06em
rounded:
  sm: 0.25rem
  DEFAULT: 0.5rem
  md: 0.75rem
  lg: 1rem
  xl: 1.5rem
  full: 9999px
spacing:
  gutter: 1.5rem
  gutter-mobile: 1rem
  margin: 2rem
  margin-mobile: 1rem
  space-xs: 0.25rem
  space-sm: 0.5rem
  space-md: 1rem
  space-lg: 1.5rem
  space-xl: 2.5rem
---

## Brand & Style

This design system establishes a high-performance clinical laboratory aesthetic tailored for athletic analytics, human optimization, and biomechanical precision. The visual direction balances the pristine clarity of advanced sports medicine with the frictionless, premium elegance of contemporary digital health flagships.

### Visual Character
- **Clinical Precision:** Crisp, daylight-toned surfaces paired with razor-sharp structural alignments suggest empirical scientific rigor.
- **Athletic Vitality:** Dynamic accents derived from icy cyan and deep cobalt inject kinetic energy without sacrificing executive authority.
- **Modern Executive Minimalism:** Ample negative space, controlled contrast ratios, and structural hairline boundaries create a focused workspace devoid of decorative clutter.

### Emotional Response
The interface must instill absolute confidence, clarity of signal over noise, and an active sense of physical mastery. Interactions feel crisp, weightless, and measured—mirroring calibrated laboratory hardware.

## Colors

The palette leverages a high-luminosity foundation punctuated by hyper-focused blue-spectrum wavelengths. Light is treated as an active workspace tool to optimize contrast and rapid data digestion during high-intensity training or clinical evaluations.

### Palette Architecture
- **Primary (`#0284C7`):** Cool ice cyan. Used as the principal focal driver for critical metrics, active telemetry nodes, highlights, and primary keyframes.
- **Secondary (`#1D4ED8`):** Deep royal cobalt. Anchors interactive commitments, primary command buttons, and strong structural affordances.
- **Neutral Foundation (`#0F172A`):** Deep slate graphite. Dictates high-contrast data display, key typography, and primary iconography, eliminating absolute black in favor of balanced optical density.
- **Canvas & Layering:**
  - Background: `#F8FAFC` (soft daylight off-white).
  - Elevated Surfaces: `#FFFFFF` (pure optical white for diagnostic cards and telemetry clusters).
  - Outlines & Borders: `#E2E8F0` (subtle hairline boundary separation).
  - Muted Text: `#64748B` (secondary analytical data, units of measurement, and contextual metadata).

## Typography

Typography establishes an empirical, high-visibility operational environment. The typographic pairing contrasts geometric clinical headers with humanistic, legible reading text.

- **Headlines (Manrope):** Geometric, modern, and sturdy. Delivers immediate structural order to sports metrics, load calculations, and dashboard summaries. Numbers rendered in Manrope inherit tabular-capable balance.
- **Body & Labels (Plus Jakarta Sans):** Highly readable with wide apertures and subtle geometric curves that remain sharp across dense diagnostic readouts, recovery notes, and athletic timelines.
- **Technical Readouts:** The `label-technical` token utilizes all-caps with generous tracking for units of measure (`BPM`, `VO2 MAX`, `MS`, `WATT/KG`) to reinforce laboratory instrumentation aesthetics.

## Layout & Spacing

The layout is built on a responsive 12-column grid system designed around rapid visual scanning and hierarchical clarity.

### Responsive Breakpoints
- **Desktop (≥ 1280px):** 12 columns, 24px (`1.5rem`) gutters, minimum 32px (`2rem`) outer margin. Content scales smoothly up to a maximum container constraint of 1440px.
- **Tablet (768px – 1279px):** 8 columns, 20px gutters, 24px outer margin. Secondary metric readouts compress into compact multi-column card clusters.
- **Mobile (< 768px):** 4 columns, 16px (`1rem`) gutters, 16px (`1rem`) outer margin. Data tables reflow into discrete vertical biometric telemetry cards.

### Spacing Principles
Component construction strictly utilizes the 4px baseline rhythm. Diagnostic components enforce rigorous internal padding (`space-md` to `space-lg`) to ensure that dense numerical clusters maintain breathing room, preventing cognitive fatigue during data interpretation.

## Elevation & Depth

Depth in this system avoids heavy, artificial dropshadows, favoring a surgical aesthetic governed by clean luminosity layers, structural hairlines, and soft ambient light diffusion.

### Elevation Hierarchy
- **Level 0 (Canvas Base):** Surface color `#F8FAFC`. Completely flat; forms the operational terrain.
- **Level 1 (Clinical Cards & Data Tiles):** `#FFFFFF` surface enclosed by a 1px solid border in `#E2E8F0`. Paired with an ultra-subtle tinted ambient dispersion: `0 1px 3px rgba(15, 23, 42, 0.04), 0 4px 12px rgba(2, 132, 199, 0.02)`.
- **Level 2 (Interactive Flyouts & Hover States):** `#FFFFFF` surface with elevated ambient shadow: `0 8px 24px rgba(15, 23, 42, 0.06), 0 2px 6px rgba(2, 132, 199, 0.04)`, slightly shifting the border toward `#CBD5E1`.
- **Level 3 (Modals, Overlays & Biometric Dialogs):** `#FFFFFF` surface suspended over a 40% opacity `#0F172A` scrim with backdrop blur (8px). Shadow: `0 20px 48px rgba(15, 23, 42, 0.12)`.

## Shapes

The design system incorporates geometric moderation using Level 2 roundedness. UI surfaces use balanced, deliberate radiuses that soften technological coldness without lapsing into toy-like softness.

### Corner Radius Mapping
- **Base Geometry (`rounded`, 0.5rem / 8px):** Primary form controls, text inputs, metric chips, inline buttons, and interactive badges.
- **Container Geometry (`rounded-lg`, 1rem / 16px):** Primary metric cards, clinical telemetry modules, chart containers, and modal dialogs.
- **Hero Containers (`rounded-xl`, 1.5rem / 24px):** Large dashboard viewports, performance summary cards, and primary camera/sensor diagnostic containers.
- **Pill Exception:** Full roundedness (`9999px`) is reserved exclusively for live state indicators (e.g., active telemetry pulses, recording tags).

## Components

### Buttons & Interactive Triggers
- **Primary:** High-contrast solid fill using Secondary Cobalt (`#1D4ED8`) or Primary Ice Cyan (`#0284C7`) for analytical actions. Text is pure `#FFFFFF` in `label-lg`, height is 44px, radius is 8px (`rounded`). Active states slightly scale (0.98) with an ambient cyan glow.
- **Secondary / Ghost:** Transparent background enclosed by a 1px `#E2E8F0` border, `#0F172A` text. Hover shifts background to `#F1F5F9`.
- **Telemetry Buttons:** Monospaced metric actions with an icon slot, height 36px, radius 8px.

### Badges & Filter Chips
- Height 28px, radius 8px (`rounded`), internal padding `space-xs space-sm`.
- Static states use `#F1F5F9` background with `#475569` text.
- Active states use a 10% tint of `#0284C7` background, a 1px border of `#0284C7`, and `#0284C7` text in `label-technical`.

### Input Fields & Controls
- Height 44px, background `#FFFFFF`, border 1px solid `#E2E8F0`, corner radius 8px.
- Focus state: Border transitions to `#0284C7` accompanied by a 3px soft focus ring of `rgba(2, 132, 199, 0.15)`.
- Typography: `body-md` in `#0F172A`, placeholder in `#94A3B8`.

### Checkboxes & Radios
- Size: 18px × 18px. Radius: 4px for checkboxes, circular for radios.
- Unchecked: `#FFFFFF` fill, 1.5px border `#CBD5E1`.
- Checked: Fill `#1D4ED8` with a solid white indicator tick.

### Cards & Biometric Tiles
- Standard data containers use pure `#FFFFFF` backdrops with a 1px `#E2E8F0` hairline border and 16px (`rounded-lg`) corner radius.
- Internal padding: `1.25rem` (`20px`) for standard metrics, `1.5rem` (`24px`) for primary charts.
- Metric cards incorporate a dedicated header zone featuring the metric title in `label-md` (`#64748B`), the current empirical value in `headline-lg` (`#0F172A`), and an inline micro-trend badge.

### Diagnostic Chart Containers
- Integrated grid backgrounds use `#F8FAFC` canvas with horizontal guide rules at `#F1F5F9`.
- Data vectors and kinetic plots utilize `#0284C7` with linear gradient fills fading into `rgba(2, 132, 199, 0.0)`.