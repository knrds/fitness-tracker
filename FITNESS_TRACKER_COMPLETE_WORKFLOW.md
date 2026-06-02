# FITNESS TRACKER — KOMPLETTER WORKFLOW
## Von aktuellem Stand bis zur fertigen App
### Alle Prompts, Schritte und Anweisungen

---

## INHALT
1. Aktueller Stand
2. Setup: Multi-Agent-System (Worktrees + Rollen)
3. Standard-Workflow (gilt für jede Mission)
4. Rollen-Prompts (dauerhaft speichern)
5. Mission-Board Setup
6. BLOCK 1 — Kern vervollständigen (Missionen 6–9)
7. BLOCK 2 — Erste Stabilisierung mit Codex
8. BLOCK 3 — Design-Fundament
9. BLOCK 4 — Premium UI
10. BLOCK 5 — Backend & Sync (Supabase)
11. BLOCK 6 — Social & Community
12. BLOCK 7 — Marketplace & Coaching
13. BLOCK 8 — Zweite Härtung
14. BLOCK 9 — Qualität & Konsistenz
15. BLOCK 10 — Release-Vorbereitung
16. Notfall-Prompts
17. Reihenfolge-Checkliste

---

## 1. AKTUELLER STAND

Folgendes ist fertig und auf `main` gemerged:

- ✅ Monorepo (Expo 52, pnpm workspaces, TypeScript strict)
- ✅ Datenmodell (11 Tabellen, alle Types, Zod-Schemas)
- ✅ AGENTS.md + CLAUDE.md + GEMINI.md
- ✅ Skills (.agent/skills/)
- ✅ Test-Infrastruktur (Vitest + Jest + CI)
- ✅ Exercise Library (107 Übungen, Store, Screens)
- ✅ Workout Logger (Session, Sets, RestTimer)
- ✅ Program Builder (Templates, Trainingstage)
- ✅ History + Progress (Charts, PR-Tracker, Streaks)
- ✅ Mission 6: Stabilisierung + Templates
- ✅ Mission 7: Achievements + Gamification

---

## 2. SETUP: MULTI-AGENT-SYSTEM

### Git Worktrees anlegen (einmalig)

```powershell
cd C:\Users\Konrad\fitness-tracker

git worktree add ../ft-designer feat/designer-work
git worktree add ../ft-debugger fix/debugger-work
```

