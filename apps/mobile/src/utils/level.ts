import type { ImageSourcePropType } from 'react-native';

import rank01 from '../../assets/ranks/rank-01.png';
import rank02 from '../../assets/ranks/rank-02.png';
import rank03 from '../../assets/ranks/rank-03.png';
import rank04 from '../../assets/ranks/rank-04.png';
import rank05 from '../../assets/ranks/rank-05.png';
import rank06 from '../../assets/ranks/rank-06.png';
import rank07 from '../../assets/ranks/rank-07.png';
import rank08 from '../../assets/ranks/rank-08.png';
import rank09 from '../../assets/ranks/rank-09.png';
import rank10 from '../../assets/ranks/rank-10.png';

export const RANK_ICONS: Record<number, ImageSourcePropType> = {
  1: rank01 as ImageSourcePropType,
  2: rank02 as ImageSourcePropType,
  3: rank03 as ImageSourcePropType,
  4: rank04 as ImageSourcePropType,
  5: rank05 as ImageSourcePropType,
  6: rank06 as ImageSourcePropType,
  7: rank07 as ImageSourcePropType,
  8: rank08 as ImageSourcePropType,
  9: rank09 as ImageSourcePropType,
  10: rank10 as ImageSourcePropType,
};

export interface LevelRankConfig {
  rank: number;
  minLevel: number;
  maxLevel: number;
  title: string;
}

export const LEVEL_RANKS: LevelRankConfig[] = [
  { rank: 1, minLevel: 1, maxLevel: 5, title: 'Novice Lifter' },
  { rank: 2, minLevel: 6, maxLevel: 10, title: 'Building Strength' },
  { rank: 3, minLevel: 11, maxLevel: 15, title: 'Consistent Lifter' },
  { rank: 4, minLevel: 16, maxLevel: 20, title: 'Advanced Lifter' },
  { rank: 5, minLevel: 21, maxLevel: 25, title: 'Dedicated Athlete' },
  { rank: 6, minLevel: 26, maxLevel: 30, title: 'Performance Athlete' },
  { rank: 7, minLevel: 31, maxLevel: 35, title: 'Mastery Candidate' },
  { rank: 8, minLevel: 36, maxLevel: 40, title: 'Iron Veteran' },
  { rank: 9, minLevel: 41, maxLevel: 45, title: 'Elite Lifter' },
  { rank: 10, minLevel: 46, maxLevel: 50, title: 'EVARO Master' },
];

export interface UserRankInfo {
  rank: number;
  minLevel: number;
  maxLevel: number;
  icon: ImageSourcePropType;
  currentLevel: number;
  nextRankLevel: number | null;
  title: string;
}

export function getRankForLevel(level: number): UserRankInfo {
  const normalizedLevel = Math.max(1, Math.floor(level || 1));

  const matched = LEVEL_RANKS.find(
    (tier) => normalizedLevel >= tier.minLevel && normalizedLevel <= tier.maxLevel,
  );

  if (matched) {
    const nextTier = LEVEL_RANKS.find((tier) => tier.rank === matched.rank + 1);
    return {
      rank: matched.rank,
      minLevel: matched.minLevel,
      maxLevel: matched.maxLevel,
      icon: RANK_ICONS[matched.rank] ?? RANK_ICONS[1]!,
      currentLevel: level,
      nextRankLevel: nextTier ? nextTier.minLevel : null,
      title: matched.title,
    };
  }

  // Level > 50 fallback to highest rank (prestige-ready)
  const highest = LEVEL_RANKS[LEVEL_RANKS.length - 1]!;
  return {
    rank: highest.rank,
    minLevel: highest.minLevel,
    maxLevel: highest.maxLevel,
    icon: RANK_ICONS[highest.rank] ?? RANK_ICONS[10]!,
    currentLevel: level,
    nextRankLevel: null,
    title: highest.title,
  };
}

export interface LevelBadge {
  title: string;
  icon: string;
  rank: number;
}

export const getLevelBadge = (level: number): LevelBadge => {
  const info = getRankForLevel(level);
  return {
    title: info.title,
    icon: String(info.rank),
    rank: info.rank,
  };
};
