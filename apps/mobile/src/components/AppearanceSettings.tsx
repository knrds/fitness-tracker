import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { colorways, createTheme, useTheme, withAlpha } from '@fitness-tracker/ui';
import { Ionicons } from '@expo/vector-icons';
import { useProfileStore } from '../stores/profileStore';

export function AppearanceSettings() {
  const theme = useTheme();
  const setProfile = useProfileStore((state) => state.updateProfile);

  return (
    <View style={styles.container}>
      <View style={styles.headerRow}>
        <View style={styles.headerLeft}>
          <Ionicons name="color-palette-outline" size={16} color={theme.colors.primary} />
          <Text style={[theme.typography.label, { color: theme.colors.primary }]}>
            THEME &amp; COLORWAY
          </Text>
        </View>
        <Text style={[styles.subtitle, { color: theme.colors.muted }]}>
          8 abgestimmte Farbwelten inkl. neuem Arctic Light Mode
        </Text>
      </View>

      <View style={styles.grid}>
        {colorways.map((option) => {
          const preview = createTheme(option.id);
          const isSelected = option.id === theme.colorway;
          const isLight = option.id === 'arctic';

          return (
            <Pressable
              key={option.id}
              accessibilityRole="radio"
              accessibilityLabel={`${option.name} colorway`}
              accessibilityState={{ checked: isSelected }}
              aria-checked={isSelected}
              onPress={() => setProfile({ colorway: option.id })}
              style={({ pressed }) => [
                styles.themeCard,
                {
                  backgroundColor: isSelected
                    ? withAlpha(theme.colors.primary, 0.07)
                    : theme.colors.surface,
                  borderColor: isSelected ? theme.colors.primary : theme.colors.border,
                  opacity: pressed ? 0.82 : 1,
                },
              ]}
            >
              {/* Top Meta: Name & Mode Badge */}
              <View style={styles.cardTopRow}>
                <Text
                  numberOfLines={1}
                  style={[
                    styles.themeName,
                    {
                      color: isSelected ? theme.colors.primary : theme.colors.text,
                    },
                  ]}
                >
                  {option.name}
                </Text>
                <View
                  style={[
                    styles.badge,
                    {
                      backgroundColor: isLight
                        ? withAlpha('#0284C7', 0.15)
                        : withAlpha(theme.colors.muted, 0.15),
                      borderColor: isLight
                        ? withAlpha('#0284C7', 0.4)
                        : withAlpha(theme.colors.muted, 0.3),
                    },
                  ]}
                >
                  <Ionicons
                    name={isLight ? 'sunny-outline' : 'moon-outline'}
                    size={10}
                    color={isLight ? '#0284C7' : theme.colors.muted}
                  />
                  <Text
                    style={[
                      styles.badgeText,
                      { color: isLight ? '#0284C7' : theme.colors.muted },
                    ]}
                  >
                    {isLight ? 'LIGHT' : 'DARK'}
                  </Text>
                </View>
              </View>

              {/* Live Miniature UI Mockup */}
              <View
                style={[
                  styles.mockupContainer,
                  {
                    backgroundColor: preview.colors.background,
                    borderColor: preview.colors.border,
                  },
                ]}
              >
                {/* Mini Navigation Bar Header */}
                <View
                  style={[
                    styles.miniHeader,
                    {
                      backgroundColor: preview.colors.surfaceElevated,
                      borderBottomColor: preview.colors.border,
                    },
                  ]}
                >
                  <View
                    style={[
                      styles.miniDot,
                      { backgroundColor: preview.colors.primary },
                    ]}
                  />
                  <View
                    style={[
                      styles.miniLine,
                      { backgroundColor: preview.colors.border, width: 44 },
                    ]}
                  />
                  <View
                    style={[
                      styles.miniCircle,
                      { backgroundColor: preview.colors.border },
                    ]}
                  />
                </View>

                {/* Mini Card in Preview */}
                <View
                  style={[
                    styles.miniCard,
                    {
                      backgroundColor: preview.colors.surface,
                      borderColor: preview.colors.border,
                    },
                  ]}
                >
                  <View style={{ gap: 4, flex: 1 }}>
                    <View
                      style={[
                        styles.miniLine,
                        { backgroundColor: preview.colors.text, width: 36, height: 4 },
                      ]}
                    />
                    <View
                      style={[
                        styles.miniLine,
                        { backgroundColor: preview.colors.muted, width: 24, height: 3 },
                      ]}
                    />
                  </View>
                  <View
                    style={[
                      styles.miniButton,
                      { backgroundColor: preview.colors.primary },
                    ]}
                  >
                    <Ionicons
                      name="flash"
                      size={8}
                      color={preview.colors.onPrimary || '#FFFFFF'}
                    />
                  </View>
                </View>

                {/* Swatch palette dots */}
                <View style={styles.swatchRow}>
                  {[
                    preview.colors.primary,
                    preview.colors.secondary,
                    preview.colors.tertiary,
                  ].map((color, idx) => (
                    <View
                      key={idx}
                      style={[styles.swatchDot, { backgroundColor: color }]}
                    />
                  ))}
                </View>
              </View>

              {/* Bottom Description & Selection Checkmark */}
              <View style={styles.cardBottomRow}>
                <Text
                  numberOfLines={2}
                  style={[styles.themeDesc, { color: theme.colors.muted }]}
                >
                  {option.description}
                </Text>
                <Ionicons
                  name={isSelected ? 'checkmark-circle' : 'ellipse-outline'}
                  color={isSelected ? theme.colors.primary : theme.colors.muted}
                  size={18}
                />
              </View>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: 12,
    marginBottom: 24,
  },
  headerRow: {
    gap: 4,
    marginBottom: 4,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  subtitle: {
    fontSize: 12,
    fontFamily: 'Manrope_500Medium',
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  themeCard: {
    flex: 1,
    minWidth: 155,
    padding: 12,
    gap: 10,
    borderWidth: 1,
    borderRadius: 14,
  },
  cardTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 6,
  },
  themeName: {
    fontSize: 13,
    fontFamily: 'SpaceGrotesk_700Bold',
    flex: 1,
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
    borderWidth: 1,
  },
  badgeText: {
    fontSize: 9,
    fontFamily: 'SpaceGrotesk_700Bold',
    letterSpacing: 0.5,
  },
  mockupContainer: {
    height: 72,
    borderRadius: 8,
    borderWidth: 1,
    padding: 6,
    justifyContent: 'space-between',
    overflow: 'hidden',
  },
  miniHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 4,
    paddingVertical: 3,
    borderRadius: 4,
    borderBottomWidth: 0.5,
  },
  miniDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  miniLine: {
    height: 3,
    borderRadius: 1.5,
  },
  miniCircle: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  miniCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 5,
    borderRadius: 6,
    borderWidth: 0.5,
    marginVertical: 2,
  },
  miniButton: {
    width: 14,
    height: 14,
    borderRadius: 7,
    alignItems: 'center',
    justifyContent: 'center',
  },
  swatchRow: {
    flexDirection: 'row',
    gap: 4,
    alignItems: 'center',
  },
  swatchDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  cardBottomRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 8,
  },
  themeDesc: {
    fontSize: 10,
    fontFamily: 'Manrope_500Medium',
    lineHeight: 14,
    flex: 1,
  },
});
