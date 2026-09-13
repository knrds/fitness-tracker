import React from 'react';
import { Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@fitness-tracker/ui';

export function AuthHeader({ title }: { title: string }) {
  const theme = useTheme();
  return (
    <View style={{ marginBottom: 32, gap: 24 }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
        <View
          style={{
            width: 44,
            height: 44,
            borderRadius: theme.radius.md,
            backgroundColor: theme.colors.primarySubtle,
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Ionicons name="flash" size={24} color={theme.colors.primary} />
        </View>
        <Text style={[theme.typography.heading, { color: theme.colors.text, letterSpacing: 2 }]}>
          VOLT
        </Text>
      </View>
      <View style={{ gap: 8 }}>
        <Text
          accessibilityRole="header"
          style={[theme.typography.heading, { color: theme.colors.text }]}
        >
          {title}
        </Text>
        <Text style={[theme.typography.body, { color: theme.colors.muted }]}>
          Your training, in focus.
        </Text>
      </View>
    </View>
  );
}