Du hast danach drei Ordner:
- `fitness-tracker` → Builder (Gemini #1, Antigravity Fenster 1)
- `ft-designer` → Designer (Gemini #2, Antigravity Fenster 2)
- `ft-debugger` → Debugger (Codex, Terminal Fenster 3)

### In Antigravity

Drei separate Fenster öffnen:
- Fenster 1: `File → Open Folder → fitness-tracker`
- Fenster 2: `File → Open Folder → ft-designer`
- Fenster 3: Terminal für Codex

### Mission-Board und Queue-Dateien anlegen

Im Gemini Chat (Fenster 1):

```
Lies AGENTS.md. Erstelle folgende Dateien:

1. docs/mission-board.md:
   # Mission Board
   ## LEGENDE: 🔵 TODO · 🟡 IN ARBEIT · 🟢 FERTIG (review nötig) · ✅ GEMERGED
   ## BUILDER (Gemini #1)
   🔵 Mission 7: Achievements + XP
   🔵 Mission 8: Body Tracking
   🔵 Mission 9: Workout-Verbesserungen
   ## DESIGNER (Gemini #2)
   🔵 Design-Konzept → docs/design-system.md
   🔵 Premium Workout-UI
   🔵 Home-Dashboard
   ## DEBUGGER (Codex)
   🔵 Bug-Jagd nach Builder-Merges
   🔵 TypeScript-Härtung
   ## REVIEW-QUEUE
   (Agenten tragen fertige Branches hier ein)

2. docs/debugger-queue.md:
   # Debugger Queue
   (Builder trägt hier Bugs ein die er nicht lösen kann)

3. docs/reviews/ (leerer Ordner mit .gitkeep)

Committe mit: chore: add mission board and agent coordination files
```

---

## 3. STANDARD-WORKFLOW (JEDE MISSION)

### Vor jeder Mission
```powershell
git checkout main
git pull
```

### Nach jeder Mission
```powershell
git add .
git commit -m "feat: [mission-name]"
git push origin [branch-name]
```
→ GitHub: PR erstellen → kurz Diff prüfen → Merge
```powershell
git checkout main
git pull
```

### Testen vor jedem Merge
```powershell
pnpm dev     # App starten, manuell testen
pnpm test    # alle Tests grün?
pnpm typecheck  # TypeScript sauber?
```

### AGENTS.md aktuell halten (alle 3-4 Missionen)
```
Aktualisiere AGENTS.md mit dem aktuellen Projektstand.
Was ist neu hinzugekommen? Welche Stores, Screens, 
Dependencies gibt es jetzt?
```

---

## 4. ROLLEN-PROMPTS (DAUERHAFT SPEICHERN)

Diese Prompts am Anfang jeder neuen Session für den jeweiligen Agenten.

### BUILDER-ROLLEN-PROMPT (Gemini #1)
```
Du bist der Builder-Agent für das Fitness-Tracker-Projekt.

Deine Aufgaben:
- Neue Features implementieren
- Auf Branch-Namespace feat/* arbeiten
- NIE auf fix/*, design/*, oder main arbeiten

Dein Workflow pro Mission:
1. Lies AGENTS.md vollständig
2. Lies das Briefing aus docs/briefings/ falls vorhanden
3. Erstelle den Branch (feat/[mission-name])
4. Implementiere mit Tests parallel
5. Führe pnpm test + pnpm typecheck aus
6. Schreibe Review-Report in docs/reviews/[branch-name].md
7. Setze Status im mission-board.md auf 🟢
8. Trage den Branch in die REVIEW-QUEUE ein
9. NIEMALS nach main mergen
10. Nimm dir die nächste 🔵 TODO-Mission vom Board

Bei unlösbaren Bugs: in docs/debugger-queue.md eintragen,
weitermachen mit der nächsten Mission.
```

### DESIGNER-ROLLEN-PROMPT (Gemini #2)
```
Du bist der Designer-Agent für das Fitness-Tracker-Projekt.

Deine Aufgaben:
- UI, Design, Animationen, Visual Polish
- Auf Branch-Namespace feat/ui-* und feat/design-* arbeiten
- NIE Store-Logik, Types oder Backend anfassen
- Nur UI-Dateien: screens, components, styles, themes

Dein Workflow pro Mission:
1. Lies AGENTS.md und docs/design-system.md (falls vorhanden)
2. Erstelle den Branch (feat/ui-[name])
3. Zeige mir einen kurzen Plan BEVOR du anfängst (1 Paragraph)
4. Warte auf "Go" dann implementiere
5. pnpm test + pnpm typecheck
6. Status auf 🟢 setzen, Branch in REVIEW-QUEUE

Grundsätze:
- Kein generisches AI-Design
- Dark Mode immer mitdenken
- react-native-reanimated für Animationen
- Konsistent mit docs/design-system.md
```

### DEBUGGER-ROLLEN-PROMPT (Codex)
```
Du bist der Debugger-Agent für das Fitness-Tracker-Projekt.

Deine Aufgaben:
- Bugs finden und fixen
- Edge Cases abdecken
- TypeScript härten
- Tests schreiben
- Auf Branch-Namespace fix/* arbeiten

Dein Workflow:
1. Lies AGENTS.md
2. Prüfe docs/debugger-queue.md auf gemeldete Bugs
3. Prüfe docs/mission-board.md REVIEW-QUEUE auf zu reviewende Branches
4. Wenn Queue leer: review den letzten gemergten Branch auf:
   - Race Conditions, Null-Checks, Memory Leaks
   - TypeScript any-Types
   - Ungetestete kritische Pfade
   - Edge Cases (leere States, ungültige Inputs)
5. Fixe kritische Findings
6. Schreibe Review-Report in docs/reviews/[branch]-debug.md
7. Branch-Name: fix/[was-gefixt]
8. NIEMALS nach main mergen
```

### OVERSEER-ROLLEN-PROMPT (Claude)
```
Du bist der Overseer für das Fitness-Tracker-Projekt.
Du schreibst KEINEN Code. Du planst, koordinierst und reviewst.

Lies:
1. AGENTS.md
2. docs/mission-board.md
3. docs/reviews/ (alle Review-Reports)
4. docs/roadmap.md falls vorhanden

Deine Aufgaben:
1. Erstelle Briefings für die nächsten 2-3 Missionen pro Agent
   in docs/briefings/[agent]-[mission].md
2. Reviewe fertige Branches auf Konzept-Ebene (nicht Zeile für Zeile)
3. Entscheide ob ein Branch merge-ready ist
4. Erkenne wenn Agenten aneinander vorbeibauen
5. Aktualisiere das Mission Board
6. Melde Blockaden und schlage Lösungen vor

Antworte NUR mit:
- Briefing-Dateien
- Board-Updates
- Klaren Ja/Nein-Entscheidungen für Merges
- Kurzen Korrekturhinweisen
```

---

## 5. MISSION-BOARD SETUP

Paste in Gemini #1 einmalig:

```
Erstelle docs/briefings/ als Verzeichnis.
Schreibe für diese Missionen je ein Briefing-Dokument:

docs/briefings/builder-mission7.md: Achievements + Gamification
docs/briefings/builder-mission8.md: Body Tracking + Profil
docs/briefings/builder-mission9.md: Workout-Verbesserungen
docs/briefings/designer-design-system.md: Design-Konzept
docs/briefings/designer-workout-ui.md: Premium Workout-Screen
docs/briefings/designer-home-dashboard.md: Home-Dashboard

Jedes Briefing enthält:
- Branch-Name
- Ziel (2 Sätze)
- Akzeptanzkriterien (testbar, als Checkboxen)
- Betroffene Dateien
- Was NICHT zu tun ist
- Definition of Done

Committe mit: chore: add mission briefings
```

---

## 6. BLOCK 1 — KERN VERVOLLSTÄNDIGEN

### Mission 6: Stabilisierung + Templates (läuft, falls nicht fertig)
```
Lies AGENTS.md. Branch: feat/stabilization

KRITISCH:
1. Prüfe ob historyStore.addSession korrekt aufgerufen wird
   wenn workoutStore.finishWorkout() ausgelöst wird.
   Fix falls nicht.

2. Workout als Template speichern: nach finishWorkout():
   Dialog "Als Template speichern?" → Name eingeben →
   als WorkoutTemplate in programStore. Platform.OS web-safe.

3. Template direkt starten: neuer "Quick Start" Bereich
   im Home-Tab, gespeicherte Templates anzeigen,
   direkter Start als neue Session.

4. Tab-Navigation: alle 5 Tabs prüfen und sichtbar machen
   (Home, Exercises, Workout, Programs, History/Progress)

pnpm test + pnpm typecheck. Merge nicht nach main.
```

### Mission 7: Achievements + Gamification
```
Lies AGENTS.md. Branch: feat/achievements

achievementStore.ts (Zustand + MMKV):
- Achievement-Typen mit Bedingungen und Fortschritt
- Achievements: erstes Workout, 10/50/100 Workouts,
  7-Tage-Streak, 30-Tage-Streak, erster PR, 10 PRs,
  Volumen-Meilensteine (10.000kg/50.000kg total),
  alle Muskelgruppen trainiert, 30 verschiedene Übungen

XP-System:
- Workout beenden: +50 XP Basis + Bonus für Volumen
- PR erreichen: +100 XP
- Level-Berechnung: Level = floor(XP / 500) + 1
- Level-Up-Erkennung

AchievementsScreen (neuer Tab oder unter Progress):
- Freigeschaltete Achievements (mit Datum)
- Gesperrte Achievements (mit Fortschrittsbalken)
- Aktuelles Level + XP + XP bis nächstes Level

Hook useAchievementCheck:
- Nach jedem finishWorkout() aufrufen
- Prüft alle Bedingungen
- Gibt Array neue Achievements zurück
- Integration in workoutStore

Toast/Modal bei neuem Achievement

Tests für achievementStore (Bedingungen, XP-Berechnung, Level)
pnpm test. Merge nicht nach main.
```

### Mission 8: Body Tracking + Profil
```
Lies AGENTS.md. Branch: feat/body-tracking

bodyMetricStore.ts (Zustand + MMKV):
- Nutze BodyMetric type aus packages/domain
- addMetric, getMetricHistory, getLatestMetric
- Unterstütze: Gewicht, Körperfett %, Maße (Brust, Taille, Hüfte, Arme, Beine)

BodyTrackingScreen (/app/(tabs)/body.tsx):
- Metrik eingeben (Datum, Wert, Einheit)
- Gewichtsverlauf-Chart
- Körperfett-Chart
- Maße-Übersicht

ProfileScreen (/app/profile.tsx):
- Name, Trainingsziel, Erfahrungslevel, Einheiten (kg/lbs)
- Gespeichert in MMKV (profileStore)
- Gesamt-Statistiken: total Workouts, total Volumen, längster Streak

Settings:
- Einheiten umschalten metrisch/imperial (alle Stores reagieren)
- Alle Daten löschen (mit Bestätigung)
- Daten exportieren als JSON

Tests für bodyMetricStore + profileStore
pnpm test. Merge nicht nach main.
```

### Mission 9: Workout-Verbesserungen
```
Lies AGENTS.md. Branch: feat/workout-improvements

1. Previous Performance:
   Bei jeder Übung in der aktiven Session: zeige das Ergebnis
   des letzten Mals (Gewicht x Wiederholungen, Datum).
   Hole Daten aus historyStore.

2. Set-Typen:
   Jedes Set kann markiert werden als:
   Warmup (W), Arbeitssatz (Standard), Drop-Set (D), Failure (F)
   Visuell unterscheidbar in der SessionExerciseCard.

3. Plate Calculator:
   Modal oder Drawer: Zielgewicht eingeben →
   zeige welche Scheiben (beidseitig) für eine Standardhantel (20kg)
   Verfügbare Scheiben: 1.25, 2.5, 5, 10, 15, 20, 25kg

4. Workout-Notiz:
   Textfeld am Ende der Session für eine Gesamt-Notiz.
   In WorkoutSession gespeichert.

5. Supersätze:
   Zwei Übungen als Superset markieren/gruppieren.
   Visuell in SessionExerciseCard durch Linie/Klammer verbunden.

6. Rest Timer Verbesserung:
   Standard-Pausenzeit pro Übung konfigurierbar (im Exercise-Detail).
   Rest Timer startet automatisch nach Set-Abschluss.

Tests. pnpm test. Merge nicht nach main.
```

---

## 7. BLOCK 2 — ERSTE STABILISIERUNG (Codex)

**Starte Codex im Terminal:**
```powershell
cd C:\Users\Konrad\ft-debugger
codex
```

### Codex: Bug-Jagd
```
Lies AGENTS.md. Branch: fix/codex-bugfixes

Gehe systematisch durch alle Stores und Screens:
apps/mobile/src/stores/
apps/mobile/app/

Prüfe auf:
- Race Conditions bei async State-Updates
- Fehlende null/undefined Checks
- MMKV-Persistenz die nach App-Neustart bricht
- Navigation die ins Leere läuft (router.navigate auf nicht existente Route)
- State der nach Session nicht zurückgesetzt wird
- Timer/Listener die nicht aufgeräumt werden (useEffect cleanup)
- Doppelte Klicks auf Buttons die doppelte Aktionen auslösen

Erstelle docs/bug-report.md mit priorisierter Liste.
Fixe alle KRITISCH und HOCH eingestuften Bugs.
Zeige jeden Fix als Diff.
pnpm test. Merge nicht nach main.
```

### Codex: Edge-Case-Härtung
```
Lies AGENTS.md und docs/bug-report.md. Branch: fix/edge-cases

Teste und fixe diese konkreten Szenarien:
- Workout beenden ohne eine einzige Übung
- Set loggen ohne Gewicht oder Wiederholungen (Feld leer)
- Übung 3x hinzufügen (Duplikat-Handling)
- Session mit 30+ Übungen (Performance)
- Leere Exercise Library (Seed-Daten nicht vorhanden)
- Leere History (noch kein Workout beendet)
- Negatives Gewicht oder Text in Zahlenfeld eingeben
- App schließen und neu öffnen mitten in aktiver Session
- Sehr schnelles Tippen auf "Finish Workout"

Schreibe für jeden Fall einen Test der das Szenario abdeckt.
Tests müssen bestehen. pnpm test. Merge nicht nach main.
```

### Codex: TypeScript-Härtung
```
Lies AGENTS.md. Branch: fix/typescript-hardening

Finde und eliminiere alle TypeScript-Schwächen:
- Alle `any` Types ersetzen durch korrekte Types aus
  packages/domain/src/types/index.ts
- Alle non-null assertions (!) begründen oder entfernen
- Fehlende Return-Types bei Funktionen ergänzen
- Discriminated Unions einführen wo sinnvoll
  (z.B. für Set-Typen, Achievement-Typen)
- Strict Null Checks überall einhalten

Führe aus: pnpm typecheck
Muss strikt grün sein ohne Warnings.
Merge nicht nach main.
```

---

## 8. BLOCK 3 — DESIGN-FUNDAMENT (Gemini #2)

### Designer: Design-Konzept
```
Lies AGENTS.md. Branch: feat/design-concept

ERST KONZEPT, DANN WARTEN AUF MEIN OK.

Entwickle ein Design-Konzept für den Fitness-Tracker.
Erstelle docs/design-system.md mit:

Farbpalette (für Dark Mode primär, Light Mode sekundär):
- Primär: kraftvoll, motivierend (kein generisches Blau)
- Akzent: Erfolg, PRs, Achievements
- Neutral: Hintergründe, Cards, Borders
- Semantisch: Erfolg/Warnung/Fehler

Typografie:
- Display: für große Zahlen (Gewichte, Level, Streak)
- Heading: für Screen-Titel
- Body: für Listen, Beschreibungen
- Caption: für Labels, Metadaten

Spacing-System: 4/8/12/16/24/32/48px

Komponenten-Stil:
- Border-Radius-Skala
- Schatten-Stufen
- Card-Stil
- Button-Varianten (Primary, Secondary, Ghost, Danger)

Aesthetik: modern, kraftvoll, premium.
Zielgruppe: ambitionierte Kraftsportler.
Referenz-Feel: zwischen Hevy und einem High-End Sport-Brand.
KEIN generisches weißes Design mit lila Akzenten.

Zeige mir das Konzept als Markdown. Warte auf mein "Go".
```

### Mission 18: Design-System implementieren (nach Go)
```
Lies AGENTS.md und docs/design-system.md. Branch: feat/design-system

Implementiere das Design-System:

1. packages/ui/src/theme.ts:
   Alle Farben, Spacing, Typografie als TypeScript-Objekt
   useColorScheme() Hook für Dark/Light Mode
   ThemeProvider Komponente

2. packages/ui/src/components/:
   Button.tsx (Primary, Secondary, Ghost, Danger, Loading-State)
   Card.tsx (Standard, Pressable)
   Input.tsx (mit Label, Error-State, HelperText)
   Badge.tsx (für Muskelgruppen, Equipment, Set-Typen)
   Modal.tsx (Standard-Modal mit Header und Actions)
   EmptyState.tsx (Illustration + Text + optionaler CTA)
   LoadingSkeleton.tsx (Placeholder für Listen)

3. Alle bestehenden Screens schrittweise auf Theme umstellen:
   Fange mit HomeScreen und ExerciseListScreen an.
   Verwende ThemeProvider in _layout.tsx.

4. Dark Mode automatisch via System-Einstellung.

pnpm test + pnpm typecheck. Merge nicht nach main.
```

---

## 9. BLOCK 4 — PREMIUM UI (Gemini #2)

### Premium Workout-Screen
```
Lies AGENTS.md und docs/design-system.md.
Branch: feat/ui-premium-workout

Gestalte den aktiven Workout-Screen erstklassig:

Layout:
- Sticky Header: Workout-Name + laufender Timer + Finish-Button
- Fortschrittsbalken (erledigte Sets / gesamt)
- FlatList der Übungen (kein ScrollView)

SessionExerciseCard neu:
- Übungsname groß und prominent
- Previous Performance direkt darunter in Mutedfarbe
- Set-Zeilen: Nummer | Gewicht | Wiederh. | RPE | ✓
- Dicke Touch-Targets (min 44x44px)
- Swipe-to-delete für Sets (react-native-gesture-handler)
- Set-Abschluss: kurze Shake/Scale-Animation + Haptik

Rest Timer:
- Kreis-Animation (SVG oder Animated.View)
- Große Zeitanzeige in der Mitte
- +30s / -10s Buttons
- Farbe wechselt: grün → gelb → rot je nach verbleibender Zeit

Add Exercise Button:
- Prominent am Ende der Liste
- Öffnet ExercisePickerModal mit Suche

Nutze react-native-reanimated für alle Animationen.
Nutze expo-haptics für Haptik.
pnpm test. Merge nicht nach main.
```

### Home-Dashboard
```
Lies AGENTS.md und docs/design-system.md.
Branch: feat/ui-home-dashboard

Baue einen erstklassigen Home-Screen:

Header-Bereich:
- Personalisierte Begrüßung (Name aus profileStore)
- Aktuelle Streak prominent angezeigt (Flammen-Emoji + Zahl)
- Aktuelles Level + XP-Balken

"Heute" Card:
- Heutiges Workout aus aktivem Programm
- Übungsvorschau (erste 3 Übungen)
- Großer "Starten" Button
- Falls kein Programm aktiv: "Programm auswählen" CTA

Wochen-Übersicht:
- 7 Kreise für Mo-So
- Trainierte Tage: gefüllt/farbig
- Heutiger Tag: hervorgehoben

Letzte Aktivität:
- Letztes Workout: Name, Datum, Dauer, Übungsanzahl
- Tap → navigiert zu WorkoutDetail in History

Nächste Achievements:
- 2-3 Achievements kurz vor Freischaltung
- Mini-Fortschrittsbalken

Quick Actions:
- "Schnell-Workout" (leere Session starten)
- "Übung suchen"
- "Programm" (zu Programs Tab)

pnpm test. Merge nicht nach main.
```

### Progress-Charts aufwerten
```
Lies AGENTS.md und docs/design-system.md.
Branch: feat/ui-premium-charts

Werte die Progress-Ansicht auf:

Zeitraum-Filter:
- Tabs oder Segmented Control: 7T / 1M / 3M / 1J / Alles

Charts:
- Volumen über Zeit (Linien-Chart) pro Übung oder gesamt
- 1RM-Entwicklung (geschätzter 1RM via Epley-Formel)
- Trainings-Heatmap-Kalender (wie GitHub Contributions:
  Raster der letzten 12 Wochen, Farbe = Trainingsvolumen)
- Muskelgruppen-Verteilung (Donut-Chart der letzten 4 Wochen)

PR-Timeline:
- Chronologische Liste aller PRs mit Delta zum vorherigen

Statistik-Karten:
- Diese Woche vs. letzte Woche (Workouts, Volumen, Sets)
- Mit Trend-Pfeil (hoch/runter/gleich)

Alle Charts interaktiv (Tap auf Datenpunkt zeigt Wert).
pnpm test. Merge nicht nach main.
```

### Micro-Interactions
```
Lies AGENTS.md und docs/design-system.md.
Branch: feat/ui-micro-interactions

Mache die App lebendig:

1. Haptisches Feedback (expo-haptics):
   - Set abhaken: Light Impact
   - PR erreicht: Heavy Impact + Success Notification
   - Workout beenden: Medium Impact
   - Achievement: Success Notification

2. PR-Erkennung in Echtzeit:
   Wenn ein Set ein PR ist (besser als bisheriger PR):
   Visuelles Highlight auf dem Set (goldene Umrandung + Badge)
   Haptisches Feedback

3. Achievement-Unlock Celebration:
   react-native-confetti-cannon oder custom Konfetti
   Modal mit Achievement-Name, Icon, Beschreibung
   XP-Gewinn animiert eingeblendet

4. Skeleton-Loader:
   LoadingSkeleton.tsx Komponente für alle Listen
   Beim initialen Laden anstatt Spinner

5. Empty-States mit Persönlichkeit:
   Exercises: "Noch keine Favoriten" mit motivierendem Text
   History: "Noch kein Workout beendet — leg los!"
   Progress: "Beende dein erstes Workout um Fortschritt zu sehen"
   Alle mit passendem Icon aus @expo/vector-icons

6. Button-Press-States:
   Scale 0.96 beim Drücken (react-native-reanimated)
   Auf allen Pressable-Komponenten

7. Pull-to-Refresh:
   In History und Progress mit custom Animation

pnpm test. Merge nicht nach main.
```

---

## 10. BLOCK 5 — BACKEND & SYNC

### MANUELL VOR MISSION 10:
1. Auf supabase.com: Neues Projekt anlegen
2. SQL Editor: Inhalt von `docs/schema.sql` ausführen
3. Settings → API: URL und anon key kopieren
4. In Antigravity Terminal:
   ```powershell
   cd apps/mobile
   echo "EXPO_PUBLIC_SUPABASE_URL=deine-url" > .env
   echo "EXPO_PUBLIC_SUPABASE_ANON_KEY=dein-key" >> .env
   ```

### Mission 10: Supabase Auth
```
Lies AGENTS.md und docs/schema.sql. Branch: feat/supabase-auth

WICHTIG: .env Datei existiert bereits mit den Keys.
Verwende process.env.EXPO_PUBLIC_SUPABASE_URL etc.
Committe die .env NIEMALS (ist in .gitignore).

Implementiere:

1. packages/db/src/client.ts:
   Supabase Client mit den Env-Variablen
   Export: supabase

2. authStore.ts (Zustand):
   session: Session | null
   user: User | null
   isLoading: boolean
   signUp(email, password)
   signIn(email, password)
   signOut()
   onAuthStateChange listener

3. AuthScreen (/app/auth.tsx):
   Tab-Switch: Login / Registrierung
   Email + Passwort Felder
   Fehler-Anzeige (falsches Passwort, bereits registriert)
   Passwort-Zurücksetzen Link (Supabase Magic Link)
   Web-safe (kein nativer KeyboardAvoidingView nötig)

4. Auth-Guard in _layout.tsx:
   Wenn !session → AuthScreen anzeigen
   Wenn session → normale App

5. Session-Persistenz:
   AsyncStorage oder MMKV für Session-Token
   Automatisch einloggen bei App-Start

pnpm test. .env nicht committen. Merge nicht nach main.
```

### Mission 11: Cloud Sync
```
Lies AGENTS.md. Branch: feat/cloud-sync

Baue bidirektionalen Sync zwischen MMKV und Supabase.

Sync-Strategie: Offline-First mit Sync-Queue

syncStore.ts:
- queue: SyncOperation[] (gespeichert in MMKV)
- isSyncing: boolean
- lastSyncAt: Date | null
- isOnline: boolean (NetInfo)
- addToQueue(operation)
- processQueue() — sendet ausstehende Ops an Supabase
- pullFromCloud() — lädt Cloud-Daten beim Login

SyncOperation Type:
  { id, table, operation: 'INSERT'|'UPDATE'|'DELETE',
    payload, createdAt, retryCount }

Integration in bestehende Stores:
- workoutStore: finishWorkout() → addToQueue
- exerciseStore: Custom Exercise → addToQueue
- bodyMetricStore: addMetric → addToQueue
- programStore: createProgram/updateProgram → addToQueue

Conflict Resolution:
- last-write-wins basierend auf updated_at Timestamp
- Bei Konflikt: lokale Version gewinnt wenn neuer

Sync-Status-Indikator:
- Kleine Statusanzeige im Header (synced ✓ / syncing ⟳ / offline ✗)

pullFromCloud beim ersten Login:
- Alle bestehenden Supabase-Daten in lokale Stores laden

pnpm test. Merge nicht nach main.
```

---

## 11. BLOCK 6 — SOCIAL & COMMUNITY

### Mission 12: Profile + Follows
```
Lies AGENTS.md. Branch: feat/social-profiles

WICHTIG: Schema NICHT ändern. Erstelle stattdessen
docs/schema_social.sql als ADDITIVE Migration:
CREATE TABLE IF NOT EXISTS profiles (...)
CREATE TABLE IF NOT EXISTS follows (...)
Führe diese SQL manuell in Supabase aus BEVOR du anfängst.

Implementiere:

profileStore (erweitert):
- fetchPublicProfile(userId)
- updateProfile(username, bio, avatarUrl)
- searchUsers(query)
- followUser(userId)
- unfollowUser(userId)
- getFollowers(userId)
- getFollowing(userId)

Screens:
- /app/profile/[id].tsx: öffentliches Profil
  Username, Bio, Stats, letzte öffentliche Workouts
  Follow/Unfollow Button (wenn nicht eigenes Profil)
- /app/profile/edit.tsx: eigenes Profil bearbeiten
- /app/search.tsx: User-Suche mit Debounce

pnpm test. Merge nicht nach main.
```

### Mission 13: Activity Feed
```
Lies AGENTS.md. Branch: feat/activity-feed

Additive Schema-Migration (docs/schema_feed.sql):
CREATE TABLE IF NOT EXISTS workout_posts (...)
CREATE TABLE IF NOT EXISTS post_likes (...)
CREATE TABLE IF NOT EXISTS post_comments (...)
Manuell in Supabase ausführen.

Beim Workout beenden: Option "Öffentlich teilen" (Toggle)
Wenn öffentlich: wird als workout_post gespeichert

FeedScreen (/app/(tabs)/feed.tsx):
- Workouts der gefolgten User
- Pagination (10 Posts pro Page, Infinite Scroll)
- Pull-to-Refresh

WorkoutPost-Komponente:
- User-Avatar + Name + Datum
- Workout-Name, Dauer
- Top 3 Übungen mit Volumen
- PR-Badges falls erzielt
- Like-Button + Like-Zahl
- Kommentar-Button → Kommentare-Modal

feedStore.ts (Zustand):
- Daten aus Supabase laden
- Optimistisches UI für Likes

pnpm test. Merge nicht nach main.
```

### Mission 14: Challenges + Leaderboards
```
Lies AGENTS.md. Branch: feat/challenges

Additive Schema-Migration (docs/schema_challenges.sql):
CREATE TABLE IF NOT EXISTS challenges (...)
CREATE TABLE IF NOT EXISTS challenge_participants (...)
Manuell ausführen.

challengeStore.ts:
- Aktive Challenges laden
- Challenge beitreten/verlassen
- Eigenen Fortschritt aktualisieren (nach Workout)

ChallengesScreen (/app/(tabs)/challenges.tsx):
- Aktive Challenges mit Fortschrittsbalken
- "Challenge beitreten" Button
- Leaderboard pro Challenge (Top 10)

Globale Leaderboards (/app/leaderboard.tsx):
- Filter: Diese Woche / Diesen Monat
- Sortierung: nach Volumen / Workouts / Streak
- Eigene Position hervorheben

Challenge-Typen (hardcoded als Seed):
- "Workout-Woche": 5 Workouts in 7 Tagen
- "Volumen-König": 50.000kg in einem Monat
- "Streak-Meister": 14-Tage-Streak

pnpm test. Merge nicht nach main.
```

---

## 12. BLOCK 7 — MARKETPLACE & COACHING

### Mission 15: Programm-Marketplace
```
Lies AGENTS.md. Branch: feat/marketplace-browse

Additive Schema-Migration (docs/schema_marketplace.sql):
ALTER TABLE programs ADD COLUMN IF NOT EXISTS is_published BOOLEAN DEFAULT false;
ALTER TABLE programs ADD COLUMN IF NOT EXISTS price_cents INTEGER DEFAULT 0;
ALTER TABLE programs ADD COLUMN IF NOT EXISTS description TEXT;
CREATE TABLE IF NOT EXISTS program_reviews (...)
CREATE TABLE IF NOT EXISTS program_purchases (...)
Manuell ausführen.

marketplaceStore.ts:
- fetchPublishedPrograms(filter)
- fetchProgramDetail(programId)
- purchaseProgram(programId) [kostenlos vorerst: kopiert es]
- addReview(programId, stars, text)

MarketplaceScreen (/app/(tabs)/marketplace.tsx):
- Suche + Filter (Ziel, Dauer, Level, Kostenlos/Bezahlt)
- Programm-Karten mit Autor, Bewertung, Dauer, Preis

ProgramDetailScreen (/app/marketplace/[id].tsx):
- Vollständige Beschreibung
- Trainingsplan-Vorschau (erster Trainingstag)
- Creator-Info mit Profillink
- Bewertungen + Durchschnitt
- "Jetzt holen" Button (kostenlos: sofort, bezahlt: Stripe später)

Eigenes Programm veröffentlichen:
- Toggle "Veröffentlichen" im Program Builder
- Preis setzen (0 = kostenlos)

pnpm test. Merge nicht nach main.
```

### Mission 16: Creator-Profile
```
Lies AGENTS.md. Branch: feat/creator-profiles

Additive Schema-Migration (docs/schema_creators.sql):
CREATE TABLE IF NOT EXISTS creator_profiles (...)
CREATE TABLE IF NOT EXISTS coaching_offers (...)
Manuell ausführen.

"Creator werden" Flow (/app/creator/onboarding.tsx):
- Kurzes Formular: Bio, Spezialisierung, Zertifizierungen
- Erstellt creator_profile in Supabase

Creator-Profil-Seite (erweitert /app/profile/[id].tsx):
- Creator-Badge
- Angebotene Programme
- Coaching-Angebote

Coaching-Angebote:
- Angebot erstellen: Titel, Beschreibung, Dauer, Preis
- Angebots-Karte in Creator-Profil
- "Anfragen" Button → öffnet Nachricht (vorerst Email-Link)

Creator-Dashboard (/app/creator/dashboard.tsx):
- Eigene veröffentlichte Programme
- Download-Zahlen + Bewertungs-Durchschnitt
- Coaching-Anfragen

pnpm test. Merge nicht nach main.
```

### Mission 17: Bezahlung (Stripe Test-Modus)
```
Lies AGENTS.md. Branch: feat/payments

WICHTIG: Nur Test-Modus. Keine echten Zahlungen.
Frage mich nach den Test-Keys bevor du anfängst.

Stripe-Integration:
- @stripe/stripe-react-native installieren
- Checkout-Flow für kostenpflichtige Programme
- PaymentSheet mit Test-Karten (4242 4242 4242 4242)
- Successful Purchase → Eintrag in program_purchases → Zugang

Besitzlogik:
- marketplaceStore.ownedProgramIds (aus Supabase geladen)
- Programm-Detail: "Kaufen" Button nur wenn nicht besessen
- Gekaufte Programme tauchen in eigenen Programmen auf

Kaufhistorie (/app/purchases.tsx):
- Liste gekaufter Programme mit Datum und Preis

Dokumentiere in docs/payments-setup.md:
- Was für Production nötig ist (Stripe Dashboard, Webhooks)
- Revenue-Share-Logik Idee (z.B. 70/30)
- Apple/Google Store IAP als Alternative

pnpm test. Merge nicht nach main.
```

---

## 13. BLOCK 8 — ZWEITE HÄRTUNG (Codex)

### Performance-Profiling
```
Lies AGENTS.md. Branch: fix/performance

Analysiere und optimiere Performance:

1. Re-Render-Analyse:
   Füge temporär warum-renderst-du-dich Logging hinzu.
   Finde Komponenten die zu oft rendern.
   Fixe mit React.memo, useMemo, useCallback.

2. FlatList-Optimierung:
   Alle ScrollView mit langen Listen → FlatList
   getItemLayout wo möglich
   keyExtractor optimieren
   windowSize und maxToRenderPerBatch tunen

3. Store-Selector-Optimierung:
   Stores die den gesamten State zurückgeben → schmale Selektoren
   Zustand's subscribeWithSelector verwenden

4. Bundle-Analyse:
   pnpm --filter @fitness-tracker/mobile exec expo export
   Prüfe was groß ist, dokumentiere

5. Ergebnis:
   docs/performance-report.md mit Vorher/Nachher
   
pnpm test. Merge nicht nach main.
```

### Security-Audit (nach Social/Marketplace)
```
Lies AGENTS.md. Branch: fix/security-audit

Prüfe alle Supabase-Interaktionen auf Security:

1. RLS-Policies:
   Jede Tabelle hat RLS aktiviert?
   user_id = auth.uid() überall korrekt?
   Keine Daten anderer User lesbar ohne Follow?

2. Input-Validierung:
   Alle User-Inputs durch Zod-Schema validiert
   bevor sie an Supabase gehen?

3. API-Keys:
   EXPO_PUBLIC_ Keys sind wirklich nur public-safe?
   Kein secret key im Frontend?

4. Marketplace:
   Kann ein User fremde Purchases erstellen?
   Kann ein User Preise manipulieren?

5. Social:
   Kann ein User für andere liken/folgen?
   Kann ein User fremde Posts löschen?

Dokumentiere Findings in docs/security-audit.md.
Fixe alle kritischen Findings.
pnpm test. Merge nicht nach main.
```

---

## 14. BLOCK 9 — QUALITÄT & KONSISTENZ

### End-to-End-Durchlauf
```
Lies AGENTS.md. Branch: test/e2e-flows

Teste die komplette User-Journey und dokumentiere alles.

Flow 1 — Neuer User:
Onboarding → Profil anlegen → erstes Programm aus Marketplace →
Workout starten → Übungen hinzufügen → Sets loggen →
PR erreichen → Workout beenden → Achievement prüfen →
History prüfen → Progress-Charts prüfen

Flow 2 — Bestehender User:
Login → Cloud-Sync prüft → Template starten →
Superset loggen → Rest Timer → Workout beenden →
Workout teilen → Feed prüfen → Like eines fremden Workouts

Flow 3 — Creator:
Creator werden → Programm veröffentlichen →
Als anderer User Programm kaufen (Test-Zahlung) →
Programm in eigenen Programmen prüfen

Dokumentiere jeden Schritt in docs/e2e-report.md:
✅ Schritt funktioniert
❌ Schritt bricht (mit Fehlerbeschreibung)

Fixe alle ❌ Punkte die du kannst.
Trage nicht fixbare in docs/debugger-queue.md ein.
pnpm test. Merge nicht nach main.
```

### Konsistenz-Audit
```
Lies AGENTS.md. Branch: fix/consistency

Prüfe die gesamte App auf Konsistenz:

Sprache:
- Konsequent Deutsch oder Englisch in der UI? Entscheide und vereinheitliche.
- Fehlermeldungen alle in der gleichen Sprache?

Einheiten:
- kg/lbs überall gleich? Reagieren alle Stores auf die Setting-Änderung?

Begriffe:
- Immer "Workout" (nicht mal "Training")?
- Immer "Übung" (nicht mal "Exercise")?
- Immer "Satz" (nicht mal "Set")?
- Einheitliche Begriffe in allen Screens.

UI-Konsistenz:
- Alle Screens haben Loading-State?
- Alle Listen haben Empty-State?
- Alle kritischen Aktionen haben Error-State?
- Back-Navigation überall korrekt?
- Tab-Bar-Icons konsistent?
- Button-Styles konsistent (immer aus packages/ui)?

Dokumentiere in docs/consistency-audit.md.
Fixe alles. pnpm test. Merge nicht nach main.
```

### Test-Coverage erhöhen
```
Lies AGENTS.md. Branch: feat/test-coverage

Ziel: >60% Test-Coverage für kritische Pfade.

Prüfe welche Stores noch keine oder wenige Tests haben.
Schreibe Tests für:

packages/domain:
- Epley-1RM-Formel
- Volumen-Berechnung
- Streak-Berechnung
- Achievement-Bedingungen

apps/mobile Stores:
- workoutStore: kompletter Workout-Flow (start → addExercise → 
  logSet → completeSet → finishWorkout → historyStore aktualisiert)
- historyStore: PRs korrekt gespeichert?
- achievementStore: alle Achievement-Bedingungen
- syncStore: Queue-Logik, Conflict Resolution

Integration Tests:
- workoutStore + historyStore + achievementStore 
  zusammen nach finishWorkout()

Coverage-Report:
- pnpm --filter @fitness-tracker/mobile exec jest --coverage
- Dokumentiere Ergebnis in docs/test-coverage-report.md

pnpm test. Merge nicht nach main.
```

---

## 15. BLOCK 10 — RELEASE-VORBEREITUNG

### Mission 19: Onboarding
```
Lies AGENTS.md. Branch: feat/onboarding

Erstnutzer-Flow (nur beim ersten App-Start, MMKV-Flag):

1. Welcome-Slides (3 Screens):
   - "Dein Trainingsbegleiter" — Was ist die App?
   - "Tracke, analysiere, wachse" — Kern-Features
   - "Community + Coaching" — Was kommt noch?

2. Profil-Setup:
   - Name eingeben
   - Trainingsziel wählen (Kraft, Masse, Ausdauer, Allgemein)
   - Erfahrungslevel (Anfänger / Fortgeschrittener / Profi)
   - Einheiten (kg / lbs)

3. Erstes Programm:
   - "Aus Marketplace wählen" (zeigt Top 3 kostenlose)
   - "Eigenes erstellen" (direkt zum Program Builder)
   - "Später" (überspringen)

4. Fertig-Screen:
   - "Loslegen" → Home-Screen

Onboarding-Flag: MMKV.set('onboarding_completed', true)
Beim nächsten Start überspringen.

pnpm test. Merge nicht nach main.
```

### Mission 22: Release-Vorbereitung
```
Lies AGENTS.md. Branch: feat/release-prep

1. app.json vollständig konfigurieren:
   name, slug, version: "1.0.0"
   iOS: bundleIdentifier: "com.konradskwarski.fitnesstracker"
   Android: package: "com.konradskwarski.fitnesstracker"
   Permissions: nur was wirklich gebraucht wird
   Orientation: portrait only

2. App-Icon:
   Erstelle einen Platzhalter-Icon (kraftvoll, simpel)
   in /apps/mobile/assets/
   icon.png (1024x1024), adaptive-icon.png, favicon.png, splash.png

3. EAS Build Konfiguration (eas.json):
   development: Expo Go kompatibel
   preview: Internal Distribution
   production: Store-Upload-ready

4. Rechtliches (docs/legal/):
   privacy-policy.md
   terms-of-service.md

5. Store-Listing (docs/store-listing.md):
   App-Name, Untertitel
   Kurzbeschreibung (80 Zeichen)
   Lange Beschreibung (4000 Zeichen)
   Keywords (100 Zeichen)
   App-Kategorie: Health & Fitness

6. README.md updaten:
   Setup-Anleitung für Entwickler
   Wie man den Dev-Server startet
   Wie man einen Build macht
   Architektur-Übersicht

pnpm test. Merge nicht nach main.
```

### MANUELL VOR MISSION 23:
```powershell
npm install -g eas-cli
eas login
# Mit Expo-Account einloggen

# Apple Developer Account ($99/Jahr) nötig für iOS
# Google Play Account ($25 einmalig) nötig für Android
```

### Mission 23: Erster Build
```
Lies AGENTS.md und eas.json. Branch: feat/first-build

Erstelle den ersten TestFlight/Preview Build:

1. Expo-Konfiguration prüfen:
   pnpm --filter @fitness-tracker/mobile exec expo doctor
   Alle Warnings beheben.

2. EAS Build für Android (Preview, kein Store-Account nötig):
   eas build --platform android --profile preview
   Generiert eine .apk Datei zum direkten Installieren.

3. Wenn Apple Developer Account vorhanden:
   eas build --platform ios --profile preview
   Generiert .ipa für TestFlight.

4. Dokumentiere in docs/build-guide.md:
   - Schritt-für-Schritt Build-Anleitung
   - Wie man einen neuen Build pusht
   - Versionierung: wann major/minor/patch erhöhen
   - OTA Updates mit eas update (für kleine Fixes ohne Store-Update)

5. Update-Strategie:
   eas update --branch production --message "Fix: [was]"
   Für Bug-Fixes ohne kompletten Build.

Führe mich Schritt für Schritt. Frage wenn du Keys brauchst.
Merge nicht nach main.
```

---

## 16. NOTFALL-PROMPTS

### Bug: Agent findet ihn nicht
```
Zeige mir den vollständigen aktuellen Inhalt von [Dateiname].
Erkläre Zeile für Zeile was beim Drücken von [Button/Aktion] passiert.
Finde wo genau der Fehler liegt.
```

### CI/Build bricht
```
Hier ist der vollständige Fehler-Log:
[LOG EINFÜGEN]
Was ist die Ursache? Fixe es konkret.
```

### Mission zu groß / Agent blockiert
```
Lass uns das aufteilen. Mache NUR diesen einen Schritt:
[EINEN SCHRITT]. Fange mit nichts anderem an.
```

### Agent baut in falsche Richtung
```
Stopp. Lies AGENTS.md Section [X] nochmal.
Das was du gebaut hast entspricht nicht den Anforderungen weil:
[BEGRÜNDUNG]. Starte den Branch neu mit: git checkout main && git checkout -b [branch]
```

### Nach Verlust von Claude — Overseer-Ersatz mit Gemini
```
Du übernimmst die Rolle des Overseers zusätzlich zur Builder-Rolle.
Lies docs/mission-board.md und plane die nächsten Missionen selbst.
Schreibe Briefings in docs/briefings/.
Priorisiere: Kern → Stabilisierung → Design → Backend → Social.
```

### AGENTS.md veraltet
```
Lies alle aktuellen Stores in apps/mobile/src/stores/
und alle Screens in apps/mobile/app/.
Aktualisiere AGENTS.md mit dem aktuellen Projektstand:
neue Stores, neue Screens, neue Dependencies, aktueller Status.
```

---

## 17. REIHENFOLGE-CHECKLISTE

```
BLOCK 1 — KERN (Gemini Builder)
[x] Mission 6: Stabilisierung + Templates
[x] Mission 7: Achievements + Gamification
[/] Mission 8: Body Tracking + Profil
[ ] Mission 9: Workout-Verbesserungen
[ ] → AGENTS.md aktualisieren

BLOCK 2 — ERSTE HÄRTUNG (Codex)
[ ] Bug-Jagd → docs/bug-report.md
[ ] Edge-Cases
[ ] TypeScript-Härtung
[ ] → pnpm typecheck strikt grün

BLOCK 3 — DESIGN-FUNDAMENT (Gemini Designer)
[ ] Design-Konzept → docs/design-system.md → MEIN OK
[ ] Design-System implementieren

BLOCK 4 — PREMIUM UI (Gemini Designer)
[ ] Premium Workout-Screen
[ ] Home-Dashboard
[ ] Progress-Charts
[ ] Micro-Interactions

BLOCK 5 — BACKEND (Gemini Builder)
[ ] MANUELL: Supabase Projekt + Schema
[ ] Mission 10: Auth
[ ] Mission 11: Cloud Sync

BLOCK 6 — SOCIAL (Gemini Builder)
[ ] MANUELL: Additive Migrations ausführen
[ ] Mission 12: Profile + Follows
[ ] Mission 13: Activity Feed
[ ] Mission 14: Challenges + Leaderboards

BLOCK 7 — MARKETPLACE (Gemini Builder)
[ ] MANUELL: Additive Migrations ausführen
[ ] Mission 15: Marketplace Browse
[ ] Mission 16: Creator-Profile
[ ] Mission 17: Stripe Test-Modus

BLOCK 8 — ZWEITE HÄRTUNG (Codex)
[ ] Performance-Profiling
[ ] Security-Audit
[ ] → docs/performance-report.md + docs/security-audit.md

BLOCK 9 — QUALITÄT (Builder + Codex)
[ ] E2E-Durchlauf → docs/e2e-report.md
[ ] Konsistenz-Audit
[ ] Test-Coverage >60%

BLOCK 10 — RELEASE (Builder)
[ ] Onboarding
[ ] Release-Prep (Icons, app.json, Store-Listing)
[ ] MANUELL: eas-cli installieren + Developer-Accounts
[ ] Erster Build (Android Preview zuerst)

FERTIG: Testbare App auf echten Geräten ✅
```

---

**GOLDENE REGELN:**
1. Jede Mission beginnt mit: `Lies AGENTS.md`
2. Jede Mission auf eigenem Branch — nie direkt auf main
3. Immer testen: `pnpm dev` + `pnpm test` + `pnpm typecheck`
4. Gemini baut + gestaltet · Codex härtet + debuggt
5. AGENTS.md alle 3-4 Missionen aktualisieren
6. Bei Merge-Konflikten: Builder-Branch hat Vorrang vor Designer-Branch
7. Dieser Plan ist die einzige Quelle der Wahrheit

---
*Erstellt: Juni 2026 | Fitness-Tracker Projekt*
