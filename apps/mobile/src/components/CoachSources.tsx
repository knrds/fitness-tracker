import React, { useState } from 'react';
import { View, Text, Pressable, Linking } from 'react-native';
import { useTheme } from '@fitness-tracker/ui';
import { ChatMessage } from '@fitness-tracker/domain';
export function CoachSources({ message }: { message: ChatMessage }) {
  const theme = useTheme();
  const [open, setOpen] = useState(false);
  if (!message.sources?.length) return null;
  return (
    <View style={{ marginTop: 8, gap: 6 }}>
      <Pressable
        accessibilityRole="button"
        accessibilityState={{ expanded: open }}
        onPress={() => setOpen(!open)}
        style={{ minHeight: 44, justifyContent: 'center' }}
      >
        <Text style={{ color: theme.colors.primary, fontSize: 12 }}>
          {message.sources.length} Literaturquellen ·{' '}
          {message.createdAt.toLocaleDateString('de-DE')} {open ? '−' : '+'}
        </Text>
      </Pressable>
      {open ? (
        <>
          <Text style={{ color: theme.colors.muted, fontSize: 11 }}>
            Aktuell zur Antwort abgerufene Abstracts; keine vollständige Studienübersicht.
          </Text>
          {message.sources.map((source) => (
            <Pressable
              key={source.url}
              accessibilityRole="link"
              onPress={() => void Linking.openURL(source.url)}
              style={{ minHeight: 44, justifyContent: 'center' }}
            >
              <Text style={{ color: theme.colors.primary, fontSize: 12 }}>
                {source.title}
                {source.date ? ' · ' + source.date : ''}
              </Text>
            </Pressable>
          ))}
        </>
      ) : null}
    </View>
  );
}
