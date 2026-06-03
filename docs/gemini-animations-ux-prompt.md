# Gemini Prompt — Animations, Micro-Interactions & iPhone UX Polish

> **Wann geben:** Nachdem Block 3 (feat/design-system) gemerged ist und die
> packages/ui-Komponenten + Theme stehen. Dieser Prompt ist ein eigenständiger
> Strang: Branch feat/ui-animations-ux. Er erweitert die fertigen Screens um
> erstklassige iOS-native Animationen und Interaktionen.

---

```
Du bist der Designer-Agent für den Fitness-Tracker. Deine Aufgabe in dieser
Mission: alle Screens mit iPhone-nativen Animationen, weichen Übergängen und
erstklassigen Micro-Interactions ausstatten. Das Ergebnis soll sich anfühlen wie
eine native iOS App aus dem App Store — nicht wie eine Web-App im RN-Wrapper.

═══════════════════════════════════════════════════════════════════════
ZUERST LESEN (Pflicht)
═══════════════════════════════════════════════════════════════════════
1. AGENTS.md vollständig.
2. FITNESS_TRACKER_COMPLETE_WORKFLOW.md → Section 1b (Leitplanken) + Block 4.
3. docs/design-system.md (das von dir oder dem Vorgänger erstellte Theme).
4. Alle Screens in apps/mobile/app/ und Komponenten in
   apps/mobile/src/components/ — verstehe den aktuellen Zustand, bevor du
   etwas anfasst.

Branch: feat/ui-animations-ux  (von main abzweigen)
Nur UI-Dateien anfassen. Keine Stores, keine Types, kein Backend.
pnpm typecheck + pnpm lint + pnpm test müssen grün bleiben.

═══════════════════════════════════════════════════════════════════════
TECH-STACK (alle bereits installiert nach Block 3)
═══════════════════════════════════════════════════════════════════════
- react-native-reanimated v3  → Worklets, useSharedValue, withSpring,
  withTiming, withSequence, withDelay, useAnimatedStyle,
  FadeIn/FadeOut/SlideInDown/SlideOutDown Layout-Animationen.
- expo-haptics              → ImpactFeedbackStyle, NotificationFeedbackType.
- react-native-gesture-handler → Swipeable, PanGesture, LongPressGesture.
- expo-linear-gradient      → für Gradient-Overlays auf Charts.
Falls eine dieser Libraries fehlt: `npx expo install <pkg>` — das ist UI-Arbeit.

Faustregel: Jede Animation läuft auf dem UI-Thread (Worklet), KEIN JS-Bridge-
Blocking. Animationsdauer 150–300ms für Responses, 300–500ms für Übergänge.
Spring statt Linear wo immer es sich "physisch" anfühlen soll.

═══════════════════════════════════════════════════════════════════════
1. PRESS-FEEDBACK — überall (packages/ui: AnimatedPressable)
═══════════════════════════════════════════════════════════════════════
Erstelle packages/ui/src/components/AnimatedPressable.tsx:
- Wrapper um Pressable mit useAnimatedStyle.
- onPressIn  → scale 0.96, withSpring({ damping: 15, stiffness: 300 }).
- onPressOut → scale 1.0, withSpring({ damping: 12, stiffness: 200 }).
- Alle Buttons, Cards (Pressable), Exercise-Rows, Set-Checkboxen,
  Tab-Items → AnimatedPressable verwenden.
Kein Feedback soll abgehackt sein. Alles federt zurück.

═══════════════════════════════════════════════════════════════════════
2. SET-ABHAKEN — die wichtigste Interaktion der App
═══════════════════════════════════════════════════════════════════════
In SessionExerciseCard → Checkbox-Tap (completeSet):
a) Checkbox selbst:
   - Border-Color: withTiming(#C6FF00, 120ms) → Background: withTiming(#C6FF00).
   - Tick-Icon: FadeIn(100ms) + Scale 0→1 withSpring(damping 10).
b) Set-Row:
   - Opacity: withTiming(0.45, 200ms) nach Abschließen.
   - Weight/Reps Felder: withTiming(textColor → #C6FF00 → muted, 300ms).
c) Haptik: expo-haptics ImpactFeedbackStyle.Light beim Tap.
d) PR-Erkennung (falls detectPRs ein PR zurückgibt):
   - Goldene Border (#FFB020) um die Row: withSpring, dann pulseScale 1→1.03→1
     withSequence (2 Pulse, 400ms gesamt).
   - Haptik: NotificationFeedbackType.Success.
   - "PR ★" Badge: FadeIn + SlideInDown(80ms).

═══════════════════════════════════════════════════════════════════════
3. SWIPE-TO-DELETE — Sets und Exercises
═══════════════════════════════════════════════════════════════════════
Nutze react-native-gesture-handler Swipeable (oder GestureDetector + PanGesture):
- Set-Rows: Links swipen → rotes Delete-Icon sichtbar (#FF3366 Background).
  Über 60% geswiped → automatisch löschen mit SlideOutLeft(200ms).
- Exercise-Cards: Swipe-to-Delete analog; Bestätigungs-Haptic Medium.
Swipe-Resistance: translateX mit interpolate + clamp — kein unkontrolliertes
Wegfliegen.

═══════════════════════════════════════════════════════════════════════
4. REST-TIMER — Ring-Animation
═══════════════════════════════════════════════════════════════════════
In RestTimer.tsx (oder neuem AnimatedRestTimer.tsx):
- SVG-Ring (react-native-svg Circle mit strokeDashoffset) animiert mit
  useSharedValue + useAnimatedProps (Worklet). Kein setInterval für den
  visuellen Fortschritt — Zeitstempel-basiert.
- Farbe interpoliert: grün (#C6FF00) → gelb (#FFB020) → rot (#FF3366)
  in den letzten 20% bzw. 10% der Zeit.
- Erscheinen: SlideInDown(300ms) nach Checkbox-Tap.
- Verschwinden: FadeOut(200ms) + leichte Scale-Down 1→0.95.
- +30s/−10s Buttons: AnimatedPressable + kurzes Pulse der Zeit-Zahl.
- Bei 0: NotificationFeedbackType.Success Haptik + kurzes "Done"-Flash
  (Ring-Fill kurz weiß → verblasst in 300ms).

═══════════════════════════════════════════════════════════════════════
5. SCREEN-ÜBERGÄNGE (Expo Router v4)
═══════════════════════════════════════════════════════════════════════
In apps/mobile/app/_layout.tsx und Screen-Definitionen:
- Standard Stack-Navigation: iOS-native Slide (bleibt Standard — nicht
  überschreiben, RN macht das nativ).
- Modal-Screens (Exercise-Picker, Plate-Calculator, Rest-Timer-Overlay):
  Presentation "modal" + SlideInDown / SlideOutDown (reanimated Layout).
- Tab-Wechsel: kein Fade oder Slide — iOS-native Tab-Behavior beibehalten.
  Nur der aktive Tab-Icon animiert: withSpring scale 1→1.15→1 beim Aktivieren.

═══════════════════════════════════════════════════════════════════════
6. LISTEN — Eintreten und Löschen von Elementen
═══════════════════════════════════════════════════════════════════════
Überall wo Elemente dynamisch zur Liste hinzukommen (Add Exercise, Add Set):
- Eintretende Items: entering={FadeInDown.duration(200).springify()}.
- Löschende Items: exiting={FadeOutLeft.duration(150)}.
- FlatList-Items mit Animated.View und Layout-Animation (nicht jedes Item
  einzeln per useSharedValue — Reanimated Layout-Animations nutzen).
Nicht übertreiben: NUR Add und Remove animieren, kein Re-Order-Anim beim Scrollen.

═══════════════════════════════════════════════════════════════════════
7. ACHIEVEMENT-UNLOCK CELEBRATION
═══════════════════════════════════════════════════════════════════════
In einer neuen Komponente AchievementCelebration.tsx (modal overlay):
- Trigger: nach awardXpAndCheckAchievements, wenn newlyUnlocked.length > 0.
- Erscheinen: Scale 0.6→1 + FadeIn, withSpring({ damping: 8, stiffness: 200 }).
- Achievement-Icon: Pulse 1→1.1→1 (3×, 800ms gesamt) via withSequence.
- XP-Gewinn: "+250 XP" startet bei translateY +20, faded + slidet nach oben
  (withTiming 400ms).
- Backdrop: Semi-transparent schwarzes Overlay FadeIn(200ms).
- Dismiss: Tap überall → FadeOut + Scale 1→0.8 withTiming(200ms).
- Haptik: NotificationFeedbackType.Success beim Erscheinen.

═══════════════════════════════════════════════════════════════════════
8. SKELETON LOADING — konsistent
═══════════════════════════════════════════════════════════════════════
LoadingSkeleton.tsx in packages/ui (aus Block 3) aufwerten:
- Shimmer-Effekt: ein LinearGradient (expo-linear-gradient) von
  transparent → rgba(255,255,255,0.06) → transparent wandert mit
  useSharedValue + translateX durch den Skeleton-Block. Loop via
  withRepeat(withTiming(width, 900ms), -1).
- Varianten: ExerciseRowSkeleton (72px), CardSkeleton, StatCardSkeleton.
- Alle Listen zeigen Skeletons beim initialen Load statt eines Spinners.

═══════════════════════════════════════════════════════════════════════
9. PULL-TO-REFRESH
═══════════════════════════════════════════════════════════════════════
In History und Progress (FlatList):
- RefreshControl mit tintColor="#C6FF00" (iOS) / colors={['#C6FF00']} (Android).
- onRefresh neu laden (falls Store-Selector reaktiv ist, ggf. force-re-render).
Das ist meist 5 Zeilen — sauber und nativ, kein Custom-Animation nötig.

═══════════════════════════════════════════════════════════════════════
10. CHART-INTERAKTION (Progress-Screen)
═══════════════════════════════════════════════════════════════════════
In react-native-chart-kit LineChart:
- onDataPointClick → Tooltip-Overlay mit Datum + Wert; FadeIn(150ms) via
  Animated.Value (da chart-kit keine Reanimated-Integration hat).
- Haptic: ImpactFeedbackStyle.Light pro Datenpunkt-Touch.
- Tooltip: surface #1A1C23, 1px muted-Border, 8px Radius, Space-Grotesk.

═══════════════════════════════════════════════════════════════════════
11. KEYBOARD & SAFE-AREA — iPhone-konform
═══════════════════════════════════════════════════════════════════════
- Aktive Workout Session: KeyboardAvoidingView behavior="padding" (iOS).
  Wenn der User in ein Gewichts-/Reps-Feld tippt, schiebt der Screen sich
  hoch und die aktive Set-Row bleibt sichtbar — die Liste scrollt nicht
  unter die Tastatur.
- Alle Inputs: returnKeyType passend ("done" für letzte, "next" für Zwischen-
  Felder); automatischer Fokus-Sprung via ref-Kette (weight → reps → next set).
- SafeAreaView: in jedem Root-Screen vorhanden (prüfen + ergänzen).
- Tastatur-Dismiss: Tap auf dunklen Hintergrund (außerhalb Card) schließt
  Tastatur (Keyboard.dismiss() via TouchableWithoutFeedback).

═══════════════════════════════════════════════════════════════════════
12. SCROLL-FEEL — iOS-nativ
═══════════════════════════════════════════════════════════════════════
- Alle langen Listen als FlatList (kein ScrollView bei variablen Daten).
- showsVerticalScrollIndicator={false} überall.
- bounces={true} (iOS Default — explizit sicherstellen, nicht deaktivieren).
- Keine Custom-Scroll-Events außer für Sticky-Header-Opacity in der Session:
  Sticky Header blendet einen leichten Surface-Hintergrund ein, wenn gescrollt
  wird (onScroll → useSharedValue scrollY → Header-Opacity withTiming).
- Workout-Session FlatList: contentContainerStyle paddingBottom für den
  sticky "FINISH WORKOUT"-Button.

═══════════════════════════════════════════════════════════════════════
DEFINITION OF DONE
═══════════════════════════════════════════════════════════════════════
- Kein einziger abrupter State-Wechsel ohne visuelle Transition.
- 60fps auf iPhone 12 oder neuer (kein JS-Thread-Blocking, alles Worklet/nativ).
- pnpm typecheck ✅, pnpm lint ✅, pnpm test ✅.
- Manuelle Prüfliste (pnpm dev, auf iOS-Simulator oder Gerät testen):
  [ ] Set abhaken → Checkbox füllt, Row dimmt, Rest-Timer erscheint smooth.
  [ ] PR erreichen → goldene Border pulsiert, Haptik stark.
  [ ] Achievement → Celebration-Modal federt ein.
  [ ] Set / Exercise swipe-to-delete → sauber, kein Zucken.
  [ ] Skeleton → Shimmer läuft, kein weißer Flash.
  [ ] Chart-Tap → Tooltip erscheint, Haptik.
  [ ] Tastatur im Workout → Liste schiebt sich hoch, nichts verdeckt.
  [ ] Tab-Icon → Spring-Bounce beim Wechsel.
- Review-Report in docs/reviews/feat-ui-animations-ux.md.
- Mission-Board auf 🟢, Branch in REVIEW-QUEUE. NICHT nach main mergen.

Zeige mir zuerst einen 1-Absatz-Plan (welche Dateien du anfasst, in welcher
Reihenfolge), dann warte auf mein "Go".
```
