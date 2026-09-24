import type { WorkoutSession } from '../types';
import { calculateVolume } from './calculateVolume';

export interface LevelProgressInfo {
  level: number;
  currentLevelBaseXp: number;
  nextLevelBaseXp: number;
  xpInCurrentLevel: number;
  xpRequiredForNextLevel: number;
  remainingXp: number;
  progressPercent: number;
}

export interface SessionXpBreakdown {
  baseXp: number;
  volumeBonus: number;
  prBonus: number;
  setBonus: number;
  totalSessionXp: number;
}

const MAX_PRECOMPUTED_LEVEL = 100;

/**
 * Precomputed XP thresholds for levels 1 to 100.
 *
 * Curve formula:
 * Level 1: 0 XP
 * Level L (for L >= 2, where n = L - 1):
 * XP(L) = 10 * n^3 + 50 * n^2 + 350 * n
 *
 * Progression phases:
 * - Early Game (L1–5):
 *   Level 1: 0 XP
 *   Level 2: 410 XP (reached within the first representative workout)
 *   Level 3: 980 XP (reached within the first representative workout)
 *   Level 4: 1,770 XP (~2 cumulative representative workouts)
 *   Level 5: 2,840 XP (~3 cumulative representative workouts)
 * - Mid Game (L6–15):
 *   Level 6: 4,250 XP (Delta: 1,410)
 *   Level 10: 14,490 XP (~12 cumulative representative workouts)
 *   Level 15: 42,140 XP (~33 cumulative representative workouts)
 * - Late Game (L16+):
 *   Level 20: 93,290 XP (~71 cumulative representative workouts)
 *   Level 30: ~225 cumulative representative workouts
 *   Level 50: 1,313,690 XP (~1,000 cumulative representative workouts)
 */
const LEVEL_XP_THRESHOLDS: number[] = Array.from(
  { length: MAX_PRECOMPUTED_LEVEL + 1 },
  (_, level) => {
    if (level <= 1) return 0;
    const n = level - 1;
    return 10 * n * n * n + 50 * n * n + 350 * n;
  },
);

/**
 * Returns the cumulative total XP required to reach a specific level.
 */
export function getXpRequiredForLevel(level: number): number {
  const normalizedLevel = Math.max(1, Math.floor(level || 1));
  if (normalizedLevel <= 1) return 0;
  if (normalizedLevel <= MAX_PRECOMPUTED_LEVEL) {
    return LEVEL_XP_THRESHOLDS[normalizedLevel]!;
  }
  const n = normalizedLevel - 1;
  return 10 * n * n * n + 50 * n * n + 350 * n;
}

/**
 * Returns the incremental XP delta required to advance from (level - 1) to level.
 */
export function getDeltaXpForLevel(level: number): number {
  const normalizedLevel = Math.max(1, Math.floor(level || 1));
  if (normalizedLevel <= 1) return 0;
  return getXpRequiredForLevel(normalizedLevel) - getXpRequiredForLevel(normalizedLevel - 1);
}

/**
 * Derives the player's level from cumulative total XP.
 * Performs a fast exact binary search over monotonic level thresholds.
 */
export function calculateLevelFromXp(totalXp: number): number {
  const safeXp = Math.max(0, Math.floor(totalXp || 0));
  if (safeXp < LEVEL_XP_THRESHOLDS[2]!) return 1;

  let low = 1;
  let high = MAX_PRECOMPUTED_LEVEL;
  let result = 1;

  while (low <= high) {
    const mid = Math.floor((low + high) / 2);
    if (LEVEL_XP_THRESHOLDS[mid]! <= safeXp) {
      result = mid;
      low = mid + 1;
    } else {
      high = mid - 1;
    }
  }

  return Math.max(1, result);
}

/**
 * Returns full progress information for a given total XP amount.
 */
export function getLevelProgress(totalXp: number): LevelProgressInfo {
  const safeXp = Math.max(0, Math.floor(totalXp || 0));
  const level = calculateLevelFromXp(safeXp);
  const currentLevelBaseXp = getXpRequiredForLevel(level);
  const nextLevelBaseXp = getXpRequiredForLevel(level + 1);

  const xpInCurrentLevel = Math.max(0, safeXp - currentLevelBaseXp);
  const xpRequiredForNextLevel = Math.max(1, nextLevelBaseXp - currentLevelBaseXp);
  const remainingXp = Math.max(0, nextLevelBaseXp - safeXp);
  const progressPercent = Math.min(
    100,
    Math.max(0, (xpInCurrentLevel / xpRequiredForNextLevel) * 100),
  );

  return {
    level,
    currentLevelBaseXp,
    nextLevelBaseXp,
    xpInCurrentLevel,
    xpRequiredForNextLevel,
    remainingXp,
    progressPercent,
  };
}

