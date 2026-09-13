import React from 'react';
import { Pressable, Text, View } from 'react-native';
import { colorways, createTheme, useTheme } from '@fitness-tracker/ui';
import { Ionicons } from '@expo/vector-icons';
import { useProfileStore } from '../stores/profileStore';

export function AppearanceSettings() {
  const theme = useTheme();
  const setProfile = useProfileStore((state) => state.updateProfile);
  return (
    <View style={{ gap: 12, marginBottom: theme.spacing.lg }}>
      <Text style={[theme.typography.label, { color: theme.colors.muted }]}>Appearance</Text>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 12 }}>
        {colorways.map((option) => {
          const preview = createTheme(option.id);
          const selected = option.id === theme.colorway;
          return (
            <Pressable
              key={option.id}
              accessibilityRole="radio"
              accessibilityLabel={option.name + ' colorway'}
              accessibilityState={{ checked: selected }}
              aria-checked={selected}
              onPress={() => setProfile({ colorway: option.id })}
              style={({ pressed }) => ({
                flex: 1,
                minWidth: 125,
                padding: 16,
                gap: 12,
                borderWidth: 1,
                borderRadius: theme.radius.md,
                backgroundColor: theme.colors.surface,
                borderColor: selected ? theme.colors.borderActive : theme.colors.border,
                opacity: pressed ? 0.8 : 1,
              })}
            >
              <View
                style={{
                  height: 38,
                  borderRadius: 6,
                  backgroundColor: preview.colors.background,
                  flexDirection: 'row',
                  gap: 5,
                  alignItems: 'center',
                  paddingHorizontal: 10,
                }}
              >
                {[preview.colors.primary, preview.colors.secondary, preview.colors.tertiary].map(
                  (color) => (
                    <View
                      key={color}
                      style={{ width: 16, height: 16, borderRadius: 8, backgroundColor: color }}
                    />
                  ),
                )}
              </View>
              <View
                style={{
                  flexDirection: 'row',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                }}
              >
                <Text style={[theme.typography.button, { color: theme.colors.text }]}>
                  {option.name}
                </Text>
                <Ionicons
                  name={selected ? 'checkmark-circle' : 'ellipse-outline'}
                  color={selected ? theme.colors.primary : theme.colors.muted}
                  size={20}
                />
              </View>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}
