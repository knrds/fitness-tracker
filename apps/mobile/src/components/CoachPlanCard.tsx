import React, { useRef, useState } from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { ChatMessage, CoachNewExercise } from '@fitness-tracker/domain';
import { useTheme, Card, withAlpha } from '@fitness-tracker/ui';
import { Ionicons } from '@expo/vector-icons';
import { useExerciseStore } from '../stores/exerciseStore';
import { useProgramStore } from '../stores/programStore';
import { getStorageScope } from '../data/storageScope';
import { saveCoachExercises, saveCoachPlan } from '../utils/saveCoachPlan';
import { usePaywallStore } from '../stores/paywallStore';
import { useI18n } from '../i18n';

function NewExerciseRow({ exercise }: { exercise: CoachNewExercise }) {
  const theme = useTheme();
  const { formatMuscle, formatEquipment, language } = useI18n();
  return (
    <View style={[styles.newExercise, { borderColor: withAlpha(theme.colors.primary, 0.35) }]}>
      <View style={styles.newExerciseHeader}>
        <View style={[styles.newBadge, { backgroundColor: theme.colors.primary }]}>
          <Text style={[styles.newBadgeText, { color: theme.colors.onPrimary }]}>
            {language === 'de' ? 'NEU' : 'NEW'}
          </Text>
        </View>
        <Text style={[styles.newExerciseName, { color: theme.colors.text }]}>{exercise.name}</Text>
      </View>
      <Text style={[styles.meta, { color: theme.colors.muted }]}>
        {exercise.primaryMuscles.map(formatMuscle).join(', ')} · {formatEquipment(exercise.equipment)}
        {exercise.tracking === 'duration' ? (language === 'de' ? ' · Zeit' : ' · Time') : ''}
      </Text>
      {exercise.instructions ? (
        <Text style={[styles.meta, { color: theme.colors.text }]}>{exercise.instructions}</Text>
      ) : null}
    </View>
  );
}

