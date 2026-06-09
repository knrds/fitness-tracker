# Design System: Volt Performance Fitness

## Direction

- **Style:** modern, premium, focused, performance-oriented.
- **Reference space:** Whoop, Oura, Strava, and native fitness dashboards in dark mode.
- **V1 UI language:** English. New screens, empty states, errors, buttons, and labels should use English consistently. Existing German copy should be migrated during the consistency pass, not mixed further.
- **Design principle:** dense enough for repeated training use, but still high-contrast and motivating. Avoid marketing-page composition inside the app.

## Color Palette

| Token              | Hex       | Usage                                                       |
| :----------------- | :-------- | :---------------------------------------------------------- |
| **Primary**        | `#90D5FF` | Buttons, active states, progress bars, selected data points |
| **Primary Strong** | `#5FBDFF` | Pressed/hovered primary states, strong accents              |
| **Primary Soft**   | `#C5E8FF` | Subtle highlights, chart fills, inactive primary surfaces   |
| **Background**     | `#0B0B0F` | App canvas, splash/adaptive icon background                 |
| **Surface**        | `#1A1C23` | Cards, sheets, sticky headers, tab surfaces                 |
| **Elevated**       | `#20232B` | Active rows, focused inputs, raised drag items              |
| **Border**         | `#2A2B31` | 1px dividers and container borders                          |
| **Text**           | `#F4F5F7` | Primary text and stat values                                |
| **Muted**          | `#8A8D9F` | Secondary text, inactive icons                              |
| **Warning/PR**     | `#FFB020` | PR markers, achievement highlights                          |
| **Danger**         | `#FF3366` | Destructive actions and validation errors                   |

Dark mode is the primary and release target. The splash screen and adaptive icon background must remain `#0B0B0F`, not white.

## Typography

- **Display/Numerals:** `Space Grotesk` with tabular numerals for weights, level, streak, timers, and chart values.
- **Headings:** `Space Grotesk`, 700, 24-32px, uppercase for screen titles.
- **Body:** `Manrope`, 500, 16px for lists, forms, and explanatory text.
- **Buttons:** `Space Grotesk`, 600, 15-16px, uppercase for primary actions.
- **Captions:** `Space Grotesk`, 400-600, 11-12px, uppercase for labels and metadata.

Do not use negative letter spacing or viewport-scaled font sizes.

## Spacing

- `4px` micro gaps.
- `8px` compact controls and chips.
- `12px` inner element spacing.
- `16px` default stack spacing.
- `24px` screen/card padding.
- `32px` major section gaps.
- `48px` large empty-state breathing room.

## Components

- **Cards:** `#1A1C23`, 1px `#2A2B31` border, 12-16px radius, 16-24px padding. Do not nest cards inside cards.
- **Buttons:** primary uses `#90D5FF` background with `#0B0B0F` text; secondary uses surface + border; ghost uses transparent background with text/icon color.
- **Inputs:** surface/elevated fill, 1px border, primary border on focus, clear error copy using `#FF3366`.
- **Badges/Chips:** compact, readable, and semantic. Use icon+text where it improves scanning.
- **Charts:** primary line/area in `#90D5FF`; PR markers use `#FFB020`; tooltips should not cover neighboring content.
- **Modals/Sheets:** dark overlay, elevated surface, clear close affordance, click-outside/tap-outside dismiss when safe.
- **Tab bar:** active center action may use a subtle glow/shadow. Other depth should come from color hierarchy and borders.

## States

Every list-like or remote/persistent surface should define:

- **Empty:** concise English title, one helpful line, and a clear next action where relevant.
- **Loading:** skeletons or stable placeholders; avoid layout jumps.
- **Error:** user-actionable English message plus retry/dismiss action.
- **Disabled:** visible contrast difference without relying only on opacity.
- **Destructive confirmation:** required for irreversible actions such as clearing all local data.

## Motion

- Press-scale around `0.96` for buttons and interactive cards.
- Haptics for set completion, important confirmations, and achievement moments.
- Use `Animated`/Reanimated for sheets, drag-and-drop, timers, and high-frequency interactions.
- Animation must never block logging a set or finishing a workout.

## Screen Structure

- Split large screens into feature components when a file grows beyond roughly 300-400 lines or mixes unrelated workflows.
- Keep domain calculations out of screens. Use `packages/domain/src/logic/` helpers for volume, PRs, e1RM, streaks, and workout summaries.
- Prefer stable dimensions for boards, stat tiles, tabs, and chart areas so text, icons, and loading states do not shift layout.
