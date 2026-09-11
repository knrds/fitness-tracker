export interface StorageScope {
  partition: string;
  generation: number;
}
let scope: StorageScope = { partition: 'legacy', generation: 0 };
let changing = false;
export const getStorageScope = (): StorageScope => scope;
export const isScopeChanging = () => changing;
export const isSameScope = (captured: StorageScope) =>
  captured.generation === scope.generation && captured.partition === scope.partition;
export const isScopeCurrent = (captured: StorageScope) => !changing && isSameScope(captured);
export function beginScopeChange(): number {
  changing = true;
  scope = { ...scope, generation: scope.generation + 1 };
  return scope.generation;
}
export function selectStoragePartition(partition: string, generation: number): boolean {
  if (scope.generation !== generation) return false;
  scope = { partition, generation };
  return true;
}
export function completeScopeChange(generation: number): boolean {
  if (scope.generation !== generation) return false;
  changing = false;
  return true;
}
export function scopedStorageKey(name: string, captured = scope): string {
  return captured.partition === 'legacy' ? name : `${captured.partition}:${name}`;
}
