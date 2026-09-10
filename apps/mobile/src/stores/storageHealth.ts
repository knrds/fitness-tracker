import { create } from 'zustand';

// Diagnostics contain store names only, never persisted health/fitness data.
export const useStorageHealth = create<{
  blockedStores: string[];
  block: (name: string) => void;
  clear: (name: string) => void;
  writeError: boolean;
  reportWriteError: () => void;
  dismissWriteError: () => void;
}>((set) => ({
  blockedStores: [],
  writeError: false,
  reportWriteError: () => set({ writeError: true }),
  dismissWriteError: () => set({ writeError: false }),
  block: (name) =>
    set((state) => ({ blockedStores: [...new Set([...state.blockedStores, name])] })),
  clear: (name) =>
    set((state) => ({ blockedStores: state.blockedStores.filter((id) => id !== name) })),
}));
