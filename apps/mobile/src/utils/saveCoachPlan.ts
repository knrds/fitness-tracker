import * as Crypto from 'expo-crypto';
import {
  CoachPlanSchema,
  WorkoutTemplateSchema,
  ProgramSchema,
  WorkoutTemplate,
  Program,
} from '@fitness-tracker/domain';
import { useCoachStore } from '../stores/coachStore';
import { useProgramStore } from '../stores/programStore';
import { useExerciseStore } from '../stores/exerciseStore';
import { useSyncStore } from '../stores/syncStore';
import { getCurrentUserId } from '../stores/local-user';
import { getStorageScope, isScopeCurrent, StorageScope } from '../data/storageScope';
import { runStorageTransaction } from '../data/storageTransaction';

export function saveCoachPlan(
  messageId: string,
  scope: StorageScope = getStorageScope(),
): string[] {
  if (!isScopeCurrent(scope))
    throw Error('Das Profil wurde gewechselt. Bitte den Plan erneut öffnen.');
  const coach = useCoachStore.getState();
  const message = coach.messages.find((item) => item.id === messageId && item.role === 'assistant');
  if (!message?.plan) throw Error('Kein speicherbarer Plan vorhanden.');
  if (message.savedTemplateIds?.length) return message.savedTemplateIds;
  const plan = CoachPlanSchema.parse(message.plan);
  const catalog = new Set(useExerciseStore.getState().exercises.map((exercise) => exercise.id));
  if (plan.days.some((day) => day.exercises.some((exercise) => !catalog.has(exercise.exerciseId))))
    throw Error('Eine Übung ist nicht mehr verfügbar. Bitte den Plan neu erstellen lassen.');
  const now = new Date();
  const userId = getCurrentUserId();
  const templates: WorkoutTemplate[] = plan.days.map((day) => ({
    id: Crypto.randomUUID(),
    userId,
    name: day.name,
    description: plan.name,
    isArchived: false,
    createdAt: now,
    updatedAt: now,
    exercises: day.exercises.map((exercise, order) => ({
      id: Crypto.randomUUID(),
      exerciseId: exercise.exerciseId,
      order,
      targetSets: exercise.sets,
      targetReps: exercise.reps,
      targetRepsMax: exercise.repsMax,
      targetRir: exercise.rir,
      targetRestSeconds: exercise.restSeconds,
      notes: exercise.notes,
    })),
  }));
  WorkoutTemplateSchema.array().parse(templates);
  // One editable week; never silently activate a program or interrupt an active workout.
  const program: Program = {
    id: Crypto.randomUUID(),
    userId,
    name: plan.name,
    durationWeeks: 1,
    isActive: false,
    createdAt: now,
    updatedAt: now,
    workouts: templates.map((template, index) => ({
      id: Crypto.randomUUID(),
      templateId: template.id,
      week: 1,
      dayOfWeek: Math.floor((index * 7) / templates.length) + 1,
      order: index,
    })),
  };
  ProgramSchema.parse(program);
  const previousProgram = useProgramStore.getState();
  const previousSync = useSyncStore.getState();
  const ids = templates.map((template) => template.id);
  runStorageTransaction(
    () => {
      useProgramStore.setState((state) => ({
        templates: [...state.templates, ...templates],
        programs: [...state.programs, program],
      }));
      for (const template of templates)
        useSyncStore.getState().addToQueue('workout_templates', 'INSERT', template);
      useSyncStore.getState().addToQueue('programs', 'INSERT', program);
      useCoachStore.setState((state) => ({
        messages: state.messages.map((item) =>
          item.id === messageId ? { ...item, savedTemplateIds: ids } : item,
        ),
      }));
    },
    () => {
      useProgramStore.setState(previousProgram);
      useSyncStore.setState(previousSync);
      useCoachStore.setState(coach);
    },
  );
  void useSyncStore.getState().processQueue();
  return ids;
}
