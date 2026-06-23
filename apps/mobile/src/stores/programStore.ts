import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import {
  Program,
  ProgramWorkout,
  WorkoutTemplate,
  UUID,
  ProgramSchema,
  WorkoutTemplateSchema,
  EXERCISES,
  TemplateExercise,
} from '@fitness-tracker/domain';
import * as Crypto from 'expo-crypto';
import { z } from 'zod';

import { getCurrentUserId, LOCAL_USER_ID } from './local-user';
import { createHydratedStorage } from './storage';
import { useSyncStore } from './syncStore';

const DEFAULT_TEMPLATE_IDS = {
  gk: '10000000-0000-4000-8000-000000000001',
  ok: '10000000-0000-4000-8000-000000000002',
  uk: '10000000-0000-4000-8000-000000000003',
  push: '10000000-0000-4000-8000-000000000004',
  pull: '10000000-0000-4000-8000-000000000005',
  legs: '10000000-0000-4000-8000-000000000006',
  sl_a: '10000000-0000-4000-8000-000000000007',
  sl_b: '10000000-0000-4000-8000-000000000008',
  arnold_cb: '10000000-0000-4000-8000-000000000009',
  arnold_sa: '10000000-0000-4000-8000-000000000010',
  arnold_l: '10000000-0000-4000-8000-000000000011',
} as const;

const DEFAULT_PROGRAM_IDS = {
  gk: '20000000-0000-4000-8000-000000000001',
  ppl: '20000000-0000-4000-8000-000000000002',
  okuk: '20000000-0000-4000-8000-000000000003',
  sl: '20000000-0000-4000-8000-000000000004',
  arnold: '20000000-0000-4000-8000-000000000005',
} as const;

function makeDefaultProgramWorkoutId(family: number, week: number, day: number, order = 0): string {
  const suffix = `${family}${String(week).padStart(2, '0')}${String(day).padStart(2, '0')}${String(order).padStart(7, '0')}`;
  return `30000000-0000-4000-8000-${suffix}`;
}

function getExerciseIdByName(name: string): string {
  const ex = EXERCISES.find((e) => e.name.toLowerCase() === name.toLowerCase());
  return ex ? ex.id : '';
}

function buildTemplateExercise(
  name: string,
  order: number,
  sets: number,
  minReps: number,
  maxReps: number,
): TemplateExercise {
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
      id: DEFAULT_TEMPLATE_IDS.gk,
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
      ].filter((e) => e.exerciseId !== ''),
    },
    {
      id: DEFAULT_TEMPLATE_IDS.ok,
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
      ].filter((e) => e.exerciseId !== ''),
    },
    {
      id: DEFAULT_TEMPLATE_IDS.uk,
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
      ].filter((e) => e.exerciseId !== ''),
    },
    {
      id: DEFAULT_TEMPLATE_IDS.push,
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
      ].filter((e) => e.exerciseId !== ''),
    },
    {
      id: DEFAULT_TEMPLATE_IDS.pull,
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
      ].filter((e) => e.exerciseId !== ''),
    },
    {
      id: DEFAULT_TEMPLATE_IDS.legs,
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
      ].filter((e) => e.exerciseId !== ''),
    },
    {
      id: DEFAULT_TEMPLATE_IDS.sl_a,
      userId: LOCAL_USER_ID,
      name: 'StrongLifts 5x5 - Workout A',
      isArchived: false,
      createdAt: now,
      updatedAt: now,
      exercises: [
        buildTemplateExercise('Barbell Squat', 0, 5, 5, 5),
        buildTemplateExercise('Barbell Bench Press - Medium Grip', 1, 5, 5, 5),
        buildTemplateExercise('Bent Over Barbell Row', 2, 5, 5, 5),
      ].filter((e) => e.exerciseId !== ''),
    },
    {
      id: DEFAULT_TEMPLATE_IDS.sl_b,
      userId: LOCAL_USER_ID,
      name: 'StrongLifts 5x5 - Workout B',
      isArchived: false,
      createdAt: now,
      updatedAt: now,
      exercises: [
        buildTemplateExercise('Barbell Squat', 0, 5, 5, 5),
        buildTemplateExercise('Barbell Shoulder Press', 1, 5, 5, 5),
        buildTemplateExercise('Barbell Deadlift', 2, 1, 5, 5),
      ].filter((e) => e.exerciseId !== ''),
    },
    {
      id: DEFAULT_TEMPLATE_IDS.arnold_cb,
      userId: LOCAL_USER_ID,
      name: 'Arnold Split - Brust & Rücken',
      isArchived: false,
      createdAt: now,
      updatedAt: now,
      exercises: [
        buildTemplateExercise('Barbell Bench Press - Medium Grip', 0, 4, 8, 10),
        buildTemplateExercise('Pullups', 1, 4, 8, 10),
        buildTemplateExercise('Incline Dumbbell Press', 2, 3, 10, 12),
        buildTemplateExercise('Bent Over Barbell Row', 3, 3, 10, 12),
      ].filter((e) => e.exerciseId !== ''),
    },
    {
      id: DEFAULT_TEMPLATE_IDS.arnold_sa,
      userId: LOCAL_USER_ID,
      name: 'Arnold Split - Schultern & Arme',
      isArchived: false,
      createdAt: now,
      updatedAt: now,
      exercises: [
        buildTemplateExercise('Barbell Shoulder Press', 0, 4, 8, 10),
        buildTemplateExercise('Side Lateral Raise', 1, 4, 10, 12),
        buildTemplateExercise('Cable Rear Delt Fly', 2, 3, 10, 12),
        buildTemplateExercise('Barbell Curl', 3, 3, 10, 12),
        buildTemplateExercise('Triceps Pushdown', 4, 3, 10, 12),
      ].filter((e) => e.exerciseId !== ''),
    },
    {
      id: DEFAULT_TEMPLATE_IDS.arnold_l,
      userId: LOCAL_USER_ID,
      name: 'Arnold Split - Beine',
      isArchived: false,
      createdAt: now,
      updatedAt: now,
      exercises: [
        buildTemplateExercise('Barbell Squat', 0, 4, 8, 10),
        buildTemplateExercise('Romanian Deadlift', 1, 4, 8, 10),
        buildTemplateExercise('Leg Press', 2, 3, 10, 12),
        buildTemplateExercise('Standing Calf Raises', 3, 4, 12, 15),
      ].filter((e) => e.exerciseId !== ''),
    },
  ];
}

