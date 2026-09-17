# EVARO – Store Screenshot Execution Plan

> **Hinweis:** Dieses Dokument ist ein strategischer und technischer Aufnahmeplan für die Erstellung von App-Store- und Google-Play-Screenshots. Es werden **keine Screenshots automatisch generiert**. Die Aufnahmen erfolgen manuell auf echten Geräten oder im Simulator mit sauberen Beispieldaten.

---

## 1. Übersicht der Bildformate & Spezifikationen

### Apple App Store
- **6.9" / 6.7" Super Retina Display:** iPhone 16 Pro Max / 15 Pro Max (1290 x 2796 px oder 1320 x 2868 px)
- **6.5" / 6.1" Display:** iPhone 15 / 14 Pro (1179 x 2556 px)
- *(Optional iPad)* **13" iPad Pro:** (2064 x 2752 px)

### Google Play Store
- **Phone:** Mindestens 1080 x 1920 px (z. B. 1080 x 2400 px oder 1440 x 3120 px, 16:9 bis 20:9 Aspect Ratio)
- Mindestens 4 Screenshots, maximal 8 Screenshots empfohlen.

---

## 2. Screenshot Shot List (9 Kernmotive)

---

### Shot 1: Home Screen (Tagesübersicht & Quick Start)
- **Screen:** `apps/mobile/app/(tabs)/index.tsx` (Dashboard)
- **Purpose:** Zeigt den schnellen Einstieg ins Training, die Wochenkonsistenz, Streak und die wichtigsten Metriken auf einen Blick.
- **Required State:**
  - Aktive Workout-Streak (z. B. 4 Tage).
  - Letztes Training vor kurzem abgeschlossen (saubere Zusammenfassung sichtbar).
  - Schnellauswahl für Top-Templates ("Push A", "Legs Focus").
- **Example Data Required:**
  - Nutzername: "Alex"
  - Streak: 4 Wochen / 12 Workouts
  - Letztes Training: "Push Hypertrophy – vor 2 Tagen"
- **Personal Data Risk:** Niedrig. Keinesfalls reale Klarnamen, private E-Mail-Adressen oder intime Notizen anzeigen.
- **iOS Framing:** Dynamic Island sichtbar, Statusleiste clean (9:41 AM, 100% Akku, Full WiFi).
- **Android Framing:** Clean System Bars (10:00 AM, 100% Akku).

---

### Shot 2: Active Workout (Set-Logging & Rest-Timer)
- **Screen:** `apps/mobile/app/workout/session.tsx`
- **Purpose:** Kernnutzen demonstrieren: Ultraschnelles Protokollieren von Sätzen, Gewichten, Reps und RPE direkt an der Hantel.
- **Required State:**
  - Workout aktiv seit ca. 28 Minuten.
  - Mindestens 2 Übungen geladen:
    1. *Barbell Bench Press*: 3 Sätze abgeschlossen mit Haken, Rest-Timer aktiv (z. B. 01:14 verbleibend).
    2. *Incline Dumbbell Press*: Erster Satz bereit zur Eingabe.
- **Example Data Required:**
  - Bench Press: 85 kg × 8 (RPE 8.0), 85 kg × 8 (RPE 8.5), 87.5 kg × 6 (RPE 9.0).
  - Rest-Timer: Grün leuchtendes Badge mit 01:14 min.
- **Personal Data Risk:** Keines. Reine Trainingsgewichte.
- **iOS Besonderheit:** Haptisches Häkchen visuell hervorgehoben.
- **Android Besonderheit:** Übersichtliche Zifferntastatur / saubere Satzzeilen ohne Clipping.

---

### Shot 3: Exercise Library (Umfangreicher 870+ Katalog)
- **Screen:** `apps/mobile/app/(tabs)/exercises.tsx`
- **Purpose:** Beweist die Vielfalt: 870+ Übungen, strukturierte Filter nach Muskelgruppen (Brust, Rücken, Beine) und Equipment (Langhantel, Kurzhantel, Kabelzug).
- **Required State:**
  - Filter aktiv: z. B. "Brust" (Chest) oder "Rücken" (Lats).
  - Suchfeld ausgefüllt mit "Press" oder leer mit aktiver Muskelgruppe.
  - Mindestens 4 Übungskarten mit scharfen Vorschaubildern sichtbar.
- **Example Data Required:**
  - Übungen: *Barbell Bench Press*, *Incline Dumbbell Press*, *Chest Dip*, *Cable Fly*.
  - Muskel-Tags: "Brust", "Trizeps", "Vordere Schulter".
- **Personal Data Risk:** Keines.
- **iOS / Android:** Scrollposition so wählen, dass Bild-Thumbnails sofort ins Auge fallen.

---

### Shot 4: Exercise Detail (Anatomie & Bewegungsausführung)
- **Screen:** `apps/mobile/app/exercise/[id].tsx`
- **Purpose:** Zeigt den anatomischen Mehrwert: Genaue Zielmuskeln, Ausführungshinweise und Bewegungsvisualisierung.
- **Required State:**
  - Detailansicht einer populären Grundübung (z. B. *Barbell Squat* oder *Pull-ups*).
  - Bewegungsgrafik (Start/Endposition) scharf geladen.
  - Primär- und Sekundärmuskeln farblich akzentuiert.
- **Example Data Required:**
  - Übung: *Barbell Squat*.
  - Primärmuskel: Quadriceps, Gluteus.
  - Equipment: Barbell.
