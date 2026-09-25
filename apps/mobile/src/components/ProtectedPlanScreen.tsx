import React from 'react';
import { View, Text, Pressable, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '@fitness-tracker/ui';

/** Readonly routes never mount editable forms or nested edit dialogs. */
export function ProtectedPlanScreen({ name, items, onBack }: { name: string; items: string[]; onBack: () => void }) {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  return <View style={{ flex: 1, backgroundColor: theme.colors.background, paddingTop: insets.top }}>
    <View style={{ flexDirection: 'row', alignItems: 'center', padding: 12, gap: 12 }}>
      <Pressable onPress={onBack} accessibilityRole="button" accessibilityLabel="Zurück" style={{ width: 44, height: 44, justifyContent: 'center', alignItems: 'center' }}>
        <Ionicons name="arrow-back" size={24} color={theme.colors.primary} />
      </Pressable>
      <Text style={[theme.typography.heading, { flex: 1, color: theme.colors.text }]}>{name}</Text>
    </View>
    <ScrollView contentContainerStyle={{ padding: 20, gap: 16 }}>
      <View style={{ flexDirection: 'row', gap: 8, alignItems: 'center' }}>
        <Ionicons name="lock-closed" size={18} color={theme.colors.primary} />
        <Text style={{ color: theme.colors.text }}>EVARO · Standard · Geschützt</Text>
      </View>
      <Text style={{ color: theme.colors.muted }}>Dieser Standardplan kann ausgeblendet, aber nicht bearbeitet oder gelöscht werden.</Text>
      {items.map((item, index) => <View key={`${index}-${item}`} style={{ padding: 16, borderRadius: 12, backgroundColor: theme.colors.surface, borderWidth: 1, borderColor: theme.colors.border }}>
        <Text style={{ color: theme.colors.text }}>{item}</Text>
      </View>)}
    </ScrollView>
  </View>;
}
