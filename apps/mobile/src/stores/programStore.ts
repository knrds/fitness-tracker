import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { Program, WorkoutTemplate, UUID, ProgramSchema, WorkoutTemplateSchema, EXERCISES, TemplateExercise } from '@fitness-tracker/domain';
import * as Crypto from 'expo-crypto';
import { z } from 'zod';

import { LOCAL_USER_ID } from './local-user';
import { createHydratedStorage } from './storage';

function getExerciseIdByName(name: string): string {
  const ex = EXERCISES.find(e => e.name.toLowerCase() === name.toLowerCase());
  return ex ? ex.id : '';
}

function buildTemplateExercise(name: string, order: number, sets: number, minReps: number, maxReps: number): TemplateExercise {
  const exerciseId = getExerciseIdByName(name);
  return {
    id: Crypto.randomUUID(),
    exerciseId,
    order,
    targetSets: sets,
    targetReps: minReps,
    targetRepsMax: maxReps,
  };
}

export function getDefaultTemplates(): WorkoutTemplate[] {
  const now = new Date('2026-06-01T00:00:00.000Z');
  
  return [
    {
      id: 'template-gk-gk-gk-gk-gk-gk-gk-gk-gk-gk',
      userId: LOCAL_USER_ID,
      name: 'Ganzkörper (GK)',
      isArchived: false,
      createdAt: now,
      updatedAt: now,
      exercises: [
        buildTemplateExercise('Barbell Squat', 0, 3, 8, 10),
        buildTemplateExercise('Barbell Bench Press - Medium Grip', 1, 3, 8, 10),
        buildTemplateExercise('Pullups', 2, 3, 8, 10),
        buildTemplateExercise('Romanian Deadlift', 3, 3, 8, 10),
        buildTemplateExercise('Side Lateral Raise', 4, 2, 8, 10),
        buildTemplateExercise('Barbell Curl', 5, 2, 8, 10),
        buildTemplateExercise('Triceps Pushdown', 6, 2, 8, 10),
      ].filter(e => e.exerciseId !== ''),
    },
    {
      id: 'template-ok-ok-ok-ok-ok-ok-ok-ok-ok-ok',
      userId: LOCAL_USER_ID,
      name: 'Oberkörper (OK)',
      isArchived: false,
      createdAt: now,
      updatedAt: now,
      exercises: [
        buildTemplateExercise('Barbell Bench Press - Medium Grip', 0, 3, 8, 10),
        buildTemplateExercise('Pullups', 1, 3, 8, 10),
        buildTemplateExercise('Incline Dumbbell Press', 2, 2, 8, 10),
        buildTemplateExercise('Bent Over Barbell Row', 3, 2, 8, 10),
        buildTemplateExercise('Side Lateral Raise', 4, 2, 8, 10),
        buildTemplateExercise('Barbell Curl', 5, 2, 8, 10),
        buildTemplateExercise('Triceps Pushdown', 6, 2, 8, 10),
      ].filter(e => e.exerciseId !== ''),
    },
    {
      id: 'template-uk-uk-uk-uk-uk-uk-uk-uk-uk-uk',
      userId: LOCAL_USER_ID,
      name: 'Unterkörper (UK)',
      isArchived: false,
      createdAt: now,
      updatedAt: now,
      exercises: [
        buildTemplateExercise('Barbell Squat', 0, 3, 8, 10),
        buildTemplateExercise('Romanian Deadlift', 1, 3, 8, 10),
        buildTemplateExercise('Leg Press', 2, 2, 8, 10),
        buildTemplateExercise('Leg Extensions', 3, 2, 8, 10),
        buildTemplateExercise('Lying Leg Curls', 4, 2, 8, 10),
        buildTemplateExercise('Standing Calf Raises', 5, 3, 8, 10),
      ].filter(e => e.exerciseId !== ''),
    },
    {
      id: 'template-push-push-push-push-push-push',
      userId: LOCAL_USER_ID,
      name: 'Push',
      isArchived: false,
      createdAt: now,
      updatedAt: now,
      exercises: [
        buildTemplateExercise('Barbell Bench Press - Medium Grip', 0, 3, 8, 10),
        buildTemplateExercise('Incline Dumbbell Press', 1, 3, 8, 10),
        buildTemplateExercise('Barbell Shoulder Press', 2, 2, 8, 10),
        buildTemplateExercise('Side Lateral Raise', 3, 2, 8, 10),
        buildTemplateExercise('Triceps Pushdown', 4, 2, 8, 10),
      ].filter(e => e.exerciseId !== ''),
    },
    {
      id: 'template-pull-pull-pull-pull-pull-pull',
      userId: LOCAL_USER_ID,
      name: 'Pull',
      isArchived: false,
      createdAt: now,
      updatedAt: now,
      exercises: [
        buildTemplateExercise('Pullups', 0, 3, 8, 10),
        buildTemplateExercise('Bent Over Barbell Row', 1, 3, 8, 10),
        buildTemplateExercise('Seated Cable Rows', 2, 2, 8, 10),
        buildTemplateExercise('Cable Rear Delt Fly', 3, 2, 8, 10),
        buildTemplateExercise('Barbell Curl', 4, 2, 8, 10),
        buildTemplateExercise('Hammer Curls', 5, 2, 8, 10),
      ].filter(e => e.exerciseId !== ''),
    },
    {
      id: 'template-legs-legs-legs-legs-legs-legs',
      userId: LOCAL_USER_ID,
      name: 'Legs',
      isArchived: false,
      createdAt: now,
      updatedAt: now,
      exercises: [
        buildTemplateExercise('Barbell Squat', 0, 3, 8, 10),
        buildTemplateExercise('Romanian Deadlift', 1, 3, 8, 10),
        buildTemplateExercise('Leg Press', 2, 2, 8, 10),
        buildTemplateExercise('Leg Extensions', 3, 2, 8, 10),
        buildTemplateExercise('Lying Leg Curls', 4, 2, 8, 10),
        buildTemplateExercise('Standing Calf Raises', 5, 3, 8, 10),
      ].filter(e => e.exerciseId !== ''),
    },
  ];
}

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
      onRehydrateStorage: () => (state) => {
        if (state) {
          const defaultTemplates = getDefaultTemplates();
          const existingNames = new Set((state.templates || []).map(t => t.name));
          const templatesToSeed = defaultTemplates.filter(t => !existingNames.has(t.name));
          if (templatesToSeed.length > 0) {
            state.templates = [...(state.templates || []), ...templatesToSeed];
          }
        }
      }
    }
  )
);
