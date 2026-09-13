export interface LevelBadge {
  title: string;
  icon: string;
}

export const getLevelBadge = (level: number): LevelBadge => {
  if (level < 5) return { title: 'Novice Lifter', icon: '🥉' };
  if (level < 10) return { title: 'Building Strength', icon: '🏋️' };
  if (level < 15) return { title: 'Consistent Lifter', icon: '🦾' };
  if (level < 20) return { title: 'Advanced Lifter', icon: '⚔️' };
  if (level < 30) return { title: 'Performance Athlete', icon: '🏆' };
  if (level < 50) return { title: 'Elite Lifter', icon: '🌋' };
  return { title: 'VOLT Master', icon: '👑' };
};
