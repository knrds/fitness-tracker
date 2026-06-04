import { Achievement } from '../types';

/**
 * One-time achievements are evaluated against cumulative metrics (total workouts,
 * longest streak, total PRs, lifetime volume, unique exercises, muscle groups, etc.).
 * Repeatable achievements (`repeatable: true`) are evaluated against per-session
 * metrics every time a workout is finished and can be earned again and again.
 */
export const ACHIEVEMENTS: Achievement[] = [
  // ----------------------------------------------------------------------- //
  // ONE-TIME — Workouts (Rebalanced: higher targets, paced rewards)
  // ----------------------------------------------------------------------- //
  { id: 'first_workout', name: 'First Steps', description: 'Complete your first workout', category: 'workouts', targetValue: 1, xpReward: 50, icon: 'footsteps' },
  { id: 'workouts_5', name: 'High Five', description: 'Complete 5 workouts', category: 'workouts', targetValue: 5, xpReward: 100, icon: 'thumbs-up' },
  { id: 'workouts_10', name: 'Consistent Lifter', description: 'Complete 10 workouts', category: 'workouts', targetValue: 10, xpReward: 150, icon: 'hourglass' },
  { id: 'workouts_25', name: 'Iron Habit', description: 'Complete 25 workouts', category: 'workouts', targetValue: 25, xpReward: 250, icon: 'calendar' },
  { id: 'workouts_50', name: 'Iron Beast', description: 'Complete 50 workouts', category: 'workouts', targetValue: 50, xpReward: 400, icon: 'skull' },
  { id: 'workouts_100', name: 'Centurion', description: 'Complete 100 workouts', category: 'workouts', targetValue: 100, xpReward: 750, icon: 'shield-checkmark' },
  { id: 'workouts_250', name: 'Elite Beast', description: 'Complete 250 workouts', category: 'workouts', targetValue: 250, xpReward: 1500, icon: 'ribbon' },
  { id: 'workouts_500', name: 'Immortal', description: 'Complete 500 workouts', category: 'workouts', targetValue: 500, xpReward: 3000, icon: 'trophy' },

  // ----------------------------------------------------------------------- //
  // ONE-TIME — Streaks
  // ----------------------------------------------------------------------- //
  { id: 'streak_3', name: 'Streak Starter', description: 'Maintain a 3-day workout streak', category: 'streaks', targetValue: 3, xpReward: 30, icon: 'flame' },
  { id: 'streak_5', name: 'High Five Streak', description: 'Maintain a 5-day workout streak', category: 'streaks', targetValue: 5, xpReward: 60, icon: 'flash' },
  { id: 'streak_7', name: 'On Fire', description: 'Maintain a 7-day workout streak', category: 'streaks', targetValue: 7, xpReward: 100, icon: 'speedometer' },
  { id: 'streak_14', name: 'Dedicated', description: 'Maintain a 14-day workout streak', category: 'streaks', targetValue: 14, xpReward: 200, icon: 'bonfire' },
  { id: 'streak_30', name: 'Habit Builder', description: 'Maintain a 30-day workout streak', category: 'streaks', targetValue: 30, xpReward: 400, icon: 'rocket' },
  { id: 'streak_50', name: 'Unstoppable', description: 'Maintain a 50-day workout streak', category: 'streaks', targetValue: 50, xpReward: 750, icon: 'infinite' },
  { id: 'streak_100', name: 'Century Streak', description: 'Maintain a 100-day workout streak', category: 'streaks', targetValue: 100, xpReward: 1500, icon: 'planet' },
  { id: 'streak_365', name: 'Year of Iron', description: 'Maintain a 365-day workout streak', category: 'streaks', targetValue: 365, xpReward: 5000, icon: 'sunny' },

  // ----------------------------------------------------------------------- //
  // ONE-TIME — Personal Records (excluding warmups)
  // ----------------------------------------------------------------------- //
  { id: 'first_pr', name: 'Record Breaker', description: 'Set your first personal record', category: 'pr', targetValue: 1, xpReward: 50, icon: 'star' },
  { id: 'prs_5', name: 'Triple Threat', description: 'Achieve 5 personal records', category: 'pr', targetValue: 5, xpReward: 100, icon: 'star-half' },
  { id: 'prs_10', name: 'Rising Star', description: 'Achieve 10 personal records', category: 'pr', targetValue: 10, xpReward: 180, icon: 'sparkles' },
  { id: 'prs_25', name: 'Record Hunter', description: 'Achieve 25 personal records', category: 'pr', targetValue: 25, xpReward: 300, icon: 'medal' },
  { id: 'prs_50', name: 'Elite Challenger', description: 'Achieve 50 personal records', category: 'pr', targetValue: 50, xpReward: 600, icon: 'trophy-outline' },
  { id: 'prs_100', name: 'Peak Performer', description: 'Achieve 100 personal records', category: 'pr', targetValue: 100, xpReward: 1200, icon: 'crown' },

  // ----------------------------------------------------------------------- //
  // ONE-TIME — Lifetime Volume
  // ----------------------------------------------------------------------- //
  { id: 'volume_50k', name: 'Heavy Hauler', description: 'Lift 50,000 kg of total volume', category: 'volume', targetValue: 50000, xpReward: 150, icon: 'barbell-outline' },
  { id: 'volume_100k', name: 'Heavy Metal', description: 'Lift 100,000 kg of total volume', category: 'volume', targetValue: 100000, xpReward: 250, icon: 'cube' },
  { id: 'volume_250k', name: 'Powerhouse', description: 'Lift 250,000 kg of total volume', category: 'volume', targetValue: 250000, xpReward: 500, icon: 'hammer' },
  { id: 'volume_500k', name: 'Iron Giant', description: 'Lift 500,000 kg of total volume', category: 'volume', targetValue: 500000, xpReward: 800, icon: 'barbell' },
  { id: 'volume_1m', name: 'One Million Club', description: 'Lift 1,000,000 kg of total volume', category: 'volume', targetValue: 1000000, xpReward: 1500, icon: 'shield' },
  { id: 'volume_5m', name: 'Colossus', description: 'Lift 5,000,000 kg of total volume', category: 'volume', targetValue: 5000000, xpReward: 3000, icon: 'construct' },
  { id: 'volume_10m', name: 'Titan of Iron', description: 'Lift 10,000,000 kg of total volume', category: 'volume', targetValue: 10000000, xpReward: 6000, icon: 'earth' },

  // ----------------------------------------------------------------------- //
  // ONE-TIME — Exercise Variety
  // ----------------------------------------------------------------------- //
  { id: 'unique_exercises_10', name: 'Variety Starter', description: 'Perform 10 different exercises', category: 'exercises', targetValue: 10, xpReward: 80, icon: 'compass' },
  { id: 'unique_exercises_25', name: 'Diverse Lifter', description: 'Perform 25 different exercises', category: 'exercises', targetValue: 25, xpReward: 180, icon: 'map' },
  { id: 'unique_exercises_50', name: 'Master of Variety', description: 'Perform 50 different exercises', category: 'exercises', targetValue: 50, xpReward: 350, icon: 'git-branch' },
  { id: 'unique_exercises_100', name: 'Movement Encyclopedia', description: 'Perform 100 different exercises', category: 'exercises', targetValue: 100, xpReward: 800, icon: 'library' },

  // ----------------------------------------------------------------------- //
  // ONE-TIME — Muscle Coverage
  // ----------------------------------------------------------------------- //
  { id: 'muscles_5', name: 'Triple Split', description: 'Train 5 different muscle groups', category: 'muscles', targetValue: 5, xpReward: 50, icon: 'body' },
  { id: 'muscles_8', name: 'Well Rounded', description: 'Train 8 different muscle groups', category: 'muscles', targetValue: 8, xpReward: 100, icon: 'fitness' },
  { id: 'muscles_12', name: 'Full Coverage', description: 'Train 12 different muscle groups', category: 'muscles', targetValue: 12, xpReward: 250, icon: 'man' },
  { id: 'muscles_all', name: 'Total Domination', description: 'Train 15+ different muscle groups', category: 'muscles', targetValue: 15, xpReward: 500, icon: 'people' },

  // ----------------------------------------------------------------------- //
  // ONE-TIME — Meta Achievements (based on other achievements)
  // ----------------------------------------------------------------------- //
  { id: 'meta_ach_5', name: 'Achievement Hunter', description: 'Unlock 5 unique achievements', category: 'meta', targetValue: 5, xpReward: 250, icon: 'key' },
  { id: 'meta_ach_15', name: 'Achievement Master', description: 'Unlock 15 unique achievements', category: 'meta', targetValue: 15, xpReward: 500, icon: 'gift' },

  // ----------------------------------------------------------------------- //
  // ONE-TIME — Niche Achievements (Time & Behaviors)
  // ----------------------------------------------------------------------- //
  { id: 'early_bird', name: 'Early Bird', description: 'Complete a workout before 8:00 AM', category: 'time', targetValue: 1, xpReward: 100, icon: 'sunny-outline' },
  { id: 'night_owl', name: 'Night Owl', description: 'Complete a workout after 9:00 PM', category: 'time', targetValue: 1, xpReward: 100, icon: 'moon' },
  { id: 'weekend_warrior', name: 'Weekend Warrior', description: 'Complete a workout on a weekend', category: 'time', targetValue: 1, xpReward: 100, icon: 'beer' },
  { id: 'mind_over_matter', name: 'Mind Over Matter', description: 'Log a note in 5 different workouts', category: 'niche', targetValue: 5, xpReward: 150, icon: 'book' },
  { id: 'superset_enthusiast', name: 'Superset Fanatic', description: 'Perform a superset in 5 different workouts', category: 'niche', targetValue: 5, xpReward: 200, icon: 'git-compare' },
  { id: 'warmup_champion', name: 'Warmup Champion', description: 'Complete 10 workouts that include warmup sets', category: 'niche', targetValue: 10, xpReward: 250, icon: 'thermometer' },
  { id: 'cardio_lover', name: 'Heart Health', description: 'Complete a cardio exercise in 5 different workouts', category: 'niche', targetValue: 5, xpReward: 200, icon: 'heart' },

  // ----------------------------------------------------------------------- //
  // REPEATABLE — earned again every qualifying workout
  // ----------------------------------------------------------------------- //
  { id: 'rep_workout_complete', name: 'Session Logged', description: 'Finish any workout', category: 'workouts', targetValue: 1, repeatable: true, xpReward: 25, icon: 'checkmark-done' },
  { id: 'rep_session_volume_5k', name: 'Tonnage', description: 'Move 5,000 kg in a single workout', category: 'volume', targetValue: 5000, repeatable: true, xpReward: 40, icon: 'trending-up' },
  { id: 'rep_session_volume_10k', name: 'Big Session', description: 'Move 10,000 kg in a single workout', category: 'volume', targetValue: 10000, repeatable: true, xpReward: 80, icon: 'arrow-up-circle' },
  { id: 'rep_session_pr', name: 'PR Hunter', description: 'Set a new PR in a workout', category: 'pr', targetValue: 1, repeatable: true, xpReward: 50, icon: 'star-outline' },
  { id: 'rep_session_pr_3', name: 'PR Frenzy', description: 'Set 3 PRs in a single workout', category: 'pr', targetValue: 3, repeatable: true, xpReward: 120, icon: 'flash-outline' },
  { id: 'rep_session_sets_20', name: 'Volume Grinder', description: 'Complete 20 sets in a single workout', category: 'session', targetValue: 20, repeatable: true, xpReward: 40, icon: 'layers' },
  { id: 'rep_session_sets_30', name: 'Marathon Session', description: 'Complete 30 sets in a single workout', category: 'session', targetValue: 30, repeatable: true, xpReward: 70, icon: 'list' },
];