/**
 * Calculates session XP rewards with diminishing returns and safety bounds.
 *
 * Guarantees:
 * - Empty / uncompleted workout: 0 XP
 * Components below describe the base economy; all awards are scaled by WORKOUT_XP_SCALE.
 * - Base completion: 50 XP
 * - Set bonus: up to 30 XP (diminishing: 2 XP/set for sets 1-10, 1 XP/set for sets 11-20)
 * - Volume bonus: up to 110 XP (first 5k kg at 1 XP/100kg, next 10k kg at 1 XP/250kg, rest at 1 XP/500kg capped)
 * - PR bonus: 25 XP per PR, capped at 75 XP (max 3 PRs)
 * - Scaled total session XP cap: 2,385 XP
 * - Reference workout: 1,314 XP, excluding separate achievement awards
 */
export function calculateSessionXp(
  session: WorkoutSession,
  sessionPrCount: number = 0,
): SessionXpBreakdown {
  const completedSetsCount = session.exercises.reduce(
    (sum, ex) => sum + ex.sets.filter((s) => s.completed && s.type !== 'warmup').length,
    0,
  );

  // Must have at least 1 completed non-warmup set to earn XP
  if (completedSetsCount === 0) {
    return {
      baseXp: 0,
      volumeBonus: 0,
      prBonus: 0,
      setBonus: 0,
      totalSessionXp: 0,
    };
  }

  const baseXp = 50;

  // Set bonus with diminishing returns
  // Sets 1-10: 2 XP each (max 20)
  // Sets 11-20: 1 XP each (max 10)
  // Beyond 20: 0 XP
  const tier1Sets = Math.min(10, completedSetsCount);
  const tier2Sets = Math.max(0, Math.min(10, completedSetsCount - 10));
  const setBonus = Math.min(30, tier1Sets * 2 + tier2Sets * 1);

  // Volume bonus with diminishing returns
  const sessionVolume = calculateVolume(session, { includeWarmups: false });
  let volumeBonus = 0;
  if (sessionVolume > 0) {
    const tier1Vol = Math.min(5000, sessionVolume); // 0 - 5k kg
    const tier2Vol = Math.max(0, Math.min(10000, sessionVolume - 5000)); // 5k - 15k kg
    const tier3Vol = Math.max(0, sessionVolume - 15000); // > 15k kg

    const bonus1 = Math.floor(tier1Vol / 100); // max 50 XP
    const bonus2 = Math.floor(tier2Vol / 250); // max 40 XP
    const bonus3 = Math.min(20, Math.floor(tier3Vol / 500)); // max 20 XP

    volumeBonus = Math.min(110, bonus1 + bonus2 + bonus3);
  }

  // PR bonus: 25 XP per PR, capped at 75 XP (max 3 PRs)
  const prBonus = Math.min(75, Math.max(0, sessionPrCount) * 25);

  const totalSessionXp = (baseXp + setBonus + volumeBonus + prBonus) * WORKOUT_XP_SCALE;

  return {
    baseXp: baseXp * WORKOUT_XP_SCALE,
    volumeBonus: volumeBonus * WORKOUT_XP_SCALE,
    prBonus: prBonus * WORKOUT_XP_SCALE,
    setBonus: setBonus * WORKOUT_XP_SCALE,
    totalSessionXp,
  };
}


/** Beta economics: 16 completed sets and 10,000 kg = 1,314 XP, ~1,000 sessions to L50.
 * No retroactive awards or threshold migration. Duration does not reward idle time.
 */
export const WORKOUT_XP_SCALE = 9;
export const REPRESENTATIVE_WORKOUT_XP = (50 + 26 + 70) * WORKOUT_XP_SCALE;
export function estimateWorkoutsToLevel(currentXp: number, targetLevel: number, sessions: readonly WorkoutSession[] = []): number {
  const samples = sessions.map(session => calculateSessionXp(session).totalSessionXp).filter(xp => xp > 0).sort((a, b) => a - b);
  const median = samples.length >= 5 ? samples[Math.floor(samples.length / 2)]! : REPRESENTATIVE_WORKOUT_XP;
  const expected = Math.max(REPRESENTATIVE_WORKOUT_XP / 2, Math.min(REPRESENTATIVE_WORKOUT_XP * 2, median));
  return Math.ceil(Math.max(0, getXpRequiredForLevel(targetLevel) - (Number.isFinite(currentXp) ? Math.max(0, currentXp) : 0)) / expected);
}
