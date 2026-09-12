import React, { useRef, useState } from 'react';
import { View, Text, Pressable } from 'react-native';
import { useRouter } from 'expo-router';
import { ChatMessage } from '@fitness-tracker/domain';
import { useTheme } from '@fitness-tracker/ui';
import { useExerciseStore } from '../stores/exerciseStore';
import { getStorageScope } from '../data/storageScope';
import { saveCoachPlan } from '../utils/saveCoachPlan';

export function CoachPlanCard({ message }: { message: ChatMessage }) {
  const theme = useTheme();
  const router = useRouter();
  const scope = useRef(getStorageScope());
  const exercises = useExerciseStore((state) => state.exercises);
  const [error, setError] = useState('');
  if (!message.plan) return null;
  const saved = Boolean(message.savedTemplateIds?.length);
  return (
    <View style={{ gap: 14, marginTop: 16, minWidth: 0 }}>
      <Text style={{ color: theme.colors.text, fontSize: 18, fontWeight: '700' }}>
        {message.plan.name}
      </Text>
      {message.plan.days.map((day, index) => (
        <View
          key={index}
          style={{ gap: 7, borderTopWidth: 1, borderColor: theme.colors.border, paddingTop: 12 }}
        >
          <Text style={{ color: theme.colors.primary, fontWeight: '600' }}>{day.name}</Text>
          {day.exercises.map((exercise, i) => (
            <View key={i} style={{ gap: 2 }}>
              <Text style={{ color: theme.colors.text }}>
                {exercises.find((item) => item.id === exercise.exerciseId)?.name ??
                  'Unbekannte Übung'}
              </Text>
              <Text style={{ color: theme.colors.muted, fontSize: 12 }}>
                {exercise.sets} × {exercise.reps}–{exercise.repsMax} · {exercise.rir} RIR ·{' '}
                {exercise.restSeconds}s Pause
              </Text>
              {exercise.notes ? (
                <Text style={{ color: theme.colors.muted, fontSize: 12 }}>{exercise.notes}</Text>
              ) : null}
            </View>
          ))}
        </View>
      ))}
      {error ? (
        <Text accessibilityRole="alert" style={{ color: theme.colors.accent }}>
          {error}
        </Text>
      ) : null}
      <Pressable
        accessibilityRole="button"
        onPress={() => {
          if (saved) {
            router.navigate({ pathname: '/workouts', params: { tab: 'programs' } });
            return;
          }
          try {
            saveCoachPlan(message.id, scope.current);
            setError('');
          } catch (e) {
            setError(e instanceof Error ? e.message : 'Plan konnte nicht gespeichert werden.');
          }
        }}
        style={{
          minHeight: 44,
          justifyContent: 'center',
          alignItems: 'center',
          backgroundColor: theme.colors.primary,
          borderRadius: 12,
          padding: 12,
        }}
      >
        <Text style={{ color: theme.colors.background, fontWeight: '600' }}>
          {saved ? 'Gespeichert · In Plans öffnen' : 'Plan und Workouts speichern'}
        </Text>
      </Pressable>
    </View>
  );
}
