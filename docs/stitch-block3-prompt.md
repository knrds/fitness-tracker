# Google Stitch Prompt — Block 3: Design-Fundament

> **Zweck:** Diesen Prompt in [Google Stitch](https://stitch.withgoogle.com) (Designer)
> einfügen, um eine premium, dark-mode-first UI für den Fitness-Tracker zu generieren.
> Der Stitch-Output ist die **visuelle Referenz** für Block 3 (`docs/design-system.md`
> + `packages/ui`). Stitch baut nicht den Code dieses Repos — es liefert das visuelle
> Konzept, das der Designer-Agent dann in React Native / das Theme übersetzt.
>
> **Tipp:** Stitch arbeitet pro Screen am besten. Du kannst (a) den ganzen Block
> „MASTER PROMPT" einmal einfügen, um Stil + App zu setzen, und dann (b) für jeden
> Screen den jeweiligen Screen-Prompt einzeln senden („Generate this screen in the
> established style"). Stitch ist Englisch-first — der Prompt ist daher auf Englisch.

---

## MASTER PROMPT (Stil + App-Kontext zuerst senden)

```
Design a premium mobile app UI for a serious strength-training tracker called
"Fitness Tracker". The audience is ambitious, dedicated strength athletes
(powerlifting, bodybuilding, hypertrophy). The feel sits between the app "Hevy"
and a high-end athletic performance brand — confident, focused, data-dense but
clean. This is NOT a generic wellness app: avoid pastel gradients, avoid generic
blue, avoid the typical "white card + purple accent" SaaS look, avoid playful
rounded cartoon styling.

DESIGN LANGUAGE
- Dark mode FIRST (primary), with a light mode as a secondary variant.
- Mood: powerful, premium, motivating, precise. Think matte black gym equipment,
  forged steel, and a single bold energy accent.
- High contrast for numbers (weights, reps, PRs, streaks) — big data should feel
  like the hero of every screen.
- Generous spacing, strong typographic hierarchy, subtle depth (soft shadows /
  faint borders), never flat-and-boring and never over-decorated.

COLOR SYSTEM (dark mode)
- Background: near-black charcoal (e.g. #0B0B0F / #111216), NOT pure black.
- Surface / cards: one or two steps lighter than background (#17181D, #1F2026)
  with a faint 1px border (#2A2B31) instead of heavy shadows.
- Primary accent (energy / actions / active states): a bold, athletic color —
  propose ONE of: electric lime-green (#C6FF00 / #B8F500), molten orange (#FF5A1F),
  or volt yellow. Pick the one that reads most "strength & power" and use it
  consistently for primary buttons, active tab, progress fills, key CTAs.
- Success / PR / achievement highlight: gold/amber (#FFB020) for personal records
  and unlocks — PRs should feel like a trophy moment.
- Semantic: success green, warning amber, danger/destructive red (#FF4D4F),
  each with a muted dark-surface variant.
- Text: high-emphasis near-white (#F5F6F7), medium-emphasis (#A8ABB4),
  low-emphasis / captions (#6B6E78).

TYPOGRAPHY
- A strong, slightly condensed sans-serif. Two roles:
  - "Display/Numeric": tall, bold, tabular figures for weights, reps, level, streak,
    timers, volume. This is the signature of the app.
  - "Text": clean readable sans for titles, labels, body, captions.
- Clear scale: Display (32–48), H1 (24), H2 (20), Body (15–16), Caption (12–13).

SPACING / SHAPE / ELEVATION
- Spacing scale: 4 / 8 / 12 / 16 / 24 / 32 / 48 px.
- Border radius scale: 8 (inputs/badges), 12 (cards), 16–20 (sheets/modals),
  full/pill (chips, segmented controls, primary buttons).
- Depth via faint borders + very soft shadows; cards subtly lifted off background.
- Touch targets minimum 44×44.

CORE COMPONENTS (show a small component sheet)
- Buttons: Primary (filled accent), Secondary (outlined), Ghost (text), Danger.
  Include normal + pressed + disabled + loading states.
- Card: standard + pressable (with subtle pressed scale).
- Input: label + field + helper text + error state.
- Badge / Chip: for muscle groups, equipment, and set types
  (Warmup "W", Working, Drop "D", Failure "F" — visually distinct).
- Segmented control / tabs (for time ranges 7D / 1M / 3M / 1Y / All).
- Modal / bottom sheet: header + content + action row.
- Empty state: icon + headline + supporting line + optional CTA.
- Loading skeleton placeholders for lists.

NAVIGATION
- Bottom tab bar with 6 tabs, icon + label, dark surface, accent for the active
  tab: Home, Workout, Programs, Exercises, Body, History.
```

---

## SCREEN PROMPTS (jeweils einzeln senden, im etablierten Stil)

### 1) Home / Dashboard
```
Generate the Home dashboard in the established dark, premium strength-training
style. Sections top to bottom:
- Header: personalized greeting ("Welcome back, Konrad"), and the current streak
  shown prominently with a flame icon + big number ("12 day streak").
- Level card: current level, an XP progress bar to the next level, XP value.
- "Today" card: today's planned workout from the active program — workout name,
  a preview of the first 3 exercises, and a large primary "Start workout" button.
  If no program is active, show a "Choose a program" call-to-action instead.
- Week overview: 7 circles Mon–Sun; trained days filled with the accent color,
  today highlighted with a ring.
- "Last activity": last completed workout — name, date, duration, exercise count;
  tappable.
- "Almost there" achievements: 2–3 nearly-unlocked achievements with mini progress
  bars.
- Quick actions row: "Quick workout" (empty session), "Find exercise", "Programs".
Big numbers are the hero. Plenty of breathing room.
```

### 2) Active Workout Session (the most important screen)
```
Generate the active workout logging screen in the established style.
- Sticky header: workout name, a live elapsed timer (large, tabular numerals),
  and a "Finish" button. A back arrow that confirms before discarding.
- A thin progress bar showing completed sets / total sets.
- A vertical list of exercise cards. Each exercise card:
  - Exercise name, large and prominent.
  - "Previous: 80 kg × 8 · 3 days ago" shown directly beneath in muted text.
  - A table of set rows: Set # | Weight | Reps | RPE/RIR | a check button.
  - Set type is visible per row: Warmup (W), Working, Drop (D), Failure (F),
    visually color-coded.
  - A small muted "e1RM ≈ 102 kg" estimate appears as a set is filled in.
  - An "+ Add set" button (inherits the previous set's values).
- A prominent "Add exercise" button at the end of the list.
- A floating rest-timer element: a circular countdown with the time in the center
  and +30s / −10s controls; the ring color shifts green → amber → red as time runs
  down.
Show a completed set with a subtle highlight, and a PR set with a gold border + a
small "PR" trophy badge.
```

### 3) Exercise Library (list)
```
Generate the exercise library list screen in the established style.
- A search field at the top.
- Horizontally scrollable filter chips: muscle group (Chest, Back, Legs,
  Shoulders, Arms, Core) and equipment (Barbell, Dumbbell, Machine, Bodyweight).
- A list of exercise rows: a square exercise illustration/thumbnail on the left,
  the exercise name, and small badges for primary muscle group + equipment.
- A favorite (star) toggle on each row.
- Show an empty state variant: "No favorites yet" with an icon and motivating line.
```

### 4) Exercise Detail
```
Generate the exercise detail screen in the established style.
- A large header media area (exercise illustration/animation frame).
- Exercise name + badges (primary + secondary muscle groups, equipment).
- A "How to perform" instructions section.
- A personal stats strip: best set, estimated 1RM, last performed.
- A small e1RM / volume trend chart over time.
- A configurable default rest time control.
- A primary "Add to workout" button.
```

### 5) Programs (with active-program calendar)
```
Generate the Programs screen in the established style.
- If a program is active: show a gorgeous week-by-week calendar of the split —
  training days labeled with the workout name and accent-filled, rest days muted.
  Each training day is tappable to quick-start that day's template. Include a
  "Deactivate plan" action.
- A list of available pre-built splits as cards: "Full Body", "Push/Pull/Legs",
  "Upper/Lower" — each card shows days per week, focus, and a "Start" action.
- A primary "Create program" button.
```

### 6) History
```
Generate the workout History screen in the established style.
- A list of completed workouts grouped by month. Each row: workout name, date,
  duration, total volume, set count, and PR badges if any were hit.
- Pull-to-refresh affordance.
- An empty state: "No workouts yet — let's get started!" with an icon and CTA.
```

### 7) Workout Detail (from History)
```
Generate the completed-workout detail screen in the established style.
- Summary header: date, duration, total volume, number of sets, PRs achieved.
- Per-exercise breakdown: exercise name and its logged sets (weight × reps, set
  type, RPE/RIR), PR sets highlighted in gold.
- An optional workout note section.
- A "Share summary" button.
```

### 8) Body Tracking
```
Generate the Body tracking screen in the established style.
- A "log measurement" entry control (date, value, unit).
- A bodyweight trend line chart over time as the hero.
- A body-fat % chart.
- A measurements overview grid: chest, waist, hips, arms, legs — each with the
  latest value and a small delta vs. previous.
```

### 9) Progress / Stats (charts)
```
Generate the Progress/Stats screen in the established style.
- A segmented time-range control: 7D / 1M / 3M / 1Y / All.
- A volume-over-time line chart.
- An estimated-1RM progression chart per exercise.
- A training heatmap calendar (GitHub-contributions style: last 12 weeks, color =
  training volume).
- A muscle-group distribution donut chart for the last 4 weeks.
- A PR timeline list with delta to the previous record.
- "This week vs last week" stat cards with up/down trend arrows.
```

### 10) Profile / Settings
```
Generate the Profile & Settings screen in the established style.
- Profile header: name, training goal, experience level, avatar.
- Lifetime stats: total workouts, total volume lifted, longest streak — as big
  numeric stat cards.
- Settings list: units (kg/lbs toggle), biological sex, height, bodyweight,
  strength maxes.
- Data section: export data as JSON, and a destructive "Delete all data" item
  (red) that requires confirmation.
```

### 11) Achievements
```
Generate the Achievements screen in the established style.
- Top: current level, XP, and XP-to-next-level progress bar.
- A grid of achievement tiles: unlocked tiles in full accent/gold with the unlock
  date; locked tiles muted with a mini progress bar (e.g. "18 / 25 PRs").
- Categories: Streaks, Workouts, PRs, Volume, Exercise variety.
- Show an achievement-unlock celebration modal variant: large icon, achievement
  name, description, and an animated "+250 XP" reward.
```

---

## OUTPUT-ANWEISUNG (am Ende anhängen)

```
Provide: (1) a one-page style sheet (color tokens with hex values, type scale,
spacing, radii, the core components with their states), and (2) each screen as a
high-fidelity mobile mockup in both dark mode (primary) and light mode. Keep the
visual language consistent across all screens. Use realistic strength-training
sample data (e.g. Squat 140 kg × 5, Bench Press 100 kg × 8, a 12-day streak,
Level 7).
```

---

## Danach (für den Designer-Agenten / Block 3 Umsetzung)
1. Stitch-Output (Tokens + Screens) sichten, ggf. eine Akzentfarbe final wählen.
2. Daraus `docs/design-system.md` schreiben (Farben, Typo, Spacing, Komponenten-Stil)
   → **OK von Konrad abwarten** (Block-3-Gate im Workflow).
3. Theme + Komponenten in `packages/ui` implementieren (Button, Card, Input, Badge,
   Modal, EmptyState, LoadingSkeleton, ThemeProvider, `useColorScheme`).
4. Bestehende Screens schrittweise auf das Theme umstellen (Start: Home + Exercises).
5. **Architektur-Leitplanke beachten:** der Designer rechnet keine Werte (Volumen,
   e1RM, Streak) selbst — ausschließlich Helfer aus `packages/domain/src/logic/`.
```
```