export function getDefaultPrograms(): Program[] {
  const now = new Date('2026-06-01T00:00:00.000Z');

  const gkWorkouts: ProgramWorkout[] = [];
  const pplWorkouts: ProgramWorkout[] = [];
  const okukWorkouts: ProgramWorkout[] = [];
  const slWorkouts: ProgramWorkout[] = [];
  const arnoldWorkouts: ProgramWorkout[] = [];

  for (let w = 1; w <= 4; w++) {
    // GK (Mon, Wed, Fri)
    gkWorkouts.push(
      {
        id: makeDefaultProgramWorkoutId(1, w, 1),
        templateId: DEFAULT_TEMPLATE_IDS.gk,
        week: w,
        dayOfWeek: 1,
        order: 0,
      },
      {
        id: makeDefaultProgramWorkoutId(1, w, 3),
        templateId: DEFAULT_TEMPLATE_IDS.gk,
        week: w,
        dayOfWeek: 3,
        order: 0,
      },
      {
        id: makeDefaultProgramWorkoutId(1, w, 5),
        templateId: DEFAULT_TEMPLATE_IDS.gk,
        week: w,
        dayOfWeek: 5,
        order: 0,
      },
    );

    // PPL (Mon, Wed, Fri)
    pplWorkouts.push(
      {
        id: makeDefaultProgramWorkoutId(2, w, 1),
        templateId: DEFAULT_TEMPLATE_IDS.push,
        week: w,
        dayOfWeek: 1,
        order: 0,
      },
      {
        id: makeDefaultProgramWorkoutId(2, w, 3),
        templateId: DEFAULT_TEMPLATE_IDS.pull,
        week: w,
        dayOfWeek: 3,
        order: 0,
      },
      {
        id: makeDefaultProgramWorkoutId(2, w, 5),
        templateId: DEFAULT_TEMPLATE_IDS.legs,
        week: w,
        dayOfWeek: 5,
        order: 0,
      },
    );

    // OK/UK (Mon, Tue, Thu, Fri)
    okukWorkouts.push(
      {
        id: makeDefaultProgramWorkoutId(3, w, 1),
        templateId: DEFAULT_TEMPLATE_IDS.ok,
        week: w,
        dayOfWeek: 1,
        order: 0,
      },
      {
        id: makeDefaultProgramWorkoutId(3, w, 2),
        templateId: DEFAULT_TEMPLATE_IDS.uk,
        week: w,
        dayOfWeek: 2,
        order: 0,
      },
      {
        id: makeDefaultProgramWorkoutId(3, w, 4),
        templateId: DEFAULT_TEMPLATE_IDS.ok,
        week: w,
        dayOfWeek: 4,
        order: 0,
      },
      {
        id: makeDefaultProgramWorkoutId(3, w, 5),
        templateId: DEFAULT_TEMPLATE_IDS.uk,
        week: w,
        dayOfWeek: 5,
        order: 0,
      },
    );

    // StrongLifts 5x5 (Mon, Wed, Fri - alternating sl_a and sl_b)
    const isOddWeek = w % 2 !== 0;
    slWorkouts.push(
      {
        id: makeDefaultProgramWorkoutId(4, w, 1),
        templateId: isOddWeek ? DEFAULT_TEMPLATE_IDS.sl_a : DEFAULT_TEMPLATE_IDS.sl_b,
        week: w,
        dayOfWeek: 1,
        order: 0,
      },
      {
        id: makeDefaultProgramWorkoutId(4, w, 3),
        templateId: isOddWeek ? DEFAULT_TEMPLATE_IDS.sl_b : DEFAULT_TEMPLATE_IDS.sl_a,
        week: w,
        dayOfWeek: 3,
        order: 0,
      },
      {
        id: makeDefaultProgramWorkoutId(4, w, 5),
        templateId: isOddWeek ? DEFAULT_TEMPLATE_IDS.sl_a : DEFAULT_TEMPLATE_IDS.sl_b,
        week: w,
        dayOfWeek: 5,
        order: 0,
      },
    );

    // Arnold Split (Mon, Tue, Wed, Thu, Fri, Sat)
    arnoldWorkouts.push(
      {
        id: makeDefaultProgramWorkoutId(5, w, 1),
        templateId: DEFAULT_TEMPLATE_IDS.arnold_cb,
        week: w,
        dayOfWeek: 1,
        order: 0,
      },
      {
        id: makeDefaultProgramWorkoutId(5, w, 2),
        templateId: DEFAULT_TEMPLATE_IDS.arnold_sa,
        week: w,
        dayOfWeek: 2,
        order: 0,
      },
      {
        id: makeDefaultProgramWorkoutId(5, w, 3),
        templateId: DEFAULT_TEMPLATE_IDS.arnold_l,
        week: w,
        dayOfWeek: 3,
        order: 0,
      },
      {
        id: makeDefaultProgramWorkoutId(5, w, 4),
        templateId: DEFAULT_TEMPLATE_IDS.arnold_cb,
        week: w,
        dayOfWeek: 4,
        order: 0,
      },
      {
        id: makeDefaultProgramWorkoutId(5, w, 5),
        templateId: DEFAULT_TEMPLATE_IDS.arnold_sa,
        week: w,
        dayOfWeek: 5,
        order: 0,
      },
      {
        id: makeDefaultProgramWorkoutId(5, w, 6),
        templateId: DEFAULT_TEMPLATE_IDS.arnold_l,
        week: w,
        dayOfWeek: 6,
        order: 0,
      },
    );
  }

  return [
    {
      id: DEFAULT_PROGRAM_IDS.gk,
      userId: LOCAL_USER_ID,
      name: 'Ganzkörper Routine (3x/Woche)',
      description:
        'Ein klassischer Ganzkörpertrainingsplan für optimalen Muskel- und Kraftaufbau, 3 Mal pro Woche durchgeführt.',
      durationWeeks: 4,
      workouts: gkWorkouts,
      isActive: false,
      createdAt: now,
      updatedAt: now,
    },
    {
      id: DEFAULT_PROGRAM_IDS.ppl,
      userId: LOCAL_USER_ID,
      name: 'Push / Pull / Legs Split',
      description:
        'Ein dreitägiger Split, aufgeteilt in Drück- (Push), Zug- (Pull) und Beinmuskulatur (Legs). Ideal für 3-6 Einheiten pro Woche.',
      durationWeeks: 4,
      workouts: pplWorkouts,
      isActive: false,
      createdAt: now,
      updatedAt: now,
    },
    {
      id: DEFAULT_PROGRAM_IDS.okuk,
      userId: LOCAL_USER_ID,
      name: 'Oberkörper / Unterkörper Split (4x/Woche)',
      description:
        'Ein hochgradig bewährter Vier-Tage-Split für Fortgeschrittene zur Maximierung von Hypertrophie und Erholung.',
      durationWeeks: 4,
      workouts: okukWorkouts,
      isActive: false,
      createdAt: now,
      updatedAt: now,
    },
    {
      id: DEFAULT_PROGRAM_IDS.sl,
      userId: LOCAL_USER_ID,
      name: 'StrongLifts 5x5',
      description:
        'Das originale 5x5-Krafttrainingsprogramm. Drei Übungen pro Training, dreimal pro Woche, mit Fokus auf progressive Überlastung.',
      durationWeeks: 4,
      workouts: slWorkouts,
      isActive: false,
      createdAt: now,
      updatedAt: now,
    },
    {
      id: DEFAULT_PROGRAM_IDS.arnold,
      userId: LOCAL_USER_ID,
      name: 'Arnold Split (6x/Woche)',
      description:
        'Der legendäre Arnold-Schwarzenegger-Split. Trainiert Brust/Rücken, Schultern/Arme und Beine jeweils zweimal pro Woche für maximale Hypertrophie.',
      durationWeeks: 4,
      workouts: arnoldWorkouts,
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
  updateTemplatesOrder: (templates: WorkoutTemplate[]) => void;
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

      createProgram: (programPartial) =>
        set((state) => {
          const now = new Date();
          const newProgram = {
            ...programPartial,
            id: programPartial.id || Crypto.randomUUID(),
            userId: getCurrentUserId(),
            name: programPartial.name || 'New Program',
            durationWeeks: programPartial.durationWeeks || 4,
            workouts: programPartial.workouts || [],
            isActive: programPartial.isActive ?? false,
            createdAt: programPartial.createdAt || now,
            updatedAt: now,
          } as Program;
          useSyncStore.getState().addToQueue('programs', 'INSERT', newProgram);
          return { programs: [...state.programs, newProgram] };
        }),

      updateProgram: (id, updates) =>
        set((state) => {
          const updatedPrograms = state.programs.map((p) => {
            if (p.id === id) {
              const updated = { ...p, ...updates, updatedAt: new Date() };
              useSyncStore.getState().addToQueue('programs', 'INSERT', updated);
              return updated;
            }
            return p;
          });
          return { programs: updatedPrograms };
        }),

      deleteProgram: (id) =>
        set((state) => {
          useSyncStore.getState().addToQueue('programs', 'DELETE', { id });
          return {
            programs: state.programs.filter((p) => p.id !== id),
          };
        }),

      setActiveProgram: (id) =>
        set((state) => {
          const updatedPrograms = state.programs.map((p) => {
            if (p.id === id) {
              const updated = { ...p, isActive: true, startedAt: new Date(), updatedAt: new Date() };
              useSyncStore.getState().addToQueue('programs', 'INSERT', updated);
              return updated;
            }
            if (p.isActive) {
              const updated = { ...p, isActive: false, updatedAt: new Date() };
              useSyncStore.getState().addToQueue('programs', 'INSERT', updated);
              return updated;
            }
            return p;
          });
          return { programs: updatedPrograms };
        }),

      updateProgramsOrder: (programs) =>
        set({
          programs,
        }),

      createTemplate: (templatePartial) =>
        set((state) => {
          const now = new Date();
          const newTemplate = {
            ...templatePartial,
            id: templatePartial.id || Crypto.randomUUID(),
            userId: getCurrentUserId(),
            name: templatePartial.name || 'New Template',
            exercises: templatePartial.exercises || [],
            isArchived: templatePartial.isArchived ?? false,
            createdAt: templatePartial.createdAt || now,
            updatedAt: now,
          } as WorkoutTemplate;
          useSyncStore.getState().addToQueue('workout_templates', 'INSERT', newTemplate);
          return { templates: [...state.templates, newTemplate] };
        }),

      updateTemplate: (id, updates) =>
        set((state) => {
          const updatedTemplates = state.templates.map((t) => {
            if (t.id === id) {
              const updated = { ...t, ...updates, updatedAt: new Date() };
              useSyncStore.getState().addToQueue('workout_templates', 'INSERT', updated);
              return updated;
            }
            return t;
          });
          return { templates: updatedTemplates };
        }),

      deleteTemplate: (id) =>
        set((state) => {
          useSyncStore.getState().addToQueue('workout_templates', 'DELETE', { id });
          return {
            templates: state.templates.filter((t) => t.id !== id),
          };
        }),

      updateTemplatesOrder: (templates) =>
        set({
          templates,
        }),
    }),
    {
      name: 'program-storage',
      storage: createHydratedStorage(
        'program-storage',
        programPersistedSchema,
        defaultPersistedState,
      ),
      version: 1,
      migrate: (persistedState) => {
        const parsed = programPersistedSchema.safeParse(persistedState);
        return parsed.success ? parsed.data : defaultPersistedState;
      },
      onRehydrateStorage: () => (state) => {
        if (state) {
          const defaultTemplates = getDefaultTemplates();
          const existingNames = new Set((state.templates || []).map((t) => t.name));
          const templatesToSeed = defaultTemplates.filter((t) => !existingNames.has(t.name));
          if (templatesToSeed.length > 0) {
            state.templates = [...(state.templates || []), ...templatesToSeed];
          }

          const defaultPrograms = getDefaultPrograms();
          const existingProgNames = new Set((state.programs || []).map((p) => p.name));
          const programsToSeed = defaultPrograms.filter((p) => !existingProgNames.has(p.name));
          if (programsToSeed.length > 0) {
            state.programs = [...(state.programs || []), ...programsToSeed];
          }
        }
      },
    },
  ),
);
