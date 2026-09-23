import { create } from 'zustand';

export interface StorageDiagnostic {
  storageId: string;
  code: string;
  fieldPath?: string;
  timestamp: number;
}

// Diagnostics contain store names and schema paths only, never persisted health/fitness data.
export const useStorageHealth = create<{
  blockedStores: string[];
  diagnostics: Record<string, StorageDiagnostic>;
  block: (name: string) => void;
  clear: (name: string) => void;
  reportDiagnostic: (diagnostic: StorageDiagnostic) => void;
  clearDiagnostic: (storageId: string) => void;
  writeError: boolean;
  reportWriteError: () => void;
  dismissWriteError: () => void;
  reset: () => void;
}>((set) => ({
  blockedStores: [],
  diagnostics: {},
  writeError: false,
  reportWriteError: () => set({ writeError: true }),
  dismissWriteError: () => set({ writeError: false }),
  block: (name) =>
    set((state) => ({ blockedStores: [...new Set([...state.blockedStores, name])] })),
  clear: (name) =>
    set((state) => {
      const nextDiagnostics = { ...state.diagnostics };
      delete nextDiagnostics[name];
      return {
        blockedStores: state.blockedStores.filter((id) => id !== name),
        diagnostics: nextDiagnostics,
      };
    }),
  reportDiagnostic: (diagnostic) =>
    set((state) => ({
      diagnostics: { ...state.diagnostics, [diagnostic.storageId]: diagnostic },
    })),
  clearDiagnostic: (storageId) =>
    set((state) => {
      const nextDiagnostics = { ...state.diagnostics };
      delete nextDiagnostics[storageId];
      return { diagnostics: nextDiagnostics };
    }),
  reset: () => set({ blockedStores: [], diagnostics: {}, writeError: false }),
}));
