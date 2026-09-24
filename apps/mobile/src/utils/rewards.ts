import { Colorway } from '@fitness-tracker/ui';
import {
  getXpRequiredForLevel,
  calculateLevelFromXp,
  getLevelProgress,
  type LevelProgressInfo,
} from '@fitness-tracker/domain';
import { CelebrationEffect } from '../stores/profileStore';
import { translations, Language } from '../i18n';

export { getXpRequiredForLevel, calculateLevelFromXp, getLevelProgress, type LevelProgressInfo };

export interface RewardColorwayConfig {
  id: Colorway;
  name: string;
  subtitle: string;
  isLight: boolean;
  requiredLevel: number;
  requiredRank: number;
}

export interface RewardCelebrationConfig {
  id: CelebrationEffect;
  name: string;
  subtitle: string;
  description: string;
  requiredLevel: number;
  requiredRank: number;
  previewColors: string[];
}

export const COLORWAY_REWARDS: RewardColorwayConfig[] = [
  { id: 'linen', name: 'Linen', subtitle: 'Linen · Terracotta', requiredLevel: 6, requiredRank: 2, isLight: true },
  { id: 'sage', name: 'Sage', subtitle: 'Sage · Forest', requiredLevel: 11, requiredRank: 3, isLight: true },
  { id: 'slate', name: 'Soft Slate', subtitle: 'Slate · Sky', requiredLevel: 16, requiredRank: 4, isLight: false },

  // Dark Themes
  {
    id: 'glacier',
    name: 'Glacier Core',
    subtitle: 'Cyan · Kühles Graphit (Standard)',
    isLight: false,
    requiredLevel: 1,
    requiredRank: 1,
  },
  {
    id: 'crimson',
    name: 'Crimson Neon',
    subtitle: 'Neon Magenta · Velvet Obsidian',
    isLight: false,
    requiredLevel: 11,
    requiredRank: 3,
  },
  {
    id: 'verde',
    name: 'EVARO Verde',
    subtitle: 'Mint Bio-Signal · Obsidian',
    isLight: false,
    requiredLevel: 21,
    requiredRank: 5,
  },
  {
    id: 'telemetry',
    name: 'Telemetry Cyber',
    subtitle: 'Electric Lime · Midnight Navy',
    isLight: false,
    requiredLevel: 26,
    requiredRank: 6,
  },
  {
    id: 'ember',
    name: 'EVARO Ember',
    subtitle: 'Ember Orange · Deep Carbon',
    isLight: false,
    requiredLevel: 36,
    requiredRank: 8,
  },
  {
    id: 'avionics',
    name: 'Avionics Stealth',
    subtitle: 'Zinc Matrix · Acid Lime',
    isLight: false,
    requiredLevel: 41,
    requiredRank: 9,
  },
  {
    id: 'titanium',
    name: 'Royal Titanium',
    subtitle: 'Champagne Gold · Luxury',
    isLight: false,
    requiredLevel: 46,
    requiredRank: 10,
  },

  // Light Themes
  {
    id: 'arctic',
    name: 'Arctic Lab (Light)',
    subtitle: 'Clean White · Ocean Cyan (Standard)',
    isLight: true,
    requiredLevel: 1,
    requiredRank: 1,
  },
  {
    id: 'solar',
    name: 'Solar Dune (Light)',
    subtitle: 'Warm Sand · Amber Gold',
    isLight: true,
    requiredLevel: 6,
    requiredRank: 2,
  },
  {
    id: 'rose',
    name: 'Porcelain Rose (Light)',
    subtitle: 'Porzellan · Korallen-Rose',
    isLight: true,
    requiredLevel: 16,
    requiredRank: 4,
  },
  {
    id: 'alpine',
    name: 'Alpine Mist (Light)',
    subtitle: 'Studio Snow · Electric Indigo',
    isLight: true,
    requiredLevel: 31,
    requiredRank: 7,
  },
];

