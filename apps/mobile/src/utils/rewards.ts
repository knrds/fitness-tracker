import { Colorway, colorways } from '@fitness-tracker/ui';
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

const colorwayLevels: Partial<Record<Colorway, number>> = {
  mocha: 1, ultraviolet: 1, cherry: 25, bordeaux: 50,
  glacier: 1, arctic: 1, solar: 2, slate: 4, linen: 6, crimson: 10,
  sage: 14, verde: 18, rose: 22, telemetry: 26, lavender: 30,
  ember: 34, alpine: 38, avionics: 42, titanium: 46,
};
export const COLORWAY_REWARDS: RewardColorwayConfig[] = colorways.map(option => ({
  id: option.id, name: option.name, subtitle: option.description, isLight: !!option.isLight,
  requiredLevel: colorwayLevels[option.id] ?? 1,
  requiredRank: Math.floor(((colorwayLevels[option.id] ?? 1) - 1) / 5) + 1,
})).sort((a, b) => Number(!['glacier', 'arctic'].includes(a.id)) - Number(!['glacier', 'arctic'].includes(b.id)) || Number(a.isLight) - Number(b.isLight) || a.requiredLevel - b.requiredLevel);
export const CELEBRATION_REWARDS: RewardCelebrationConfig[] = [
  { id: 'aurora', name: 'Aurora Ribbons', subtitle: 'Flowing ribbons', description: 'Soft ribbons drift across the sky.', requiredLevel: 3, requiredRank: 1, previewColors: ['#5EEAD4', '#A78BFA', '#F9A8D4'] },
  { id: 'fireworks', name: 'Victory Fireworks', subtitle: 'Radial bursts', description: 'A bright radial finale for your workout.', requiredLevel: 50, requiredRank: 10, previewColors: ['#FCD34D', '#FB7185', '#38BDF8'] },
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
    requiredLevel: 16,
    requiredRank: 4,
    previewColors: ['#00F0FF', '#FF007F', '#39FF14', '#A855F7'],
  },
  {
    id: 'gold',
    name: 'Champion Gold Shower',
    subtitle: 'Goldmünzen & Champagner-Glanz',
    description: 'Goldene Medaillon-Münzen, Sterne und schimmernder Goldstaub.',
    requiredLevel: 24,
    requiredRank: 5,
    previewColors: ['#FFD700', '#F59E0B', '#D97706', '#FFFBEB'],
  },
  {
    id: 'matrix',
    name: 'Quantum Matrix Stream',
    subtitle: 'Binäre Lichtimpulse & Cyber-Prisma',
    description: 'Kaskadierende digitale Matrix-Codes und fluoreszierende Lichtimpulse.',
    requiredLevel: 32,
    requiredRank: 7,
    previewColors: ['#00FF66', '#00F0FF', '#10B981', '#E0F2FE'],
  },
  {
    id: 'cosmic',
    name: 'Supernova Starlight',
    subtitle: 'Diamant-Sterne & Kosmische Funken',
    description: 'Galaktische Diamant-Funken und rotierende Supernova-Sterne.',
    requiredLevel: 40,
    requiredRank: 8,
    previewColors: ['#C084FC', '#38BDF8', '#F43F5E', '#FFFFFF'],
  },
].sort((a, b) => a.requiredLevel - b.requiredLevel) as RewardCelebrationConfig[];

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
