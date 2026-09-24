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
  DEFAULT_FREE_TEMPLATE_LIMIT,
} from '@fitness-tracker/domain';
import * as Crypto from '../utils/uuid';
import { z } from 'zod';

import { getCurrentUserId, LOCAL_USER_ID } from './local-user';
import { createHydratedStorage } from './storage';
import { useSyncStore } from './syncStore';
import { entitlementService } from '../services/entitlementService';
import { monetizationAnalytics } from '../services/monetizationAnalytics';

export const DEFAULT_TEMPLATE_IDS = {
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

export const DEFAULT_PROGRAM_IDS = {
  gk: '20000000-0000-4000-8000-000000000001',
  ppl: '20000000-0000-4000-8000-000000000002',
  okuk: '20000000-0000-4000-8000-000000000003',
  sl: '20000000-0000-4000-8000-000000000004',
  arnold: '20000000-0000-4000-8000-000000000005',
} as const;

export function isDefaultTemplateId(id: string): boolean {
  return (
    id.startsWith('10000000-0000-4000-8000-') ||
    Object.values(DEFAULT_TEMPLATE_IDS).includes(id as (typeof DEFAULT_TEMPLATE_IDS)[keyof typeof DEFAULT_TEMPLATE_IDS])
  );
}

export function isDefaultProgramId(id: string): boolean {
  return (
    id.startsWith('20000000-0000-4000-8000-') ||
    Object.values(DEFAULT_PROGRAM_IDS).includes(id as (typeof DEFAULT_PROGRAM_IDS)[keyof typeof DEFAULT_PROGRAM_IDS])
  );
}

/**
 * Returns whether a template can be structurally modified.
 * - PRO/COACH: All templates editable.
 * - FREE: Default templates have fixed structure; among custom templates, only the first 2 (sorted by createdAt) are editable.
 */
export function isTemplateEditable(templateId: string, templates: WorkoutTemplate[]): boolean {
  if (isDefaultTemplateId(templateId)) {
    return false;
  }
  if (entitlementService.getEntitlementState().isPro) {
    return true;
  }
  const customTemplates = templates
    .filter((t) => !isDefaultTemplateId(t.id))
    .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());

  const index = customTemplates.findIndex((t) => t.id === templateId);
  return index >= 0 && index < DEFAULT_FREE_TEMPLATE_LIMIT;
}

/**
 * Returns whether a program can be modified/created.
 * - PRO/COACH: Full edit access.
 * - FREE: Read-only on downgrade; no new creation or structural editing.
 */
