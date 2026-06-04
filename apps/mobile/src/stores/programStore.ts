import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { Program, ProgramWorkout, WorkoutTemplate, UUID, ProgramSchema, WorkoutTemplateSchema, EXERCISES, TemplateExercise } from '@fitness-tracker/domain';
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

export function getDefaultPrograms(): Program[] {
  const now = new Date('2026-06-01T00:00:00.000Z');
  
  const gkWorkouts: ProgramWorkout[] = [];
  const pplWorkouts: ProgramWorkout[] = [];
  const okukWorkouts: ProgramWorkout[] = [];
  
  for (let w = 1; w <= 4; w++) {
    // GK (Mon, Wed, Fri)
    gkWorkouts.push(
      { id: `gk-w${w}-d1`, templateId: 'template-gk-gk-gk-gk-gk-gk-gk-gk-gk-gk', week: w, dayOfWeek: 1, order: 0 },
      { id: `gk-w${w}-d3`, templateId: 'template-gk-gk-gk-gk-gk-gk-gk-gk-gk-gk', week: w, dayOfWeek: 3, order: 0 },
      { id: `gk-w${w}-d5`, templateId: 'template-gk-gk-gk-gk-gk-gk-gk-gk-gk-gk', week: w, dayOfWeek: 5, order: 0 }
    );
    
    // PPL (Mon, Wed, Fri)
    pplWorkouts.push(
      { id: `ppl-w${w}-d1`, templateId: 'template-push-push-push-push-push-push', week: w, dayOfWeek: 1, order: 0 },
      { id: `ppl-w${w}-d3`, templateId: 'template-pull-pull-pull-pull-pull-pull', week: w, dayOfWeek: 3, order: 0 },
      { id: `ppl-w${w}-d5`, templateId: 'template-legs-legs-legs-legs-legs-legs', week: w, dayOfWeek: 5, order: 0 }
    );
    
    // OK/UK (Mon, Tue, Thu, Fri)
    okukWorkouts.push(
      { id: `okuk-w${w}-d1`, templateId: 'template-ok-ok-ok-ok-ok-ok-ok-ok-ok-ok', week: w, dayOfWeek: 1, order: 0 },
      { id: `okuk-w${w}-d2`, templateId: 'template-uk-uk-uk-uk-uk-uk-uk-uk-uk-uk', week: w, dayOfWeek: 2, order: 0 },
      { id: `okuk-w${w}-d4`, templateId: 'template-ok-ok-ok-ok-ok-ok-ok-ok-ok-ok', week: w, dayOfWeek: 4, order: 0 },
      { id: `okuk-w${w}-d5`, templateId: 'template-uk-uk-uk-uk-uk-uk-uk-uk-uk-uk', week: w, dayOfWeek: 5, order: 0 }
    );
  }
  
  return [
    {
      id: 'program-gk-gk-gk-gk-gk-gk-gk-gk-gk-gk',
      userId: LOCAL_USER_ID,
      name: 'Ganzkörper Routine (3x/Woche)',
      description: 'Ein klassischer Ganzkörpertrainingsplan für optimalen Muskel- und Kraftaufbau, 3 Mal pro Woche durchgeführt.',
      durationWeeks: 4,
      workouts: gkWorkouts,
      isActive: false,
      createdAt: now,
      updatedAt: now,
    },
    {
      id: 'program-ppl-ppl-ppl-ppl-ppl-ppl-ppl-ppl',
      userId: LOCAL_USER_ID,
      name: 'Push / Pull / Legs Split',
      description: 'Ein dreitägiger Split, aufgeteilt in Drück- (Push), Zug- (Pull) und Beinmuskulatur (Legs). Ideal für 3-6 Einheiten pro Woche.',
      durationWeeks: 4,
      workouts: pplWorkouts,
      isActive: false,
      createdAt: now,
      updatedAt: now,
    },
    {
      id: 'program-okuk-okuk-okuk-okuk-okuk-okuk-ok',
      userId: LOCAL_USER_ID,
      name: 'Oberkörper / Unterkörper Split (4x/Woche)',
      description: 'Ein hochgradig bewährter Vier-Tage-Split für Fortgeschrittene zur Maximierung von Hypertrophie und Erholung.',
      durationWeeks: 4,
      workouts: okukWorkouts,
      isActive: false,
      createdAt: now,
      updatedAt: now,
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
  updateProgramsOrder: (programs: Program[]) => void;
  
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

      updateProgramsOrder: (programs) => set({
        programs
      }),

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

          const defaultPrograms = getDefaultPrograms();
          const existingProgNames = new Set((state.programs || []).map(p => p.name));
          const programsToSeed = defaultPrograms.filter(p => !existingProgNames.has(p.name));
          if (programsToSeed.length > 0) {
            state.programs = [...(state.programs || []), ...programsToSeed];
          }
        }
      }
    }
  )
);
