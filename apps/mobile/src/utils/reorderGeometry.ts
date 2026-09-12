export interface RowLayout {
  y: number;
  height: number;
}
export function getDropIndex(
  ids: string[],
  layouts: Record<string, RowLayout>,
  activeId: string,
  translation: number,
): number {
  const active = layouts[activeId];
  if (!active) return ids.indexOf(activeId);
  const center = active.y + active.height / 2 + translation;
  return ids.filter(
    (id) => id !== activeId && layouts[id] && center > layouts[id]!.y + layouts[id]!.height / 2,
  ).length;
}
export function moveItem<T>(items: T[], from: number, to: number): T[] {
  if (from < 0 || to < 0 || from >= items.length || to >= items.length) return items;
  const result = [...items];
  const [item] = result.splice(from, 1);
  result.splice(to, 0, item!);
  return result;
}
