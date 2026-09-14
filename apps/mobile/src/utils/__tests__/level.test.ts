import { getRankForLevel, LEVEL_RANKS } from '../level';

describe('Level Rank System (Level 1-50)', () => {
  it('has 10 configured rank tiers', () => {
    expect(LEVEL_RANKS).toHaveLength(10);
    expect(LEVEL_RANKS[0]?.rank).toBe(1);
    expect(LEVEL_RANKS[9]?.rank).toBe(10);
  });

  it('correctly maps all required test levels to expected ranks', () => {
    // Level 1 -> Rank 1
    const r1 = getRankForLevel(1);
    expect(r1.rank).toBe(1);
    expect(r1.minLevel).toBe(1);
    expect(r1.maxLevel).toBe(5);
    expect(r1.nextRankLevel).toBe(6);

    // Level 5 -> Rank 1
    const r5 = getRankForLevel(5);
    expect(r5.rank).toBe(1);
    expect(r5.nextRankLevel).toBe(6);

    // Level 6 -> Rank 2
    const r6 = getRankForLevel(6);
    expect(r6.rank).toBe(2);
    expect(r6.minLevel).toBe(6);
    expect(r6.maxLevel).toBe(10);
    expect(r6.nextRankLevel).toBe(11);

    // Level 10 -> Rank 2
    const r10 = getRankForLevel(10);
    expect(r10.rank).toBe(2);
    expect(r10.nextRankLevel).toBe(11);

    // Level 11 -> Rank 3
    const r11 = getRankForLevel(11);
    expect(r11.rank).toBe(3);
    expect(r11.minLevel).toBe(11);
    expect(r11.maxLevel).toBe(15);
    expect(r11.nextRankLevel).toBe(16);

    // Level 25 -> Rank 5
    const r25 = getRankForLevel(25);
    expect(r25.rank).toBe(5);
    expect(r25.minLevel).toBe(21);
    expect(r25.maxLevel).toBe(25);
    expect(r25.nextRankLevel).toBe(26);

    // Level 31 -> Rank 7
    const r31 = getRankForLevel(31);
    expect(r31.rank).toBe(7);
    expect(r31.minLevel).toBe(31);
    expect(r31.maxLevel).toBe(35);
    expect(r31.nextRankLevel).toBe(36);

    // Level 36 -> Rank 8
    const r36 = getRankForLevel(36);
    expect(r36.rank).toBe(8);
    expect(r36.minLevel).toBe(36);
    expect(r36.maxLevel).toBe(40);
    expect(r36.nextRankLevel).toBe(41);

    // Level 41 -> Rank 9
    const r41 = getRankForLevel(41);
    expect(r41.rank).toBe(9);
    expect(r41.minLevel).toBe(41);
    expect(r41.maxLevel).toBe(45);
    expect(r41.nextRankLevel).toBe(46);

    // Level 46 -> Rank 10
    const r46 = getRankForLevel(46);
    expect(r46.rank).toBe(10);
    expect(r46.minLevel).toBe(46);
    expect(r46.maxLevel).toBe(50);
    expect(r46.nextRankLevel).toBeNull();

    // Level 50 -> Rank 10
    const r50 = getRankForLevel(50);
    expect(r50.rank).toBe(10);
    expect(r50.nextRankLevel).toBeNull();

    // Level 51 -> vorerst Rank 10
    const r51 = getRankForLevel(51);
    expect(r51.rank).toBe(10);
    expect(r51.nextRankLevel).toBeNull();
  });

  it('safely handles zero and negative values', () => {
    const r0 = getRankForLevel(0);
    expect(r0.rank).toBe(1);
    expect(r0.minLevel).toBe(1);

    const rNeg = getRankForLevel(-5);
    expect(rNeg.rank).toBe(1);
  });

  it('returns valid icon asset reference for all ranks', () => {
    for (let lvl = 1; lvl <= 55; lvl += 5) {
      const info = getRankForLevel(lvl);
      expect(info.icon).toBeDefined();
    }
  });
});
