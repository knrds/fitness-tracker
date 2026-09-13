import React, { useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme, AnimatedDisclosure } from '@fitness-tracker/ui';
import { useHistoryStore } from '../stores/historyStore';

export function CoachTrainingContext({ onAsk }: { onAsk: (question: string) => void }) {
  const theme = useTheme();
  const [expanded, setExpanded] = useState(false);
  const sessions = useHistoryStore((state) => state.sessions);
  const last = [...sessions].sort(
    (a, b) => new Date(b.startedAt).getTime() - new Date(a.startedAt).getTime(),
  )[0];
  if (!last) return null;
  const sets = last.exercises.reduce(
    (sum, exercise) =>
      sum + exercise.sets.filter((set) => set.completed && set.type !== 'warmup').length,
    0,
  );
  return (
    <View
      style={{
        marginHorizontal: 16,
        marginBottom: 8,
        borderBottomWidth: 1,
        borderColor: theme.colors.border,
      }}
    >
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Trainingskontext anzeigen"
        accessibilityState={{ expanded }}
        aria-expanded={expanded}
        onPress={() => setExpanded(!expanded)}
        style={{ minHeight: 44, flexDirection: 'row', alignItems: 'center', gap: 8 }}
      >
        <Ionicons name="barbell-outline" color={theme.colors.primary} size={18} />
        <Text style={{ color: theme.colors.muted, flex: 1, fontSize: 13 }}>
          Dein Trainingskontext
        </Text>
        <Ionicons
          name={expanded ? 'chevron-up' : 'chevron-down'}
          color={theme.colors.muted}
          size={16}
        />
      </Pressable>
      <AnimatedDisclosure expanded={expanded}>
        <View style={{ gap: 8, paddingBottom: 12 }}>
          <Text style={[theme.typography.button, { color: theme.colors.text }]}>{last.name}</Text>
          <Text style={[theme.typography.caption, { color: theme.colors.muted }]}>
            {new Date(last.startedAt).toLocaleDateString()} · {sets} Arbeitssätze ·{' '}
            {last.exercises.length} Übungen
          </Text>
          <Pressable
            accessibilityRole="button"
            onPress={() =>
              onAsk(
                'Analysiere mein letztes Training und empfehle kurz die nächste sinnvolle Einheit für Muskelaufbau.',
              )
            }
            style={{ minHeight: 44, justifyContent: 'center' }}
          >
            <Text style={[theme.typography.button, { color: theme.colors.primary }]}>
              Nächste Einheit besprechen →
            </Text>
          </Pressable>
        </View>
      </AnimatedDisclosure>
    </View>
  );
}