export function isProgramEditable(programId?: string): boolean {
  if (programId && isDefaultProgramId(programId)) return false;
  if (entitlementService.getEntitlementState().isPro) return true;
  const own = useProgramStore.getState().programs.filter(p => !isDefaultProgramId(p.id))
    .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
  return programId ? own[0]?.id === programId : own.length <= 1;
}

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

  const defaults: WorkoutTemplate[] = [
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
  return defaults.filter(template => [DEFAULT_TEMPLATE_IDS.gk, DEFAULT_TEMPLATE_IDS.push, DEFAULT_TEMPLATE_IDS.pull, DEFAULT_TEMPLATE_IDS.legs].some(id => id === template.id));
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

  const defaults: Program[] = [
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
  return defaults.filter(program => program.id === DEFAULT_PROGRAM_IDS.gk || program.id === DEFAULT_PROGRAM_IDS.ppl);
}

export interface ProgramState {
  programs: Program[];
  templates: WorkoutTemplate[];
  customFolders: string[];
  hiddenTemplateIds: string[];
  hiddenProgramIds: string[];
  setTemplateHidden: (id: UUID, hidden: boolean) => void;
  setProgramHidden: (id: UUID, hidden: boolean) => void;

  createProgram: (program: Partial<Program>) => void;
  updateProgram: (id: UUID, updates: Partial<Program>) => void;
  deleteProgram: (id: UUID) => void;
  setActiveProgram: (id: UUID | null) => void;
  updateProgramsOrder: (programs: Program[]) => void;

  createTemplate: (template: Partial<WorkoutTemplate>) => void;
  updateTemplate: (id: UUID, updates: Partial<WorkoutTemplate>) => void;
  deleteTemplate: (id: UUID) => void;
  updateTemplatesOrder: (templates: WorkoutTemplate[]) => void;

  createFolder: (name: string) => void;
  renameFolder: (oldName: string, newName: string) => void;
  deleteFolder: (name: string) => void;
  setTemplateFolder: (templateId: UUID, folder: string | null) => void;
  updateFoldersOrder: (folders: string[]) => void;
}

const programPersistedSchema = z.object({
  programs: z.array(ProgramSchema),
  templates: z.array(WorkoutTemplateSchema),
  customFolders: z.array(z.string().trim().min(1).max(50)).optional(),
  hiddenTemplateIds: z.array(z.string()).optional(),
  hiddenProgramIds: z.array(z.string()).optional(),
});

type ProgramPersistedState = z.infer<typeof programPersistedSchema>;

const defaultPersistedState: ProgramPersistedState = {
  programs: [],
  templates: [],
  customFolders: [],
  hiddenTemplateIds: [],
  hiddenProgramIds: [],
};

export const useProgramStore = create<ProgramState>()(
  persist(
    (set, get) => ({
      programs: [],
      templates: [],
      customFolders: [],
      hiddenTemplateIds: [],
      hiddenProgramIds: [],
      setTemplateHidden: (id, hidden) => set(state => ({
        hiddenTemplateIds: hidden ? [...new Set([...state.hiddenTemplateIds, id])] : state.hiddenTemplateIds.filter(value => value !== id),
      })),
      setProgramHidden: (id, hidden) => set(state => ({
        hiddenProgramIds: hidden ? [...new Set([...state.hiddenProgramIds, id])] : state.hiddenProgramIds.filter(value => value !== id),
      })),

      createProgram: (programPartial) => {
        if (!entitlementService.canCreateProgram(get().programs.filter(p => !isDefaultProgramId(p.id)).length)) {
          monetizationAnalytics.track('program_feature_clicked', {
            tier: entitlementService.getTier(),
            feature_source: 'create_program',
          });
          throw new Error('PROGRAM_FEATURE_LOCKED: Free tier is limited to 1 custom program.');
        }
        return set((state) => {
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
          return { programs: [newProgram, ...state.programs] };
        });
      },

      updateProgram: (id, updates) => {
        if (!isProgramEditable(id)) {
          throw new Error('PROGRAM_FEATURE_LOCKED: Editing programs requires EVARO Pro or Coach subscription.');
        }
        return set((state) => {
          const updatedPrograms = state.programs.map((p) => {
            if (p.id === id) {
              const updated = { ...p, ...updates, updatedAt: new Date() };
              useSyncStore.getState().addToQueue('programs', 'INSERT', updated);
              return updated;
            }
            return p;
          });
          return { programs: updatedPrograms };
        });
      },

      deleteProgram: (id) =>
        set((state) => {
          if (isDefaultProgramId(id)) throw new Error('DEFAULT_PROGRAM_READ_ONLY');
          useSyncStore.getState().addToQueue('programs', 'DELETE', { id });
          return {
            programs: state.programs.filter((p) => p.id !== id),
          };
        }),

      setActiveProgram: (id) =>
        set((state) => {
          const updatedPrograms = state.programs.map((p) => {
            if (p.id === id) {
              const updated = {
                ...p,
                isActive: true,
                startedAt: new Date(),
                updatedAt: new Date(),
              };
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
        set(state => ({ programs: [
          ...programs.map(program => isDefaultProgramId(program.id) ? state.programs.find(p => p.id === program.id) ?? program : program),
          ...state.programs.filter(program => !programs.some(p => p.id === program.id)),
        ] })),

      createTemplate: (templatePartial) => {
        const state = get();
        const customTemplates = state.templates.filter((t) => !isDefaultTemplateId(t.id));
        if (!entitlementService.canCreateTemplate(customTemplates.length)) {
          monetizationAnalytics.track('template_limit_reached', {
            tier: entitlementService.getTier(),
            paywall_source: 'template_limit',
          });
          throw new Error('TEMPLATE_LIMIT_REACHED: Free tier is limited to 3 custom templates.');
        }
        return set((currentState) => {
          const now = new Date();
          const folder = templatePartial.folder?.trim() || undefined;
          let folders = currentState.customFolders || [];
          let canonicalFolder: string | undefined = undefined;
          if (folder) {
            const match = folders.find((f) => f.trim().toLowerCase() === folder.toLowerCase());
            if (match) {
              canonicalFolder = match;
            } else {
              folders = [...folders, folder];
              canonicalFolder = folder;
            }
          }
          const newTemplate = {
            ...templatePartial,
            id: templatePartial.id || Crypto.randomUUID(),
            userId: getCurrentUserId(),
            name: templatePartial.name || 'New Template',
            exercises: templatePartial.exercises || [],
            isArchived: templatePartial.isArchived ?? false,
            folder: canonicalFolder,
            createdAt: templatePartial.createdAt || now,
            updatedAt: now,
          } as WorkoutTemplate;
          useSyncStore.getState().addToQueue('workout_templates', 'INSERT', newTemplate);
          return { customFolders: folders, templates: [newTemplate, ...currentState.templates] };
        });
      },

      updateTemplate: (id, updates) => {
        const state = get();
        if (!isTemplateEditable(id, state.templates)) {
          throw new Error('TEMPLATE_LOCKED: This template is locked in Free mode. Upgrade to Pro to edit.');
        }
        return set((currentState) => {
          const updatedTemplates = currentState.templates.map((t) => {
            if (t.id === id) {
              const updated = { ...t, ...updates, updatedAt: new Date() };
              useSyncStore.getState().addToQueue('workout_templates', 'INSERT', updated);
              return updated;
            }
            return t;
          });
          return { templates: updatedTemplates };
        });
      },

      deleteTemplate: (id) =>
        set((state) => {
          if (isDefaultTemplateId(id)) throw new Error('DEFAULT_TEMPLATE_READ_ONLY');
          useSyncStore.getState().addToQueue('workout_templates', 'DELETE', { id });
          return {
            templates: state.templates.filter((t) => t.id !== id),
          };
        }),

      updateTemplatesOrder: (templates) =>
        set(state => ({ templates: [
          ...templates.map(template => isDefaultTemplateId(template.id) ? state.templates.find(t => t.id === template.id) ?? template : template),
          ...state.templates.filter(template => !templates.some(t => t.id === template.id)),
        ] })),

      createFolder: (name: string) =>
        set((state) => {
          const trimmed = name.trim();
          if (!trimmed) return state;
          const existing = state.customFolders || [];
          if (existing.some((f) => f.trim().toLowerCase() === trimmed.toLowerCase())) {
            return state;
          }
          return { customFolders: [...existing, trimmed] };
        }),

      renameFolder: (oldName: string, newName: string) =>
        set((state) => {
          const trimmedOld = oldName.trim().toLowerCase();
          const trimmedNew = newName.trim();
          if (!trimmedNew || trimmedOld === trimmedNew.toLowerCase()) return state;
          const existing = state.customFolders || [];
          const updatedFolders: string[] = [];
          for (const f of existing) {
            if (f.trim().toLowerCase() === trimmedOld) {
              if (!updatedFolders.some((x) => x.toLowerCase() === trimmedNew.toLowerCase())) {
                updatedFolders.push(trimmedNew);
              }
            } else if (!updatedFolders.some((x) => x.toLowerCase() === f.trim().toLowerCase())) {
              updatedFolders.push(f.trim());
            }
          }
          if (!updatedFolders.some((x) => x.toLowerCase() === trimmedNew.toLowerCase())) {
            updatedFolders.push(trimmedNew);
          }
          const updatedTemplates = state.templates.map((t) => {
            if (t.folder?.trim().toLowerCase() === trimmedOld) {
              const updated = { ...t, folder: trimmedNew, updatedAt: new Date() };
              useSyncStore.getState().addToQueue('workout_templates', 'INSERT', updated);
              return updated;
            }
            return t;
          });
          return { customFolders: updatedFolders, templates: updatedTemplates };
        }),

      deleteFolder: (name: string) =>
        set((state) => {
          const trimmedTarget = name.trim().toLowerCase();
          const existing = state.customFolders || [];
          const updatedFolders = existing.filter((f) => f.trim().toLowerCase() !== trimmedTarget);
          const updatedTemplates = state.templates.map((t) => {
            if (t.folder?.trim().toLowerCase() === trimmedTarget) {
              const updated = { ...t, folder: undefined, updatedAt: new Date() };
              useSyncStore.getState().addToQueue('workout_templates', 'INSERT', updated);
              return updated;
            }
            return t;
          });
          return { customFolders: updatedFolders, templates: updatedTemplates };
        }),

      setTemplateFolder: (templateId: UUID, folder: string | null) =>
        set((state) => {
          const trimmedFolder = folder?.trim() || undefined;
          let folders = state.customFolders || [];
          let canonicalFolder: string | undefined = undefined;

          if (trimmedFolder) {
            const match = folders.find((f) => f.trim().toLowerCase() === trimmedFolder.toLowerCase());
            if (match) {
              canonicalFolder = match;
            } else {
              folders = [...folders, trimmedFolder];
              canonicalFolder = trimmedFolder;
            }
          }

          const updatedTemplates = state.templates.map((t) => {
            if (t.id === templateId) {
              const updated = { ...t, folder: canonicalFolder, updatedAt: new Date() };
              useSyncStore.getState().addToQueue('workout_templates', 'INSERT', updated);
              return updated;
            }
            return t;
          });
          return { customFolders: folders, templates: updatedTemplates };
        }),

      updateFoldersOrder: (folders: string[]) =>
        set({
          customFolders: folders.map((f) => f.trim()).filter(Boolean),
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
        return parsed.success
          ? { ...defaultPersistedState, ...parsed.data }
          : defaultPersistedState;
      },
      merge: (persisted, current) => {
        const saved = programPersistedSchema.parse(persisted ?? defaultPersistedState);
        // Retire old bundled offerings without deleting data or breaking historical references.
        // Persisted visibility always wins, including a deliberately empty hidden list.
        return {
          ...current, ...saved,
          programs: saved.programs as Program[],
          templates: saved.templates as WorkoutTemplate[],
          customFolders: saved.customFolders ?? [],
          hiddenTemplateIds: saved.hiddenTemplateIds ?? saved.templates.filter(t =>
            isDefaultTemplateId(t.id) && !getDefaultTemplates().some(item => item.id === t.id)).map(t => t.id),
          hiddenProgramIds: saved.hiddenProgramIds ?? saved.programs.filter(p =>
            isDefaultProgramId(p.id) && !getDefaultPrograms().some(item => item.id === p.id)).map(p => p.id),
        };
      },
      onRehydrateStorage: () => (state) => {
        if (state) {
          state.hiddenTemplateIds ??= state.templates.filter(template => isDefaultTemplateId(template.id) && !getDefaultTemplates().some(t => t.id === template.id)).map(t => t.id);
          state.hiddenProgramIds ??= state.programs.filter(program => isDefaultProgramId(program.id) && !getDefaultPrograms().some(p => p.id === program.id)).map(p => p.id);
          if (!state.customFolders) {
            state.customFolders = [];
          } else {
            // Deduplicate customFolders case-insensitively
            const seen = new Set<string>();
            const cleanFolders: string[] = [];
            for (const f of state.customFolders) {
              const trimmed = f?.trim();
              if (trimmed && !seen.has(trimmed.toLowerCase())) {
                seen.add(trimmed.toLowerCase());
                cleanFolders.push(trimmed);
              }
            }
            state.customFolders = cleanFolders;

            // Clear orphaned folder assignments from templates whose folder does not exist in cleanFolders
            if (state.templates) {
              state.templates = state.templates.map((t) => {
                if (t.folder) {
                  const match = cleanFolders.find(
                    (f) => f.toLowerCase() === t.folder?.trim().toLowerCase(),
                  );
                  if (!match) {
                    return { ...t, folder: undefined };
                  }
                  if (t.folder !== match) {
                    return { ...t, folder: match };
                  }
                }
                return t;
              });
            }
          }
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
