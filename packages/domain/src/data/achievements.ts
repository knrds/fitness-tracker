import { Achievement } from '../types';

/**
 * One-time achievements are evaluated against cumulative metrics (total workouts,
 * longest streak, total PRs, lifetime volume, unique exercises, muscle groups).
 * Repeatable achievements (`repeatable: true`) are evaluated against per-session
 * metrics every time a workout is finished and can be earned again and again.
 */
export const ACHIEVEMENTS: Achievement[] = [
  // ----------------------------------------------------------------------- //
  // ONE-TIME — Workouts
  // ----------------------------------------------------------------------- //
  { id: 'first_workout', name: 'First Steps', description: 'Complete your first workout', category: 'workouts', targetValue: 1, xpReward: 100, icon: 'trophy' },
  { id: 'workouts_5', name: 'Getting Started', description: 'Complete 5 workouts', category: 'workouts', targetValue: 5, xpReward: 100, icon: 'fitness' },
  { id: 'workouts_10', name: 'Consistent Lifter', description: 'Complete 10 workouts', category: 'workouts', targetValue: 10, xpReward: 200, icon: 'fitness' },
  { id: 'workouts_25', name: 'Halfway to Century', description: 'Complete 25 workouts', category: 'workouts', targetValue: 25, xpReward: 300, icon: 'fitness' },
  { id: 'workouts_50', name: 'Iron Beast', description: 'Complete 50 workouts', category: 'workouts', targetValue: 50, xpReward: 500, icon: 'thunderstorm' },
  { id: 'workouts_100', name: 'Centurion', description: 'Complete 100 workouts', category: 'workouts', targetValue: 100, xpReward: 1000, icon: 'shield' },
  { id: 'workouts_250', name: 'Legendary Lifter', description: 'Complete 250 workouts', category: 'workouts', targetValue: 250, xpReward: 2000, icon: 'trophy' },
  { id: 'workouts_500', name: 'Immortal', description: 'Complete 500 workouts', category: 'workouts', targetValue: 500, xpReward: 5000, icon: 'flame' },

  // ----------------------------------------------------------------------- //
  // ONE-TIME — Streaks
  // ----------------------------------------------------------------------- //
  { id: 'streak_3', name: 'Streak Starter', description: 'Maintain a 3-day workout streak', category: 'streaks', targetValue: 3, xpReward: 50, icon: 'flame' },
  { id: 'streak_7', name: 'On Fire', description: 'Maintain a 7-day workout streak', category: 'streaks', targetValue: 7, xpReward: 150, icon: 'flame' },
  { id: 'streak_14', name: 'Dedicated', description: 'Maintain a 14-day workout streak', category: 'streaks', targetValue: 14, xpReward: 250, icon: 'flame' },
  { id: 'streak_30', name: '30-Day Streak', description: 'Maintain a 30-day workout streak', category: 'streaks', targetValue: 30, xpReward: 600, icon: 'flame' },
  { id: 'streak_60', name: 'Unstoppable', description: 'Maintain a 60-day workout streak', category: 'streaks', targetValue: 60, xpReward: 1200, icon: 'flame' },
  { id: 'streak_100', name: 'Century Streak', description: 'Maintain a 100-day workout streak', category: 'streaks', targetValue: 100, xpReward: 2500, icon: 'flame' },

  // ----------------------------------------------------------------------- //
  // ONE-TIME — Personal Records
  // ----------------------------------------------------------------------- //
  { id: 'first_pr', name: 'Record Breaker', description: 'Set your first personal record', category: 'pr', targetValue: 1, xpReward: 100, icon: 'star' },
  { id: 'prs_5', name: 'Rising Star', description: 'Achieve 5 personal records', category: 'pr', targetValue: 5, xpReward: 200, icon: 'star' },
  { id: 'prs_10', name: 'Record Hunter', description: 'Achieve 10 personal records', category: 'pr', targetValue: 10, xpReward: 350, icon: 'ribbon' },
  { id: 'prs_25', name: 'Elite Challenger', description: 'Achieve 25 personal records', category: 'pr', targetValue: 25, xpReward: 500, icon: 'ribbon' },
  { id: 'prs_50', name: 'Peak Performer', description: 'Achieve 50 personal records', category: 'pr', targetValue: 50, xpReward: 1000, icon: 'medal' },
  { id: 'prs_100', name: 'Record Machine', description: 'Achieve 100 personal records', category: 'pr', targetValue: 100, xpReward: 2000, icon: 'medal' },

  // ----------------------------------------------------------------------- //
  // ONE-TIME — Lifetime Volume
  // ----------------------------------------------------------------------- //
  { id: 'volume_10k', name: 'Heavy Hauler', description: 'Lift 10,000 kg of total volume', category: 'volume', targetValue: 10000, xpReward: 200, icon: 'barbell' },
  { id: 'volume_50k', name: 'Powerhouse', description: 'Lift 50,000 kg of total volume', category: 'volume', targetValue: 50000, xpReward: 500, icon: 'barbell' },
  { id: 'volume_100k', name: 'Iron Giant', description: 'Lift 100,000 kg of total volume', category: 'volume', targetValue: 100000, xpReward: 1000, icon: 'barbell' },
  { id: 'volume_250k', name: 'Titan', description: 'Lift 250,000 kg of total volume', category: 'volume', targetValue: 250000, xpReward: 1750, icon: 'shield' },
  { id: 'volume_500k', name: 'Colossus', description: 'Lift 500,000 kg of total volume', category: 'volume', targetValue: 500000, xpReward: 2500, icon: 'shield' },
  { id: 'volume_1m', name: 'One Million Club', description: 'Lift 1,000,000 kg of total volume', category: 'volume', targetValue: 1000000, xpReward: 5000, icon: 'planet' },

  // ----------------------------------------------------------------------- //
  // ONE-TIME — Exercise Variety
  // ----------------------------------------------------------------------- //
  { id: 'unique_exercises_10', name: 'Explorer', description: 'Perform 10 different exercises', category: 'exercises', targetValue: 10, xpReward: 100, icon: 'compass' },
  { id: 'unique_exercises_30', name: 'Adventurer', description: 'Perform 30 different exercises', category: 'exercises', targetValue: 30, xpReward: 300, icon: 'compass' },
  { id: 'unique_exercises_50', name: 'Master of Variety', description: 'Perform 50 different exercises', category: 'exercises', targetValue: 50, xpReward: 500, icon: 'compass' },
  { id: 'unique_exercises_75', name: 'Movement Encyclopedia', description: 'Perform 75 different exercises', category: 'exercises', targetValue: 75, xpReward: 800, icon: 'library' },

  // ----------------------------------------------------------------------- //
  // ONE-TIME — Muscle Coverage
  // ----------------------------------------------------------------------- //
  { id: 'muscles_5', name: 'Well Rounded', description: 'Train 5 different muscle groups', category: 'muscles', targetValue: 5, xpReward: 100, icon: 'body' },
  { id: 'muscles_10', name: 'Full Coverage', description: 'Train 10 different muscle groups', category: 'muscles', targetValue: 10, xpReward: 300, icon: 'body' },
  { id: 'muscles_all', name: 'Total Domination', description: 'Train 15 different muscle groups', category: 'muscles', targetValue: 15, xpReward: 600, icon: 'body' },

  // ----------------------------------------------------------------------- //
  // REPEATABLE — earned again every qualifying workout
  // ----------------------------------------------------------------------- //
  { id: 'rep_workout_complete', name: 'Session Logged', description: 'Finish any workout', category: 'workouts', targetValue: 1, xpReward: 25, icon: 'checkmark-done', repeatable: true },
  { id: 'rep_session_volume_5k', name: 'Tonnage', description: 'Move 5,000 kg in a single workout', category: 'volume', targetValue: 5000, xpReward: 40, icon: 'barbell', repeatable: true },
  { id: 'rep_session_volume_10k', name: 'Big Session', description: 'Move 10,000 kg in a single workout', category: 'volume', targetValue: 10000, xpReward: 80, icon: 'barbell', repeatable: true },
  { id: 'rep_session_pr', name: 'PR Hunter', description: 'Set a new PR in a workout', category: 'pr', targetValue: 1, xpReward: 50, icon: 'star', repeatable: true },
  { id: 'rep_session_pr_3', name: 'PR Frenzy', description: 'Set 3 PRs in a single workout', category: 'pr', targetValue: 3, xpReward: 120, icon: 'flash', repeatable: true },
  { id: 'rep_session_sets_20', name: 'Volume Grinder', description: 'Complete 20 sets in a single workout', category: 'session', targetValue: 20, xpReward: 40, icon: 'layers', repeatable: true },
  { id: 'rep_session_sets_30', name: 'Marathon Session', description: 'Complete 30 sets in a single workout', category: 'session', targetValue: 30, xpReward: 70, icon: 'layers', repeatable: true },
];
