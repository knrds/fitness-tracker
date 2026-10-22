// Screens with their own horizontal drags (reordering) lock tab swiping while active.
let lockCount = 0;
const listeners = new Set<() => void>();

export function subscribeTabSwipeLock(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export const isTabSwipeLocked = () => lockCount > 0;

/** Returns an idempotent release function. */
export function lockTabSwipe(): () => void {
  lockCount += 1;
  listeners.forEach((listener) => listener());
  let released = false;
  return () => {
    if (released) return;
    released = true;
    lockCount = Math.max(0, lockCount - 1);
    listeners.forEach((listener) => listener());
  };
}
