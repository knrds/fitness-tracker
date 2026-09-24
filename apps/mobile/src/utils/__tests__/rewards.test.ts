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
  it('contains 14 configured colorways with 6 light modes and 8 dark modes', () => {
    expect(COLORWAY_REWARDS).toHaveLength(14);
    const lightModes = COLORWAY_REWARDS.filter((c) => c.isLight);
    const darkModes = COLORWAY_REWARDS.filter((c) => !c.isLight);
    expect(lightModes).toHaveLength(6);
    expect(darkModes).toHaveLength(8);

    expect(lightModes.map((c) => c.id)).toEqual(['linen', 'sage', 'arctic', 'solar', 'rose', 'alpine']);
    expect(darkModes.map((c) => c.id)).toEqual([
      'slate',
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

  it('correctly evaluates celebration effect unlocks including mid-level rewards', () => {
    expect(CELEBRATION_REWARDS).toHaveLength(6);

    // Level 1: classic unlocked, others locked
    expect(isCelebrationUnlocked('classic', 1)).toBe(true);
    expect(isCelebrationUnlocked('inferno', 1)).toBe(false);
    expect(isCelebrationUnlocked('neon', 1)).toBe(false);
    expect(isCelebrationUnlocked('gold', 1)).toBe(false);
    expect(isCelebrationUnlocked('matrix', 1)).toBe(false);
    expect(isCelebrationUnlocked('cosmic', 1)).toBe(false);

    // Level 8 (Rank 2 mid-level!): inferno unlocks
    expect(isCelebrationUnlocked('inferno', 8)).toBe(true);
    expect(isCelebrationUnlocked('neon', 8)).toBe(false);

    // Level 13 (Rank 3 mid-level!): neon unlocks
    expect(isCelebrationUnlocked('neon', 13)).toBe(true);
    expect(isCelebrationUnlocked('gold', 13)).toBe(false);

    // Level 29 (Rank 6 mid-level!): gold unlocks
    expect(isCelebrationUnlocked('gold', 29)).toBe(true);
    expect(isCelebrationUnlocked('matrix', 29)).toBe(false);

    // Level 33 (Rank 7 mid-level!): matrix unlocks
    expect(isCelebrationUnlocked('matrix', 33)).toBe(true);
    expect(isCelebrationUnlocked('cosmic', 33)).toBe(false);

    // Level 43 (Rank 9 mid-level!): cosmic unlocks
    expect(isCelebrationUnlocked('cosmic', 43)).toBe(true);
  });

  it('calculates XP and missing distance correctly', () => {
    expect(getXpForLevel(1)).toBe(0);
    expect(getXpForLevel(2)).toBe(410);
    expect(getXpForLevel(6)).toBe(4250);
    expect(getXpForLevel(11)).toBe(18500);

    // User at 1800 XP
    expect(getRemainingXpForLevel(5, 1800)).toBe(2840 - 1800); // 1040 XP
    expect(getRemainingXpForLevel(2, 1800)).toBe(0); // already reached (Level 2 is 410 XP)
  });

  it('retrieves level reward payloads for inspection including mid-level rewards', () => {
    const lvl1 = getLevelRewards(1);
    expect(lvl1.hasRewards).toBe(true);
    expect(lvl1.colorways.map((c) => c.id)).toContain('glacier');
    expect(lvl1.colorways.map((c) => c.id)).toContain('arctic');
    expect(lvl1.celebrations.map((c) => c.id)).toContain('classic');

    // Rank 3 theme Crimson Neon on Level 11 (no celebration collision!)
    const lvl11 = getLevelRewards(11);
    expect(lvl11.hasRewards).toBe(true);
    expect(lvl11.colorways.map((c) => c.id)).toContain('crimson');
    expect(lvl11.celebrations).toHaveLength(0);

    // Mid-level 8 has inferno!
    const lvl8 = getLevelRewards(8);
    expect(lvl8.hasRewards).toBe(true);
    expect(lvl8.celebrations.map((c) => c.id)).toContain('inferno');

    // Mid-level 13 has neon!
    const lvl13 = getLevelRewards(13);
    expect(lvl13.hasRewards).toBe(true);
    expect(lvl13.celebrations.map((c) => c.id)).toContain('neon');

    // Mid-level 29 has gold!
    const lvl29 = getLevelRewards(29);
    expect(lvl29.hasRewards).toBe(true);
    expect(lvl29.celebrations.map((c) => c.id)).toContain('gold');

    // Mid-level 33 has matrix!
    const lvl33 = getLevelRewards(33);
    expect(lvl33.hasRewards).toBe(true);
    expect(lvl33.celebrations.map((c) => c.id)).toContain('matrix');

    // Mid-level 43 has cosmic!
    const lvl43 = getLevelRewards(43);
    expect(lvl43.hasRewards).toBe(true);
    expect(lvl43.celebrations.map((c) => c.id)).toContain('cosmic');

    const lvl4 = getLevelRewards(4);
    expect(lvl4.hasRewards).toBe(false);
    expect(lvl4.colorways).toHaveLength(0);
    expect(lvl4.celebrations).toHaveLength(0);
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
    expect(cosmicConfig?.requiredLevel).toBe(43);
  });
});
