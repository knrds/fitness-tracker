import * as Crypto from './uuid';
import {
  CoachNewExercise,
  CoachNewExerciseSchema,
  CoachPlanSchema,
  Exercise,
  ExerciseSchema,
  MovementPattern,
  WorkoutTemplateSchema,
  ProgramSchema,
  WorkoutTemplate,
  Program,
} from '@fitness-tracker/domain';
import { useCoachStore } from '../stores/coachStore';
import { isTemplateEditable, useProgramStore } from '../stores/programStore';
import { filterExercises, useExerciseStore } from '../stores/exerciseStore';
import { useSyncStore } from '../stores/syncStore';
import { getCurrentUserId } from '../stores/local-user';
import { getStorageScope, isScopeCurrent, StorageScope } from '../data/storageScope';
import { runStorageTransaction } from '../data/storageTransaction';
import { entitlementService } from '../services/entitlementService';
import { monetizationAnalytics } from '../services/monetizationAnalytics';

function assertCanWrite(scope: StorageScope) {
  if (!isScopeCurrent(scope))
    throw Error('Das Profil wurde gewechselt. Bitte den Plan erneut öffnen.');
  if (!entitlementService.canUseAIWrite(true)) {
    monetizationAnalytics.track('locked_feature_clicked', {
      tier: entitlementService.getTier(),
      feature_source: 'coach_plan',
    });
    throw Error('AI_WRITE_NOT_AUTHORIZED: Das Speichern von KI-Trainingsplänen erfordert ein aktives EVARO Coach Abonnement.');
  }
}

/** Builds custom exercises for not yet created proposals; existing names are reused, never duplicated. */
function materializeNewExercises(
  proposals: readonly CoachNewExercise[],
  alreadySaved: Record<string, string>,
): { created: Exercise[]; ids: Record<string, string> } {
  const library = useExerciseStore.getState().exercises;
  const byName = new Map(library.map((exercise) => [exercise.name.trim().toLowerCase(), exercise.id]));
  const now = new Date();
  const ownerId = getCurrentUserId();
  const ids: Record<string, string> = { ...alreadySaved };
  const created: Exercise[] = [];
  for (const raw of proposals) {
    const proposal = CoachNewExerciseSchema.parse(raw);
    const savedId = ids[proposal.key];
    if (savedId && library.some((exercise) => exercise.id === savedId)) continue;
    const existing = byName.get(proposal.name.trim().toLowerCase());
    if (existing) {
      ids[proposal.key] = existing;
      continue;
    }
    const exercise: Exercise = {
      id: Crypto.randomUUID(),
      name: proposal.name.trim(),
      instructions: proposal.instructions.trim(),
      primaryMuscles: proposal.primaryMuscles,
      secondaryMuscles: proposal.secondaryMuscles.filter(
        (muscle) => !proposal.primaryMuscles.includes(muscle),
      ),
      equipment: proposal.equipment,
      equipmentOptions: [proposal.equipment],
      // Duration tracking is expressed through the cardio pattern throughout the app.
      movementPattern:
        proposal.tracking === 'duration' ? MovementPattern.Cardio : proposal.movementPattern,
      isCustom: true,
      ownerId,
      createdAt: now,
      updatedAt: now,
    };
    ExerciseSchema.parse(exercise);
    created.push(exercise);
    byName.set(exercise.name.toLowerCase(), exercise.id);
    ids[proposal.key] = exercise.id;
  }
  return { created, ids };
}

function commitExercises(created: Exercise[]) {
  if (!created.length) return;
  useExerciseStore.setState((state) => {
    const customExercises = [...state.customExercises, ...created];
    const exercises = [...state.exercises, ...created];
    return {
      customExercises,
      exercises,
      filteredExercises: filterExercises(
        exercises,
        state.searchQuery,
        state.selectedMuscleGroup,
        state.selectedEquipment,
      ),
    };
  });
  for (const exercise of created) useSyncStore.getState().addToQueue('exercises', 'INSERT', exercise);
}

/** Creates the coach's proposed exercises after explicit confirmation; returns key → id. */
export function saveCoachExercises(
  messageId: string,
  scope: StorageScope = getStorageScope(),
): Record<string, string> {
  assertCanWrite(scope);
  const coach = useCoachStore.getState();
  const message = coach.messages.find((item) => item.id === messageId && item.role === 'assistant');
  if (!message?.newExercises?.length) throw Error('Keine neue Übung vorhanden.');
  const { created, ids } = materializeNewExercises(message.newExercises, message.savedExerciseIds ?? {});
  const previousExercises = useExerciseStore.getState();
  const previousSync = useSyncStore.getState();
  runStorageTransaction(
    () => {
      commitExercises(created);
      useCoachStore.setState((state) => ({
        messages: state.messages.map((item) =>
          item.id === messageId ? { ...item, savedExerciseIds: ids } : item,
        ),
      }));
    },
    () => {
      useExerciseStore.setState(previousExercises);
      useSyncStore.setState(previousSync);
      useCoachStore.setState(coach);
    },
  );
  void useSyncStore.getState().processQueue();
  return ids;
}

