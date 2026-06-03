import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { Program, WorkoutTemplate, UUID, ProgramSchema, WorkoutTemplateSchema } from '@fitness-tracker/domain';
import * as Crypto from 'expo-crypto';
import { z } from 'zod';

import { LOCAL_USER_ID } from './local-user';
import { createHydratedStorage } from './storage';

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

const programPersistedSchema = z.object({
  programs: z.array(ProgramSchema),
  templates: z.array(WorkoutTemplateSchema),
});

type ProgramPersistedState = z.infer<typeof programPersistedSchema>;

const defaultPersistedState: ProgramPersistedState = {
  programs: [],
  templates: [],
};

export const useProgramStore = create<ProgramState>()(
  persist(
    (set) => ({
      programs: [],
      templates: [],

      createProgram: (programPartial) => set((state) => {
        const now = new Date();
        const newProgram = {
          ...programPartial,
          id: programPartial.id || Crypto.randomUUID(),
          userId: LOCAL_USER_ID, // MVP scope
          name: programPartial.name || 'New Program',
          durationWeeks: programPartial.durationWeeks || 4,
          workouts: programPartial.workouts || [],
          isActive: programPartial.isActive ?? false,
          createdAt: programPartial.createdAt || now,
          updatedAt: now,
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
        const now = new Date();
        const newTemplate = {
          ...templatePartial,
          id: templatePartial.id || Crypto.randomUUID(),
          userId: LOCAL_USER_ID,
          name: templatePartial.name || 'New Template',
          exercises: templatePartial.exercises || [],
          isArchived: templatePartial.isArchived ?? false,
          createdAt: templatePartial.createdAt || now,
          updatedAt: now,
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
      storage: createHydratedStorage('program-storage', programPersistedSchema, defaultPersistedState),
      version: 1,
      migrate: (persistedState) => {
        const parsed = programPersistedSchema.safeParse(persistedState);
        return parsed.success ? parsed.data : defaultPersistedState;
      },
    }
  )
);