- **Personal Data Risk:** Keines.
- **iOS / Android:** Vollbild-Vorschau oder saubere Header-Präsentation.

---

### Shot 5: Workout History & Session Summary
- **Screen:** `apps/mobile/app/(tabs)/history.tsx` (Tab: Historie / Detailansicht)
- **Purpose:** Demonstriert den langfristigen Überblick: Kalenderansicht, Trainingsfrequenz, Gesamtvolumen und durchgeführte Übungen.
- **Required State:**
  - Übersicht mit 6–8 vergangenen Einheiten über 3–4 Wochen.
  - Monats-Kalender-Heatmap mit gleichmäßigen Aktivitätspunkten.
  - Detail-Session geöffnet: Gesamtvolumen z. B. "14.250 kg", Dauer "54 min", 18 Sätze.
- **Example Data Required:**
  - Einheiten: "Push Day – Brust & Trizeps", "Pull Day – Rücken & Bizeps", "Leg Day – Quads & Waden".
- **Personal Data Risk:** Niedrig.
- **iOS / Android:** Darstellung der Heatmap und des Volumen-Badges.

---

### Shot 6: Progress & 1RM / Performance Tracking
- **Screen:** `apps/mobile/app/(tabs)/history.tsx` (Tab: Progress / PRs)
- **Purpose:** Zeigt den Kraftfortschritt: Interaktiver Chart mit One-Rep-Max-Entwicklung (1RM) und Bestleistungen.
- **Required State:**
  - Ausgewählte Übung: *Barbell Bench Press* oder *Barbell Deadlift*.
  - Line-Chart mit aufsteigender Kurve über 6 Monate (z. B. von 80 kg auf 105 kg).
  - PR-Kennzeichnung ("Personal Record!") an einem Datenpunkt.
- **Example Data Required:**
  - 1RM Peak: 105 kg.
  - Gesamtsteigerung: +25 kg (+31%).
- **Personal Data Risk:** Keines.
- **iOS / Android:** Chart-Crosshair auf den höchsten Punkt ausgerichtet.

---

### Shot 7: Programs & Custom Templates
- **Screen:** `apps/mobile/app/(tabs)/workouts.tsx` (oder `programs.tsx`)
- **Purpose:** Zeigt die Planungsflexibilität: Vorlagen-Editor, vorgefertigte Pläne und Custom Routine Builder.
- **Required State:**
  - Liste mit Vorlagen: "Push A (Hypertrophie)", "Pull A (Breite)", "Legs A (Kraft)".
  - Bearbeitungs-Badges mit Ziel-Sätzen und Rep-Ranges (z. B. "4 Sätze × 6-8 Wdh.").
- **Example Data Required:**
  - Programm: "EVARO 4-Day Strength & Size Hypertrophy Split".
- **Personal Data Risk:** Keines.
- **iOS / Android:** Drag-and-Drop Reorder-Griffe sauber gerendert.

---

### Shot 8: AI Coach (Trainings- & Planungsassistent)
- **Screen:** `apps/mobile/app/(tabs)/coach.tsx`
- **Purpose:** Hebt das Alleinstellungsmerkmal hervor: KI-gestützte Trainingsberatung, die strukturierte Trainingspläne und konkrete Progressionsvorschläge generiert.
- **Required State:**
  - Kurzer, prägnanter Dialog im Chat:
    - User: *"Erstelle mir einen 3-Tages Push-Pull-Legs Plan für maximalen Muskelaufbau."*
    - Coach: Antwortet mit fundierten Hinweisen und zeigt eine interaktive `CoachPlanCard` ("Push-Pull-Legs Split (3 Tage)") mit dem Button *"Plan als Vorlage speichern"*.
- **Example Data Required:**
  - Kein technischer JSON-Code im Text, sondern saubere Markdown-Formatierung und Coach-Plan-Card.
- **Personal Data Risk:** Keines. Keine privaten Fragen zu Krankheiten oder Verletzungen.
- **iOS / Android:** Tastatur ausgeblendet; Chat-Bubbles und Card im Fokus.

---

### Shot 9: Achievements & Profile Customization
- **Screen:** `apps/mobile/app/(tabs)/history.tsx` (Tab: Achievements) oder `app/profile.tsx`
- **Purpose:** Zeigt Motivation & Gamification: Athleten-Level, XP-Balken, freigeschaltete Badges und individuelle Farbschemata (z. B. Amber, Glacier, Titanium).
- **Required State:**
  - Level 8 ("Advanced Lifter"), XP-Progress 75%.
  - Mindestens 3 freigeschaltete Badges ("Century Club – 100 kg Bench", "Consistency King – 4 Wochen", "Volume Master").
  - Elegantes Dark-Mode-Colorway aktiv.
- **Example Data Required:**
  - XP: 4.850 / 6.000.
  - Abzeichen scharf dargestellt.
- **Personal Data Risk:** Keines.
- **iOS / Android:** Hochwertige Badges und Progress-Bar im sichtbaren Bereich.

---

## 3. Checkliste vor Aufnahme der Screenshots

- [ ] Gerätesprache auf Deutsch (für DE-Listing) und Englisch (für EN-Listing) stellen.
- [ ] Statusleiste bereinigt: 100% Akku, kein "Nicht stören"-Icon, keine privaten Push-Notifications.
- [ ] Echtes Demo-Profil ohne Klarnamen geladen.
- [ ] Dark Mode konsistent in allen Screenshots aktiviert.
- [ ] Keine abgeschnittenen Texte oder Überlappungen auf kleineren Bildschirmen.
