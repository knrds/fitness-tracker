export interface LevelBadge {
  title: string;
  icon: string;
}

export const getLevelBadge = (level: number): LevelBadge => {
  if (level < 5) return { title: 'Novice Lifter', icon: '🥉' };
  if (level < 10) return { title: 'Iron Initiate', icon: '🏋️' };
  if (level < 15) return { title: 'Strength Seeker', icon: '🦾' };
  if (level < 20) return { title: 'Barbell Warrior', icon: '⚔️' };
  if (level < 30) return { title: 'Gym Champion', icon: '🏆' };
  if (level < 50) return { title: 'Iron Titan', icon: '🌋' };
  return { title: 'Legendary Deity', icon: '👑' };
};