export function CoachPlanCard({ message }: { message: ChatMessage }) {
  const theme = useTheme();
  const router = useRouter();
  const { language } = useI18n();
  const de = language === 'de';
  const scope = useRef(getStorageScope());
  const exercises = useExerciseStore((state) => state.exercises);
  const templates = useProgramStore((state) => state.templates);
  const [error, setError] = useState('');
  const plan = message.plan;
  const proposals = message.newExercises ?? [];
  if (!plan && !proposals.length) return null;

  const handleError = (e: unknown) => {
    if (
      e instanceof Error &&
      (e.message.startsWith('COACH_TIER_REQUIRED') ||
        e.message.startsWith('AI_WRITE_NOT_AUTHORIZED') ||
        e.message.startsWith('AI_WRITE_CONFIRMATION_REQUIRED'))
    ) {
      usePaywallStore.getState().openPaywall('coach', 'coach_write');
    }
    setError(
      e instanceof Error
        ? e.message.replace(/^[A-Z_]+:\s*/, '')
        : de
          ? 'Konnte nicht gespeichert werden.'
          : 'Could not be saved.',
    );
  };

  // Exercise-only answer: offer to add the proposed exercises to the library.
  if (!plan) {
    const saved = Boolean(message.savedExerciseIds && Object.keys(message.savedExerciseIds).length);
    return (
      <Card style={styles.card} padding="md">
        <Text style={[styles.title, { color: theme.colors.text }]}>
          {de ? 'Neue Übungen' : 'New exercises'}
        </Text>
        {proposals.map((exercise) => (
          <NewExerciseRow key={exercise.key} exercise={exercise} />
        ))}
        {error ? (
          <Text accessibilityRole="alert" style={{ color: theme.colors.error }}>
            {error}
          </Text>
        ) : null}
        <Pressable
          accessibilityRole="button"
          testID="coach-save-exercises"
          disabled={saved}
          onPress={() => {
            try {
              saveCoachExercises(message.id, scope.current);
              setError('');
            } catch (e) {
              handleError(e);
            }
          }}
          style={[styles.button, { backgroundColor: saved ? theme.colors.surfaceElevated : theme.colors.primary }]}
        >
          <Text style={[styles.buttonText, { color: saved ? theme.colors.muted : theme.colors.onPrimary }]}>
            {saved
              ? de
                ? 'In deinen Übungen gespeichert'
                : 'Saved to your exercises'
              : proposals.length === 1
                ? de
                  ? 'Übung anlegen'
                  : 'Add exercise'
                : de
                  ? `${proposals.length} Übungen anlegen`
                  : `Add ${proposals.length} exercises`}
          </Text>
        </Pressable>
      </Card>
    );
  }

  const saved = Boolean(message.savedTemplateIds?.length);
  const target = plan.updatesTemplateId
    ? templates.find((template) => template.id === plan.updatesTemplateId)
    : undefined;
  const isProgram = !plan.updatesTemplateId && (plan.kind === 'program' || (!plan.kind && plan.days.length > 1));
  const nameOf = (exerciseId: string) => {
    if (exerciseId.startsWith('new:')) {
      const key = exerciseId.slice(4);
      return proposals.find((exercise) => exercise.key === key)?.name;
    }
    return exercises.find((item) => item.id === exerciseId)?.name;
  };
  const subtitle = plan.updatesTemplateId
    ? de
      ? `Vorlage aktualisieren · ${target?.name ?? 'nicht mehr vorhanden'}`
      : `Update template · ${target?.name ?? 'no longer available'}`
    : isProgram
      ? de
        ? `Programm · ${plan.days.length} Trainingstage · ${plan.durationWeeks ?? 1} Woche(n)`
        : `Program · ${plan.days.length} training days · ${plan.durationWeeks ?? 1} week(s)`
      : de
        ? 'Vorlage · 1 Trainingstag'
        : 'Template · 1 training day';
  const actionLabel = saved
    ? de
      ? 'Gespeichert · In Pläne öffnen'
      : 'Saved · Open in Plans'
    : plan.updatesTemplateId
      ? de
        ? 'Vorlage aktualisieren'
        : 'Update template'
      : isProgram
        ? de
          ? 'Programm und Vorlagen speichern'
          : 'Save program and templates'
        : de
          ? 'Vorlage speichern'
          : 'Save template';

  return (
    <Card style={styles.card} padding="md">
      <Text style={[styles.title, { color: theme.colors.text }]}>{plan.name}</Text>
      <View style={styles.subtitleRow}>
        <Ionicons
          name={plan.updatesTemplateId ? 'create-outline' : isProgram ? 'calendar-outline' : 'barbell-outline'}
          size={14}
          color={theme.colors.primary}
        />
        <Text style={[styles.meta, { color: theme.colors.muted, flex: 1 }]}>{subtitle}</Text>
      </View>
      {plan.days.map((day, index) => (
        <View key={index} style={[styles.day, { borderColor: theme.colors.border }]}>
          <Text style={{ color: theme.colors.primary, fontFamily: 'Manrope_600SemiBold' }}>{day.name}</Text>
          {day.exercises.map((exercise, i) => (
            <View key={i} style={{ gap: 2 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                {exercise.exerciseId.startsWith('new:') && (
                  <View style={[styles.newBadge, { backgroundColor: theme.colors.primary }]}>
                    <Text style={[styles.newBadgeText, { color: theme.colors.onPrimary }]}>
                      {de ? 'NEU' : 'NEW'}
                    </Text>
                  </View>
                )}
                <Text style={{ color: theme.colors.text, fontFamily: 'Manrope_500Medium', flex: 1 }}>
                  {nameOf(exercise.exerciseId) ?? (de ? 'Unbekannte Übung' : 'Unknown exercise')}
                </Text>
              </View>
              <Text style={[styles.meta, { color: theme.colors.muted }]}>
                {exercise.sets} × {exercise.reps}
                {exercise.repsMax > exercise.reps ? `–${exercise.repsMax}` : ''} · {exercise.rir} RIR ·{' '}
                {exercise.restSeconds}s {de ? 'Pause' : 'rest'}
              </Text>
              {exercise.notes ? (
                <Text style={[styles.meta, { color: theme.colors.muted }]}>{exercise.notes}</Text>
              ) : null}
            </View>
          ))}
        </View>
      ))}
      {proposals.length > 0 && (
        <View style={{ gap: 8 }}>
          <Text style={[styles.meta, { color: theme.colors.muted }]}>
            {de
              ? 'Diese Übungen werden beim Speichern in deiner Bibliothek angelegt:'
              : 'These exercises are added to your library when you save:'}
          </Text>
          {proposals.map((exercise) => (
            <NewExerciseRow key={exercise.key} exercise={exercise} />
          ))}
        </View>
      )}
      {error ? (
        <Text accessibilityRole="alert" style={{ color: theme.colors.error }}>
          {error}
        </Text>
      ) : null}
      <Pressable
        accessibilityRole="button"
        testID="coach-save-plan"
        onPress={() => {
          if (saved) {
            router.navigate({
              pathname: '/workouts',
              params: { tab: isProgram ? 'programs' : 'workouts' },
            });
            return;
          }
          try {
            saveCoachPlan(message.id, scope.current);
            setError('');
          } catch (e) {
            handleError(e);
          }
        }}
        style={[styles.button, { backgroundColor: theme.colors.primary }]}
      >
        <Text style={[styles.buttonText, { color: theme.colors.onPrimary }]}>{actionLabel}</Text>
      </Pressable>
    </Card>
  );
}

const styles = StyleSheet.create({
  card: { gap: 14, marginTop: 16, minWidth: 0 },
  title: { fontSize: 18, fontFamily: 'SpaceGrotesk_700Bold' },
  subtitleRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: -6 },
  meta: { fontSize: 12, fontFamily: 'Manrope_500Medium', lineHeight: 17 },
  day: { gap: 7, borderTopWidth: 1, paddingTop: 12 },
  newExercise: { borderWidth: 1, borderRadius: 12, padding: 10, gap: 4 },
  newExerciseHeader: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  newExerciseName: { fontFamily: 'Manrope_700Bold', fontSize: 14, flex: 1 },
  newBadge: { borderRadius: 6, paddingHorizontal: 6, paddingVertical: 2 },
  newBadgeText: { fontFamily: 'SpaceGrotesk_700Bold', fontSize: 9, letterSpacing: 0.6 },
  button: {
    minHeight: 44,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 12,
    padding: 12,
  },
  buttonText: { fontFamily: 'Manrope_600SemiBold' },
});
