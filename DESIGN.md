# VOLT design system

The executable configuration is `packages/ui/src/theme.ts`. `createTheme(colorway)` supplies every screen through `ThemeProvider`; change semantic tokens there to change the app. Original reference material in `inspo/` is preserved.

## Appearance

Glacier is the default: near-black blue surfaces, cyan primary, ice-blue secondary. Amber uses warm black surfaces and amber primary. The profile's optional `colorway` is persisted with its existing document; old profiles without this field use Glacier. No destructive database migration is required.

Use `colors.background`, `surface`, `surfaceElevated`, `text`, `muted`, `border`, `primary`, `primarySubtle`, and `onPrimary` for ordinary UI. Use `success`, `warning`, `error`, and `onError` for actual states. `accent` remains an error alias for legacy callers; it is not the brand accent. Use `withAlpha` for transparent hexadecimal colors.

Charts, anatomy, set types and hydration each have semantic token groups. Physical weight-plate colors and blue water retain their physical meaning in both appearances. Body silhouettes are locally bundled MIT-licensed anatomy paths, with theme-aware illumination and actual training activity; they do not imply medical readiness.

## Layout and type

Space Grotesk headings and numeric displays; Manrope body text and controls. Spacing scale: 4, 8, 16, 24, 32, 48. Radii: 6, 10, 14, full. Minimum targets 44; primary controls 48. Main content maximum 1040; reading maximum 760. Auth forms are bounded to 480. Widths shrink and text wraps before controls collide. Safe-area insets replace fixed device offsets.

Home uses side-by-side session and weekly cards on wide screens. In the active workout, screens below 480 pixels put RPE/RIR in a second row so weight/reps stay readable. Secondary hydration and caffeine controls expand in place. Creation controls must not float over another actionable row.

## Motion

Tokens: fast 140 ms, standard 220 ms, progress 450 ms. Use short eased transitions for selection and state changes, bounded press scale, and measured disclosure height. Respect Reduced Motion. No permanent decorative loops or overshooting timer panels. `SegmentedControl` moves its selection indicator without changing its measured bounds. `AnimatedDisclosure` measures real content and removes closed controls after its exit animation.

The VOLT backdrop is a clipped, non-interactive local SVG glow/flash motif. It adds the reference visual identity without image downloads, fake telemetry or touch interception. Progress indicators show actual logged data.

## Verification

Review all five tabs, editors and modal states at 320/390 and desktop widths; check both colorways, keyboard input, large text and reduced motion. Browser emulation, SQLite persistence tests and native exports are separate from physical iPhone/Android verification. Remaining gates are tracked in `IMPLEMENTATION_CHECKLIST.md`.
