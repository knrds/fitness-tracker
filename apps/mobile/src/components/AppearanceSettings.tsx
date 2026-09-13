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
                minWidth: 145,
                padding: 14,
                gap: 10,
                borderWidth: 1,
                borderRadius: theme.radius.md,
                backgroundColor: theme.colors.surface,
                borderColor: selected ? theme.colors.borderActive : theme.colors.border,
                opacity: pressed ? 0.8 : 1,
              })}
            >
              <View
                style={{
                  height: 36,
                  borderRadius: 6,
                  backgroundColor: preview.colors.background,
                  flexDirection: 'row',
                  gap: 6,
                  alignItems: 'center',
                  paddingHorizontal: 10,
                  borderWidth: 1,
                  borderColor: preview.colors.border,
                }}
              >
                {[preview.colors.primary, preview.colors.secondary, preview.colors.tertiary].map(
                  (color, idx) => (
                    <View
                      key={idx}
                      style={{ width: 14, height: 14, borderRadius: 7, backgroundColor: color }}
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
                <View style={{ flex: 1, marginRight: 6 }}>
                  <Text
                    style={[
                      theme.typography.button,
                      { color: theme.colors.text, fontSize: 14 },
                    ]}
                  >
                    {option.name}
                  </Text>
                  <Text
                    style={{ fontSize: 10, color: theme.colors.muted, marginTop: 2 }}
                    numberOfLines={1}
                  >
                    {option.description}
                  </Text>
                </View>
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
