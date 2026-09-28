import { Theme } from './theme';

export function heatmapColor(theme: Theme, count: number, maximum: number): string {
  if (!Number.isFinite(count) || count <= 0) return theme.anatomy.base;
  const ratio = count / Math.max(1, maximum);
  return theme.anatomy.heat[ratio < 0.35 ? 1 : ratio < 0.7 ? 2 : 3]!;
}
