import { create } from 'zustand';
import { persist, PersistStorage } from 'zustand/middleware';
import { MMKV } from 'react-native-mmkv';
import { Program, WorkoutTemplate, UUID } from '@fitness-tracker/domain';
import * as Crypto from 'expo-crypto';

const storage = new MMKV({ id: 'program-storage' });

const reviveDates = (key: string, value: unknown) => {
  if (typeof value === 'string' && /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/.test(value)) {
    return new Date(value);
  }
  return value;
};

const customStorage: PersistStorage<ProgramState> = {
  getItem: (name: string) => {
    const str = storage.getString(name);
    if (!str) return null;
    return JSON.parse(str, reviveDates as (key: string, value: unknown) => unknown);
  },
  setItem: (name: string, value: unknown) => {
    storage.set(name, JSON.stringify(value));
  },
  removeItem: (name: string) => storage.delete(name),
};

export interface ProgramState {
  programs: Program[];
  templates: WorkoutTemplate[];
  
  createProgram: (program: Partial<Program>) => void;
  updateProgram: (id: UUID, updates: Partial<Program>) => void;
  deleteProgram: (id: UUID) => void;
  setActiveProgram: (id: UUID | null) => void;
  
  createTemplate: (template: Partial<WorkoutTemplate>) => void;
  updateTemplate: (id: UUID, updates: Partial<WorkoutTemplate>) => void;
  deleteTemplate: (id: UUID) => void;
}

export const useProgramStore = create<ProgramState>()(
  persist(
    (set) => ({
      programs: [],
      templates: [],

      createProgram: (programPartial) => set((state) => {
        const newProgram = {
          id: programPartial.id || Crypto.randomUUID(),
          userId: 'local-user', // MVP scope
          name: programPartial.name || 'New Program',
          description: programPartial.description,
          durationWeeks: programPartial.durationWeeks || 4,
          workouts: programPartial.workouts || [],
          isActive: false,
          createdAt: new Date(),
          updatedAt: new Date(),
          ...programPartial,
        } as Program;
        return { programs: [...state.programs, newProgram] };
      }),

      updateProgram: (id, updates) => set((state) => ({
        programs: state.programs.map(p => 
          p.id === id ? { ...p, ...updates, updatedAt: new Date() } : p
        )
      })),

      deleteProgram: (id) => set((state) => ({
        programs: state.programs.filter(p => p.id !== id)
      })),

      setActiveProgram: (id) => set((state) => ({
        programs: state.programs.map(p => {
          if (p.id === id) {
            return { ...p, isActive: true, startedAt: new Date(), updatedAt: new Date() };
          }
          if (p.isActive) {
            return { ...p, isActive: false, updatedAt: new Date() };
          }
          return p;
        })
      })),

      createTemplate: (templatePartial) => set((state) => {
        const newTemplate = {
          id: Crypto.randomUUID(),
          userId: 'local-user',
          name: templatePartial.name || 'New Template',
          description: templatePartial.description,
          exercises: templatePartial.exercises || [],
          isArchived: false,
          createdAt: new Date(),
          updatedAt: new Date(),
          ...templatePartial,
        } as WorkoutTemplate;
        return { templates: [...state.templates, newTemplate] };
      }),

      updateTemplate: (id, updates) => set((state) => ({
        templates: state.templates.map(t => 
          t.id === id ? { ...t, ...updates, updatedAt: new Date() } : t
        )
      })),

      deleteTemplate: (id) => set((state) => ({
        templates: state.templates.filter(t => t.id !== id)
      })),
    }),
    {
      name: 'program-storage',
      storage: customStorage,
      version: 1,
    }
  )
);
