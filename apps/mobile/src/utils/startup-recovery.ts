interface HydrationLifecycle {
  hasHydrated: () => boolean;
  onFinishHydration: (listener: () => void) => () => void;
}

/** Inspect restored state once, never a workout created later in this app run. */
export function inspectStartupState(
  persistence: HydrationLifecycle,
  inspect: () => void,
): () => void {
  let inspected = false;
  const once = () => {
    if (inspected) return;
    inspected = true;
    inspect();
  };
  const unsubscribe = persistence.onFinishHydration(once);
  if (persistence.hasHydrated()) once();
  return unsubscribe;
}
