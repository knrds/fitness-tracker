import {
  COLORWAY_REWARDS,
  CELEBRATION_REWARDS,
  isColorwayUnlocked,
  isCelebrationUnlocked,
  getColorwayRewardConfig,
  getCelebrationRewardConfig,
} from '../rewards';

describe('rewards utility', () => {
  it('contains 10 configured colorways with 3 light modes and 7 dark modes', () => {
    expect(COLORWAY_REWARDS).toHaveLength(10);
    const lightModes = COLORWAY_REWARDS.filter((c) => c.isLight);
    const darkModes = COLORWAY_REWARDS.filter((c) => !c.isLight);
    expect(lightModes).toHaveLength(3);
    expect(darkModes).toHaveLength(7);

    expect(lightModes.map((c) => c.id)).toEqual(['arctic', 'solar', 'alpine']);
  });

  it('correctly evaluates colorway unlocks based on level', () => {
    // Level 1: starter colorways unlocked, higher locked
    expect(isColorwayUnlocked('glacier', 1)).toBe(true);
    expect(isColorwayUnlocked('amber', 1)).toBe(true);
    expect(isColorwayUnlocked('arctic', 1)).toBe(false);
    expect(isColorwayUnlocked('solar', 1)).toBe(false);
    expect(isColorwayUnlocked('titanium', 1)).toBe(false);

    // Level 6 (Rank 2): Arctic Lab unlocks
    expect(isColorwayUnlocked('arctic', 6)).toBe(true);
    expect(isColorwayUnlocked('solar', 6)).toBe(false);

    // Level 16 (Rank 4): Solar Dune unlocks
    expect(isColorwayUnlocked('solar', 16)).toBe(true);
    expect(isColorwayUnlocked('alpine', 16)).toBe(false);

    // Level 31 (Rank 7): Alpine Mist unlocks
    expect(isColorwayUnlocked('alpine', 31)).toBe(true);
    expect(isColorwayUnlocked('titanium', 31)).toBe(false);

    // Level 45: Titanium unlocked
    expect(isColorwayUnlocked('titanium', 45)).toBe(true);
  });

  it('correctly evaluates celebration effect unlocks based on level', () => {
    expect(CELEBRATION_REWARDS).toHaveLength(4);

    // Level 1: classic unlocked, others locked
    expect(isCelebrationUnlocked('classic', 1)).toBe(true);
    expect(isCelebrationUnlocked('neon', 1)).toBe(false);
    expect(isCelebrationUnlocked('gold', 1)).toBe(false);
    expect(isCelebrationUnlocked('cosmic', 1)).toBe(false);

    // Level 11 (Rank 3): neon unlocks
    expect(isCelebrationUnlocked('neon', 11)).toBe(true);
    expect(isCelebrationUnlocked('gold', 11)).toBe(false);

    // Level 26 (Rank 6): gold unlocks
    expect(isCelebrationUnlocked('gold', 26)).toBe(true);
    expect(isCelebrationUnlocked('cosmic', 26)).toBe(false);

    // Level 41 (Rank 9): cosmic unlocks
    expect(isCelebrationUnlocked('cosmic', 41)).toBe(true);
  });

  it('provides reward config lookups', () => {
    const solarConfig = getColorwayRewardConfig('solar');
    expect(solarConfig?.name).toBe('Solar Dune (Light)');
    expect(solarConfig?.requiredLevel).toBe(16);

    const cosmicConfig = getCelebrationRewardConfig('cosmic');
    expect(cosmicConfig?.name).toBe('Supernova Starlight');
    expect(cosmicConfig?.requiredLevel).toBe(41);
  });
});
