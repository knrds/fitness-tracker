# Gemini Design-Builder Prompt — Block 3 + 4 ("Volt Performance" UI)

> **Verwendung:** Den folgenden Block als EINEN Prompt an Gemini (Designer-Agent)
> geben. Er setzt das fertige Stitch-Design „Volt Performance Fitness" als
> Design-Fundament (Block 3) und Premium-UI (Block 4) im echten React-Native-Code um.
> Referenzdesign liegt in `apps/mobile/assets/Design_idea/`.

---

```
Du bist der Designer-Agent für den Fitness-Tracker. Du setzt das fertige
"Volt Performance Fitness"-Design um — Block 3 (Design-Fundament) UND Block 4
(Premium-UI) in einem zusammenhängenden Strang.

═══════════════════════════════════════════════════════════════════════
ZUERST LESEN (Pflicht)
═══════════════════════════════════════════════════════════════════════
1. AGENTS.md vollständig.
2. FITNESS_TRACKER_COMPLETE_WORKFLOW.md → Section 1b (Architektur-Leitplanken)
   und Block 3 + Block 4.
3. Das Referenzdesign in apps/mobile/assets/Design_idea/:
   - volt_performance_fitness_prd.html  → die VERBINDLICHE Design-Spezifikation
     (Farben, Typografie, Tokens, Screen-Specs, States, Interaktionen).
   - active_workout/   (code.html + screen.png)
   - exercise_library/ (code.html + screen.png)
   - progress_stats/   (code.html + screen.png)
   - profile/          (code.html + screen.png)
   Die code.html sind HTML+Tailwind-Mockups. Sie sind NUR visuelle Referenz —
   du baust NICHT in HTML/Tailwind, sondern übersetzt sie 1:1 in React Native.

═══════════════════════════════════════════════════════════════════════
WICHTIG: HTML/Tailwind → React Native übersetzen
═══════════════════════════════════════════════════════════════════════
Das Repo ist Expo / React Native (KEIN Tailwind, KEIN NativeWind). Übersetze die
Tailwind-Mockups in echte RN-Komponenten mit StyleSheet.create. Keine Inline-
Styles. Keine `any`. Strict TS. Import-Reihenfolge: RN → third-party →
@fitness-tracker/* → local.

Fehlende Dependencies installieren (das ist UI-Arbeit, erlaubt):
  npx expo install expo-font @expo-google-fonts/space-grotesk @expo-google-fonts/manrope
  npx expo install expo-haptics react-native-reanimated expo-linear-gradient
Bereits vorhanden und wiederzuverwenden: react-native-chart-kit,
react-native-svg, expo-image, @expo/vector-icons.
(react-native-reanimated braucht den Babel-Plugin-Eintrag in babel.config.js —
ergänzen, falls nicht vorhanden.)

═══════════════════════════════════════════════════════════════════════
DESIGN-TOKENS (kanonisch aus dem PRD — Single Source of Truth)
═══════════════════════════════════════════════════════════════════════
Farben (Dark Mode = primär):
  primary    #C6FF00   (Buttons, aktive States, Progress-Fills, Key-Daten, aktiver Tab)
  background #0B0B0F   (App-Hintergrund, tiefes Canvas)
  surface    #1A1C23   (Cards, Bottom-Sheets, Sticky-Header)
  muted      #2A2B31   (1px-Border, inaktive Icons, Sekundär-Flächen)
  text       #F4F5F7   (Primärtext, aktive Werte)
  textMuted  #8A8D96   (Sekundärtext/Captions — abgeleitet, konsistent halten)
  accent     #FF3366   (destruktiv, Alerts, Log-out)
  Semantisch: success = primary/green, warning = amber, danger = accent.
  (Hinweis: active_workout/code.html nutzt #c1f20d — IGNORIEREN, kanonisch ist #C6FF00.)
Light Mode (sekundär): background #f8f8f5, dunkler Text — gleiche Token-Struktur.

Typografie:
  Headings : Space Grotesk 700, 24–32px, UPPERCASE, für Section-/Screen-Titel.
  Body     : Manrope 500, 16px, letterSpacing +0.2.
  Small    : Space Grotesk 400, 12px, UPPERCASE, letterSpacing +1.
  Buttons  : Space Grotesk 600, 16px, UPPERCASE.
  Numerals : Space Grotesk mit tabular-nums (fontVariant: ['tabular-nums']) für
             alle Zahlen (Gewicht, Reps, Timer, 1RM, Level, Streak, Volumen).

Spacing: 4 / 8 / 16 / 24 / 32 / 48.  Radius: card 16, inner/button 12, pill 9999.
Tiefe: KEINE Drop-Shadows. Tiefe entsteht durch Surface-Hierarchie + crisp 1px
muted-Borders. "Floating"-Look durch großzügige 24px-Innenabstände.

═══════════════════════════════════════════════════════════════════════
BRANCH & WORKFLOW
═══════════════════════════════════════════════════════════════════════
- Arbeite NUR auf feat/ui-* bzw. feat/design-* Branches. NIE auf main.
- Beginne mit Branch: feat/design-system  (Block 3), danach feat/ui-* pro Screen (Block 4).
- Du fasst NUR UI an: packages/ui, app/-Screens, components, styles. KEINE Stores,
  KEINE Types, KEIN Backend, KEIN Schema.
- pnpm typecheck + pnpm lint + pnpm test MÜSSEN grün bleiben.
- Pro abgeschlossenem Strang: Review-Report in docs/reviews/, Status im
  docs/mission-board.md auf 🟢, Branch in REVIEW-QUEUE. NICHT nach main mergen.

═══════════════════════════════════════════════════════════════════════
LEITPLANKE (kritisch für Designer)
═══════════════════════════════════════════════════════════════════════
Rechne KEINE Werte selbst in der UI. Volumen, e1RM, Streak, PRs, Summary kommen
ausschließlich aus packages/domain/src/logic/ (calculateVolume, estimateOneRepMax,
calculateStreak, detectPRs, summarizeWorkout) bzw. den bestehenden Store-Selektoren.
Fehlt ein Helfer → in docs/debugger-queue.md melden, NICHT im Screen rechnen.

═══════════════════════════════════════════════════════════════════════
BLOCK 3 — DESIGN-FUNDAMENT  (Branch: feat/design-system)
═══════════════════════════════════════════════════════════════════════
1. docs/design-system.md schreiben: die obigen Tokens, Typo-Rollen, Spacing,
   Komponenten-Stil, Dark/Light — als verbindliche Doku ableiten. ZEIGE MIR DAS
   ZUERST und warte auf mein "Go", bevor du Code schreibst.

2. packages/ui/src/theme.ts:
   - Voll typisiertes theme-Objekt (colors, spacing, radii, typography, fonts).
   - useColorScheme()-basiertes Dark/Light (Dark ist Default).
   - <ThemeProvider> + useTheme()-Hook. In apps/mobile/app/_layout.tsx einbinden.
   - Font-Loading (Space Grotesk + Manrope) via expo-font/@expo-google-fonts;
     SplashScreen bis Fonts geladen halten.

3. packages/ui/src/components/ — alle im Volt-Look (1px muted Border, kein Shadow,
   16px Card-Radius, 24px Padding, UPPERCASE Space-Grotesk-Headings):
   - Button.tsx        (Primary #C6FF00 mit dunklem Text, Secondary outlined,
                        Ghost, Danger #FF3366; states: pressed/disabled/loading;
                        Press-Scale 0.96 via reanimated)
   - Card.tsx          (Standard + Pressable)
   - Input.tsx         (Label, Field, Helper, Error; surface bg, 1px border)
   - NumericInput.tsx  (große tabular-nums Eingabe für Gewicht/Reps)
   - Chip.tsx / Badge.tsx (Filter-Pills + Muscle/Equipment/Set-Type-Tags;
                        aktiv = #C6FF00 Text + Border)
   - SegmentedControl.tsx (1W|1M|3M|1Y; aktiv = #C6FF00)
   - Checkbox.tsx      (32×32, 8px Radius, füllt #C6FF00 mit dunklem Tick)
   - Modal.tsx / BottomSheet.tsx (Header + Content + Action-Row)
   - StatCard.tsx      (Label small-uppercase + großer tabular-nums Wert)
   - EmptyState.tsx    (Icon + Headline + Zeile + optionaler CTA)
   - LoadingSkeleton.tsx (Pulse in #1A1C23)
   Alle exportiert aus packages/ui/src/index.ts.

4. Tab-Bar (apps/mobile/app/(tabs)/_layout.tsx): Hintergrund #0B0B0F/#1A1C23,
   1px Top-Border #2A2B31, aktiver Tint #C6FF00, inaktiv #8A8D96. Die App behält
   ihre 6 Tabs (Home, Workout, Programs, Exercises, Body, History) — der aktuelle
   generische Blau-Tint (#3b82f6) wird ersetzt.

═══════════════════════════════════════════════════════════════════════
BLOCK 4 — PREMIUM-UI: Screens auf das Volt-Design umstellen (feat/ui-<screen>)
═══════════════════════════════════════════════════════════════════════
Jeder Screen nutzt die packages/ui-Komponenten + Theme. Halte dich exakt an die
Referenz-Screenshots/Specs. Build-Reihenfolge (je eigener feat/ui-* Branch):

A) HOME / DASHBOARD  (apps/mobile/app/(tabs)/index.tsx)
   - Status-Header mit personalisierter Begrüßung; großer "Readiness/Streak"-
     Numeral (64px, #C6FF00) oben rechts.
   - "Next Workout"-Card (floating surface, 1px border, 24px padding): heutiges
     Workout aus aktivem Programm + großer Primary-CTA "START WORKOUT"
     (100% Breite, 56px, #C6FF00, dunkler Text). Kein Programm → "Choose a program".
   - Weekly Consistency: 7-Tage-Balken, erledigt = #C6FF00, offen = #2A2B31.
   - Level/XP-Card + letzte Aktivität. Empty/Loading-States laut PRD.
   - Klick START → Haptik + Slide-up zur Active-Workout-Session.

B) ACTIVE WORKOUT  (apps/mobile/app/workout/session.tsx +
   src/components/workout/SessionExerciseCard.tsx, RestTimer.tsx)
   - Sticky Header: Back-Arrow (mit Abbruch-Bestätigung — existiert bereits),
     Workout-Name UPPERCASE zentriert, laufender Timer rechts in #C6FF00
     (tabular-nums). Timer-Wert weiter aus startedAt ableiten (Leitplanke 6).
   - Dünner Progress-Bar (erledigte/gesamt Sätze).
   - Exercise-Card (#1A1C23, 1px border): Name UPPERCASE, "Last: 225 lbs × 8"
     Sub-Text, Spaltenkopf SET | PREV | LBS | REPS | ✓, dann Set-Rows als Grid.
   - Set-Row: Set#, Previous (muted), Weight-Input, Reps-Input, Completion-Checkbox
     (32×32, füllt #C6FF00). Abgehakte Row dimmt auf ~50% Opacity.
   - Set-Typen (W/Working/D/F) farblich unterscheidbar; muted "e1RM ≈ …" pro Satz
     (Wert aus domain-Helfer). "+ ADD SET" (Ghost mit primary Border/Text).
   - "+ ADD EXERCISE" gestrichelter Button am Listenende.
   - Sticky Bottom: "FINISH WORKOUT" full-width #C6FF00.
   - Rest-Timer-Overlay: full width, 80px, #C6FF00 Top-Border, großer Countdown;
     +30s/−10s; Ring grün→gelb→rot. Auto-Start nach Checkbox-Tap.
   - Haptik: Set abhaken Light, PR Heavy+Success, Finish Medium.

C) PROGRESS / STATS  (Progress-Bereich, z.B. unter History/(tabs)/history.tsx
   bzw. neuer Progress-Screen)
   - Segmented Control 1W|1M|3M|1Y (aktiv #C6FF00).
   - Übungs-Chips (SQUAT 1RM | BENCH 1RM | DEADLIFT 1RM …).
   - Hero-Card: Titel small-uppercase, großer Wert "315 LBS" + Trend "↗ +5.0%"
     (#C6FF00). Line-Chart: 3px #C6FF00-Stroke mit hartem Gradient-Drop darunter
     (react-native-chart-kit + expo-linear-gradient / svg), X-Grid in #2A2B31.
   - 2-Spalten Stat-Cards: Total Volume, Workouts, Avg Rest, PRs Set
     (Werte aus Stores/domain-Helfern, NICHT selbst rechnen).
   - Scrub: Press-and-hold zeigt Tooltip + Haptik-Tick.

D) EXERCISE LIBRARY  (apps/mobile/app/(tabs)/exercises.tsx +
   src/components/exercises/ExerciseCard.tsx)
   - Titel "EXERCISE LIBRARY" UPPERCASE. Such-Feld (surface, 48px, 1px border).
   - Horizontale Filter-Pills (ALL/CHEST/BACK/LEGS/SHOULDERS/ARMS/CORE);
     aktiv = #C6FF00 Text+Border.
   - Exercise-Row 72px: 48×48 Thumbnail (expo-image), Name, Muscle-Tag rechts
     (24px, #2A2B31 bg, 12px Space-Grotesk). Empty: "0 Exercises Found".

E) PROFILE  (apps/mobile/app/profile.tsx)
   - Header UPPERCASE; Avatar mit #C6FF00-Ring + Edit-Pencil-Badge; Name groß;
     "LEVEL 12 — ELITE" in #C6FF00 mit Medal-Icon.
   - BIOMETRICS: 2-Spalten Stat-Cards (Weight/Body Fat) + breite Height-Card;
     "UPDATE"-Link in #C6FF00. Werte aus profileStore.
   - ACHIEVEMENTS: horizontale Tiles; freigeschaltet = #C6FF00-Border + Icon,
     gesperrt = muted + Lock; "3/12 UNLOCKED".
   - SETTINGS-Liste (Account Details, Workout Preferences, Health-Sync-Toggle
     mit #C6FF00). "LOG OUT" in #FF3366.

F) RESTLICHE SCREENS in derselben Sprache (kein eigenes Referenzbild, aber
   konsistent): Programs (+ Programm-Kalender), Body Tracking, Workout-Detail
   (History), Exercise-Detail, Builder. Gleiche Tokens/Komponenten anwenden.

Micro-Interactions (überall): Press-Scale 0.96 via reanimated; Haptik laut B);
Skeleton statt Spinner beim Laden; Empty-States mit Persönlichkeit; PR-Set =
goldene/primäre Umrandung + Badge.

═══════════════════════════════════════════════════════════════════════
DEFINITION OF DONE
═══════════════════════════════════════════════════════════════════════
- Tokens/Theme zentral in packages/ui; kein Screen hardcodet Hex-Farben.
- Jeder Screen entspricht visuell der Volt-Referenz (Dark Mode primär, Light Mode
  funktioniert).
- Keine eigenen Werteberechnungen in Screens (Leitplanke).
- pnpm typecheck ✅, pnpm lint ✅, pnpm test ✅, App läuft (pnpm dev).
- docs/design-system.md + Review-Reports geschrieben, Mission-Board aktualisiert.
- Nichts nach main gemerged; pro Strang ein PR zur Review.

Starte mit Block 3: zeige mir zuerst docs/design-system.md und einen 1-Absatz-Plan,
dann warte auf mein "Go".
```