export function saveCoachPlan(
  messageId: string,
  scope: StorageScope = getStorageScope(),
): string[] {
  assertCanWrite(scope);
  const coach = useCoachStore.getState();
  const message = coach.messages.find((item) => item.id === messageId && item.role === 'assistant');
  if (!message?.plan) throw Error('Kein speicherbarer Plan vorhanden.');
  if (message.savedTemplateIds?.length) return message.savedTemplateIds;
  const plan = CoachPlanSchema.parse(message.plan);

  // Proposed exercises are created in the same transaction as the plan that uses them.
  const referenced = new Set(
    plan.days.flatMap((day) =>
      day.exercises
        .map((exercise) => exercise.exerciseId)
        .filter((id) => id.startsWith('new:'))
        .map((id) => id.slice(4)),
    ),
  );
  const proposals = (message.newExercises ?? []).filter((proposal) => referenced.has(proposal.key));
  if (proposals.length !== referenced.size)
    throw Error('Eine vorgeschlagene Übung fehlt. Bitte den Plan neu erstellen lassen.');
  const { created, ids: exerciseIds } = materializeNewExercises(proposals, message.savedExerciseIds ?? {});
  const resolve = (id: string) => (id.startsWith('new:') ? exerciseIds[id.slice(4)] ?? id : id);
  const catalog = new Set([
    ...useExerciseStore.getState().exercises.map((exercise) => exercise.id),
    ...created.map((exercise) => exercise.id),
  ]);
  if (plan.days.some((day) => day.exercises.some((exercise) => !catalog.has(resolve(exercise.exerciseId)))))
    throw Error('Eine Übung ist nicht mehr verfügbar. Bitte den Plan neu erstellen lassen.');

  const now = new Date();
  const userId = getCurrentUserId();
  const toTemplateExercises = (day: (typeof plan.days)[number]) =>
    day.exercises.map((exercise, order) => ({
      id: Crypto.randomUUID(),
      exerciseId: resolve(exercise.exerciseId),
      order,
      targetSets: exercise.sets,
      targetReps: exercise.reps,
      targetRepsMax: exercise.repsMax,
      targetRir: exercise.rir,
      targetRestSeconds: exercise.restSeconds,
      notes: exercise.notes,
    }));

  const programState = useProgramStore.getState();
  const target = plan.updatesTemplateId
    ? programState.templates.find((template) => template.id === plan.updatesTemplateId)
    : undefined;
  if (plan.updatesTemplateId && !target)
    throw Error('Die Vorlage existiert nicht mehr. Bitte den Coach erneut fragen.');
  if (target && !isTemplateEditable(target.id, programState.templates))
    throw Error('TEMPLATE_LOCKED: Diese Vorlage kann nicht bearbeitet werden.');

  const updatedTemplate: WorkoutTemplate | undefined = target
    ? {
        ...target,
        name: plan.days[0]!.name,
        exercises: toTemplateExercises(plan.days[0]!),
        updatedAt: now,
      }
    : undefined;
  if (updatedTemplate) WorkoutTemplateSchema.parse(updatedTemplate);
  const templates: WorkoutTemplate[] = target
    ? []
    : plan.days.map((day) => ({
        id: Crypto.randomUUID(),
        userId,
        name: day.name,
        description: plan.name,
        isArchived: false,
        createdAt: now,
        updatedAt: now,
        exercises: toTemplateExercises(day),
      }));
  WorkoutTemplateSchema.array().parse(templates);
  const isProgram = !target && (plan.kind === 'program' || (!plan.kind && plan.days.length > 1));
  const durationWeeks = plan.durationWeeks ?? 1;
  // Only explicit programs or legacy multi-day splits get an inactive schedule.
  const program: Program | undefined = isProgram
    ? {
        id: Crypto.randomUUID(),
        userId,
        name: plan.name,
        durationWeeks,
        isActive: false,
        createdAt: now,
        updatedAt: now,
        workouts: Array.from({ length: durationWeeks }, (_, week) =>
          templates.map((template, index) => ({
            id: Crypto.randomUUID(),
            templateId: template.id,
            week: week + 1,
            dayOfWeek: Math.floor((index * 7) / templates.length) + 1,
            order: index,
          })),
        ).flat(),
      }
    : undefined;
  if (program) ProgramSchema.parse(program);
  const previousProgram = useProgramStore.getState();
  const previousExercises = useExerciseStore.getState();
  const previousSync = useSyncStore.getState();
  const ids = updatedTemplate ? [updatedTemplate.id] : templates.map((template) => template.id);
  runStorageTransaction(
    () => {
      commitExercises(created);
      if (updatedTemplate) {
        useProgramStore.setState((state) => ({
          templates: state.templates.map((template) =>
            template.id === updatedTemplate.id ? updatedTemplate : template,
          ),
        }));
        useSyncStore.getState().addToQueue('workout_templates', 'INSERT', updatedTemplate);
      } else {
        useProgramStore.setState((state) => ({
          templates: [...templates, ...state.templates],
          programs: program ? [program, ...state.programs] : state.programs,
        }));
        for (const template of templates)
          useSyncStore.getState().addToQueue('workout_templates', 'INSERT', template);
        if (program) useSyncStore.getState().addToQueue('programs', 'INSERT', program);
      }
      useCoachStore.setState((state) => ({
        messages: state.messages.map((item) =>
          item.id === messageId
            ? {
                ...item,
                savedTemplateIds: ids,
                ...(Object.keys(exerciseIds).length ? { savedExerciseIds: exerciseIds } : {}),
              }
            : item,
        ),
      }));
    },
    () => {
      useProgramStore.setState(previousProgram);
      useExerciseStore.setState(previousExercises);
      useSyncStore.setState(previousSync);
      useCoachStore.setState(coach);
    },
  );
  void useSyncStore.getState().processQueue();
  return ids;
}
