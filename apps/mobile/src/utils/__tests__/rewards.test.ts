import {
  COLORWAY_REWARDS,
  CELEBRATION_REWARDS,
  isColorwayUnlocked,
  isCelebrationUnlocked,
  getColorwayRewardConfig,
  getCelebrationRewardConfig,
  getXpForLevel,
  getRemainingXpForLevel,
  getLevelRewards,
} from '../rewards';

describe('rewards utility', () => {
  it('contains 11 configured colorways with 4 light modes and 7 dark modes', () => {
    expect(COLORWAY_REWARDS).toHaveLength(11);
    const lightModes = COLORWAY_REWARDS.filter((c) => c.isLight);
    const darkModes = COLORWAY_REWARDS.filter((c) => !c.isLight);
    expect(lightModes).toHaveLength(4);
    expect(darkModes).toHaveLength(7);

    expect(lightModes.map((c) => c.id)).toEqual(['arctic', 'solar', 'rose', 'alpine']);
    expect(darkModes.map((c) => c.id)).toEqual([
      'glacier',
      'crimson',
      'verde',
      'telemetry',
      'ember',
      'avionics',
      'titanium',
    ]);
  });

  it('provides both a Dark Mode and a Light Mode from Level 1', () => {
    expect(isColorwayUnlocked('glacier', 1)).toBe(true);
    expect(isColorwayUnlocked('arctic', 1)).toBe(true);
    // Higher tier colorways locked
    expect(isColorwayUnlocked('solar', 1)).toBe(false);
    expect(isColorwayUnlocked('crimson', 1)).toBe(false);
    expect(isColorwayUnlocked('rose', 1)).toBe(false);
    expect(isColorwayUnlocked('titanium', 1)).toBe(false);
  });

  it('correctly evaluates colorway unlocks as user progresses', () => {
    // Level 6 (Rank 2): Solar Dune unlocks
    expect(isColorwayUnlocked('solar', 6)).toBe(true);
    expect(isColorwayUnlocked('crimson', 6)).toBe(false);

    // Level 11 (Rank 3): Crimson Neon unlocks
    expect(isColorwayUnlocked('crimson', 11)).toBe(true);
    expect(isColorwayUnlocked('rose', 11)).toBe(false);

    // Level 16 (Rank 4): Porcelain Rose unlocks
    expect(isColorwayUnlocked('rose', 16)).toBe(true);
    expect(isColorwayUnlocked('alpine', 16)).toBe(false);

    // Level 31 (Rank 7): Alpine Mist unlocks
    expect(isColorwayUnlocked('alpine', 31)).toBe(true);
    expect(isColorwayUnlocked('titanium', 31)).toBe(false);

    // Level 46 (Rank 10): Titanium unlocks
    expect(isColorwayUnlocked('titanium', 46)).toBe(true);
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

  it('calculates XP and missing distance correctly', () => {
    expect(getXpForLevel(1)).toBe(0);
    expect(getXpForLevel(2)).toBe(500);
    expect(getXpForLevel(6)).toBe(2500);
    expect(getXpForLevel(11)).toBe(5000);

    // User at 1800 XP
    expect(getRemainingXpForLevel(5, 1800)).toBe(2000 - 1800); // 200 XP
    expect(getRemainingXpForLevel(3, 1800)).toBe(0); // already reached
  });

  it('retrieves level reward payloads for inspection', () => {
    const lvl1 = getLevelRewards(1);
    expect(lvl1.hasRewards).toBe(true);
    expect(lvl1.colorways.map((c) => c.id)).toContain('glacier');
    expect(lvl1.colorways.map((c) => c.id)).toContain('arctic');
    expect(lvl1.celebrations.map((c) => c.id)).toContain('classic');

    const lvl11 = getLevelRewards(11);
    expect(lvl11.hasRewards).toBe(true);
    expect(lvl11.colorways.map((c) => c.id)).toContain('crimson');
    expect(lvl11.celebrations.map((c) => c.id)).toContain('neon');

    const lvl4 = getLevelRewards(4);
    expect(lvl4.hasRewards).toBe(false);
    expect(lvl4.colorways).toHaveLength(0);
  });

  it('provides reward config lookups', () => {
    const crimsonConfig = getColorwayRewardConfig('crimson');
    expect(crimsonConfig?.name).toBe('Crimson Neon');
    expect(crimsonConfig?.requiredLevel).toBe(11);

    const roseConfig = getColorwayRewardConfig('rose');
    expect(roseConfig?.name).toBe('Porcelain Rose (Light)');
    expect(roseConfig?.requiredLevel).toBe(16);

    const cosmicConfig = getCelebrationRewardConfig('cosmic');
    expect(cosmicConfig?.name).toBe('Supernova Starlight');
    expect(cosmicConfig?.requiredLevel).toBe(41);
  });
});
