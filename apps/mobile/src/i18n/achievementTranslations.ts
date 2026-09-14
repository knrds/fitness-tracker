export interface LocalizedAchievement {
  name: string;
  description: string;
}

export const GERMAN_ACHIEVEMENTS: Record<string, LocalizedAchievement> = {
  // ONE-TIME — Workouts
  first_workout: {
    name: 'Erste Schritte',
    description: 'Schließe dein erstes Workout ab',
  },
  workouts_5: {
    name: 'High Five',
    description: 'Schließe 5 Workouts ab',
  },
  workouts_10: {
    name: 'Beständiger Athlet',
    description: 'Schließe 10 Workouts ab',
  },
  workouts_25: {
    name: 'Eiserne Gewohnheit',
    description: 'Schließe 25 Workouts ab',
  },
  workouts_50: {
    name: 'Eisen-Biest',
    description: 'Schließe 50 Workouts ab',
  },
  workouts_100: {
    name: 'Centurio',
    description: 'Schließe 100 Workouts ab',
  },
  workouts_250: {
    name: 'Elite-Athlet',
    description: 'Schließe 250 Workouts ab',
  },
  workouts_500: {
    name: 'Unsterblich',
    description: 'Schließe 500 Workouts ab',
  },
  workouts_750: {
    name: 'Dauergast im Gym',
    description: 'Schließe 750 Workouts ab',
  },
  workouts_1000: {
    name: 'Lebenslange Mitgliedschaft',
    description: 'Schließe 1.000 Workouts ab',
  },

  // ONE-TIME — Streaks
  streak_3: {
    name: 'Streak-Starter',
    description: 'Halte einen 3-Tage-Workout-Streak',
  },
  streak_5: {
    name: 'High-Five-Streak',
    description: 'Halte einen 5-Tage-Workout-Streak',
  },
  streak_7: {
    name: 'On Fire',
    description: 'Halte einen 7-Tage-Workout-Streak',
  },
  streak_14: {
    name: 'Hingabe',
    description: 'Halte einen 14-Tage-Workout-Streak',
  },
  streak_30: {
    name: 'Gewohnheitsmeister',
    description: 'Halte einen 30-Tage-Workout-Streak',
  },
  streak_50: {
    name: 'Unaufhaltsam',
    description: 'Halte einen 50-Tage-Workout-Streak',
  },
  streak_100: {
    name: 'Jahrhundert-Streak',
    description: 'Halte einen 100-Tage-Workout-Streak',
  },
  streak_365: {
    name: 'Jahr des Eisens',
    description: 'Halte einen 365-Tage-Workout-Streak',
  },

  // ONE-TIME — Personal Records
  first_pr: {
    name: 'Rekordbrecher',
    description: 'Stelle deine erste persönliche Bestleistung auf',
  },
  prs_5: {
    name: 'Dreifache Gefahr',
    description: 'Erziele 5 persönliche Bestleistungen',
  },
  prs_10: {
    name: 'Aufstrebender Stern',
    description: 'Erziele 10 persönliche Bestleistungen',
  },
  prs_25: {
    name: 'Rekordjäger',
    description: 'Erziele 25 persönliche Bestleistungen',
  },
  prs_50: {
    name: 'Elite-Herausforderer',
    description: 'Erziele 50 persönliche Bestleistungen',
  },
  prs_100: {
    name: 'Spitzenperformer',
    description: 'Erziele 100 persönliche Bestleistungen',
  },
  prs_250: {
    name: 'Rekord-Kartograph',
    description: 'Erziele 250 persönliche Bestleistungen',
  },

  // ONE-TIME — Lifetime Volume
  volume_50k: {
    name: 'Schwerlaster',
    description: 'Bewege 50.000 kg Gesamtvolumen',
  },
  volume_100k: {
    name: 'Heavy Metal',
    description: 'Bewege 100.000 kg Gesamtvolumen',
  },
  volume_250k: {
    name: 'Kraftpaket',
    description: 'Bewege 250.000 kg Gesamtvolumen',
  },
  volume_500k: {
    name: 'Eiserner Gigant',
    description: 'Bewege 500.000 kg Gesamtvolumen',
  },
  volume_1m: {
    name: 'Ein-Million-Klub',
    description: 'Bewege 1.000.000 kg Gesamtvolumen',
  },
  volume_5m: {
    name: 'Koloss',
    description: 'Bewege 5.000.000 kg Gesamtvolumen',
  },
  volume_10m: {
    name: 'Titan des Eisens',
    description: 'Bewege 10.000.000 kg Gesamtvolumen',
  },
  volume_25m: {
    name: 'Tonnage-Historiker',
    description: 'Bewege 25.000.000 kg Gesamtvolumen',
  },
  volume_50m: {
    name: 'Schwerkraft-Bezwinger',
    description: 'Bewege 50.000.000 kg Gesamtvolumen',
  },

  // ONE-TIME — Exercise Variety
  unique_exercises_10: {
    name: 'Vielfalts-Starter',
    description: 'Führe 10 verschiedene Übungen aus',
  },
  unique_exercises_25: {
    name: 'Vielseitiger Heber',
    description: 'Führe 25 verschiedene Übungen aus',
  },
  unique_exercises_50: {
    name: 'Meister der Vielfalt',
    description: 'Führe 50 verschiedene Übungen aus',
  },
  unique_exercises_100: {
    name: 'Bewegungs-Enzyklopädie',
    description: 'Führe 100 verschiedene Übungen aus',
  },
  unique_exercises_150: {
    name: 'Übungs-Kartograph',
    description: 'Führe 150 verschiedene Übungen aus',
  },
  unique_exercises_200: {
    name: 'Bewegungs-Perfektionist',
    description: 'Führe 200 verschiedene Übungen aus',
  },

  // ONE-TIME — Muscle Coverage
  muscles_5: {
    name: 'Split-Starter',
    description: 'Trainiere 5 verschiedene Muskelgruppen',
  },
  muscles_8: {
    name: 'Ausgeglichen',
    description: 'Trainiere 8 verschiedene Muskelgruppen',
  },
  muscles_12: {
    name: 'Komplettabdeckung',
    description: 'Trainiere 12 verschiedene Muskelgruppen',
  },
  muscles_all: {
    name: 'Totale Dominanz',
    description: 'Trainiere 15+ verschiedene Muskelgruppen',
  },

  // ONE-TIME — Meta Achievements
  meta_ach_5: {
    name: 'Erfolgejäger',
    description: 'Schalte 5 einzigartige Erfolge frei',
  },
  meta_ach_15: {
    name: 'Erfolgemeister',
    description: 'Schalte 15 einzigartige Erfolge frei',
  },
  meta_ach_30: {
    name: 'Abzeichen-Sammler',
    description: 'Schalte 30 einzigartige Erfolge frei',
  },
  meta_ach_50: {
    name: 'Erfolge-Kurator',
    description: 'Schalte 50 einzigartige Erfolge frei',
  },
  meta_ach_75: {
    name: 'Vollender-Modus',
    description: 'Schalte 75 einzigartige Erfolge frei',
  },
  meta_ach_100: {
    name: 'Abzeichen-Singularität',
    description: 'Schalte 100 einzigartige Erfolge frei',
  },

  // ONE-TIME — Niche Achievements (Time & Behaviors)
  early_bird: {
    name: 'Frühaufsteher',
    description: 'Schließe ein Workout vor 08:00 Uhr morgens ab',
  },
  night_owl: {
    name: 'Nachteule',
    description: 'Schließe ein Workout nach 21:00 Uhr ab',
  },
  weekend_warrior: {
    name: 'Wochenend-Krieger',
    description: 'Schließe ein Workout am Wochenende ab',
  },
  early_bird_5: {
    name: 'Morgendämmerung',
    description: 'Schließe 5 Workouts vor 08:00 Uhr morgens ab',
  },
  night_owl_5: {
    name: 'Spätschicht',
    description: 'Schließe 5 Workouts nach 21:00 Uhr ab',
  },
  weekend_warrior_5: {
    name: 'Wochenend-Ritual',
    description: 'Schließe 5 Wochenend-Workouts ab',
  },
  mind_over_matter: {
    name: 'Geist über Materie',
    description: 'Erfasse eine Notiz in 5 verschiedenen Workouts',
  },
  superset_enthusiast: {
    name: 'Supersatz-Fanatiker',
    description: 'Führe einen Supersatz in 5 verschiedenen Workouts aus',
  },
  warmup_champion: {
    name: 'Aufwärm-Champion',
    description: 'Schließe 10 Workouts mit Aufwärmsätzen ab',
  },
  cardio_lover: {
    name: 'Herzgesundheit',
    description: 'Absolviere eine Cardio-Übung in 5 verschiedenen Workouts',
  },
  note_archivist: {
    name: 'Trainings-Archivar',
    description: 'Erfasse Notizen in 20 verschiedenen Workouts',
  },
  superset_scientist: {
    name: 'Supersatz-Wissenschaftler',
    description: 'Nutze Supersätze in 15 verschiedenen Workouts',
  },
  warmup_ritualist: {
    name: 'Aufwärm-Ritualist',
    description: 'Führe Aufwärmsätze in 25 verschiedenen Workouts durch',
  },
  zone_two_scout: {
    name: 'Zone-2-Scout',
    description: 'Absolviere Cardio in 15 verschiedenen Workouts',
  },
  bench_specialist: {
    name: 'Bankdrück-Spezialist',
    description: 'Mache Bankdrücken in 10 verschiedenen Workouts',
  },
  bench_technician: {
    name: 'Bankdrück-Techniker',
    description: 'Mache Bankdrücken in 25 verschiedenen Workouts',
  },
  squat_specialist: {
    name: 'Kniebeugen-Spezialist',
    description: 'Mache Kniebeugen in 10 verschiedenen Workouts',
  },
  squat_cartographer: {
    name: 'Tiefen-Kartograph',
    description: 'Mache Kniebeugen in 25 verschiedenen Workouts',
  },
  deadlift_specialist: {
    name: 'Kreuzhebe-Spezialist',
    description: 'Mache Kreuzheben in 10 verschiedenen Workouts',
  },
  hinge_archivist: {
    name: 'Hip-Hinge-Archivar',
    description: 'Mache Kreuzheben oder Hip Hinges in 25 verschiedenen Workouts',
  },
  pullup_pioneer: {
    name: 'Klimmzug-Pionier',
    description: 'Mache Klimmzüge in 10 verschiedenen Workouts',
  },
  vertical_pull_veteran: {
    name: 'Vertikalzug-Veteran',
    description: 'Mache Klimmzüge in 25 verschiedenen Workouts',
  },
  dip_diplomat: {
    name: 'Dip-Diplomat',
    description: 'Mache Dips in 10 verschiedenen Workouts',
  },
  row_scholar: {
    name: 'Ruder-Gelehrter',
    description: 'Mache Ruderübungen in 20 verschiedenen Workouts',
  },
  curl_accountant: {
    name: 'Bizepscurl-Buchhalter',
    description: 'Mache Curls in 20 verschiedenen Workouts',
  },
  press_overhead_club: {
    name: 'Überkopf-Klub',
    description: 'Mache Überkopfdrücken in 15 verschiedenen Workouts',
  },
  shoulder_cartographer: {
    name: 'Schulter-Kartograph',
    description: 'Trainiere Schultern in 20 verschiedenen Workouts',
  },
  back_day_cartographer: {
    name: 'Rückentag-Kartograph',
    description: 'Trainiere Rücken in 25 verschiedenen Workouts',
  },
  arm_day_accountant: {
    name: 'Armtag-Buchhalter',
    description: 'Trainiere Arme in 25 verschiedenen Workouts',
  },
  calf_raises_club: {
    name: 'Waden-Klub',
    description: 'Trainiere Waden in 15 verschiedenen Workouts',
  },
  core_cartographer: {
    name: 'Rumpf-Kartograph',
    description: 'Trainiere Bauch- oder Rumpfmuskeln in 15 verschiedenen Workouts',
  },
  oblique_operator: {
    name: 'Seitlicher Bauch-Spezialist',
    description: 'Trainiere seitliche Bauchmuskeln in 10 verschiedenen Workouts',
  },
  leg_day_loyalist: {
    name: 'Beintag-Loyalist',
    description: 'Trainiere Beine in 20 verschiedenen Workouts',
  },
  posterior_chain_club: {
    name: 'Posterior-Chain-Klub',
    description: 'Trainiere Beinbeuger, Gesäß oder unteren Rücken in 25 verschiedenen Workouts',
  },
  horizontal_push_historian: {
    name: 'Horizontaldruck-Historiker',
    description: 'Erfasse horizontales Drücken in 30 verschiedenen Workouts',
  },
  rotation_scholar: {
    name: 'Rotations-Gelehrter',
    description: 'Erfasse Rotationsübungen in 10 verschiedenen Workouts',
  },
  dumbbell_native: {
    name: 'Kurzhantel-Native',
    description: 'Trainiere mit Kurzhanteln in 25 verschiedenen Workouts',
  },
  cable_cartographer: {
    name: 'Kabelzug-Kartograph',
    description: 'Trainiere am Kabelzug in 25 verschiedenen Workouts',
  },
  machine_room_regular: {
    name: 'Gerätepark-Stammgast',
    description: 'Trainiere an Maschinen in 25 verschiedenen Workouts',
  },
  calisthenics_cadet: {
    name: 'Calisthenics-Kadett',
    description: 'Nutze Eigengewichts- oder Schlingentraining in 10 verschiedenen Workouts',
  },
  bodyweight_bard: {
    name: 'Eigengewichts-Barde',
    description: 'Nutze Eigengewichts- oder Schlingentraining in 25 verschiedenen Workouts',
  },
  powerlifting_apprentice: {
    name: 'Kraftdreikampf-Lehrling',
    description: 'Trainiere Kniebeugen, Bankdrücken oder Kreuzheben in 10 verschiedenen Workouts',
  },
  big_three_regular: {
    name: 'Die großen Drei',
    description: 'Trainiere Kniebeugen, Bankdrücken oder Kreuzheben in 30 verschiedenen Workouts',
  },

  // REPEATABLE
  rep_workout_complete: {
    name: 'Einheit erfasst',
    description: 'Schließe ein beliebiges Workout ab',
  },
  rep_session_volume_5k: {
    name: 'Tonnage',
    description: 'Bewege 5.000 kg in einem einzigen Workout',
  },
  rep_session_volume_10k: {
    name: 'Große Einheit',
    description: 'Bewege 10.000 kg in einem einzigen Workout',
  },
  rep_session_volume_20k: {
    name: 'Frachttag',
    description: 'Bewege 20.000 kg in einem einzigen Workout',
  },
  rep_session_volume_30k: {
    name: 'Schwerlast-Schicht',
    description: 'Bewege 30.000 kg in einem einzigen Workout',
  },
  rep_session_volume_50k: {
    name: 'Atlas-Session',
    description: 'Bewege 50.000 kg in einem einzigen Workout',
  },
  rep_session_pr: {
    name: 'PR-Jäger',
    description: 'Stelle eine neue Bestleistung im Workout auf',
  },
  rep_session_pr_3: {
    name: 'PR-Rausch',
    description: 'Stelle 3 Bestleistungen in einem einzigen Workout auf',
  },
  rep_session_pr_5: {
    name: 'Rekordsturm',
    description: 'Stelle 5 Bestleistungen in einem einzigen Workout auf',
  },
  rep_session_sets_20: {
    name: 'Volumen-Arbeiter',
    description: 'Schließe 20 Sätze in einem einzigen Workout ab',
  },
  rep_session_sets_30: {
    name: 'Marathon-Einheit',
    description: 'Schließe 30 Sätze in einem einzigen Workout ab',
  },
  rep_session_sets_40: {
    name: 'Tabellen-Session',
    description: 'Schließe 40 Arbeitssätze in einem einzigen Workout ab',
  },
  rep_session_sets_50: {
    name: 'Satz-Sammler',
    description: 'Schließe 50 Arbeitssätze in einem einzigen Workout ab',
  },
};

export function getLocalizedAchievement(
  ach: { id: string; name: string; description: string },
  language: string,
): LocalizedAchievement {
  if (language === 'de') {
    const localized = GERMAN_ACHIEVEMENTS[ach.id];
    if (localized) return localized;
  }
  return {
    name: ach.name,
    description: ach.description,
  };
}