export const CELEBRATION_REWARDS: RewardCelebrationConfig[] = [
  {
    id: 'classic',
    name: 'Klassisches Konfetti',
    subtitle: 'Klassische Farbpartikel',
    description: 'Bunte dynamische Partikel bei jedem abgeschlossenen Workout.',
    requiredLevel: 1,
    requiredRank: 1,
    previewColors: ['#00F0FF', '#FFB84D', '#57DFAB', '#FF6686'],
  },
  {
    id: 'inferno',
    name: 'Inferno Ember Storm',
    subtitle: 'Glühende Funken & Flammenwirbel',
    description: 'Lodernde Glutpartikel und aufsteigende Funken für hitzige Trainingserfolge.',
    requiredLevel: 8,
    requiredRank: 2,
    previewColors: ['#FF3B30', '#FF9500', '#FFCC00', '#FF2D55'],
  },
  {
    id: 'neon',
    name: 'Cyber Neon Rain',
    subtitle: 'Laser-Sparks & Neon-Streifen',
    description: 'Futuristische High-Speed Lichtstreifen in Cyan, Pink & Lime.',
    requiredLevel: 13,
    requiredRank: 3,
    previewColors: ['#00F0FF', '#FF007F', '#39FF14', '#A855F7'],
  },
  {
    id: 'gold',
    name: 'Champion Gold Shower',
    subtitle: 'Goldmünzen & Champagner-Glanz',
    description: 'Goldene Medaillon-Münzen, Sterne und schimmernder Goldstaub.',
    requiredLevel: 29,
    requiredRank: 6,
    previewColors: ['#FFD700', '#F59E0B', '#D97706', '#FFFBEB'],
  },
  {
    id: 'matrix',
    name: 'Quantum Matrix Stream',
    subtitle: 'Binäre Lichtimpulse & Cyber-Prisma',
    description: 'Kaskadierende digitale Matrix-Codes und fluoreszierende Lichtimpulse.',
    requiredLevel: 33,
    requiredRank: 7,
    previewColors: ['#00FF66', '#00F0FF', '#10B981', '#E0F2FE'],
  },
  {
    id: 'cosmic',
    name: 'Supernova Starlight',
    subtitle: 'Diamant-Sterne & Kosmische Funken',
    description: 'Galaktische Diamant-Funken und rotierende Supernova-Sterne.',
    requiredLevel: 43,
    requiredRank: 9,
    previewColors: ['#C084FC', '#38BDF8', '#F43F5E', '#FFFFFF'],
  },
];

export function isColorwayUnlocked(colorwayId: Colorway, userLevel: number): boolean {
  const config = COLORWAY_REWARDS.find((c) => c.id === colorwayId);
  if (!config) return true;
  return userLevel >= config.requiredLevel;
}

export function getColorwayRewardConfig(colorwayId: Colorway): RewardColorwayConfig | undefined {
  return COLORWAY_REWARDS.find((c) => c.id === colorwayId);
}

export function isCelebrationUnlocked(effectId: CelebrationEffect, userLevel: number): boolean {
  const config = CELEBRATION_REWARDS.find((c) => c.id === effectId);
  if (!config) return true;
  return userLevel >= config.requiredLevel;
}

export function getCelebrationRewardConfig(
  effectId: CelebrationEffect,
): RewardCelebrationConfig | undefined {
  return CELEBRATION_REWARDS.find((c) => c.id === effectId);
}

export function getLocalizedCelebrationConfig(
  config: RewardCelebrationConfig,
  lang: Language = 'de',
): RewardCelebrationConfig {
  const loc =
    translations[lang]?.celebrations?.[config.id] ||
    translations.de.celebrations?.[config.id];
  if (!loc) return config;
  return {
    ...config,
    name: loc.name,
    subtitle: loc.subtitle,
    description: loc.description,
  };
}

export function getXpForLevel(level: number): number {
  return getXpRequiredForLevel(level);
}

export function getRemainingXpForLevel(targetLevel: number, currentXp: number): number {
  const targetXp = getXpForLevel(targetLevel);
  return Math.max(0, targetXp - Math.max(0, currentXp));
}

export interface LevelRewardsPayload {
  level: number;
  colorways: RewardColorwayConfig[];
  celebrations: RewardCelebrationConfig[];
  hasRewards: boolean;
}

export function getLevelRewards(level: number): LevelRewardsPayload {
  const colorways = COLORWAY_REWARDS.filter((c) => c.requiredLevel === level);
  const celebrations = CELEBRATION_REWARDS.filter((c) => c.requiredLevel === level);
  return {
    level,
    colorways,
    celebrations,
    hasRewards: colorways.length > 0 || celebrations.length > 0,
  };
}
