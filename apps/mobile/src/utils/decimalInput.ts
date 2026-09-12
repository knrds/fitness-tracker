/** Decimal keyboard values accept comma or point, never silently truncate suffixes. */
export function parseDecimalInput(value: string): number {
  const normalized = value.trim().replace(',', '.');
  if (!/^(?:\d+(?:\.\d*)?|\.\d+)$/.test(normalized)) return NaN;
  const number = Number(normalized);
  return Number.isFinite(number) ? number : NaN;
}
